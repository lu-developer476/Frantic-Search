import { ACTOR_ANIMATION_PROFILES, selectActorPose } from "./AnimationProfiles.js";

export const REFERENCE_PNG_CHARACTERS = Object.freeze({
  blue: { file: "adult-velociraptor-nublarensis.png", sourceFacing: 1, scale: 1.42 },
  beta: { file: "juvenile-velociraptor-nublarensis.png", sourceFacing: 1, scale: 1.42 },
  rosa: { file: "juvenile-velociraptor-nublarensis.png", sourceFacing: 1, scale: 1.42 },
  vasti: { file: "vastatosaurus-rex.png", sourceFacing: -1, scale: 1.18 },
  ferrucutus: { file: "ferrucutus-cerastes.png", sourceFacing: -1, scale: 1.08 },
  indoraptor: { first: "indoraptor-first-generation.png", second: "indoraptor-second-generation.png", sourceFacing: 1, scale: 1.34 },
  indominus: { first: "indominus-rex-first-generation.png", second: "indominus-rex-second-generation.png", sourceFacing: -1, scale: 1.18 },
  "indominus-variant": { file: "indominus-rex-second-generation-variant.png", sourceFacing: -1, scale: 1.18 },
  brontosaurus: { file: "brontosaurus-excelsus-baxteri.png", sourceFacing: 1, scale: 1.18 },
  ligocristus: { file: "ligocristus-innocens.png", sourceFacing: -1, scale: 1.18 },
  stegoceratops: { file: "stegoceratops.png", sourceFacing: -1, scale: 1.18 },
  "venatosaurus-impavidus": { file: "venatosaurus-impavidus.png", sourceFacing: -1, scale: 1.18 },
  "venatosaurus-saevidicus": { file: "venatosaurus-saevidicus.png", sourceFacing: 1, scale: 1.18 }
});

const REFERENCE_PRELOAD_FILES = [
  "adult-velociraptor-nublarensis.png",
  "juvenile-velociraptor-nublarensis.png",
  "vastatosaurus-rex.png",
  "ferrucutus-cerastes.png",
  "indoraptor-first-generation.png",
  "indoraptor-second-generation.png",
  "indominus-rex-first-generation.png",
  "indominus-rex-second-generation.png"
];

const SPRITE_ASSET_VERSION = "20261113-indoraptor-dual-generation-eating-1";
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
    this.onAssetChange = typeof onAssetChange === "function" ? onAssetChange : null;
    this.preload();
  }

  preload() {
    for (const file of REFERENCE_PRELOAD_FILES) this.getReferenceImage(file);
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
      if (image.naturalWidth > 0) {
        this.referenceLoaded.add(file);
        this.referenceBounds.set(file, this.measureOpaqueBounds(image));
      } else {
        this.referenceFailed.add(file);
      }
      if (typeof image.decode === "function") image.decode().catch(() => {});
      this.onAssetChange?.(file, this.readiness());
    };
    image.onerror = () => {
      this.referenceFailed.add(file);
      this.referenceImages.delete(file);
      this.onAssetChange?.(file, this.readiness());
    };
    this.referenceImages.set(file, image);
    image.src = this.baseUrl + "references/" + file + "?v=" + SPRITE_ASSET_VERSION;
    return image;
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

    const pose = poseOverride ?? selectActorPose(character, actor, elapsed);
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
    context.drawImage(
      image,
      bounds.x, bounds.y, bounds.width, bounds.height,
      -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
    );
    context.restore();
    return true;
  }

  get(name) {
    if (this.images.has(name) || this.failed.has(name)) return this.images.get(name) ?? null;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (image.naturalWidth > 0) {
        this.loaded.add(name);
        this.failed.delete(name);
      } else {
        this.failed.add(name);
      }
      if (typeof image.decode === "function") image.decode().catch(() => {});
      this.onAssetChange?.(name, this.readiness());
    };
    image.onerror = () => {
      this.failed.add(name);
      this.images.delete(name);
      this.onAssetChange?.(name, this.readiness());
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

  drawReferenceRosa(context, x, y, width, height, actor, elapsed, alpha = 1, poseOverride = null) {
    const pose = poseOverride ?? (actor?.onGround === false && !actor.animationState
      ? "rosa-jump"
      : selectActorPose("beta", actor, elapsed));
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
    const renderWidth = Math.max(1, Math.round(width * 1.42 * scaleX));
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
    const renderWidth = Math.max(1, Math.round(width * 1.42 * scaleX));
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
    // Idle / gait / bite timing is adapted from the supplied idle, walk and eat GIFs.
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

    const w = Math.max(1, Math.round(width * 1.18 * sx));
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

  drawAnimated(context, character, x, y, width, height, actor, elapsed, options = {}) {
    if (this.drawReferencePng(context, character, x, y, width, height, actor ?? {}, elapsed, options)) return true;
    if (character === "beta" && this.drawReferenceRosa(context, x, y, width, height, actor, elapsed, options.alpha ?? 1)) return true;
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
    const character = kind === "blue" ? "blue" : kind === "rosa" ? "beta" : "vasti";
    const prefix = kind === "blue" ? "violeta" : kind === "rosa" ? "rosa" : "vasti";
    let pose = selectActorPose(character, player, elapsed);
    if (player?.dashTimer > 0 && kind === "blue") pose = "violeta-dash";
    else if (player?.dashTimer > 0 && kind === "rosa") pose = "rosa-attack";
    else if (player?.duck) pose = prefix + "-duck";
    else if (player && !player.onGround && !player.animationState) pose = prefix + "-jump";
    else if (player && Math.abs(player.vx) > 30 && !player.animationState) {
      const fps = kind === "vasti" ? 5.4 : Math.max(8, Math.min(13, Math.abs(player.vx) / 27));
      pose = prefix + "-run-" + (Math.floor(elapsed * fps + phaseOf(player, kind)) % 2 === 0 ? "a" : "b");
    } else if (!player?.animationState) {
      pose = prefix + "-idle";
    }

    const crouching = player?.duck === true && pose === prefix + "-duck";
    const naturalHeight = crouching ? (player?.normalHeight ?? height) : height;
    const drawY = crouching ? y + height - naturalHeight : y;
    if (this.drawReferencePng(context, character, x, drawY, width, naturalHeight, player ?? {}, elapsed, {
      alpha,
      facing: player?.facing ?? 1
    }, pose)) return true;
    if (kind === "blue" && this.drawReferenceVioleta(context, x, drawY, width, naturalHeight, player ?? {}, elapsed, alpha, pose)) return true;
    if (kind === "rosa" && this.drawReferenceRosa(context, x, drawY, width, naturalHeight, player ?? {}, elapsed, alpha, pose)) return true;
    if (kind !== "blue" && kind !== "rosa" && this.drawVasti(context, x, y, width, height, player ?? {}, elapsed, alpha, pose)) return true;
    return this.draw(context, pose, x, drawY, width, naturalHeight, { alpha, facing: player?.facing ?? 1 });
  }

  readiness() {
    return {
      ready: this.referenceLoaded.size + this.loaded.size,
      total: Object.keys(REFERENCE_PNG_CHARACTERS).length + SPRITES.length,
      failed: this.referenceFailed.size + this.failed.size
    };
  }
}
