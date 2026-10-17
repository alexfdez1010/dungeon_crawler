import test from "node:test";
import assert from "node:assert/strict";
import {
  createRun,
  act,
  chooseRelic,
  nextFloor,
  visibleTiles,
  getThreats,
  validateRun,
  getStats,
} from "../web/engine.js";
import { CLASS_BY_ID, ENEMIES, RELICS, REGIONS } from "../web/content.js";

function arena(classId = "warden") {
  const run = createRun({ seed: 123456, classId });
  run.map.tiles = run.map.tiles.map((_, i) => {
    const x = i % run.map.width;
    const y = Math.floor(i / run.map.width);
    return x > 0 && x < run.map.width - 1 && y > 0 && y < run.map.height - 1
      ? 1
      : 0;
  });
  run.player.x = 10;
  run.player.y = 10;
  run.enemies = [];
  run.objects = [];
  run.map.exit = { x: 38, y: 26 };
  return run;
}

function enemy(run, type, x, y, extras = {}) {
  const definition = ENEMIES[type];
  const value = {
    id: `test-${run.enemies.length}`,
    type,
    x,
    y,
    hp: definition.hp,
    maxHp: definition.hp,
    attack: definition.attack,
    armor: definition.armor,
    boss: definition.behavior === "boss",
    alerted: false,
    cooldown: 0,
    intent: null,
    ...extras,
  };
  run.enemies.push(value);
  return value;
}

test("200 deterministic dungeon seeds have connected floors, separated spawns, and valid saves", () => {
  for (let seed = 0; seed < 200; seed++) {
    const run = createRun({ seed });
    assert.deepEqual(run, createRun({ seed }));
    assert.equal(validateRun(run), true, `save seed ${seed}`);
    const { map } = run;
    const start = map.start.y * map.width + map.start.x;
    const visited = new Set([start]);
    const queue = [start];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const tile = queue[cursor];
      for (const next of [
        tile - 1,
        tile + 1,
        tile - map.width,
        tile + map.width,
      ]) {
        if (!map.tiles[next] || visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
      }
    }
    assert.equal(
      visited.size,
      map.tiles.filter(Boolean).length,
      `connected seed ${seed}`,
    );
    assert(visited.has(map.exit.y * map.width + map.exit.x));
    const positions = [
      run.player,
      map.exit,
      ...run.enemies,
      ...run.objects,
    ].map((item) => item.y * map.width + item.x);
    assert.equal(
      new Set(positions).size,
      positions.length,
      `overlap seed ${seed}`,
    );
    assert(visibleTiles(run).has(start));
    assert(run.map.explored[start]);
  }
});

test("JSON restoration retains future combat rolls, earned shards, and credit accounting", () => {
  const run = arena();
  run.creditedShards = 0;
  enemy(run, "ashling", 11, 10);
  run.relics = ["glass_eye", "mist_cloak"];
  const restored = JSON.parse(JSON.stringify(run));
  assert.equal(validateRun(restored), true);
  for (const action of [
    { type: "move", dx: 1, dy: 0 },
    { type: "guard" },
    { type: "skill" },
    { type: "wait" },
  ]) {
    assert.equal(act(run, action), act(restored, action));
    assert.deepEqual(run, restored);
  }
  assert.equal(run.creditedShards, 0);
});

test("corrupt saves and malformed action values fail safely", () => {
  assert.equal(validateRun(null), false);
  assert.equal(validateRun({}), false);
  const valid = createRun({ seed: 1 });
  const mutations = [
    (run) => {
      run.version = 9;
    },
    (run) => {
      run.floor = 13;
    },
    (run) => {
      run.map.tiles.pop();
    },
    (run) => {
      run.map.tiles[0] = 7;
    },
    (run) => {
      run.map.explored = [];
    },
    (run) => {
      run.player.hp = NaN;
    },
    (run) => {
      run.player.hp = 3.5;
    },
    (run) => {
      run.player.hp = 1000000000;
    },
    (run) => {
      run.player.x = -1;
    },
    (run) => {
      run.player.facing = { x: 1, y: 1 };
    },
    (run) => {
      run.player.classId = "toString";
    },
    (run) => {
      run.map.rooms = [null];
    },
    (run) => {
      run.relics = ["missing"];
    },
    (run) => {
      run.relics = ["glass_eye", "glass_eye"];
    },
    (run) => {
      run.rewardChoices = ["missing"];
    },
    (run) => {
      run.enemies[0].hp = -1;
    },
    (run) => {
      run.enemies[0].type = "missing";
    },
    (run) => {
      run.enemies[0].type = "__proto__";
    },
    (run) => {
      run.enemies[0].cooldown = Infinity;
    },
    (run) => {
      run.enemies[1].id = run.enemies[0].id;
    },
    (run) => {
      run.enemies[0].intent = {
        cells: [{ x: -1, y: -1 }],
        damage: 3,
        kind: "shot",
      };
    },
    (run) => {
      run.objects[0].used = "yes";
    },
    (run) => {
      run.creditedShards = run.shards + 1;
    },
    (run) => {
      run.phase = "dead";
    },
  ];
  for (const mutate of mutations) {
    const value = structuredClone(valid);
    mutate(value);
    assert.equal(validateRun(value), false, mutate.toString());
  }
  const run = arena();
  for (const action of [
    null,
    {},
    { type: "move", dx: 1, dy: 1 },
    { type: "move", dx: 99, dy: 0 },
    { type: "dash", dx: NaN, dy: 0 },
  ]) {
    assert.equal(act(run, action), false);
    assert.equal(run.turn, 0);
  }
});

test("walls conceal enemies, block ranged acquisition, and prevent skills through cover", () => {
  const run = arena("ranger");
  const target = enemy(run, "bone_archer", 13, 10);
  for (let y = 1; y < run.map.height - 1; y++)
    run.map.tiles[y * run.map.width + 12] = 0;
  assert.equal(visibleTiles(run).has(10 * run.map.width + 13), false);
  assert.equal(act(run, { type: "skill" }), false);
  act(run, { type: "wait" });
  assert.equal(target.intent, null);
  assert.equal(target.alerted, false);
  assert.equal(
    visibleTiles(run).has(10 * run.map.width + 12),
    true,
    "the cover wall itself is visible",
  );
});

test("lethal damage creates a valid, terminal save and subsequent input cannot change it", () => {
  const run = arena();
  run.player.hp = 1;
  enemy(run, "ash_guard", 11, 10, { attack: 100 });
  act(run, { type: "wait" });
  assert.equal(run.phase, "dead");
  assert.equal(run.player.hp, 0);
  assert.equal(validateRun(run), true);
  const snapshot = JSON.stringify(run);
  assert.equal(act(run, { type: "potion" }), false);
  assert.equal(act(run, { type: "skill" }), false);
  assert.equal(JSON.stringify(run), snapshot);
});

test("walls, failed skills, full-health potions and unaffordable shrines consume no turn", () => {
  const run = arena();
  run.map.tiles[10 * run.map.width + 11] = 0;
  assert.equal(act(run, { type: "move", dx: 1, dy: 0 }), false);
  assert.equal(act(run, { type: "skill" }), false);
  assert.equal(act(run, { type: "potion" }), false);
  run.objects.push({ id: "shrine", type: "shrine", x: 10, y: 11, used: false });
  assert.equal(act(run, { type: "interact" }), false);
  assert.equal(run.turn, 0);
  assert.equal(run.player.energy, getStats(run).maxEnergy);
});

test("every class skill has its documented energy cost and useful targeting", () => {
  for (const classId of Object.keys(CLASS_BY_ID)) {
    const run = arena(classId);
    const a = enemy(run, "ash_guard", 11, 10);
    const b = enemy(run, "ash_guard", 12, 10);
    const before = run.player.energy;
    assert.equal(act(run, { type: "skill" }), true);
    assert.equal(
      run.player.energy,
      before - CLASS_BY_ID[classId].skillCost,
      classId,
    );
    assert(a.hp < a.maxHp, classId);
    assert(b.hp < b.maxHp, `area / piercing for ${classId}`);
    if (classId === "warden")
      assert.equal(
        run.player.hp,
        getStats(run).maxHp,
        "shockwave interrupts enemies",
      );
    run.player.energy = 0;
    const turn = run.turn;
    assert.equal(act(run, { type: "skill" }), false);
    assert.equal(run.turn, turn);
  }
});

test("ranged attacks telegraph a whole turn, commit their original line, and can be sidestepped", () => {
  const run = arena();
  const archer = enemy(run, "bone_archer", 13, 10);
  const fullHp = run.player.hp;
  act(run, { type: "wait" });
  assert.equal(run.player.hp, fullHp);
  assert(archer.intent);
  assert(getThreats(run).some((cell) => cell.x === 10 && cell.y === 10));
  assert(
    getThreats(run).some((cell) => cell.x === 12 && cell.y === 10),
    "entire firing line is marked",
  );
  act(run, { type: "move", dx: 0, dy: 1 });
  assert.equal(run.player.hp, fullHp);
  assert.equal(archer.intent, null);
  act(run, { type: "wait" });
  assert(archer.intent);
  act(run, { type: "wait" });
  assert(
    run.player.hp < fullHp,
    "waiting in the new committed attack takes damage",
  );
});

test("every boss telegraphs before damage and its defeat releases the exit", () => {
  for (const region of REGIONS) {
    const run = arena();
    run.floor = region.floors.at(-1);
    const boss = enemy(run, region.bossId, 12, 10);
    const hp = run.player.hp;
    act(run, { type: "wait" });
    assert.equal(run.player.hp, hp);
    assert(boss.intent);
    assert(getThreats(run).length > 0);
    run.map.exit = { x: 10, y: 10 };
    const turn = run.turn;
    assert.equal(act(run, { type: "interact" }), false);
    assert.equal(run.turn, turn);
    boss.hp = 1;
    run.player.x = 11;
    act(run, { type: "move", dx: 1, dy: 0 });
    assert.equal(boss.hp, 0);
    assert.equal(boss.intent, null);
    assert(run.bosses.includes(region.bossId));
    assert.equal(act(run, { type: "interact" }), true);
    assert.equal(run.phase, run.floor === 12 ? "won" : "reward");
  }
});

test("guard reduces a committed attack; dash avoids it and skips traps for exactly 2 energy", () => {
  const standing = arena();
  enemy(standing, "bone_archer", 13, 10, { attack: 10 });
  act(standing, { type: "wait" });
  const guarded = structuredClone(standing);
  const dashed = structuredClone(standing);
  act(standing, { type: "wait" });
  act(guarded, { type: "guard" });
  assert.equal(guarded.player.hp - standing.player.hp, 4);
  dashed.objects.push({ id: "trap", type: "trap", x: 11, y: 10, used: false });
  const energy = dashed.player.energy;
  act(dashed, { type: "dash", dx: 1, dy: 0 });
  assert.equal(dashed.player.x, 12);
  assert.equal(dashed.player.hp, getStats(dashed).maxHp);
  assert.equal(dashed.player.energy, energy - 2);
  assert.equal(dashed.objects[0].used, false);
  assert.deepEqual(dashed.player.statuses, []);
  act(dashed, { type: "wait" });
  assert.equal(dashed.player.energy, energy - 1, "waiting restores energy");
});

test("trap stepping, supply collection, fountain, shrine, and potion spending are persistent and single use", () => {
  const run = arena();
  run.objects.push({ id: "trap", type: "trap", x: 11, y: 10, used: false });
  act(run, { type: "move", dx: 1, dy: 0 });
  assert(run.player.hp < getStats(run).maxHp);
  assert.equal(run.objects[0].used, true);
  const hp = run.player.hp;
  act(run, { type: "move", dx: -1, dy: 0 });
  act(run, { type: "move", dx: 1, dy: 0 });
  assert.equal(run.player.hp, hp);
  assert.equal(act(run, { type: "potion" }), true);
  assert.equal(run.player.potions, 1);
  run.player.hp = 1;
  run.objects.push({
    id: "fountain",
    type: "fountain",
    x: 11,
    y: 11,
    used: false,
  });
  assert.equal(act(run, { type: "interact" }), true);
  assert(run.player.hp > 1);
  run.player.gold = 100;
  run.objects.push({ id: "shrine", type: "shrine", x: 12, y: 10, used: false });
  const attack = getStats(run).attack;
  assert.equal(act(run, { type: "interact" }), true);
  assert.equal(getStats(run).attack, attack + 1);
  assert.equal(run.player.gold, 77);
  assert.equal(act(run, { type: "interact" }), false);
});

test("all 12 floors progress with unique relic decisions, boss seals, and a terminal victory", () => {
  const run = createRun({ seed: 20261017 });
  run.creditedShards = 0;
  for (let floor = 1; floor <= 12; floor++) {
    assert.equal(run.floor, floor);
    assert.equal(validateRun(run), true, `valid floor ${floor}`);
    assert.equal(nextFloor(run), false, "cannot skip a live floor");
    assert.equal(
      run.enemies.filter((value) => value.boss).length,
      floor % 3 === 0 ? 1 : 0,
    );
    for (const value of run.enemies) value.hp = 0;
    run.player.x = run.map.exit.x;
    run.player.y = run.map.exit.y;
    assert.equal(act(run, { type: "interact" }), true);
    if (floor < 12) {
      assert.equal(run.phase, "reward");
      assert.equal(run.rewardChoices.length, 3);
      assert.equal(chooseRelic(run, "missing"), false);
      const before = run.relics.length;
      const id = run.rewardChoices[0];
      assert.equal(chooseRelic(run, id), true);
      assert.equal(run.relics.length, before + 1);
      assert.equal(run.phase, "playing");
      assert.equal(chooseRelic(run, id), false);
      assert.equal(run.player.energy, getStats(run).maxEnergy);
    } else {
      assert.equal(run.phase, "won");
      assert.equal(act(run, { type: "wait" }), false);
      assert.equal(nextFloor(run), false);
      assert.equal(validateRun(run), true);
    }
  }
  assert.equal(new Set(run.relics).size, 11);
  assert.equal(run.creditedShards, 0);
  assert(run.shards >= 60);
});

test("relic effects apply once, upgrades alter initial stats, and kills grant progression", () => {
  const run = arena();
  const upgraded = createRun({
    seed: 10,
    upgrades: { vitality: 2, might: 2, resilience: 1, focus: 2 },
  });
  assert.equal(upgraded.player.maxHp, CLASS_BY_ID.warden.hp + 8);
  assert.equal(upgraded.player.attack, CLASS_BY_ID.warden.attack + 2);
  assert.equal(upgraded.player.armor, CLASS_BY_ID.warden.armor + 1);
  assert.equal(upgraded.player.maxEnergy, CLASS_BY_ID.warden.energy + 2);
  run.relics = RELICS.map((relic) => relic.id);
  const stats = getStats(run);
  assert(stats.maxHp > run.player.maxHp);
  assert(stats.attack > run.player.attack);
  run.player.hp = 10;
  enemy(run, "ashling", 11, 10, { hp: 1 });
  assert.equal(act(run, { type: "move", dx: 1, dy: 0 }), true);
  assert.equal(run.kills, 1);
  assert.equal(run.shards, 1);
  assert(run.player.gold > 0);
  assert(run.player.xp > 0);
  assert(run.player.hp > 10);
});

test("lethal damage cannot be reversed by thorns kill healing or a retaliation level-up", () => {
  const run = arena();
  run.player.hp = 1;
  run.player.xp = 23;
  run.relics = ["briar_mantle", "blood_moss"];
  const attacker = enemy(run, "ashling", 11, 10, { hp: 1, attack: 100 });
  act(run, { type: "wait" });
  assert.equal(
    attacker.hp,
    0,
    "retaliation still resolves and credits the kill",
  );
  assert.equal(run.player.level, 2);
  assert.equal(run.kills, 1);
  assert.equal(run.phase, "dead");
  assert.equal(
    run.player.hp,
    0,
    "kill and level-up heals cannot resurrect a lethal hit",
  );
  assert.equal(validateRun(run), true);
});

test("disconnected, unfinishable and inconsistent restored expeditions are rejected", () => {
  const original = arena();
  const mutations = [
    (run) => {
      run.phase = "won";
    },
    (run) => {
      run.phase = "reward";
    },
    (run) => {
      run.rewardChoices = ["glass_eye"];
    },
    (run) => {
      run.bosses = ["ashling"];
    },
    (run) => {
      run.bosses = ["cinder_warden", "cinder_warden"];
    },
    (run) => {
      run.creditedKills = 1;
    },
    (run) => {
      run.victoryCredited = true;
    },
    (run) => {
      run.player.maxEnergy = 1000000;
    },
    (run) => {
      enemy(run, "ashling", 12, 10, { boss: true });
    },
    (run) => {
      for (let y = 1; y < run.map.height - 1; y++)
        run.map.tiles[y * run.map.width + 20] = 0;
    },
  ];
  for (const mutate of mutations) {
    const run = structuredClone(original);
    mutate(run);
    assert.equal(validateRun(run), false, mutate.toString());
  }
});

test("all twelve floors stay connected and restore energy from zero across varied dungeon seeds", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const run = createRun({ seed });
    for (let floor = 1; floor <= 12; floor++) {
      assert.equal(validateRun(run), true, `seed ${seed}, floor ${floor}`);
      const positions = [
        run.player,
        run.map.exit,
        ...run.enemies,
        ...run.objects,
      ].map((item) => item.y * run.map.width + item.x);
      assert.equal(
        new Set(positions).size,
        positions.length,
        `spawn separation seed ${seed}, floor ${floor}`,
      );
      for (const target of run.enemies) target.hp = 0;
      Object.assign(run.player, run.map.exit);
      act(run, { type: "interact" });
      if (floor < 12) {
        run.player.energy = 0;
        run.player.hp = 1;
        assert.equal(
          validateRun(run),
          true,
          "reward saves can resume before the choice",
        );
        chooseRelic(run, run.rewardChoices[0]);
        assert.equal(
          run.player.energy,
          getStats(run).maxEnergy,
          "each new floor restores all energy",
        );
        assert(run.player.hp > 1, "each descent restores life");
      } else assert.equal(run.phase, "won");
    }
  }
});

test("every class can defeat all four guardians using legal attacks, movement, potions and telegraphs", () => {
  for (const [regionIndex, region] of REGIONS.entries()) {
    for (const classId of Object.keys(CLASS_BY_ID)) {
      const run = arena(classId);
      run.floor = region.floors.at(-1);
      // Later guardians face a character with the attack and life earned on earlier floors.
      run.player.attack += regionIndex * 3;
      run.player.maxHp += regionIndex * 6;
      run.player.hp = run.player.maxHp;
      const boss = enemy(run, region.bossId, 12, 10);
      for (
        let turn = 0;
        boss.hp > 0 && run.phase === "playing" && turn < 300;
        turn++
      ) {
        const p = run.player;
        const stats = getStats(run);
        const threats = getThreats(run);
        const danger = (x, y) =>
          threats.some((cell) => cell.x === x && cell.y === y);
        const separation = Math.abs(p.x - boss.x) + Math.abs(p.y - boss.y);
        const moves = [
          { dx: 1, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 },
        ]
          .filter(
            ({ dx, dy }) =>
              run.map.tiles[(p.y + dy) * run.map.width + p.x + dx] &&
              !(p.x + dx === boss.x && p.y + dy === boss.y),
          )
          .sort(
            (a, b) =>
              Math.abs(p.x + a.dx - boss.x) +
              Math.abs(p.y + a.dy - boss.y) -
              (Math.abs(p.x + b.dx - boss.x) + Math.abs(p.y + b.dy - boss.y)),
          );
        const escape = moves.find(({ dx, dy }) => !danger(p.x + dx, p.y + dy));
        if (
          danger(p.x, p.y) &&
          classId === "warden" &&
          separation <= 2 &&
          p.energy >= stats.skillCost
        )
          act(run, { type: "skill" });
        else if (boss.cooldown > 0 && p.energy < stats.skillCost)
          act(run, { type: "guard" });
        else if (danger(p.x, p.y)) {
          if (escape) act(run, { type: "move", ...escape });
          else if (p.energy >= 2 && moves.length)
            act(run, { type: "dash", ...moves[0] });
          else act(run, { type: "guard" });
        } else if (p.hp < stats.maxHp * 0.4 && p.potions)
          act(run, { type: "potion" });
        else if (
          p.energy >= stats.skillCost &&
          separation <=
            (classId === "warden" ? 2 : classId === "ranger" ? 6 : 4)
        )
          act(run, { type: "skill" });
        else if (
          classId === "warden" &&
          separation <= 2 &&
          p.energy < stats.skillCost
        )
          act(run, { type: "guard" });
        else if (separation === 1)
          act(run, { type: "move", dx: boss.x - p.x, dy: boss.y - p.y });
        else if (escape) act(run, { type: "move", ...escape });
        else act(run, { type: "guard" });
      }
      assert.equal(
        boss.hp,
        0,
        `${classId} can defeat ${region.bossId}: ${JSON.stringify({ player: run.player, boss, turn: run.turn, log: run.log.slice(-12) })}`,
      );
      assert(run.player.hp > 0, `${classId} survives ${region.bossId}`);
      assert(run.bosses.includes(region.bossId));
      assert.equal(validateRun(run), true);
    }
  }
});
