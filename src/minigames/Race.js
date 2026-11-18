import { createEgg, getLaneBaseline, getLaneScale, normalizeLane, LANE_COUNT } from "./Persecution.js";
import { drawOutlinedImage, observeCanvasViewport } from "../rendering/CanvasUtils.js";
import { MinigameEnvironmentRenderer, MINIGAME_ENVIRONMENT_SCENES } from "./MinigameEnvironment.js";

let WIDTH = 960;
const HEIGHT = 540;
const BASE_WIDTH = 960;
const START_RATIO = 92 / BASE_WIDTH;
const FINISH_RATIO = 874 / BASE_WIDTH;
const CHECKPOINT_POSITIONS = [250, 410, 570, 730];
const CHECKPOINT_RATIOS = CHECKPOINT_POSITIONS.map((x) => x / BASE_WIDTH);
const COURSE_HAZARD_KINDS = Object.freeze(["rock", "spikes", "pit", "bush", "mud"]);
const COURSE_PICKUP_KINDS = Object.freeze(["egg", "egg", "egg", "egg", "egg", "meat", "meat"]);
const CHECKPOINT_CLEARANCE = 0.035;
const LANE_OBJECT_CLEARANCE = 0.075;

export const BREAKING_RACE_ROSTER = Object.freeze([
  { id: "gala", name: "Gala", species: "Velociraptor nublarensis", run: "references/adult-velociraptor-nublarensis.png", jump: "references/adult-velociraptor-nublarensis.png", speed: 92 },
  { id: "brisa", name: "Brisa", species: "Velociraptor abyssomirabilis", run: "references/juvenile-velociraptor-abyssomirabilis-run.gif", jump: "references/juvenile-velociraptor-abyssomirabilis-jump.gif", speed: 88 },
  { id: "venatosaurus-impavidus", name: "Venatosaurus impavidus", species: "Venatosaurus impavidus", run: "references/venatosaurus-impavidus-run.gif", jump: "references/venatosaurus-impavidus-jump.gif", speed: 86 },
  { id: "venatosaurus-saevidicus", name: "Venatosaurus saevidicus", species: "Venatosaurus saevidicus", run: "references/venatosaurus-saevidicus-run.gif", jump: "references/venatosaurus-saevidicus-jump.gif", speed: 84 },
  { id: "coral", name: "Coral", species: "Miniraptor", run: "minigame/persecution/gif/main/miniraptor-run.gif", jump: "minigame/persecution/gif/main/miniraptor-jump.gif", speed: 94 },
  { id: "umbraraptor-silvis", name: "Umbraraptor silvis", species: "Umbraraptor silvis", run: "minigame/persecution/gif/enemies/umbraraptor-silvis/umbraraptor-silvis-walk.gif", jump: "minigame/persecution/gif/enemies/umbraraptor-silvis/umbraraptor-silvis-jump.gif", speed: 82 },
  { id: "xenoraptor-crypticus", name: "Xenoraptor crypticus", species: "Xenoraptor crypticus", run: "minigame/persecution/gif/enemies/xenoraptor-crypticus/xenoraptor-crypticus-run.gif", jump: "minigame/persecution/gif/enemies/xenoraptor-crypticus/xenoraptor-crypticus-jump.gif", speed: 90 }
]);

const laneX = (ratio) => WIDTH * ratio;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function createSeededRandom(seed) {
  let state = Number(seed) >>> 0;
  if (state === 0) state = 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function isClearOfCheckpoints(progress) {
  const checkpointProgress = CHECKPOINT_POSITIONS.map((x) => (x - 92) / (874 - 92));
  return checkpointProgress.every((checkpoint) => Math.abs(progress - checkpoint) >= CHECKPOINT_CLEARANCE);
}

export function generateRaceCourse(seed = Date.now()) {
  const random = createSeededRandom(seed);
  const hazards = [];
  const pickups = [];
  const occupiedByLane = Array.from({ length: LANE_COUNT }, () => []);

  const canPlace = (lane, progress, clearance = LANE_OBJECT_CLEARANCE) =>
    isClearOfCheckpoints(progress) &&
    occupiedByLane[lane].every((existing) => Math.abs(existing - progress) >= clearance);

  const placeHazard = (kind, preferredLane = null) => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const lane = preferredLane ?? Math.floor(random() * LANE_COUNT);
      const progress = 0.09 + random() * 0.82;
      if (!canPlace(lane, progress)) continue;
      occupiedByLane[lane].push(progress);
      hazards.push({ id: "hazard-" + hazards.length, kind, lane, progress });
      return true;
    }
    return false;
  };

  // Guarantee that every run contains every main terrain type and that all
  // four lanes receive at least one generated hazard.
  placeHazard("rock", 0);
  placeHazard("spikes", 1);
  placeHazard("pit", 2);
  placeHazard("bush", 3);
  placeHazard("mud");

  for (let index = 0; index < 11; index += 1) {
    const kind = COURSE_HAZARD_KINDS[Math.floor(random() * COURSE_HAZARD_KINDS.length)];
    placeHazard(kind);
  }

  const pickupPositions = Array.from({ length: LANE_COUNT }, () => []);
  for (const kind of COURSE_PICKUP_KINDS) {
    let placed = false;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const lane = Math.floor(random() * LANE_COUNT);
      const progress = 0.12 + random() * 0.76;
      const farFromHazards = hazards
        .filter((hazard) => hazard.lane === lane)
        .every((hazard) => Math.abs(hazard.progress - progress) >= 0.035);
      const farFromPickups = pickupPositions[lane]
        .every((existing) => Math.abs(existing - progress) >= 0.045);
      if (!isClearOfCheckpoints(progress) || !farFromHazards || !farFromPickups) continue;
      pickupPositions[lane].push(progress);
      pickups.push({ id: "pickup-" + pickups.length, kind, lane, progress, taken: false });
      placed = true;
      break;
    }
    if (!placed) break;
  }

  return { seed: Number(seed) >>> 0, hazards, pickups };
}

export function createRaceLineup(selectedDinosaurId, random = Math.random) {
  const selected = BREAKING_RACE_ROSTER.find((dinosaur) => dinosaur.id === selectedDinosaurId)
    ?? BREAKING_RACE_ROSTER[0];
  const opponents = BREAKING_RACE_ROSTER.filter((dinosaur) => dinosaur.id !== selected.id);

  for (let index = opponents.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(clamp(random(), 0, 0.999999) * (index + 1));
    [opponents[index], opponents[swapIndex]] = [opponents[swapIndex], opponents[index]];
  }

  return [selected, ...opponents.slice(0, LANE_COUNT - 1)];
}

export function getRaceLaneLayout(lane = 0) {
  const normalizedLane = normalizeLane(lane);
  return {
    lane: normalizedLane,
    baseline: getLaneBaseline(normalizedLane),
    scale: getLaneScale(normalizedLane)
  };
}

function createHazard(kind, lane, progress, x) {
  const scale = getLaneScale(lane);
  const dimensions = {
    rock: [34, 25],
    spikes: [58, 27],
    pit: [108, 24],
    bush: [98, 48],
    mud: [154, 25]
  };
  const [baseW, baseH] = dimensions[kind];
  return {
    id: kind + "-" + lane + "-" + Math.round(progress * 10000),
    kind,
    lane,
    progress,
    x,
    y: getLaneBaseline(lane) - baseH * scale,
    w: baseW * scale,
    h: baseH * scale,
    scale
  };
}

export class Race {
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
    this.hazards = [];
    this.pickups = [];
    this.selectedDinosaurId = BREAKING_RACE_ROSTER[0].id;
    this.dinosaurSelect = root.querySelector("[data-br-dinosaur-select]");
    this.dinosaurSelectLabel = root.querySelector("[data-br-select-label]");
    this.populateDinosaurSelect();
    this.dinosaurSelect.addEventListener("change", () => {
      this.selectedDinosaurId = BREAKING_RACE_ROSTER.some((dinosaur) => dinosaur.id === this.dinosaurSelect.value)
        ? this.dinosaurSelect.value
        : BREAKING_RACE_ROSTER[0].id;
      this.render();
    });

    this.environmentRenderer = this.createEnvironmentRenderer(4021);
    this.handleDown = (event) => {
      if (!this.root.classList.contains("active")) return;
      if (["Space", "ArrowUp", "ArrowDown", "KeyW", "KeyS"].includes(event.code)) event.preventDefault();

      if (event.code === "Escape" && !event.repeat) {
        this.exit();
        return;
      }
      if (event.code === "KeyP" && !event.repeat && this.running) {
        this.togglePause();
        return;
      }
      if (!this.running || this.paused || event.repeat) return;

      const player = this.playerRacer;
      if (!player) return;
      if (["Space"].includes(event.code)) this.jump(player);
      else if (["ArrowUp", "KeyW"].includes(event.code)) this.changeLane(player, -1);
      else if (["ArrowDown", "KeyS"].includes(event.code)) this.changeLane(player, 1);
    };

    window.addEventListener("keydown", this.handleDown);
    root.querySelector("[data-br-start]").addEventListener("click", () => this.start());
    root.querySelector("[data-br-retry]").addEventListener("click", () => this.start());
    root.querySelector("[data-br-exit]").addEventListener("click", () => this.exit());
    this.canvasViewport = observeCanvasViewport(
      root.querySelector(".race-stage"),
      this.canvas,
      (width) => this.resizeCanvas(width)
    );
    this.setLocale("es");
    this.reset();
  }

  get startX() {
    return laneX(START_RATIO);
  }

  get finishX() {
    return laneX(FINISH_RATIO);
  }

  get playerRacer() {
    return this.racers.find((racer) => racer.isPlayer) ?? null;
  }

  createEnvironmentRenderer(seed) {
    return new MinigameEnvironmentRenderer({
      scene: MINIGAME_ENVIRONMENT_SCENES.persecution,
      groundY: 438,
      seed,
      sectionLength: 6200,
      sectionCount: 8
    });
  }

  populateDinosaurSelect() {
    const options = BREAKING_RACE_ROSTER.map((dinosaur) => {
      const option = document.createElement("option");
      option.value = dinosaur.id;
      option.textContent = dinosaur.name + " — " + dinosaur.species;
      return option;
    });
    this.dinosaurSelect.replaceChildren(...options);
    this.dinosaurSelect.value = this.selectedDinosaurId;
  }

  resizeCanvas(width) {
    const nextWidth = Math.max(BASE_WIDTH, Math.ceil(width));
    if (nextWidth !== WIDTH) {
      const ratio = nextWidth / WIDTH;
      for (const collection of [this.racers, this.checkpoints, this.hazards, this.pickups]) {
        for (const item of collection ?? []) {
          if (Number.isFinite(item.x)) item.x *= ratio;
        }
      }
      WIDTH = nextWidth;
    }
    this.ctx.imageSmoothingEnabled = false;
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
    this.root.querySelector("[data-br-title]").textContent = this.text("CARRERA", "RACE");
    this.root.querySelector("[data-br-subtitle]").textContent = this.text(
      "Elegí tu dinosaurio, esquivá el terreno y cruzá la meta antes que tus rivales.",
      "Choose your dinosaur, dodge the terrain and reach the finish before your rivals."
    );
    this.dinosaurSelectLabel.textContent = this.text("DINOSAURIO A CONTROLAR", "DINOSAUR TO CONTROL");
    this.root.querySelector("[data-br-instructions]").textContent = this.text(
      "ESPACIO: SALTAR · W / S O ↑ / ↓: CAMBIAR CARRIL · P: PAUSA · ESC: SALIR · HUEVOS Y CARNE: IMPULSO",
      "SPACE: JUMP · W / S OR ↑ / ↓: CHANGE LANE · P: PAUSE · ESC: EXIT · EGGS AND MEAT: BOOST"
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
    this.dinosaurSelect.value = this.selectedDinosaurId;
    this.root.querySelector("[data-br-start]").focus();
    this.setStatus("CARRERA // LISTA", "RACE // READY");
    this.render();
  }

  reset() {
    this.stop();
    this.elapsed = 0;
    this.paused = false;
    this.racers = [];
    this.courseSeed = Math.floor(Math.random() * 0xffffffff) || 1;
    const course = generateRaceCourse(this.courseSeed);
    this.environmentRenderer = this.createEnvironmentRenderer(this.courseSeed);
    const trackLength = this.finishX - this.startX;

    this.checkpoints = CHECKPOINT_RATIOS.map((progress, index) => ({
      id: "checkpoint-" + index,
      x: laneX(progress),
      hit: false
    }));
    this.hazards = course.hazards.map((hazard) => {
      const x = this.startX + trackLength * hazard.progress;
      const entity = createHazard(hazard.kind, hazard.lane, hazard.progress, x);
      entity.hitRacers = new Set();
      return entity;
    });
    this.pickups = course.pickups.map((pickup) => {
      const x = this.startX + trackLength * pickup.progress;
      const item = pickup.kind === "egg"
        ? createEgg(pickup.lane, x)
        : {
            id: pickup.id,
            kind: "meat",
            lane: pickup.lane,
            progress: pickup.progress,
            x,
            y: getLaneBaseline(pickup.lane) - 29 * getLaneScale(pickup.lane),
            w: 32 * getLaneScale(pickup.lane),
            h: 29 * getLaneScale(pickup.lane),
            taken: false
          };
      item.id = pickup.id;
      item.progress = pickup.progress;
      item.taken = false;
      return item;
    });
    this.root.querySelector("[data-br-result]").hidden = true;
  }

  stop() {
    this.running = false;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  start() {
    this.canvasViewport();
    this.reset();
    const lineup = createRaceLineup(this.selectedDinosaurId);
    const laneOrder = [0, 1, 2, 3];
    for (let index = laneOrder.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [laneOrder[index], laneOrder[swapIndex]] = [laneOrder[swapIndex], laneOrder[index]];
    }
    this.racers = lineup.map((dinosaur, index) => ({
      d: dinosaur,
      lane: laneOrder[index],
      x: this.startX,
      score: 0,
      cp: 0,
      wait: 0,
      boost: 0,
      slow: 0,
      pitfallTimer: 0,
      vy: 0,
      jumpY: 0,
      jumping: false,
      finished: false,
      finishTime: 0,
      flash: 0,
      laneChangeCooldown: 0,
      hitHazards: new Set(),
      isPlayer: dinosaur.id === this.selectedDinosaurId
    }));

    for (const dinosaur of lineup) {
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

  changeLane(racer, direction) {
    if (!this.running || !racer?.isPlayer || racer.laneChangeCooldown > 0 || racer.pitfallTimer > 0) return false;
    const nextLane = normalizeLane(racer.lane + Math.sign(direction));
    if (nextLane === racer.lane) return false;
    racer.lane = nextLane;
    racer.laneChangeCooldown = 0.18;
    return true;
  }

  jump(racer) {
    if (!this.running || !racer || racer.jumping || racer.wait > 0 || racer.finished || racer.pitfallTimer > 0) return;
    const scale = getLaneScale(racer.lane);
    racer.jumping = true;
    racer.vy = -245 * scale;
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

      const scale = getLaneScale(racer.lane);
      racer.flash = Math.max(0, racer.flash - delta);
      racer.wait = Math.max(0, racer.wait - delta);
      racer.slow = Math.max(0, racer.slow - delta);
      racer.boost = Math.max(0, racer.boost - delta);
      racer.pitfallTimer = Math.max(0, racer.pitfallTimer - delta);
      racer.laneChangeCooldown = Math.max(0, racer.laneChangeCooldown - delta);

      if (racer.jumping) {
        racer.vy += 600 * scale * delta;
        racer.jumpY += racer.vy * delta;
        if (racer.jumpY >= 0) {
          racer.jumpY = 0;
          racer.vy = 0;
          racer.jumping = false;
        }
      }
      if (racer.wait > 0 || racer.pitfallTimer > 0) continue;

      if (!racer.isPlayer && !racer.jumping) {
        const obstacleAhead = this.hazards.find((hazard) =>
          hazard.lane === racer.lane &&
          !racer.hitHazards.has(hazard.id) &&
          hazard.kind !== "mud" &&
          hazard.x - racer.x > 0 &&
          hazard.x - racer.x < 62 * scale
        );
        if (obstacleAhead) this.jump(racer);
      }

      this.resolveHazards(racer);
      this.resolvePickups(racer);

      const pace = racer.d.speed +
        (racer.boost > 0 ? 42 : 0) -
        (racer.slow > 0 ? 39 : 0) +
        (racer.jumping ? 4 : 0);
      racer.x = Math.min(this.finishX, racer.x + pace * delta);

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
      }

      if (racer.x >= this.finishX) {
        racer.finished = true;
        racer.finishTime = this.elapsed;
        racer.score += Math.max(0, Math.round((LANE_COUNT - this.racers.filter((item) => item.finished).length) * 25));
      }
    }

    if (this.racers.length && this.racers.every((racer) => racer.finished)) this.finish();
  }

  resolveHazards(racer) {
    const layout = getRaceLaneLayout(racer.lane);
    const racerRadius = 19 * layout.scale;
    for (const hazard of this.hazards) {
      if (hazard.lane !== racer.lane || racer.hitHazards.has(hazard.id)) continue;
      const center = hazard.x + hazard.w / 2;
      if (Math.abs(center - racer.x) > hazard.w * 0.5 + racerRadius) continue;

      // A jump clears solid terrain features, while landing in mud still slows
      // the racer only when the dinosaur actually crosses the puddle.
      racer.hitHazards.add(hazard.id);
      if (racer.jumping) continue;

      if (hazard.kind === "pit") {
        racer.pitfallTimer = 0.82;
        racer.slow = Math.max(racer.slow, 2.2);
        racer.x = Math.max(this.startX, racer.x - 12);
        racer.flash = 0.82;
        racer.score = Math.max(0, racer.score - 15);
      } else {
        const penalties = { rock: 1.25, spikes: 1.55, bush: 0.85, mud: 1.4 };
        racer.slow = Math.max(racer.slow, penalties[hazard.kind] ?? 1);
        racer.flash = 0.55;
        racer.score = Math.max(0, racer.score - (hazard.kind === "spikes" ? 12 : 5));
      }
    }
  }

  resolvePickups(racer) {
    for (const pickup of this.pickups) {
      if (pickup.taken || pickup.lane !== racer.lane) continue;
      if (Math.abs(pickup.x + pickup.w / 2 - racer.x) > 25 * getLaneScale(racer.lane)) continue;
      pickup.taken = true;
      racer.boost = Math.max(racer.boost, 2.4);
      racer.score += pickup.kind === "egg" ? 20 : 30;
    }
  }

  finish() {
    this.stop();
    this.racers.sort((a, b) => b.score - a.score || a.finishTime - b.finishTime);
    const winner = this.racers[0];
    const playerPosition = this.racers.findIndex((racer) => racer.isPlayer) + 1;
    const player = this.playerRacer;
    const playerResult = player
      ? this.text(" · TU PUESTO: ", " · YOUR PLACE: ") + playerPosition + "/" + this.racers.length
      : "";
    this.root.querySelector("[data-br-result]").textContent =
      this.text("GANADOR: ", "WINNER: ") + winner.d.name + " · " + winner.score + " PTS" + playerResult;
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
      context.moveTo(18, boundary);
      context.lineTo(WIDTH - 18, boundary);
      context.stroke();
    }
    context.setLineDash([]);

    for (let lane = 0; lane < LANE_COUNT; lane += 1) {
      const layout = getRaceLaneLayout(lane);
      context.fillStyle = "rgba(28, 48, 31, 0.58)";
      context.beginPath();
      context.ellipse(40, layout.baseline - 1, 12 * layout.scale, 7 * layout.scale, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#f3f0d9";
      context.font = "9px monospace";
      context.textAlign = "center";
      context.fillText("0" + (lane + 1), 40, layout.baseline + 2);
    }
    context.restore();
  }

  drawStartAndFinish() {
    const context = this.ctx;
    for (let lane = 0; lane < LANE_COUNT; lane += 1) {
      const layout = getRaceLaneLayout(lane);
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
      const layout = getRaceLaneLayout(lane);
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

  drawEgg(egg) {
    const context = this.ctx;
    const { x, y, w, h } = egg;
    const centerX = x + w / 2;
    const pathEgg = () => {
      context.beginPath();
      context.moveTo(centerX, y + h * 0.025);
      context.bezierCurveTo(x + w * 0.29, y + h * 0.025, x + w * 0.07, y + h * 0.28, x + w * 0.085, y + h * 0.56);
      context.bezierCurveTo(x + w * 0.10, y + h * 0.82, x + w * 0.30, y + h * 0.985, centerX, y + h * 0.985);
      context.bezierCurveTo(x + w * 0.70, y + h * 0.985, x + w * 0.90, y + h * 0.82, x + w * 0.915, y + h * 0.56);
      context.bezierCurveTo(x + w * 0.93, y + h * 0.28, x + w * 0.71, y + h * 0.025, centerX, y + h * 0.025);
      context.closePath();
    };
    context.save();
    context.fillStyle = "#eee4cd";
    context.strokeStyle = "#8f7959";
    context.lineWidth = Math.max(1, w * 0.055);
    pathEgg();
    context.fill();
    context.save();
    pathEgg();
    context.clip();
    for (const spot of egg.spots ?? []) {
      const radius = Math.max(0.65, w * spot.radius);
      context.fillStyle = spot.color;
      context.globalAlpha = 0.78;
      context.beginPath();
      context.ellipse(
        x + w * spot.x,
        y + h * spot.y,
        radius,
        Math.max(0.65, radius * spot.aspect * (h / w) * 0.72),
        spot.rotation,
        0,
        Math.PI * 2
      );
      context.fill();
    }
    context.globalAlpha = 0.5;
    context.fillStyle = "#fffaf0";
    context.beginPath();
    context.ellipse(x + w * 0.34, y + h * 0.29, w * 0.075, h * 0.14, -0.36, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.globalAlpha = 1;
    context.strokeStyle = "#9a8564";
    context.lineWidth = Math.max(1, w * 0.045);
    pathEgg();
    context.stroke();
    context.restore();
  }

  drawRock(rock) {
    const context = this.ctx;
    context.save();
    context.fillStyle = "#171a19";
    context.strokeStyle = "#555b55";
    context.lineWidth = 2 * rock.scale;
    context.beginPath();
    context.moveTo(rock.x + 3 * rock.scale, rock.y + rock.h);
    context.lineTo(rock.x + 1 * rock.scale, rock.y + 11 * rock.scale);
    context.lineTo(rock.x + 11 * rock.scale, rock.y + 2 * rock.scale);
    context.lineTo(rock.x + 24 * rock.scale, rock.y + 4 * rock.scale);
    context.lineTo(rock.x + rock.w - 5 * rock.scale, rock.y + 15 * rock.scale);
    context.lineTo(rock.x + rock.w - 5 * rock.scale, rock.y + rock.h);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }

  drawSpikes(spikes) {
    const context = this.ctx;
    const floor = getLaneBaseline(spikes.lane);
    const count = 5;
    const step = spikes.w / count;
    context.save();
    context.fillStyle = "rgba(34, 39, 28, 0.24)";
    context.beginPath();
    context.ellipse(spikes.x + spikes.w / 2, floor - 1, spikes.w * 0.53, 4 * spikes.scale, 0, 0, Math.PI * 2);
    context.fill();
    for (let index = 0; index < count; index += 1) {
      const left = spikes.x + index * step;
      context.fillStyle = index % 2 ? "#777f70" : "#aab09a";
      context.strokeStyle = "#3d493e";
      context.lineWidth = Math.max(1, spikes.scale);
      context.beginPath();
      context.moveTo(left, floor);
      context.lineTo(left + step * 0.5, floor - spikes.h);
      context.lineTo(left + step, floor);
      context.closePath();
      context.fill();
      context.stroke();
    }
    context.restore();
  }

  drawPit(pit) {
    const context = this.ctx;
    const floor = getLaneBaseline(pit.lane);
    context.save();
    context.fillStyle = "rgba(28, 30, 22, 0.34)";
    context.beginPath();
    context.ellipse(pit.x + pit.w / 2, floor - 3, pit.w / 2, pit.h / 2, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#30291f";
    context.beginPath();
    context.ellipse(pit.x + pit.w / 2, floor - 5, pit.w * 0.42, pit.h * 0.38, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#b0a276";
    context.lineWidth = Math.max(1, 2 * getLaneScale(pit.lane));
    context.beginPath();
    context.ellipse(pit.x + pit.w / 2, floor - 7, pit.w * 0.48, pit.h * 0.42, 0, Math.PI, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  drawMud(mud) {
    const context = this.ctx;
    const floor = getLaneBaseline(mud.lane);
    context.save();
    context.fillStyle = "#59452e";
    context.beginPath();
    context.ellipse(mud.x + mud.w / 2, floor - 4, mud.w / 2, mud.h / 2, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(164, 129, 82, 0.78)";
    for (let index = 0; index < 3; index += 1) {
      context.beginPath();
      context.ellipse(mud.x + mud.w * (0.22 + index * 0.27), floor - 7, mud.w * 0.11, mud.h * 0.17, -0.2, 0, Math.PI * 2);
      context.fill();
    }
    for (let index = 0; index < 5; index += 1) {
      const travel = (this.elapsed * 0.32 + index * 0.21) % 1;
      const phase = index * 1.63 + mud.x * 0.012;
      const pulse = (Math.sin(this.elapsed * 5.8 + phase) + 1) / 2;
      context.globalAlpha = 0.035 + 0.62 * pulse ** 3;
      context.fillStyle = index % 2 === 0 ? "#e8d5a5" : "#c8d5a0";
      context.beginPath();
      context.ellipse(
        mud.x + mud.w * (0.09 + travel * 0.82),
        floor - 8 - Math.sin(this.elapsed * 3.1 + phase) * 1.6,
        mud.w * 0.027,
        Math.max(1, mud.h * 0.12),
        -0.28,
        0,
        Math.PI * 2
      );
      context.fill();
    }
    context.globalAlpha = 0.82;
    context.strokeStyle = "rgba(211, 180, 126, 0.6)";
    context.lineWidth = 1;
    context.beginPath();
    context.ellipse(mud.x + mud.w * 0.5, floor - 5, mud.w * 0.39, mud.h * 0.3, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  drawBush(bush) {
    const context = this.ctx;
    const floor = getLaneBaseline(bush.lane);
    const x = bush.x;
    const y = floor - bush.h;
    context.save();
    context.fillStyle = "#456b35";
    context.beginPath();
    context.ellipse(x + bush.w * 0.5, y + bush.h * 0.72, bush.w * 0.46, bush.h * 0.31, 0, 0, Math.PI * 2);
    context.fill();
    const leaves = [
      [0.16, 0.55, 0.25], [0.34, 0.36, 0.29], [0.56, 0.31, 0.31],
      [0.79, 0.52, 0.25], [0.48, 0.63, 0.32]
    ];
    leaves.forEach(([leafX, leafY, radius], index) => {
      context.fillStyle = ["#4f843c", "#62984a", "#76a953", "#568c41", "#6b9d4d"][index];
      context.beginPath();
      context.arc(x + bush.w * leafX, y + bush.h * leafY, bush.h * radius, 0, Math.PI * 2);
      context.fill();
    });
    context.strokeStyle = "rgba(183, 211, 127, 0.6)";
    context.lineWidth = Math.max(1, getLaneScale(bush.lane));
    context.beginPath();
    context.moveTo(x + bush.w * 0.27, y + bush.h * 0.56);
    context.lineTo(x + bush.w * 0.42, y + bush.h * 0.22);
    context.moveTo(x + bush.w * 0.62, y + bush.h * 0.61);
    context.lineTo(x + bush.w * 0.78, y + bush.h * 0.34);
    context.stroke();
    context.restore();
  }

  drawPickup(pickup) {
    if (pickup.kind === "egg") {
      this.drawEgg(pickup);
      return;
    }
    const context = this.ctx;
    context.save();
    context.font = Math.round(24 * getLaneScale(pickup.lane)) + "px sans-serif";
    context.textAlign = "center";
    context.fillText("🥩", pickup.x + pickup.w / 2, getLaneBaseline(pickup.lane) - 5 * getLaneScale(pickup.lane));
    context.restore();
  }

  drawDino(racer) {
    const context = this.ctx;
    const layout = getRaceLaneLayout(racer.lane);
    const width = 64 * layout.scale;
    const height = 48 * layout.scale;
    const baseline = layout.baseline;
    const sink = racer.pitfallTimer > 0 ? (1 - racer.pitfallTimer / 0.82) * 23 * layout.scale : 0;
    const y = baseline - height + (racer.jumpY || 0) + sink;
    const image = this.images.get(racer.jumping ? racer.d.jump : racer.d.run);

    context.fillStyle = "rgba(35, 43, 28, 0.24)";
    context.beginPath();
    context.ellipse(racer.x, baseline - 1, width * 0.38, 4 * layout.scale, 0, 0, Math.PI * 2);
    context.fill();

    if (racer.isPlayer) {
      context.strokeStyle = "#d8f36a";
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(racer.x, baseline - 2, width * 0.54, 6 * layout.scale, 0, 0, Math.PI * 2);
      context.stroke();
    }

    if (image?.complete && image.naturalWidth) {
      context.save();
      context.globalAlpha = racer.flash > 0 && Math.floor(this.elapsed * 14) % 2 === 0 ? 0.25 : 1;
      drawOutlinedImage(context, image, racer.x - width / 2, y, width, height);
      context.restore();
    } else {
      context.fillStyle = ["#526b4b", "#b38b61", "#786b54", "#8d715b"][racer.lane];
      context.fillRect(racer.x - width * 0.38, baseline - 23 * layout.scale + sink, width * 0.76, 20 * layout.scale);
      context.fillRect(racer.x + width * 0.08, baseline - 31 * layout.scale + sink, 16 * layout.scale, 13 * layout.scale);
    }

    const label = racer.d.name + " · " + racer.score + (racer.isPlayer ? " · P1" : "");
    context.font = Math.max(8, Math.round(9 * layout.scale)) + "px monospace";
    context.textAlign = "center";
    const labelWidth = context.measureText(label).width + 10;
    const labelY = y - 5;
    context.fillStyle = racer.isPlayer ? "rgba(31, 48, 28, 0.92)" : "rgba(22, 34, 27, 0.78)";
    context.fillRect(racer.x - labelWidth / 2, labelY - 11, labelWidth, 14);
    context.fillStyle = racer.isPlayer ? "#e8ff8a" : "#f3f1df";
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

    for (const checkpoint of this.checkpoints) this.drawCheckpoint(checkpoint);
    for (const hazard of this.hazards) {
      if (hazard.kind === "pit") this.drawPit(hazard);
      else if (hazard.kind === "mud") this.drawMud(hazard);
    }
    for (const hazard of this.hazards) {
      if (hazard.kind === "rock") this.drawRock(hazard);
      else if (hazard.kind === "spikes") this.drawSpikes(hazard);
    }
    for (const pickup of this.pickups) {
      if (!pickup.taken) this.drawPickup(pickup);
    }

    for (const racer of [...this.racers].sort((a, b) => a.lane - b.lane)) this.drawDino(racer);
    for (const hazard of this.hazards) {
      if (hazard.kind === "bush") this.drawBush(hazard);
    }

    context.fillStyle = "#30452a";
    context.font = "12px monospace";
    context.textAlign = "left";
    context.fillText(this.text("TIEMPO ", "TIME ") + this.elapsed.toFixed(1) + "s", 20, 32);
    context.textAlign = "center";
    context.fillText(this.text("CHECKPOINTS", "CHECKPOINTS"), WIDTH / 2, 32);
    const player = this.playerRacer;
    if (player) {
      context.textAlign = "right";
      context.fillText(
        this.text("JUGADOR ", "PLAYER ") + player.d.name + " · " +
          this.text("CARRIL ", "LANE ") + (player.lane + 1) + "/4",
        WIDTH - 20,
        32
      );
    }
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
