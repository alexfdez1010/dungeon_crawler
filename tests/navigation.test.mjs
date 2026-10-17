import test from "node:test";
import assert from "node:assert/strict";
import {
  findExploredPath,
  shouldStopTravel,
  travelAction,
} from "../web/navigation.js";

function arena(width = 25, height = 7) {
  return {
    phase: "playing",
    player: { x: 1, y: 3, hp: 10 },
    map: {
      width,
      height,
      tiles: Array(width * height).fill(1),
      explored: Array(width * height).fill(true),
    },
    enemies: [],
    objects: [],
  };
}
const tile = (run, x, y) => y * run.map.width + x;
const foe = (x, y, extras = {}) => ({
  id: "foe",
  x,
  y,
  hp: 10,
  intent: null,
  ...extras,
});

test("routes are shortest, deterministic, exclude the start and do not mutate the run", () => {
  const run = arena();
  const before = structuredClone(run);
  assert.deepEqual(findExploredPath(run, { x: 3, y: 4 }), [
    { x: 2, y: 3 },
    { x: 3, y: 3 },
    { x: 3, y: 4 },
  ]);
  assert.deepEqual(run, before);
  assert.deepEqual(findExploredPath(run, run.player), []);
  assert.deepEqual(findExploredPath(run, { x: 3, y: 4 }, { maxSteps: 2 }), []);
  assert.equal(
    findExploredPath(run, { x: 3, y: 4 }, { maxSteps: 3 }).length,
    3,
  );
});

test("unknown destinations and shortcuts stay hidden while currently visible cells are usable", () => {
  const run = arena();
  run.map.explored.fill(false);
  assert.equal(findExploredPath(run, { x: 3, y: 3 }).length, 2);
  assert.deepEqual(findExploredPath(run, { x: 12, y: 3 }), []);
  assert(run.map.explored.every((value) => value === false));
  // The distant destination is known, but every route to it crosses unknown fog.
  run.map.explored[tile(run, 12, 3)] = true;
  assert.deepEqual(findExploredPath(run, { x: 12, y: 3 }), []);
  for (let x = 9; x <= 12; x++) run.map.explored[tile(run, x, 4)] = true;
  run.map.explored[tile(run, 8, 4)] = true;
  const route = findExploredPath(run, { x: 12, y: 3 });
  assert(route.length > 0);
  assert(route.some(({ x, y }) => x === 10 && y === 4));
  assert(!route.some(({ x, y }) => x === 10 && y === 3));
});

test("walls, living occupants, and unused traps are avoided; spent traps and objects allow travel", () => {
  const run = arena();
  run.objects = [{ x: 2, y: 3, type: "trap", used: false }];
  assert(
    !findExploredPath(run, { x: 3, y: 3 }).some(
      ({ x, y }) => x === 2 && y === 3,
    ),
  );
  assert.deepEqual(findExploredPath(run, { x: 2, y: 3 }), []);
  run.objects[0].used = true;
  assert.equal(findExploredPath(run, { x: 2, y: 3 }).length, 1);
  for (const type of ["chest", "shrine", "fountain"]) {
    run.objects = [{ x: 2, y: 3, type, used: false }];
    assert.equal(findExploredPath(run, { x: 2, y: 3 }).length, 1);
  }
  run.enemies = [foe(2, 3)];
  assert.deepEqual(findExploredPath(run, { x: 2, y: 3 }), []);
  assert(
    !findExploredPath(run, { x: 3, y: 3 }).some(
      ({ x, y }) => x === 2 && y === 3,
    ),
  );
  run.enemies[0].hp = 0;
  assert.equal(findExploredPath(run, { x: 2, y: 3 }).length, 1);
  run.map.tiles[tile(run, 2, 3)] = 0;
  assert.deepEqual(findExploredPath(run, { x: 2, y: 3 }), []);
});

test("stale queued steps are checked against current occupancy, traps, walls, fog, and position", () => {
  const run = arena();
  const step = { x: 2, y: 3 };
  assert.deepEqual(travelAction(run, step), { type: "move", dx: 1, dy: 0 });
  run.enemies.push(foe(2, 3));
  assert.equal(travelAction(run, step), null);
  run.enemies = [];
  run.objects.push({ ...step, type: "trap", used: false });
  assert.equal(travelAction(run, step), null);
  run.objects = [];
  run.map.tiles[tile(run, 2, 3)] = 0;
  assert.equal(travelAction(run, step), null);
  run.map.tiles[tile(run, 2, 3)] = 1;
  run.player.x = 12;
  run.map.explored[tile(run, 2, 3)] = false;
  assert.equal(travelAction(run, step), null);
  assert.equal(travelAction(run, { x: 13, y: 4 }), null);
  assert.equal(travelAction(run, run.player), null);
});

test("travel stops when a living enemy enters visibility and on visible or player-targeting threats", () => {
  const run = arena();
  run.enemies.push(foe(12, 3));
  assert.equal(shouldStopTravel(run), false);
  run.enemies[0].x = 8;
  assert.equal(shouldStopTravel(run), true);
  assert.equal(shouldStopTravel(run, { ignoreEnemyId: "foe" }), false);
  run.enemies[0].hp = 0;
  assert.equal(shouldStopTravel(run), false);
  run.enemies[0] = foe(12, 3, {
    intent: { kind: "shot", cells: [{ x: 3, y: 3 }] },
  });
  assert.equal(shouldStopTravel(run), true);
  run.enemies[0].intent.cells = [{ x: 1, y: 3 }];
  assert.equal(shouldStopTravel(run), true);
  assert.equal(shouldStopTravel(run, { ignoreEnemyId: "foe" }), false);
  run.enemies[0].intent.cells = [{ x: 20, y: 3 }];
  assert.equal(shouldStopTravel(run), false);
});

test("nonplaying, dead, malformed and out-of-bounds inputs fail closed", () => {
  const run = arena();
  for (const target of [
    null,
    {},
    { x: NaN, y: 3 },
    { x: Infinity, y: 3 },
    { x: "2", y: 3 },
    { x: 1.5, y: 3 },
    { x: -1, y: 3 },
    { x: 25, y: 3 },
    { x: 2, y: 7 },
  ]) {
    assert.deepEqual(findExploredPath(run, target), []);
    assert.equal(travelAction(run, target), null);
  }
  for (const maxSteps of [0, -1, NaN, Infinity, 1.5, "4"]) {
    assert.deepEqual(findExploredPath(run, { x: 2, y: 3 }, { maxSteps }), []);
  }
  for (const phase of ["dead", "reward", "won"]) {
    run.phase = phase;
    assert.equal(shouldStopTravel(run), true);
    assert.deepEqual(findExploredPath(run, { x: 2, y: 3 }), []);
    assert.equal(travelAction(run, { x: 2, y: 3 }), null);
  }
  run.phase = "playing";
  run.player.hp = 0;
  assert.equal(shouldStopTravel(run), true);
  assert.equal(travelAction(run, { x: 2, y: 3 }), null);
  for (const invalid of [
    null,
    {},
    { ...arena(), player: { x: NaN, y: 0, hp: 10 } },
  ]) {
    assert.equal(shouldStopTravel(invalid), true);
    assert.deepEqual(findExploredPath(invalid, { x: 2, y: 3 }), []);
    assert.equal(travelAction(invalid, { x: 2, y: 3 }), null);
  }
});
