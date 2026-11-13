export class LigocristusPrey {
  constructor({ id, x, groundY, patrolStart = x - 45, patrolEnd = x + 95 }) {
    this.id = id;
    this.character = "ligocristus";
    this.x = x;
    this.y = groundY - 54;
    this.w = 76;
    this.h = 54;
    this.groundY = groundY;
    this.patrolStart = patrolStart;
    this.patrolEnd = patrolEnd;
    this.direction = 1;
    this.motionSpeed = 0;
    this.state = "idle";
    this.consumed = false;
  }

  update(delta) {
    if (this.consumed) return;
    const previousX = this.x;
    this.x += this.direction * 15 * delta;
    if (this.x < this.patrolStart || this.x + this.w > this.patrolEnd) {
      this.direction *= -1;
      this.x = Math.max(this.patrolStart, Math.min(this.patrolEnd - this.w, this.x));
    }
    this.motionSpeed = delta > 0 ? (this.x - previousX) / delta : 0;
    this.state = Math.abs(this.motionSpeed) > 3 ? "walking" : "idle";
  }

  consume() {
    if (this.consumed) return false;
    this.consumed = true;
    this.state = "consumed";
    return true;
  }
}
