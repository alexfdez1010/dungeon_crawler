import {
  CLASSES,
  CLASS_BY_ID,
  BIOMES,
  RELICS,
  UPGRADES,
  ENEMIES,
  floorInfo,
  classUnlocked,
  upgradeCost,
} from "./content.js";
import {
  createRun,
  act,
  chooseRelic,
  visibleTiles,
  getThreats,
  validateRun,
  getStats,
} from "./engine.js";
import {
  loadProfile,
  saveProfile,
  syncProgress,
  validateProfile,
} from "./storage.js";
import { DungeonRenderer, spriteStyle, enemySprite } from "./renderer.js";

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
    shardTotal.innerHTML = `${icon("spark")} ${profile.meta.shards}<span class="desktop-only"> fragmentos</span>`;
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
  return `<header class="site-header"><a class="brand" href="./" data-action="home" aria-label="Yala, volver al refugio">${icon("lantern")}<span>YALA<span class="brand-sub">ECOS DEL ABISMO</span></span></a><nav aria-label="Principal"><button class="nav-link ${view === "home" ? "current" : ""}" data-action="home">Refugio</button>${activeRun() ? '<button class="nav-link" data-action="resume">Expedición</button>' : ""}<button class="nav-link" data-action="chronicle">Crónica</button></nav><div class="header-end"><span class="shard-total" title="Fragmentos para mejoras permanentes">${icon("spark")} ${profile.meta.shards}<span class="desktop-only"> fragmentos</span></span><button class="icon-button" data-action="sound" aria-label="${profile.settings.sound ? "Desactivar" : "Activar"} sonido" aria-pressed="${profile.settings.sound}">${icon("sound")}<span class="sound-state">${profile.settings.sound ? "ON" : "OFF"}</span></button></div></header>`;
}
function footer() {
  return `<footer class="site-footer"><span id="save-status">${storage ? "Progreso guardado en este navegador" : "Guardado no disponible"}</span><div><button data-action="help">Cómo jugar</button><a href="classic.html">Edición clásica</a><span>YALA / II</span></div></footer>`;
}
function renderHome() {
  view = "home";
  renderer?.destroy();
  renderer = null;
  endShown = false;
  const m = profile.meta,
    hasRun = activeRun();
  app.innerHTML = `<div class="shell">${header()}${saveWarning ? `<p class="notice" role="status">${esc(saveWarning)}</p>` : ""}
    <main id="main-content"><section class="refuge-hero" aria-labelledby="home-title"><div class="hero-art" role="img" aria-label="Un custodio con un farol ante la monumental puerta del abismo"></div><div class="hero-copy"><div class="hero-rule"></div><h1 id="home-title">YALA</h1><p class="hero-subtitle">Ecos del abismo</p><p class="hero-story">El mundo olvidó la luz.<br>El abismo recuerda tu nombre.</p><div class="hero-actions"><button class="button primary" data-action="${hasRun ? "resume" : "start"}">${hasRun ? "Continuar expedición" : "Entrar al abismo"}${icon("arrow")}</button><button class="text-button" data-action="${hasRun ? "new" : "help"}">${hasRun ? "Nueva expedición" : "Aprende a sobrevivir"}${icon(hasRun ? "sword" : "book")}</button></div><p class="hero-note">${hasRun ? `Tu ${esc(CLASS_BY_ID[profile.run.player.classId].name.toLowerCase())} te espera en la planta ${profile.run.floor}.` : "Por turnos. Sin prisa. Cada decisión deja huella."}</p></div><span class="hero-caption">LA PUERTA OLVIDADA · ATRIO DE CENIZA</span></section>
    <div class="refuge-columns"><section class="class-section" aria-labelledby="class-title"><div class="section-heading"><div><h2 id="class-title">Elige quién desciende</h2><p>Un juramento distinto. Otra forma de sobrevivir.</p></div><span class="fraction">${CLASSES.filter((c) => classUnlocked(c.id, m)).length} / 3</span></div><div class="class-list">${CLASSES.map(
      (c, i) => {
        const unlocked = classUnlocked(c.id, m);
        return `<button class="class-choice ${selectedClass === c.id ? "selected" : ""} ${unlocked ? "" : "locked"}" data-class="${c.id}" ${unlocked ? "" : "disabled"} aria-pressed="${selectedClass === c.id}" aria-label="${esc(c.name)}${unlocked ? "" : `, se desbloquea al vencer al jefe de la planta ${c.unlockFloor - 1}`}">${portrait(i)}<span class="class-copy"><strong>${c.name}</strong><span>${unlocked ? esc(c.title) : `Vence al guardián de la planta ${c.unlockFloor - 1}`}</span><small>${unlocked ? `${c.hp} vida · ${c.attack} ataque · ${c.skill.name}` : "CLASE BLOQUEADA"}</small></span><span class="class-select-mark">${unlocked ? icon(selectedClass === c.id ? "spark" : "chevron") : icon("shield")}</span></button>`;
      },
    ).join(
      "",
    )}</div><p class="class-detail">${esc(CLASS_BY_ID[selectedClass].description)}</p></section>
    <section class="legacy-section" aria-labelledby="legacy-title"><div class="section-heading"><div><h2 id="legacy-title">Lo que permanece</h2><p>Mejoras para tus próximas expediciones.</p></div>${icon("spark")}</div><div class="upgrade-list">${UPGRADES.map(
      (u, i) => {
        const level = m.upgrades[u.id] || 0,
          cost = upgradeCost(u.id, level),
          max = level >= u.maxLevel;
        return `<div class="upgrade-row"><div class="upgrade-icon">${icon(["heart", "sword", "shield", "spark"][i])}</div><div class="upgrade-copy"><h3>${u.name}</h3><p>${u.description}</p><div class="upgrade-level" aria-label="Nivel ${level} de ${u.maxLevel}">${Array.from({ length: u.maxLevel }, (_, i) => `<span class="${i < level ? "filled" : ""}"></span>`).join("")}</div></div><button class="upgrade-buy" data-upgrade="${u.id}" ${max || m.shards < cost ? "disabled" : ""} aria-label="${max ? "Mejora completada" : `Mejorar ${u.name} por ${cost} fragmentos`}">${max ? "Máx." : `${icon("spark")}${cost}`}</button></div>`;
      },
    ).join(
      "",
    )}</div><p class="legacy-note">Los fragmentos se conservan aunque no regreses.</p></section></div>
    <section class="descent-section" aria-labelledby="descent-title"><div class="section-heading"><div><h2 id="descent-title">Doce plantas hacia la verdad</h2><p>Cuatro dominios. Cuatro guardianes. Un amuleto.</p></div><span class="best-depth">Mejor descenso <strong>${m.bestFloor ? String(m.bestFloor).padStart(2, "0") : "—"}</strong><span>/ 12</span></span></div><div class="biome-track">${BIOMES.map((b) => `<div class="biome-stop ${m.bestFloor >= b.floors[0] ? "reached" : ""}"><div class="floor-nodes">${b.floors.map((f) => `<span class="floor-node ${m.bestFloor >= f ? "reached" : ""} ${f % 3 === 0 ? "boss-node" : ""}" title="Planta ${f}${f % 3 === 0 ? " · Guardián" : ""}">${f % 3 === 0 ? icon("shield") : String(f).padStart(2, "0")}</span>`).join("")}</div><h3>${b.name}</h3><p>${b.subtitle}</p></div>`).join("")}</div></section></main>${footer()}</div>`;
}
function showGame() {
  if (!activeRun()) {
    renderHome();
    return;
  }
  view = "game";
  renderer?.destroy();
  inspectedId = null;
  endShown = false;
  app.innerHTML = `<div class="shell game-shell">${header()}${saveWarning ? `<p class="notice">${esc(saveWarning)}</p>` : ""}<main class="expedition"><div class="expedition-heading"><div><span id="region-name"></span><h1 id="floor-title"></h1></div><div class="depth-badge"><span>PLANTA</span><strong id="depth-number"></strong><span>/ 12</span></div></div><div class="game-layout"><section class="dungeon-section" aria-label="Mapa de la expedición"><div class="player-resources" id="resources"></div><div class="map-frame"><canvas id="dungeon" tabindex="0" role="img" aria-label="Mazmorra por casillas. Usa las flechas o los controles de movimiento para explorar. Pulsa H para consultar la ayuda."></canvas><div class="map-caption"><span id="map-caption"></span><span id="turn-counter"></span></div><div class="map-tooltip" id="map-tooltip" hidden></div></div><div class="action-bar" id="action-bar"></div><div class="touch-navigation" aria-label="Controles de movimiento"><div class="dpad"><button data-move="0,-1" class="dpad-up" aria-label="Mover arriba">${icon("arrow")}</button><button data-move="-1,0" class="dpad-left" aria-label="Mover izquierda">${icon("arrow")}</button><button data-action="wait" class="dpad-center" aria-label="Esperar un turno">·</button><button data-move="1,0" class="dpad-right" aria-label="Mover derecha">${icon("arrow")}</button><button data-move="0,1" class="dpad-down" aria-label="Mover abajo">${icon("arrow")}</button></div><p>Toca una casilla contigua para moverte.<br>Acércate a un enemigo para atacarlo.</p></div><p class="keyboard-hint"><kbd>WASD</kbd> / <kbd>↑↓←→</kbd> mover y atacar <span>·</span> Los enemigos solo actúan cuando tú actúas.</p></section>
    <aside class="expedition-journal"><section class="objective-block"><div class="journal-heading">${icon("lantern")}<h2>El descenso</h2></div><p id="objective"></p><p class="floor-lore" id="floor-lore"></p><canvas id="minimap" aria-label="Minimapa de las zonas exploradas"></canvas><p class="mini-legend"><span class="legend-player"></span> Tú <span class="legend-exit"></span> Descenso</p></section><section id="enemy-inspector" class="enemy-inspector"></section><section class="relic-block"><div class="journal-heading">${icon("spark")}<h2>Reliquias</h2><span id="relic-count"></span></div><div id="run-relics"></div></section><section class="log-block"><div class="journal-heading">${icon("book")}<h2>Diario</h2></div><ol id="combat-log" aria-live="polite" aria-relevant="additions text"></ol></section></aside></div></main>${footer()}</div>`;
  renderer = new DungeonRenderer($("#dungeon"), $("#minimap"));
  const canvas = $("#dungeon");
  canvas.addEventListener("pointermove", inspectMap);
  canvas.addEventListener("pointerleave", () => {
    renderer.hover = null;
    $("#map-tooltip").hidden = true;
    renderer.draw(profile.run);
  });
  canvas.addEventListener("click", (event) => {
    const t = renderer.tileAt(event),
      r = profile.run;
    if (Math.abs(t.x - r.player.x) + Math.abs(t.y - r.player.y) === 1)
      perform({ type: "move", dx: t.x - r.player.x, dy: t.y - r.player.y });
    else {
      const enemy = r.enemies.find(
        (e) =>
          e.x === t.x &&
          e.y === t.y &&
          visibleTiles(r).has(e.y * r.map.width + e.x),
      );
      if (enemy) {
        inspectedId = enemy.id;
        updateInspector();
      }
    }
  });
  updateGame();
}
function updateGame() {
  const r = profile.run;
  if (!r || view !== "game") return;
  const p = r.player,
    s = getStats(r),
    info = floorInfo(r.floor),
    c = CLASS_BY_ID[p.classId];
  $("#region-name").textContent = info.biome.name;
  $("#floor-title").textContent = info.name;
  $("#depth-number").textContent = String(r.floor).padStart(2, "0");
  $("#resources").innerHTML =
    `<div class="player-identity">${portrait(CLASSES.indexOf(c))}<span><strong>${c.name}</strong><small>Nivel ${p.level} · ${icon("sword")}${s.attack} ${icon("shield")}${s.armor}</small></span></div><div class="resource-meter health"><div><span>Vida</span><strong>${p.hp}<small> / ${s.maxHp}</small></strong></div><div class="meter-track" role="meter" aria-label="Vida" aria-valuemin="0" aria-valuemax="${s.maxHp}" aria-valuenow="${p.hp}"><span style="width:${(p.hp / s.maxHp) * 100}%"></span></div></div><div class="resource-meter energy"><div><span>Energía</span><strong>${p.energy}<small> / ${s.maxEnergy}</small></strong></div><div class="energy-pips" aria-label="${p.energy} de ${s.maxEnergy} de energía">${Array.from({ length: s.maxEnergy }, (_, i) => `<span class="${i < p.energy ? "filled" : ""}"></span>`).join("")}</div></div><span class="run-gold" title="Oro de esta expedición">${icon("coin")}${p.gold}</span>`;
  $("#turn-counter").textContent = `TURNO ${String(r.turn).padStart(3, "0")}`;
  const threats = getThreats(r),
    vis = visibleTiles(r),
    inDanger = threats.some((t) => t.x === p.x && t.y === p.y),
    nearObject = r.objects.find(
      (o) =>
        !o.used &&
        ["chest", "fountain", "shrine"].includes(o.type) &&
        Math.abs(o.x - p.x) + Math.abs(o.y - p.y) <= 1,
    ),
    atExit = Math.abs(r.map.exit.x - p.x) + Math.abs(r.map.exit.y - p.y) <= 1;
  $("#map-caption").innerHTML = inDanger
    ? '<span class="danger-text">Ataque inminente: sal de la casilla marcada</span>'
    : p.statuses.includes("guard")
      ? "Guardia preparada · daño reducido"
      : nearObject
        ? `Pulsa E para ${nearObject.type === "chest" ? "abrir el cofre" : nearObject.type === "fountain" ? "beber de la fuente" : `activar el santuario (${20 + r.floor * 3} oro)`}`
        : atExit
          ? "Pulsa E para descender"
          : "Explora la oscuridad. Encuentra el descenso.";
  const playing = r.phase === "playing";
  $("#action-bar").innerHTML = [
    [
      "skill",
      c.skill.name,
      "Q",
      `${s.skillCost} energía`,
      p.energy < s.skillCost,
      "spark",
    ],
    ["dash", "Esquivar", "Espacio", "2 energía", p.energy < 2, "boot"],
    ["guard", "Guardia", "F", "Resiste un golpe", false, "shield"],
    [
      "potion",
      "Poción",
      "R",
      `${p.potions} disponibles`,
      p.potions < 1 || p.hp >= s.maxHp,
      "potion",
    ],
    [
      "interact",
      atExit ? "Descender" : "Interactuar",
      "E",
      nearObject ? "Objeto cercano" : "Cofres y santuarios",
      !nearObject && !atExit,
      "lantern",
    ],
    ["wait", "Esperar", "X", "Recupera energía", false, "eye"],
  ]
    .map(
      ([id, label, key, note, disabled, ico]) =>
        `<button data-action="${id}" class="action-button ${id === "skill" ? "skill-action" : ""}" ${!playing || disabled ? "disabled" : ""} title="${esc(id === "skill" ? c.skill.description : note)}">${icon(ico)}<span><strong>${label}</strong><small>${note}</small></span><kbd>${key}</kbd></button>`,
    )
    .join("");
  const boss = r.enemies.find((e) => e.boss && e.hp > 0);
  $("#objective").textContent = info.isBoss
    ? boss
      ? `Derrota a ${ENEMIES[boss.type]?.name || "el guardián"} para romper el sello del descenso.`
      : r.floor === 12
        ? "El guardián ha caído. Recupera el amuleto en el altar del descenso."
        : "El sello está roto. Encuentra el descenso."
    : "Busca cofres y reliquias. Encuentra las escaleras para seguir descendiendo.";
  $("#floor-lore").textContent = info.story;
  $("#relic-count").textContent = r.relics.length;
  $("#run-relics").innerHTML = r.relics.length
    ? r.relics
        .map((id) => {
          const item = RELICS.find((a) => a.id === id);
          return `<button class="relic-token" data-relic="${id}" title="${esc(item.description)}">${icon("spark")}${item.name}</button>`;
        })
        .join("")
    : '<p class="empty-copy">Las reliquias se eligen al descender. Sus efectos se acumulan.</p>';
  $("#combat-log").innerHTML = r.log
    .slice(-5)
    .reverse()
    .map(
      (line, i) => `<li class="${i === 0 ? "latest" : ""}">${esc(line)}</li>`,
    )
    .join("");
  updateInspector();
  renderer.draw(r);
  const latest = r.log.at(-1);
  $("#announcer").textContent = latest || "";
  if (r.phase === "reward" && !modal.open) showRewards();
  if (["dead", "won"].includes(r.phase) && !endShown) {
    endShown = true;
    showEnd();
  }
}
function updateInspector() {
  const r = profile.run;
  if (!r || !$("#enemy-inspector")) return;
  const vis = visibleTiles(r),
    seen = r.enemies.filter(
      (e) => e.hp > 0 && vis.has(e.y * r.map.width + e.x),
    );
  const enemy =
    seen.find((e) => e.id === inspectedId) ||
    seen.filter((e) => e.intent).at(0) ||
    seen
      .sort(
        (a, b) =>
          Math.abs(a.x - r.player.x) +
          Math.abs(a.y - r.player.y) -
          (Math.abs(b.x - r.player.x) + Math.abs(b.y - r.player.y)),
      )
      .at(0);
  if (!enemy) {
    $("#enemy-inspector").innerHTML =
      '<div class="journal-heading">' +
      icon("eye") +
      '<h2>A tu alrededor</h2></div><p class="empty-copy">Ningún enemigo a la vista. Aprovecha para explorar.</p>';
    return;
  }
  const d = ENEMIES[enemy.type],
    intent = enemy.intent;
  $("#enemy-inspector").innerHTML =
    `<div class="enemy-heading">${portrait(enemySprite(enemy.type))}<div><span>${enemy.boss ? "GUARDIÁN" : "ENEMIGO A LA VISTA"}</span><h2>${d.name}</h2></div></div><div class="enemy-health"><span style="width:${(enemy.hp / enemy.maxHp) * 100}%"></span></div><div class="enemy-numbers"><span>${enemy.hp} / ${enemy.maxHp} vida</span><span>${icon("sword")}${enemy.attack}</span></div><p class="enemy-intent ${intent ? "danger-text" : ""}">${intent ? `Ataque preparado: ${intent.kind === "shot" ? "disparo" : intent.kind === "charge" ? "embestida" : intent.kind === "cross" ? "cruz de oscuridad" : "golpe de área"}. Se resuelve en tu próximo turno.` : d.intention}</p><p class="enemy-flavor">${d.description}</p>`;
}
function inspectMap(event) {
  if (!renderer || !profile.run) return;
  const t = renderer.tileAt(event);
  if (renderer.hover?.x === t.x && renderer.hover?.y === t.y) return;
  renderer.hover = t;
  const r = profile.run,
    vis = visibleTiles(r),
    tooltip = $("#map-tooltip");
  tooltip.hidden = true;
  if (vis.has(t.y * r.map.width + t.x)) {
    const e = r.enemies.find((e) => e.hp > 0 && e.x === t.x && e.y === t.y);
    if (e) {
      inspectedId = e.id;
      updateInspector();
    }
    const obj = r.objects.find((o) => !o.used && o.x === t.x && o.y === t.y);
    if (obj) {
      tooltip.textContent = {
        chest: "Cofre · E para abrir",
        fountain: "Fuente · recupera vida con E",
        shrine: `Santuario · bendición por ${20 + r.floor * 3} oro`,
        trap: "Trampa · evita esta casilla",
        gold: "Oro · recógelo al caminar",
        potion: "Poción · recógela al caminar",
      }[obj.type];
      tooltip.hidden = false;
    }
  }
  renderer.draw(r);
}
function perform(action) {
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
  if (
    !consumed &&
    r.log.length === beforeLog &&
    p.energy === beforeEnergy &&
    r.floor === beforeFloor
  ) {
    $("#announcer").textContent = "No puedes realizar esa acción desde aquí.";
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
    `<div class="end-result">${icon(won ? "spark" : "lantern")}<p class="end-title-note">${won ? "EL AMULETO VUELVE A LA LUZ" : "TU ECO PERMANECE"}</p><h2 id="modal-title">${won ? "El abismo recuerda<br>tu victoria." : "La luz se apaga.<br>Tu legado sigue."}</h2><p>${won ? "Has recuperado el Amuleto de Yala. Los cuatro dominios conocen tu nombre." : "Cada descenso deja algo atrás. Usa tus fragmentos en el refugio y vuelve con más fuerza."}</p><div class="result-stats"><span><strong>${r.floor}<small>/12</small></strong>Planta alcanzada</span><span><strong>${r.kills}</strong>Enemigos vencidos</span><span><strong>${r.shards}</strong>Fragmentos ganados</span></div><button class="button primary" data-action="return">Volver al refugio ${icon("arrow")}</button></div>`,
  );
}
function showHelp() {
  openModal(
    `<h2 id="modal-title">Cada paso cuenta.</h2><p class="modal-lead">El tiempo solo avanza cuando actúas. Observa, decide y sobrevive.</p><div class="help-grid"><section><h3>Explora</h3><p><kbd>WASD</kbd> o <kbd>↑↓←→</kbd> para moverte. Camina hacia un enemigo para atacarlo. También puedes tocar una casilla contigua o usar la cruceta.</p><p><kbd>E</kbd> abre cofres, activa santuarios y desciende. Los objetos deben estar a tu lado. Las escaleras son doradas en el minimapa.</p></section><section><h3>Combate</h3><p><kbd>Q</kbd> usa tu habilidad de clase. <kbd>Espacio</kbd> esquiva hacia donde miras y cuesta 2 de energía. <kbd>F</kbd> prepara la guardia y recupera energía.</p><p>Las casillas rojas anuncian dónde golpeará el enemigo en el siguiente turno. Muévete fuera o esquiva. Un golpe normal recupera energía.</p></section><section><h3>Sobrevive</h3><p><kbd>R</kbd> bebe una poción. <kbd>X</kbd> espera y recupera energía. Las fuentes curan una vez; los santuarios venden una bendición por 20 + 3 × planta de oro.</p><p>El oro solo dura esta expedición. Los fragmentos se conservan para las mejoras del refugio.</p></section><section><h3>Deja un legado</h3><p>Elige una reliquia antes de cada nueva planta. Derrota a los guardianes de las plantas 3, 6, 9 y 12. El primero y el segundo desbloquean nuevas clases.</p><p>Guardado automático tras cada acción. <kbd>Esc</kbd> vuelve al refugio sin perder la partida. Exporta una copia desde la crónica para cambiar de navegador.</p></section></div><button class="button primary" data-action="close">Entendido ${icon("arrow")}</button>`,
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
      `<h2 id="modal-title">Importar este legado</h2><p class="modal-lead">Esta copia contiene ${imported.meta.runs} expediciones, ${imported.meta.shards} fragmentos y un mejor descenso de ${imported.meta.bestFloor}/12.</p><p>Reemplazará el progreso de este navegador. Exporta primero tu progreso actual si quieres conservarlo.</p><div class="modal-buttons"><button class="button primary" data-action="confirm-import">Reemplazar e importar</button><button class="text-button" data-action="close">Cancelar</button></div>`,
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
      persist();
      renderHome();
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
  if (event.repeat) return;
  if (profile.run?.phase === "reward") {
    showRewards();
    return;
  }
  if (moves[k]) perform({ type: "move", dx: moves[k][0], dy: moves[k][1] });
  else perform({ type: command });
});
window.addEventListener("pagehide", persist);
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
