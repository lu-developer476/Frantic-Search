export class VenatosaurusEnemy {
  constructor({ id, x, patrolStart, patrolEnd, groundY, variant = "venatosaurus-impavidus" }) {
    this.id = id;
    this.character = variant;
    this.variant = variant;
    this.x = x;
    this.y = groundY - 72;
    this.w = 94;
    this.h = 72;
    this.groundY = groundY;
    this.patrolStart = patrolStart;
    this.patrolEnd = patrolEnd;
    this.health = 3;
    this.maxHealth = 3;
    this.state = "patrol";
    this.stateTimer = 0;
    this.attackCooldown = 0.3;
    this.direction = -1;
    this.motionSpeed = 0;
    this.defeated = false;
    this.feedTimer = 0;
  }

  update(delta, player, rivals = []) {
    const previousX = this.x;
    if (this.defeated) return null;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.stateTimer = Math.max(0, this.stateTimer - delta);
    if (this.state === "stunned") {
      if (this.stateTimer <= 0) this.state = "pursuit";
      return null;
    }
    if (this.state === "attack" && this.stateTimer > 0) return null;

    const ownCenter = this.x + this.w / 2;
    const playerDistance = Math.abs(player.x + player.w / 2 - ownCenter);
    const rival = rivals
      .filter((other) => other !== this && !other.defeated)
      .map((other) => ({ target: other, distance: Math.abs(other.x + other.w / 2 - ownCenter) }))
      .filter((entry) => entry.distance < 390)
      .sort((a, b) => a.distance - b.distance)[0];

    // Venatosaurus are territorial predators: they fight one another as well as the protagonists.
    const target = rival && rival.distance < playerDistance + 90
      ? rival.target
      : playerDistance < 520 ? player : null;

    if (!target) {
      this.state = "patrol";
      this.x += this.direction * 58 * delta;
      if (this.x < this.patrolStart || this.x + this.w > this.patrolEnd) {
        this.direction *= -1;
        this.x = Math.max(this.patrolStart, Math.min(this.patrolEnd - this.w, this.x));
      }
      this.motionSpeed = delta > 0 ? (this.x - previousX) / delta : 0;
      return null;
    }

    const targetCenter = target.x + target.w / 2;
    const separation = targetCenter - ownCenter;
    const distance = Math.abs(separation);
    this.direction = separation >= 0 ? 1 : -1;
    if (distance > 84) {
      this.state = "pursuit";
      this.x += this.direction * 142 * delta;
    } else if (this.attackCooldown <= 0) {
      this.state = "attack";
      this.stateTimer = 0.28;
      this.attackCooldown = 1.05;
      this.motionSpeed = delta > 0 ? (this.x - previousX) / delta : 0;
      if (target !== player) {
        const result = target.takeDamage(1);
        return { type: "venatosaurus-rival-strike", target, result };
      }
      return { type: "venatosaurus-player-strike", target };
    } else {
      this.state = "stalking";
    }

    this.motionSpeed = delta > 0 ? (this.x - previousX) / delta : 0;
    return null;
  }

  takeDamage(amount = 1) {
    if (this.defeated || amount <= 0) return { hit: false, defeated: this.defeated };
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) {
      this.defeated = true;
      this.state = "defeated";
      this.motionSpeed = 0;
      return { hit: true, defeated: true };
    }
    this.state = "stunned";
    this.stateTimer = 0.55;
    return { hit: true, defeated: false };
  }

  get attackBox() {
    if (this.state !== "attack") return null;
    return {
      x: this.direction > 0 ? this.x + this.w - 12 : this.x - 38,
      y: this.y + 19,
      w: 52,
      h: 42
    };
  }
}
