import { Player } from "./Player.js";

export class AutonomousCompanion {
  constructor(character, x, groundY, slot = 0) {
    this.character = character;
    this.actor = new Player(character, x, groundY);
    this.lastSafePosition = { x: this.actor.x, y: this.actor.y };
    this.slot = slot;
    this.attackCooldown = 0;
    this.abilityCooldown = 0;
    this.input = {
      keys: new Set(),
      actions: new Set(),
      isDown(name) { return this.keys.has(name); },
      consume(name) { return this.actions.delete(name); }
    };
  }

  update(delta, leader, world, physics, hunters, boss = null) {
    const actor = this.actor;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.abilityCooldown = Math.max(0, this.abilityCooldown - delta);
    this.input.keys.clear();
    this.input.actions.clear();

    // Formation is only a navigation reference. Movement, obstacle handling,
    // target selection and attacks are decided by this companion's own AI.
    const formationX = leader.x + (this.slot === 0 ? -116 : 92);
    const threats = hunters
      .filter((hunter) => !hunter.defeated)
      .map((hunter) => ({ target: hunter, distance: Math.abs(hunter.x + hunter.w / 2 - (actor.x + actor.w / 2)), kind: "hunter" }));

    if (boss && !boss.defeated && boss.isVulnerable) {
      threats.push({
        target: boss,
        distance: Math.abs(boss.x + boss.w / 2 - (actor.x + actor.w / 2)),
        kind: "boss"
      });
    }

    const target = threats
      .filter((entry) => entry.distance < (entry.kind === "boss" ? 310 : 190))
      .sort((a, b) => a.distance - b.distance)[0] ?? null;

    const destinationX = target
      ? target.target.x + (actor.x < target.target.x ? -actor.w - 12 : target.target.w + 12)
      : formationX;
    const dx = destinationX - actor.x;
    if (Math.abs(dx) > 14) this.input.keys.add(dx > 0 ? "right" : "left");
    const direction = dx === 0 ? actor.facing : Math.sign(dx);

    const obstacle = world.obstacles.some((item) =>
      item.x + item.w > actor.x + (direction > 0 ? actor.w : -36) &&
      item.x < actor.x + (direction > 0 ? actor.w + 112 : 36) &&
      item.y + item.h > actor.y + 12
    );
    const gap = direction > 0
      ? world.gapAhead(actor.x, 300)
      : world.gapBehind(actor.x + actor.w, 300);
    const gapDistance = gap
      ? direction > 0 ? gap.start - actor.x : actor.x + actor.w - gap.end
      : Infinity;
    // Jump near the lip so the short jump has enough horizontal travel to clear the pit.
    const gapNeedsJump = Boolean(gap && gap.width <= 340 && gapDistance <= 58 && gapDistance >= -12);
    const leaderAbove = leader.y + leader.h < actor.y + actor.h - 38 && Math.abs(leader.x - actor.x) < 210;
    const obstacleNeedsJump = obstacle && (!gap || gapDistance > 180);
    const leaderNeedsJump = leaderAbove && (!gap || gapDistance > 240);
    if (actor.onGround && (gapNeedsJump || obstacleNeedsJump || leaderNeedsJump)) {
      this.input.actions.add("jump");
    }

    let strike = null;
    if (target && this.attackCooldown <= 0 && target.distance < (target.kind === "boss" ? 150 : 112)) {
      actor.facing = target.target.x >= actor.x ? 1 : -1;
      actor.animationState = "attack";
      actor.animationTimer = 0.24;
      this.attackCooldown = target.kind === "boss" ? 2.1 : 1.55;
      strike = target;
      const canUseMobilityAbility = actor.character === "blue" &&
        target.distance > 58 && target.distance < 175;
      const canUseHeavyAbility = actor.character === "vasti" &&
        actor.onGround && target.distance > 58 && target.distance < 145;
      if (this.abilityCooldown <= 0 && (canUseMobilityAbility || canUseHeavyAbility)) {
        // The playable companion roster is Violeta (dash) and Vasti (stomp).
        this.input.actions.add("ability");
        this.abilityCooldown = actor.character === "vasti" ? 3.2 : 2.8;
      }
    }

    actor.update(delta, this.input);
    const result = physics.step(actor, delta, world.platformsNear(actor.x));
    if (result.fell) {
      const safe = this.lastSafePosition ?? { x: Math.max(0, formationX), y: world.groundY - actor.h };
      actor.x = Math.max(0, safe.x);
      actor.y = Number.isFinite(safe.y) ? safe.y : world.groundY - actor.h;
      actor.vx = 0;
      actor.vy = 0;
      actor.onGround = true;
      actor.jumpCount = 0;
      actor.coyoteTimer = 0;
      actor.animationState = null;
      actor.animationTimer = 0;
      actor.invulnerable = Math.max(actor.invulnerable, 0.65);
      this.lastSafePosition = { x: actor.x, y: actor.y };
    }
    if (actor.onGround && world.hasGroundSupportAt(actor.x + actor.w / 2, world.groundY, false)) {
      this.lastSafePosition = { x: actor.x, y: actor.y };
    }
    actor.motionSpeed = actor.vx;

    // Consume the companion's own stomp/landing shockwave independently of the
    // player's ability state. This also catches a Vasti slam when it lands.
    if (actor.consumeShockwave?.()) {
      return {
        type: "companion-shockwave",
        x: actor.x + actor.w / 2,
        y: actor.y + actor.h,
        radius: 190
      };
    }

    if (!strike) return null;
    const hitDistance = Math.abs(strike.target.x + strike.target.w / 2 - (actor.x + actor.w / 2));
    if (hitDistance > (strike.kind === "boss" ? 185 : 145)) return null;
    return strike.kind === "boss"
      ? { type: "companion-boss-strike", boss: strike.target }
      : { type: "companion-strike", hunter: strike.target };
  }
}
