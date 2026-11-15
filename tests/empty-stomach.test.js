import test from "node:test";
import assert from "node:assert/strict";
import { overlaps, scoreForDistance } from "../src/minigames/EmptyStomach.js";
import { removeEdgeBackground } from "../src/minigames/AnimatedGif.js";

test("Empty Stomach uses rectangle overlap for predator contact", () => {
  assert.equal(overlaps({ x: 0, y: 0, w: 20, h: 20 }, { x: 19, y: 5, w: 20, h: 20 }), true);
  assert.equal(overlaps({ x: 0, y: 0, w: 20, h: 20 }, { x: 20, y: 5, w: 20, h: 20 }), false);
});

test("Empty Stomach converts endless-run distance into a non-negative score", () => {
  assert.equal(scoreForDistance(0), 0);
  assert.equal(scoreForDistance(99), 9);
  assert.equal(scoreForDistance(1250), 125);
  assert.equal(scoreForDistance(-50), 0);
});

test("Empty Stomach advances through decoded GIF frames using their frame delays", async () => {
  const { getAnimatedFrameIndex } = await import("../src/minigames/AnimatedGif.js");
  const frames = [{ delay: 100 }, { delay: 200 }, { delay: 50 }];
  assert.equal(getAnimatedFrameIndex(frames, 0), 0);
  assert.equal(getAnimatedFrameIndex(frames, 99), 0);
  assert.equal(getAnimatedFrameIndex(frames, 100), 1);
  assert.equal(getAnimatedFrameIndex(frames, 299), 1);
  assert.equal(getAnimatedFrameIndex(frames, 300), 2);
  assert.equal(getAnimatedFrameIndex(frames, 350), 0);
});

test("Empty Stomach removes edge-connected GIF backgrounds without erasing matching colors inside the sprite", () => {
  const width = 7, height = 7;
  const background = [128, 210, 242, 255];
  const sprite = [220, 84, 67, 255];
  const data = new Uint8ClampedArray(width * height * 4);

  for (let index = 0; index < width * height; index += 1) {
    data.set(background, index * 4);
  }
  for (let y = 2; y <= 4; y += 1) {
    for (let x = 2; x <= 4; x += 1) {
      if (x !== 3 || y !== 3) data.set(sprite, (y * width + x) * 4);
    }
  }

  const removed = removeEdgeBackground({ data, width, height });
  assert.ok(removed > 0);
  assert.equal(data[3], 0, "the outer background becomes transparent");
  assert.equal(data[(3 * width + 3) * 4 + 3], 255, "a matching color enclosed by the sprite remains intact");
  assert.equal(data[(2 * width + 2) * 4 + 3], 255, "the sprite remains opaque");
});

test("Empty Stomach leaves already-transparent GIF frames unchanged", () => {
  const width = 3, height = 3;
  const data = new Uint8ClampedArray(width * height * 4);
  data.set([220, 84, 67, 255], (4) * 4);
  assert.equal(removeEdgeBackground({ data, width, height }), 0);
  assert.equal(data[4 * 4 + 3], 255);
});

test("Empty Stomach uses decoded GIF frames instead of static Image objects", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../src/minigames/EmptyStomach.js", import.meta.url), "utf8");
  assert.match(source, /loadAnimatedGif/);
  assert.match(source, /getAnimatedFrameIndex/);
  assert.doesNotMatch(source, /new Image\(\)/);
});
