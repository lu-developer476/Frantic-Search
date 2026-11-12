export class Beta {
  constructor({ x, groundY }) {
    this.x = x;
    this.y = groundY - 48;
    this.w = 48;
    this.h = 48;
    this.groundY = groundY;
    this.state = "confined";
    this.followDistance = 112;
    this.animation = 0;
    this.facing = -1;
  }

  update(delta, player) {
    this.animation += delta;
    this.motionSpeed = 0;
    if (this.state !== "following" && this.state !== "extracted") return;

    const previousX = this.x;
    const targetX = player.x - this.followDistance;
    const difference = targetX - this.x;
    if (Math.abs(difference) > 10) {
      this.x += Math.sign(difference) * Math.min(Math.abs(difference), 520 * delta);
      this.facing = difference > 0 ? 1 : -1;
    }
    const targetY = player.y + player.h - this.h;
    this.y += (targetY - this.y) * Math.min(1, delta * 5);
    if (this.state === "extracted") this.x = targetX;
    this.motionSpeed = delta > 0 ? (this.x - previousX) / delta : 0;
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
