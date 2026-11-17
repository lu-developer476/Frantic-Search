export const ENEMY_FADE_DURATION = 0.9;

export function beginEnemyFade(enemy, targetOpacity = 0) {
  if (!enemy?.defeated) return;
  enemy.defeatFadeRemaining = ENEMY_FADE_DURATION;
  enemy.defeatFadeTargetOpacity = Math.max(0, Math.min(1, Number(targetOpacity) || 0));
}

export function advanceEnemyFade(enemy, delta) {
  if (!enemy?.defeated || !Number.isFinite(enemy.defeatFadeRemaining)) return;
  enemy.defeatFadeRemaining = Math.max(0, enemy.defeatFadeRemaining - Math.max(0, delta));
}

export function getEnemyOpacity(enemy) {
  if (!enemy?.defeated) return 1;
  const remaining = Number.isFinite(enemy.defeatFadeRemaining) ? enemy.defeatFadeRemaining : 0;
  const targetOpacity = Math.max(0, Math.min(1, Number(enemy.defeatFadeTargetOpacity) || 0));
  const fadeProgress = Math.max(0, Math.min(1, remaining / ENEMY_FADE_DURATION));
  return targetOpacity + (1 - targetOpacity) * fadeProgress;
}

export function isEnemyFadeComplete(enemy) {
  if (!enemy?.defeated) return false;
  const targetOpacity = Math.max(0, Math.min(1, Number(enemy.defeatFadeTargetOpacity) || 0));
  return getEnemyOpacity(enemy) <= targetOpacity;
}
