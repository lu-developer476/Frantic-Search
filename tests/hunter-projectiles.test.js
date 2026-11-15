import test from "node:test";
import assert from "node:assert/strict";
import { HunterEnemy } from "../src/entities/HunterEnemy.js";
import { HunterProjectile } from "../src/entities/HunterProjectile.js";
import { CollisionSystem } from "../src/systems/CollisionSystem.js";

test("hunters fire a projectile after their shooting windup", () => {
  const hunter = new HunterEnemy({
    id: "hunter-test", x: 100, patrolStart: 0, patrolEnd: 900, groundY: 430
  });
  hunter.state = "windup";
  hunter.stateTimer = 0.01;
  const target = { x: 400, y: 368, w: 64, h: 62 };
  const event = hunter.update(0.02, target);

  assert.equal(event?.type, "shoot");
  assert.equal(event.projectile.shooterId, "hunter-test");
  assert.ok(event.projectile.x > hunter.x);
  assert.equal(hunter.state, "attack");
});

test("red projectiles travel toward the dinosaur and collide with it", () => {
  const projectile = new HunterProjectile({
    x: 10, y: 20, targetX: 110, targetY: 20, speed: 100
  });
  const target = { x: 56, y: 10, w: 24, h: 24 };

  projectile.update(0.5);

  assert.equal(projectile.active, true);
  assert.equal(projectile.x, 60);
  assert.equal(CollisionSystem.projectileHit(projectile, target), true);
});

test("projectiles expire when they reach the end of their lifetime", () => {
  const projectile = new HunterProjectile({
    x: 0, y: 0, targetX: 100, targetY: 0, lifetime: 0.1
  });
  projectile.update(0.1);
  assert.equal(projectile.active, false);
});

test("wooden crates do not damage dinosaurs, but rocks still do", () => {
  assert.equal(CollisionSystem.obstacleDamagesDinosaur({
    type: "crate", x: 0, y: 0, w: 52, h: 52
  }), false);
  assert.equal(CollisionSystem.obstacleDamagesDinosaur({
    type: "rock", x: 0, y: 0, w: 56, h: 58
  }), true);
});
