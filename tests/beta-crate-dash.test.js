import test from "node:test";
import assert from "node:assert/strict";
import { Beta } from "../src/entities/Beta.js";

function makeFollowingRosa() {
  const rosa = new Beta({ x: 600, groundY: 430 });
  rosa.rescue();
  return rosa;
}

test("Rosa dashes through a crate in her path before it touches her", () => {
  const rosa = makeFollowingRosa();
  const crate = { x: 780, y: 378, w: 52, h: 52, type: "crate" };
  const world = { obstacles: [crate] };
  const player = { x: 1000, y: 368, w: 64, h: 62, vx: 0, facing: 1 };

  let breakEvent = null;
  for (let frame = 0; frame < 24 && world.obstacles.length > 0; frame += 1) {
    breakEvent = rosa.update(1 / 60, player, world) ?? breakEvent;
  }

  assert.equal(world.obstacles.length, 0);
  assert.equal(breakEvent?.type, "rosa-crate-break");
  assert.deepEqual(breakEvent.obstacles, [crate]);
});

test("Rosa does not spend her dash on rocks", () => {
  const rosa = makeFollowingRosa();
  const rock = { x: 660, y: 372, w: 56, h: 58, type: "rock" };
  const world = { obstacles: [rock] };
  const player = { x: 1000, y: 368, w: 64, h: 62, vx: 0, facing: 1 };

  rosa.update(1 / 60, player, world);

  assert.equal(rosa.dashTimer, 0);
  assert.deepEqual(world.obstacles, [rock]);
});
