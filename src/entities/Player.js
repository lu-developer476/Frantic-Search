export class Player {
  constructor(character, x, groundY) {
    this.x = x;
    this.y = groundY - 66;
    this.vx = 0;
    this.vy = 0;
    this.w = 74;
    this.h = 66;
    this.normalHeight = 66;
    this.duckHeight = 42;
    this.onGround = true;
    this.duck = false;
    this.facing = 1;
    this.character = character;
    this.jumpCount = 0;
    this.coyoteTimer = 0;
    this.invulnerable = 0;
    this.dashTimer = 0;
    this.abilityCooldown = 0;
    this.isSlamming = false;
    this.shockwavePending = false;
    this.setCharacter(character);
    this.y = groundY - this.h;
  }

  applyCharacterStats() {
    this.maxSpeed = this.character === "blue" ? 340 : 255;
    this.jumpForce = this.character === "blue" ? 690 : 625;
    this.maxJumps = this.character === "blue" ? 2 : 1;
  }

  setCharacter(character) {
    this.character = character;
    this.applyCharacterStats();
    this.w = character === "blue" ? 64 : 82;
    this.normalHeight = character === "blue" ? 62 : 72;
    this.duckHeight = character === "blue" ? 42 : 50;
    this.h = this.normalHeight;
  }

  update(delta, input) {
    this.invulnerable = Math.max(0, this.invulnerable - delta);
    this.dashTimer = Math.max(0, this.dashTimer - delta);
    this.abilityCooldown = Math.max(0, this.abilityCooldown - delta);
    this.coyoteTimer = this.onGround ? 0.12 : Math.max(0, this.coyoteTimer - delta);

    const move = Number(input.isDown("right")) - Number(input.isDown("left"));
    if (move) this.facing = move;
    const targetVelocity = move * this.maxSpeed;
    if (this.dashTimer > 0) {
      this.vx = this.facing * this.maxSpeed * 2.2;
    } else {
      this.vx += (targetVelocity - this.vx) * Math.min(1, delta * (move ? 10 : 7));
    }

    const wantsDuck = input.isDown("duck") && this.onGround;
    const nextHeight = wantsDuck ? this.duckHeight : this.normalHeight;
    if (nextHeight !== this.h) {
      this.y += this.h - nextHeight;
      this.h = nextHeight;
    }
    this.duck = wantsDuck;

    if (input.consume("jump")) this.jump();
    if (input.consume("ability")) this.useAbility();
  }

  jump() {
    const canRegularJump = this.onGround || this.coyoteTimer > 0;
    const canAirJump = this.character === "blue" && this.jumpCount < this.maxJumps;
    if (!canRegularJump && !canAirJump) return false;

    this.vy = -this.jumpForce * (this.jumpCount > 0 ? 0.92 : 1);
    this.onGround = false;
    this.coyoteTimer = 0;
    this.jumpCount += 1;
    this.isSlamming = false;
    return true;
  }

  useAbility() {
    if (this.abilityCooldown > 0) return false;

    if (this.character === "blue") {
      this.dashTimer = 0.2;
      this.invulnerable = Math.max(this.invulnerable, 0.2);
      this.abilityCooldown = 1.65;
      return true;
    }

    this.abilityCooldown = 2.1;
    if (this.onGround) {
      this.shockwavePending = true;
    } else {
      this.isSlamming = true;
      this.vy = 980;
    }
    return true;
  }

  onLand() {
    this.jumpCount = 0;
    if (this.isSlamming) this.shockwavePending = true;
    this.isSlamming = false;
  }

  consumeShockwave() {
    const pending = this.shockwavePending;
    this.shockwavePending = false;
    return pending;
  }
}
