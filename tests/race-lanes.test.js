import test from "node:test";
import assert from "node:assert/strict";
import {
  getRaceLaneLayout,
  generateRaceCourse,
  createRaceLineup,
  BREAKING_RACE_ROSTER
} from "../src/minigames/Race.js";

test("Breaking Race shares Empty Stomach's four depth-lane baselines and scales", () => {
  const lanes = [0, 1, 2, 3].map((lane) => getRaceLaneLayout(lane));

  assert.deepEqual(lanes, [
    { lane: 0, baseline: 448, scale: 0.82 },
    { lane: 1, baseline: 474, scale: 0.94 },
    { lane: 2, baseline: 500, scale: 1.06 },
    { lane: 3, baseline: 526, scale: 1.18 }
  ]);
});

test("Breaking Race clamps invalid lane indices to the nearest depth lane", () => {
  assert.deepEqual(getRaceLaneLayout(-1), { lane: 0, baseline: 448, scale: 0.82 });
  assert.deepEqual(getRaceLaneLayout(8), { lane: 3, baseline: 526, scale: 1.18 });
  assert.deepEqual(getRaceLaneLayout("invalid"), { lane: 3, baseline: 526, scale: 1.18 });
});

test("the player-selected dinosaur is always included in a four-dinosaur lineup", () => {
  for (const dinosaur of BREAKING_RACE_ROSTER) {
    const lineup = createRaceLineup(dinosaur.id, () => 0.5);
    assert.equal(lineup.length, 4);
    assert.equal(lineup[0].id, dinosaur.id);
    assert.equal(new Set(lineup.map((entry) => entry.id)).size, 4);
  }
});

test("generated race terrain is deterministic for a seed and includes every hazard and pickup type", () => {
  const first = generateRaceCourse(123456);
  const second = generateRaceCourse(123456);
  assert.deepEqual(first, second);

  const hazardKinds = new Set(first.hazards.map((hazard) => hazard.kind));
  assert.deepEqual([...hazardKinds].sort(), ["bush", "mud", "pit", "rock", "spikes"]);
  assert.ok(first.hazards.length >= 12);
  assert.ok(first.hazards.every((hazard) =>
    hazard.lane >= 0 && hazard.lane < 4 && hazard.progress > 0 && hazard.progress < 1
  ));

  const pickupKinds = new Set(first.pickups.map((pickup) => pickup.kind));
  assert.ok(pickupKinds.has("egg"));
  assert.ok(pickupKinds.has("meat"));
  assert.ok(first.pickups.length >= 5);
});

test("different course seeds generate different terrain layouts", () => {
  assert.notDeepEqual(generateRaceCourse(123), generateRaceCourse(456));
});
