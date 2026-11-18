import test from "node:test";
import assert from "node:assert/strict";
import { drawOutlinedImage, getCanvasViewportWidth, roundedRect } from "../src/rendering/CanvasUtils.js";

function createPathContext() {
  const commands = [];
  const context = {};
  for (const name of ["beginPath", "moveTo", "lineTo", "quadraticCurveTo", "closePath"]) {
    context[name] = (...args) => commands.push([name, ...args]);
  }
  return { context, commands };
}

test("roundedRect creates a closed rounded-rectangle path", () => {
  const { context, commands } = createPathContext();

  roundedRect(context, 10, 20, 100, 60, 12);

  assert.deepEqual(commands, [
    ["beginPath"],
    ["moveTo", 22, 20],
    ["lineTo", 98, 20],
    ["quadraticCurveTo", 110, 20, 110, 32],
    ["lineTo", 110, 68],
    ["quadraticCurveTo", 110, 80, 98, 80],
    ["lineTo", 22, 80],
    ["quadraticCurveTo", 10, 80, 10, 68],
    ["lineTo", 10, 32],
    ["quadraticCurveTo", 10, 20, 22, 20],
    ["closePath"]
  ]);
});

test("roundedRect clamps the radius to half the smaller side", () => {
  const { context, commands } = createPathContext();

  roundedRect(context, 0, 0, 8, 20, 50);

  assert.deepEqual(commands[1], ["moveTo", 4, 0]);
  assert.deepEqual(commands[2], ["lineTo", 4, 0]);
  assert.deepEqual(commands[3], ["quadraticCurveTo", 8, 0, 8, 4]);
});

test("roundedRect normalizes negative dimensions and invalid radius", () => {
  const { context, commands } = createPathContext();

  roundedRect(context, 20, 30, -10, -6, Number.NaN);

  assert.deepEqual(commands[1], ["moveTo", 10, 24]);
  assert.deepEqual(commands[2], ["lineTo", 10, 24]);
  assert.deepEqual(commands.at(-1), ["closePath"]);
});


test("canvas viewport width expands a 16:9 world to match a wider stage", () => {
  assert.equal(getCanvasViewportWidth(1920, 810), 1280);
  assert.equal(getCanvasViewportWidth(960, 540), 960);
});

test("canvas viewport width keeps the native size for narrow or unmeasured stages", () => {
  assert.equal(getCanvasViewportWidth(1024, 800), 960);
  assert.equal(getCanvasViewportWidth(0, 0), 960);
  assert.equal(getCanvasViewportWidth(Number.NaN, 540), 960);
});


test("drawOutlinedImage builds a PNG/GIF outline once and reuses the cached surface", () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const previousOffscreenCanvas = Object.getOwnPropertyDescriptor(globalThis, "OffscreenCanvas");
  const surfaces = [];

  class MockCanvas {
    constructor() {
      this.operations = [];
      this.context = {
        drawImage: (...args) => this.operations.push(["drawImage", ...args]),
        fillRect: (...args) => this.operations.push(["fillRect", ...args])
      };
    }
    getContext() { return this.context; }
  }

  Object.defineProperty(globalThis, "OffscreenCanvas", {
    configurable: true,
    value: undefined
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement(name) {
        assert.equal(name, "canvas");
        const surface = new MockCanvas();
        surfaces.push(surface);
        return surface;
      }
    }
  });

  try {
    const frame = { width: 12, height: 10 };
    const calls = [];
    const context = { drawImage: (...args) => calls.push(args) };
    const bounds = { x: 2, y: 1, width: 8, height: 7 };

    assert.equal(drawOutlinedImage(context, frame, 20, 30, 40, 32, bounds), true);
    assert.equal(surfaces.length, 2, "one mask and one reusable outlined surface are created");
    assert.equal(surfaces[0].operations[0][1], frame);
    assert.deepEqual(surfaces[0].operations[0].slice(2), [2, 1, 8, 7, 0, 0, 40, 32]);
    assert.equal(surfaces[1].operations.filter(([name]) => name === "drawImage").length, 9);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], surfaces[1]);
    assert.deepEqual(calls[0].slice(1), [19, 29, 42, 34]);

    drawOutlinedImage(context, frame, 20, 30, 40, 32, bounds);
    assert.equal(surfaces.length, 2, "the second draw reuses the cached contour");
    assert.equal(calls.length, 2, "cached sprites need only one drawImage on the game canvas");
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
    else delete globalThis.document;
    if (previousOffscreenCanvas) Object.defineProperty(globalThis, "OffscreenCanvas", previousOffscreenCanvas);
    else delete globalThis.OffscreenCanvas;
  }
});
