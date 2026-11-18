const OUTLINED_IMAGE_CACHE = new WeakMap();
const OUTLINED_IMAGE_CACHE_LRU = new Map();
const MAX_OUTLINED_IMAGE_CACHE_ENTRIES = 128;

function createOutlineSurface(width, height) {
  if (typeof OffscreenCanvas === "function") {
    try {
      const surface = new OffscreenCanvas(width, height);
      if (surface.getContext("2d")) return surface;
    } catch {
      // Fall through to a regular canvas when OffscreenCanvas is unavailable.
    }
  }
  if (typeof document === "undefined") return null;
  const surface = document.createElement("canvas");
  surface.width = width;
  surface.height = height;
  return surface;
}

function getOutlinedImage(image, width, height, sourceBounds = null) {
  if (!image || (typeof image !== "object" && typeof image !== "function") ||
      !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  const rasterWidth = Math.max(1, Math.round(width));
  const rasterHeight = Math.max(1, Math.round(height));
  const crop = sourceBounds &&
    Number.isFinite(sourceBounds.x) &&
    Number.isFinite(sourceBounds.y) &&
    Number.isFinite(sourceBounds.width) &&
    Number.isFinite(sourceBounds.height) &&
    sourceBounds.width > 0 &&
    sourceBounds.height > 0
    ? sourceBounds
    : null;
  const cacheKey = [
    crop?.x ?? 0,
    crop?.y ?? 0,
    crop?.width ?? 0,
    crop?.height ?? 0,
    rasterWidth,
    rasterHeight
  ].join(":");

  let variants = OUTLINED_IMAGE_CACHE.get(image);
  if (!variants) {
    variants = new Map();
    OUTLINED_IMAGE_CACHE.set(image, variants);
  }

  const cached = variants.get(cacheKey);
  if (cached) {
    OUTLINED_IMAGE_CACHE_LRU.delete(cached);
    OUTLINED_IMAGE_CACHE_LRU.set(cached, cached);
    return cached.image;
  }

  try {
    const mask = createOutlineSurface(rasterWidth, rasterHeight);
    const outlined = createOutlineSurface(rasterWidth + 2, rasterHeight + 2);
    const maskContext = mask?.getContext("2d");
    const outlineContext = outlined?.getContext("2d");
    if (!maskContext || !outlineContext) return null;

    maskContext.imageSmoothingEnabled = false;
    if (crop) {
      maskContext.drawImage(
        image,
        crop.x, crop.y, crop.width, crop.height,
        0, 0, rasterWidth, rasterHeight
      );
    } else {
      maskContext.drawImage(image, 0, 0, rasterWidth, rasterHeight);
    }
    maskContext.globalCompositeOperation = "source-in";
    maskContext.fillStyle = "#000000";
    maskContext.fillRect(0, 0, rasterWidth, rasterHeight);

    outlineContext.imageSmoothingEnabled = false;
    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        if (offsetX === 0 && offsetY === 0) continue;
        outlineContext.drawImage(mask, 1 + offsetX, 1 + offsetY);
      }
    }
    if (crop) {
      outlineContext.drawImage(
        image,
        crop.x, crop.y, crop.width, crop.height,
        1, 1, rasterWidth, rasterHeight
      );
    } else {
      outlineContext.drawImage(image, 1, 1, rasterWidth, rasterHeight);
    }

    const entry = { image: outlined, variants, cacheKey };
    variants.set(cacheKey, entry);
    OUTLINED_IMAGE_CACHE_LRU.set(entry, entry);
    while (OUTLINED_IMAGE_CACHE_LRU.size > MAX_OUTLINED_IMAGE_CACHE_ENTRIES) {
      const oldest = OUTLINED_IMAGE_CACHE_LRU.keys().next().value;
      const oldestEntry = OUTLINED_IMAGE_CACHE_LRU.get(oldest);
      OUTLINED_IMAGE_CACHE_LRU.delete(oldest);
      if (oldestEntry.variants.get(oldestEntry.cacheKey) === oldestEntry) {
        oldestEntry.variants.delete(oldestEntry.cacheKey);
      }
    }
    return outlined;
  } catch {
    return null;
  }
}

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
 * Draws a cached one-pixel black silhouette for PNG images and decoded GIF frames.
 * Each source image and size is rasterized once, then reused on subsequent redraws.
 */
export function drawOutlinedImage(context, image, x, y, width, height, sourceBounds = null) {
  if (!context || !image) return false;

  const outlined = getOutlinedImage(image, width, height, sourceBounds);
  if (outlined) {
    context.drawImage(outlined, x - 1, y - 1, width + 2, height + 2);
  } else if (sourceBounds) {
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
