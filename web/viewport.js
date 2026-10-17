/** Canvas geometry in CSS pixels. World coordinates are measured in tiles. */
export function layoutViewport({
  width,
  height,
  dpr = 1,
  tileSize,
  player = { x: 0, y: 0 },
  insets = {},
}) {
  width = Math.max(1, Number(width) || 1);
  height = Math.max(1, Number(height) || 1);
  dpr = Math.max(0.1, Number(dpr) || 1);
  const compact = width <= 640;
  tileSize = Math.max(
    28,
    Math.min(72, Number(tileSize) || (compact ? 40 : 46)),
  );
  const shortLandscape = width > height && height < 600;
  const defaults = shortLandscape
    ? { top: 80, bottom: 112 }
    : compact && height > width
      ? { top: 150, bottom: 260 }
      : { top: 110, bottom: 140 };
  const clean = (value, fallback = 0) =>
    Math.max(0, Number.isFinite(Number(value)) ? Number(value) : fallback);
  let top = clean(insets.top, defaults.top);
  let bottom = clean(insets.bottom, defaults.bottom);
  let left = clean(insets.left);
  let right = clean(insets.right);
  // Keep a playable central area even when browser chrome shortens the viewport.
  const verticalRatio = Math.min(
    1,
    Math.max(0, height - tileSize * 2) / (top + bottom || 1),
  );
  const horizontalRatio = Math.min(
    1,
    Math.max(0, width - tileSize * 2) / (left + right || 1),
  );
  top *= verticalRatio;
  bottom *= verticalRatio;
  left *= horizontalRatio;
  right *= horizontalRatio;
  const safeRect = { left, top, right: width - right, bottom: height - bottom };
  const center = {
    x: (safeRect.left + safeRect.right) / 2,
    y: (safeRect.top + safeRect.bottom) / 2,
  };
  const origin = {
    x: player.x + 0.5 - center.x / tileSize,
    y: player.y + 0.5 - center.y / tileSize,
  };
  return {
    width,
    height,
    dpr,
    tileSize,
    origin,
    center,
    safeRect,
    pixelWidth: Math.max(1, Math.round(width * dpr)),
    pixelHeight: Math.max(1, Math.round(height * dpr)),
    bounds: {
      left: Math.floor(origin.x),
      top: Math.floor(origin.y),
      right: Math.ceil(origin.x + width / tileSize),
      bottom: Math.ceil(origin.y + height / tileSize),
    },
  };
}

/** Pointer coordinates and element bounds must both use client/CSS pixels. */
export function pointerToTile(event, bounds, viewport) {
  const x = ((event.clientX - bounds.left) * viewport.width) / bounds.width;
  const y = ((event.clientY - bounds.top) * viewport.height) / bounds.height;
  return {
    x: Math.floor(viewport.origin.x + x / viewport.tileSize),
    y: Math.floor(viewport.origin.y + y / viewport.tileSize),
  };
}
