export class HunterProjectile {
  constructor({
    x, y, targetX, targetY, shooterId = null,
    speed = 520, damage = 1, radius = 7, lifetime = 2.4
  }) {
    this.x = x;
    this.y = y;
    this.shooterId = shooterId;
    this.speed = speed;
    this.damage = damage;
    this.radius = radius;
    this.life = lifetime;
    this.active = true;

    const dx = targetX - x;
    const dy = targetY - y;
    const length = Math.hypot(dx, dy) || 1;
    this.vx = (dx / length) * speed;
    this.vy = (dy / length) * speed;
  }

  update(delta) {
    if (!this.active) return;
    this.x += this.vx * delta;
    this.y += this.vy * delta;
    this.life = Math.max(0, this.life - delta);
    if (this.life === 0) this.active = false;
  }
}
