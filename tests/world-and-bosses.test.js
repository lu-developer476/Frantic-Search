import test from "node:test";
import assert from "node:assert/strict";
import { PlatformWorld } from "../src/world/PlatformWorld.js";
import { IndoraptorBoss } from "../src/entities/IndoraptorBoss.js";
import { IndominusRexBoss } from "../src/entities/IndominusRexBoss.js";
import { CollisionSystem } from "../src/systems/CollisionSystem.js";

test("campaign world stops after the finite extraction area", () => {
  const world = new PlatformWorld(430);
  world.extendTo(50000);
  assert.equal(world.generatedSections, 6);
  assert.equal(world.bossSpawns.length, 2);
  assert.equal(world.bossSpawns[0].kind, "indoraptor");
  assert.equal(world.bossSpawns[1].kind, "indominus");
  assert.ok(world.facilitySpawns);
  assert.equal(world.facilitySpawns.extraction, 9010);
  const finalFloor = world.platforms.find((platform) =>
    platform.kind === "ground" && platform.x === 7500
  );
  assert.equal(finalFloor.w, 1900);
});

test("boss arenas have continuous floor and no normal hunter spawns", () => {
  const world = new PlatformWorld(430);
  world.extendTo(9000);
  for (const start of [3000, 6000]) {
    const grounds = world.platforms
      .filter((platform) => platform.kind === "ground" && platform.x >= start && platform.x < start + 1500)
      .sort((a, b) => a.x - b.x);
    for (let i = 1; i < grounds.length; i += 1) {
      assert.equal(grounds[i - 1].x + grounds[i - 1].w, grounds[i].x);
    }
  }
  assert.equal(world.hunterSpawns.some((spawn) => spawn.id === "hunter-2" || spawn.id === "hunter-4"), false);
});

test("Indoraptor only takes damage during exposed recovery", () => {
  const boss = new IndoraptorBoss({ id: "indo-test", x: 800, groundY: 430, arenaMinX: 0, arenaMaxX: 1500 });
  boss.activate();
  assert.equal(boss.takeDamage(1).hit, false);
  boss.state = "recovering";
  boss.damageCooldown = 0;
  const result = boss.takeDamage(4);
  assert.equal(result.hit, true);
  assert.equal(result.phaseChanged, true);
  assert.equal(boss.phase, 2);
});

test("Indominus changes phase and exposes three distinct attack patterns", () => {
  const boss = new IndominusRexBoss({ id: "rex-test", x: 800, groundY: 430, arenaMinX: 0, arenaMaxX: 1500 });
  boss.activate();
  const patterns = [];
  for (let i = 0; i < 3; i += 1) {
    patterns.push(boss.chooseAttack(500));
    boss.attackIndex += 1;
  }
  assert.deepEqual(patterns, ["roar", "charge", "tail-sweep"]);
  boss.state = "recovering";
  boss.damageCooldown = 0;
  const result = boss.takeDamage(7);
  assert.equal(result.phaseChanged, true);
  assert.equal(boss.phase, 2);
});

test("telegraphed boss attacks have dodgeable attack hitboxes", () => {
  const boss = new IndoraptorBoss({ id: "indo-hitbox", x: 500, groundY: 430, arenaMinX: 0, arenaMaxX: 1000 });
  boss.activate();
  boss.state = "attacking";
  boss.attackName = "pounce";
  boss.direction = 1;
  boss.y = boss.baseY - 92;

  const airbornePlayer = { x: boss.x + 90, y: 243, w: 64, h: 62 };
  assert.equal(CollisionSystem.bossAttackHit(airbornePlayer, boss), false);

  boss.attackName = "claw";
  boss.y = boss.baseY;
  const groundedPlayer = { x: boss.x + boss.w - 2, y: 368, w: 64, h: 62 };
  assert.equal(CollisionSystem.bossAttackHit(groundedPlayer, boss), true);
});
