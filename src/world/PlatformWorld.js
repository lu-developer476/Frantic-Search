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
    { offset: 220, y: 365, w: 170 }, { offset: 620, y: 342, w: 175 },
    { offset: 1020, y: 378, w: 190 }, { offset: 1420, y: 350, w: 185 },
    { offset: 1820, y: 365, w: 175 }, { offset: 2220, y: 342, w: 190 },
    { offset: 2620, y: 378, w: 180 }
  ],
  [
    { offset: 260, y: 380, w: 190 }, { offset: 660, y: 350, w: 155 },
    { offset: 1060, y: 365, w: 190 }, { offset: 1460, y: 340, w: 165 },
    { offset: 1860, y: 375, w: 190 }, { offset: 2260, y: 350, w: 175 },
    { offset: 2660, y: 370, w: 185 }
  ],
  [
    { offset: 190, y: 350, w: 175 }, { offset: 590, y: 375, w: 185 },
    { offset: 990, y: 345, w: 170 }, { offset: 1390, y: 375, w: 205 },
    { offset: 1790, y: 345, w: 180 }, { offset: 2190, y: 370, w: 190 },
    { offset: 2590, y: 350, w: 185 }
  ],
  [
    { offset: 275, y: 370, w: 170 }, { offset: 675, y: 340, w: 190 },
    { offset: 1075, y: 380, w: 165 }, { offset: 1475, y: 355, w: 185 },
    { offset: 1875, y: 365, w: 175 }, { offset: 2275, y: 345, w: 190 },
    { offset: 2675, y: 375, w: 175 }
  ]
];

const FERRUCUTUS_CAGE_WIDTH = 164;
const CAPTIVE_OFFSETS_BY_SECTION = [[1200], [1200], [900], [2100], [900], [], []];
const CHAPTER_BY_SECTION = [0, 1, 2, 2, 3, 4, 5];
const VENATOSAURUS_OFFSETS_BY_SECTION = [
  [600, 2200], [1200, 2700], [500], [700, 2200], [950], [], [1250]
];
const FOOD_OFFSETS_BY_SECTION = [[1850], [2250], [2500], [1750], [2500], [], [1900]];
const HUNTER_SPAWNS_BY_SECTION = [
  [{ offset: 2700, carriesCaptive: true }],
  [],
  [],
  [{ offset: 350, carriesCaptive: true }],
  [],
  [{ offset: 2650, carriesCaptive: false }],
  []
];

function proceduralCagePositions(sectionStart, sectionEnd, sectionIndex) {
  return (CAPTIVE_OFFSETS_BY_SECTION[sectionIndex] ?? [])
    .map((offset) => sectionStart + offset)
    .filter((x) => x >= sectionStart && x + FERRUCUTUS_CAGE_WIDTH <= sectionEnd);
}

export class PlatformWorld {
  constructor(groundY, { seed = Math.floor(Math.random() * 0x100000000) } = {}) {
    this.groundY = groundY;
    this.seed = (seed >>> 0) || 0x9e3779b9;
    this.sectionSeeds = [];
    this.sectionLength = WORLD.sectionLength;
    this.platforms = [];
    this.obstacles = [];
    this.hunterSpawns = [];
    this.venatosaurusSpawns = [];
    this.foodSpawns = [];
    this.brontosaurusSpawns = [];
    this.allySpawns = []; // Kept empty for compatibility; Ferrucutus now spawn as captives.
    this.ferrucutusCageSpawns = [];
    this.bossSpawns = [];
    this.facilitySpawns = null;
    this.facilityProps = [];
    this.generatedSections = 0;
    this.bridgeSequence = 0;
    this.extendTo(this.sectionLength + 1200);
  }

  extendTo(worldX) {
    while (
      this.generatedSections * this.sectionLength < worldX &&
      this.generatedSections < WORLD.sectionCount
    ) {
      this.generateSection(this.generatedSections);
      this.generatedSections += 1;
    }
  }

  generateSection(index) {
    const start = index * this.sectionLength;
    const floorHeight = 110;
    const sectionSeed = (this.seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
    const random = seededRandom(sectionSeed);
    this.sectionSeeds[index] = sectionSeed;

    const isBossArena = index === 2 || index === 4;
    const isFacilityArea = index === 5;
    const isFinalArea = index === 6;
    const levelIndex = CHAPTER_BY_SECTION[index] ?? LEVELS.length - 1;

    const positions = proceduralCagePositions(start, start + this.sectionLength, index);
    positions.forEach((x, rescueIndex) => {
      this.ferrucutusCageSpawns.push({
        id: "ferrucutus-cage-" + index + "-" + (rescueIndex + 1),
        x, groundY: this.groundY, levelIndex, rescueIndex
      });
    });

    const layout = PLATFORM_LAYOUTS[Math.floor(random() * PLATFORM_LAYOUTS.length)];
    const generatedLedges = layout.map((ledge) => ({
      x: start + ledge.offset + Math.round((random() - 0.5) * 54),
      y: ledge.y + Math.round((random() - 0.5) * 10),
      w: ledge.w + Math.round((random() - 0.5) * 24),
      h: 18,
      kind: "ledge"
    }));

    const continuousFloor = isFacilityArea || isFinalArea;
    this.platforms.push(
      { x: start, y: this.groundY, w: continuousFloor ? this.sectionLength : 730, h: floorHeight, kind: "ground" },
      ...(!continuousFloor && isBossArena ? [{ x: start + 730, y: this.groundY, w: 170, h: floorHeight, kind: "ground" }] : []),
      ...(!continuousFloor ? [{ x: start + 900, y: this.groundY, w: this.sectionLength - 900, h: floorHeight, kind: "ground" }] : []),
      ...generatedLedges
    );

    const chapterEnvironment = LEVELS[levelIndex].environment;
    const reservedCharacterPositions = [
      ...(CAPTIVE_OFFSETS_BY_SECTION[index] ?? []),
      ...(VENATOSAURUS_OFFSETS_BY_SECTION[index] ?? []),
      ...(FOOD_OFFSETS_BY_SECTION[index] ?? []),
      ...(HUNTER_SPAWNS_BY_SECTION[index] ?? []).map((spawn) => spawn.offset)
    ].map((offset) => start + offset);

    if (!isBossArena && !isFacilityArea && !isFinalArea) {
      const occupiedCages = this.ferrucutusCageSpawns.filter((cage) =>
        cage.x >= start && cage.x < start + this.sectionLength
      );
      const candidateOffsets = shuffle([350, 1000, 1550, 2000, 2500, 2900], random);
      const targetObstacleCount = 3 + Math.floor(random() * 2);
      let placedObstacles = 0;
      for (const offset of candidateOffsets) {
        if (placedObstacles >= targetObstacleCount) break;
        const obstacleX = start + offset + Math.round((random() - 0.5) * 26);
        const obstacleType = random() < 0.5 ? "crate" : "rock";
        const width = obstacleType === "crate" ? 52 : 56;
        const height = obstacleType === "crate" ? 52 : 58;
        const obstacleCenter = obstacleX + width / 2;
        const overlapsCage = occupiedCages.some((cage) =>
          obstacleX < cage.x + FERRUCUTUS_CAGE_WIDTH + 24 && obstacleX + width > cage.x - 24
        );
        const crowdsCharacter = reservedCharacterPositions.some((position) =>
          Math.abs(obstacleCenter - position) < 180
        );
        if (overlapsCage || crowdsCharacter) continue;
        this.obstacles.push({
          x: obstacleX, y: this.groundY - height, w: width, h: height,
          type: obstacleType, passed: false
        });
        placedObstacles += 1;
      }
    }

    const patrolRadius = 360;
    (VENATOSAURUS_OFFSETS_BY_SECTION[index] ?? []).forEach((offset, spawnIndex) => {
      const x = start + offset + Math.round((random() - 0.5) * 50);
      this.venatosaurusSpawns.push({
        id: "venatosaurus-" + index + "-" + spawnIndex,
        kind: chapterEnvironment === "wild" ? "venatosaurus-impavidus" : "venatosaurus-saevidicus",
        x,
        patrolStart: Math.max(start + 120, x - patrolRadius),
        patrolEnd: Math.min(start + this.sectionLength - 40, x + patrolRadius),
        direction: random() < 0.5 ? -1 : 1
      });
    });

    (FOOD_OFFSETS_BY_SECTION[index] ?? []).forEach((offset, spawnIndex) => {
      const x = start + offset + Math.round((random() - 0.5) * 60);
      this.foodSpawns.push({
        id: "ligocristus-" + index + "-" + spawnIndex,
        kind: "ligocristus", x, groundY: this.groundY
      });
    });

    if (index === 0 || index === 1) {
      this.brontosaurusSpawns.push({
        id: "brontosaurus-" + index,
        x: start + (index === 0 ? 1050 : 2050) + Math.round((random() - 0.5) * 90),
        groundY: this.groundY, kind: "brontosaurus"
      });
    }

    (HUNTER_SPAWNS_BY_SECTION[index] ?? []).forEach((spawn, spawnIndex) => {
      const hunterX = start + spawn.offset + Math.round((random() - 0.5) * 30);
      this.hunterSpawns.push({
        id: "hunter-" + index + "-" + spawnIndex,
        x: hunterX,
        patrolStart: Math.max(start + 120, hunterX - 240),
        patrolEnd: Math.min(start + this.sectionLength - 40, hunterX + 240),
        carriesCaptive: spawn.carriesCaptive
      });
    });

    if (index === 2) {
      this.bossSpawns.push({
        id: "indoraptor-encounter",
        kind: "indoraptor",
        x: start + Math.round(this.sectionLength * 0.68)
      });
    }

    if (index === 4) {
      this.bossSpawns.push({
        id: "indominus-encounter",
        kind: "indominus",
        x: start + Math.round(this.sectionLength * 0.68)
      });
    }

    if (isFacilityArea) {
      this.facilitySpawns = {
        consoles: [
          { id: "aux-power", kind: "power", x: start + 550 },
          { id: "security-lock", kind: "security", x: start + 1450 }
        ],
        beta: start + 2300,
        extraction: start + WORLD.sectionLength * 2 - 300
      };
      this.facilityProps.push(
        { x: start + 45, y: 220, w: 270, h: 210, kind: "facility-building" },
        { x: start + 420, y: 180, w: 410, h: 250, kind: "facility-building" },
        { x: start + 970, y: 230, w: 340, h: 200, kind: "containment-wing" },
        { x: start + 1470, y: 245, w: 330, h: 185, kind: "facility-building" },
        { x: start + 2020, y: 220, w: 360, h: 210, kind: "facility-building" },
        { x: start + 170, y: 90, w: 28, h: 340, kind: "facility-lamp" },
        { x: start + 880, y: 80, w: 28, h: 350, kind: "facility-lamp" },
        { x: start + 1600, y: 80, w: 28, h: 350, kind: "facility-lamp" },
        { x: start + 2440, y: 80, w: 28, h: 350, kind: "facility-lamp" }
      );
    }
    if (isFinalArea) {
      this.facilityProps.push(
        { x: start + 70, y: 220, w: 330, h: 210, kind: "facility-building" },
        { x: start + 560, y: 180, w: 390, h: 250, kind: "facility-building" },
        { x: start + 1180, y: 230, w: 330, h: 200, kind: "facility-building" },
        { x: start + 1860, y: 245, w: 420, h: 185, kind: "facility-building" },
        { x: start + 140, y: 290, w: this.sectionLength - 320, h: 14, kind: "security-fence" },
        { x: start + 180, y: 90, w: 28, h: 340, kind: "facility-lamp" },
        { x: start + 950, y: 80, w: 28, h: 350, kind: "facility-lamp" },
        { x: start + 1780, y: 80, w: 28, h: 350, kind: "facility-lamp" },
        { x: start + 2680, y: 80, w: 28, h: 350, kind: "facility-lamp" }
      );
    }
  }

  update(delta) {
    for (const platform of this.platforms) {
      if (platform.kind === "ally-bridge") platform.remaining -= delta;
    }
    this.platforms = this.platforms.filter((platform) =>
      platform.kind !== "ally-bridge" || platform.remaining > 0
    );
  }

  gapAhead(worldX, maxDistance = 390) {
    const grounds = this.platforms
      .filter((platform) => platform.kind === "ground")
      .sort((a, b) => a.x - b.x);
    const current = grounds.find((platform) =>
      platform.x <= worldX && platform.x + platform.w >= worldX
    );
    if (!current) return null;

    const next = grounds.find((platform) => platform.x >= current.x + current.w);
    if (!next) return null;

    const start = current.x + current.w;
    const end = next.x;
    const width = end - start;
    if (start < worldX || start - worldX > maxDistance || width <= 12 || width > 340) return null;

    return { start, end, width };
  }

  createSupportBridge(start, end, duration = 6.5) {
    const width = end - start;
    if (width <= 12 || width > 340) return null;

    const id = "ally-bridge-" + (++this.bridgeSequence);
    const bridge = {
      id,
      x: start,
      y: this.groundY,
      w: width,
      h: 18,
      kind: "ally-bridge",
      remaining: duration
    };
    this.platforms.push(bridge);
    return { id, start, end, duration };
  }

  removeSupportBridge(id) {
    this.platforms = this.platforms.filter((platform) => platform.id !== id);
  }

  pruneBehind(worldX, retain = 1400) {
    const cutoff = worldX - retain;
    this.platforms = this.platforms.filter((platform) =>
      platform.x + platform.w >= cutoff
    );
    this.obstacles = this.obstacles.filter((obstacle) =>
      obstacle.x + obstacle.w >= cutoff
    );
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
    return this.platforms.filter((platform) =>
      platform.x + platform.w >= worldX - 120 &&
      platform.x <= worldX + range
    );
  }

  visiblePlatforms(cameraX, width) {
    return this.platforms.filter((platform) =>
      platform.x + platform.w >= cameraX - 40 &&
      platform.x <= cameraX + width + 40
    );
  }

  visibleObstacles(cameraX, width) {
    return this.obstacles.filter((obstacle) =>
      obstacle.x + obstacle.w >= cameraX - 40 &&
      obstacle.x <= cameraX + width + 40
    );
  }
}
