import test from "node:test";
import assert from "node:assert/strict";
import { HunterGrenade } from "../src/entities/HunterGrenade.js";
import { readFile } from "node:fs/promises";
import {
  canCompleteSection,
  canCompletePredatorSection,
  createWavePlan,
  createPredatorWavePlan,
  formatHunterLabel,
  formatTime,
  getHuntingCameraFollowDelta,
  nearestTarget,
  Hunting,
  HUNTER_MAGAZINE_SIZE,
  HUNTER_RELOAD_DURATION,
  HUNTING_ENEMY_SPAWN_MARGIN,
  TOTAL_DINOSAURS,
  TOTAL_PREDATOR_HUNTERS
} from "../src/minigames/Hunting.js";

test("Sentinel plans four extended waves containing thirty dinosaurs", () => {
  const waves = createWavePlan();
  assert.equal(waves.length, 4);
  assert.deepEqual(waves.map(wave => wave.at), [720, 1680, 2820, 4060]);
  assert.deepEqual(waves.map(wave => wave.kinds.length), [6, 7, 8, 9]);
  assert.equal(waves.reduce((sum, wave) => sum + wave.kinds.length, 0), 30);
  assert.equal(TOTAL_DINOSAURS, 30);
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
  const fullClear = Array.from({ length: TOTAL_DINOSAURS }, () => ({ defeated: true }));
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
  assert.equal(Number(getHuntingCameraFollowDelta(100, playerWidth, 1280).toFixed(1)), -181.6);
  assert.equal(getHuntingCameraFollowDelta(Number.NaN, playerWidth, viewportWidth), 0);
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

test("Predator has four progressive hunter waves and requires a full clear", () => {
  const waves = createPredatorWavePlan();
  assert.equal(waves.length, 4);
  assert.deepEqual(waves.map(wave => wave.count), [2, 2, 3, 3]);
  assert.equal(TOTAL_PREDATOR_HUNTERS, 10);
  const defeated = Array.from({ length: TOTAL_PREDATOR_HUNTERS }, () => ({ defeated: true, health: 0 }));
  const surviving = defeated.map((hunter, index) => index === 5 ? { defeated: false, health: 1 } : hunter);
  assert.equal(canCompletePredatorSection(5200, 5135, defeated, 4, 4), true);
  assert.equal(canCompletePredatorSection(5200, 5135, surviving, 4, 4), false);
  assert.equal(canCompletePredatorSection(5100, 5135, defeated, 4, 4), false);
  assert.equal(canCompletePredatorSection(5200, 5135, defeated, 3, 4), false);
});

test("Every armed hunter, player or AI, is limited by magazine, reload and firing cadence", () => {
  const simulation = Object.create(Hunting.prototype);
  simulation.projectiles = [];
  simulation.particles = [];
  const shooter = {
    id: "weapon-test",
    x: 100, y: 200, w: 38, h: 64,
    direction: 1, health: 3, downTimer: 0, defeated: false,
    ammo: 1, reserveAmmo: 2, reloadTimer: 0,
    fireCooldown: 0, shotInterval: 0.4
  };

  assert.equal(simulation.fire(shooter, 500, 220), true);
  assert.equal(shooter.ammo, 0);
  assert.equal(simulation.fire(shooter, 500, 220), false, "empty magazines cannot fire");
  assert.equal(shooter.reloadTimer, HUNTER_RELOAD_DURATION);
  assert.equal(simulation.projectiles.length, 1);

  shooter.reloadTimer = 0;
  shooter.ammo = HUNTER_MAGAZINE_SIZE;
  shooter.reserveAmmo = 0;
  shooter.fireCooldown = 0.2;
  assert.equal(simulation.fire(shooter, 500, 220), false, "weapon cadence prevents rapid fire");
  assert.equal(simulation.projectiles.length, 1);
});

test("Weapon reload transfers only the available reserve ammunition", () => {
  const simulation = Object.create(Hunting.prototype);
  const shooter = { health: 3, ammo: 0, reserveAmmo: 3, reloadTimer: 0, fireCooldown: 0 };
  assert.equal(simulation.beginWeaponReload(shooter), true);
  assert.equal(shooter.reloadTimer, HUNTER_RELOAD_DURATION);
  simulation.updateWeapon(shooter, HUNTER_RELOAD_DURATION);
  assert.equal(shooter.ammo, 3);
  assert.equal(shooter.reserveAmmo, 0);
});

test("Predator waves spawn armed hunters beyond the live viewport edge", () => {
  const simulation = { mode: "predator", cameraX: 420, hunters: [] };
  Hunting.prototype.spawnWave.call(simulation, { at: 620, count: 2 });
  assert.equal(simulation.hunters.length, 2);
  assert.ok(simulation.hunters.every(hunter => hunter.x - simulation.cameraX > 960));
  assert.ok(simulation.hunters.every(hunter => hunter.ammo === 5 && hunter.reserveAmmo === 5));
  assert.ok(simulation.hunters.every(hunter => hunter.shotInterval === 1.2));
});

test("Hunting exposes both mode controls and documents role-specific weapon restrictions", async () => {
  const [source, markup] = await Promise.all([
    readFile(new URL("../src/minigames/Hunting.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8")
  ]);
  assert.match(source, /requestStart\("sentinel"\)/);
  assert.match(source, /requestStart\("predator"\)/);
  assert.match(source, /beginWeaponReload\(hunter\)/);
  assert.match(source, /updateWeapon\(hunter, delta\)/);
  assert.match(source, /startPredatorAttack\(\)/);
  assert.match(markup, /data-ta-start/);
  assert.match(markup, /data-ta-predator/);
});


test("Predator player starts with one hundred health points", async () => {
  const source = await readFile(new URL("../src/minigames/Hunting.js", import.meta.url), "utf8");
  assert.match(source, /PREDATOR_PLAYER_HEALTH = 100/);
  assert.match(source, /this\.player\.health = PREDATOR_PLAYER_HEALTH/);
  assert.match(source, /this\.player\.maxHealth = PREDATOR_PLAYER_HEALTH/);
});

test("defeated Cacería enemies are hidden instead of rendered as faded sprites", async () => {
  const source = await readFile(new URL("../src/minigames/Hunting.js", import.meta.url), "utf8");
  assert.match(source, /if \(!hunter \|\| hunter\.defeated \|\| \(this\.mode === "predator" && hunter\.health <= 0\)\) return/);
  assert.match(source, /if \(!dinosaur \|\| dinosaur\.defeated \|\| dinosaur\.health <= 0\) return/);
  assert.match(source, /const alpha = hunter\.health > 0[\s\S]{0,100}: 0\.3/);
  assert.match(source, /drawTacticalEffect/);
});



test("Sentinel's human player can throw animated area grenades with a cooldown", () => {
  const simulation = Object.create(Hunting.prototype);
  simulation.running = true;
  simulation.mode = "sentinel";
  simulation.player = {
    id: "hunting-human-player", x: 100, y: 300, w: 38, h: 64,
    direction: 1, health: 4, defeated: false, grenadeCooldown: 0, grenadeCount: 0, squadIndex: 0
  };
  simulation.dinosaurs = [];
  simulation.pointer = { active: true, x: 350 };
  simulation.cameraX = 50;
  simulation.grenades = [];
  simulation.burst = () => {};

  assert.equal(simulation.throwPlayerGrenade(), true);
  assert.ok(simulation.grenades[0] instanceof HunterGrenade);
  assert.equal(simulation.grenades[0].asset, "orange-grenade.gif");
  assert.equal(simulation.grenades[0].targetX, 400);
  assert.equal(simulation.throwPlayerGrenade(), false);

  simulation.player.grenadeCooldown = 0;
  assert.equal(simulation.throwPlayerGrenade(), true);
  assert.equal(simulation.grenades[1].asset, "yellow-grenade.gif");
});

test("Sentinel documents the G grenade action while Predator keeps its bite controls", async () => {
  const source = await readFile(new URL("../src/minigames/Hunting.js", import.meta.url), "utf8");
  assert.match(source, /event\.code === "KeyG"/);
  assert.match(source, /G lanzar granada/);
  assert.match(source, /G throw grenade/);
  assert.match(source, /throwPlayerGrenade\(\)/);
});
