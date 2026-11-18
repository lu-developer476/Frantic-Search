import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  TERRAIN_LAYER_NAMES,
  TERRAIN_PIXEL_SCALE,
  TerrainRenderer
} from "../src/rendering/TerrainRenderer.js";

function createRecordingContext(canvas = null) {
  const calls = [];
  const context = {
    canvas,
    calls,
    imageSmoothingEnabled: true,
    globalAlpha: 1,
    fillStyle: "",
    save() { calls.push(["save"]); },
    restore() { calls.push(["restore"]); },
    setTransform(...args) { calls.push(["setTransform", ...args]); },
    translate(...args) { calls.push(["translate", ...args]); },
    clearRect(...args) { calls.push(["clearRect", ...args]); },
    fillRect(...args) { calls.push(["fillRect", ...args]); },
    drawImage(...args) { calls.push(["drawImage", ...args]); },
    beginPath() { calls.push(["beginPath"]); },
    moveTo(...args) { calls.push(["moveTo", ...args]); },
    lineTo(...args) { calls.push(["lineTo", ...args]); },
    closePath() { calls.push(["closePath"]); },
    fill() { calls.push(["fill"]); }
  };
  return context;
}

function createCanvasFactory() {
  const canvases = [];
  return {
    canvases,
    createCanvas() {
      const canvas = { width: 1, height: 1 };
      const context = createRecordingContext(canvas);
      canvas.getContext = () => context;
      canvas.context = context;
      canvases.push(canvas);
      return canvas;
    }
  };
}

function createTarget() {
  const canvas = { width: 960, height: 540 };
  return createRecordingContext(canvas);
}

const scene = {
  under: "#49352d",
  soil: "#6e4a38",
  grass: "#80724c",
  detail: "#a28a58",
  rock: "#b7a07a",
  platform: "#60544a",
  platformTop: "#a18b65",
  platformShadow: "#383531",
  treeLight: "#7b7952"
};

test("terrain rendering is split into independent pixel-art layers", () => {
  const factory = createCanvasFactory();
  const renderer = new TerrainRenderer({ createCanvas: factory.createCanvas });

  assert.deepEqual(TERRAIN_LAYER_NAMES, ["backdrop", "foundation", "surface", "details", "formations"]);
  assert.equal(TERRAIN_PIXEL_SCALE, 3);
  assert.equal(factory.canvases.length, TERRAIN_LAYER_NAMES.length);
  assert.deepEqual(renderer.layers.map((layer) => layer.name), TERRAIN_LAYER_NAMES);
  assert.equal(new Set(renderer.layers.map((layer) => layer.canvas)).size, TERRAIN_LAYER_NAMES.length);
});

test("backdrop uses biome ground colors and composites without smoothing", () => {
  const factory = createCanvasFactory();
  const renderer = new TerrainRenderer({ createCanvas: factory.createCanvas });
  const target = createTarget();

  renderer.drawBackdrop(target, {
    cameraX: 240,
    viewportWidth: 960,
    viewportHeight: 540,
    groundY: 430,
    scene
  });

  const backdrop = renderer.layerByName.backdrop;
  assert.ok(backdrop.context.calls.some((call) => call[0] === "fillRect" && call[1] === 0 && call[2] === 430));
  assert.ok(backdrop.context.calls.some((call) => call[0] === "fillRect" && call[1] === 0 && call[4] === 3));
  assert.equal(target.calls.filter((call) => call[0] === "drawImage").length, 1);
  assert.equal(target.imageSmoothingEnabled, false);
  assert.equal(backdrop.canvas.width, 320);
  assert.equal(backdrop.canvas.height, 180);
});

test("ground, ledges, boss shelves and bridges render in layers without mutating platform geometry", () => {
  const factory = createCanvasFactory();
  const renderer = new TerrainRenderer({ createCanvas: factory.createCanvas });
  const target = createTarget();
  const platforms = [
    { id: "ground", kind: "ground", x: 0, y: 430, w: 730, h: 110 },
    { id: "ledge", kind: "ledge", x: 400, y: 330, w: 190, h: 18 },
    { id: "boss", kind: "boss-platform", x: 760, y: 300, w: 210, h: 18 },
    { id: "rock-shelf", kind: "rock-ledge", x: 1040, y: 354, w: 62, h: 14 },
    { id: "bridge", kind: "ally-bridge", x: 1120, y: 430, w: 220, h: 18 }
  ];
  const original = structuredClone(platforms);

  renderer.drawPlatforms(target, {
    platforms,
    cameraX: 180,
    viewportWidth: 960,
    viewportHeight: 540,
    scene
  });

  assert.deepEqual(platforms, original);
  assert.equal(target.calls.filter((call) => call[0] === "drawImage").length, 3);
  for (const layerName of ["foundation", "surface", "details"]) {
    assert.ok(renderer.layerByName[layerName].context.calls.some((call) => call[0] === "fillRect" || call[0] === "beginPath"));
  }
  const composites = target.calls.filter((call) => call[0] === "drawImage");
  assert.ok(composites.every((call) => call[2] === 180));
  assert.ok(renderer.layerByName.foundation.context.calls.some((call) => call[0] === "translate" && call[1] === -180));
});

test("rock formations are pixel-rasterized separately and preserve obstacle bounds", () => {
  const factory = createCanvasFactory();
  const renderer = new TerrainRenderer({ createCanvas: factory.createCanvas });
  const target = createTarget();
  const rocks = [
    { type: "rock", x: 340, y: 358, w: 112, h: 72 },
    { type: "rock", x: 760, y: 346, w: 128, h: 84 }
  ];
  const original = structuredClone(rocks);

  renderer.drawRockFormations(target, {
    obstacles: rocks,
    cameraX: 90,
    viewportWidth: 960,
    viewportHeight: 540,
    scene
  });

  assert.deepEqual(rocks, original);
  assert.equal(target.calls.filter((call) => call[0] === "drawImage").length, 1);
  assert.ok(renderer.layerByName.formations.context.calls.filter((call) => call[0] === "fill").length >= 4);
  assert.ok(target.calls.some((call) => call[0] === "drawImage" && call[2] === 90));
});

test("empty platform and rock lists do not clear or composite reusable layers", () => {
  const factory = createCanvasFactory();
  const renderer = new TerrainRenderer({ createCanvas: factory.createCanvas });
  const target = createTarget();

  renderer.drawPlatforms(target, { platforms: [], scene });
  renderer.drawRockFormations(target, { obstacles: [], scene });

  assert.equal(target.calls.filter((call) => call[0] === "drawImage").length, 0);
});

test("terrain renderer resizes each layer and rejects invalid pixel scales", () => {
  const factory = createCanvasFactory();
  const renderer = new TerrainRenderer({ createCanvas: factory.createCanvas });
  renderer.drawBackdrop(createTarget(), {
    viewportWidth: 1200,
    viewportHeight: 600,
    groundY: 470,
    scene
  });

  assert.ok(factory.canvases.every((canvas) => canvas.width === 400 && canvas.height === 200));
  assert.throws(() => new TerrainRenderer({ pixelScale: 0, createCanvas: factory.createCanvas }), RangeError);
  assert.throws(() => new TerrainRenderer({ pixelScale: 1.5, createCanvas: factory.createCanvas }), RangeError);
});

test("campaign render integrates terrain layers without changing world or collision systems", async () => {
  const [main, world, collision, renderer] = await Promise.all([
    readFile(new URL("../src/main.js", import.meta.url), "utf8"),
    readFile(new URL("../src/world/PlatformWorld.js", import.meta.url), "utf8"),
    readFile(new URL("../src/systems/CollisionSystem.js", import.meta.url), "utf8"),
    readFile(new URL("../src/rendering/TerrainRenderer.js", import.meta.url), "utf8")
  ]);

  assert.match(main, /new TerrainRenderer\(\)/);
  assert.match(main, /terrainRenderer\.drawBackdrop\(ctx/);
  assert.match(main, /terrainRenderer\.drawPlatforms\(ctx/);
  assert.match(main, /terrainRenderer\.drawRockFormations\(ctx/);
  assert.match(main, /obstacle\.type !== "rock"\) drawObstacle/);
  assert.match(world, /visiblePlatforms\(cameraX, width\)/);
  assert.match(collision, /platform\.x|platform\.y/);
  assert.doesNotMatch(renderer, /\.(?:png|gif)\b/i);
});
