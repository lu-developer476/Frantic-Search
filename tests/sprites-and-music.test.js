import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { AdaptiveMusic } from "../src/audio/AdaptiveMusic.js";
import {
  CAMPAIGN_ANIMATED_REFERENCE_FILES,
  DINOSAUR_REFERENCE_SCALES,
  LIGOCRISTUS_ANIMATION_ASSETS,
  PROLOGUE_ROSA_REFERENCE,
  REFERENCE_PNG_CHARACTERS,
  REFERENCE_PRELOAD_FILES,
  selectLigocristusAnimation,
  SpriteRenderer
} from "../src/rendering/SpriteRenderer.js";
import { ACTOR_ANIMATION_PROFILES, selectActorPose } from "../src/rendering/AnimationProfiles.js";
import { Player } from "../src/entities/Player.js";
import { Beta } from "../src/entities/Beta.js";
import { AutonomousCompanion } from "../src/entities/AutonomousCompanion.js";

class FakeNode {
  constructor() {
    this.gain = {
      value: 1,
      setTargetAtTime() {},
      setValueAtTime() {},
      linearRampToValueAtTime() {},
      exponentialRampToValueAtTime() {}
    };
    this.frequency = { setValueAtTime() {} };
    this.connections = [];
    this.stopped = false;
  }
  connect(target) { this.connections.push(target); }
  disconnect() {}
  start() {}
  stop() { this.stopped = true; }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = "running";
    this.destination = {};
    this.nodes = [];
  }
  createGain() { const node = new FakeNode(); this.nodes.push(node); return node; }
  createOscillator() { const node = new FakeNode(); this.nodes.push(node); return node; }
  createBiquadFilter() { const node = new FakeNode(); this.nodes.push(node); return node; }
}

function createRenderContext() {
  const calls = [];
  return {
    calls,
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    save() {},
    restore() {},
    translate(...args) { calls.push(["translate", ...args]); },
    scale(...args) { calls.push(["scale", ...args]); },
    rotate(...args) { calls.push(["rotate", ...args]); },
    drawImage(...args) { calls.push(["drawImage", ...args]); }
  };
}

function rendererWithReference(file, image = {}) {
  const renderer = Object.create(SpriteRenderer.prototype);
  const reference = {
    complete: true,
    naturalWidth: 1136,
    naturalHeight: 943,
    file,
    ...image
  };
  renderer.referenceImages = new Map([[file, reference]]);
  renderer.referenceBounds = new Map([[file, { x: 18, y: 22, width: 820, height: 380 }]]);
  return { renderer, reference };
}

test("every PNG in public/references is registered as a renderable character", () => {
  const pngFiles = readdirSync(resolve("public/references")).filter((name) => name.endsWith(".png")).sort();
  const registered = [...new Set(Object.values(REFERENCE_PNG_CHARACTERS)
    .flatMap((definition) => [definition.file, definition.first, definition.second].filter(Boolean)))].sort();
  assert.deepEqual(registered, pngFiles);
});

test("active characters resolve their intended reference images", () => {
  assert.equal(REFERENCE_PNG_CHARACTERS.blue.file, "adult-velociraptor-nublarensis.png");
  assert.equal(REFERENCE_PNG_CHARACTERS.beta.file, "juvenile-velociraptor-nublarensis.png");
  assert.equal(REFERENCE_PNG_CHARACTERS.vasti.file, "vastatosaurus-rex.png");
  assert.equal(REFERENCE_PNG_CHARACTERS.ferrucutus.file, "ferrucutus-cerastes.png");
  assert.equal(REFERENCE_PNG_CHARACTERS.indoraptor.first, "indoraptor-first-generation.png");
  assert.equal(REFERENCE_PNG_CHARACTERS.indominus.first, "indominus-rex-first-generation.png");
  assert.equal(REFERENCE_PNG_CHARACTERS.ligocristus, undefined);
});

test("the requested dinosaur silhouettes use consistent, species-specific visual scales", () => {
  assert.equal(REFERENCE_PNG_CHARACTERS.blue.scale, DINOSAUR_REFERENCE_SCALES.violeta);
  assert.equal(REFERENCE_PNG_CHARACTERS.vasti.scale, DINOSAUR_REFERENCE_SCALES.vastatosaurusRex);
  assert.equal(DINOSAUR_REFERENCE_SCALES.ligocristusInnocens, 0.9);
  assert.equal(REFERENCE_PNG_CHARACTERS["venatosaurus-impavidus"].scale, DINOSAUR_REFERENCE_SCALES.venatosaurusImpavidus);

  assert.equal(REFERENCE_PNG_CHARACTERS.beta.scale, DINOSAUR_REFERENCE_SCALES.rosa);
  assert.equal(REFERENCE_PNG_CHARACTERS.rosa.scale, DINOSAUR_REFERENCE_SCALES.rosa);
  assert.ok(48 * DINOSAUR_REFERENCE_SCALES.rosa > 76 * DINOSAUR_REFERENCE_SCALES.ligocristusInnocens);
  assert.ok(48 * DINOSAUR_REFERENCE_SCALES.rosa < 64 * DINOSAUR_REFERENCE_SCALES.violeta);
  assert.ok(DINOSAUR_REFERENCE_SCALES.violeta > 1.42);
  assert.ok(DINOSAUR_REFERENCE_SCALES.vastatosaurusRex > DINOSAUR_REFERENCE_SCALES.rosa);
  assert.ok(DINOSAUR_REFERENCE_SCALES.vastatosaurusRex > 1.45);
  assert.ok(DINOSAUR_REFERENCE_SCALES.ligocristusInnocens < 1.18);
  assert.ok(DINOSAUR_REFERENCE_SCALES.venatosaurusImpavidus < REFERENCE_PNG_CHARACTERS["venatosaurus-saevidicus"].scale);
});

test("Ligocristus uses its four animated reference GIFs instead of the removed PNG", () => {
  const files = Object.values(LIGOCRISTUS_ANIMATION_ASSETS);
  const referenceDirectory = new Set(readdirSync(resolve("public/references")));
  assert.deepEqual(LIGOCRISTUS_ANIMATION_ASSETS, {
    idle: "ligocristus-innocens-idle.gif",
    jump: "ligocristus-innocens-jump.gif",
    run: "ligocristus-innocens-run.gif",
    walk: "ligocristus-innocens-walk.gif"
  });
  for (const file of files) {
    assert.ok(referenceDirectory.has(file), `Missing Ligocristus GIF: ${file}`);
    assert.ok(CAMPAIGN_ANIMATED_REFERENCE_FILES.includes(file));
  }
  assert.equal(REFERENCE_PRELOAD_FILES.some((file) => /ligocristus.*\.png/.test(file)), false);
  assert.equal(selectLigocristusAnimation({ state: "grazing" }), LIGOCRISTUS_ANIMATION_ASSETS.idle);
  assert.equal(selectLigocristusAnimation({ state: "foraging", motionSpeed: 25 }), LIGOCRISTUS_ANIMATION_ASSETS.walk);
  assert.equal(selectLigocristusAnimation({ state: "fleeing", motionSpeed: 74 }), LIGOCRISTUS_ANIMATION_ASSETS.run);
  assert.equal(selectLigocristusAnimation({ onGround: false }), LIGOCRISTUS_ANIMATION_ASSETS.jump);

  const frame = { image: { id: "ligocristus-gif-frame" }, delay: 100, bottomPadding: 2 };
  const renderer = Object.create(SpriteRenderer.prototype);
  renderer.animatedReferences = new Map([[LIGOCRISTUS_ANIMATION_ASSETS.run, {
    width: 120,
    height: 68,
    bottomPadding: 0,
    frames: [frame]
  }]]);
  renderer.animatedReferencePromises = new Map();
  const context = createRenderContext();
  assert.equal(renderer.drawAnimated(context, "ligocristus", 10, 20, 76, 54, {
    state: "fleeing",
    motionSpeed: 74,
    direction: 1
  }, 0.4), true);
  assert.ok(context.calls.some(([name, image]) => name === "drawImage" && image === frame.image));
});

test("phase-aware reference selection switches both bosses to their second-generation PNG", () => {
  const renderer = Object.create(SpriteRenderer.prototype);
  assert.equal(renderer.getReferenceConfig("indoraptor", { phase: 1 }).file, "indoraptor-first-generation.png");
  assert.equal(renderer.getReferenceConfig("indoraptor", { phase: 2 }).file, "indoraptor-second-generation.png");
  assert.equal(renderer.getReferenceConfig("indominus", { phase: 2 }).file, "indominus-rex-second-generation.png");
  assert.equal(renderer.getReferenceConfig("indoraptor", { generation: "second" }).generation, 2);
});

test("reference images are loaded from the Vite base path and cached", () => {
  const previousImage = globalThis.Image;
  class FakeImage {
    constructor() { this.complete = false; this.naturalWidth = 0; this.src = ""; }
  }
  globalThis.Image = FakeImage;
  try {
    const renderer = new SpriteRenderer("/game/");
    const first = renderer.getReferenceImage("adult-velociraptor-nublarensis.png");
    const second = renderer.getReferenceImage("adult-velociraptor-nublarensis.png");
    assert.equal(first, second);
    assert.equal(first.src, "/game/references/adult-velociraptor-nublarensis.png?v=20261118-campaign-ligocristus-gif-routing-1");
    assert.equal(renderer.referenceImages.size, REFERENCE_PRELOAD_FILES.length);
    assert.ok([...renderer.referenceImages.values()].every((image) => /\.png\?v=/.test(image.src)));
    assert.equal(renderer.readiness().total, REFERENCE_PRELOAD_FILES.length + CAMPAIGN_ANIMATED_REFERENCE_FILES.length);
    assert.equal(renderer.referenceImages.has(PROLOGUE_ROSA_REFERENCE), false);
  } finally {
    if (previousImage === undefined) delete globalThis.Image;
    else globalThis.Image = previousImage;
  }
});

test("Rosa stays still while asleep and starts her decoded GIF animation on waking", () => {
  const renderer = Object.create(SpriteRenderer.prototype);
  const firstFrame = { image: { id: "rosa-frame-1" }, delay: 100, bottomPadding: 4 };
  const secondFrame = { image: { id: "rosa-frame-2" }, delay: 100, bottomPadding: 4 };
  renderer.animatedReferences = new Map([[PROLOGUE_ROSA_REFERENCE, {
    width: 160,
    height: 56,
    bottomPadding: 4,
    frames: [firstFrame, secondFrame]
  }]]);
  renderer.animatedReferencePromises = new Map();
  const context = createRenderContext();
  const actor = { id: "prologue-rosa", facing: -1, state: "resting" };

  assert.equal(renderer.drawPrologueRosa(context, 100, 200, 54, 54, actor, 0.11, 1, true), true);
  assert.equal(context.calls.find(([name]) => name === "drawImage")?.[1], firstFrame.image);
  const sleepingPosition = context.calls.find(([name]) => name === "translate");

  context.calls.length = 0;
  assert.equal(renderer.drawPrologueRosa(context, 100, 200, 54, 54, actor, 0.55, 1, true), true);
  assert.equal(context.calls.find(([name]) => name === "drawImage")?.[1], firstFrame.image);
  assert.deepEqual(context.calls.find(([name]) => name === "translate"), sleepingPosition);

  actor.state = "running";
  context.calls.length = 0;
  assert.equal(renderer.drawPrologueRosa(context, 100, 200, 54, 54, actor, 0.11), true);
  assert.equal(context.calls.find(([name]) => name === "drawImage")?.[1], secondFrame.image);

  context.calls.length = 0;
  assert.equal(renderer.drawPrologueRosa(context, 100, 200, 54, 54, actor, 0.21), true);
  assert.equal(context.calls.find(([name]) => name === "drawImage")?.[1], firstFrame.image);
  assert.ok(context.calls.some(([name, x]) => name === "scale" && x === -1));
  assert.equal(context.imageSmoothingEnabled, false);
});

test("PNG drawing uses alpha-cropped source bounds, pixel sampling and character facing", () => {
  const file = "vastatosaurus-rex.png";
  const { renderer, reference } = rendererWithReference(file);
  const context = createRenderContext();
  const drawn = renderer.drawReferencePng(
    context, "vasti", 100, 200, 82, 72,
    { id: "vasti-test", facing: 1 }, 0.4, { alpha: 0.5, facing: 1 }
  );
  assert.equal(drawn, true);
  const call = context.calls.find(([name]) => name === "drawImage");
  assert.ok(call);
  assert.equal(call[1], reference);
  assert.equal(call[2], 18);
  assert.equal(call[3], 22);
  assert.equal(call[4], 820);
  assert.equal(call[5], 380);
  assert.equal(context.imageSmoothingEnabled, false);
  assert.ok(context.calls.some(([name, x]) => name === "scale" && x === -1));
  assert.equal(context.globalAlpha, 0.5);
});

test("reference dinosaur outlines use a fine, pure-black two-pixel contour", () => {
  const previousOffscreenCanvas = globalThis.OffscreenCanvas;
  const surfaces = [];

  class FakeOffscreenCanvas {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.context = {
        calls: [],
        imageSmoothingEnabled: true,
        globalCompositeOperation: "source-over",
        fillStyle: "",
        drawImage(...args) { this.calls.push(["drawImage", ...args]); },
        fillRect(...args) { this.calls.push(["fillRect", ...args]); }
      };
      surfaces.push(this);
    }
    getContext() { return this.context; }
  }

  globalThis.OffscreenCanvas = FakeOffscreenCanvas;
  try {
    const file = "vastatosaurus-rex.png";
    const { renderer, reference } = rendererWithReference(file);
    const outlined = renderer.getOutlinedReferenceImage(
      file,
      reference,
      { x: 18, y: 22, width: 820, height: 380 },
      32,
      16
    );

    assert.equal(outlined.width, 36);
    assert.equal(outlined.height, 20);
    assert.equal(surfaces.length, 2);
    assert.equal(surfaces[0].context.fillStyle, "#000000");

    const outlineDraws = surfaces[1].context.calls
      .filter(([operation]) => operation === "drawImage");
    const dilationDraws = outlineDraws.slice(0, -1);
    assert.equal(dilationDraws.length, 13);
    assert.ok(dilationDraws.some(([, source, x, y]) => source === surfaces[0] && x === 2 && y === 0));
    assert.ok(!dilationDraws.some(([, source, x, y]) =>
      source === surfaces[0] && Math.abs(x) === 2 && Math.abs(y) === 2
    ));
    assert.deepEqual(outlineDraws.at(-1), [
      "drawImage", reference, 18, 22, 820, 380, 2, 2, 32, 16
    ]);
  } finally {
    if (previousOffscreenCanvas === undefined) delete globalThis.OffscreenCanvas;
    else globalThis.OffscreenCanvas = previousOffscreenCanvas;
  }
});

test("Indoraptor gameplay rendering draws the generation-two PNG in phase two", () => {
  const file = "indoraptor-second-generation.png";
  const { renderer, reference } = rendererWithReference(file);
  const context = createRenderContext();
  const drawn = renderer.drawAnimated(context, "indoraptor", 10, 20, 136, 127, {
    id: "indo-phase-two",
    phase: 2,
    direction: 1,
    state: "stalking",
    motionSpeed: 0
  }, 0.5, {});
  assert.equal(drawn, true);
  assert.equal(context.calls.find(([name]) => name === "drawImage")?.[1], reference);
});

test("Violeta and Vasti player rendering reads their PNG references directly", () => {
  for (const [character, file] of [
    ["blue", "adult-velociraptor-nublarensis.png"],
    ["vasti", "vastatosaurus-rex.png"]
  ]) {
    const { renderer, reference } = rendererWithReference(file);
    const context = createRenderContext();
    const player = { id: character, facing: 1, onGround: true, vx: 0, duck: false, animationState: null };
    assert.equal(renderer.drawDinosaur(context, character, 100, 200, 72, 66, player, 0.3), true);
    assert.equal(context.calls.find(([name]) => name === "drawImage")?.[1], reference);
  }
});


test("PNG-backed actors and poachers never request removed SVG sprite files", () => {
  const renderer = Object.create(SpriteRenderer.prototype);
  renderer.drawReferencePng = () => false;
  renderer.get = () => { throw new Error("A removed SVG sprite was requested"); };
  const context = createRenderContext();

  for (const character of [...Object.keys(REFERENCE_PNG_CHARACTERS), "hunter"]) {
    assert.equal(renderer.drawAnimated(context, character, 0, 0, 32, 32, {}, 0), false);
  }
  assert.equal(renderer.drawDinosaur(context, "blue", 0, 0, 32, 32, {}, 0), false);
});

test("failed reference-image loads are reported without retrying the missing asset", () => {
  const previousImage = globalThis.Image;
  const instances = [];
  const notifications = [];
  class FakeImage {
    constructor() {
      this.complete = false;
      this.naturalWidth = 0;
      this.src = "";
      instances.push(this);
    }
  }
  globalThis.Image = FakeImage;
  try {
    const renderer = new SpriteRenderer("/", (file, readiness, status) => notifications.push({ file, status }));
    const file = "adult-velociraptor-nublarensis.png";
    instances[0].onerror();
    assert.deepEqual(notifications[0], { file, status: "error" });
    assert.equal(renderer.getReferenceImage(file), null);
    assert.equal(instances.length, REFERENCE_PRELOAD_FILES.length);
  } finally {
    if (previousImage === undefined) delete globalThis.Image;
    else globalThis.Image = previousImage;
  }
});

test("single-image characters preserve movement, feeding, impact and recovery action poses", () => {
  assert.equal(selectActorPose("blue", { animationState: "eat" }), "violeta-eat");
  assert.equal(selectActorPose("beta", { animationState: "eat" }), "rosa-eat");
  assert.equal(selectActorPose("vasti", { animationState: "eat" }), "vasti-eat");
  assert.equal(selectActorPose("hunter", { state: "stunned" }), "hunter-impact");
  assert.equal(selectActorPose("indoraptor", { state: "recovering" }), "indoraptor-recover");
  assert.match(selectActorPose("beta", { state: "following", motionSpeed: 120 }, 0.4), /^rosa-run-/);
  assert.match(selectActorPose("indoraptor", { state: "stalking", motionSpeed: 90 }, 0.4), /^indoraptor-run-/);
});

test("Violeta keeps her double jump and dash, while Vasti keeps stomp and aerial slam", () => {
  const violeta = new Player("blue", 100, 430);
  assert.equal(violeta.jump(), true);
  assert.equal(violeta.jump(), true);
  assert.equal(violeta.jump(), false);
  assert.equal(violeta.useAbility(), true);
  assert.ok(violeta.dashTimer > 0);

  const groundedVasti = new Player("vasti", 100, 430);
  assert.equal(groundedVasti.useAbility(), true);
  assert.equal(groundedVasti.animationState, "stomp");
  assert.equal(groundedVasti.consumeShockwave(), true);

  const airborneVasti = new Player("vasti", 100, 430);
  airborneVasti.onGround = false;
  assert.equal(airborneVasti.useAbility(), true);
  assert.equal(airborneVasti.animationState, "slam");
  assert.equal(airborneVasti.isSlamming, true);
});

test("Violeta and Vasti cannot crouch even when the input reports duck", () => {
  const crouchInput = {
    isDown: (action) => action === "duck",
    consume: () => false
  };

  for (const character of ["blue", "vasti"]) {
    const player = new Player(character, 100, 430);
    const standingHeight = player.h;
    player.update(1 / 60, crouchInput);
    assert.equal(player.h, standingHeight);
    assert.equal(player.y, 430 - standingHeight);
  }

  assert.equal(ACTOR_ANIMATION_PROFILES.blue.duck, undefined);
  assert.equal(ACTOR_ANIMATION_PROFILES.vasti.duck, undefined);
});

test("Rosa's escort lunge breaks crates but does not destroy rocks", () => {
  const rosa = new Beta({ x: 100, groundY: 430 });
  assert.equal(rosa.rescue(), true);
  const crate = { id: "crate-test", type: "crate", x: 128, y: 378, w: 52, h: 52 };
  const rock = { id: "rock-test", type: "rock", x: 300, y: 372, w: 56, h: 58 };
  const world = { obstacles: [crate, rock] };
  const player = { x: 500, y: 368, w: 64, h: 62 };

  let event = null;
  for (let frame = 0; frame < 30 && world.obstacles.includes(crate); frame += 1) {
    event = rosa.update(1 / 60, player, world) ?? event;
  }

  assert.equal(world.obstacles.includes(crate), false);
  assert.equal(world.obstacles.includes(rock), true);
  assert.equal(event?.type, "rosa-crate-break");
  assert.ok(rosa.dashCooldown > 0);
});

test("the header shows only the italicized, bold Frantic Search link", () => {
  const html = readFileSync(resolve("index.html"), "utf8");
  assert.match(html, /<a class="brand"[^>]*><strong><em>FRANTIC SEARCH<\/em><\/strong><\/a>/);
  assert.doesNotMatch(html, /OPERATION:.*LOST HATCHLING/);
});

test("player and autonomous companion expose independent health values", () => {
  const player = new Player("blue", 100, 430);
  const companion = new AutonomousCompanion("vasti", 0, 430);
  assert.equal(player.maxHealth, 5);
  assert.equal(player.health, player.maxHealth);
  assert.equal(companion.actor.maxHealth, 5);
  assert.equal(companion.actor.health, companion.actor.maxHealth);
  assert.equal(companion.actor.takeHit(), true);
  assert.equal(companion.actor.health, 4);
});

test("the player HUD has an accessible health meter and captive labels are removed", () => {
  const html = readFileSync(resolve("index.html"), "utf8");
  const main = readFileSync(resolve("src/main.js"), "utf8");
  assert.match(html, /id="player-health-meter"/);
  assert.match(html, /id="player-health-fill"/);
  assert.match(main, /updatePlayerHealthHud\(\)/);
  assert.match(main, /drawReferenceHealthBar\(actor\)/);
  assert.doesNotMatch(main, /FERRUCUTUS \/\/ CONFINED/);
  assert.doesNotMatch(main, /CAPTIVE FREE/);
  assert.match(main, /spriteW: 76, spriteH: 54/);
});

test("character picker uses repository PNGs and poachers retain a Canvas fallback", () => {
  const html = readFileSync(resolve("index.html"), "utf8");
  const main = readFileSync(resolve("src/main.js"), "utf8");
  assert.match(html, /references\/adult-velociraptor-nublarensis\.png/);
  assert.match(html, /references\/vastatosaurus-rex\.png/);
  assert.match(main, /Poachers have no supplied PNG reference/);
  assert.match(main, /drawHunter\(hunter\)/);
});

test("the original adaptive soundtrack still changes themes and stops cleanly", () => {
  const music = new AdaptiveMusic();
  const context = new FakeAudioContext();
  assert.equal(music.start(context, "coastal"), true);
  music.schedule();
  assert.ok(context.nodes.length > 1);
  music.setTheme("boss");
  assert.equal(music.themeName, "boss");
  assert.equal(music.step, 0);
  music.setDucked(true);
  music.setPaused(true);
  music.setEnabled(false);
  music.stop();
  assert.equal(music.timer, null);
});
