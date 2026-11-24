import { LEVELS } from "../config/GameConfig.js";
import { AtmosphereRenderer } from "../rendering/AtmosphereRenderer.js";
import { ImageParallax } from "../rendering/ImageParallax.js";
import { EnvironmentalEffectsRenderer } from "../rendering/EnvironmentalEffectsRenderer.js";
import { TerrainRenderer } from "../rendering/TerrainRenderer.js";

const PRAIRIE_SCENE = Object.freeze({
  ...LEVELS[0],
  name: "OPEN PRAIRIE",
  sky: "#78c9df",
  ground: "#88a34d",
  environment: "prairie",
  sun: "#ffe38b",
  sunShade: "#e8b66c",
  cloud: "#f7f0d3",
  cloudShadow: "#b5c9a0",
  mountain: "#b6c98c",
  snow: "#e8e5b2",
  ridge: "#789b61",
  treeTrunk: "#775b39",
  tree: "#568c43",
  treeLight: "#8eb65c",
  grass: "#8bbd4d",
  soil: "#87613d",
  under: "#59432f",
  detail: "#b3a05b",
  rock: "#baa175",
  platform: "#795b3d",
  platformTop: "#a6b764",
  platformShadow: "#4c3c2d"
});

const RACE_SCENE = Object.freeze({
  ...PRAIRIE_SCENE,
  name: "LONG-DISTANCE RACE",
  sky: "#73c7df",
  ground: "#8ba64c",
  mountain: "#a9c28a",
  ridge: "#73965a"
});

const FOREST_SCENE = Object.freeze({
  ...LEVELS[1],
  name: "FOREST ARENA",
  subtitle: "A wooded arena for close dinosaur encounters.",
  sky: "#70877a",
  ground: "#865638",
  environment: "forest",
  soil: "#865638",
  grass: "#47734b",
  detail: "#8b9a58",
  platform: "#6b7650",
  platformTop: "#b3b56b",
  platformShadow: "#354a36"
});

export const MINIGAME_ENVIRONMENT_SCENES = Object.freeze({
  race: RACE_SCENE,
  persecution: PRAIRIE_SCENE,
  hunting: FOREST_SCENE,
  ambush: FOREST_SCENE,
  combats: FOREST_SCENE
});

let parallaxInstance = null;
function sharedParallax() {
  // Una sola caché de imágenes para todos los minijuegos.
  if (!parallaxInstance) parallaxInstance = new ImageParallax();
  return parallaxInstance;
}

// Fondo de los minijuegos: cielo + parallax + terreno con los assets predeterminados
// del proyecto. No genera escenografía; el suelo se extiende repitiendo tiles.
export class MinigameEnvironmentRenderer {
  constructor({
    scene,
    groundY = 438,
    seed = 1,
    sectionLength = 6200,
    sectionCount = 1
  } = {}) {
    if (!scene) throw new TypeError("A mini-game environment scene is required.");
    this.scene = scene;
    this.groundY = groundY;
    this.seed = seed;
    this.sectionLength = Math.max(1000, Math.round(sectionLength));
    this.sectionCount = Math.max(1, Math.floor(sectionCount));
    this.worldStart = 0;
    this.worldLength = this.sectionLength * this.sectionCount;
    this.ready = true;
    this.atmosphere = new AtmosphereRenderer({ parallax: sharedParallax() });
    this.terrain = new TerrainRenderer();
    this.effects = new EnvironmentalEffectsRenderer();
  }

  ensureCoverage(cameraX = 0, viewportWidth = 960) {
    while (this.worldStart > Math.min(0, cameraX)) this.worldStart -= this.sectionLength;
    const requiredEnd = Math.max(0, cameraX) + Math.max(1, viewportWidth) + this.sectionLength;
    while (this.worldLength < requiredEnd) {
      this.sectionCount += 1;
      this.worldLength += this.sectionLength;
    }
  }

  draw(targetContext, {
    cameraX = 0,
    viewportWidth = targetContext?.canvas?.width ?? 960,
    viewportHeight = targetContext?.canvas?.height ?? 540,
    elapsed = 0,
    drawMidground = null,
    dustClouds = []
  } = {}) {
    if (!this.ready || !targetContext) return false;
    try {
      const width = Math.max(1, Math.ceil(viewportWidth));
      const height = Math.max(1, Math.ceil(viewportHeight));
      this.ensureCoverage(cameraX, width);
      const ground = {
        id: "minigame-ground",
        kind: "ground",
        x: this.worldStart,
        y: this.groundY,
        w: this.worldLength - this.worldStart,
        h: Math.max(1, height - this.groundY)
      };

      this.atmosphere.draw(targetContext, {
        scene: this.scene, environment: this.scene.environment, cameraX,
        viewportWidth: width, viewportHeight: height, groundY: this.groundY
      });
      if (typeof drawMidground === "function") drawMidground(targetContext);

      // El terreno está en coordenadas de mundo; el canvas del minijuego no está
      // trasladado por quien llama, así que se aplica la cámara solo aquí.
      targetContext.save();
      try {
        targetContext.translate(-Math.round(cameraX), 0);
        this.terrain.drawPlatforms(targetContext, {
          platforms: [ground], cameraX, viewportWidth: width, scene: this.scene
        });
        this.terrain.drawGroundCover(targetContext, {
          cameraX, viewportWidth: width, groundY: this.groundY, scene: this.scene
        });
        this.effects.drawDust(targetContext, { dustClouds });
      } finally {
        targetContext.restore();
      }
      return true;
    } catch (error) {
      this.ready = false;
      console.warn("[MinigameEnvironmentRenderer] Environment render failed; using native fallback:", error);
      return false;
    }
  }
}
