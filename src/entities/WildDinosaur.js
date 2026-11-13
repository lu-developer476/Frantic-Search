export class WildDinosaur {
  constructor({ id, kind, x, groundY, patrolStart, patrolEnd, direction = 1 }) {
    this.id = id;
    this.kind = kind;
    this.x = x;
    this.y = groundY - 92;
    this.w = 112;
    this.h = 92;
    this.groundY = groundY;
    this.patrolStart = patrolStart;
    this.patrolEnd = patrolEnd;
    this.direction = direction;
    this.health = 3;
    this.maxHealth = 3;
    this.state = "patrol";
    this.stateTimer = 0;
    this.attackCooldown = 0;
    this.defeated = false;
    this.motionSpeed = 0;
    this.targetId = null;
  }

  update(delta, targets = []) {
    if (this.defeated) return null;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.stateTimer = Math.max(0, this.stateTimer - delta);
    const ownCenter = this.x + this.w / 2;
    const candidates = targets
      .filter((entry) => entry && entry.target && !entry.target.defeated && entry.target.health !== 0)
      .map((entry) => ({
        ...entry,
        distance: Math.abs(entry.target.x + entry.target.w / 2 - ownCenter)
      }))
      .filter((entry) => entry.distance < 330)
      .sort((a, b) => a.distance - b.distance);
    const target = candidates[0] ?? null;

    if (this.state === "windup") {
      if (target) this.direction = target.target.x >= this.x ? 1 : -1;
      if (this.stateTimer <= 0) {
        this.state = "attack";
        this.stateTimer = 0.3;
        this.attackCooldown = 1.35;
        return target ? { type: "attack", enemy: this, target: target.target, targetKind: target.kind } : null;
      }
      return null;
    }
    if (this.state === "attack") {
      this.x += this.direction * 115 * delta;
      if (this.stateTimer <= 0) this.state = "pursuit";
      return null;
    }
    if (target) {
      this.direction = target.target.x >= this.x ? 1 : -1;
      if (target.distance > 82) {
        this.state = "pursuit";
        this.x += this.direction * 104 * delta;
      } else if (this.attackCooldown <= 0) {
        this.state = "windup";
        this.stateTimer = 0.38;
      }
      return null;
    }
    this.state = "patrol";
    this.x += this.direction * 48 * delta;
    if (this.x <= this.patrolStart || this.x + this.w >= this.patrolEnd) {
      this.direction *= -1;
      this.x = Math.max(this.patrolStart, Math.min(this.patrolEnd - this.w, this.x));
    }
    return null;
  }

  takeDamage(amount = 1) {
    if (this.defeated || amount <= 0) return { hit: false, defeated: this.defeated };
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) {
      this.defeated = true;
      this.state = "defeated";
      return { hit: true, defeated: true };
    }
    this.state = "stunned";
    this.stateTimer = 0.32;
    return { hit: true, defeated: false };
  }

  get attackBox() {
    if (this.state !== "attack") return null;
    return {
      x: this.direction > 0 ? this.x + this.w - 12 : this.x - 44,
      y: this.y + 28,
      w: 58,
      h: 48
    };
  }
}
