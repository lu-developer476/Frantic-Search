import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  MINIGAME_ENVIRONMENT_SCENES,
  MinigameEnvironmentRenderer
} from "../src/minigames/MinigameEnvironment.js";

test("mini-game scenes keep prairie racing and forest night environments", () => {
  assert.equal(MINIGAME_ENVIRONMENT_SCENES.race.environment, "prairie");
  assert.equal(MINIGAME_ENVIRONMENT_SCENES.race.name, "LONG-DISTANCE RACE");
  assert.equal(MINIGAME_ENVIRONMENT_SCENES.persecution.environment, "prairie");
  assert.equal(MINIGAME_ENVIRONMENT_SCENES.hunting.environment, "forest");
  assert.equal(MINIGAME_ENVIRONMENT_SCENES.ambush.environment, "forest");
  assert.equal(MINIGAME_ENVIRONMENT_SCENES.combats.environment, "forest");
  assert.equal(MINIGAME_ENVIRONMENT_SCENES.hunting.sky, "#10131b");
  for (const key of ["sun", "sunShade", "cloud", "cloudShadow", "moon", "moonShade"]) {
    assert.equal(MINIGAME_ENVIRONMENT_SCENES.hunting[key], null, key);
  }
  assert.equal(MINIGAME_ENVIRONMENT_SCENES.ambush.sky, "#10131b");
  assert.equal(MINIGAME_ENVIRONMENT_SCENES.combats.sky, "#10131b");
  assert.ok(MINIGAME_ENVIRONMENT_SCENES.persecution.sky);
  assert.ok(MINIGAME_ENVIRONMENT_SCENES.hunting.tree);
  assert.ok(MINIGAME_ENVIRONMENT_SCENES.ambush.platformTop);
});

test("mini-game environment composes sky, parallax, tiled terrain and dash dust from project assets", async () => {
  const source = await readFile(new URL("../src/minigames/MinigameEnvironment.js", import.meta.url), "utf8");
  for (const renderer of ["AtmosphereRenderer", "TerrainRenderer", "EnvironmentalEffectsRenderer"]) {
    assert.match(source, new RegExp(renderer));
  }
  assert.match(source, /atmosphere\.draw\(targetContext/);
  assert.match(source, /terrain\.drawPlatforms\(targetContext/);
  assert.match(source, /terrain\.drawGroundCover\(targetContext/);
  assert.doesNotMatch(source, /Vegetation|SceneryGenerator|generateSectionScenery|drawWind|drawWeather/);
});

test("all mini-games delegate their environment backgrounds to the shared renderer", async () => {
  const paths = [
    "../src/minigames/Persecution.js",
    "../src/minigames/Hunting.js",
    "../src/minigames/Ambush.js",
    "../src/minigames/Race.js",
    "../src/minigames/Combats.js"
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
  assert.match(sources[4], /new MinigameEnvironmentRenderer\(/);
  assert.match(sources[4], /this\.environmentRenderer\.draw\(this\.ctx/);
  assert.match(sources[4], /MINIGAME_ENVIRONMENT_SCENES\.combats/);
});

test("prairie and every other biome get terrain and parallax from project art", async () => {
  const { TERRAIN_THEMES } = await import("../src/rendering/EnvironmentAssets.js");
  const { PARALLAX_LAYERS } = await import("../src/rendering/ImageParallax.js");
  assert.ok(TERRAIN_THEMES.prairie);
  assert.ok(PARALLAX_LAYERS.prairie.length > 0);
  assert.ok(TERRAIN_THEMES.forest);
  assert.ok(PARALLAX_LAYERS.forest.length > 0);
});

test("ground coverage extends forward and behind the world origin without generating props", () => {
  const renderer = new MinigameEnvironmentRenderer({
    scene: MINIGAME_ENVIRONMENT_SCENES.persecution,
    groundY: 438,
    sectionLength: 1600,
    sectionCount: 1
  });
  const initialLength = renderer.worldLength;
  renderer.ensureCoverage(initialLength + 900, 960);
  assert.ok(renderer.worldLength > initialLength + 900);
  renderer.ensureCoverage(-1750, 960);
  assert.ok(renderer.worldStart <= -1750);
  assert.equal(renderer.scenery, undefined, "no procedural scenery is generated");
});

test("the mini-game terrain is composited with the camera transform", () => {
  const renderer = new MinigameEnvironmentRenderer({
    scene: MINIGAME_ENVIRONMENT_SCENES.persecution,
    groundY: 438,
    sectionLength: 1600,
    sectionCount: 2
  });
  for (const cameraX of [420.4, -255.6]) {
    let translationX = 0;
    const stack = [];
    const calls = [];
    const context = {
      canvas: { width: 960, height: 540 },
      save() { stack.push(translationX); },
      restore() { translationX = stack.pop(); },
      translate(x, y) { assert.equal(y, 0); translationX += x; }
    };
    const record = (name) => calls.push({ name, translationX });
    renderer.atmosphere = { draw() { record("atmosphere"); } };
    renderer.terrain = {
      drawPlatforms() { record("platforms"); },
      drawGroundCover() { record("cover"); }
    };
    renderer.effects = { drawDust() { record("dust"); } };
    const midground = [];
    assert.equal(renderer.draw(context, { cameraX, drawMidground() { midground.push(translationX); } }), true);
    const offset = Math.round(cameraX);
    for (const call of calls) {
      assert.equal(call.translationX, call.name === "atmosphere" ? 0 : -offset, call.name);
    }
    assert.deepEqual(midground, [0]);
    assert.equal(translationX, 0);
  }
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


test("minigames that defer rendering wait until opened", async () => {
  const paths = [
    "../src/minigames/Persecution.js",
    "../src/minigames/Hunting.js",
    "../src/minigames/Ambush.js",
    "../src/minigames/Combats.js"
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
