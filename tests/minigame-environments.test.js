import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  MINIGAME_ENVIRONMENT_SCENES,
  MinigameEnvironmentRenderer
} from "../src/minigames/MinigameEnvironment.js";

test("mini-game scenes keep distinct prairie and Redwood identities with campaign palettes", () => {
  assert.equal(MINIGAME_ENVIRONMENT_SCENES.race.environment, "prairie");
  assert.equal(MINIGAME_ENVIRONMENT_SCENES.race.name, "LONG-DISTANCE RACE");
  assert.equal(MINIGAME_ENVIRONMENT_SCENES.persecution.environment, "prairie");
  assert.equal(MINIGAME_ENVIRONMENT_SCENES.hunting.environment, "redwood");
  assert.equal(MINIGAME_ENVIRONMENT_SCENES.ambush.environment, "redwood");
  assert.ok(MINIGAME_ENVIRONMENT_SCENES.persecution.sky);
  assert.ok(MINIGAME_ENVIRONMENT_SCENES.hunting.tree);
  assert.ok(MINIGAME_ENVIRONMENT_SCENES.ambush.platformTop);
});

test("layered mini-game environment composes campaign atmosphere, scenery, terrain and effects", async () => {
  const source = await readFile(new URL("../src/minigames/MinigameEnvironment.js", import.meta.url), "utf8");
  for (const renderer of [
    "AtmosphereRenderer",
    "VegetationRenderer",
    "TerrainRenderer",
    "EnvironmentalEffectsRenderer"
  ]) assert.match(source, new RegExp(renderer));
  assert.match(source, /atmosphere\.draw\(targetContext/);
  assert.match(source, /vegetation\.drawBackground\(targetContext/);
  assert.match(source, /terrain\.drawBackdrop\(targetContext/);
  assert.match(source, /terrain\.drawPlatforms\(targetContext/);
  assert.match(source, /vegetation\.drawGround\(targetContext/);
  assert.match(source, /effects\.drawWind\(targetContext/);
  assert.match(source, /effects\.drawWeather\(targetContext/);
});

test("all mini-games delegate their environment backgrounds to the shared renderer", async () => {
  const paths = [
    "../src/minigames/Persecution.js",
    "../src/minigames/Hunting.js",
    "../src/minigames/Ambush.js",
    "../src/minigames/Race.js"
  ];
  const sources = await Promise.all(paths.map(path =>
    readFile(new URL(path, import.meta.url), "utf8")
  ));
  for (const source of sources.slice(0, 3)) {
    assert.match(source, /new MinigameEnvironmentRenderer\(/);
    assert.match(source, /environmentRenderer\?\.draw\(ctx/);
    assert.match(source, /MINIGAME_ENVIRONMENT_SCENES\./);
  }
  assert.match(sources[3], /new MinigameEnvironmentRenderer\(/);
  assert.match(sources[3], /cameraX: this\.cameraX/);
  assert.match(sources[3], /MINIGAME_ENVIRONMENT_SCENES\.race/);
});

test("prairie is a first-class atmosphere, vegetation and ambient-effects biome", async () => {
  const paths = [
    "../src/rendering/AtmosphereRenderer.js",
    "../src/world/SceneryGenerator.js",
    "../src/rendering/EnvironmentalEffectsRenderer.js"
  ];
  const sources = await Promise.all(paths.map(path =>
    readFile(new URL(path, import.meta.url), "utf8")
  ));
  assert.match(sources[0], /case "prairie": drawPrairieHorizon/);
  assert.match(sources[1], /prairie:\s*\{/);
  assert.match(sources[2], /prairie:\s*\{/);
});

test("procedural environment coverage extends the ground and scenery for long-running modes", () => {
  const renderer = new MinigameEnvironmentRenderer({
    scene: MINIGAME_ENVIRONMENT_SCENES.persecution,
    groundY: 438,
    seed: 41,
    sectionLength: 1600,
    sectionCount: 1
  });
  const initialLength = renderer.worldLength;
  renderer.ensureCoverage(initialLength + 900, 960);
  assert.ok(renderer.worldLength > initialLength + 900);
  assert.ok(renderer.scenery.some(prop => prop.x >= initialLength));
});

test("layer allocation failure safely falls back to native mini-game drawing", () => {
  const renderer = new MinigameEnvironmentRenderer({
    scene: MINIGAME_ENVIRONMENT_SCENES.persecution,
    groundY: 438,
    sectionLength: 6200
  });
  if (typeof OffscreenCanvas !== "function" &&
      !(typeof document !== "undefined" && typeof document.createElement === "function")) {
    assert.equal(renderer.draw({ canvas: { width: 960, height: 540 } }), false);
  }
});


test("hidden minigames do not render during application bootstrap", async () => {
  const paths = [
    "../src/minigames/Persecution.js",
    "../src/minigames/Hunting.js",
    "../src/minigames/Ambush.js",
    "../src/minigames/Race.js"
  ];
  for (const path of paths) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    const constructorStart = source.indexOf("  constructor(root");
    const constructorEnd = source.indexOf("\n  text(", constructorStart);
    assert.ok(constructorStart >= 0 && constructorEnd > constructorStart);
    const constructor = source.slice(constructorStart, constructorEnd);
    assert.equal(constructor.includes("this.render();"), false, path + " must defer its first frame until opened");

    const localeStart = source.indexOf("  setLocale(locale) {");
    const nextMethod = source.slice(localeStart + 4).search(/\n  [A-Za-z_$][\w$]*\s*\(/);
    assert.ok(localeStart >= 0 && nextMethod > 0);
    const localeHandler = source.slice(localeStart, localeStart + 4 + nextMethod);
    assert.ok(localeHandler.includes('this.root.classList.contains("active")'));
    assert.ok(localeHandler.includes("this.render();"));

    const openStart = source.indexOf("  open() {");
    const openNext = source.slice(openStart + 4).search(/\n  [A-Za-z_$][\w$]*\s*\(/);
    assert.ok(openStart >= 0 && openNext > 0);
    const openHandler = source.slice(openStart, openStart + 4 + openNext);
    assert.ok(openHandler.includes('this.root.classList.add("active")'));
    assert.ok(openHandler.includes("this.render()"), path + " must render when opened");
  }
});

test("a layered environment rendering error falls back without breaking the minigame", () => {
  const renderer = new MinigameEnvironmentRenderer({
    scene: MINIGAME_ENVIRONMENT_SCENES.persecution,
    groundY: 438,
    seed: 17,
    sectionLength: 1200,
    sectionCount: 1
  });
  renderer.ready = true;
  renderer.atmosphere = {
    draw() { throw new Error("simulated canvas failure"); }
  };
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(renderer.draw({ canvas: { width: 960, height: 540 } }), false);
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(renderer.ready, false);
});
