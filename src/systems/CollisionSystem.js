export class CollisionSystem {
  static overlaps(a, b, inset = 0) {
    return (
      a.x + inset < b.x + b.w &&
      a.x + a.w - inset > b.x &&
      a.y + inset < b.y + b.h &&
      a.y + a.h - inset > b.y
    );
  }

  static obstacleHit(player, obstacle) {
    const horizontalInset = 12;
    return (
      player.x + horizontalInset < obstacle.x + obstacle.w - 6 &&
      player.x + player.w - horizontalInset > obstacle.x + 6 &&
      player.y + 7 < obstacle.y + obstacle.h - 5 &&
      player.y + player.h - 4 > obstacle.y + 5
    );
  }

  static obstacleDamagesDinosaur(obstacle) {
    return Boolean(obstacle) && obstacle.type !== "crate";
  }

  static projectileHit(projectile, target) {
    const radius = projectile.radius ?? 7;
    const bounds = {
      x: projectile.x - radius,
      y: projectile.y - radius,
      w: radius * 2,
      h: radius * 2
    };
    return CollisionSystem.overlaps(bounds, target, 3);
  }

  static grenadeHit(grenade, target) {
    if (!grenade || !target || !Number.isFinite(grenade.blastRadius)) return false;
    const closestX = Math.max(target.x, Math.min(grenade.x, target.x + target.w));
    const closestY = Math.max(target.y, Math.min(grenade.y, target.y + target.h));
    const dx = grenade.x - closestX;
    const dy = grenade.y - closestY;
    return dx * dx + dy * dy <= grenade.blastRadius * grenade.blastRadius;
  }

  static bossAttackHit(player, boss) {
    const attack = boss.attackBox;
    return attack ? CollisionSystem.overlaps(player, attack, 6) : false;
  }

  static bodyHit(a, b) {
    return CollisionSystem.overlaps(a, b, 8);
  }
}
