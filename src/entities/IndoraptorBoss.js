import { BossEnemy } from "./BossEnemy.js";

export class IndoraptorBoss extends BossEnemy {
  constructor({ id, x, groundY, arenaMinX, arenaMaxX }) {
    super({
      id,
      kind: "indoraptor",
      x,
      groundY,
      width: 126,
      height: 92,
      health: 8,
      detectionRange: 470,
      preferredDistance: 178,
      moveSpeed: 152,
      attackCooldown: 1.4
    });
    if (Number.isFinite(arenaMinX)) this.arenaMinX = arenaMinX;
    if (Number.isFinite(arenaMaxX)) this.arenaMaxX = arenaMaxX;
    this.attackDurationValue = 0.38;
    this.attackName = null;
    this.pounceOriginY = this.baseY;
  }

  chooseAttack() {
    return this.attackIndex % 2 === 0 ? "pounce" : "claw";
  }

  telegraphDuration() {
    return (this.phase === 2 ? 0.48 : 0.68) + (this.attackName === "claw" ? -0.12 : 0);
  }

  attackDuration() {
    return this.attackName === "pounce" ? 0.46 : 0.24;
  }

  recoveryDuration() {
    return this.phase === 2 ? 0.55 : 0.82;
  }

  onTelegraph(delta) {
    this.y = this.baseY + Math.sin(this.stateTimer * 18) * 2;
  }

  onAttack(delta) {
    if (this.attackName === "pounce") {
      this.x += this.direction * (this.phase === 2 ? 385 : 320) * delta;
      this.y = this.baseY - Math.sin(this.attackProgress * Math.PI) * 92;
    } else {
      this.x += this.direction * (this.phase === 2 ? 235 : 185) * delta;
      this.y = this.baseY;
    }
    this.x = Math.max(this.arenaMinX, Math.min(this.arenaMaxX - this.w, this.x));
  }

  get attackBox() {
    if (this.state !== "attacking") return null;
    if (this.attackName === "pounce") {
      return {
        x: this.direction > 0 ? this.x + this.w - 22 : this.x - 112,
        y: this.baseY + 14,
        w: 132,
        h: 56
      };
    }
    return {
      x: this.direction > 0 ? this.x + this.w - 8 : this.x - 78,
      y: this.y + 27,
      w: 88,
      h: 49
    };
  }
}
