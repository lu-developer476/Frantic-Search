import test from "node:test";
import assert from "node:assert/strict";
import { IndoraptorBoss } from "../src/entities/IndoraptorBoss.js";
import { IndominusRexBoss } from "../src/entities/IndominusRexBoss.js";
import { REFERENCE_PNG_CHARACTERS } from "../src/rendering/SpriteRenderer.js";
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
