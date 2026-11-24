import test from "node:test";
import assert from "node:assert/strict";
import {
  getRaceLaneLayout,
  generateRaceCourse,
  createRaceLineup,
  createRaceStartingGrid,
  getRaceHazardRenderKind,
  getRaceStartScreenX,
  DEFAULT_RACE_DINOSAUR_ID,
  BREAKING_RACE_ROSTER,
  Race,
  RACE_DISTANCE_METERS,
  RACE_PIXELS_PER_METER,
  RACE_TRACK_LENGTH_PIXELS,
  RAM_SLOW_DURATION,
  RACE_BASE_SPEED,
  RACE_SPEED_VARIANCE,
  getRacePace,
  getRaceAnimationSource,
  getRaceSpriteScale,
  getRaceHorizontalInput,
  getRaceMovementSpeed,
  getRaceCameraX,
  RACE_PLAYER_HORIZONTAL_CONTROL_SPEED,
  RACE_OPENING_CINEMATIC_DURATION,
  getRaceDistanceMeters,
  hasRacerBeenEaten,
  areAllRaceParticipantsEaten
} from "../src/minigames/Race.js";
import { GALA_DISPLAY_SCALE } from "../src/config/DinosaurSizing.js";

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

test("Gala remains playable under her character name, without the Velociraptor nublarensis roster entry", () => {
  const gala = BREAKING_RACE_ROSTER.find((dinosaur) => dinosaur.id === "gala");
  assert.ok(gala, "Gala must remain a playable character");
  assert.equal(gala.name, "Gala");
  assert.equal(gala.species, "Gala", "the selection list displays Gala rather than the species entry");
  assert.equal(gala.idle, "references/gala-idle.gif");
  assert.equal(gala.walk, "references/gala-walk.gif");
  assert.equal(gala.run, "references/gala-run.gif");
  assert.equal(gala.jump, "references/gala-fly.gif");
  assert.equal(BREAKING_RACE_ROSTER.some((dinosaur) => dinosaur.species === "Velociraptor nublarensis"), false);
  assert.equal(DEFAULT_RACE_DINOSAUR_ID, "gala");
});

test("all four racers share the start-line X coordinate and use a fixed lane order", () => {
  const lineup = createRaceLineup(DEFAULT_RACE_DINOSAUR_ID, () => 0.5);
  const grid = createRaceStartingGrid(lineup, 0);
  assert.equal(grid.length, 4);
  assert.deepEqual(grid.map((entry) => entry.lane), [0, 1, 2, 3]);
  assert.deepEqual(grid.map((entry) => entry.x), [0, 0, 0, 0]);
  assert.equal(getRaceStartScreenX(960), 960 * 0.18);
  assert.equal(getRaceStartScreenX(1280), 1280 * 0.18);
});

test("procedural spike hazards have no visible renderer but retain their gameplay identity", () => {
  assert.equal(getRaceHazardRenderKind("spikes"), null);
  assert.equal(getRaceHazardRenderKind("rock"), "rock");
  assert.equal(getRaceHazardRenderKind("pit"), "pit");
});

test("Gala's animated sprites render at 70% scale while other racers keep their normal size", () => {
  const gala = BREAKING_RACE_ROSTER.find((dinosaur) => dinosaur.id === "gala");
  const brisa = BREAKING_RACE_ROSTER.find((dinosaur) => dinosaur.id === "brisa");
  assert.equal(getRaceSpriteScale(gala), GALA_DISPLAY_SCALE);
  assert.equal(getRaceSpriteScale(gala), 0.7);
  assert.equal(getRaceSpriteScale(brisa), 1);
  assert.equal(getRaceSpriteScale(null), 1);
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


test("the race opening uses matching idle, walk and run GIFs when available", () => {
  const venatosaurus = BREAKING_RACE_ROSTER.find((dinosaur) => dinosaur.id === "venatosaurus-impavidus");
  assert.equal(getRaceAnimationSource(venatosaurus, "idle"), "references/venatosaurus-impavidus-idle.gif");
  assert.equal(getRaceAnimationSource(venatosaurus, "walk"), "references/venatosaurus-impavidus-walk.gif");
  assert.equal(getRaceAnimationSource(venatosaurus, "run"), "references/venatosaurus-impavidus-run.gif");
  const brisa = BREAKING_RACE_ROSTER.find((dinosaur) => dinosaur.id === "brisa");
  assert.equal(getRaceAnimationSource(brisa, "idle"), "references/juvenile-velociraptor-abyssomirabilis-idle.gif");
  assert.equal(getRaceAnimationSource(brisa, "walk"), "references/juvenile-velociraptor-abyssomirabilis-idle.gif");
  assert.equal(RACE_OPENING_CINEMATIC_DURATION, 10);
});


test("race opening uses walk GIFs for staging and run GIFs for the race", () => {
  for (const id of ["venatosaurus-impavidus", "venatosaurus-saevidicus"]) {
    const dinosaur = BREAKING_RACE_ROSTER.find((entry) => entry.id === id);
    assert.match(getRaceAnimationSource(dinosaur, "walk"), /-walk\.gif$/);
  }
  const umbraraptor = BREAKING_RACE_ROSTER.find((entry) => entry.id === "umbraraptor-silvis");
  assert.equal(umbraraptor.walk, null, "no Umbraraptor walk GIF exists in the repository");
  assert.equal(getRaceAnimationSource(umbraraptor, "walk"), umbraraptor.idle, "the intro reuses its available idle pose");
  for (const id of ["brisa", "venatosaurus-impavidus", "venatosaurus-saevidicus", "coral", "xenoraptor-crypticus"]) {
    const dinosaur = BREAKING_RACE_ROSTER.find((entry) => entry.id === id);
    assert.match(getRaceAnimationSource(dinosaur, "run"), /-run\.gif$/);
  }
  const umbraraptor = BREAKING_RACE_ROSTER.find((entry) => entry.id === "umbraraptor-silvis");
  assert.equal(getRaceAnimationSource(umbraraptor, "run"), umbraraptor.idle);
  const xenoraptor = BREAKING_RACE_ROSTER.find((entry) => entry.id === "xenoraptor-crypticus");
  assert.equal(getRaceAnimationSource(xenoraptor, "idle"), xenoraptor.run, "the run GIF fills the missing idle animation");
  assert.equal(getRaceAnimationSource(xenoraptor, "walk"), xenoraptor.run, "the run GIF prevents a blank placeholder during staging");
});

test("invisible spike hazards still slow and penalize racers on contact", () => {
  const race = Object.create(Race.prototype);
  const spike = { id: "spike-lane-1", kind: "spikes", lane: 1, x: 100, w: 58, h: 27, scale: 1 };
  const racer = { lane: 1, x: 100, jumping: false, hitHazards: new Set(), slow: 0, flash: 0, score: 30 };
  race.hazards = [spike];
  race.resolveHazards(racer);
  assert.equal(racer.hitHazards.has(spike.id), true);
  assert.equal(racer.slow, 1.55);
  assert.equal(racer.score, 18);
});

test("the player can accelerate forward, reverse, and release horizontal controls", () => {
  const racer = { isPlayer: true };
  const basePace = getRacePace(88);
  assert.equal(getRaceHorizontalInput(new Set()), 0);
  assert.equal(getRaceHorizontalInput(new Set(["ArrowRight"])), 1);
  assert.equal(getRaceHorizontalInput(new Set(["KeyD"])), 1);
  assert.equal(getRaceHorizontalInput(new Set(["ArrowLeft"])), -1);
  assert.equal(getRaceHorizontalInput(new Set(["KeyA"])), -1);
  assert.equal(getRaceHorizontalInput(new Set(["ArrowLeft", "ArrowRight"])), 0);
  assert.ok(getRaceMovementSpeed(racer, basePace, 0, 1) > basePace);
  assert.ok(getRaceMovementSpeed(racer, basePace, 0, -1) < 0);
  assert.equal(getRaceMovementSpeed(racer, basePace, 0, 0), basePace);
  assert.equal(RACE_PLAYER_HORIZONTAL_CONTROL_SPEED, 170);
});

test("AI racers gain and lose ground independently of the player", () => {
  const faster = getRaceMovementSpeed({ isPlayer: false, aiPaceFactor: 1.12, aiPaceFrequency: 0, aiPacePhase: 0 }, 100);
  const slower = getRaceMovementSpeed({ isPlayer: false, aiPaceFactor: 0.88, aiPaceFrequency: 0, aiPacePhase: 0 }, 100);
  assert.ok(faster > 100);
  assert.ok(slower < 100);
});

test("the race camera pans forward and backward with the player", () => {
  const forwardCamera = getRaceCameraX(-278, 1200, 960, 0, RACE_TRACK_LENGTH_PIXELS);
  assert.ok(forwardCamera > -278);
  const backwardCamera = getRaceCameraX(forwardCamera, 400, 960, 0, RACE_TRACK_LENGTH_PIXELS);
  assert.ok(backwardCamera < forwardCamera);
  const atStart = getRaceCameraX(backwardCamera, 0, 960, 0, RACE_TRACK_LENGTH_PIXELS);
  assert.equal(atStart, -960 * 0.18);
  const atFinish = getRaceCameraX(forwardCamera, RACE_TRACK_LENGTH_PIXELS, 960, 0, RACE_TRACK_LENGTH_PIXELS);
  assert.equal(atFinish, RACE_TRACK_LENGTH_PIXELS - 960 * 0.82);
});


test("every Breaking Race roster image resolves from the public asset tree", async () => {
  const { access } = await import("node:fs/promises");
  const sources = new Set(BREAKING_RACE_ROSTER.flatMap((dinosaur) =>
    [dinosaur.idle, dinosaur.walk, dinosaur.run, dinosaur.jump].filter(Boolean)
  ));
  await Promise.all([...sources].map((source) =>
    access(new URL(`../public/${source}`, import.meta.url))
  ));
});
