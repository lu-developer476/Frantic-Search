import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { EnvironmentAssets } from "../src/rendering/EnvironmentAssets.js";
import { TerrainRenderer } from "../src/rendering/TerrainRenderer.js";

function loadedAssets() {
  const images = [];
  const assets = new EnvironmentAssets({
    createImage: () => {
      const image = { naturalWidth: 96, naturalHeight: 48 };
      images.push(image);
      return image;
    },
    createCanvas: () => null
  });
  return { assets, images, loadAll: () => images.forEach((image) => image.onload?.()) };
}

function recordingContext() {
  const draws = [];
  const rects = [];
  return {
    draws,
    rects,
    canvas: { width: 960, height: 540 },
    save() {}, restore() {},
    drawImage: (...args) => draws.push(args),
    fillRect: (...args) => rects.push(args)
  };
}

const ground = { x: 0, y: 430, w: 2000, h: 110, kind: "ground" };

test("terrain draws nothing until its tileset images have loaded", () => {
  const { assets } = loadedAssets();
  const renderer = new TerrainRenderer({ assets });
  const context = recordingContext();
  assert.equal(renderer.drawPlatforms(context, { platforms: [ground], scene: { environment: "redwood" } }), false);
  assert.equal(context.draws.length, 0);
});

test("terrain is composed from tileset images for every environment", () => {
  for (const environment of ["coastal", "redwood", "prairie", "extraction", "black-site", "containment", "rosa-containment"]) {
    const { assets, loadAll } = loadedAssets();
    const renderer = new TerrainRenderer({ assets });
    const context = recordingContext();
    renderer.drawPlatforms(context, { platforms: [ground], scene: { environment }, cameraX: 0, viewportWidth: 960 });
    loadAll();
    assert.equal(renderer.drawPlatforms(context, { platforms: [ground], scene: { environment }, cameraX: 0, viewportWidth: 960 }), true, environment);
    assert.ok(context.draws.length > 0, environment);
  }
});

test("only on-screen platform tiles are drawn and rock ledges are left to the rock formation", () => {
  const { assets, loadAll } = loadedAssets();
  const renderer = new TerrainRenderer({ assets });
  const scene = { environment: "redwood" };
  const context = recordingContext();
  renderer.drawPlatforms(context, { platforms: [ground], scene });
  loadAll();
  context.draws.length = 0;
  renderer.drawPlatforms(context, { platforms: [{ x: 0, y: 300, w: 400, h: 14, kind: "rock-ledge" }], scene, cameraX: 0, viewportWidth: 960 });
  assert.equal(context.draws.length, 0);
  renderer.drawPlatforms(context, { platforms: [{ ...ground, w: 1000000 }], scene, cameraX: 500000, viewportWidth: 960 });
  assert.ok(context.draws.length > 0 && context.draws.length < 60, "tiles outside the viewport are skipped");
});

test("pits show darkened project soil instead of the sky, and are skipped when the floor is continuous", () => {
  const { assets, loadAll } = loadedAssets();
  const renderer = new TerrainRenderer({ assets });
  const scene = { environment: "redwood" };
  const withPit = [{ ...ground, x: 0, w: 700 }, { ...ground, x: 900, w: 2000 }];
  const context = recordingContext();
  renderer.drawPlatforms(context, { platforms: withPit, scene, cameraX: 400, viewportWidth: 960 });
  loadAll();
  renderer.drawPlatforms(context, { platforms: withPit, scene, cameraX: 400, viewportWidth: 960 });
  assert.equal(context.rects.length, 1, "one dark overlay over the soil band");
  const flat = recordingContext();
  renderer.drawPlatforms(flat, { platforms: [ground], scene, cameraX: 400, viewportWidth: 960 });
  assert.equal(flat.rects.length, 0);
});

test("terrain no longer uses offscreen layers or code-drawn geometry", async () => {
  const source = await readFile(new URL("../src/rendering/TerrainRenderer.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /createLayerCanvas|OffscreenCanvas|beginPath|lineTo|Math\.random|random\(/);
});
