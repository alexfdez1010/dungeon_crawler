import { floorInfo, ENEMIES } from "./content.js?v=3.1.0";
import { visibleTiles, getThreats } from "./engine.js?v=3.1.0";
import { layoutViewport, pointerToTile } from "./viewport.js?v=3.1.0";

const ATLAS = new Image();
ATLAS.src = new URL(
  "../resources/art/yala-character-atlas.png",
  import.meta.url,
).href;
const EXPANSION_ATLAS = new Image();
EXPANSION_ATLAS.src = new URL("../resources/art/yala-depths-atlas.png", import.meta.url).href;
const EXPANSION_SPRITES = ["luminary", "furnace_thrall", "brass_marksman", "crucible_knight", "forge_matriarch", "astral_husk", "star_scribe", "comet_guard", "yala_prime"];
export const classSprite = (id) => id === "luminary" ? 8 : Math.max(0, ["warden", "ranger", "arcanist"].indexOf(id));
export const spriteStyle = (index) => {
  if (index >= 8) {
    const cell = index - 8;
    return `--sprite-atlas:url('resources/art/yala-depths-atlas.png');--sprite-size:300% 300%;--sprite-x:${(cell % 3) * 50}%;--sprite-y:${Math.floor(cell / 3) * 50}%`;
  }
  return `--sprite-x:${((index % 4) * 100) / 3}%;--sprite-y:${Math.floor(index / 4) * 100}%`;
};
export function enemySprite(type) {
  const expansion = EXPANSION_SPRITES.indexOf(type);
  if (expansion >= 0) return 8 + expansion;
  if (type === "ettin" || type === "briar_queen") return 7;
  if (/guard|brute|sentinel|warden/.test(type)) return 6;
  if (/thorn|spore/.test(type)) return 4;
  if (/mage|caster|oracle|drowned/.test(type)) return 5;
  return 3;
}
const hash = (x, y) =>
  ((x * 374761393 + y * 668265263) ^ (x * y * 1274126177)) >>> 0;
export class DungeonRenderer {
  constructor(canvas, minimap) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.minimap = minimap;
    this.tile = 32;
    this.zoom = null;
    this.insets = {};
    this.path = [];
    this.origin = { x: 0, y: 0 };
    this.hover = null;
    this.animations = [];
    this.actionSnapshot = null;
    this.feedbackTimer = null;
    this.run = null;
    this.motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
    this.reduced = this.motionQuery.matches;
    this.onMotionChange = () => {
      this.reduced = this.motionQuery.matches;
      if (this.run && this.canvas.isConnected) this.draw(this.run);
    };
    this.motionQuery.addEventListener("change", this.onMotionChange);
    this.frame = null;
    this.onVisible = () => {
      if (document.hidden) {
        cancelAnimationFrame(this.frame);
        clearTimeout(this.feedbackTimer);
        this.frame = null;
        this.animations = [];
      } else if (this.run && this.canvas.isConnected) this.draw(this.run);
    };
    document.addEventListener("visibilitychange", this.onVisible);
    this.onAtlasLoad = () => {
      if (this.run && this.canvas.isConnected) this.draw(this.run);
    };
    ATLAS.addEventListener("load", this.onAtlasLoad);
    EXPANSION_ATLAS.addEventListener("load", this.onAtlasLoad);
    this.onResize = () => {
      if (this.destroyed) return;
      this.resize();
      if (this.run && this.canvas.isConnected) this.draw(this.run);
    };
    this.observer = new ResizeObserver(this.onResize);
    this.observer.observe(canvas);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("orientationchange", this.onResize);
    document.addEventListener("fullscreenchange", this.onResize);
    window.visualViewport?.addEventListener("resize", this.onResize);
    this.watchDpr();
    this.resize();
  }
  get tileSize() {
    return this.viewport.tileSize;
  }
  get visibleBounds() {
    return this.viewport.bounds;
  }
  watchDpr() {
    this.dprQuery?.removeEventListener("change", this.onDprChange);
    this.dprQuery = matchMedia(
      `(resolution: ${window.devicePixelRatio || 1}dppx)`,
    );
    this.onDprChange = () => {
      this.watchDpr();
      this.onResize();
    };
    this.dprQuery.addEventListener("change", this.onDprChange);
  }
  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    const styles = getComputedStyle(this.canvas);
    const cssInsets = {};
    for (const edge of ["top", "bottom", "left", "right"]) {
      const raw = styles.getPropertyValue(`--hud-${edge}-clearance`).trim();
      const value = Number.parseFloat(raw);
      if (Number.isFinite(value)) cssInsets[edge] = value;
    }
    this.viewport = layoutViewport({
      width: bounds.width,
      height: bounds.height,
      dpr: window.devicePixelRatio || 1,
      tileSize: this.zoom,
      player: this.run?.player,
      insets: { ...cssInsets, ...this.insets },
    });
    this.origin = this.viewport.origin;
    this.columns = this.viewport.bounds.right - this.viewport.bounds.left;
    this.rows = this.viewport.bounds.bottom - this.viewport.bounds.top;
    if (this.canvas.width !== this.viewport.pixelWidth)
      this.canvas.width = this.viewport.pixelWidth;
    if (this.canvas.height !== this.viewport.pixelHeight)
      this.canvas.height = this.viewport.pixelHeight;
  }
  setInsets(insets = {}) {
    this.insets = { ...insets };
    this.onResize();
  }
  setZoom(delta) {
    this.zoom = Math.max(28, Math.min(72, this.tileSize + delta));
    this.onResize();
    return this.tileSize;
  }
  resetZoom() {
    this.zoom = null;
    this.onResize();
    return this.tileSize;
  }
  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    clearTimeout(this.feedbackTimer);
    this.motionQuery.removeEventListener("change", this.onMotionChange);
    this.animations = [];
    this.actionSnapshot = null;
    this.observer.disconnect();
    this.dprQuery?.removeEventListener("change", this.onDprChange);
    document.removeEventListener("visibilitychange", this.onVisible);
    document.removeEventListener("fullscreenchange", this.onResize);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("orientationchange", this.onResize);
    window.visualViewport?.removeEventListener("resize", this.onResize);
    ATLAS.removeEventListener("load", this.onAtlasLoad);
    EXPANSION_ATLAS.removeEventListener("load", this.onAtlasLoad);
    this.run = null;
  }
  tileAt(event) {
    return pointerToTile(
      event,
      this.canvas.getBoundingClientRect(),
      this.viewport,
    );
  }
  effect(x, y, text, color = "#dbb66b") {
    this.addFeedback({ kind: "text", x, y, text, color, duration: 800 });
  }
  addFeedback(feedback) {
    if (this.destroyed || document.hidden) return;
    this.animations.push({ ...feedback, start: performance.now() });
    // Long input bursts never accumulate an unbounded particle or text queue.
    if (this.animations.length > 64) this.animations.splice(0, this.animations.length - 64);
  }
  captureAction(run) {
    this.actionSnapshot = {
      seed: run.seed,
      floor: run.floor,
      hp: run.player.hp,
      energy: run.player.energy,
      level: run.player.level,
      player: { x: run.player.x, y: run.player.y },
      visible: visibleTiles(run),
      enemies: new Map(run.enemies.map((enemy) => [enemy.id, {
        hp: enemy.hp, x: enemy.x, y: enemy.y,
      }])),
    };
  }
  resolveAction(run, action, consumed) {
    const before = this.actionSnapshot;
    this.actionSnapshot = null;
    if (!before || !consumed) return;
    if (before.seed !== run.seed || before.floor !== run.floor) {
      this.animations = [];
      return;
    }
    const visible = visibleTiles(run), player = run.player;
    for (const enemy of run.enemies) {
      const previous = before.enemies.get(enemy.id);
      if (!previous || enemy.hp >= previous.hp) continue;
      if (!visible.has(enemy.y * run.map.width + enemy.x) &&
          !before.visible.has(previous.y * run.map.width + previous.x)) continue;
      this.effect(enemy.x, enemy.y, `−${previous.hp - enemy.hp}`, "#f0d7a2");
      this.addFeedback({
        kind: enemy.hp === 0 ? "defeat" : "impact", id: enemy.id,
        x: enemy.x, y: enemy.y, color: enemy.boss ? "#e8c67f" : "#dca66e",
        duration: enemy.hp === 0 ? 600 : 260,
        dx: Math.sign(enemy.x - before.player.x),
        dy: Math.sign(enemy.y - before.player.y),
      });
    }
    const hpDelta = player.hp - before.hp;
    if (hpDelta !== 0) {
      this.effect(player.x, player.y, `${hpDelta > 0 ? "+" : "−"}${Math.abs(hpDelta)}`, hpDelta > 0 ? "#a7dbc0" : "#ffb29c");
      if (hpDelta < 0) this.addFeedback({
        kind: "impact", id: "player", x: player.x, y: player.y,
        color: "#e78976", duration: 260, dx: 0, dy: 0,
      });
    }
    if (player.level > before.level) {
      this.addFeedback({ kind: "text", x: player.x, y: player.y, text: `Nivel ${player.level}`,
        color: "#f0d7a2", duration: 1100, lift: 18 });
    }
    if (action.type === "skill") {
      const colors = { warden: "#e1bd76", ranger: "#a3d7b5", arcanist: "#cbb4e7", luminary: "#f0d99c" };
      this.addFeedback({ kind: "skill", x: player.x, y: player.y,
        color: colors[player.classId] || "#e1bd76", duration: 430 });
    } else if (action.type === "dash") {
      this.addFeedback({ kind: "dash", x: before.player.x, y: before.player.y,
        toX: player.x, toY: player.y, color: "#a8cdb9", duration: 300 });
    } else if ((action.type === "wait" || action.type === "guard") && player.energy > before.energy && hpDelta === 0) {
      this.addFeedback({ kind: "text", x: player.x, y: player.y,
        text: `+${player.energy - before.energy} energía`,
        color: "#a7dbc0", duration: 650 });
    }
  }
  spriteImpulse(id, now) {
    if (this.reduced) return { x: 0, y: 0 };
    const hit = this.animations.findLast((feedback) => feedback.kind === "impact" && feedback.id === id);
    if (!hit) return { x: 0, y: 0 };
    const progress = Math.min(1, (now - hit.start) / hit.duration);
    const impulse = Math.sin(progress * Math.PI) * 3;
    return { x: hit.dx * impulse, y: hit.dy * impulse };
  }
  drawWorldFeedback(now) {
    const c = this.ctx, t = this.tile, o = this.origin;
    c.save();
    for (const feedback of this.animations) {
      if (feedback.kind === "text") continue;
      const progress = Math.min(1, (now - feedback.start) / feedback.duration);
      const motion = this.reduced ? 0.4 : progress;
      const x = (feedback.x - o.x + 0.5) * t, y = (feedback.y - o.y + 0.5) * t;
      c.globalAlpha = this.reduced ? 0.7 : 1 - progress;
      c.strokeStyle = feedback.color;
      c.fillStyle = feedback.color;
      c.lineWidth = 1.5;
      if (feedback.kind === "dash") {
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo((feedback.toX - o.x + 0.5) * t, (feedback.toY - o.y + 0.5) * t);
        c.stroke();
      } else if (feedback.kind === "skill") {
        c.beginPath();
        c.ellipse(x, y + 7, t * (0.3 + motion * 1.8), t * (0.12 + motion * 0.7), 0, 0, Math.PI * 2);
        c.stroke();
      } else if (feedback.kind === "defeat") {
        // Six deterministic embers: presentation never consumes the run's RNG.
        for (let particle = 0; particle < 6; particle++) {
          const angle = particle * Math.PI / 3;
          const radius = 4 + motion * 19;
          const size = 2.5 - motion;
          c.fillRect(x + Math.cos(angle) * radius - size / 2,
            y + Math.sin(angle) * radius * 0.6 - motion * 8, size, size);
        }
      } else {
        c.beginPath();
        c.ellipse(x, y + 7, 11 + motion * 8, 5 + motion * 3, 0, 0, Math.PI * 2);
        c.stroke();
      }
    }
    c.restore();
  }
  drawFloatingFeedback(now) {
    const c = this.ctx, t = this.tile, o = this.origin;
    c.save();
    c.textAlign = "center";
    c.textBaseline = "bottom";
    c.font = "600 14px system-ui, sans-serif";
    c.lineJoin = "round";
    c.lineWidth = 3;
    c.strokeStyle = "#101412";
    for (const feedback of this.animations) {
      if (feedback.kind !== "text") continue;
      const progress = Math.min(1, (now - feedback.start) / feedback.duration);
      const x = (feedback.x - o.x + 0.5) * t;
      const y = (feedback.y - o.y) * t - 5 - (feedback.lift || 0) - (this.reduced ? 0 : progress * 18);
      c.globalAlpha = this.reduced ? 1 : Math.min(1, (1 - progress) * 3);
      c.fillStyle = feedback.color;
      c.strokeText(feedback.text, x, y);
      c.fillText(feedback.text, x, y);
    }
    c.restore();
  }
  draw(run) {
    if (this.destroyed) return;
    this.run = run;
    const now = performance.now();
    this.animations = this.animations.filter((feedback) => now - feedback.start < feedback.duration);
    this.resize();
    cancelAnimationFrame(this.frame);
    this.frame = null;
    const { ctx: c, tile: t } = this,
      m = run.map,
      p = run.player,
      theme = floorInfo(run.floor);
    const scale = this.tileSize / t;
    c.setTransform(
      (this.canvas.width / this.viewport.width) * scale,
      0,
      0,
      (this.canvas.height / this.viewport.height) * scale,
      0,
      0,
    );
    c.imageSmoothingEnabled = false;
    const logicalWidth = this.viewport.width / scale;
    const logicalHeight = this.viewport.height / scale;
    const vis = visibleTiles(run),
      o = this.origin;
    c.fillStyle = "#080c0b";
    c.fillRect(0, 0, logicalWidth, logicalHeight);
    const bounds = this.viewport.bounds;
    for (let y = bounds.top; y < bounds.bottom; y++)
      for (let x = bounds.left; x < bounds.right; x++) {
        const sx = x - o.x,
          sy = y - o.y,
          i = y * m.width + x,
          n = hash(x, y),
          v = vis.has(i),
          seen = m.explored[i];
        if (x < 0 || y < 0 || x >= m.width || y >= m.height || (!seen && !v)) {
          if (n % 6 === 0) {
            c.fillStyle = "#101713";
            c.fillRect(sx * t + 12, sy * t + 14, 2, 2);
          }
          continue;
        }
        c.save();
        c.globalAlpha = v ? 1 : 0.27;
        if (m.tiles[i] === 0) {
          c.fillStyle = theme.wallColor;
          c.fillRect(sx * t, sy * t, t, t);
          c.fillStyle = "#111916";
          c.fillRect(sx * t, sy * t + t - 7, t, 7);
          c.fillStyle = "#ffffff12";
          c.fillRect(sx * t + 1, sy * t + 1, t - 2, 2);
          c.fillStyle = "#00000035";
          c.fillRect(sx * t + (((y % 2) * 12 + 8) % 28), sy * t + 4, 1, t - 12);
        } else {
          c.fillStyle = theme.floorColor;
          c.fillRect(sx * t, sy * t, t, t);
          c.fillStyle = n % 3 === 0 ? "#ffffff06" : "#00000012";
          c.fillRect(sx * t + 1, sy * t + 1, t - 2, t - 2);
          c.strokeStyle = "#00000020";
          c.strokeRect(sx * t + 0.5, sy * t + 0.5, t - 1, t - 1);
          if (n % 8 === 0) {
            c.fillStyle = "#a9ac8f18";
            c.fillRect(sx * t + 7, sy * t + 19, 9, 1);
            c.fillRect(sx * t + 16, sy * t + 15, 1, 5);
          }
          if (theme.biomeId === "furnace" && n % 9 === 0) {
            c.fillStyle = "#e29a4b88";
            c.fillRect(sx * t + 5, sy * t + 9, 12, 2);
            c.fillRect(sx * t + 16, sy * t + 11, 2, 8);
          }
          if (theme.biomeId === "astral" && n % 7 === 0) {
            c.fillStyle = "#e8d59caa";
            c.fillRect(sx * t + 14, sy * t + 10, 2, 8);
            c.fillRect(sx * t + 11, sy * t + 13, 8, 2);
          }
          if (n % 19 === 0) {
            c.fillStyle = theme.color + "40";
            c.fillRect(sx * t + 3, sy * t + 3, 3, 3);
          }
        }
        c.restore();
      }
    // Warm lantern illumination stays anchored to the player, never to a UI panel.
    const px = (p.x - o.x + 0.5) * t,
      py = (p.y - o.y + 0.5) * t;
    const light = c.createRadialGradient(px, py, 8, px, py, t * 5.8);
    light.addColorStop(0, "#e9b45a12");
    light.addColorStop(1, "#e9b45a00");
    c.fillStyle = light;
    c.fillRect(0, 0, logicalWidth, logicalHeight);
    const exit = m.exit,
      ei = exit.y * m.width + exit.x;
    if (m.explored[ei] || vis.has(ei))
      this.drawObject("exit", exit.x, exit.y, vis.has(ei) ? 1 : 0.3);
    for (const obj of run.objects) {
      const i = obj.y * m.width + obj.x;
      if (!obj.used && (vis.has(i) || m.explored[i]))
        this.drawObject(obj.type, obj.x, obj.y, vis.has(i) ? 1 : 0.25);
    }
    for (const target of getThreats(run)) {
      const i = target.y * m.width + target.x;
      if (!vis.has(i)) continue;
      const x = (target.x - o.x) * t,
        y = (target.y - o.y) * t;
      c.fillStyle = "#df72584c";
      c.fillRect(x + 1, y + 1, t - 2, t - 2);
      c.strokeStyle = "#e78976";
      c.strokeRect(x + 2.5, y + 2.5, t - 5, t - 5);
      c.beginPath();
      c.moveTo(x + 5, y + t - 5);
      c.lineTo(x + t - 5, y + 5);
      c.stroke();
    }
    this.drawPath(m, vis);
    this.drawWorldFeedback(now);
    for (const e of run.enemies) {
      if (e.hp <= 0 || !vis.has(e.y * m.width + e.x)) continue;
      const x = (e.x - o.x) * t,
        y = (e.y - o.y) * t;
      if (e.boss) {
        c.save();
        c.strokeStyle = "#dbb66b";
        c.lineWidth = 1.2;
        c.beginPath();
        c.ellipse(x + t / 2, y + t - 4, t * 0.58, t * 0.2, 0, 0, Math.PI * 2);
        c.stroke();
        c.restore();
      }
      const recoil = this.spriteImpulse(e.id, now);
      this.drawSprite(
        enemySprite(e.type),
        x + recoil.x,
        y + recoil.y,
        e.boss ? 1.5 : 1.15,
        ENEMIES[e.type]?.color || "#c77",
      );
      if (e.hp < e.maxHp || e.boss) {
        c.fillStyle = "#070b09";
        c.fillRect(x + 1, y + 1, t - 2, 4);
        c.fillStyle = e.boss ? "#dbb66b" : "#e78976";
        c.fillRect(x + 1, y + 1, (t - 2) * Math.max(0, e.hp / e.maxHp), 3);
      }
      if (e.intent) {
        c.fillStyle = "#e78976";
        c.font = "bold 16px sans-serif";
        c.textAlign = "right";
        c.fillText("!", x + t, y + 12);
      }
    }
    c.strokeStyle = "#dbb66baa";
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(px, py + 11, 13, 5, 0, 0, Math.PI * 2);
    c.stroke();
    this.drawSprite(
      classSprite(p.classId),
      (p.x - o.x) * t,
      (p.y - o.y) * t,
      1.25,
      "#dbb66b",
    );
    const f = p.facing || { x: 0, y: 1 };
    c.fillStyle = "#dbb66b";
    c.beginPath();
    const ax = px + f.x * 19,
      ay = py + f.y * 19;
    c.moveTo(ax + f.x * 4, ay + f.y * 4);
    c.lineTo(ax - f.y * 3, ay + f.x * 3);
    c.lineTo(ax + f.y * 3, ay - f.x * 3);
    c.closePath();
    c.fill();
    if (this.hover) {
      const h = this.hover,
        i = h.y * m.width + h.x;
      if (
        h.x >= 0 &&
        h.y >= 0 &&
        h.x < m.width &&
        h.y < m.height &&
        vis.has(i)
      ) {
        c.strokeStyle = "#eee8cf88";
        c.strokeRect(
          (h.x - o.x) * t + 0.5,
          (h.y - o.y) * t + 0.5,
          t - 1,
          t - 1,
        );
      }
    }
    this.drawDangerHints(run, vis);
    this.drawMini(run, vis);
    this.drawFloatingFeedback(now);
    clearTimeout(this.feedbackTimer);
    if (this.animations.length && !document.hidden) {
      if (this.reduced) {
        // Reduced motion keeps feedback still, then clears it without a frame loop.
        const remaining = Math.min(...this.animations.map((feedback) => feedback.duration - (now - feedback.start)));
        this.feedbackTimer = setTimeout(() => {
          if (!this.destroyed && this.run && this.canvas.isConnected) this.draw(this.run);
        }, Math.max(16, remaining + 1));
      } else this.frame = requestAnimationFrame(() => this.draw(this.run));
    }
  }
  drawPath(map, visible) {
    if (!this.path?.length) return;
    const c = this.ctx,
      t = this.tile,
      o = this.origin;
    c.save();
    c.fillStyle = "#e3c17d";
    for (const point of this.path) {
      if (
        point.x < 0 ||
        point.y < 0 ||
        point.x >= map.width ||
        point.y >= map.height ||
        !visible.has(point.y * map.width + point.x)
      )
        continue;
      c.beginPath();
      c.arc(
        (point.x - o.x + 0.5) * t,
        (point.y - o.y + 0.5) * t,
        2,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
    c.restore();
  }
  drawDangerHints(run, visible) {
    const { safeRect: safe, center, tileSize } = this.viewport;
    const margin = Math.min(
      20,
      (safe.right - safe.left) / 4,
      (safe.bottom - safe.top) / 4,
    );
    const limits = {
      left: safe.left + margin,
      right: safe.right - margin,
      top: safe.top + margin,
      bottom: safe.bottom - margin,
    };
    const groups = new Map();
    for (const enemy of run.enemies) {
      if (enemy.hp <= 0 || !visible.has(enemy.y * run.map.width + enemy.x))
        continue;
      const x = (enemy.x - this.origin.x + 0.5) * tileSize;
      const y = (enemy.y - this.origin.y + 0.5) * tileSize;
      const radius = tileSize * (enemy.boss ? 0.8 : 0.6);
      if (
        x - radius >= safe.left &&
        x + radius <= safe.right &&
        y - radius >= safe.top &&
        y + radius <= safe.bottom
      )
        continue;
      const angle = Math.atan2(y - center.y, x - center.x);
      const key = Math.round(angle / (Math.PI / 4));
      const group = groups.get(key);
      if (group) group.count++;
      else groups.set(key, { angle, count: 1 });
    }
    const c = this.ctx;
    c.save();
    c.setTransform(
      this.canvas.width / this.viewport.width,
      0,
      0,
      this.canvas.height / this.viewport.height,
      0,
      0,
    );
    for (const { angle, count } of groups.values()) {
      const dx = Math.cos(angle),
        dy = Math.sin(angle);
      const distance = Math.min(
        dx > 0
          ? (limits.right - center.x) / dx
          : dx < 0
            ? (limits.left - center.x) / dx
            : Infinity,
        dy > 0
          ? (limits.bottom - center.y) / dy
          : dy < 0
            ? (limits.top - center.y) / dy
            : Infinity,
      );
      const x = center.x + dx * distance,
        y = center.y + dy * distance;
      c.save();
      c.translate(x, y);
      c.rotate(angle);
      c.fillStyle = "#e89a78";
      c.strokeStyle = "#17140f";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(9, 0);
      c.lineTo(-5, -7);
      c.lineTo(-2, 0);
      c.lineTo(-5, 7);
      c.closePath();
      c.stroke();
      c.fill();
      c.restore();
      c.fillStyle = "#17140fee";
      c.beginPath();
      c.arc(x - dx * 19, y - dy * 19, 12, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#ffc49d";
      c.font = "bold 12px sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(count > 1 ? `!${count}` : "!", x - dx * 19, y - dy * 19);
    }
    c.restore();
  }
  drawSprite(index, x, y, scale = 1, color = "#dbb66b") {
    const c = this.ctx,
      t = this.tile,
      size = t * scale;
    c.fillStyle = "#00000060";
    c.beginPath();
    c.ellipse(x + t / 2, y + t - 3, t * 0.35, 4, 0, 0, Math.PI * 2);
    c.fill();
    const expanded = index >= 8;
    const atlas = expanded ? EXPANSION_ATLAS : ATLAS;
    const columns = expanded ? 3 : 4, rows = expanded ? 3 : 2;
    const cell = expanded ? index - 8 : index;
    if (atlas.complete && atlas.naturalWidth) {
      const sw = atlas.width / columns,
        sh = atlas.height / rows;
      c.drawImage(
        atlas,
        (cell % columns) * sw,
        Math.floor(cell / columns) * sh,
        sw,
        sh,
        x + (t - size) / 2,
        y + t - size,
        size,
        size,
      );
    } else {
      c.fillStyle = color;
      c.fillRect(x + 9, y + 7, t - 18, t - 9);
      c.fillStyle = "#f1e8ca";
      c.fillRect(x + 12, y + 10, 3, 3);
    }
  }
  drawObject(type, x, y, alpha = 1) {
    const c = this.ctx,
      t = this.tile,
      xx = (x - this.origin.x) * t,
      yy = (y - this.origin.y) * t;
    c.save();
    c.globalAlpha = alpha;
    if (type === "exit") {
      c.fillStyle = "#141b17";
      c.fillRect(xx + 3, yy + 3, 26, 26);
      for (let i = 0; i < 4; i++) {
        c.fillStyle = i === 3 ? "#dbb66b" : "#8e9780";
        c.fillRect(xx + 7 - i, yy + 6 + i * 5, 18 + i * 2, 3);
      }
      c.strokeStyle = "#dbb66b";
      c.strokeRect(xx + 2.5, yy + 2.5, 27, 27);
    } else if (type === "chest") {
      c.fillStyle = "#805a32";
      c.fillRect(xx + 5, yy + 10, 22, 16);
      c.fillStyle = "#dbb66b";
      c.fillRect(xx + 5, yy + 11, 22, 3);
      c.fillRect(xx + 14, yy + 13, 4, 7);
      c.strokeStyle = "#d0aa6a";
      c.strokeRect(xx + 5.5, yy + 10.5, 21, 15);
    } else if (type === "fountain") {
      c.fillStyle = "#52655e";
      c.fillRect(xx + 5, yy + 19, 22, 7);
      c.fillStyle = "#82c7b0";
      c.fillRect(xx + 9, yy + 18, 14, 4);
      c.fillRect(xx + 14, yy + 9, 4, 10);
      c.fillStyle = "#c6e5d2";
      c.fillRect(xx + 15, yy + 7, 2, 4);
    } else if (type === "shrine") {
      c.fillStyle = "#666855";
      c.fillRect(xx + 7, yy + 23, 18, 4);
      c.fillRect(xx + 11, yy + 13, 10, 10);
      c.fillStyle = "#dbb66b";
      c.beginPath();
      c.moveTo(xx + 16, yy + 4);
      c.lineTo(xx + 22, yy + 12);
      c.lineTo(xx + 16, yy + 17);
      c.lineTo(xx + 10, yy + 12);
      c.closePath();
      c.fill();
    } else if (type === "trap") {
      c.fillStyle = "#ad6a58";
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(xx + 5 + i * 8, yy + 23);
        c.lineTo(xx + 8 + i * 8, yy + 15);
        c.lineTo(xx + 11 + i * 8, yy + 23);
        c.fill();
      }
    } else if (type === "potion") {
      c.fillStyle = "#b66555";
      c.fillRect(xx + 12, yy + 14, 9, 11);
      c.fillStyle = "#cabd9b";
      c.fillRect(xx + 14, yy + 9, 5, 6);
    } else {
      c.fillStyle = "#dbb66b";
      c.beginPath();
      c.arc(xx + 16, yy + 19, 5, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }
  drawMini(run, vis) {
    if (!this.minimap) return;
    const c = this.minimap.getContext("2d"),
      m = run.map,
      s = 3;
    if (this.minimap.width !== m.width * s) this.minimap.width = m.width * s;
    if (this.minimap.height !== m.height * s)
      this.minimap.height = m.height * s;
    c.fillStyle = "#0b100d";
    c.fillRect(0, 0, m.width * s, m.height * s);
    for (let i = 0; i < m.tiles.length; i++)
      if (m.explored[i] || vis.has(i)) {
        c.fillStyle =
          m.tiles[i] === 0 ? "#29352c" : vis.has(i) ? "#7a8972" : "#3e4e40";
        c.fillRect((i % m.width) * s, Math.floor(i / m.width) * s, s, s);
      }
    if (m.explored[m.exit.y * m.width + m.exit.x]) {
      c.fillStyle = "#dbb66b";
      c.fillRect(m.exit.x * s, m.exit.y * s, s, s);
    }
    c.fillStyle = "#f4df9b";
    c.fillRect(run.player.x * s - 1, run.player.y * s - 1, 5, 5);
  }
}
