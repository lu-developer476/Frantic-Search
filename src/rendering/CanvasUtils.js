/**
 * Adds a rounded rectangle path to a Canvas 2D context.
 * The caller controls fillStyle/strokeStyle and decides whether to fill or stroke.
 */
export function roundedRect(context, x, y, width, height, radius = 0) {
  const left = Math.min(x, x + width);
  const right = Math.max(x, x + width);
  const top = Math.min(y, y + height);
  const bottom = Math.max(y, y + height);
  const maxRadius = Math.min((right - left) / 2, (bottom - top) / 2);
  const requestedRadius = Number.isFinite(radius) ? Math.max(0, radius) : 0;
  const r = Math.min(requestedRadius, maxRadius);

  context.beginPath();
  context.moveTo(left + r, top);
  context.lineTo(right - r, top);
  context.quadraticCurveTo(right, top, right, top + r);
  context.lineTo(right, bottom - r);
  context.quadraticCurveTo(right, bottom, right - r, bottom);
  context.lineTo(left + r, bottom);
  context.quadraticCurveTo(left, bottom, left, bottom - r);
  context.lineTo(left, top + r);
  context.quadraticCurveTo(left, top, left + r, top);
  context.closePath();
}
