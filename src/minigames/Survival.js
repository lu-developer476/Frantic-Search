import { HunterEnemy } from "../entities/HunterEnemy.js";
import { observeCanvasViewport } from "../rendering/CanvasUtils.js";
import { HunterProjectile } from "../entities/HunterProjectile.js";
import { Player } from "../entities/Player.js";
import { WildDinosaur } from "../entities/WildDinosaur.js";

let WIDTH = 960;
const HEIGHT = 540;
const FLOOR = 438;
const BEST_KEY = "frantic-survival-best";

export function enemiesInWave(wave) {
  return Math.max(3, Math.min(12, 2 + Math.floor(Math.max(1, wave))));
}

export function difficultyForWave(wave) {
  const level = Math.max(1, Math.floor(wave));
  return {
    healthBonus: Math.floor((level - 1) / 3),
    speedMultiplier: 1 + Math.min(18, level - 1) * 0.035,
    spawnInterval: Math.max(0.3, 0.82 - level * 0.035)
  };
}

export function isWaveCleared(spawnRemaining, enemies) {
  return spawnRemaining === 0 && enemies.every(enemy => enemy.defeated);
}

export function bestSurvivalWave(previous, cleared) {
  return Math.max(0, Math.floor(Number(previous) || 0), Math.floor(Number(cleared) || 0));
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
    a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createHunterActor() {
  return {
    id: "survival-player-hunter",
    character: "hunter",
    x: WIDTH / 2 - 19,
    y: FLOOR - 64,
    w: 38,
    h: 64,
    vx: 0,
    vy: 0,
    direction: 1,
    health: 5,
    maxHealth: 5,
    invulnerable: 0,
    fireCooldown: 0,
    onGround: true,
    isPlayer: true
  };
}

function createInputAdapter(keys, pressed) {
  return {
    keys: new Set(),
    actions: new Set(),
    isDown(name) { return this.keys.has(name); },
    consume(name) { return this.actions.delete(name); },
    sync() {
      this.keys.clear();
      if (keys.has("ArrowLeft") || keys.has("KeyA")) this.keys.add("left");
      if (keys.has("ArrowRight") || keys.has("KeyD")) this.keys.add("right");
      this.actions.clear();
      if (["Space", "ArrowUp", "KeyW"].some(code => pressed.delete(code))) this.actions.add("jump");
      if (pressed.delete("KeyX")) this.actions.add("ability");
    }
  };
}

function living(enemies) {
  return enemies.filter(enemy => !enemy.defeated && enemy.health > 0);
}

export class Survival {
  constructor(root, onExit = () => {}, spriteRenderer = null, onBeforeStart = (_mode, proceed) => proceed()) {
    this.root = root;
    this.canvas = root.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvasViewport = observeCanvasViewport(root.querySelector(".survival-stage"), this.canvas, (width) => {
      WIDTH = width;
      this.ctx.imageSmoothingEnabled = false;
    });
    this.onExit = onExit;
    this.onBeforeStart = onBeforeStart;
    this.spriteRenderer = spriteRenderer;
    this.locale = "es";
    this.keys = new Set();
    this.pressed = new Set();
    this.pointer = { x: WIDTH * 0.78, y: FLOOR - 60, active: false };
    this.pointerDown = false;
    this.running = false;
    this.paused = false;
    this.frame = null;
    this.last = 0;
    this.role = "hunter";
    this.reset();

    this.handleKeyDown = event => {
      if (!this.root.classList.contains("active")) return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) event.preventDefault();
      if (event.code === "Escape" && !event.repeat) { this.exit(); return; }
      if (event.code === "KeyP" && !event.repeat && this.running) { this.togglePause(); return; }
      if (!event.repeat) this.pressed.add(event.code);
      if (["ArrowLeft","ArrowRight","ArrowUp","Space","KeyA","KeyD","KeyW","KeyF","KeyX"].includes(event.code)) {
        this.keys.add(event.code);
      }
    };
    this.handleKeyUp = event => {
      this.keys.delete(event.code);
      this.pressed.delete(event.code);
    };
    this.handleBlur = () => {
      this.keys.clear();
      this.pressed.clear();
      this.pointerDown = false;
    };
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
      if (this.role === "hunter") this.fireHunter();
    };
    this.handlePointerUp = () => { this.pointerDown = false; };

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
    window.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);

    for (const button of root.querySelectorAll("[data-survival-role]")) {
      button.addEventListener("click", () => this.requestStart(button.dataset.survivalRole));
    }
    root.querySelector("[data-survival-retry]").addEventListener("click", () => this.requestStart(this.role));
    root.querySelector("[data-survival-exit]").addEventListener("click", () => this.exit());
    this.setLocale("es");
    this.render();
  }

  text(es, en) {
    return this.locale === "es" ? es : en;
  }

  setLocale(locale) {
    this.locale = locale === "en" ? "en" : "es";
    this.root.querySelector("[data-survival-title]").textContent = this.text("SUPERVIVENCIA", "SURVIVAL");
    this.root.querySelector("[data-survival-subtitle]").textContent = this.text(
      "Elegí tu bando y aguantá todas las oleadas que puedas. Cada ronda trae más enemigos y más resistencia.",
      "Choose your side and survive as many waves as you can. Every round brings more enemies and tougher opponents."
    );
    this.root.querySelector("[data-survival-hunter]").textContent = this.text("JUGAR COMO CAZADOR", "PLAY AS HUNTER");
    this.root.querySelector("[data-survival-violeta]").textContent = this.text("JUGAR COMO VIOLETA", "PLAY AS VIOLETA");
    this.root.querySelector("[data-survival-vasti]").textContent = this.text("JUGAR COMO VASTI", "PLAY AS VASTI");
    this.root.querySelector("[data-survival-instructions]").textContent = this.text(
      "CAZADOR: A / D, ESPACIO para saltar, F o clic para disparar. DINOSAURIO: A / D, ESPACIO para saltar, X para atacar. P: pausa · ESC: salir.",
      "HUNTER: A / D, SPACE to jump, F or click to fire. DINOSAUR: A / D, SPACE to jump, X to attack. P: pause · ESC: exit."
    );
    this.root.querySelector("[data-survival-retry]").textContent = this.text("VOLVER A INTENTAR", "TRY AGAIN");
    this.root.querySelector("[data-survival-exit]").textContent = this.text("VOLVER AL MENÚ", "BACK TO MENU");
    this.root.querySelector("[data-survival-status]").textContent = this.text("SUPERVIVENCIA // OLEADA 01", "SURVIVAL // WAVE 01");
    this.render();
  }

  open() {
    this.root.classList.add("active");
    this.canvasViewport();
    this.root.classList.remove("playing");
    this.root.setAttribute("aria-hidden", "false");
    this.reset();
    this.root.querySelector("[data-survival-options]").hidden = false;
    this.root.querySelector("[data-survival-retry]").hidden = true;
    this.root.querySelector("[data-survival-exit]").hidden = false;
    this.root.querySelector("[data-survival-result]").hidden = true;
    this.root.querySelector("[data-survival-hunter]").focus();
    this.render();
  }

  reset() {
    this.running = false;
    this.paused = false;
    if (this.frame !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.frame);
    this.frame = null;
    this.last = 0;
    this.elapsed = 0;
    this.wave = 0;
    this.wavesCleared = 0;
    this.kills = 0;
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.spawnRemaining = 0;
    this.spawnTimer = 0;
    this.intermission = 0;
    this.waveStarted = false;
    this.dashHits = new Set();
    this.keys.clear();
    this.pressed.clear();
    this.pointerDown = false;
    this.player = null;
    this.dinoInput = createInputAdapter(this.keys, this.pressed);
    this.best = 0;
    try {
      this.best = Math.max(0, Number(localStorage.getItem(BEST_KEY + "-" + this.role)) || 0);
    } catch {}
  }

  requestStart(role = this.role) {
    if (!this.root.classList.contains("active")) return;
    this.onBeforeStart("survival", () => this.start(role));
  }

  start(role = this.role) {
    if (!this.root.classList.contains("active")) return;
    if (!["hunter","blue","vasti"].includes(role)) return;
    this.role = role;
    this.reset();
    this.best = this.readBest();
    this.player = role === "hunter" ? createHunterActor() : new Player(role, WIDTH / 2 - 32, FLOOR);
    this.running = true;
    this.intermission = 1.2;
    this.root.classList.add("playing");
    this.root.querySelector("[data-survival-options]").hidden = true;
    this.root.querySelector("[data-survival-retry]").hidden = true;
    this.root.querySelector("[data-survival-result]").hidden = true;
    this.root.querySelector("[data-survival-status]").textContent = this.roleLabel() + " // " + this.text("PREPARATE", "GET READY");
    this.last = performance.now();
    this.frame = requestAnimationFrame(now => this.tick(now));
  }

  readBest() {
    try { return Math.max(0, Number(localStorage.getItem(BEST_KEY + "-" + this.role)) || 0); }
    catch { return 0; }
  }

  roleLabel() {
    if (this.role === "hunter") return this.text("CAZADOR", "HUNTER");
    return this.role === "blue" ? "VIOLETA" : "VASTI";
  }

  togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;
    if (this.paused) {
      if (this.frame !== null) cancelAnimationFrame(this.frame);
      this.frame = null;
      this.root.querySelector("[data-survival-status]").textContent = this.text("EN PAUSA", "PAUSED");
    } else {
      this.last = performance.now();
      this.frame = requestAnimationFrame(now => this.tick(now));
    }
    this.render();
  }

  tick(now) {
    if (!this.running || this.paused) return;
    const delta = Math.min(Math.max(0, (now - this.last) / 1000), 0.04);
    this.last = now;
    this.update(delta);
    this.render();
    if (this.running && !this.paused) this.frame = requestAnimationFrame(time => this.tick(time));
  }

  beginWave() {
    this.wave += 1;
    this.spawnRemaining = enemiesInWave(this.wave);
    this.spawnTimer = 0.3;
    this.waveStarted = true;
    this.intermission = 0;
    this.enemies = [];
    this.root.querySelector("[data-survival-status]").textContent =
      this.roleLabel() + " // " + this.text("OLEADA", "WAVE") + " " + String(this.wave).padStart(2, "0");
  }

  spawnEnemy() {
    const difficulty = difficultyForWave(this.wave);
    const fromLeft = (this.wave + this.spawnRemaining) % 2 === 0;
    const x = fromLeft ? 24 : WIDTH - 150;
    const direction = fromLeft ? 1 : -1;
    const id = "survival-" + this.role + "-" + this.wave + "-" + (enemiesInWave(this.wave) - this.spawnRemaining + 1);
    if (this.role === "hunter") {
      const kind = (this.wave + this.spawnRemaining) % 3 === 0
        ? "venatosaurus-saevidicus"
        : "venatosaurus-impavidus";
      const enemy = new WildDinosaur({
        id, kind, x, groundY: FLOOR,
        patrolStart: 18, patrolEnd: WIDTH - 18, direction
      });
      enemy.maxHealth = 3 + difficulty.healthBonus + (kind === "venatosaurus-saevidicus" ? 1 : 0);
      enemy.health = enemy.maxHealth;
      enemy.speedMultiplier = difficulty.speedMultiplier;
      enemy.jumpCooldown = Math.max(0.32, 1.25 / difficulty.speedMultiplier);
      this.enemies.push(enemy);
    } else {
      const enemy = new HunterEnemy({
        id, x, patrolStart: 18, patrolEnd: WIDTH - 18,
        groundY: FLOOR, carriesCaptive: false
      });
      enemy.maxHealth = 2 + difficulty.healthBonus;
      enemy.health = enemy.maxHealth;
      enemy.survivalSpeedMultiplier = difficulty.speedMultiplier;
      this.enemies.push(enemy);
    }
    this.spawnRemaining -= 1;
    this.spawnTimer = difficulty.spawnInterval;
  }

  fireHunter() {
    if (!this.running || this.role !== "hunter" || this.player.fireCooldown > 0) return;
    const target = this.nearestEnemy();
    const targetX = this.pointer.active ? this.pointer.x : target ? target.x + target.w / 2 : this.player.x + this.player.direction * 420;
    const targetY = this.pointer.active ? this.pointer.y : target ? target.y + target.h * 0.42 : this.player.y + 26;
    this.player.direction = targetX >= this.player.x ? 1 : -1;
    const muzzleX = this.player.x + (this.player.direction > 0 ? this.player.w + 3 : -3);
    this.projectiles.push(new HunterProjectile({
      x: muzzleX,
      y: this.player.y + 31,
      targetX,
      targetY,
      shooterId: this.player.id,
      speed: 690,
      damage: 1,
      radius: 5,
      lifetime: 1.8
    }));
    this.player.fireCooldown = 0.23;
    this.burst(muzzleX, this.player.y + 31, "#ffe5a1", 3);
  }

  nearestEnemy() {
    const x = this.player.x + this.player.w / 2;
    return living(this.enemies).sort((a, b) =>
      Math.abs(a.x + a.w / 2 - x) - Math.abs(b.x + b.w / 2 - x)
    )[0] ?? null;
  }

  updateHunter(delta) {
    const player = this.player;
    const move = Number(this.keys.has("ArrowRight") || this.keys.has("KeyD")) -
      Number(this.keys.has("ArrowLeft") || this.keys.has("KeyA"));
    if (move) player.direction = move;
    player.x = clamp(player.x + move * 250 * delta, 24, WIDTH - player.w - 24);
    const jumpPressed = ["Space", "ArrowUp", "KeyW"].some(code => this.pressed.delete(code));
    if (jumpPressed && player.onGround) {
      player.vy = -560;
      player.onGround = false;
    }
    this.pressed.clear();
    player.vy += 1500 * delta;
    player.y += player.vy * delta;
    if (player.y + player.h >= FLOOR) {
      player.y = FLOOR - player.h;
      player.vy = 0;
      player.onGround = true;
    }
    player.invulnerable = Math.max(0, player.invulnerable - delta);
    player.fireCooldown = Math.max(0, player.fireCooldown - delta);
    if (this.keys.has("KeyF") || this.pointerDown) this.fireHunter();
  }

  updateDinosaur(delta) {
    const actor = this.player;
    this.dinoInput.sync();
    actor.update(delta, this.dinoInput);
    actor.x = clamp(actor.x + actor.vx * delta, 22, WIDTH - actor.w - 22);
    actor.vy += 1500 * delta;
    actor.y += actor.vy * delta;
    if (actor.y + actor.h >= FLOOR) {
      const landed = !actor.onGround;
      actor.y = FLOOR - actor.h;
      actor.vy = 0;
      actor.onGround = true;
      if (landed) actor.onLand();
    } else {
      actor.onGround = false;
    }
    const ability = actor.consumeAbilityEvent();
    if (ability === "dash" || ability === "pounce") this.dashHits.clear();
    if (actor.consumeShockwave()) {
      const radius = this.role === "vasti" ? 190 : 120;
      for (const enemy of living(this.enemies)) {
        const distance = Math.abs(enemy.x + enemy.w / 2 - (actor.x + actor.w / 2));
        if (distance <= radius) this.damageEnemy(enemy, this.role === "vasti" ? 2 : 1);
      }
      this.burst(actor.x + actor.w / 2, FLOOR - 8, "#d8f36a", 15);
    }
    if (actor.dashTimer > 0) {
      for (const enemy of living(this.enemies)) {
        if (this.dashHits.has(enemy.id)) continue;
        if (!overlaps(actor, enemy)) continue;
        this.dashHits.add(enemy.id);
        this.damageEnemy(enemy, 1);
      }
    }
    this.pressed.clear();
  }

  updateEnemies(delta) {
    const difficulty = difficultyForWave(this.wave);
    if (this.role === "hunter") {
      const target = this.player;
      for (const enemy of living(this.enemies)) {
        const event = enemy.update(delta * (enemy.speedMultiplier || 1), [{ target, kind: "hunter" }]);
        const attackBox = enemy.attackBox;
        if (attackBox && overlaps(attackBox, target)) {
          this.damagePlayer(1);
          if (!this.running) return;
        } else if (event?.type === "attack" && event.target === target && attackBox && overlaps(attackBox, target)) {
          this.damagePlayer(1);
          if (!this.running) return;
        }
      }
    } else {
      for (const enemy of living(this.enemies)) {
        const event = enemy.update(delta * (enemy.survivalSpeedMultiplier || difficulty.speedMultiplier), this.player);
        if (event?.type === "shoot" && event.projectile) {
          this.projectiles.push(new HunterProjectile({
            ...event.projectile,
            speed: 500 + Math.min(260, this.wave * 12),
            damage: 1,
            radius: 6,
            lifetime: 2
          }));
        }
      }
    }
  }

  updateProjectiles(delta) {
    for (const projectile of this.projectiles) {
      projectile.update(delta);
      if (!projectile.active) continue;
      if (this.role === "hunter") {
        const target = living(this.enemies).find(enemy =>
          projectile.x + projectile.radius >= enemy.x + 7 &&
          projectile.x - projectile.radius <= enemy.x + enemy.w - 7 &&
          projectile.y + projectile.radius >= enemy.y + 12 &&
          projectile.y - projectile.radius <= enemy.y + enemy.h - 6
        );
        if (!target) continue;
        projectile.active = false;
        this.damageEnemy(target, projectile.damage);
      } else {
        const player = this.player;
        const hitbox = {
          x: player.x + 12, y: player.y + 8,
          w: player.w - 24, h: player.h - 14
        };
        if (!overlaps(hitbox, {
          x: projectile.x - projectile.radius,
          y: projectile.y - projectile.radius,
          w: projectile.radius * 2,
          h: projectile.radius * 2
        })) continue;
        projectile.active = false;
        this.damagePlayer(projectile.damage);
        if (!this.running) return;
      }
    }
    this.projectiles = this.projectiles.filter(projectile => projectile.active);
  }

  update(delta) {
    this.elapsed += delta;
    if (this.intermission > 0) {
      this.intermission -= delta;
      if (this.intermission <= 0) this.beginWave();
    }
    if (this.role === "hunter") this.updateHunter(delta);
    else this.updateDinosaur(delta);
    if (!this.running) return;

    if (this.waveStarted) {
      this.spawnTimer -= delta;
      if (this.spawnRemaining > 0 && this.spawnTimer <= 0) this.spawnEnemy();
      this.updateEnemies(delta);
      this.updateProjectiles(delta);
      if (!this.running) return;
      if (isWaveCleared(this.spawnRemaining, this.enemies)) {
        this.waveStarted = false;
        this.wavesCleared = this.wave;
        this.enemies = [];
        if (this.wave % 2 === 0) this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
        this.intermission = Math.max(1.15, 2.05 - this.wave * 0.025);
        this.root.querySelector("[data-survival-status]").textContent =
          this.text("OLEADA SUPERADA", "WAVE CLEARED") + " // " +
          this.text("PREPARANDO LA SIGUIENTE", "NEXT WAVE INCOMING");
      }
    }
    for (const particle of this.particles) {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += 160 * delta;
      particle.life = Math.max(0, particle.life - delta);
    }
    this.particles = this.particles.filter(particle => particle.life > 0);
  }

  damageEnemy(enemy, amount = 1) {
    if (!enemy || enemy.defeated) return;
    const result = enemy.takeDamage(amount);
    if (!result.hit) return;
    if (result.defeated) {
      this.kills += 1;
      this.burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#e7a16f", 11);
    } else {
      this.burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#f3d58e", 4);
    }
  }

  damagePlayer(amount = 1) {
    if (!this.player || this.player.health <= 0) return;
    if (this.role === "hunter") {
      if (this.player.invulnerable > 0) return;
      this.player.health = Math.max(0, this.player.health - amount);
      this.player.invulnerable = 1.05;
    } else {
      if (!this.player.takeHit()) return;
    }
    this.burst(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, "#ef8c69", 8);
    if (this.player.health <= 0) this.finish();
  }

  burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.PI * 2 * i / count;
      const speed = 30 + (i % 4) * 18;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life: 0.28 + (i % 3) * 0.08,
        max: 0.44,
        color,
        size: 3 + i % 3
      });
    }
  }

  finish() {
    if (!this.running) return;
    this.running = false;
    this.paused = false;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.best = bestSurvivalWave(this.best, this.wavesCleared);
    try { localStorage.setItem(BEST_KEY + "-" + this.role, String(this.best)); } catch {}
    const result = this.root.querySelector("[data-survival-result]");
    result.textContent = this.text(
      "PARTIDA TERMINADA · " + this.wavesCleared + " OLEADAS SUPERADAS · " + this.kills + " ELIMINACIONES · RÉCORD " + this.best,
      "RUN OVER · " + this.wavesCleared + " WAVES CLEARED · " + this.kills + " ELIMINATIONS · BEST " + this.best
    );
    this.root.classList.remove("playing");
    result.hidden = false;
    this.root.querySelector("[data-survival-retry]").hidden = false;
    this.root.querySelector("[data-survival-exit]").hidden = false;
    this.render();
  }

  exit() {
    this.running = false;
    this.paused = false;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.keys.clear();
    this.pressed.clear();
    this.pointerDown = false;
    this.root.classList.remove("active", "playing");
    this.root.setAttribute("aria-hidden", "true");
    this.onExit();
  }

  drawBackground() {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, "#9cbdb6");
    gradient.addColorStop(0.62, "#d2d2ae");
    gradient.addColorStop(1, "#788d68");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (let i = 0; i < 13; i += 1) {
      const x = i * 83 + (i % 3) * 17;
      const height = 80 + (i % 4) * 18;
      ctx.fillStyle = i % 2 ? "#466b55" : "#55765e";
      ctx.fillRect(x + 20, 305 - height, 13, height + 55);
      ctx.fillRect(x, 285 - height, 58, 20);
      ctx.fillRect(x + 7, 262 - height, 44, 18);
      ctx.fillRect(x + 15, 244 - height, 28, 18);
    }
    ctx.fillStyle = "#4b6044";
    ctx.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);
    ctx.fillStyle = "#a8a16f";
    for (let i = 0; i < 48; i += 1) {
      ctx.fillRect(i * 23, FLOOR + 8 + (i % 4) * 10, 12 + (i % 5) * 4, 3);
    }
  }

  drawHuman(actor, player = false) {
    const ctx = this.ctx;
    const x = actor.x;
    const y = actor.y;
    const stride = Math.sin(this.elapsed * 10 + actor.x * 0.04);
    const palette = player
      ? { vest: "#536a4d", trim: "#d8f36a", pack: "#35443a" }
      : { vest: "#715944", trim: "#d78e69", pack: "#473b31" };
    const alpha = actor.invulnerable > 0 && Math.floor(this.elapsed * 18) % 2 ? 0.45 : 1;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(actor.direction < 0 ? x + actor.w : x, y);
    if (actor.direction < 0) ctx.scale(-1, 1);
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
    if (player) {
      ctx.fillStyle = "#f1e7bd";
      ctx.fillRect(17, 12, 7, 3);
    }
    ctx.restore();
  }

  drawDinosaur(actor) {
    const drawn = this.spriteRenderer?.drawDinosaur(
      this.ctx, this.role, actor.x, actor.y, actor.w, actor.h, actor, this.elapsed, 1
    );
    if (drawn) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(actor.facing < 0 ? actor.x + actor.w : actor.x, actor.y);
    if (actor.facing < 0) ctx.scale(-1, 1);
    ctx.fillStyle = this.role === "vasti" ? "#65744e" : "#8e9bb7";
    ctx.fillRect(12, 22, actor.w - 20, actor.h - 30);
    ctx.fillRect(actor.w - 22, 12, 20, 18);
    ctx.fillStyle = "#d6c9a0";
    ctx.fillRect(actor.w - 10, 22, 11, 5);
    ctx.restore();
  }

  drawDinosaurEnemy(enemy) {
    const drawn = this.spriteRenderer?.drawAnimated(
      this.ctx, enemy.kind, enemy.x, enemy.y, enemy.w, enemy.h,
      enemy, this.elapsed, { facing: enemy.direction, alpha: enemy.defeated ? 0.36 : 1 }
    );
    if (drawn) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(enemy.direction < 0 ? enemy.x + enemy.w : enemy.x, enemy.y);
    if (enemy.direction < 0) ctx.scale(-1, 1);
    ctx.fillStyle = "#34483b";
    ctx.fillRect(13, 36, 70, 32);
    ctx.fillRect(72, 25, 30, 23);
    ctx.fillRect(91, 31, 19, 12);
    ctx.fillRect(22, 66, 13, 23);
    ctx.fillRect(73, 66, 13, 23);
    ctx.fillStyle = "#85916b";
    ctx.fillRect(30, 42, 46, 14);
    ctx.fillStyle = "#e9ce83";
    ctx.fillRect(96, 32, 4, 3);
    ctx.restore();
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    this.drawBackground();
    if (this.role === "hunter") {
      for (const enemy of this.enemies) this.drawDinosaurEnemy(enemy);
      if (this.player) this.drawHuman(this.player, true);
    } else {
      for (const enemy of this.enemies) this.drawHuman(enemy, false);
      if (this.player) this.drawDinosaur(this.player);
    }
    for (const projectile of this.projectiles) {
      ctx.fillStyle = this.role === "hunter" ? "#ffe6a4" : "#f0b17c";
      ctx.beginPath();
      ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const particle of this.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.max);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.shadowColor = "rgba(7, 16, 13, .92)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;
    ctx.font = "17px monospace";
    ctx.fillStyle = "#f0f3e7";
    ctx.fillText(this.text("OLEADA", "WAVE") + " " + String(this.wave).padStart(2, "0"), 24, 26);
    ctx.font = "9px monospace";
    ctx.fillStyle = "#c8d5c6";
    ctx.fillText(this.roleLabel().toUpperCase(), 25, 45);
    ctx.font = "16px monospace";
    ctx.fillStyle = "#d8f36a";
    ctx.fillText(String(this.kills).padStart(3, "0"), 260, 27);
    ctx.font = "9px monospace";
    ctx.fillStyle = "#c8d5c6";
    ctx.fillText(this.text("ELIMINACIONES", "ELIMINATIONS"), 260, 45);
    const remaining = this.spawnRemaining + living(this.enemies).length;
    ctx.font = "16px monospace";
    ctx.fillStyle = "#f0f3e7";
    ctx.fillText(String(remaining).padStart(2, "0"), 500, 27);
    ctx.font = "9px monospace";
    ctx.fillStyle = "#c8d5c6";
    ctx.fillText(this.text("AMENAZAS", "THREATS"), 500, 45);
    ctx.font = "9px monospace";
    ctx.fillStyle = "#d8f36a";
    ctx.fillText(this.text("VIDA", "HEALTH"), 700, 26);
    if (this.player) {
      for (let i = 0; i < this.player.maxHealth; i += 1) {
        ctx.fillStyle = i < this.player.health ? "#d8f36a" : "#34463a";
        ctx.fillRect(700 + i * 18, 34, 13, 8);
      }
    }
    ctx.font = "9px monospace";
    ctx.fillStyle = "#c8d5c6";
    ctx.fillText(this.text("RÉCORD", "BEST") + " " + this.best, 838, 45);
    ctx.restore();
    if (this.paused) {
      ctx.fillStyle = "rgba(7,14,12,.62)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#edf2e7";
      ctx.font = "34px monospace";
      ctx.textAlign = "center";
      ctx.fillText(this.text("EN PAUSA", "PAUSED"), WIDTH / 2, HEIGHT / 2);
      ctx.textAlign = "left";
    }
    if (!this.running && !this.root.querySelector("[data-survival-result]").hidden) {
      ctx.fillStyle = "rgba(6,13,11,.46)";
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
