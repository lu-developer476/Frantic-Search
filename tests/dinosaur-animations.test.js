import test from "node:test";
import assert from "node:assert/strict";
import { IndoraptorBoss } from "../src/entities/IndoraptorBoss.js";
import { IndominusRexBoss } from "../src/entities/IndominusRexBoss.js";
import {
  DINOSAUR_REFERENCE_SCALES,
  REFERENCE_PNG_CHARACTERS,
  VENATOSAURUS_ANIMATION_ASSETS,
  BRONTOSAURUS_ANIMATION_ASSETS,
  PROLOGUE_ROSA_ANIMATIONS,
  selectBrontosaurusAnimation,
  selectVenatosaurusAnimation,
  SpriteRenderer
} from "../src/rendering/SpriteRenderer.js";
import { ENEMY_FADE_DURATION, beginEnemyFade, advanceEnemyFade, getEnemyOpacity, isEnemyFadeComplete } from "../src/systems/EnemyFadeSystem.js";
import { selectActorPose } from "../src/rendering/AnimationProfiles.js";

test("feeding, jumping and combat actions resolve to their own poses", () => {
  assert.equal(selectActorPose("blue", { animationState: "eat" }), "violeta-eat");
  assert.equal(selectActorPose("beta", { animationState: "eat" }), "rosa-eat");
  assert.equal(selectActorPose("vasti", { animationState: "eat" }), "vasti-eat");
  assert.equal(selectActorPose("indoraptor", { animationState: "eat" }), "indoraptor-eat");
  assert.equal(selectActorPose("indoraptor", { animationState: "jump" }), "indoraptor-jump");
  assert.equal(selectActorPose("indoraptor", { state: "eating" }), "indoraptor-eat");
  assert.equal(selectActorPose("hunter", { state: "stunned" }), "hunter-impact");
});

test("Vastatosaurus Rex is scaled as a large adult beside the raptors", () => {
  assert.equal(DINOSAUR_REFERENCE_SCALES.vastatosaurusRex, 1.95);
  assert.equal(REFERENCE_PNG_CHARACTERS.vasti.scale, 1.95);
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
  assert.equal(BRONTOSAURUS_ANIMATION_ASSETS.sourceFacing, -1);
  assert.equal(selectBrontosaurusAnimation({ state: "grazing", motionSpeed: 0 }), BRONTOSAURUS_ANIMATION_ASSETS.walk);
  assert.equal(selectBrontosaurusAnimation({ state: "retreating", motionSpeed: 42 }), BRONTOSAURUS_ANIMATION_ASSETS.run);
  assert.equal(REFERENCE_PNG_CHARACTERS.ligocristus.sourceFacing, 1);
  assert.equal(REFERENCE_PNG_CHARACTERS.ligocristus.file, "ligocristus-innocens.png");
});

test("Rosa's controllable prologue uses her dedicated idle, jump and run GIFs", () => {
  assert.equal(PROLOGUE_ROSA_ANIMATIONS.idle, "juvenile-velociraptor-abyssomirabilis-idle.gif");
  assert.equal(PROLOGUE_ROSA_ANIMATIONS.jump, "juvenile-velociraptor-abyssomirabilis-jump.gif");
  assert.equal(PROLOGUE_ROSA_ANIMATIONS.run, "juvenile-velociraptor-abyssomirabilis-run.gif");
});


test("the HUD status combines dash and Stegoceratops readiness with the requested separator", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  assert.match(html, /STEGOCERATOPS \[C\] - HABILIDAD LISTA/);
  assert.match(main, /stegoceratopsStatusLabel\.textContent = "STEGOCERATOPS \[C\] - "/);
  assert.match(css, /\.stegoceratops-readout::before\s*\{[^}]*content:"◦"/s);
});

test("all reference PNG dinosaurs receive a complete two-pixel black silhouette outline", async () => {
  const renderer = await readFile(new URL("../src/rendering/SpriteRenderer.js", import.meta.url), "utf8");
  assert.match(renderer, /getOutlinedReferenceImage\(file, image, bounds, drawWidth, drawHeight\)/);
  assert.match(renderer, /const border = 2/);
  assert.match(renderer, /outline-" \+ border/);
  assert.match(renderer, /maskContext\.globalCompositeOperation = "source-in"/);
  assert.match(renderer, /maskContext\.fillStyle = "#050706"/);
  assert.match(renderer, /for \(let offsetY = -border; offsetY <= border; offsetY \+= 1\)/);
  assert.match(renderer, /for \(let offsetX = -border; offsetX <= border; offsetX \+= 1\)/);
  assert.match(renderer, /outlineContext\.drawImage\(mask, offsetX, offsetY\)/);
  assert.match(renderer, /if \(outlinedImage\)\s*\{[^}]*context\.drawImage\(\s*outlinedImage/s);
  assert.match(renderer, /outlinedReferenceImages\.size > 48/);
});

test("Venatosaurus variants render their dedicated attack, jump and run GIF references", () => {
  const variants = {
    "venatosaurus-impavidus": {
      attack: "venatosaurus-impavidus-attack.gif",
      jump: "venatosaurus-impavidus-jump.gif",
      run: "venatosaurus-impavidus-run.gif"
    },
    "venatosaurus-saevidicus": {
      attack: "venatosaurus-saevidicus-attack.gif",
      jump: "venatosaurus-saevidicus-jump.gif",
      run: "venatosaurus-saevidicus-run.gif"
    }
  };

  for (const [species, poses] of Object.entries(variants)) {
    assert.deepEqual(
      {
        attack: VENATOSAURUS_ANIMATION_ASSETS[species].attack,
        jump: VENATOSAURUS_ANIMATION_ASSETS[species].jump,
        run: VENATOSAURUS_ANIMATION_ASSETS[species].run
      },
      poses
    );
    assert.equal(REFERENCE_PNG_CHARACTERS[species], undefined);
    assert.equal(selectVenatosaurusAnimation(species, { state: "windup", onGround: true }), poses.attack);
    assert.equal(selectVenatosaurusAnimation(species, { state: "attack", onGround: false }), poses.attack);
    assert.equal(selectVenatosaurusAnimation(species, { state: "patrol", onGround: false }), poses.jump);
    assert.equal(selectVenatosaurusAnimation(species, { state: "patrol", onGround: true }), poses.run);
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
