import { GAME, LEVELS, WORLD } from "../config/GameConfig.js";
import { generateSectionScenery } from "./SceneryGenerator.js";
import { generateSectionCollectibles } from "./CollectibleGenerator.js";

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

const PLATFORM_LAYOUTS = [
  [
    { position: 0.07, y: 365, w: 170 }, { position: 0.19, y: 342, w: 175 },
    { position: 0.31, y: 378, w: 190 }, { position: 0.43, y: 350, w: 185 },
    { position: 0.55, y: 365, w: 175 }, { position: 0.67, y: 342, w: 190 },
    { position: 0.79, y: 378, w: 180 }, { position: 0.91, y: 350, w: 185 }
  ],
  [
    { position: 0.08, y: 380, w: 190 }, { position: 0.20, y: 350, w: 155 },
    { position: 0.32, y: 365, w: 190 }, { position: 0.44, y: 340, w: 165 },
    { position: 0.56, y: 375, w: 190 }, { position: 0.68, y: 350, w: 175 },
    { position: 0.80, y: 370, w: 185 }, { position: 0.92, y: 355, w: 180 }
  ],
  [
    { position: 0.07, y: 350, w: 175 }, { position: 0.19, y: 375, w: 185 },
    { position: 0.31, y: 345, w: 170 }, { position: 0.43, y: 375, w: 205 },
    { position: 0.55, y: 345, w: 180 }, { position: 0.67, y: 370, w: 190 },
    { position: 0.79, y: 350, w: 185 }, { position: 0.91, y: 365, w: 175 }
  ],
  [
    { position: 0.08, y: 370, w: 170 }, { position: 0.20, y: 340, w: 190 },
    { position: 0.32, y: 380, w: 165 }, { position: 0.44, y: 355, w: 185 },
    { position: 0.56, y: 365, w: 175 }, { position: 0.68, y: 345, w: 190 },
    { position: 0.80, y: 375, w: 175 }, { position: 0.92, y: 355, w: 185 }
  ]
];

const FERRUCUTUS_CAGE_WIDTH = 164;
const CAPTIVE_RATIOS_BY_SECTION = [[0.20], [0.52], [0.32], [0.42], [0.30], [], []];
const CHAPTER_BY_SECTION = [0, 1, 2, 2, 3, 4, 5];
const BOSS_ENCOUNTERS_BY_SECTION = [
  [],
  [{
    id: "indoraptor-first-generation", kind: "indoraptor", generation: 1, ratio: 0.68,
    title: "INDORAPTOR // GEN 1", formLabel: "ORIGINAL SPECIMEN", formLabelEs: "EJEMPLAR ORIGINAL"
  }],
  [{
    id: "indoraptor-second-generation", kind: "indoraptor", generation: 2, ratio: 0.68,
    title: "INDORAPTOR // GEN 2", formLabel: "SECOND-GENERATION SPECIMEN", formLabelEs: "EJEMPLAR DE SEGUNDA GENERACIÓN"
  }],
  [],
  [
    {
      id: "indominus-first-generation", kind: "indominus", generation: 1, variant: "first-generation", ratio: 0.28,
      title: "INDOMINUS REX // GEN 1", formLabel: "ORIGINAL SPECIMEN", formLabelEs: "EJEMPLAR ORIGINAL"
    },
    {
      id: "indominus-second-generation", kind: "indominus", generation: 2, variant: "second-generation", ratio: 0.52,
      title: "INDOMINUS REX // GEN 2", formLabel: "SECOND-GENERATION SPECIMEN", formLabelEs: "EJEMPLAR DE SEGUNDA GENERACIÓN"
    },
    {
      id: "indominus-second-generation-variant", kind: "indominus", generation: 2, variant: "second-generation-variant", ratio: 0.76,
      title: "INDOMINUS REX // GEN 2 VARIANT", formLabel: "SECOND-GENERATION VARIANT", formLabelEs: "VARIANTE DE SEGUNDA GENERACIÓN"
    }
  ],
  [],
  []
];
const BOSS_RATIOS_BY_SECTION = BOSS_ENCOUNTERS_BY_SECTION.map((encounters) =>
  encounters.map(({ ratio }) => ratio)
);
const VENATOSAURUS_RATIOS_BY_SECTION = [
  [0.12, 0.70], [0.20, 0.45, 0.90], [0.18, 0.44, 0.86],
  [0.18, 0.50, 0.87], [0.14, 0.44, 0.84], [], [0.25, 0.62, 0.84]
];
const FOOD_RATIOS_BY_SECTION = [
  [0.35, 0.84], [0.42, 0.88], [0.25, 0.78], [0.32, 0.72],
  [0.36, 0.88], [], [0.40, 0.78]
];
const HUNTER_SPAWNS_BY_SECTION = [
  [{ ratio: 0.46, carriesCaptive: true }, { ratio: 0.78, carriesCaptive: false }],
  [{ ratio: 0.27, carriesCaptive: false }, { ratio: 0.92, carriesCaptive: false }],
  [],
  [{ ratio: 0.22, carriesCaptive: false }, { ratio: 0.82, carriesCaptive: true }],
  [],
  [{ ratio: 0.34, carriesCaptive: false }, { ratio: 0.72, carriesCaptive: false }],
  [{ ratio: 0.30, carriesCaptive: false }, { ratio: 0.72, carriesCaptive: false }]
];

function positionAt(sectionStart, sectionLength, ratio) {
  return sectionStart + Math.round(sectionLength * ratio);
}

function proceduralCagePositions(sectionStart, sectionLength, sectionIndex) {
  return (CAPTIVE_RATIOS_BY_SECTION[sectionIndex] ?? [])
    .map((ratio) => positionAt(sectionStart, sectionLength, ratio))
    .filter((x) => x >= sectionStart && x + FERRUCUTUS_CAGE_WIDTH <= sectionStart + sectionLength);
}

export class PlatformWorld {
  constructor(groundY, { seed = Math.floor(Math.random() * 0x100000000) } = {}) {
    this.groundY = groundY;
    this.seed = (seed >>> 0) || 0x9e3779b9;
    this.sectionSeeds = [];
    this.sectionLengths = WORLD.sectionLengths;
    this.platforms = [];
    this.obstacles = [];
    this.hunterSpawns = [];
    this.venatosaurusSpawns = [];
    this.foodSpawns = [];
    this.brontosaurusSpawns = [];
    this.allySpawns = [];
    this.ferrucutusCageSpawns = [];
    this.bossSpawns = [];
    this.facilitySpawns = null;
    this.facilityProps = [];
    this.sceneryProps = [];
    this.collectibleSpawns = [];
    this.generatedSections = 0;
    this.bridgeSequence = 0;
    this.extendTo(GAME.playerX + WORLD.maxSectionLength + 1200);
  }

  extendTo(worldX) {
    while (
      this.generatedSections < WORLD.sectionCount &&
      WORLD.sectionStarts[this.generatedSections] <= worldX
    ) {
      this.generateSection(this.generatedSections);
      this.generatedSections += 1;
    }
  }

  generateSection(index) {
    const start = WORLD.sectionStarts[index];
    const sectionLength = WORLD.sectionLengths[index];
    const end = start + sectionLength;
    const at = (ratio) => positionAt(start, sectionLength, ratio);
    const floorHeight = 110;
    const sectionSeed = (this.seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
    const random = seededRandom(sectionSeed);
    this.sectionSeeds[index] = sectionSeed;

    const isBossArena = index === 4;
    const isFacilityArea = index === 5;
    const isFinalArea = index === 6;
    const levelIndex = CHAPTER_BY_SECTION[index] ?? LEVELS.length - 1;

    const cagePositions = proceduralCagePositions(start, sectionLength, index);
    cagePositions.forEach((x, rescueIndex) => {
      this.ferrucutusCageSpawns.push({
        id: "ferrucutus-cage-" + index + "-" + (rescueIndex + 1),
        x, groundY: this.groundY, levelIndex, rescueIndex
      });
    });

    const layout = PLATFORM_LAYOUTS[Math.floor(random() * PLATFORM_LAYOUTS.length)];
    const generatedLedges = layout.map((ledge) => ({
      x: at(ledge.position) + Math.round((random() - 0.5) * Math.min(54, sectionLength * 0.012)),
      y: ledge.y + Math.round((random() - 0.5) * 10),
      w: ledge.w + Math.round((random() - 0.5) * 24),
      h: 18,
      kind: "ledge"
    }));

    const continuousFloor = isFacilityArea || isFinalArea;
    this.platforms.push(
      { x: start, y: this.groundY, w: continuousFloor ? sectionLength : 730, h: floorHeight, kind: "ground" },
      ...(!continuousFloor && isBossArena ? [{ x: start + 730, y: this.groundY, w: 170, h: floorHeight, kind: "ground" }] : []),
      ...(!continuousFloor ? [{ x: start + 900, y: this.groundY, w: sectionLength - 900, h: floorHeight, kind: "ground" }] : []),
      ...generatedLedges
    );

    const reservedCharacterPositions = [
      ...(CAPTIVE_RATIOS_BY_SECTION[index] ?? []),
      ...(VENATOSAURUS_RATIOS_BY_SECTION[index] ?? []),
      ...(FOOD_RATIOS_BY_SECTION[index] ?? []),
      ...(HUNTER_SPAWNS_BY_SECTION[index] ?? []).map((spawn) => spawn.ratio),
      ...(BOSS_RATIOS_BY_SECTION[index] ?? [])
    ].map(at);

    const occupiedCages = this.ferrucutusCageSpawns.filter((cage) => cage.x >= start && cage.x < end);
    if (!isBossArena && !isFacilityArea) {
      const obstacleRatios = shuffle([0.08, 0.20, 0.32, 0.44, 0.56, 0.68, 0.80, 0.92], random);
      const targetObstacleCount = 4 + Math.floor(random() * 2);
      let placedObstacles = 0;
      for (const ratio of obstacleRatios) {
        if (placedObstacles >= targetObstacleCount) break;
        const obstacleX = at(ratio) + Math.round((random() - 0.5) * 24);
        const obstacleType = random() < 0.5 ? "crate" : "rock";
        const width = obstacleType === "crate" ? 52 : 56;
        const height = obstacleType === "crate" ? 52 : 58;
        const obstacleCenter = obstacleX + width / 2;
        const overlapsCage = occupiedCages.some((cage) =>
          obstacleX < cage.x + FERRUCUTUS_CAGE_WIDTH + 24 && obstacleX + width > cage.x - 24
        );
        const crowdsCharacter = reservedCharacterPositions.some((position) =>
          Math.abs(obstacleCenter - position) < 220
        );
        const crowdsBossArena = (BOSS_RATIOS_BY_SECTION[index] ?? []).some((ratio) =>
          Math.abs(obstacleCenter - at(ratio)) < 700
        );
        if (overlapsCage || crowdsCharacter || crowdsBossArena) continue;
        this.obstacles.push({ x: obstacleX, y: this.groundY - height, w: width, h: height, type: obstacleType, passed: false });
        placedObstacles += 1;
      }
    }

    const patrolRadius = Math.min(520, Math.max(280, Math.round(sectionLength * 0.055)));
    (VENATOSAURUS_RATIOS_BY_SECTION[index] ?? []).forEach((ratio, spawnIndex) => {
      const x = at(ratio) + Math.round((random() - 0.5) * 50);
      this.venatosaurusSpawns.push({
        id: "venatosaurus-" + index + "-" + spawnIndex,
        kind: levelIndex === 0 ? "venatosaurus-impavidus" : "venatosaurus-saevidicus",
        x,
        patrolStart: Math.max(start + 120, x - patrolRadius),
        patrolEnd: Math.min(end - 40, x + patrolRadius),
        direction: random() < 0.5 ? -1 : 1
      });
    });

    (FOOD_RATIOS_BY_SECTION[index] ?? []).forEach((ratio, spawnIndex) => {
      const x = at(ratio) + Math.round((random() - 0.5) * 60);
      this.foodSpawns.push({ id: "ligocristus-" + index + "-" + spawnIndex, kind: "ligocristus", x, groundY: this.groundY });
    });

    if (index === 0 || index === 1) {
      const ratio = index === 0 ? 0.66 : 0.55;
      const brontosaurusX = at(ratio) + Math.round((random() - 0.5) * 90);
      this.brontosaurusSpawns.push({
        id: "brontosaurus-" + index,
        x: brontosaurusX,
        patrolStart: Math.max(start + 100, brontosaurusX - 430),
        patrolEnd: Math.min(end - 80, brontosaurusX + 650),
        groundY: this.groundY,
        kind: "brontosaurus"
      });
    }

    const hunterPatrolRadius = Math.min(460, Math.max(260, Math.round(sectionLength * 0.055)));
    (HUNTER_SPAWNS_BY_SECTION[index] ?? []).forEach((spawn, spawnIndex) => {
      const hunterX = at(spawn.ratio) + Math.round((random() - 0.5) * 30);
      this.hunterSpawns.push({
        id: "hunter-" + index + "-" + spawnIndex,
        x: hunterX,
        patrolStart: Math.max(start + 120, hunterX - hunterPatrolRadius),
        patrolEnd: Math.min(end - 40, hunterX + hunterPatrolRadius),
        carriesCaptive: spawn.carriesCaptive
      });
    });

    (BOSS_ENCOUNTERS_BY_SECTION[index] ?? []).forEach(({ ratio, ...encounter }) => {
      this.bossSpawns.push({ ...encounter, x: at(ratio) });
    });

    if (isFacilityArea) {
      this.facilitySpawns = {
        consoles: [
          { id: "aux-power", kind: "power", x: at(0.15) },
          { id: "security-lock", kind: "security", x: at(0.40) }
        ],
        beta: at(0.68),
        extraction: WORLD.extractionX
      };
      this.facilityProps.push(
        { x: at(0.03), y: 220, w: Math.round(sectionLength * 0.11), h: 210, kind: "facility-building" },
        { x: at(0.20), y: 180, w: Math.round(sectionLength * 0.16), h: 250, kind: "facility-building" },
        { x: at(0.42), y: 230, w: Math.round(sectionLength * 0.14), h: 200, kind: "containment-wing" },
        { x: at(0.61), y: 245, w: Math.round(sectionLength * 0.14), h: 185, kind: "facility-building" },
        { x: at(0.80), y: 220, w: Math.round(sectionLength * 0.13), h: 210, kind: "facility-building" },
        { x: at(0.06), y: 90, w: 28, h: 340, kind: "facility-lamp" },
        { x: at(0.26), y: 80, w: 28, h: 350, kind: "facility-lamp" },
        { x: at(0.52), y: 80, w: 28, h: 350, kind: "facility-lamp" },
        { x: at(0.77), y: 80, w: 28, h: 350, kind: "facility-lamp" },
        { x: at(0.94), y: 80, w: 28, h: 350, kind: "facility-lamp" }
      );
    }

    if (isFinalArea) {
      this.facilityProps.push(
        { x: at(0.04), y: 220, w: Math.round(sectionLength * 0.15), h: 210, kind: "facility-building" },
        { x: at(0.24), y: 180, w: Math.round(sectionLength * 0.16), h: 250, kind: "facility-building" },
        { x: at(0.47), y: 230, w: Math.round(sectionLength * 0.14), h: 200, kind: "facility-building" },
        { x: at(0.70), y: 245, w: Math.round(sectionLength * 0.16), h: 185, kind: "facility-building" },
        { x: at(0.04), y: 290, w: Math.round(sectionLength * 0.92), h: 14, kind: "security-fence" },
        { x: at(0.07), y: 90, w: 28, h: 340, kind: "facility-lamp" },
        { x: at(0.28), y: 80, w: 28, h: 350, kind: "facility-lamp" },
        { x: at(0.55), y: 80, w: 28, h: 350, kind: "facility-lamp" },
        { x: at(0.82), y: 80, w: 28, h: 350, kind: "facility-lamp" },
        { x: at(0.96), y: 80, w: 28, h: 350, kind: "facility-lamp" }
      );
    }

    const scenerySafeZones = [
      ...(!continuousFloor && !isBossArena ? [{ x: start + 815, radius: 125 }] : []),
      ...reservedCharacterPositions.map((x) => ({ x, radius: 175 })),
      ...occupiedCages.map((cage) => ({ x: cage.x + FERRUCUTUS_CAGE_WIDTH / 2, radius: 230 })),
      ...this.obstacles
        .filter((obstacle) => obstacle.x >= start && obstacle.x <= end)
        .map((obstacle) => ({ x: obstacle.x + obstacle.w / 2, radius: 115 })),
      ...(BOSS_RATIOS_BY_SECTION[index] ?? []).map((ratio) => ({ x: at(ratio), radius: 660 }))
    ];
    this.sceneryProps.push(...generateSectionScenery({
      seed: this.seed,
      sectionIndex: index,
      sectionStart: start,
      sectionLength,
      groundY: this.groundY,
      environment: LEVELS[levelIndex]?.environment,
      safeZones: scenerySafeZones
    }));
    this.collectibleSpawns.push(...generateSectionCollectibles({
      seed: this.seed, sectionIndex: index, sectionStart: start, sectionLength, groundY: this.groundY
    }));
  }

  update(delta) {
    for (const platform of this.platforms) {
      if (platform.kind === "ally-bridge") platform.remaining -= delta;
    }
    this.platforms = this.platforms.filter((platform) => platform.kind !== "ally-bridge" || platform.remaining > 0);
  }

  gapAhead(worldX, maxDistance = 390) {
    const grounds = this.platforms.filter((platform) => platform.kind === "ground").sort((a,b)=>a.x-b.x);
    const current = grounds.find((platform) => platform.x <= worldX && platform.x + platform.w >= worldX);
    if (!current) return null;
    const next = grounds.find((platform) => platform.x >= current.x + current.w);
    if (!next) return null;
    const start = current.x + current.w, end = next.x, width = end - start;
    if (start < worldX || start - worldX > maxDistance || width <= 12 || width > 340) return null;
    return { start, end, width };
  }

  gapBehind(worldX, maxDistance = 390) {
    const grounds = this.platforms.filter((platform) => platform.kind === "ground").sort((a, b) => a.x - b.x);
    const current = grounds.find((platform) => platform.x <= worldX && platform.x + platform.w >= worldX);
    if (!current) return null;
    const previous = grounds.filter((platform) => platform.x + platform.w <= current.x).at(-1);
    if (!previous) return null;
    const start = previous.x + previous.w;
    const end = current.x;
    const width = end - start;
    const distance = worldX - end;
    if (distance < 0 || distance > maxDistance || width <= 12 || width > 340) return null;
    return { start, end, width };
  }

  hasGroundSupportAt(worldX, groundY = this.groundY, includeBridges = true) {
    return this.platforms.some((platform) =>
      (platform.kind === "ground" || (includeBridges && platform.kind === "ally-bridge")) &&
      worldX >= platform.x && worldX <= platform.x + platform.w &&
      Math.abs(platform.y - groundY) <= 16
    );
  }

  resolveGroundPitfall(entity, groundY = this.groundY, delta = GAME.fixedStep) {
    if (!entity || entity.defeated) return false;

    if (entity.fellIntoPit) {
      const step = Math.max(0, delta);
      entity.onGround = false;
      entity.vy = (entity.vy ?? 0) + GAME.gravity * step;
      entity.y += entity.vy * step;
      entity.motionSpeed = 0;

      if (entity.y > groundY + 240) {
        entity.defeated = true;
        entity.falling = false;
        entity.state = "defeated";
        entity.vy = 0;
      }
      return true;
    }

    if (Math.abs(entity.y + entity.h - groundY) > 18) return false;
    if (this.hasGroundSupportAt(entity.x + entity.w / 2, groundY, true)) return false;

    entity.fellIntoPit = true;
    entity.falling = true;
    entity.onGround = false;
    entity.vy = 0;
    entity.state = "falling";
    entity.motionSpeed = 0;
    return true;
  }

  createSupportBridge(start, end, duration = 6.5) {
    const width = end - start;
    if (width <= 12 || width > 340) return null;
    const id = "ally-bridge-" + (++this.bridgeSequence);
    this.platforms.push({ id, x: start, y: this.groundY, w: width, h: 18, kind: "ally-bridge", remaining: duration });
    return { id, start, end, duration };
  }

  removeSupportBridge(id) {
    this.platforms = this.platforms.filter((platform) => platform.id !== id);
  }

  visibleScenery(cameraX, width, layer = null, environment = null) {
    return this.sceneryProps.filter((prop) => {
      if (layer && prop.layer !== layer) return false;
      if (environment && prop.environment !== environment) return false;
      if (prop.layer === "ground") {
        return prop.x + prop.width / 2 >= cameraX - 120 &&
          prop.x - prop.width / 2 <= cameraX + width + 120;
      }
      const screenX = width * (1 - prop.parallax) * 0.5 +
        (prop.x - cameraX) * prop.parallax;
      return screenX + prop.width >= -180 && screenX - prop.width <= width + 180;
    });
  }

  pruneBehind(worldX, retain = 1400) {
    const cutoff = worldX - retain;
    this.platforms = this.platforms.filter((platform) => platform.x + platform.w >= cutoff);
    this.obstacles = this.obstacles.filter((obstacle) => obstacle.x + obstacle.w >= cutoff);
    this.hunterSpawns = this.hunterSpawns.filter((spawn) => spawn.x >= cutoff);
    this.venatosaurusSpawns = this.venatosaurusSpawns.filter((spawn) => spawn.x + 112 >= cutoff);
    this.foodSpawns = this.foodSpawns.filter((spawn) => spawn.x + 120 >= cutoff);
    this.brontosaurusSpawns = this.brontosaurusSpawns.filter((spawn) => spawn.x + 300 >= cutoff);
    this.allySpawns = this.allySpawns.filter((spawn) => spawn.x >= cutoff);
    this.ferrucutusCageSpawns = this.ferrucutusCageSpawns.filter((spawn) => spawn.x >= cutoff);
    this.bossSpawns = this.bossSpawns.filter((spawn) => spawn.x >= cutoff);
    this.facilityProps = this.facilityProps.filter((prop) => prop.x + prop.w >= cutoff);
    this.sceneryProps = this.sceneryProps.filter((prop) =>
      prop.layer === "ground"
        ? prop.x + prop.width / 2 >= cutoff
        : prop.x + prop.width >= worldX - 6200
    );
  }

  platformsNear(worldX, range = 1200) {
    return this.platforms.filter((platform) => platform.x + platform.w >= worldX - 120 && platform.x <= worldX + range);
  }

  visiblePlatforms(cameraX, width) {
    return this.platforms.filter((platform) => platform.x + platform.w >= cameraX - 40 && platform.x <= cameraX + width + 40);
  }

  visibleObstacles(cameraX, width) {
    return this.obstacles.filter((obstacle) => obstacle.x + obstacle.w >= cameraX - 40 && obstacle.x <= cameraX + width + 40);
  }
}
