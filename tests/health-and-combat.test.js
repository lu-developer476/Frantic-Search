import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Player } from "../src/entities/Player.js";
import { HunterEnemy } from "../src/entities/HunterEnemy.js";
import { CollisionSystem } from "../src/systems/CollisionSystem.js";

test("player health changes on impact and does not keep decreasing afterward", () => {
  const player = new Player("blue", 100, 430);

  assert.equal(player.health, 3);
  assert.equal(player.takeHit(), true);
  assert.equal(player.health, 2);

  // No second attack means no second health loss: there is no bleeding damage-over-time.
  assert.equal(player.takeHit(), false);
  assert.equal(player.health, 2);

  player.invulnerable = 0;
  assert.equal(player.takeHit(), true);
  assert.equal(player.health, 1);
});

test("hunter contact during pursuit does not damage the player without an attack hitbox", () => {
  const player = { x: 120, y: 366, w: 64, h: 62 };
  const hunter = new HunterEnemy({
    id: "hunter-hit-timing",
    x: 100,
    patrolStart: 0,
    patrolEnd: 500,
    groundY: 430,
    carriesCaptive: false
  });

  hunter.direction = 1;
  hunter.state = "pursuit";

  assert.equal(CollisionSystem.bodyHit(player, hunter), true);
  assert.equal(CollisionSystem.hunterAttackHit(player, hunter), false);

  hunter.state = "attack";
  assert.equal(CollisionSystem.hunterAttackHit(player, hunter), true);

  // Once the attack is over, the same physical overlap is not another hit.
  hunter.state = "pursuit";
  assert.equal(CollisionSystem.hunterAttackHit(player, hunter), false);
});

test("player HUD contains one continuous health bar and no numeric counter", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /id="player-health-meter"/);
  assert.match(html, /id="player-health-fill"/);
  assert.doesNotMatch(html, /player-health-value|aria-valuetext="\d+\/\d+"/);
});
