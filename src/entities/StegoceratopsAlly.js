export class StegoceratopsAlly {
  constructor({ x, groundY, cameraRight = x + 960 }) {
    this.id = "stegoceratops-sweep-" + Math.round(x);
    this.character = "stegoceratops";
    this.x = x;
    this.y = groundY - 108;
    this.w = 184;
    this.h = 108;
    this.groundY = groundY;
    this.direction = 1;
    this.motionSpeed = 930;
    this.state = "charging";
    this.cameraRight = cameraRight;
    this.hitTargets = new Set();
    this.finished = false;
  }

  update(delta, cameraX) {
    if (this.finished) return;
    this.x += this.motionSpeed * delta;
    if (this.x > cameraX + 960 + 220) this.finished = true;
  }

  hasHit(targetId) {
    return this.hitTargets.has(targetId);
  }

  markHit(targetId) {
    this.hitTargets.add(targetId);
  }

  get attackBox() {
    return {
      x: this.x + 18,
      y: this.y + 22,
      w: this.w - 30,
      h: this.h - 30
    };
  }
}
