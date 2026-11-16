import { loadAnimatedGif, getAnimatedFrameIndex } from "./AnimatedGif.js";
const WIDTH = 960;
const HEIGHT = 540;
const FLOOR = 438;
export const INTRO_DURATION = 5;
export const PLAYER_WIDTH = 80;
export const PLAYER_HEIGHT = 66;
const INTRO_END_X = 250;
const PRAIRIE_HERD = [
  { x: 32, y: 368, w: 72, h: 52 },
  { x: 282, y: 358, w: 88, h: 64 },
  { x: 610, y: 366, w: 78, h: 56 },
  { x: 905, y: 354, w: 92, h: 66 }
];
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

export function getGroundAlignedY(y, renderedHeight, sourceHeight, bottomPadding = 0) {
  if (![y, renderedHeight, sourceHeight].every(Number.isFinite) || sourceHeight <= 0) return y;
  const padding = Math.max(0, Math.min(sourceHeight, Number(bottomPadding) || 0));
  return y + renderedHeight * padding / sourceHeight;
}

export const ENEMY_CHASE_DURATION = 2;
export const ENEMY_EAT_DURATION = 1.35;
export const DASH_DURATION = 0.2;
export const DASH_COOLDOWN = 1.65;
export const DASH_SPEED_MULTIPLIER = 2.2;
export const DASH_DUST_DURATION = 0.72;
export const ENEMY_STUN_DURATION = 2;
export const PLAYER_RIGHT_MARGIN = 120;
export const EGG_INVULNERABILITY_DURATION = 4;
export const ITEM_INTERACTION_RADIUS = 112;
export const ENEMY_TRIP_FADE_DURATION = 0.9;

export function createPredator(kind, phase = 0) {
  const isXenoraptor = kind === "xenoraptor";
  const w = isXenoraptor ? 148 : 126;
  const h = isXenoraptor ? 104 : 86;
  // Spawn fully outside the canvas; the predator enters from its left edge.
  return {
    kind: isXenoraptor ? "xenoraptor" : "velociraptor",
    x: -w,
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
  if (enemy.state === "stunned" || enemy.state === "fading") return isXenoraptor ? "xenoraptorJump" : "velociraptorIdle";
  if (enemy.state === "eating") return isXenoraptor ? "xenoraptorAttack" : "velociraptorEat";
  if (enemy.state === "departing" || (enemy.state === "hunting" && !enemy.preyTarget)) {
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
    this.pauseButton = root.querySelector("[data-empty-pause]");
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
    this.frame = null;
    this.last = 0;
    this.elapsed = 0;
    this.distance = 0;
    this.spawnTimer = 0;
    this.preyTimer = 1.5;
    this.enemies = [];
    this.herd = [];
    this.particles = [];
    this.dashDustClouds = [];
    this.eggs = [];
    this.rocks = [];
    this.carriedItem = null;
    this.invulnerabilityTimer = 0;
    this.eggSpawnTimer = 2.2;
    this.rockSpawnTimer = 3.4;
    this.player = {
      x: INTRO_END_X, y: FLOOR - PLAYER_HEIGHT, w: PLAYER_WIDTH, h: PLAYER_HEIGHT,
      vy: 0, grounded: true, facing: 1, dashDirection: 1, dashTimer: 0, dashCooldown: 0
    };
    this.best = 0;
    try { this.best = Number(localStorage.getItem("frantic-empty-stomach-best")) || 0; } catch {}
    this.handleKeyDown = (event) => {
      if (!this.root.classList.contains("active")) return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyP", "KeyX", "KeyE", "KeyQ"].includes(event.code)) event.preventDefault();
      if (event.code === "Escape" && !event.repeat) { this.exit(); return; }
      if (event.code === "KeyP" && !event.repeat) { this.togglePause(); return; }
      if (this.phase === "intro" || this.paused) return;
      if (event.code === "KeyX" && !event.repeat) { this.activateDash(); return; }
      if (event.code === "KeyE" && !event.repeat) { this.interactWithItem(); return; }
      if (event.code === "KeyQ" && !event.repeat) { this.consumeCarriedEgg(); return; }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD", "KeyW"].includes(event.code)) this.keys.add(event.code);
      if (["Space", "ArrowUp", "KeyW"].includes(event.code) && !event.repeat && !this.running && !this.paused) this.start();
    };
    this.handleKeyUp = (event) => this.keys.delete(event.code);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    root.querySelector("[data-empty-start]").addEventListener("click", () => this.start());
    root.querySelector("[data-empty-retry]").addEventListener("click", () => this.start());
    root.querySelector("[data-empty-exit]").addEventListener("click", () => this.exit());
    this.pauseButton.addEventListener("click", () => this.togglePause());
    this.render();
  }

  text(es, en) { return this.locale === "es" ? es : en; }
  setLocale(locale) {
    this.locale = locale === "en" ? "en" : "es";
    this.root.querySelector("[data-empty-title]").textContent = this.phase === "finished"
      ? this.text("PARTIDA FINALIZADA", "GAME OVER")
      : this.text("ESTÓMAGO VACÍO", "EMPTY STOMACH");
    this.root.querySelector("[data-empty-subtitle]").textContent = this.text("Coral corre por su vida. Los depredadores no van a detenerse.", "Coral is running for her life. The predators won't stop.");
    this.root.querySelector("[data-empty-instructions]").textContent = this.text("A / D O ← / →: MOVERSE · ESPACIO / ↑: SALTAR · X: EMBESTIR · E: TOMAR / SOLTAR · Q: COMER HUEVO · P: PAUSAR · ESC: SALIR", "A / D OR ← / →: MOVE · SPACE / ↑: JUMP · X: DASH · E: PICK UP / DROP · Q: EAT EGG · P: PAUSE · ESC: EXIT");
    this.root.querySelector("[data-empty-controls-text]").textContent = this.text("A / D O ← / →: MOVERSE · ESPACIO / ↑: SALTAR · X: EMBESTIR · E: TOMAR / SOLTAR · Q: COMER HUEVO · ESC: SALIR", "A / D OR ← / →: MOVE · SPACE / ↑: JUMP · X: DASH · E: PICK UP / DROP · Q: EAT EGG · ESC: EXIT");
    this.root.querySelector("[data-empty-pause-label]").textContent = this.text("PAUSA", "PAUSED");
    this.root.querySelector("[data-empty-result]").textContent = this.text("CORAL FUE DEVORADA", "CORAL WAS EATEN");
    this.updatePauseButton();
    this.root.querySelector("[data-empty-start]").textContent = this.text("INICIAR", "START RUN");
    this.root.querySelector("[data-empty-retry]").textContent = this.text("RETOMAR", "RETRY");
    this.root.querySelector("[data-empty-exit]").textContent = this.text("SALIR", "EXIT");
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
    this.paused = false;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.root.classList.remove("paused");
    this.pauseOverlay.hidden = true;
    this.controlsStrip.hidden = true;
    this.root.querySelector("[data-empty-title]").textContent = this.text("ESTÓMAGO VACÍO", "EMPTY STOMACH");
    this.root.querySelector("[data-empty-subtitle]").hidden = false;
    this.root.querySelector("[data-empty-instructions]").hidden = false;
    this.updatePauseButton();
    this.phase = "idle";
    this.introElapsed = 0;
    this.animationClock = 0;
    this.sceneryOffset = 0;
    this.last = 0;
    this.elapsed = 0;
    this.distance = 0;
    this.spawnTimer = 1.2;
    this.preyTimer = 0.8;
    this.enemies = [];
    this.herd = [];
    this.particles = [];
    this.dashDustClouds = [];
    this.eggs = [];
    this.rocks = [];
    this.carriedItem = null;
    this.invulnerabilityTimer = 0;
    this.eggSpawnTimer = 2.2;
    this.rockSpawnTimer = 3.4;
    this.player = {
      x: INTRO_END_X, y: FLOOR - PLAYER_HEIGHT, w: PLAYER_WIDTH, h: PLAYER_HEIGHT,
      vy: 0, grounded: true, facing: 1, dashDirection: 1, dashTimer: 0, dashCooldown: 0
    };
    this.keys.clear();
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

    const width = 205;
    const height = p.h + 14;
    const x = p.dashDirection > 0 ? p.x - 135 : p.x + p.w - 70;
    this.dashDustClouds ??= [];
    this.dashDustClouds.push({
      x, y: p.y - 6, w: width, h: height,
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
        if (cloud.hitIds.has(enemy) || !["chasing", "hunting"].includes(enemy.state)) continue;
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
    const step = Math.min(Math.abs(difference), chaseSpeed * delta);
    if (step > 0) {
      enemy.direction = Math.sign(difference);
      enemy.x += enemy.direction * step;
    }
    enemy.y = FLOOR - enemy.h + Math.sin(this.elapsed * 8 + enemy.phase) * 2;
  }

  update(delta) {
    this.elapsed += delta;
    this.invulnerabilityTimer = Math.max(0, (this.invulnerabilityTimer || 0) - delta);
    const speed = Math.min(310, 150 + this.elapsed * 2.2);
    this.distance += speed * delta;
    this.sceneryOffset = (this.sceneryOffset ?? 0) + speed * delta;
    const p = this.player;
    const left = this.keys.has("ArrowLeft") || this.keys.has("KeyA");
    const right = this.keys.has("ArrowRight") || this.keys.has("KeyD");
    if (left && !right) p.facing = -1;
    else if (right && !left) p.facing = 1;
    const dashing = (p.dashTimer ?? 0) > 0;
    if (dashing) {
      p.x += (p.dashDirection || p.facing || 1) * 245 * DASH_SPEED_MULTIPLIER * delta;
      p.dashTimer = Math.max(0, p.dashTimer - delta);
    } else {
      if (left) p.x -= 245 * delta;
      if (right) p.x += 245 * delta;
    }
    p.dashCooldown = Math.max(0, (p.dashCooldown ?? 0) - delta);
    p.x = Math.max(22, Math.min(WIDTH - p.w - PLAYER_RIGHT_MARGIN, p.x));
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
      this.enemies.push(createPredator(kind, Math.random() * 6));
      this.spawnTimer = Math.max(0.95, 2.6 - this.elapsed * 0.018) + Math.random() * 0.7;
    }

    this.updateGroundItems(delta, speed);

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
      prey.y = FLOOR - prey.h;
    }
    this.herd = this.herd.filter((prey) => prey.beingEaten || prey.x > -140);

    const playerHitbox = {
      x: p.x + 12,
      y: p.y + 9,
      w: p.w - 24,
      h: p.h - 12
    };

    this.updateDashDust(delta);
    for (const enemy of this.enemies) {
      const chaseSpeed = enemy.kind === "xenoraptor" ? 168 : 138;

      if (enemy.state === "stunned") {
        enemy.stateTimer = Math.max(0, enemy.stateTimer - delta);
        enemy.y = FLOOR - enemy.h;
        if (enemy.stateTimer <= 0) {
          enemy.state = enemy.stunnedState ?? "hunting";
          enemy.stateTimer = enemy.stunnedStateTimer ?? 0;
          delete enemy.stunnedState;
          delete enemy.stunnedStateTimer;
        }
      } else if (enemy.state === "chasing") {
        enemy.stateTimer = Math.max(0, enemy.stateTimer - delta);
        this.moveEnemyTowards(enemy, p.x + p.w / 2, chaseSpeed + this.elapsed * 1.4, delta);
        if (enemy.stateTimer <= 0) {
          enemy.state = "hunting";
          enemy.preyTarget = null;
        }
      } else if (enemy.state === "hunting") {
        const targets = [
          ...this.herd.filter((prey) => !prey.beingEaten).map((prey) => ({ item: prey, type: "prey" })),
          ...this.eggs.map((egg) => ({ item: egg, type: "egg" }))
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
          if (distance <= 58) {
            if (target.type === "prey") {
              target.item.beingEaten = true;
              target.item.beingEatenElapsed = 0;
            }
            enemy.eatTarget = target.item;
            enemy.eatTargetType = target.type;
            enemy.preyTarget = null;
            enemy.state = "eating";
            enemy.stateTimer = ENEMY_EAT_DURATION;
            enemy.y = FLOOR - enemy.h;
          } else this.moveEnemyTowards(enemy, targetX, chaseSpeed + 24, delta);
        } else enemy.y = FLOOR - enemy.h;
      } else if (enemy.state === "eating") {
        enemy.stateTimer = Math.max(0, enemy.stateTimer - delta);
        enemy.y = FLOOR - enemy.h;
        if (enemy.stateTimer <= 0) {
          const eatenTarget = enemy.eatTarget;
          if (enemy.eatTargetType === "egg") this.eggs = this.eggs.filter((egg) => egg !== eatenTarget);
          else this.herd = this.herd.filter((prey) => prey !== eatenTarget);
          enemy.eatTarget = null;
          enemy.eatTargetType = null;
          // The predator stops animating and is carried off-screen by the scrolling ground.
          enemy.state = "departing";
          enemy.stateTimer = 0;
        }
      } else if (enemy.state === "departing") {
        // Like a treadmill belt: the predator holds its pose while the world scrolls left.
        enemy.x -= speed * delta;
        enemy.y = FLOOR - enemy.h;
      } else if (enemy.state === "fading") {
        enemy.fadeTimer = Math.max(0, enemy.fadeTimer - delta);
        enemy.y = FLOOR - enemy.h;
      }

      const enemyHitbox = {
        x: enemy.x + 20,
        y: enemy.y + 16,
        w: enemy.w - 40,
        h: enemy.h - 18
      };
      for (const rock of this.rocks) {
        if (overlaps(rock, enemyHitbox) && this.tripEnemy(enemy)) { rock.consumed = true; break; }
      }
      const playerContact = overlaps(playerHitbox, enemyHitbox);
      if (this.invulnerabilityTimer > 0) continue;
      if (dashing && playerContact && enemy.state !== "stunned") this.stunPredator(enemy, delta);
      else if (playerContact && !["stunned", "fading"].includes(enemy.state)) { this.finish(); return; }
    }
    this.rocks = this.rocks.filter((rock) => !rock.consumed);
    this.enemies = this.enemies.filter((enemy) => enemy.x + enemy.w > 0 && enemy.x < WIDTH + 240 && (enemy.state !== "fading" || enemy.fadeTimer > 0));
  }

  interactWithItem() {
    if (!this.running || this.phase !== "playing") return false;
    if (this.carriedItem) {
      const item=this.carriedItem, direction=this.player.facing||1;
      item.x=Math.max(12,Math.min(WIDTH-item.w-12,this.player.x+direction*(this.player.w+18)));
      item.y=FLOOR-item.h; item.vx=direction*(item.kind==="rock"?185:115);
      (item.kind==="rock"?this.rocks:this.eggs).push(item); this.carriedItem=null; return true;
    }
    const candidates=[...this.eggs,...this.rocks].filter(item=>Math.abs(item.x+item.w/2-(this.player.x+this.player.w/2))<=ITEM_INTERACTION_RADIUS)
      .sort((a,b)=>Math.abs(a.x-this.player.x)-Math.abs(b.x-this.player.x));
    const item=candidates[0]; if(!item)return false;
    const collection=item.kind==="egg"?this.eggs:this.rocks;
    collection.splice(collection.indexOf(item),1); item.vx=0; this.carriedItem=item; return true;
  }

  consumeCarriedEgg() {
    if(!this.running||this.phase!=="playing"||this.carriedItem?.kind!=="egg")return false;
    this.carriedItem=null; this.invulnerabilityTimer=EGG_INVULNERABILITY_DURATION; return true;
  }

  updateGroundItems(delta,speed) {
    this.eggSpawnTimer-=delta;
    if(this.eggSpawnTimer<=0){this.eggs.push({kind:"egg",x:WIDTH+20,y:FLOOR-23,w:28,h:23,vx:0});this.eggSpawnTimer=4.8+Math.random()*3.2;}
    this.rockSpawnTimer-=delta;
    if(this.rockSpawnTimer<=0){this.rocks.push({kind:"rock",x:WIDTH+30,y:FLOOR-25,w:34,h:25,vx:0});this.rockSpawnTimer=6.2+Math.random()*3.8;}
    for(const item of [...this.eggs,...this.rocks]){item.x+=((item.vx||0)-speed*.72)*delta;item.vx=(item.vx||0)*Math.max(0,1-delta*2.6);item.y=FLOOR-item.h;}
    this.eggs=this.eggs.filter(item=>item.x+item.w>-40);this.rocks=this.rocks.filter(item=>item.x+item.w>-50);
  }

  tripEnemy(enemy) {
    if(["fading","departing","eating"].includes(enemy.state))return false;
    enemy.state="fading";enemy.fadeTimer=ENEMY_TRIP_FADE_DURATION;enemy.preyTarget=null;enemy.eatTarget=null;return true;
  }

  drawEgg(egg) {
    const c=this.ctx;c.save();c.fillStyle="#e9dfc2";c.strokeStyle="#9f8c68";c.lineWidth=2;c.beginPath();
    c.ellipse(egg.x+egg.w/2,egg.y+egg.h/2,egg.w*.42,egg.h*.48,-.18,0,Math.PI*2);c.fill();c.stroke();
    c.fillStyle="rgba(255,255,255,.62)";c.beginPath();c.ellipse(egg.x+egg.w*.36,egg.y+egg.h*.3,3,5,-.3,0,Math.PI*2);c.fill();c.restore();
  }

  drawRock(rock) {
    const c=this.ctx;c.save();c.fillStyle="#171a19";c.strokeStyle="#555b55";c.lineWidth=2;c.beginPath();
    c.moveTo(rock.x+3,rock.y+rock.h);c.lineTo(rock.x+1,rock.y+11);c.lineTo(rock.x+11,rock.y+2);
    c.lineTo(rock.x+24,rock.y+4);c.lineTo(rock.x+rock.w-1,rock.y+15);c.lineTo(rock.x+rock.w-5,rock.y+rock.h);
    c.closePath();c.fill();c.stroke();c.restore();
  }

  drawCarriedItem(item) {
    const x=this.player.x+this.player.w/2-item.w/2,y=this.player.y-item.h+8;
    if(item.kind==="egg")this.drawEgg({...item,x,y});else this.drawRock({...item,x,y});
  }

  finish() {
    if (!this.running) return;
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
    try { localStorage.setItem("frantic-empty-stomach-best", String(this.best)); } catch {}
    this.root.querySelector("[data-empty-title]").textContent = this.text("PARTIDA FINALIZADA", "GAME OVER");
    this.root.querySelector("[data-empty-subtitle]").hidden = true;
    this.root.querySelector("[data-empty-instructions]").hidden = true;
    this.root.querySelector("[data-empty-result]").textContent = this.text("CORAL FUE DEVORADA", "CORAL WAS EATEN");
    this.root.classList.remove("playing");
    this.root.querySelector("[data-empty-result]").hidden = false;
    this.root.querySelector("[data-empty-retry]").hidden = false;
    this.root.querySelector("[data-empty-exit]").hidden = false;
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

  drawSprite(key, x, y, w, h, fallback, animationTime = (this.animationClock ?? this.elapsed ?? 0) * 1000) {
    const animation = this.animations[key];
    if (animation?.frames.length) {
      const index = getAnimatedFrameIndex(animation.frames, animationTime);
      const frame = animation.frames[index];
      const bottomPadding = key.startsWith("parasaur")
        ? frame.bottomPadding ?? animation.bottomPadding
        : animation.bottomPadding;
      const drawY = key === "coral" || key.startsWith("parasaur")
        ? getGroundAlignedY(y, h, animation.height, bottomPadding)
        : y;
      this.ctx.drawImage(frame.image, x, drawY, w, h);
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

  render() {
    const ctx = this.ctx;
    const scroll = Number.isFinite(this.sceneryOffset) ? this.sceneryOffset : 0;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // A sunlit open prairie replaces the previous muted woodland backdrop.
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

    // A few Parasaurolophus graze across the horizon, making Coral part of a living herd.
    for (let i = 0; i < PRAIRIE_HERD.length; i += 1) {
      const animal = PRAIRIE_HERD[i];
      const x = ((animal.x - scroll * 0.12) % (WIDTH + 180) + (WIDTH + 180)) % (WIDTH + 180) - 90;
      this.drawSprite(
        "parasaurIdle",
        x,
        animal.y,
        animal.w,
        animal.h,
        "#82975e",
        (this.animationClock ?? 0) * 1000 + i * 310
      );
    }

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

    for (const egg of this.eggs) this.drawEgg(egg);
    for (const rock of this.rocks) this.drawRock(rock);
    for (const prey of this.herd) {
      const pose = prey.beingEaten
        ? (prey.beingEatenElapsed < 0.65 ? "parasaurPerturbed" : "parasaurIdle")
        : prey.animationState === "perturbed" ? "parasaurPerturbed" : "parasaurRun";
      this.drawSprite(pose, prey.x, prey.y, prey.w, prey.h, "#8e9b72");
    }
    for (const enemy of this.enemies) {
      const pose = enemyAnimationKey(enemy, this.elapsed);
      const frozenPose = enemy.state === "departing" || enemy.state === "stunned" ||
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
        frozenPose ? 0 : this.animationClock * 1000
      );
      ctx.restore();
      if (enemy.state === "stunned") {
        ctx.fillStyle = "#fff2a8";
        ctx.font = "bold 20px monospace";
        ctx.fillText("✳", enemy.x + enemy.w / 2 - 7, enemy.y - 5);
      }
    }
    for (const cloud of this.dashDustClouds ?? []) this.drawDashDustCloud(cloud);
    if (this.carriedItem) this.drawCarriedItem(this.carriedItem);
    ctx.save();
    if (this.invulnerabilityTimer > 0) ctx.globalAlpha = Math.floor(this.invulnerabilityTimer * 12) % 2 ? 0.42 : 1;
    this.drawSprite("coral", this.player.x, this.player.y, this.player.w, this.player.h, "#e7a7a0");
    ctx.restore();
    if (this.invulnerabilityTimer > 0) { ctx.fillStyle="#fff0bd";ctx.font="bold 13px monospace";ctx.fillText("INVULNERABLE "+this.invulnerabilityTimer.toFixed(1)+"s",26,56); }
    if (this.phase === "playing" || this.phase === "finished") {
      ctx.fillStyle = "#30452a";
      ctx.font = "bold 16px monospace";
      ctx.fillText(this.text("DISTANCIA", "DISTANCE") + "  " + scoreForDistance(this.distance) + " M", 26, 34);
    }
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
