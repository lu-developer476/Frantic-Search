import { ACTOR_ANIMATION_PROFILES, selectActorPose } from "./AnimationProfiles.js";
import { getAnimatedFrameIndex, loadAnimatedGif } from "../minigames/AnimatedGif.js";
import { drawSpriteImage } from "./CanvasUtils.js";
import { getDinosaurRenderScale } from "../config/DinosaurSizing.js";

const BOSS_DRAW_PADDING = 8;

export const BRISA_ANIMATIONS = Object.freeze({
  idle: "brisa-idle.gif",
  jump: "brisa-jump.gif",
  run: "brisa-run.gif"
});
export const BRISA_REFERENCE = BRISA_ANIMATIONS.idle;
export const TACTICAL_COMBAT_EFFECT_SPRITES = Object.freeze({
  muzzle: Object.freeze([
    Object.freeze({ x: 286, y: 2, width: 17, height: 17 }),
    Object.freeze({ x: 310, y: 2, width: 17, height: 17 }),
    Object.freeze({ x: 334, y: 2, width: 17, height: 17 }),
    Object.freeze({ x: 358, y: 2, width: 17, height: 17 })
  ]),
  impact: Object.freeze([
    Object.freeze({ x: 285, y: 245, width: 22, height: 27 }),
    Object.freeze({ x: 309, y: 245, width: 22, height: 27 })
  ])
});

export function selectJuvenileAnimation(actor = {}, options = {}) {
  if (options.animationKey) return options.animationKey;
  if (options.sleeping) return "idle";

  const state = actor?.state;
  const airborne = actor?.onGround === false || state === "jumping" || state === "jump";
  if (airborne) return "jump";

  // vx may be zero while the companion's motionSpeed is updated independently.
  const motionSpeed = Math.max(
    Math.abs(Number(actor?.vx) || 0),
    Math.abs(Number(actor?.motionSpeed) || 0),
    Math.abs(Number(actor?.speed) || 0)
  );
  const moving = motionSpeed > 24 ||
    ["following", "running", "chasing", "retreating", "moving", "walking"].includes(state);
  return moving ? "run" : "idle";
}
export const LIGOCRISTUS_ANIMATION_ASSETS = Object.freeze({
  idle: "ligocristus-innocens-idle.gif",
  jump: "ligocristus-innocens-jump.gif",
  run: "ligocristus-innocens-run.gif",
  walk: "ligocristus-innocens-walk.gif"
});
const PROLOGUE_BRISA_SCALE = 1.8;
const ANIMATED_REFERENCE_VERSION = "20261123-blocky-directional-pterodactyl-2";

// Every scale is derived from the species' size class and artwork detail (see DinosaurSizing.js).
export const DINOSAUR_REFERENCE_SCALES = Object.freeze({
  gala: getDinosaurRenderScale("gala"),
  violeta: getDinosaurRenderScale("gala"),
  brisa: getDinosaurRenderScale("brisa"),
  rosa: getDinosaurRenderScale("brisa"),
  basilio: getDinosaurRenderScale("basilio"),
  vastatosaurusRex: getDinosaurRenderScale("basilio"),
  ligocristusInnocens: getDinosaurRenderScale("ligocristus"),
  venatosaurusImpavidus: getDinosaurRenderScale("venatosaurusImpavidus"),
  venatosaurusSaevidicus: getDinosaurRenderScale("venatosaurusSaevidicus"),
  ferrucutus: getDinosaurRenderScale("ferrucutus"),
  indoraptor: getDinosaurRenderScale("indoraptor", BOSS_DRAW_PADDING),
  indominus: getDinosaurRenderScale("indominus", BOSS_DRAW_PADDING),
  stegoceratops: getDinosaurRenderScale("stegoceratops"),
  brontosaurus: getDinosaurRenderScale("brontosaurus")
});

export const JUVENILE_ANIMATED_CHARACTERS = Object.freeze({
  brisa: Object.freeze({ scale: DINOSAUR_REFERENCE_SCALES.brisa, sourceFacing: 1 })
});

const GALA_REFERENCE = Object.freeze({
  file: "adult-velociraptor-nublarensis.png",
  sourceFacing: 1,
  scale: DINOSAUR_REFERENCE_SCALES.gala
});
const BASILIO_REFERENCE = Object.freeze({
  file: "vastatosaurus-rex.png",
  sourceFacing: -1,
  scale: DINOSAUR_REFERENCE_SCALES.basilio
});

export const REFERENCE_PNG_CHARACTERS = Object.freeze({
  gala: GALA_REFERENCE,
  blue: GALA_REFERENCE,
  basilio: BASILIO_REFERENCE,
  vasti: BASILIO_REFERENCE,
  ferrucutus: { file: "ferrucutus-cerastes.png", sourceFacing: -1, scale: DINOSAUR_REFERENCE_SCALES.ferrucutus },
  indoraptor: { first: "indoraptor-first-generation.png", second: "indoraptor-second-generation.png", sourceFacing: 1, scale: DINOSAUR_REFERENCE_SCALES.indoraptor },
  indominus: { first: "indominus-rex-first-generation.png", second: "indominus-rex-second-generation.png", sourceFacing: -1, scale: DINOSAUR_REFERENCE_SCALES.indominus },
  "indominus-variant": { file: "indominus-rex-second-generation-variant.png", sourceFacing: -1, scale: DINOSAUR_REFERENCE_SCALES.indominus },
  stegoceratops: { file: "stegoceratops.png", sourceFacing: -1, scale: DINOSAUR_REFERENCE_SCALES.stegoceratops }
});

export const BRONTOSAURUS_ANIMATION_ASSETS = Object.freeze({
  walk: "brontosaurus-excelsus-basteri-walk.gif",
  run: "brontosaurus-excelsus-basteri-run.gif",
  sourceFacing: 1,
  scale: DINOSAUR_REFERENCE_SCALES.brontosaurus
});

export function selectBrontosaurusAnimation(actor = {}) {
  return Math.abs(actor?.motionSpeed ?? 0) > 28 ||
    ["running", "retreating", "run"].includes(actor?.state)
    ? BRONTOSAURUS_ANIMATION_ASSETS.run
    : BRONTOSAURUS_ANIMATION_ASSETS.walk;
}

export function selectLigocristusAnimation(actor = {}) {
  const state = actor?.state;
  if (actor?.consumed || actor?.defeated || ["consumed", "defeated", "grazing", "stunned"].includes(state)) {
    return LIGOCRISTUS_ANIMATION_ASSETS.idle;
  }
  if (actor?.onGround === false || state === "jump" || state === "jumping") {
    return LIGOCRISTUS_ANIMATION_ASSETS.jump;
  }

  const motionSpeed = Math.abs(Number(actor?.motionSpeed ?? actor?.vx ?? actor?.speed ?? 0));
  if (["fleeing", "running", "chasing", "retreating"].includes(state) || motionSpeed > 55) {
    return LIGOCRISTUS_ANIMATION_ASSETS.run;
  }
  if (["foraging", "walking", "patrol"].includes(state) || motionSpeed > 1) {
    return LIGOCRISTUS_ANIMATION_ASSETS.walk;
  }
  return LIGOCRISTUS_ANIMATION_ASSETS.idle;
}

export const VENATOSAURUS_ANIMATION_ASSETS = Object.freeze({
  "venatosaurus-impavidus": Object.freeze({
    attack: "venatosaurus-impavidus-attack.gif",
    idle: "venatosaurus-impavidus-idle.gif",
    jump: "venatosaurus-impavidus-jump.gif",
    run: "venatosaurus-impavidus-run.gif",
    walk: "venatosaurus-impavidus-walk.gif",
    sourceFacing: 1,
    scale: DINOSAUR_REFERENCE_SCALES.venatosaurusImpavidus
  }),
  "venatosaurus-saevidicus": Object.freeze({
    attack: "venatosaurus-saevidicus-attack.gif",
    idle: "venatosaurus-saevidicus-idle.gif",
    jump: "venatosaurus-saevidicus-jump.gif",
    run: "venatosaurus-saevidicus-run.gif",
    walk: "venatosaurus-saevidicus-walk.gif",
    sourceFacing: 1,
    scale: DINOSAUR_REFERENCE_SCALES.venatosaurusSaevidicus
  })
});

export function selectVenatosaurusAnimation(character, actor = {}) {
  const assets = VENATOSAURUS_ANIMATION_ASSETS[character];
  if (!assets) return null;

  if (["windup", "attack", "attacking", "telegraph"].includes(actor?.state)) {
    return assets.attack;
  }
  if (actor?.onGround === false) return assets.jump;
  if (["stunned", "defeated"].includes(actor?.state)) return assets.idle;
  if (actor?.state === "pursuit" || Math.abs(actor?.motionSpeed ?? actor?.vx ?? 0) > 70) return assets.run;
  if (actor?.state === "patrol") return assets.walk;
  return assets.idle;
}

export function selectCampaignHunterAnimation(actor = {}, allowHumanV2 = false) {
  if (!allowHumanV2) return "human-v1.gif";
  const identity = String(actor?.id ?? actor?.squadIndex ?? "hunter");
  let hash = 0;
  for (const character of identity) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % 2 === 0 ? "human-v1.gif" : "human-v2.gif";
}

export const CAMPAIGN_ANIMATED_REFERENCE_FILES = Object.freeze([
  ...Object.values(BRISA_ANIMATIONS),
  ...Object.values(LIGOCRISTUS_ANIMATION_ASSETS),
  BRONTOSAURUS_ANIMATION_ASSETS.walk,
  BRONTOSAURUS_ANIMATION_ASSETS.run,
  ...Object.values(VENATOSAURUS_ANIMATION_ASSETS).flatMap((assets) => [
    assets.attack, assets.idle, assets.jump, assets.run, assets.walk
  ]),
  "human-v1.gif", "human-v2.gif", "blocky.gif"
]);

export const REFERENCE_PRELOAD_FILES = [
  "adult-velociraptor-nublarensis.png",
  "vastatosaurus-rex.png",
  "ferrucutus-cerastes.png",
  "indoraptor-first-generation.png",
  "indoraptor-second-generation.png",
  "indominus-rex-first-generation.png",
  "indominus-rex-second-generation.png",
  "indominus-rex-second-generation-variant.png",
  "stegoceratops.png",
  "tactical-enemies.png"
];

const SPRITE_ASSET_VERSION = "20261123-blocky-directional-pterodactyl-2";
const ROSA_RIG_PARTS = [
  "rosa-rig-body",
  "rosa-rig-tail",
  "rosa-rig-leg-back",
  "rosa-rig-leg-front",
  "rosa-rig-arm-back",
  "rosa-rig-arm-front",
  "rosa-rig-head",
  "rosa-rig-jaw"
];
const VIOLETA_RIG_PARTS = [
  "violeta-rig-body",
  "violeta-rig-tail",
  "violeta-rig-leg-back",
  "violeta-rig-leg-front",
  "violeta-rig-arm-back",
  "violeta-rig-arm-front",
  "violeta-rig-head",
  "violeta-rig-jaw"
];
const VASTI_RIG_PARTS = [
  "vasti-rig-body",
  "vasti-rig-tail",
  "vasti-rig-leg-back",
  "vasti-rig-leg-front",
  "vasti-rig-foreleg-back",
  "vasti-rig-foreleg",
  "vasti-rig-head",
  "vasti-rig-jaw"
];
const VASTI_POSE_SPRITES = new Set([
  "vasti-idle","vasti-run-a","vasti-run-b","vasti-jump","vasti-duck",
  "vasti-attack","vasti-eat","vasti-land","vasti-impact","vasti-recover","vasti-stomp","vasti-slam"
]);
const FERRUCUTUS_RIG_PARTS = [
  "ferrucutus-rig-body","ferrucutus-rig-tail","ferrucutus-rig-leg-back",
  "ferrucutus-rig-leg-front","ferrucutus-rig-foreleg","ferrucutus-rig-jaw"
];
const INDOMINUS_RIG_PARTS = [
  "indominus-rig-body","indominus-rig-tail","indominus-rig-leg-back",
  "indominus-rig-leg-front","indominus-rig-forelimb","indominus-rig-jaw"
];
const INDORAPTOR_RIG_PARTS = [
  "indoraptor-rig-body","indoraptor-rig-tail","indoraptor-rig-leg-back","indoraptor-rig-leg-front",
  "indoraptor-rig-arm-back","indoraptor-rig-arm-front","indoraptor-rig-head","indoraptor-rig-jaw"
];
const INDORAPTOR_GEN2_RIG_PARTS = [
  "indoraptor-gen2-rig-body","indoraptor-gen2-rig-tail","indoraptor-gen2-rig-leg-back","indoraptor-gen2-rig-leg-front",
  "indoraptor-gen2-rig-arm-back","indoraptor-gen2-rig-arm-front","indoraptor-gen2-rig-head","indoraptor-gen2-rig-jaw"
];
const BASE = [
  "violeta-idle","violeta-run-a","violeta-run-b","violeta-jump","violeta-dash","violeta-duck",
  "vasti-idle","vasti-run-a","vasti-run-b","vasti-jump","vasti-duck",
  "vasti-attack","vasti-land","vasti-impact","vasti-recover","vasti-stomp","vasti-slam",
  "rosa","rosa-run-a","rosa-run-b","rosa-jump","rosa-duck",
  "ferrucutus","ferrucutus-step-a","ferrucutus-step-b","ferrucutus-duck",
  "hunter","hunter-run-a","hunter-run-b","hunter-duck",
  "indoraptor","indoraptor-run-a","indoraptor-run-b","indoraptor-duck","indoraptor-eat","indoraptor-jump","indoraptor-defeated",
  "indoraptor-gen2","indoraptor-gen2-run-a","indoraptor-gen2-run-b","indoraptor-gen2-duck","indoraptor-gen2-eat","indoraptor-gen2-jump","indoraptor-gen2-defeated",
  "violeta-eat","rosa-eat","vasti-eat",
  "indominus","indominus-run-a","indominus-run-b","indominus-duck"
];
const SPRITES = [
  ...BASE,
  ...ROSA_RIG_PARTS,
  ...VIOLETA_RIG_PARTS,
  ...VASTI_RIG_PARTS,
  ...FERRUCUTUS_RIG_PARTS,
  ...INDOMINUS_RIG_PARTS,
  ...INDORAPTOR_RIG_PARTS,
  ...INDORAPTOR_GEN2_RIG_PARTS,
  ...["violeta","rosa","ferrucutus","hunter","indoraptor","indominus"]
    .flatMap(name => ["attack","land","impact","recover"].map(pose => name + "-" + pose)),
  ...["indoraptor-gen2"].flatMap(name => ["attack","land","impact","recover"].map(pose => name + "-" + pose))
];

function phaseOf(actor, fallback) {
  const key = String(actor?.id ?? actor?.character ?? fallback);
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 997) / 997 * Math.PI * 2;
}

export class SpriteRenderer {
  constructor(baseUrl = import.meta.env?.BASE_URL ?? "/", onAssetChange = null) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
    this.images = new Map();
    this.failed = new Set();
    this.loaded = new Set();
    this.referenceImages = new Map();
    this.referenceBounds = new Map();
    this.referenceLoaded = new Set();
    this.referenceFailed = new Set();
    this.animatedReferences = new Map();
    this.animatedReferencePromises = new Map();
    this.animatedReferenceFailed = new Set();
    this.onAssetChange = typeof onAssetChange === "function" ? onAssetChange : null;
    this.preload();
  }

  preload() {
    for (const file of REFERENCE_PRELOAD_FILES) this.getReferenceImage(file);
    for (const file of CAMPAIGN_ANIMATED_REFERENCE_FILES) this.loadAnimatedReference(file);
  }

  loadAnimatedReference(file) {
    if (this.animatedReferenceFailed?.has(file)) return Promise.resolve(null);
    if (this.animatedReferences.has(file)) {
      return Promise.resolve(this.animatedReferences.get(file));
    }
    if (this.animatedReferencePromises.has(file)) {
      return this.animatedReferencePromises.get(file);
    }

    const url = this.baseUrl + "references/" + file + "?v=" + ANIMATED_REFERENCE_VERSION;
    const promise = loadAnimatedGif(url).then((animation) => {
      this.animatedReferences.set(file, animation);
      this.onAssetChange?.(file, this.readiness(), "loaded");
      return animation;
    }).catch((error) => {
      this.animatedReferenceFailed?.add(file);
      this.onAssetChange?.(file, this.readiness(), "error");
      console.error("[SpriteRenderer] Failed to decode " + file + " GIF:", error);
      return null;
    });
    this.animatedReferencePromises.set(file, promise);
    return promise;
  }

  getReferenceConfig(character, actor = {}) {
    const definition = REFERENCE_PNG_CHARACTERS[character];
    if (!definition) return null;
    if (!definition.first) return { ...definition, file: definition.file };
    const generationValue = actor?.generation ?? actor?.phase ?? 1;
    const secondGeneration = Number(generationValue) >= 2 ||
      generationValue === "second" || generationValue === "second-generation";
    return {
      ...definition,
      file: secondGeneration ? definition.second : definition.first,
      generation: secondGeneration ? 2 : 1
    };
  }

  measureOpaqueBounds(image) {
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const fallback = { x: 0, y: 0, width, height };
    try {
      const canvas = typeof OffscreenCanvas === "function"
        ? new OffscreenCanvas(width, height)
        : document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return fallback;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, width, height).data;
      let minX = width, minY = height, maxX = -1, maxY = -1;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (pixels[(y * width + x) * 4 + 3] > 16) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < minX || maxY < minY) return fallback;
      const padding = 3;
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(width - 1, maxX + padding);
      maxY = Math.min(height - 1, maxY + padding);
      return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
    } catch {
      // A full-image draw is still valid when browser canvas inspection is unavailable.
      return fallback;
    }
  }

  getReferenceImage(file) {
    if (this.referenceImages.has(file) || this.referenceFailed.has(file)) {
      return this.referenceImages.get(file) ?? null;
    }
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      let status = "error";
      if (image.naturalWidth > 0) {
        this.referenceLoaded.add(file);
        this.referenceBounds.set(file, this.measureOpaqueBounds(image));
        status = "loaded";
      } else {
        this.referenceFailed.add(file);
      }
      if (typeof image.decode === "function") image.decode().catch(() => {});
      this.onAssetChange?.(file, this.readiness(), status);
    };
    image.onerror = () => {
      this.referenceFailed.add(file);
      this.referenceImages.delete(file);
      this.onAssetChange?.(file, this.readiness(), "error");
    };
    this.referenceImages.set(file, image);
    image.src = this.baseUrl + "references/" + file + "?v=" + SPRITE_ASSET_VERSION;
    return image;
  }

  drawAnimatedJuvenile(context, character, x, y, width, height, actor = {}, elapsed = 0, options = {}) {
    const definition = JUVENILE_ANIMATED_CHARACTERS[character];
    if (!definition || !(this.animatedReferences instanceof Map)) return false;

    const animationKey = selectJuvenileAnimation(actor, options);
    const sleeping = Boolean(options.sleeping);
    const file = BRISA_ANIMATIONS[animationKey] ?? BRISA_ANIMATIONS.idle;
    const animation = this.animatedReferences.get(file);
    if (!animation?.frames?.length) {
      this.loadAnimatedReference(file);
      return false;
    }

    const frameIndex = getAnimatedFrameIndex(
      animation.frames,
      (sleeping ? 0 : Math.max(0, elapsed)) * 1000
    );
    const frame = animation.frames[frameIndex];
    if (!frame?.image || !(animation.width > 0) || !(animation.height > 0)) return false;

    const drawWidth = Math.max(1, Math.round(width * (options.scale ?? definition.scale)));
    const drawHeight = Math.max(1, Math.round(drawWidth * animation.height / animation.width));
    const bottomPadding = Math.max(
      0,
      Math.min(animation.height, Number(frame.bottomPadding ?? animation.bottomPadding) || 0)
    );
    const scaledBottomPadding = drawHeight * bottomPadding / animation.height;
    const phase = phaseOf(actor, character);
    const bob = sleeping || airborne
      ? 0
      : Math.abs(Math.sin(elapsed * 7.2 + phase)) * 0.45;
    const groundAlignedY = y + height - drawHeight + scaledBottomPadding + bob;
    const facing = options.facing ?? actor?.facing ?? actor?.direction ?? 1;
    const flip = Math.sign(facing || 1) !== definition.sourceFacing;

    context.save();
    context.globalAlpha *= options.alpha ?? 1;
    context.imageSmoothingEnabled = false;
    context.translate(Math.round(x + width / 2), Math.round(groundAlignedY));
    context.scale(flip ? -1 : 1, 1);
    drawSpriteImage(context, frame.image, -drawWidth / 2, 0, drawWidth, drawHeight);
    context.restore();
    return true;
  }

  drawPrologueBrisa(context, x, y, width, height, actor = {}, elapsed = 0, alpha = 1, sleeping = false) {
    return this.drawAnimatedJuvenile(context, "brisa", x, y, width, height, actor, elapsed, {
      alpha,
      sleeping,
      scale: PROLOGUE_BRISA_SCALE
    });
  }

  drawAnimatedVenatosaurus(context, character, x, y, width, height, actor = {}, elapsed = 0, options = {}) {
    const definition = VENATOSAURUS_ANIMATION_ASSETS[character];
    if (!definition || !(this.animatedReferences instanceof Map)) return false;

    const file = selectVenatosaurusAnimation(character, actor);
    const animation = this.animatedReferences.get(file);
    if (!animation?.frames?.length) {
      this.loadAnimatedReference(file);
      return false;
    }

    const frameIndex = getAnimatedFrameIndex(animation.frames, Math.max(0, elapsed) * 1000);
    const frame = animation.frames[frameIndex];
    if (!frame?.image) return false;

    const drawWidth = Math.max(1, Math.round(width * definition.scale));
    const drawHeight = Math.max(1, Math.round(drawWidth * animation.height / animation.width));
    const sliding = actor?.state === "pursuit" && (actor?.slideTimer ?? 0) > 0;
    const renderedWidth = drawWidth * (sliding ? 1.12 : 1);
    const renderedHeight = drawHeight * (sliding ? 0.72 : 1);
    const bottomPadding = frame.bottomPadding ?? animation.bottomPadding ?? 0;
    const scaledBottomPadding = renderedHeight * bottomPadding / animation.height;
    const bob = actor?.onGround === false ? 0 : Math.abs(Math.sin(elapsed * 7.2 + phaseOf(actor, character))) * 0.35;
    const facing = options.facing ?? actor?.facing ?? actor?.direction ?? 1;
    const flip = Math.sign(facing || 1) !== definition.sourceFacing;

    context.save();
    context.globalAlpha *= options.alpha ?? 1;
    context.imageSmoothingEnabled = false;
    context.translate(
      Math.round(x + width / 2),
      Math.round(y + height - renderedHeight + scaledBottomPadding + bob)
    );
    context.scale(flip ? -1 : 1, 1);
    drawSpriteImage(context, frame.image, -renderedWidth / 2, 0, renderedWidth, renderedHeight);
    context.restore();
    return true;
  }

  drawAnimatedLigocristus(context, x, y, width, height, actor = {}, elapsed = 0, options = {}) {
    if (!(this.animatedReferences instanceof Map)) return false;

    const file = selectLigocristusAnimation(actor);
    const animation = this.animatedReferences.get(file);
    if (!animation?.frames?.length) {
      this.loadAnimatedReference(file);
      return false;
    }

    const frameIndex = getAnimatedFrameIndex(animation.frames, Math.max(0, elapsed) * 1000);
    const frame = animation.frames[frameIndex];
    if (!frame?.image || !(animation.width > 0) || !(animation.height > 0)) return false;

    const drawWidth = Math.max(1, Math.round(width * DINOSAUR_REFERENCE_SCALES.ligocristusInnocens));
    const drawHeight = Math.max(1, Math.round(drawWidth * animation.height / animation.width));
    const bottomPadding = frame.bottomPadding ?? animation.bottomPadding ?? 0;
    const scaledBottomPadding = drawHeight * bottomPadding / animation.height;
    const facing = options.facing ?? actor?.facing ?? actor?.direction ?? 1;
    const flip = Math.sign(facing || 1) !== 1;

    context.save();
    context.globalAlpha *= options.alpha ?? 1;
    context.imageSmoothingEnabled = false;
    context.translate(
      Math.round(x + width / 2),
      Math.round(y + height - drawHeight + scaledBottomPadding)
    );
    context.scale(flip ? -1 : 1, 1);
    drawSpriteImage(context, frame.image, -drawWidth / 2, 0, drawWidth, drawHeight);
    context.restore();
    return true;
  }

  drawReferencePng(context, character, x, y, width, height, actor, elapsed, options = {}, poseOverride = null) {
    // Tests and lightweight renderers may intentionally use this prototype without
    // running the browser constructor; in that case preserve the legacy fallback.
    if (!(this.referenceImages instanceof Map)) return false;
    const definition = this.getReferenceConfig(character, actor);
    if (!definition?.file) return false;
    const image = this.getReferenceImage(definition.file);
    const bounds = this.referenceBounds.get(definition.file);
    if (!image?.complete || image.naturalWidth === 0 || !bounds) return false;

    const pose = poseOverride ?? (actor?.onGround === false
      ? character + "-jump"
      : selectActorPose(character, actor, elapsed));
    const phase = phaseOf(actor, character);
    const pace = character === "vasti" ? 5.4 : character === "indominus" ? 4.4 : 8.5;
    const gait = Math.sin(elapsed * pace * Math.PI + phase);
    let bob = Math.sin(elapsed * 2.1 + phase) * 0.75;
    let rotation = 0;
    let scaleX = 1;
    let scaleY = 1;

    if (pose.includes("run") || pose.includes("step")) {
      bob = Math.abs(gait) * (character === "vasti" ? 1.2 : 1.7);
      rotation = gait * 0.018;
      scaleX = 1 + Math.abs(gait) * 0.018;
      scaleY = 1 - Math.abs(gait) * 0.022;
    } else if (pose.includes("jump")) {
      bob = -2;
      rotation = -0.055;
      scaleX = 1.025;
      scaleY = 0.97;
    } else if (pose.includes("duck")) {
      scaleX = 1.045;
      scaleY = 0.86;
      bob = 2;
    } else if (pose.includes("stomp")) {
      scaleX = 1.045;
      scaleY = 0.9;
      bob = 2;
    } else if (pose.includes("slam")) {
      rotation = 0.045;
      scaleX = 1.055;
      scaleY = 0.88;
      bob = 3;
    } else if (pose.includes("attack") || actor?.state === "telegraph" || actor?.state === "attacking") {
      rotation = actor?.attackName === "charge" ? -0.052 : -0.028;
      scaleX = 1.04;
      scaleY = 0.97;
      bob = -1;
      if (actor?.attackName === "pounce") {
        rotation = -0.16;
        bob = -3;
      }
    } else if (pose.includes("eat")) {
      rotation = Math.sin(elapsed * 13 + phase) * 0.035;
      bob = Math.sin(elapsed * 13 + phase) * 1.2;
    } else if (pose.includes("impact")) {
      rotation = 0.065;
      scaleX = 0.94;
      scaleY = 1.045;
      bob = 1;
    } else if (pose.includes("land")) {
      scaleX = 1.045;
      scaleY = 0.89;
      bob = 3;
    } else if (pose.includes("recover")) {
      bob = Math.max(0, Math.sin(elapsed * 13 + phase)) * 1.25;
    }

    if (actor?.defeated || actor?.state === "defeated") {
      rotation = 0.16;
      scaleY = Math.min(scaleY, 0.9);
    }

    const drawWidth = Math.max(1, Math.round(width * definition.scale));
    const drawHeight = Math.max(1, Math.round(drawWidth * bounds.height / bounds.width));
    const drawCenterX = x + width / 2;
    const drawCenterY = y + height + bob - drawHeight * scaleY / 2;
    const facing = options.facing ?? actor?.facing ?? actor?.direction ?? 1;
    const flip = Math.sign(facing || 1) !== (definition.sourceFacing ?? 1);

    context.save();
    context.globalAlpha *= options.alpha ?? 1;
    context.imageSmoothingEnabled = false;
    context.translate(drawCenterX, drawCenterY);
    context.rotate(rotation * Math.sign(facing || 1));
    context.scale((flip ? -1 : 1) * scaleX, scaleY);
    drawSpriteImage(
      context,
      image,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight,
      bounds
    );
    context.restore();
    return true;
  }

  get(name) {
    if (this.images.has(name) || this.failed.has(name)) return this.images.get(name) ?? null;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      let status = "error";
      if (image.naturalWidth > 0) {
        this.loaded.add(name);
        this.failed.delete(name);
        status = "loaded";
      } else {
        this.failed.add(name);
      }
      if (typeof image.decode === "function") image.decode().catch(() => {});
      this.onAssetChange?.(name, this.readiness(), status);
    };
    image.onerror = () => {
      this.failed.add(name);
      this.images.delete(name);
      this.onAssetChange?.(name, this.readiness(), "error");
    };
    this.images.set(name, image);
    image.src = this.baseUrl + "assets/sprites/" + name + ".svg?v=" + SPRITE_ASSET_VERSION;
    return image;
  }

  draw(context, name, x, y, width, height, { alpha = 1, facing = 1, flip = false } = {}) {
    const image = this.get(name);
    if (!image || !image.complete || image.naturalWidth === 0) return false;
    context.save();
    const smoothSprite = name === "rosa" || name.startsWith("rosa-") || name.startsWith("violeta-");
    context.imageSmoothingEnabled = smoothSprite;
    context.globalAlpha *= alpha;
    x = Math.round(x);
    y = Math.round(y);
    width = Math.max(1, Math.round(width));
    height = Math.max(1, Math.round(height));
    if (facing < 0 || flip) {
      context.translate(x + width, y);
      context.scale(-1, 1);
      context.drawImage(image, 0, 0, width, height);
    } else {
      context.drawImage(image, x, y, width, height);
    }
    context.restore();
    return true;
  }



  drawRosaRig(context, width, height, actor, elapsed, pose, alpha) {
    // Juvenile rig: the reference silhouette is split into independently animated joints.
    const mirror = (actor?.facing ?? 1) < 0;
    const phase = phaseOf(actor, "rosa");
    const gait = Math.sin(elapsed * 8.2 * Math.PI + phase);
    const stride = pose === "rosa-run-a" ? 1 : pose === "rosa-run-b" ? -1 : Math.sign(gait || 1);
    const idle = Math.sin(elapsed * 2.35 + phase);

    let bodyAngle = idle * 0.015;
    let tailAngle = idle * 0.07;
    let backLegAngle = idle * 0.02;
    let frontLegAngle = -idle * 0.02;
    let backArmAngle = idle * 0.025;
    let frontArmAngle = -idle * 0.025;
    let headAngle = idle * 0.02;
    let jawAngle = 0;

    if (pose === "rosa-run-a" || pose === "rosa-run-b") {
      bodyAngle = -0.035;
      tailAngle = gait * 0.16;
      backLegAngle = stride * 0.43 + gait * 0.05;
      frontLegAngle = -stride * 0.4 - gait * 0.05;
      backArmAngle = -stride * 0.2;
      frontArmAngle = stride * 0.22;
      headAngle = -0.06;
      jawAngle = 0.06 + Math.max(0, gait) * 0.035;
    } else if (pose === "rosa-jump") {
      bodyAngle = -0.12;
      tailAngle = -0.18;
      backLegAngle = -0.34;
      frontLegAngle = 0.33;
      backArmAngle = -0.25;
      frontArmAngle = 0.3;
      headAngle = -0.13;
      jawAngle = 0.12;
    } else if (pose === "rosa-duck") {
      bodyAngle = -0.1;
      tailAngle = 0.18;
      backLegAngle = 0.34;
      frontLegAngle = 0.27;
      backArmAngle = 0.18;
      frontArmAngle = 0.26;
      headAngle = -0.2;
      jawAngle = 0;
    } else if (pose === "rosa-eat") {
      const bite = 0.5 + 0.5 * Math.sin(elapsed * 8.2 + phase);
      bodyAngle = -0.025;
      tailAngle = 0.08;
      backLegAngle = 0.035;
      frontLegAngle = -0.035;
      backArmAngle = 0.12;
      frontArmAngle = 0.16;
      headAngle = -0.16 - bite * 0.055;
      jawAngle = 0.055 + bite * 0.37;
    } else if (pose === "rosa-attack") {
      bodyAngle = 0.095;
      tailAngle = 0.06;
      backLegAngle = -0.14;
      frontLegAngle = 0.19;
      backArmAngle = 0.38;
      frontArmAngle = -0.28;
      headAngle = 0.2;
      jawAngle = 0.3;
    } else if (pose === "rosa-impact") {
      bodyAngle = -0.13;
      tailAngle = -0.16;
      backLegAngle = 0.2;
      frontLegAngle = -0.14;
      backArmAngle = -0.2;
      frontArmAngle = 0.2;
      headAngle = -0.15;
      jawAngle = 0.18;
    } else if (pose === "rosa-land") {
      bodyAngle = 0.05;
      tailAngle = 0.12;
      backLegAngle = 0.3;
      frontLegAngle = -0.22;
      backArmAngle = 0.15;
      frontArmAngle = 0.2;
      headAngle = 0.1;
      jawAngle = 0.05;
    } else if (pose === "rosa-recover") {
      bodyAngle = idle * 0.02;
      tailAngle = idle * 0.07;
      backLegAngle = idle * 0.025;
      frontLegAngle = -idle * 0.025;
      backArmAngle = -idle * 0.02;
      frontArmAngle = idle * 0.02;
      headAngle = idle * 0.025;
      jawAngle = 0;
    }

    context.save();
    if (mirror) {
      context.translate(width, 0);
      context.scale(-1, 1);
    }

    const hipX = 62 / 100 * width;
    const hipY = 36 / 61 * height;
    context.translate(hipX, hipY);
    context.rotate(bodyAngle);
    context.translate(-hipX, -hipY);

    const drawPart = (name, pivotX, pivotY, angle) => {
      const px = pivotX / 100 * width;
      const py = pivotY / 61 * height;
      context.save();
      context.translate(px, py);
      context.rotate(angle);
      const drawn = this.draw(context, name, -px, -py, width, height, { alpha });
      context.restore();
      return drawn;
    };

    const drawn = [
      drawPart("rosa-rig-tail", 54, 30, tailAngle),
      drawPart("rosa-rig-leg-back", 48, 40, backLegAngle),
      drawPart("rosa-rig-arm-back", 76, 34, backArmAngle),
      drawPart("rosa-rig-body", 62, 36, 0),
      drawPart("rosa-rig-leg-front", 65, 40, frontLegAngle),
      drawPart("rosa-rig-arm-front", 84, 34, frontArmAngle),
      drawPart("rosa-rig-head", 80, 22, headAngle),
      drawPart("rosa-rig-jaw", 95, 21, jawAngle)
    ].every(Boolean);

    context.restore();
    return drawn;
  }

  drawReferenceBrisa(context, x, y, width, height, actor, elapsed, alpha = 1, poseOverride = null) {
    const pose = poseOverride ?? (actor?.onGround === false && !actor.animationState
      ? "rosa-jump"
      : selectActorPose("brisa", actor, elapsed));
    const phase = phaseOf(actor, "rosa");
    const gait = Math.sin(elapsed * 8.2 * Math.PI + phase);
    let bob = 0;
    let tilt = 0;
    let scaleX = 1;
    let scaleY = 1;

    if (pose === "rosa-run-a" || pose === "rosa-run-b") {
      bob = Math.round(Math.abs(gait) * 1.5);
      tilt = -0.025;
      scaleX = 1.025;
      scaleY = 0.985;
    } else if (pose === "rosa-jump") {
      bob = -2;
      tilt = -0.045;
      scaleX = 1.035;
      scaleY = 0.96;
    } else if (pose === "rosa-duck") {
      scaleX = 1.045;
      scaleY = 0.88;
    } else if (pose === "rosa-attack") {
      tilt = 0.035;
      scaleX = 1.035;
    } else if (pose === "rosa-impact") {
      tilt = -0.055;
      bob = 1;
    } else if (pose === "rosa-land") {
      scaleX = 1.04;
      scaleY = 0.91;
      bob = 2;
    } else if (pose === "rosa-recover") {
      bob = Math.round(Math.max(0, Math.sin(elapsed * 15 + phase)) * 1.2);
    } else {
      bob = Math.round(Math.sin(elapsed * 2.35 + phase) * 0.7);
    }

    // Keep the juvenile proportions; this visual scale never changes collision geometry.
    const renderWidth = Math.max(1, Math.round(width * DINOSAUR_REFERENCE_SCALES.brisa * scaleX));
    const renderHeight = Math.max(1, Math.round(renderWidth * 61 / 100 * scaleY));
    const dx = Math.round(x + (width - renderWidth) / 2);
    const dy = Math.round(y + height - renderHeight + bob + 2);

    context.save();
    context.translate(dx + renderWidth / 2, dy + renderHeight / 2);
    context.rotate(tilt);
    context.translate(-renderWidth / 2, -renderHeight / 2);

    const rigReady = typeof this.get === "function" && ROSA_RIG_PARTS.every(name => {
      const image = this.get(name);
      return image?.complete && image.naturalWidth > 0;
    });
    const result = rigReady
      ? this.drawRosaRig(context, renderWidth, renderHeight, actor, elapsed, pose, alpha)
      : this.draw(context, pose, 0, 0, renderWidth, renderHeight, {
          alpha,
          facing: actor?.facing ?? 1
        });
    context.restore();
    return result;
  }

  drawVioletaRig(context, width, height, actor, elapsed, pose, alpha) {
    // Adult rig with articulated tail, limbs, neck/head and hinged jaw.
    const mirror = (actor?.facing ?? 1) < 0;
    const phase = phaseOf(actor, "violeta");
    const gait = Math.sin(elapsed * 10 * Math.PI + phase);
    const stride = pose === "violeta-run-a" ? 1 : pose === "violeta-run-b" ? -1 : Math.sign(gait || 1);
    const idle = Math.sin(elapsed * 2.15 + phase);

    let bodyAngle = idle * 0.012;
    let tailAngle = idle * 0.055;
    let backLegAngle = idle * 0.018;
    let frontLegAngle = -idle * 0.018;
    let backArmAngle = idle * 0.02;
    let frontArmAngle = -idle * 0.02;
    let headAngle = idle * 0.018;
    let jawAngle = 0;

    if (pose === "violeta-run-a" || pose === "violeta-run-b") {
      bodyAngle = -0.035;
      tailAngle = gait * 0.14;
      backLegAngle = stride * 0.42 + gait * 0.06;
      frontLegAngle = -stride * 0.4 - gait * 0.06;
      backArmAngle = -stride * 0.18;
      frontArmAngle = stride * 0.2;
      headAngle = -0.055;
      jawAngle = 0.07 + Math.max(0, gait) * 0.04;
    } else if (pose === "violeta-jump") {
      bodyAngle = -0.105;
      tailAngle = -0.18;
      backLegAngle = -0.32;
      frontLegAngle = 0.34;
      backArmAngle = -0.25;
      frontArmAngle = 0.31;
      headAngle = -0.12;
      jawAngle = 0.1;
    } else if (pose === "violeta-dash") {
      bodyAngle = 0.16;
      tailAngle = -0.2;
      backLegAngle = -0.25;
      frontLegAngle = 0.38;
      backArmAngle = -0.34;
      frontArmAngle = -0.24;
      headAngle = 0.17;
      jawAngle = 0.2;
    } else if (pose === "violeta-duck") {
      bodyAngle = -0.1;
      tailAngle = 0.17;
      backLegAngle = 0.36;
      frontLegAngle = 0.28;
      backArmAngle = 0.2;
      frontArmAngle = 0.28;
      headAngle = -0.22;
      jawAngle = 0;
    } else if (pose === "violeta-eat") {
      const bite = 0.5 + 0.5 * Math.sin(elapsed * 8.8 + phase);
      bodyAngle = -0.025;
      tailAngle = 0.075;
      backLegAngle = 0.02;
      frontLegAngle = -0.02;
      backArmAngle = 0.1;
      frontArmAngle = 0.14;
      headAngle = -0.14 - bite * 0.05;
      jawAngle = 0.055 + bite * 0.38;
    } else if (pose === "violeta-attack") {
      bodyAngle = 0.08;
      tailAngle = 0.08;
      backLegAngle = -0.12;
      frontLegAngle = 0.16;
      backArmAngle = 0.42;
      frontArmAngle = -0.22;
      headAngle = 0.22;
      jawAngle = 0.34;
    } else if (pose === "violeta-impact") {
      bodyAngle = -0.12;
      tailAngle = -0.17;
      backLegAngle = 0.2;
      frontLegAngle = -0.13;
      backArmAngle = -0.24;
      frontArmAngle = 0.2;
      headAngle = -0.14;
      jawAngle = 0.24;
    } else if (pose === "violeta-land") {
      bodyAngle = 0.045;
      tailAngle = 0.12;
      backLegAngle = 0.34;
      frontLegAngle = -0.23;
      backArmAngle = 0.16;
      frontArmAngle = 0.2;
      headAngle = 0.12;
      jawAngle = 0.07;
    } else if (pose === "violeta-recover") {
      bodyAngle = idle * 0.018;
      tailAngle = idle * 0.065;
      backLegAngle = idle * 0.025;
      frontLegAngle = -idle * 0.025;
      backArmAngle = -idle * 0.018;
      frontArmAngle = idle * 0.018;
      headAngle = idle * 0.02;
      jawAngle = 0;
    }

    context.save();
    if (mirror) {
      context.translate(width, 0);
      context.scale(-1, 1);
    }

    const hipX = 61 / 100 * width;
    const hipY = 30 / 46 * height;
    context.translate(hipX, hipY);
    context.rotate(bodyAngle);
    context.translate(-hipX, -hipY);

    const drawPart = (name, pivotX, pivotY, angle) => {
      const px = pivotX / 100 * width;
      const py = pivotY / 46 * height;
      context.save();
      context.translate(px, py);
      context.rotate(angle);
      const drawn = this.draw(context, name, -px, -py, width, height, { alpha });
      context.restore();
      return drawn;
    };

    const drawn = [
      drawPart("violeta-rig-tail", 62, 22, tailAngle),
      drawPart("violeta-rig-leg-back", 56, 31, backLegAngle),
      drawPart("violeta-rig-arm-back", 78, 25, backArmAngle),
      drawPart("violeta-rig-body", 61, 30, 0),
      drawPart("violeta-rig-leg-front", 68, 31, frontLegAngle),
      drawPart("violeta-rig-arm-front", 84, 25, frontArmAngle),
      drawPart("violeta-rig-head", 80, 17, headAngle),
      drawPart("violeta-rig-jaw", 96, 16, jawAngle)
    ].every(Boolean);

    context.restore();
    return drawn;
  }

  drawReferenceVioleta(context, x, y, width, height, actor, elapsed, alpha = 1, poseOverride = null) {
    const pose = poseOverride ?? selectActorPose("blue", actor, elapsed);
    const phase = phaseOf(actor, "violeta");
    const gait = Math.sin(elapsed * 10 * Math.PI + phase);
    let bob = 0;
    let tilt = 0;
    let scaleX = 1;
    let scaleY = 1;

    if (pose === "violeta-run-a" || pose === "violeta-run-b") {
      bob = Math.round(Math.abs(gait) * 1.7);
      tilt = -0.025;
      scaleX = 1.025;
      scaleY = 0.985;
    } else if (pose === "violeta-jump") {
      tilt = -0.045;
      bob = -1;
    } else if (pose === "violeta-dash") {
      tilt = 0.045;
      scaleX = 1.055;
      scaleY = 0.95;
    } else if (pose === "violeta-duck") {
      scaleX = 1.04;
      scaleY = 0.9;
    } else if (pose === "violeta-impact") {
      tilt = -0.06;
      bob = 1;
    } else if (pose === "violeta-land") {
      scaleX = 1.055;
      scaleY = 0.9;
      bob = 3;
    } else if (pose === "violeta-recover") {
      bob = Math.round(Math.max(0, Math.sin(elapsed * 16 + phase)) * 1.25);
    } else {
      bob = Math.round(Math.sin(elapsed * 2.15 + phase) * 0.75);
    }

    // Adult silhouette is enlarged without changing player collision dimensions.
    const renderWidth = Math.max(1, Math.round(width * DINOSAUR_REFERENCE_SCALES.violeta * scaleX));
    const renderHeight = Math.max(1, Math.round(renderWidth * 46 / 100 * scaleY));
    const dx = Math.round(x + (width - renderWidth) / 2);
    const dy = Math.round(y + height - renderHeight + bob + 4);

    context.save();
    context.translate(dx + renderWidth / 2, dy + renderHeight / 2);
    context.rotate(tilt);
    context.translate(-renderWidth / 2, -renderHeight / 2);

    const rigReady = typeof this.get === "function" && VIOLETA_RIG_PARTS.every(name => {
      const image = this.get(name);
      return image?.complete && image.naturalWidth > 0;
    });
    const result = rigReady
      ? this.drawVioletaRig(context, renderWidth, renderHeight, actor, elapsed, pose, alpha)
      : this.draw(context, pose, 0, 0, renderWidth, renderHeight, {
          alpha,
          facing: actor?.facing ?? 1
        });
    context.restore();
    return result;
  }

  drawVastiRig(context, width, height, actor, elapsed, pose, alpha) {
    // Vasti faces left in the original JPG. Mirror the complete rig for right-facing movement.
    // Idle / gait / bite timing is generated procedurally from the reference silhouette.
    // The jump pose is composed from the still JPG only; no jump GIF is used.
    const actorFacing = actor?.facing ?? 1;
    const mirror = actorFacing > 0;
    const phase = phaseOf(actor, "vasti");
    const gait = Math.sin(elapsed * 5.4 * Math.PI + phase);
    const idle = Math.sin(elapsed * 1.45 + phase);
    const stride = pose === "vasti-run-a" ? 1 : pose === "vasti-run-b" ? -1 : Math.sign(gait || 1);

    let bodyAngle = idle * 0.009;
    let tailAngle = idle * 0.045;
    let backLegAngle = idle * 0.012;
    let frontLegAngle = -idle * 0.012;
    let rearForelegAngle = idle * 0.018;
    let forelegAngle = -idle * 0.018;
    let headAngle = idle * 0.012;
    let jawAngle = Math.max(0, idle) * 0.018;

    if (pose === "vasti-run-a" || pose === "vasti-run-b") {
      // Heavy, low centre of gravity: the hind legs alternate while the tail counterbalances.
      bodyAngle = -0.018 - Math.abs(gait) * 0.012;
      tailAngle = -0.025 + gait * 0.105;
      backLegAngle = stride * 0.36 + gait * 0.045;
      frontLegAngle = -stride * 0.33 - gait * 0.04;
      rearForelegAngle = -stride * 0.12;
      forelegAngle = stride * 0.15;
      headAngle = 0.015 - gait * 0.018;
      jawAngle = 0.018 + Math.max(0, gait) * 0.025;
    } else if (pose === "vasti-jump") {
      // A compact, balanced hop from the still reference; no velociraptor jump animation is reused.
      bodyAngle = -0.055;
      tailAngle = -0.16;
      backLegAngle = -0.29;
      frontLegAngle = 0.26;
      rearForelegAngle = -0.2;
      forelegAngle = -0.14;
      headAngle = -0.025;
      jawAngle = 0.045;
    } else if (pose === "vasti-duck") {
      bodyAngle = 0.055;
      tailAngle = 0.12;
      backLegAngle = 0.15;
      frontLegAngle = 0.08;
      rearForelegAngle = 0.2;
      forelegAngle = 0.25;
      headAngle = 0.12;
      jawAngle = 0;
    } else if (pose === "vasti-eat") {
      const bite = 0.5 + 0.5 * Math.sin(elapsed * 6.8 + phase);
      bodyAngle = -0.018;
      tailAngle = -0.025 + idle * 0.025;
      backLegAngle = 0.015;
      frontLegAngle = -0.015;
      rearForelegAngle = 0.04;
      forelegAngle = -0.025;
      headAngle = -0.16 - bite * 0.07;
      jawAngle = 0.04 + bite * 0.4;
    } else if (pose === "vasti-attack") {
      // Bite / feeding action: head drives forward and the lower jaw opens on the follow-through.
      bodyAngle = -0.035;
      tailAngle = -0.055;
      backLegAngle = -0.035;
      frontLegAngle = 0.045;
      rearForelegAngle = -0.12;
      forelegAngle = -0.16;
      headAngle = -0.19;
      jawAngle = 0.42;
    } else if (pose === "vasti-stomp") {
      bodyAngle = 0.055;
      tailAngle = -0.095;
      backLegAngle = 0.22;
      frontLegAngle = -0.14;
      rearForelegAngle = 0.13;
      forelegAngle = 0.1;
      headAngle = 0.075;
      jawAngle = 0.07;
    } else if (pose === "vasti-slam") {
      bodyAngle = -0.105;
      tailAngle = 0.19;
      backLegAngle = -0.3;
      frontLegAngle = 0.24;
      rearForelegAngle = -0.23;
      forelegAngle = -0.2;
      headAngle = 0.14;
      jawAngle = 0.22;
    } else if (pose === "vasti-impact") {
      bodyAngle = -0.065;
      tailAngle = -0.15;
      backLegAngle = 0.12;
      frontLegAngle = -0.1;
      rearForelegAngle = 0.19;
      forelegAngle = 0.22;
      headAngle = -0.1;
      jawAngle = 0.25;
    } else if (pose === "vasti-land") {
      bodyAngle = 0.04;
      tailAngle = 0.09;
      backLegAngle = 0.19;
      frontLegAngle = -0.17;
      rearForelegAngle = 0.13;
      forelegAngle = 0.11;
      headAngle = 0.08;
      jawAngle = 0.06;
    } else if (pose === "vasti-recover") {
      bodyAngle = idle * 0.012;
      tailAngle = idle * 0.06;
      backLegAngle = idle * 0.018;
      frontLegAngle = -idle * 0.018;
      rearForelegAngle = -idle * 0.022;
      forelegAngle = idle * 0.022;
      headAngle = idle * 0.018;
      jawAngle = 0.018 + Math.max(0, idle) * 0.015;
    }

    context.save();
    if (mirror) {
      context.translate(width, 0);
      context.scale(-1, 1);
    }

    const drawPart = (name, pivotX, pivotY, angle) => {
      const px = pivotX / 256 * width;
      const py = pivotY / 120 * height;
      context.save();
      context.translate(px, py);
      context.rotate(angle);
      const drawn = this.draw(context, name, -px, -py, width, height, { alpha });
      context.restore();
      return drawn;
    };

    // Far-side appendages sit behind the torso; near-side joints, head and jaw are drawn last.
    const drawn = [
      drawPart("vasti-rig-tail", 139, 43, tailAngle),
      drawPart("vasti-rig-leg-back", 91, 74, backLegAngle),
      drawPart("vasti-rig-foreleg-back", 58, 54, rearForelegAngle),
      drawPart("vasti-rig-body", 0, 0, bodyAngle),
      drawPart("vasti-rig-leg-front", 112, 76, frontLegAngle),
      drawPart("vasti-rig-foreleg", 67, 55, forelegAngle),
      drawPart("vasti-rig-head", 38, 24, headAngle),
      drawPart("vasti-rig-jaw", 12, 31, jawAngle)
    ].every(Boolean);

    context.restore();
    return drawn;
  }

  drawVasti(context, x, y, width, height, actor, elapsed, alpha = 1, poseOverride = null) {
    // The source image is a long, low theropod. Preserve its aspect ratio and anchor it to the
    // existing player box; visual enlargement never changes physics or collision dimensions.
    const pose = poseOverride ?? selectActorPose("vasti", actor, elapsed);
    const phase = phaseOf(actor, "vasti");
    const fallbackPose = VASTI_POSE_SPRITES.has(pose) ? pose : "vasti-idle";
    let bob = 0;
    let offsetY = 0;
    let sx = 1;
    let sy = 1;
    let tilt = 0;

    if (pose === "vasti-run-a" || pose === "vasti-run-b") {
      const gait = Math.sin(elapsed * 5.4 * Math.PI + phase);
      bob = Math.round(Math.abs(gait) * 1.2);
      tilt = gait * 0.018;
      sx = 1 + Math.abs(gait) * 0.018;
      sy = 1 - Math.abs(gait) * 0.022;
    } else if (pose === "vasti-jump") {
      offsetY = -3;
      tilt = -0.035;
    } else if (pose === "vasti-stomp") {
      sy = 0.93;
      sx = 1.035;
      offsetY = 2;
    } else if (pose === "vasti-slam") {
      tilt = 0.04;
      sx = 1.055;
      sy = 0.9;
      offsetY = 3;
    } else if (pose === "vasti-attack") {
      tilt = -0.018;
    } else if (pose === "vasti-eat") {
      tilt = -0.012;
    } else if (pose === "vasti-impact") {
      tilt = -0.035;
      offsetY = 1;
    } else if (pose === "vasti-land") {
      sx = 1.035;
      sy = 0.92;
      offsetY = 3;
    } else if (pose === "vasti-recover") {
      bob = Math.round(Math.max(0, Math.sin(elapsed * 13 + phase)) * 1);
    } else if (pose === "vasti-idle") {
      const breath = Math.sin(elapsed * 1.8 + phase);
      bob = Math.round(breath * 0.65);
      sy = 1 + breath * 0.008;
    } else if (pose === "vasti-duck") {
      sy = 0.88;
      offsetY = 3;
    }

    const w = Math.max(1, Math.round(width * DINOSAUR_REFERENCE_SCALES.vastatosaurusRex * sx));
    const h = Math.max(1, Math.round(w * 120 / 256 * sy));
    const dx = Math.round(x + (width - w) / 2);
    const dy = Math.round(y + height - h + bob + offsetY);
    context.save();
    context.translate(dx + w / 2, dy + h / 2);
    context.rotate(tilt);
    context.translate(-w / 2, -h / 2);

    const rigReady = VASTI_RIG_PARTS.every(name => {
      const image = this.get(name);
      return image?.complete && image.naturalWidth > 0;
    });
    let result;
    if (rigReady) {
      result = this.drawVastiRig(context, w, h, actor, elapsed, pose, alpha);
    } else {
      const sourceFacing = (actor?.facing ?? 1) > 0 ? -1 : 1;
      result = this.draw(context, fallbackPose, 0, 0, w, h, { alpha, facing: sourceFacing });
    }
    context.restore();
    return result;
  }

  drawFerrucutusRig(context, width, height, actor, elapsed, pose, alpha) {
    // The source artwork faces left. Rescued Ferrucutus use +1 when moving right.
    const direction = actor?.direction ?? actor?.facing ?? -1;
    const mirror = direction > 0;
    const phase = phaseOf(actor, "ferrucutus");
    const gait = Math.sin(elapsed * 5.4 * Math.PI + phase);
    const idle = Math.sin(elapsed * 1.7 + phase);
    let tailAngle = idle * 0.04;
    let backLegAngle = idle * 0.018;
    let frontLegAngle = -idle * 0.018;
    let forelegAngle = idle * 0.025;
    let jawAngle = Math.max(0, idle) * 0.018;

    if (pose === "ferrucutus-step-a" || pose === "ferrucutus-step-b") {
      tailAngle = gait * 0.105;
      backLegAngle = gait * 0.29;
      frontLegAngle = -gait * 0.31;
      forelegAngle = -gait * 0.18;
      jawAngle = 0.025 + Math.max(0, gait) * 0.035;
    } else if (pose === "ferrucutus-attack") {
      tailAngle = -0.1; backLegAngle = -0.08; frontLegAngle = 0.08;
      forelegAngle = -0.22; jawAngle = 0.24;
    } else if (pose === "ferrucutus-impact") {
      tailAngle = 0.15; backLegAngle = 0.12; frontLegAngle = -0.1;
      forelegAngle = 0.17; jawAngle = 0.22;
    } else if (pose === "ferrucutus-land") {
      tailAngle = 0.08; backLegAngle = 0.16; frontLegAngle = -0.14;
      forelegAngle = 0.1; jawAngle = 0.04;
    } else if (pose === "ferrucutus-recover") {
      tailAngle = idle * 0.065; forelegAngle = -idle * 0.04; jawAngle = 0.025;
    } else if (pose === "ferrucutus-duck") {
      tailAngle = 0.11; backLegAngle = 0.1; frontLegAngle = 0.08;
      forelegAngle = 0.14; jawAngle = 0;
    }

    context.save();
    if (mirror) { context.translate(width, 0); context.scale(-1, 1); }
    const drawPart = (name, pivotX, pivotY, angle) => {
      const px = pivotX / 440 * width;
      const py = pivotY / 261 * height;
      context.save();
      context.translate(px, py);
      context.rotate(angle);
      const drawn = this.draw(context, name, -px, -py, width, height, { alpha });
      context.restore();
      return drawn;
    };
    const drawn = [
      drawPart("ferrucutus-rig-tail", 302, 146, tailAngle),
      drawPart("ferrucutus-rig-leg-back", 224, 158, backLegAngle),
      drawPart("ferrucutus-rig-leg-front", 145, 158, frontLegAngle),
      drawPart("ferrucutus-rig-body", 0, 0, 0),
      drawPart("ferrucutus-rig-foreleg", 158, 132, forelegAngle),
      drawPart("ferrucutus-rig-jaw", 91, 117, jawAngle)
    ].every(Boolean);
    context.restore();
    return drawn;
  }

  drawReferenceFerrucutus(context, x, y, width, height, actor, elapsed, alpha = 1, poseOverride = null) {
    const pose = poseOverride ?? selectActorPose("ferrucutus", actor, elapsed);
    const phase = phaseOf(actor, "ferrucutus");
    let bob = 0, tilt = 0, sx = 1, sy = 1;
    if (pose === "ferrucutus-step-a" || pose === "ferrucutus-step-b") {
      const gait = Math.sin(elapsed * 5.4 * Math.PI + phase);
      bob = Math.round(Math.abs(gait) * 1.5);
      tilt = gait * 0.025;
      sx = 1 + Math.abs(gait) * 0.018;
      sy = 1 - Math.abs(gait) * 0.025;
    } else if (pose === "ferrucutus-attack") {
      tilt = -0.035; sx = 1.025;
    } else if (pose === "ferrucutus-impact") {
      tilt = 0.04; bob = 1;
    } else if (pose === "ferrucutus-land") {
      sy = 0.94; bob = 2;
    } else if (pose === "ferrucutus-recover") {
      bob = Math.round(Math.max(0, Math.sin(elapsed * 13 + phase)) * 1.5);
    } else {
      const breath = Math.sin(elapsed * 1.7 + phase);
      bob = Math.round(breath * 0.8);
      sy = 1 + breath * 0.009;
    }
    const w = Math.max(1, Math.round(width * sx));
    const h = Math.max(1, Math.round(height * sy));
    const dx = Math.round(x + (width - w) / 2);
    const dy = Math.round(y + (height - h) / 2 + bob);
    context.save();
    context.translate(dx + w / 2, dy + h / 2);
    context.rotate(tilt);
    context.translate(-w / 2, -h / 2);
    const rigReady = FERRUCUTUS_RIG_PARTS.every(name => {
      const image = this.get(name);
      return image?.complete && image.naturalWidth > 0;
    });
    const result = rigReady
      ? this.drawFerrucutusRig(context, w, h, actor, elapsed, pose, alpha)
      : this.draw(context, "ferrucutus", 0, 0, w, h, {
          alpha,
          facing: (actor?.direction ?? actor?.facing ?? -1) > 0 ? -1 : 1
        });
    context.restore();
    return result;
  }


  drawIndominusRig(context, width, height, actor, elapsed, pose, alpha) {
    const direction = actor?.direction ?? -1;
    const mirror = direction > 0;
    const phase = phaseOf(actor, "indominus");
    const gait = Math.sin(elapsed * 4.4 * Math.PI + phase);
    const idle = Math.sin(elapsed * 1.35 + phase);
    const running = pose === "indominus-run-a" || pose === "indominus-run-b";
    const attacking = actor?.state === "telegraph" || actor?.state === "attacking" ||
      actor?.state === "attack" || pose === "indominus-attack";
    let tailAngle = idle * 0.025;
    let backLegAngle = idle * 0.012;
    let frontLegAngle = -idle * 0.012;
    let forelegAngle = idle * 0.018;
    let jawAngle = 0;

    if (running) {
      tailAngle = gait * 0.105;
      backLegAngle = gait * 0.3;
      frontLegAngle = -gait * 0.27;
      forelegAngle = -gait * 0.16;
      jawAngle = -0.3 - Math.max(0, gait) * 0.055;
    }
    if (attacking) {
      const attackName = actor?.attackName;
      tailAngle = attackName === "tail-sweep" ? 0.34 : -0.08;
      backLegAngle = attackName === "charge" ? -0.22 : 0.08;
      frontLegAngle = attackName === "charge" ? 0.2 : -0.07;
      forelegAngle = attackName === "charge" ? -0.2 : -0.12;
      jawAngle = attackName === "roar" ? -0.56 : attackName === "charge" ? -0.43 : -0.38;
    }
    if (pose === "indominus-impact") {
      tailAngle = -0.15; backLegAngle = 0.1; frontLegAngle = -0.1;
      forelegAngle = 0.15; jawAngle = 0;
    } else if (pose === "indominus-land") {
      tailAngle = 0.08; backLegAngle = 0.18; frontLegAngle = -0.16; jawAngle = 0;
    } else if (pose === "indominus-recover") {
      tailAngle = idle * 0.055; jawAngle = 0;
    }

    context.save();
    if (mirror) { context.translate(width, 0); context.scale(-1, 1); }
    const drawPart = (name, pivotX, pivotY, angle) => {
      const px = pivotX / 480 * width;
      const py = pivotY / 228 * height;
      context.save();
      context.translate(px, py);
      context.rotate(angle);
      const drawn = this.draw(context, name, -px, -py, width, height, { alpha });
      context.restore();
      return drawn;
    };
    const drawn = [
      drawPart("indominus-rig-tail", 292, 145, tailAngle),
      drawPart("indominus-rig-leg-back", 246, 158, backLegAngle),
      drawPart("indominus-rig-body", 0, 0, 0),
      drawPart("indominus-rig-leg-front", 191, 158, frontLegAngle),
      drawPart("indominus-rig-forelimb", 132, 130, forelegAngle),
      drawPart("indominus-rig-jaw", 103, 103, jawAngle)
    ].every(Boolean);
    context.restore();
    return drawn;
  }

  drawReferenceIndominus(context, x, y, width, height, actor, elapsed, alpha = 1, poseOverride = null, facing = null) {
    const pose = poseOverride ?? selectActorPose("indominus", actor, elapsed);
    const phase = phaseOf(actor, "indominus");
    const gait = Math.sin(elapsed * 4.4 * Math.PI + phase);
    let bob = 0, tilt = 0, sx = 1, sy = 1;
    if (pose === "indominus-run-a" || pose === "indominus-run-b") {
      bob = Math.round(Math.abs(gait) * 1.5);
      tilt = gait * 0.018;
      sx = 1 + Math.abs(gait) * 0.018;
      sy = 1 - Math.abs(gait) * 0.022;
    } else if (pose === "indominus-attack") {
      tilt = actor?.attackName === "charge" ? -0.045 : 0.018;
      sx = actor?.attackName === "charge" ? 1.035 : 1.01;
    } else if (pose === "indominus-impact") {
      tilt = -0.025; bob = 1;
    } else if (pose === "indominus-land") {
      sy = 0.94; bob = 2;
    } else if (pose === "indominus-recover") {
      bob = Math.round(Math.max(0, Math.sin(elapsed * 12 + phase)) * 1.25);
    } else {
      const breath = Math.sin(elapsed * 1.35 + phase);
      bob = Math.round(breath * 0.8);
      sy = 1 + breath * 0.007;
    }
    const w = Math.max(1, Math.round(width * sx));
    const h = Math.max(1, Math.round(height * sy));
    const dx = Math.round(x + (width - w) / 2);
    const dy = Math.round(y + (height - h) / 2 + bob);
    context.save();
    context.translate(dx + w / 2, dy + h / 2);
    context.rotate(tilt);
    context.translate(-w / 2, -h / 2);
    const rigReady = typeof this.get === "function" && INDOMINUS_RIG_PARTS.every(name => {
      const image = this.get(name);
      return image?.complete && image.naturalWidth > 0;
    });
    const result = rigReady
      ? this.drawIndominusRig(context, w, h, actor, elapsed, pose, alpha)
      : this.draw(context, pose, 0, 0, w, h, { alpha, facing: facing ?? (actor?.direction ?? -1) });
    context.restore();
    return result;
  }


  drawIndoraptorRig(context, width, height, actor, elapsed, pose, alpha) {
    const generationValue = actor?.generation ?? actor?.phase ?? 1;
    const generationTwo = generationValue === 2 || generationValue === "2" ||
      generationValue === "second" || generationValue === "second-generation";
    const prefix = generationTwo ? "indoraptor-gen2-rig" : "indoraptor-rig";
    const direction = actor?.direction ?? 1;
    const mirror = direction < 0;
    const phase = phaseOf(actor, "indoraptor");
    const gait = Math.sin(elapsed * 9.2 * Math.PI + phase);
    const running = pose === "indoraptor-run-a" || pose === "indoraptor-run-b";
    const defeated = pose === "indoraptor-defeated";
    const eating = pose === "indoraptor-eat";
    const attack = actor?.state === "telegraph" || actor?.state === "attacking" || pose === "indoraptor-attack";
    const attackName = actor?.attackName;

    let bodyTilt = 0.24;
    let tailAngle = -0.08 + Math.sin(elapsed * 7.1 + phase) * 0.012;
    let backLegAngle = 0.22;
    let frontLegAngle = -0.14;
    let backArmAngle = -0.18 + Math.sin(elapsed * 10.5 + phase) * 0.018;
    let frontArmAngle = 0.2 - Math.sin(elapsed * 11.3 + phase) * 0.02;
    let headAngle = 0.3 + Math.sin(elapsed * 8.2 + phase) * 0.018;
    let jawAngle = 0;

    if (running) {
      bodyTilt = 0.2 + Math.abs(gait) * 0.035;
      tailAngle = -0.06 + gait * 0.18;
      backLegAngle = gait * 0.54;
      frontLegAngle = -gait * 0.5;
      backArmAngle = -gait * 0.27;
      frontArmAngle = gait * 0.25;
      headAngle = 0.22;
      jawAngle = 0.23 + Math.max(0, gait) * 0.06;
    }
    if (pose === "indoraptor-jump") {
      bodyTilt = -0.12;
      tailAngle = -0.28;
      backLegAngle = -0.4;
      frontLegAngle = 0.34;
      backArmAngle = -0.42;
      frontArmAngle = 0.38;
      headAngle = -0.08;
      jawAngle = 0.28;
    } else if (eating) {
      const bite = 0.5 + 0.5 * Math.sin(elapsed * 10.4 + phase);
      bodyTilt = 0.14 + bite * 0.025;
      tailAngle = -0.035 + Math.sin(elapsed * 3.4 + phase) * 0.035;
      backLegAngle = 0.08;
      frontLegAngle = -0.06;
      backArmAngle = -0.04;
      frontArmAngle = 0.12;
      headAngle = 0.5 + bite * 0.13;
      jawAngle = 0.08 + bite * 0.48;
    } else if (attack) {
      if (attackName === "pounce") {
        bodyTilt = 0.48;
        tailAngle = -0.24;
        backLegAngle = -0.38;
        frontLegAngle = 0.32;
        backArmAngle = -0.62;
        frontArmAngle = -0.46;
        headAngle = 0.48;
        jawAngle = 0.42;
      } else {
        bodyTilt = 0.35;
        tailAngle = 0.16;
        backLegAngle = 0.16;
        frontLegAngle = -0.1;
        backArmAngle = 0.62;
        frontArmAngle = -0.18;
        headAngle = 0.4;
        jawAngle = 0.34;
      }
    }

    if (pose === "indoraptor-impact") {
      bodyTilt = -0.12; tailAngle = 0.2; backLegAngle = 0.12; frontLegAngle = -0.08;
      backArmAngle = 0.24; frontArmAngle = -0.2; headAngle = -0.2; jawAngle = 0.12;
    } else if (pose === "indoraptor-recover") {
      bodyTilt = 0.18; tailAngle = -0.04; backLegAngle = 0.16; frontLegAngle = -0.1;
      backArmAngle = -0.1; frontArmAngle = 0.13; headAngle = 0.25; jawAngle = 0;
    } else if (pose === "indoraptor-land") {
      bodyTilt = 0.3; tailAngle = 0.12; backLegAngle = 0.28; frontLegAngle = -0.2;
      backArmAngle = -0.18; frontArmAngle = 0.2; headAngle = 0.35; jawAngle = 0.08;
    } else if (defeated) {
      bodyTilt = 1.08;
      tailAngle = 0.42;
      backLegAngle = -0.58;
      frontLegAngle = 0.5;
      backArmAngle = 0.52;
      frontArmAngle = -0.48;
      headAngle = 0.5;
      jawAngle = 0;
    }

    context.save();
    if (mirror) { context.translate(width, 0); context.scale(-1, 1); }
    const hipX = width * 0.57;
    const hipY = height * 0.57;
    context.translate(hipX, hipY);
    context.rotate(bodyTilt);
    context.translate(-hipX, -hipY);
    if (defeated) {
      context.translate(0, height * 0.12);
      context.scale(1.02, 0.84);
      context.translate(0, -height * 0.12);
    }
    const drawPart = (part, pivotX, pivotY, angle) => {
      const px = pivotX / 910 * width;
      const py = pivotY / 400 * height;
      context.save();
      context.translate(px, py);
      context.rotate(angle);
      const drawn = this.draw(context, prefix + "-" + part, -px, -py, width, height, { alpha });
      context.restore();
      return drawn;
    };
    const drawn = [
      drawPart("tail", 390, 155, tailAngle),
      drawPart("leg-back", 455, 235, backLegAngle),
      drawPart("arm-back", 615, 165, backArmAngle),
      drawPart("body", 0, 0, 0),
      drawPart("leg-front", 620, 238, frontLegAngle),
      drawPart("arm-front", 700, 176, frontArmAngle),
      drawPart("head", 720, 108, headAngle),
      drawPart("jaw", 850, 102, jawAngle)
    ].every(Boolean);
    context.restore();
    return drawn;
  }

  drawReferenceIndoraptor(context, x, y, width, height, actor, elapsed, alpha = 1, poseOverride = null, facing = null) {
    const pose = poseOverride ?? selectActorPose("indoraptor", actor, elapsed);
    const phase = phaseOf(actor, "indoraptor");
    const generationValue = actor?.generation ?? actor?.phase ?? 1;
    const generationTwo = generationValue === 2 || generationValue === "2" ||
      generationValue === "second" || generationValue === "second-generation";
    const generation = generationTwo ? 2 : 1;
    const gait = Math.sin(elapsed * 9.2 * Math.PI + phase);
    let bob = 0, tilt = 0, sx = 1;
    if (pose === "indoraptor-run-a" || pose === "indoraptor-run-b") {
      bob = Math.round(Math.abs(gait) * 2);
      tilt = gait * 0.018;
      sx = 1 + Math.abs(gait) * 0.018;
    } else if (pose === "indoraptor-attack" || pose === "indoraptor-eat") {
      tilt = pose === "indoraptor-eat" ? 0.012 : actor?.attackName === "pounce" ? -0.025 : 0.02;
      sx = pose === "indoraptor-eat" ? 1.01 : actor?.attackName === "pounce" ? 1.035 : 1.01;
    } else if (pose === "indoraptor-jump") {
      tilt = -0.06; bob = -7; sx = 1.025;
    } else if (pose === "indoraptor-impact") {
      tilt = -0.035; bob = 1;
    } else if (pose === "indoraptor-recover") {
      bob = Math.round(Math.max(0, Math.sin(elapsed * 14 + phase)) * 1.5);
    } else if (pose === "indoraptor-defeated") {
      tilt = 0.08; bob = 4;
    } else {
      const breath = Math.sin(elapsed * 1.65 + phase);
      bob = Math.round(breath * 0.75);
    }
    const w = Math.max(1, Math.round(width * 1.78 * sx));
    const h = Math.max(1, Math.round(w * 400 / 910));
    const dx = Math.round(x + (width - w) / 2);
    const dy = Math.round(y + height - h + bob);
    context.save();
    context.translate(dx + w / 2, dy + h / 2);
    context.rotate(tilt);
    context.translate(-w / 2, -h / 2);
    const rigParts = generation === 2 ? INDORAPTOR_GEN2_RIG_PARTS : INDORAPTOR_RIG_PARTS;
    const rigReady = rigParts.every(name => {
      const image = this.get(name);
      return image?.complete && image.naturalWidth > 0;
    });
    const fallbackPose = generation === 2 ? pose.replace(/^indoraptor/, "indoraptor-gen2") : pose;
    const result = rigReady
      ? this.drawIndoraptorRig(context, w, h, { ...actor, direction: actor?.direction ?? facing ?? 1, generation }, elapsed, pose, alpha)
      : this.draw(context, fallbackPose, 0, 0, w, h, { alpha, facing: facing ?? (actor?.direction ?? 1) });
    context.restore();
    return result;
  }

  drawAnimatedReference(context, file, x, y, width, height, actor = {}, elapsed = 0, options = {}) {
    const animation = this.animatedReferences.get(file);
    if (!animation?.frames?.length) { this.loadAnimatedReference(file); return false; }
    const frame = animation.frames[getAnimatedFrameIndex(animation.frames, Math.max(0, elapsed) * 1000)];
    if (!frame?.image) return false;
    const sw = Number(animation.width) || frame.image.width || width, sh = Number(animation.height) || frame.image.height || height;
    const scale = Math.min(width / sw, height / sh), dw = Math.max(1, Math.round(sw * scale)), dh = Math.max(1, Math.round(sh * scale));
    const dx = Math.round(x + (width - dw) / 2), padding = Number(frame.bottomPadding ?? animation.bottomPadding) || 0;
    const dy = Math.round(y + height - dh + dh * padding / sh), facing = options.facing ?? actor?.facing ?? actor?.direction ?? 1;
    context.save(); context.globalAlpha *= options.alpha ?? 1; context.imageSmoothingEnabled = false;
    if (Math.sign(facing || 1) < 0) { context.translate(dx + dw, 0); context.scale(-1, 1); drawSpriteImage(context, frame.image, 0, dy, dw, dh); }
    else drawSpriteImage(context, frame.image, dx, dy, dw, dh);
    context.restore(); return true;
  }

  drawTacticalEnemy(context, x, y, width, height, actor = {}, elapsed = 0, options = {}) {
    const image = this.getReferenceImage("tactical-enemies.png");
    if (!image?.complete || !image.naturalWidth) return false;
    const identity = String(actor?.id ?? actor?.squadIndex ?? actor?.name ?? "enemy"); let hash = 0;
    for (const char of identity) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    const sx = 8 + (hash % 2) * 24;
    const motionFrame = Math.floor(Math.max(0, elapsed) * (actor?.state === "attack" ? 11 : 7) + hash) % 8;
    const sy = 76 + motionFrame * 26, facing = options.facing ?? actor?.direction ?? 1;
    context.save(); context.globalAlpha *= options.alpha ?? 1; context.imageSmoothingEnabled = false;
    if (Math.sign(facing || 1) < 0) { context.translate(x + width, 0); context.scale(-1, 1); context.drawImage(image, sx, sy, 19, 23, 0, y, width, height); }
    else context.drawImage(image, sx, sy, 19, 23, x, y, width, height);
    context.restore(); return true;
  }

  drawTacticalEffect(context, type, x, y, elapsed = 0, options = {}) {
    const frames = TACTICAL_COMBAT_EFFECT_SPRITES[type];
    if (!frames || !Number.isFinite(x) || !Number.isFinite(y)) return false;

    const image = this.getReferenceImage("tactical-enemies.png");
    if (!image?.complete || !image.naturalWidth) return false;

    const frameRate = type === "muzzle" ? 34 : 22;
    const frame = frames[Math.floor(Math.max(0, elapsed) * frameRate) % frames.length];
    const defaultWidth = type === "muzzle" ? 34 : 44;
    const drawWidth = Math.max(1, Math.round(Number(options.size) || defaultWidth));
    const drawHeight = Math.max(1, Math.round(drawWidth * frame.height / frame.width));
    const alpha = Math.max(0, Math.min(1, Number(options.alpha ?? 1)));
    const facing = Math.sign(options.facing ?? 1) || 1;

    context.save();
    context.globalAlpha *= alpha;
    context.imageSmoothingEnabled = false;
    context.translate(Math.round(x), Math.round(y));
    context.scale(facing < 0 ? -1 : 1, 1);
    context.drawImage(
      image,
      frame.x, frame.y, frame.width, frame.height,
      -Math.round(drawWidth / 2), -Math.round(drawHeight / 2),
      drawWidth, drawHeight
    );
    context.restore();
    return true;
  }

  drawAnimatedBrontosaurus(context, x, y, width, height, actor = {}, elapsed = 0, options = {}) {
    const file = selectBrontosaurusAnimation(actor);
    const animation = this.animatedReferences.get(file);
    if (!animation?.frames?.length) {
      this.loadAnimatedReference(file);
      return false;
    }
    const frame = animation.frames[getAnimatedFrameIndex(animation.frames, Math.max(0, elapsed) * 1000)];
    if (!frame?.image) return false;
    const definition = BRONTOSAURUS_ANIMATION_ASSETS;
    const drawWidth = Math.max(1, Math.round(width * definition.scale));
    const drawHeight = Math.max(1, Math.round(drawWidth * animation.height / animation.width));
    const bottomPadding = frame.bottomPadding ?? animation.bottomPadding ?? 0;
    const scaledBottomPadding = drawHeight * bottomPadding / animation.height;
    const facing = options.facing ?? actor?.facing ?? actor?.direction ?? 1;
    const flip = Math.sign(facing || 1) !== definition.sourceFacing;
    context.save();
    context.globalAlpha *= options.alpha ?? 1;
    context.imageSmoothingEnabled = false;
    context.translate(Math.round(x + width / 2), Math.round(y + height - drawHeight + scaledBottomPadding));
    context.scale(flip ? -1 : 1, 1);
    drawSpriteImage(context, frame.image, -drawWidth / 2, 0, drawWidth, drawHeight);
    context.restore();
    return true;
  }

  drawAnimated(context, character, x, y, width, height, actor, elapsed, options = {}) {
    if (character === "hunter") {
      const identity = String(actor?.id ?? actor?.squadIndex ?? "hunter");
      let hash = 0;
      for (const char of identity) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
      if ((actor?.useTacticalSprite ?? hash % 3 === 0) &&
          this.drawTacticalEnemy(context, x, y, width, height, actor ?? {}, elapsed, options)) return true;
      const humanFile = selectCampaignHunterAnimation(actor, options.allowHumanV2);
      return this.drawAnimatedReference(context, humanFile, x, y, width, height, actor ?? {}, elapsed, options);
    }
    if (character === "hunter-tactical") return this.drawTacticalEnemy(context, x, y, width, height, actor ?? {}, elapsed, options);
    if (character === "blocky") return this.drawAnimatedReference(context, "blocky.gif", x, y, width, height, actor ?? {}, 0, options);
    if (character === "human-v1" || character === "human-v2") return this.drawAnimatedReference(context, character + ".gif", x, y, width, height, actor ?? {}, elapsed, options);
    if (character === "ligocristus") {
      return this.drawAnimatedLigocristus(context, x, y, width, height, actor ?? {}, elapsed, options);
    }
    if (JUVENILE_ANIMATED_CHARACTERS[character]) {
      return this.drawAnimatedJuvenile(context, character, x, y, width, height, actor ?? {}, elapsed, options);
    }
    if (character === "brontosaurus") {
      return this.drawAnimatedBrontosaurus(context, x, y, width, height, actor ?? {}, elapsed, options);
    }
    if (VENATOSAURUS_ANIMATION_ASSETS[character]) {
      return this.drawAnimatedVenatosaurus(context, character, x, y, width, height, actor ?? {}, elapsed, options);
    }
    if (this.drawReferencePng(context, character, x, y, width, height, actor ?? {}, elapsed, options)) return true;

    // Static PNG references and animated GIF references are registered separately.
    // Avoid requesting unavailable legacy SVGs while an image asset is loading.
    if (character === "hunter" || REFERENCE_PNG_CHARACTERS[character]) return false;

    if (character === "vasti" && this.drawVasti(context, x, y, width, height, actor, elapsed, options.alpha ?? 1)) return true;
    if (character === "ferrucutus" && this.drawReferenceFerrucutus(context, x, y, width, height, actor, elapsed, options.alpha ?? 1)) return true;
    if (character === "indominus" && this.drawReferenceIndominus(context, x, y, width, height, actor, elapsed, options.alpha ?? 1, null, options.facing)) return true;
    if (character === "indoraptor" && this.drawReferenceIndoraptor(context, x, y, width, height, actor, elapsed, options.alpha ?? 1, null, options.facing)) return true;
    const pose = selectActorPose(character, actor, elapsed);
    const profile = ACTOR_ANIMATION_PROFILES[character];
    const phase = phaseOf(actor, character);
    let offset = 0;
    if (profile?.frames?.includes(pose)) {
      const cadence = (profile.fps ?? 8) * Math.PI;
      offset = Math.round(Math.abs(Math.sin(elapsed * cadence + phase)) * 2);
    } else if (pose.endsWith("-attack")) {
      offset = Math.round(Math.sin(elapsed * 26 + phase));
    } else if (pose.endsWith("-impact")) {
      offset = Math.round(Math.sin(elapsed * 31 + phase));
    } else if (pose.endsWith("-land")) {
      offset = 1;
    } else if (pose === profile?.base) {
      offset = Math.round(Math.sin(elapsed * 2.3 + phase));
    }
    return this.draw(context, pose, x, y + offset, width, height, options);
  }

  drawDinosaur(context, kind, x, y, width, height, player, elapsed, alpha = 1) {
    const isBrisa = kind === "brisa" || kind === "rosa";
    const character = kind === "blue" ? "blue" : isBrisa ? "brisa" : "vasti";
    const prefix = kind === "blue" ? "violeta" : isBrisa ? "rosa" : "vasti";
    let pose = selectActorPose(character, player, elapsed);
    if (player?.dashTimer > 0 && kind === "blue") pose = "violeta-dash";
    else if (player?.dashTimer > 0 && isBrisa) pose = "rosa-attack";
    else if (player && !player.onGround && !player.animationState) pose = prefix + "-jump";
    else if (player && Math.abs(player.vx) > 30 && !player.animationState) {
      const fps = kind === "vasti" ? 5.4 : Math.max(8, Math.min(13, Math.abs(player.vx) / 27));
      pose = prefix + "-run-" + (Math.floor(elapsed * fps + phaseOf(player, kind)) % 2 === 0 ? "a" : "b");
    } else if (!player?.animationState) {
      pose = prefix + "-idle";
    }

    const naturalHeight = height;
    const drawY = y;
    if (this.drawAnimatedJuvenile(context, character, x, drawY, width, naturalHeight, player ?? {}, elapsed, {
      alpha,
      facing: player?.facing ?? 1
    })) return true;
    if (this.drawReferencePng(context, character, x, drawY, width, naturalHeight, player ?? {}, elapsed, {
      alpha,
      facing: player?.facing ?? 1
    }, pose)) return true;

    // Player characters use the committed PNG references. main.js draws the
    // native pixel-Canvas fallback until the corresponding reference image loads.
    return false;
  }

  readiness() {
    return {
      ready: this.referenceLoaded.size + this.loaded.size + this.animatedReferences.size,
      total: REFERENCE_PRELOAD_FILES.length + CAMPAIGN_ANIMATED_REFERENCE_FILES.length,
      failed: this.referenceFailed.size + this.failed.size + (this.animatedReferenceFailed?.size ?? 0)
    };
  }
}
