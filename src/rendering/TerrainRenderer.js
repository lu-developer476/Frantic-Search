import { fillTiled, imageSize, sharedEnvironmentAssets, terrainTheme, themeSpecs } from "./EnvironmentAssets.js";

// Terreno armado exclusivamente con los tilesets predeterminados del proyecto
// (public/environment/**). No hay formas, texturas ni ruido generados por código:
// cada plataforma se rellena repitiendo recortes ya preparados y cacheados.

const RAISED_KINDS_WITHOUT_BODY = new Set(["rock-ledge"]);

export class TerrainRenderer {
  constructor({ assets = sharedEnvironmentAssets() } = {}) {
    this.assets = assets;
  }

  theme(scene) {
    const theme = terrainTheme(scene?.environment);
    this.assets.preload(themeSpecs(theme));
    return theme;
  }

  drawPlatforms(context, {
    platforms = [],
    cameraX = 0,
    viewportWidth = context?.canvas?.width ?? 960,
    scene
  } = {}) {
    if (!context || !scene || platforms.length === 0) return false;
    const theme = this.theme(scene);
    const body = this.assets.get(theme.body);
    const cap = this.assets.get(theme.cap);
    const capShade = theme.capShade ? this.assets.get(theme.capShade) : null;
    if (!body && !cap) return false;

    const visibleLeft = Math.round(cameraX) - 2;
    const visibleRight = Math.round(cameraX) + viewportWidth + 2;
    const view = { visibleLeft, visibleRight };
    context.save();
    context.imageSmoothingEnabled = false;
    this.drawPitBand(context, platforms, body, view, viewportWidth, context.canvas?.height ?? 540);
    for (const platform of platforms) {
      if (RAISED_KINDS_WITHOUT_BODY.has(platform.kind)) continue;
      if (platform.x + platform.w < visibleLeft || platform.x > visibleRight) continue;
      if (theme.kind === "outdoor") {
        if (body) fillTiled(context, body, platform.x, platform.y, platform.w, platform.h, view);
        if (cap) {
          const capHeight = imageSize(cap)[1];
          fillTiled(context, cap, platform.x, platform.y, platform.w, Math.min(capHeight, platform.h), view);
          if (capShade && platform.h > capHeight) {
            const shadeHeight = Math.min(imageSize(capShade)[1], platform.h - capHeight);
            fillTiled(context, capShade, platform.x, platform.y + capHeight, platform.w, shadeHeight, view);
          }
        }
      } else {
        const capHeight = cap ? Math.min(imageSize(cap)[1], platform.h) : 0;
        if (cap) fillTiled(context, cap, platform.x, platform.y, platform.w, capHeight, view);
        if (body && platform.h > capHeight) {
          fillTiled(context, body, platform.x, platform.y + capHeight, platform.w, platform.h - capHeight, view);
        }
      }
    }
    context.restore();
    return true;
  }

  // Los fosos del suelo muestran la misma textura de tierra del proyecto, oscurecida,
  // en lugar de dejar ver el cielo. Se omite cuando el suelo cubre toda la vista.
  drawPitBand(context, platforms, body, view, viewportWidth, viewportHeight) {
    if (!body) return;
    const floors = platforms.filter((platform) => platform.kind === "ground");
    if (floors.length === 0) return;
    const covered = floors.some((floor) => floor.x <= view.visibleLeft && floor.x + floor.w >= view.visibleRight);
    if (covered) return;
    const top = Math.min(...floors.map((floor) => floor.y));
    const height = Math.max(0, viewportHeight - top);
    if (height <= 0) return;
    const width = view.visibleRight - view.visibleLeft;
    fillTiled(context, body, view.visibleLeft, top, width, height, view);
    context.globalAlpha = 0.6;
    context.fillStyle = "#000";
    context.fillRect(view.visibleLeft, top, width, height);
    context.globalAlpha = 1;
  }

  drawRockFormations(context, {
    obstacles = [],
    cameraX = 0,
    viewportWidth = context?.canvas?.width ?? 960,
    scene
  } = {}) {
    if (!context || !scene || obstacles.length === 0) return false;
    const theme = this.theme(scene);
    const rock = this.assets.get(theme.rock);
    if (!rock) return false;
    const capShade = theme.capShade ? this.assets.get(theme.capShade) : null;
    const visibleLeft = Math.round(cameraX) - 2;
    const visibleRight = Math.round(cameraX) + viewportWidth + 2;
    const view = { visibleLeft, visibleRight };
    context.save();
    context.imageSmoothingEnabled = false;
    for (const obstacle of obstacles) {
      if (obstacle.type !== "rock") continue;
      fillTiled(context, rock, obstacle.x, obstacle.y, obstacle.w, obstacle.h, view);
      if (capShade) {
        fillTiled(context, capShade, obstacle.x, obstacle.y, obstacle.w, Math.min(imageSize(capShade)[1], obstacle.h), view);
      }
    }
    context.restore();
    return true;
  }

  // Franja de matas/pasto de las capas de parallax del proyecto sobre la línea de suelo.
  drawGroundCover(context, {
    cameraX = 0,
    viewportWidth = context?.canvas?.width ?? 960,
    groundY = 430,
    scene
  } = {}) {
    if (!context || !scene) return false;
    const theme = this.theme(scene);
    let drawn = false;
    context.save();
    context.imageSmoothingEnabled = false;
    theme.cover.forEach((spec, index) => {
      const image = this.assets.get(spec);
      if (!image) return;
      const [width, height] = imageSize(image);
      const offset = index * Math.round(width / 2);
      const left = Math.round(cameraX);
      const start = Math.floor((left - offset) / width) * width + offset;
      for (let x = start; x < left + viewportWidth; x += width) {
        context.drawImage(image, x, groundY - height + 15);
      }
      drawn = true;
    });
    context.restore();
    return drawn;
  }
}
