import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  VEGETATION_LAYER_NAMES,
  VEGETATION_PIXEL_SCALE,
  VegetationRenderer,
  isPixelGroundSceneryProp
} from "../src/rendering/VegetationRenderer.js";

function createCanvasFactory() {
  const canvases = [];
  const createCanvas = () => {
    const calls = [];
    const context = {
      globalAlpha: 1,
      imageSmoothingEnabled: true,
      setTransform: (...args) => calls.push(["setTransform", ...args]),
      clearRect: (...args) => calls.push(["clearRect", ...args]),
      save: () => calls.push(["save"]),
      restore: () => calls.push(["restore"]),
      translate: (...args) => calls.push(["translate", ...args])
    };
    const canvas = { width: 0, height: 0, getContext: () => context };
    canvases.push({ canvas, context, calls });
    return canvas;
  };
  return { createCanvas, canvases };
}

function createTargetContext() {
  const draws = [];
  return {
    canvas: { width: 960, height: 540 },
    imageSmoothingEnabled: true,
    globalAlpha: 1,
    draws,
    save() {},
    restore() {},
    drawImage(canvas, ...args) {
      draws.push({ canvas, args, smoothing: this.imageSmoothingEnabled });
    }
  };
}

const scene = { tree: "#267847", treeLight: "#4baf60", treeTrunk: "#654632" };

test("vegetation renders through three independent far, mid and ground pixel layers", () => {
  const { createCanvas, canvases } = createCanvasFactory();
  const renderCalls = [];
  const renderer = new VegetationRenderer({
    createCanvas,
    drawBackground: (context, props, cameraX, width) => renderCalls.push({ context, props, cameraX, width }),
    drawGround: () => {}
  });
  const target = createTargetContext();

  assert.equal(VEGETATION_PIXEL_SCALE, 3);
  assert.deepEqual(renderer.layers.map((layer) => layer.name), VEGETATION_LAYER_NAMES);
  renderer.drawBackground(target, {
    props: [
      { id: "far-tree", layer: "background", parallax: 0.14 },
      { id: "mid-tree", layer: "background", parallax: 0.31 },
      { id: "ignored", layer: "ground", parallax: 1 }
    ],
    cameraX: 500,
    viewportWidth: 960,
    viewportHeight: 540,
    scene
  });

  assert.equal(canvases.length, 3);
  assert.ok(canvases.every(({ canvas }) => canvas.width === 320 && canvas.height === 180));
  assert.equal(renderCalls.length, 2);
  assert.deepEqual(renderCalls.map((call) => call.props.map((prop) => prop.id)), [
    ["far-tree"], ["mid-tree"]
  ]);
  assert.deepEqual(target.draws.map(({ canvas }) =>
    renderer.layers.find((layer) => layer.canvas === canvas).name
  ), ["far", "mid"]);
});

test("ground vegetation is pixel-rendered in world space and camera-compensated on composite", () => {
  const { createCanvas, canvases } = createCanvasFactory();
  const groundCalls = [];
  const renderer = new VegetationRenderer({
    createCanvas,
    drawBackground: () => {},
    drawGround: (context, prop) => groundCalls.push(prop.id)
  });
  const target = createTargetContext();

  renderer.drawGround(target, {
    props: [
      { id: "fern", layer: "ground", kind: "fern" },
      { id: "grass", layer: "ground", kind: "dune-grass" },
      { id: "rock", layer: "ground", kind: "boulder" }
    ],
    cameraX: 321.6,
    viewportWidth: 960,
    viewportHeight: 540,
    scene
  });

  assert.deepEqual(groundCalls, ["fern", "grass", "rock"]);
  assert.deepEqual(canvases[2].calls.find((call) => call[0] === "translate"), ["translate", -322, 0]);
  assert.deepEqual(target.draws[0].args, [322, 0, 960, 540]);
  assert.equal(target.draws[0].smoothing, false);
});

test("ground vegetation, fallen wood and decorative rocks share the pixel renderer", () => {
  for (const kind of [
    "dune-grass", "driftwood", "shrub", "fern", "fallen-log",
    "dead-shrub", "stump", "planter", "clipped-shrub",
    "boulder", "moss-rock", "rubble", "broken-concrete"
  ]) {
    assert.equal(isPixelGroundSceneryProp({ layer: "ground", kind }), true, kind);
  }
  assert.equal(isPixelGroundSceneryProp({ layer: "background", species: "redwood" }), false);
  assert.equal(isPixelGroundSceneryProp({ layer: "ground", kind: "unclassified" }), false);
});

test("vegetation layer dimensions adapt to wide canvases without changing world scale", () => {
  const { createCanvas, canvases } = createCanvasFactory();
  const renderer = new VegetationRenderer({ createCanvas, drawBackground: () => {}, drawGround: () => {} });
  renderer.drawBackground(createTargetContext(), {
    props: [], cameraX: 0, viewportWidth: 1280, viewportHeight: 540, scene
  });

  assert.ok(canvases.every(({ canvas }) => canvas.width === 427 && canvas.height === 180));
  assert.deepEqual(canvases[0].calls.find((call) => call[0] === "setTransform"), [
    "setTransform", 1 / 3, 0, 0, 1 / 3, 0, 0
  ]);
});

test("invalid vegetation pixel scale is rejected before canvas creation", () => {
  const { createCanvas, canvases } = createCanvasFactory();
  assert.throws(() => new VegetationRenderer({ pixelScale: 0, createCanvas }), RangeError);
  assert.equal(canvases.length, 0);
});

test("vegetation layers are integrated without changing platform geometry or importing sprite assets", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const vegetation = await readFile(new URL("../src/rendering/VegetationRenderer.js", import.meta.url), "utf8");
  const platformWorld = await readFile(new URL("../src/world/PlatformWorld.js", import.meta.url), "utf8");

  assert.match(main, /vegetationRenderer\.drawBackground\(ctx/);
  assert.match(main, /vegetationRenderer\.drawGround\(ctx/);
  assert.match(platformWorld, /this\.platforms\.push/);
  assert.doesNotMatch(vegetation, /\.(?:png|gif)\b/i);
  assert.doesNotMatch(vegetation, /PlatformWorld|CollisionSystem|PhysicsSystem/);
});
