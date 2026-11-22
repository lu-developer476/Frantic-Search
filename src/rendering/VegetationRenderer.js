import { drawBackgroundScenery, drawGroundScenery } from "./SceneryRenderer.js";

export const VEGETATION_PIXEL_SCALE = 3;
export const VEGETATION_LAYER_NAMES = Object.freeze(["far", "mid", "ground"]);

const FAR_LAYER_MAX_PARALLAX = 0.2;
const PIXEL_GROUND_PROP_KINDS = new Set([
  "dune-grass",
  "driftwood",
  "shrub",
  "fern",
  "fallen-log",
  "dead-shrub",
  "stump",
  "planter",
  "clipped-shrub",
  "boulder",
  "moss-rock",
  "rubble",
  "broken-concrete"
]);

function createLayerCanvas() {
  if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(1, 1);
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    return document.createElement("canvas");
  }
  throw new Error("VegetationRenderer requires OffscreenCanvas or a document canvas.");
}

function drawPixelLayer(targetContext, layer, width, height, destinationX = 0) {
  targetContext.save();
  targetContext.imageSmoothingEnabled = false;
  targetContext.globalAlpha = 1;
  targetContext.drawImage(layer.canvas, destinationX, 0, width, height);
  targetContext.restore();
}

/**
 * Rasterizes the existing procedural tree and foliage shapes at one-third
 * resolution, then enlarges them with nearest-neighbor sampling. Far and mid
 * trees keep separate camera-relative parallax layers; ground flora stays in
 * world space so its locations remain aligned with gameplay.
 */
export class VegetationRenderer {
  constructor({
    pixelScale = VEGETATION_PIXEL_SCALE,
    createCanvas = createLayerCanvas,
    drawBackground = drawBackgroundScenery,
    drawGround = drawGroundScenery
  } = {}) {
    if (!Number.isInteger(pixelScale) || pixelScale < 1) {
      throw new RangeError("Vegetation pixelScale must be a positive integer.");
    }
    this.pixelScale = pixelScale;
    this.width = 0;
    this.height = 0;
    this.drawBackgroundScenery = drawBackground;
    this.drawGroundScenery = drawGround;
    this.layers = VEGETATION_LAYER_NAMES.map((name) => {
      const canvas = createCanvas();
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) throw new Error("Unable to create a 2D vegetation layer: " + name);
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
    layer.context.clearRect(0, 0, width, height);
  }

  drawBackground(targetContext, {
    props = [],
    cameraX = 0,
    viewportWidth = targetContext?.canvas?.width ?? 960,
    viewportHeight = targetContext?.canvas?.height ?? 540,
    scene
  } = {}) {
    if (!targetContext || !scene) return;
    const width = Math.max(1, Math.ceil(viewportWidth));
    const height = Math.max(1, Math.ceil(viewportHeight));
    this.resize(width, height);

    const trees = props.filter((prop) => prop.layer === "background");
    const far = this.layerByName.far;
    const mid = this.layerByName.mid;
    this.prepareLayer(far, width, height);
    this.prepareLayer(mid, width, height);

    this.drawBackgroundScenery(
      far.context,
      trees.filter((prop) => prop.parallax <= FAR_LAYER_MAX_PARALLAX),
      cameraX,
      width,
      scene
    );
    this.drawBackgroundScenery(
      mid.context,
      trees.filter((prop) => prop.parallax > FAR_LAYER_MAX_PARALLAX),
      cameraX,
      width,
      scene
    );

    drawPixelLayer(targetContext, far, width, height);
    drawPixelLayer(targetContext, mid, width, height);
  }

  drawGround(targetContext, {
    props = [],
    cameraX = 0,
    viewportWidth = targetContext?.canvas?.width ?? 960,
    viewportHeight = targetContext?.canvas?.height ?? 540,
    scene
  } = {}) {
    if (!targetContext || !scene) return;
    const width = Math.max(1, Math.ceil(viewportWidth));
    const height = Math.max(1, Math.ceil(viewportHeight));
    this.resize(width, height);

    const ground = this.layerByName.ground;
    this.prepareLayer(ground, width, height);
    const cameraOffset = Math.round(cameraX);

    // Render in world space; the caller's gameplay context is already translated
    // by -cameraOffset, so the composite is shifted back by cameraOffset.
    ground.context.save();
    ground.context.translate(-cameraOffset, 0);
    for (const prop of props) {
      if (isPixelGroundSceneryProp(prop)) this.drawGroundScenery(ground.context, prop, scene);
    }
    ground.context.restore();

    drawPixelLayer(targetContext, ground, width, height, cameraOffset);
  }
}

export function isPixelGroundSceneryProp(prop) {
  return prop?.layer === "ground" && PIXEL_GROUND_PROP_KINDS.has(prop.kind);
}
