export class PhysicsSystem {
  constructor({ gravity = 1900, worldBottom = 760 } = {}) {
    this.gravity = gravity;
    this.worldBottom = worldBottom;
  }

  step(body, delta, platforms) {
    const previousBottom = body.y + body.h;
    const wasGrounded = body.onGround;

    body.onGround = false;
    body.vy += this.gravity * delta;
    body.x += body.vx * delta;
    body.x = Math.max(0, body.x);
    body.y += body.vy * delta;

    let landing = null;
    if (body.vy >= 0) {
      for (const platform of platforms) {
        const horizontalOverlap = body.x + body.w - 8 > platform.x && body.x + 8 < platform.x + platform.w;
        const crossedTop = previousBottom <= platform.y + 10 && body.y + body.h >= platform.y;
        if (horizontalOverlap && crossedTop && (!landing || platform.y < landing.y)) landing = platform;
      }
    }

    if (landing) {
      body.y = landing.y - body.h;
      body.vy = 0;
      body.onGround = true;
      if (!wasGrounded) body.onLand?.(landing);
    }

    return {
      landed: Boolean(landing && !wasGrounded),
      fell: body.y > this.worldBottom
    };
  }
}
