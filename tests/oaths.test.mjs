import test from "node:test";
import assert from "node:assert/strict";
import {
  act,
  createRun,
  forecastIncomingDamage,
  getStats,
  validateRun,
} from "../web/engine.js";
import { CLASSES, ENEMIES, OATHS, RELICS } from "../web/content.js";
import { simulateRun } from "../web/simulation.js";

function arena(oathId = "lantern") {
  const run = createRun({ seed: 58034, oathId });
  run.map.tiles = run.map.tiles.map((_, i) => {
    const x = i % run.map.width;
    const y = Math.floor(i / run.map.width);
    return Number(x > 0 && x < run.map.width - 1 && y > 0 && y < run.map.height - 1);
  });
  run.player.x = 10;
  run.player.y = 10;
  run.enemies = [];
  run.objects = [];
  run.map.exit = { x: 38, y: 26 };
  return run;
}

function attacker(run, { type = "bone_archer", x = 13, y = 10, damage = 9, cells = [{ x: 10, y: 10 }], ...extras } = {}) {
  const definition = ENEMIES[type];
  const enemy = {
    id: `forecast-${run.enemies.length}`,
    type,
    x,
    y,
    hp: definition.hp,
    maxHp: definition.hp,
    attack: definition.attack,
    armor: definition.armor,
    boss: definition.behavior === "boss",
    alerted: true,
    cooldown: 0,
    intent: { kind: "shot", damage, cells, turn: run.turn },
    ...extras,
  };
  run.enemies.push(enemy);
  return enemy;
}

test("starting oaths are explicit sidegrades for every class and survive repeated restoration", () => {
  assert.deepEqual(OATHS.map((oath) => oath.id).sort(), ["ember", "lantern", "tide"]);
  for (const character of CLASSES) {
    const standard = createRun({ classId: character.id, seed: 58034 });
    const base = getStats(standard);
    for (const [oathId, differences] of [
      ["lantern", { attack: 0, maxHp: 0, maxEnergy: 0 }],
      ["ember", { attack: 1, maxHp: -6, maxEnergy: 0 }],
      ["tide", { attack: -1, maxHp: 0, maxEnergy: 2 }],
    ]) {
      let run = createRun({ classId: character.id, oathId, seed: 58034 });
      for (let restoration = 0; restoration < 4; restoration++) {
        assert(validateRun(run), `${character.id}/${oathId}/${restoration} is restorable`);
        const stats = getStats(run);
        for (const [stat, difference] of Object.entries(differences)) {
          assert.equal(stats[stat], base[stat] + difference, `${character.id}/${oathId}/${stat}`);
        }
        assert.equal(run.player.hp, stats.maxHp, "the initial health matches the chosen oath");
        assert.equal(run.player.energy, stats.maxEnergy, "the initial energy matches the chosen oath");
        assert.equal(run.player.attack, standard.player.attack, "derived oath attack does not change base stats");
        assert.equal(run.player.maxHp, standard.player.maxHp, "derived oath health does not change base stats");
        run = JSON.parse(JSON.stringify(run));
      }
    }
  }
});

test("old saves without an oath retain standard stats; invalid oath saves are rejected", () => {
  const run = createRun({ seed: 99 });
  const expected = getStats(run);
  delete run.oathId;
  assert(validateRun(run));
  assert.deepEqual(getStats(run), expected);
  for (const oathId of ["missing", "__proto__", "toString", 0, null, {}, ["ember"]]) {
    const invalid = structuredClone(run);
    invalid.oathId = oathId;
    assert.equal(validateRun(invalid), false, `invalid oath ${String(oathId)}`);
  }
  for (const oathId of ["missing", "__proto__", "toString", null, {}, ["ember"]]) {
    const safe = createRun({ seed: 99, oathId });
    assert.equal(safe.oathId, "lantern");
    assert.deepEqual(getStats(safe), expected);
  }
});

test("each oath retains deterministic combat rolls after save/reload", () => {
  for (const { id } of OATHS) {
    const run = arena(id);
    attacker(run, { x: 11, damage: 6 });
    run.relics = ["glass_eye", "mist_cloak"];
    const restored = JSON.parse(JSON.stringify(run));
    for (const action of [
      { type: "guard" },
      { type: "wait" },
      { type: "move", dx: 1, dy: 0 },
      { type: "skill" },
      { type: "wait" },
    ]) {
      assert.equal(act(run, action), act(restored, action));
      assert.deepEqual(run, restored, `deterministic ${id}/${action.type}`);
      assert(validateRun(restored));
    }
  }
});

test("focus restores two energy while guard restores one and reduces a real committed hit", () => {
  const focused = arena();
  const guarded = arena();
  focused.player.energy = 0;
  guarded.player.energy = 0;
  attacker(focused, { damage: 9 });
  attacker(guarded, { damage: 9 });
  const hp = focused.player.hp;
  assert(act(focused, { type: "wait" }));
  assert(act(guarded, { type: "guard" }));
  assert.equal(focused.player.energy, 2);
  assert.equal(guarded.player.energy, 1);
  assert(focused.player.hp < guarded.player.hp, "guard exchanges recovery speed for protection");
  assert(guarded.player.hp < hp, "guard still accepts damage");
  assert.equal(focused.turn, 1);
  assert.equal(guarded.turn, 1);
  assert.deepEqual(guarded.player.statuses, [], "the block does not persist into future turns");
  focused.enemies = [];
  focused.player.energy = getStats(focused).maxEnergy - 1;
  assert(act(focused, { type: "wait" }));
  assert.equal(focused.player.energy, getStats(focused).maxEnergy, "focus cannot overfill energy");
});

test("damage forecast matches announced attacks with armor, guard and piercing, without consuming RNG", () => {
  const run = arena();
  run.player.armor = 7;
  attacker(run, { damage: 14 });
  const piercingType = Object.values(ENEMIES).find((enemy) => enemy.pierceArmor > 0 && enemy.behavior !== "boss")?.id;
  assert(piercingType, "the fixture exercises an enemy with armor piercing");
  attacker(run, { type: piercingType, x: 14, damage: 11 });
  const before = structuredClone(run);
  const forecast = forecastIncomingDamage(run);
  assert.deepEqual(run, before, "forecast is a read-only operation, including RNG");
  assert.equal(forecast.attacks, 2);
  assert.equal(forecast.lethal, forecast.damage >= run.player.hp);
  const waiting = structuredClone(run);
  const guarded = structuredClone(run);
  assert(act(waiting, { type: "wait" }));
  assert(act(guarded, { type: "guard" }));
  assert.equal(before.player.hp - waiting.player.hp, forecast.damage);
  assert.equal(before.player.hp - guarded.player.hp, forecast.guardedDamage);
});

test("forecast ignores missed, dead and interrupted attacks and never invents hidden melee damage", () => {
  const run = arena();
  attacker(run, { cells: [{ x: 9, y: 10 }] });
  attacker(run, { x: 14, hp: 0 });
  attacker(run, { x: 15, stunned: 1 });
  attacker(run, { type: "ashling", x: 11, intent: null });
  const before = structuredClone(run);
  const forecast = forecastIncomingDamage(run);
  assert.equal(forecast.damage, 0);
  assert.equal(forecast.guardedDamage, 0);
  assert.equal(forecast.attacks, 0);
  assert.equal(forecast.lethal, false);
  assert.deepEqual(run, before);
});

test("forecast labels random dodge as uncertainty and recognizes guaranteed dodge and lethal hits", () => {
  const run = arena();
  run.relics = ["mist_cloak"];
  run.player.hp = 2;
  attacker(run, { damage: 12 });
  const rng = run.rng;
  const danger = forecastIncomingDamage(run);
  assert.equal(danger.uncertain, true, "a random dodge is not promised as protection");
  assert.equal(danger.lethal, true);
  assert.equal(danger.guardedLethal, true);
  assert.equal(run.rng, rng);
  run.player.statuses.push("dodge");
  const dodged = forecastIncomingDamage(run);
  assert.equal(dodged.damage, 0);
  assert.equal(dodged.guardedDamage, 0);
  assert.equal(dodged.lethal, false);
});

test("simulation reports the oath it actually exercised and remains deterministic", () => {
  const options = { seed: 274, classId: "ranger", oathId: "tide", maxTurns: 80, trace: true };
  const first = simulateRun(options);
  assert.equal(first.oathId, "tide");
  assert.deepEqual(first, simulateRun(options));
  assert.equal(first.floors[0].entryStats.maxEnergy, createRun(options).player.energy);
  assert(first.decisions > 0);
});

test("relic drafts offer three build paths while available and exhaust the pool safely", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const run = arena();
    run.rng = seed;
    run.player.x = run.map.exit.x;
    run.player.y = run.map.exit.y;
    assert(act(run, { type: "interact" }));
    assert.equal(run.rewardChoices.length, 3);
    assert.equal(new Set(run.rewardChoices).size, 3);
    assert.deepEqual(run.rewardChoices.map((id) => RELICS.find((relic) => relic.id === id).path).sort(), ["arcana", "assault", "survival"]);
    assert(validateRun(run));
  }
  const scarce = arena();
  const remaining = RELICS.filter((relic) => relic.path === "arcana").slice(0, 2);
  scarce.relics = RELICS.filter((relic) => !remaining.includes(relic)).map((relic) => relic.id);
  scarce.player.x = scarce.map.exit.x;
  scarce.player.y = scarce.map.exit.y;
  assert(act(scarce, { type: "interact" }));
  assert.deepEqual([...scarce.rewardChoices].sort(), remaining.map((relic) => relic.id).sort());
  assert(validateRun(scarce));
});

test("specialised relics preserve their attack-versus-skill tradeoff for every class and rounding boundary", () => {
  for (const character of CLASSES) {
    const run = createRun({ classId: character.id, seed: 58034 });
    for (let attack = 1; attack <= 100; attack++) {
      run.player.attack = attack;
      const statsWith = (id) => {
        run.relics = [id];
        return getStats(run);
      };
      const blade = statsWith("oath_blade");
      const comet = statsWith("comet_shard");
      const coal = statsWith("furnace_coal");
      assert(blade.attack > comet.attack, `${character.id}/${attack}: Hoja favours ordinary attacks`);
      assert(comet.attack > coal.attack, `${character.id}/${attack}: Cometa retains an attack benefit`);
      assert(coal.skillDamage > blade.skillDamage, `${character.id}/${attack}: Ascua beats Hoja at skill damage`);
      assert(coal.skillDamage > comet.skillDamage, `${character.id}/${attack}: Ascua beats Cometa at skill damage`);
      assert(blade.thorns > 0, "Hoja also has its documented close-combat retaliation");
    }
  }
});
