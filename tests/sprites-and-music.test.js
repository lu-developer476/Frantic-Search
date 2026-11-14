import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { AdaptiveMusic } from "../src/audio/AdaptiveMusic.js";
import { DINOSAUR_REFERENCE_SCALES, REFERENCE_PNG_CHARACTERS, SpriteRenderer } from "../src/rendering/SpriteRenderer.js";
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
});

test("the requested dinosaur silhouettes use consistent, species-specific visual scales", () => {
  assert.equal(REFERENCE_PNG_CHARACTERS.blue.scale, DINOSAUR_REFERENCE_SCALES.violeta);
  assert.equal(REFERENCE_PNG_CHARACTERS.vasti.scale, DINOSAUR_REFERENCE_SCALES.vastatosaurusRex);
  assert.equal(REFERENCE_PNG_CHARACTERS.ligocristus.scale, DINOSAUR_REFERENCE_SCALES.ligocristusInnocens);
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
    assert.equal(first.src, "/game/references/adult-velociraptor-nublarensis.png?v=20261113-all-reference-dinosaurs-environments-3");
    assert.equal(renderer.referenceImages.size, 18);
  } finally {
    if (previousImage === undefined) delete globalThis.Image;
    else globalThis.Image = previousImage;
  }
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
  assert.equal(player.maxHealth, 3);
  assert.equal(player.health, player.maxHealth);
  assert.equal(companion.actor.maxHealth, 3);
  assert.equal(companion.actor.health, companion.actor.maxHealth);
  assert.equal(companion.actor.takeHit(), true);
  assert.equal(companion.actor.health, 2);
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
