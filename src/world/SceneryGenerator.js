const BIOME_PROFILES = Object.freeze({
  prairie: {
    farSpacing: 720,
    midSpacing: 430,
    groundSpacing: 215,
    farSpecies: ["broadleaf", "pine", "broadleaf"],
    midSpecies: ["broadleaf", "broadleaf", "pine"],
    farWidth: [42, 68],
    farHeight: [88, 142],
    midWidth: [48, 82],
    midHeight: [108, 172],
    groundKinds: ["dune-grass", "dune-grass", "shrub", "boulder", "driftwood"]
  },
  coastal: {
    farSpacing: 760,
    midSpacing: 410,
    groundSpacing: 390,
    farSpecies: ["broadleaf", "palm", "broadleaf", "cypress"],
    midSpecies: ["palm", "broadleaf", "palm", "broadleaf", "cypress"],
    farWidth: [48, 78],
    farHeight: [112, 190],
    midWidth: [64, 108],
    midHeight: [158, 258],
    groundKinds: ["dune-grass", "boulder", "driftwood", "dune-grass", "shrub"]
  },
  redwood: {
    farSpacing: 430,
    midSpacing: 225,
    groundSpacing: 245,
    farSpecies: ["redwood", "pine", "redwood", "broadleaf"],
    midSpecies: ["redwood", "redwood", "pine", "broadleaf", "redwood"],
    farWidth: [54, 86],
    farHeight: [168, 255],
    midWidth: [78, 132],
    midHeight: [238, 370],
    groundKinds: ["fern", "fern", "moss-rock", "fallen-log", "fern"]
  },
  "black-site": {
    farSpacing: 690,
    midSpacing: 475,
    groundSpacing: 315,
    farSpecies: ["dead-tree", "dead-tree", "dead-tree", "broadleaf"],
    midSpecies: ["dead-tree", "dead-tree", "dead-tree", "broadleaf"],
    farWidth: [36, 66],
    farHeight: [94, 165],
    midWidth: [42, 76],
    midHeight: [118, 198],
    groundKinds: ["rubble", "stump", "dead-shrub", "broken-concrete", "dead-shrub"]
  },
  containment: {
    farSpacing: 760,
    midSpacing: 465,
    groundSpacing: 355,
    farSpecies: ["cypress", "conifer", "cypress"],
    midSpecies: ["cypress", "conifer", "clipped-tree", "cypress"],
    farWidth: [38, 62],
    farHeight: [110, 178],
    midWidth: [46, 78],
    midHeight: [132, 212],
    groundKinds: ["planter", "clipped-shrub", "boulder", "planter"]
  },
  extraction: {
    farSpacing: 535,
    midSpacing: 305,
    groundSpacing: 270,
    farSpecies: ["broadleaf", "pine", "conifer", "broadleaf"],
    midSpecies: ["broadleaf", "pine", "broadleaf", "conifer", "pine"],
    farWidth: [50, 82],
    farHeight: [134, 212],
    midWidth: [62, 112],
    midHeight: [176, 288],
    groundKinds: ["fern", "moss-rock", "fallen-log", "shrub", "fern"]
  }
});

const GROUND_PROP_DIMENSIONS = Object.freeze({
  "dune-grass": [[24, 38], [22, 34]],
  boulder: [[34, 58], [20, 34]],
  driftwood: [[48, 82], [15, 24]],
  shrub: [[30, 54], [20, 34]],
  fern: [[28, 48], [32, 54]],
  "moss-rock": [[34, 60], [18, 34]],
  "fallen-log": [[58, 96], [18, 30]],
  rubble: [[28, 56], [18, 34]],
  stump: [[24, 38], [22, 34]],
  "dead-shrub": [[28, 48], [20, 34]],
  "broken-concrete": [[34, 66], [18, 32]],
  planter: [[48, 72], [30, 44]],
  "clipped-shrub": [[38, 58], [24, 36]]
});

function createRandom(seed) {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBetween(random, [minimum, maximum]) {
  return minimum + random() * (maximum - minimum);
}

function pick(random, choices) {
  return choices[Math.floor(random() * choices.length)];
}

/**
 * Creates one procedural ground detail using the same biome palette and
 * weighted prop distribution as section scenery, ready to be streamed in
 * from a mini-game viewport edge.
 */
export function createGroundSceneryProp({
  environment = "prairie",
  x = 0,
  groundY = 430,
  random = Math.random,
  id = "ground-scenery"
} = {}) {
  const profile = BIOME_PROFILES[environment];
  if (!profile || !Number.isFinite(x) || !Number.isFinite(groundY) || typeof random !== "function") {
    return null;
  }

  const kind = pick(random, profile.groundKinds);
  const dimensions = GROUND_PROP_DIMENSIONS[kind];
  if (!dimensions) return null;

  return {
    id,
    layer: "ground",
    type: "ground-detail",
    environment,
    kind,
    x,
    baseY: groundY,
    width: Math.round(randomBetween(random, dimensions[0])),
    height: Math.round(randomBetween(random, dimensions[1])),
    parallax: 1,
    opacity: 0.92 + random() * 0.08,
    variant: Math.floor(random() * 4),
    flip: random() < 0.5
  };
}

function layerRandom(seed, sectionIndex, salt) {
  const mixed = ((seed >>> 0) ^ Math.imul(sectionIndex + 1, 0x9e3779b1) ^ salt) >>> 0;
  return createRandom(mixed);
}

function generateTreeLayer({
  props,
  random,
  sectionIndex,
  sectionStart,
  sectionLength,
  groundY,
  profile,
  layer
}) {
  const isFar = layer === "far";
  const spacing = isFar ? profile.farSpacing : profile.midSpacing;
  const speciesChoices = isFar ? profile.farSpecies : profile.midSpecies;
  const widthRange = isFar ? profile.farWidth : profile.midWidth;
  const heightRange = isFar ? profile.farHeight : profile.midHeight;
  const parallax = isFar ? 0.14 : 0.31;
  const opacity = isFar ? 0.42 : 0.82;
  const count = Math.ceil(sectionLength / spacing);

  for (let index = 0; index < count; index += 1) {
    const jitter = (random() - 0.5) * spacing * 0.34;
    const x = Math.max(
      sectionStart + 20,
      Math.min(sectionStart + sectionLength - 20, sectionStart + (index + 0.5) * spacing + jitter)
    );
    const species = pick(random, speciesChoices);
    props.push({
      id: "scenery-" + sectionIndex + "-" + layer + "-tree-" + index,
      layer: "background",
      type: "tree",
      environment: null,
      species,
      x,
      baseY: groundY - (isFar ? 18 + random() * 12 : random() * 5),
      width: Math.round(randomBetween(random, widthRange)),
      height: Math.round(randomBetween(random, heightRange)),
      parallax,
      opacity,
      variant: Math.floor(random() * 4),
      flip: random() < 0.5
    });
  }
}

function generateGroundLayer({
  props,
  random,
  sectionIndex,
  sectionStart,
  sectionLength,
  groundY,
  profile,
  safeZones
}) {
  const spacing = profile.groundSpacing;
  const count = Math.ceil(sectionLength / spacing);

  for (let index = 0; index < count; index += 1) {
    const jitter = (random() - 0.5) * spacing * 0.42;
    const x = sectionStart + (index + 0.5) * spacing + jitter;
    const kind = pick(random, profile.groundKinds);
    const dimensions = GROUND_PROP_DIMENSIONS[kind];
    if (!dimensions) continue;

    const width = Math.round(randomBetween(random, dimensions[0]));
    const height = Math.round(randomBetween(random, dimensions[1]));
    const isProtected = safeZones.some((zone) =>
      Math.abs(zone.x - x) < (zone.radius ?? 120) + width * 0.5
    );
    if (isProtected) continue;

    props.push({
      id: "scenery-" + sectionIndex + "-ground-" + index,
      layer: "ground",
      type: "ground-detail",
      environment: null,
      kind,
      x,
      baseY: groundY,
      width,
      height,
      parallax: 1,
      opacity: 0.92 + random() * 0.08,
      variant: Math.floor(random() * 4),
      flip: random() < 0.5
    });
  }
}

/**
 * Generates decorative scenery with independent random streams.
 * It never consumes the gameplay RNG used for platforms, enemies or objectives.
 */
export function generateSectionScenery({
  seed = 1,
  sectionIndex = 0,
  sectionStart = 0,
  sectionLength = 0,
  groundY = 430,
  environment = "coastal",
  safeZones = []
} = {}) {
  const profile = BIOME_PROFILES[environment];
  if (!profile || environment === "rosa-containment" || sectionLength <= 0) return [];

  const props = [];
  generateTreeLayer({
    props,
    random: layerRandom(seed, sectionIndex, 0x51ed270b),
    sectionIndex,
    sectionStart,
    sectionLength,
    groundY,
    profile,
    layer: "far"
  });
  generateTreeLayer({
    props,
    random: layerRandom(seed, sectionIndex, 0x2c1b3c6d),
    sectionIndex,
    sectionStart,
    sectionLength,
    groundY,
    profile,
    layer: "mid"
  });
  generateGroundLayer({
    props,
    random: layerRandom(seed, sectionIndex, 0x7f4a7c15),
    sectionIndex,
    sectionStart,
    sectionLength,
    groundY,
    profile,
    safeZones
  });

  for (const prop of props) prop.environment = environment;
  return props.sort((left, right) => left.x - right.x || left.layer.localeCompare(right.layer));
}
