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

test("Empty Stomach removes the Coral survival caption and keeps the death result concise", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../src/minigames/EmptyStomach.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /CORAL \/\/ SUPERVIVENCIA|CORAL \/\/ SURVIVAL/);
  assert.match(source, /textContent = this\.text\("CORAL FUE DEVORADA", "CORAL WAS EATEN"\)/);
  assert.doesNotMatch(source, /CORAL FUE DEVORADA · DISTANCIA|CORAL WAS EATEN · DISTANCE/);
});

test("Empty Stomach hides intro description and controls after death, then restores them on retry", () => {
  const nodes = {
    "[data-empty-title]": { hidden: false, textContent: "HAMBRE INSACIABLE" },
    "[data-empty-subtitle]": { hidden: false },
    "[data-empty-instructions]": { hidden: false },
    "[data-empty-result]": { hidden: true, textContent: "" },
    "[data-empty-retry]": { hidden: true },
    "[data-empty-exit]": { hidden: true }
  };
  const classes = new Set(["playing"]);
  const simulation = Object.create(EmptyStomach.prototype);
  Object.assign(simulation, {
    running: true,
    paused: false,
    frame: null,
    distance: 850,
    best: 1087,
    locale: "es",
    pauseOverlay: { hidden: true },
    controlsStrip: { hidden: false },
    pauseButton: {
      textContent: "",
      setAttribute(name, value) { this[name] = value; }
    },
    keys: new Set(),
    root: {
      querySelector(selector) { return nodes[selector]; },
      classList: {
        add(name) { classes.add(name); },
        remove(name) { classes.delete(name); }
      }
    },
    render() {}
  });

  simulation.finish();

  assert.equal(nodes["[data-empty-title]"].textContent, "PARTIDA FINALIZADA");
  assert.equal(nodes["[data-empty-subtitle]"].hidden, true);
  assert.equal(nodes["[data-empty-instructions]"].hidden, true);
  assert.equal(nodes["[data-empty-result]"].textContent, "CORAL FUE DEVORADA");
  assert.equal(nodes["[data-empty-retry]"].hidden, false);
  assert.equal(nodes["[data-empty-exit]"].hidden, false);

  simulation.reset();

  assert.equal(nodes["[data-empty-title]"].textContent, "HAMBRE INSACIABLE");
  assert.equal(nodes["[data-empty-subtitle]"].hidden, false);
  assert.equal(nodes["[data-empty-instructions]"].hidden, false);
});

test("Empty Stomach pauses and resumes its animation loop from the keyboard or pause button", () => {
  const classNames = new Set();
  const pauseOverlay = { hidden: true };
  const pauseButton = {
    textContent: "",
    setAttribute(name, value) { this[name] = value; }
  };
  const simulation = Object.create(EmptyStomach.prototype);
  Object.assign(simulation, {
    running: true,
    paused: false,
    frame: 17,
    keys: new Set(["KeyA"]),
    pauseButton,
    pauseOverlay,
    locale: "es",
    root: {
      classList: {
        add(name) { classNames.add(name); },
        remove(name) { classNames.delete(name); }
      }
    }
  });

  const previousCancel = globalThis.cancelAnimationFrame;
  const previousRequest = globalThis.requestAnimationFrame;
  let cancelled = null;
  let scheduled = null;
  globalThis.cancelAnimationFrame = (id) => { cancelled = id; };
  globalThis.requestAnimationFrame = (callback) => { scheduled = callback; return 23; };

  try {
    simulation.pause();
    assert.equal(simulation.running, true);
    assert.equal(simulation.paused, true);
    assert.equal(cancelled, 17);
    assert.equal(simulation.frame, null);
    assert.equal(pauseOverlay.hidden, false);
    assert.equal(pauseButton.textContent, "P: REANUDAR");
    assert.equal(classNames.has("paused"), true);
    assert.equal(simulation.keys.size, 0);

    simulation.resume();
    assert.equal(simulation.paused, false);
    assert.equal(pauseOverlay.hidden, true);
    assert.equal(pauseButton.textContent, "P: PAUSAR");
    assert.equal(classNames.has("paused"), false);
    assert.equal(typeof scheduled, "function");
    assert.equal(simulation.frame, 23);
  } finally {
    if (previousCancel === undefined) delete globalThis.cancelAnimationFrame;
    else globalThis.cancelAnimationFrame = previousCancel;
    if (previousRequest === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = previousRequest;
  }
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


test("Empty Stomach grounds every Parasaurolophus animation frame independently", () => {
  const frames = [
    { image: { id: "raised-feet" }, delay: 100, bottomPadding: 25 },
    { image: { id: "lowered-feet" }, delay: 100, bottomPadding: 10 }
  ];
  const drawCalls = [];
  const simulation = Object.create(EmptyStomach.prototype);
  Object.assign(simulation, {
    elapsed: 0,
    animations: Object.fromEntries(
      ["parasaurRun", "parasaurIdle", "parasaurPerturbed"].map((key) => [
        key,
        { height: 100, bottomPadding: 0, frames }
      ])
    ),
    ctx: {
      drawImage(...args) { drawCalls.push(args); }
    }
  });

  for (const key of ["parasaurRun", "parasaurIdle", "parasaurPerturbed"]) {
    simulation.drawSprite(key, 10, 366, 100, 72, "#8e9b72", 0);
    simulation.drawSprite(key, 10, 366, 100, 72, "#8e9b72", 100);
  }

  for (let index = 0; index < drawCalls.length; index += 2) {
    const [firstImage, firstX, firstY, firstWidth, firstHeight] = drawCalls[index];
    const [secondImage, secondX, secondY, secondWidth, secondHeight] = drawCalls[index + 1];
    assert.equal(firstImage.id, "raised-feet");
    assert.equal(secondImage.id, "lowered-feet");
    assert.equal(firstX, 10);
    assert.equal(secondX, 10);
    const firstBottomPadding = frames[0].bottomPadding;
    const secondBottomPadding = frames[1].bottomPadding;
    const firstVisibleBottom = firstY + firstHeight * (100 - firstBottomPadding) / 100;
    const secondVisibleBottom = secondY + secondHeight * (100 - secondBottomPadding) / 100;
    assert.equal(firstVisibleBottom, 438, "the first frame's visible feet end at the floor");
    assert.equal(secondVisibleBottom, 438, "the second frame's visible feet end at the floor");
    assert.equal(firstWidth, 100);
    assert.equal(secondWidth, 100);
    assert.equal(firstHeight, 72);
    assert.equal(secondHeight, 72);
    assert.notEqual(firstY, secondY, "each frame uses its own transparent bottom padding");
  }
});

test("Animated GIF loader stores visible bottom padding on every decoded frame", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../src/minigames/AnimatedGif.js", import.meta.url), "utf8");
  assert.match(source, /const frameBottomPadding = getBottomTransparentPadding\(snapshotData\)/);
  assert.match(source, /bottomPadding: frameBottomPadding/);
});

test("Empty Stomach includes the pause key in both instruction labels for Spanish and English", () => {
  const selectors = [
    "[data-empty-title]",
    "[data-empty-subtitle]",
    "[data-empty-instructions]",
    "[data-empty-controls-text]",
    "[data-empty-pause-label]",
    "[data-empty-start]",
    "[data-empty-retry]",
    "[data-empty-exit]"
  ];
  const nodes = new Map(selectors.map((selector) => [selector, { textContent: "" }]));
  const simulation = Object.create(EmptyStomach.prototype);
  Object.assign(simulation, {
    locale: "es",
    pauseButton: {
      textContent: "",
      setAttribute(name, value) { this[name] = value; }
    },
    root: {
      querySelector(selector) { return nodes.get(selector); }
    },
    render() {}
  });

  simulation.setLocale("es");
  const spanish = "A / D O ← / →: MOVERSE · ESPACIO / ↑: SALTAR · P: PAUSAR · ESC: SALIR";
  assert.equal(nodes.get("[data-empty-instructions]").textContent, spanish);
  assert.equal(nodes.get("[data-empty-controls-text]").textContent, spanish);

  simulation.setLocale("en");
  const english = "A / D OR ← / →: MOVE · SPACE / ↑: JUMP · P: PAUSE · ESC: EXIT";
  assert.equal(nodes.get("[data-empty-instructions]").textContent, english);
  assert.equal(nodes.get("[data-empty-controls-text]").textContent, english);
});

test("Empty Stomach static gameplay controls include the pause key", async () => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(html.includes(
    '<span data-empty-controls-text>A / D O ← / →: MOVERSE · ESPACIO / ↑: SALTAR · P: PAUSAR · ESC: SALIR</span>'
  ));
});


test("Empty Stomach keeps Parasaurolophus entity coordinates fixed on the floor", () => {
  const prey = {
    x: 400,
    y: 370,
    w: 100,
    h: 72,
    phase: 2.4,
    beingEaten: false,
    beingEatenElapsed: 0,
    animationState: "running"
  };
  const simulation = makeSimulation({
    player: { x: 250, y: 366, w: 88, h: 72 },
    herd: [prey]
  });

  for (let frame = 0; frame < 12; frame += 1) {
    simulation.update(0.04);
    assert.equal(prey.y, 366, "the Parasaurolophus base stays on the floor while moving");
  }
});
