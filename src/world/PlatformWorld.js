export class PlatformWorld {
  constructor(groundY) {
    this.groundY = groundY;
    this.sectionLength = 1500;
    this.platforms = [];
    this.obstacles = [];
    this.generatedSections = 0;
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

    // Each section has a deliberate gap; elevated ledges provide alternate routes.
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
      { offset: 1050, type: "hunter", w: 43, h: 72 },
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
  }

  pruneBehind(worldX, retain = 1400) {
    const cutoff = worldX - retain;
    this.platforms = this.platforms.filter((platform) => platform.x + platform.w >= cutoff);
    this.obstacles = this.obstacles.filter((obstacle) => obstacle.x + obstacle.w >= cutoff);
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
