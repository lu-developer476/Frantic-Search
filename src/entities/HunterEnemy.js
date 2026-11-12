export class HunterEnemy {
  constructor({ id, x, patrolStart, patrolEnd, groundY, carriesCaptive = true }) {
    this.id = id;
    this.x = x;
    this.y = groundY - 64;
    this.w = 38;
    this.h = 64;
    this.patrolStart = patrolStart;
    this.patrolEnd = patrolEnd;
    this.groundY = groundY;
    this.carriesCaptive = carriesCaptive;
    this.health = 2;
    this.state = "patrol";
    this.stateTimer = 0;
    this.attackCooldown = 0;
    this.direction = 1;
    this.alerted = false;
    this.defeated = false;
    this.motionSpeed = 0;
  }

  update(delta, target) {
    const previousX = this.x;
    try {
      return this.updateBehavior(delta, target);
    } finally {
      this.motionSpeed = delta > 0 ? (this.x - previousX) / delta : 0;
    }
  }

  updateBehavior(delta, target) {
    if (this.defeated) return null;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.stateTimer = Math.max(0, this.stateTimer - delta);
    const targetCenter = target.x + target.w / 2;
    const ownCenter = this.x + this.w / 2;
    const distance = targetCenter - ownCenter;
    const absoluteDistance = Math.abs(distance);
    const sameRoute = Math.abs((target.y + target.h) - this.groundY) < 125;

    if (absoluteDistance < 340 && sameRoute) this.alerted = true;

    if (this.state === "stunned") {
      if (this.stateTimer <= 0) this.state = absoluteDistance < 430 ? "pursuit" : "patrol";
      return null;
    }

    if (this.state === "patrol") {
      if (this.alerted && absoluteDistance < 340 && sameRoute) {
        this.state = "investigate";
        this.stateTimer = 0.42;
        this.direction = distance >= 0 ? 1 : -1;
        return "alert";
      }

      this.x += this.direction * 52 * delta;
      if (this.x <= this.patrolStart || this.x + this.w >= this.patrolEnd) {
        this.direction *= -1;
        this.x = Math.max(this.patrolStart, Math.min(this.patrolEnd - this.w, this.x));
      }
      return null;
    }

    if (this.state === "investigate") {
      if (absoluteDistance > 440 || !sameRoute) {
        this.state = "patrol";
        this.alerted = false;
      } else if (this.stateTimer <= 0) {
        this.state = "pursuit";
      }
      return null;
    }

    if (this.state === "pursuit") {
      if (absoluteDistance > 470 || !sameRoute) {
        this.state = "patrol";
        this.alerted = false;
        return null;
      }
      this.direction = distance >= 0 ? 1 : -1;
      if (absoluteDistance > 74) {
        this.x += this.direction * 128 * delta;
      } else if (this.attackCooldown <= 0) {
        this.state = "windup";
        this.stateTimer = 0.48;
      }
      return null;
    }

    if (this.state === "windup") {
      this.direction = distance >= 0 ? 1 : -1;
      if (this.stateTimer <= 0) {
        this.state = "attack";
        this.stateTimer = 0.24;
        this.attackCooldown = 1.15;
      }
      return null;
    }

    if (this.state === "attack") {
      this.x += this.direction * 170 * delta;
      if (this.stateTimer <= 0) {
        this.state = "pursuit";
        this.stateTimer = 0.2;
      }
    }

    return null;
  }

  takeDamage(amount = 1) {
    if (this.defeated || amount <= 0) return { hit: false, defeated: this.defeated };

    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.defeated = true;
      this.state = "defeated";
      return { hit: true, defeated: true, rescued: this.carriesCaptive };
    }

    this.state = "stunned";
    this.stateTimer = 0.72;
    this.attackCooldown = Math.max(this.attackCooldown, 0.8);
    return { hit: true, defeated: false, rescued: false };
  }

  get attackBox() {
    if (this.state !== "attack") return null;
    return {
      x: this.direction > 0 ? this.x + this.w - 5 : this.x - 42,
      y: this.y + 16,
      w: 47,
      h: 42
    };
  }
}
