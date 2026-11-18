import test from "node:test";
import assert from "node:assert/strict";
import {
  getRaceLaneLayout,
  generateRaceCourse,
  createRaceLineup,
  BREAKING_RACE_ROSTER,
  Race,
  RACE_DISTANCE_METERS,
  RACE_PIXELS_PER_METER,
  RACE_TRACK_LENGTH_PIXELS,
  RAM_SLOW_DURATION,
  RACE_BASE_SPEED,
  RACE_SPEED_VARIANCE,
  getRacePace,
  getRaceDistanceMeters,
  hasRacerBeenEaten,
  areAllRaceParticipantsEaten
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


test("the procedural race course spans exactly 10,000 meters from A to B", () => {
  assert.equal(RACE_DISTANCE_METERS, 10000);
  assert.equal(RACE_TRACK_LENGTH_PIXELS / RACE_PIXELS_PER_METER, RACE_DISTANCE_METERS);
  assert.equal(getRaceDistanceMeters(0), 0);
  assert.equal(getRaceDistanceMeters(RACE_TRACK_LENGTH_PIXELS), 10000);
  assert.equal(getRaceDistanceMeters(RACE_TRACK_LENGTH_PIXELS + 500), 10000);
  assert.equal(generateRaceCourse(8128).distanceMeters, 10000);
});

test("human and AI participants can change lanes across the same four-lane track", () => {
  const race = Object.create(Race.prototype);
  race.running = true;
  const aiRacer = { lane: 0, laneChangeCooldown: 0, pitfallTimer: 0, finished: false, eaten: false };
  assert.equal(race.changeLane(aiRacer, 1), true);
  assert.equal(aiRacer.lane, 1);
  assert.equal(race.changeLane(aiRacer, -1), false, "lane cooldown prevents an immediate reversal");
  aiRacer.laneChangeCooldown = 0;
  assert.equal(race.changeLane(aiRacer, 1), true);
  assert.equal(race.changeLane(aiRacer, 1), true);
  assert.equal(aiRacer.lane, 3);
  assert.equal(race.changeLane(aiRacer, 1), false, "participants cannot leave the four lanes");
});

test("the left screen boundary eats a racer only once its full sprite is behind it", () => {
  assert.equal(hasRacerBeenEaten(-40, 80), false);
  assert.equal(hasRacerBeenEaten(-41, 80), true);
  assert.equal(hasRacerBeenEaten(0, 80), false);
});

test("a Coral-style ram leaves a dust cloud that slows a rival behind the attacker", () => {
  const race = Object.create(Race.prototype);
  const attacker = { raceId: "attacker", lane: 2, x: 300, ramTimer: 0, ramCooldown: 0 };
  const target = { raceId: "target", lane: 2, x: 180, slow: 0, flash: 0, score: 30, eaten: false, finished: false };
  const otherLane = { raceId: "other", lane: 1, x: 180, slow: 0, flash: 0, score: 30, eaten: false, finished: false };
  race.running = true;
  race.racers = [attacker, target, otherLane];
  race.ramDustClouds = [];

  assert.equal(race.activateRam(attacker), true);
  assert.ok(attacker.ramTimer > 0);
  assert.equal(race.ramDustClouds.length, 1);
  race.updateRamDust(0.1);
  assert.equal(target.slow, RAM_SLOW_DURATION);
  assert.equal(otherLane.slow, 0);
  assert.equal(race.ramDustClouds[0].hitIds.has("target"), true);
  race.updateRamDust(0.1);
  assert.equal(target.slow, RAM_SLOW_DURATION, "a cloud must not repeatedly slow the same rival");
});

test("the match is lost only when all four racers have been eaten without reaching the finish", () => {
  const allEaten = [0, 1, 2, 3].map((lane) => ({ lane, eaten: true, finished: false }));
  assert.equal(areAllRaceParticipantsEaten(allEaten), true);
  assert.equal(areAllRaceParticipantsEaten([...allEaten.slice(0, 3), { eaten: false, finished: true }]), false);
  assert.equal(areAllRaceParticipantsEaten([...allEaten.slice(0, 3), { eaten: true, finished: true }]), false);
});


test("roster speed differences are compressed so eliminations are not predetermined by base stats", () => {
  const paces = BREAKING_RACE_ROSTER.map((dinosaur) => getRacePace(dinosaur.speed));
  assert.equal(RACE_BASE_SPEED, 88);
  assert.equal(RACE_SPEED_VARIANCE, 0.2);
  assert.ok(Math.max(...paces) - Math.min(...paces) < 3);
  assert.equal(getRacePace(82), 86.8);
  assert.equal(getRacePace(94), 89.2);
});
