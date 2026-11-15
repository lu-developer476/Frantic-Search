import test from "node:test";
import assert from "node:assert/strict";
import { overlaps, scoreForDistance } from "../src/minigames/EmptyStomach.js";

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

test("Empty Stomach uses decoded GIF frames instead of static Image objects", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../src/minigames/EmptyStomach.js", import.meta.url), "utf8");
  assert.match(source, /loadAnimatedGif/);
  assert.match(source, /getAnimatedFrameIndex/);
  assert.doesNotMatch(source, /new Image\(\)/);
});
