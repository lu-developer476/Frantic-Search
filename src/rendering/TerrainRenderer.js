export const TERRAIN_PIXEL_SCALE = 3;
export const TERRAIN_LAYER_NAMES = Object.freeze([
  "backdrop",
  "foundation",
  "surface",
  "details",
  "formations"
]);

function createLayerCanvas() {
  if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(1, 1);
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    return document.createElement("canvas");
  }
  throw new Error("TerrainRenderer requires OffscreenCanvas or a document canvas.");
}

function drawPixelLayer(targetContext, layer, width, height, destinationX = 0) {
  targetContext.save();
  targetContext.imageSmoothingEnabled = false;
  targetContext.globalAlpha = 1;
  targetContext.drawImage(layer.canvas, destinationX, 0, width, height);
  targetContext.restore();
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function drawPolygon(context, points, color) {
  if (points.length < 3) return;
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index][0], points[index][1]);
  }
  context.closePath();
  context.fill();
}

function drawGroundBackdrop(context, width, height, groundY, cameraX, scene) {
  const horizon = clamp(Math.round(groundY), 0, height);
  context.fillStyle = scene.under;
  context.fillRect(0, horizon, width, height - horizon);

  // Horizontal cut-rock strata make the exposed underside read as a pixel-art cliff.
  const strata = [0.24, 0.48, 0.73];
  strata.forEach((ratio, index) => {
    const y = horizon + Math.round((height - horizon) * ratio);
    context.fillStyle = index % 2 ? scene.platformShadow : scene.soil;
    context.fillRect(0, y, width, 3);
    context.fillStyle = scene.detail;
    for (let tile = 0; tile < Math.ceil(width / 116) + 2; tile += 1) {
      const span = width + 116;
      const x = ((tile * 116 - cameraX * 0.48) % span + span) % span - 58;
      const markY = y + 6 + ((tile + index) % 3) * 7;
      context.fillRect(Math.round(x), markY, 18 + ((tile + index) % 3) * 5, 3);
    }
  });

  const span = width + 84;
  for (let index = 0; index < Math.ceil(span / 67); index += 1) {
    const x = ((index * 67 - cameraX * 0.48) % span + span) % span;
    const y = horizon - 22 + (index % 4) * 6;
    context.fillStyle = scene.detail;
    context.fillRect(Math.round(x), y, 6, 3);
    if (index % 3 === 0) {
      context.fillStyle = scene.grass;
      context.fillRect(Math.round(x + 4), y - 3, 3, 5);
    }
  }
}

function drawGroundFoundation(context, platform, scene) {
  context.fillStyle = scene.soil;
  context.fillRect(platform.x, platform.y, platform.w, platform.h);
  if (platform.h >= 4) {
    context.fillStyle = scene.under;
    context.fillRect(platform.x, platform.y + platform.h - Math.min(3, platform.h), platform.w, Math.min(3, platform.h));
  }
}

function drawRaisedFoundation(context, platform, scene) {
  context.fillStyle = scene.platform;
  context.fillRect(platform.x, platform.y, platform.w, platform.h);
  const edge = Math.min(3, platform.w, platform.h);
  context.fillStyle = scene.platformShadow;
  context.fillRect(platform.x, platform.y + platform.h - edge, platform.w, edge);
  context.fillRect(platform.x, platform.y, Math.min(2, platform.w), platform.h);
}

function drawRockShelf(context, platform, scene) {
  const x = platform.x;
  const y = platform.y;
  const right = x + platform.w;
  const bottom = y + platform.h;
  const height = platform.h;
  drawPolygon(context, [
    [x, bottom],
    [x + platform.w * 0.10, y + height * 0.55],
    [x + platform.w * 0.28, y + height * 0.20],
    [x + platform.w * 0.68, y],
    [x + platform.w * 0.91, y + height * 0.34],
    [right, bottom]
  ], scene.platformShadow ?? scene.under);
  drawPolygon(context, [
    [x + platform.w * 0.10, bottom - height * 0.12],
    [x + platform.w * 0.28, y + height * 0.20],
    [x + platform.w * 0.68, y],
    [x + platform.w * 0.78, y + height * 0.40],
    [x + platform.w * 0.42, bottom - height * 0.20]
  ], scene.rock);
}

function drawGrassSurface(context, platform, scene) {
  const capHeight = Math.min(8, platform.h);
  context.fillStyle = scene.grass;
  context.fillRect(platform.x, platform.y, platform.w, capHeight);

  // Small stepped tufts sit inside the existing platform bounds.
  for (let index = 0; index < Math.ceil(platform.w / 61); index += 1) {
    const x = platform.x + index * 61 + 13;
    const tuftHeight = 2 + ((index * 7) % 3);
    if (x < platform.x + platform.w - 3) {
      context.fillStyle = index % 2 ? scene.detail : scene.treeLight ?? scene.grass;
      context.fillRect(x, platform.y, Math.min(8, platform.x + platform.w - x), Math.min(capHeight, tuftHeight));
    }
  }
}

function drawRaisedSurface(context, platform, scene) {
  const capHeight = Math.min(5, platform.h);
  context.fillStyle = scene.platformTop;
  context.fillRect(platform.x, platform.y, platform.w, capHeight);
  if (platform.w > 12) {
    context.fillStyle = scene.rock;
    context.fillRect(platform.x + 4, platform.y + Math.max(1, capHeight - 2), Math.min(8, platform.w - 8), 2);
  }
}

function drawBridgeSurface(context, platform) {
  context.fillStyle = "#8b623d";
  context.fillRect(platform.x, platform.y, platform.w, platform.h);
  context.fillStyle = "#d0a36a";
  context.fillRect(platform.x, platform.y, platform.w, Math.min(4, platform.h));
  context.fillStyle = "#68482f";
  for (let x = platform.x + 3; x < platform.x + platform.w - 2; x += 24) {
    context.fillRect(x, platform.y + Math.min(5, platform.h), 2, Math.max(0, platform.h - 5));
  }
}

function drawGroundDetails(context, platform, scene) {
  const bottom = platform.y + platform.h;
  context.fillStyle = scene.detail;
  for (let index = 0; index < Math.floor(platform.w / 52); index += 1) {
    const x = platform.x + index * 52 + 13;
    const y = platform.y + 17 + (index % 3) * 8;
    if (y + 3 <= bottom) {
      context.fillRect(x, y, Math.min(11, platform.x + platform.w - x), 3);
      if (index % 2 === 0 && y - 4 >= platform.y) {
        context.fillRect(x + 7, y - 4, 4, 4);
      }
    }
  }
  context.fillStyle = scene.rock;
  for (let index = 0; index < Math.floor(platform.w / 145); index += 1) {
    const x = platform.x + index * 145 + 72;
    const y = platform.y + 34;
    if (y + 4 <= bottom) {
      context.fillRect(x, y, Math.min(8, platform.x + platform.w - x), 4);
      context.fillRect(Math.min(x + 8, platform.x + platform.w - 2), y - 3, Math.min(5, platform.x + platform.w - x - 8), 3);
    }
  }
}

function drawRaisedDetails(context, platform, scene) {
  const detailY = platform.y + Math.min(10, platform.h - 1);
  const bottom = platform.y + platform.h;
  context.fillStyle = scene.platformShadow;
  for (let index = 0; index < Math.floor(platform.w / 38); index += 1) {
    const x = platform.x + 9 + index * 38;
    if (detailY + 3 <= bottom) context.fillRect(x, detailY, Math.min(12, platform.x + platform.w - x), 3);
  }
  if (platform.h > 10) {
    context.fillStyle = scene.rock;
    context.fillRect(platform.x + 8, platform.y + Math.min(18, platform.h - 2), Math.min(6, platform.w - 8), 3);
  }
}

function drawBridgeDetails(context, platform) {
  context.fillStyle = "#4f392b";
  for (let x = platform.x + 12; x < platform.x + platform.w - 5; x += 24) {
    context.fillRect(x, platform.y + Math.min(8, platform.h - 1), 4, Math.min(4, Math.max(1, platform.h - 8)));
  }
  context.fillStyle = "#e0b878";
  for (let x = platform.x + 7; x < platform.x + platform.w - 3; x += 48) {
    context.fillRect(x, platform.y + Math.min(2, platform.h - 1), 3, 2);
  }
}

function drawRockFormation(context, obstacle, scene) {
  const x = obstacle.x;
  const y = obstacle.y;
  const width = obstacle.w;
  const height = obstacle.h;
  const bottom = y + height;
  drawPolygon(context, [
    [x, bottom],
    [x + width * 0.08, y + height * 0.68],
    [x + width * 0.08, y + height * 0.49],
    [x + width * 0.24, y + height * 0.49],
    [x + width * 0.24, y + height * 0.22],
    [x + width * 0.44, y + height * 0.05],
    [x + width * 0.72, y + height * 0.10],
    [x + width * 0.84, y + height * 0.40],
    [x + width * 0.96, y + height * 0.64],
    [x + width, bottom]
  ], scene.rock);
  drawPolygon(context, [
    [x + width * 0.08, bottom],
    [x + width * 0.24, y + height * 0.49],
    [x + width * 0.24, y + height * 0.22],
    [x + width * 0.44, y + height * 0.05],
    [x + width * 0.55, y + height * 0.15],
    [x + width * 0.39, y + height * 0.64],
    [x + width * 0.26, bottom]
  ], scene.platformTop);
  context.fillStyle = scene.platformShadow;
  context.fillRect(x + width * 0.13, y + height * 0.72, width * 0.25, Math.max(2, height * 0.055));
  context.fillRect(x + width * 0.67, y + height * 0.63, width * 0.19, Math.max(2, height * 0.06));
  context.fillStyle = scene.soil;
  context.fillRect(x + width * 0.48, y + height * 0.34, width * 0.10, Math.max(2, height * 0.045));
}

export class TerrainRenderer {
  constructor({
    pixelScale = TERRAIN_PIXEL_SCALE,
    createCanvas = createLayerCanvas
  } = {}) {
    if (!Number.isInteger(pixelScale) || pixelScale < 1) {
      throw new RangeError("Terrain pixelScale must be a positive integer.");
    }
    this.pixelScale = pixelScale;
    this.width = 0;
    this.height = 0;
    this.layers = TERRAIN_LAYER_NAMES.map((name) => {
      const canvas = createCanvas();
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) throw new Error("Unable to create a 2D terrain layer: " + name);
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

  drawBackdrop(targetContext, {
    cameraX = 0,
    viewportWidth = targetContext?.canvas?.width ?? 960,
    viewportHeight = targetContext?.canvas?.height ?? 540,
    groundY = 430,
    scene
  } = {}) {
    if (!targetContext || !scene) return;
    const width = Math.max(1, Math.ceil(viewportWidth));
    const height = Math.max(1, Math.ceil(viewportHeight));
    this.resize(width, height);
    const backdrop = this.layerByName.backdrop;
    this.prepareLayer(backdrop, width, height);
    drawGroundBackdrop(backdrop.context, width, height, groundY, cameraX, scene);
    drawPixelLayer(targetContext, backdrop, width, height);
  }

  drawPlatforms(targetContext, {
    platforms = [],
    cameraX = 0,
    viewportWidth = targetContext?.canvas?.width ?? 960,
    viewportHeight = targetContext?.canvas?.height ?? 540,
    scene
  } = {}) {
    if (!targetContext || !scene || platforms.length === 0) return;
    const width = Math.max(1, Math.ceil(viewportWidth));
    const height = Math.max(1, Math.ceil(viewportHeight));
    this.resize(width, height);
    const foundation = this.layerByName.foundation;
    const surface = this.layerByName.surface;
    const details = this.layerByName.details;
    const cameraOffset = Math.round(cameraX);
    for (const layer of [foundation, surface, details]) {
      this.prepareLayer(layer, width, height);
      layer.context.save();
      layer.context.translate(-cameraOffset, 0);
    }

    for (const platform of platforms) {
      if (platform.kind === "ground") {
        drawGroundFoundation(foundation.context, platform, scene);
        drawGrassSurface(surface.context, platform, scene);
        drawGroundDetails(details.context, platform, scene);
      } else if (platform.kind === "rock-ledge") {
        drawRockShelf(foundation.context, platform, scene);
        drawRaisedSurface(surface.context, platform, scene);
      } else if (platform.kind === "ally-bridge") {
        drawBridgeSurface(surface.context, platform);
        drawBridgeDetails(details.context, platform);
      } else {
        drawRaisedFoundation(foundation.context, platform, scene);
        drawRaisedSurface(surface.context, platform, scene);
        drawRaisedDetails(details.context, platform, scene);
      }
    }

    for (const layer of [foundation, surface, details]) layer.context.restore();
    for (const layer of [foundation, surface, details]) {
      drawPixelLayer(targetContext, layer, width, height, cameraOffset);
    }
  }

  drawRockFormations(targetContext, {
    obstacles = [],
    cameraX = 0,
    viewportWidth = targetContext?.canvas?.width ?? 960,
    viewportHeight = targetContext?.canvas?.height ?? 540,
    scene
  } = {}) {
    if (!targetContext || !scene || obstacles.length === 0) return;
    const width = Math.max(1, Math.ceil(viewportWidth));
    const height = Math.max(1, Math.ceil(viewportHeight));
    this.resize(width, height);
    const formations = this.layerByName.formations;
    const cameraOffset = Math.round(cameraX);
    this.prepareLayer(formations, width, height);
    formations.context.save();
    formations.context.translate(-cameraOffset, 0);
    for (const obstacle of obstacles) {
      if (obstacle.type === "rock") drawRockFormation(formations.context, obstacle, scene);
    }
    formations.context.restore();
    drawPixelLayer(targetContext, formations, width, height, cameraOffset);
  }
}
