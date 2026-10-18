import {
  TOTAL_FLOORS,
  CLASSES,
  CLASS_BY_ID,
  BIOMES,
  RELICS,
  UPGRADES,
  ENEMIES,
  floorInfo,
  classUnlocked,
  upgradeCost,
} from "./content.js?v=3.0.0";
import {
  createRun,
  act,
  chooseRelic,
  visibleTiles,
  getThreats,
  validateRun,
  getStats,
} from "./engine.js?v=3.0.0";
import {
  loadProfile,
  saveProfile,
  syncProgress,
  validateProfile,
} from "./storage.js?v=3.0.0";
import {
  DungeonRenderer,
  spriteStyle,
  enemySprite,
  classSprite,
} from "./renderer.js?v=3.0.0";

import {
  findExploredPath,
  shouldStopTravel,
  travelAction,
} from "./navigation.js?v=3.0.0";

const $ = (selector) => document.querySelector(selector);
const app = $("#app"),
  modal = $("#modal");
const icon = (name) =>
  `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const portrait = (index, extra = "") =>
  `<span class="portrait ${extra}" style="${spriteStyle(index)}" aria-hidden="true"></span>`;
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = null;
}
const loaded = loadProfile(storage, validateRun);
let profile = loaded.profile,
  selectedClass = "warden",
  view = "home",
  renderer = null,
  inspectedId = null,
  endShown = false;
let lastFocus = null,
  audioContext = null,
  externalChanged = false;
let travelTimer = null,
  travelQueue = [],
  toastTimer = null,
  lastMovement = 0;
let saveWarning =
  {
    unavailable:
      "El navegador bloquea el guardado. Puedes exportar tu progreso desde la crónica.",
    corrupt:
      "No se ha podido leer la partida guardada. Puedes importar una copia desde la crónica.",
    recovered: "Se ha recuperado la última copia válida de tu partida.",
  }[loaded.status] || "";
const activeRun = () =>
  profile.run && ["playing", "reward"].includes(profile.run.phase);
function persist() {
  if (externalChanged) return false;
  syncProgress(profile);
  const ok = saveProfile(storage, profile);
  if (!ok)
    saveWarning =
      "No se ha podido guardar. Exporta una copia desde la crónica antes de cerrar.";
  const shardTotal = $(".shard-total");
  if (shardTotal)
    shardTotal.innerHTML = `${icon("spark")} ${profile.meta.shards}${view === "home" ? '<span class="desktop-only"> fragmentos</span>' : ""}`;
  const status = $("#save-status");
  if (status) {
    status.textContent = ok
      ? "Progreso guardado en este navegador"
      : "Guardado no disponible";
    status.classList.toggle("save-failed", !ok);
  }
  return ok;
}
function tone(kind = "step") {
  if (!profile.settings.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();
    const o = audioContext.createOscillator(),
      g = audioContext.createGain();
    o.type = "sine";
    o.frequency.value = kind === "hit" ? 110 : kind === "reward" ? 440 : 220;
    g.gain.setValueAtTime(0.035, audioContext.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.13);
    o.connect(g);
    g.connect(audioContext.destination);
    o.start();
    o.stop(audioContext.currentTime + 0.14);
  } catch {
    /* Sound is optional; all feedback also appears visually. */
  }
}
function header() {
  return `<header class="site-header"><a class="brand" href="./" data-action="home" aria-label="Yala, volver al refugio">${icon("lantern")}<span>YALA</span></a><nav aria-label="Principal"><button class="nav-link ${view === "home" ? "current" : ""}" data-action="home">Refugio</button>${activeRun() ? '<button class="nav-link" data-action="resume">Expedición</button>' : ""}<button class="nav-link" data-action="chronicle">Crónica</button></nav><div class="header-end"><span class="shard-total" title="Fragmentos para mejoras permanentes">${icon("spark")} ${profile.meta.shards}<span class="desktop-only"> fragmentos</span></span><button class="icon-button" data-action="sound" aria-label="${profile.settings.sound ? "Desactivar" : "Activar"} sonido" aria-pressed="${profile.settings.sound}">${icon("sound")}<span class="sound-state">${profile.settings.sound ? "ON" : "OFF"}</span></button></div></header>`;
}
function footer() {
  return `<footer class="site-footer"><span id="save-status">${storage ? "Progreso guardado en este navegador" : "Guardado no disponible"}</span></footer>`;
}
function renderHome() {
  stopTravel();
  document.body.classList.remove("is-playing");
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  view = "home";
  renderer?.destroy();
  renderer = null;
  endShown = false;
  const m = profile.meta,
    hasRun = activeRun();
  app.innerHTML = `<div class="shell">${header()}${saveWarning ? `<p class="notice" role="status">${esc(saveWarning)}</p>` : ""}
    <main id="main-content"><section class="refuge-hero" aria-labelledby="home-title"><div class="hero-art" role="img" aria-label="Un custodio con un farol ante la monumental puerta del abismo"></div><div class="hero-copy"><h1 id="home-title">YALA</h1><p class="hero-subtitle">Ecos del abismo</p><p class="hero-story">Combate por turnos. Dieciocho plantas.<br>Recupera el Amuleto de Yala.</p><div class="hero-actions"><button class="button primary" data-action="${hasRun ? "resume" : "start"}">${hasRun ? "Continuar expedición" : "Entrar al abismo"}${icon("arrow")}</button><button class="text-button" data-action="${hasRun ? "new" : "help"}">${hasRun ? "Nueva expedición" : "Cómo jugar"}${icon(hasRun ? "sword" : "book")}</button></div>${hasRun ? `<p class="hero-note">${esc(CLASS_BY_ID[profile.run.player.classId].name)} · Planta ${profile.run.floor} de ${TOTAL_FLOORS}</p>` : ""}</div></section>
    <div class="refuge-columns"><section class="class-section" aria-labelledby="class-title"><div class="section-heading"><div><h2 id="class-title">Elige tu clase</h2></div></div><div class="class-list">${CLASSES.map(
      (c) => {
        const unlocked = classUnlocked(c.id, m);
        return `<button class="class-choice ${selectedClass === c.id ? "selected" : ""} ${unlocked ? "" : "locked"}" data-class="${c.id}" ${unlocked ? "" : "disabled"} aria-pressed="${selectedClass === c.id}" aria-label="${esc(c.name)}${unlocked ? "" : `, se desbloquea al vencer al jefe de la planta ${c.unlockFloor - 1}`}">${portrait(classSprite(c.id))}<span class="class-copy"><strong>${c.name}</strong>${unlocked ? `<small>${c.hp} vida · ${c.attack} ataque · ${esc(c.skill.name)}</small>` : `<span>Vence al guardián de la planta ${c.unlockFloor - 1}</span>`}</span><span class="class-select-mark">${unlocked ? icon(selectedClass === c.id ? "spark" : "chevron") : icon("shield")}</span></button>`;
      },
    ).join(
      "",
    )}</div><p class="class-detail">${esc(CLASS_BY_ID[selectedClass].description)}</p></section>
    <section class="legacy-section" aria-labelledby="legacy-title"><div class="section-heading"><div><h2 id="legacy-title">Mejoras permanentes</h2><p>Invierte tus fragmentos. El final exige un legado fuerte.</p></div></div><div class="upgrade-list">${UPGRADES.map(
      (u, i) => {
        const level = m.upgrades[u.id] || 0,
          cost = upgradeCost(u.id, level),
          max = level >= u.maxLevel;
        return `<div class="upgrade-row"><div class="upgrade-icon">${icon(["heart", "sword", "shield", "spark", "potion"][i])}</div><div class="upgrade-copy"><h3>${u.name}</h3><p>${u.description}</p><div class="upgrade-level" aria-label="Nivel ${level} de ${u.maxLevel}">${Array.from({ length: u.maxLevel }, (_, i) => `<span class="${i < level ? "filled" : ""}"></span>`).join("")}</div></div><button class="upgrade-buy" data-upgrade="${u.id}" ${max || m.shards < cost ? "disabled" : ""} aria-label="${max ? "Mejora completada" : `Mejorar ${u.name} por ${cost} fragmentos`}">${max ? "Máx." : `${icon("spark")}${cost}`}</button></div>`;
      },
    ).join(
      "",
    )}</div></section></div>
    <section class="descent-section" aria-labelledby="descent-title"><div class="section-heading"><div><h2 id="descent-title">El descenso</h2><p>Seis dominios. Un guardián cada tres plantas.</p></div><span class="best-depth">Mejor descenso <strong>${m.bestFloor ? String(m.bestFloor).padStart(2, "0") : "—"}</strong><span>/ ${TOTAL_FLOORS}</span></span></div><div class="biome-track">${BIOMES.map((b) => `<div class="biome-stop ${m.bestFloor >= b.floors[0] ? "reached" : ""}"><div class="floor-nodes">${b.floors.map((f) => `<span class="floor-node ${m.bestFloor >= f ? "reached" : ""} ${f % 3 === 0 ? "boss-node" : ""}" title="Planta ${f}${f % 3 === 0 ? " · Guardián" : ""}">${f % 3 === 0 ? icon("shield") : String(f).padStart(2, "0")}</span>`).join("")}</div><h3>${b.name}</h3></div>`).join("")}</div></section></main>${footer()}</div>`;
}
function requestGameFullscreen() {
  if (document.fullscreenElement || !document.documentElement.requestFullscreen)
    return;
  // Native fullscreen is opt-in from the HUD or pause menu.
  document.documentElement
    .requestFullscreen({ navigationUI: "hide" })
    .catch(() => {});
}
function stopTravel() {
  clearTimeout(travelTimer);
  travelTimer = null;
  travelQueue = [];
  if (renderer) {
    renderer.path = [];
    if (profile.run && view === "game") renderer.draw(profile.run);
  }
}
function walkTo(target) {
  stopTravel();
  const r = profile.run;
  if (modal.open || !r || r.phase !== "playing") return;
  const adjacent =
    Math.abs(target.x - r.player.x) + Math.abs(target.y - r.player.y) === 1;
  if (adjacent) {
    perform({
      type: "move",
      dx: target.x - r.player.x,
      dy: target.y - r.player.y,
    });
    return;
  }
  const enemy = r.enemies.find(
    (e) =>
      e.hp > 0 &&
      e.x === target.x &&
      e.y === target.y &&
      visibleTiles(r).has(e.y * r.map.width + e.x),
  );
  if (enemy) {
    inspectedId = enemy.id;
    updateInspector();
    toast("Acércate para atacar o usa tu habilidad.");
    return;
  }
  if (shouldStopTravel(r)) {
    toast("Hay enemigos cerca. Muévete de uno en uno para combatir.");
    return;
  }
  travelQueue = findExploredPath(r, target);
  if (!travelQueue.length) {
    toast("Elige una casilla explorada y libre de trampas.");
    return;
  }
  function step() {
    if (
      view !== "game" ||
      modal.open ||
      externalChanged ||
      shouldStopTravel(profile.run)
    ) {
      stopTravel();
      return;
    }
    const next = travelQueue.shift(),
      action = next && travelAction(profile.run, next);
    if (!action) {
      stopTravel();
      return;
    }
    renderer.path = [next, ...travelQueue];
    perform(action, { travelling: true });
    if (travelQueue.length) travelTimer = setTimeout(step, 150);
    else stopTravel();
  }
  step();
}
function toast(message) {
  const node = $("#hud-toast");
  if (!node) return;
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (node.isConnected) node.hidden = true;
  }, 3000);
  $("#announcer").textContent = message;
}
function showGame() {
  if (!activeRun()) {
    renderHome();
    return;
  }
  stopTravel();
  view = "game";
  renderer?.destroy();
  inspectedId = null;
  endShown = false;
  document.body.classList.add("is-playing");
  const r = profile.run,
    info = floorInfo(r.floor);
  app.innerHTML = `<main class="game-screen" id="playfield" aria-label="Expedición">
    <canvas id="dungeon" tabindex="0" role="img" aria-label="Mapa de la mazmorra. Usa las flechas o WASD para moverte. Toca una casilla para caminar. H abre la ayuda."></canvas>
    <div class="hud-top"><section class="hud-vitals hud-surface" aria-label="Tu personaje" id="resources"></section>
    <section class="hud-location" aria-label="Localización"><p><span id="region-name"></span><span class="hud-depth">PLANTA <strong id="depth-number"></strong> / ${TOTAL_FLOORS}</span></p><h1 id="floor-title"></h1><span id="turn-counter"></span></section>
    <aside class="hud-cartography"><nav class="hud-tools hud-surface" aria-label="Menú de la partida"><button data-action="journal" aria-label="Abrir diario y reliquias" title="Diario · J">${icon("book")}</button><button data-action="help" aria-label="Cómo jugar" title="Ayuda · H">${icon("help")}</button><button data-action="fullscreen" id="fullscreen-toggle" aria-label="Activar pantalla completa" title="Pantalla completa">${icon("expand")}</button><button data-action="pause" aria-label="Pausar la expedición" title="Pausa · Esc">${icon("pause")}</button></nav><button class="minimap-toggle" data-action="map" aria-haspopup="dialog" aria-controls="modal">${icon("map")}<span>Mapa</span></button><section class="hud-minimap hud-surface" id="hud-minimap" aria-label="Mapa explorado"><canvas id="minimap" aria-label="Minimapa de las zonas exploradas"></canvas><div><span>${icon("lantern")} Tú</span><span>${icon("stairs")} Descenso</span></div></section></aside></div>
    <section id="enemy-inspector" class="hud-enemy hud-surface" aria-label="Enemigo seleccionado" hidden></section>
    <div class="hud-toast hud-surface" id="hud-toast" role="status" hidden></div><div class="map-tooltip hud-surface" id="map-tooltip" hidden></div>
    <div class="hud-bottom"><div class="hud-feedback"><div id="danger-warning" class="danger-warning" role="status" hidden>${icon("shield")}<span>¡Sal de la casilla roja antes de actuar!</span></div><p id="map-caption"></p><button id="context-action" class="context-action" data-action="interact" hidden></button><p class="hud-event" id="hud-event" aria-live="polite"></p></div>
    <div class="hud-controls"><section class="hud-movement" aria-label="Movimiento"><div class="dpad"><button data-move="0,-1" class="dpad-up" aria-label="Mover arriba">${icon("arrow")}</button><button data-move="-1,0" class="dpad-left" aria-label="Mover izquierda">${icon("arrow")}</button><span class="dpad-center" aria-hidden="true">${icon("cursor")}</span><button data-move="1,0" class="dpad-right" aria-label="Mover derecha">${icon("arrow")}</button><button data-move="0,1" class="dpad-down" aria-label="Mover abajo">${icon("arrow")}</button></div><p><kbd>WASD</kbd> / flechas</p></section><section class="hud-action-dock hud-surface" aria-label="Acciones de combate"><div id="action-bar" class="hud-actions"></div><p class="hud-control-note"><span>Los enemigos esperan tu turno.</span><span>Clic para caminar · <kbd>Esc</kbd> pausa</span></p></section><div class="hud-zoom hud-surface" aria-label="Tamaño del mapa"><button data-action="zoom-in" aria-label="Acercar el mapa" title="Acercar">${icon("plus")}</button><button data-action="zoom-out" aria-label="Alejar el mapa" title="Alejar">${icon("minus")}</button></div></div></div>
  </main>`;
  renderer = new DungeonRenderer($("#dungeon"), $("#minimap"));
  const canvas = $("#dungeon");
  canvas.addEventListener("pointermove", inspectMap);
  canvas.addEventListener("pointerleave", () => {
    if (!renderer) return;
    renderer.hover = null;
    $("#map-tooltip").hidden = true;
    renderer.draw(profile.run);
  });
  canvas.addEventListener("click", (event) => walkTo(renderer.tileAt(event)));
  updateGame();
  canvas.focus({ preventScroll: true });
}
function updateGame() {
  const r = profile.run;
  if (!r || view !== "game") return;
  const p = r.player,
    s = getStats(r),
    info = floorInfo(r.floor),
    c = CLASS_BY_ID[p.classId],
    vis = visibleTiles(r);
  $("#region-name").textContent = info.biome.name;
  $("#floor-title").textContent = info.name;
  $("#depth-number").textContent = String(r.floor).padStart(2, "0");
  $("#turn-counter").textContent = `Turno ${r.turn}`;
  $("#resources").innerHTML =
    `<div class="hud-character">${portrait(classSprite(c.id))}<div><strong>${c.name}</strong><span>Nivel ${p.level}<span class="hud-combat-stats">${icon("sword")}${s.attack} ${icon("shield")}${s.armor}</span></span></div></div><div class="hud-health"><div><span>${icon("heart")} Vida</span><strong>${p.hp}<small> / ${s.maxHp}</small></strong></div><div class="meter-track" role="meter" aria-label="Vida" aria-valuemin="0" aria-valuemax="${s.maxHp}" aria-valuenow="${p.hp}"><span style="width:${(p.hp / s.maxHp) * 100}%"></span></div></div><div class="hud-energy"><span>${icon("spark")} Energía</span><div class="energy-pips" aria-label="${p.energy} de ${s.maxEnergy} de energía">${Array.from({ length: s.maxEnergy }, (_, i) => `<span class="${i < p.energy ? "filled" : ""}"></span>`).join("")}</div><strong>${p.energy}<small>/${s.maxEnergy}</small></strong></div><div class="hud-currencies"><span title="Oro de esta expedición">${icon("coin")}${p.gold}</span><span title="Fragmentos permanentes" class="shard-total">${icon("spark")}${profile.meta.shards}</span><span title="Pociones: ${p.potions} de ${s.potionCapacity}">${icon("potion")}${p.potions}/${s.potionCapacity}</span><span class="save-light ${saveWarning ? "failed" : ""}" title="${saveWarning ? esc(saveWarning) : "Guardado automático activo"}" aria-label="${saveWarning ? "Guardado no disponible" : "Guardado automático activo"}"></span></div>`;
  const threats = getThreats(r),
    inDanger = threats.some((t) => t.x === p.x && t.y === p.y),
    nearObject = r.objects.find(
      (o) =>
        !o.used &&
        ["chest", "fountain", "shrine"].includes(o.type) &&
        Math.abs(o.x - p.x) + Math.abs(o.y - p.y) <= 1,
    ),
    atExit = Math.abs(r.map.exit.x - p.x) + Math.abs(r.map.exit.y - p.y) <= 1,
    nearEnemy = r.enemies.find(
      (e) => e.hp > 0 && Math.abs(e.x - p.x) + Math.abs(e.y - p.y) === 1,
    ),
    boss = r.enemies.find((e) => e.boss && e.hp > 0);
  $("#danger-warning").hidden = !inDanger;
  const contextual = $("#context-action");
  contextual.hidden = true;
  contextual.disabled = false;
  if (nearEnemy) {
    contextual.hidden = false;
    contextual.dataset.action = "attack";
    contextual.innerHTML = `${icon("sword")} Atacar <span>${esc(ENEMIES[nearEnemy.type].name)}</span><kbd>Enter</kbd>`;
  } else if (atExit && !boss) {
    contextual.hidden = false;
    contextual.dataset.action = "interact";
    contextual.innerHTML = `${icon("stairs")} ${r.floor === TOTAL_FLOORS ? "Recuperar el amuleto" : "Descender"}<kbd>E</kbd>`;
  } else if (nearObject) {
    contextual.hidden = false;
    contextual.dataset.action = "interact";
    contextual.innerHTML = `${icon("lantern")} ${nearObject.type === "chest" ? "Abrir cofre" : nearObject.type === "fountain" ? "Beber de la fuente" : `Bendición · ${20 + r.floor * 3} oro`}<kbd>E</kbd>`;
  }
  const visibleEnemies = r.enemies.filter(
    (e) => e.hp > 0 && vis.has(e.y * r.map.width + e.x),
  );
  $("#map-caption").textContent =
    saveWarning ||
    (r.phase === "reward"
      ? "Elige una reliquia para continuar."
      : inDanger
        ? "El ataque está preparado. Muévete fuera de la señal."
        : nearEnemy
          ? "Ataca, usa tu habilidad o esquiva. Tú eliges."
          : atExit && boss
            ? "El guardián mantiene el descenso sellado."
            : visibleEnemies.length
              ? "Pulsa una dirección para moverte y atacar."
              : "Toca una casilla para caminar. Explora y encuentra el descenso.");
  $("#hud-event").textContent = r.turn > 0 ? r.log.at(-1) || "" : "";
  $("#hud-event").classList.toggle("event-danger", inDanger);
  const playing = r.phase === "playing",
    range = p.classId === "warden" ? 2 : p.classId === "ranger" ? 6 : p.classId === "luminary" ? 5 : 4,
    hasSkillTarget = visibleEnemies.some(
      (e) => Math.abs(e.x - p.x) + Math.abs(e.y - p.y) <= range,
    );
  const buttons = [
    [
      "skill",
      c.skill.name,
      "Q",
      `${s.skillCost} energía`,
      p.energy < s.skillCost || !hasSkillTarget,
      "spark",
      c.skill.description,
    ],
    [
      "dash",
      "Esquivar",
      "Espacio",
      "2 energía",
      p.energy < 2,
      "boot",
      "Avanza dos casillas en la dirección hacia la que miras e ignora ataques durante el turno.",
    ],
    [
      "guard",
      "Guardia",
      "F",
      "+4 armadura",
      false,
      "shield",
      "Reduce el daño durante este turno y recupera energía.",
    ],
    [
      "potion",
      "Curarte",
      "R",
      `${p.potions}/${s.potionCapacity} pociones`,
      p.potions < 1 || p.hp >= s.maxHp,
      "potion",
      "Recupera el 30 % de tu vida máxima más los efectos de tus reliquias.",
    ],
    [
      "interact",
      atExit ? "Descender" : "Usar",
      "E",
      nearObject ? "A tu alcance" : "Busca objetos",
      !nearObject && !atExit,
      "lantern",
      "Abre cofres, bebe en fuentes, activa santuarios o desciende.",
    ],
    [
      "wait",
      "Esperar",
      "X",
      "+1 energía",
      false,
      "eye",
      "Espera un turno para recuperar energía. Los enemigos también actúan.",
    ],
  ];
  const focusedAction =
    document.activeElement?.closest("#action-bar button")?.dataset.action;
  $("#action-bar").innerHTML = buttons
    .map(
      ([id, label, key, note, disabled, ico, description]) =>
        `<button data-action="${id}" class="hud-action ${id === "skill" ? "skill-action" : ""}" ${!playing || disabled ? "disabled" : ""} aria-label="${esc(label)}. ${esc(note)}" title="${esc(description)}"><kbd>${key}</kbd>${icon(ico)}<strong>${esc(label)}</strong><small>${esc(note)}</small></button>`,
    )
    .join("");
  if (focusedAction)
    $(`#action-bar [data-action="${focusedAction}"]`)?.focus({
      preventScroll: true,
    });
  updateInspector();
  renderer.draw(r);
  $("#announcer").textContent =
    `Vida ${p.hp} de ${s.maxHp}. ${inDanger ? "Ataque inminente. " : ""}${r.log.at(-1) || ""}`;
  if (r.phase === "reward" && !modal.open) showRewards();
  if (["dead", "won"].includes(r.phase) && !endShown) {
    endShown = true;
    showEnd();
  }
}
function updateInspector() {
  const r = profile.run,
    node = $("#enemy-inspector");
  if (!r || !node) return;
  const vis = visibleTiles(r),
    seen = r.enemies.filter(
      (e) => e.hp > 0 && vis.has(e.y * r.map.width + e.x),
    );
  const enemy =
    seen.find((e) => e.id === inspectedId) ||
    seen.find((e) => e.intent) ||
    seen.sort(
      (a, b) =>
        Math.abs(a.x - r.player.x) +
        Math.abs(a.y - r.player.y) -
        (Math.abs(b.x - r.player.x) + Math.abs(b.y - r.player.y)),
    )[0];
  node.hidden = !enemy;
  if (!enemy) return;
  const d = ENEMIES[enemy.type],
    distance = Math.abs(enemy.x - r.player.x) + Math.abs(enemy.y - r.player.y);
  node.innerHTML = `${portrait(enemySprite(enemy.type))}<div class="hud-enemy-copy"><h2>${esc(d.name)}</h2><div class="enemy-health"><span style="width:${(enemy.hp / enemy.maxHp) * 100}%"></span></div><p><span>${enemy.hp} / ${enemy.maxHp} vida</span><span>${distance === 1 ? "A tu lado" : `${distance} pasos`}${enemy.resolve > 0 ? ` · Temple ${enemy.resolve}` : ""}</span></p><span class="enemy-intent ${enemy.intent ? "danger-text" : ""}">${enemy.intent ? "Ataque preparado. Evita las marcas rojas." : enemy.boss && enemy.cooldown > 0 ? "Recuperación: contraataca si te quedas a su lado." : esc(d.intention)}</span></div>`;
}
function inspectMap(event) {
  if (!renderer || !profile.run || modal.open) return;
  const t = renderer.tileAt(event);
  if (renderer.hover?.x === t.x && renderer.hover?.y === t.y) return;
  renderer.hover = t;
  const r = profile.run,
    vis = visibleTiles(r),
    tooltip = $("#map-tooltip");
  tooltip.hidden = true;
  if (
    t.x >= 0 &&
    t.y >= 0 &&
    t.x < r.map.width &&
    t.y < r.map.height &&
    vis.has(t.y * r.map.width + t.x)
  ) {
    const enemy = r.enemies.find((e) => e.hp > 0 && e.x === t.x && e.y === t.y);
    if (enemy) {
      inspectedId = enemy.id;
      updateInspector();
    }
    const obj = r.objects.find((o) => !o.used && o.x === t.x && o.y === t.y);
    if (obj) {
      tooltip.textContent = {
        chest: "Cofre · acércate y pulsa E",
        fountain: "Fuente · recupera vida con E",
        shrine: `Santuario · ${["+1 ataque", "+4 vida máxima", "+1 energía máxima"][(r.floor - 1) % 3]} y 5 de vida por ${20 + r.floor * 3} oro`,
        trap: "Trampa · evita esta casilla",
        gold: "Oro · recógelo al caminar",
        potion: "Poción · recógela al caminar",
      }[obj.type];
      tooltip.hidden = false;
    }
  }
  renderer.draw(r);
}
function showMap() {
  openModal(
    `<h2 id="modal-title">Mapa de la planta ${profile.run.floor}</h2><p class="modal-lead">El tiempo se detiene mientras consultas el mapa.</p><canvas id="overview-map" class="overview-map" aria-label="Mapa de las casillas exploradas, con tu posición y el descenso descubierto"></canvas><p class="overview-legend"><span>${icon("lantern")} Tu posición</span><span>${icon("stairs")} Descenso</span></p><button class="button primary" data-action="close">Volver a jugar ${icon("arrow")}</button>`,
  );
  const source = $("#minimap"),
    target = $("#overview-map");
  target.width = source.width;
  target.height = source.height;
  target.getContext("2d").drawImage(source, 0, 0);
}
function showPause() {
  openModal(
    `<div class="pause-content">${icon("lantern")}<h2 id="modal-title">El abismo puede esperar.</h2><p class="modal-lead">Tu expedición está guardada. Aquí el tiempo se detiene.</p><p class="pause-wallet">${profile.run.player.gold} oro · ${profile.meta.shards} fragmentos · ${profile.run.player.potions}/${getStats(profile.run).potionCapacity} pociones</p><div class="pause-actions"><button class="button primary" data-action="close">Seguir jugando ${icon("arrow")}</button><button class="button secondary" data-action="fullscreen">${icon("expand")} Pantalla completa</button><div class="pause-zoom"><button class="button secondary" data-action="zoom-in">${icon("plus")} Acercar mapa</button><button class="button secondary" data-action="zoom-out">${icon("minus")} Alejar mapa</button></div><button class="button secondary" data-action="help">${icon("help")} Cómo jugar</button><button class="button secondary" data-action="journal">${icon("book")} Diario y reliquias</button><button class="text-button" data-action="home">Volver al refugio</button></div><p class="modal-note" id="save-status">${saveWarning ? esc(saveWarning) : "Guardado automático · todo tu progreso está a salvo en este navegador."}</p></div>`,
  );
}
function showJournal() {
  const r = profile.run,
    info = floorInfo(r.floor);
  openModal(
    `<h2 id="modal-title">Diario del descenso</h2><p class="modal-lead">Planta ${r.floor} · ${esc(info.name)}</p><blockquote class="journal-lore">${esc(info.story)}</blockquote><h3>Tu siguiente paso</h3><p class="journal-objective">${info.isBoss && r.enemies.some((e) => e.boss && e.hp > 0) ? `Derrota a ${esc(info.boss.name)} para abrir el descenso.` : "Explora y encuentra las escaleras doradas del minimapa."}</p><h3 class="journal-section-title">Reliquias · ${r.relics.length}</h3><div class="journal-relics">${
      r.relics.length
        ? r.relics
            .map((id) => {
              const item = RELICS.find((a) => a.id === id);
              return `<p>${icon("spark")}<span><strong>${item.name}</strong>${item.description}</span></p>`;
            })
            .join("")
        : "<p>Elige tu primera reliquia al completar esta planta.</p>"
    }</div><h3 class="journal-section-title">Últimos acontecimientos</h3><ol class="journal-history">${r.log
      .slice(-12)
      .reverse()
      .map((line) => `<li>${esc(line)}</li>`)
      .join("")}</ol>`,
  );
}
function perform(action, { travelling = false } = {}) {
  if (!travelling) stopTravel();
  if (externalChanged || view !== "game" || !profile.run || modal.open) return;
  const r = profile.run,
    p = r.player,
    beforeHp = p.hp,
    beforeKills = r.kills,
    beforeEnergy = p.energy,
    beforeFloor = r.floor,
    beforeLog = r.log.length;
  if (action.type === "dash") {
    action.dx = p.facing?.x || 0;
    action.dy = p.facing?.y || 0;
  }
  const consumed = act(r, action);
  persist();
  if (p.hp < beforeHp) {
    renderer.effect(p.x, p.y, `−${beforeHp - p.hp}`, "#e78976");
    tone("hit");
    $("#dungeon")?.classList.remove("hurt");
    requestAnimationFrame(() => $("#dungeon")?.classList.add("hurt"));
  } else if (r.kills > beforeKills) {
    renderer.effect(p.x, p.y, "Derrotado", "#dbb66b");
    tone("reward");
  } else if (consumed) tone("step");
  updateGame();
  if (travelling && shouldStopTravel(r)) stopTravel();
  if (
    !consumed &&
    r.log.length === beforeLog &&
    p.energy === beforeEnergy &&
    r.floor === beforeFloor
  ) {
    toast("No puedes realizar esa acción desde aquí.");
  }
}
function startRun() {
  if (externalChanged) return;
  if (!classUnlocked(selectedClass, profile.meta)) return;
  profile.run = createRun({
    classId: selectedClass,
    upgrades: profile.meta.upgrades,
  });
  profile.meta.runs++;
  persist();
  closeModal();
  showGame();
  $("#dungeon").focus({ preventScroll: true });
}
function openModal(html) {
  stopTravel();
  if (modal.open) modal.close();
  lastFocus = document.activeElement;
  modal.innerHTML = `${view === "game" && profile.run?.phase === "reward" ? "" : `<button class="modal-close icon-button" data-action="close" aria-label="Cerrar">${icon("close")}</button>`}${html}`;
  modal.showModal();
}
function closeModal() {
  modal.close();
  lastFocus?.focus?.({ preventScroll: true });
}
function showRewards() {
  const r = profile.run;
  openModal(
    `<div class="reward-intro">${icon("spark")}<h2 id="modal-title">El abismo te ofrece un eco</h2><p>Elige una reliquia. Sus efectos te acompañan durante toda la expedición.</p></div><div class="reward-choices">${r.rewardChoices
      .map((id) => {
        const item = RELICS.find((i) => i.id === id);
        return `<button class="reward-choice rarity-${item.rarity}" data-reward="${id}"><span class="relic-emblem">${icon("spark")}</span><small>${{ common: "ANTIGUO", uncommon: "EXCEPCIONAL", rare: "LEGENDARIO" }[item.rarity]}</small><h3>${item.name}</h3><p>${item.description}</p><span class="reward-pick">Elegir reliquia ${icon("arrow")}</span></button>`;
      })
      .join(
        "",
      )}</div><p class="modal-note">Después descenderás a la planta ${r.floor + 1}. Recuperas parte de tu vida y toda tu energía.</p>`,
  );
}
function showEnd() {
  const r = profile.run,
    won = r.phase === "won";
  openModal(
    `<div class="end-result">${icon(won ? "spark" : "lantern")}<p class="end-title-note">${won ? "EL AMULETO VUELVE A LA LUZ" : "TU ECO PERMANECE"}</p><h2 id="modal-title">${won ? "El abismo recuerda<br>tu victoria." : "La luz se apaga.<br>Tu legado sigue."}</h2><p>${won ? "Has recuperado el Amuleto de Yala. Los seis dominios conocen tu nombre." : "Cada descenso deja algo atrás. Usa tus fragmentos en el refugio y vuelve con más fuerza."}</p><div class="result-stats"><span><strong>${r.floor}<small>/${TOTAL_FLOORS}</small></strong>Planta alcanzada</span><span><strong>${r.kills}</strong>Enemigos vencidos</span><span><strong>${r.shards}</strong>Fragmentos ganados</span></div><button class="button primary" data-action="return">Volver al refugio ${icon("arrow")}</button></div>`,
  );
}
function showHelp() {
  openModal(
    `<h2 id="modal-title">Cada paso cuenta.</h2><p class="modal-lead">El tiempo solo avanza cuando actúas. Observa, decide y sobrevive.</p><div class="help-grid"><section><h3>Explora</h3><p><kbd>WASD</kbd> o <kbd>↑↓←→</kbd> para moverte. Camina hacia un enemigo para atacarlo. También puedes tocar una casilla explorada para caminar hasta ella; el movimiento se detiene al aparecer un enemigo. Usa la cruceta en combate.</p><p><kbd>E</kbd> abre cofres, activa santuarios y desciende. Los objetos deben estar a tu lado. Las escaleras son doradas en el minimapa.</p></section><section><h3>Combate</h3><p><kbd>Q</kbd> usa tu habilidad de clase. <kbd>Espacio</kbd> esquiva hacia donde miras y cuesta 2 de energía. <kbd>F</kbd> prepara la guardia y recupera energía.</p><p>Las casillas rojas anuncian dónde golpeará el enemigo en el siguiente turno. Muévete fuera o esquiva. Recuperas 1 de energía al esperar o preparar guardia. Moverte sólo la recupera sin enemigos alertados a la vista; el ataque básico no la recupera. Los enemigos resisten las interrupciones repetidas y pueden avanzar dos casillas. Los guardianes contraatacan durante su recuperación si sigues a su lado.</p></section><section><h3>Sobrevive</h3><p><kbd>R</kbd> bebe una poción: cura el 30 % de tu vida máxima. Puedes llevar 3; las provisiones del refugio amplían esa capacidad hasta 6. Las pociones que no caben quedan en el suelo. <kbd>X</kbd> espera y recupera energía. Las fuentes restauran un 30 % de tu vida máxima y toda tu energía una vez. Los santuarios cuestan 20 + 3 × planta de oro y recuperan 5 de vida: alternan +1 ataque, +4 vida máxima y +1 energía máxima cada tres plantas.</p><p>El oro solo dura esta expedición. Los fragmentos se conservan para las mejoras del refugio.</p></section><section><h3>Deja un legado</h3><p>Elige una reliquia antes de cada nueva planta. Derrota a los guardianes de las plantas 3, 6, 9, 12, 15 y 18. Los guardianes 3, 6 y 12 desbloquean nuevas clases.</p><p>Guardado automático tras cada acción. <kbd>Esc</kbd> pausa la partida. El menú permite volver al refugio. <kbd>J</kbd> abre el diario. El botón de pantalla completa oculta los controles del navegador cuando está disponible. Exporta una copia desde la crónica para cambiar de navegador.</p></section></div><button class="button primary" data-action="close">Entendido ${icon("arrow")}</button>`,
  );
}
function showChronicle() {
  const m = profile.meta;
  openModal(
    `<h2 id="modal-title">La memoria del abismo</h2><p class="modal-lead">No todos regresan. Ningún descenso se olvida.</p><div class="chronicle-stats"><span><strong>${m.runs}</strong>Expediciones</span><span><strong>${m.wins}</strong>Victorias</span><span><strong>${m.kills}</strong>Enemigos vencidos</span><span><strong>${m.lifetimeShards}</strong>Fragmentos reunidos</span></div><div class="boss-record">${BIOMES.map((b) => `<div class="${m.bosses.includes(b.bossId) ? "defeated" : ""}">${icon("shield")}<span><strong>${b.boss.name}</strong><small>${m.bosses.includes(b.bossId) ? "Sello roto" : `Guardián de la planta ${b.floors.at(-1)}`}</small></span></div>`).join("")}</div><div class="save-tools"><h3>Tu progreso viaja contigo</h3><p>Guardado en este navegador. Exporta una copia para conservarla o continuar en otro dispositivo.</p><div><button class="button secondary" data-action="export">Exportar progreso</button><button class="text-button" data-action="import">Importar una copia</button></div><p id="import-message" role="status"></p></div>`,
  );
}
app.addEventListener("click", handleClick);
modal.addEventListener("click", handleClick);
function handleClick(event) {
  const b = event.target.closest("button,a[data-action]");
  if (!b || b.disabled) return;
  if (externalChanged) {
    event.preventDefault();
    if (b.dataset.action === "reload") location.reload();
    return;
  }
  if (b.dataset.class) {
    selectedClass = b.dataset.class;
    renderHome();
    $(`[data-class="${selectedClass}"]`).focus({ preventScroll: true });
    return;
  }
  if (b.dataset.upgrade) {
    const u = UPGRADES.find((u) => u.id === b.dataset.upgrade),
      level = profile.meta.upgrades[u.id] || 0,
      cost = upgradeCost(u.id, level);
    if (profile.meta.shards >= cost && level < u.maxLevel) {
      profile.meta.shards -= cost;
      profile.meta.upgrades[u.id] = level + 1;
      tone("reward");
      persist();
      renderHome();
    }
    return;
  }
  if (b.dataset.reward) {
    if (chooseRelic(profile.run, b.dataset.reward)) {
      closeModal();
      persist();
      tone("reward");
      updateGame();
    }
    return;
  }
  if (b.dataset.relic) {
    const r = RELICS.find((r) => r.id === b.dataset.relic);
    openModal(
      `<div class="relic-detail">${icon("spark")}<h2 id="modal-title">${r.name}</h2><p>${r.description}</p><p class="modal-note">Efecto activo hasta el final de esta expedición.</p></div>`,
    );
    return;
  }
  if (b.dataset.move) {
    const [dx, dy] = b.dataset.move.split(",").map(Number);
    perform({ type: "move", dx, dy });
    return;
  }
  const action = b.dataset.action;
  if (!action) return;
  event.preventDefault();
  if (
    ["skill", "dash", "guard", "potion", "interact", "wait"].includes(action)
  ) {
    perform({ type: action });
    return;
  }
  if (action === "home" || action === "return") {
    closeModal();
    persist();
    renderHome();
  }
  if (action === "resume") {
    closeModal();
    showGame();
    $("#dungeon")?.focus({ preventScroll: true });
  }
  if (action === "start") startRun();
  if (action === "pause") showPause();
  if (action === "journal") showJournal();
  if (action === "fullscreen") {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else requestGameFullscreen();
  }
  if (action === "map") showMap();
  if (action === "zoom-in" || action === "zoom-out") {
    renderer?.setZoom(action === "zoom-in" ? 6 : -6);
  }
  if (action === "attack") {
    const p = profile.run.player,
      e = profile.run.enemies.find(
        (e) => e.hp > 0 && Math.abs(e.x - p.x) + Math.abs(e.y - p.y) === 1,
      );
    if (e) perform({ type: "move", dx: e.x - p.x, dy: e.y - p.y });
  }
  if (action === "new")
    openModal(
      `<h2 id="modal-title">Un nuevo descenso</h2><p class="modal-lead">Tu expedición actual termina aquí. Conservarás los fragmentos y el progreso permanente.</p><p>Desciendes con: <strong>${CLASS_BY_ID[selectedClass].name}</strong>. Puedes cerrar esta ventana y elegir otra clase en el refugio.</p><div class="modal-buttons"><button class="button primary" data-action="start">Abandonar y comenzar ${icon("arrow")}</button><button class="text-button" data-action="close">Seguir con mi expedición</button></div>`,
    );
  if (action === "help") showHelp();
  if (action === "chronicle") showChronicle();
  if (action === "close") closeModal();
  if (action === "sound") {
    profile.settings.sound = !profile.settings.sound;
    persist();
    tone("reward");
    b.setAttribute("aria-pressed", String(profile.settings.sound));
    b.setAttribute(
      "aria-label",
      `${profile.settings.sound ? "Desactivar" : "Activar"} sonido`,
    );
    b.querySelector(".sound-state").textContent = profile.settings.sound
      ? "ON"
      : "OFF";
  }
  if (action === "export") {
    persist();
    const blob = new Blob([JSON.stringify(profile, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `yala-progreso-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (action === "import") $("#import-save").click();
  if (action === "confirm-import") {
    profile = pendingImport;
    selectedClass = "warden";
    pendingImport = null;
    saveWarning = "";
    persist();
    closeModal();
    renderHome();
  }
}
let pendingImport = null;
$("#import-save").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  try {
    if (file.size > 2000000) throw Error();
    const imported = JSON.parse(await file.text());
    if (!validateProfile(imported, validateRun)) throw Error();
    pendingImport = imported;
    closeModal();
    openModal(
      `<h2 id="modal-title">Importar este legado</h2><p class="modal-lead">Esta copia contiene ${imported.meta.runs} expediciones, ${imported.meta.shards} fragmentos y un mejor descenso de ${imported.meta.bestFloor}/${TOTAL_FLOORS}.</p><p>Reemplazará el progreso de este navegador. Exporta primero tu progreso actual si quieres conservarlo.</p><div class="modal-buttons"><button class="button primary" data-action="confirm-import">Reemplazar e importar</button><button class="text-button" data-action="close">Cancelar</button></div>`,
    );
  } catch {
    const message = $("#import-message");
    if (message)
      message.textContent =
        "La copia no es válida o pertenece a otra versión. El progreso actual sigue intacto.";
  }
});
modal.addEventListener("cancel", (event) => {
  if (externalChanged || (view === "game" && profile.run?.phase === "reward"))
    event.preventDefault();
});
modal.addEventListener("close", () => {
  if (view === "game" && profile.run?.phase === "reward") {
    $("#map-caption").textContent =
      "Elige una reliquia para continuar · pulsa E";
  }
});
window.addEventListener("keydown", (event) => {
  if (
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.target.matches("input,textarea,select")
  )
    return;
  if (event.key === "Escape") {
    if (!modal.open && view === "game") {
      event.preventDefault();
      showPause();
    }
    return;
  }
  if (modal.open) return;
  if (event.key.toLowerCase() === "h") {
    event.preventDefault();
    showHelp();
    return;
  }
  if (view !== "game") return;
  if (event.key.toLowerCase() === "j") {
    event.preventDefault();
    showJournal();
    return;
  }
  if (event.key === "Enter" && !event.target.closest("button")) {
    event.preventDefault();
    const context = $("#context-action");
    if (context && !context.hidden) context.click();
    return;
  }
  if (event.target.closest("button") && [" ", "Enter"].includes(event.key))
    return;
  const k = event.key.toLowerCase(),
    moves = {
      arrowup: [0, -1],
      w: [0, -1],
      arrowdown: [0, 1],
      s: [0, 1],
      arrowleft: [-1, 0],
      a: [-1, 0],
      arrowright: [1, 0],
      d: [1, 0],
    };
  const command = {
    q: "skill",
    " ": "dash",
    f: "guard",
    r: "potion",
    e: "interact",
    x: "wait",
    ".": "wait",
  }[k];
  if (!moves[k] && !command) return;
  event.preventDefault();
  if (event.repeat) {
    if (
      !moves[k] ||
      shouldStopTravel(profile.run) ||
      performance.now() - lastMovement < 130
    )
      return;
  }
  if (moves[k]) lastMovement = performance.now();
  if (profile.run?.phase === "reward") {
    showRewards();
    return;
  }
  if (moves[k]) perform({ type: "move", dx: moves[k][0], dy: moves[k][1] });
  else perform({ type: command });
});
window.addEventListener("pagehide", () => {
  stopTravel();
  persist();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopTravel();
});
document.addEventListener("fullscreenchange", () => {
  const button = $("#fullscreen-toggle");
  if (button)
    button.setAttribute(
      "aria-label",
      document.fullscreenElement
        ? "Salir de pantalla completa"
        : "Activar pantalla completa",
    );
});
window.addEventListener("storage", (event) => {
  if (event.key === "yala.save.v1") {
    externalChanged = true;
    saveWarning =
      "El progreso ha cambiado en otra pestaña. Recarga para continuar con la versión más reciente.";
    if (modal.open) modal.close();
    openModal(
      `<h2 id="modal-title">Tu legado ha cambiado</h2><p class="modal-lead">${saveWarning}</p><button class="button primary" data-action="reload">Recargar el progreso ${icon("arrow")}</button>`,
    );
  }
});
renderHome();
