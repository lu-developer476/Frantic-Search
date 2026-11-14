export class Beta {
  constructor({ x, groundY }) {
    this.x = x;
    this.y = groundY - 48;
    this.w = 48;
    this.h = 48;
    this.groundY = groundY;
    this.state = "confined";
    this.followDistance = 208;
    this.animation = 0;
    this.facing = -1;
    this.motionSpeed = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDirection = 1;
    this.animationState = null;
  }

  update(delta, player, world = null) {
    this.animation += delta;
    this.motionSpeed = 0;
    this.dashCooldown = Math.max(0, this.dashCooldown - delta);
    if (this.state !== "following" && this.state !== "extracted") return null;

    const previousX = this.x;
    const targetX = player.x - this.followDistance;
    const difference = targetX - this.x;
    const directionToPlayer = Math.sign(
      player.x + player.w / 2 - (this.x + this.w / 2)
    ) || this.facing;

    if (this.state === "following" && this.dashTimer <= 0 && this.dashCooldown <= 0 && Array.isArray(world?.obstacles)) {
      const blockingCrate = world.obstacles
        .filter((obstacle) => {
          if (obstacle.type !== "crate") return false;
          const verticalOverlap = this.y + this.h > obstacle.y + 5 &&
            this.y < obstacle.y + obstacle.h - 5;
          if (!verticalOverlap) return false;

          const distanceAhead = directionToPlayer > 0
            ? obstacle.x - (this.x + this.w)
            : this.x - (obstacle.x + obstacle.w);
          const liesBetween = directionToPlayer > 0
            ? obstacle.x < player.x + player.w && obstacle.x + obstacle.w > this.x
            : obstacle.x + obstacle.w > player.x && obstacle.x < this.x + this.w;
          return liesBetween && distanceAhead >= -this.w && distanceAhead <= 96;
        })
        .sort((a, b) => {
          const distanceA = directionToPlayer > 0
            ? a.x - (this.x + this.w)
            : this.x - (a.x + a.w);
          const distanceB = directionToPlayer > 0
            ? b.x - (this.x + this.w)
            : this.x - (b.x + b.w);
          return distanceA - distanceB;
        })[0];

      if (blockingCrate) {
        this.dashTimer = 0.2;
        this.dashCooldown = 1.6;
        this.dashDirection = directionToPlayer;
      }
    }

    const brokenCrates = [];
    if (this.dashTimer > 0) {
      const dashStep = Math.min(delta, this.dashTimer);
      this.x += this.dashDirection * 980 * dashStep;
      this.dashTimer = Math.max(0, this.dashTimer - delta);
      this.facing = this.dashDirection;
      this.animationState = "attack";

      if (Array.isArray(world?.obstacles)) {
        for (let index = world.obstacles.length - 1; index >= 0; index -= 1) {
          const obstacle = world.obstacles[index];
          if (
            obstacle.type === "crate" &&
            this.x < obstacle.x + obstacle.w &&
            this.x + this.w > obstacle.x &&
            this.y < obstacle.y + obstacle.h &&
            this.y + this.h > obstacle.y
          ) {
            brokenCrates.push(obstacle);
            world.obstacles.splice(index, 1);
          }
        }
      }
    } else {
      this.animationState = null;
      if (Math.abs(difference) > 10) {
        this.x += Math.sign(difference) * Math.min(Math.abs(difference), 520 * delta);
        this.facing = difference > 0 ? 1 : -1;
      }
    }

    const targetY = player.y + player.h - this.h;
    this.y += (targetY - this.y) * Math.min(1, delta * 5);
    if (this.state === "extracted") this.x = targetX;
    this.motionSpeed = delta > 0 ? (this.x - previousX) / delta : 0;

    return brokenCrates.length > 0
      ? { type: "rosa-crate-break", obstacles: brokenCrates }
      : null;
  }

  rescue() {
    if (this.state !== "confined") return false;
    this.state = "following";
    return true;
  }

  extract() {
    if (this.state !== "following") return false;
    this.state = "extracted";
    return true;
  }
}
