import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  canCompleteSection,
  createWavePlan,
  formatHunterLabel,
  formatTime,
  getHuntingCameraFollowDelta,
  nearestTarget,
  Hunting,
  HUNTING_ENEMY_SPAWN_MARGIN,
  HUNTING_GROUND_SCENERY_SPAWN_SPACING
} from "../src/minigames/Hunting.js";

test("Time Attack plans four ordered waves containing fourteen dinosaurs", () => {
  const waves = createWavePlan();
  assert.equal(waves.length, 4);
  assert.deepEqual(waves.map(wave => wave.at), [620, 1370, 2170, 3020]);
  assert.equal(waves.reduce((sum, wave) => sum + wave.kinds.length, 0), 14);
  assert.ok(waves.every(wave => wave.kinds.every(kind =>
    ["venatosaurus-impavidus", "venatosaurus-saevidicus"].includes(kind)
  )));
});

test("Time Attack formats a non-negative run time as mm:ss:centiseconds", () => {
  assert.equal(formatTime(0), "00:00:00");
  assert.equal(formatTime(12340), "00:12:34");
  assert.equal(formatTime(61050), "01:01:05");
  assert.equal(formatTime(-100), "00:00:00");
});

test("Time Attack only completes after the squad reaches extraction and every wave is cleared", () => {
  const fullClear = Array.from({ length: 14 }, () => ({ defeated: true }));
  const alive = fullClear.map((item, index) => index === 4 ? { defeated: false } : item);
  assert.equal(canCompleteSection(3680, 3615, fullClear, 4, 4), true);
  assert.equal(canCompleteSection(3680, 3615, alive, 4, 4), false);
  assert.equal(canCompleteSection(3600, 3615, fullClear, 4, 4), false);
  assert.equal(canCompleteSection(3680, 3615, fullClear, 3, 4), false);
});

test("Time Attack AI selects the nearest living dinosaur inside its firing range", () => {
  const hunter = { x: 100, w: 38 };
  const dinosaurs = [
    { x: 500, w: 112, health: 3, defeated: false },
    { x: 240, w: 112, health: 0, defeated: true },
    { x: 285, w: 112, health: 2, defeated: false }
  ];
  assert.equal(nearestTarget(hunter, dinosaurs, 500), dinosaurs[2]);
  assert.equal(nearestTarget(hunter, dinosaurs, 100), null);
});


test("Time Attack localizes the player and AI squad labels", () => {
  assert.equal(formatHunterLabel(0, true, "es"), "VOS");
  assert.equal(formatHunterLabel(0, true, "en"), "YOU");
  assert.equal(formatHunterLabel(1, false, "es"), "IA 1");
  assert.equal(formatHunterLabel(3, false, "en"), "AI 3");
});

test("Hunting camera follows the player in both directions using the live canvas width", () => {
  const viewportWidth = 960;
  const playerWidth = 38;
  const backwardDelta = getHuntingCameraFollowDelta(100, playerWidth, viewportWidth);
  const forwardDelta = getHuntingCameraFollowDelta(800, playerWidth, viewportWidth);

  assert.equal(Number(backwardDelta.toFixed(1)), -111.2);
  assert.equal(Number(forwardDelta.toFixed(1)), 89.2);
  assert.equal(Number((100 - backwardDelta).toFixed(1)), 211.2);
  assert.equal(Number((800 - forwardDelta).toFixed(1)), 710.8);
  assert.equal(getHuntingCameraFollowDelta(480, playerWidth, viewportWidth), 0);
  assert.equal(getHuntingCameraFollowDelta(100, playerWidth, 1280), -181.6);
  assert.equal(getHuntingCameraFollowDelta(Number.NaN, playerWidth, viewportWidth), 0);
});


test("Time Attack streams procedural redwood ground details from both camera edges", () => {
  const simulation = {
    cameraX: 0,
    groundScenery: [],
    groundScenerySpawnIndex: 0,
    nextGroundSceneryX: 960 + 12,
    nextGroundSceneryLeftX: -12
  };

  Hunting.prototype.updateGroundScenery.call(simulation, () => 0.5);

  assert.equal(simulation.groundScenery.length, 2);
  const rightProp = simulation.groundScenery.find(prop => prop.x > 960);
  const leftProp = simulation.groundScenery.find(prop => prop.x < 0);
  assert.ok(rightProp);
  assert.ok(leftProp);
  assert.equal(rightProp.environment, "redwood");
  assert.equal(leftProp.environment, "redwood");
  assert.equal(rightProp.kind, "moss-rock");
  assert.ok(rightProp.x - rightProp.width / 2 > 960);
  assert.ok(leftProp.x + leftProp.width / 2 < 0);

  simulation.cameraX = HUNTING_GROUND_SCENERY_SPAWN_SPACING;
  Hunting.prototype.updateGroundScenery.call(simulation, () => 0.5);

  assert.equal(simulation.groundScenery.length, 3);
  const streamedProp = simulation.groundScenery[2];
  assert.equal(
    Number((streamedProp.x - rightProp.x).toFixed(2)),
    HUNTING_GROUND_SCENERY_SPAWN_SPACING
  );
});

test("Time Attack waves spawn prey just beyond the current right viewport edge", () => {
  const simulation = { cameraX: 345, dinosaurs: [] };
  const wave = {
    at: 620,
    kinds: [
      "venatosaurus-impavidus",
      "venatosaurus-saevidicus",
      "venatosaurus-impavidus"
    ]
  };

  Hunting.prototype.spawnWave.call(simulation, wave);

  const expectedStart = 345 + 960 + HUNTING_ENEMY_SPAWN_MARGIN;
  assert.equal(simulation.dinosaurs.length, 3);
  assert.deepEqual(
    simulation.dinosaurs.map(dinosaur => dinosaur.x),
    [expectedStart, expectedStart + 112, expectedStart + 224]
  );
  assert.ok(simulation.dinosaurs.every(dinosaur =>
    dinosaur.x - simulation.cameraX > 960
  ));
  assert.equal(simulation.dinosaurs[0].patrolStart, expectedStart - 220);
  assert.equal(simulation.dinosaurs[0].patrolEnd, expectedStart + 3 * 112 + 360);
  assert.equal(simulation.dinosaurs[1].health, 4);
});

test("Hunting uses streamed foreground props instead of pre-generated ground details", async () => {
  const source = await readFile(new URL("../src/minigames/Hunting.js", import.meta.url), "utf8");
  assert.match(source, /includeGroundScenery:\s*false/);
  assert.match(source, /ctx\.translate\(-this\.cameraX,\s*0\)/);
  assert.match(source, /drawGroundScenery\(ctx,\s*prop,\s*MINIGAME_ENVIRONMENT_SCENES\.hunting\)/);
});
