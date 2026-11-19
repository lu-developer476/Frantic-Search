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



/**
 * Expands a 960×540 logical viewport to match wider containers without
 * stretching sprites. Narrow stages retain the original world width.
 */
export function getCanvasViewportWidth(viewportWidth, viewportHeight, baseWidth = 960, baseHeight = 540) {
  if (!Number.isFinite(viewportWidth) || !Number.isFinite(viewportHeight) || viewportWidth <= 0 || viewportHeight <= 0) {
    return baseWidth;
  }
  return Math.max(baseWidth, Math.ceil((viewportWidth / viewportHeight) * baseHeight));
}

/**
 * Synchronizes a canvas backing buffer with its visible stage. Call the returned
 * resize function after revealing a hidden stage; disconnect() releases its observer.
 */
export function observeCanvasViewport(container, canvas, onResize = () => {}, baseWidth = 960, baseHeight = 540) {
  const resize = () => {
    const bounds = container?.getBoundingClientRect?.();
    const width = getCanvasViewportWidth(bounds?.width, bounds?.height, baseWidth, baseHeight);
    if (!canvas || (canvas.width === width && canvas.height === baseHeight)) return width;
    canvas.width = width;
    canvas.height = baseHeight;
    onResize(width);
    return width;
  };

  let observer = null;
  let usesWindowResize = false;
  if (container && typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(resize);
    observer.observe(container);
  } else if (typeof window !== "undefined") {
    window.addEventListener("resize", resize);
    usesWindowResize = true;
  }

  resize.disconnect = () => {
    observer?.disconnect();
    if (usesWindowResize) window.removeEventListener("resize", resize);
  };
  resize();
  return resize;
}


/** Draw a sprite without applying a generated outline. */
export function drawSpriteImage(context, image, x, y, width, height, sourceBounds = null) {
  if (!context || !image) return false;
  if (sourceBounds?.width > 0 && sourceBounds?.height > 0) {
    context.drawImage(
      image,
      sourceBounds.x, sourceBounds.y, sourceBounds.width, sourceBounds.height,
      x, y, width, height
    );
  } else {
    context.drawImage(image, x, y, width, height);
  }
  return true;
}
