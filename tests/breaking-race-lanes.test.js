import test from "node:test";
import assert from "node:assert/strict";
import { getBreakingRaceLaneLayout } from "../src/minigames/BreakingRace.js";

test("Breaking Race shares Empty Stomach's four depth-lane baselines and scales", () => {
  const lanes = [0, 1, 2, 3].map((lane) => getBreakingRaceLaneLayout(lane));

  assert.deepEqual(lanes, [
    { lane: 0, baseline: 448, scale: 0.82 },
    { lane: 1, baseline: 474, scale: 0.94 },
    { lane: 2, baseline: 500, scale: 1.06 },
    { lane: 3, baseline: 526, scale: 1.18 }
  ]);
});

test("Breaking Race clamps invalid lane indices to the nearest depth lane", () => {
  assert.deepEqual(getBreakingRaceLaneLayout(-1), {
    lane: 0,
    baseline: 448,
    scale: 0.82
  });
  assert.deepEqual(getBreakingRaceLaneLayout(8), {
    lane: 3,
    baseline: 526,
    scale: 1.18
  });
  assert.deepEqual(getBreakingRaceLaneLayout("invalid"), {
    lane: 3,
    baseline: 526,
    scale: 1.18
  });
});
