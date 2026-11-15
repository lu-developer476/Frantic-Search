import test from "node:test";
import assert from "node:assert/strict";
import { GAME, LEVELS, WORLD } from "../src/config/GameConfig.js";
import { canActivateLevelCheckpoint, getLevelCheckpointDistance } from "../src/campaign/CheckpointManager.js";
const config = { levels: LEVELS, world: WORLD, game: GAME };
test("every checkpoint is inside its level boundaries", () => {
  LEVELS.forEach((level, index) => {
    const checkpoint = getLevelCheckpointDistance(index, config);
    const end = LEVELS[index + 1]?.distance ?? WORLD.extractionX - GAME.playerX;
    assert.ok(checkpoint > level.distance);
    assert.ok(checkpoint < end);
  });
});
test("boss and facility checkpoints require their objectives", () => {
  assert.equal(canActivateLevelCheckpoint(1, {}), false);
  assert.equal(canActivateLevelCheckpoint(1, { indoraptorDefeated: true }), true);
  assert.equal(canActivateLevelCheckpoint(3, {}), false);
  assert.equal(canActivateLevelCheckpoint(3, { indominusDefeated: true }), true);
  assert.equal(canActivateLevelCheckpoint(4, {}), false);
  assert.equal(canActivateLevelCheckpoint(4, { securityReleased: true }), true);
  assert.equal(canActivateLevelCheckpoint(5, {}), false);
  assert.equal(canActivateLevelCheckpoint(5, { betaFreed: true }), true);
});
test("ordinary traversal checkpoints need no campaign flag", () => {
  assert.equal(canActivateLevelCheckpoint(0, {}), true);
  assert.equal(canActivateLevelCheckpoint(2, {}), true);
});
