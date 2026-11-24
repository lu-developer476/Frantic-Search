/**
 * Single source of truth for the physical size of every dinosaur in the campaign.
 *
 * Size is decided in two steps so that it stays believable AND readable:
 *
 *  1. SPECIES  - the real (or in-universe) body length of the animal picks a size
 *                class: tiny < small < medium < large < huge < colossal. Classes never
 *                overlap on screen, so a bigger species can never be drawn smaller than a
 *                smaller one, whatever its artwork looks like.
 *  2. DETAIL   - the amount of detail in the reference artwork (pixel area and how dense
 *                the image data is) picks a detail tier. Inside its class band, low-detail
 *                art is drawn toward the lower end (it stays crisp and does not look
 *                blown up), while high-detail art is drawn toward the upper end (the extra
 *                detail stays legible).
 *
 * Rendered width is the on-screen width of the sprite. The collision box is derived from it
 * with a per-role ratio: playable dinosaurs keep a forgiving, narrow hitbox; wild animals and
 * bosses use a hitbox that follows their whole body.
 */

export const SIZE_CLASSES = Object.freeze([
  Object.freeze({ id: "tiny", rank: 0, maxMeters: 2, minWidth: 66, maxWidth: 90 }),
  Object.freeze({ id: "small", rank: 1, maxMeters: 4, minWidth: 96, maxWidth: 130 }),
  Object.freeze({ id: "medium", rank: 2, maxMeters: 6, minWidth: 136, maxWidth: 166 }),
  Object.freeze({ id: "large", rank: 3, maxMeters: 10, minWidth: 172, maxWidth: 204 }),
  Object.freeze({ id: "huge", rank: 4, maxMeters: 18, minWidth: 212, maxWidth: 280 }),
  Object.freeze({ id: "colossal", rank: 5, maxMeters: Infinity, minWidth: 300, maxWidth: 380 })
]);

export const DETAIL_TIERS = Object.freeze({
  low: Object.freeze({ id: "low", bandPosition: 0.15 }),
  standard: Object.freeze({ id: "standard", bandPosition: 0.5 }),
  high: Object.freeze({ id: "high", bandPosition: 0.85 })
});

// Pixel-area / data-density thresholds measured on the shipped reference artwork.
const LOW_DETAIL_AREA = 150_000;
const HIGH_DETAIL_AREA = 350_000;
const FLAT_ART_BYTES_PER_PIXEL = 0.02;

export function classifyDetailTier({ width, height, bytes = null, detailTier = null } = {}) {
  const area = Number(width) * Number(height);
  if (!Number.isFinite(area) || area <= 0) throw new RangeError("Reference artwork needs a positive size.");
  if (typeof detailTier === "string" && Object.hasOwn(DETAIL_TIERS, detailTier)) {
    return DETAIL_TIERS[detailTier];
  }
  let tier = area < LOW_DETAIL_AREA ? "low" : area >= HIGH_DETAIL_AREA ? "high" : "standard";
  // Large canvases with almost no image data are flat artwork, not detailed artwork.
  if (Number.isFinite(bytes) && bytes / area < FLAT_ART_BYTES_PER_PIXEL) {
    tier = tier === "high" ? "standard" : "low";
  }
  return DETAIL_TIERS[tier];
}

export function classifySizeClass(lengthMeters) {
  if (!Number.isFinite(lengthMeters) || lengthMeters <= 0) {
    throw new RangeError("Body length must be a positive number of metres.");
  }
  return SIZE_CLASSES.find((entry) => lengthMeters < entry.maxMeters) ?? SIZE_CLASSES.at(-1);
}

// Hitbox width as a fraction of the sprite width.
const HITBOX_WIDTH_RATIO = Object.freeze({ playable: 0.55, creature: 0.82, boss: 0.82, ally: 0.9 });

// Playable dinosaurs may be drawn very large, but their hitbox must stay fair on a 960x540 stage
// and never become so small that a companion is hard to escort.
const PLAYABLE_HITBOX_LIMIT = Object.freeze({ minWidth: 48, minHeight: 48, maxWidth: 112, maxHeight: 100 });

/**
 * lengthMeters: nose-to-tail length of the species.
 * art:          canonical reference artwork the sprite is drawn from (px size / bytes on disk).
 * bodyAspect:   hitbox height / hitbox width. It follows each animal's posture (upright
 *               theropods are taller than quadrupeds) and keeps the existing combat geometry.
 * fixedHitbox:  only for bodies other systems build on (the Brontosaurus back is a rideable
 *               platform), so their collision box never moves.
 */
export const GALA_DISPLAY_SCALE = 0.7;

export const DINOSAUR_SIZE_PROFILES = Object.freeze({
  brisa: Object.freeze({
    species: "Velociraptor (juvenile)", role: "playable", lengthMeters: 1.3, bodyAspect: 1,
    art: { file: "juvenile-velociraptor-abyssomirabilis-idle.gif", width: 124, height: 52, bytes: 4_096 }
  }),
  ligocristus: Object.freeze({
    species: "Ligocristus innocens", role: "creature", lengthMeters: 1.9, bodyAspect: 0.71,
    art: { file: "ligocristus-innocens-idle.gif", width: 544, height: 352, bytes: 51_200 }
  }),
  venatosaurusImpavidus: Object.freeze({
    species: "Venatosaurus impavidus", role: "creature", lengthMeters: 3.1, bodyAspect: 0.82,
    art: { file: "venatosaurus-impavidus-idle.gif", width: 172, height: 100, bytes: 25_600 }
  }),
  gala: Object.freeze({
    species: "Velociraptor (adult)", role: "playable", lengthMeters: 3.4, bodyAspect: 0.97, sizeMultiplier: GALA_DISPLAY_SCALE,
    art: { file: "gala-idle.gif", width: 420, height: 336, bytes: 50_256, detailTier: "high" }
  }),
  venatosaurusSaevidicus: Object.freeze({
    species: "Venatosaurus saevidicus", role: "creature", lengthMeters: 4.3, bodyAspect: 0.82,
    art: { file: "venatosaurus-saevidicus-idle.gif", width: 720, height: 524, bytes: 130_048 }
  }),
  indoraptor: Object.freeze({
    species: "Indoraptor", role: "boss", lengthMeters: 5.2, bodyAspect: 0.93,
    art: { file: "indoraptor-first-generation.png", width: 895, height: 395, bytes: 114_688 }
  }),
  ferrucutus: Object.freeze({
    species: "Ferrucutus cerastes", role: "ally", lengthMeters: 7, bodyAspect: 0.6,
    art: { file: "ferrucutus-cerastes.png", width: 990, height: 650, bytes: 7_168 }
  }),
  stegoceratops: Object.freeze({
    species: "Stegoceratops", role: "ally", lengthMeters: 8.5, bodyAspect: 0.59,
    art: { file: "stegoceratops.png", width: 1528, height: 688, bytes: 1_227_776 }
  }),
  basilio: Object.freeze({
    species: "Vastatosaurus rex", role: "playable", lengthMeters: 12, bodyAspect: 0.88,
    art: { file: "vastatosaurus-rex.png", width: 461, height: 221, bytes: 28_672 }
  }),
  indominus: Object.freeze({
    species: "Indominus rex", role: "boss", lengthMeters: 15, bodyAspect: 0.67,
    art: { file: "indominus-rex-second-generation.png", width: 1376, height: 768, bytes: 269_312 }
  }),
  brontosaurus: Object.freeze({
    species: "Brontosaurus excelsus", role: "creature", lengthMeters: 22, bodyAspect: 0.59,
    fixedHitbox: Object.freeze({ width: 300, height: 178 }),
    art: { file: "brontosaurus-excelsus-basteri-walk.gif", width: 693, height: 399, bytes: 517_120 }
  })
});

const cache = new Map();

export function resolveDinosaurSize(key) {
  if (cache.has(key)) return cache.get(key);
  const profile = DINOSAUR_SIZE_PROFILES[key];
  if (!profile) throw new RangeError(`Unknown dinosaur size profile: ${key}`);

  const sizeClass = classifySizeClass(profile.lengthMeters);
  const detail = classifyDetailTier(profile.art);
  const renderWidth = Math.round(
    (sizeClass.minWidth + (sizeClass.maxWidth - sizeClass.minWidth) * detail.bandPosition) *
    (profile.sizeMultiplier ?? 1)
  );
  const renderHeight = Math.round(renderWidth * profile.art.height / profile.art.width);

  let width;
  let height;
  if (profile.fixedHitbox) {
    ({ width, height } = profile.fixedHitbox);
  } else {
    width = Math.round(renderWidth * HITBOX_WIDTH_RATIO[profile.role]);
    if (profile.role === "playable") {
      width = Math.max(PLAYABLE_HITBOX_LIMIT.minWidth, Math.min(PLAYABLE_HITBOX_LIMIT.maxWidth, width));
    }
    height = Math.round(width * profile.bodyAspect);
    if (profile.role === "playable") {
      height = Math.max(PLAYABLE_HITBOX_LIMIT.minHeight, Math.min(PLAYABLE_HITBOX_LIMIT.maxHeight, height));
    }
  }

  const result = Object.freeze({
    key,
    species: profile.species,
    role: profile.role,
    lengthMeters: profile.lengthMeters,
    sizeClass: sizeClass.id,
    sizeRank: sizeClass.rank,
    detailTier: detail.id,
    renderWidth,
    renderHeight,
    width,
    height,
    // The sprite renderer draws `hitbox width * scale`, so this scale reproduces the render width.
    renderScale: Math.round((renderWidth / width) * 1000) / 1000
  });
  cache.set(key, result);
  return result;
}

export function getDinosaurHitbox(key) {
  const { width, height } = resolveDinosaurSize(key);
  return { w: width, h: height };
}

/**
 * Scale the sprite renderer must apply to the width it is given so the sprite is drawn at the
 * species' classified render width. `drawnPadding` covers callers that draw a few pixels wider
 * than the hitbox (boss sprites are drawn with a 4px margin on each side).
 */
export function getDinosaurRenderScale(key, drawnPadding = 0) {
  const size = resolveDinosaurSize(key);
  return Math.round((size.renderWidth / (size.width + drawnPadding)) * 1000) / 1000;
}

/**
 * A containment cage must always fit the animal drawn inside it (plus room for the bars),
 * and never be smaller than the original cage footprint other systems were laid out around.
 */
export function getContainmentCageSize(key) {
  const size = resolveDinosaurSize(key);
  return {
    w: Math.max(164, size.renderWidth + 28),
    h: Math.max(124, size.renderHeight + 26)
  };
}

export function listDinosaurSizes() {
  return Object.keys(DINOSAUR_SIZE_PROFILES)
    .map(resolveDinosaurSize)
    .sort((a, b) => a.renderWidth - b.renderWidth);
}
