export class Player {
  constructor(character, x, groundY) {
    this.x = x;
    this.y = groundY - 66;
    this.vx = 0;
    this.vy = 0;
    this.w = 74;
    this.h = 66;
    this.normalHeight = 66;
    this.onGround = true;
    this.facing = 1;
    this.character = character;
    this.jumpCount = 0;
    this.coyoteTimer = 0;
    this.invulnerable = 0;
    this.maxHealth = 3;
    this.health = this.maxHealth;
    this.dashTimer = 0;
    this.abilityCooldown = 0;
    this.isSlamming = false;
    this.shockwavePending = false;
    this.jumpEvent = false;
    this.abilityEvent = null;
    this.animationState = null;
    this.animationTimer = 0;
    this.setCharacter(character);
    this.y = groundY - this.h;
  }

  applyCharacterStats() {
    this.maxSpeed = this.character === "blue" ? 340 : this.character === "rosa" ? 305 : 255;
    this.jumpForce = this.character === "blue" ? 690 : this.character === "rosa" ? 650 : 625;
    this.maxJumps = this.character === "blue" || this.character === "rosa" ? 2 : 1;
  }

  setCharacter(character) {
    this.character = character;
    this.applyCharacterStats();
    this.w = character === "blue" ? 64 : character === "rosa" ? 54 : 82;
    this.normalHeight = character === "blue" ? 62 : character === "rosa" ? 54 : 72;
    this.h = this.normalHeight;
  }

  update(delta, input) {
    this.jumpEvent = false;
    this.abilityEvent = null;
    this.invulnerable = Math.max(0, this.invulnerable - delta);
    this.dashTimer = Math.max(0, this.dashTimer - delta);
    this.abilityCooldown = Math.max(0, this.abilityCooldown - delta);

    if (this.animationTimer > 0) {
      this.animationTimer = Math.max(0, this.animationTimer - delta);
      if (this.animationTimer === 0) {
        if (this.animationState === "recovery") {
          this.animationState = null;
        } else {
          this.animationState = "recovery";
          this.animationTimer = 0.16;
        }
      }
    }

    this.coyoteTimer = this.onGround ? 0.12 : Math.max(0, this.coyoteTimer - delta);
    const move = Number(input.isDown("right")) - Number(input.isDown("left"));
    if (move) this.facing = move;
    const targetVelocity = move * this.maxSpeed;
    if (this.dashTimer > 0) this.vx = this.facing * this.maxSpeed * 2.2;
    else this.vx += (targetVelocity - this.vx) * Math.min(1, delta * (move ? 10 : 7));

    // Playable dinosaurs always retain their full standing hitbox and silhouette.
    if (this.h !== this.normalHeight) {
      this.y += this.h - this.normalHeight;
      this.h = this.normalHeight;
    }

    if (input.consume("jump") && this.jump()) this.jumpEvent = true;
    if (input.consume("ability")) {
      const grounded = this.onGround;
      if (this.useAbility()) {
        this.abilityEvent = this.character === "blue"
          ? "dash"
          : this.character === "rosa"
            ? "pounce"
            : grounded ? "stomp" : "slam";
      }
    }
  }

  jump() {
    const regular = this.onGround || this.coyoteTimer > 0;
    const air = this.character === "blue" && this.jumpCount < this.maxJumps;
    if (!regular && !air) return false;
    this.vy = -this.jumpForce * (this.jumpCount > 0 ? 0.92 : 1);
    this.onGround = false;
    this.coyoteTimer = 0;
    this.jumpCount += 1;
    this.isSlamming = false;
    return true;
  }

  useAbility() {
    if (this.abilityCooldown > 0) return false;
    if (this.character === "blue" || this.character === "rosa") {
      this.dashTimer = this.character === "rosa" ? 0.16 : 0.2;
      this.invulnerable = this.character === "blue" ? Math.max(this.invulnerable, 0.2) : this.invulnerable;
      this.abilityCooldown = this.character === "rosa" ? 1.9 : 1.65;
      this.animationState = "attack";
      this.animationTimer = 0.24;
      return true;
    }
    this.abilityCooldown = 2.1;
    this.animationState = this.onGround ? "stomp" : "slam";
    this.animationTimer = this.onGround ? 0.32 : 0.8;
    if (this.onGround) this.shockwavePending = true;
    else {
      this.isSlamming = true;
      this.vy = 980;
    }
    return true;
  }

  takeHit() {
    if (this.invulnerable > 0 || this.health <= 0) return false;
    this.health = Math.max(0, this.health - 1);
    this.invulnerable = 1.15;
    this.animationState = "impact";
    this.animationTimer = 0.28;
    return true;
  }

  onLand() {
    this.jumpCount = 0;
    this.animationState = "landing";
    this.animationTimer = 0.2;
    if (this.isSlamming) this.shockwavePending = true;
    this.isSlamming = false;
  }

  consumeJumpEvent() {
    const triggered = this.jumpEvent;
    this.jumpEvent = false;
    return triggered;
  }

  consumeAbilityEvent() {
    const event = this.abilityEvent;
    this.abilityEvent = null;
    return event;
  }

  consumeShockwave() {
    const pending = this.shockwavePending;
    this.shockwavePending = false;
    return pending;
  }
}
