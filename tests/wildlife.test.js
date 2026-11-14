import test from "node:test";
import assert from "node:assert/strict";
import { PlatformWorld } from "../src/world/PlatformWorld.js";
import { WildDinosaur } from "../src/entities/WildDinosaur.js";
import { LigocristusPrey } from "../src/entities/LigocristusPrey.js";
import { REFERENCE_PNG_CHARACTERS } from "../src/rendering/SpriteRenderer.js";
import { WORLD } from "../src/config/GameConfig.js";

test("Ferrucutus captives are procedurally generated with a chapter-specific cap", () => {
  const world = new PlatformWorld(430);
  world.extendTo(50000);
  const expected = [1, 1, 2, 1, 0, 0];
  for (let levelIndex = 0; levelIndex < expected.length; levelIndex += 1) {
    assert.equal(
      world.ferrucutusCageSpawns.filter((spawn) => spawn.levelIndex === levelIndex).length,
      expected[levelIndex]
    );
  }
});

test("Venatosaurus spawns throughout the campaign and both reference variants are used", () => {
  const world = new PlatformWorld(430);
  world.extendTo(50000);
  assert.equal(world.venatosaurusSpawns.length, 17);
  assert.ok(world.venatosaurusSpawns.some((spawn) => spawn.kind === "venatosaurus-impavidus"));
  assert.ok(world.venatosaurusSpawns.some((spawn) => spawn.kind === "venatosaurus-saevidicus"));
  assert.equal(world.foodSpawns.length, 12);
  assert.equal(world.brontosaurusSpawns.length, 2);
  assert.equal(world.hunterSpawns.length, 10);
  assert.equal(world.hunterSpawns.filter((spawn) => spawn.carriesCaptive).length, 2);
  assert.ok(world.hunterSpawns.some((spawn) => !spawn.carriesCaptive));
  assert.ok(world.hunterSpawns.every((spawn) => {
    const section = Number(spawn.id.split("-")[1]);
    const start = WORLD.sectionStarts[section];
    const end = start + WORLD.sectionLengths[section];
    return spawn.x >= start && spawn.x < end &&
      spawn.patrolStart >= start && spawn.patrolEnd <= end;
  }));
});

test("Venatosaurus attacks nearby protagonists and can be defeated", () => {
  const enemy = new WildDinosaur({
    id: "venato-test",
    kind: "venatosaurus-impavidus",
    x: 100,
    groundY: 430,
    patrolStart: 0,
    patrolEnd: 500
  });
  const protagonist = { x: 170, y: 368, w: 64, h: 62, health: 3, defeated: false };
  enemy.update(1 / 60, [{ target: protagonist, kind: "protagonist" }]);
  const event = enemy.update(0.4, [{ target: protagonist, kind: "protagonist" }]);
  assert.equal(event?.type, "attack");
  assert.equal(event?.target, protagonist);
  assert.equal(enemy.takeDamage(3).defeated, true);
  assert.equal(enemy.defeated, true);
});


test("Venatosaurus uses a jumping forward charge after its windup", () => {
  const enemy = new WildDinosaur({
    id: "venatosaurus-charge",
    kind: "venatosaurus-impavidus",
    x: 100,
    groundY: 430,
    patrolStart: 0,
    patrolEnd: 700
  });
  const target = { x: 180, y: 338, w: 64, h: 62, health: 3, defeated: false };
  enemy.state = "windup";
  enemy.stateTimer = 0.01;
  enemy.jumpCooldown = 0;
  const event = enemy.update(0.02, [{ target, kind: "protagonist" }]);
  assert.equal(event?.type, "attack");
  assert.equal(enemy.state, "attack");
  assert.equal(enemy.onGround, false);
  const before = enemy.x;
  enemy.update(0.1, [{ target, kind: "protagonist" }]);
  assert.ok(enemy.x > before + 25);
});

test("Ligocristus movement and reference sprite share the same left/right orientation", () => {
  assert.equal(REFERENCE_PNG_CHARACTERS.ligocristus.sourceFacing, -1);

  const prey = new LigocristusPrey({ id: "ligocristus-direction", x: 300, groundY: 430 });
  prey.jumpCooldown = 10;
  prey.update(1 / 60, [{ x: 100, y: 368, w: 64, h: 62 }]);
  assert.equal(prey.direction, 1);
  assert.equal(prey.facing, 1);

  prey.update(1 / 60, [{ x: 700, y: 368, w: 64, h: 62 }]);
  assert.equal(prey.direction, -1);
  assert.equal(prey.facing, -1);
});

test("Ligocristus and Venatosaurus perform autonomous jumps while fleeing or pursuing", () => {
  const prey = new LigocristusPrey({ id: "ligocristus-jump", x: 300, groundY: 430 });
  prey.jumpCooldown = 0;
  prey.update(1 / 60, [{ x: 100, y: 368, w: 64, h: 62 }]);
  assert.equal(prey.state, "fleeing");
  assert.equal(prey.onGround, false);
  assert.ok(prey.vy < 0);

  const enemy = new WildDinosaur({
    id: "venatosaurus-jump",
    kind: "venatosaurus-impavidus",
    x: 100,
    groundY: 430,
    patrolStart: 0,
    patrolEnd: 700
  });
  enemy.jumpCooldown = 0;
  const distantTarget = { x: 400, y: 368, w: 64, h: 62, health: 3, defeated: false };
  enemy.update(1 / 60, [{ target: distantTarget, kind: "protagonist" }]);
  assert.equal(enemy.state, "pursuit");
  assert.equal(enemy.onGround, false);
  assert.ok(enemy.vy < 0);
});
