import test from "node:test";
import assert from "node:assert/strict";
import { generateSectionScenery } from "../src/world/SceneryGenerator.js";
import { PlatformWorld } from "../src/world/PlatformWorld.js";
import { GAME, LEVELS, WORLD } from "../src/config/GameConfig.js";

const ENVIRONMENTS_BY_SECTION = ["coastal", "redwood", "black-site", "black-site", "containment", "rosa-containment", "extraction"];

function createSection(index, seed = 20261115, safeZones = []) {
  return generateSectionScenery({
    seed,
    sectionIndex: index,
    sectionStart: WORLD.sectionStarts[index],
    sectionLength: WORLD.sectionLengths[index],
    groundY: GAME.groundY,
    environment: ENVIRONMENTS_BY_SECTION[index],
    safeZones
  });
}

test("scenery generation is deterministic and varies with the world seed", () => {
  const first = createSection(1, 123456);
  const repeated = createSection(1, 123456);
  const alternate = createSection(1, 654321);

  assert.deepEqual(first, repeated);
  assert.notDeepEqual(first, alternate);
  assert.ok(first.length > 30);
  assert.ok(first.every((prop) => prop.id && prop.environment === "redwood"));
});

test("each outdoor biome gets distinct trees, density and ground details", () => {
  const coastal = createSection(0);
  const redwood = createSection(1);
  const blackSite = createSection(2);
  const containment = createSection(4);
  const extraction = createSection(6);

  const trees = (props) => props.filter((prop) => prop.layer === "background");
  const ground = (props) => props.filter((prop) => prop.layer === "ground");

  assert.ok(trees(coastal).some((prop) => prop.species === "palm" || prop.species === "broadleaf"));
  assert.ok(trees(redwood).filter((prop) => prop.species === "redwood").length >= 8);
  assert.ok(trees(blackSite).some((prop) => prop.species === "dead-tree"));
  assert.ok(trees(containment).some((prop) => prop.species === "cypress"));
  assert.ok(trees(extraction).some((prop) => prop.species === "pine" || prop.species === "broadleaf"));

  assert.ok(ground(redwood).some((prop) => prop.kind === "fern"));
  assert.ok(ground(coastal).some((prop) => prop.kind === "dune-grass" || prop.kind === "driftwood"));
  assert.ok(ground(blackSite).some((prop) => prop.kind === "rubble" || prop.kind === "broken-concrete"));
  assert.ok(ground(containment).some((prop) => prop.kind === "planter" || prop.kind === "clipped-shrub"));
  assert.ok(ground(extraction).length > 8);
  assert.ok(redwood.length > coastal.length);
});

test("indoor Rosa containment receives no outdoor trees or ground vegetation", () => {
  assert.deepEqual(createSection(5), []);
});

test("ground details avoid protected objectives, enemies and obstacle positions", () => {
  const start = WORLD.sectionStarts[0];
  const length = WORLD.sectionLengths[0];
  const safeZones = [{ x: start + 500, radius: 700 }, { x: start + 2100, radius: 600 }];
  const props = generateSectionScenery({
    seed: 987654,
    sectionIndex: 0,
    sectionStart: start,
    sectionLength: length,
    groundY: GAME.groundY,
    environment: "coastal",
    safeZones
  });

  const groundProps = props.filter((prop) => prop.layer === "ground");
  assert.ok(groundProps.every((prop) =>
    safeZones.every((zone) => Math.abs(zone.x - prop.x) >= zone.radius + prop.width * 0.5)
  ));
  assert.ok(props.some((prop) => prop.layer === "background"), "background trees should remain independent of gameplay safe zones");
});

test("the campaign world exposes scenery per biome and prunes scenery behind the player", () => {
  const world = new PlatformWorld(GAME.groundY, { seed: 314159 });
  world.extendTo(WORLD.totalLength + 1);

  assert.equal(world.generatedSections, WORLD.sectionCount);
  assert.ok(world.sceneryProps.length > 100);
  assert.deepEqual(
    [...new Set(world.sceneryProps.map((prop) => prop.environment))].sort(),
    ["black-site", "coastal", "containment", "extraction", "redwood"]
  );
  const redwoodStart = WORLD.sectionStarts[1];
  const redwoodBackground = world.visibleScenery(redwoodStart, GAME.width, "background", "redwood");
  const redwoodGround = world.visibleScenery(redwoodStart, GAME.width, "ground", "redwood");
  assert.ok(redwoodBackground.length > 0);
  assert.ok(redwoodGround.length > 0);
  assert.ok(redwoodBackground.every((prop) => prop.layer === "background" && prop.environment === "redwood"));
  assert.ok(redwoodGround.every((prop) => prop.layer === "ground" && prop.environment === "redwood"));

  const before = world.sceneryProps.length;
  world.pruneBehind(30000);
  assert.ok(world.sceneryProps.length < before);
});

test("ground scenery never appears above the standard opening pit", () => {
  const world = new PlatformWorld(GAME.groundY, { seed: 456789 });
  world.extendTo(WORLD.sectionLengths[0] + 1);
  const gapStart = WORLD.sectionStarts[0] + 730;
  const gapEnd = WORLD.sectionStarts[0] + 900;
  const groundProps = world.sceneryProps.filter((prop) =>
    prop.layer === "ground" && prop.x + prop.width / 2 >= gapStart && prop.x - prop.width / 2 <= gapEnd
  );
  assert.equal(groundProps.length, 0);
});

test("scenery does not change the fixed campaign chapter and objective layout", () => {
  assert.deepEqual(LEVELS.map((level) => level.environment), [
    "coastal", "redwood", "black-site", "containment", "rosa-containment", "extraction"
  ]);
  assert.equal(WORLD.sectionCount, 7);
  assert.equal(GAME.campaignEndX, WORLD.extractionX);
});
