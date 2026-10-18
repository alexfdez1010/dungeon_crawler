import test from "node:test";
import assert from "node:assert/strict";
import { act, chooseRelic, createRun, validateRun, visibleTiles } from "../web/engine.js";
import { TOTAL_FLOORS, UPGRADES } from "../web/content.js";
import { observeRun, simulateRun, summarize, upgradePreset } from "../web/simulation.js";

test("simulation is deterministic, including every action and per-floor metrics", () => {
  const options = { seed: 274, classId: "ranger", upgrades: upgradePreset("mid"), maxTurns: 300, trace: true };
  assert.deepEqual(simulateRun(options), simulateRun(options));
});

test("policy observation hides unobserved map, enemies, objects and RNG", () => {
  const run = createRun({ seed: 123 });
  const view = observeRun(run);
  const visible = visibleTiles(run);
  assert.equal(Object.hasOwn(view, "rng"), false);
  assert.equal(Object.hasOwn(view.map, "rooms"), false);
  assert(view.map.tiles.some((tile) => tile === null));
  for (let i = 0; i < view.map.tiles.length; i++) {
    assert.equal(view.map.tiles[i], run.map.explored[i] ? run.map.tiles[i] : null);
  }
  for (const entity of [...view.enemies, ...view.objects]) assert(visible.has(entity.y * run.map.width + entity.x));
  if (!run.map.explored[run.map.exit.y * run.map.width + run.map.exit.x]) assert.equal(view.map.exit, null);
  view.player.hp = 0;
  assert(run.player.hp > 0, "observation cannot mutate the live player");
});

test("full simulation trace replays solely through real engine actions", () => {
  const options = { seed: 1, classId: "luminary", upgrades: upgradePreset("max"), trace: true };
  let checked = 0;
  const result = simulateRun({ ...options, onStep: ({ run, before, action, step }) => {
    if (action.type === "relic") assert.equal(run.floor, before.floor + 1);
    else assert.equal(run.turn, before.turn + 1);
    if (step % 100 === 0 || run.phase === "dead" || run.phase === "won") {
      assert(validateRun(run), `invalid state at floor ${run.floor}, turn ${run.turn}`);
      checked++;
    }
  } });
  assert(checked > 0);
  assert.equal(result.outcome, "won", "a fully upgraded advanced character must have a real route to victory");
  assert.equal(result.floor, TOTAL_FLOORS);
  assert.equal(result.bosses.length, TOTAL_FLOORS / 3);
  const replay = createRun(options);
  for (const { floor, turn, hp, action } of result.actions) {
    assert.deepEqual([replay.floor, replay.turn, replay.player.hp], [floor, turn, hp]);
    assert(action.type === "relic" ? chooseRelic(replay, action.id) : act(replay, action));
  }
  assert.deepEqual([replay.floor, replay.turn, replay.player.hp, replay.kills], [result.floor, result.turns, result.hp, result.kills]);
  assert(validateRun(replay));
  assert.equal(result.floors.reduce((sum, floor) => sum + floor.turns, 0), result.turns);
});

test("the initial character cannot clear the campaign on the fixed balance seeds", () => {
  for (const seed of [1, 2, 3]) {
    const result = simulateRun({ seed, classId: "warden", upgrades: upgradePreset("zero"), policy: "tactical" });
    assert.equal(result.outcome, "dead", `initial seed ${seed} must end in a real defeat, not a bot limit`);
  }
  const unpreparedVeteran = simulateRun({ seed: 1, classId: "luminary", upgrades: upgradePreset("zero"), policy: "tactical" });
  assert.equal(unpreparedVeteran.outcome, "dead", "the advanced class still needs upgrades on the same seed that its max-upgraded replay wins");
});

test("upgrade matrices use purchasable levels, and report limits as stalled", () => {
  for (const upgrade of UPGRADES) {
    assert.equal(upgradePreset("max")[upgrade.id], upgrade.maxLevel);
    assert.equal(upgradePreset("mid")[upgrade.id], Math.floor(upgrade.maxLevel / 2));
    assert.equal(upgradePreset("zero")[upgrade.id], 0);
  }
  assert.throws(() => upgradePreset("impossible"));
  const limited = simulateRun({ seed: 1, maxTurns: 1 });
  assert.equal(limited.outcome, "stalled");
  assert.equal(limited.reason, "turn-limit");
  const summary = summarize([limited])[0];
  assert.equal(summary.dead, 0);
  assert.equal(summary.won, 0);
  assert.equal(summary.stalled, 1);
});
