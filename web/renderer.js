import { floorInfo, ENEMIES } from "./content.js";
import { visibleTiles, getThreats } from "./engine.js";
import { layoutViewport, pointerToTile } from "./viewport.js";

const ATLAS = new Image();
ATLAS.src = new URL(
  "../resources/art/yala-character-atlas.png",
  import.meta.url,
).href;
export const spriteStyle = (index) =>
  `--sprite-x:${((index % 4) * 100) / 3}%;--sprite-y:${Math.floor(index / 4) * 100}%`;
export function enemySprite(type) {
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
    this.run = null;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.frame = null;
    this.onVisible = () => {
      if (document.hidden) {
        cancelAnimationFrame(this.frame);
        this.frame = null;
      } else if (this.run && this.canvas.isConnected) this.draw(this.run);
    };
    document.addEventListener("visibilitychange", this.onVisible);
    this.onAtlasLoad = () => {
      if (this.run && this.canvas.isConnected) this.draw(this.run);
    };
    ATLAS.addEventListener("load", this.onAtlasLoad);
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
    this.observer.disconnect();
    this.dprQuery?.removeEventListener("change", this.onDprChange);
    document.removeEventListener("visibilitychange", this.onVisible);
    document.removeEventListener("fullscreenchange", this.onResize);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("orientationchange", this.onResize);
    window.visualViewport?.removeEventListener("resize", this.onResize);
    ATLAS.removeEventListener("load", this.onAtlasLoad);
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
    this.animations.push({ x, y, text, color, start: performance.now() });
  }
  draw(run) {
    if (this.destroyed) return;
    this.run = run;
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
    for (const e of run.enemies) {
      if (e.hp <= 0 || !vis.has(e.y * m.width + e.x)) continue;
      const x = (e.x - o.x) * t,
        y = (e.y - o.y) * t;
      this.drawSprite(
        enemySprite(e.type),
        x,
        y,
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
      ["warden", "ranger", "arcanist"].indexOf(p.classId),
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
    const now = performance.now();
    this.animations = this.animations.filter((a) => now - a.start < 850);
    for (const a of this.animations) {
      const age = (now - a.start) / 850;
      c.globalAlpha = 1 - age;
      c.font = "bold 17px sans-serif";
      c.textAlign = "center";
      c.fillStyle = a.color;
      c.fillText(a.text, (a.x - o.x + 0.5) * t, (a.y - o.y) * t - age * 25);
      c.globalAlpha = 1;
    }
    if (this.animations.length && !this.reduced && !document.hidden)
      this.frame = requestAnimationFrame(() => this.draw(run));
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
    if (ATLAS.complete && ATLAS.naturalWidth) {
      const sw = ATLAS.width / 4,
        sh = ATLAS.height / 2;
      c.drawImage(
        ATLAS,
        (index % 4) * sw,
        Math.floor(index / 4) * sh,
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
