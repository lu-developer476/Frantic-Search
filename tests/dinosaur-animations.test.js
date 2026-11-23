import { getRaceAnimationSource } from "../src/minigames/Race.js";
import { getDinosaurRenderScale } from "../src/config/DinosaurSizing.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { IndoraptorBoss } from "../src/entities/IndoraptorBoss.js";
import { IndominusRexBoss } from "../src/entities/IndominusRexBoss.js";
import {
  DINOSAUR_REFERENCE_SCALES,
  REFERENCE_PNG_CHARACTERS,
  REFERENCE_PRELOAD_FILES,
  CAMPAIGN_ANIMATED_REFERENCE_FILES,
  JUVENILE_ANIMATED_CHARACTERS,
  VENATOSAURUS_ANIMATION_ASSETS,
  BRONTOSAURUS_ANIMATION_ASSETS,
  BRISA_ANIMATIONS,
  TACTICAL_COMBAT_EFFECT_SPRITES,
  selectJuvenileAnimation,
  selectBrontosaurusAnimation,
  selectVenatosaurusAnimation,
  SpriteRenderer
} from "../src/rendering/SpriteRenderer.js";
import { ENEMY_FADE_DURATION, beginEnemyFade, advanceEnemyFade, getEnemyOpacity, isEnemyFadeComplete } from "../src/systems/EnemyFadeSystem.js";
import { selectActorPose } from "../src/rendering/AnimationProfiles.js";

test("Brisa selects her dedicated running GIF whenever companion motion is active", () => {
  assert.equal(BRISA_ANIMATIONS.run, "juvenile-velociraptor-abyssomirabilis-run.gif");
  assert.equal(selectJuvenileAnimation({ vx: 0, motionSpeed: 230, state: "following" }), "run");
  assert.equal(selectJuvenileAnimation({ vx: 0, motionSpeed: 0, state: "confined" }), "idle");
  assert.equal(selectJuvenileAnimation({ vx: 240, motionSpeed: 0, state: "running" }), "run");
  assert.equal(selectJuvenileAnimation({ vx: 240, onGround: false, state: "jumping" }), "jump");
});

test("tactical atlas provides muzzle-flash and impact sprites", () => {
  assert.ok(TACTICAL_COMBAT_EFFECT_SPRITES.muzzle.length > 0);
  assert.ok(TACTICAL_COMBAT_EFFECT_SPRITES.impact.length > 0);
  const renderer = Object.create(SpriteRenderer.prototype);
  const atlas = { complete: true, naturalWidth: 452 };
  const draws = [];
  renderer.getReferenceImage = () => atlas;
  const context = {
    globalAlpha: 1,
    save() {},
    restore() {},
    translate() {},
    scale() {},
    drawImage(...args) { draws.push(args); }
  };

  assert.equal(renderer.drawTacticalEffect(context, "muzzle", 100, 60, 0, { size: 32 }), true);
  assert.equal(renderer.drawTacticalEffect(context, "impact", 120, 80, 0, { size: 40 }), true);
  assert.equal(draws.length, 2);
  assert.equal(draws[0][0], atlas);
  assert.equal(draws[0][1], TACTICAL_COMBAT_EFFECT_SPRITES.muzzle[0].x);
  assert.equal(draws[1][1], TACTICAL_COMBAT_EFFECT_SPRITES.impact[0].x);
  assert.equal(renderer.drawTacticalEffect(context, "unknown", 0, 0), false);
});

test("feeding, jumping and combat actions resolve to their own poses", () => {
  assert.equal(selectActorPose("blue", { animationState: "eat" }), "violeta-eat");
  assert.equal(selectActorPose("brisa", { animationState: "eat" }), "rosa-eat");
  assert.equal(selectActorPose("vasti", { animationState: "eat" }), "vasti-eat");
  assert.equal(selectActorPose("indoraptor", { animationState: "eat" }), "indoraptor-eat");
  assert.equal(selectActorPose("indoraptor", { animationState: "jump" }), "indoraptor-jump");
  assert.equal(selectActorPose("indoraptor", { state: "eating" }), "indoraptor-eat");
  assert.equal(selectActorPose("hunter", { state: "stunned" }), "hunter-impact");
});

test("Vastatosaurus Rex is scaled as a large adult beside the raptors", () => {
  assert.equal(DINOSAUR_REFERENCE_SCALES.vastatosaurusRex, getDinosaurRenderScale("basilio"));
  assert.equal(REFERENCE_PNG_CHARACTERS.vasti.scale, getDinosaurRenderScale("basilio"));
  assert.ok(DINOSAUR_REFERENCE_SCALES.vastatosaurusRex > DINOSAUR_REFERENCE_SCALES.violeta);
  assert.ok(DINOSAUR_REFERENCE_SCALES.vastatosaurusRex > DINOSAUR_REFERENCE_SCALES.rosa);
});

test("defeated enemies fade smoothly to full transparency before cleanup", () => {
  const enemy = { defeated: true };
  beginEnemyFade(enemy);
  assert.equal(getEnemyOpacity(enemy), 1);
  advanceEnemyFade(enemy, ENEMY_FADE_DURATION / 2);
  assert.equal(getEnemyOpacity(enemy), 0.5);
  assert.equal(isEnemyFadeComplete(enemy), false);
  advanceEnemyFade(enemy, ENEMY_FADE_DURATION / 2);
  assert.equal(getEnemyOpacity(enemy), 0);
  assert.equal(isEnemyFadeComplete(enemy), true);
});

test("Indoraptor selects its second-generation PNG at the existing phase-two threshold", () => {
  const boss = new IndoraptorBoss({ id: "indo-phase", x: 800, groundY: 300, arenaMinX: 0, arenaMaxX: 1800 });
  assert.equal(boss.generation, 1);
  assert.equal(REFERENCE_PNG_CHARACTERS.indoraptor.first, "indoraptor-first-generation.png");
  assert.equal(REFERENCE_PNG_CHARACTERS.indoraptor.second, "indoraptor-second-generation.png");

  boss.activate();
  boss.state = "recovering";
  boss.takeDamage(4);
  assert.equal(boss.phase, 2);
  assert.equal(boss.generation, 2);
});

test("Indominus exposes the correct reference PNG for both health phases", () => {
  const boss = new IndominusRexBoss({ id: "indominus-phase", x: 800, groundY: 300, arenaMinX: 0, arenaMaxX: 1800 });
  assert.equal(boss.phase, 1);
  assert.equal(REFERENCE_PNG_CHARACTERS.indominus.first, "indominus-rex-first-generation.png");

  boss.activate();
  boss.state = "recovering";
  boss.takeDamage(7);
  assert.equal(boss.phase, 2);
  assert.equal(REFERENCE_PNG_CHARACTERS.indominus.second, "indominus-rex-second-generation.png");
});

test("boss attack states remain distinct from idle and feeding states", () => {
  assert.equal(selectActorPose("indominus", { state: "telegraph", attackName: "roar" }), "indominus-attack");
  assert.match(selectActorPose("indominus", { state: "stalking", motionSpeed: 90 }, 0.5), /^indominus-run-/);
  assert.match(selectActorPose("indominus", { state: "attacking", attackName: "charge" }, 1), /^indominus-run-/);
  assert.equal(selectActorPose("indoraptor", { state: "recovering" }), "indoraptor-recover");
  assert.equal(selectActorPose("indoraptor", { state: "defeated", defeated: true }), "indoraptor-defeated");
});


test("Brontosaurus uses dedicated walking and running GIFs instead of a missing PNG", () => {
  assert.equal(REFERENCE_PNG_CHARACTERS.brontosaurus, undefined);
  assert.equal(BRONTOSAURUS_ANIMATION_ASSETS.walk, "brontosaurus-excelsus-basteri-walk.gif");
  assert.equal(BRONTOSAURUS_ANIMATION_ASSETS.run, "brontosaurus-excelsus-basteri-run.gif");
  assert.equal(BRONTOSAURUS_ANIMATION_ASSETS.sourceFacing, 1);
  assert.equal(VENATOSAURUS_ANIMATION_ASSETS["venatosaurus-impavidus"].sourceFacing, 1);
  assert.equal(VENATOSAURUS_ANIMATION_ASSETS["venatosaurus-saevidicus"].sourceFacing, 1);
  assert.equal(selectBrontosaurusAnimation({ state: "grazing", motionSpeed: 0 }), BRONTOSAURUS_ANIMATION_ASSETS.walk);
  assert.equal(selectBrontosaurusAnimation({ state: "retreating", motionSpeed: 42 }), BRONTOSAURUS_ANIMATION_ASSETS.run);
  assert.equal(REFERENCE_PNG_CHARACTERS.ligocristus.sourceFacing, 1);
  assert.equal(REFERENCE_PNG_CHARACTERS.ligocristus.file, "ligocristus-innocens.png");
});

test("Brisa uses her dedicated juvenile Velociraptor idle, jump and run GIFs", () => {
  assert.equal(BRISA_ANIMATIONS.idle, "juvenile-velociraptor-abyssomirabilis-idle.gif");
  assert.equal(BRISA_ANIMATIONS.jump, "juvenile-velociraptor-abyssomirabilis-jump.gif");
  assert.equal(BRISA_ANIMATIONS.run, "juvenile-velociraptor-abyssomirabilis-run.gif");
  assert.ok(CAMPAIGN_ANIMATED_REFERENCE_FILES.includes(BRISA_ANIMATIONS.idle));
  assert.ok(CAMPAIGN_ANIMATED_REFERENCE_FILES.includes(BRISA_ANIMATIONS.jump));
  assert.ok(CAMPAIGN_ANIMATED_REFERENCE_FILES.includes(BRISA_ANIMATIONS.run));
});

test("Gala and Basilio use their dedicated adult PNG reference artwork", () => {
  assert.equal(REFERENCE_PNG_CHARACTERS.gala.file, "adult-velociraptor-nublarensis.png");
  assert.equal(REFERENCE_PNG_CHARACTERS.basilio.file, "vastatosaurus-rex.png");
  assert.equal(REFERENCE_PNG_CHARACTERS.blue, REFERENCE_PNG_CHARACTERS.gala);
  assert.equal(REFERENCE_PNG_CHARACTERS.vasti, REFERENCE_PNG_CHARACTERS.basilio);
});


test("the HUD status combines dash and Stegoceratops readiness with the requested separator", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  assert.match(html, /STEGOCERATOPS \[C\] - HABILIDAD LISTA/);
  assert.match(main, /stegoceratopsStatusLabel\.textContent = "STEGOCERATOPS \[C\] - "/);
  assert.match(css, /\.stegoceratops-readout::before\s*\{[^}]*content:"◦"/s);
});

test("PNG and GIF dinosaurs render without generated black outlines", async () => {
  const [renderer, canvasUtils, race] = await Promise.all([
    readFile(new URL("../src/rendering/SpriteRenderer.js", import.meta.url), "utf8"),
    readFile(new URL("../src/rendering/CanvasUtils.js", import.meta.url), "utf8"),
    readFile(new URL("../src/minigames/Race.js", import.meta.url), "utf8")
  ]);
  assert.match(renderer, /drawSpriteImage\(context, frame\.image/);
  assert.doesNotMatch(renderer, /drawOutlinedImage|OUTLINED_IMAGE_CACHE/);
  assert.doesNotMatch(canvasUtils, /drawOutlinedImage|getOutlinedImage|OUTLINED_IMAGE_CACHE|source-in/);
  assert.doesNotMatch(race, /drawOutlinedImage/);
  assert.match(canvasUtils, /context\.drawImage\(image, x, y, width, height\)/);
});

test("Venatosaurus variants render their dedicated idle, walk, run, jump and attack GIF references", () => {
  const variants = {
    "venatosaurus-impavidus": {
      attack: "venatosaurus-impavidus-attack.gif",
      idle: "venatosaurus-impavidus-idle.gif",
      jump: "venatosaurus-impavidus-jump.gif",
      run: "venatosaurus-impavidus-run.gif",
      walk: "venatosaurus-impavidus-walk.gif"
    },
    "venatosaurus-saevidicus": {
      attack: "venatosaurus-saevidicus-attack.gif",
      idle: "venatosaurus-saevidicus-idle.gif",
      jump: "venatosaurus-saevidicus-jump.gif",
      run: "venatosaurus-saevidicus-run.gif",
      walk: "venatosaurus-saevidicus-walk.gif"
    }
  };

  for (const [species, poses] of Object.entries(variants)) {
    assert.deepEqual(
      {
        attack: VENATOSAURUS_ANIMATION_ASSETS[species].attack,
        idle: VENATOSAURUS_ANIMATION_ASSETS[species].idle,
        jump: VENATOSAURUS_ANIMATION_ASSETS[species].jump,
        run: VENATOSAURUS_ANIMATION_ASSETS[species].run,
        walk: VENATOSAURUS_ANIMATION_ASSETS[species].walk
      },
      poses
    );
    assert.equal(REFERENCE_PNG_CHARACTERS[species], undefined);
    assert.equal(selectVenatosaurusAnimation(species, { state: "windup", onGround: true }), poses.attack);
    assert.equal(selectVenatosaurusAnimation(species, { state: "attack", onGround: false }), poses.attack);
    assert.equal(selectVenatosaurusAnimation(species, { state: "patrol", onGround: false }), poses.jump);
    assert.equal(selectVenatosaurusAnimation(species, { state: "patrol", onGround: true }), poses.walk);
    assert.equal(selectVenatosaurusAnimation(species, { state: "pursuit", onGround: true }), poses.run);
    assert.equal(selectVenatosaurusAnimation(species, { state: "stunned", onGround: true }), poses.idle);
  }

  assert.equal(selectVenatosaurusAnimation("unknown", {}), null);

  const renderer = Object.create(SpriteRenderer.prototype);
  let routedCharacter = null;
  renderer.drawAnimatedVenatosaurus = (_context, character) => {
    routedCharacter = character;
    return true;
  };
  assert.equal(renderer.drawAnimated({}, "venatosaurus-impavidus", 0, 0, 112, 92, { state: "patrol" }, 1), true);
  assert.equal(routedCharacter, "venatosaurus-impavidus");
});


test("campaign dinosaur manifests only reference files present in public/references", async () => {
  const { access } = await import("node:fs/promises");
  const pngFiles = Object.values(REFERENCE_PNG_CHARACTERS).flatMap((definition) =>
    [definition.file, definition.first, definition.second].filter(Boolean)
  );
  const referenceFiles = [...new Set([...REFERENCE_PRELOAD_FILES, ...pngFiles])];
  await Promise.all(referenceFiles.map((file) =>
    access(new URL("../public/references/" + file, import.meta.url))
  ));
  await Promise.all(CAMPAIGN_ANIMATED_REFERENCE_FILES.map((file) =>
    access(new URL("../public/references/" + file, import.meta.url))
  ));
  assert.equal(REFERENCE_PNG_CHARACTERS.brisa, undefined);
  assert.equal(REFERENCE_PNG_CHARACTERS.rosa, undefined);
  assert.equal(JUVENILE_ANIMATED_CHARACTERS.brisa.scale, DINOSAUR_REFERENCE_SCALES.brisa);
});

test("Brisa routes through the available juvenile reference GIFs", () => {
  const renderer = Object.create(SpriteRenderer.prototype);
  const calls = [];
  renderer.drawAnimatedJuvenile = (_context, character) => {
    calls.push(character);
    return true;
  };
  assert.equal(renderer.drawAnimated({}, "brisa", 0, 0, 90, 70, {}, 0), true);
  assert.deepEqual(calls, ["brisa"]);
});

test("Race prefers RUN artwork while moving, then falls back to walk before idle", () => {
  assert.equal(getRaceAnimationSource({ run: "run.gif", walk: "walk.gif", idle: "idle.gif" }, "run"), "run.gif");
  assert.equal(getRaceAnimationSource({ run: null, walk: "walk.gif", idle: "idle.gif" }, "run"), "walk.gif");
  assert.equal(getRaceAnimationSource({ run: null, walk: null, idle: "idle.gif" }, "run"), "idle.gif");
});

test("the tactical enemy atlas is RGBA so sprites and combat effects retain transparency", async () => {
  const { readFile } = await import("node:fs/promises");
  const png = await readFile(new URL("../public/references/tactical-enemies.png", import.meta.url));
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(png[25], 6, "tactical-enemies.png must use PNG truecolor with alpha");
});


test("campaign hunters mix transparent tactical atlas sprites with the supplied human GIFs", async () => {
  const [renderer, main] = await Promise.all([
    readFile(new URL("../src/rendering/SpriteRenderer.js", import.meta.url), "utf8"),
    readFile(new URL("../src/main.js", import.meta.url), "utf8")
  ]);
  assert.match(renderer, /actor\?\.useTacticalSprite \?\? hash % 3 === 0/);
  assert.match(renderer, /human-v1\.gif/);
  assert.match(renderer, /human-v2\.gif/);
  const drawHunter = main.slice(main.indexOf("function drawHunter(hunter)"), main.indexOf("function drawHunterProjectile"));
  assert.match(drawHunter, /drawAnimatedSafely\(ctx, "hunter"/);
  assert.match(drawHunter, /if \(!spriteDrawn\) return;/);
  assert.doesNotMatch(drawHunter, /ctx\.fillRect\(7, 58, 25, 5\)/);
});
