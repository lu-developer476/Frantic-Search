import { getDinosaurHitbox } from "../config/DinosaurSizing.js";

export class LigocristusPrey {
  constructor({ id, x, groundY, patrolStart = x - 80, patrolEnd = x + 180 }) {
    this.id = id;
    this.kind = "ligocristus";
    this.character = "ligocristus";
    this.x = x;
    const size = getDinosaurHitbox("ligocristus");
    this.w = size.w;
    this.h = size.h;
    this.baseY = groundY - this.h;
    this.y = this.baseY;
    this.vy = 0;
    this.onGround = true;
    this.jumpCooldown = 0.55 + (String(id).length % 4) * 0.2;
    this.groundY = groundY;
    this.patrolStart = patrolStart;
    this.patrolEnd = patrolEnd;
    this.direction = 1;
    this.facing = 1;
    this.motionSpeed = 0;
    this.state = "grazing";
    this.stateTimer = 1.15 + (String(id).length % 5) * 0.12;
    this.consumed = false;
    this.defeated = false;
    this.health = 2;
    this.maxHealth = 2;
    this.defeatFadeRemaining = null;
  }

  update(delta, threats = []) {
    if (this.consumed || this.defeated || delta <= 0) return;
    this.updateJump(delta);
    this.stateTimer = Math.max(0, this.stateTimer - delta);
    const ownCenter = this.x + this.w / 2;
    const nearestThreat = threats
      .filter((target) => target && !target.defeated && !target.consumed)
      .map((target) => ({
        center: target.x + target.w / 2,
        distance: Math.abs(target.x + target.w / 2 - ownCenter)
      }))
      .filter((entry) => entry.distance < 190)
      .sort((a, b) => a.distance - b.distance)[0];

    if (nearestThreat) {
      this.state = "fleeing";
      this.stateTimer = Math.max(this.stateTimer, 1.05);
      this.direction = ownCenter >= nearestThreat.center ? 1 : -1;
    } else if (this.stateTimer <= 0) {
      if (this.state === "grazing") {
        this.state = "foraging";
        this.stateTimer = 2.35;
      } else {
        this.state = "grazing";
        this.stateTimer = 1.75;
      }
    }

    const speed = this.state === "fleeing" ? 74 : this.state === "foraging" ? 25 : 0;
    const previousX = this.x;
    this.x += this.direction * speed * delta;
    if (this.x <= this.patrolStart || this.x + this.w >= this.patrolEnd) {
      this.direction *= -1;
      this.x = Math.max(this.patrolStart, Math.min(this.patrolEnd - this.w, this.x));
    }
    this.facing = this.direction;
    this.motionSpeed = (this.x - previousX) / delta;
    if (this.state === "fleeing") this.jump();
  }

  jump() {
    if (!this.onGround || this.jumpCooldown > 0) return false;
    this.vy = -330;
    this.onGround = false;
    this.jumpCooldown = 1.65;
    return true;
  }

  updateJump(delta) {
    this.jumpCooldown = Math.max(0, this.jumpCooldown - delta);
    if (this.onGround) return;

    this.vy += 1400 * delta;
    this.y += this.vy * delta;
    if (this.y >= this.baseY) {
      this.y = this.baseY;
      this.vy = 0;
      this.onGround = true;
    }
  }

  takeDamage(amount = 1) {
    if (this.defeated || this.consumed || amount <= 0) {
      return { hit: false, defeated: this.defeated };
    }
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) {
      this.defeated = true;
      this.state = "defeated";
      this.motionSpeed = 0;
      this.vy = 0;
      this.defeatFadeRemaining = 0.9;
      return { hit: true, defeated: true };
    }
    this.state = "stunned";
    this.stateTimer = 0.3;
    return { hit: true, defeated: false };
  }

  consume() {
    if (this.consumed || !this.defeated) return false;
    this.consumed = true;
    this.state = "consumed";
    this.motionSpeed = 0;
    return true;
  }
}

export class Brontosaurus {
  constructor({ id, x, groundY, patrolStart = x - 430, patrolEnd = x + 650 }) {
    this.id = id;
    this.kind = "brontosaurus";
    this.character = "brontosaurus";
    this.x = x;
    const size = getDinosaurHitbox("brontosaurus");
    this.w = size.w;
    this.h = size.h;
    this.y = groundY - this.h;
    this.groundY = groundY;
    this.patrolStart = patrolStart;
    this.patrolEnd = patrolEnd;
    this.direction = 1;
    this.facing = 1;
    this.motionSpeed = 0;
    this.state = "grazing";
    this.stateTimer = 1.4 + (String(id).length % 6) * 0.18;
  }

  update(delta, threats = []) {
    if (delta <= 0) return;
    this.stateTimer = Math.max(0, this.stateTimer - delta);
    const ownCenter = this.x + this.w / 2;
    const nearestPredator = threats
      .filter((target) => target && !target.defeated)
      .map((target) => ({
        center: target.x + target.w / 2,
        distance: Math.abs(target.x + target.w / 2 - ownCenter)
      }))
      .filter((entry) => entry.distance < 380)
      .sort((a, b) => a.distance - b.distance)[0];

    if (nearestPredator) {
      this.state = "retreating";
      this.stateTimer = Math.max(this.stateTimer, 1.25);
      this.direction = ownCenter >= nearestPredator.center ? 1 : -1;
    } else if (this.stateTimer <= 0) {
      if (this.state === "grazing") {
        this.state = "walking";
        this.stateTimer = 3.6;
      } else {
        this.state = "grazing";
        this.stateTimer = 2.5;
      }
    }

    const speed = this.state === "retreating" ? 42 : this.state === "walking" ? 22 : 0;
    const previousX = this.x;
    this.x += this.direction * speed * delta;
    if (this.x <= this.patrolStart) {
      this.x = this.patrolStart;
      this.direction = 1;
      if (this.state === "retreating") this.stateTimer = 0.2;
    } else if (this.x + this.w >= this.patrolEnd) {
      this.x = this.patrolEnd - this.w;
      this.direction = -1;
      if (this.state === "retreating") this.stateTimer = 0.2;
    }
    this.facing = this.direction;
    this.motionSpeed = (this.x - previousX) / delta;
  }
}
