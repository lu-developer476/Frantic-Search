import test from "node:test";
import assert from "node:assert/strict";
import {
  BRONTOSAURUS_BACK_OFFSET,
  BRONTOSAURUS_RIDE_DURATION,
  canRideBrontosaurus,
  createBrontosaurusBackPlatforms,
  startBrontosaurusRide,
  updateBrontosaurusRide
} from "../src/systems/BrontosaurusMountSystem.js";

function createAnimal() {
  return { id: "brontosaurus-forest", kind: "brontosaurus", x: 500, y: 250, w: 300, h: 178 };
}

function createPlayer(character = "blue") {
  return { character, x: 590, y: 0, w: 74, h: 66, vx: 0, vy: 0, onGround: false, coyoteTimer: 0.12 };
}

test("Violeta and Vasti can use Brontosaurus backs while Rosa cannot", () => {
  assert.equal(canRideBrontosaurus("blue"), true);
  assert.equal(canRideBrontosaurus("vasti"), true);
  assert.equal(canRideBrontosaurus("rosa"), false);
  assert.equal(createBrontosaurusBackPlatforms([createAnimal()], "rosa").length, 0);
});

test("a Brontosaurus exposes a one-way back platform at its upper body", () => {
  const animal = createAnimal();
  const [platform] = createBrontosaurusBackPlatforms([animal], "blue");
  assert.equal(platform.animal, animal);
  assert.equal(platform.kind, "brontosaurus-back");
  assert.equal(platform.x, animal.x + 38);
  assert.equal(platform.y, animal.y + BRONTOSAURUS_BACK_OFFSET);
  assert.equal(platform.w, animal.w - 76);
});

test("landing on a Brontosaurus starts a five-second ride that follows its movement", () => {
  const animal = createAnimal();
  const player = createPlayer("blue");
  assert.equal(startBrontosaurusRide(player, animal), true);
  assert.equal(player.brontosaurusRide.remaining, BRONTOSAURUS_RIDE_DURATION);
  assert.equal(player.y + player.h, animal.y + BRONTOSAURUS_BACK_OFFSET);

  const previousX = animal.x;
  animal.x += 20;
  assert.equal(updateBrontosaurusRide(player, animal, 1, previousX), true);
  assert.equal(player.x, 610);
  assert.equal(player.brontosaurusRide.remaining, 4);

  assert.equal(updateBrontosaurusRide(player, animal, 4, animal.x), false);
  assert.equal(player.brontosaurusRide, null);
  assert.equal(player.onGround, false);
  assert.ok(player.vy > 0, "the rider gently drops back to the ground after five seconds");
});

test("Vasti can mount the same Brontosaurus and an ineligible character cannot", () => {
  const animal = createAnimal();
  const vasti = createPlayer("vasti");
  assert.equal(startBrontosaurusRide(vasti, animal), true);
  const rosa = createPlayer("rosa");
  assert.equal(startBrontosaurusRide(rosa, animal), false);
  assert.equal(rosa.brontosaurusRide, undefined);
});
