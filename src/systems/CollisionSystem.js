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
    const horizontalInset = player.duck ? 8 : 12;
    return (
      player.x + horizontalInset < obstacle.x + obstacle.w - 6 &&
      player.x + player.w - horizontalInset > obstacle.x + 6 &&
      player.y + 7 < obstacle.y + obstacle.h - 5 &&
      player.y + player.h - 4 > obstacle.y + 5
    );
  }

  static hunterAttackHit(player, hunter) {
    const attack = hunter.attackBox;
    return attack ? CollisionSystem.overlaps(player, attack, 7) : false;
  }

  static bodyHit(a, b) {
    return CollisionSystem.overlaps(a, b, 8);
  }
}
