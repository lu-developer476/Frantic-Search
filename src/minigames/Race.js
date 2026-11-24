import {
  createEgg, getLaneBaseline, getLaneScale, normalizeLane, LANE_COUNT,
  DASH_DURATION, DASH_COOLDOWN, DASH_SPEED_MULTIPLIER, DASH_DUST_DURATION
} from "./Persecution.js";
import { observeCanvasViewport } from "../rendering/CanvasUtils.js";
import { MinigameEnvironmentRenderer, MINIGAME_ENVIRONMENT_SCENES } from "./MinigameEnvironment.js";

import { drawMinigameHudBar, drawMinigameHudText } from "./MinigameHud.js";
let WIDTH = 960;
const HEIGHT = 540;
const BASE_WIDTH = 960;
const CHECKPOINT_PROGRESS = Object.freeze([0.2, 0.4, 0.6, 0.8]);
const CHECKPOINT_RATIOS = CHECKPOINT_PROGRESS;
const COURSE_HAZARD_KINDS = Object.freeze(["rock", "spikes", "pit", "bush", "mud"]);
const COURSE_PICKUP_KINDS = Object.freeze([
  "egg", "egg", "egg", "egg", "egg", "egg", "egg", "egg",
  "meat", "meat", "meat", "meat"
]);
const CHECKPOINT_CLEARANCE = 0.035;
const LANE_OBJECT_CLEARANCE = 0.075;

export const RACE_DISTANCE_METERS = 10_000;
export const RACE_PIXELS_PER_METER = 0.9;
export const RACE_TRACK_LENGTH_PIXELS = RACE_DISTANCE_METERS * RACE_PIXELS_PER_METER;
export const RAM_SLOW_DURATION = 1.35;
export const RAM_SLOW_PENALTY = 39;
export const RACE_BASE_SPEED = 88;
export const RACE_SPEED_VARIANCE = 0.2;
export const RACE_PLAYER_HORIZONTAL_CONTROL_SPEED = 170;
export const RACE_CAMERA_LEFT_RATIO = 0.18;
export const RACE_CAMERA_RIGHT_RATIO = 0.82;

export function getRacePace(rosterSpeed) {
  const speed = Number.isFinite(Number(rosterSpeed)) ? Number(rosterSpeed) : RACE_BASE_SPEED;
  return RACE_BASE_SPEED + (speed - RACE_BASE_SPEED) * RACE_SPEED_VARIANCE;
}
export const RACE_START_SCREEN_RATIO = RACE_CAMERA_LEFT_RATIO;
export const RACE_OPENING_CINEMATIC_DURATION = 10;

export function getRaceStartScreenX(viewportWidth = BASE_WIDTH) {
  const width = Number.isFinite(Number(viewportWidth)) ? Math.max(BASE_WIDTH, Number(viewportWidth)) : BASE_WIDTH;
  return width * RACE_START_SCREEN_RATIO;
}

export function getRaceDistanceMeters(worldX) {
  return clamp((Number(worldX) || 0) / RACE_PIXELS_PER_METER, 0, RACE_DISTANCE_METERS);
}

export function hasRacerBeenEaten(screenX, spriteWidth = 0) {
  return Number(screenX) + Math.max(0, Number(spriteWidth) || 0) / 2 < 0;
}

export function areAllRaceParticipantsEaten(racers = []) {
  return racers.length === LANE_COUNT && racers.every((racer) => racer.eaten && !racer.finished);
}

export const DEFAULT_RACE_DINOSAUR_ID = "gala";

export const BREAKING_RACE_ROSTER = Object.freeze([
  { id: "gala", name: "Gala", species: "Gala", idle: "references/gala-idle.gif", walk: "references/gala-walk.gif", run: "references/gala-run.gif", jump: "references/gala-fly.gif", speed: 92 },
  { id: "brisa", name: "Brisa", species: "Velociraptor abyssomirabilis", idle: "references/juvenile-velociraptor-abyssomirabilis-idle.gif", walk: null, run: "references/juvenile-velociraptor-abyssomirabilis-run.gif", jump: "references/juvenile-velociraptor-abyssomirabilis-jump.gif", speed: 88 },
  { id: "venatosaurus-impavidus", name: "Venatosaurus impavidus", species: "Venatosaurus impavidus", idle: "references/venatosaurus-impavidus-idle.gif", walk: "references/venatosaurus-impavidus-walk.gif", run: "references/venatosaurus-impavidus-run.gif", jump: "references/venatosaurus-impavidus-jump.gif", speed: 86 },
  { id: "venatosaurus-saevidicus", name: "Venatosaurus saevidicus", species: "Venatosaurus saevidicus", idle: "references/venatosaurus-saevidicus-idle.gif", walk: "references/venatosaurus-saevidicus-walk.gif", run: "references/venatosaurus-saevidicus-run.gif", jump: "references/venatosaurus-saevidicus-jump.gif", speed: 84 },
  { id: "coral", name: "Coral", species: "Miniraptor", idle: "references/miniraptor-idle.gif", walk: null, run: "references/miniraptor-run.gif", jump: "references/miniraptor-jump.gif", speed: 94 },
  { id: "umbraraptor-silvis", name: "Umbraraptor silvis", species: "Umbraraptor silvis", idle: "references/umbraraptor-silvis-idle.gif", walk: null, run: null, jump: "references/umbraraptor-silvis-jump.gif", speed: 82 },
  { id: "xenoraptor-crypticus", name: "Xenoraptor crypticus", species: "Xenoraptor crypticus", idle: null, walk: null, run: "references/xenoraptor-crypticus-run.gif", jump: "references/xenoraptor-crypticus-jump.gif", speed: 90 },
  { id: "dr-raptor", name: "Dr. Raptor", species: "Dino Run / Dino Run DX", idle: "references/dr-raptor-walk.gif", walk: "references/dr-raptor-walk.gif", run: "references/dr-raptor-run.gif", jump: "references/dr-raptor-run.gif", speed: 96 },
  { id: "google-rex", name: "Chrome T-Rex", species: "Google Chrome Dinosaur", idle: "references/google-rex-idle.gif", walk: "references/google-rex-run.gif", run: "references/google-rex-run.gif", jump: "references/google-rex-duck.gif", speed: 91 },
  { id: "utahraptor", name: "Utahraptor", species: "Utahraptor", idle: "references/utahraptor-run.gif", walk: "references/utahraptor-run.gif", run: "references/utahraptor-run.gif", jump: "references/utahraptor-run.gif", speed: 89 }
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
  return CHECKPOINT_PROGRESS.every((checkpoint) =>
    Math.abs(progress - checkpoint) >= CHECKPOINT_CLEARANCE
  );
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

  for (let index = 0; index < 27; index += 1) {
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

  return { seed: Number(seed) >>> 0, distanceMeters: RACE_DISTANCE_METERS, hazards, pickups };
}

export function getRaceAnimationSource(dinosaur, action) {
  const sources = {
    idle: [dinosaur?.idle, dinosaur?.walk, dinosaur?.run],
    walk: [dinosaur?.walk, dinosaur?.idle, dinosaur?.run],
    run: [dinosaur?.run, dinosaur?.walk, dinosaur?.idle]
  };
  return (sources[action] ?? []).find((source) => typeof source === "string" && source.length > 0) ?? null;
}

export function getRaceHorizontalInput(keys = new Set()) {
  const forward = keys.has("ArrowRight") || keys.has("KeyD");
  const backward = keys.has("ArrowLeft") || keys.has("KeyA");
  return forward === backward ? 0 : forward ? 1 : -1;
}

export function getRaceMovementSpeed(racer, basePace, elapsed = 0, horizontalInput = 0) {
  if (racer?.isPlayer) {
    return basePace + clamp(horizontalInput, -1, 1) * RACE_PLAYER_HORIZONTAL_CONTROL_SPEED;
  }
  const aiPaceFactor = Number.isFinite(racer?.aiPaceFactor) ? racer.aiPaceFactor : 1;
  const aiPaceFrequency = Number.isFinite(racer?.aiPaceFrequency) ? racer.aiPaceFrequency : 0.45;
  const aiPacePhase = Number.isFinite(racer?.aiPacePhase) ? racer.aiPacePhase : 0;
  const paceVariation = 1 + Math.sin(elapsed * aiPaceFrequency + aiPacePhase) * 0.035;
  return basePace * aiPaceFactor * paceVariation;
}

export function getRaceCameraX(
  currentCameraX,
  playerX,
  viewportWidth,
  trackStartX = 0,
  trackFinishX = RACE_TRACK_LENGTH_PIXELS
) {
  const leftEdge = viewportWidth * RACE_CAMERA_LEFT_RATIO;
  const rightEdge = viewportWidth * RACE_CAMERA_RIGHT_RATIO;
  const screenX = playerX - currentCameraX;
  let nextCameraX = currentCameraX;
  if (screenX < leftEdge) nextCameraX = playerX - leftEdge;
  else if (screenX > rightEdge) nextCameraX = playerX - rightEdge;

  const minCameraX = trackStartX - viewportWidth / 2;
  const maxCameraX = trackFinishX - viewportWidth / 2;
  return clamp(nextCameraX, minCameraX, maxCameraX);
}

export function createRaceLineup(selectedDinosaurId, random = Math.random) {
  const selected = BREAKING_RACE_ROSTER.find((dinosaur) => dinosaur.id === selectedDinosaurId)
    ?? BREAKING_RACE_ROSTER.find((dinosaur) => dinosaur.id === DEFAULT_RACE_DINOSAUR_ID)
    ?? BREAKING_RACE_ROSTER[0];
  const opponents = BREAKING_RACE_ROSTER.filter((dinosaur) => dinosaur.id !== selected.id);

  for (let index = opponents.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(clamp(random(), 0, 0.999999) * (index + 1));
    [opponents[index], opponents[swapIndex]] = [opponents[swapIndex], opponents[index]];
  }

  return [selected, ...opponents.slice(0, LANE_COUNT - 1)];
}

export function createRaceStartingGrid(lineup, startX = 0) {
  const sharedStartX = Number.isFinite(Number(startX)) ? Number(startX) : 0;
  return lineup.slice(0, LANE_COUNT).map((dinosaur, lane) => ({ dinosaur, lane, x: sharedStartX }));
}

export function getRaceHazardRenderKind(kind) {
  return kind === "spikes" ? null : kind;
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
    this.openingFrame = null;
    this.openingCinematic = null;
    this.confirmationDialog = root.querySelector("[data-br-confirmation]");
    this.confirmationImage = root.querySelector("[data-br-confirm-image]");
    this.confirmationSpecies = root.querySelector("[data-br-confirm-species]");
    this.openingOverlay = root.querySelector("[data-br-opening]");
    this.openingPhaseLabel = root.querySelector("[data-br-opening-phase]");
    this.openingStatusLabel = root.querySelector("[data-br-opening-status]");
    this.openingProgress = root.querySelector("[data-br-opening-progress]");
    this.horizontalKeys = new Set();
    this.running = false;
    this.paused = false;
    this.last = 0;
    this.elapsed = 0;
    this.racers = [];
    this.checkpoints = [];
    this.hazards = [];
    this.pickups = [];
    this.ramDustClouds = [];
    this.eatEffects = [];
    this.random = Math.random;
    this.selectedDinosaurId = DEFAULT_RACE_DINOSAUR_ID;
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
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyS", "KeyA", "KeyD", "KeyX"].includes(event.code)) event.preventDefault();

      if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(event.code)) {
        if (this.running && !this.paused) this.horizontalKeys.add(event.code);
        return;
      }

      if (event.code === "Escape" && !event.repeat) {
        if (!this.confirmationDialog.hidden) {
          this.closeSelectionConfirmation();
          return;
        }
        if (this.openingCinematic) return;
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
      if (event.code === "Space") this.jump(player);
      else if (event.code === "ArrowUp" || event.code === "KeyW") this.changeLane(player, -1);
      else if (event.code === "ArrowDown" || event.code === "KeyS") this.changeLane(player, 1);
      else if (event.code === "KeyX") this.activateRam(player);
    };

    this.handleUp = (event) => this.horizontalKeys.delete(event.code);
    this.handleBlur = () => this.horizontalKeys.clear();
    window.addEventListener("keydown", this.handleDown);
    window.addEventListener("keyup", this.handleUp);
    window.addEventListener("blur", this.handleBlur);
    root.querySelector("[data-br-start]").addEventListener("click", () => this.openSelectionConfirmation());
    root.querySelector("[data-br-retry]").addEventListener("click", () => this.beginOpeningCinematic());
    root.querySelector("[data-br-exit]").addEventListener("click", () => this.exit());
    root.querySelector("[data-br-confirm-cancel]").addEventListener("click", () => this.closeSelectionConfirmation());
    root.querySelector("[data-br-confirm-accept]").addEventListener("click", () => this.confirmSelection());
    this.confirmationDialog.addEventListener("click", (event) => {
      if (event.target === this.confirmationDialog) this.closeSelectionConfirmation();
    });
    this.canvasViewport = observeCanvasViewport(
      root.querySelector(".race-stage"),
      this.canvas,
      (width) => this.resizeCanvas(width)
    );
    this.setLocale("es");
    this.reset();
  }

  get startX() {
    return 0;
  }

  get finishX() {
    return RACE_TRACK_LENGTH_PIXELS;
  }

  get startScreenX() {
    return getRaceStartScreenX(WIDTH);
  }

  get playerRacer() {
    return this.racers.find((racer) => racer.isPlayer) ?? null;
  }

  createEnvironmentRenderer(seed) {
    return new MinigameEnvironmentRenderer({
      scene: MINIGAME_ENVIRONMENT_SCENES.race,
      groundY: 438,
      seed,
      sectionLength: 5000,
      sectionCount: 3
    });
  }

  populateDinosaurSelect() {
    const options = BREAKING_RACE_ROSTER.map((dinosaur) => {
      const option = document.createElement("option");
      option.value = dinosaur.id;
      option.textContent = dinosaur.species;
      return option;
    });
    this.dinosaurSelect.replaceChildren(...options);
    this.dinosaurSelect.value = this.selectedDinosaurId;
  }

  resizeCanvas(width) {
    WIDTH = Math.max(BASE_WIDTH, Math.ceil(width));
    this.cameraX = this.cameraX ?? -this.startScreenX;
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
      "Elegí tu dinosaurio, cambiá entre cuatro carriles, embestí a tus rivales y sobreviví a los 10.000 metros.",
      "Choose your dinosaur, shift between four lanes, ram your rivals and survive the 10,000 meters."
    );
    this.dinosaurSelectLabel.textContent = this.text("PERSONAJE", "CHARACTER");
    this.root.querySelector("[data-br-instructions]").textContent = this.text(
      "A / D O ← / →: AVANZAR / RETROCEDER · ESPACIO: SALTAR · W / S O ↑ / ↓: CAMBIAR CARRIL · X: EMBESTIR · P: PAUSA · ESC: SALIR · HUEVOS Y CARNE: IMPULSO",
      "A / D OR ← / →: MOVE FORWARD / BACKWARD · SPACE: JUMP · W / S OR ↑ / ↓: CHANGE LANE · X: RAM · P: PAUSE · ESC: EXIT · EGGS AND MEAT: BOOST"
    );
    this.root.querySelector("[data-br-start]").textContent = this.text("INICIAR", "START");
    this.root.querySelector("[data-br-retry]").textContent = this.text("OTRA CARRERA", "RACE AGAIN");
    this.root.querySelector("[data-br-exit]").textContent = this.text("SALIR", "EXIT");
    this.root.querySelector("[data-br-confirmation-title]").textContent = this.text("¿ESTE ES TU DINOSAURIO?", "IS THIS YOUR DINOSAUR?");
    this.root.querySelector("[data-br-confirmation-copy]").textContent = this.text(
      "Vas a controlar a este corredor durante toda la carrera.",
      "You will control this racer throughout the race."
    );
    this.root.querySelector("[data-br-confirm-cancel]").textContent = this.text("CAMBIAR ELECCIÓN", "CHANGE SELECTION");
    this.root.querySelector("[data-br-confirm-accept]").textContent = this.text("SÍ, ES MI ELECCIÓN", "YES, THIS IS MY PICK");
    this.updateOpeningOverlay(0);
    this.setStatus("CARRERA // LISTA", "RACE // READY");
    if (this.root.classList.contains("active")) this.render();
  }

  open() {
    this.root.classList.add("active");
    this.canvasViewport();
    this.root.setAttribute("aria-hidden", "false");
    this.root.classList.remove("playing", "cinematic");
    this.confirmationDialog.hidden = true;
    this.openingOverlay.hidden = true;
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
    this.openingCinematic = null;
    if (this.confirmationDialog) this.confirmationDialog.hidden = true;
    if (this.openingOverlay) this.openingOverlay.hidden = true;
    this.elapsed = 0;
    this.paused = false;
    this.racers = [];
    this.ramDustClouds = [];
    this.eatEffects = [];
    this.courseSeed = Math.floor(Math.random() * 0xffffffff) || 1;
    this.random = createSeededRandom(this.courseSeed ^ 0xa511e9b3);
    const course = generateRaceCourse(this.courseSeed);
    this.environmentRenderer = this.createEnvironmentRenderer(this.courseSeed);
    this.cameraX = -this.startScreenX;
    const trackLength = this.finishX - this.startX;

    this.checkpoints = CHECKPOINT_RATIOS.map((progress, index) => ({
      id: "checkpoint-" + index,
      x: this.startX + trackLength * progress,
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
        ? createEgg(pickup.lane, x, this.random)
        : {
            id: pickup.id,
            kind: "meat",
            lane: pickup.lane,
            progress: pickup.progress,
            x,
            y: getLaneBaseline(pickup.lane) - 29 * getLaneScale(pickup.lane),
            w: 32 * getLaneScale(pickup.lane),
            h: 29 * getLaneScale(pickup.lane)
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
    if (this.openingFrame !== null) cancelAnimationFrame(this.openingFrame);
    this.frame = null;
    this.openingFrame = null;
    this.horizontalKeys?.clear();
  }

  loadDinosaurImages(lineup) {
    const sources = new Set(lineup.flatMap((dinosaur) =>
      [dinosaur.idle, dinosaur.walk, dinosaur.run, dinosaur.jump].filter(Boolean)
    ));
    const pending = [];
    for (const source of sources) {
      let image = this.images.get(source);
      if (!image) {
        image = new Image();
        this.images.set(source, image);
        image.src = import.meta.env.BASE_URL + source;
      }
      if (image.complete) continue;
      pending.push(new Promise((resolve) => {
        const settle = () => resolve(image);
        image.addEventListener("load", settle, { once: true });
        image.addEventListener("error", settle, { once: true });
      }));
    }
    return Promise.all(pending);
  }

  openSelectionConfirmation() {
    if (this.running || this.openingCinematic) return;
    const selected = BREAKING_RACE_ROSTER.find((dinosaur) => dinosaur.id === this.selectedDinosaurId)
      ?? BREAKING_RACE_ROSTER[0];
    const previewSource = getRaceAnimationSource(selected, "idle") ?? selected.run;
    this.confirmationImage.src = import.meta.env.BASE_URL + previewSource;
    this.confirmationImage.alt = selected.species;
    this.confirmationSpecies.textContent = selected.species;
    this.confirmationDialog.hidden = false;
    this.root.querySelector("[data-br-confirm-accept]").focus();
  }

  closeSelectionConfirmation(restoreFocus = true) {
    this.confirmationDialog.hidden = true;
    if (restoreFocus) this.root.querySelector("[data-br-start]").focus();
  }

  confirmSelection() {
    if (this.confirmationDialog.hidden) return;
    this.closeSelectionConfirmation(false);
    this.beginOpeningCinematic();
  }

  updateOpeningOverlay(elapsed) {
    if (!this.openingOverlay) return;
    const phase = elapsed < 3 ? "idle" : elapsed < 6.5 ? "walk" : "run";
    const phaseCopy = {
      idle: this.text("LOS CORREDORES SE PREPARAN", "THE RACERS ARE READYING"),
      walk: this.text("A SUS PUESTOS", "TAKE YOUR POSITIONS"),
      run: this.text("LA SALIDA ES INMINENTE", "THE START IS IMMINENT")
    };
    this.openingPhaseLabel.textContent = phaseCopy[phase];
    this.openingStatusLabel.textContent = elapsed >= 7
      ? this.text("PREPARADOS · ", "GET READY · ") + Math.max(1, Math.ceil(RACE_OPENING_CINEMATIC_DURATION - elapsed))
      : this.text("PRESENTACIÓN DE CARRERA", "RACE INTRODUCTION");
    this.openingProgress.style.width = (Math.min(1, elapsed / RACE_OPENING_CINEMATIC_DURATION) * 100) + "%";
  }

  renderOpeningCinematic(elapsed, lineup) {
    const context = this.ctx;
    context.clearRect(0, 0, WIDTH, HEIGHT);
    this.elapsed = elapsed;
    this.drawBackground();
    this.drawLaneGuides();

    const phase = elapsed < 3 ? "idle" : elapsed < 6.5 ? "walk" : "run";
    context.save();
    context.translate(-this.cameraX, 0);
    this.drawStartAndFinish();

    for (let index = 0; index < lineup.length; index += 1) {
      const dinosaur = lineup[index];
      const lane = index;
      const layout = getRaceLaneLayout(lane);
      const source = getRaceAnimationSource(dinosaur, phase);
      const image = source ? this.images.get(source) : null;
      const width = 118 * layout.scale;
      const height = image?.naturalWidth && image?.naturalHeight
        ? width * image.naturalHeight / image.naturalWidth
        : 48 * layout.scale;
      const x = this.startX;
      const baseline = layout.baseline;
      context.fillStyle = "rgba(35, 43, 28, 0.24)";
      context.beginPath();
      context.ellipse(x, baseline - 1, width * 0.38, 4 * layout.scale, 0, 0, Math.PI * 2);
      context.fill();
      if (image?.complete && image.naturalWidth) {
        context.save();
        context.imageSmoothingEnabled = false;
        context.drawImage(image, x - width / 2, baseline - height, width, height);
        context.restore();
      } else {
        context.fillStyle = ["#526b4b", "#b38b61", "#786b54", "#8d715b"][lane];
        context.fillRect(x - width * 0.38, baseline - 23 * layout.scale, width * 0.76, 20 * layout.scale);
        context.fillRect(x + width * 0.08, baseline - 31 * layout.scale, 16 * layout.scale, 13 * layout.scale);
      }
      context.fillStyle = dinosaur.id === this.selectedDinosaurId ? "#e8ff8a" : "#f3f1df";
      context.font = "bold " + Math.max(9, Math.round(10 * layout.scale)) + "px monospace";
      context.textAlign = "center";
      context.fillText(dinosaur.id === this.selectedDinosaurId ? dinosaur.name + " · P1" : dinosaur.name, x, baseline - height - 8);
    }
    context.restore();

    if (elapsed >= 7) {
      context.save();
      context.fillStyle = "rgba(13, 23, 19, 0.72)";
      context.fillRect(WIDTH / 2 - 44, 82, 88, 74);
      context.strokeStyle = "#d8f36a";
      context.lineWidth = 2;
      context.strokeRect(WIDTH / 2 - 44, 82, 88, 74);
      context.fillStyle = "#f3f1df";
      context.font = "bold 48px monospace";
      context.textAlign = "center";
      context.fillText(String(Math.max(1, Math.ceil(RACE_OPENING_CINEMATIC_DURATION - elapsed))), WIDTH / 2, 137);
      context.restore();
    }
  }

  async beginOpeningCinematic() {
    if (this.running || this.openingCinematic) return;
    this.canvasViewport();
    this.reset();
    const lineup = createRaceLineup(this.selectedDinosaurId, this.random);
    const cinematic = { startedAt: null, lineup };
    this.openingCinematic = cinematic;
    this.root.classList.add("playing", "cinematic");
    this.root.querySelector("[data-br-start]").hidden = true;
    this.root.querySelector("[data-br-retry]").hidden = true;
    this.root.querySelector("[data-br-result]").hidden = true;
    this.openingOverlay.hidden = false;
    this.setStatus("CARRERA // PRESENTACIÓN", "RACE // INTRODUCTION");
    this.updateOpeningOverlay(0);
    await this.loadDinosaurImages(lineup);
    if (this.openingCinematic !== cinematic || !this.root.classList.contains("active")) return;
    cinematic.startedAt = performance.now();
    this.renderOpeningCinematic(0, lineup);
    this.openingFrame = requestAnimationFrame((time) => this.tickOpeningCinematic(time));
  }

  tickOpeningCinematic(now) {
    const cinematic = this.openingCinematic;
    if (!cinematic) return;
    const elapsed = Math.min(RACE_OPENING_CINEMATIC_DURATION, Math.max(0, (now - cinematic.startedAt) / 1000));
    this.renderOpeningCinematic(elapsed, cinematic.lineup);
    this.updateOpeningOverlay(elapsed);
    if (elapsed >= RACE_OPENING_CINEMATIC_DURATION) {
      this.openingCinematic = null;
      this.openingFrame = null;
      this.openingOverlay.hidden = true;
      this.root.classList.remove("cinematic");
      this.start(cinematic.lineup);
      return;
    }
    this.openingFrame = requestAnimationFrame((time) => this.tickOpeningCinematic(time));
  }

  start(preparedLineup = null) {
    this.openingOverlay.hidden = true;
    this.root.classList.remove("cinematic");
    this.canvasViewport();
    this.reset();
    const lineup = preparedLineup ?? createRaceLineup(this.selectedDinosaurId, this.random);
    const startingGrid = createRaceStartingGrid(lineup, this.startX);
    this.racers = startingGrid.map(({ dinosaur, lane, x }) => ({
      raceId: dinosaur.id,
      d: dinosaur,
      raceSpeed: getRacePace(dinosaur.speed),
      lane,
      x,
      aiPaceFactor: 0.84 + this.random() * 0.32,
      aiPaceFrequency: 0.3 + this.random() * 0.38,
      aiPacePhase: this.random() * Math.PI * 2,
      distanceMeters: 0,
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
      eaten: false,
      finishTime: 0,
      eliminationTime: 0,
      eliminationDistance: 0,
      flash: 0,
      laneChangeCooldown: 0,
      laneDecisionTimer: 0.55 + this.random() * 1.5,
      ramTimer: 0,
      ramCooldown: this.random() * 0.45,
      ramDecisionTimer: 0.7 + this.random() * 1.4,
      hitHazards: new Set(),
      isPlayer: dinosaur.id === this.selectedDinosaurId
    }));

    this.loadDinosaurImages(lineup);

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
      this.horizontalKeys.clear();
      this.setStatus("CARRERA // PAUSADA", "RACE // PAUSED");
      return;
    }

    this.last = performance.now();
    this.setStatus("CARRERA // EN CURSO", "RACE // RUNNING");
    this.frame = requestAnimationFrame((time) => this.tick(time));
  }

  changeLane(racer, direction) {
    if (
      !this.running || !racer || racer.finished || racer.eaten ||
      racer.laneChangeCooldown > 0 || racer.pitfallTimer > 0
    ) return false;
    const nextLane = normalizeLane(racer.lane + Math.sign(direction));
    if (nextLane === racer.lane) return false;
    racer.lane = nextLane;
    racer.laneChangeCooldown = 0.18;
    return true;
  }

  jump(racer) {
    if (!this.running || !racer || racer.jumping || racer.wait > 0 || racer.finished || racer.eaten || racer.pitfallTimer > 0) return;
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
    const horizontalInput = getRaceHorizontalInput(this.horizontalKeys);
    for (const effect of this.eatEffects) effect.life = Math.max(0, effect.life - delta);
    this.eatEffects = this.eatEffects.filter((effect) => effect.life > 0);

    for (const racer of this.racers) {
      if (racer.finished || racer.eaten) continue;

      const scale = getLaneScale(racer.lane);
      racer.flash = Math.max(0, racer.flash - delta);
      racer.wait = Math.max(0, racer.wait - delta);
      racer.slow = Math.max(0, racer.slow - delta);
      racer.boost = Math.max(0, racer.boost - delta);
      racer.pitfallTimer = Math.max(0, racer.pitfallTimer - delta);
      racer.laneChangeCooldown = Math.max(0, racer.laneChangeCooldown - delta);
      racer.ramTimer = Math.max(0, racer.ramTimer - delta);
      racer.ramCooldown = Math.max(0, racer.ramCooldown - delta);

      if (racer.jumping) {
        racer.vy += 600 * scale * delta;
        racer.jumpY += racer.vy * delta;
        if (racer.jumpY >= 0) {
          racer.jumpY = 0;
          racer.vy = 0;
          racer.jumping = false;
        }
      }

      if (!racer.isPlayer) this.updateRacerAI(racer, delta);
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

      const basePace = (
        racer.raceSpeed +
        (racer.boost > 0 ? 42 : 0) -
        (racer.slow > 0 ? RAM_SLOW_PENALTY : 0) +
        (racer.jumping ? 4 : 0)
      ) * (racer.ramTimer > 0 ? DASH_SPEED_MULTIPLIER : 1);
      const pace = getRaceMovementSpeed(
        racer,
        basePace,
        this.elapsed,
        racer.isPlayer ? horizontalInput : 0
      );
      racer.x = clamp(racer.x + pace * delta, this.startX, this.finishX);
      racer.distanceMeters = getRaceDistanceMeters(racer.x);

      const target = this.checkpoints[racer.cp];
      if (target && racer.x >= target.x - 5) {
        const error = Math.abs(racer.x - target.x);
        racer.score += error <= 12 ? 100 : Math.max(0, 50 - Math.round(error * 2));
        if (error <= 12) racer.flash = 0.35;
        racer.cp += 1;
        racer.wait = 0.12;
      }

      if (racer.x >= this.finishX) {
        racer.finished = true;
        racer.distanceMeters = RACE_DISTANCE_METERS;
        racer.finishTime = this.elapsed;
        racer.score += Math.max(0, Math.round(
          (LANE_COUNT - this.racers.filter((item) => item.finished).length) * 25
        ));
      }
    }

    this.updateCamera();
    this.updateRamDust(delta);
    this.updateEatenRacers();

    if (this.racers.length && this.racers.every((racer) => racer.finished || racer.eaten)) {
      this.finish();
    }
  }

  updateCamera() {
    const leader = this.racers.reduce((current, racer) => {
      if (racer.eaten || racer.finished) return current;
      return !current || racer.x > current.x ? racer : current;
    }, null);
    const player = this.playerRacer;
    const focus = player && !player.eaten ? player : leader;
    if (focus) {
      this.cameraX = getRaceCameraX(this.cameraX, focus.x, WIDTH, this.startX, this.finishX);
    }
  }

  updateRacerAI(racer, delta) {
    racer.laneDecisionTimer = Math.max(0, racer.laneDecisionTimer - delta);
    if (racer.laneDecisionTimer <= 0) {
      const hazardAhead = this.hazards.some((hazard) =>
        hazard.lane === racer.lane &&
        !racer.hitHazards.has(hazard.id) &&
        hazard.x - racer.x > -30 &&
        hazard.x - racer.x < 235
      );
      const options = [racer.lane - 1, racer.lane + 1]
        .filter((lane) => lane >= 0 && lane < LANE_COUNT);
      if (options.length && (hazardAhead || this.random() < 0.52)) {
        const laneRisk = (lane) => {
          const hazardRisk = this.hazards.reduce((risk, hazard) => {
            const distance = hazard.x - racer.x;
            if (hazard.lane !== lane || racer.hitHazards.has(hazard.id) || distance < -35 || distance > 300) {
              return risk;
            }
            return risk + (300 - Math.max(0, distance)) / 110;
          }, 0);
          const trafficRisk = this.racers.filter((other) =>
            other !== racer && !other.eaten && !other.finished && other.lane === lane &&
            Math.abs(other.x - racer.x) < 92
          ).length * 1.5;
          const pickupReward = this.pickups.some((pickup) =>
            !pickup.taken && pickup.lane === lane && Math.abs(pickup.x - racer.x) < 280
          ) ? 0.7 : 0;
          return hazardRisk + trafficRisk - pickupReward + this.random() * 0.25;
        };
        options.sort((a, b) => laneRisk(a) - laneRisk(b));
        this.changeLane(racer, options[0] - racer.lane);
      }
      racer.laneDecisionTimer = 0.8 + this.random() * 1.8;
    }

    racer.ramDecisionTimer = Math.max(0, racer.ramDecisionTimer - delta);
    if (racer.ramDecisionTimer <= 0) {
      const rivalBehind = this.racers.some((other) =>
        other !== racer && !other.eaten && !other.finished && other.lane === racer.lane &&
        racer.x - other.x > 34 && racer.x - other.x < 195
      );
      if (rivalBehind && racer.ramCooldown <= 0) this.activateRam(racer);
      racer.ramDecisionTimer = 0.9 + this.random() * 1.6;
    }
  }

  activateRam(racer) {
    if (
      !this.running || !racer || racer.finished || racer.eaten ||
      (racer.ramCooldown ?? 0) > 0 || (racer.ramTimer ?? 0) > 0
    ) return false;

    const scale = getLaneScale(racer.lane);
    const width = 205 * scale;
    const height = 64 * scale;
    racer.ramTimer = DASH_DURATION;
    racer.ramCooldown = DASH_COOLDOWN;
    this.ramDustClouds ??= [];
    this.ramDustClouds.push({
      sourceId: racer.raceId ?? racer.d?.id ?? "unknown",
      x: racer.x - width + 10 * scale,
      y: getLaneBaseline(racer.lane) - height + 5 * scale,
      w: width,
      h: height,
      lane: racer.lane,
      life: DASH_DUST_DURATION,
      max: DASH_DUST_DURATION,
      hitIds: new Set()
    });
    return true;
  }

  updateRamDust(delta) {
    const clouds = this.ramDustClouds ?? [];
    for (const cloud of clouds) {
      cloud.life = Math.max(0, cloud.life - delta);
      if (cloud.life <= 0) continue;
      for (const racer of this.racers) {
        if (
          racer.raceId === cloud.sourceId || racer.eaten || racer.finished ||
          racer.lane !== cloud.lane || cloud.hitIds.has(racer.raceId)
        ) continue;
        const centerX = racer.x;
        const centerY = getLaneBaseline(racer.lane) - 24 * getLaneScale(racer.lane);
        if (
          centerX < cloud.x || centerX > cloud.x + cloud.w ||
          centerY < cloud.y || centerY > cloud.y + cloud.h
        ) continue;
        cloud.hitIds.add(racer.raceId);
        racer.slow = Math.max(racer.slow, RAM_SLOW_DURATION);
        racer.flash = Math.max(racer.flash, 0.42);
        racer.score = Math.max(0, racer.score - 5);
      }
    }
    this.ramDustClouds = clouds.filter((cloud) => cloud.life > 0);
  }

  updateEatenRacers() {
    for (const racer of this.racers) {
      if (racer.finished || racer.eaten) continue;
      const spriteWidth = 64 * getLaneScale(racer.lane);
      const screenX = racer.x - this.cameraX;
      if (!hasRacerBeenEaten(screenX, spriteWidth)) continue;

      racer.eaten = true;
      racer.eliminationTime = this.elapsed;
      racer.eliminationDistance = getRaceDistanceMeters(racer.x);
      racer.distanceMeters = racer.eliminationDistance;
      this.eatEffects.push({
        lane: racer.lane,
        life: 0.78,
        max: 0.78,
        name: racer.d.name
      });
      if (racer.isPlayer) {
        this.setStatus("JUGADOR DEVORADO // OBSERVANDO", "PLAYER EATEN // SPECTATING");
      }
    }
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
    this.racers.sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      return (b.eliminationDistance ?? getRaceDistanceMeters(b.x)) -
        (a.eliminationDistance ?? getRaceDistanceMeters(a.x));
    });

    const player = this.playerRacer;
    const playerPosition = this.racers.findIndex((racer) => racer.isPlayer) + 1;
    const winner = this.racers.find((racer) => racer.finished);
    const playerResult = player
      ? this.text(" · TU PUESTO: ", " · YOUR PLACE: ") + playerPosition + "/" + this.racers.length
      : "";
    let result;
    if (areAllRaceParticipantsEaten(this.racers)) {
      result = this.text("TODOS FUERON DEVORADOS · PARTIDA PERDIDA", "ALL RACERS WERE EATEN · GAME OVER");
    } else if (player?.eaten) {
      result = this.text("TE DEVORARON · ELIMINADO", "YOU WERE EATEN · ELIMINATED") +
        (winner ? " · " + this.text("GANADOR: ", "WINNER: ") + winner.d.name : "") +
        playerResult;
    } else {
      result = this.text("GANADOR: ", "WINNER: ") +
        (winner?.d.name ?? this.text("SIN GANADOR", "NO WINNER")) +
        " · " + (winner?.score ?? 0) + " PTS" + playerResult;
    }

    this.root.querySelector("[data-br-result]").textContent = result;
    this.root.querySelector("[data-br-result]").hidden = false;
    this.root.querySelector("[data-br-retry]").hidden = false;
    this.root.classList.remove("playing");
    this.setStatus(
      areAllRaceParticipantsEaten(this.racers) ? "CARRERA // DERROTA" : "CARRERA // FINALIZADA",
      areAllRaceParticipantsEaten(this.racers) ? "RACE // DEFEAT" : "RACE // FINISHED"
    );
  }

  drawBackground() {
    const rendered = this.environmentRenderer.draw(this.ctx, {
      cameraX: this.cameraX,
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
    context.fillText("A", this.startX, 421);
    context.fillText(this.text("B · 10.000 M", "B · 10,000 M"), this.finishX, 421);
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
    if (racer.eaten) return;
    const context = this.ctx;
    const layout = getRaceLaneLayout(racer.lane);
    const width = 64 * layout.scale;
    const baseline = layout.baseline;
    const sink = racer.pitfallTimer > 0 ? (1 - racer.pitfallTimer / 0.82) * 23 * layout.scale : 0;
    const imageSource = racer.jumping
      ? (racer.d.jump ?? getRaceAnimationSource(racer.d, "run"))
      : getRaceAnimationSource(racer.d, "run");
    const image = imageSource ? this.images.get(imageSource) : null;
    const height = image?.naturalWidth && image?.naturalHeight
      ? width * image.naturalHeight / image.naturalWidth
      : 48 * layout.scale;
    const y = baseline - height + (racer.jumpY || 0) + sink;

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
      context.drawImage(image, racer.x - width / 2, y, width, height);
      context.restore();
    } else {
      // A visible dinosaur-shaped fallback prevents missing or delayed GIFs from becoming blank boxes.
      const color = ["#526b4b", "#b38b61", "#786b54", "#8d715b"][racer.lane];
      context.save();
      context.fillStyle = color;
      context.beginPath();
      context.ellipse(racer.x, baseline - 17 * layout.scale + sink, width * 0.36, 10 * layout.scale, 0, 0, Math.PI * 2);
      context.fill();
      context.fillRect(racer.x + width * 0.12, baseline - 27 * layout.scale + sink, width * 0.28, 12 * layout.scale);
      context.beginPath();
      context.moveTo(racer.x - width * 0.28, baseline - 16 * layout.scale + sink);
      context.lineTo(racer.x - width * 0.55, baseline - 10 * layout.scale + sink);
      context.lineTo(racer.x - width * 0.25, baseline - 11 * layout.scale + sink);
      context.closePath();
      context.fill();
      context.fillRect(racer.x - width * 0.22, baseline - 10 * layout.scale + sink, 5 * layout.scale, 10 * layout.scale);
      context.fillRect(racer.x + width * 0.13, baseline - 10 * layout.scale + sink, 5 * layout.scale, 10 * layout.scale);
      context.restore();
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

  drawRamDustCloud(cloud) {
    const context = this.ctx;
    const opacity = clamp(cloud.life / cloud.max, 0, 1);
    const centerY = cloud.y + cloud.h * 0.58;
    context.save();
    context.globalAlpha = 0.58 * opacity;
    context.fillStyle = "#d8c7a1";
    for (let index = 0; index < 8; index += 1) {
      const phase = index / 7;
      const x = cloud.x + cloud.w * (0.08 + phase * 0.84);
      const y = centerY + Math.sin(index * 1.7 + this.elapsed * 5) * cloud.h * 0.13;
      const radius = cloud.h * (0.16 + (index % 3) * 0.035);
      context.beginPath();
      context.ellipse(x, y, radius * 1.35, radius, 0, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 0.18 * opacity;
    context.fillStyle = "#6c6049";
    context.beginPath();
    context.ellipse(cloud.x + cloud.w * 0.52, centerY + 5, cloud.w * 0.48, cloud.h * 0.24, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  drawEatenEffects() {
    const context = this.ctx;
    for (const effect of this.eatEffects) {
      const progress = 1 - effect.life / effect.max;
      context.save();
      context.globalAlpha = clamp(effect.life / effect.max, 0, 1);
      const y = getLaneBaseline(effect.lane) - 28 * getLaneScale(effect.lane);
      context.fillStyle = "#c7a77c";
      for (let index = 0; index < 6; index += 1) {
        const angle = index * Math.PI / 3 + progress * 3;
        const radius = 8 + progress * 28;
        context.beginPath();
        context.arc(20 + Math.cos(angle) * radius, y + Math.sin(angle) * radius * 0.5, 3 + progress * 2, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = "#fff0d2";
      context.font = "bold 9px monospace";
      context.textAlign = "left";
      context.fillText(this.text("DEVORADO", "EATEN"), 34, y);
      context.restore();
    }
  }

  render() {
    const context = this.ctx;
    context.clearRect(0, 0, WIDTH, HEIGHT);
    this.drawBackground();
    this.drawLaneGuides();

    context.save();
    context.translate(-this.cameraX, 0);
    this.drawStartAndFinish();

    for (const checkpoint of this.checkpoints) this.drawCheckpoint(checkpoint);
    for (const cloud of this.ramDustClouds) this.drawRamDustCloud(cloud);
    for (const hazard of this.hazards) {
      const renderKind = getRaceHazardRenderKind(hazard.kind);
      if (renderKind === "pit") this.drawPit(hazard);
      else if (renderKind === "mud") this.drawMud(hazard);
    }
    for (const hazard of this.hazards) {
      if (getRaceHazardRenderKind(hazard.kind) === "rock") this.drawRock(hazard);
    }
    for (const pickup of this.pickups) {
      if (!pickup.taken) this.drawPickup(pickup);
    }

    for (const racer of [...this.racers].sort((a, b) => a.lane - b.lane)) {
      if (!racer.eaten) this.drawDino(racer);
    }
    for (const hazard of this.hazards) {
      if (getRaceHazardRenderKind(hazard.kind) === "bush") this.drawBush(hazard);
    }
    context.restore();

    this.drawEatenEffects();
    const player = this.playerRacer;
    const playerDistance = player ? (player.eaten ? player.eliminationDistance : getRaceDistanceMeters(player.x)) : 0;
    const formattedDistance = Math.floor(playerDistance).toLocaleString(this.locale === "es" ? "es-AR" : "en-US");
    drawMinigameHudText(context, this.text("TIEMPO ", "TIME ") + this.elapsed.toFixed(1) + "s", 26, 34, { size: 16, tone: "primary" });
    drawMinigameHudText(context, this.text("DISTANCIA ", "DISTANCE ") + formattedDistance + this.text(" / 10.000 M", " / 10,000 M"), WIDTH / 2, 34, { size: 16, tone: "primary", align: "center" });
    if (player) {
      const ramLabel = player.eaten ? this.text("ELIMINADO", "ELIMINATED")
        : player.ramCooldown <= 0 ? this.text("X: EMBESTIDA LISTA", "X: RAM READY")
        : this.text("X: RECARGANDO", "X: RECHARGING");
      drawMinigameHudText(context, this.text("CARRIL ", "LANE ") + (player.lane + 1) + "/4 · " + ramLabel, WIDTH - 26, 58, { align: "right", tone: "secondary", size: 12 });
    }
    const progress = clamp(playerDistance / RACE_DISTANCE_METERS, 0, 1);
    drawMinigameHudBar(context, { x: 26, y: 82, width: WIDTH - 52, height: 6, ratio: progress, fillColor: player?.eaten ? "#e27b60" : "#d8f36a", trackColor: "rgba(48, 69, 42, .38)" });
  }

  exit() {
    this.stop();
    this.openingCinematic = null;
    this.confirmationDialog.hidden = true;
    this.openingOverlay.hidden = true;
    this.root.classList.remove("active", "playing", "cinematic");
    this.root.setAttribute("aria-hidden", "true");
    this.onExit();
  }

  destroy() {
    this.exit();
    this.canvasViewport.disconnect();
    window.removeEventListener("keydown", this.handleDown);
    window.removeEventListener("keyup", this.handleUp);
    window.removeEventListener("blur", this.handleBlur);
  }
}
