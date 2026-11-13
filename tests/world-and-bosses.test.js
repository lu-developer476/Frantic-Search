import test from "node:test";
import assert from "node:assert/strict";
import { PlatformWorld } from "../src/world/PlatformWorld.js";
import { GAME, LEVELS } from "../src/config/GameConfig.js";
import { FerrucutusCaptive } from "../src/entities/FerrucutusCaptive.js";
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


test("procedural sections are repeatable for a seed and vary between seeds", () => {
  const first = new PlatformWorld(GAME.groundY, { seed: 123456 });
  const repeated = new PlatformWorld(GAME.groundY, { seed: 123456 });
  const alternate = new PlatformWorld(GAME.groundY, { seed: 654321 });
  for (const world of [first, repeated, alternate]) world.extendTo(50000);

  const signature = (world) => JSON.stringify({
    platforms: world.platforms.filter((item) => item.kind === "ledge").map(({ x, y, w }) => [x, y, w]),
    obstacles: world.obstacles.map(({ x, y, type }) => [x, y, type]),
    venatosaurus: world.venatosaurusSpawns.map(({ x, direction }) => [x, direction])
  });

  assert.equal(signature(first), signature(repeated));
  assert.notEqual(signature(first), signature(alternate));
});

test("procedural hazards never overlap Ferrucutus containment cages", () => {
  const world = new PlatformWorld(GAME.groundY, { seed: 98765 });
  world.extendTo(50000);
  for (const cage of world.ferrucutusCageSpawns) {
    assert.ok(world.obstacles.every((obstacle) => {
      const overlaps = obstacle.x < cage.x + 164 && obstacle.x + obstacle.w > cage.x;
      return !overlaps;
    }));
  }
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
  boss.direction = 1;
  boss.y = boss.baseY;
  const groundedPlayer = { x: boss.x + boss.w - 2, y: 368, w: 64, h: 62 };
  assert.equal(CollisionSystem.bossAttackHit(groundedPlayer, boss), true);
});


test("every campaign level places its capped Ferrucutus containment cages", () => {
  const world = new PlatformWorld(GAME.groundY);
  world.extendTo(50000);
  const counts = LEVELS.map((level, levelIndex) =>
    world.ferrucutusCageSpawns.filter((spawn) => spawn.levelIndex === levelIndex).length
  );
  assert.deepEqual(counts, [3, 3, 4, 2, 2, 2]);

  for (const [levelIndex, level] of LEVELS.entries()) {
    const levelStart = GAME.playerX + level.distance;
    const levelEnd = levelIndex + 1 < LEVELS.length
      ? GAME.playerX + LEVELS[levelIndex + 1].distance
      : GAME.campaignEndX;
    const spawns = world.ferrucutusCageSpawns.filter((spawn) => spawn.levelIndex === levelIndex);
    assert.ok(spawns.every((spawn) => spawn.x >= levelStart && spawn.x < levelEnd));
    for (const spawn of spawns) {
      const supportY = spawn.groundY ?? GAME.groundY;
      assert.ok(world.platforms.some((platform) =>
        (platform.kind === "ground" || platform.kind === "ledge") &&
        platform.y === supportY &&
        spawn.x >= platform.x &&
        spawn.x + 164 <= platform.x + platform.w
      ), "each containment cage must fit on a solid ground or ledge platform");
      const cageTop = supportY - 124;
      assert.ok(world.obstacles.every((obstacle) => {
        const overlapsX = spawn.x < obstacle.x + obstacle.w && spawn.x + 164 > obstacle.x;
        const overlapsY = cageTop < obstacle.y + obstacle.h && supportY > obstacle.y;
        return !overlapsX || !overlapsY;
      }), "containment cages must not overlap ordinary obstacles");
    }
  }
  assert.equal(new Set(world.ferrucutusCageSpawns.map((spawn) => spawn.id)).size, 16);
});

test("Ferrucutus captive can be rescued once and only within interaction range", () => {
  const captive = new FerrucutusCaptive({ id: "captive-test", x: 300, groundY: 430 });
  const distantPlayer = { x: 0, y: 364, w: 64, h: 62 };
  const nearbyPlayer = { x: 260, y: 364, w: 64, h: 62 };
  assert.equal(captive.canInteract(distantPlayer), false);
  assert.equal(captive.rescue(distantPlayer), false);
  assert.equal(captive.canInteract(nearbyPlayer), true);
  assert.equal(captive.rescue(nearbyPlayer), true);
  assert.equal(captive.rescue(nearbyPlayer), false);
  assert.equal(captive.canInteract(nearbyPlayer), false);
});


test("Indoraptor proportions follow its upright reference and attack hitboxes remain grounded", () => {
  const boss = new IndoraptorBoss({ id: "indo-proportions", x: 500, groundY: 430, arenaMinX: 0, arenaMaxX: 1000 });
  assert.equal(boss.w, 136);
  assert.equal(boss.h, 127);
  boss.activate();
  boss.state = "attacking";
  boss.attackName = "claw";
  boss.direction = 1;
  boss.y = boss.baseY;
  const groundedPlayer = { x: boss.x + boss.w - 2, y: 368, w: 64, h: 62 };
  assert.equal(CollisionSystem.bossAttackHit(groundedPlayer, boss), true);
});
