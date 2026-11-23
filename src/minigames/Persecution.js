import { loadAnimatedGif, getAnimatedFrameIndex } from "./AnimatedGif.js";
import { drawSpriteImage, observeCanvasViewport } from "../rendering/CanvasUtils.js";
import { MinigameEnvironmentRenderer, MINIGAME_ENVIRONMENT_SCENES } from "./MinigameEnvironment.js";
let WIDTH = 960;
const HEIGHT = 540;
const FLOOR = 438;
export const LANE_COUNT = 4;
export const DEFAULT_LANE = LANE_COUNT - 1;
// Keep every lane on the foreground grass; each lower lane moves closer to the viewer.
export const LANE_BASELINES = Object.freeze([448, 474, 500, 526]);
export const LANE_SCALES = Object.freeze([0.82, 0.94, 1.06, 1.18]);
export const MUD_SPEED_MULTIPLIER = 0.55;
export const PIT_FALL_FADE_DURATION = 0.9;
export const INTRO_DURATION = 5;
export const PLAYER_WIDTH = 80;
export const PLAYER_HEIGHT = 66;
const INTRO_END_X = 250;
export const PRAIRIE_HERD = Object.freeze([
  Object.freeze({ species: "parasaur", pose: "parasaurIdle", x: 32, y: 368, w: 72, h: 52 }),
  Object.freeze({ species: "brontosaurus", pose: "brontosaurusWalk", x: 282, y: 358, w: 88, h: 64 }),
  Object.freeze({ species: "ligocristus", phase: 0.2, x: 452, y: 373, w: 60, h: 43 }),
  Object.freeze({ species: "parasaur", pose: "parasaurWalk", x: 610, y: 366, w: 78, h: 56 }),
  Object.freeze({ species: "ligocristus", phase: 4.25, x: 770, y: 372, w: 64, h: 46 }),
  Object.freeze({ species: "brontosaurus", pose: "brontosaurusRun", x: 905, y: 354, w: 92, h: 66 })
]);

export function prairieHerdAnimationKey(animal = {}, elapsed = 0) {
  if (animal.species !== "ligocristus") return animal.pose ?? "parasaurWalk";

  const cycle = ((elapsed + (animal.phase ?? 0)) % 9 + 9) % 9;
  if (cycle < 0.55) return "ligocristusJump";
  if (cycle < 1.8) return "ligocristusRun";
  if (cycle < 3.6) return "ligocristusIdle";
  return "ligocristusWalk";
}
export const CORAL_ANIMATION_ASSETS = Object.freeze({
  idle: "references/miniraptor-idle.gif",
  run: "references/miniraptor-run.gif",
  jump: "references/miniraptor-jump.gif"
});

export const ASSETS = {
  coral: CORAL_ANIMATION_ASSETS.run,
  coralIdle: CORAL_ANIMATION_ASSETS.idle,
  coralJump: CORAL_ANIMATION_ASSETS.jump,
  xenoraptorRun: "references/xenoraptor-crypticus-run.gif",
  xenoraptorJump: "references/xenoraptor-crypticus-jump.gif",
  xenoraptorAttack: "references/xenoraptor-crypticus-attack.gif",
  umbraraptorRun: "references/umbraraptor-silvis-run.gif",
  umbraraptorJump: "references/umbraraptor-silvis-jump.gif",
  umbraraptorEat: "references/umbraraptor-silvis-eat.gif",
  umbraraptorIdle: "references/umbraraptor-silvis-idle.gif",
  parasaurRun: "references/parasaurolophus-run.gif",
  parasaurWalk: "references/parasaurolophus-walk.gif",
  parasaurIdle: "references/parasaurolophus-idle.gif",
  parasaurPerturbed: "references/parasaurolophus-attack.gif",
  brontosaurusRun: "references/brontosaurus-excelsus-basteri-run.gif",
  brontosaurusWalk: "references/brontosaurus-excelsus-basteri-walk.gif",
  ligocristusIdle: "references/ligocristus-innocens-idle.gif",
  ligocristusJump: "references/ligocristus-innocens-jump.gif",
  ligocristusRun: "references/ligocristus-innocens-run.gif",
  ligocristusWalk: "references/ligocristus-innocens-walk.gif"
};

export function coralAnimationKey(player = {}, phase = "playing") {
  if (phase !== "playing" || (player.trappedTimer ?? 0) > 0) return "coralIdle";
  if (player.grounded === false || player.onGround === false) return "coralJump";
  return "coral";
}

export function selectHerdPreySpecies(random = Math.random()) {
  if (random < 0.2) return "ligocristus";
  if (random < 0.52) return "brontosaurus";
  return "parasaur";
}

export function herdPreyAnimationKey(prey = {}, elapsed = 0) {
  if (prey.species === "ligocristus") {
    if (prey.beingEaten || prey.pitfallDefeated || (prey.trappedTimer ?? 0) > 0) {
      return "ligocristusIdle";
    }
    if (prey.onGround === false || prey.animationState === "jumping") return "ligocristusJump";
    if (prey.animationState === "perturbed") return "ligocristusRun";
    return Math.sin(elapsed * 2.2 + (prey.phase ?? 0)) > 0.97
      ? "ligocristusJump"
      : "ligocristusWalk";
  }

  if (prey.species === "brontosaurus") {
    return prey.animationState === "perturbed" || prey.beingEaten
      ? "brontosaurusWalk"
      : "brontosaurusRun";
  }

  if (prey.beingEaten) {
    return prey.beingEatenElapsed < 0.65 ? "parasaurPerturbed" : "parasaurIdle";
  }
  return prey.animationState === "perturbed" ? "parasaurPerturbed" : "parasaurRun";
}

export function shouldFlipMinigameSprite(key, facing = 1) {
  if (typeof key !== "string") return false;
  const sourceFacing = 1;
  return Math.sign(facing || 1) !== sourceFacing;
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function scoreForDistance(distance) {
  return Math.max(0, Math.floor(distance / 10));
}

export const CHECKPOINT_INTERVAL_METERS = 250;
export const CHECKPOINT_INTERVAL_DISTANCE = CHECKPOINT_INTERVAL_METERS * 10;
export const EGGS_PER_CHECKPOINT_CONTINUE = 4;

export function getGroundAlignedY(y, renderedHeight, sourceHeight, bottomPadding = 0) {
  if (![y, renderedHeight, sourceHeight].every(Number.isFinite) || sourceHeight <= 0) return y;
  const padding = Math.max(0, Math.min(sourceHeight, Number(bottomPadding) || 0));
  return y + renderedHeight * padding / sourceHeight;
}

export function getAnimationDrawRect(x, y, width, height, animation = {}, frame = {}) {
  const sourceWidth = Number(animation.width) > 0 ? Number(animation.width) : Math.max(1, width);
  const sourceHeight = Number(animation.height) > 0 ? Number(animation.height) : Math.max(1, height);
  const scale = Math.min(Math.max(1, width) / sourceWidth, Math.max(1, height) / sourceHeight);
  const drawWidth = Math.max(1, Math.round(sourceWidth * scale));
  const drawHeight = Math.max(1, Math.round(sourceHeight * scale));
  const bottomPadding = Math.max(
    0,
    Math.min(sourceHeight, Number(frame.bottomPadding ?? animation.bottomPadding) || 0)
  );

  return {
    x: x + (width - drawWidth) / 2,
    y: y + height - drawHeight + drawHeight * bottomPadding / sourceHeight,
    width: drawWidth,
    height: drawHeight
  };
}

export function normalizeLane(lane = DEFAULT_LANE) {
  const value = Number.isFinite(Number(lane)) ? Math.round(Number(lane)) : DEFAULT_LANE;
  return Math.max(0, Math.min(LANE_COUNT - 1, value));
}

export function getLaneBaseline(lane = DEFAULT_LANE) {
  return LANE_BASELINES[normalizeLane(lane)];
}

export function getLaneScale(lane = DEFAULT_LANE) {
  return LANE_SCALES[normalizeLane(lane)];
}

function applyLane(entity, lane, baseWidth = entity.baseW ?? entity.w, baseHeight = entity.baseH ?? entity.h) {
  const normalizedLane = normalizeLane(lane);
  entity.baseW ??= baseWidth;
  entity.baseH ??= baseHeight;
  entity.lane = normalizedLane;
  const scale = getLaneScale(normalizedLane);
  entity.w = entity.baseW * scale;
  entity.h = entity.baseH * scale;
  entity.y = getLaneBaseline(normalizedLane) - entity.h;
  return entity;
}

function randomLane() {
  return Math.floor(Math.random() * LANE_COUNT);
}

const EGG_SPOT_COLORS = Object.freeze([
  "#8b6748", "#a47750", "#b58b5c", "#d6c18c", "#e6d6a7", "#f0e3bd"
]);

export function createEgg(lane = DEFAULT_LANE, x = WIDTH + 20, random = Math.random) {
  const spotCount = 10 + Math.floor(random() * 9);
  const spots = Array.from({ length: spotCount }, () => ({
    x: 0.2 + random() * 0.6,
    y: 0.13 + random() * 0.72,
    radius: 0.025 + random() * 0.105,
    aspect: 0.65 + random() * 1.05,
    rotation: (random() - 0.5) * 1.1,
    color: EGG_SPOT_COLORS[Math.floor(random() * EGG_SPOT_COLORS.length)]
  }));

  return applyLane({
    kind: "egg",
    x,
    y: 0,
    w: 26,
    h: 33,
    baseW: 26,
    baseH: 33,
    vx: 0,
    spots
  }, lane);
}

export function getMudShimmerOpacity(elapsed = 0, phase = 0) {
  const pulse = (Math.sin(Math.max(0, elapsed) * 5.8 + phase) + 1) / 2;
  return 0.035 + 0.62 * pulse ** 3;
}

function createPlayer(lane = DEFAULT_LANE) {
  return applyLane({
    x: INTRO_END_X,
    y: 0,
    w: PLAYER_WIDTH,
    h: PLAYER_HEIGHT,
    baseW: PLAYER_WIDTH,
    baseH: PLAYER_HEIGHT,
    vy: 0,
    grounded: true,
    facing: 1,
    dashDirection: 1,
    dashTimer: 0,
    dashCooldown: 0,
    trappedTimer: 0
  }, lane);
}

export const ENEMY_CHASE_DURATION = 2;
export const ENEMY_EAT_DURATION = 1.35;
export const DASH_DURATION = 0.2;
export const DASH_COOLDOWN = 1.65;
export const DASH_SPEED_MULTIPLIER = 2.2;
export const DASH_DUST_DURATION = 0.72;
export const ENEMY_STUN_DURATION = 2;
export const PLAYER_RIGHT_MARGIN = 120;
export const CAMERA_DEAD_ZONE_LEFT_RATIO = 0.22;
export const CAMERA_DEAD_ZONE_RIGHT_RATIO = 0.78;

/**
 * Returns the signed horizontal camera movement needed to keep the player
 * inside a broad central area of the canvas. Positive values follow rightward
 * movement; negative values follow leftward movement.
 */
export function getCameraFollowDelta(playerX, playerWidth, viewportWidth) {
  if (![playerX, playerWidth, viewportWidth].every(Number.isFinite) ||
      playerWidth <= 0 || viewportWidth <= 0) return 0;

  const maxPlayerX = Math.max(22, viewportWidth - playerWidth - 22);
  const leftLimit = Math.min(
    Math.max(22, viewportWidth * CAMERA_DEAD_ZONE_LEFT_RATIO),
    maxPlayerX
  );
  const rightLimit = Math.max(
    leftLimit,
    Math.min(maxPlayerX, viewportWidth * CAMERA_DEAD_ZONE_RIGHT_RATIO - playerWidth)
  );

  if (playerX < leftLimit) return playerX - leftLimit;
  if (playerX > rightLimit) return playerX - rightLimit;
  return 0;
}
export const EGG_INVULNERABILITY_DURATION = 4;
export const ITEM_INTERACTION_RADIUS = 112;
export const ENEMY_TRIP_FADE_DURATION = 0.9;

export function createPredator(kind, phase = 0, lane = DEFAULT_LANE) {
  const isXenoraptor = kind === "xenoraptor";
  const w = isXenoraptor ? 148 : 126;
  const h = isXenoraptor ? 104 : 86;
  const enemy = applyLane({
    kind: isXenoraptor ? "xenoraptor" : "umbraraptor",
    x: 0,
    y: 0,
    w,
    h,
    baseW: w,
    baseH: h,
    phase,
    direction: 1,
    state: "chasing",
    stateTimer: ENEMY_CHASE_DURATION,
    laneShiftTimer: 0.55 + Math.random() * 0.35,
    slideTimer: 0,
    slideCooldown: 2.7,
    preyTarget: null,
    eatTarget: null
  }, lane);
  // Spawn fully outside the canvas; the predator enters from its left edge.
  enemy.x = -enemy.w;
  return enemy;
}

export function enemyAnimationKey(enemy, elapsed = 0) {
  const isXenoraptor = enemy.kind === "xenoraptor";
  if (enemy.state === "stunned" || enemy.state === "trapped" || enemy.state === "fading") return isXenoraptor ? "xenoraptorJump" : "umbraraptorIdle";
  if (enemy.state === "eating") return isXenoraptor ? "xenoraptorAttack" : "umbraraptorEat";
  if (enemy.state === "departing" || (enemy.state === "hunting" && !enemy.preyTarget)) {
    return isXenoraptor ? "xenoraptorJump" : "umbraraptorIdle";
  }

  if ((enemy.slideTimer ?? 0) > 0) return isXenoraptor ? "xenoraptorRun" : "umbraraptorRun";

  const jumping = Math.sin(elapsed * 3.8 + (enemy.phase ?? 0)) > 0.92;
  if (isXenoraptor) return jumping ? "xenoraptorJump" : "xenoraptorRun";
  return jumping ? "umbraraptorJump" : "umbraraptorRun";
}

export class Persecution {
  constructor(root, onExit = () => {}, onBeforeStart = (_mode, proceed) => proceed()) {
    this.root = root;
    this.canvas = root.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvasViewport = observeCanvasViewport(root.querySelector(".persecution-stage"), this.canvas, (width) => {
      WIDTH = width;
      this.ctx.imageSmoothingEnabled = false;
    });
    this.onExit = onExit;
    this.onBeforeStart = onBeforeStart;
    this.locale = "es";
    this.pauseButton = root.querySelector("[data-empty-pause]");
    this.checkpointButton = root.querySelector("[data-empty-checkpoint]");
    this.pauseOverlay = root.querySelector("[data-empty-pause-overlay]");
    this.controlsStrip = root.querySelector("[data-empty-controls]");
    this.paused = false;
    this.animations = {};
    this.assetPromises = Object.entries(ASSETS).map(async ([key, path]) => {
      try {
        this.animations[key] = await loadAnimatedGif(`${import.meta.env.BASE_URL}${path}`);
      } catch (error) {
        console.error(`[Empty Stomach] Failed to decode ${key} GIF:`, error);
      }
    });
    this.keys = new Set();
    this.running = false;
    this.phase = "idle";
    this.introElapsed = 0;
    this.animationClock = 0;
    this.sceneryOffset = 0;
    this.environmentRenderer = new MinigameEnvironmentRenderer({
      scene: MINIGAME_ENVIRONMENT_SCENES.persecution,
      groundY: FLOOR,
      seed: 4021,
      sectionLength: 6200,
      sectionCount: 8
    });
    this.frame = null;
    this.last = 0;
    this.elapsed = 0;
    this.distance = 0;
    this.checkpoint = null;
    this.checkpointCharges = 0;
    this.eggsEaten = 0;
    this.checkpointNoticeTimer = 0;
    this.deathCause = null;
    this.spawnTimer = 0;
    this.preyTimer = 1.5;
    this.enemies = [];
    this.herd = [];
    this.particles = [];
    this.dashDustClouds = [];
    this.eggs = [];
    this.rocks = [];
    this.pits = [];
    this.mudPuddles = [];
    this.bushes = [];
    this.carriedItem = null;
    this.invulnerabilityTimer = 0;
    this.eggSpawnTimer = 2.2;
    this.rockSpawnTimer = 3.4;
    this.pitSpawnTimer = 5.8;
    this.mudSpawnTimer = 3.8;
    this.bushSpawnTimer = 5.1;
    this.player = createPlayer();
    this.best = 0;
    try { this.best = Number(localStorage.getItem("frantic-persecution-best")) || 0; } catch {}
    this.handleKeyDown = (event) => {
      if (!this.root.classList.contains("active")) return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "KeyP", "KeyX", "KeyE", "KeyQ", "KeyW", "KeyS"].includes(event.code)) event.preventDefault();
      if (event.code === "Escape" && !event.repeat) { this.exit(); return; }
      if (event.code === "KeyP" && !event.repeat) { this.togglePause(); return; }
      if (this.phase === "intro" || this.paused) return;
      if (event.code === "KeyX" && !event.repeat) { this.activateDash(); return; }
      if (event.code === "KeyE" && !event.repeat) { this.interactWithItem(); return; }
      if (event.code === "KeyQ" && !event.repeat) { this.consumeCarriedEgg(); return; }
      if (!this.running && event.code === "Space" && !event.repeat) { this.requestStart(); return; }
      if ((event.code === "ArrowUp" || event.code === "KeyW") && !event.repeat) { this.changeLane(-1); return; }
      if ((event.code === "ArrowDown" || event.code === "KeyS") && !event.repeat) { this.changeLane(1); return; }
      if (["ArrowLeft", "ArrowRight", "Space", "KeyA", "KeyD"].includes(event.code)) this.keys.add(event.code);
    };
    this.handleKeyUp = (event) => this.keys.delete(event.code);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    root.querySelector("[data-empty-start]").addEventListener("click", () => this.requestStart());
    root.querySelector("[data-empty-retry]").addEventListener("click", () => this.requestStart());
    root.querySelector("[data-empty-exit]").addEventListener("click", () => this.exit());
    this.pauseButton.addEventListener("click", () => this.togglePause());
    this.checkpointButton.addEventListener("click", () => this.onBeforeStart("persecution", () => this.continueFromCheckpoint()));

  }

  text(es, en) { return this.locale === "es" ? es : en; }

  getEntityLane(entity) {
    return normalizeLane(entity?.lane ?? DEFAULT_LANE);
  }

  setEntityLane(entity, lane) {
    return applyLane(entity, lane);
  }

  changeLane(direction) {
    if (!this.running || this.phase !== "playing") return false;
    const player = this.player;
    if ((player.trappedTimer ?? 0) > 0) return false;
    const nextLane = normalizeLane(this.getEntityLane(player) + Math.sign(direction));
    if (nextLane === this.getEntityLane(player)) return false;
    this.setEntityLane(player, nextLane);
    player.vy = 0;
    player.grounded = true;
    player.x = Math.max(22, Math.min(WIDTH - player.w - PLAYER_RIGHT_MARGIN, player.x));
    if (this.carriedItem) this.setEntityLane(this.carriedItem, nextLane);
    return true;
  }

  isInMud(entity) {
    const lane = this.getEntityLane(entity);
    return (this.mudPuddles ?? []).some((mud) =>
      mud.lane === lane &&
      entity.x + entity.w * 0.82 > mud.x &&
      entity.x + entity.w * 0.18 < mud.x + mud.w
    );
  }

  movementMultiplier(entity) {
    return this.isInMud(entity) ? MUD_SPEED_MULTIPLIER : 1;
  }

  followPlayerWithCamera() {
    const player = this.player;
    if (!player || !Number.isFinite(player.x)) return 0;

    const cameraDelta = getCameraFollowDelta(player.x, player.w, WIDTH);
    if (Math.abs(cameraDelta) < 0.001) return 0;

    // Keep Coral inside the tracking zone and move every world-space actor
    // and hazard by the inverse camera displacement.
    player.x -= cameraDelta;
    const worldCollections = [
      this.enemies, this.herd, this.eggs, this.rocks,
      this.pits, this.mudPuddles, this.bushes, this.particles
    ];
    for (const collection of worldCollections) {
      if (!Array.isArray(collection)) continue;
      for (const entity of collection) {
        if (Number.isFinite(entity?.x)) entity.x -= cameraDelta;
      }
    }
    for (const cloud of this.dashDustClouds ?? []) {
      if (Number.isFinite(cloud?.x)) cloud.x -= cameraDelta;
    }

    this.sceneryOffset = (this.sceneryOffset ?? 0) + cameraDelta;
    return cameraDelta;
  }

  isPlayerHidden() {
    const player = this.player;
    const lane = this.getEntityLane(player);
    return (this.bushes ?? []).some((bush) =>
      bush.lane === lane &&
      player.x + player.w * 0.72 > bush.x &&
      player.x + player.w * 0.28 < bush.x + bush.w
    );
  }

  tryResolvePitfall(entity, kind) {
    if (!entity || entity.fellIntoPit || entity.pitfallDefeated || entity.state === "fading") return false;

    const lane = this.getEntityLane(entity);
    const floor = getLaneBaseline(lane);
    // A pit only catches actors whose feet reach the ground; jumping clears the hazard.
    if ((kind === "player" && !entity.grounded) || entity.y + entity.h < floor - 10) return false;

    const pit = (this.pits ?? []).find((candidate) =>
      candidate.lane === lane &&
      entity.x + entity.w * 0.86 > candidate.x &&
      entity.x + entity.w * 0.14 < candidate.x + candidate.w
    );
    if (!pit) return false;

    pit.triggered = true;
    pit.triggeredAt = this.elapsed;
    entity.fellIntoPit = true;

    if (kind === "player") {
      this.finish("pit");
      return true;
    }

    if (kind === "predator") {
      entity.preyTarget = null;
      entity.eatTarget = null;
      entity.eatTargetType = null;
      entity.state = "fading";
      entity.fadeTimer = ENEMY_TRIP_FADE_DURATION;
      return true;
    }

    entity.pitfallDefeated = true;
    entity.pitFadeTimer = PIT_FALL_FADE_DURATION;
    return true;
  }

  setLocale(locale) {
    this.locale = locale === "en" ? "en" : "es";
    this.root.querySelector("[data-empty-title]").textContent = this.phase === "finished"
      ? this.text("PARTIDA FINALIZADA", "GAME OVER")
      : this.text("PERSECUSIÓN", "PURSUIT");
    this.root.querySelector("[data-empty-subtitle]").textContent = this.text("Coral corre por su vida. Los depredadores no van a detenerse.", "Coral is running for her life. The predators won't stop.");
    this.root.querySelector("[data-empty-instructions]").textContent = this.text("A / D O ← / →: MOVERSE · W / S O ↑ / ↓: CAMBIAR CARRIL · ESPACIO: SALTAR · X: EMBESTIR · E: TOMAR / SOLTAR · Q: COMER HUEVO · P: PAUSAR · ESC: SALIR", "A / D OR ← / →: MOVE · W / S OR ↑ / ↓: CHANGE LANE · SPACE: JUMP · X: DASH · E: PICK UP / DROP · Q: EAT EGG · P: PAUSE · ESC: EXIT");
    this.root.querySelector("[data-empty-controls-text]").textContent = this.text("A / D O ← / →: MOVERSE · W / S O ↑ / ↓: CARRILES · ESPACIO: SALTAR · X: EMBESTIR · E: OBJETO · Q: HUEVO · ESC: SALIR", "A / D OR ← / →: MOVE · W / S OR ↑ / ↓: LANES · SPACE: JUMP · X: DASH · E: ITEM · Q: EGG · ESC: EXIT");
    this.root.querySelector("[data-empty-pause-label]").textContent = this.text("PAUSA", "PAUSED");
    this.root.querySelector("[data-empty-result]").textContent = this.getDeathMessage();
    this.updatePauseButton();
    this.root.querySelector("[data-empty-start]").textContent = this.text("INICIAR", "START RUN");
    this.root.querySelector("[data-empty-retry]").textContent = this.text("RETOMAR", "RETRY");
    this.root.querySelector("[data-empty-exit]").textContent = this.text("SALIR", "EXIT");
    this.updateCheckpointButton();
    if (this.root.classList.contains("active")) this.render();
  }

  open() {
    this.root.classList.add("active");
    this.canvasViewport();
    this.root.classList.remove("playing");
    this.root.setAttribute("aria-hidden", "false");
    this.reset();
    this.root.querySelector("[data-empty-start]").hidden = false;
    this.root.querySelector("[data-empty-retry]").hidden = true;
    this.root.querySelector("[data-empty-checkpoint]").hidden = true;
    this.root.querySelector("[data-empty-exit]").hidden = false;
    this.root.querySelector("[data-empty-result]").hidden = true;
    this.root.querySelector("[data-empty-start]").focus();
    this.render();
  }

  reset() {
    this.running = false;
    this.paused = false;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.root.classList.remove("paused");
    this.pauseOverlay.hidden = true;
    this.controlsStrip.hidden = true;
    this.root.querySelector("[data-empty-title]").textContent = this.text("PERSECUSIÓN", "PURSUIT");
    this.root.querySelector("[data-empty-subtitle]").hidden = false;
    this.root.querySelector("[data-empty-instructions]").hidden = false;
    const checkpointButton = this.root.querySelector("[data-empty-checkpoint]");
    if (checkpointButton) checkpointButton.hidden = true;
    this.root.querySelector("[data-empty-retry]").hidden = true;
    this.root.querySelector("[data-empty-result]").hidden = true;
    this.updatePauseButton();
    this.phase = "idle";
    this.introElapsed = 0;
    this.animationClock = 0;
    this.sceneryOffset = 0;
    this.last = 0;
    this.elapsed = 0;
    this.distance = 0;
    this.checkpoint = null;
    this.checkpointCharges = 0;
    this.eggsEaten = 0;
    this.checkpointNoticeTimer = 0;
    this.deathCause = null;
    this.spawnTimer = 1.2;
    this.preyTimer = 0.8;
    this.enemies = [];
    this.herd = [];
    this.particles = [];
    this.dashDustClouds = [];
    this.eggs = [];
    this.rocks = [];
    this.pits = [];
    this.mudPuddles = [];
    this.bushes = [];
    this.carriedItem = null;
    this.invulnerabilityTimer = 0;
    this.eggSpawnTimer = 2.2;
    this.rockSpawnTimer = 3.4;
    this.pitSpawnTimer = 5.8;
    this.mudSpawnTimer = 3.8;
    this.bushSpawnTimer = 5.1;
    this.player = createPlayer();
    this.keys.clear();
  }

  requestStart() {
    if (!this.root.classList.contains("active")) return;
    this.onBeforeStart("persecution", () => this.start());
  }

  start() {
    if (!this.root.classList.contains("active")) return;
    this.reset();
    this.running = true;
    this.phase = "intro";
    this.introElapsed = 0;
    this.animationClock = 0;
    this.sceneryOffset = 0;
    this.player.x = -this.player.w;
    this.paused = false;
    this.root.classList.remove("paused");
    this.root.classList.add("playing");
    this.controlsStrip.hidden = true;
    this.pauseOverlay.hidden = true;
    this.updatePauseButton();
    this.root.querySelector("[data-empty-start]").hidden = true;
    this.root.querySelector("[data-empty-retry]").hidden = true;
    this.root.querySelector("[data-empty-result]").hidden = true;
    this.last = performance.now();
    this.frame = requestAnimationFrame((now) => this.tick(now));
  }

  updateIntro(delta) {
    this.introElapsed = Math.min(INTRO_DURATION, this.introElapsed + delta);
    this.sceneryOffset += 52 * delta;
    const progress = this.introElapsed / INTRO_DURATION;
    this.player.x = -this.player.w + (INTRO_END_X + this.player.w) * progress;

    if (progress >= 1) {
      this.phase = "playing";
      this.elapsed = 0;
      this.distance = 0;
      this.spawnTimer = 1.2;
      this.preyTimer = 0.8;
      this.controlsStrip.hidden = false;
    }
  }

  tick(now) {
    if (!this.running || this.paused) return;
    const delta = Math.min((now - this.last) / 1000 || 0, 0.04);
    this.last = now;
    this.animationClock += delta;
    if (this.phase === "intro") this.updateIntro(delta);
    else if (this.phase === "playing") this.update(delta);
    this.render();
    if (this.running && !this.paused) this.frame = requestAnimationFrame((time) => this.tick(time));
  }

  updatePauseButton() {
    if (!this.pauseButton) return;
    this.pauseButton.textContent = this.paused
      ? this.text("P: REANUDAR", "P: RESUME")
      : this.text("P: PAUSAR", "P: PAUSE");
    this.pauseButton.setAttribute("aria-label", this.pauseButton.textContent);
  }

  togglePause() {
    if (!this.running) return;
    if (this.paused) this.resume();
    else this.pause();
  }

  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.keys.clear();
    this.root.classList.add("paused");
    this.pauseOverlay.hidden = false;
    this.updatePauseButton();
  }

  resume() {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.root.classList.remove("paused");
    this.pauseOverlay.hidden = true;
    this.last = performance.now();
    this.updatePauseButton();
    this.frame = requestAnimationFrame((now) => this.tick(now));
  }

  activateDash() {
    if (!this.running || this.phase !== "playing") return false;
    const p = this.player;
    if ((p.dashCooldown ?? 0) > 0 || (p.dashTimer ?? 0) > 0) return false;

    p.dashDirection = Math.sign(p.facing) || 1;
    p.dashTimer = DASH_DURATION;
    p.dashCooldown = DASH_COOLDOWN;

    const scale = getLaneScale(this.getEntityLane(p));
    const width = 205 * scale;
    const height = p.h + 14 * scale;
    const x = p.dashDirection > 0 ? p.x - 135 * scale : p.x + p.w - 70 * scale;
    this.dashDustClouds ??= [];
    this.dashDustClouds.push({
      x, y: p.y - 6 * scale, w: width, h: height, lane: this.getEntityLane(p),
      life: DASH_DUST_DURATION, max: DASH_DUST_DURATION, hitIds: new Set()
    });
    return true;
  }

  stunPredator(enemy, delta = 0) {
    if (!["chasing", "hunting"].includes(enemy.state)) return false;
    enemy.stunnedState = enemy.state;
    enemy.stunnedStateTimer = enemy.stateTimer;
    enemy.state = "stunned";
    enemy.stateTimer = ENEMY_STUN_DURATION + delta;
    enemy.preyTarget = null;
    return true;
  }

  updateDashDust(delta) {
    const clouds = this.dashDustClouds ?? [];
    for (const cloud of clouds) {
      cloud.life = Math.max(0, cloud.life - delta);
      if (cloud.life <= 0) continue;
      for (const enemy of this.enemies) {
        if (cloud.hitIds.has(enemy) || this.getEntityLane(enemy) !== cloud.lane || !["chasing", "hunting"].includes(enemy.state)) continue;
        const faceX = enemy.x + enemy.w * (enemy.direction > 0 ? 0.82 : 0.18);
        const faceY = enemy.y + enemy.h * 0.34;
        const hitFace = faceX >= cloud.x && faceX <= cloud.x + cloud.w &&
          faceY >= cloud.y && faceY <= cloud.y + cloud.h;
        if (!hitFace) continue;
        cloud.hitIds.add(enemy);
        this.stunPredator(enemy, delta);
      }
    }
    this.dashDustClouds = clouds.filter((cloud) => cloud.life > 0);
  }

  moveEnemyTowards(enemy, targetX, chaseSpeed, delta) {
    const center = enemy.x + enemy.w / 2;
    const difference = targetX - center;
    enemy.slideTimer = Math.max(0, (enemy.slideTimer ?? 0) - delta);
    enemy.slideCooldown = Math.max(0, (enemy.slideCooldown ?? 2.7) - delta);
    if (enemy.slideTimer <= 0 && enemy.slideCooldown <= 0) {
      enemy.slideTimer = 0.36;
      enemy.slideCooldown = 3.1;
    }
    const slideMultiplier = enemy.slideTimer > 0 ? 1.55 : 1;
    const step = Math.min(Math.abs(difference), chaseSpeed * slideMultiplier * this.movementMultiplier(enemy) * delta);
    if (step > 0) {
      enemy.direction = Math.sign(difference);
      enemy.x += enemy.direction * step;
    }
    enemy.y = getLaneBaseline(this.getEntityLane(enemy)) - enemy.h + Math.sin(this.elapsed * 8 + enemy.phase) * 2;
  }

  updateTerrain(delta, speed) {
    this.pits ??= [];
    this.mudPuddles ??= [];
    this.bushes ??= [];
    this.pitSpawnTimer = (this.pitSpawnTimer ?? 5.8) - delta;
    this.mudSpawnTimer = (this.mudSpawnTimer ?? 3.8) - delta;
    this.bushSpawnTimer = (this.bushSpawnTimer ?? 5.1) - delta;

    if (this.pitSpawnTimer <= 0) {
      const lane = randomLane();
      const scale = getLaneScale(lane);
      this.pits.push({ x: WIDTH + 34, lane, w: 108 * scale, h: 24 * scale, life: 9, triggered: false });
      this.pitSpawnTimer = 6.8 + Math.random() * 3.8;
    }
    if (this.mudSpawnTimer <= 0) {
      const lane = randomLane();
      const scale = getLaneScale(lane);
      this.mudPuddles.push({ x: WIDTH + 42, lane, w: 154 * scale, h: 25 * scale, life: 9 });
      this.mudSpawnTimer = 5.5 + Math.random() * 3.4;
    }
    if (this.bushSpawnTimer <= 0) {
      const lane = randomLane();
      const scale = getLaneScale(lane);
      this.bushes.push({ x: WIDTH + 48, lane, w: 98 * scale, h: 48 * scale, life: 9 });
      this.bushSpawnTimer = 6 + Math.random() * 4;
    }

    const scroll = speed * 0.72 * delta;
    for (const pit of this.pits) { pit.x -= scroll; pit.life -= delta; }
    for (const mud of this.mudPuddles) { mud.x -= scroll; mud.life -= delta; }
    for (const bush of this.bushes) { bush.x -= scroll; bush.life -= delta; }
    this.pits = this.pits.filter((pit) => pit.life > 0 && pit.x + pit.w > -40);
    this.mudPuddles = this.mudPuddles.filter((mud) => mud.life > 0 && mud.x + mud.w > -60);
    this.bushes = this.bushes.filter((bush) => bush.life > 0 && bush.x + bush.w > -60);
  }

  updateCheckpointProgress() {
    const milestone = Math.floor(this.distance / CHECKPOINT_INTERVAL_DISTANCE);
    if (milestone <= (this.checkpoint?.milestone ?? 0)) return false;

    this.checkpoint = {
      milestone,
      distance: milestone * CHECKPOINT_INTERVAL_DISTANCE,
      elapsed: this.elapsed,
      sceneryOffset: this.sceneryOffset,
      playerX: this.player.x,
      playerLane: this.getEntityLane(this.player)
    };
    this.checkpointNoticeTimer = 2.8;
    return true;
  }

  update(delta) {
    this.elapsed += delta;
    this.checkpointNoticeTimer = Math.max(0, (this.checkpointNoticeTimer ?? 0) - delta);
    this.invulnerabilityTimer = Math.max(0, (this.invulnerabilityTimer || 0) - delta);
    const speed = Math.min(310, 150 + this.elapsed * 2.2);
    this.distance += speed * delta;
    this.sceneryOffset = (this.sceneryOffset ?? 0) + speed * delta;
    const p = this.player;
    p.trappedTimer = Math.max(0, (p.trappedTimer ?? 0) - delta);
    const left = this.keys.has("ArrowLeft") || this.keys.has("KeyA");
    const right = this.keys.has("ArrowRight") || this.keys.has("KeyD");
    if (left && !right) p.facing = -1;
    else if (right && !left) p.facing = 1;
    const dashing = (p.dashTimer ?? 0) > 0;
    const previousPlayerX = p.x;
    const playerSpeed = this.movementMultiplier(p);
    if (p.trappedTimer <= 0) {
      if (dashing) {
        p.x += (p.dashDirection || p.facing || 1) * 245 * DASH_SPEED_MULTIPLIER * playerSpeed * delta;
      } else {
        if (left) p.x -= 245 * playerSpeed * delta;
        if (right) p.x += 245 * playerSpeed * delta;
      }
    }
    if (dashing) p.dashTimer = Math.max(0, p.dashTimer - delta);
    p.dashCooldown = Math.max(0, (p.dashCooldown ?? 0) - delta);
    p.x = Math.max(22, Math.min(WIDTH - p.w - PLAYER_RIGHT_MARGIN, p.x));
    if (p.x !== previousPlayerX) this.followPlayerWithCamera();
    const playerFloor = getLaneBaseline(this.getEntityLane(p));
    if (p.trappedTimer > 0) {
      p.vy = 0;
      p.grounded = true;
      p.y = playerFloor - p.h;
    } else {
      if (this.keys.has("Space") && p.grounded) {
        p.vy = -590 * getLaneScale(this.getEntityLane(p));
        p.grounded = false;
      }
      p.vy += 1500 * delta;
      p.y += p.vy * delta;
      if (p.y + p.h >= playerFloor) { p.y = playerFloor - p.h; p.vy = 0; p.grounded = true; }
    }

    this.updateCheckpointProgress();
    this.updateTerrain(delta, speed);
    if (this.tryResolvePitfall(p, "player")) return;

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      const kind = Math.random() < 0.46 ? "xenoraptor" : "umbraraptor";
      this.enemies.push(createPredator(kind, Math.random() * 6, randomLane()));
      this.spawnTimer = Math.max(0.95, 2.6 - this.elapsed * 0.018) + Math.random() * 0.7;
    }

    this.updateGroundItems(delta, speed);

    this.preyTimer -= delta;
    if (this.preyTimer <= 0) {
      const count = 1 + (Math.random() < 0.42 ? 1 : 0);
      for (let i = 0; i < count; i += 1) {
        const lane = randomLane();
        const species = selectHerdPreySpecies(Math.random());
        const baseW = species === "brontosaurus" ? 142 : species === "ligocristus" ? 76 : 100;
        const baseH = species === "brontosaurus" ? 92 : species === "ligocristus" ? 54 : 72;
        this.herd.push(applyLane({
          species,
          x: WIDTH + i * 94,
          y: 0,
          w: baseW,
          h: baseH,
          baseW,
          baseH,
          phase: Math.random() * 6,
          beingEaten: false,
          beingEatenElapsed: 0,
          animationState: "running",
          trappedTimer: 0
        }, lane));
      }
      this.preyTimer = 3.5 + Math.random() * 3.5;
    }

    for (const prey of this.herd) {
      const floor = getLaneBaseline(this.getEntityLane(prey));
      if (prey.pitfallDefeated) {
        prey.pitFadeTimer = Math.max(0, (prey.pitFadeTimer ?? 0) - delta);
        const progress = 1 - prey.pitFadeTimer / PIT_FALL_FADE_DURATION;
        prey.y = floor - prey.h + progress * 16;
        continue;
      }
      prey.trappedTimer = Math.max(0, (prey.trappedTimer ?? 0) - delta);
      if (prey.beingEaten) {
        prey.beingEatenElapsed += delta;
        prey.y = floor - prey.h;
        continue;
      }
      if (prey.trappedTimer > 0) {
        prey.y = floor - prey.h + 9;
        continue;
      }
      const threatened = this.enemies.some((enemy) =>
        this.getEntityLane(enemy) === this.getEntityLane(prey) &&
        Math.abs((enemy.x + enemy.w / 2) - (prey.x + prey.w / 2)) < 190
      );
      prey.animationState = threatened ? "perturbed" : "running";
      prey.x -= (speed * 0.72 * this.movementMultiplier(prey)) * delta;
      prey.y = floor - prey.h;
      if (this.tryResolvePitfall(prey, "prey")) continue;
    }
    this.herd = this.herd.filter((prey) =>
      prey.pitfallDefeated ? prey.pitFadeTimer > 0 : prey.beingEaten || prey.x > -140
    );

    const playerHitbox = {
      x: p.x + 12,
      y: p.y + 9,
      w: p.w - 24,
      h: p.h - 12
    };

    this.updateDashDust(delta);
    for (const enemy of this.enemies) {
      const chaseSpeed = enemy.kind === "xenoraptor" ? 168 : 138;
      const enemyFloor = getLaneBaseline(this.getEntityLane(enemy));

      if (enemy.state === "trapped") {
        enemy.trappedTimer = Math.max(0, (enemy.trappedTimer ?? 0) - delta);
        enemy.y = enemyFloor - enemy.h + 10;
        if (enemy.trappedTimer <= 0) {
          enemy.state = ["chasing", "hunting"].includes(enemy.trappedState) ? enemy.trappedState : "hunting";
          enemy.stateTimer = enemy.state === "chasing" ? ENEMY_CHASE_DURATION * 0.5 : 0;
          delete enemy.trappedState;
        }
      } else if (enemy.state === "stunned") {
        enemy.stateTimer = Math.max(0, enemy.stateTimer - delta);
        enemy.y = enemyFloor - enemy.h;
        if (enemy.stateTimer <= 0) {
          enemy.state = enemy.stunnedState ?? "hunting";
          enemy.stateTimer = enemy.stunnedStateTimer ?? 0;
          delete enemy.stunnedState;
          delete enemy.stunnedStateTimer;
        }
      } else if (enemy.state === "chasing") {
        if (this.isPlayerHidden()) {
          enemy.state = "hunting";
          enemy.preyTarget = null;
          enemy.y = enemyFloor - enemy.h;
        } else {
          enemy.stateTimer = Math.max(0, enemy.stateTimer - delta);
          enemy.laneShiftTimer = (enemy.laneShiftTimer ?? 0) - delta;
          if (enemy.laneShiftTimer <= 0 && this.getEntityLane(enemy) !== this.getEntityLane(p)) {
            const nextLane = this.getEntityLane(enemy) + Math.sign(this.getEntityLane(p) - this.getEntityLane(enemy));
            this.setEntityLane(enemy, nextLane);
            enemy.laneShiftTimer = 0.72;
          }
          this.moveEnemyTowards(enemy, p.x + p.w / 2, chaseSpeed + this.elapsed * 1.4, delta);
          if (enemy.stateTimer <= 0) {
            enemy.state = "hunting";
            enemy.preyTarget = null;
          }
        }
      } else if (enemy.state === "hunting") {
        const lane = this.getEntityLane(enemy);
        const targets = [
          ...this.herd.filter((prey) => !prey.beingEaten && this.getEntityLane(prey) === lane).map((prey) => ({ item: prey, type: "prey" })),
          ...this.eggs.filter((egg) => this.getEntityLane(egg) === lane).map((egg) => ({ item: egg, type: "egg" }))
        ];
        const target = targets.reduce((nearest, candidate) => {
          if (!nearest) return candidate;
          const candidateDistance = Math.abs(candidate.item.x + candidate.item.w / 2 - (enemy.x + enemy.w / 2));
          const nearestDistance = Math.abs(nearest.item.x + nearest.item.w / 2 - (enemy.x + enemy.w / 2));
          return candidateDistance < nearestDistance ? candidate : nearest;
        }, null);
        enemy.preyTarget = target?.type === "prey" ? target.item : null;
        if (target) {
          const targetX = target.item.x + target.item.w / 2;
          const distance = Math.abs(targetX - (enemy.x + enemy.w / 2));
          if (distance <= 58 * getLaneScale(lane)) {
            if (target.type === "prey") {
              target.item.beingEaten = true;
              target.item.beingEatenElapsed = 0;
            }
            enemy.eatTarget = target.item;
            enemy.eatTargetType = target.type;
            enemy.preyTarget = null;
            enemy.state = "eating";
            enemy.stateTimer = ENEMY_EAT_DURATION;
            enemy.y = enemyFloor - enemy.h;
          } else this.moveEnemyTowards(enemy, targetX, chaseSpeed + 24, delta);
        } else enemy.y = enemyFloor - enemy.h;
      } else if (enemy.state === "eating") {
        enemy.stateTimer = Math.max(0, enemy.stateTimer - delta);
        enemy.y = enemyFloor - enemy.h;
        if (enemy.stateTimer <= 0) {
          const eatenTarget = enemy.eatTarget;
          if (enemy.eatTargetType === "egg") this.eggs = this.eggs.filter((egg) => egg !== eatenTarget);
          else this.herd = this.herd.filter((prey) => prey !== eatenTarget);
          enemy.eatTarget = null;
          enemy.eatTargetType = null;
          enemy.state = "departing";
          enemy.stateTimer = 0;
        }
      } else if (enemy.state === "departing") {
        enemy.x -= speed * this.movementMultiplier(enemy) * delta;
        enemy.y = enemyFloor - enemy.h;
      } else if (enemy.state === "fading") {
        enemy.fadeTimer = Math.max(0, enemy.fadeTimer - delta);
        enemy.y = enemyFloor - enemy.h;
      }

      if (this.tryResolvePitfall(enemy, "predator")) continue;

      const enemyHitbox = {
        x: enemy.x + 20 * getLaneScale(this.getEntityLane(enemy)),
        y: enemy.y + 16 * getLaneScale(this.getEntityLane(enemy)),
        w: enemy.w - 40 * getLaneScale(this.getEntityLane(enemy)),
        h: enemy.h - 18 * getLaneScale(this.getEntityLane(enemy))
      };
      for (const rock of this.rocks) {
        if (this.getEntityLane(rock) === this.getEntityLane(enemy) && overlaps(rock, enemyHitbox) && this.tripEnemy(enemy)) {
          rock.consumed = true;
          break;
        }
      }
      const sameLane = this.getEntityLane(p) === this.getEntityLane(enemy);
      const playerContact = sameLane && overlaps(playerHitbox, enemyHitbox);
      if (this.invulnerabilityTimer > 0 || this.isPlayerHidden() || enemy.state === "trapped") continue;
      if (dashing && playerContact && enemy.state !== "stunned") this.stunPredator(enemy, delta);
      else if (playerContact && !["stunned", "fading"].includes(enemy.state)) { this.finish(); return; }
    }
    this.rocks = this.rocks.filter((rock) => !rock.consumed);
    this.enemies = this.enemies.filter((enemy) =>
      enemy.x + enemy.w > 0 &&
      enemy.x < WIDTH + 240 &&
      (enemy.state !== "fading" || enemy.fadeTimer > 0)
    );
  }

  interactWithItem() {
    if (!this.running || this.phase !== "playing") return false;
    const player = this.player;
    const lane = this.getEntityLane(player);
    if (this.carriedItem) {
      const item = this.carriedItem;
      this.setEntityLane(item, lane);
      const direction = player.facing || 1;
      item.x = Math.max(12, Math.min(WIDTH - item.w - 12, player.x + direction * (player.w + 18)));
      item.y = getLaneBaseline(lane) - item.h;
      item.vx = direction * (item.kind === "rock" ? 185 : 115);
      (item.kind === "rock" ? this.rocks : this.eggs).push(item);
      this.carriedItem = null;
      return true;
    }
    const candidates = [...this.eggs, ...this.rocks]
      .filter((item) =>
        this.getEntityLane(item) === lane &&
        Math.abs(item.x + item.w / 2 - (player.x + player.w / 2)) <= ITEM_INTERACTION_RADIUS
      )
      .sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x));
    const item = candidates[0];
    if (!item) return false;
    const collection = item.kind === "egg" ? this.eggs : this.rocks;
    collection.splice(collection.indexOf(item), 1);
    item.vx = 0;
    this.carriedItem = item;
    return true;
  }

  consumeCarriedEgg() {
    if (!this.running || this.phase !== "playing" || this.carriedItem?.kind !== "egg") return false;

    this.carriedItem = null;
    this.invulnerabilityTimer = EGG_INVULNERABILITY_DURATION;
    this.eggsEaten = (this.eggsEaten ?? 0) + 1;
    if (this.eggsEaten % EGGS_PER_CHECKPOINT_CONTINUE === 0) {
      this.checkpointCharges = (this.checkpointCharges ?? 0) + 1;
    }
    return true;
  }

  updateGroundItems(delta, speed) {
    this.eggSpawnTimer -= delta;
    if (this.eggSpawnTimer <= 0) {
      const lane = randomLane();
      this.eggs.push(createEgg(lane, WIDTH + 20));
      this.eggSpawnTimer = 4.8 + Math.random() * 3.2;
    }
    this.rockSpawnTimer -= delta;
    if (this.rockSpawnTimer <= 0) {
      const lane = randomLane();
      this.rocks.push(applyLane({ kind: "rock", x: WIDTH + 30, y: 0, w: 34, h: 25, baseW: 34, baseH: 25, vx: 0 }, lane));
      this.rockSpawnTimer = 6.2 + Math.random() * 3.8;
    }
    for (const item of [...this.eggs, ...this.rocks]) {
      item.x += ((item.vx || 0) - speed * 0.72) * delta;
      item.vx = (item.vx || 0) * Math.max(0, 1 - delta * 2.6);
      item.y = getLaneBaseline(this.getEntityLane(item)) - item.h;
    }
    this.eggs = this.eggs.filter((item) => item.x + item.w > -40);
    this.rocks = this.rocks.filter((item) => item.x + item.w > -50);
  }

  tripEnemy(enemy) {
    if(["fading","departing","eating"].includes(enemy.state))return false;
    enemy.state="fading";enemy.fadeTimer=ENEMY_TRIP_FADE_DURATION;enemy.preyTarget=null;enemy.eatTarget=null;return true;
  }

  drawEgg(egg) {
    const c = this.ctx;
    const x = egg.x, y = egg.y, w = egg.w, h = egg.h;
    const centerX = x + w / 2;
    const pathEgg = () => {
      c.beginPath();
      c.moveTo(centerX, y + h * 0.025);
      c.bezierCurveTo(x + w * 0.29, y + h * 0.025, x + w * 0.07, y + h * 0.28, x + w * 0.085, y + h * 0.56);
      c.bezierCurveTo(x + w * 0.10, y + h * 0.82, x + w * 0.30, y + h * 0.985, centerX, y + h * 0.985);
      c.bezierCurveTo(x + w * 0.70, y + h * 0.985, x + w * 0.90, y + h * 0.82, x + w * 0.915, y + h * 0.56);
      c.bezierCurveTo(x + w * 0.93, y + h * 0.28, x + w * 0.71, y + h * 0.025, centerX, y + h * 0.025);
      c.closePath();
    };

    c.save();
    c.fillStyle = "#eee4cd";
    c.strokeStyle = "#8f7959";
    c.lineWidth = Math.max(1, w * 0.055);
    pathEgg();
    c.fill();
    c.save();
    pathEgg();
    c.clip();

    for (const spot of egg.spots ?? []) {
      const radius = Math.max(0.65, w * spot.radius);
      c.fillStyle = spot.color;
      c.globalAlpha = 0.78;
      c.beginPath();
      c.ellipse(
        x + w * spot.x,
        y + h * spot.y,
        radius,
        Math.max(0.65, radius * spot.aspect * (h / w) * 0.72),
        spot.rotation,
        0,
        Math.PI * 2
      );
      c.fill();
    }

    c.globalAlpha = 0.5;
    c.fillStyle = "#fffaf0";
    c.beginPath();
    c.ellipse(x + w * 0.34, y + h * 0.29, w * 0.075, h * 0.14, -0.36, 0, Math.PI * 2);
    c.fill();
    c.restore();

    c.globalAlpha = 1;
    c.strokeStyle = "#9a8564";
    c.lineWidth = Math.max(1, w * 0.045);
    pathEgg();
    c.stroke();
    c.restore();
  }

  drawRock(rock) {
    const c=this.ctx;c.save();c.fillStyle="#171a19";c.strokeStyle="#555b55";c.lineWidth=2;c.beginPath();
    c.moveTo(rock.x+3,rock.y+rock.h);c.lineTo(rock.x+1,rock.y+11);c.lineTo(rock.x+11,rock.y+2);
    c.lineTo(rock.x+24,rock.y+4);c.lineTo(rock.x+rock.w-1,rock.y+15);c.lineTo(rock.x+rock.w-5,rock.y+rock.h);
    c.closePath();c.fill();c.stroke();c.restore();
  }

  drawPit(pit) {
    const c = this.ctx;
    const floor = getLaneBaseline(pit.lane);
    c.save();
    c.fillStyle = "rgba(28, 30, 22, 0.34)";
    c.beginPath();
    c.ellipse(pit.x + pit.w / 2, floor - 3, pit.w / 2, pit.h / 2, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#30291f";
    c.beginPath();
    c.ellipse(pit.x + pit.w / 2, floor - 5, pit.w * 0.42, pit.h * 0.38, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#b0a276";
    c.lineWidth = Math.max(1, 2 * getLaneScale(pit.lane));
    c.beginPath();
    c.ellipse(pit.x + pit.w / 2, floor - 7, pit.w * 0.48, pit.h * 0.42, 0, Math.PI, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  drawMud(mud) {
    const c = this.ctx;
    const floor = getLaneBaseline(mud.lane);
    c.save();
    c.fillStyle = "#59452e";
    c.beginPath();
    c.ellipse(mud.x + mud.w / 2, floor - 4, mud.w / 2, mud.h / 2, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "rgba(164, 129, 82, 0.78)";
    for (let index = 0; index < 3; index += 1) {
      c.beginPath();
      c.ellipse(mud.x + mud.w * (0.22 + index * 0.27), floor - 7, mud.w * 0.11, mud.h * 0.17, -0.2, 0, Math.PI * 2);
      c.fill();
    }

    // Moving, pulsing highlights make the active slow-down surface visibly shimmer.
    for (let index = 0; index < 5; index += 1) {
      const travel = (this.elapsed * 0.32 + index * 0.21) % 1;
      const phase = index * 1.63 + mud.x * 0.012;
      c.globalAlpha = getMudShimmerOpacity(this.elapsed, phase);
      c.fillStyle = index % 2 === 0 ? "#e8d5a5" : "#c8d5a0";
      c.beginPath();
      c.ellipse(
        mud.x + mud.w * (0.09 + travel * 0.82),
        floor - 8 - Math.sin(this.elapsed * 3.1 + phase) * 1.6,
        mud.w * 0.027,
        Math.max(1, mud.h * 0.12),
        -0.28,
        0,
        Math.PI * 2
      );
      c.fill();
    }

    c.globalAlpha = 0.82;
    c.strokeStyle = "rgba(211, 180, 126, 0.6)";
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(mud.x + mud.w * 0.5, floor - 5, mud.w * 0.39, mud.h * 0.3, 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  drawBush(bush) {
    const c = this.ctx;
    const floor = getLaneBaseline(bush.lane);
    const x = bush.x;
    const y = floor - bush.h;
    c.save();
    c.fillStyle = "#456b35";
    c.beginPath();
    c.ellipse(x + bush.w * 0.5, y + bush.h * 0.72, bush.w * 0.46, bush.h * 0.31, 0, 0, Math.PI * 2);
    c.fill();
    const leaves = [
      [0.16, 0.55, 0.25], [0.34, 0.36, 0.29], [0.56, 0.31, 0.31],
      [0.79, 0.52, 0.25], [0.48, 0.63, 0.32]
    ];
    leaves.forEach(([lx, ly, radius], index) => {
      c.fillStyle = ["#4f843c", "#62984a", "#76a953", "#568c41", "#6b9d4d"][index];
      c.beginPath();
      c.arc(x + bush.w * lx, y + bush.h * ly, bush.h * radius, 0, Math.PI * 2);
      c.fill();
    });
    c.strokeStyle = "rgba(183, 211, 127, 0.6)";
    c.lineWidth = Math.max(1, getLaneScale(bush.lane));
    c.beginPath();
    c.moveTo(x + bush.w * 0.27, y + bush.h * 0.56);
    c.lineTo(x + bush.w * 0.42, y + bush.h * 0.22);
    c.moveTo(x + bush.w * 0.62, y + bush.h * 0.61);
    c.lineTo(x + bush.w * 0.78, y + bush.h * 0.34);
    c.stroke();
    c.restore();
  }

  drawCarriedItem(item) {
    const x=this.player.x+this.player.w/2-item.w/2,y=this.player.y-item.h+8;
    if(item.kind==="egg")this.drawEgg({...item,x,y});else this.drawRock({...item,x,y});
  }

  getDeathMessage() {
    return this.deathCause === "pit"
      ? this.text("CORAL CAYÓ AL POZO", "CORAL FELL INTO THE PIT")
      : this.text("CORAL FUE DEVORADA", "CORAL WAS EATEN");
  }

  updateCheckpointButton() {
    const button = this.root?.querySelector?.("[data-empty-checkpoint]");
    if (!button) return;
    const canContinue = this.phase === "finished" &&
      (this.checkpoint?.milestone ?? 0) > 0 &&
      (this.checkpointCharges ?? 0) > 0;
    button.hidden = !canContinue;
    if (canContinue) {
      button.textContent = `CHECKPOINT · [${this.checkpointCharges}]`;
    }
  }

  continueFromCheckpoint() {
    if (
      this.phase !== "finished" ||
      !this.checkpoint ||
      this.checkpoint.milestone <= 0 ||
      (this.checkpointCharges ?? 0) <= 0
    ) return false;

    const checkpoint = this.checkpoint;
    this.checkpointCharges -= 1;
    this.distance = checkpoint.distance;
    this.elapsed = checkpoint.elapsed;
    this.sceneryOffset = checkpoint.sceneryOffset;
    this.player = createPlayer(checkpoint.playerLane);
    this.player.x = Math.max(22, Math.min(WIDTH - this.player.w - PLAYER_RIGHT_MARGIN, checkpoint.playerX));
    this.enemies = [];
    this.herd = [];
    this.eggs = [];
    this.rocks = [];
    this.pits = [];
    this.mudPuddles = [];
    this.bushes = [];
    this.particles = [];
    this.dashDustClouds = [];
    this.carriedItem = null;
    this.invulnerabilityTimer = 2;
    this.spawnTimer = 1.2;
    this.preyTimer = 0.8;
    this.eggSpawnTimer = 2.2;
    this.rockSpawnTimer = 3.4;
    this.pitSpawnTimer = 5.8;
    this.mudSpawnTimer = 3.8;
    this.bushSpawnTimer = 5.1;
    this.checkpointNoticeTimer = 0;
    this.deathCause = null;
    this.keys.clear();
    this.running = true;
    this.paused = false;
    this.phase = "playing";
    this.root.classList.remove("paused");
    this.root.classList.add("playing");
    this.pauseOverlay.hidden = true;
    this.controlsStrip.hidden = false;
    this.root.querySelector("[data-empty-title]").textContent = this.text("PERSECUSIÓN", "PURSUIT");
    this.root.querySelector("[data-empty-subtitle]").hidden = true;
    this.root.querySelector("[data-empty-instructions]").hidden = true;
    this.root.querySelector("[data-empty-result]").hidden = true;
    this.root.querySelector("[data-empty-start]").hidden = true;
    this.root.querySelector("[data-empty-retry]").hidden = true;
    this.root.querySelector("[data-empty-checkpoint]").hidden = true;
    this.last = performance.now();
    this.updatePauseButton();
    this.updateCheckpointButton();
    this.render();
    this.frame = requestAnimationFrame((now) => this.tick(now));
    return true;
  }

  finish(reason = "eaten") {
    if (!this.running) return;
    this.deathCause = reason === "pit" ? "pit" : "eaten";
    this.running = false;
    this.phase = "finished";
    this.paused = false;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.root.classList.remove("paused");
    this.pauseOverlay.hidden = true;
    this.controlsStrip.hidden = true;
    this.updatePauseButton();
    const score = scoreForDistance(this.distance);
    this.best = Math.max(this.best, score);
    try { localStorage.setItem("frantic-persecution-best", String(this.best)); } catch {}
    this.root.querySelector("[data-empty-title]").textContent = this.text("PARTIDA FINALIZADA", "GAME OVER");
    this.root.querySelector("[data-empty-subtitle]").hidden = true;
    this.root.querySelector("[data-empty-instructions]").hidden = true;
    this.root.querySelector("[data-empty-result]").textContent = this.getDeathMessage();
    this.root.classList.remove("playing");
    this.root.querySelector("[data-empty-result]").hidden = false;
    this.root.querySelector("[data-empty-retry]").hidden = false;
    this.root.querySelector("[data-empty-exit]").hidden = false;
    this.updateCheckpointButton();
    this.render();
  }

  exit() {
    this.running = false;
    this.phase = "idle";
    this.paused = false;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.keys.clear();
    this.pauseOverlay.hidden = true;
    this.controlsStrip.hidden = true;
    this.root.classList.remove("active", "playing", "paused");
    this.root.setAttribute("aria-hidden", "true");
    this.onExit();
  }

  drawSprite(key, x, y, w, h, fallback, animationTime = (this.animationClock ?? this.elapsed ?? 0) * 1000, facing = 1, options = {}) {
    const animation = this.animations[key];
    if (animation?.frames.length) {
      const index = getAnimatedFrameIndex(animation.frames, animationTime);
      const frame = animation.frames[index];
      const rect = getAnimationDrawRect(x, y, w, h, animation, frame);
      const sliding = Boolean(options.sliding);
      const drawWidth = rect.width * (sliding ? 1.12 : 1);
      const drawHeight = rect.height * (sliding ? 0.72 : 1);
      const drawX = rect.x - (drawWidth - rect.width) / 2;
      const drawY = rect.y + rect.height - drawHeight;
      if (shouldFlipMinigameSprite(key, facing)) {
        this.ctx.save();
        this.ctx.translate(drawX + drawWidth, 0);
        this.ctx.scale(-1, 1);
        drawSpriteImage(this.ctx, frame.image, 0, drawY, drawWidth, drawHeight);
        this.ctx.restore();
      } else {
        drawSpriteImage(this.ctx, frame.image, drawX, drawY, drawWidth, drawHeight);
      }
    } else {
      this.ctx.fillStyle = fallback;
      this.ctx.fillRect(x + 10, y + 20, w - 20, h - 24);
    }
  }

  drawDashDustCloud(cloud) {
    const fade = Math.max(0, Math.min(1, cloud.life / cloud.max));
    if (fade <= 0) return;
    const puffs = [
      [0.10, 0.72, 0.15, 0.23], [0.27, 0.48, 0.17, 0.28],
      [0.46, 0.64, 0.19, 0.25], [0.63, 0.42, 0.16, 0.28],
      [0.80, 0.65, 0.16, 0.23], [0.94, 0.77, 0.10, 0.18]
    ];
    const rise = (1 - fade) * 12;
    this.ctx.save();
    this.ctx.globalAlpha = fade * 0.68;
    puffs.forEach(([px, py, rx, ry], index) => {
      this.ctx.fillStyle = index % 2 ? "#c0b397" : "#d9ccb0";
      this.ctx.beginPath();
      this.ctx.ellipse(
        cloud.x + cloud.w * px,
        cloud.y + cloud.h * py + rise,
        cloud.w * rx / 2,
        cloud.h * ry / 2,
        0, 0, Math.PI * 2
      );
      this.ctx.fill();
    });
    this.ctx.restore();
  }

  drawPrairieHerd(scroll = 0) {
    for (let i = 0; i < PRAIRIE_HERD.length; i += 1) {
      const animal = PRAIRIE_HERD[i];
      const x = ((animal.x - scroll * 0.12) % (WIDTH + 180) + (WIDTH + 180)) % (WIDTH + 180) - 90;
      const elapsed = (this.animationClock ?? this.elapsed ?? 0) + i * 0.31;
      const pose = prairieHerdAnimationKey(animal, elapsed);
      this.drawSprite(
        pose, x, animal.y, animal.w, animal.h, "#82975e",
        elapsed * 1000, -1
      );
    }
  }

  render() {
    const ctx = this.ctx;
    const scroll = Number.isFinite(this.sceneryOffset) ? this.sceneryOffset : 0;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    const layeredBackground = this.environmentRenderer?.draw(ctx, {
      cameraX: scroll,
      viewportWidth: WIDTH,
      viewportHeight: HEIGHT,
      elapsed: this.animationClock ?? this.elapsed,
      drawMidground: () => this.drawPrairieHerd(scroll)
    }) ?? false;

    if (!layeredBackground) {
      // Native Canvas fallback for constrained/headless environments.
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#72c9e8");
    sky.addColorStop(0.56, "#c4e8d2");
    sky.addColorStop(1, "#eff0b4");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const sunGlow = ctx.createRadialGradient(790, 98, 12, 790, 98, 170);
    sunGlow.addColorStop(0, "rgba(255, 247, 184, 0.72)");
    sunGlow.addColorStop(1, "rgba(255, 247, 184, 0)");
    ctx.fillStyle = sunGlow;
    ctx.fillRect(610, 0, 350, 280);
    ctx.fillStyle = "#fff2a8";
    ctx.beginPath();
    ctx.arc(790, 98, 34, 0, Math.PI * 2);
    ctx.fill();

    // Soft clouds and distant rolling grassland establish depth.
    ctx.fillStyle = "rgba(255, 255, 239, 0.62)";
    for (let i = 0; i < 4; i += 1) {
      const x = ((150 + i * 255 - scroll * 0.035) % 1180 + 1180) % 1180 - 110;
      const y = 76 + (i % 2) * 46;
      ctx.beginPath();
      ctx.ellipse(x, y, 38, 13, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 27, y - 7, 27, 17, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 51, y, 34, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#b2d77e";
    ctx.beginPath();
    ctx.moveTo(0, 350);
    ctx.bezierCurveTo(125, 292, 230, 305, 350, 347);
    ctx.bezierCurveTo(485, 382, 590, 288, 730, 324);
    ctx.bezierCurveTo(835, 350, 900, 318, WIDTH, 300);
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.lineTo(0, HEIGHT);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#94c65d";
    ctx.beginPath();
    ctx.moveTo(0, 386);
    ctx.bezierCurveTo(175, 340, 280, 365, 420, 386);
    ctx.bezierCurveTo(585, 410, 690, 344, 820, 365);
    ctx.bezierCurveTo(890, 377, 930, 370, WIDTH, 356);
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.lineTo(0, HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Distant shrubs drift more slowly than the foreground.
    for (let i = 0; i < 18; i += 1) {
      const x = ((i * 67 - scroll * 0.22) % 1120 + 1120) % 1120 - 80;
      const y = 366 + (i % 4) * 8;
      ctx.fillStyle = i % 2 ? "#6fa54c" : "#7fb653";
      ctx.beginPath();
      ctx.ellipse(x, y, 25 + (i % 3) * 5, 8 + (i % 2) * 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawPrairieHerd(scroll);

    const ground = ctx.createLinearGradient(0, FLOOR, 0, HEIGHT);
    ground.addColorStop(0, "#83b947");
    ground.addColorStop(0.38, "#65983d");
    ground.addColorStop(1, "#456d32");
    ctx.fillStyle = ground;
    ctx.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);

    // Sunlit grass and small wildflowers move beneath the running dinosaurs.
    for (let i = 0; i < 58; i += 1) {
      const x = ((i * 29 - scroll * (0.72 + (i % 3) * 0.08)) % 1040 + 1040) % 1040;
      const y = FLOOR + 8 + (i % 5) * 17;
      ctx.strokeStyle = i % 3 ? "#b9d77a" : "#d8df86";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y + 10);
      ctx.lineTo(x + ((i % 2) ? -3 : 4), y - 3 - (i % 4) * 2);
      ctx.stroke();
      if (i % 7 === 0) {
        ctx.fillStyle = "#f1df91";
        ctx.beginPath();
        ctx.arc(x + 3, y - 5, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    }


    for (const pit of this.pits ?? []) this.drawPit(pit);
    for (const mud of this.mudPuddles ?? []) this.drawMud(mud);
    for (const egg of this.eggs) this.drawEgg(egg);
    for (const rock of this.rocks) this.drawRock(rock);

    for (let lane = 0; lane < LANE_COUNT; lane += 1) {
      for (const prey of this.herd.filter((item) => this.getEntityLane(item) === lane)) {
        const pose = herdPreyAnimationKey(prey, this.animationClock ?? this.elapsed ?? 0);
        const sink = (prey.trappedTimer ?? 0) > 0 ? 9 * getLaneScale(lane) : 0;
        this.drawSprite(pose, prey.x, prey.y + sink, prey.w, prey.h, "#8e9b72", undefined, prey.direction ?? -1);
      }
      for (const enemy of this.enemies.filter((item) => this.getEntityLane(item) === lane)) {
        const pose = enemyAnimationKey(enemy, this.elapsed);
        const frozenPose = ["departing", "stunned", "trapped"].includes(enemy.state) ||
          (enemy.kind === "xenoraptor" && enemy.state === "hunting" && !enemy.preyTarget);
        ctx.save();
        if (enemy.state === "fading") ctx.globalAlpha = Math.max(0, enemy.fadeTimer / ENEMY_TRIP_FADE_DURATION);
        this.drawSprite(
          pose,
          enemy.x,
          enemy.y,
          enemy.w,
          enemy.h,
          enemy.kind === "xenoraptor" ? "#6c524b" : "#34433c",
          frozenPose ? 0 : this.animationClock * 1000,
          enemy.direction,
          { sliding: ["chasing", "hunting"].includes(enemy.state) && enemy.slideTimer > 0 }
        );
        ctx.restore();
        if (enemy.state === "stunned") {
          ctx.fillStyle = "#fff2a8";
          ctx.font = "20px monospace";
          ctx.fillText("✳", enemy.x + enemy.w / 2 - 7, enemy.y - 5);
        }
      }
      for (const cloud of (this.dashDustClouds ?? []).filter((item) => item.lane === lane)) this.drawDashDustCloud(cloud);
      if (this.getEntityLane(this.player) === lane) {
        const playerY = this.player.y + ((this.player.trappedTimer ?? 0) > 0 ? 10 * getLaneScale(lane) : 0);
        ctx.save();
        if (this.invulnerabilityTimer > 0) ctx.globalAlpha = Math.floor(this.invulnerabilityTimer * 12) % 2 ? 0.42 : 1;
        if (this.isPlayerHidden()) ctx.globalAlpha *= 0.78;
        this.drawSprite(coralAnimationKey(this.player, this.phase), this.player.x, playerY, this.player.w, this.player.h, "#e7a7a0", undefined, this.player.facing);
        ctx.restore();
        if (this.carriedItem) this.drawCarriedItem(this.carriedItem);
      }
      for (const bush of (this.bushes ?? []).filter((item) => item.lane === lane)) this.drawBush(bush);
    }

    if (this.isPlayerHidden()) {
      ctx.fillStyle = "#f4efc2";
      ctx.font = "13px monospace";
      ctx.fillText(this.text("OCULTA", "HIDDEN"), 26, 56);
    } else if ((this.player.trappedTimer ?? 0) > 0) {
      ctx.fillStyle = "#f4efc2";
      ctx.font = "13px monospace";
      ctx.fillText(this.text("ATRAPADA ", "TRAPPED ") + this.player.trappedTimer.toFixed(1) + "s", 26, 56);
    } else if (this.isInMud(this.player)) {
      ctx.fillStyle = "#f4efc2";
      ctx.font = "13px monospace";
      ctx.fillText(this.text("LODO · LENTO", "MUD · SLOWED"), 26, 56);
    }
    if (this.invulnerabilityTimer > 0) {
      ctx.fillStyle = "#fff0bd";
      ctx.font = "13px monospace";
      ctx.fillText("INVULNERABLE " + this.invulnerabilityTimer.toFixed(1) + "s", 26, 74);
    }
    if (this.phase === "playing" || this.phase === "finished") {
      ctx.fillStyle = "#30452a";
      ctx.font = "16px monospace";
      ctx.fillText(this.text("DISTANCIA", "DISTANCE") + "  " + scoreForDistance(this.distance) + " M", 26, 34);
      ctx.textAlign = "right";
      ctx.fillText(this.text("CARRIL", "LANE") + " " + (this.getEntityLane(this.player) + 1) + "/4", WIDTH - 26, 34);
      ctx.font = "12px monospace";
      const checkpointMeters = this.checkpoint?.milestone
        ? this.checkpoint.milestone * CHECKPOINT_INTERVAL_METERS
        : CHECKPOINT_INTERVAL_METERS;
      ctx.fillText(
        this.checkpoint?.milestone
          ? this.text("CHECKPOINT ", "CHECKPOINT ") + checkpointMeters + " M"
          : this.text("PRÓXIMO CP ", "NEXT CP ") + checkpointMeters + " M",
        WIDTH - 26,
        56
      );
      ctx.textAlign = "left";
      const eggsProgress = (this.eggsEaten ?? 0) % EGGS_PER_CHECKPOINT_CONTINUE;
      ctx.font = "12px monospace";
      ctx.fillText(
        this.text("HUEVOS ", "EGGS ") + eggsProgress + "/" + EGGS_PER_CHECKPOINT_CONTINUE +
          " · " + (this.checkpointCharges ?? 0) + " " + this.text("CONTINUACIONES", "CONTINUES"),
        26,
        94
      );
      if ((this.checkpointNoticeTimer ?? 0) > 0) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff0bd";
        ctx.font = "16px monospace";
        ctx.fillText(
          this.text("CHECKPOINT ALCANZADO · ", "CHECKPOINT REACHED · ") + checkpointMeters + " M",
          WIDTH / 2,
          112
        );
        ctx.textAlign = "left";
      }
    }
    if (!this.running && !this.root.querySelector("[data-empty-result]").hidden) {
      ctx.fillStyle = "rgba(7,13,12,.45)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  destroy() {
    this.exit();
    this.canvasViewport.disconnect();
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }
}
