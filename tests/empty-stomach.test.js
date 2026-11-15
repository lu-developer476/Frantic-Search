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
