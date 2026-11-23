import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AtmosphereRenderer } from "../src/rendering/AtmosphereRenderer.js";
import { ImageParallax, PARALLAX_LAYERS } from "../src/rendering/ImageParallax.js";
import { LEVELS } from "../src/config/GameConfig.js";

test("every campaign environment has real parallax art", () => {
  for (const level of LEVELS) assert.ok(PARALLAX_LAYERS[level.environment]?.length > 0, level.environment);
});

test("atmosphere paints the flat sky colour and then the parallax images", () => {
  const images = [];
  const parallax = new ImageParallax({
    createImage: () => { const image = { naturalWidth: 297, naturalHeight: 60 }; images.push(image); return image; },
    createCanvas: () => null
  });
  const renderer = new AtmosphereRenderer({ parallax });
  const calls = [];
  const context = {
    canvas: { width: 960, height: 540 },
    save() {}, restore() {},
    fillRect: (...args) => calls.push(["fillRect", ...args]),
    drawImage: (...args) => calls.push(["drawImage", ...args])
  };
  assert.equal(renderer.draw(context, { scene: LEVELS[1], environment: "redwood" }), false);
  assert.deepEqual(calls[0], ["fillRect", 0, 0, 960, 540]);
  assert.equal(calls.some(([name]) => name === "drawImage"), false);
  images.forEach((image) => image.onload());
  assert.equal(renderer.draw(context, { scene: LEVELS[1], environment: "redwood", viewportWidth: 960 }), true);
  assert.ok(calls.some(([name]) => name === "drawImage"));
});

test("atmosphere has no procedural horizon, sun, clouds or lighting code", async () => {
  const source = await readFile(new URL("../src/rendering/AtmosphereRenderer.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /createLayerCanvas|OffscreenCanvas|arc\(|createLinearGradient|Math\.sin|beginPath/);
});
