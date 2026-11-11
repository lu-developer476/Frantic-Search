export class FacilityConsole {
  constructor({ id, kind, x, groundY }) {
    this.id = id;
    this.kind = kind;
    this.x = x;
    this.y = groundY - 78;
    this.w = 52;
    this.h = 78;
    this.activated = false;
    this.interactionRange = 92;
  }

  canInteract(player) {
    return !this.activated &&
      Math.abs((player.x + player.w / 2) - (this.x + this.w / 2)) <= this.interactionRange &&
      Math.abs((player.y + player.h) - (this.y + this.h)) < 90;
  }

  activate() {
    if (this.activated) return false;
    this.activated = true;
    return true;
  }
}
