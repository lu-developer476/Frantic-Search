import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import {
  EnvironmentAssets,
  OBJECT_SPECS,
  SLICES,
  TERRAIN_THEMES,
  fillTiled,
  terrainTheme,
  themeSpecs
} from "../src/rendering/EnvironmentAssets.js";

function fakeLoader() {
  const images = [];
  const createImage = () => {
    const image = { naturalWidth: 96, naturalHeight: 48 };
    images.push(image);
    return image;
  };
  return { images, createImage };
}

test("every slice and theme points at a PNG shipped in public/", async () => {
  const sources = new Set();
  for (const spec of Object.values(SLICES)) sources.add(spec.src);
  for (const theme of Object.values(TERRAIN_THEMES)) for (const spec of themeSpecs(theme)) sources.add(spec.src);
  for (const src of sources) await access(new URL("../public/" + src, import.meta.url));
});

test("every campaign environment has a terrain theme built from project tilesets", () => {
  for (const name of ["coastal", "redwood", "black-site", "containment", "rosa-containment", "extraction", "prairie"]) {
    const theme = TERRAIN_THEMES[name];
    assert.ok(theme, name);
    assert.ok(theme.body && theme.cap, name);
  }
  assert.equal(terrainTheme("unknown"), TERRAIN_THEMES.redwood);
});

test("each PNG is requested once and slices are prepared once, after the image loads", () => {
  const { images, createImage } = fakeLoader();
  const assets = new EnvironmentAssets({ baseUrl: "/", createImage, createCanvas: () => null });
  assert.equal(assets.get(SLICES.crateA), null);
  assets.get(SLICES.crateB);
  assert.equal(images.length, 1, "crateA and crateB share crates_spritesheet.png");
  images[0].onload();
  const first = assets.get(SLICES.crateA);
  assert.ok(first);
  assert.equal(assets.get(SLICES.crateA), first, "the prepared slice is cached");
  assert.equal(images.length, 1);
  assets.preload(OBJECT_SPECS);
  assert.ok(images.length <= new Set(OBJECT_SPECS.map((spec) => spec.src)).size);
});

test("a failed image never yields a drawable and does not retry", () => {
  const { images, createImage } = fakeLoader();
  const assets = new EnvironmentAssets({ createImage, createCanvas: () => null });
  assets.get(SLICES.crateA);
  images[0].onerror();
  assert.equal(assets.get(SLICES.crateA), null);
  assert.equal(images.length, 1);
});

test("fillTiled repeats the tile over the visible area only and clips the last tile", () => {
  const draws = [];
  const context = { drawImage: (...args) => draws.push(args) };
  const tile = { naturalWidth: 100, naturalHeight: 50 };
  fillTiled(context, tile, 0, 0, 250, 50, { visibleLeft: 0, visibleRight: 250 });
  assert.equal(draws.length, 3);
  assert.deepEqual(draws[2].slice(1), [0, 0, 50, 50, 200, 0, 50, 50]);
  draws.length = 0;
  fillTiled(context, tile, 0, 0, 100000, 50, { visibleLeft: 5000, visibleRight: 5200 });
  assert.ok(draws.length <= 3, "off-screen tiles are not drawn");
  assert.ok(draws.every((args) => args[5] >= 5000 && args[5] <= 5200));
});
