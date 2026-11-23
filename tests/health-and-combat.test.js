import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Player } from "../src/entities/Player.js";
import { AutonomousCompanion } from "../src/entities/AutonomousCompanion.js";
import { LigocristusPrey, Brontosaurus } from "../src/entities/LigocristusPrey.js";
import { WildDinosaur } from "../src/entities/WildDinosaur.js";
import { HunterEnemy } from "../src/entities/HunterEnemy.js";
import { PhysicsSystem } from "../src/systems/PhysicsSystem.js";
import { PlatformWorld } from "../src/world/PlatformWorld.js";
import { CollisionSystem } from "../src/systems/CollisionSystem.js";
import { advanceEnemyFade, getEnemyOpacity, isEnemyFadeComplete } from "../src/systems/EnemyFadeSystem.js";
import { dropLigocristusFood, dropVenatosaurusFood, VENATOSAURUS_REMAINS_OPACITY } from "../src/systems/FoodSystem.js";

test("player health changes on impact and does not keep decreasing afterward", () => {
  const player = new Player("blue", 100, 430);

  assert.equal(player.maxHealth, 5);
  assert.equal(player.health, 5);
  assert.equal(player.takeHit(), true);
  assert.equal(player.health, 4);
  assert.equal(player.health / player.maxHealth, 4 / 5);

  // No second attack means no second health loss: there is no bleeding damage-over-time.
  assert.equal(player.takeHit(), false);
  assert.equal(player.health, 4);

  player.invulnerable = 0;
  assert.equal(player.takeHit(), true);
  assert.equal(player.health, 3);
  assert.equal(player.health / player.maxHealth, 3 / 5);
});

test("the companion also loses health in exact one-fifth units", () => {
  const companion = new AutonomousCompanion("vasti", 100, 430);
  assert.equal(companion.actor.maxHealth, 5);
  assert.equal(companion.actor.takeHit(), true);
  assert.equal(companion.actor.health, 4);
  assert.equal(companion.actor.health / companion.actor.maxHealth, 4 / 5);
});

test("the autonomous companion crosses the first pit without disappearing", () => {
  const world = new PlatformWorld(430, { seed: 20261114 });
  const physics = new PhysicsSystem({ gravity: 1900, worldBottom: 690 });
  const companion = new AutonomousCompanion("vasti", 610, 430);
  const leader = { x: 1050, y: 368, w: 64, h: 62 };
  for (let frame = 0; frame < 180; frame += 1) {
    companion.update(1 / 60, leader, world, physics, [], null);
    assert.ok(Number.isFinite(companion.actor.y));
  }
  assert.ok(companion.actor.x > 900);
  assert.ok(companion.actor.onGround);
});

test("companion fall recovery restores its last safe position", () => {
  const world = new PlatformWorld(430, { seed: 20261114 });
  const physics = new PhysicsSystem({ gravity: 1900, worldBottom: 690 });
  const companion = new AutonomousCompanion("blue", 500, 430);
  const leader = { x: 650, y: 368, w: 64, h: 62 };
  companion.update(1 / 60, leader, world, physics, [], null);
  const safe = { ...companion.lastSafePosition };
  companion.actor.y = 760;
  companion.actor.onGround = false;
  companion.update(1 / 60, leader, world, physics, [], null);
  assert.equal(companion.actor.x, safe.x);
  assert.equal(companion.actor.y, safe.y);
  assert.ok(Number.isFinite(companion.actor.y));
});

test("enemy actors are defeated by unsupported ground gaps", () => {
  const world = new PlatformWorld(430, { seed: 20261114 });
  const enemies = [
    new WildDinosaur({ id: "pit-venato", kind: "venatosaurus-impavidus", x: 744, groundY: 430, patrolStart: 650, patrolEnd: 1100 }),
    new HunterEnemy({ id: "pit-hunter", x: 744, patrolStart: 650, patrolEnd: 1100, groundY: 430, carriesCaptive: false })
  ];
  assert.equal(world.hasGroundSupportAt(760), false);
  assert.equal(world.hasGroundSupportAt(520), true);
  for (const enemy of enemies) {
    assert.equal(world.resolveGroundPitfall(enemy, 430), true);
    assert.equal(enemy.fellIntoPit, true);
    // The fall is gradual now: keep resolving until the enemy has dropped out of the world.
    for (let frame = 0; frame < 240 && !enemy.defeated; frame += 1) {
      enemy.y += 12;
      world.resolveGroundPitfall(enemy, 430);
    }
    assert.equal(enemy.defeated, true);
  }
});

test("Vasti's character ability is a ground stomp and an airborne slam", () => {
  const player = new Player("vasti", 100, 430);
  assert.equal(player.useAbility(), true);
  assert.equal(player.animationState, "stomp");
  assert.equal(player.consumeShockwave(), true);

  player.abilityCooldown = 0;
  player.onGround = false;
  assert.equal(player.useAbility(), true);
  assert.equal(player.animationState, "slam");
  assert.equal(player.isSlamming, true);
});

test("Ligocristus only becomes consumable after it is defeated", () => {
  const prey = new LigocristusPrey({ id: "ligocristus-carcass", x: 100, groundY: 430 });
  assert.equal(prey.consume(), false);
  assert.equal(prey.takeDamage(1).defeated, false);
  const result = prey.takeDamage(1);
  assert.equal(result.defeated, true);
  assert.equal(prey.defeated, true);
  assert.equal(prey.health, 0);
  assert.equal(prey.defeatFadeRemaining, 0.9);
  assert.equal(prey.consume(), true);
  assert.equal(prey.consumed, true);
});

test("an attacked and defeated Ligocristus turns into one edible food drop", () => {
  const prey = new LigocristusPrey({ id: "ligocristus-food", x: 240, groundY: 430 });
  const foodSources = [prey];

  assert.equal(prey.takeDamage(2).defeated, true);
  const drop = dropLigocristusFood(prey, foodSources);

  assert.equal(prey.consumed, true);
  assert.equal(prey.state, "consumed");
  assert.equal(drop.kind, "ligocristus-food");
  assert.equal(drop.id, "food-ligocristus-food");
  assert.equal(foodSources.length, 2);
  assert.equal(dropLigocristusFood(prey, foodSources), null);
  assert.equal(foodSources.length, 2, "a prey must not create duplicate food drops");
});

test("Ligocristus forage and flee when threatened", () => {
  const prey = new LigocristusPrey({ id: "ligocristus-motion", x: 100, groundY: 430, patrolStart: 50, patrolEnd: 360 });
  const initialX = prey.x;
  const states = new Set();
  for (let frame = 0; frame < 300; frame += 1) {
    prey.update(1 / 60);
    states.add(prey.state);
  }
  assert.notEqual(prey.x, initialX);
  assert.ok(states.has("grazing"));
  assert.ok(states.has("foraging"));
  const beforeFlee = prey.x;
  prey.update(1 / 60, [{ x: prey.x - 80, w: 50 }]);
  assert.equal(prey.state, "fleeing");
  assert.ok(prey.x > beforeFlee);
});

test("Brontosaurus alternate between grazing and wandering, then retreat from predators", () => {
  const bronto = new Brontosaurus({ id: "bronto-motion", x: 1000, groundY: 430, patrolStart: 700, patrolEnd: 1800 });
  const initialX = bronto.x;
  const states = new Set();
  for (let frame = 0; frame < 600; frame += 1) {
    bronto.update(1 / 60);
    states.add(bronto.state);
  }
  assert.notEqual(bronto.x, initialX);
  assert.ok(states.has("grazing"));
  assert.ok(states.has("walking"));
  const beforeRetreat = bronto.x;
  bronto.update(1 / 60, [{ x: bronto.x - 130, w: 90 }]);
  assert.equal(bronto.state, "retreating");
  assert.ok(bronto.x > beforeRetreat);
});

test("hunters only attack with projectiles: body contact never counts as a melee hit", () => {
  const hunter = new HunterEnemy({
    id: "hunter-ranged-only",
    x: 100,
    patrolStart: 0,
    patrolEnd: 500,
    groundY: 430,
    carriesCaptive: false
  });
  hunter.state = "attack";

  assert.equal(CollisionSystem.hunterAttackHit, undefined);
  assert.ok(!hunter.attackBox);
});

test("player HUD contains one continuous health bar and no numeric counter", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /id="player-health-meter"/);
  assert.match(html, /id="player-health-fill"/);
  assert.doesNotMatch(html, /player-health-value|aria-valuetext="\d+\/\d+"/);
});

test("defeated Venatosaurus leave a persistent faded carcass and one edible meat drop", () => {
  const enemy = new WildDinosaur({
    id: "venato-carcass",
    kind: "venatosaurus-impavidus",
    x: 320,
    groundY: 430,
    patrolStart: 250,
    patrolEnd: 650
  });
  const foodSources = [];
  assert.equal(enemy.takeDamage(3).defeated, true);

  const drop = dropVenatosaurusFood(enemy, foodSources);
  assert.equal(enemy.retainDefeatedRemains, true);
  assert.equal(getEnemyOpacity(enemy), 1);
  assert.equal(drop.kind, "venatosaurus");
  assert.equal(drop.id, "food-venato-carcass");
  assert.equal(foodSources.length, 1);

  advanceEnemyFade(enemy, 0.9);
  assert.equal(getEnemyOpacity(enemy), VENATOSAURUS_REMAINS_OPACITY);
  assert.equal(isEnemyFadeComplete(enemy), true);
  assert.equal(enemy.retainDefeatedRemains, true);

  assert.equal(dropVenatosaurusFood(enemy, foodSources), null);
  assert.equal(foodSources.length, 1, "a carcass must not generate duplicate food drops");
});

test("the player can eat food by interacting and the AI companion consumes it automatically", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  assert.match(main, /if \(food && tryEatFood\(player\)\) return true/);
  assert.match(main, /tryEatFood\(companion\.actor\)/);
  assert.match(main, /function drawFoodDrop\(food\)/);
  assert.match(main, /drawFoodDrop\(food\)/);
  assert.match(main, /if \(result\.defeated\) dropLigocristusFood\(prey, foodSources\)/);
  assert.match(main, /enemy\.retainDefeatedRemains \|\| !isEnemyFadeComplete\(enemy\)/);
});
