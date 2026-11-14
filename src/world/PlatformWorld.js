import { GAME, LEVELS, WORLD } from "../config/GameConfig.js";

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
const VENATOSAURUS_RATIOS_BY_SECTION = [
  [0.12, 0.70], [0.20, 0.65, 0.90], [0.18, 0.44, 0.86],
  [0.18, 0.50, 0.87], [0.14, 0.44, 0.84], [], [0.25, 0.62, 0.84]
];
const FOOD_RATIOS_BY_SECTION = [
  [0.35, 0.84], [0.42, 0.88], [0.25, 0.78], [0.32, 0.72],
  [0.36, 0.88], [], [0.40, 0.78]
];
const HUNTER_SPAWNS_BY_SECTION = [
  [{ ratio: 0.46, carriesCaptive: true }, { ratio: 0.78, carriesCaptive: false }],
  [{ ratio: 0.27, carriesCaptive: false }, { ratio: 0.76, carriesCaptive: false }],
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

    const isBossArena = index === 2 || index === 4;
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

    const chapterEnvironment = LEVELS[levelIndex].environment;
    const reservedCharacterPositions = [
      ...(CAPTIVE_RATIOS_BY_SECTION[index] ?? []),
      ...(VENATOSAURUS_RATIOS_BY_SECTION[index] ?? []),
      ...(FOOD_RATIOS_BY_SECTION[index] ?? []),
      ...(HUNTER_SPAWNS_BY_SECTION[index] ?? []).map((spawn) => spawn.ratio)
    ].map(at);

    if (!isBossArena && !isFacilityArea) {
      const occupiedCages = this.ferrucutusCageSpawns.filter((cage) => cage.x >= start && cage.x < end);
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
        if (overlapsCage || crowdsCharacter) continue;
        this.obstacles.push({ x: obstacleX, y: this.groundY - height, w: width, h: height, type: obstacleType, passed: false });
        placedObstacles += 1;
      }
    }

    const patrolRadius = Math.min(520, Math.max(280, Math.round(sectionLength * 0.055)));
    (VENATOSAURUS_RATIOS_BY_SECTION[index] ?? []).forEach((ratio, spawnIndex) => {
      const x = at(ratio) + Math.round((random() - 0.5) * 50);
      this.venatosaurusSpawns.push({
        id: "venatosaurus-" + index + "-" + spawnIndex,
        kind: chapterEnvironment === "wild" ? "venatosaurus-impavidus" : "venatosaurus-saevidicus",
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

    if (index === 2) this.bossSpawns.push({ id: "indoraptor-encounter", kind: "indoraptor", x: at(0.68) });
    if (index === 4) this.bossSpawns.push({ id: "indominus-encounter", kind: "indominus", x: at(0.68) });

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

  resolveGroundPitfall(entity, groundY = this.groundY) {
    if (!entity || entity.defeated || Math.abs(entity.y + entity.h - groundY) > 18) return false;
    if (this.hasGroundSupportAt(entity.x + entity.w / 2, groundY, true)) return false;
    entity.defeated = true;
    entity.fellIntoPit = true;
    entity.state = "defeated";
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
