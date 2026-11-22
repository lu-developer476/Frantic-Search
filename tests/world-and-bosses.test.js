import { getDinosaurHitbox } from "../src/config/DinosaurSizing.js";
import test from "node:test";
import assert from "node:assert/strict";
import { BOSS_ARENA_HALF_WIDTH, PlatformWorld } from "../src/world/PlatformWorld.js";
import { GAME, LEVELS, WORLD } from "../src/config/GameConfig.js";
import { FerrucutusCaptive } from "../src/entities/FerrucutusCaptive.js";
import { WildDinosaur } from "../src/entities/WildDinosaur.js";
import { IndoraptorBoss } from "../src/entities/IndoraptorBoss.js";
import { IndominusRexBoss } from "../src/entities/IndominusRexBoss.js";
import { CollisionSystem } from "../src/systems/CollisionSystem.js";

test("campaign world stops after the finite extraction area", () => {
  const world = new PlatformWorld(430);
  world.extendTo(50000);
  assert.equal(world.generatedSections, 7);
  assert.equal(world.bossSpawns.length, 5);
  assert.deepEqual(
    world.bossSpawns.map(({ id, kind, generation, variant }) => [id, kind, generation, variant ?? null]),
    [
      ["indoraptor-first-generation", "indoraptor", 1, null],
      ["indoraptor-second-generation", "indoraptor", 2, null],
      ["indominus-first-generation", "indominus", 1, "first-generation"],
      ["indominus-second-generation", "indominus", 2, "second-generation"],
      ["indominus-second-generation-variant", "indominus", 2, "second-generation-variant"]
    ]
  );
  assert.ok(world.bossSpawns[0].x >= WORLD.sectionStarts[1]);
  assert.ok(world.bossSpawns[0].x < WORLD.sectionStarts[2]);
  assert.ok(world.bossSpawns[1].x >= WORLD.sectionStarts[2]);
  assert.ok(world.bossSpawns[1].x < WORLD.sectionStarts[3]);
  assert.ok(world.bossSpawns.slice(2).every((spawn) =>
    spawn.x >= WORLD.sectionStarts[4] && spawn.x < WORLD.sectionStarts[5]
  ));
  assert.ok(world.facilitySpawns);
  assert.equal(world.facilitySpawns.extraction, WORLD.extractionX);
  const finalFloor = world.platforms.find((platform) =>
    platform.kind === "ground" && platform.x === WORLD.sectionStarts[6]
  );
  assert.equal(finalFloor.w, WORLD.sectionLengths[6]);
});


test("every generated section respects the 5,000–7,800-unit length bounds", () => {
  const world = new PlatformWorld(GAME.groundY, { seed: 20261113 });
  world.extendTo(WORLD.totalLength + 1);
  assert.equal(world.generatedSections, WORLD.sectionCount);
  for (let index = 0; index < WORLD.sectionCount; index += 1) {
    const start = WORLD.sectionStarts[index];
    const end = start + WORLD.sectionLengths[index];
    assert.ok(WORLD.sectionLengths[index] >= 5000 && WORLD.sectionLengths[index] <= 7800);
    assert.ok(world.platforms.some((platform) => platform.kind === "ground" && platform.x === start));
    assert.ok(world.platforms.some((platform) => platform.kind === "ground" && platform.x + platform.w === end));
    const ledges = world.platforms.filter((platform) =>
      platform.kind === "ledge" && platform.x >= start && platform.x + platform.w <= end
    );
    assert.equal(ledges.length, 8);
    assert.ok(ledges[0].x - start < WORLD.sectionLengths[index] * 0.12);
    assert.ok(end - (ledges.at(-1).x + ledges.at(-1).w) < WORLD.sectionLengths[index] * 0.12);
  }
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

test("a Venatosaurus spawned over the opening pit visibly falls before dying", () => {
  const world = new PlatformWorld(GAME.groundY, { seed: 20261115 });
  const spawn = world.venatosaurusSpawns[0];
  const enemy = new WildDinosaur({ ...spawn, groundY: GAME.groundY });

  assert.equal(world.hasGroundSupportAt(enemy.x + enemy.w / 2, GAME.groundY), false);
  assert.equal(world.resolveGroundPitfall(enemy, GAME.groundY, GAME.fixedStep), true);
  assert.equal(enemy.fellIntoPit, true);
  assert.equal(enemy.defeated, false);
  assert.equal(enemy.state, "falling");

  for (let frame = 0; frame < 60 && !enemy.defeated; frame += 1) {
    world.resolveGroundPitfall(enemy, GAME.groundY, GAME.fixedStep);
  }

  assert.equal(enemy.defeated, true);
  assert.ok(enemy.y > GAME.groundY + 240);
});

test("every miniboss arena has three elevated traversal platforms and wider boundaries", () => {
  const world = new PlatformWorld(GAME.groundY, { seed: 20261116 });
  world.extendTo(WORLD.totalLength + 1);

  assert.equal(world.bossSpawns.length, 5);
  for (const boss of world.bossSpawns) {
    const platforms = world.platforms.filter((platform) => platform.bossId === boss.id);
    assert.equal(platforms.length, 3, boss.id);
    assert.equal(new Set(platforms.map((platform) => platform.id)).size, 3);
    assert.ok(platforms.every((platform) => platform.kind === "boss-platform"));
    assert.ok(platforms.every((platform) => platform.y < GAME.groundY));
    assert.ok(platforms.every((platform) =>
      platform.x >= boss.x - BOSS_ARENA_HALF_WIDTH &&
      platform.x + platform.w <= boss.x + BOSS_ARENA_HALF_WIDTH
    ));
    assert.deepEqual(
      platforms.map((platform) => platform.y).sort((a, b) => a - b),
      [GAME.groundY - 96, GAME.groundY - 82, GAME.groundY - 72].sort((a, b) => a - b)
    );
  }
});

test("boss arenas have continuous local floors and no poacher patrol inside the fight", () => {
  const world = new PlatformWorld(430);
  world.extendTo(WORLD.totalLength + 5000);
  for (const boss of world.bossSpawns) {
    const arenaStart = boss.x - BOSS_ARENA_HALF_WIDTH;
    const arenaEnd = boss.x + BOSS_ARENA_HALF_WIDTH;
    const grounds = world.platforms
      .filter((platform) => platform.kind === "ground" && platform.x <= arenaEnd && platform.x + platform.w >= arenaStart)
      .sort((a, b) => a.x - b.x);
    let coveredTo = arenaStart;
    for (const ground of grounds) {
      if (ground.x > coveredTo) break;
      coveredTo = Math.max(coveredTo, ground.x + ground.w);
    }
    assert.ok(coveredTo >= arenaEnd, "each boss arena must have uninterrupted ground support");
    assert.equal(world.hunterSpawns.some((spawn) => spawn.x >= arenaStart && spawn.x <= arenaEnd), false);
  }
});

test("miniboss visual identities remain fixed when combat phase changes", () => {
  const indoraptor = new IndoraptorBoss({
    id: "indoraptor-gen2-fixed",
    x: 800,
    groundY: 430,
    generation: 2
  });
  indoraptor.activate();
  indoraptor.state = "recovering";
  indoraptor.damageCooldown = 0;
  indoraptor.takeDamage(4);
  assert.equal(indoraptor.phase, 2);
  assert.equal(indoraptor.generation, 2);

  const indominus = new IndominusRexBoss({
    id: "indominus-variant-fixed",
    x: 800,
    groundY: 430,
    generation: 2,
    variant: "second-generation-variant"
  });
  indominus.activate();
  indominus.state = "recovering";
  indominus.damageCooldown = 0;
  indominus.takeDamage(7);
  assert.equal(indominus.phase, 2);
  assert.equal(indominus.generation, 2);
  assert.equal(indominus.variant, "second-generation-variant");
  assert.equal(indominus.character, "indominus-variant");
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
  assert.deepEqual(counts, [1, 1, 2, 1, 0, 0]);

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
  assert.equal(new Set(world.ferrucutusCageSpawns.map((spawn) => spawn.id)).size, 5);
  assert.deepEqual(LEVELS.map((level) => level.distance), [
    0,
    WORLD.sectionStarts[1] - GAME.playerX,
    WORLD.sectionStarts[2] - GAME.playerX,
    WORLD.sectionStarts[4] - GAME.playerX,
    WORLD.sectionStarts[5] - GAME.playerX,
    WORLD.extractionChapterStartX - GAME.playerX
  ]);
  assert.equal(WORLD.sectionLengths.length, WORLD.sectionCount);
  assert.ok(WORLD.sectionLengths.every((length) =>
    length >= WORLD.minSectionLength && length <= WORLD.maxSectionLength
  ));
  assert.equal(WORLD.totalLength, WORLD.sectionLengths.reduce((sum, length) => sum + length, 0));
  assert.equal(GAME.campaignEndX, WORLD.extractionX);
  const cagePositions = world.ferrucutusCageSpawns.map((spawn) => spawn.x).sort((a, b) => a - b);
  for (let index = 1; index < cagePositions.length; index += 1) {
    assert.ok(cagePositions[index] - cagePositions[index - 1] >= 1700,
      "Ferrucutus cage encounters must be separated by at least 1700 world units");
  }

  const rescuePositions = [
    ...world.ferrucutusCageSpawns.map((spawn) => spawn.x),
    ...world.hunterSpawns.filter((spawn) => spawn.carriesCaptive).map((spawn) => spawn.x)
  ].sort((a, b) => a - b);
  assert.equal(rescuePositions.length, 7);
  for (let index = 1; index < rescuePositions.length; index += 1) {
    assert.ok(rescuePositions[index] - rescuePositions[index - 1] >= 1500,
      "all optional rescue objectives must be spaced by at least 1500 world units");
  }
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
  assert.equal(boss.w, getDinosaurHitbox("indoraptor").w);
  assert.equal(boss.h, getDinosaurHitbox("indoraptor").h);
  boss.activate();
  boss.state = "attacking";
  boss.attackName = "claw";
  boss.direction = 1;
  boss.y = boss.baseY;
  const groundedPlayer = { x: boss.x + boss.w - 2, y: 368, w: 64, h: 62 };
  assert.equal(CollisionSystem.bossAttackHit(groundedPlayer, boss), true);
});


test("natural boulders expose elevated landing surfaces", () => {
  const world = new PlatformWorld(GAME.groundY, { seed: 424242 });
  world.extendTo(50000);
  const rocks = world.obstacles.filter((obstacle) => obstacle.type === "rock");
  const rockPlatforms = world.platforms.filter((platform) => platform.kind === "rock-ledge");

  assert.ok(rocks.length > 0);
  assert.equal(rockPlatforms.length, rocks.length);
  for (const platform of rockPlatforms) {
    const rock = rocks.find((obstacle) =>
      platform.x === obstacle.x + 22 &&
      platform.y === obstacle.y + 4 &&
      platform.w === obstacle.w - 42
    );
    assert.ok(rock, "each elevated rock platform must match a visible boulder");
    assert.ok(platform.y < GAME.groundY, "the rock shelf must sit above the ground");
  }
});
