import { getThreats, visibleTiles } from "./engine.js?v=3.1.0";

const directions = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
const point = (value) =>
  value && Number.isSafeInteger(value.x) && Number.isSafeInteger(value.y);
const inside = (map, value) =>
  point(value) &&
  value.x >= 0 &&
  value.y >= 0 &&
  value.x < map.width &&
  value.y < map.height;
const index = (map, value) => value.y * map.width + value.x;

function validRun(run) {
  const map = run?.map;
  return Boolean(
    map &&
      Number.isSafeInteger(map.width) &&
      map.width > 0 &&
      Number.isSafeInteger(map.height) &&
      map.height > 0 &&
      Number.isSafeInteger(map.width * map.height) &&
      map.tiles?.length === map.width * map.height &&
      map.explored?.length === map.tiles.length &&
      inside(map, run.player) &&
      Number.isFinite(run.player.hp) &&
      Array.isArray(run.enemies) &&
      Array.isArray(run.objects),
  );
}

function travelContext(run) {
  const visible = visibleTiles(run);
  const blocked = new Set(
    [
      ...run.enemies.filter((enemy) => enemy.hp > 0),
      ...run.objects.filter((object) => object.type === "trap" && !object.used),
    ]
      .filter((value) => inside(run.map, value))
      .map((value) => index(run.map, value)),
  );
  return { visible, blocked };
}

function safeTile(run, value, { visible, blocked }) {
  if (!inside(run.map, value)) return false;
  const tile = index(run.map, value);
  return (
    run.map.tiles[tile] === 1 &&
    (run.map.explored[tile] === true || visible.has(tile)) &&
    !blocked.has(tile)
  );
}

/** Shortest known safe route, excluding the player's starting tile. Does not reveal fog. */
export function findExploredPath(run, target, { maxSteps = 100 } = {}) {
  if (
    !validRun(run) ||
    run.phase !== "playing" ||
    run.player.hp <= 0 ||
    !inside(run.map, target) ||
    !Number.isSafeInteger(maxSteps) ||
    maxSteps < 1
  )
    return [];
  const context = travelContext(run);
  if (!safeTile(run, target, context)) return [];
  const start = index(run.map, run.player);
  const destination = index(run.map, target);
  if (start === destination) return [];
  const queue = [{ x: run.player.x, y: run.player.y, depth: 0 }];
  const parents = new Map([[start, null]]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    if (current.depth >= maxSteps) continue;
    for (const [dx, dy] of directions) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (!safeTile(run, next, context)) continue;
      const tile = index(run.map, next);
      if (parents.has(tile)) continue;
      parents.set(tile, index(run.map, current));
      if (tile === destination) {
        const route = [];
        for (let step = tile; step !== start; step = parents.get(step)) {
          route.push({
            x: step % run.map.width,
            y: Math.floor(step / run.map.width),
          });
        }
        return route.reverse();
      }
      queue.push({ ...next, depth: current.depth + 1 });
    }
  }
  return [];
}

/** Recompute visibility after every turn so newly spotted enemies interrupt travel. */
export function shouldStopTravel(run, { ignoreEnemyId } = {}) {
  if (!validRun(run) || run.phase !== "playing" || run.player.hp <= 0)
    return true;
  const visible = visibleTiles(run);
  if (
    run.enemies.some(
      (enemy) =>
        enemy.hp > 0 &&
        (ignoreEnemyId === undefined || enemy.id !== ignoreEnemyId) &&
        inside(run.map, enemy) &&
        visible.has(index(run.map, enemy)),
    )
  )
    return true;
  return getThreats(run).some(
    (cell) =>
      (ignoreEnemyId === undefined || cell.enemyId !== ignoreEnemyId) &&
      inside(run.map, cell) &&
      ((cell.x === run.player.x && cell.y === run.player.y) ||
        visible.has(index(run.map, cell))),
  );
}

/** Validate a queued step against the current map before handing it to the engine. */
export function travelAction(run, nextStep) {
  if (
    !validRun(run) ||
    run.phase !== "playing" ||
    run.player.hp <= 0 ||
    !inside(run.map, nextStep)
  )
    return null;
  const dx = nextStep.x - run.player.x;
  const dy = nextStep.y - run.player.y;
  if (
    Math.abs(dx) + Math.abs(dy) !== 1 ||
    !safeTile(run, nextStep, travelContext(run))
  )
    return null;
  return { type: "move", dx, dy };
}
