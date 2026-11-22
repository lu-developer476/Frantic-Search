import { getDinosaurHitbox } from "../config/DinosaurSizing.js";

export class Beta {
  constructor({ x, groundY }) {
    const size = getDinosaurHitbox("brisa");
    this.x = x;
    this.w = size.w;
    this.h = size.h;
    this.y = groundY - this.h;
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
    const followDirection = Math.sign(difference) ||
      Math.sign(player.vx ?? 0) ||
      player.facing ||
      this.facing;

    if (this.state === "following" && this.dashTimer <= 0 && this.dashCooldown <= 0 && Array.isArray(world?.obstacles)) {
      const blockingCrate = world.obstacles
        .filter((obstacle) => {
          if (obstacle.type !== "crate") return false;
          const verticalOverlap = this.y + this.h > obstacle.y + 5 &&
            this.y < obstacle.y + obstacle.h - 5;
          if (!verticalOverlap) return false;

          const distanceAhead = followDirection > 0
            ? obstacle.x - (this.x + this.w)
            : this.x - (obstacle.x + obstacle.w);
          return distanceAhead >= -this.w && distanceAhead <= 190;
        })
        .sort((a, b) => {
          const distanceA = followDirection > 0
            ? a.x - (this.x + this.w)
            : this.x - (a.x + a.w);
          const distanceB = followDirection > 0
            ? b.x - (this.x + this.w)
            : this.x - (b.x + b.w);
          return distanceA - distanceB;
        })[0];

      if (blockingCrate) {
        this.dashTimer = 0.24;
        this.dashCooldown = 1.6;
        this.dashDirection = followDirection;
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
