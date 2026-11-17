import test from "node:test";
import assert from "node:assert/strict";
import {
  overlaps, scoreForDistance, getGroundAlignedY, createPredator, enemyAnimationKey, ASSETS,
  EmptyStomach, ENEMY_CHASE_DURATION, INTRO_DURATION, PLAYER_WIDTH, PLAYER_HEIGHT,
  DASH_DURATION, DASH_COOLDOWN, DASH_SPEED_MULTIPLIER, ENEMY_STUN_DURATION,
  EGG_INVULNERABILITY_DURATION, ENEMY_TRIP_FADE_DURATION, createEgg,
  CHECKPOINT_INTERVAL_METERS, CHECKPOINT_INTERVAL_DISTANCE, EGGS_PER_CHECKPOINT_CONTINUE
} from "../src/minigames/EmptyStomach.js";
import { removeEdgeBackground, getBottomTransparentPadding } from "../src/minigames/AnimatedGif.js";

test("Empty Stomach resolves every animation from the current GIF asset directory", async () => {
  const { access } = await import("node:fs/promises");
  await Promise.all(Object.entries(ASSETS).map(([key, path]) =>
    access(new URL(`../public/${path}`, import.meta.url)).catch(() => {
      throw new Error(`Missing Empty Stomach asset for ${key}: public/${path}`);
    })
  ));
});

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
  assert.match(source, /"CORAL FUE DEVORADA", "CORAL WAS EATEN"/);
  assert.match(source, /"CORAL CAYÓ AL POZO", "CORAL FELL INTO THE PIT"/);
  assert.doesNotMatch(source, /CORAL FUE DEVORADA · DISTANCIA|CORAL WAS EATEN · DISTANCE/);
});

test("Empty Stomach hides intro description and controls after death, then restores them on retry", () => {
  const nodes = {
    "[data-empty-title]": { hidden: false, textContent: "ESTÓMAGO VACÍO" },
    "[data-empty-subtitle]": { hidden: false },
    "[data-empty-instructions]": { hidden: false },
    "[data-empty-result]": { hidden: true, textContent: "" },
    "[data-empty-retry]": { hidden: true },
    "[data-empty-checkpoint]": { hidden: true, textContent: "" },
    "[data-empty-exit]": { hidden: true }
  };
  const classes = new Set(["playing"]);
  const simulation = Object.create(EmptyStomach.prototype);
  Object.assign(simulation, {
    running: true,
    paused: false,
    frame: null,
    distance: 850,
    checkpoint: null,
    checkpointCharges: 0,
    eggsEaten: 0,
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
  assert.equal(nodes["[data-empty-checkpoint]"].hidden, true);
  assert.equal(nodes["[data-empty-exit]"].hidden, false);

  simulation.reset();
  simulation.running = true;
  simulation.finish("pit");
  assert.equal(nodes["[data-empty-result]"].textContent, "CORAL CAYÓ AL POZO");
  assert.equal(nodes["[data-empty-checkpoint]"].hidden, true);

  simulation.reset();

  assert.equal(nodes["[data-empty-title]"].textContent, "ESTÓMAGO VACÍO");
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
    eggs: [],
    rocks: [],
    carriedItem: null,
    invulnerabilityTimer: 0,
    eggSpawnTimer: 60,
    rockSpawnTimer: 60,
    player: { facing: 1, dashDirection: 1, dashTimer: 0, dashCooldown: 0, ...player, vy: 0, grounded: true },
    dashDustClouds: [],
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

test("Empty Stomach uses a five-second entrance before the survival run begins", () => {
  assert.equal(INTRO_DURATION, 5);
  assert.equal(PLAYER_WIDTH, 80);
  assert.equal(PLAYER_HEIGHT, 66);

  const simulation = Object.create(EmptyStomach.prototype);
  Object.assign(simulation, {
    phase: "intro",
    introElapsed: 0,
    sceneryOffset: 0,
    elapsed: 0,
    distance: 0,
    spawnTimer: 0,
    preyTimer: 0,
    player: { x: -PLAYER_WIDTH, w: PLAYER_WIDTH },
    controlsStrip: { hidden: true }
  });

  simulation.updateIntro(2.5);
  assert.equal(simulation.phase, "intro");
  assert.equal(simulation.player.x, 85, "Coral should be halfway across the intro path");
  assert.equal(simulation.controlsStrip.hidden, true);

  simulation.updateIntro(2.5);
  assert.equal(simulation.phase, "playing");
  assert.equal(simulation.player.x, 250);
  assert.equal(simulation.elapsed, 0, "the survival timer starts after the intro");
  assert.equal(simulation.distance, 0, "intro travel is excluded from the score");
  assert.equal(simulation.spawnTimer, 1.2);
  assert.equal(simulation.preyTimer, 0.8);
  assert.equal(simulation.controlsStrip.hidden, false);
});

test("Empty Stomach starts the intro with Coral fully outside the left edge", () => {
  const selectors = [
    "[data-empty-title]", "[data-empty-subtitle]", "[data-empty-instructions]",
    "[data-empty-result]", "[data-empty-start]", "[data-empty-retry]", "[data-empty-exit]"
  ];
  const nodes = Object.fromEntries(selectors.map((selector) => [selector, { hidden: true, textContent: "" }]));
  const classes = new Set(["active"]);
  const simulation = Object.create(EmptyStomach.prototype);
  Object.assign(simulation, {
    root: {
      querySelector(selector) { return nodes[selector]; },
      classList: {
        contains(name) { return classes.has(name); },
        add(name) { classes.add(name); },
        remove(name) { classes.delete(name); }
      }
    },
    locale: "es",
    pauseButton: { textContent: "", setAttribute(name, value) { this[name] = value; } },
    pauseOverlay: { hidden: true },
    controlsStrip: { hidden: false },
    keys: new Set(),
    running: false,
    paused: false,
    frame: null
  });

  const previousRequest = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = () => 7;
  try {
    simulation.start();
    assert.equal(simulation.phase, "intro");
    assert.equal(simulation.running, true);
    assert.equal(simulation.player.x, -PLAYER_WIDTH);
    assert.equal(simulation.player.x + simulation.player.w, 0);
    assert.equal(simulation.controlsStrip.hidden, true);
  } finally {
    if (previousRequest === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = previousRequest;
  }
});

test("Empty Stomach spawns every predator just beyond the canvas left edge", () => {
  assert.equal(ENEMY_CHASE_DURATION, 2);
  for (const kind of ["xenoraptor", "umbraraptor"]) {
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
  const enemy = createPredator("umbraraptor", 0);
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

  const umbraraptor = { kind: "umbraraptor", phase: 0, state: "chasing" };
  assert.equal(enemyAnimationKey(umbraraptor, 0), "umbraraptorWalk");
  assert.equal(enemyAnimationKey(umbraraptor, Math.PI / (2 * 3.8)), "umbraraptorJump");
  assert.equal(enemyAnimationKey({ ...umbraraptor, state: "eating" }, 0), "umbraraptorEat");
  assert.equal(enemyAnimationKey({ ...umbraraptor, state: "departing" }, 0), "umbraraptorIdle");
});

test("Empty Stomach ends the run when Coral collides with a departing predator", () => {
  const player = { x: 250, y: 366, w: 88, h: 72 };
  const enemy = createPredator("umbraraptor", 0);
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
      ["parasaurRun", "parasaurWalk", "parasaurIdle", "parasaurPerturbed"].map((key) => [
        key,
        { height: 100, bottomPadding: 0, frames }
      ])
    ),
    ctx: {
      drawImage(...args) { drawCalls.push(args); }
    }
  });

  for (const key of ["parasaurRun", "parasaurWalk", "parasaurIdle", "parasaurPerturbed"]) {
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
    "[data-empty-result]",
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
  const spanishInstructions = "A / D O ← / →: MOVERSE · W / S O ↑ / ↓: CAMBIAR CARRIL · ESPACIO: SALTAR · X: EMBESTIR · E: TOMAR / SOLTAR · Q: COMER HUEVO · P: PAUSAR · ESC: SALIR";
  const spanishControls = "A / D O ← / →: MOVERSE · W / S O ↑ / ↓: CARRILES · ESPACIO: SALTAR · X: EMBESTIR · E: OBJETO · Q: HUEVO · ESC: SALIR";
  assert.equal(nodes.get("[data-empty-instructions]").textContent, spanishInstructions);
  assert.equal(nodes.get("[data-empty-controls-text]").textContent, spanishControls);
  assert.equal(simulation.pauseButton.textContent, "P: PAUSAR");
  assert.equal(nodes.get("[data-empty-start]").textContent, "INICIAR");
  assert.equal(nodes.get("[data-empty-retry]").textContent, "RETOMAR");
  assert.equal(nodes.get("[data-empty-exit]").textContent, "SALIR");

  simulation.setLocale("en");
  const englishInstructions = "A / D OR ← / →: MOVE · W / S OR ↑ / ↓: CHANGE LANE · SPACE: JUMP · X: DASH · E: PICK UP / DROP · Q: EAT EGG · P: PAUSE · ESC: EXIT";
  const englishControls = "A / D OR ← / →: MOVE · W / S OR ↑ / ↓: LANES · SPACE: JUMP · X: DASH · E: ITEM · Q: EGG · ESC: EXIT";
  assert.equal(nodes.get("[data-empty-instructions]").textContent, englishInstructions);
  assert.equal(nodes.get("[data-empty-controls-text]").textContent, englishControls);
  assert.equal(simulation.pauseButton.textContent, "P: PAUSE");
  assert.equal(nodes.get("[data-empty-start]").textContent, "START RUN");
  assert.equal(nodes.get("[data-empty-retry]").textContent, "RETRY");
  assert.equal(nodes.get("[data-empty-exit]").textContent, "EXIT");
});

test("Empty Stomach updates the game-over message when the locale changes after Coral is eaten", () => {
  const selectors = [
    "[data-empty-title]", "[data-empty-subtitle]", "[data-empty-instructions]",
    "[data-empty-result]", "[data-empty-controls-text]", "[data-empty-pause-label]",
    "[data-empty-start]", "[data-empty-retry]", "[data-empty-exit]"
  ];
  const nodes = new Map(selectors.map((selector) => [selector, { textContent: "", hidden: false }]));
  const simulation = Object.create(EmptyStomach.prototype);
  Object.assign(simulation, {
    locale: "es",
    phase: "finished",
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
  assert.equal(nodes.get("[data-empty-title]").textContent, "PARTIDA FINALIZADA");
  assert.equal(nodes.get("[data-empty-result]").textContent, "CORAL FUE DEVORADA");
  assert.equal(nodes.get("[data-empty-retry]").textContent, "RETOMAR");

  simulation.setLocale("en");
  assert.equal(nodes.get("[data-empty-title]").textContent, "GAME OVER");
  assert.equal(nodes.get("[data-empty-result]").textContent, "CORAL WAS EATEN");
  assert.equal(nodes.get("[data-empty-retry]").textContent, "RETRY");
});

test("Empty Stomach keeps the pause shortcut only in the right-side control", async () => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(html.includes(
    '<span data-empty-controls-text>A / D O ← / →: MOVERSE · W / S O ↑ / ↓: CARRILES · ESPACIO: SALTAR · X: EMBESTIR · E: OBJETO · Q: HUEVO · ESC: SALIR</span>'
  ));
  assert.ok(html.includes('<button type="button" data-empty-pause>P: PAUSAR</button>'));
  assert.ok(html.includes('<button type="button" data-empty-retry hidden>RETOMAR</button>'));
  assert.ok(html.includes('<button type="button" data-empty-checkpoint hidden>USAR CHECKPOINT</button>'));
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


test("Empty Stomach gives Coral Violeta's short directional dash and cooldown", () => {
  const simulation = makeSimulation({ player: { x: 400, y: 366, w: 80, h: 66, facing: -1 } });
  simulation.phase = "playing";
  assert.equal(DASH_DURATION, 0.2);
  assert.equal(DASH_COOLDOWN, 1.65);
  assert.equal(DASH_SPEED_MULTIPLIER, 2.2);
  assert.equal(simulation.activateDash(), true);
  assert.equal(simulation.player.dashDirection, -1);
  assert.equal(simulation.player.dashTimer, DASH_DURATION);
  assert.equal(simulation.player.dashCooldown, DASH_COOLDOWN);
  assert.equal(simulation.dashDustClouds.length, 1);
  assert.equal(simulation.activateDash(), false, "the dash cannot be repeated during its cooldown");
  const startX = simulation.player.x;
  simulation.update(0.04);
  assert.ok(simulation.player.x < startX, "Coral dashes in the direction she is facing");
  assert.equal(simulation.player.dashTimer, DASH_DURATION - 0.04);
  assert.equal(simulation.player.dashCooldown, DASH_COOLDOWN - 0.04);
});

test("Empty Stomach's dash dust stuns predators in place and lets Coral pass safely", () => {
  const enemy = createPredator("umbraraptor", 0);
  enemy.x = 100;
  enemy.direction = 1;
  enemy.stateTimer = 1.4;
  const simulation = makeSimulation({
    player: { x: 250, y: 366, w: 80, h: 66 },
    enemies: [enemy]
  });
  simulation.phase = "playing";
  assert.equal(simulation.activateDash(), true);
  const enemyStartX = enemy.x;
  simulation.update(0.04);
  assert.equal(enemy.state, "stunned");
  assert.equal(enemy.stateTimer, ENEMY_STUN_DURATION);
  assert.equal(enemy.x, enemyStartX, "a stunned predator remains stationary");
  assert.equal(enemyAnimationKey(enemy, simulation.elapsed), "umbraraptorIdle");
  assert.ok(simulation.player.x > 250, "Coral keeps moving through the dash");
  assert.equal(simulation.running, true, "contact during the dash must not end the run");
  simulation.update(1.9);
  assert.equal(enemy.state, "stunned", "the predator stays stunned for about two seconds");
  simulation.update(0.11);
  assert.equal(enemy.state, "chasing", "the predator resumes its previous behavior after recovery");
});

test("Empty Stomach keeps both instruction labels on a single line", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  assert.ok(source.includes(".empty-stomach-instructions{"));
  assert.ok(source.includes(".empty-stomach-bottom span{"));
  assert.ok(source.includes("white-space:nowrap"));
  assert.ok(source.includes("grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)"));
  assert.ok(source.includes("grid-column:2;min-width:0;white-space:nowrap;text-align:center"));
});


test("four eggs consumed across the run earn one checkpoint continuation", () => {
  const simulation = makeSimulation({ player: { x: 200, y: 366, w: 80, h: 66 } });
  simulation.phase = "playing";

  for (let index = 0; index < EGGS_PER_CHECKPOINT_CONTINUE - 1; index += 1) {
    simulation.carriedItem = { kind: "egg", w: 28, h: 33 };
    assert.equal(simulation.consumeCarriedEgg(), true);
    assert.equal(simulation.checkpointCharges ?? 0, 0);
  }

  simulation.carriedItem = { kind: "rock", w: 34, h: 25 };
  assert.equal(simulation.consumeCarriedEgg(), false);
  assert.equal(simulation.eggsEaten ?? 0, EGGS_PER_CHECKPOINT_CONTINUE - 1);

  simulation.carriedItem = { kind: "egg", w: 28, h: 33 };
  assert.equal(simulation.consumeCarriedEgg(), true);
  assert.equal(simulation.carriedItem, null);
  assert.equal(simulation.invulnerabilityTimer, EGG_INVULNERABILITY_DURATION);
  assert.equal(simulation.eggsEaten, EGGS_PER_CHECKPOINT_CONTINUE);
  assert.equal(simulation.checkpointCharges, 1);
  assert.equal(EGGS_PER_CHECKPOINT_CONTINUE, 4);

  simulation.carriedItem = { kind: "egg", w: 28, h: 33 };
  assert.equal(simulation.consumeCarriedEgg(), true);
  assert.equal(simulation.checkpointCharges, 1, "the next continuation requires four more eggs");
  simulation.update(1);
  assert.equal(simulation.invulnerabilityTimer, 3);
  assert.equal(EGG_INVULNERABILITY_DURATION, 4);
});

test("a checkpoint continuation resumes at the saved 250-meter state and spends one charge", () => {
  const nodes = new Map([
    ["[data-empty-title]", { textContent: "", hidden: false }],
    ["[data-empty-subtitle]", { hidden: false }],
    ["[data-empty-instructions]", { hidden: false }],
    ["[data-empty-result]", { hidden: false }],
    ["[data-empty-start]", { hidden: false }],
    ["[data-empty-retry]", { hidden: false }],
    ["[data-empty-checkpoint]", { hidden: false, textContent: "USE CHECKPOINT" }]
  ]);
  const classes = new Set(["active"]);
  const simulation = makeSimulation({
    player: { x: 700, y: 366, w: 80, h: 66 },
    enemies: [createPredator("umbraraptor", 0)],
    herd: [{ x: 500, y: 366, w: 100, h: 72 }]
  });
  Object.assign(simulation, {
    running: false,
    phase: "finished",
    distance: CHECKPOINT_INTERVAL_DISTANCE + 300,
    elapsed: 22,
    sceneryOffset: 3100,
    checkpoint: {
      milestone: 1,
      distance: CHECKPOINT_INTERVAL_DISTANCE,
      elapsed: 16,
      sceneryOffset: 2600,
      playerX: 340,
      playerLane: 2
    },
    checkpointCharges: 1,
    eggsEaten: 4,
    frame: null,
    controlsStrip: { hidden: true },
    pauseOverlay: { hidden: false },
    keys: new Set(),
    root: {
      querySelector(selector) { return nodes.get(selector); },
      classList: {
        add(name) { classes.add(name); },
        remove(name) { classes.delete(name); }
      }
    },
    render() {}
  });

  const previousRequest = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = () => 17;
  try {
    assert.equal(simulation.continueFromCheckpoint(), true);
    assert.equal(simulation.running, true);
    assert.equal(simulation.phase, "playing");
    assert.equal(simulation.distance, CHECKPOINT_INTERVAL_DISTANCE);
    assert.equal(simulation.elapsed, 16);
    assert.equal(simulation.sceneryOffset, 2600);
    assert.equal(simulation.player.x, 340);
    assert.equal(simulation.player.lane, 2);
    assert.equal(simulation.invulnerabilityTimer, 2);
    assert.equal(simulation.checkpointCharges, 0);
    assert.equal(simulation.eggsEaten, 4, "the egg count is preserved after continuing");
    assert.equal(simulation.enemies.length, 0);
    assert.equal(simulation.herd.length, 0);
    assert.equal(nodes.get("[data-empty-checkpoint]").hidden, true);
    assert.equal(nodes.get("[data-empty-result]").hidden, true);
    assert.equal(simulation.controlsStrip.hidden, false);
  } finally {
    if (previousRequest === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = previousRequest;
  }
});

test("the miniraptor can pick up and drop a black stone", () => {
  const simulation=makeSimulation({player:{x:200,y:366,w:80,h:66}});
  simulation.phase="playing";const stone={kind:"rock",x:285,y:413,w:34,h:25,vx:0};simulation.rocks=[stone];
  assert.equal(simulation.interactWithItem(),true);assert.equal(simulation.carriedItem,stone);
  assert.equal(simulation.rocks.length,0);assert.equal(simulation.interactWithItem(),true);
  assert.equal(simulation.carriedItem,null);assert.equal(simulation.rocks.length,1);assert.ok(simulation.rocks[0].vx>0);
});

test("a dropped black stone makes predators fade out and frees the path", () => {
  const enemy=createPredator("umbraraptor",0);enemy.x=300;enemy.y=352;
  const simulation=makeSimulation({player:{x:100,y:366,w:80,h:66},enemies:[enemy]});
  simulation.phase="playing";simulation.rocks=[{kind:"rock",x:330,y:413,w:34,h:25,vx:0}];
  simulation.update(.04);assert.equal(enemy.state,"fading");assert.ok(enemy.fadeTimer<ENEMY_TRIP_FADE_DURATION);
  simulation.update(1);assert.equal(simulation.enemies.includes(enemy),false);
});

test("predators can target and eat cream eggs", () => {
  const enemy=createPredator("umbraraptor",0);enemy.x=280;enemy.state="hunting";enemy.stateTimer=0;
  const egg={kind:"egg",x:340,y:415,w:28,h:23,vx:0};
  const simulation=makeSimulation({player:{x:80,y:366,w:80,h:66},enemies:[enemy]});
  simulation.phase="playing";simulation.eggs=[egg];simulation.update(.04);
  assert.equal(enemy.state,"eating");assert.equal(enemy.eatTargetType,"egg");
  simulation.update(1.4);assert.equal(simulation.eggs.includes(egg),false);
});


test("egg invulnerability lets Coral pass through predators without ending the run", () => {
  const enemy=createPredator("umbraraptor",0);enemy.x=200;enemy.y=352;
  const simulation=makeSimulation({player:{x:200,y:366,w:80,h:66},enemies:[enemy]});
  simulation.phase="playing";simulation.carriedItem={kind:"egg",w:28,h:23};
  assert.equal(simulation.consumeCarriedEgg(),true);
  simulation.update(.04);
  assert.equal(simulation.running,true);
  assert.ok(simulation.invulnerabilityTimer>0);
});

test("eggs retain their ovoid speckled shell when picked up and carried", () => {
  const egg = createEgg(undefined, 280);
  const simulation = makeSimulation({ player: { x: 200, y: 366, w: 80, h: 66 } });
  simulation.phase = "playing";
  simulation.eggs = [egg];

  assert.equal(simulation.interactWithItem(), true);
  assert.equal(simulation.carriedItem, egg);
  assert.ok(egg.h > egg.w);
  assert.ok(egg.spots.length >= 10);
});
