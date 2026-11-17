export const ATMOSPHERE_PIXEL_SCALE = 3;
export const ATMOSPHERE_LAYER_NAMES = Object.freeze(["sky", "celestial", "horizon", "lighting"]);

const PIXEL = ATMOSPHERE_PIXEL_SCALE;
const SUN_MASK = [
  "0011111100", "0111111110", "1111111111", "1111111111", "1111111111",
  "1111111111", "1111111111", "1111111111", "0111111110", "0011111100"
];
const MOUNTAIN_PROFILE_A = [0.12, 0.24, 0.42, 0.66, 0.91, 1, 0.86, 0.61, 0.39, 0.22, 0.11, 0.06];
const MOUNTAIN_PROFILE_B = [0.08, 0.18, 0.37, 0.58, 0.79, 0.94, 1, 0.83, 0.56, 0.34, 0.17, 0.08];
const MOUNTAIN_PROFILE_C = [0.05, 0.13, 0.31, 0.53, 0.76, 0.94, 0.88, 0.69, 0.44, 0.25, 0.12, 0.05];

function createLayerCanvas() {
  if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(1, 1);
  if (typeof document !== "undefined" && typeof document.createElement === "function") return document.createElement("canvas");
  throw new Error("AtmosphereRenderer requires OffscreenCanvas or a document canvas.");
}

function snap(value) {
  return Math.round(value / PIXEL) * PIXEL;
}

function pixelRect(context, color, x, y, width, height, alpha = 1) {
  if (!(width > 0 && height > 0)) return;
  const previousAlpha = context.globalAlpha;
  if (alpha !== 1) context.globalAlpha = previousAlpha * alpha;
  context.fillStyle = color;
  context.fillRect(snap(x), snap(y), Math.max(PIXEL, snap(width)), Math.max(PIXEL, snap(height)));
  if (alpha !== 1) context.globalAlpha = previousAlpha;
}

function shiftColor(hex, amount) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!match) return hex;
  const value = Number.parseInt(match[1], 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  const target = amount >= 0 ? 255 : 0;
  const strength = Math.min(1, Math.abs(amount));
  const shifted = channels.map((channel) => Math.round(channel + (target - channel) * strength));
  return "#" + shifted.map((channel) => channel.toString(16).padStart(2, "0")).join("");
}

function wrap(value, span) {
  return ((value % span) + span) % span;
}

function drawSky(context, scene, width, height, environment) {
  const bands = 12;
  for (let index = 0; index < bands; index += 1) {
    const progress = index / Math.max(1, bands - 1);
    const y = Math.floor((height / bands) * index);
    const nextY = Math.ceil((height / bands) * (index + 1));
    pixelRect(context, shiftColor(scene.sky, -0.055 + progress * 0.13), 0, y, width, nextY - y + PIXEL);
  }
  const horizonTint = environment === "extraction"
    ? scene.sunShade
    : environment === "black-site" || environment === "containment"
      ? scene.cloudShadow : scene.cloud;
  pixelRect(context, horizonTint, 0, 292, width, 118, 0.075);
  pixelRect(context, shiftColor(scene.sky, -0.16), 0, 0, width, 18, 0.12);
}

function drawSun(context, scene, environment, width) {
  const size = environment === "extraction" ? 66 : 48;
  const centerX = snap(width * 0.80);
  const centerY = environment === "extraction" ? 150 : environment === "black-site" ? 82 : 66;
  const left = centerX - size / 2;
  const top = centerY - size / 2;
  const cell = size / SUN_MASK.length;

  pixelRect(context, scene.sunShade, left - 15, top - 12, size + 30, size + 24, 0.10);
  pixelRect(context, scene.sunShade, left - 9, top - 6, size + 18, size + 12, 0.17);
  const rays = [
    [-6, -30, 12, 12], [0, -45, 9, 12], [size - 6, -30, 12, 12],
    [size + 12, -3, 15, 9], [size + 9, size + 15, 12, 9],
    [size - 6, size + 30, 9, 12], [-6, size + 27, 12, 12],
    [-27, size + 12, 15, 9], [-30, -3, 12, 9], [size / 2 - 4, size + 33, 9, 12]
  ];
  for (const [x, y, rayWidth, rayHeight] of rays) {
    pixelRect(context, scene.sunShade, left + x, top + y, rayWidth, rayHeight, 0.92);
  }
  for (let row = 0; row < SUN_MASK.length; row += 1) {
    for (let column = 0; column < SUN_MASK[row].length; column += 1) {
      if (SUN_MASK[row][column] === "1") {
        pixelRect(context, scene.sunShade, left + column * cell + 3, top + row * cell + 6, cell, cell);
      }
    }
  }
  for (let row = 0; row < SUN_MASK.length; row += 1) {
    for (let column = 0; column < SUN_MASK[row].length; column += 1) {
      if (SUN_MASK[row][column] === "1") {
        pixelRect(context, scene.sun, left + column * cell, top + row * cell, cell, cell);
      }
    }
  }
  pixelRect(context, "#fff8cf", left + 15, top + 12, 12, 6, 0.72);
  pixelRect(context, "#fff8cf", left + 9, top + 21, 6, 9, 0.55);
}

function drawCloud(context, scene, x, y, scale = 1, alpha = 1) {
  const blocks = [
    [-36, 6, 42, 12], [-18, -6, 42, 24], [6, -15, 48, 30],
    [36, -6, 42, 24], [60, 6, 24, 12]
  ];
  for (const [offsetX, offsetY, width, height] of blocks) {
    pixelRect(context, scene.cloudShadow, x + offsetX * scale + 9, y + offsetY * scale + 12,
      width * scale, height * scale, alpha * 0.92);
  }
  for (const [offsetX, offsetY, width, height] of blocks) {
    pixelRect(context, scene.cloud, x + offsetX * scale, y + offsetY * scale,
      width * scale, height * scale, alpha);
  }
  pixelRect(context, "#ffffff", x - 12 * scale, y - 3 * scale, 24 * scale, 6 * scale, alpha * 0.34);
  pixelRect(context, "#ffffff", x + 18 * scale, y - 12 * scale, 21 * scale, 6 * scale, alpha * 0.26);
}

function drawCloudLayer(context, scene, cameraX, width) {
  const spacing = 246;
  const span = width + spacing * 2;
  const count = Math.ceil(width / spacing) + 3;
  for (let index = -1; index < count; index += 1) {
    const x = wrap(index * spacing - cameraX * 0.075 + 90, span) - spacing;
    const y = 48 + ((index % 3 + 3) % 3) * 42;
    drawCloud(context, scene, x, y, index % 2 === 0 ? 1 : 0.78, index % 3 === 0 ? 0.88 : 1);
  }
}

function drawCelestialLayer(context, scene, environment, cameraX, width) {
  if (environment === "rosa-containment") return;
  drawSun(context, scene, environment, width);
  drawCloudLayer(context, scene, cameraX, width);
  if (environment === "coastal") {
    for (let index = 0; index < Math.ceil(width / 100) + 2; index += 1) {
      const x = wrap(index * 100 - cameraX * 0.34, width + 100) - 40;
      const y = 345 + (index % 4) * 12;
      pixelRect(context, scene.cloud, x, y, 36, 3, 0.48);
      pixelRect(context, scene.cloud, x + 15, y + 6, 21, 3, 0.35);
    }
  }
}

function drawPixelMountain(context, x, baseY, width, height, color, snowColor, profile, variant = 0) {
  const step = width / profile.length;
  const peak = Math.floor(profile.length / 2);
  for (let column = 0; column < profile.length; column += 1) {
    const variation = ((column + variant) % 4) * 0.012;
    const columnHeight = Math.max(PIXEL, snap(height * (profile[column] - variation)));
    const columnX = x + column * step;
    pixelRect(context, color, columnX, baseY - columnHeight, step + PIXEL, columnHeight);
    if (snowColor && columnHeight > height * 0.70 && column <= peak + 1) {
      pixelRect(context, snowColor, columnX, baseY - columnHeight, step + PIXEL,
        Math.min(12, columnHeight * 0.12), 0.88);
    }
    if (column < peak && columnHeight > height * 0.38) {
      pixelRect(context, shiftColor(color, 0.13), columnX, baseY - columnHeight + 12,
        Math.max(PIXEL, step * 0.34), Math.min(18, columnHeight * 0.22), 0.72);
    }
  }
}

function drawMountainRange(context, {
  cameraX, width, baseY, height, spacing, parallax, color, snowColor = null, profile = MOUNTAIN_PROFILE_A
}) {
  const offset = wrap(cameraX * parallax, spacing);
  const count = Math.ceil(width / spacing) + 3;
  for (let index = -1; index < count; index += 1) {
    drawPixelMountain(context, index * spacing - offset - spacing * 0.12, baseY, spacing * 0.86,
      height * (0.82 + ((index % 3 + 3) % 3) * 0.09), color, snowColor, profile, index);
  }
}

function drawConiferSilhouette(context, x, baseY, width, height, colors, variant = 0) {
  const center = x + width / 2;
  const trunkWidth = Math.max(6, snap(width * 0.10));
  pixelRect(context, colors.trunk, center - trunkWidth / 2, baseY - height * 0.42, trunkWidth, height * 0.42);
  for (let tier = 4; tier >= 0; tier -= 1) {
    const progress = tier / 4;
    const tierWidth = width * (0.34 + progress * 0.66);
    const tierY = baseY - height * (0.46 + (1 - progress) * 0.50);
    const tierHeight = height * 0.21;
    pixelRect(context, tier % 2 ? colors.leaf : colors.deep,
      center - tierWidth / 2, tierY, tierWidth, tierHeight);
    pixelRect(context, colors.light, center - tierWidth * 0.25 + (variant % 2) * PIXEL,
      tierY + tierHeight * 0.34, Math.max(PIXEL, tierWidth * 0.18), PIXEL, 0.74);
  }
}

function drawForestLine(context, scene, cameraX, width, baseY, parallax, density = 1) {
  const spacing = 112;
  const offset = wrap(cameraX * parallax, spacing);
  const colors = {
    deep: shiftColor(scene.tree, -0.30),
    leaf: shiftColor(scene.tree, -0.12),
    light: scene.treeLight,
    trunk: shiftColor(scene.treeTrunk, -0.18)
  };
  const count = Math.ceil(width / spacing) + 3;
  for (let index = -1; index < count; index += 1) {
    const variant = (index + 12) % 4;
    drawConiferSilhouette(context, index * spacing - offset - 18, baseY,
      48 + variant * 8, (116 + variant * 32) * density, colors, variant);
  }
}

function drawIndustrialBuildings(context, scene, cameraX, width, baseY, parallax, variant = "black-site", elapsed = 0) {
  const spacing = variant === "containment" ? 184 : 218;
  const offset = wrap(cameraX * parallax, spacing);
  const count = Math.ceil(width / spacing) + 3;
  for (let index = -1; index < count; index += 1) {
    const x = index * spacing - offset - 48;
    const buildingWidth = (variant === "containment" ? 126 : 150) + (index % 2) * 24;
    const buildingHeight = variant === "containment" ? 118 + (index % 3) * 30 : 104 + (index % 3) * 34;
    const top = baseY - buildingHeight;
    pixelRect(context, scene.buildingShadow, x + 9, top - 3, buildingWidth, buildingHeight + 8);
    pixelRect(context, scene.building, x, top, buildingWidth, buildingHeight);
    pixelRect(context, scene.buildingLight, x, top, buildingWidth, 7, 0.82);
    pixelRect(context, scene.buildingShadow, x + 9, top + 12, buildingWidth - 18, 8, 0.92);

    const rows = variant === "containment" ? 3 : 2;
    const columns = variant === "containment" ? 3 : 4;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const windowX = x + 15 + column * ((buildingWidth - 32) / columns);
        const windowY = top + 30 + row * 30;
        const flicker = 0.72 + Math.sin(elapsed * 1.7 + index * 0.8 + row + column) * 0.12;
        const windowColor = (column + row + index) % 5 === 0 ? scene.warning : scene.window;
        pixelRect(context, windowColor, windowX, windowY, 15, 9, flicker);
      }
    }
    if (variant === "black-site") {
      pixelRect(context, scene.warning, x + 12, top - 9, 42, 4, 0.92);
      pixelRect(context, scene.buildingShadow, x + buildingWidth - 19, top - 55, 8, 55);
    } else {
      pixelRect(context, scene.warning, x + 5, top - 6, buildingWidth - 10, 5, 0.86);
      pixelRect(context, scene.buildingLight, x + buildingWidth - 15, top - 34, 7, 34, 0.76);
    }
  }
}

function drawCoastalHorizon(context, scene, cameraX, width) {
  pixelRect(context, scene.ridge, 0, 322, width, 108);
  drawMountainRange(context, {
    cameraX, width, baseY: 430, height: 132, spacing: 304, parallax: 0.105,
    color: shiftColor(scene.ridge, -0.12), profile: MOUNTAIN_PROFILE_B
  });
  drawMountainRange(context, {
    cameraX, width, baseY: 427, height: 91, spacing: 258, parallax: 0.20,
    color: scene.mountain, snowColor: scene.snow, profile: MOUNTAIN_PROFILE_C
  });
  for (let index = 0; index < Math.ceil(width / 96) + 2; index += 1) {
    const x = wrap(index * 96 - cameraX * 0.30, width + 120) - 48;
    pixelRect(context, scene.buildingShadow, x, 389, 6, 38);
    pixelRect(context, scene.warning, x - 3, 386, 12, 6);
  }
  for (let index = 0; index < Math.ceil(width / 82) + 2; index += 1) {
    const x = wrap(index * 82 - cameraX * 0.36, width + 82) - 41;
    pixelRect(context, scene.cloud, x, 365 + (index % 3) * 12, 32, 3, 0.38);
  }
}

function drawRedwoodHorizon(context, scene, cameraX, width) {
  pixelRect(context, scene.ridge, 0, 294, width, 136);
  drawMountainRange(context, {
    cameraX, width, baseY: 430, height: 164, spacing: 320, parallax: 0.085,
    color: shiftColor(scene.ridge, -0.12), profile: MOUNTAIN_PROFILE_C
  });
  drawForestLine(context, scene, cameraX, width, 430, 0.14, 1.10);
  drawForestLine(context, scene, cameraX + 360, width, 430, 0.22, 0.78);
  pixelRect(context, shiftColor(scene.sky, -0.18), 0, 358, width, 34, 0.12);
}

function drawBlackSiteHorizon(context, scene, cameraX, width, elapsed) {
  pixelRect(context, scene.ridge, 0, 346, width, 84);
  drawMountainRange(context, {
    cameraX, width, baseY: 430, height: 96, spacing: 286, parallax: 0.075,
    color: shiftColor(scene.ridge, -0.12), profile: MOUNTAIN_PROFILE_A
  });
  drawIndustrialBuildings(context, scene, cameraX, width, 426, 0.15, "black-site", elapsed);
  pixelRect(context, scene.buildingShadow, 0, 354, width, 6);
  pixelRect(context, scene.buildingLight, 0, 351, width, 3);
  for (let index = 0; index < Math.ceil(width / 74) + 2; index += 1) {
    const x = wrap(index * 74 - cameraX * 0.42, width + 80) - 40;
    pixelRect(context, scene.buildingShadow, x, 354, 6, 76);
    pixelRect(context, scene.warning, x - 3, 348, 12, 6);
  }
}

function drawContainmentHorizon(context, scene, cameraX, width, elapsed) {
  pixelRect(context, scene.ridge, 0, 286, width, 144);
  pixelRect(context, scene.buildingShadow, 0, 214, width, 216, 0.92);
  drawIndustrialBuildings(context, scene, cameraX, width, 430, 0.12, "containment", elapsed);
  for (let index = 0; index < Math.ceil(width / 142) + 2; index += 1) {
    const x = wrap(index * 142 - cameraX * 0.25, width + 100) - 50;
    pixelRect(context, scene.buildingLight, x, 120, 12, 118, 0.76);
    pixelRect(context, scene.warning, x - 6, 114, 24, 9, 0.84);
  }
  pixelRect(context, scene.warning, 0, 376, width, 8, 0.92);
  for (let index = 0; index < Math.ceil(width / 48) + 2; index += 1) {
    pixelRect(context, scene.platformShadow, index * 48 - wrap(cameraX * 0.55, 48), 384, 24, 8, 0.86);
  }
}

function drawIndoorContainment(context, scene, cameraX, width) {
  pixelRect(context, scene.buildingShadow, 0, 0, width, 430);
  pixelRect(context, scene.building, 0, 64, width, 366);
  pixelRect(context, scene.buildingShadow, 0, 64, width, 16);
  pixelRect(context, scene.buildingShadow, 0, 344, width, 86);
  pixelRect(context, scene.buildingLight, 0, 78, width, 6);

  const windowSpan = width + 180;
  for (let index = 0; index < Math.ceil(width / 220) + 2; index += 1) {
    const x = wrap(index * 220 - cameraX * 0.29, windowSpan) - 90;
    pixelRect(context, scene.buildingShadow, x, 124, 164, 178);
    pixelRect(context, scene.buildingLight, x + 8, 132, 148, 112);
    pixelRect(context, scene.sky, x + 15, 139, 134, 98);
    pixelRect(context, scene.ridge, x + 21, 146, 122, 84);
    pixelRect(context, shiftColor(scene.mountain, -0.10), x + 21, 196, 122, 34);
    pixelRect(context, scene.buildingShadow, x + 77, 139, 9, 98);
    pixelRect(context, scene.buildingShadow, x + 15, 184, 134, 6);
    pixelRect(context, scene.window, x + 16, 249, 130, 9);
    pixelRect(context, scene.warning, x + 16, 266, 38, 6);
    pixelRect(context, scene.detail, x + 119, 266, 27, 6);
  }
  for (let index = 0; index < Math.ceil(width / 152) + 2; index += 1) {
    const x = wrap(index * 152 - cameraX * 0.18, width + 120) - 60;
    pixelRect(context, scene.window, x, 28, 68, 9, 0.86);
    pixelRect(context, scene.buildingLight, x + 8, 37, 52, 3);
  }
  pixelRect(context, scene.warning, 0, 396, width, 8);
  for (let index = 0; index < Math.ceil(width / 52) + 2; index += 1) {
    pixelRect(context, scene.platformShadow, index * 52 - wrap(cameraX * 0.35, 52), 396, 24, 8);
  }
}

function drawExtractionHorizon(context, scene, cameraX, width) {
  pixelRect(context, scene.ridge, 0, 310, width, 120);
  drawMountainRange(context, {
    cameraX, width, baseY: 421, height: 156, spacing: 310, parallax: 0.09,
    color: shiftColor(scene.mountain, -0.18), profile: MOUNTAIN_PROFILE_A
  });
  drawMountainRange(context, {
    cameraX, width, baseY: 425, height: 112, spacing: 270, parallax: 0.19,
    color: scene.mountain, snowColor: scene.snow, profile: MOUNTAIN_PROFILE_B
  });
  for (let index = 0; index < Math.ceil(width / 86) + 2; index += 1) {
    const x = wrap(index * 86 - cameraX * 0.30, width + 100) - 50;
    pixelRect(context, scene.buildingLight, x, 326, 6, 104, 0.82);
    pixelRect(context, scene.warning, x - 3, 321, 12, 6, 0.92);
  }

  const gateX = snap((width - 260) / 2);
  pixelRect(context, scene.buildingShadow, gateX - 12, 238, 284, 138);
  pixelRect(context, scene.building, gateX, 214, 260, 162);
  pixelRect(context, scene.buildingLight, gateX, 214, 260, 9);
  pixelRect(context, scene.buildingShadow, gateX + 46, 256, 168, 120);
  pixelRect(context, scene.ridge, gateX + 61, 267, 138, 109);
  pixelRect(context, scene.warning, gateX + 32, 198, 196, 9);
  pixelRect(context, scene.window, gateX + 56, 232, 148, 20);
  pixelRect(context, scene.buildingLight, 0, 390, width, 6);
  for (let index = 0; index < Math.ceil(width / 104) + 2; index += 1) {
    const x = wrap(index * 104 - cameraX * 0.50, width + 120) - 60;
    pixelRect(context, scene.window, x, 414, 42, 3, 0.68);
  }
}

function drawBiomeHorizon(context, scene, environment, cameraX, width, elapsed) {
  switch (environment) {
    case "coastal": drawCoastalHorizon(context, scene, cameraX, width); break;
    case "redwood": drawRedwoodHorizon(context, scene, cameraX, width); break;
    case "black-site": drawBlackSiteHorizon(context, scene, cameraX, width, elapsed); break;
    case "containment": drawContainmentHorizon(context, scene, cameraX, width, elapsed); break;
    case "rosa-containment": drawIndoorContainment(context, scene, cameraX, width); break;
    case "extraction": drawExtractionHorizon(context, scene, cameraX, width); break;
    default: pixelRect(context, scene.ridge, 0, 350, width, 80); break;
  }
}

function drawAtmosphericLighting(context, scene, environment, width, height, elapsed) {
  const tint = environment === "extraction"
    ? scene.sunShade
    : environment === "redwood"
      ? scene.tree
      : environment === "black-site" || environment === "containment"
        ? scene.buildingShadow : scene.cloud;
  pixelRect(context, tint, 0, 0, width, height, environment === "rosa-containment" ? 0.08 : 0.045);

  if (environment === "extraction") {
    pixelRect(context, scene.sunShade, 0, 230, width, 90, 0.13);
    pixelRect(context, scene.sun, 0, 310, width, 55, 0.10);
    pixelRect(context, shiftColor(scene.sky, -0.22), 0, 0, width, 72, 0.08);
  } else if (environment === "coastal") {
    pixelRect(context, scene.cloud, 0, 320, width, 72, 0.11);
  } else if (environment === "redwood") {
    pixelRect(context, scene.tree, 0, 330, width, 96, 0.09);
    pixelRect(context, shiftColor(scene.sky, -0.20), 0, 0, width, 66, 0.08);
  } else if (environment === "black-site") {
    pixelRect(context, scene.sunShade, 0, 315, width, 110, 0.10);
    pixelRect(context, "#172126", 0, 0, width, height, 0.07);
  } else if (environment === "containment") {
    pixelRect(context, scene.warning, 0, 300, width, 100, 0.045);
  } else {
    pixelRect(context, scene.buildingLight, 0, 0, width, 72, 0.08);
  }
  const pulse = 0.025 + (Math.sin(elapsed * 0.42) + 1) * 0.008;
  pixelRect(context, scene.cloud, 0, 0, width, 18, pulse);
}

export class AtmosphereRenderer {
  constructor({ pixelScale = ATMOSPHERE_PIXEL_SCALE, createCanvas = createLayerCanvas } = {}) {
    if (!Number.isInteger(pixelScale) || pixelScale < 1) {
      throw new RangeError("Atmosphere pixelScale must be a positive integer.");
    }
    this.pixelScale = pixelScale;
    this.width = 0;
    this.height = 0;
    this.layers = ATMOSPHERE_LAYER_NAMES.map((name) => {
      const canvas = createCanvas();
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) throw new Error("Unable to create a 2D atmosphere layer: " + name);
      return { name, canvas, context };
    });
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

  draw(targetContext, {
    scene,
    environment,
    cameraX = 0,
    viewportWidth = targetContext?.canvas?.width ?? 960,
    viewportHeight = targetContext?.canvas?.height ?? 540,
    elapsed = 0
  } = {}) {
    if (!targetContext || !scene) return;
    const width = Math.max(1, Math.ceil(viewportWidth));
    const height = Math.max(1, Math.ceil(viewportHeight));
    this.resize(width, height);
    for (const layer of this.layers) {
      layer.context.setTransform(1 / this.pixelScale, 0, 0, 1 / this.pixelScale, 0, 0);
      layer.context.globalAlpha = 1;
      layer.context.clearRect(0, 0, width, height);
    }

    const layerByName = Object.fromEntries(this.layers.map((layer) => [layer.name, layer]));
    drawSky(layerByName.sky.context, scene, width, height, environment);
    drawCelestialLayer(layerByName.celestial.context, scene, environment, cameraX, width);
    drawBiomeHorizon(layerByName.horizon.context, scene, environment, cameraX, width, elapsed);
    drawAtmosphericLighting(layerByName.lighting.context, scene, environment, width, height, elapsed);

    for (const layer of this.layers) {
      targetContext.save();
      targetContext.imageSmoothingEnabled = false;
      targetContext.globalAlpha = 1;
      targetContext.drawImage(layer.canvas, 0, 0, width, height);
      targetContext.restore();
    }
  }
}
