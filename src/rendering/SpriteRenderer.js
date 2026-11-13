import { ACTOR_ANIMATION_PROFILES, selectActorPose } from "./AnimationProfiles.js";

const SPRITE_ASSET_VERSION = "20261112-rosa-articulated-rig-1";
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
  "vasti-rig-foreleg",
  "vasti-rig-jaw"
];
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
const BASE = [
  "violeta-idle","violeta-run-a","violeta-run-b","violeta-jump","violeta-dash","violeta-duck",
  "vasti",
  "rosa","rosa-run-a","rosa-run-b","rosa-duck",
  "ferrucutus","ferrucutus-step-a","ferrucutus-step-b","ferrucutus-duck",
  "hunter","hunter-run-a","hunter-run-b","hunter-duck",
  "indoraptor","indoraptor-run-a","indoraptor-run-b","indoraptor-duck",
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
  ...["violeta","rosa","ferrucutus","hunter","indoraptor","indominus"]
    .flatMap(name => ["attack","land","impact","recover"].map(pose => name + "-" + pose))
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
    this.onAssetChange = typeof onAssetChange === "function" ? onAssetChange : null;
    this.preload();
  }

  preload() {
    for (const name of SPRITES) this.get(name);
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
    // The juvenile reference faces right; Beta.facing changes with player-relative movement.
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
    } else if (pose === "rosa-duck") {
      bodyAngle = -0.1;
      tailAngle = 0.18;
      backLegAngle = 0.34;
      frontLegAngle = 0.27;
      backArmAngle = 0.18;
      frontArmAngle = 0.26;
      headAngle = -0.2;
      jawAngle = 0;
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

    const hipX = (128 - 88) / 84 * width;
    const hipY = (88 - 43) / 69 * height;
    context.translate(hipX, hipY);
    context.rotate(bodyAngle);
    context.translate(-hipX, -hipY);

    const drawPart = (name, pivotX, pivotY, angle) => {
      const px = (pivotX - 88) / 84 * width;
      const py = (pivotY - 43) / 69 * height;
      context.save();
      context.translate(px, py);
      context.rotate(angle);
      const drawn = this.draw(context, name, -px, -py, width, height, { alpha });
      context.restore();
      return drawn;
    };

    // Back-side pieces first, then torso, near-side limbs, head and hinged lower jaw.
    const drawn = [
      drawPart("rosa-rig-tail", 126, 78, tailAngle),
      drawPart("rosa-rig-leg-back", 121, 87, backLegAngle),
      drawPart("rosa-rig-arm-back", 135, 75, backArmAngle),
      drawPart("rosa-rig-body", 88, 43, 0),
      drawPart("rosa-rig-leg-front", 137, 88, frontLegAngle),
      drawPart("rosa-rig-arm-front", 145, 75, frontArmAngle),
      drawPart("rosa-rig-head", 151, 63, headAngle),
      drawPart("rosa-rig-jaw", 160, 66, jawAngle)
    ].every(Boolean);

    context.restore();
    return drawn;
  }

  drawReferenceRosa(context, x, y, width, height, actor, elapsed, alpha = 1, poseOverride = null) {
    const pose = poseOverride ?? selectActorPose("beta", actor, elapsed);
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
    } else if (pose === "rosa-duck") {
      scaleX = 1.045;
      scaleY = 0.88;
      bob = 0;
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

    // Rosa was only 48x48 in the world. Enlarge its art, not its collision/companion physics.
    const renderWidth = Math.max(1, Math.round(width * 1.42 * scaleX));
    const renderHeight = Math.max(1, Math.round(renderWidth * 69 / 84 * scaleY));
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
    // The supplied adult sheet faces right. Player.facing already reflects the arrow-key intent.
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

    const hipX = (128 - 88) / 80 * width;
    const hipY = (89 - 47) / 69 * height;
    context.translate(hipX, hipY);
    context.rotate(bodyAngle);
    context.translate(-hipX, -hipY);

    const drawPart = (name, pivotX, pivotY, angle) => {
      const px = (pivotX - 88) / 80 * width;
      const py = (pivotY - 47) / 69 * height;
      context.save();
      context.translate(px, py);
      context.rotate(angle);
      const drawn = this.draw(context, name, -px, -py, width, height, { alpha });
      context.restore();
      return drawn;
    };

    const drawn = [
      drawPart("violeta-rig-tail", 131, 80, tailAngle),
      drawPart("violeta-rig-leg-back", 119, 91, backLegAngle),
      drawPart("violeta-rig-arm-back", 136, 78, backArmAngle),
      drawPart("violeta-rig-body", 88, 47, 0),
      drawPart("violeta-rig-leg-front", 135, 91, frontLegAngle),
      drawPart("violeta-rig-arm-front", 146, 79, frontArmAngle),
      drawPart("violeta-rig-head", 145, 68, headAngle),
      drawPart("violeta-rig-jaw", 162, 71, jawAngle)
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
      bob = 0;
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

    // The old player box made Violeta too small. Expand the sprite only; keep physics dimensions unchanged.
    const renderWidth = Math.max(1, Math.round(width * 1.22 * scaleX));
    const renderHeight = Math.max(1, Math.round(renderWidth * 69 / 80 * scaleY));
    const dx = Math.round(x + (width - renderWidth) / 2);
    const dy = Math.round(y + height - renderHeight + bob + 4);
    context.save();
    context.translate(dx + renderWidth / 2, dy + renderHeight / 2);
    context.rotate(tilt);
    context.translate(-renderWidth / 2, -renderHeight / 2);

    const result = this.draw(context, pose, 0, 0, renderWidth, renderHeight, {
      alpha,
      facing: actor?.facing ?? 1
    });
    context.restore();
    return result;
  }

  drawVastiRig(context, width, height, actor, elapsed, pose, alpha) {
    // The reference artwork points left. Player.facing uses +1 for right and -1 for left,
    // so mirror the complete rig only when the player is aiming/moving to the right.
    const actorFacing = actor?.facing ?? 1;
    const mirror = actorFacing > 0;
    const phase = phaseOf(actor, "vasti");
    const gait = Math.sin(elapsed * 9.2 * Math.PI + phase);
    const idle = Math.sin(elapsed * 1.8 + phase);

    let tailAngle = idle * 0.035;
    let backLegAngle = Math.sin(elapsed * 2.5 + phase) * 0.018;
    let frontLegAngle = -backLegAngle;
    let forelegAngle = Math.sin(elapsed * 2.8 + phase) * 0.025;
    let jawAngle = Math.max(0, Math.sin(elapsed * 2.3 + phase)) * 0.025;

    if (pose === "vasti-run-a" || pose === "vasti-run-b") {
      tailAngle = gait * 0.115;
      backLegAngle = gait * 0.34;
      frontLegAngle = -gait * 0.31;
      forelegAngle = -gait * 0.19;
      jawAngle = 0.025 + Math.max(0, gait) * 0.045;
    } else if (pose === "vasti-jump") {
      tailAngle = -0.12;
      backLegAngle = -0.28;
      frontLegAngle = 0.25;
      forelegAngle = -0.18;
      jawAngle = 0.055;
    } else if (pose === "vasti-duck") {
      tailAngle = 0.105;
      backLegAngle = 0.12;
      frontLegAngle = 0.06;
      forelegAngle = 0.24;
      jawAngle = 0;
    } else if (pose === "vasti-attack") {
      tailAngle = 0.045;
      forelegAngle = -0.15;
      jawAngle = 0.36;
    } else if (pose === "vasti-stomp") {
      tailAngle = -0.08;
      backLegAngle = 0.19;
      frontLegAngle = -0.13;
      forelegAngle = 0.12;
      jawAngle = 0.08;
    } else if (pose === "vasti-slam") {
      tailAngle = 0.16;
      backLegAngle = -0.24;
      frontLegAngle = 0.21;
      forelegAngle = -0.2;
      jawAngle = 0.24;
    } else if (pose === "vasti-impact") {
      tailAngle = -0.13;
      backLegAngle = 0.08;
      frontLegAngle = -0.08;
      forelegAngle = 0.2;
      jawAngle = 0.25;
    } else if (pose === "vasti-land") {
      tailAngle = 0.08;
      backLegAngle = 0.17;
      frontLegAngle = -0.16;
      forelegAngle = 0.11;
      jawAngle = 0.06;
    } else if (pose === "vasti-recover") {
      tailAngle = idle * 0.065;
      forelegAngle = -idle * 0.045;
      jawAngle = 0.035;
    }

    context.save();
    if (mirror) {
      context.translate(width, 0);
      context.scale(-1, 1);
    }

    const drawPart = (name, pivotX, pivotY, angle) => {
      const px = (pivotX - 32) / 460 * width;
      const py = (pivotY - 60) / 235 * height;
      context.save();
      context.translate(px, py);
      context.rotate(angle);
      const drawn = this.draw(context, name, -px, -py, width, height, { alpha });
      context.restore();
      return drawn;
    };

    // Rear layers first, torso second, then the near-side limbs and lower jaw.
    const drawn = [
      drawPart("vasti-rig-tail", 276, 137, tailAngle),
      drawPart("vasti-rig-leg-back", 232, 166, backLegAngle),
      drawPart("vasti-rig-body", 32, 60, 0),
      drawPart("vasti-rig-leg-front", 194, 164, frontLegAngle),
      drawPart("vasti-rig-foreleg", 142, 137, forelegAngle),
      drawPart("vasti-rig-jaw", 104, 107, jawAngle)
    ].every(Boolean);

    context.restore();
    return drawn;
  }

  drawReferenceVasti(context, x, y, width, height, actor, elapsed, alpha = 1, poseOverride = null) {
    // These six masked layers all contain the exact source image in public/references/vastatosaurus-rex.jpg.
    const pose = poseOverride ?? selectActorPose("vasti", actor, elapsed);
    const phase = phaseOf(actor, "vasti");
    let bob = 0;
    let offsetY = 0;
    let sx = 1;
    let sy = 1;
    let tilt = 0;

    if (pose === "vasti-run-a" || pose === "vasti-run-b") {
      const gait = Math.sin(elapsed * 9.2 * Math.PI + phase);
      bob = Math.round(Math.abs(gait) * 2);
      tilt = gait * 0.035;
      sx = 1 + Math.abs(gait) * 0.035;
      sy = 1 - Math.abs(gait) * 0.045;
    } else if (pose === "vasti-jump") {
      offsetY = -2;
      tilt = -0.035;
    } else if (pose === "vasti-stomp") {
      sy = 0.94;
      sx = 1.04;
      offsetY = 2;
    } else if (pose === "vasti-slam") {
      tilt = 0.04;
      sx = 1.06;
      sy = 0.9;
      offsetY = 3;
    } else if (pose === "vasti-attack") {
      tilt = 0.025;
    } else if (pose === "vasti-impact") {
      tilt = -0.035;
      offsetY = 1;
    } else if (pose === "vasti-land") {
      sx = 1.04;
      sy = 0.92;
      offsetY = 3;
    } else if (pose === "vasti-recover") {
      bob = Math.round(Math.max(0, Math.sin(elapsed * 18 + phase)) * 1.5);
    } else if (pose === "vasti-idle") {
      const breath = Math.sin(elapsed * 2.3 + phase);
      bob = Math.round(breath * 1.25);
      sy = 1 + breath * 0.012;
    } else if (pose === "vasti-duck") {
      sy = 0.82;
      offsetY = 6;
    }

    const w = Math.max(1, Math.round(width * sx));
    const h = Math.max(1, Math.round(height * sy));
    const dx = Math.round(x + (width - w) / 2);
    const dy = Math.round(y + (height - h) / 2 + bob + offsetY);
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
      result = this.draw(context, "vasti", 0, 0, w, h, { alpha, facing: sourceFacing });
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
    // The original image faces right; mirror only when the boss turns left.
    const direction = actor?.direction ?? 1;
    const mirror = direction < 0;
    const phase = phaseOf(actor, "indoraptor");
    const gait = Math.sin(elapsed * 9.2 * Math.PI + phase);
    const running = pose === "indoraptor-run-a" || pose === "indoraptor-run-b";
    const defeated = pose === "indoraptor-defeated";
    const attack = actor?.state === "telegraph" || actor?.state === "attacking" || pose === "indoraptor-attack";
    const attackName = actor?.attackName;

    // The reference is anatomical material, not the final idle pose: the rig starts in a crouched hunt.
    let bodyTilt = 0.24;
    let tailAngle = -0.08;
    let backLegAngle = 0.22;
    let frontLegAngle = -0.14;
    let backArmAngle = -0.18;
    let frontArmAngle = 0.2;
    let headAngle = 0.3;
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

    if (attack) {
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
      bodyTilt = -0.12;
      tailAngle = 0.2;
      backLegAngle = 0.12;
      frontLegAngle = -0.08;
      backArmAngle = 0.24;
      frontArmAngle = -0.2;
      headAngle = -0.2;
      jawAngle = 0.12;
    } else if (pose === "indoraptor-recover") {
      bodyTilt = 0.18;
      tailAngle = -0.04;
      backLegAngle = 0.16;
      frontLegAngle = -0.1;
      backArmAngle = -0.1;
      frontArmAngle = 0.13;
      headAngle = 0.25;
      jawAngle = 0;
    } else if (pose === "indoraptor-land") {
      bodyTilt = 0.3;
      tailAngle = 0.12;
      backLegAngle = 0.28;
      frontLegAngle = -0.2;
      backArmAngle = -0.18;
      frontArmAngle = 0.2;
      headAngle = 0.35;
      jawAngle = 0.08;
    } else if (defeated) {
      // Final collapsed pose: torso and neck settle toward the ground.
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

    const hipX = width * 0.47;
    const hipY = height * 0.62;
    context.translate(hipX, hipY);
    context.rotate(bodyTilt);
    context.translate(-hipX, -hipY);
    if (defeated) {
      context.translate(0, height * 0.12);
      context.scale(1.02, 0.84);
      context.translate(0, -height * 0.12);
    }

    const drawPart = (name, pivotX, pivotY, angle) => {
      const px = pivotX / 297 * width;
      const py = pivotY / 277 * height;
      context.save();
      context.translate(px, py);
      context.rotate(angle);
      const drawn = this.draw(context, name, -px, -py, width, height, { alpha });
      context.restore();
      return drawn;
    };

    const drawn = [
      drawPart("indoraptor-rig-tail", 108, 151, tailAngle),
      drawPart("indoraptor-rig-leg-back", 111, 164, backLegAngle),
      drawPart("indoraptor-rig-arm-back", 113, 135, backArmAngle),
      drawPart("indoraptor-rig-body", 0, 0, 0),
      drawPart("indoraptor-rig-leg-front", 151, 166, frontLegAngle),
      drawPart("indoraptor-rig-arm-front", 158, 135, frontArmAngle),
      drawPart("indoraptor-rig-head", 144, 108, headAngle),
      drawPart("indoraptor-rig-jaw", 178, 57, jawAngle)
    ].every(Boolean);
    context.restore();
    return drawn;
  }

  drawReferenceIndoraptor(context, x, y, width, height, actor, elapsed, alpha = 1, poseOverride = null, facing = null) {
    const pose = poseOverride ?? selectActorPose("indoraptor", actor, elapsed);
    const phase = phaseOf(actor, "indoraptor");
    const gait = Math.sin(elapsed * 9.2 * Math.PI + phase);
    let bob = 0, tilt = 0, sx = 1, sy = 1;
    if (pose === "indoraptor-run-a" || pose === "indoraptor-run-b") {
      bob = Math.round(Math.abs(gait) * 2);
      tilt = gait * 0.018;
      sx = 1 + Math.abs(gait) * 0.018;
      sy = 1 - Math.abs(gait) * 0.02;
    } else if (pose === "indoraptor-attack") {
      tilt = actor?.attackName === "pounce" ? -0.025 : 0.02;
      sx = actor?.attackName === "pounce" ? 1.035 : 1.01;
    } else if (pose === "indoraptor-impact") {
      tilt = -0.035; bob = 1;
    } else if (pose === "indoraptor-recover") {
      bob = Math.round(Math.max(0, Math.sin(elapsed * 14 + phase)) * 1.5);
    } else if (pose === "indoraptor-defeated") {
      tilt = 0.08; sy = 0.98; bob = 4;
    } else {
      const breath = Math.sin(elapsed * 1.65 + phase);
      bob = Math.round(breath * 0.75);
      sy = 1 + breath * 0.006;
    }

    const w = Math.max(1, Math.round(width * sx));
    const h = Math.max(1, Math.round(height * sy));
    const dx = Math.round(x + (width - w) / 2);
    const dy = Math.round(y + (height - h) / 2 + bob);
    context.save();
    context.translate(dx + w / 2, dy + h / 2);
    context.rotate(tilt);
    context.translate(-w / 2, -h / 2);
    const rigReady = typeof this.get === "function" && INDORAPTOR_RIG_PARTS.every(name => {
      const image = this.get(name);
      return image?.complete && image.naturalWidth > 0;
    });
    const fallbackPose = pose === "indoraptor-defeated" ? "indoraptor" : pose;
    const result = rigReady
      ? this.drawIndoraptorRig(context, w, h, actor, elapsed, pose, alpha)
      : this.draw(context, fallbackPose, 0, 0, w, h, { alpha, facing: facing ?? (actor?.direction ?? 1) });
    context.restore();
    return result;
  }

  drawAnimated(context, character, x, y, width, height, actor, elapsed, options = {}) {
    if (character === "beta" && this.drawReferenceRosa(context, x, y, width, height, actor, elapsed, options.alpha ?? 1)) return true;
    if (character === "vasti" && this.drawReferenceVasti(context, x, y, width, height, actor, elapsed, options.alpha ?? 1)) return true;
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
    else if (player && !player.onGround && !player.animationState) pose = kind === "rosa" ? "rosa-run-a" : prefix + "-jump";
    else if (player && Math.abs(player.vx) > 30 && !player.animationState) {
      const fps = Math.max(8, Math.min(13, Math.abs(player.vx) / 27));
      pose = prefix + "-run-" + (Math.floor(elapsed * fps + phaseOf(player, kind)) % 2 === 0 ? "a" : "b");
    } else if (!player?.animationState) {
      pose = prefix + "-idle";
    }

    const crouching = player?.duck === true && pose === prefix + "-duck";
    const naturalHeight = crouching ? (player?.normalHeight ?? height) : height;
    const drawY = crouching ? y + height - naturalHeight : y;
    if (kind === "blue" && this.drawReferenceVioleta(context, x, drawY, width, naturalHeight, player ?? {}, elapsed, alpha, pose)) return true;
    if (kind === "rosa" && this.drawReferenceRosa(context, x, drawY, width, naturalHeight, player ?? {}, elapsed, alpha, pose)) return true;
    if (kind !== "blue" && kind !== "rosa" && this.drawReferenceVasti(context, x, y, width, height, player ?? {}, elapsed, alpha, pose)) return true;
    return this.draw(context, pose, x, drawY, width, naturalHeight, { alpha, facing: player?.facing ?? 1 });
  }

  readiness() {
    return { ready: this.loaded.size, total: SPRITES.length, failed: this.failed.size };
  }
}
