import {
  CLASS_BY_ID,
  OATH_BY_ID,
  ENEMIES,
  REGIONS,
  RELICS,
  TOTAL_FLOORS,
  UPGRADES,
} from "./content.js?v=3.1.0";

const WIDTH = 41;
const HEIGHT = 29;
const MAX_FLOOR = TOTAL_FLOORS;
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const same = (a, b) => a.x === b.x && a.y === b.y;
const index = (map, x, y) => y * map.width + x;
const inside = (map, x, y) =>
  x >= 0 && y >= 0 && x < map.width && y < map.height;
const walkable = (run, x, y) =>
  inside(run.map, x, y) && run.map.tiles[index(run.map, x, y)] === 1;
const enemyAt = (run, x, y) =>
  run.enemies.find((enemy) => enemy.hp > 0 && enemy.x === x && enemy.y === y);

function random(run) {
  // Persisting the generator state makes a resumed expedition reproduce its future rolls.
  let x = run.rng | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  run.rng = x >>> 0;
  return run.rng / 4294967296;
}

const integer = (run, min, max) =>
  min + Math.floor(random(run) * (max - min + 1));
const pick = (run, values) => values[Math.floor(random(run) * values.length)];

function log(run, message) {
  run.log.push(message);
  if (run.log.length > 35) run.log.splice(0, run.log.length - 35);
}

function regionFor(run) {
  return REGIONS[Math.floor((run.floor - 1) / 3)] || REGIONS[0];
}

function effectTotals(run) {
  const totals = { ...(OATH_BY_ID[run.oathId]?.effect || {}) };
  for (const id of run.relics) {
    const relic = RELICS.find((item) => item.id === id);
    for (const [key, value] of Object.entries(relic?.effect || {})) {
      if (Number.isFinite(value)) totals[key] = (totals[key] || 0) + value;
    }
  }
  return totals;
}

export function getStats(run) {
  const bonus = effectTotals(run);
  const archetype = CLASS_BY_ID[run.player.classId] || CLASS_BY_ID.warden;
  const skillMultiplier = { warden: 1.7, luminary: 2.1 }[run.player.classId] || 2;
  const attack = Math.max(1, run.player.attack + (bonus.attack || 0));
  return {
    ...bonus,
    attack,
    armor: run.player.armor + (bonus.armor || 0),
    maxHp: Math.max(1, run.player.maxHp + (bonus.maxHp || 0)),
    maxEnergy: Math.max(1, run.player.maxEnergy + (bonus.maxEnergy || 0)),
    potionCapacity: run.player.potionCapacity ?? 3,
    skillCost: archetype.skillCost ?? archetype.skill?.cost ?? 3,
    skillDamage:
      Math.round(attack * skillMultiplier) + (bonus.skillDamage || 0),
    guard: run.player.statuses.includes("guard"),
  };
}

function carve(map, x, y) {
  map.tiles[index(map, x, y)] = 1;
}

function generateMap(run) {
  const map = {
    width: WIDTH,
    height: HEIGHT,
    tiles: Array(WIDTH * HEIGHT).fill(0),
    explored: Array(WIDTH * HEIGHT).fill(false),
    rooms: [],
    start: null,
    exit: null,
  };
  // A loose room grid guarantees several connected chambers even on an unlucky seed.
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 4; column++) {
      const width = integer(run, 5, 7);
      const height = integer(run, 4, 6);
      const room = {
        x: 1 + column * 10 + integer(run, 0, 8 - width),
        y: 1 + row * 9 + integer(run, 0, 7 - height),
        width,
        height,
      };
      room.cx = room.x + Math.floor(width / 2);
      room.cy = room.y + Math.floor(height / 2);
      map.rooms.push(room);
      for (let y = room.y; y < room.y + height; y++) {
        for (let x = room.x; x < room.x + width; x++) carve(map, x, y);
      }
    }
  }
  const corridor = (a, b) => {
    let x = a.cx;
    let y = a.cy;
    const horizontalFirst = random(run) > 0.5;
    const horizontal = () => {
      while (x !== b.cx) {
        carve(map, x, y);
        x += Math.sign(b.cx - x);
      }
    };
    const vertical = () => {
      while (y !== b.cy) {
        carve(map, x, y);
        y += Math.sign(b.cy - y);
      }
    };
    if (horizontalFirst) {
      horizontal();
      vertical();
    } else {
      vertical();
      horizontal();
    }
    carve(map, x, y);
  };
  // A snake backbone links every chamber; shortcuts create flanking routes.
  const order = [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11];
  for (let i = 1; i < order.length; i++)
    corridor(map.rooms[order[i - 1]], map.rooms[order[i]]);
  for (const [a, b] of [
    [0, 4],
    [2, 6],
    [5, 9],
    [7, 11],
  ])
    corridor(map.rooms[a], map.rooms[b]);
  map.start = { x: map.rooms[0].cx, y: map.rooms[0].cy };
  map.exit = { x: map.rooms[11].cx, y: map.rooms[11].cy };
  return map;
}

function lineOfSight(run, a, b) {
  let x = a.x;
  let y = a.y;
  const dx = Math.abs(b.x - x);
  const dy = Math.abs(b.y - y);
  const sx = Math.sign(b.x - x);
  const sy = Math.sign(b.y - y);
  let err = dx - dy;
  while (x !== b.x || y !== b.y) {
    const twice = 2 * err;
    if (twice > -dy) {
      err -= dy;
      x += sx;
    }
    if (twice < dx) {
      err += dx;
      y += sy;
    }
    if (!inside(run.map, x, y)) return false;
    if (!walkable(run, x, y) && (x !== b.x || y !== b.y)) return false;
  }
  return true;
}

export function visibleTiles(run) {
  const visible = new Set();
  const { x: px, y: py } = run.player;
  for (
    let y = Math.max(0, py - 8);
    y <= Math.min(run.map.height - 1, py + 8);
    y++
  ) {
    for (
      let x = Math.max(0, px - 8);
      x <= Math.min(run.map.width - 1, px + 8);
      x++
    ) {
      if (
        (x - px) ** 2 + (y - py) ** 2 <= 64 &&
        lineOfSight(run, run.player, { x, y })
      ) {
        visible.add(index(run.map, x, y));
      }
    }
  }
  return visible;
}

function reveal(run) {
  for (const tile of visibleTiles(run)) run.map.explored[tile] = true;
}

function spawnFloor(run) {
  run.map = generateMap(run);
  run.player.x = run.map.start.x;
  run.player.y = run.map.start.y;
  run.player.energy = getStats(run).maxEnergy;
  run.player.statuses = [];
  run.enemies = [];
  run.objects = [];
  const occupied = new Set([
    index(run.map, run.player.x, run.player.y),
    index(run.map, run.map.exit.x, run.map.exit.y),
  ]);
  const place = (roomIndex, away = true) => {
    const room = run.map.rooms[roomIndex];
    const available = [];
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (
          !occupied.has(index(run.map, x, y)) &&
          (!away || distance({ x, y }, run.player) > 5)
        )
          available.push({ x, y });
      }
    }
    if (!available.length) return null;
    const position = pick(run, available);
    occupied.add(index(run.map, position.x, position.y));
    return position;
  };
  const region = regionFor(run);
  const enemyTypes =
    region.enemyTypes ||
    Object.keys(ENEMIES).filter(
      (id) => !ENEMIES[id].boss && ENEMIES[id].behavior !== "boss",
    );
  const count = 7 + Math.ceil(run.floor * 0.8);
  for (let i = 0; i < count; i++) {
    const position = place(1 + (i % 11));
    if (!position) continue;
    const type = pick(run, enemyTypes);
    const definition = ENEMIES[type];
    const scaling = 1 + ((run.floor - 1) % 3) * 0.16;
    const hp = Math.round((definition.hp || 10) * scaling);
    run.enemies.push({
      id: `f${run.floor}-e${i}`,
      type,
      ...position,
      hp,
      maxHp: hp,
      attack: Math.round((definition.attack || 3) * scaling),
      armor: definition.armor || 0,
      boss: false,
      intent: null,
      alerted: false,
      cooldown: 0,
    });
  }
  if (run.floor % 3 === 0) {
    const type = region.bossId;
    const definition = ENEMIES[type] || {};
    const position = place(11);
    if (position) {
      const hp = definition.hp || 65 + run.floor * 5;
      run.enemies.push({
        id: `f${run.floor}-boss`,
        type,
        ...position,
        hp,
        maxHp: hp,
        attack: definition.attack || 8 + run.floor,
        armor: definition.armor || 1,
        boss: true,
        intent: null,
        alerted: false,
        cooldown: 0,
      });
    }
  }
  const objectTypes = [
    "chest",
    "chest",
    "shrine",
    run.floor % 3 === 0 ? "fountain" : "chest",
    run.floor % 3 === 1 ? "potion" : "gold",
    "gold",
    "trap",
    "trap",
    "trap",
  ];
  if (run.floor > 3) objectTypes.push("trap", "trap");
  for (let i = 0; i < objectTypes.length; i++) {
    const position = place(i === 4 ? 0 : 1 + ((i * 3) % 11), i !== 4);
    if (position)
      run.objects.push({
        id: `f${run.floor}-o${i}`,
        type: objectTypes[i],
        ...position,
        used: false,
      });
  }
  reveal(run);
  log(run, `Descenso ${run.floor}/${MAX_FLOOR} · ${region.name || "La cripta"}.`);
  if (run.floor % 3 === 0)
    log(run, "Una presencia sella la salida. Derrota al guardián.");
}

export function createRun({
  classId = "warden",
  oathId = "lantern",
  seed = Date.now(),
  upgrades = {},
} = {}) {
  if (!Object.hasOwn(CLASS_BY_ID, classId)) classId = "warden";
  if (typeof oathId !== "string" || !Object.hasOwn(OATH_BY_ID, oathId))
    oathId = "lantern";
  const definition = CLASS_BY_ID[classId];
  const level = (key) =>
    Math.max(
      0,
      Math.min(
        UPGRADES.find((item) => item.id === key)?.maxLevel || 0,
        Math.floor(Number(upgrades[key]) || 0),
      ),
    );
  const run = {
    version: 1,
    campaignFloors: MAX_FLOOR,
    oathId,
    seed: Number(seed) >>> 0,
    rng: Number(seed) >>> 0 || 0x9e3779b9,
    floor: 1,
    turn: 0,
    phase: "playing",
    player: {
      x: 0,
      y: 0,
      hp: (definition.hp || 40) + level("vitality") * 4,
      maxHp: (definition.hp || 40) + level("vitality") * 4,
      energy: (definition.energy || 6) + level("focus"),
      maxEnergy: (definition.energy || 6) + level("focus"),
      attack: (definition.attack || 6) + level("might"),
      armor: (definition.armor || 0) + level("resilience"),
      classId,
      potions: 2 + level("supplies"),
      potionCapacity: 3 + level("supplies"),
      gold: 0,
      xp: 0,
      level: 1,
      facing: { x: 1, y: 0 },
      statuses: [],
    },
    map: null,
    enemies: [],
    objects: [],
    relics: [],
    rewardChoices: [],
    log: [],
    kills: 0,
    shards: 0,
    bosses: [],
  };
  run.player.hp = getStats(run).maxHp;
  run.player.energy = getStats(run).maxEnergy;
  spawnFloor(run);
  log(
    run,
    "Explora, reúne reliquias y lee las señales de ataque. Cada paso cuenta.",
  );
  return run;
}

function damageAfterArmor(stats, amount, enemyType, guard = false) {
  const pierce = Math.min(1, Math.max(0, ENEMIES[enemyType]?.pierceArmor || 0));
  const armor = Math.floor(stats.armor * (1 - pierce)) + (guard ? 4 : 0);
  return Math.max(1, Math.ceil(amount * 0.4), amount - armor);
}

function heal(run, amount) {
  // Retaliation rewards may still be resolved after a lethal hit; they cannot revive a run.
  if (run.phase === "dead") return;
  run.player.hp = Math.min(getStats(run).maxHp, run.player.hp + amount);
}

function hurtPlayer(run, amount, source, enemy = null) {
  const stats = getStats(run);
  if (
    run.player.statuses.includes("dodge") ||
    random(run) < (stats.dodge || 0)
  ) {
    log(run, `Esquivas ${source}.`);
    return;
  }
  // Armor cannot turn endgame attacks into harmless one-point hits. Piercing is
  // part of an enemy's published identity; guard remains useful against it.
  const damage = damageAfterArmor(stats, amount, enemy?.type, stats.guard);
  run.player.hp = Math.max(0, run.player.hp - damage);
  log(run, `${source}: −${damage} vida${stats.guard ? " (bloqueo)" : ""}.`);
  if (run.player.hp <= 0) {
    run.phase = "dead";
    log(run, "Tu llama se apaga. Los ecos que reuniste permanecen.");
  }
  if (enemy && distance(enemy, run.player) === 1 && stats.thorns)
    damageEnemy(run, enemy, stats.thorns, false);
}

function damageEnemy(run, enemy, damage, playerHit = true, armorPiercing = 0) {
  if (enemy.hp <= 0) return;
  const stats = getStats(run);
  const critical = playerHit && random(run) < (stats.critChance || 0);
  const dealt = Math.max(
    1,
    Math.round(damage * (critical ? 1.75 : 1)) -
      Math.floor((enemy.armor || 0) * (1 - armorPiercing)),
  );
  const actualDamage = Math.min(enemy.hp, dealt);
  enemy.hp = Math.max(0, enemy.hp - dealt);
  enemy.alerted = true;
  const name = ENEMIES[enemy.type]?.name || enemy.type;
  log(run, `${critical ? "¡Crítico! " : ""}${name}: −${dealt} vida.`);
  if (playerHit && stats.lifesteal)
    heal(run, Math.floor(actualDamage * stats.lifesteal));
  if (enemy.hp === 0) {
    run.kills++;
    run.player.gold += enemy.boss
      ? 30 + run.floor * 3
      : 3 + Math.floor(run.floor / 2);
    run.player.xp += enemy.boss ? 24 : 5;
    run.shards += enemy.boss ? 12 + run.floor : 1;
    enemy.intent = null;
    if (enemy.boss) {
      run.bosses.push(enemy.type);
      log(run, `${name} cae. El sello de la salida se rompe.`);
    }
    if (stats.healOnKill) heal(run, stats.healOnKill);
    if (stats.energyOnKill)
      run.player.energy = Math.min(
        stats.maxEnergy,
        run.player.energy + stats.energyOnKill,
      );
    while (run.player.xp >= run.player.level * 30) {
      run.player.xp -= run.player.level * 30;
      run.player.level++;
      run.player.maxHp += 3;
      run.player.attack++;
      heal(run, 5);
      log(
        run,
        `Nivel ${run.player.level}: +1 ataque, +3 vida máxima y recuperas 5 vida.`,
      );
    }
  }
}

function collect(run) {
  for (const object of run.objects) {
    if (object.used || !same(object, run.player)) continue;
    if (object.type === "gold") {
      const amount = 10 + run.floor * 2;
      run.player.gold += amount;
      object.used = true;
      log(run, `Recoges ${amount} oro.`);
    } else if (object.type === "potion" && run.player.potions < getStats(run).potionCapacity) {
      run.player.potions++;
      object.used = true;
      log(run, "Recoges una poción.");
    } else if (object.type === "potion") {
      log(run, "La bolsa de pociones está llena. La poción permanece aquí.");
    } else if (object.type === "trap") {
      object.used = true;
      hurtPlayer(run, 5 + run.floor, "Trampa de espinas");
    }
  }
}

function pathStep(run, enemy) {
  // Breadth-first search avoids enemies getting stuck behind the bends in corridors.
  const queue = [{ x: enemy.x, y: enemy.y, first: null }];
  const seen = new Set([index(run.map, enemy.x, enemy.y)]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const cell = queue[cursor];
    if (same(cell, run.player)) return cell.first;
    const options = [
      { x: cell.x + 1, y: cell.y },
      { x: cell.x - 1, y: cell.y },
      { x: cell.x, y: cell.y + 1 },
      { x: cell.x, y: cell.y - 1 },
    ];
    options.sort((a, b) => distance(a, run.player) - distance(b, run.player));
    for (const option of options) {
      const key = index(run.map, option.x, option.y);
      if (seen.has(key) || !walkable(run, option.x, option.y)) continue;
      if (enemyAt(run, option.x, option.y) && !same(option, enemy)) continue;
      seen.add(key);
      queue.push({ ...option, first: cell.first || option });
    }
  }
  return null;
}

function advanceEnemy(run, enemy, steps = 2) {
  for (let step = 0; step < steps; step++) {
    const next = pathStep(run, enemy);
    if (!next || same(next, run.player)) break;
    enemy.x = next.x;
    enemy.y = next.y;
  }
}

function attackCells(run, enemy, kind) {
  const cells = [];
  const add = (x, y) => {
    if (
      walkable(run, x, y) &&
      !cells.some((cell) => cell.x === x && cell.y === y)
    )
      cells.push({ x, y });
  };
  if (kind === "nova") {
    for (let y = enemy.y - 2; y <= enemy.y + 2; y++) {
      for (let x = enemy.x - 2; x <= enemy.x + 2; x++) {
        if (
          Math.abs(x - enemy.x) + Math.abs(y - enemy.y) <= 3 &&
          (x !== enemy.x || y !== enemy.y)
        )
          add(x, y);
      }
    }
  } else if (kind === "cross") {
    for (let i = 1; i <= 6; i++) {
      add(enemy.x + i, enemy.y);
      add(enemy.x - i, enemy.y);
      add(enemy.x, enemy.y + i);
      add(enemy.x, enemy.y - i);
    }
  } else if (kind === "roots") {
    add(run.player.x, run.player.y);
    for (const signX of [-1, 1])
      for (const signY of [-1, 1]) {
        add(run.player.x + signX, run.player.y + signY);
        add(run.player.x + signX * 2, run.player.y + signY * 2);
      }
  } else if (kind === "tide") {
    // The oracle alternates a horizontal and vertical sweep through the target.
    for (let offset = -4; offset <= 4; offset++) {
      add(
        run.player.x + ((enemy.pattern || 0) % 2 ? offset : 0),
        run.player.y + ((enemy.pattern || 0) % 2 ? 0 : offset),
      );
    }
  } else if (kind === "eclipse") {
    add(run.player.x, run.player.y);
    for (let offset = -2; offset <= 2; offset++) {
      add(run.player.x + offset, run.player.y);
      add(run.player.x, run.player.y + offset);
    }
  } else if (kind === "blast") {
    add(run.player.x, run.player.y);
    add(run.player.x - 1, run.player.y);
    add(run.player.x + 1, run.player.y);
    add(run.player.x, run.player.y - 1);
    add(run.player.x, run.player.y + 1);
  } else {
    // An aimed attack commits to its complete original line, never follows the player.
    let x = enemy.x;
    let y = enemy.y;
    const dx = Math.abs(run.player.x - x);
    const dy = Math.abs(run.player.y - y);
    const sx = Math.sign(run.player.x - x);
    const sy = Math.sign(run.player.y - y);
    let error = dx - dy;
    while (x !== run.player.x || y !== run.player.y) {
      const twice = error * 2;
      if (twice > -dy) {
        error -= dy;
        x += sx;
      }
      if (twice < dx) {
        error += dx;
        y += sy;
      }
      add(x, y);
    }
  }
  return cells;
}

function enemyTurn(run) {
  for (const enemy of run.enemies) {
    if (enemy.hp <= 0 || run.phase !== "playing") continue;
    const definition = ENEMIES[enemy.type] || {};
    if (enemy.resolve > 0) enemy.resolve--;
    if (enemy.stunned > 0) {
      enemy.stunned--;
      enemy.intent = null;
      continue;
    }
    if (enemy.intent) {
      const intent = enemy.intent;
      enemy.intent = null;
      if (intent.cells.some((cell) => same(cell, run.player)))
        hurtPlayer(
          run,
          intent.damage,
          ENEMIES[enemy.type]?.name || "Ataque",
          enemy,
        );
      else
        log(
          run,
          `El ataque de ${definition.name || enemy.type} golpea el suelo.`,
        );
      // A charge closes distance rather than behaving like another stationary bow.
      if (intent.kind === "charge") {
        for (const cell of intent.cells) {
          if (same(cell, run.player) || enemyAt(run, cell.x, cell.y)) break;
          enemy.x = cell.x;
          enemy.y = cell.y;
        }
      }
      if (!enemy.boss && definition.behavior === "ranged" && distance(enemy, run.player) > 2)
        advanceEnemy(run, enemy);
      enemy.cooldown = enemy.boss ? 1 : 0;
      continue;
    }
    const separation = distance(enemy, run.player);
    if (
      !enemy.alerted &&
      (separation > 8 || !lineOfSight(run, enemy, run.player))
    )
      continue;
    enemy.alerted = true;
    if (enemy.cooldown > 0) {
      enemy.cooldown--;
      // The recovery window allows a counterattack, but does not freeze a boss.
      if (enemy.boss) {
        if (separation === 1)
          hurtPlayer(
            run,
            Math.ceil(enemy.attack * 0.65),
            `${definition.name}: represalia`,
            enemy,
          );
        else {
          advanceEnemy(run, enemy);
        }
      }
      continue;
    }
    if (enemy.boss && separation <= 7 && lineOfSight(run, enemy, run.player)) {
      const cycle = enemy.pattern || 0;
      const kind = definition.intentKinds?.[cycle % definition.intentKinds.length] || (
        separation <= 2 && cycle % 2 === 0
          ? "nova"
          : enemy.type === "briar_queen"
            ? cycle % 2
              ? "cross"
              : "roots"
            : enemy.type === "drowned_oracle"
              ? "tide"
              : enemy.type === "ettin"
                ? cycle % 3 === 0
                  ? "eclipse"
                  : cycle % 3 === 1
                    ? "cross"
                    : "blast"
                : "blast");
      enemy.pattern = cycle + 1;
      enemy.intent = {
        kind,
        cells: attackCells(run, enemy, kind),
        damage:
          enemy.attack +
          (enemy.hp < enemy.maxHp / 2 ? Math.ceil(enemy.attack * 0.2) : 0),
        turn: run.turn,
      };
      const warning = {
        nova: "una onda cercana",
        cross: "una cruz devastadora",
        roots: "un jardín de espinas",
        tide: "una marea que barre la sala",
        eclipse: "la cruz del eclipse",
        blast: "un impacto marcado",
      };
      log(
        run,
        `${definition.name || "El guardián"} prepara ${warning[kind]}. ¡Sal de la señal!`,
      );
      continue;
    }
    const ranged =
      definition.behavior === "ranged" || (definition.range || 1) > 1;
    const charger = definition.behavior === "charger";
    if (
      ((ranged && separation <= (definition.range || 6)) ||
        (charger && separation <= 4)) &&
      lineOfSight(run, enemy, run.player)
    ) {
      enemy.intent = {
        kind: charger ? "charge" : definition.intentKind || "shot",
        cells: attackCells(
          run,
          enemy,
          charger ? "shot" : definition.intentKind || "shot",
        ),
        damage: enemy.attack + (charger ? 2 : 0),
        turn: run.turn,
      };
      enemy.pattern = (enemy.pattern || 0) + 1;
      log(run, `${definition.name || enemy.type} fija tu posición.`);
    } else if (separation === 1) {
      hurtPlayer(run, enemy.attack, definition.name || enemy.type, enemy);
    } else {
      advanceEnemy(run, enemy);
    }
  }
}

export function getThreats(run) {
  return run.enemies
    .filter((enemy) => enemy.hp > 0 && enemy.intent)
    .flatMap((enemy) =>
      enemy.intent.cells.map((cell) => ({
        ...cell,
        kind: enemy.intent.kind,
        enemyId: enemy.id,
      })),
    );
}

/**
 * Maximum announced damage if the player stays here and fails random dodge rolls.
 * This deliberately excludes melee attacks and choices that have not been announced.
 * Reading the forecast never consumes randomness or changes enemy intentions.
 */
export function forecastIncomingDamage(run) {
  const stats = getStats(run);
  const sources = run.phase !== "playing" || run.player.statuses.includes("dodge")
    ? []
    : run.enemies.filter((enemy) =>
      enemy.hp > 0 && !(enemy.stunned > 0) &&
      enemy.intent?.cells.some((cell) => same(cell, run.player)),
    ).map((enemy) => ({
      enemyId: enemy.id,
      name: ENEMIES[enemy.type]?.name || enemy.type,
      damage: damageAfterArmor(stats, enemy.intent.damage, enemy.type, stats.guard),
      guardedDamage: damageAfterArmor(stats, enemy.intent.damage, enemy.type, true),
    }));
  const damage = sources.reduce((total, source) => total + source.damage, 0);
  const guardedDamage = sources.reduce((total, source) => total + source.guardedDamage, 0);
  return {
    damage,
    guardedDamage,
    attacks: sources.length,
    lethal: damage > 0 && damage >= run.player.hp,
    guardedLethal: guardedDamage > 0 && guardedDamage >= run.player.hp,
    uncertain: sources.length > 0 && (stats.dodge || 0) > 0,
    sources,
  };
}

function finishTurn(run, regeneration = 1) {
  run.turn++;
  if (run.phase === "playing") enemyTurn(run);
  run.player.statuses = [];
  if (regeneration)
    run.player.energy = Math.min(
      getStats(run).maxEnergy,
      run.player.energy + Number(regeneration),
    );
  reveal(run);
}

function reward(run) {
  const pool = RELICS.filter((relic) => !run.relics.includes(relic.id));
  const selected = [];
  const take = (candidates) => {
    if (!candidates.length) return;
    // Legendary power should remain a surprise, with better odds after a guardian.
    const weight = (relic) => ({ common: 4, uncommon: 3, rare: run.floor % 3 === 0 ? 4 : 2 }[relic.rarity] || 1);
    let roll = random(run) * candidates.reduce((sum, relic) => sum + weight(relic), 0);
    const choice = candidates.find((relic) => (roll -= weight(relic)) < 0) || candidates.at(-1);
    selected.push(choice.id);
    pool.splice(pool.indexOf(choice), 1);
  };
  // Three different build directions make a draft a choice, rather than three stat variants.
  for (const path of ["assault", "survival", "arcana"])
    take(pool.filter((relic) => relic.path === path));
  while (pool.length && selected.length < 3) {
    take(pool);
  }
  run.rewardChoices = selected;
  run.phase = "reward";
  run.shards += 3 + run.floor;
  log(run, "Cámara superada. Elige una reliquia y continúa el descenso.");
}

function interact(run) {
  if (distance(run.player, run.map.exit) <= 1) {
    if (run.enemies.some((enemy) => enemy.boss && enemy.hp > 0)) {
      log(run, "El guardián mantiene la salida sellada.");
      return false;
    }
    if (run.floor === MAX_FLOOR) {
      run.phase = "won";
      run.shards += 60;
      log(
        run,
        "Rompes el corazón del abismo. La última luz vuelve a la superficie.",
      );
    } else reward(run);
    return true;
  }
  const object = run.objects.find(
    (item) =>
      !item.used &&
      ["chest", "shrine", "fountain"].includes(item.type) &&
      distance(item, run.player) <= 1,
  );
  if (!object) {
    log(run, "No hay nada que activar cerca.");
    return false;
  }
  if (object.type === "chest") {
    const gold = integer(run, 14, 24) + run.floor;
    run.player.gold += gold;
    run.shards += 3;
    if (random(run) < 0.05 && run.player.potions < getStats(run).potionCapacity) {
      run.player.potions++;
      log(run, "El cofre contiene también una poción.");
    }
    log(run, `Cofre abierto: +${gold} oro y +3 ecos.`);
  } else if (object.type === "fountain") {
    heal(run, Math.ceil(getStats(run).maxHp * 0.3));
    run.player.energy = getStats(run).maxEnergy;
    log(run, "La fuente restaura un 30% de vida y toda tu energía.");
  } else {
    const cost = 20 + run.floor * 3;
    if (run.player.gold < cost) {
      log(run, `La ofrenda requiere ${cost} oro.`);
      return false;
    }
    run.player.gold -= cost;
    const blessing = (run.floor - 1) % 3;
    if (blessing === 0) run.player.attack++;
    else if (blessing === 1) run.player.maxHp += 4;
    else run.player.maxEnergy++;
    heal(run, 5);
    log(
      run,
      `Ofrenda de ${cost} oro: ${["+1 ataque", "+4 vida máxima", "+1 energía máxima"][blessing]} y recuperas 5 vida.`,
    );
  }
  object.used = true;
  return true;
}

function skill(run) {
  const stats = getStats(run);
  if (run.player.energy < stats.skillCost) {
    log(run, "Necesitas más energía para esa habilidad.");
    return false;
  }
  const visible = visibleTiles(run);
  const range =
    run.player.classId === "warden"
      ? 2
      : run.player.classId === "ranger"
        ? 6
        : run.player.classId === "luminary"
          ? 5
          : 4;
  const targets = run.enemies
    .filter(
      (enemy) =>
        enemy.hp > 0 &&
        distance(enemy, run.player) <= range &&
        visible.has(index(run.map, enemy.x, enemy.y)),
    )
    .sort((a, b) => distance(a, run.player) - distance(b, run.player));
  if (!targets.length) {
    log(run, "No hay objetivos al alcance de tu habilidad.");
    return false;
  }
  run.player.energy -= stats.skillCost;
  if (run.player.classId === "warden") {
    for (const target of targets) {
      damageEnemy(run, target, stats.skillDamage);
      // A target needs four active turns to recover its poise. Recasting still
      // deals damage, but cannot cancel every attack in a skill/guard loop.
      if (!(target.resolve > 0)) {
        target.stunned = 1;
        target.intent = null;
        target.resolve = 4;
      }
    }
    log(run, "Golpe sísmico: interrumpe a enemigos sin temple; el temple dura 4 turnos.");
  } else if (run.player.classId === "ranger") {
    const target = targets[0];
    const dx = target.x - run.player.x;
    const dy = target.y - run.player.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const pierced = run.enemies.filter((enemy) => {
      const ex = enemy.x - run.player.x;
      const ey = enemy.y - run.player.y;
      const projection = (ex * dx + ey * dy) / length;
      return (
        enemy.hp > 0 &&
        projection > 0 &&
        projection <= 6.5 &&
        Math.abs(ex * dy - ey * dx) / length < 0.8 &&
        visible.has(index(run.map, enemy.x, enemy.y))
      );
    });
    for (const victim of pierced) damageEnemy(run, victim, stats.skillDamage);
    log(
      run,
      `Disparo perforante: ${pierced.length} objetivo${pierced.length === 1 ? "" : "s"}.`,
    );
  } else {
    const center = targets[0];
    const blast = run.enemies.filter(
      (enemy) =>
        enemy.hp > 0 &&
        distance(enemy, center) <= 2 &&
        lineOfSight(run, center, enemy),
    );
    for (const victim of blast) {
      damageEnemy(
        run,
        victim,
        stats.skillDamage,
        true,
        run.player.classId === "luminary" ? 0.4 : 0,
      );
      if (
        run.player.classId === "luminary" &&
        victim.intent &&
        !(victim.resolve > 0)
      ) {
        victim.intent = null;
        victim.stunned = 1;
        victim.resolve = 4;
      }
    }
    log(
      run,
      `${run.player.classId === "luminary" ? "Cisma solar" : "Estallido arcano"}: ${blast.length} objetivo${blast.length === 1 ? "" : "s"}.`,
    );
  }
  return true;
}

export function act(run, action) {
  if (!run || run.phase !== "playing" || !action || typeof action !== "object")
    return false;
  let consumed = false;
  let regenerate = true;
  if (action.type === "move" || action.type === "dash") {
    const dx = Number(action.dx);
    const dy = Number(action.dy);
    if (
      !Number.isInteger(dx) ||
      !Number.isInteger(dy) ||
      Math.abs(dx) + Math.abs(dy) !== 1
    )
      return false;
    run.player.facing = { x: dx, y: dy };
    if (action.type === "dash") {
      if (run.player.energy < 2) {
        log(run, "La esquiva necesita 2 de energía.");
        return false;
      }
      let moved = 0;
      for (let step = 0; step < 2; step++) {
        const x = run.player.x + dx;
        const y = run.player.y + dy;
        if (!walkable(run, x, y) || enemyAt(run, x, y)) break;
        run.player.x = x;
        run.player.y = y;
        moved++;
        // A dash passes over a trap without triggering it, but still gathers supplies.
        for (const object of run.objects) {
          if (same(object, run.player) && object.type !== "trap") {
            if (!object.used && object.type === "gold") {
              run.player.gold += 10 + run.floor * 2;
              object.used = true;
            }
            if (!object.used && object.type === "potion" && run.player.potions < getStats(run).potionCapacity) {
              run.player.potions++;
              object.used = true;
            }
          }
        }
      }
      if (!moved) return false;
      run.player.energy -= 2;
      run.player.statuses.push("dodge");
      log(
        run,
        "Esquiva: atraviesas el peligro e ignoras los ataques de este turno.",
      );
      consumed = true;
      regenerate = false;
    } else {
      const x = run.player.x + dx;
      const y = run.player.y + dy;
      if (!walkable(run, x, y)) return false;
      const target = enemyAt(run, x, y);
      if (target) {
        damageEnemy(run, target, getStats(run).attack);
        regenerate = false;
      }
      else {
        run.player.x = x;
        run.player.y = y;
        collect(run);
        // Retreating creates space, but cannot also refuel an infinite ranged loop.
        // Safe exploration still refills energy; in combat, guard or wait to focus.
        regenerate = !run.enemies.some(
          (enemy) => enemy.hp > 0 && enemy.alerted && distance(enemy, run.player) <= 8 && lineOfSight(run, enemy, run.player),
        );
      }
      consumed = true;
    }
  } else if (action.type === "skill") {
    consumed = skill(run);
    regenerate = false;
  } else if (action.type === "guard") {
    run.player.statuses.push("guard");
    log(run, "Guardia: +4 armadura durante este turno y recuperas energía.");
    consumed = true;
  } else if (action.type === "wait") {
    regenerate = 2;
    log(run, "Concentración: recuperas 2 de energía, sin la protección de la guardia.");
    consumed = true;
  } else if (action.type === "potion") {
    const stats = getStats(run);
    if (run.player.potions <= 0 || run.player.hp >= stats.maxHp) return false;
    run.player.potions--;
    heal(run, Math.ceil(stats.maxHp * 0.3) + (stats.potionPower || 0));
    log(run, "Bebes una poción de vida.");
    consumed = true;
  } else if (action.type === "interact") consumed = interact(run);
  if (consumed) finishTurn(run, regenerate);
  return consumed;
}

export function chooseRelic(run, id) {
  if (
    run.phase !== "reward" ||
    !run.rewardChoices.includes(id) ||
    run.relics.includes(id)
  )
    return false;
  const relic = RELICS.find((item) => item.id === id);
  if (!relic) return false;
  run.relics.push(id);
  if (relic.effect?.maxHp) heal(run, relic.effect.maxHp);
  run.rewardChoices = [];
  log(run, `Reliquia obtenida: ${relic.name}.`);
  return nextFloor(run);
}

export function nextFloor(run) {
  if (
    run.phase !== "reward" ||
    run.floor >= MAX_FLOOR ||
    run.rewardChoices.length
  )
    return false;
  run.floor++;
  run.phase = "playing";
  heal(run, Math.ceil(getStats(run).maxHp * 0.08));
  spawnFloor(run);
  return true;
}

export function validateRun(value) {
  try {
    if (
      !value ||
      value.version !== 1 ||
      !Number.isInteger(value.seed) ||
      value.seed < 0 ||
      value.seed > 4294967295 ||
      !Number.isInteger(value.rng) ||
      value.rng <= 0 ||
      value.rng > 4294967295
    )
      return false;
    if (
      !Number.isInteger(value.floor) ||
      value.floor < 1 ||
      value.floor > MAX_FLOOR ||
      !Number.isSafeInteger(value.turn) ||
      value.turn < 0
    )
      return false;
    if (value.campaignFloors !== undefined && value.campaignFloors !== MAX_FLOOR)
      return false;
    if (value.oathId !== undefined &&
      (typeof value.oathId !== "string" || !Object.hasOwn(OATH_BY_ID, value.oathId)))
      return false;
    if (!["playing", "reward", "dead", "won"].includes(value.phase))
      return false;
    const player = value.player;
    if (
      !player ||
      !Object.hasOwn(CLASS_BY_ID, player.classId) ||
      !Array.isArray(player.statuses) ||
      player.statuses.some((status) => !["guard", "dodge"].includes(status))
    )
      return false;
    for (const key of [
      "hp",
      "maxHp",
      "energy",
      "maxEnergy",
      "attack",
      "armor",
      "potions",
      "gold",
      "xp",
      "level",
    ])
      if (
        !Number.isInteger(player[key]) ||
        player[key] < 0 ||
        player[key] > 1000000
      )
        return false;
    if (
      player.maxHp < 1 ||
      player.maxEnergy < 1 ||
      player.maxEnergy > 100 ||
      player.level < 1
    )
      return false;
    if (
      player.potionCapacity !== undefined &&
      (!Number.isInteger(player.potionCapacity) ||
        player.potionCapacity < 3 ||
        player.potions > player.potionCapacity ||
        player.potionCapacity > 3 + (UPGRADES.find((upgrade) => upgrade.id === "supplies")?.maxLevel || 0))
    )
      return false;
    const map = value.map;
    if (
      !map ||
      map.width !== WIDTH ||
      map.height !== HEIGHT ||
      !Array.isArray(map.tiles) ||
      map.tiles.length !== WIDTH * HEIGHT ||
      map.tiles.some((tile) => tile !== 0 && tile !== 1)
    )
      return false;
    if (
      !Array.isArray(map.explored) ||
      map.explored.length !== map.tiles.length ||
      map.explored.some((tile) => typeof tile !== "boolean") ||
      !Array.isArray(map.rooms) ||
      map.rooms.length < 1 ||
      map.rooms.length > 20
    )
      return false;
    if (
      map.rooms.some(
        (room) =>
          !room ||
          !["x", "y", "width", "height", "cx", "cy"].every((key) =>
            Number.isInteger(room[key]),
          ) ||
          room.width < 1 ||
          room.height < 1 ||
          room.x < 1 ||
          room.y < 1 ||
          room.x + room.width >= WIDTH ||
          room.y + room.height >= HEIGHT,
      )
    )
      return false;
    const validPosition = (position) =>
      position &&
      Number.isInteger(position.x) &&
      Number.isInteger(position.y) &&
      walkable(value, position.x, position.y);
    if (
      !validPosition(player) ||
      !validPosition(map.start) ||
      !validPosition(map.exit)
    )
      return false;
    const reachable = new Set([index(map, player.x, player.y)]);
    const queue = [{ x: player.x, y: player.y }];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const { x, y } = queue[cursor];
      for (const cell of [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 },
      ]) {
        const key = index(map, cell.x, cell.y);
        if (!walkable(value, cell.x, cell.y) || reachable.has(key)) continue;
        reachable.add(key);
        queue.push(cell);
      }
    }
    if (reachable.size !== map.tiles.filter(Boolean).length) return false;
    if (
      !player.facing ||
      !Number.isInteger(player.facing.x) ||
      !Number.isInteger(player.facing.y) ||
      Math.abs(player.facing.x) + Math.abs(player.facing.y) !== 1
    )
      return false;
    if (
      !Array.isArray(value.relics) ||
      value.relics.length > RELICS.length ||
      new Set(value.relics).size !== value.relics.length ||
      value.relics.some((id) => !RELICS.some((relic) => relic.id === id))
    )
      return false;
    if (
      !Array.isArray(value.rewardChoices) ||
      value.rewardChoices.length > 3 ||
      new Set(value.rewardChoices).size !== value.rewardChoices.length ||
      value.rewardChoices.some(
        (id) =>
          value.relics.includes(id) || !RELICS.some((relic) => relic.id === id),
      )
    )
      return false;
    const stats = getStats(value);
    if (
      player.hp > stats.maxHp ||
      player.energy > stats.maxEnergy ||
      (value.phase === "dead") !== (player.hp === 0)
    )
      return false;
    if (
      !Array.isArray(value.enemies) ||
      value.enemies.length > 100 ||
      !Array.isArray(value.objects) ||
      value.objects.length > 100
    )
      return false;
    const occupied = new Set();
    const ids = new Set();
    for (const enemy of value.enemies) {
      if (
        !validPosition(enemy) ||
        !Object.hasOwn(ENEMIES, enemy.type) ||
        typeof enemy.id !== "string" ||
        typeof enemy.boss !== "boolean"
      )
        return false;
      if (enemy.boss !== (ENEMIES[enemy.type].behavior === "boss"))
        return false;
      if (ids.has(enemy.id)) return false;
      ids.add(enemy.id);
      for (const key of ["hp", "maxHp", "attack"])
        if (
          !Number.isInteger(enemy[key]) ||
          enemy[key] < 0 ||
          enemy[key] > 1000000
        )
          return false;
      for (const key of ["armor", "cooldown", "stunned", "pattern", "resolve"])
        if (
          enemy[key] !== undefined &&
          (!Number.isInteger(enemy[key]) ||
            enemy[key] < 0 ||
            enemy[key] > 1000000)
        )
          return false;
      if (enemy.hp > enemy.maxHp || enemy.maxHp < 1) return false;
      if (enemy.hp > 0) {
        const tile = index(map, enemy.x, enemy.y);
        if (occupied.has(tile) || same(enemy, player)) return false;
        occupied.add(tile);
      }
      if (
        enemy.intent &&
        (!Array.isArray(enemy.intent.cells) ||
          enemy.intent.cells.length > WIDTH * HEIGHT ||
          enemy.intent.cells.some((cell) => !validPosition(cell)) ||
          !Number.isFinite(enemy.intent.damage) ||
          enemy.intent.damage < 0 ||
          typeof enemy.intent.kind !== "string")
      )
        return false;
    }
    for (const object of value.objects) {
      if (
        !validPosition(object) ||
        !["chest", "shrine", "fountain", "trap", "gold", "potion"].includes(
          object.type,
        ) ||
        typeof object.used !== "boolean" ||
        typeof object.id !== "string" ||
        ids.has(object.id)
      )
        return false;
      ids.add(object.id);
    }
    const floorBosses = value.enemies.filter((enemy) => enemy.boss);
    if (
      floorBosses.length !== (value.floor % 3 === 0 ? 1 : 0) ||
      floorBosses.some((enemy) => enemy.type !== regionFor(value).bossId)
    )
      return false;
    if (
      value.phase === "reward" &&
      (value.floor === MAX_FLOOR ||
        !value.rewardChoices.length ||
        floorBosses.some((enemy) => enemy.hp > 0))
    )
      return false;
    if (value.phase !== "reward" && value.rewardChoices.length) return false;
    if (
      value.phase === "won" &&
      ((value.floor !== MAX_FLOOR &&
        !(value.campaignFloors === undefined && value.floor === 12)) ||
        floorBosses.some((enemy) => enemy.hp > 0))
    )
      return false;
    if (
      !Array.isArray(value.log) ||
      value.log.length > 35 ||
      value.log.some(
        (message) => typeof message !== "string" || message.length > 2000,
      ) ||
      !Array.isArray(value.bosses) ||
      value.bosses.length > REGIONS.length ||
      new Set(value.bosses).size !== value.bosses.length ||
      value.bosses.some(
        (id) => !Object.hasOwn(ENEMIES, id) || ENEMIES[id].behavior !== "boss",
      )
    )
      return false;
    for (const key of ["kills", "shards"])
      if (
        !Number.isInteger(value[key]) ||
        value[key] < 0 ||
        value[key] > 1000000
      )
        return false;
    if (
      value.creditedShards !== undefined &&
      (!Number.isInteger(value.creditedShards) ||
        value.creditedShards < 0 ||
        value.creditedShards > value.shards)
    )
      return false;
    if (
      value.creditedKills !== undefined &&
      (!Number.isInteger(value.creditedKills) ||
        value.creditedKills < 0 ||
        value.creditedKills > value.kills)
    )
      return false;
    if (
      value.victoryCredited !== undefined &&
      (typeof value.victoryCredited !== "boolean" ||
        (value.victoryCredited && value.phase !== "won"))
    )
      return false;
    return true;
  } catch {
    return false;
  }
}
