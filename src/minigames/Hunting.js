import { HunterProjectile } from "../entities/HunterProjectile.js";
import { observeCanvasViewport } from "../rendering/CanvasUtils.js";
import { WildDinosaur } from "../entities/WildDinosaur.js";
import { SpriteRenderer } from "../rendering/SpriteRenderer.js";
import { MinigameEnvironmentRenderer, MINIGAME_ENVIRONMENT_SCENES } from "./MinigameEnvironment.js";

let WIDTH = 960;
const HEIGHT = 540;
const FLOOR = 438;
const SECTION_END = 3680;
const BEST_KEY = "frantic-hunting-best";
const WAVES = Object.freeze([
  { at: 620, kinds: ["venatosaurus-impavidus", "venatosaurus-saevidicus", "venatosaurus-impavidus"] },
  { at: 1370, kinds: ["venatosaurus-saevidicus", "venatosaurus-impavidus", "venatosaurus-saevidicus"] },
  { at: 2170, kinds: ["venatosaurus-impavidus", "venatosaurus-saevidicus", "venatosaurus-impavidus", "venatosaurus-saevidicus"] },
  { at: 3020, kinds: ["venatosaurus-saevidicus", "venatosaurus-impavidus", "venatosaurus-saevidicus", "venatosaurus-impavidus"] }
]);
const TOTAL_DINOSAURS = WAVES.reduce((sum, wave) => sum + wave.kinds.length, 0);
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

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
    a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hunterActor(index, x) {
  const isPlayer = index === 0;
  return {
    id: isPlayer ? "hunting-player" : "hunting-ai-" + index,
    squadIndex: index,
    x, y: FLOOR - 64, w: 38, h: 64, direction: 1,
    health: isPlayer ? 4 : 3, maxHealth: isPlayer ? 4 : 3,
    invulnerable: 0, downTimer: 0, fireCooldown: 0.12 + index * 0.18,
    vy: 0, onGround: true, isPlayer
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
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) event.preventDefault();
      if (event.code === "Escape" && !event.repeat) { this.exit(); return; }
      if (event.code === "KeyP" && !event.repeat && this.running) { this.togglePause(); return; }
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
    root.querySelector("[data-ta-start]").addEventListener("click", () => this.requestStart());
    root.querySelector("[data-ta-retry]").addEventListener("click", () => this.requestStart());
    root.querySelector("[data-ta-exit]").addEventListener("click", () => this.exit());
    this.setLocale(this.locale);

  }

  text(es, en) { return this.locale === "es" ? es : en; }

  setLocale(locale) {
    this.locale = locale === "en" ? "en" : "es";
    this.root.querySelector("[data-ta-title]").textContent = this.text("CACERÍA", "HUNTING");
    this.root.querySelector("[data-ta-subtitle]").textContent = this.text(
      "Una escuadra. Múltiples presas. Despejá el camino y llegá a la extracción cuanto antes.",
      "One squad. Multiple targets. Clear the path and reach extraction as soon as possible."
    );
    this.root.querySelector("[data-ta-instructions]").textContent = this.text(
      "A / D o ← / →: moverse · W / ↑: saltar · ESPACIO / F o clic izquierdo: disparar · P: pausa · ESC: salir",
      "A / D or ← / →: move · W / ↑: jump · SPACE / F or left click: fire · P: pause · ESC: exit"
    );
    this.root.querySelector("[data-ta-start]").textContent = this.text("INICIAR", "START");
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
    this.reset();
    this.root.querySelector("[data-ta-start]").hidden = false;
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
    this.kills = 0;
    this.finished = null;
    this.keys.clear();
    this.pointerDown = false;
    this.hunters = [
      hunterActor(0, 130), hunterActor(1, 42),
      hunterActor(2, 2), hunterActor(3, -38)
    ];
    this.player = this.hunters[0];
    this.wavePlan = createWavePlan();
    this.best = 0;
    try { this.best = Math.max(0, Number(localStorage.getItem(BEST_KEY)) || 0); } catch {}
  }

  requestStart() {
    if (!this.root.classList.contains("active")) return;
    this.onBeforeStart("hunting", () => this.start());
  }

  start() {
    if (!this.root.classList.contains("active")) return;
    this.reset();
    this.running = true;
    this.root.classList.add("playing");
    this.root.querySelector("[data-ta-start]").hidden = true;
    this.root.querySelector("[data-ta-retry]").hidden = true;
    this.root.querySelector("[data-ta-result]").hidden = true;
    this.last = performance.now();
    this.frame = requestAnimationFrame(now => this.tick(now));
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
    this.root.querySelector("[data-ta-status]").textContent = this.text("SECCIÓN 01 // EXTRACCIÓN", "SECTION 01 // EXTRACTION");
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
    for (let i = 0; i < wave.kinds.length; i += 1) {
      const kind = wave.kinds[i];
      const dinosaur = new WildDinosaur({
        id: "hunting-" + (this.dinosaurs.length + 1),
        kind,
        x: wave.at + i * 112,
        groundY: FLOOR,
        patrolStart: wave.at - 160,
        patrolEnd: wave.at + 500,
        direction: i % 2 === 0 ? -1 : 1
      });
      dinosaur.maxHealth = kind === "venatosaurus-saevidicus" ? 4 : 3;
      dinosaur.health = dinosaur.maxHealth;
      this.dinosaurs.push(dinosaur);
    }
  }

  fire(hunter, targetX, targetY) {
    if (hunter.health <= 0 || hunter.downTimer > 0) return false;
    const muzzleX = hunter.x + (hunter.direction > 0 ? hunter.w + 3 : -3);
    const muzzleY = hunter.y + 31;
    if (Math.abs(targetX - muzzleX) < 2 && Math.abs(targetY - muzzleY) < 2) targetX += hunter.direction * 500;
    this.projectiles.push(new HunterProjectile({
      x: muzzleX, y: muzzleY, targetX, targetY,
      shooterId: hunter.id, speed: 710, damage: 1, radius: 5, lifetime: 2.3
    }));
    this.particles.push({ x: muzzleX, y: muzzleY, vx: hunter.direction * 36, vy: -12, life: 0.11, max: 0.11, color: "#ffe5a1", size: 5 });
    return true;
  }

  firePlayer() {
    if (!this.running || this.player.fireCooldown > 0) return;
    const target = nearestTarget(this.player, this.dinosaurs, Infinity);
    const targetX = this.pointer.active
      ? this.pointer.x + this.cameraX
      : target ? target.x + target.w / 2 : this.player.x + this.player.direction * 600;
    const targetY = this.pointer.active
      ? this.pointer.y
      : target ? target.y + target.h * 0.42 : this.player.y + 22;
    this.player.direction = targetX >= this.player.x ? 1 : -1;
    this.fire(this.player, targetX, targetY);
    this.player.fireCooldown = 0.24;
  }

  update(delta) {
    this.elapsed += delta;
    const player = this.player;
    const move = Number(this.keys.has("ArrowRight") || this.keys.has("KeyD")) -
      Number(this.keys.has("ArrowLeft") || this.keys.has("KeyA"));
    if (move !== 0) player.direction = move;
    player.x = clamp(player.x + move * 245 * delta, 18, SECTION_END);
    player.fireCooldown = Math.max(0, player.fireCooldown - delta);
    player.invulnerable = Math.max(0, player.invulnerable - delta);
    player.vy += 1500 * delta;
    player.y += player.vy * delta;
    if (player.y + player.h >= FLOOR) {
      player.y = FLOOR - player.h;
      player.vy = 0;
      player.onGround = true;
    }
    if (this.keys.has("Space") || this.keys.has("KeyF") || this.pointerDown) this.firePlayer();

    this.cameraX = clamp(player.x - 320, 0, SECTION_END - WIDTH);
    while (this.waveIndex < this.wavePlan.length && this.wavePlan[this.waveIndex].at <= player.x + 510) {
      this.spawnWave(this.wavePlan[this.waveIndex]);
      this.waveIndex += 1;
    }

    for (let i = 1; i < this.hunters.length; i += 1) {
      const hunter = this.hunters[i];
      if (hunter.health <= 0) {
        hunter.downTimer -= delta;
        if (hunter.downTimer <= 0) {
          hunter.health = hunter.maxHealth;
          hunter.invulnerable = 0.8;
          hunter.x = Math.max(0, player.x - 72 * i);
          hunter.y = FLOOR - hunter.h;
        }
        continue;
      }
      hunter.invulnerable = Math.max(0, hunter.invulnerable - delta);
      hunter.fireCooldown = Math.max(0, hunter.fireCooldown - delta);
      const target = nearestTarget(hunter, this.dinosaurs, 860);
      const formationX = Math.max(0, player.x - 66 * i);
      const desiredX = target ? target.x + (hunter.x < target.x ? -138 : target.w + 26) : formationX;
      hunter.x += clamp(desiredX - hunter.x, -235 * delta, 235 * delta);
      hunter.x = clamp(hunter.x, 0, SECTION_END);
      hunter.y = FLOOR - hunter.h;
      if (target) {
        hunter.direction = target.x + target.w / 2 >= hunter.x + hunter.w / 2 ? 1 : -1;
        if (hunter.fireCooldown <= 0) {
          this.fire(hunter, target.x + target.w / 2, target.y + target.h * 0.43);
          hunter.fireCooldown = 0.7 + i * 0.08;
        }
      } else {
        hunter.direction = player.x >= hunter.x ? 1 : -1;
      }
    }

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

    for (const projectile of this.projectiles) {
      projectile.update(delta);
      if (!projectile.active) continue;
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

    if (canCompleteSection(player.x, SECTION_END - 65, this.dinosaurs, this.waveIndex, this.wavePlan.length)) {
      this.finish(true);
    }
  }

  damageHunter(hunter) {
    if (hunter.invulnerable > 0 || hunter.health <= 0) return;
    hunter.health = Math.max(0, hunter.health - 1);
    hunter.invulnerable = 1.05;
    this.burst(hunter.x + hunter.w / 2, hunter.y + 22, "#f08b64", 7);
    if (hunter.health === 0) {
      if (hunter.isPlayer) this.finish(false);
      else hunter.downTimer = 4.2;
    }
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
    if (success) {
      const elapsedMs = Math.round(this.elapsed * 1000);
      if (!this.best || elapsedMs < this.best) this.best = elapsedMs;
      try { localStorage.setItem(BEST_KEY, String(this.best)); } catch {}
      result.textContent = this.text(
        "SECCIÓN DESPEJADA · " + formatTime(elapsedMs) + " · RÉCORD " + formatTime(this.best),
        "SECTION CLEARED · " + formatTime(elapsedMs) + " · BEST " + formatTime(this.best)
      );
    } else {
      result.textContent = this.text(
        "CAZADOR ABATIDO · " + this.kills + "/" + TOTAL_DINOSAURS + " DINOSAURIOS ELIMINADOS · " + formatTime(this.elapsed * 1000),
        "HUNTER DOWN · " + this.kills + "/" + TOTAL_DINOSAURS + " DINOSAURS ELIMINATED · " + formatTime(this.elapsed * 1000)
      );
    }
    this.root.classList.remove("playing");
    result.hidden = false;
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
      elapsed: this.elapsed
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
    for (let i = 0; i < 7; i += 1) {
      const x = i * 600 - this.cameraX;
      if (x < -30 || x > WIDTH + 30) continue;
      ctx.fillStyle = "rgba(26,42,34,.48)";
      ctx.fillRect(x, FLOOR - 18, 2, 18);
      ctx.font = "9px monospace";
      ctx.fillText(String(i + 1).padStart(2, "0"), x + 5, FLOOR - 8);
    }
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
    if (hunter.isPlayer) {
      ctx.fillStyle = "#f1e7bd";
      ctx.fillRect(17, 12, 7, 3);
    }
    ctx.restore();
    const screenX = x + hunter.w / 2;
    ctx.fillStyle = hunter.isPlayer ? "#e9f3bd" : "#d4dfd2";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillText(formatHunterLabel(hunter.squadIndex, hunter.isPlayer, this.locale), screenX, y - 11);
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
    for (const dinosaur of this.dinosaurs) this.drawDinosaur(dinosaur);
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
    ctx.fillText(this.kills + "/" + TOTAL_DINOSAURS, 204, 26);
    ctx.font = "9px monospace";
    ctx.fillStyle = "#c8d5c6";
    ctx.fillText(this.text("ELIMINADOS", "ELIMINATED"), 204, 43);
    ctx.font = "14px monospace";
    ctx.fillStyle = "#f0f3e7";
    ctx.fillText(this.waveIndex + "/" + this.wavePlan.length, 382, 26);
    ctx.font = "9px monospace";
    ctx.fillStyle = "#c8d5c6";
    ctx.fillText(this.text("OLEADAS", "WAVES"), 382, 43);
    ctx.font = "9px monospace";
    ctx.fillStyle = "#c8d5c6";
    ctx.fillText(this.text("VIDA", "HEALTH"), 548, 26);
    for (let i = 0; i < this.player.maxHealth; i += 1) {
      ctx.fillStyle = i < this.player.health ? "#d8f36a" : "#34463a";
      ctx.fillRect(548 + i * 15, 33, 11, 8);
    }
    ctx.font = "9px monospace";
    ctx.fillStyle = "#d8f36a";
    ctx.fillText(this.text("ESCUADRA 1 + 3 IA", "SQUAD 1 + 3 AI"), 740, 26);
    ctx.fillStyle = "#e7c59d";
    ctx.fillText(this.text("ESPACIO / CLIC: DISPARAR", "SPACE / CLICK: FIRE"), 740, 43);
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
