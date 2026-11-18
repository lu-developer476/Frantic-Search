import test from "node:test";
import assert from "node:assert/strict";
import {
  Persecution,
  createPredator,
  DEFAULT_LANE,
  LANE_COUNT,
  LANE_SCALES,
  LANE_BASELINES,
  MUD_SPEED_MULTIPLIER,
  PIT_FALL_FADE_DURATION,
  CHECKPOINT_INTERVAL_METERS,
  CHECKPOINT_INTERVAL_DISTANCE,
  createEgg,
  getMudShimmerOpacity
} from "../src/minigames/Persecution.js";

function makeSimulation({
  player = {},
  enemies = [],
  herd = [],
  eggs = [],
  rocks = [],
  pits = [],
  mudPuddles = [],
  bushes = []
} = {}) {
  const simulation = Object.create(Persecution.prototype);
  Object.assign(simulation, {
    elapsed: 0,
    distance: 0,
    checkpoint: null,
    checkpointCharges: 0,
    eggsEaten: 0,
    checkpointNoticeTimer: 0,
    spawnTimer: 60,
    preyTimer: 60,
    eggSpawnTimer: 60,
    rockSpawnTimer: 60,
    pitSpawnTimer: 60,
    mudSpawnTimer: 60,
    bushSpawnTimer: 60,
    enemies,
    herd,
    eggs,
    rocks,
    pits,
    mudPuddles,
    bushes,
    carriedItem: null,
    invulnerabilityTimer: 0,
    player: {
      x: 200,
      y: LANE_BASELINES[DEFAULT_LANE] - 66 * LANE_SCALES[DEFAULT_LANE],
      w: 80 * LANE_SCALES[DEFAULT_LANE],
      h: 66 * LANE_SCALES[DEFAULT_LANE],
      baseW: 80,
      baseH: 66,
      lane: DEFAULT_LANE,
      vy: 0,
      grounded: true,
      facing: 1,
      dashDirection: 1,
      dashTimer: 0,
      dashCooldown: 0,
      trappedTimer: 0,
      ...player
    },
    dashDustClouds: [],
    keys: new Set(),
    running: true,
    phase: "playing",
    sceneryOffset: 0
  });
  simulation.finish = (reason = "eaten") => {
    simulation.running = false;
    simulation.finished = true;
    simulation.deathCause = reason;
  };
  return simulation;
}

test("Empty Stomach exposes four depth lanes with increasing scale toward the foreground", () => {
  assert.equal(LANE_COUNT, 4);
  assert.equal(DEFAULT_LANE, 3);
  assert.deepEqual(LANE_SCALES, [0.82, 0.94, 1.06, 1.18]);
  assert.deepEqual(LANE_BASELINES, [448, 474, 500, 526]);
  assert.ok(LANE_BASELINES.every((baseline) => baseline >= 438), "all lanes must sit on the foreground grass band");
  assert.ok(LANE_SCALES[3] > 1, "the closest lane must visibly enlarge dinosaurs beyond their base size");
  assert.ok(LANE_BASELINES.every((baseline, index) => index === 0 || baseline > LANE_BASELINES[index - 1]));
  assert.ok(LANE_SCALES.every((scale, index) => index === 0 || scale > LANE_SCALES[index - 1]));
});

test("Coral can move between all four lanes and cannot leave the playfield", () => {
  const simulation = makeSimulation();
  const originalWidth = simulation.player.w;

  assert.equal(simulation.changeLane(-1), true);
  assert.equal(simulation.player.lane, 2);
  assert.ok(simulation.player.w < originalWidth);
  assert.equal(simulation.player.y + simulation.player.h, LANE_BASELINES[2]);

  assert.equal(simulation.changeLane(-1), true);
  assert.equal(simulation.changeLane(-1), true);
  assert.equal(simulation.player.lane, 0);
  assert.equal(simulation.changeLane(-1), false);
  assert.equal(simulation.changeLane(1), true);
  assert.equal(simulation.player.lane, 1);
});

test("Predators only collide with Coral while they occupy the same lane", () => {
  const enemy = createPredator("xenoraptor", 0, 2);
  enemy.x = 200;
  enemy.laneShiftTimer = 30;
  enemy.stateTimer = 30;
  const simulation = makeSimulation({ enemies: [enemy] });

  simulation.update(0.04);

  assert.equal(simulation.running, true);
  assert.equal(simulation.finished, undefined);
  assert.equal(simulation.player.lane, 3);
  assert.equal(enemy.lane, 2);
});

test("A ground-level pit ends Coral's run immediately", () => {
  const pit = { x: 180, w: 112, lane: DEFAULT_LANE, life: 8, triggered: false };
  const simulation = makeSimulation({ pits: [pit] });

  simulation.update(0.04);

  assert.equal(pit.triggered, true);
  assert.equal(simulation.running, false);
  assert.equal(simulation.finished, true);
  assert.equal(simulation.deathCause, "pit");
});

test("jumping over a pit prevents the lethal ground collision", () => {
  const pit = { x: 180, w: 112, lane: DEFAULT_LANE, life: 8, triggered: false };
  const simulation = makeSimulation({
    player: { y: LANE_BASELINES[DEFAULT_LANE] - 66 * LANE_SCALES[DEFAULT_LANE] - 48, grounded: false, vy: -220 },
    pits: [pit]
  });

  simulation.update(0.04);

  assert.equal(pit.triggered, false);
  assert.equal(simulation.running, true);
});

test("a pit eliminates a predator in its lane", () => {
  const enemy = createPredator("umbraraptor", 0, 3);
  enemy.x = 200;
  enemy.laneShiftTimer = 30;
  enemy.stateTimer = 30;
  const pit = { x: 180, w: 130, lane: 3, life: 8, triggered: false };
  const simulation = makeSimulation({
    player: { x: 700, lane: 2 },
    enemies: [enemy],
    pits: [pit]
  });

  simulation.update(0.04);

  assert.equal(pit.triggered, true);
  assert.equal(enemy.fellIntoPit, true);
  assert.equal(enemy.state, "fading");
  assert.equal(enemy.fadeTimer, 0.9);
});

test("a previously triggered pit still removes herd prey that enters it", () => {
  const prey = {
    x: 200, y: LANE_BASELINES[3] - 50, w: 90, h: 50, lane: 3,
    beingEaten: false, trappedTimer: 0, animationState: "running"
  };
  const pit = { x: 180, w: 130, lane: 3, life: 8, triggered: true };
  const simulation = makeSimulation({
    player: { x: 700, lane: 2 },
    herd: [prey],
    pits: [pit]
  });

  simulation.update(0.04);
  assert.equal(prey.pitfallDefeated, true);
  assert.ok(prey.pitFadeTimer > 0);
  assert.equal(pit.triggered, true);

  simulation.update(PIT_FALL_FADE_DURATION + 0.05);
  assert.equal(simulation.herd.includes(prey), false);
});

test("Mud slows Coral and predators while they cross a puddle", () => {
  const enemy = createPredator("xenoraptor", 0, 3);
  enemy.x = 300;
  enemy.laneShiftTimer = 30;
  enemy.stateTimer = 30;
  const mud = { x: 170, w: 170, lane: 3, life: 8 };
  const simulation = makeSimulation({ enemies: [enemy], mudPuddles: [mud] });
  simulation.keys.add("KeyD");
  const playerStart = simulation.player.x;
  const enemyStart = enemy.x;

  simulation.update(0.04);

  assert.equal(MUD_SPEED_MULTIPLIER, 0.55);
  assert.ok(simulation.player.x - playerStart < 245 * 0.04);
  assert.ok(Math.abs(enemy.x - enemyStart) < 168 * 0.04);
});

test("Bushes conceal Coral and break a predator's direct chase", () => {
  const enemy = createPredator("umbraraptor", 0, 3);
  enemy.x = 200;
  enemy.laneShiftTimer = 30;
  enemy.stateTimer = 30;
  const bush = { x: 170, w: 130, h: 48, lane: 3, life: 8 };
  const simulation = makeSimulation({ enemies: [enemy], bushes: [bush] });

  assert.equal(simulation.isPlayerHidden(), true);
  simulation.update(0.04);

  assert.equal(simulation.running, true);
  assert.equal(enemy.state, "hunting");
  assert.equal(simulation.isPlayerHidden(), true);
});

test("Eggs and stones can only be picked up from Coral's current lane", () => {
  const differentLaneEgg = { kind: "egg", x: 220, y: 415, w: 28, h: 23, vx: 0, lane: 2 };
  const sameLaneRock = { kind: "rock", x: 220, y: 413, w: 34, h: 25, vx: 0, lane: 3 };
  const simulation = makeSimulation({ eggs: [differentLaneEgg], rocks: [sameLaneRock] });

  assert.equal(simulation.interactWithItem(), true);
  assert.equal(simulation.carriedItem, sameLaneRock);
  assert.equal(simulation.eggs.includes(differentLaneEgg), true);
});

test("new cream eggs are upright ovoids with varied brown and pale-yellow speckles", () => {
  const egg = createEgg(2, 420);
  assert.equal(egg.kind, "egg");
  assert.ok(egg.baseH > egg.baseW, "the egg silhouette must be taller than it is wide");
  assert.ok(egg.spots.length >= 10);
  assert.ok(egg.spots.length <= 18);

  const allowedColors = new Set(["#8b6748", "#a47750", "#b58b5c", "#d6c18c", "#e6d6a7", "#f0e3bd"]);
  assert.ok(egg.spots.every((spot) => allowedColors.has(spot.color)));
  assert.ok(egg.spots.every((spot) => spot.radius >= 0.025 && spot.radius <= 0.13));
  assert.ok(new Set(egg.spots.map((spot) => spot.radius)).size > 1, "speckles should use varied sizes");
});

test("mud shimmer pulses over time without changing the slowdown multiplier", () => {
  const samples = [0, 0.12, 0.25, 0.4, 0.6, 0.9].map((time) => getMudShimmerOpacity(time, 0.7));
  assert.ok(samples.every((opacity) => opacity >= 0.035 && opacity <= 0.655));
  assert.ok(new Set(samples.map((opacity) => opacity.toFixed(3))).size > 1);
  assert.equal(MUD_SPEED_MULTIPLIER, 0.55);
});


test("Empty Stomach saves a checkpoint at every 250-meter boundary", () => {
  const simulation = makeSimulation({ player: { x: 318, lane: 2 } });
  simulation.distance = CHECKPOINT_INTERVAL_DISTANCE - 2;

  simulation.update(0.04);

  assert.equal(CHECKPOINT_INTERVAL_METERS, 250);
  assert.equal(simulation.checkpoint.milestone, 1);
  assert.equal(simulation.checkpoint.distance, CHECKPOINT_INTERVAL_DISTANCE);
  assert.equal(simulation.checkpoint.elapsed, simulation.elapsed);
  assert.equal(simulation.checkpoint.playerX, simulation.player.x);
  assert.equal(simulation.checkpoint.playerLane, 2);
  assert.ok(simulation.checkpointNoticeTimer > 0);

  simulation.distance = CHECKPOINT_INTERVAL_DISTANCE * 2 - 2;
  simulation.update(0.04);
  assert.equal(simulation.checkpoint.milestone, 2);
  assert.equal(simulation.checkpoint.distance, CHECKPOINT_INTERVAL_DISTANCE * 2);
});
