export const BRONTOSAURUS_RIDE_DURATION = 5;
export const BRONTOSAURUS_BACK_OFFSET = 78;
const BRONTOSAURUS_BACK_INSET = 38;
const RIDEABLE_CHARACTERS = new Set(["blue", "vasti"]);

export function canRideBrontosaurus(character) {
  return RIDEABLE_CHARACTERS.has(character);
}

export function createBrontosaurusBackPlatforms(animals = [], character = null) {
  if (!canRideBrontosaurus(character)) return [];
  return animals
    .filter((animal) => animal && animal.kind === "brontosaurus" && animal.id != null)
    .map((animal) => ({
      id: "brontosaurus-back-" + animal.id,
      kind: "brontosaurus-back",
      animal,
      x: animal.x + BRONTOSAURUS_BACK_INSET,
      y: animal.y + BRONTOSAURUS_BACK_OFFSET,
      w: Math.max(1, animal.w - BRONTOSAURUS_BACK_INSET * 2),
      h: 10
    }));
}

export function startBrontosaurusRide(player, animal) {
  if (!player || !animal || !canRideBrontosaurus(player.character) ||
      animal.kind !== "brontosaurus" || animal.id == null) return false;

  const minimumX = animal.x + BRONTOSAURUS_BACK_INSET;
  const maximumX = animal.x + animal.w - player.w - BRONTOSAURUS_BACK_INSET;
  player.x = Math.max(minimumX, Math.min(maximumX, player.x));
  player.y = animal.y + BRONTOSAURUS_BACK_OFFSET - player.h;
  player.vy = 0;
  player.onGround = true;
  player.brontosaurusRide = {
    animalId: animal.id,
    remaining: BRONTOSAURUS_RIDE_DURATION,
    lastX: animal.x
  };
  return true;
}

export function updateBrontosaurusRide(player, animal, delta, previousAnimalX = animal?.x) {
  const ride = player?.brontosaurusRide;
  if (!ride || !animal || ride.animalId !== animal.id || !Number.isFinite(delta) || delta < 0) return false;

  const animalDelta = animal.x - (Number.isFinite(previousAnimalX) ? previousAnimalX : animal.x);
  const lateralInput = Number.isFinite(player.vx) ? player.vx : 0;
  player.x += animalDelta + lateralInput * delta * 0.35;
  const minimumX = animal.x + BRONTOSAURUS_BACK_INSET;
  const maximumX = animal.x + animal.w - player.w - BRONTOSAURUS_BACK_INSET;
  player.x = Math.max(minimumX, Math.min(maximumX, player.x));
  player.y = animal.y + BRONTOSAURUS_BACK_OFFSET - player.h;
  player.vy = 0;
  player.onGround = true;
  ride.lastX = animal.x;
  ride.remaining = Math.max(0, ride.remaining - delta);

  if (ride.remaining <= 0) {
    player.brontosaurusRide = null;
    player.vy = 90;
    player.onGround = false;
    player.coyoteTimer = 0;
    return false;
  }
  return true;
}
