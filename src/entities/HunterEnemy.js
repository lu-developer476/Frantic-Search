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
    this.maxHealth = 2;
    this.health = this.maxHealth;
    this.state = "patrol";
    this.stateTimer = 0;
    this.attackCooldown = 0;
    this.grenadeCooldown = 2.8 + (String(id).length % 2) * 0.9;
    this.grenadeCount = 0;
    this.grenadeVariantOffset = [...String(id)].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 2;
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
    if (this.defeated || this.fellIntoPit) return null;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.grenadeCooldown = Math.max(0, this.grenadeCooldown - delta);
    this.stateTimer = Math.max(0, this.stateTimer - delta);
    const targetCenter = target.x + target.w / 2;
    const ownCenter = this.x + this.w / 2;
    const separation = targetCenter - ownCenter;
    const distance = Math.abs(separation);
    const sameRoute = Math.abs((target.y + target.h) - this.groundY) < 125;

    if (distance < 340 && sameRoute) this.alerted = true;

    if (this.state === "stunned") {
      if (this.stateTimer <= 0) this.state = distance < 430 ? "pursuit" : "patrol";
      return null;
    }

    if (this.state === "patrol") {
      if (this.alerted && distance < 340 && sameRoute) {
        this.state = "investigate";
        this.stateTimer = 0.42;
        this.direction = separation >= 0 ? 1 : -1;
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
      if (distance > 440 || !sameRoute) {
        this.state = "patrol";
        this.alerted = false;
      } else if (this.stateTimer <= 0) {
        this.state = "pursuit";
      }
      return null;
    }

    if (this.state === "pursuit") {
      if (distance > 440 || !sameRoute) {
        this.state = "patrol";
        this.alerted = false;
        return null;
      }
      this.direction = separation >= 0 ? 1 : -1;
      if (distance > 360) {
        this.x += this.direction * 128 * delta;
      } else if (distance >= 175 && this.grenadeCooldown <= 0) {
        this.state = "grenade-windup";
        this.stateTimer = 0.52;
      } else if (this.attackCooldown <= 0) {
        this.state = "windup";
        this.stateTimer = 0.42;
      }
      return null;
    }

    if (this.state === "grenade-windup") {
      this.direction = separation >= 0 ? 1 : -1;
      if (distance > 440 || !sameRoute) {
        this.state = "pursuit";
        this.stateTimer = 0.2;
      } else if (this.stateTimer <= 0) {
        this.state = "attack";
        this.stateTimer = 0.2;
        this.attackCooldown = 1.55;
        this.grenadeCooldown = 5.8;
        this.attackType = "grenade";
        const type = (this.grenadeCount++ + this.grenadeVariantOffset) % 2 === 0 ? "orange" : "yellow";
        return {
          type: "throw-grenade",
          grenade: {
            x: this.direction > 0 ? this.x + this.w + 5 : this.x - 5,
            y: this.y + 28,
            targetX: targetCenter + (Number(target.vx) || 0) * 0.18,
            groundY: this.groundY,
            shooterId: this.id,
            type
          }
        };
      }
      return null;
    }

    if (this.state === "windup") {
      this.direction = separation >= 0 ? 1 : -1;
      if (this.stateTimer <= 0) {
        this.state = "attack";
        this.stateTimer = 0.16;
        this.attackCooldown = 1.35;
        this.attackType = "shoot";
        return {
          type: "shoot",
          projectile: {
            x: this.direction > 0 ? this.x + this.w + 7 : this.x - 7,
            y: this.y + 30,
            targetX: targetCenter,
            targetY: target.y + target.h * 0.46,
            shooterId: this.id,
            damage: 1
          }
        };
      }
      return null;
    }

    if (this.state === "attack" && this.stateTimer <= 0) {
      this.state = "pursuit";
      this.stateTimer = 0.2;
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
}
