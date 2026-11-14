export const ENEMY_FADE_DURATION = 0.9;

export function beginEnemyFade(enemy) {
  if (!enemy?.defeated) return;
  enemy.defeatFadeRemaining = ENEMY_FADE_DURATION;
}

export function advanceEnemyFade(enemy, delta) {
  if (!enemy?.defeated || !Number.isFinite(enemy.defeatFadeRemaining)) return;
  enemy.defeatFadeRemaining = Math.max(0, enemy.defeatFadeRemaining - Math.max(0, delta));
}

export function getEnemyOpacity(enemy) {
  if (!enemy?.defeated) return 1;
  const remaining = Number.isFinite(enemy.defeatFadeRemaining) ? enemy.defeatFadeRemaining : 0;
  return Math.max(0, Math.min(1, remaining / ENEMY_FADE_DURATION));
}

export function isEnemyFadeComplete(enemy) {
  return Boolean(enemy?.defeated) && getEnemyOpacity(enemy) === 0;
}
