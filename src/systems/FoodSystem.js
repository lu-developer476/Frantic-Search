import { beginEnemyFade } from "./EnemyFadeSystem.js";

export const VENATOSAURUS_REMAINS_OPACITY = 0.38;

export function dropVenatosaurusFood(enemy, foodSources) {
  if (!enemy?.defeated || !Array.isArray(foodSources)) return null;

  enemy.retainDefeatedRemains = true;
  if (!Number.isFinite(enemy.defeatFadeRemaining) ||
      enemy.defeatFadeTargetOpacity !== VENATOSAURUS_REMAINS_OPACITY) {
    beginEnemyFade(enemy, VENATOSAURUS_REMAINS_OPACITY);
  }

  if (enemy.foodDropCreated) return null;
  enemy.foodDropCreated = true;

  const drop = {
    id: "food-" + enemy.id,
    kind: "venatosaurus",
    x: enemy.x + 10,
    y: enemy.y + enemy.h - 24,
    w: 54,
    h: 22,
    consumed: false
  };
  foodSources.push(drop);
  return drop;
}
