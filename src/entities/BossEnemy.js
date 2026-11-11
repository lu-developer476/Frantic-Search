export class BossEnemy {
  constructor({
    id,
    kind,
    x,
    groundY,
    width,
    height,
    health,
    detectionRange,
    preferredDistance,
    moveSpeed,
    attackCooldown
  }) {
    this.id = id;
    this.kind = kind;
    this.x = x;
    this.groundY = groundY;
    this.w = width;
    this.h = height;
    this.baseY = groundY - height;
    this.y = this.baseY;
    this.health = health;
    this.maxHealth = health;
    this.detectionRange = detectionRange;
    this.preferredDistance = preferredDistance;
    this.moveSpeed = moveSpeed;
    this.baseAttackCooldown = attackCooldown;
    this.attackCooldown = 1.2;
    this.damageCooldown = 0;
    this.state = "dormant";
    this.stateTimer = 0;
    this.attackName = null;
    this.attackProgress = 0;
    this.direction = -1;
    this.defeated = false;
    this.active = false;
    this.arenaMinX = x - 520;
    this.arenaMaxX = x + 560;
    this.attackIndex = 0;
    this.warning = false;
  }

  get phase() {
    return this.health <= Math.ceil(this.maxHealth * 0.5) ? 2 : 1;
  }

  get isVulnerable() {
    return this.active && !this.defeated &&
      (this.state === "recovering" || this.state === "stunned");
  }

  activate() {
    if (this.defeated) return false;
    this.active = true;
    this.state = "stalking";
    return true;
  }

  update(delta, target) {
    if (!this.active || this.defeated) return null;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.damageCooldown = Math.max(0, this.damageCooldown - delta);
    this.stateTimer = Math.max(0, this.stateTimer - delta);

    const targetCenter = target.x + target.w / 2;
    const bossCenter = this.x + this.w / 2;
    const separation = targetCenter - bossCenter;
    const distance = Math.abs(separation);
    this.direction = separation >= 0 ? 1 : -1;

    if (this.state === "stunned") {
      if (this.stateTimer <= 0) this.state = "stalking";
      return null;
    }

    if (this.state === "stalking") {
      if (distance > this.preferredDistance) {
        this.x += this.direction * this.moveSpeed * delta;
      }
      this.x = Math.max(this.arenaMinX, Math.min(this.arenaMaxX - this.w, this.x));
      this.y = this.baseY;

      if (distance <= this.detectionRange && this.attackCooldown <= 0) {
        this.beginAttack(distance, target);
        return "telegraph";
      }
      return null;
    }

    if (this.state === "telegraph") {
      this.onTelegraph(delta, target);
      if (this.stateTimer <= 0) {
        this.state = "attacking";
        this.attackProgress = 0;
        this.stateTimer = this.attackDuration();
        this.warning = false;
        return "attack";
      }
      return null;
    }

    if (this.state === "attacking") {
      this.attackProgress = 1 - this.stateTimer / this.attackDuration();
      this.onAttack(delta, target);

      if (this.stateTimer <= 0) {
        this.state = "recovering";
        this.stateTimer = this.recoveryDuration();
        this.attackCooldown = this.baseAttackCooldown / (this.phase === 2 ? 1.35 : 1);
        this.attackName = null;
        this.y = this.baseY;
        return "recover";
      }
      return null;
    }

    if (this.state === "recovering" && this.stateTimer <= 0) {
      this.state = "stalking";
      return "ready";
    }
    return null;
  }

  beginAttack(distance, target) {
    this.attackName = this.chooseAttack(distance, target);
    this.state = "telegraph";
    this.stateTimer = this.telegraphDuration();
    this.warning = true;
    this.attackIndex += 1;
  }

  chooseAttack() {
    return "attack";
  }

  telegraphDuration() {
    return 0.7;
  }

  attackDuration() {
    return 0.35;
  }

  recoveryDuration() {
    return 0.8;
  }

  onTelegraph() {}
  onAttack() {}

  takeDamage(amount = 1) {
    if (
      this.defeated ||
      !this.active ||
      amount <= 0 ||
      this.damageCooldown > 0 ||
      !this.isVulnerable
    ) {
      return { hit: false, defeated: this.defeated, blocked: !this.isVulnerable };
    }

    const previousPhase = this.phase;
    this.health = Math.max(0, this.health - amount);
    this.damageCooldown = 0.22;

    if (this.health <= 0) {
      this.defeated = true;
      this.active = false;
      this.state = "defeated";
      this.attackName = null;
      this.y = this.baseY;
      return { hit: true, defeated: true, phaseChanged: false };
    }

    this.state = "stunned";
    this.stateTimer = 0.3;
    this.attackName = null;
    this.y = this.baseY;
    return {
      hit: true,
      defeated: false,
      phaseChanged: this.phase !== previousPhase
    };
  }

  get attackBox() {
    return null;
  }
}
