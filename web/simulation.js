import * as defaultEngine from "./engine.js";
import * as defaultWorld from "./content.js";

const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const key = (map, p) => p.y * map.width + p.x;

/** The policy receives only the information available to a player, never RNG or hidden entities. */
export function observeRun(run, engine = defaultEngine) {
  const visible = engine.visibleTiles(run);
  const known = (p) => run.map.explored[key(run.map, p)];
  return {
    floor: run.floor, turn: run.turn, phase: run.phase,
    player: structuredClone(run.player), stats: engine.getStats(run),
    map: {
      width: run.map.width, height: run.map.height,
      tiles: run.map.tiles.map((tile, i) => run.map.explored[i] ? tile : null),
      exit: known(run.map.exit) ? { ...run.map.exit } : null,
    },
    visible: [...visible],
    enemies: run.enemies.filter((e) => e.hp > 0 && visible.has(key(run.map, e))).map((e) => structuredClone(e)),
    objects: run.objects.filter((o) => visible.has(key(run.map, o))).map((o) => ({ ...o })),
    rewardChoices: [...run.rewardChoices],
  };
}

export function upgradePreset(name, world = defaultWorld) {
  if (!["zero", "mid", "max"].includes(name)) throw new Error(`Unknown upgrade preset: ${name}`);
  return Object.fromEntries(world.UPGRADES.map((u) => [u.id,
    name === "max" ? u.maxLevel : name === "mid" ? Math.floor(u.maxLevel / 2) : 0]));
}

function walkable(view, p) {
  return p.x >= 0 && p.y >= 0 && p.x < view.map.width && p.y < view.map.height && view.map.tiles[key(view.map, p)] === 1;
}

function routes(view) {
  const start = key(view.map, view.player);
  const queue = [{ ...view.player, first: null, steps: 0 }];
  const seen = new Map([[start, queue[0]]]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const cell = queue[cursor];
    for (const [dx, dy] of directions) {
      const next = { x: cell.x + dx, y: cell.y + dy };
      const tile = key(view.map, next);
      if (!walkable(view, next) || seen.has(tile)) continue;
      // Known traps are navigable so a one-tile corridor cannot create a false stall.
      const node = { ...next, first: cell.first || { type: "move", dx, dy }, steps: cell.steps + 1 };
      seen.set(tile, node);
      if (!view.enemies.some((e) => distance(e, next) === 0)) queue.push(node);
    }
  }
  return [...seen.values()];
}

function chooseRelic(view, policy, world) {
  if (policy === "naive") return view.rewardChoices[0];
  const weights = { attack: 8, armor: 9, maxHp: 0.4, maxEnergy: 0.8, healOnKill: 8, lifesteal: 80, energyOnKill: 7, skillDamage: 4, dodge: 40, critChance: 22, thorns: 2, potionPower: 0.3 };
  const score = (id) => Object.entries(world.RELICS.find((r) => r.id === id)?.effect || {})
    .reduce((sum, [name, value]) => sum + (weights[name] || 0) * value, 0);
  return [...view.rewardChoices].sort((a, b) => score(b) - score(a))[0];
}

/** Stateful exploration memory contains only previously observed objects and visited tiles. */
export function createPolicy({ name = "tactical", world = defaultWorld } = {}) {
  if (!["naive", "tactical"].includes(name)) throw new Error(`Unknown policy: ${name}`);
  let floor = 0;
  let objects = new Map();
  let sightings = new Map();
  let visits = new Map();
  return (view) => {
    if (view.phase === "reward") return { type: "relic", id: chooseRelic(view, name, world) };
    if (floor !== view.floor) { floor = view.floor; objects = new Map(); sightings = new Map(); visits = new Map(); }
    for (const o of view.objects) objects.set(o.id, o);
    const visible = new Set(view.visible);
    for (const [id, enemy] of sightings) {
      if (visible.has(key(view.map, enemy)) && !view.enemies.some((e) => e.id === id)) sightings.delete(id);
    }
    for (const enemy of view.enemies) sightings.set(enemy.id, enemy);
    const player = view.player;
    const tile = key(view.map, player);
    visits.set(tile, (visits.get(tile) || 0) + 1);
    const available = [...objects.values()].filter((o) => !o.used);
    const enemies = [...view.enemies].sort((a, b) => distance(a, player) - distance(b, player));
    const adjacent = enemies.filter((e) => distance(e, player) === 1);
    const threats = enemies.flatMap((e) => e.intent?.cells || []);
    const threatened = (p) => threats.some((cell) => distance(cell, p) === 0);
    const range = player.classId === "warden" ? 2 : player.classId === "ranger" ? 6 : player.classId === "luminary" ? 5 : 4;
    const targets = enemies.filter((e) => distance(e, player) <= range);
    const canSkill = player.energy >= view.stats.skillCost && targets.length;
    const moves = directions.map(([dx, dy]) => ({ x: player.x + dx, y: player.y + dy, dx, dy }))
      .filter((p) => walkable(view, p) && !enemies.some((e) => distance(e, p) === 0));
    const safeMoves = moves.filter((p) => !threatened(p));
    const incomingDamage = enemies.reduce((sum, enemy) => sum +
      (enemy.intent?.cells.some((cell) => distance(cell, player) === 0) ? enemy.intent.damage : 0), 0);
    const potionHealing = Math.ceil(view.stats.maxHp * 0.3) + (view.stats.potionPower || 0);
    if (player.potions > 0 && player.hp < view.stats.maxHp * (name === "tactical" ? 0.58 : 0.4)
      && (name === "naive" || incomingDamage < potionHealing)) return { type: "potion" };
    const movementScore = (p) => adjacent.reduce((s, e) => s + (distance(e, p) === 1 ? e.attack : 0), 0)
      + (available.some((o) => o.type === "trap" && distance(o, p) === 0) ? 15 : 0)
      + (visits.get(key(view.map, p)) || 0) * 0.05
      + (enemies[0] ? distance(enemies[0], p) * 0.8 : 0);
    if (name === "tactical" && threatened(player)) {
      const incoming = enemies.filter((e) => e.intent?.cells.some((cell) => distance(cell, player) === 0));
      // Warden's interrupt resolves before hostile telegraphs, so it can be safer than moving.
      if (canSkill && player.classId === "warden" && incoming.every((e) => distance(e, player) <= range && !e.resolve)) return { type: "skill" };
      if (canSkill && incoming.length === 1 && targets[0]?.id === incoming[0].id && incoming[0].hp <= view.stats.skillDamage - incoming[0].armor) return { type: "skill" };
      if (incoming.length === 1 && distance(incoming[0], player) === 1 && incoming[0].hp <= view.stats.attack - incoming[0].armor) {
        return { type: "move", dx: incoming[0].x - player.x, dy: incoming[0].y - player.y };
      }
      // A conservative dodge loop is not progress: accept a guarded hit to rebuild energy.
      if ((visits.get(tile) || 0) > 8 && incoming.length && player.hp > incoming.reduce((sum, enemy) => sum + enemy.intent.damage, 0) * 1.5) {
        return { type: canSkill ? "skill" : "guard" };
      }
      if ((visits.get(tile) || 0) > 24 && incoming.length) {
        if (canSkill) return { type: "skill" };
        if (adjacent.length) return { type: "move", dx: adjacent[0].x - player.x, dy: adjacent[0].y - player.y };
        return { type: "guard" };
      }
      const approaching = moves.filter((p) => enemies[0] && distance(p, enemies[0]) < distance(player, enemies[0]));
      if (player.energy >= 2 && approaching.length && !safeMoves.some((p) => distance(p, enemies[0]) < distance(player, enemies[0]))) {
        approaching.sort((a, b) => movementScore(a) - movementScore(b));
        return { type: "dash", dx: approaching[0].dx, dy: approaching[0].dy };
      }
      if (safeMoves.length) {
        safeMoves.sort((a, b) => movementScore(a) - movementScore(b));
        return { type: "move", dx: safeMoves[0].dx, dy: safeMoves[0].dy };
      }
      if (player.energy >= 2 && moves.length) return { type: "dash", dx: moves[0].dx, dy: moves[0].dy };
    }
    if (canSkill && (name === "naive" || !threatened(player))) return { type: "skill" };
    // With no adjacent attacker or committed hit, the unprotected focus action
    // is the useful recovery choice. Guard is reserved for accepting damage.
    if (name === "tactical" && targets.length && !adjacent.length && !threatened(player)) return { type: "wait" };
    if (adjacent.length) {
      const target = adjacent.sort((a, b) => a.hp - b.hp)[0];
      return { type: "move", dx: target.x - player.x, dy: target.y - player.y };
    }
    const interactable = available.filter((o) => ["chest", "fountain", "shrine"].includes(o.type) && distance(o, player) <= 1
      && (o.type !== "fountain" || player.hp <= view.stats.maxHp * 0.7)
      && (o.type !== "shrine" || player.gold >= 20 + view.floor * 3));
    const sealed = enemies.some((e) => e.boss);
    // Interact prioritizes exits in the engine; never accidentally leave during resource collection.
    if (interactable.length && (!view.map.exit || distance(player, view.map.exit) > 1)) return { type: "interact" };
    const paths = routes(view);
    const pathTo = (target, reach = 0) => paths.filter((p) => distance(p, target) <= reach && p.first).sort((a, b) => a.steps - b.steps)[0];
    if (sightings.size) {
      const nearest = [...sightings.values()].map((e) => ({ e, path: pathTo(e) })).filter((v) => v.path)
        .sort((a, b) => a.path.steps - b.path.steps)[0];
      if (nearest) return nearest.path.first;
    }
    const resources = available.filter((o) => ["chest", "gold", "potion", "shrine", "fountain"].includes(o.type)
      && (o.type !== "potion" || player.potions < (view.stats.potionCapacity ?? Infinity))
      && (o.type !== "fountain" || player.hp <= view.stats.maxHp * 0.7)
      && (o.type !== "shrine" || player.gold >= 20 + view.floor * 3));
    const resourcePaths = resources.map((o) => pathTo(o, ["chest", "shrine", "fountain"].includes(o.type) ? 1 : 0)).filter(Boolean).sort((a, b) => a.steps - b.steps);
    if (resourcePaths.length) return resourcePaths[0].first;
    const frontiers = paths.filter((p) => directions.some(([dx, dy]) => {
      const next = { x: p.x + dx, y: p.y + dy };
      return next.x >= 0 && next.y >= 0 && next.x < view.map.width && next.y < view.map.height && view.map.tiles[key(view.map, next)] === null;
    }) && p.first).sort((a, b) => a.steps - b.steps);
    if (frontiers.length) return frontiers[0].first;
    if (view.map.exit && !sealed) {
      if (distance(player, view.map.exit) <= 1) return { type: "interact" };
      return pathTo(view.map.exit, 1)?.first || null;
    }
    return null;
  };
}

export function simulateRun({ classId = "warden", oathId = "lantern", seed = 1, upgrades = {}, policy = "tactical", maxTurns = 20000, maxFloorTurns = 2000, trace = false, engine = defaultEngine, world = defaultWorld, onStep } = {}) {
  const run = engine.createRun({ classId, oathId, seed, upgrades });
  const decide = createPolicy({ name: policy, world });
  const actions = trace ? [] : undefined;
  const floors = [];
  const actionCounts = {};
  let current;
  let reason = null;
  let steps = 0;
  while (["playing", "reward"].includes(run.phase)) {
    if (!current || current.floor !== run.floor) {
      current = { floor: run.floor, entryHp: run.player.hp, entryPotions: run.player.potions, entryStats: engine.getStats(run), entryTurn: run.turn, turns: 0, kills: 0, startKills: run.kills, cleared: false };
      floors.push(current);
    }
    if (run.turn >= maxTurns) { reason = "turn-limit"; break; }
    if (run.turn - current.entryTurn >= maxFloorTurns) { reason = "floor-turn-limit"; break; }
    const view = observeRun(run, engine);
    const action = decide(view);
    if (!action) { reason = "no-known-route"; break; }
    const before = { floor: run.floor, turn: run.turn, hp: run.player.hp, potions: run.player.potions, kills: run.kills };
    const consumed = action.type === "relic" ? engine.chooseRelic(run, action.id) : engine.act(run, action);
    if (!consumed) { reason = "rejected-action"; break; }
    actionCounts[action.type] = (actionCounts[action.type] || 0) + 1;
    steps++;
    if (trace) actions.push({ ...before, action });
    current.turns = run.turn - current.entryTurn;
    current.kills = run.kills - current.startKills;
    current.exitHp = run.floor > current.floor ? before.hp : run.player.hp;
    current.exitPotions = run.floor > current.floor ? before.potions : run.player.potions;
    current.cleared = run.floor > current.floor || run.phase === "won" || run.phase === "reward";
    onStep?.({ run, before, action, step: steps });
  }
  return {
    seed: Number(seed) >>> 0, classId, oathId: run.oathId || "lantern", policy, upgrades: { ...upgrades },
    outcome: ["won", "dead"].includes(run.phase) ? run.phase : "stalled", reason,
    floor: run.floor, turns: run.turn, decisions: steps, kills: run.kills,
    bosses: [...run.bosses], hp: run.player.hp, potions: run.player.potions, shards: run.shards,
    finalStats: engine.getStats(run), level: run.player.level, gold: run.player.gold, actionCounts,
    relics: [...run.relics], floors: floors.map(({ startKills, ...f }) => f),
    ...(trace ? { actions } : {}),
  };
}

export function summarize(results) {
  const groups = new Map();
  for (const r of results) {
    const id = `${r.classId}/${r.preset || "custom"}/${r.policy}${r.oathId && r.oathId !== "lantern" ? `/${r.oathId}` : ""}`;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(r);
  }
  return [...groups].map(([group, rows]) => ({
    group, runs: rows.length, won: rows.filter((r) => r.outcome === "won").length,
    dead: rows.filter((r) => r.outcome === "dead").length,
    stalled: rows.filter((r) => r.outcome === "stalled").length,
    winRate: rows.filter((r) => r.outcome === "won").length / rows.length,
    meanFloor: rows.reduce((sum, r) => sum + r.floor, 0) / rows.length,
    maxFloor: Math.max(...rows.map((r) => r.floor)),
    meanTurns: rows.reduce((sum, r) => sum + r.turns, 0) / rows.length,
    floors: [...new Set(rows.flatMap((r) => r.floors.map((f) => f.floor)))].sort((a, b) => a - b).map((floor) => {
      const entries = rows.flatMap((r) => r.floors.filter((f) => f.floor === floor));
      return { floor, reached: entries.length, cleared: entries.filter((f) => f.cleared).length,
        meanTurns: entries.reduce((s, f) => s + f.turns, 0) / entries.length,
        meanEntryHp: entries.reduce((s, f) => s + f.entryHp, 0) / entries.length };
    }),
  }));
}
