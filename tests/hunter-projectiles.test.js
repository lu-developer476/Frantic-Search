import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { HunterEnemy } from "../src/entities/HunterEnemy.js";
import { HunterProjectile } from "../src/entities/HunterProjectile.js";
import { HunterGrenade } from "../src/entities/HunterGrenade.js";
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


test("human hunters throw grenades after a telegraphed wind-up", () => {
  const hunter = new HunterEnemy({ id: "hunter-grenade-test", x: 100, patrolStart: 0, patrolEnd: 900, groundY: 430 });
  hunter.state = "pursuit"; hunter.grenadeCooldown = 0;
  const target = { x: 280, y: 368, w: 64, h: 62, vx: 0 };
  hunter.update(0.01, target);
  assert.equal(hunter.state, "grenade-windup");
  const event = hunter.update(0.6, target);
  assert.equal(event?.type, "throw-grenade");
  assert.equal(event.grenade.groundY, 430);
  assert.ok(["orange", "yellow"].includes(event.grenade.type));
  assert.equal(hunter.grenadeCooldown, 5.8);
});

test("grenades follow a ballistic arc and detonate at ground contact", () => {
  const grenade = new HunterGrenade({ x: 20, y: 390, targetX: 240, groundY: 430, type: "orange" });
  assert.equal(grenade.asset, "orange-grenade.gif");
  assert.ok(grenade.vy < 0);
  let detonated = false;
  for (let frame = 0; frame < 40 && grenade.active; frame += 1) {
    grenade.update(0.03);
    if (grenade.justExploded) detonated = true;
  }
  assert.equal(detonated, true);
  assert.equal(grenade.exploded, true);
  assert.ok(Math.abs(grenade.x - 240) < 30);
});

test("yellow grenades use their matching GIF and blast-radius collision", () => {
  const grenade = new HunterGrenade({ x: 100, y: 390, targetX: 180, groundY: 430, type: "yellow" });
  assert.equal(grenade.asset, "yellow-grenade.gif");
  grenade.explode();
  assert.equal(CollisionSystem.grenadeHit(grenade, { x: 155, y: 405, w: 28, h: 30 }), true);
  assert.equal(CollisionSystem.grenadeHit(grenade, { x: 260, y: 405, w: 28, h: 30 }), false);
});

test("grenade explosions expire after their visual duration", () => {
  const grenade = new HunterGrenade({ x: 0, y: 0, targetX: 40, groundY: 100 });
  grenade.explode();
  for (let frame = 0; frame < 5; frame += 1) grenade.update(0.1);
  assert.equal(grenade.active, false);
});


test("Ambush human role exposes the G grenade control and damages enemies in the blast", async () => {
  const source = await readFile(new URL("../src/minigames/Ambush.js", import.meta.url), "utf8");
  assert.match(source, /const grenadePressed = this\.pressed\.delete\("KeyG"\)/);
  assert.match(source, /throwHunterGrenade\(\)/);
  assert.match(source, /if \(this\.role === "hunter"\)[\s\S]*?CollisionSystem\.grenadeHit\(grenade, enemy\)/);
  assert.match(source, /this\.player\.grenadeCooldown = 5\.8/);
});
