import test from "node:test";
import assert from "node:assert/strict";
import { PlatformWorld } from "../src/world/PlatformWorld.js";
import { WildDinosaur } from "../src/entities/WildDinosaur.js";

test("Ferrucutus captives are procedurally generated with a chapter-specific cap", () => {
  const world = new PlatformWorld(430);
  world.extendTo(10000);
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
  world.extendTo(10000);
  assert.equal(world.venatosaurusSpawns.length, 8);
  assert.ok(world.venatosaurusSpawns.some((spawn) => spawn.kind === "venatosaurus-impavidus"));
  assert.ok(world.venatosaurusSpawns.some((spawn) => spawn.kind === "venatosaurus-saevidicus"));
  assert.equal(world.foodSpawns.length, 5);
  assert.equal(world.brontosaurusSpawns.length, 2);
  assert.equal(world.hunterSpawns.length, 3);
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
