import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  OBJECT_LAYER_NAMES,
  OBJECT_PIXEL_SCALE,
  ObjectRenderer
} from "../src/rendering/ObjectRenderer.js";

function createCanvasFactory() {
  const canvases = [];
  const createCanvas = () => {
    const calls = [];
    const context = {
      calls,
      imageSmoothingEnabled: true,
      globalAlpha: 1,
      shadowBlur: 0,
      setTransform(...args) { calls.push(["setTransform", ...args]); },
      clearRect(...args) { calls.push(["clearRect", ...args]); },
      save() { calls.push(["save"]); },
      restore() { calls.push(["restore"]); },
      translate(...args) { calls.push(["translate", ...args]); },
      fillRect(...args) { calls.push(["fillRect", ...args]); }
    };
    const canvas = { width: 1, height: 1, getContext: () => context };
    canvases.push({ canvas, context, calls });
    return canvas;
  };
  return { createCanvas, canvases };
}

function createTargetContext() {
  const draws = [];
  const calls = [];
  return {
    canvas: { width: 960, height: 540 },
    calls,
    draws,
    imageSmoothingEnabled: true,
    globalAlpha: 1,
    save() { calls.push(["save"]); },
    restore() { calls.push(["restore"]); },
    drawImage(canvas, ...args) {
      draws.push({ canvas, args, smoothing: this.imageSmoothingEnabled });
    }
  };
}

test("object renderer creates independent low-resolution layers for each object family", () => {
  const factory = createCanvasFactory();
  const renderer = new ObjectRenderer({ createCanvas: factory.createCanvas });

  assert.equal(OBJECT_PIXEL_SCALE, 3);
  assert.deepEqual(OBJECT_LAYER_NAMES, [
    "collectibles", "facility", "arena-boundary", "interactives", "obstacles",
    "cage-back", "cage-front", "food", "projectiles", "containment-shell"
  ]);
  assert.deepEqual(renderer.layers.map((layer) => layer.name), OBJECT_LAYER_NAMES);
  assert.equal(new Set(renderer.layers.map((layer) => layer.canvas)).size, OBJECT_LAYER_NAMES.length);
  assert.equal(factory.canvases.length, OBJECT_LAYER_NAMES.length);
});

test("layer callbacks render in world space and composite with camera compensation", () => {
  const factory = createCanvasFactory();
  const renderer = new ObjectRenderer({ createCanvas: factory.createCanvas });
  const target = createTargetContext();
  let callbackContext = null;

  renderer.drawLayer(target, "collectibles", {
    cameraX: 321.6,
    viewportWidth: 960,
    viewportHeight: 540
  }, (context) => {
    callbackContext = context;
    context.fillRect(400, 120, 12, 16);
  });

  const layer = renderer.layerByName.collectibles;
  assert.equal(callbackContext, layer.context);
  assert.ok(layer.calls.some((call) => call[0] === "translate" && call[1] === -322));
  assert.ok(layer.calls.some((call) => call[0] === "fillRect" && call[1] === 400));
  assert.deepEqual(target.draws[0].args, [322, 0, 960, 540]);
  assert.equal(target.draws[0].smoothing, false);
  assert.equal(layer.canvas.width, 320);
  assert.equal(layer.canvas.height, 180);
});

test("object categories composite separately in requested z-order", () => {
  const factory = createCanvasFactory();
  const renderer = new ObjectRenderer({ createCanvas: factory.createCanvas });
  const target = createTargetContext();

  for (const name of ["collectibles", "obstacles", "cage-back", "cage-front", "projectiles"]) {
    renderer.drawLayer(target, name, { cameraX: 90 }, (context) => {
      context.fillRect(0, 0, 10, 10);
    });
  }

  assert.deepEqual(target.draws.map(({ canvas }) =>
    renderer.layers.find((layer) => layer.canvas === canvas).name
  ), ["collectibles", "obstacles", "cage-back", "cage-front", "projectiles"]);
  assert.ok(target.draws.every((draw) => draw.args[0] === 90));
});

test("each draw clears only its selected layer and adapts to viewport resizing", () => {
  const factory = createCanvasFactory();
  const renderer = new ObjectRenderer({ createCanvas: factory.createCanvas });
  const target = createTargetContext();

  renderer.drawLayer(target, "food", { viewportWidth: 1200, viewportHeight: 600 }, () => {});
  renderer.drawLayer(target, "food", { viewportWidth: 1200, viewportHeight: 600 }, () => {});
  const foodCalls = renderer.layerByName.food.calls;
  assert.equal(foodCalls.filter((call) => call[0] === "clearRect").length, 2);
  assert.ok(factory.canvases.every(({ canvas }) => canvas.width === 400 && canvas.height === 200));
  assert.equal(renderer.layerByName.collectibles.calls.filter((call) => call[0] === "clearRect").length, 0);
});

test("invalid pixel scales and unknown object layers are rejected", () => {
  const factory = createCanvasFactory();
  assert.throws(() => new ObjectRenderer({ pixelScale: 0, createCanvas: factory.createCanvas }), RangeError);
  assert.throws(() => new ObjectRenderer({ pixelScale: 1.5, createCanvas: factory.createCanvas }), RangeError);
  const renderer = new ObjectRenderer({ createCanvas: factory.createCanvas });
  assert.throws(() => renderer.drawLayer(createTargetContext(), "unknown", {}, () => {}), RangeError);
});

test("layer context state is restored when an object draw callback fails", () => {
  const factory = createCanvasFactory();
  const renderer = new ObjectRenderer({ createCanvas: factory.createCanvas });
  const target = createTargetContext();

  assert.throws(() => renderer.drawLayer(target, "projectiles", {}, () => {
    throw new Error("draw failure");
  }), /draw failure/);
  assert.deepEqual(renderer.layerByName.projectiles.calls.slice(-2).map((call) => call[0]), ["translate", "restore"]);
  assert.equal(target.draws.length, 0);
});

test("procedural objects use pixel layers while existing sprite assets remain separate", async () => {
  const [main, objectRenderer, terrainRenderer, vegetationRenderer, platforms, collision] = await Promise.all([
    readFile(new URL("../src/main.js", import.meta.url), "utf8"),
    readFile(new URL("../src/rendering/ObjectRenderer.js", import.meta.url), "utf8"),
    readFile(new URL("../src/rendering/TerrainRenderer.js", import.meta.url), "utf8"),
    readFile(new URL("../src/rendering/VegetationRenderer.js", import.meta.url), "utf8"),
    readFile(new URL("../src/world/PlatformWorld.js", import.meta.url), "utf8"),
    readFile(new URL("../src/systems/CollisionSystem.js", import.meta.url), "utf8")
  ]);

  for (const layer of [
    "collectibles", "facility", "arena-boundary", "interactives", "obstacles",
    "cage-back", "cage-front", "food", "projectiles", "containment-shell"
  ]) {
    assert.match(main, new RegExp('objectRenderer\\.drawLayer\\(ctx, "' + layer + '"'));
  }
  assert.match(main, /spriteRenderer\.drawAnimated\([\s\S]*?"ferrucutus"/);
  assert.match(main, /spriteRenderer\.drawAnimated\([\s\S]*?"ligocristus"/);
  assert.match(main, /spriteRenderer\.drawAnimated\([\s\S]*?"beta"/);
  assert.match(main, /drawFerrucutusCageBack[\s\S]*?drawFerrucutusCageFront/);
  assert.match(main, /world\.visiblePlatforms\(cameraX, GAME\.width\)/);
  assert.match(platforms, /this\.platforms\.push/);
  assert.match(collision, /platform\.x|platform\.y/);
  assert.doesNotMatch(objectRenderer, /\.(?:png|gif)\b/i);
  assert.doesNotMatch(terrainRenderer, /\.(?:png|gif)\b/i);
  assert.doesNotMatch(vegetationRenderer, /\.(?:png|gif)\b/i);
  assert.doesNotMatch(objectRenderer, /PlatformWorld|CollisionSystem|PhysicsSystem/);
});
