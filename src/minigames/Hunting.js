import { HunterProjectile } from "../entities/HunterProjectile.js";
import { observeCanvasViewport } from "../rendering/CanvasUtils.js";
import { WildDinosaur } from "../entities/WildDinosaur.js";
import { SpriteRenderer } from "../rendering/SpriteRenderer.js";
import { MinigameEnvironmentRenderer, MINIGAME_ENVIRONMENT_SCENES } from "./MinigameEnvironment.js";
import { drawGroundScenery } from "../rendering/SceneryRenderer.js";
import { createGroundSceneryProp } from "../world/SceneryGenerator.js";

let WIDTH = 960;
const HEIGHT = 540;
const FLOOR = 438;
const SECTION_END = 5200;
const BEST_KEY = "frantic-hunting-best";
const PREDATOR_BEST_KEY = "frantic-hunting-predator-best";
export const HUNTING_GROUND_SCENERY_SPAWN_SPACING = 215;
export const HUNTING_GROUND_SCENERY_VIEWPORT_MARGIN = 64;
export const HUNTING_ENEMY_SPAWN_MARGIN = 28;
export const HUNTING_CAMERA_DEAD_ZONE_LEFT_RATIO = 0.22;
export const HUNTING_CAMERA_DEAD_ZONE_RIGHT_RATIO = 0.78;
export const HUNTER_MAGAZINE_SIZE = 8;
export const HUNTER_RESERVE_AMMO = 28;
export const HUNTER_RELOAD_DURATION = 1.65;
export const PREDATOR_BITE_DAMAGE = 2;
export const PREDATOR_BITE_COOLDOWN = 0.78;
export const PREDATOR_PLAYER_HEALTH = 24;

/**
 * Returns the signed camera movement needed to keep the player in a broad
 * central viewport zone. Negative values follow leftward movement; positive
 * values follow rightward movement.
 */
export function getHuntingCameraFollowDelta(playerScreenX, playerWidth, viewportWidth) {
  if (![playerScreenX, playerWidth, viewportWidth].every(Number.isFinite) ||
      playerWidth <= 0 || viewportWidth <= 0) return 0;

  const maxPlayerX = Math.max(22, viewportWidth - playerWidth - 22);
  const leftLimit = Math.min(
    Math.max(22, viewportWidth * HUNTING_CAMERA_DEAD_ZONE_LEFT_RATIO),
    maxPlayerX
  );
  const rightLimit = Math.max(
    leftLimit,
    Math.min(maxPlayerX, viewportWidth * HUNTING_CAMERA_DEAD_ZONE_RIGHT_RATIO - playerWidth)
  );

  if (playerScreenX < leftLimit) return playerScreenX - leftLimit;
  if (playerScreenX > rightLimit) return playerScreenX - rightLimit;
  return 0;
}

const WAVES = Object.freeze([
  { at: 720, kinds: [
    "venatosaurus-impavidus", "venatosaurus-saevidicus", "venatosaurus-impavidus",
    "venatosaurus-saevidicus", "venatosaurus-impavidus", "venatosaurus-saevidicus"
  ] },
  { at: 1680, kinds: [
    "venatosaurus-saevidicus", "venatosaurus-impavidus", "venatosaurus-saevidicus",
    "venatosaurus-impavidus", "venatosaurus-saevidicus", "venatosaurus-impavidus",
    "venatosaurus-saevidicus"
  ] },
  { at: 2820, kinds: [
    "venatosaurus-impavidus", "venatosaurus-saevidicus", "venatosaurus-impavidus",
    "venatosaurus-saevidicus", "venatosaurus-impavidus", "venatosaurus-saevidicus",
    "venatosaurus-impavidus", "venatosaurus-saevidicus"
  ] },
  { at: 4060, kinds: [
    "venatosaurus-saevidicus", "venatosaurus-impavidus", "venatosaurus-saevidicus",
    "venatosaurus-impavidus", "venatosaurus-saevidicus", "venatosaurus-impavidus",
    "venatosaurus-saevidicus", "venatosaurus-impavidus", "venatosaurus-saevidicus"
  ] }
]);
export const TOTAL_DINOSAURS = WAVES.reduce((sum, wave) => sum + wave.kinds.length, 0);
const PREDATOR_WAVES = Object.freeze([
  { at: 620, count: 2 },
  { at: 1540, count: 2 },
  { at: 2760, count: 3 },
  { at: 4060, count: 3 }
]);
export const TOTAL_PREDATOR_HUNTERS = PREDATOR_WAVES.reduce((sum, wave) => sum + wave.count, 0);
const TEAM_COLORS = [
  { vest: "#596b50", trim: "#d8f36a", pack: "#3b463b" },
  { vest: "#52616a", trim: "#e5b16a", pack: "#303c43" },
  { vest: "#745b45", trim: "#d3d0ad", pack: "#514333" },
  { vest: "#4c685f", trim: "#d58f69", pack: "#344b43" }
];

export function formatTime(milliseconds) {
  const centiseconds = Math.floor(Math.max(0, Number(milliseconds) || 0) / 10);
  const minutes = Math.floor(centiseconds / 6000);
  const seconds = Math.floor((centiseconds % 6000) / 100);
  const fraction = centiseconds % 100;
  return [minutes, seconds, fraction].map(value => String(value).padStart(2, "0")).join(":");
}

export function createWavePlan() {
  return WAVES.map(wave => ({ at: wave.at, kinds: [...wave.kinds] }));
}

export function createPredatorWavePlan() {
  return PREDATOR_WAVES.map(wave => ({ ...wave }));
}

export function formatHunterLabel(index, isPlayer, locale = "es") {
  if (isPlayer) return locale === "en" ? "YOU" : "VOS";
  return (locale === "en" ? "AI " : "IA ") + index;
}

export function nearestTarget(hunter, dinosaurs, maxDistance = Infinity) {
  const center = hunter.x + hunter.w / 2;
  let nearest = null;
  let nearestDistance = maxDistance;
  for (const dinosaur of dinosaurs) {
    if (!dinosaur || dinosaur.defeated || dinosaur.health <= 0) continue;
    const distance = Math.abs(dinosaur.x + dinosaur.w / 2 - center);
    if (distance < nearestDistance) {
      nearest = dinosaur;
      nearestDistance = distance;
    }
  }
  return nearest;
}

export function canCompleteSection(playerX, exitX, dinosaurs, spawnedWaves, totalWaves) {
  return playerX >= exitX && spawnedWaves >= totalWaves &&
    dinosaurs.length === TOTAL_DINOSAURS && dinosaurs.every(dinosaur => dinosaur.defeated);
}

export function canCompletePredatorSection(playerX, exitX, hunters, spawnedWaves, totalWaves) {
  return playerX >= exitX && spawnedWaves >= totalWaves &&
    hunters.length === TOTAL_PREDATOR_HUNTERS &&
    hunters.every(hunter => hunter.defeated || hunter.health <= 0);
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
    a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hunterActor(index, x, isPlayer = index === 0) {
  return {
    id: isPlayer ? "hunting-player" : "hunting-ai-" + index,
    squadIndex: index,
    x, y: FLOOR - 64, w: 38, h: 64, direction: 1,
    health: isPlayer ? 4 : 3, maxHealth: isPlayer ? 4 : 3,
    invulnerable: 0, downTimer: 0, fireCooldown: 0.12 + index * 0.18,
    ammo: HUNTER_MAGAZINE_SIZE,
    reserveAmmo: HUNTER_RESERVE_AMMO,
    reloadTimer: 0,
    shotInterval: isPlayer ? 0.34 : 0.78 + index * 0.07,
    vy: 0, onGround: true, isPlayer, defeated: false
  };
}

export class Hunting {
  constructor(root, onExit = () => {}, spriteRenderer = null, onBeforeStart = (_mode, proceed) => proceed()) {
    this.root = root;
    this.canvas = root.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvasViewport = observeCanvasViewport(root.querySelector(".hunting-stage"), this.canvas, (width) => {
      WIDTH = width;
      this.ctx.imageSmoothingEnabled = false;
    });
    this.onExit = onExit;
    this.onBeforeStart = onBeforeStart;
    this.locale = "es";
    this.mode = "sentinel";
    this.playerAttackTimer = 0;
    this.playerAttackHit = false;
    this.sprites = spriteRenderer ?? new SpriteRenderer(import.meta.env.BASE_URL);
    this.environmentRenderer = new MinigameEnvironmentRenderer({
      scene: MINIGAME_ENVIRONMENT_SCENES.hunting,
      groundY: FLOOR,
      seed: 6207,
      sectionLength: SECTION_END + 1200
    });
    this.keys = new Set();
    this.pointer = { x: WIDTH * 0.72, y: FLOOR - 60, active: false };
    this.pointerDown = false;
    this.running = false;
    this.paused = false;
    this.frame = null;
    this.last = 0;
    this.reset();

    this.handleKeyDown = event => {
      if (!this.root.classList.contains("active")) return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyR"].includes(event.code)) event.preventDefault();
      if (event.code === "Escape" && !event.repeat) { this.exit(); return; }
      if (event.code === "KeyP" && !event.repeat && this.running) { this.togglePause(); return; }
      if (event.code === "KeyR" && !event.repeat && this.running && this.mode === "sentinel") {
        this.reloadPlayer();
        return;
      }
      if (["ArrowLeft","ArrowRight","ArrowUp","Space","KeyA","KeyD","KeyW","KeyF"].includes(event.code)) this.keys.add(event.code);
      if (["ArrowUp","KeyW"].includes(event.code) && !event.repeat && this.running) this.jump();
    };
    this.handleKeyUp = event => this.keys.delete(event.code);
    this.handleBlur = () => { this.keys.clear(); this.pointerDown = false; };
    this.handlePointerMove = event => {
      const bounds = this.canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      this.pointer = {
        x: (event.clientX - bounds.left) / bounds.width * WIDTH,
        y: (event.clientY - bounds.top) / bounds.height * HEIGHT,
        active: true
      };
    };
    this.handlePointerDown = event => {
      if (!this.running || event.button !== 0) return;
      event.preventDefault();
      this.handlePointerMove(event);
      this.pointerDown = true;
      this.firePlayer();
    };
    this.handlePointerUp = () => { this.pointerDown = false; };

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
    window.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    root.querySelector("[data-ta-start]").addEventListener("click", () => this.requestStart("sentinel"));
    root.querySelector("[data-ta-predator]").addEventListener("click", () => this.requestStart("predator"));
    root.querySelector("[data-ta-retry]").addEventListener("click", () => this.requestStart(this.mode));
    root.querySelector("[data-ta-exit]").addEventListener("click", () => this.exit());
    this.setLocale(this.locale);

  }

  text(es, en) { return this.locale === "es" ? es : en; }

  setLocale(locale) {
    this.locale = locale === "en" ? "en" : "es";
    this.root.querySelector("[data-ta-title]").textContent = this.text("CACERÍA", "HUNTING");
    this.root.querySelector("[data-ta-subtitle]").textContent = this.text(
      "Elegí tu rol: protegé la expedición como cazador o sobreviví como dinosaurio.",
      "Choose your role: protect the expedition as a hunter or survive as a dinosaur."
    );
    this.root.querySelector("[data-ta-instructions]").textContent = this.text(
      "CENTINELA: A / D mover · W / ↑ saltar · ESPACIO / F / clic disparar · R recargar. DEPREDADOR: A / D mover · W / ↑ saltar · ESPACIO / F / clic morder. P pausa · ESC salir.",
      "SENTINEL: A / D move · W / ↑ jump · SPACE / F / click fire · R reload. PREDATOR: A / D move · W / ↑ jump · SPACE / F / click bite. P pause · ESC exit."
    );
    this.root.querySelector("[data-ta-start]").textContent = this.text("CENTINELA", "SENTINEL");
    this.root.querySelector("[data-ta-predator]").textContent = this.text("DEPREDADOR", "PREDATOR");
    this.root.querySelector("[data-ta-retry]").textContent = this.text("VOLVER A INTENTAR", "TRY AGAIN");
    this.root.querySelector("[data-ta-exit]").textContent = this.text("SALIR", "EXIT");
    this.root.querySelector("[data-ta-status]").textContent = this.text("SECCIÓN 01 // EXTRACCIÓN", "SECTION 01 // EXTRACTION");
    if (this.root.classList.contains("active")) this.render();
  }

  open() {
    this.root.classList.add("active");
    this.canvasViewport();
    this.root.classList.remove("playing");
    this.root.setAttribute("aria-hidden", "false");
    this.mode = "sentinel";
    this.reset();
    this.root.querySelector("[data-ta-start]").hidden = false;
    this.root.querySelector("[data-ta-predator]").hidden = false;
    this.root.querySelector("[data-ta-retry]").hidden = true;
    this.root.querySelector("[data-ta-exit]").hidden = false;
    this.root.querySelector("[data-ta-result]").hidden = true;
    this.root.querySelector("[data-ta-start]").focus();
    this.render();
  }

  reset() {
    this.running = false;
    this.paused = false;
    if (this.frame !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.frame);
    this.frame = null;
    this.last = 0;
    this.elapsed = 0;
    this.cameraX = 0;
    this.waveIndex = 0;
    this.dinosaurs = [];
    this.projectiles = [];
    this.particles = [];
    this.playerAttackTimer = 0;
    this.playerAttackHit = false;
    this.predatorHunterKills = 0;
    this.groundScenery = [];
    this.groundScenerySpawnIndex = 0;
    this.nextGroundSceneryX = WIDTH + 12;
    this.nextGroundSceneryLeftX = -12;
    this.kills = 0;
    this.finished = null;
    this.keys.clear();
    this.pointerDown = false;
    if (this.mode === "predator") {
      this.hunters = [];
      this.player = new WildDinosaur({
        id: "hunting-predator-player",
        kind: "venatosaurus-saevidicus",
        x: 130,
        groundY: FLOOR,
        patrolStart: 0,
        patrolEnd: SECTION_END,
        direction: 1
      });
      this.player.health = PREDATOR_PLAYER_HEALTH;
      this.player.maxHealth = PREDATOR_PLAYER_HEALTH;
      this.player.invulnerable = 0;
      this.wavePlan = createPredatorWavePlan();
    } else {
      this.hunters = [
        hunterActor(0, 130), hunterActor(1, 42),
        hunterActor(2, 2), hunterActor(3, -38)
      ];
      this.player = this.hunters[0];
      this.wavePlan = createWavePlan();
    }
    this.best = 0;
    const bestKey = this.mode === "predator" ? PREDATOR_BEST_KEY : BEST_KEY;
    try { this.best = Math.max(0, Number(localStorage.getItem(bestKey)) || 0); } catch {}
  }

  requestStart(mode = this.mode) {
    if (!this.root.classList.contains("active")) return;
    const selectedMode = mode === "predator" ? "predator" : "sentinel";
    this.onBeforeStart("hunting", () => this.start(selectedMode));
  }

  start(mode = this.mode) {
    if (!this.root.classList.contains("active")) return;
    this.mode = mode === "predator" ? "predator" : "sentinel";
    this.reset();
    this.running = true;
    this.root.classList.add("playing");
    this.root.querySelector("[data-ta-start]").hidden = true;
    this.root.querySelector("[data-ta-predator]").hidden = true;
    this.root.querySelector("[data-ta-retry]").hidden = true;
    this.root.querySelector("[data-ta-result]").hidden = true;
    this.last = performance.now();
    this.setModeIntroCopy();
    this.frame = requestAnimationFrame(now => this.tick(now));
  }

  setModeIntroCopy() {
    const predator = this.mode === "predator";
    this.root.querySelector("[data-ta-title]").textContent = this.text(
      predator ? "DEPREDADOR" : "CENTINELA",
      predator ? "PREDATOR" : "SENTINEL"
    );
    this.root.querySelector("[data-ta-subtitle]").textContent = predator
      ? this.text(
        "Controlá al Venatosaurus. Derribá a los cazadores y alcanzá la extracción.",
        "Control the Venatosaurus. Take down the hunters and reach extraction."
      )
      : this.text(
        "Liderá la escuadra. Administrá la munición y despejá las cuatro oleadas.",
        "Lead the squad. Manage ammunition and clear all four waves."
      );
    this.root.querySelector("[data-ta-instructions]").textContent = predator
      ? this.text(
        "A / D o ← / →: mover · W / ↑: saltar · ESPACIO / F o clic: morder · P: pausa · ESC: salir",
        "A / D or ← / →: move · W / ↑: jump · SPACE / F or click: bite · P: pause · ESC: exit"
      )
      : this.text(
        "A / D o ← / →: mover · W / ↑: saltar · ESPACIO / F o clic: disparar · R: recargar · P: pausa · ESC: salir",
        "A / D or ← / →: move · W / ↑: jump · SPACE / F or click: fire · R: reload · P: pause · ESC: exit"
      );
  }

  togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;
    if (this.paused) {
      if (this.frame !== null) cancelAnimationFrame(this.frame);
      this.frame = null;
      this.root.querySelector("[data-ta-status]").textContent = this.text("PAUSA", "PAUSED");
      this.render();
      return;
    }
    this.last = performance.now();
    this.root.querySelector("[data-ta-status]").textContent = this.text(
      this.mode === "predator" ? "DEPREDADOR // CAZADORES" : "CENTINELA // EXTRACCIÓN",
      this.mode === "predator" ? "PREDATOR // HUNTERS" : "SENTINEL // EXTRACTION"
    );
    this.frame = requestAnimationFrame(now => this.tick(now));
  }

  tick(now) {
    if (!this.running || this.paused) return;
    const delta = Math.min(Math.max(0, (now - this.last) / 1000), 0.04);
    this.last = now;
    this.update(delta);
    this.render();
    if (this.running && !this.paused) this.frame = requestAnimationFrame(time => this.tick(time));
  }

  jump() {
    if (!this.player.onGround) return;
    this.player.vy = -570;
    this.player.onGround = false;
  }

  spawnWave(wave) {
    if (this.mode === "predator") {
      const spawnX = this.cameraX + WIDTH + HUNTING_ENEMY_SPAWN_MARGIN;
      for (let i = 0; i < wave.count; i += 1) {
        const hunter = hunterActor(this.hunters.length + 1, spawnX + i * 86, false);
        hunter.id = "predator-hunter-" + (this.hunters.length + 1);
        hunter.health = 3;
        hunter.maxHealth = 3;
        hunter.ammo = 5;
        hunter.reserveAmmo = 5;
        hunter.shotInterval = 1.2;
        hunter.fireCooldown = 0.45 + i * 0.16;
        this.hunters.push(hunter);
      }
      return;
    }

    const spawnX = this.cameraX + WIDTH + HUNTING_ENEMY_SPAWN_MARGIN;
    const patrolStart = Math.max(0, spawnX - 220);
    const patrolEnd = spawnX + wave.kinds.length * 112 + 360;
    for (let i = 0; i < wave.kinds.length; i += 1) {
      const kind = wave.kinds[i];
      const dinosaur = new WildDinosaur({
        id: "hunting-" + (this.dinosaurs.length + 1),
        kind,
        x: spawnX + i * 112,
        groundY: FLOOR,
        patrolStart,
        patrolEnd,
        direction: i % 2 === 0 ? -1 : 1
      });
      dinosaur.maxHealth = kind === "venatosaurus-saevidicus" ? 4 : 3;
      dinosaur.health = dinosaur.maxHealth;
      this.dinosaurs.push(dinosaur);
    }
  }

  updateGroundScenery(random = Math.random) {
    this.groundScenery ??= [];
    this.groundScenerySpawnIndex ??= 0;
    this.nextGroundSceneryX ??= WIDTH + 12;
    this.nextGroundSceneryLeftX ??= -12;

    const spawn = (edgeX, direction) => {
      const prop = createGroundSceneryProp({
        environment: MINIGAME_ENVIRONMENT_SCENES.hunting.environment,
        x: edgeX,
        groundY: FLOOR,
        random,
        id: "hunting-ground-" + this.groundScenerySpawnIndex
      });
      this.groundScenerySpawnIndex += 1;
      if (!prop) return;

      // Keep each prop fully outside the viewport until the camera reveals it.
      prop.x += direction * (prop.width / 2 + 12);
      this.groundScenery.push(prop);
    };

    const rightEdge = this.cameraX + WIDTH + HUNTING_GROUND_SCENERY_VIEWPORT_MARGIN;
    while (this.nextGroundSceneryX <= rightEdge) {
      spawn(this.nextGroundSceneryX, 1);
      this.nextGroundSceneryX += HUNTING_GROUND_SCENERY_SPAWN_SPACING;
    }

    const leftEdge = this.cameraX - HUNTING_GROUND_SCENERY_VIEWPORT_MARGIN;
    while (this.nextGroundSceneryLeftX >= leftEdge) {
      spawn(this.nextGroundSceneryLeftX, -1);
      this.nextGroundSceneryLeftX -= HUNTING_GROUND_SCENERY_SPAWN_SPACING;
    }
  }

  beginWeaponReload(hunter) {
    if (!hunter || hunter.reloadTimer > 0 || hunter.ammo >= HUNTER_MAGAZINE_SIZE ||
        hunter.reserveAmmo <= 0 || hunter.health <= 0) return false;
    hunter.reloadTimer = HUNTER_RELOAD_DURATION;
    return true;
  }

  updateWeapon(hunter, delta) {
    if (!hunter) return;
    hunter.fireCooldown = Math.max(0, hunter.fireCooldown - delta);
    if (hunter.reloadTimer > 0) {
      hunter.reloadTimer = Math.max(0, hunter.reloadTimer - delta);
      if (hunter.reloadTimer === 0) {
        const loaded = Math.min(HUNTER_MAGAZINE_SIZE - hunter.ammo, hunter.reserveAmmo);
        hunter.ammo += loaded;
        hunter.reserveAmmo -= loaded;
      }
    } else if (hunter.ammo <= 0 && hunter.reserveAmmo > 0) {
      this.beginWeaponReload(hunter);
    }
  }

  reloadPlayer() {
    if (!this.running || this.mode !== "sentinel") return false;
    return this.beginWeaponReload(this.player);
  }

  fire(hunter, targetX, targetY) {
    if (!hunter || hunter.health <= 0 || hunter.downTimer > 0 || hunter.defeated ||
        hunter.reloadTimer > 0) return false;
    if (hunter.ammo <= 0) {
      this.beginWeaponReload(hunter);
      return false;
    }
    if (hunter.fireCooldown > 0) return false;
    const muzzleX = hunter.x + (hunter.direction > 0 ? hunter.w + 3 : -3);
    const muzzleY = hunter.y + 31;
    if (Math.abs(targetX - muzzleX) < 2 && Math.abs(targetY - muzzleY) < 2) targetX += hunter.direction * 500;
    this.projectiles.push(new HunterProjectile({
      x: muzzleX, y: muzzleY, targetX, targetY,
      shooterId: hunter.id, speed: 710, damage: 1, radius: 5, lifetime: 2.3
    }));
    hunter.ammo -= 1;
    hunter.fireCooldown = hunter.shotInterval ?? 0.5;
    this.particles.push({ x: muzzleX, y: muzzleY, vx: hunter.direction * 36, vy: -12, life: 0.11, max: 0.11, color: "#ffe5a1", size: 5 });
    return true;
  }

  firePlayer() {
    if (!this.running) return false;
    if (this.mode === "predator") return this.startPredatorAttack();
    const target = nearestTarget(this.player, this.dinosaurs, Infinity);
    const targetX = this.pointer.active
      ? this.pointer.x + this.cameraX
      : target ? target.x + target.w / 2 : this.player.x + this.player.direction * 600;
    const targetY = this.pointer.active
      ? this.pointer.y
      : target ? target.y + target.h * 0.42 : this.player.y + 22;
    this.player.direction = targetX >= this.player.x ? 1 : -1;
    return this.fire(this.player, targetX, targetY);
  }

  startPredatorAttack() {
    if (this.mode !== "predator" || this.player.attackCooldown > 0) return false;
    this.player.attackCooldown = PREDATOR_BITE_COOLDOWN;
    this.playerAttackTimer = 0.24;
    this.playerAttackHit = false;
    this.player.state = "attack";
    return true;
  }

  getPredatorAttackBox() {
    if (this.mode !== "predator" || this.playerAttackTimer <= 0) return null;
    const player = this.player;
    return {
      x: player.direction > 0 ? player.x + player.w - 8 : player.x - 68,
      y: player.y + 30,
      w: 76,
      h: 48
    };
  }

  updatePredatorAttack(delta) {
    if (this.mode !== "predator") return;
    this.player.attackCooldown = Math.max(0, this.player.attackCooldown - delta);
    this.playerAttackTimer = Math.max(0, this.playerAttackTimer - delta);
    const attackBox = this.getPredatorAttackBox();
    if (attackBox && !this.playerAttackHit) {
      const target = this.hunters.find(hunter => !hunter.defeated && hunter.health > 0 && overlaps(attackBox, hunter));
      if (target) {
        this.playerAttackHit = true;
        this.damageHunter(target, PREDATOR_BITE_DAMAGE);
      }
    }
    if (this.playerAttackTimer <= 0 && this.player.state === "attack") {
      this.player.state = "pursuit";
    }
  }

  update(delta) {
    this.elapsed += delta;
    const player = this.player;
    const predatorMode = this.mode === "predator";
    const move = Number(this.keys.has("ArrowRight") || this.keys.has("KeyD")) -
      Number(this.keys.has("ArrowLeft") || this.keys.has("KeyA"));

    if (move !== 0) player.direction = move;
    player.x = clamp(player.x + move * (predatorMode ? 265 : 245) * delta, 18, SECTION_END);
    player.invulnerable = Math.max(0, (player.invulnerable ?? 0) - delta);

    if (predatorMode) {
      this.updatePredatorAttack(delta);
      if (this.keys.has("Space") || this.keys.has("KeyF") || this.pointerDown) this.firePlayer();
    } else {
      this.updateWeapon(player, delta);
      if (this.keys.has("Space") || this.keys.has("KeyF") || this.pointerDown) this.firePlayer();
    }

    player.vy += 1500 * delta;
    player.y += player.vy * delta;
    if (player.y + player.h >= FLOOR) {
      player.y = FLOOR - player.h;
      player.vy = 0;
      player.onGround = true;
    }

    this.cameraX += getHuntingCameraFollowDelta(player.x - this.cameraX, player.w, WIDTH);
    this.updateGroundScenery();

    while (this.waveIndex < this.wavePlan.length && this.wavePlan[this.waveIndex].at <= player.x + 510) {
      this.spawnWave(this.wavePlan[this.waveIndex]);
      this.waveIndex += 1;
    }

    const firstHunterIndex = predatorMode ? 0 : 1;
    for (let i = firstHunterIndex; i < this.hunters.length; i += 1) {
      const hunter = this.hunters[i];
      if (hunter.defeated) continue;

      if (!predatorMode && hunter.health <= 0) {
        hunter.downTimer -= delta;
        if (hunter.downTimer <= 0) {
          hunter.health = hunter.maxHealth;
          hunter.invulnerable = 0.8;
          hunter.x = Math.max(0, player.x - 72 * i);
          hunter.y = FLOOR - hunter.h;
        }
        continue;
      }
      if (hunter.health <= 0) continue;

      hunter.invulnerable = Math.max(0, hunter.invulnerable - delta);
      this.updateWeapon(hunter, delta);
      hunter.y = FLOOR - hunter.h;

      if (predatorMode) {
        const playerCenter = player.x + player.w / 2;
        const hunterCenter = hunter.x + hunter.w / 2;
        const separation = playerCenter - hunterCenter;
        hunter.direction = separation >= 0 ? 1 : -1;
        const desiredX = separation >= 0
          ? player.x - hunter.w - 165
          : player.x + player.w + 165;
        hunter.x += clamp(desiredX - hunter.x, -150 * delta, 150 * delta);
        hunter.x = clamp(hunter.x, 0, SECTION_END);
        if (Math.abs(separation) <= 760 && hunter.fireCooldown <= 0) {
          this.fire(hunter, playerCenter, player.y + player.h * 0.48);
        }
        continue;
      }

      const target = nearestTarget(hunter, this.dinosaurs, 860);
      const formationX = Math.max(0, player.x - 66 * i);
      const desiredX = target ? target.x + (hunter.x < target.x ? -138 : target.w + 26) : formationX;
      hunter.x += clamp(desiredX - hunter.x, -235 * delta, 235 * delta);
      hunter.x = clamp(hunter.x, 0, SECTION_END);
      if (target) {
        hunter.direction = target.x + target.w / 2 >= hunter.x + hunter.w / 2 ? 1 : -1;
        if (hunter.fireCooldown <= 0) {
          this.fire(hunter, target.x + target.w / 2, target.y + target.h * 0.43);
        }
      } else {
        hunter.direction = player.x >= hunter.x ? 1 : -1;
      }
    }

    if (!predatorMode) {
      const activeHunters = this.hunters
        .filter(hunter => hunter.health > 0 && hunter.downTimer <= 0)
        .map(hunter => ({ target: hunter, kind: "hunter" }));
      for (const dinosaur of this.dinosaurs) {
        if (dinosaur.defeated) continue;
        dinosaur.update(delta, activeHunters);
        const attackBox = dinosaur.attackBox;
        if (attackBox) {
          for (const entry of activeHunters) {
            if (!overlaps(attackBox, entry.target)) continue;
            this.damageHunter(entry.target);
            if (!this.running) return;
            break;
          }
        }
      }
    }

    for (const projectile of this.projectiles) {
      projectile.update(delta);
      if (!projectile.active) continue;

      if (predatorMode) {
        const hitPlayer =
          projectile.x + projectile.radius >= player.x + 8 &&
          projectile.x - projectile.radius <= player.x + player.w - 8 &&
          projectile.y + projectile.radius >= player.y + 14 &&
          projectile.y - projectile.radius <= player.y + player.h - 8;
        if (!hitPlayer) continue;
        projectile.active = false;
        this.damagePredator(projectile.damage);
        if (!this.running) return;
        continue;
      }

      const target = this.dinosaurs.find(dinosaur =>
        !dinosaur.defeated &&
        projectile.x + projectile.radius >= dinosaur.x + 8 &&
        projectile.x - projectile.radius <= dinosaur.x + dinosaur.w - 8 &&
        projectile.y + projectile.radius >= dinosaur.y + 14 &&
        projectile.y - projectile.radius <= dinosaur.y + dinosaur.h - 8
      );
      if (!target) continue;
      projectile.active = false;
      const result = target.takeDamage(projectile.damage);
      if (result.defeated) {
        this.kills += 1;
        this.burst(target.x + target.w / 2, target.y + target.h * 0.55, "#e8a56e", 13);
      } else if (result.hit) {
        this.burst(projectile.x, projectile.y, "#f5dc9a", 4);
      }
    }
    this.projectiles = this.projectiles.filter(projectile => projectile.active);
    for (const particle of this.particles) {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += 150 * delta;
      particle.life = Math.max(0, particle.life - delta);
    }
    this.particles = this.particles.filter(particle => particle.life > 0);

    const completed = predatorMode
      ? canCompletePredatorSection(player.x, SECTION_END - 65, this.hunters, this.waveIndex, this.wavePlan.length)
      : canCompleteSection(player.x, SECTION_END - 65, this.dinosaurs, this.waveIndex, this.wavePlan.length);
    if (completed) this.finish(true);
  }

  damageHunter(hunter, damage = 1) {
    if (!hunter || hunter.invulnerable > 0 || hunter.health <= 0 || hunter.defeated) return;
    hunter.health = Math.max(0, hunter.health - damage);
    hunter.invulnerable = this.mode === "predator" ? 0.18 : 1.05;
    this.burst(hunter.x + hunter.w / 2, hunter.y + 22, "#f08b64", 7);
    if (hunter.health === 0) {
      if (this.mode === "predator") {
        hunter.defeated = true;
        this.kills += 1;
        this.predatorHunterKills += 1;
      } else if (hunter.isPlayer) {
        this.finish(false);
      } else {
        hunter.downTimer = 4.2;
      }
    }
  }

  damagePredator(damage = 1) {
    const player = this.player;
    if (this.mode !== "predator" || player.invulnerable > 0 || player.health <= 0) return;
    player.health = Math.max(0, player.health - damage);
    player.invulnerable = 0.68;
    this.burst(player.x + player.w / 2, player.y + player.h * 0.55, "#e58a68", 9);
    if (player.health <= 0) this.finish(false);
  }

  burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.PI * 2 * i / count;
      const speed = 32 + (i % 4) * 20;
      this.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 24,
        life: 0.28 + (i % 3) * 0.08, max: 0.44, color, size: 3 + i % 3
      });
    }
  }

  finish(success) {
    if (!this.running) return;
    this.running = false;
    this.paused = false;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.finished = success;
    const result = this.root.querySelector("[data-ta-result]");
    const predatorMode = this.mode === "predator";
    const bestKey = predatorMode ? PREDATOR_BEST_KEY : BEST_KEY;
    const totalTargets = predatorMode ? TOTAL_PREDATOR_HUNTERS : TOTAL_DINOSAURS;
    if (success) {
      const elapsedMs = Math.round(this.elapsed * 1000);
      if (!this.best || elapsedMs < this.best) this.best = elapsedMs;
      try { localStorage.setItem(bestKey, String(this.best)); } catch {}
      result.textContent = this.text(
        (predatorMode ? "CAZADORES ELIMINADOS" : "SECCIÓN DESPEJADA") +
          " · " + formatTime(elapsedMs) + " · RÉCORD " + formatTime(this.best),
        (predatorMode ? "HUNTERS ELIMINATED" : "SECTION CLEARED") +
          " · " + formatTime(elapsedMs) + " · BEST " + formatTime(this.best)
      );
    } else {
      result.textContent = predatorMode
        ? this.text(
          "DEPREDADOR ABATIDO · " + this.kills + "/" + totalTargets + " CAZADORES ELIMINADOS · " + formatTime(this.elapsed * 1000),
          "PREDATOR DOWN · " + this.kills + "/" + totalTargets + " HUNTERS ELIMINATED · " + formatTime(this.elapsed * 1000)
        )
        : this.text(
          "CAZADOR ABATIDO · " + this.kills + "/" + totalTargets + " DINOSAURIOS ELIMINADOS · " + formatTime(this.elapsed * 1000),
          "HUNTER DOWN · " + this.kills + "/" + totalTargets + " DINOSAURS ELIMINATED · " + formatTime(this.elapsed * 1000)
        );
    }
    this.root.classList.remove("playing");
    this.setModeIntroCopy();
    result.hidden = false;
    this.root.querySelector("[data-ta-start]").hidden = true;
    this.root.querySelector("[data-ta-predator]").hidden = true;
    this.root.querySelector("[data-ta-retry]").textContent = this.text(
      predatorMode ? "REINTENTAR DEPREDADOR" : "REINTENTAR CENTINELA",
      predatorMode ? "RETRY PREDATOR" : "RETRY SENTINEL"
    );
    this.root.querySelector("[data-ta-retry]").hidden = false;
    this.root.querySelector("[data-ta-exit]").hidden = false;
    this.render();
  }

  exit() {
    this.running = false;
    this.paused = false;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.keys.clear();
    this.pointerDown = false;
    this.root.classList.remove("active", "playing");
    this.root.setAttribute("aria-hidden", "true");
    this.onExit();
  }

  drawBackground() {
    const ctx = this.ctx;
    const layeredBackground = this.environmentRenderer?.draw(ctx, {
      cameraX: this.cameraX,
      viewportWidth: WIDTH,
      viewportHeight: HEIGHT,
      elapsed: this.elapsed,
      includeGroundScenery: false
    }) ?? false;

    if (!layeredBackground) {
      const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, "#a9c6bd");
    gradient.addColorStop(0.63, "#d5d3b0");
    gradient.addColorStop(1, "#84906a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#809887";
    ctx.beginPath();
    ctx.moveTo(0, 300);
    for (let x = 0; x <= WIDTH; x += 120) ctx.lineTo(x, 260 + Math.sin((x + this.cameraX * 0.05) * 0.012) * 26);
    ctx.lineTo(WIDTH, FLOOR);
    ctx.lineTo(0, FLOOR);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 13; i += 1) {
      const x = ((i * 154 - this.cameraX * 0.2) % 1300 + 1300) % 1300 - 120;
      const height = 80 + (i % 4) * 20;
      ctx.fillStyle = i % 2 ? "#486b57" : "#55765e";
      ctx.fillRect(x + 22, 300 - height, 14, height + 45);
      ctx.fillRect(x, 285 - height, 60, 20);
      ctx.fillRect(x + 8, 263 - height, 44, 18);
      ctx.fillRect(x + 17, 245 - height, 26, 18);
    }
    ctx.fillStyle = "#4b6044";
    ctx.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);
    ctx.fillStyle = "#a9a06b";
    for (let i = 0; i < 48; i += 1) {
      const x = ((i * 37 - this.cameraX * 1.1) % 1050 + 1050) % 1050;
      ctx.fillRect(x, FLOOR + 8 + (i % 4) * 10, 12 + (i % 5) * 4, 3);
    }
    }
    for (let i = 0; i < 9; i += 1) {
      const x = i * 600 - this.cameraX;
      if (x < -30 || x > WIDTH + 30) continue;
      ctx.fillStyle = "rgba(26,42,34,.48)";
      ctx.fillRect(x, FLOOR - 18, 2, 18);
      ctx.font = "9px monospace";
      ctx.fillText(String(i + 1).padStart(2, "0"), x + 5, FLOOR - 8);
    }

    // Ground details share the redwood biome palette and remain in world space.
    ctx.save();
    ctx.translate(-this.cameraX, 0);
    for (const prop of this.groundScenery ?? []) {
      drawGroundScenery(ctx, prop, MINIGAME_ENVIRONMENT_SCENES.hunting);
    }
    ctx.restore();
  }

  drawHunter(hunter, index) {
    const ctx = this.ctx;
    const palette = TEAM_COLORS[index] ?? TEAM_COLORS[0];
    const x = hunter.x - this.cameraX;
    const y = hunter.y;
    const stride = Math.sin(this.elapsed * 10 + index * 1.7 + hunter.x * 0.035);
    const alpha = hunter.health > 0 ? (hunter.invulnerable > 0 && Math.floor(this.elapsed * 18) % 2 ? 0.48 : 1) : 0.3;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(hunter.direction < 0 ? x + hunter.w : x, y);
    if (hunter.direction < 0) ctx.scale(-1, 1);
    ctx.fillStyle = "#202a29";
    ctx.fillRect(7, 58, 25, 5);
    ctx.fillStyle = "#bd9a72";
    ctx.fillRect(11, 5, 17, 17);
    ctx.fillStyle = palette.pack;
    ctx.fillRect(9, 3, 21, 8);
    ctx.fillRect(6, 23, 27, 23);
    ctx.fillStyle = palette.vest;
    ctx.fillRect(10, 26, 19, 13);
    ctx.fillStyle = palette.trim;
    ctx.fillRect(12, 23, 15, 4);
    ctx.fillRect(8, 28, 3, 12);
    ctx.fillStyle = "#25302b";
    ctx.fillRect(10, 45, 8, 15 + Math.round(stride * 3));
    ctx.fillRect(23, 45, 8, 15 - Math.round(stride * 3));
    ctx.fillStyle = "#141c1b";
    ctx.fillRect(25, 31, 17, 4);
    ctx.fillRect(39, 29, 4, 3);
    if (hunter.isPlayer && this.mode === "sentinel") {
      ctx.fillStyle = "#f1e7bd";
      ctx.fillRect(17, 12, 7, 3);
    }
    ctx.restore();
    const screenX = x + hunter.w / 2;
    ctx.fillStyle = hunter.isPlayer ? "#e9f3bd" : "#d4dfd2";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      this.mode === "predator"
        ? this.text("CAZADOR " + hunter.squadIndex, "HUNTER " + hunter.squadIndex)
        : formatHunterLabel(hunter.squadIndex, hunter.isPlayer, this.locale),
      screenX, y - 11
    );
    ctx.textAlign = "left";
    if (hunter.health > 0) {
      ctx.fillStyle = "#18221d";
      ctx.fillRect(x + 2, y - 7, 34, 4);
      ctx.fillStyle = hunter.isPlayer ? "#d8f36a" : "#9cc7a5";
      ctx.fillRect(x + 2, y - 7, 34 * hunter.health / hunter.maxHealth, 4);
    } else {
      ctx.fillStyle = "#f2c19d";
      ctx.font = "8px monospace";
      ctx.fillText(this.text("CAÍDO", "DOWN"), x, y - 11);
    }
  }

  drawDinosaur(dinosaur) {
    const ctx = this.ctx;
    const x = dinosaur.x - this.cameraX;
    if (x < -180 || x > WIDTH + 180) return;
    const rendered = this.sprites.drawAnimated(
      ctx, dinosaur.kind, x, dinosaur.y, dinosaur.w, dinosaur.h,
      dinosaur, this.elapsed, { facing: dinosaur.direction }
    );
    if (!rendered) {
      ctx.save();
      ctx.translate(dinosaur.direction < 0 ? x + dinosaur.w : x, dinosaur.y);
      if (dinosaur.direction < 0) ctx.scale(-1, 1);
      ctx.fillStyle = "#26352e";
      ctx.fillRect(14, 38, 68, 30);
      ctx.fillRect(70, 27, 30, 22);
      ctx.fillRect(90, 32, 20, 12);
      ctx.fillRect(8, 47, 22, 9);
      ctx.fillRect(22, 66, 13, 23);
      ctx.fillRect(72, 65, 14, 23);
      ctx.fillStyle = "#82936b";
      ctx.fillRect(30, 43, 48, 15);
      ctx.fillRect(82, 34, 19, 9);
      ctx.fillStyle = "#e9ce83";
      ctx.fillRect(96, 34, 4, 3);
      ctx.restore();
    }
    if (!dinosaur.defeated) {
      ctx.fillStyle = "#1a2720";
      ctx.fillRect(x + 28, dinosaur.y + 3, 56, 5);
      ctx.fillStyle = "#d98761";
      ctx.fillRect(x + 28, dinosaur.y + 3, 56 * dinosaur.health / dinosaur.maxHealth, 5);
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    this.drawBackground();
    const exitX = SECTION_END - this.cameraX;
    if (exitX > -40 && exitX < WIDTH + 40) {
      ctx.fillStyle = "#283c32";
      ctx.fillRect(exitX, FLOOR - 116, 8, 116);
      ctx.fillStyle = "#d8f36a";
      ctx.fillRect(exitX - 16, FLOOR - 116, 40, 7);
      ctx.font = "10px monospace";
      ctx.fillText(this.text("EXTRACCIÓN", "EXTRACTION"), exitX - 78, FLOOR - 130);
    }
    if (this.mode === "predator") {
      this.drawDinosaur(this.player);
      const predatorX = this.player.x - this.cameraX + this.player.w / 2;
      ctx.fillStyle = "#e8ff8a";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(this.text("DEPREDADOR", "PREDATOR"), predatorX, this.player.y - 12);
      ctx.textAlign = "left";
    } else {
      for (const dinosaur of this.dinosaurs) this.drawDinosaur(dinosaur);
    }
    for (let i = 0; i < this.hunters.length; i += 1) this.drawHunter(this.hunters[i], i);
    for (const projectile of this.projectiles) {
      ctx.fillStyle = "#ffe8a1";
      ctx.fillRect(projectile.x - this.cameraX - 3, projectile.y - 2, 8, 4);
    }
    for (const particle of this.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.max);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x - this.cameraX, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.shadowColor = "rgba(7, 16, 13, .92)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;
    ctx.font = "17px monospace";
    ctx.fillStyle = "#f0f3e7";
    ctx.fillText(formatTime(this.elapsed * 1000), 24, 25);
    ctx.font = "9px monospace";
    ctx.fillStyle = "#c8d5c6";
    ctx.fillText(this.text("TIEMPO", "TIME"), 25, 43);
    ctx.font = "14px monospace";
    ctx.fillStyle = "#d8f36a";
    const totalTargets = this.mode === "predator" ? TOTAL_PREDATOR_HUNTERS : TOTAL_DINOSAURS;
    ctx.fillText(this.kills + "/" + totalTargets, 204, 26);
    ctx.font = "9px monospace";
    ctx.fillStyle = "#c8d5c6";
    ctx.fillText(this.text(
      this.mode === "predator" ? "CAZADORES" : "DINOSAURIOS",
      this.mode === "predator" ? "HUNTERS" : "DINOSAURS"
    ), 204, 43);
    ctx.font = "14px monospace";
    ctx.fillStyle = "#f0f3e7";
    ctx.fillText(this.waveIndex + "/" + this.wavePlan.length, 382, 26);
    ctx.font = "9px monospace";
    ctx.fillStyle = "#c8d5c6";
    ctx.fillText(this.text("OLEADAS", "WAVES"), 382, 43);
    ctx.font = "9px monospace";
    ctx.fillStyle = "#c8d5c6";
    ctx.fillText(this.text("VIDA", "HEALTH"), 548, 26);
    if (this.mode === "predator") {
      ctx.fillStyle = "#34463a";
      ctx.fillRect(548, 33, 150, 8);
      ctx.fillStyle = "#d8f36a";
      ctx.fillRect(548, 33, 150 * this.player.health / this.player.maxHealth, 8);
      ctx.font = "9px monospace";
      ctx.fillStyle = "#d8f36a";
      ctx.fillText(this.text("VENATOSAURUS", "VENATOSAURUS"), 740, 26);
      ctx.fillStyle = "#e7c59d";
      ctx.fillText(this.text("ESPACIO / CLIC: MORDER", "SPACE / CLICK: BITE"), 740, 43);
    } else {
      for (let i = 0; i < this.player.maxHealth; i += 1) {
        ctx.fillStyle = i < this.player.health ? "#d8f36a" : "#34463a";
        ctx.fillRect(548 + i * 15, 33, 11, 8);
      }
      ctx.font = "9px monospace";
      ctx.fillStyle = "#d8f36a";
      ctx.fillText(this.text("ESCUADRA 1 + 3 IA", "SQUAD 1 + 3 AI"), 740, 26);
      ctx.fillStyle = "#e7c59d";
      ctx.fillText(
        this.text(
          this.player.reloadTimer > 0
            ? "RECARGANDO..."
            : "MUNICIÓN " + this.player.ammo + "/" + this.player.reserveAmmo + " · R: RECARGAR",
          this.player.reloadTimer > 0
            ? "RELOADING..."
            : "AMMO " + this.player.ammo + "/" + this.player.reserveAmmo + " · R: RELOAD"
        ),
        740, 43
      );
    }
    ctx.restore();
    if (this.pointer.active && this.running) {
      ctx.strokeStyle = "rgba(245,236,190,.85)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.pointer.x, this.pointer.y, 9, 0, Math.PI * 2);
      ctx.moveTo(this.pointer.x - 14, this.pointer.y);
      ctx.lineTo(this.pointer.x + 14, this.pointer.y);
      ctx.moveTo(this.pointer.x, this.pointer.y - 14);
      ctx.lineTo(this.pointer.x, this.pointer.y + 14);
      ctx.stroke();
    }
    if (this.paused) {
      ctx.fillStyle = "rgba(7,14,12,.58)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#edf2e7";
      ctx.font = "34px monospace";
      ctx.textAlign = "center";
      ctx.fillText(this.text("EN PAUSA", "PAUSED"), WIDTH / 2, HEIGHT / 2);
      ctx.textAlign = "left";
    }
    if (this.finished !== null) {
      ctx.fillStyle = "rgba(6,13,11,.48)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  destroy() {
    this.exit();
    this.canvasViewport.disconnect();
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    window.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
  }
}
