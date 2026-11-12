import { GAME, LEVELS } from "../config/GameConfig.js";

const FERRUCUTUS_CAGE_OFFSETS = [
  [120, 385, 785],
  [130, 550, 950],
  [280, 1300, 2520],
  [250, 520],
  [150, 540],
  [150, 420]
];

export class PlatformWorld {
  constructor(groundY) {
    this.groundY = groundY;
    this.sectionLength = 1500;
    this.platforms = [];
    this.obstacles = [];
    this.hunterSpawns = [];
    this.allySpawns = []; // Kept empty for compatibility; Ferrucutus now spawn as captives.
    this.ferrucutusCageSpawns = [];
    this.bossSpawns = [];
    this.facilitySpawns = null;
    this.facilityProps = [];
    this.generatedSections = 0;
    this.bridgeSequence = 0;
    this.extendTo(2800);
  }

  extendTo(worldX) {
    while (
      this.generatedSections * this.sectionLength < worldX &&
      this.generatedSections <= 5
    ) {
      this.generateSection(this.generatedSections);
      this.generatedSections += 1;
    }
  }

  generateSection(index) {
    const start = index * this.sectionLength;
    const floorHeight = 110;

    const isBossArena = index === 2 || index === 4;
    const isFinalArea = index === 5;

    for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
      const offsets = FERRUCUTUS_CAGE_OFFSETS[levelIndex] ?? [];
      offsets.forEach((offset, rescueIndex) => {
        const x = GAME.playerX + LEVELS[levelIndex].distance + offset;
        if (x >= start && x < start + this.sectionLength) {
          this.ferrucutusCageSpawns.push({
            id: "ferrucutus-cage-" + levelIndex + "-" + (rescueIndex + 1),
            x,
            levelIndex,
            rescueIndex
          });
        }
      });
    }
    this.platforms.push(
      { x: start, y: this.groundY, w: isFinalArea ? 1900 : 730, h: floorHeight, kind: "ground" },
      ...(!isFinalArea && isBossArena ? [{ x: start + 730, y: this.groundY, w: 170, h: floorHeight, kind: "ground" }] : []),
      ...(!isFinalArea ? [{ x: start + 900, y: this.groundY, w: 620, h: floorHeight, kind: "ground" }] : []),
      { x: start + 250, y: 354, w: 165, h: 18, kind: "ledge" },
      { x: start + 505, y: 306, w: 150, h: 18, kind: "ledge" },
      { x: start + 695, y: 365, w: 215, h: 18, kind: "ledge" },
      { x: start + 1090, y: 342, w: 185, h: 18, kind: "ledge" }
    );

    const obstacleSet = isBossArena || isFinalArea ? [] : [
      { offset: 445, type: index % 3 === 0 ? "crate" : "rock", w: 52, h: 52 },
      { offset: 1320, type: index % 2 === 0 ? "crate" : "rock", w: 55, h: 58 }
    ];

    for (const item of obstacleSet) {
      this.obstacles.push({
        ...item,
        x: start + item.offset,
        y: this.groundY - item.h,
        passed: false
      });
    }

    if (!isBossArena && !isFinalArea) {
      this.hunterSpawns.push({
        id: "hunter-" + index,
        x: start + 1045,
        patrolStart: start + 955,
        patrolEnd: start + 1270,
        carriesCaptive: true
      });
    }

    if (index === 2 || index === 3 || index === 4) {
      const propsStart = index * this.sectionLength;
      this.facilityProps.push(
        { x: propsStart + 90, y: 255, w: 220, h: 175, kind: "facility-building" },
        { x: propsStart + 410, y: 225, w: 300, h: 205, kind: index === 4 ? "containment-wing" : "facility-building" },
        { x: propsStart + 1040, y: 270, w: 245, h: 160, kind: "facility-building" },
        { x: propsStart + 130, y: 150, w: 18, h: 280, kind: "facility-lamp" },
        { x: propsStart + 1160, y: 140, w: 18, h: 290, kind: "facility-lamp" }
      );
    }

    if (index === 2) {
      this.bossSpawns.push({
        id: "indoraptor-encounter",
        kind: "indoraptor",
        x: start + 820
      });
    }

    if (index === 4) {
      this.bossSpawns.push({
        id: "indominus-encounter",
        kind: "indominus",
        x: start + 760
      });
    }

    if (isFinalArea) {
      this.facilitySpawns = {
        consoles: [
          { id: "aux-power", kind: "power", x: start + 245 },
          { id: "security-lock", kind: "security", x: start + 520 }
        ],
        beta: start + 900,
        extraction: start + 1510
      };
      this.facilityProps.push(
        { x: start + 50, y: 220, w: 210, h: 210, kind: "facility-building" },
        { x: start + 310, y: 180, w: 390, h: 250, kind: "facility-building" },
        { x: start + 760, y: 230, w: 260, h: 200, kind: "containment-wing" },
        { x: start + 1110, y: 245, w: 260, h: 185, kind: "facility-building" },
        { x: start + 140, y: 290, w: 1700, h: 14, kind: "security-fence" },
        { x: start + 150, y: 90, w: 28, h: 340, kind: "facility-lamp" },
        { x: start + 610, y: 80, w: 28, h: 350, kind: "facility-lamp" },
        { x: start + 1170, y: 80, w: 28, h: 350, kind: "facility-lamp" },
        { x: start + 1530, y: 80, w: 28, h: 350, kind: "facility-lamp" }
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
