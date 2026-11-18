import { LEVELS } from "../config/GameConfig.js";
import { AtmosphereRenderer } from "../rendering/AtmosphereRenderer.js";
import { EnvironmentalEffectsRenderer } from "../rendering/EnvironmentalEffectsRenderer.js";
import { generateSectionScenery } from "../world/SceneryGenerator.js";
import { TerrainRenderer } from "../rendering/TerrainRenderer.js";
import { VegetationRenderer } from "../rendering/VegetationRenderer.js";

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

export const MINIGAME_ENVIRONMENT_SCENES = Object.freeze({
  emptyStomach: PRAIRIE_SCENE,
  timeAttack: LEVELS[1],
  survival: LEVELS[1]
});

function canCreateLayerCanvases() {
  return typeof OffscreenCanvas === "function" ||
    (typeof document !== "undefined" && typeof document.createElement === "function");
}

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
    this.worldLength = this.sectionLength * this.sectionCount;

    this.scenery = [];
    for (let sectionIndex = 0; sectionIndex < this.sectionCount; sectionIndex += 1) {
      this.scenery.push(...generateSectionScenery({
        seed,
        sectionIndex,
        sectionStart: sectionIndex * this.sectionLength,
        sectionLength: this.sectionLength,
        groundY: this.groundY,
        environment: this.scene.environment
      }));
    }

    this.ready = false;
    if (!canCreateLayerCanvases()) return;

    try {
      this.atmosphere = new AtmosphereRenderer();
      this.vegetation = new VegetationRenderer();
      this.terrain = new TerrainRenderer();
      this.effects = new EnvironmentalEffectsRenderer();
      this.ready = true;
    } catch (error) {
      // Keep menu/game startup resilient when layered canvas allocation is unavailable.
      console.warn("[MinigameEnvironmentRenderer] Layered environment unavailable:", error);
    }
  }

  ensureCoverage(cameraX = 0, viewportWidth = 960) {
    const requiredEnd = Math.max(0, cameraX) + Math.max(1, viewportWidth) + this.sectionLength;
    while (this.worldLength < requiredEnd) {
      const sectionIndex = this.sectionCount;
      this.scenery.push(...generateSectionScenery({
        seed: this.seed,
        sectionIndex,
        sectionStart: this.worldLength,
        sectionLength: this.sectionLength,
        groundY: this.groundY,
        environment: this.scene.environment
      }));
      this.sectionCount += 1;
      this.worldLength += this.sectionLength;
    }
  }

  draw(targetContext, {
    cameraX = 0,
    viewportWidth = targetContext?.canvas?.width ?? 960,
    viewportHeight = targetContext?.canvas?.height ?? 540,
    elapsed = 0,
    drawMidground = null
  } = {}) {
    if (!this.ready || !targetContext) return false;

    try {

    const width = Math.max(1, Math.ceil(viewportWidth));
    const height = Math.max(1, Math.ceil(viewportHeight));
    this.ensureCoverage(cameraX, width);
    const ground = {
      id: "minigame-ground",
      kind: "ground",
      x: 0,
      y: this.groundY,
      w: this.worldLength,
      h: Math.max(1, height - this.groundY)
    };
    const environment = this.scene.environment;

    // Match campaign compositing: atmosphere, parallax scenery, ambient motes,
    // layered ground, cover, and environmental movement.
    this.atmosphere.draw(targetContext, {
      scene: this.scene, environment, cameraX,
      viewportWidth: width, viewportHeight: height, elapsed
    });
    this.vegetation.drawBackground(targetContext, {
      props: this.scenery, cameraX,
      viewportWidth: width, viewportHeight: height, scene: this.scene
    });
    this.effects.drawAmbientBack(targetContext, {
      environment, cameraX,
      viewportWidth: width, viewportHeight: height, elapsed
    });
    this.terrain.drawBackdrop(targetContext, {
      cameraX, viewportWidth: width, viewportHeight: height,
      groundY: this.groundY, scene: this.scene
    });

    if (typeof drawMidground === "function") drawMidground(targetContext);

    this.terrain.drawPlatforms(targetContext, {
      platforms: [ground], cameraX,
      viewportWidth: width, viewportHeight: height, scene: this.scene
    });
    this.vegetation.drawGround(targetContext, {
      props: this.scenery, cameraX,
      viewportWidth: width, viewportHeight: height, scene: this.scene
    });
    this.effects.drawWind(targetContext, {
      environment, cameraX,
      viewportWidth: width, viewportHeight: height, elapsed
    });
    this.effects.drawWeather(targetContext, {
      environment, cameraX,
      viewportWidth: width, viewportHeight: height, elapsed
    });
    this.effects.drawDust(targetContext, {
      environment, cameraX,
      viewportWidth: width, viewportHeight: height, elapsed
    });
      return true;
    } catch (error) {
      this.ready = false;
      console.warn("[MinigameEnvironmentRenderer] Layered render failed; using native fallback:", error);
      return false;
    }
  }
}
