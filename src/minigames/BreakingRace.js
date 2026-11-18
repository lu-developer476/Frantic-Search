import { observeCanvasViewport } from "../rendering/CanvasUtils.js";
import { getLaneBaseline, getLaneScale, normalizeLane, LANE_COUNT } from "./EmptyStomach.js";
import { MinigameEnvironmentRenderer, MINIGAME_ENVIRONMENT_SCENES } from "./MinigameEnvironment.js";

let WIDTH = 960;
const HEIGHT = 540;
const BASE_WIDTH = 960;
const START_RATIO = 92 / BASE_WIDTH;
const FINISH_RATIO = 874 / BASE_WIDTH;
const CHECKPOINT_RATIOS = [250, 410, 570, 730].map((x) => x / BASE_WIDTH);
const ROSTER = [
  { name: "Gala", species: "Velociraptor nublarensis", run: "references/adult-velociraptor-nublarensis.png", jump: "references/adult-velociraptor-nublarensis.png", speed: 92 },
  { name: "Brisa", species: "Velociraptor abyssomirabilis", run: "references/juvenile-velociraptor-abyssomirabilis-run.gif", jump: "references/juvenile-velociraptor-abyssomirabilis-jump.gif", speed: 88 },
  { name: "Venatosaurus impavidus", species: "Venatosaurus impavidus", run: "references/venatosaurus-impavidus-run.gif", jump: "references/venatosaurus-impavidus-jump.gif", speed: 86 },
  { name: "Venatosaurus saevidicus", species: "Venatosaurus saevidicus", run: "references/venatosaurus-saevidicus-run.gif", jump: "references/venatosaurus-saevidicus-jump.gif", speed: 84 },
  { name: "Coral", species: "Miniraptor", run: "minigame/empty-stomach/gif/main/miniraptor-run.gif", jump: "minigame/empty-stomach/gif/main/miniraptor-jump.gif", speed: 94 },
  { name: "Umbraraptor silvis", species: "Umbraraptor silvis", run: "minigame/empty-stomach/gif/enemies/umbraraptor-silvis/umbraraptor-silvis-walk.gif", jump: "minigame/empty-stomach/gif/enemies/umbraraptor-silvis/umbraraptor-silvis-jump.gif", speed: 82 },
  { name: "Xenoraptor crypticus", species: "Xenoraptor crypticus", run: "minigame/empty-stomach/gif/enemies/xenoraptor-crypticus/xenoraptor-crypticus-run.gif", jump: "minigame/empty-stomach/gif/enemies/xenoraptor-crypticus/xenoraptor-crypticus-jump.gif", speed: 90 }
];

const laneX = (ratio) => WIDTH * ratio;

export function getBreakingRaceLaneLayout(lane = 0) {
  const normalizedLane = normalizeLane(lane);
  return {
    lane: normalizedLane,
    baseline: getLaneBaseline(normalizedLane),
    scale: getLaneScale(normalizedLane)
  };
}

export class BreakingRace {
  constructor(root, onExit = () => {}) {
    this.root = root;
    this.canvas = root.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.onExit = onExit;
    this.locale = "es";
    this.images = new Map();
    this.frame = null;
    this.running = false;
    this.paused = false;
    this.last = 0;
    this.elapsed = 0;
    this.racers = [];
    this.checkpoints = [];
    this.obstacles = [];
    this.pickups = [];
    this.environmentRenderer = new MinigameEnvironmentRenderer({
      scene: MINIGAME_ENVIRONMENT_SCENES.emptyStomach,
      groundY: 438,
      seed: 4021,
      sectionLength: 6200,
      sectionCount: 8
    });
    this.canvasViewport = observeCanvasViewport(
      root.querySelector(".breaking-race-stage"),
      this.canvas,
      (width) => this.resizeCanvas(width)
    );

    this.handleDown = (event) => {
      if (!this.root.classList.contains("active")) return;
      if (["Space", "ArrowUp", "KeyW"].includes(event.code)) event.preventDefault();

      if (event.code === "Escape" && !event.repeat) {
        this.exit();
        return;
      }
      if (event.code === "KeyP" && !event.repeat && this.running) {
        this.togglePause();
        return;
      }
      if (["Space", "ArrowUp", "KeyW"].includes(event.code) && !event.repeat) {
        this.jump(this.racers[0]);
      }
    };

    window.addEventListener("keydown", this.handleDown);
    root.querySelector("[data-br-start]").addEventListener("click", () => this.start());
    root.querySelector("[data-br-retry]").addEventListener("click", () => this.start());
    root.querySelector("[data-br-exit]").addEventListener("click", () => this.exit());
    this.setLocale("es");
  }

  resizeCanvas(width) {
    const nextWidth = Math.max(BASE_WIDTH, Math.ceil(width));
    if (nextWidth !== WIDTH) {
      const ratio = nextWidth / WIDTH;
      for (const collection of [this.racers, this.checkpoints, this.obstacles, this.pickups]) {
        for (const item of collection ?? []) item.x *= ratio;
      }
      WIDTH = nextWidth;
    }
    this.ctx.imageSmoothingEnabled = false;
  }

  get startX() {
    return laneX(START_RATIO);
  }

  get finishX() {
    return laneX(FINISH_RATIO);
  }

  text(es, en) {
    return this.locale === "es" ? es : en;
  }

  setStatus(es, en) {
    const status = this.root.querySelector("[data-br-status]");
    if (status) status.textContent = this.text(es, en);
  }

  setLocale(locale) {
    this.locale = locale === "en" ? "en" : "es";
    this.root.querySelector("[data-br-title]").textContent = this.text("CARRERA DE FRENADO", "BREAKING RACE");
    this.root.querySelector("[data-br-subtitle]").textContent = this.text(
      "Cuatro dinosaurios. Cuatro carriles. Pisá cada marca con precisión y cruzá la meta.",
      "Four dinosaurs. Four lanes. Hit every checkpoint precisely and reach the finish."
    );
    this.root.querySelector("[data-br-instructions]").textContent = this.text(
      "ESPACIO / W / ↑: SALTAR · P: PAUSA · ESC: SALIR · HUEVOS Y CARNE: IMPULSO",
      "SPACE / W / ↑: JUMP · P: PAUSE · ESC: EXIT · EGGS AND MEAT: BOOST"
    );
    this.root.querySelector("[data-br-start]").textContent = this.text("INICIAR CARRERA", "START RACE");
    this.root.querySelector("[data-br-retry]").textContent = this.text("OTRA CARRERA", "RACE AGAIN");
    this.root.querySelector("[data-br-exit]").textContent = this.text("VOLVER AL MENÚ", "BACK TO MENU");
    this.setStatus("CARRERA // LISTA", "RACE // READY");
    if (this.root.classList.contains("active")) this.render();
  }

  open() {
    this.root.classList.add("active");
    this.canvasViewport();
    this.root.setAttribute("aria-hidden", "false");
    this.root.classList.remove("playing");
    this.reset();
    this.root.querySelector("[data-br-start]").hidden = false;
    this.root.querySelector("[data-br-retry]").hidden = true;
    this.root.querySelector("[data-br-result]").hidden = true;
    this.root.querySelector("[data-br-start]").focus();
    this.setStatus("CARRERA // LISTA", "RACE // READY");
    this.render();
  }

  reset() {
    this.stop();
    this.elapsed = 0;
    this.paused = false;
    this.racers = [];
    this.checkpoints = CHECKPOINT_RATIOS.map((progress) => ({
      x: laneX(progress),
      hit: false
    }));
    this.obstacles = [
      { x: laneX(330 / BASE_WIDTH), lane: 1 },
      { x: laneX(490 / BASE_WIDTH), lane: 3 },
      { x: laneX(650 / BASE_WIDTH), lane: 0 },
      { x: laneX(790 / BASE_WIDTH), lane: 2 }
    ];
    this.pickups = [
      { x: laneX(205 / BASE_WIDTH), lane: 0, type: "egg", taken: false },
      { x: laneX(365 / BASE_WIDTH), lane: 2, type: "meat", taken: false },
      { x: laneX(525 / BASE_WIDTH), lane: 1, type: "egg", taken: false },
      { x: laneX(690 / BASE_WIDTH), lane: 3, type: "meat", taken: false }
    ];
  }

  stop() {
    this.running = false;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  start() {
    this.canvasViewport();
    this.reset();
    const pool = [...ROSTER].sort(() => Math.random() - 0.5).slice(0, LANE_COUNT);
    this.racers = pool.map((dinosaur, lane) => ({
      d: dinosaur,
      lane,
      x: this.startX,
      score: 0,
      cp: 0,
      wait: 0,
      boost: 0,
      slow: 0,
      vy: 0,
      jumpY: 0,
      jumping: false,
      finished: false,
      finishTime: 0,
      flash: 0
    }));

    for (const dinosaur of pool) {
      for (const source of [dinosaur.run, dinosaur.jump]) {
        if (this.images.has(source)) continue;
        const image = new Image();
        image.src = import.meta.env.BASE_URL + source;
        this.images.set(source, image);
      }
    }

    this.running = true;
    this.paused = false;
    this.root.classList.add("playing");
    this.root.querySelector("[data-br-start]").hidden = true;
    this.root.querySelector("[data-br-retry]").hidden = true;
    this.root.querySelector("[data-br-result]").hidden = true;
    this.setStatus("CARRERA // EN CURSO", "RACE // RUNNING");
    this.last = performance.now();
    this.frame = requestAnimationFrame((time) => this.tick(time));
  }

  togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;
    if (this.paused) {
      if (this.frame !== null) cancelAnimationFrame(this.frame);
      this.frame = null;
      this.setStatus("CARRERA // PAUSADA", "RACE // PAUSED");
      return;
    }

    this.last = performance.now();
    this.setStatus("CARRERA // EN CURSO", "RACE // RUNNING");
    this.frame = requestAnimationFrame((time) => this.tick(time));
  }

  jump(racer) {
    if (!this.running || !racer || racer.jumping || racer.wait > 0 || racer.finished) return;
    racer.jumping = true;
    racer.vy = -245;
  }

  tick(now) {
    if (!this.running || this.paused) return;
    const delta = Math.min(0.04, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.update(delta);
    this.render();
    if (this.running) this.frame = requestAnimationFrame((time) => this.tick(time));
  }

  update(delta) {
    this.elapsed += delta;

    for (const racer of this.racers) {
      if (racer.finished) continue;

      racer.flash = Math.max(0, racer.flash - delta);
      racer.wait = Math.max(0, racer.wait - delta);
      racer.slow = Math.max(0, racer.slow - delta);
      racer.boost = Math.max(0, racer.boost - delta);

      if (racer.jumping) {
        racer.vy += 600 * delta;
        racer.jumpY += racer.vy * delta;
        if (racer.jumpY >= 0) {
          racer.jumpY = 0;
          racer.vy = 0;
          racer.jumping = false;
        }
      }

      if (racer.wait > 0) continue;

      const target = this.checkpoints[racer.cp];
      if (target && racer.x >= target.x - 5) {
        const error = Math.abs(racer.x - target.x);
        if (error <= 12) {
          racer.score += 100;
          racer.cp += 1;
          racer.wait = 2;
          racer.flash = 0.35;
        } else {
          racer.score += Math.max(0, 50 - Math.round(error * 2));
          racer.cp += 1;
          racer.wait = 2;
        }
        continue;
      }

      const layout = getBreakingRaceLaneLayout(racer.lane);
      const obstacleAhead = this.obstacles.find((obstacle) =>
        obstacle.lane === racer.lane &&
        obstacle.x - racer.x > 0 &&
        obstacle.x - racer.x < 34 * layout.scale
      );
      if (racer.lane !== 0 && obstacleAhead && !racer.jumping && Math.random() < 0.045) {
        this.jump(racer);
      }

      const obstacle = this.obstacles.find((item) =>
        item.lane === racer.lane && Math.abs(item.x - racer.x) < 13 * layout.scale
      );
      if (obstacle && racer.slow <= 0 && !racer.jumping) {
        racer.slow = 1.5;
        racer.flash = 1.5;
        racer.x -= 8;
      }

      const pickup = this.pickups.find((item) =>
        !item.taken &&
        item.lane === racer.lane &&
        Math.abs(item.x - racer.x) < 10 * layout.scale
      );
      if (pickup) {
        pickup.taken = true;
        racer.boost = 2.4;
        racer.score += pickup.type === "egg" ? 20 : 30;
      }

      const pace = racer.d.speed +
        (racer.boost > 0 ? 42 : 0) -
        (racer.slow > 0 ? 43 : 0) +
        (racer.jumping ? 4 : 0);
      racer.x = Math.min(this.finishX, racer.x + pace * delta);

      if (racer.x >= this.finishX) {
        racer.finished = true;
        racer.finishTime = this.elapsed;
        racer.score += Math.max(0, Math.round((LANE_COUNT - this.racers.filter((item) => item.finished).length) * 25));
      }
    }

    if (this.racers.length && this.racers.every((racer) => racer.finished)) this.finish();
  }

  finish() {
    this.stop();
    this.racers.sort((a, b) => b.score - a.score || a.finishTime - b.finishTime);
    const winner = this.racers[0];
    this.root.querySelector("[data-br-result]").textContent =
      this.text("GANADOR: ", "WINNER: ") + winner.d.name + " · " + winner.score + " PTS";
    this.root.querySelector("[data-br-result]").hidden = false;
    this.root.querySelector("[data-br-retry]").hidden = false;
    this.root.classList.remove("playing");
    this.setStatus("CARRERA // FINALIZADA", "RACE // FINISHED");
  }

  drawBackground() {
    const rendered = this.environmentRenderer.draw(this.ctx, {
      cameraX: 0,
      viewportWidth: WIDTH,
      viewportHeight: HEIGHT,
      elapsed: this.elapsed
    });
    if (rendered) return;

    const context = this.ctx;
    const sky = context.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#72c9e8");
    sky.addColorStop(0.72, "#c4e8d2");
    sky.addColorStop(1, "#eff0b4");
    context.fillStyle = sky;
    context.fillRect(0, 0, WIDTH, HEIGHT);
    const ground = context.createLinearGradient(0, 438, 0, HEIGHT);
    ground.addColorStop(0, "#83b947");
    ground.addColorStop(1, "#456d32");
    context.fillStyle = ground;
    context.fillRect(0, 438, WIDTH, HEIGHT - 438);
  }

  drawLaneGuides() {
    const context = this.ctx;
    context.save();
    context.lineWidth = 1;
    context.setLineDash([18, 16]);
    for (let lane = 0; lane < LANE_COUNT - 1; lane += 1) {
      const boundary = (getLaneBaseline(lane) + getLaneBaseline(lane + 1)) / 2;
      context.strokeStyle = "rgba(43, 65, 39, 0.24)";
      context.beginPath();
      context.moveTo(24, boundary);
      context.lineTo(WIDTH - 20, boundary);
      context.stroke();
    }
    context.setLineDash([]);

    for (let lane = 0; lane < LANE_COUNT; lane += 1) {
      const layout = getBreakingRaceLaneLayout(lane);
      context.fillStyle = "rgba(28, 48, 31, 0.58)";
      context.beginPath();
      context.ellipse(42, layout.baseline - 1, 12 * layout.scale, 7 * layout.scale, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#f3f0d9";
      context.font = "9px monospace";
      context.textAlign = "center";
      context.fillText("0" + (lane + 1), 42, layout.baseline + 2);
    }
    context.restore();
  }

  drawStartAndFinish() {
    const context = this.ctx;
    for (let lane = 0; lane < LANE_COUNT; lane += 1) {
      const layout = getBreakingRaceLaneLayout(lane);
      const markerHeight = 18 * layout.scale;
      context.fillStyle = "#f4efd7";
      context.fillRect(this.startX - 2, layout.baseline - markerHeight, 4, markerHeight);
      context.fillStyle = "#e1a17f";
      context.fillRect(this.startX - 7, layout.baseline - markerHeight, 12 * layout.scale, 6 * layout.scale);

      context.fillStyle = "#efe6c8";
      context.fillRect(this.finishX - 2, layout.baseline - 34 * layout.scale, 4, 34 * layout.scale);
      context.fillStyle = lane % 2 === 0 ? "#354c3e" : "#e1a17f";
      context.fillRect(this.finishX - 8 * layout.scale, layout.baseline - 34 * layout.scale, 13 * layout.scale, 8 * layout.scale);
    }

    context.fillStyle = "#f3f1df";
    context.font = "bold 12px monospace";
    context.textAlign = "center";
    context.fillText(this.text("META", "FINISH"), this.finishX, 421);
    context.textAlign = "left";
  }

  drawCheckpoint(checkpoint) {
    const context = this.ctx;
    for (let lane = 0; lane < LANE_COUNT; lane += 1) {
      const layout = getBreakingRaceLaneLayout(lane);
      const top = layout.baseline - 27 * layout.scale;
      context.fillStyle = checkpoint.hit ? "#8eb36c" : "#e7b65c";
      context.fillRect(checkpoint.x - 2 * layout.scale, top, 4 * layout.scale, 27 * layout.scale);
      if (lane === 0) {
        context.fillStyle = "#40372b";
        context.font = "9px monospace";
        context.textAlign = "center";
        context.fillText("+100", checkpoint.x, top - 5);
      }
    }
    context.textAlign = "left";
  }

  drawObstacle(obstacle) {
    const context = this.ctx;
    const layout = getBreakingRaceLaneLayout(obstacle.lane);
    const width = 26 * layout.scale;
    const height = 30 * layout.scale;
    const baseline = layout.baseline;
    context.fillStyle = "rgba(38, 37, 27, 0.22)";
    context.beginPath();
    context.ellipse(obstacle.x, baseline - 1, width * 0.55, 4 * layout.scale, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#68523a";
    context.beginPath();
    context.moveTo(obstacle.x, baseline - height);
    context.lineTo(obstacle.x - width / 2, baseline);
    context.lineTo(obstacle.x + width / 2, baseline);
    context.closePath();
    context.fill();
    context.fillStyle = "#a38a61";
    context.fillRect(obstacle.x - width * 0.12, baseline - height * 0.72, width * 0.24, height * 0.5);
  }

  drawPickup(pickup) {
    const context = this.ctx;
    const layout = getBreakingRaceLaneLayout(pickup.lane);
    context.font = Math.round(19 * layout.scale) + "px sans-serif";
    context.textAlign = "center";
    context.fillText(pickup.type === "egg" ? "🥚" : "🥩", pickup.x, layout.baseline - 19 * layout.scale);
    context.textAlign = "left";
  }

  drawDino(racer) {
    const context = this.ctx;
    const layout = getBreakingRaceLaneLayout(racer.lane);
    const width = 64 * layout.scale;
    const height = 48 * layout.scale;
    const baseline = layout.baseline;
    const y = baseline - height + (racer.jumpY || 0);
    const image = this.images.get(racer.jumping ? racer.d.jump : racer.d.run);

    context.fillStyle = "rgba(35, 43, 28, 0.24)";
    context.beginPath();
    context.ellipse(racer.x, baseline - 1, width * 0.38, 4 * layout.scale, 0, 0, Math.PI * 2);
    context.fill();

    if (image?.complete && image.naturalWidth) {
      context.save();
      context.globalAlpha = racer.flash > 0 && Math.floor(this.elapsed * 14) % 2 === 0 ? 0.25 : 1;
      context.drawImage(image, racer.x - width / 2, y, width, height);
      context.restore();
    } else {
      context.fillStyle = ["#526b4b", "#b38b61", "#786b54", "#8d715b"][racer.lane];
      context.fillRect(racer.x - width * 0.38, baseline - 23 * layout.scale, width * 0.76, 20 * layout.scale);
      context.fillRect(racer.x + width * 0.08, baseline - 31 * layout.scale, 16 * layout.scale, 13 * layout.scale);
    }

    const label = racer.d.name + " · " + racer.score;
    context.font = Math.max(8, Math.round(9 * layout.scale)) + "px monospace";
    context.textAlign = "center";
    const labelWidth = context.measureText(label).width + 10;
    const labelY = y - 5;
    context.fillStyle = "rgba(22, 34, 27, 0.78)";
    context.fillRect(racer.x - labelWidth / 2, labelY - 11, labelWidth, 14);
    context.fillStyle = "#f3f1df";
    context.fillText(label, racer.x, labelY);

    if (racer.wait > 0) {
      context.fillStyle = "#fff4cf";
      context.fillText("2s", racer.x, labelY - 15);
    }
    context.textAlign = "left";
  }

  render() {
    const context = this.ctx;
    context.clearRect(0, 0, WIDTH, HEIGHT);
    this.drawBackground();
    this.drawLaneGuides();
    this.drawStartAndFinish();

    for (const checkpoint of this.checkpoints) {
      for (const racer of this.racers) {
        if (racer.cp > 0 && this.checkpoints[racer.cp - 1] === checkpoint) checkpoint.hit = true;
      }
      this.drawCheckpoint(checkpoint);
    }

    for (const obstacle of this.obstacles) this.drawObstacle(obstacle);
    for (const pickup of this.pickups) {
      if (!pickup.taken) this.drawPickup(pickup);
    }

    for (const racer of [...this.racers].sort((a, b) => a.lane - b.lane)) this.drawDino(racer);

    context.fillStyle = "#30452a";
    context.font = "12px monospace";
    context.textAlign = "left";
    context.fillText(this.text("TIEMPO ", "TIME ") + this.elapsed.toFixed(1) + "s", 20, 32);
    context.textAlign = "center";
    context.fillText(this.text("CHECKPOINTS", "CHECKPOINTS"), WIDTH / 2, 32);
    context.textAlign = "left";
  }

  exit() {
    this.stop();
    this.root.classList.remove("active", "playing");
    this.root.setAttribute("aria-hidden", "true");
    this.onExit();
  }

  destroy() {
    this.exit();
    this.canvasViewport.disconnect();
    window.removeEventListener("keydown", this.handleDown);
  }
}
