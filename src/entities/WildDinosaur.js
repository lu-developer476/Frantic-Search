import { getDinosaurHitbox } from "../config/DinosaurSizing.js";

const VENATOSAURUS_SIZE_PROFILE = Object.freeze({
  "venatosaurus-impavidus": "venatosaurusImpavidus",
  "venatosaurus-saevidicus": "venatosaurusSaevidicus"
});
const LEGACY_VENATOSAURUS_WIDTH = 112;

export class WildDinosaur {
  constructor({ id, kind, x, groundY, patrolStart, patrolEnd, direction = 1 }) {
    this.id = id;
    this.kind = kind;
    this.x = x;
    const size = getDinosaurHitbox(VENATOSAURUS_SIZE_PROFILE[kind] ?? "venatosaurusImpavidus");
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
    this.direction = direction;
    this.health = 3;
    this.maxHealth = 3;
    this.state = "patrol";
    this.stateTimer = 0;
    this.attackCooldown = 0;
    this.defeated = false;
    this.motionSpeed = 0;
    this.slideTimer = 0;
    this.slideCooldown = 2.7;
    this.targetId = null;
  }

  update(delta, targets = []) {
    if (this.defeated || this.fellIntoPit) return null;
    this.updateJump(delta);
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.stateTimer = Math.max(0, this.stateTimer - delta);
    this.slideTimer = Math.max(0, this.slideTimer - delta);
    this.slideCooldown = Math.max(0, this.slideCooldown - delta);
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

    if (this.state === "stunned") {
      if (this.stateTimer <= 0) this.state = "patrol";
      return null;
    }
    if (this.state === "windup") {
      if (target) this.direction = target.target.x >= this.x ? 1 : -1;
      if (this.stateTimer <= 0) {
        this.state = "attack";
        this.stateTimer = 0.42;
        this.attackCooldown = 1.55;
        // Venatosaurus attacks are committed pouncing charges, not stationary bites.
        if (this.onGround && this.jumpCooldown <= 0) this.jump();
        return target ? { type: "attack", enemy: this, target: target.target, targetKind: target.kind } : null;
      }
      return null;
    }
    if (this.state === "attack") {
      this.x += this.direction * 335 * delta;
      if (this.onGround && this.jumpCooldown <= 0) this.jump();
      if (this.stateTimer <= 0) this.state = "pursuit";
      return null;
    }
    if (target) {
      this.direction = target.target.x >= this.x ? 1 : -1;
      if (target.distance > 82) {
        this.state = "pursuit";
        if (this.onGround && this.slideTimer <= 0 && this.slideCooldown <= 0) {
          this.slideTimer = 0.36;
          this.slideCooldown = 3.1;
        }
        const sliding = this.onGround && this.slideTimer > 0;
        this.x += this.direction * (sliding ? 176 : 104) * delta;
        if (!sliding) this.jump();
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
    this.jump();
    return null;
  }

  jump() {
    if (!this.onGround || this.jumpCooldown > 0) return false;
    this.vy = -430;
    this.onGround = false;
    this.jumpCooldown = 1.35;
    return true;
  }

  updateJump(delta) {
    this.jumpCooldown = Math.max(0, this.jumpCooldown - delta);
    if (this.onGround) return;

    this.vy += 1500 * delta;
    this.y += this.vy * delta;
    if (this.y >= this.baseY) {
      this.y = this.baseY;
      this.vy = 0;
      this.onGround = true;
    }
  }

  stun(duration = 2) {
    if (this.defeated || !Number.isFinite(duration) || duration <= 0) return false;
    const remainingStun = this.state === "stunned" ? this.stateTimer : 0;
    this.state = "stunned";
    this.stateTimer = Math.max(remainingStun, duration);
    return true;
  }

  takeDamage(amount = 1) {
    if (this.defeated || amount <= 0) return { hit: false, defeated: this.defeated };
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) {
      this.defeated = true;
      this.state = "defeated";
      return { hit: true, defeated: true };
    }
    const remainingStun = this.state === "stunned" ? this.stateTimer : 0;
    this.state = "stunned";
    this.stateTimer = Math.max(remainingStun, 0.32);
    return { hit: true, defeated: false };
  }

  get attackBox() {
    if (this.state !== "attack") return null;
    // The strike reach scales with the body so a bigger Venatosaurus bites farther.
    const reach = this.w / LEGACY_VENATOSAURUS_WIDTH;
    const width = Math.round(58 * reach);
    return {
      x: this.direction > 0 ? this.x + this.w - Math.round(12 * reach) : this.x - Math.round(44 * reach),
      y: this.y + Math.round(28 * reach),
      w: width,
      h: Math.round(48 * reach)
    };
  }
}
