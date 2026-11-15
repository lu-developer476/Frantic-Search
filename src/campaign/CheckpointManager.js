export function getLevelCheckpointDistance(levelIndex, { levels, world, game }) {
  if (!Number.isInteger(levelIndex) || !levels[levelIndex]) throw new RangeError("Unknown level index.");
  const startDistance = levels[levelIndex].distance;
  const endDistance = levels[levelIndex + 1]?.distance ?? world.extractionX - game.playerX;
  const startWorldX = game.playerX + startDistance;
  const endWorldX = game.playerX + endDistance;
  let checkpointWorldX;
  if (levelIndex === 1 || levelIndex === 3) {
    const sectionIndex = levelIndex === 1 ? 1 : 4;
    checkpointWorldX = world.sectionStarts[sectionIndex] + Math.round(world.sectionLengths[sectionIndex] * 0.68) + 700;
  } else if (levelIndex === 4) {
    checkpointWorldX = world.sectionStarts[5] + Math.round(world.sectionLengths[5] * 0.4) + 300;
  } else {
    checkpointWorldX = startWorldX + (endWorldX - startWorldX) / 2;
  }
  const safeWorldX = Math.max(startWorldX + 250, Math.min(endWorldX - 250, checkpointWorldX));
  return Math.round(safeWorldX - game.playerX);
}
export function canActivateLevelCheckpoint(levelIndex, flags = {}) {
  if (levelIndex === 1) return Boolean(flags.indoraptorDefeated);
  if (levelIndex === 3) return Boolean(flags.indominusDefeated);
  if (levelIndex === 4) return Boolean(flags.securityReleased);
  if (levelIndex === 5) return Boolean(flags.betaFreed);
  return true;
}
