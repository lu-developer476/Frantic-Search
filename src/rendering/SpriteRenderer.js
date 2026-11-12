import { ACTOR_ANIMATION_PROFILES, selectActorPose } from "./AnimationProfiles.js";

const SPRITE_ASSET_VERSION = "20261112-ferrucutus-rescue-rig-1";
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
  ...VASTI_RIG_PARTS,
  ...FERRUCUTUS_RIG_PARTS,
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

  drawAnimated(context, character, x, y, width, height, actor, elapsed, options = {}) {
    if (character === "vasti" && this.drawReferenceVasti(context, x, y, width, height, actor, elapsed, options.alpha ?? 1)) return true;
    if (character === "ferrucutus" && this.drawReferenceFerrucutus(context, x, y, width, height, actor, elapsed, options.alpha ?? 1)) return true;
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
    const character = kind === "blue" ? "blue" : "vasti";
    const prefix = kind === "blue" ? "violeta" : "vasti";
    let pose = selectActorPose(character, player, elapsed);
    if (player?.dashTimer > 0 && kind === "blue") pose = "violeta-dash";
    else if (player?.duck) pose = prefix + "-duck";
    else if (player && !player.onGround && !player.animationState) pose = prefix + "-jump";
    else if (player && Math.abs(player.vx) > 30 && !player.animationState) {
      const fps = Math.max(8, Math.min(13, Math.abs(player.vx) / 27));
      pose = prefix + "-run-" + (Math.floor(elapsed * fps + phaseOf(player, kind)) % 2 === 0 ? "a" : "b");
    } else if (!player?.animationState) {
      pose = prefix + "-idle";
    }

    if (kind !== "blue" && this.drawReferenceVasti(context, x, y, width, height, player ?? {}, elapsed, alpha, pose)) return true;
    const crouching = player?.duck === true && pose === prefix + "-duck";
    const naturalHeight = crouching ? (player?.normalHeight ?? height) : height;
    const drawY = crouching ? y + height - naturalHeight : y;
    return this.draw(context, pose, x, drawY, width, naturalHeight, { alpha, facing: player?.facing ?? 1 });
  }

  readiness() {
    return { ready: this.loaded.size, total: SPRITES.length, failed: this.failed.size };
  }
}
