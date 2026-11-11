import { BossEnemy } from "./BossEnemy.js";

export class IndominusRexBoss extends BossEnemy {
  constructor({ id, x, groundY, arenaMinX, arenaMaxX }) {
    super({
      id,
      kind: "indominus",
      x,
      groundY,
      width: 224,
      height: 150,
      health: 14,
      detectionRange: 620,
      preferredDistance: 280,
      moveSpeed: 78,
      attackCooldown: 1.65
    });
    if (Number.isFinite(arenaMinX)) this.arenaMinX = arenaMinX;
    if (Number.isFinite(arenaMaxX)) this.arenaMaxX = arenaMaxX;
    this.roarRadius = 230;
  }

  chooseAttack(distance) {
    if (distance > 300 && this.attackIndex % 3 !== 2) return "roar";
    return this.attackIndex % 2 === 0 ? "charge" : "tail-sweep";
  }

  telegraphDuration() {
    if (this.attackName === "roar") return this.phase === 2 ? 0.62 : 0.88;
    return this.phase === 2 ? 0.5 : 0.72;
  }

  attackDuration() {
    if (this.attackName === "roar") return 0.42;
    return this.attackName === "charge" ? 0.62 : 0.34;
  }

  recoveryDuration() {
    return this.phase === 2 ? 0.72 : 1.05;
  }

  onTelegraph() {
    this.y = this.baseY;
  }

  onAttack(delta) {
    if (this.attackName === "charge") {
      this.x += this.direction * (this.phase === 2 ? 510 : 390) * delta;
    } else if (this.attackName === "tail-sweep") {
      this.x += this.direction * 75 * delta;
    }
    this.x = Math.max(this.arenaMinX, Math.min(this.arenaMaxX - this.w, this.x));
  }

  get attackBox() {
    if (this.state !== "attacking") return null;

    if (this.attackName === "roar") {
      return {
        x: this.x - this.roarRadius,
        y: this.groundY - 58,
        w: this.w + this.roarRadius * 2,
        h: 62
      };
    }

    if (this.attackName === "charge") {
      return {
        x: this.direction > 0 ? this.x + this.w - 28 : this.x - 152,
        y: this.y + 46,
        w: 180,
        h: 93
      };
    }

    return {
      x: this.direction > 0 ? this.x - 110 : this.x + this.w - 10,
      y: this.y + 74,
      w: 120,
      h: 68
    };
  }
}
