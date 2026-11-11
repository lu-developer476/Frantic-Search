export class FerrucutusAlly {
  constructor({ id, x, groundY }) {
    this.id = id;
    this.startX = x;
    this.departed = false;
    this.x = x;
    this.y = groundY - 74;
    this.w = 104;
    this.h = 74;
    this.groundY = groundY;
    this.state = "scout";
    this.stateTimer = 0;
    this.attackCooldown = 0;
    this.bridgeCooldown = 0;
    this.bridge = null;
    this.direction = 1;
    this.strikes = 0;
  }

  update(delta, player, world, hunters) {
    if (this.departed) return null;
    if (!this.bridge && player.x > this.startX + 1320 && this.state !== "charge") {
      this.departed = true;
      this.state = "depart";
      return { type: "departed" };
    }

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.bridgeCooldown = Math.max(0, this.bridgeCooldown - delta);
    this.stateTimer = Math.max(0, this.stateTimer - delta);

    if (this.bridge) {
      const crossed = player.x > this.bridge.end + 45;
      if (crossed || this.stateTimer <= 0) {
        world.removeSupportBridge(this.bridge.id);
        this.bridge = null;
        this.state = "scout";
        this.bridgeCooldown = 8;
      } else {
        this.x += (this.bridge.start - 58 - this.x) * Math.min(1, delta * 5);
        return { type: "holding-bridge" };
      }
    }

    const nearbyHunter = hunters
      .filter((hunter) => !hunter.defeated)
      .map((hunter) => ({ hunter, distance: Math.abs(hunter.x - this.x) }))
      .filter((entry) => entry.distance < 235)
      .sort((a, b) => a.distance - b.distance)[0];

    if (nearbyHunter && this.attackCooldown <= 0) {
      const enemy = nearbyHunter.hunter;
      const targetX = enemy.x - (this.w + 16);
      this.direction = enemy.x >= this.x ? 1 : -1;
      this.x += Math.sign(targetX - this.x) * Math.min(260 * delta, Math.abs(targetX - this.x));
      this.state = "charge";
      if (Math.abs(enemy.x - this.x) < 68) {
        const result = enemy.takeDamage(1);
        this.attackCooldown = 4.2;
        this.state = "recover";
        this.stateTimer = 0.55;
        this.strikes += 1;
        return { type: "ally-strike", enemy, result };
      }
      return { type: "ally-charge", enemy };
    }

    if (this.state === "recover" && this.stateTimer > 0) {
      this.x += (player.x + 125 - this.x) * Math.min(1, delta * 1.5);
      return null;
    }

    const gap = world.gapAhead(player.x + player.w, 390);
    if (
      gap &&
      this.bridgeCooldown <= 0 &&
      player.x > gap.start - 270 &&
      player.x < gap.start + 10 &&
      player.onGround
    ) {
      this.state = "brace";
      const targetX = gap.start - 58;
      this.direction = 1;
      this.x += Math.sign(targetX - this.x) * Math.min(310 * delta, Math.abs(targetX - this.x));

      if (Math.abs(this.x - targetX) < 24) {
        const bridge = world.createSupportBridge(gap.start, gap.end, 6.5);
        if (bridge) {
          this.bridge = { ...bridge };
          this.stateTimer = 6.5;
          this.state = "bridge";
          return { type: "bridge-created", bridge };
        }
      }
      return { type: "preparing-bridge" };
    }

    const desiredX = player.x + 118;
    this.x += (desiredX - this.x) * Math.min(1, delta * 2.8);
    this.direction = desiredX >= this.x ? 1 : -1;
    if (this.state !== "recover") this.state = "scout";
    return null;
  }
}
