import test from "node:test";
import assert from "node:assert/strict";
import { layoutViewport, pointerToTile } from "../web/viewport.js";

const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);
const screenCenter = (tile, viewport) => ({
  x: (tile.x + 0.5 - viewport.origin.x) * viewport.tileSize,
  y: (tile.y + 0.5 - viewport.origin.y) * viewport.tileSize,
});

test("desktop canvas derives its tiles and backing pixels from actual bounds", () => {
  const view = layoutViewport({
    width: 1440,
    height: 900,
    dpr: 2,
    player: { x: 24, y: 16 },
  });
  assert.equal(view.tileSize, 46);
  assert.equal(view.pixelWidth, 2880);
  assert.equal(view.pixelHeight, 1800);
  assert.deepEqual(view.safeRect, {
    left: 0,
    top: 110,
    right: 1440,
    bottom: 760,
  });
  const center = screenCenter({ x: 24, y: 16 }, view);
  close(center.x, 720);
  close(center.y, 435);
  assert.ok(view.bounds.left <= view.origin.x);
  assert.ok(view.bounds.right >= view.origin.x + 1440 / 46);
});

test("portrait and short landscape reserve HUD space while centering the hero", () => {
  for (const [width, height, top, bottom] of [
    [390, 844, 150, 260],
    [844, 390, 80, 112],
  ]) {
    const player = { x: 1, y: 1 };
    const view = layoutViewport({ width, height, player });
    assert.equal(view.safeRect.top, top);
    assert.equal(view.safeRect.bottom, height - bottom);
    const center = screenCenter(player, view);
    close(center.x, width / 2);
    close(center.y, (top + height - bottom) / 2);
    assert.ok(
      view.origin.x < 0,
      "camera must not push hero behind HUD near a map edge",
    );
  }
});

test("pointer conversion roundtrips tiles across DPR, resize, zoom and canvas offsets", () => {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
    [844, 390],
    [375, 610],
  ]) {
    for (const dpr of [0.75, 1, 1.25, 2, 3]) {
      for (const tileSize of [28, 40, 46, 72]) {
        const player = { x: 33, y: 27 };
        const view = layoutViewport({ width, height, dpr, tileSize, player });
        const bounds = { left: 13.5, top: 9.25, width, height };
        for (const tile of [player, { x: 30, y: 29 }, { x: 36, y: 25 }]) {
          const center = screenCenter(tile, view);
          assert.deepEqual(
            pointerToTile(
              {
                clientX: bounds.left + center.x,
                clientY: bounds.top + center.y,
              },
              bounds,
              view,
            ),
            tile,
          );
        }
      }
    }
  }
});

test("fractional camera origin maps both sides of tile boundaries correctly", () => {
  const view = layoutViewport({
    width: 1003,
    height: 743,
    tileSize: 46,
    player: { x: 20, y: 20 },
  });
  const bounds = { left: 8, top: 11, width: 1003, height: 743 };
  const x = (20 - view.origin.x) * 46 + bounds.left;
  const y = (20.5 - view.origin.y) * 46 + bounds.top;
  assert.deepEqual(
    pointerToTile({ clientX: x - 0.001, clientY: y }, bounds, view),
    { x: 19, y: 20 },
  );
  assert.deepEqual(
    pointerToTile({ clientX: x + 0.001, clientY: y }, bounds, view),
    { x: 20, y: 20 },
  );
});

test("explicit HUD insets shift camera and survive a viewport resize", () => {
  const player = { x: 0, y: 0 };
  for (const width of [640, 1200]) {
    const view = layoutViewport({
      width,
      height: 800,
      player,
      insets: { top: 180, bottom: 100, left: 180, right: 40 },
    });
    const center = screenCenter(player, view);
    close(center.x, (180 + width - 40) / 2);
    close(center.y, 440);
  }
});

test("short viewports constrain oversized clearances and zoom is bounded", () => {
  const view = layoutViewport({
    width: 200,
    height: 200,
    tileSize: 500,
    insets: { top: 400, bottom: 400, left: 400, right: 400 },
  });
  assert.equal(view.tileSize, 72);
  close(view.safeRect.right - view.safeRect.left, 144);
  close(view.safeRect.bottom - view.safeRect.top, 144);
  assert.equal(
    layoutViewport({ width: 800, height: 600, tileSize: 5 }).tileSize,
    28,
  );
});

test("DPR changes affect backing resolution without moving world coordinates", () => {
  const options = { width: 899.5, height: 700.25, player: { x: 12, y: 17 } };
  const standard = layoutViewport({ ...options, dpr: 1 });
  const retina = layoutViewport({ ...options, dpr: 2 });
  assert.deepEqual(standard.origin, retina.origin);
  assert.deepEqual(standard.bounds, retina.bounds);
  assert.equal(retina.pixelWidth, 1799);
  assert.equal(retina.pixelHeight, 1401);
});
