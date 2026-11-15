import { loadAnimatedGif, getAnimatedFrameIndex } from "./AnimatedGif.js";
const WIDTH = 960;
const HEIGHT = 540;
const FLOOR = 438;
const ASSETS = {
  coral: "minigame/empty-stomach/gif/main/miniraptor-run.gif",
  xenoraptorRun: "minigame/empty-stomach/gif/enemies/xenoraptor/xenoraptor-crypticus-run.gif",
  xenoraptorJump: "minigame/empty-stomach/gif/enemies/xenoraptor/xenoraptor-crypticus-jump.gif",
  xenoraptorAttack: "minigame/empty-stomach/gif/enemies/xenoraptor/xenoraptor-crypticus-attack.gif",
  velociraptorWalk: "minigame/empty-stomach/gif/enemies/velociraptor/velociraptor-walk.gif",
  velociraptorJump: "minigame/empty-stomach/gif/enemies/velociraptor/velociraptor-jump.gif",
  velociraptorEat: "minigame/empty-stomach/gif/enemies/velociraptor/velociraptor-eat.gif",
  velociraptorIdle: "minigame/empty-stomach/gif/enemies/velociraptor/velociraptor-idle.gif",
  parasaurRun: "minigame/empty-stomach/gif/enviroment/parasaurolophus/run.gif",
  parasaurIdle: "minigame/empty-stomach/gif/enviroment/parasaurolophus/idle.gif",
  parasaurPerturbed: "minigame/empty-stomach/gif/enviroment/parasaurolophus/perturbed.gif"
};

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function scoreForDistance(distance) {
  return Math.max(0, Math.floor(distance / 10));
}

export const ENEMY_CHASE_DURATION = 4;
export const ENEMY_EAT_DURATION = 1.35;
export const ENEMY_REST_DURATION = 1.6;

export function createPredator(player, kind, phase = 0) {
  const isXenoraptor = kind === "xenoraptor";
  const w = isXenoraptor ? 148 : 126;
  const h = isXenoraptor ? 104 : 86;
  const x = Math.max(-w, player.x - w - 28);
  return {
    kind: isXenoraptor ? "xenoraptor" : "velociraptor",
    x,
    y: FLOOR - h,
    w,
    h,
    phase,
    direction: 1,
    state: "chasing",
    stateTimer: ENEMY_CHASE_DURATION,
    preyTarget: null,
    eatTarget: null
  };
}

export function enemyAnimationKey(enemy, elapsed = 0) {
  const isXenoraptor = enemy.kind === "xenoraptor";
  if (enemy.state === "eating") return isXenoraptor ? "xenoraptorAttack" : "velociraptorEat";
  if (enemy.state === "resting" || (enemy.state === "hunting" && !enemy.preyTarget)) {
    return isXenoraptor ? "xenoraptorJump" : "velociraptorIdle";
  }

  const jumping = Math.sin(elapsed * 3.8 + (enemy.phase ?? 0)) > 0.92;
  if (isXenoraptor) return jumping ? "xenoraptorJump" : "xenoraptorRun";
  return jumping ? "velociraptorJump" : "velociraptorWalk";
}

export class EmptyStomach {
  constructor(root, onExit = () => {}) {
    this.root = root;
    this.canvas = root.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.onExit = onExit;
    this.locale = "es";
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
    this.frame = null;
    this.last = 0;
    this.elapsed = 0;
    this.distance = 0;
    this.spawnTimer = 0;
    this.preyTimer = 1.5;
    this.enemies = [];
    this.herd = [];
    this.particles = [];
    this.player = { x: 250, y: FLOOR - 72, w: 88, h: 72, vy: 0, grounded: true };
    this.best = 0;
    try { this.best = Number(localStorage.getItem("frantic-empty-stomach-best")) || 0; } catch {}
    this.handleKeyDown = (event) => {
      if (!this.root.classList.contains("active")) return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) event.preventDefault();
      if (event.code === "Escape" && !event.repeat) { this.exit(); return; }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD", "KeyW"].includes(event.code)) this.keys.add(event.code);
      if (["Space", "ArrowUp", "KeyW"].includes(event.code) && !event.repeat && !this.running) this.start();
    };
    this.handleKeyUp = (event) => this.keys.delete(event.code);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    root.querySelector("[data-empty-start]").addEventListener("click", () => this.start());
    root.querySelector("[data-empty-retry]").addEventListener("click", () => this.start());
    root.querySelector("[data-empty-exit]").addEventListener("click", () => this.exit());
    this.render();
  }

  text(es, en) { return this.locale === "es" ? es : en; }
  setLocale(locale) {
    this.locale = locale === "en" ? "en" : "es";
    this.root.querySelector("[data-empty-title]").textContent = this.text("HAMBRE INSACIABLE", "EMPTY STOMACH");
    this.root.querySelector("[data-empty-subtitle]").textContent = this.text("Coral corre por su vida. Los depredadores no van a detenerse.", "Coral is running for her life. The predators won't stop.");
    this.root.querySelector("[data-empty-instructions]").textContent = this.text("A / D o ← / →: moverse · ESPACIO / ↑: saltar · ESC: salir", "A / D or ← / →: move · SPACE / ↑: jump · ESC: exit");
    this.root.querySelector("[data-empty-start]").textContent = this.text("COMENZAR", "START RUN");
    this.root.querySelector("[data-empty-retry]").textContent = this.text("VOLVER A CORRER", "RUN AGAIN");
    this.root.querySelector("[data-empty-exit]").textContent = this.text("VOLVER AL MENÚ", "BACK TO MENU");
    this.render();
  }

  open() {
    this.root.classList.add("active");
    this.root.classList.remove("playing");
    this.root.setAttribute("aria-hidden", "false");
    this.reset();
    this.root.querySelector("[data-empty-start]").hidden = false;
    this.root.querySelector("[data-empty-retry]").hidden = true;
    this.root.querySelector("[data-empty-exit]").hidden = false;
    this.root.querySelector("[data-empty-result]").hidden = true;
    this.root.querySelector("[data-empty-start]").focus();
    this.render();
  }

  reset() {
    this.running = false;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.last = 0;
    this.elapsed = 0;
    this.distance = 0;
    this.spawnTimer = 1.2;
    this.preyTimer = 0.8;
    this.enemies = [];
    this.herd = [];
    this.particles = [];
    this.player = { x: 250, y: FLOOR - 72, w: 88, h: 72, vy: 0, grounded: true };
    this.keys.clear();
  }

  start() {
    if (!this.root.classList.contains("active")) return;
    this.reset();
    this.running = true;
    this.root.classList.add("playing");
    this.root.querySelector("[data-empty-start]").hidden = true;
    this.root.querySelector("[data-empty-retry]").hidden = true;
    this.root.querySelector("[data-empty-result]").hidden = true;
    this.last = performance.now();
    this.frame = requestAnimationFrame((now) => this.tick(now));
  }

  tick(now) {
    if (!this.running) return;
    const delta = Math.min((now - this.last) / 1000 || 0, 0.04);
    this.last = now;
    this.update(delta);
    this.render();
    if (this.running) this.frame = requestAnimationFrame((time) => this.tick(time));
  }

  moveEnemyTowards(enemy, targetX, chaseSpeed, delta) {
    const center = enemy.x + enemy.w / 2;
    const difference = targetX - center;
    const step = Math.min(Math.abs(difference), chaseSpeed * delta);
    if (step > 0) {
      enemy.direction = Math.sign(difference);
      enemy.x += enemy.direction * step;
    }
    enemy.y = FLOOR - enemy.h + Math.sin(this.elapsed * 8 + enemy.phase) * 2;
  }

  update(delta) {
    this.elapsed += delta;
    const speed = Math.min(310, 150 + this.elapsed * 2.2);
    this.distance += speed * delta;
    const p = this.player;
    const left = this.keys.has("ArrowLeft") || this.keys.has("KeyA");
    const right = this.keys.has("ArrowRight") || this.keys.has("KeyD");
    if (left) p.x -= 245 * delta;
    if (right) p.x += 245 * delta;
    p.x = Math.max(22, Math.min(850, p.x));
    if ((this.keys.has("Space") || this.keys.has("ArrowUp") || this.keys.has("KeyW")) && p.grounded) {
      p.vy = -590;
      p.grounded = false;
    }
    p.vy += 1500 * delta;
    p.y += p.vy * delta;
    if (p.y + p.h >= FLOOR) { p.y = FLOOR - p.h; p.vy = 0; p.grounded = true; }

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      const kind = Math.random() < 0.46 ? "xenoraptor" : "velociraptor";
      this.enemies.push(createPredator(p, kind, Math.random() * 6));
      this.spawnTimer = Math.max(0.95, 2.6 - this.elapsed * 0.018) + Math.random() * 0.7;
    }

    this.preyTimer -= delta;
    if (this.preyTimer <= 0) {
      const count = 1 + (Math.random() < 0.42 ? 1 : 0);
      for (let i = 0; i < count; i += 1) {
        this.herd.push({
          x: WIDTH + i * 94,
          y: FLOOR - 72,
          w: 100,
          h: 72,
          phase: Math.random() * 6,
          beingEaten: false,
          beingEatenElapsed: 0,
          animationState: "running"
        });
      }
      this.preyTimer = 3.5 + Math.random() * 3.5;
    }

    for (const prey of this.herd) {
      if (prey.beingEaten) {
        prey.beingEatenElapsed += delta;
        prey.y = FLOOR - prey.h;
        continue;
      }
      const threatened = this.enemies.some((enemy) =>
        Math.abs((enemy.x + enemy.w / 2) - (prey.x + prey.w / 2)) < 190
      );
      prey.animationState = threatened ? "perturbed" : "running";
      prey.x -= (speed * 0.72) * delta;
      prey.y = FLOOR - prey.h + Math.sin(this.elapsed * 7 + prey.phase) * 2;
    }
    this.herd = this.herd.filter((prey) => prey.beingEaten || prey.x > -140);

    const playerHitbox = {
      x: p.x + 14,
      y: p.y + 10,
      w: p.w - 28,
      h: p.h - 14
    };

    for (const enemy of this.enemies) {
      const chaseSpeed = enemy.kind === "xenoraptor" ? 168 : 138;

      if (enemy.state === "chasing") {
        enemy.stateTimer = Math.max(0, enemy.stateTimer - delta);
        this.moveEnemyTowards(enemy, p.x + p.w / 2, chaseSpeed + this.elapsed * 1.4, delta);
        if (enemy.stateTimer <= 0) {
          enemy.state = "hunting";
          enemy.preyTarget = null;
        }
      } else if (enemy.state === "hunting") {
        const preyTarget = this.herd
          .filter((prey) => !prey.beingEaten)
          .reduce((nearest, prey) => {
            if (!nearest) return prey;
            const preyDistance = Math.abs(prey.x + prey.w / 2 - (enemy.x + enemy.w / 2));
            const nearestDistance = Math.abs(nearest.x + nearest.w / 2 - (enemy.x + enemy.w / 2));
            return preyDistance < nearestDistance ? prey : nearest;
          }, null);

        enemy.preyTarget = preyTarget;
        if (preyTarget) {
          const targetX = preyTarget.x + preyTarget.w / 2;
          const distance = Math.abs(targetX - (enemy.x + enemy.w / 2));
          if (distance <= 58) {
            preyTarget.beingEaten = true;
            preyTarget.beingEatenElapsed = 0;
            enemy.eatTarget = preyTarget;
            enemy.preyTarget = null;
            enemy.state = "eating";
            enemy.stateTimer = ENEMY_EAT_DURATION;
            enemy.y = FLOOR - enemy.h;
          } else {
            this.moveEnemyTowards(enemy, targetX, chaseSpeed + 24, delta);
          }
        } else {
          enemy.y = FLOOR - enemy.h;
        }
      } else if (enemy.state === "eating") {
        enemy.stateTimer = Math.max(0, enemy.stateTimer - delta);
        enemy.y = FLOOR - enemy.h;
        if (enemy.stateTimer <= 0) {
          const eatenPrey = enemy.eatTarget;
          this.herd = this.herd.filter((prey) => prey !== eatenPrey);
          enemy.eatTarget = null;
          enemy.state = "resting";
          enemy.stateTimer = ENEMY_REST_DURATION;
        }
      } else if (enemy.state === "resting") {
        enemy.stateTimer = Math.max(0, enemy.stateTimer - delta);
        enemy.y = FLOOR - enemy.h;
        if (enemy.stateTimer <= 0) {
          enemy.state = "chasing";
          enemy.stateTimer = ENEMY_CHASE_DURATION;
          enemy.preyTarget = null;
        }
      }

      const enemyHitbox = {
        x: enemy.x + 20,
        y: enemy.y + 16,
        w: enemy.w - 40,
        h: enemy.h - 18
      };
      if (overlaps(playerHitbox, enemyHitbox)) {
        this.finish();
        return;
      }
    }

    this.enemies = this.enemies.filter((enemy) => enemy.x > -240 && enemy.x < WIDTH + 240);
  }
  finish() {
    if (!this.running) return;
    this.running = false;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    const score = scoreForDistance(this.distance);
    this.best = Math.max(this.best, score);
    try { localStorage.setItem("frantic-empty-stomach-best", String(this.best)); } catch {}
    this.root.querySelector("[data-empty-result]").textContent = this.text(`CORAL È STATA DIVORATA · DISTANZA: ${score} M · RÉCORD: ${this.best} M`, `CORAL WAS EATEN · DISTANCE: ${score} M · BEST: ${this.best} M`);
    this.root.classList.remove("playing");
    this.root.querySelector("[data-empty-result]").hidden = false;
    this.root.querySelector("[data-empty-retry]").hidden = false;
    this.root.querySelector("[data-empty-exit]").hidden = false;
    this.render();
  }

  exit() {
    this.running = false;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.keys.clear();
    this.root.classList.remove("active", "playing");
    this.root.setAttribute("aria-hidden", "true");
    this.onExit();
  }

  drawSprite(key, x, y, w, h, fallback, animationTime = this.elapsed * 1000) {
    const animation = this.animations[key];
    if (animation?.frames.length) {
      const index = getAnimatedFrameIndex(animation.frames, animationTime);
      this.ctx.drawImage(animation.frames[index].image, x, y, w, h);
    } else {
      this.ctx.fillStyle = fallback;
      this.ctx.fillRect(x + 10, y + 20, w - 20, h - 24);
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, "#b8d0c4");
    gradient.addColorStop(0.72, "#e0d7ae");
    gradient.addColorStop(1, "#7d8861");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#6c8568";
    for (let i = 0; i < 9; i++) {
      const x = ((i * 150 - this.distance * 0.18) % 1200 + 1200) % 1200 - 100;
      ctx.fillRect(x, 250 - (i % 3) * 22, 28, 190);
      ctx.fillRect(x - 22, 268 - (i % 3) * 22, 72, 12);
      ctx.fillRect(x - 12, 238 - (i % 3) * 22, 52, 12);
    }
    ctx.fillStyle = "#4d6043";
    ctx.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);
    ctx.fillStyle = "#a2a36a";
    for (let i = 0; i < 36; i++) {
      const x = ((i * 37 - this.distance * 1.2) % 1000 + 1000) % 1000;
      ctx.fillRect(x, FLOOR + 10 + (i % 3) * 9, 16 + (i % 4) * 4, 3);
    }
    for (const prey of this.herd) {
      const pose = prey.beingEaten
        ? (prey.beingEatenElapsed < 0.65 ? "parasaurPerturbed" : "parasaurIdle")
        : prey.animationState === "perturbed" ? "parasaurPerturbed" : "parasaurRun";
      this.drawSprite(pose, prey.x, prey.y, prey.w, prey.h, "#8e9b72");
    }
    for (const enemy of this.enemies) {
      const pose = enemyAnimationKey(enemy, this.elapsed);
      const frozenPose = enemy.kind === "xenoraptor" &&
        (enemy.state === "resting" || (enemy.state === "hunting" && !enemy.preyTarget));
      this.drawSprite(
        pose,
        enemy.x,
        enemy.y,
        enemy.w,
        enemy.h,
        enemy.kind === "xenoraptor" ? "#6c524b" : "#34433c",
        frozenPose ? 0 : this.elapsed * 1000
      );
    }
    this.drawSprite("coral", this.player.x, this.player.y, this.player.w, this.player.h, "#e7a7a0");
    ctx.fillStyle = "#18221d";
    ctx.font = "bold 16px monospace";
    ctx.fillText(this.text("DISTANCIA", "DISTANCE") + "  " + scoreForDistance(this.distance) + " M", 26, 34);
    ctx.font = "11px monospace";
    ctx.fillText(this.text("CORAL // SUPERVIVENCIA", "CORAL // SURVIVAL"), 26, 54);
    if (!this.running && !this.root.querySelector("[data-empty-result]").hidden) {
      ctx.fillStyle = "rgba(7,13,12,.45)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  destroy() {
    this.exit();
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }
}
