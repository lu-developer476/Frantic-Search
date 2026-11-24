/**
 * Shared Canvas HUD primitives for the standalone minigames.
 * Campaign HUD remains an independent HTML/CSS interface.
 */
export const MINIGAME_HUD_COLORS = Object.freeze({
  primary: "#30452a",
  secondary: "#f4efc2",
  notice: "#fff0bd",
  track: "#34463a",
  fill: "#d8f36a",
  danger: "#e27b60",
  empty: "#34463a"
});

export function drawMinigameHudText(context, value, x, y, {
  align = "left", size = 13, tone = "secondary", color, maxWidth
} = {}) {
  if (!context || value === null || value === undefined || value === "") return;
  context.save();
  context.font = `${size}px monospace`;
  context.fillStyle = color ?? MINIGAME_HUD_COLORS[tone] ?? MINIGAME_HUD_COLORS.secondary;
  context.textAlign = align;
  context.textBaseline = "alphabetic";
  if (Number.isFinite(maxWidth) && maxWidth > 0) context.fillText(String(value), x, y, maxWidth);
  else context.fillText(String(value), x, y);
  context.restore();
}

export function drawMinigameHudBar(context, {
  x, y, width, height = 7, ratio = 0,
  fillColor = MINIGAME_HUD_COLORS.fill,
  trackColor = MINIGAME_HUD_COLORS.track
} = {}) {
  if (!context || ![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return;
  const progress = Math.max(0, Math.min(1, Number(ratio) || 0));
  context.save();
  context.fillStyle = trackColor;
  context.fillRect(x, y, width, height);
  if (progress > 0) {
    context.fillStyle = fillColor;
    context.fillRect(x, y, width * progress, height);
  }
  context.restore();
}

export function drawMinigameHudSegments(context, {
  x, y, health = 0, maxHealth = 0, segmentWidth = 11, segmentHeight = 8,
  gap = 4, fillColor = MINIGAME_HUD_COLORS.fill,
  emptyColor = MINIGAME_HUD_COLORS.empty
} = {}) {
  if (!context || ![x, y, segmentWidth, segmentHeight, gap].every(Number.isFinite)) return;
  const total = Math.max(0, Math.floor(Number(maxHealth) || 0));
  const current = Math.max(0, Math.min(total, Math.floor(Number(health) || 0)));
  context.save();
  for (let index = 0; index < total; index += 1) {
    context.fillStyle = index < current ? fillColor : emptyColor;
    context.fillRect(x + index * (segmentWidth + gap), y, segmentWidth, segmentHeight);
  }
  context.restore();
}
