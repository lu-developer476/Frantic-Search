export const OBJECT_PIXEL_SCALE = 3;
export const OBJECT_LAYER_NAMES = Object.freeze([
  "collectibles",
  "facility",
  "arena-boundary",
  "interactives",
  "obstacles",
  "cage-back",
  "cage-front",
  "food",
  "projectiles",
  "containment-shell"
]);

function createLayerCanvas() {
  if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(1, 1);
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    return document.createElement("canvas");
  }
  throw new Error("ObjectRenderer requires OffscreenCanvas or a document canvas.");
}

function compositeLayer(targetContext, layer, width, height, cameraOffset) {
  targetContext.save();
  targetContext.imageSmoothingEnabled = false;
  targetContext.globalAlpha = 1;
  targetContext.drawImage(layer.canvas, cameraOffset, 0, width, height);
  targetContext.restore();
}

/**
 * Renders procedural world objects into independent one-third-resolution
 * canvases. The caller can composite each object family at its original z-order,
 * while the nearest-neighbor upscale keeps sprite assets outside this pipeline.
 */
export class ObjectRenderer {
  constructor({
    pixelScale = OBJECT_PIXEL_SCALE,
    createCanvas = createLayerCanvas
  } = {}) {
    if (!Number.isInteger(pixelScale) || pixelScale < 1) {
      throw new RangeError("Object pixelScale must be a positive integer.");
    }
    this.pixelScale = pixelScale;
    this.width = 0;
    this.height = 0;
    this.layers = OBJECT_LAYER_NAMES.map((name) => {
      const canvas = createCanvas();
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) throw new Error("Unable to create a 2D object layer: " + name);
      return { name, canvas, context };
    });
    this.layerByName = Object.fromEntries(this.layers.map((layer) => [layer.name, layer]));
  }

  resize(width, height) {
    const pixelWidth = Math.max(1, Math.ceil(width / this.pixelScale));
    const pixelHeight = Math.max(1, Math.ceil(height / this.pixelScale));
    if (width === this.width && height === this.height) return;

    this.width = width;
    this.height = height;
    for (const layer of this.layers) {
      layer.canvas.width = pixelWidth;
      layer.canvas.height = pixelHeight;
      layer.context.imageSmoothingEnabled = false;
      layer.context.setTransform(1 / this.pixelScale, 0, 0, 1 / this.pixelScale, 0, 0);
    }
  }

  prepareLayer(layer, width, height) {
    layer.context.setTransform(1 / this.pixelScale, 0, 0, 1 / this.pixelScale, 0, 0);
    layer.context.globalAlpha = 1;
    layer.context.shadowBlur = 0;
    layer.context.clearRect(0, 0, width, height);
  }

  drawLayer(targetContext, layerName, {
    cameraX = 0,
    viewportWidth = targetContext?.canvas?.width ?? 960,
    viewportHeight = targetContext?.canvas?.height ?? 540
  } = {}, draw) {
    if (!targetContext || typeof draw !== "function") return;
    const layer = this.layerByName[layerName];
    if (!layer) throw new RangeError("Unknown object render layer: " + layerName);

    const width = Math.max(1, Math.ceil(viewportWidth));
    const height = Math.max(1, Math.ceil(viewportHeight));
    const cameraOffset = Math.round(cameraX);
    this.resize(width, height);
    this.prepareLayer(layer, width, height);

    layer.context.save();
    try {
      layer.context.translate(-cameraOffset, 0);
      draw(layer.context);
    } finally {
      layer.context.restore();
    }

    compositeLayer(targetContext, layer, width, height, cameraOffset);
  }
}
