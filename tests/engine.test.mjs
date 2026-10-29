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
import { CLASS_BY_ID, ENEMIES, RELICS, REGIONS, TOTAL_FLOORS, UPGRADES } from "../web/content.js";

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
      run.floor = TOTAL_FLOORS + 1;
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
    assert.equal(run.phase, run.floor === TOTAL_FLOORS ? "won" : "reward");
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
  assert.equal(dashed.player.energy, energy, "waiting restores two energy after a dash");
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

test("all campaign floors progress with unique relic decisions, boss seals, and a terminal victory", () => {
  const run = createRun({ seed: 20261017 });
  run.creditedShards = 0;
  for (let floor = 1; floor <= TOTAL_FLOORS; floor++) {
    assert.equal(run.floor, floor);
    assert.equal(validateRun(run), true, `valid floor ${floor}`);
    assert.equal(run.objects.filter((object) => object.type === "potion").length, floor % 3 === 1 ? 1 : 0);
    assert.equal(run.objects.filter((object) => object.type === "fountain").length, floor % 3 === 0 ? 1 : 0);
    assert.equal(nextFloor(run), false, "cannot skip a live floor");
    assert.equal(
      run.enemies.filter((value) => value.boss).length,
      floor % 3 === 0 ? 1 : 0,
    );
    for (const value of run.enemies) value.hp = 0;
    run.player.x = run.map.exit.x;
    run.player.y = run.map.exit.y;
    assert.equal(act(run, { type: "interact" }), true);
    if (floor < TOTAL_FLOORS) {
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
  assert.equal(new Set(run.relics).size, TOTAL_FLOORS - 1);
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
  run.player.xp = 29;
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

test("all campaign floors stay connected and restore energy from zero across varied dungeon seeds", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const run = createRun({ seed });
    for (let floor = 1; floor <= TOTAL_FLOORS; floor++) {
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
      if (floor < TOTAL_FLOORS) {
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

test("repeated rupture cannot permanently interrupt an enemy", () => {
  const run = arena();
  const target = enemy(run, "ash_guard", 11, 10, { hp: 500, maxHp: 500, attack: 8 });
  const initialHp = run.player.hp;
  act(run, { type: "skill" });
  assert.equal(run.player.hp, initialHp, "the first rupture creates a real opening");
  assert(target.resolve > 0);
  run.player.energy = getStats(run).maxEnergy;
  act(run, { type: "skill" });
  assert(run.player.hp < initialHp, "an enemy with poise retaliates even when rupture is recast");
  const restored = JSON.parse(JSON.stringify(run));
  assert.equal(validateRun(restored), true, "poise survives save restoration");
  for (let turn = 0; turn < 3; turn++) act(run, { type: "guard" });
  assert.equal(target.resolve, 0, "the interrupt window reopens after four active turns");
});

test("armor cannot erase late attacks and piercing weakens armor without removing guard", () => {
  const run = arena();
  run.player.armor = 20;
  const target = enemy(run, "ash_guard", 11, 10, { attack: 10 });
  const hp = run.player.hp;
  act(run, { type: "guard" });
  assert.equal(hp - run.player.hp, 4, "even heavy armor takes 40 percent of the hit");
  target.hp = 0;
});

test("boss recovery pursues distant players and threatens adjacent counterattacks", () => {
  const run = arena();
  const boss = enemy(run, REGIONS[0].bossId, 12, 10, { cooldown: 1 });
  act(run, { type: "wait" });
  assert.equal(boss.x, 11, "recovery closes distance");
  boss.cooldown = 1;
  const hp = run.player.hp;
  act(run, { type: "wait" });
  assert(run.player.hp < hp, "the adjacent recovery swing is dangerous");
});

test("charges commit their line and advance only through unoccupied tiles", () => {
  const run = arena();
  const charger = enemy(run, "root_brute", 13, 10);
  act(run, { type: "wait" });
  assert.equal(charger.intent.kind, "charge");
  const hp = run.player.hp;
  act(run, { type: "move", dx: 0, dy: 1 });
  assert.equal(run.player.hp, hp);
  assert.equal(charger.x, 10);
  assert.equal(charger.y, 10);
});

test("lifesteal only heals the actual health removed, never overkill", () => {
  const run = arena();
  run.relics = ["hunger_ring"];
  run.player.hp = 10;
  run.player.attack = 100;
  enemy(run, "ashling", 11, 10, { hp: 1, maxHp: 1 });
  act(run, { type: "move", dx: 1, dy: 0 });
  assert.equal(run.player.hp, 10);
});

test("starting upgrades respect the same published caps as the permanent shop", () => {
  const capped = Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, upgrade.maxLevel]));
  const overflow = Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, 999]));
  assert.deepEqual(createRun({ seed: 42, upgrades: capped }), createRun({ seed: 42, upgrades: overflow }));
});

test("legacy victory saves remain valid while new campaigns use the shared final floor", () => {
  const run = createRun({ seed: 123 });
  assert.equal(run.campaignFloors, TOTAL_FLOORS);
  if (TOTAL_FLOORS > 12) {
    while (run.floor < 12) {
      for (const target of run.enemies) target.hp = 0;
      Object.assign(run.player, run.map.exit);
      act(run, { type: "interact" });
      chooseRelic(run, run.rewardChoices[0]);
    }
    for (const target of run.enemies) target.hp = 0;
    run.phase = "won";
    delete run.campaignFloors;
    assert.equal(validateRun(run), true);
    run.campaignFloors = TOTAL_FLOORS;
    assert.equal(validateRun(run), false, "new campaigns cannot claim victory early");
  }
});

test("attacks and retreat do not restore energy in combat; guard and safe exploration do", () => {
  const run = arena();
  enemy(run, "ash_guard", 11, 10, { hp: 100, maxHp: 100, attack: 1 });
  run.player.energy = 0;
  act(run, { type: "move", dx: 1, dy: 0 });
  assert.equal(run.player.energy, 0);
  act(run, { type: "move", dx: 0, dy: 1 });
  assert.equal(run.player.energy, 0);
  act(run, { type: "guard" });
  assert.equal(run.player.energy, 1);
  run.enemies = [];
  act(run, { type: "move", dx: 0, dy: 1 });
  assert.equal(run.player.energy, 2);
});

test("offerings rotate between attack, health, and energy instead of adding attack every floor", () => {
  for (let floor = 1; floor <= 3; floor++) {
    const run = arena();
    run.floor = floor;
    run.player.gold = 100;
    const before = { ...run.player };
    run.objects = [{ id: "offering", type: "shrine", x: 11, y: 10, used: false }];
    assert.equal(act(run, { type: "interact" }), true);
    assert.equal(run.player.attack - before.attack, floor === 1 ? 1 : 0);
    assert.equal(run.player.maxHp - before.maxHp, floor === 2 ? 4 : 0);
    assert.equal(run.player.maxEnergy - before.maxEnergy, floor === 3 ? 1 : 0);
    assert.equal(run.player.gold, 100 - (20 + floor * 3));
    assert.equal(act(run, { type: "interact" }), false);
  }
});

test("piercing reduces ordinary armor, while guard still absorbs damage", () => {
  const physical = arena();
  physical.player.armor = 5;
  enemy(physical, "ash_guard", 11, 10, { attack: 10 });
  const piercing = arena();
  piercing.player.armor = 5;
  enemy(piercing, "furnace_thrall", 11, 10, { attack: 10 });
  const guarded = structuredClone(piercing);
  act(physical, { type: "wait" });
  act(piercing, { type: "wait" });
  act(guarded, { type: "guard" });
  assert(piercing.player.hp < physical.player.hp);
  assert(guarded.player.hp > piercing.player.hp);
});

test("the advanced solar skill pierces armor and interruption respects the same poise window", () => {
  const run = arena("luminary");
  const target = enemy(run, "ash_guard", 11, 10, { hp: 200, maxHp: 200, armor: 10 });
  target.intent = { kind: "shot", damage: 10, cells: [{ x: 10, y: 10 }] };
  const expectedDamage = getStats(run).skillDamage - Math.floor(10 * 0.6);
  const hp = run.player.hp;
  act(run, { type: "skill" });
  assert.equal(target.hp, 200 - expectedDamage);
  assert.equal(run.player.hp, hp, "the committed attack is interrupted");
  assert.equal(target.intent, null);
  assert(target.resolve > 0);
  target.intent = { kind: "shot", damage: 10, cells: [{ x: 10, y: 10 }] };
  run.player.energy = getStats(run).maxEnergy;
  act(run, { type: "skill" });
  assert(run.player.hp < hp, "poise protects the next committed attack");
});


test("alerted enemies close two tiles without receiving a free attack on arrival", () => {
  const run = arena();
  const target = enemy(run, "ashling", 14, 10);
  const hp = run.player.hp;
  act(run, { type: "wait" });
  assert.equal(target.x, 12);
  act(run, { type: "wait" });
  assert.equal(target.x, 11);
  assert.equal(run.player.hp, hp, "movement and attacking remain separate actions");
  act(run, { type: "wait" });
  assert(run.player.hp < hp);
});

test("potion capacity preserves full caches, scales with supplies, and accepts legacy stocks", () => {
  const run = arena();
  assert.equal(getStats(run).potionCapacity, 3);
  run.player.potions = 3;
  run.objects = [{ id: "supply", type: "potion", x: 11, y: 10, used: false }];
  act(run, { type: "move", dx: 1, dy: 0 });
  assert.equal(run.player.potions, 3);
  assert.equal(run.objects[0].used, false);
  run.player.hp = 1;
  act(run, { type: "potion" });
  act(run, { type: "move", dx: -1, dy: 0 });
  act(run, { type: "move", dx: 1, dy: 0 });
  assert.equal(run.player.potions, 3);
  assert.equal(run.objects[0].used, true);
  const upgraded = createRun({ seed: 1, upgrades: { supplies: 3 } });
  assert.equal(getStats(upgraded).potionCapacity, 6);
  assert.equal(upgraded.player.potions, 5);
  delete run.player.potionCapacity;
  run.player.potions = 14;
  assert.equal(validateRun(run), true, "old saves retain their earned stock");
  run.objects.push({ id: "legacy-supply", type: "potion", x: 12, y: 10, used: false });
  act(run, { type: "move", dx: 1, dy: 0 });
  assert.equal(run.player.potions, 14);
  assert.equal(run.objects[1].used, false);
});
