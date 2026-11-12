export class FerrucutusCaptive {
  constructor({ id, x, groundY }) {
    this.id = id;
    this.x = x;
    this.groundY = groundY;
    this.w = 164;
    this.h = 124;
    this.y = groundY - this.h;
    this.dinosaurX = x + 14;
    this.dinosaurY = groundY - 92;
    this.dinosaurW = 136;
    this.dinosaurH = 78;
    this.direction = -1;
    this.state = "confined";
    this.rescued = false;
  }

  canInteract(player, radius = 148) {
    if (this.rescued || this.state !== "confined") return false;
    const playerCenter = player.x + player.w / 2;
    const cageCenter = this.x + this.w / 2;
    return Math.abs(playerCenter - cageCenter) <= radius &&
      Math.abs((player.y + player.h) - this.groundY) < 64;
  }

  rescue() {
    if (this.rescued || this.state !== "confined") return false;
    this.rescued = true;
    this.state = "rescued";
    return true;
  }
}
