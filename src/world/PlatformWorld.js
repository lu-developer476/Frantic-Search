export class PlatformWorld {
  constructor(groundY) {
    this.groundY = groundY;
    this.sectionLength = 1500;
    this.platforms = [];
    this.obstacles = [];
    this.hunterSpawns = [];
    this.allySpawns = [];
    this.bossSpawns = [];
    this.generatedSections = 0;
    this.bridgeSequence = 0;
    this.extendTo(2800);
  }

  extendTo(worldX) {
    while (this.generatedSections * this.sectionLength < worldX) {
      this.generateSection(this.generatedSections);
      this.generatedSections += 1;
    }
  }

  generateSection(index) {
    const start = index * this.sectionLength;
    const floorHeight = 110;

    this.platforms.push(
      { x: start, y: this.groundY, w: 730, h: floorHeight, kind: "ground" },
      { x: start + 900, y: this.groundY, w: 620, h: floorHeight, kind: "ground" },
      { x: start + 250, y: 354, w: 165, h: 18, kind: "ledge" },
      { x: start + 505, y: 306, w: 150, h: 18, kind: "ledge" },
      { x: start + 695, y: 365, w: 215, h: 18, kind: "ledge" },
      { x: start + 1090, y: 342, w: 185, h: 18, kind: "ledge" }
    );

    const obstacleSet = [
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

    this.hunterSpawns.push({
      id: "hunter-" + index,
      x: start + 1045,
      patrolStart: start + 955,
      patrolEnd: start + 1270,
      carriesCaptive: true
    });

    if (index % 3 === 0) {
      this.allySpawns.push({
        id: "ferrucutus-" + index,
        x: start + 500
      });
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
    this.bossSpawns = this.bossSpawns.filter((spawn) => spawn.x >= cutoff);
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
