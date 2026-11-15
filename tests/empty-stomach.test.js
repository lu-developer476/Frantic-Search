import test from "node:test";
import assert from "node:assert/strict";
import { overlaps, scoreForDistance, getGroundAlignedY, createPredator, enemyAnimationKey, EmptyStomach, ENEMY_CHASE_DURATION } from "../src/minigames/EmptyStomach.js";
import { removeEdgeBackground, getBottomTransparentPadding } from "../src/minigames/AnimatedGif.js";

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

test("Empty Stomach aligns Coral's visible GIF pixels with the floor", () => {
  assert.equal(getGroundAlignedY(366, 72, 198, 44), 382);
  assert.equal(getGroundAlignedY(366, 72, 198, 0), 366);
  assert.equal(getGroundAlignedY(366, 72, 0, 44), 366);
});

test("Animated GIF bottom-padding measurement ignores transparent rows below the sprite", () => {
  const width = 4, height = 6;
  const data = new Uint8ClampedArray(width * height * 4);
  data.set([220, 84, 67, 255], (4 * width + 1) * 4);
  assert.equal(getBottomTransparentPadding({ data, width, height }), 1);
  data.set([220, 84, 67, 255], (5 * width + 1) * 4);
  assert.equal(getBottomTransparentPadding({ data, width, height }), 0);
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

test("Empty Stomach removes edge-connected GIF backgrounds without erasing matching colors inside the sprite", () => {
  const width = 7, height = 7;
  const background = [128, 210, 242, 255];
  const sprite = [220, 84, 67, 255];
  const data = new Uint8ClampedArray(width * height * 4);

  for (let index = 0; index < width * height; index += 1) {
    data.set(background, index * 4);
  }
  for (let y = 2; y <= 4; y += 1) {
    for (let x = 2; x <= 4; x += 1) {
      if (x !== 3 || y !== 3) data.set(sprite, (y * width + x) * 4);
    }
  }

  const removed = removeEdgeBackground({ data, width, height });
  assert.ok(removed > 0);
  assert.equal(data[3], 0, "the outer background becomes transparent");
  assert.equal(data[(3 * width + 3) * 4 + 3], 255, "a matching color enclosed by the sprite remains intact");
  assert.equal(data[(2 * width + 2) * 4 + 3], 255, "the sprite remains opaque");
});

test("Empty Stomach leaves already-transparent GIF frames unchanged", () => {
  const width = 3, height = 3;
  const data = new Uint8ClampedArray(width * height * 4);
  data.set([220, 84, 67, 255], (4) * 4);
  assert.equal(removeEdgeBackground({ data, width, height }), 0);
  assert.equal(data[4 * 4 + 3], 255);
});

test("Empty Stomach uses decoded GIF frames instead of static Image objects", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../src/minigames/EmptyStomach.js", import.meta.url), "utf8");
  assert.match(source, /loadAnimatedGif/);
  assert.match(source, /getAnimatedFrameIndex/);
  assert.doesNotMatch(source, /new Image\(\)/);
});


function makeSimulation({ player, enemies = [], herd = [] }) {
  const simulation = Object.create(EmptyStomach.prototype);
  Object.assign(simulation, {
    elapsed: 0,
    distance: 0,
    spawnTimer: 60,
    preyTimer: 60,
    enemies,
    herd,
    player: { ...player, vy: 0, grounded: true },
    keys: new Set(),
    running: true,
    frame: null
  });
  simulation.finish = () => {
    simulation.running = false;
    simulation.finished = true;
  };
  return simulation;
}

test("Empty Stomach spawns every predator just beyond the canvas left edge", () => {
  assert.equal(ENEMY_CHASE_DURATION, 2);
  for (const kind of ["xenoraptor", "velociraptor"]) {
    const enemy = createPredator(kind, 0);
    assert.equal(enemy.x, -enemy.w);
    assert.equal(enemy.x + enemy.w, 0);
    assert.equal(enemy.state, "chasing");
    assert.equal(enemy.stateTimer, 2);
  }
});

test("Empty Stomach ends the two-second player chase and switches to prey hunting", () => {
  const player = { x: 820, y: 366, w: 88, h: 72 };
  const enemy = createPredator("xenoraptor", 0);
  enemy.x = 80;
  enemy.stateTimer = 0.04;
  const simulation = makeSimulation({ player, enemies: [enemy] });
  const initialX = enemy.x;

  simulation.update(0.04);

  assert.equal(enemy.state, "hunting");
  assert.ok(enemy.x > initialX);
});

test("Empty Stomach predators eat Parasaurolophus, then get carried left while frozen", () => {
  const player = { x: 820, y: 366, w: 88, h: 72 };
  const enemy = createPredator("velociraptor", 0);
  enemy.x = 100;
  enemy.state = "hunting";
  enemy.stateTimer = 0;
  const prey = {
    x: 280,
    y: 366,
    w: 100,
    h: 72,
    phase: 0,
    beingEaten: false,
    beingEatenElapsed: 0,
    animationState: "running"
  };
  const simulation = makeSimulation({ player, enemies: [enemy], herd: [prey] });

  for (let frame = 0; frame < 100 && enemy.state !== "eating"; frame += 1) {
    simulation.update(0.04);
  }

  assert.equal(enemy.state, "eating");
  assert.equal(prey.beingEaten, true);
  const feedingPosition = enemy.x;

  for (let frame = 0; frame < 50 && enemy.state === "eating"; frame += 1) {
    simulation.update(0.04);
  }

  assert.equal(enemy.state, "departing");
  assert.equal(simulation.herd.includes(prey), false);
  assert.equal(enemy.x, feedingPosition);

  const departurePosition = enemy.x;
  const departureAnimation = enemyAnimationKey(enemy, simulation.elapsed);
  simulation.update(0.4);

  assert.equal(enemy.state, "departing");
  assert.ok(enemy.x < departurePosition, "the scrolling canvas carries the predator left");
  assert.equal(enemyAnimationKey(enemy, simulation.elapsed), departureAnimation);
});

test("Empty Stomach changes predator GIFs for running, jumping, eating, and departing", () => {
  const xenoraptor = { kind: "xenoraptor", phase: 0, state: "chasing" };
  assert.equal(enemyAnimationKey(xenoraptor, 0), "xenoraptorRun");
  assert.equal(enemyAnimationKey(xenoraptor, Math.PI / (2 * 3.8)), "xenoraptorJump");
  assert.equal(enemyAnimationKey({ ...xenoraptor, state: "eating" }, 0), "xenoraptorAttack");
  assert.equal(enemyAnimationKey({ ...xenoraptor, state: "departing" }, 0), "xenoraptorJump");

  const velociraptor = { kind: "velociraptor", phase: 0, state: "chasing" };
  assert.equal(enemyAnimationKey(velociraptor, 0), "velociraptorWalk");
  assert.equal(enemyAnimationKey(velociraptor, Math.PI / (2 * 3.8)), "velociraptorJump");
  assert.equal(enemyAnimationKey({ ...velociraptor, state: "eating" }, 0), "velociraptorEat");
  assert.equal(enemyAnimationKey({ ...velociraptor, state: "departing" }, 0), "velociraptorIdle");
});

test("Empty Stomach ends the run when Coral collides with a departing predator", () => {
  const player = { x: 250, y: 366, w: 88, h: 72 };
  const enemy = createPredator("velociraptor", 0);
  enemy.x = 230;
  enemy.state = "departing";
  enemy.stateTimer = 1;
  const simulation = makeSimulation({ player, enemies: [enemy] });

  simulation.update(0.04);

  assert.equal(simulation.finished, true);
  assert.equal(simulation.running, false);
});
