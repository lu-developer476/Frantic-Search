import test from "node:test";
import assert from "node:assert/strict";
import { canCompleteSection, createWavePlan, formatHunterLabel, formatTime, nearestTarget } from "../src/minigames/Hunting.js";

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
