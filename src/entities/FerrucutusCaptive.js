import { getContainmentCageSize, getDinosaurHitbox } from "../config/DinosaurSizing.js";

export class FerrucutusCaptive {
  constructor({ id, x, groundY }) {
    this.id = id;
    this.x = x;
    this.groundY = groundY;
    const cage = getContainmentCageSize("ferrucutus");
    const animal = getDinosaurHitbox("ferrucutus");
    this.w = cage.w;
    this.h = cage.h;
    this.y = groundY - this.h;
    this.dinosaurW = animal.w;
    this.dinosaurH = animal.h;
    this.dinosaurX = x + (this.w - this.dinosaurW) / 2;
    this.dinosaurY = groundY - this.dinosaurH - 14;
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

  rescue(player) {
    if (this.rescued || this.state !== "confined" || !this.canInteract(player)) return false;
    this.rescued = true;
    this.state = "rescued";
    return true;
  }
}
