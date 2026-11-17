import test from "node:test";
import assert from "node:assert/strict";
import {
  ATMOSPHERE_LAYER_NAMES,
  ATMOSPHERE_PIXEL_SCALE,
  AtmosphereRenderer
} from "../src/rendering/AtmosphereRenderer.js";
import { LEVELS } from "../src/config/GameConfig.js";

function createCanvasFactory() {
  const canvases = [];
  const createCanvas = () => {
    const calls = [];
    const context = {
      globalAlpha: 1,
      imageSmoothingEnabled: true,
      fillStyle: "#000000",
      setTransform: (...args) => calls.push(["setTransform", ...args]),
      clearRect: (...args) => calls.push(["clearRect", ...args]),
      fillRect: (...args) => calls.push(["fillRect", ...args]),
      save: () => calls.push(["save"]),
      restore: () => calls.push(["restore"])
    };
    const canvas = { width: 0, height: 0, getContext: () => context };
    canvases.push({ canvas, context, calls });
    return canvas;
  };
  return { createCanvas, canvases };
}

function createTargetContext() {
  const drawnLayers = [];
  return {
    canvas: { width: 960, height: 540 },
    imageSmoothingEnabled: true,
    globalAlpha: 1,
    drawnLayers,
    save() {},
    restore() {},
    drawImage(canvas, ...args) {
      drawnLayers.push({ canvas, args });
    }
  };
}

test("atmosphere is composed from four independent pixel-rendered layers", () => {
  const { createCanvas, canvases } = createCanvasFactory();
  const renderer = new AtmosphereRenderer({ createCanvas });
  const target = createTargetContext();

  assert.equal(ATMOSPHERE_PIXEL_SCALE, 3);
  assert.deepEqual(renderer.layers.map((layer) => layer.name), ATMOSPHERE_LAYER_NAMES);
  renderer.draw(target, {
    scene: LEVELS[0], environment: "coastal", cameraX: 640,
    viewportWidth: 960, viewportHeight: 540, elapsed: 1.5
  });

  assert.equal(canvases.length, 4);
  assert.ok(canvases.every(({ canvas }) => canvas.width === 320 && canvas.height === 180));
  assert.deepEqual(
    target.drawnLayers.map(({ canvas }) => canvases.findIndex((entry) => entry.canvas === canvas)),
    [0, 1, 2, 3]
  );
  assert.equal(target.imageSmoothingEnabled, false);
  assert.ok(canvases.every(({ context }) => context.imageSmoothingEnabled === false));
});

test("pixel layer dimensions adapt to wider Canvas viewports without changing world geometry", () => {
  const { createCanvas, canvases } = createCanvasFactory();
  const renderer = new AtmosphereRenderer({ createCanvas });
  renderer.draw(createTargetContext(), {
    scene: LEVELS[1], environment: "redwood", viewportWidth: 1280, viewportHeight: 540
  });
  assert.ok(canvases.every(({ canvas }) => canvas.width === 427 && canvas.height === 180));
  assert.deepEqual(canvases[0].calls.find((call) => call[0] === "setTransform"), [
    "setTransform", 1 / 3, 0, 0, 1 / 3, 0, 0
  ]);
});

test("every campaign biome renders a horizon; indoor containment has no outdoor sun or clouds", () => {
  const environments = ["coastal", "redwood", "black-site", "containment", "rosa-containment", "extraction"];
  for (const environment of environments) {
    const { createCanvas, canvases } = createCanvasFactory();
    const renderer = new AtmosphereRenderer({ createCanvas });
    const level = LEVELS.find((candidate) => candidate.environment === environment);
    renderer.draw(createTargetContext(), {
      scene: level, environment, viewportWidth: 960, viewportHeight: 540, elapsed: 2
    });

    const horizonRects = canvases[2].calls.filter((call) => call[0] === "fillRect");
    const celestialRects = canvases[1].calls.filter((call) => call[0] === "fillRect");
    assert.ok(horizonRects.length > 0, environment + " should draw a horizon");
    if (environment === "rosa-containment") {
      assert.equal(celestialRects.length, 0, "indoor containment must not draw outdoor celestial objects");
    } else {
      assert.ok(celestialRects.length > 10, environment + " should draw the sun and stepped clouds");
    }
  }
});

test("sky and lighting surfaces are cleared and redrawn independently on every frame", () => {
  const { createCanvas, canvases } = createCanvasFactory();
  const renderer = new AtmosphereRenderer({ createCanvas });
  const target = createTargetContext();
  const options = {
    scene: LEVELS[5], environment: "extraction",
    viewportWidth: 960, viewportHeight: 540, elapsed: 4
  };
  renderer.draw(target, options);
  renderer.draw(target, { ...options, elapsed: 5 });

  assert.equal(canvases[0].calls.filter((call) => call[0] === "clearRect").length, 2);
  assert.equal(canvases[3].calls.filter((call) => call[0] === "clearRect").length, 2);
  assert.equal(target.drawnLayers.length, 8);
});

test("invalid pixel scale is rejected before creating atmosphere layers", () => {
  const { createCanvas, canvases } = createCanvasFactory();
  assert.throws(() => new AtmosphereRenderer({ pixelScale: 0, createCanvas }), RangeError);
  assert.equal(canvases.length, 0);
});
