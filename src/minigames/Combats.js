import { MinigameEnvironmentRenderer, MINIGAME_ENVIRONMENT_SCENES } from "./MinigameEnvironment.js";
import { observeCanvasViewport } from "../rendering/CanvasUtils.js";

const WIDTH = 960;
const HEIGHT = 540;
const FLOOR = 438;
const ARENA_LEFT = 54;
const ARENA_RIGHT = WIDTH - 54;
const GRAVITY = 1500;
const PLAYER_LIGHT_RANGE = 126;
const PLAYER_HEAVY_RANGE = 154;

// The ten places are intentionally unassigned until the game roster is approved.
// Fill name and spriteKey for each slot after the ten dinosaur species are selected.
// spriteKey must match a character key supported by SpriteRenderer.drawAnimated().
export const COMBATS_ROSTER = Object.freeze(Array.from({ length: 10 }, (_, index) =>
  Object.freeze({
    slot: index + 1,
    id: null,
    name: null,
    spriteKey: null,
    maxHealth: 100,
    speed: 252,
    lightDamage: 12,
    heavyDamage: 22
  })
));

export function getConfiguredCombatsRoster(roster = COMBATS_ROSTER) {
  return roster.filter((dinosaur) =>
    dinosaur &&
    Number.isInteger(dinosaur.slot) &&
    typeof dinosaur.id === "string" && dinosaur.id.trim() &&
    typeof dinosaur.name === "string" && dinosaur.name.trim() &&
    typeof dinosaur.spriteKey === "string" && dinosaur.spriteKey.trim()
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeFighter(species, x, facing) {
  return {
    species,
    x,
    y: FLOOR - 112,
    w: 142,
    h: 112,
    vx: 0,
    vy: 0,
    facing,
    speed: Number(species.speed) || 252,
    health: Number(species.maxHealth) || 100,
    maxHealth: Number(species.maxHealth) || 100,
    lightDamage: Number(species.lightDamage) || 12,
    heavyDamage: Number(species.heavyDamage) || 22,
    attackCooldown: 0,
    attackTimer: 0,
    attackKind: null,
    hitFlash: 0,
    onGround: true,
    state: "idle",
    motionSpeed: 0
  };
}

export class Combats {
  constructor(root, onExit = () => {}, spriteRenderer = null) {
    this.root = root;
    this.canvas = root.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.onExit = onExit;
    this.spriteRenderer = spriteRenderer;
    this.environmentRenderer = new MinigameEnvironmentRenderer({
      scene: MINIGAME_ENVIRONMENT_SCENES.combats,
      groundY: FLOOR,
      seed: 7419,
      sectionLength: 2400,
      sectionCount: 1
    });
    this.locale = "es";
    this.keys = new Set();
    this.pressed = new Set();
    this.selectedPlayerSlot = null;
    this.selectedOpponentSlot = null;
    this.selectingSide = "player";
    this.fighters = [];
    this.running = false;
    this.paused = false;
    this.frame = null;
    this.last = 0;
    this.elapsed = 0;
    this.result = null;

    this.rosterElement = root.querySelector("[data-combats-roster]");
    this.statusLabel = root.querySelector("[data-combats-status]");
    this.selectionStatus = root.querySelector("[data-combats-selection-status]");
    this.resultLabel = root.querySelector("[data-combats-result]");
    this.startButton = root.querySelector("[data-combats-start]");
    this.retryButton = root.querySelector("[data-combats-retry]");
    this.sideButtons = [...root.querySelectorAll("[data-combats-side]")];

    this.handleKeyDown = (event) => {
      if (!this.root.classList.contains("active")) return;
      const movementKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD", "KeyW"];
      const actionKeys = ["KeyJ", "KeyF", "KeyK", "KeyX"];
      if (movementKeys.includes(event.code) || actionKeys.includes(event.code)) event.preventDefault();
      if (event.code === "Escape" && !event.repeat) {
        this.exit();
        return;
      }
      if (event.code === "KeyP" && !event.repeat && this.running) {
        this.togglePause();
        return;
      }
      if (!this.running || this.paused) return;
      if (!event.repeat) this.pressed.add(event.code);
      if (movementKeys.includes(event.code)) this.keys.add(event.code);
    };
    this.handleKeyUp = (event) => {
      this.keys.delete(event.code);
      this.pressed.delete(event.code);
    };
    this.handleBlur = () => {
      this.keys.clear();
      this.pressed.clear();
    };

    this.handleRosterClick = (event) => {
      const button = event.target.closest("[data-combats-slot]");
      if (!button || button.disabled) return;
      const slot = Number(button.dataset.combatsSlot);
      if (this.selectingSide === "player") {
        this.selectedPlayerSlot = slot;
        if (this.selectedOpponentSlot === slot) this.selectedOpponentSlot = null;
      } else {
        this.selectedOpponentSlot = slot;
        if (this.selectedPlayerSlot === slot) this.selectedPlayerSlot = null;
      }
      this.updateRosterSelection();
    };

    this.rosterElement.addEventListener("click", this.handleRosterClick);
    this.sideButtons.forEach((button) => {
      button.addEventListener("click", () => {
        this.selectingSide = button.dataset.combatsSide === "opponent" ? "opponent" : "player";
        this.updateRosterSelection();
      });
    });
    this.startButton.addEventListener("click", () => this.start());
    this.retryButton.addEventListener("click", () => this.start());
    root.querySelector("[data-combats-exit]").addEventListener("click", () => this.exit());

    this.canvasViewport = observeCanvasViewport(
      root.querySelector(".combats-stage"),
      this.canvas,
      () => { this.ctx.imageSmoothingEnabled = false; }
    );
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);

    this.setLocale("es");
    this.populateRoster();
    this.render();
  }

  text(es, en) {
    return this.locale === "es" ? es : en;
  }

  setLocale(locale) {
    this.locale = locale === "en" ? "en" : "es";
    this.root.querySelector("[data-combats-title]").textContent = this.text("COMBATES", "COMBATS");
    this.root.querySelector("[data-combats-subtitle]").textContent = this.text(
      "Prepará tu dinosaurio y enfrentá a un rival en la arena del bosque.",
      "Choose your dinosaur and face a rival in the forest arena."
    );
    this.root.querySelector("[data-combats-instructions]").textContent = this.text(
      "A / D O FLECHAS: MOVERSE · ESPACIO: SALTAR · J / F: ATAQUE RÁPIDO · K / X: ATAQUE FUERTE · P: PAUSA · ESC: SALIR",
      "A / D OR ARROWS: MOVE · SPACE: JUMP · J / F: LIGHT ATTACK · K / X: HEAVY ATTACK · P: PAUSE · ESC: EXIT"
    );
    this.sideButtons[0].textContent = this.text("TU DINOSAURIO", "YOUR DINOSAUR");
    this.sideButtons[1].textContent = this.text("RIVAL", "OPPONENT");
    this.startButton.textContent = this.text("COMENZAR COMBATE", "START FIGHT");
    this.retryButton.textContent = this.text("REPETIR", "REMATCH");
    this.root.querySelector("[data-combats-exit]").textContent = this.text("SALIR", "EXIT");
    this.populateRoster();
    this.updateRosterSelection();
    if (this.root.classList.contains("active")) this.render();
  }

  populateRoster() {
    const configured = new Map(getConfiguredCombatsRoster().map((dinosaur) => [dinosaur.slot, dinosaur]));
    const cards = COMBATS_ROSTER.map((slot) => {
      const species = configured.get(slot.slot);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "combats-roster-slot";
      button.dataset.combatsSlot = String(slot.slot);
      button.disabled = !species;
      const number = document.createElement("span");
      number.className = "combats-roster-number";
      number.textContent = String(slot.slot).padStart(2, "0");
      const name = document.createElement("strong");
      name.textContent = species?.name ?? this.text("POR DEFINIR", "TO BE DEFINED");
      const detail = document.createElement("small");
      detail.textContent = species
        ? this.text("DISPONIBLE", "AVAILABLE")
        : this.text("ESPECIE PENDIENTE", "SPECIES PENDING");
      button.append(number, name, detail);
      return button;
    });
    this.rosterElement.replaceChildren(...cards);
    this.updateRosterSelection();
  }

  updateRosterSelection() {
    const configuredCount = getConfiguredCombatsRoster().length;
    for (const button of this.rosterElement.querySelectorAll("[data-combats-slot]")) {
      const slot = Number(button.dataset.combatsSlot);
      button.classList.toggle("is-player", slot === this.selectedPlayerSlot);
      button.classList.toggle("is-opponent", slot === this.selectedOpponentSlot);
      button.setAttribute("aria-pressed", String(slot === this.selectedPlayerSlot || slot === this.selectedOpponentSlot));
    }
    this.sideButtons.forEach((button) => {
      const active = button.dataset.combatsSide === this.selectingSide;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const playerName = COMBATS_ROSTER.find((entry) => entry.slot === this.selectedPlayerSlot)?.name;
    const opponentName = COMBATS_ROSTER.find((entry) => entry.slot === this.selectedOpponentSlot)?.name;
    this.selectionStatus.textContent = configuredCount < 2
      ? this.text(
        "10 ESPACIOS RESERVADOS · FALTA DEFINIR EL PLANTEL",
        "10 SLOTS RESERVED · ROSTER NOT DEFINED"
      )
      : this.text(
        `JUGADOR: ${playerName || "—"} · RIVAL: ${opponentName || "—"}`,
        `PLAYER: ${playerName || "—"} · OPPONENT: ${opponentName || "—"}`
      );
    this.startButton.disabled = !playerName || !opponentName || playerName === opponentName;
  }

  open() {
    this.stop();
    this.root.classList.add("active");
    this.root.setAttribute("aria-hidden", "false");
    this.root.classList.remove("playing");
    this.canvasViewport();
    this.result = null;
    this.resultLabel.hidden = true;
    this.startButton.hidden = false;
    this.retryButton.hidden = true;
    this.populateRoster();
    this.updateRosterSelection();
    this.setStatus(this.text("PLANTEL // PENDIENTE", "ROSTER // PENDING"));
    this.render();
  }

  setStatus(value) {
    if (this.statusLabel) this.statusLabel.textContent = value;
  }

  start() {
    const playerSpecies = COMBATS_ROSTER.find((entry) => entry.slot === this.selectedPlayerSlot);
    const opponentSpecies = COMBATS_ROSTER.find((entry) => entry.slot === this.selectedOpponentSlot);
    if (!playerSpecies?.name || !playerSpecies?.spriteKey || !opponentSpecies?.name || !opponentSpecies?.spriteKey) {
      this.setStatus(this.text("PLANTEL INCOMPLETO", "ROSTER INCOMPLETE"));
      return false;
    }
    this.stop();
    this.result = null;
    this.resultLabel.hidden = true;
    this.startButton.hidden = true;
    this.retryButton.hidden = true;
    this.root.classList.add("playing");
    this.fighters = [
      makeFighter(playerSpecies, 170, 1),
      makeFighter(opponentSpecies, WIDTH - 312, -1)
    ];
    this.elapsed = 0;
    this.paused = false;
    this.running = true;
    this.last = 0;
    this.keys.clear();
    this.pressed.clear();
    this.setStatus(this.text("RONDA 01 // EN CURSO", "ROUND 01 // LIVE"));
    this.frame = requestAnimationFrame((now) => this.loop(now));
    return true;
  }

  stop() {
    this.running = false;
    this.paused = false;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.last = 0;
    this.keys.clear();
    this.pressed.clear();
  }

  togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;
    this.setStatus(this.paused
      ? this.text("PAUSA", "PAUSED")
      : this.text("RONDA 01 // EN CURSO", "ROUND 01 // LIVE"));
    if (!this.paused) {
      this.last = 0;
      this.frame = requestAnimationFrame((now) => this.loop(now));
    }
    this.render();
  }

  loop(now) {
    if (!this.running || this.paused) return;
    const delta = this.last ? clamp((now - this.last) / 1000, 0, 1 / 30) : 1 / 60;
    this.last = now;
    this.elapsed += delta;
    this.update(delta);
    this.render();
    if (this.running) this.frame = requestAnimationFrame((next) => this.loop(next));
  }

  update(delta) {
    const [player, opponent] = this.fighters;
    if (!player || !opponent) return;
    const axis = (this.keys.has("ArrowRight") || this.keys.has("KeyD") ? 1 : 0) -
      (this.keys.has("ArrowLeft") || this.keys.has("KeyA") ? 1 : 0);
    player.vx = axis * player.speed;
    if (axis !== 0) player.facing = axis;
    else player.facing = opponent.x > player.x ? 1 : -1;

    if (this.pressed.has("Space") || this.pressed.has("ArrowUp") || this.pressed.has("KeyW")) {
      if (player.onGround) {
        player.vy = -560;
        player.onGround = false;
      }
    }
    if (this.pressed.has("KeyJ") || this.pressed.has("KeyF")) this.attack(player, opponent, "light");
    if (this.pressed.has("KeyK") || this.pressed.has("KeyX")) this.attack(player, opponent, "heavy");
    this.pressed.clear();

    const distance = (opponent.x + opponent.w / 2) - (player.x + player.w / 2);
    opponent.facing = distance >= 0 ? -1 : 1;
    const absoluteDistance = Math.abs(distance);
    if (absoluteDistance > 126) {
      opponent.vx = Math.sign(-distance) * opponent.speed * 0.68;
    } else {
      opponent.vx = 0;
      if (opponent.attackCooldown <= 0) {
        this.attack(opponent, player, absoluteDistance < 96 ? "heavy" : "light");
      }
    }

    this.fighters.forEach((fighter) => this.moveFighter(fighter, delta));
    if (player.health <= 0) this.finish(opponent, player);
    else if (opponent.health <= 0) this.finish(player, opponent);
  }

  moveFighter(fighter, delta) {
    fighter.x += fighter.vx * delta;
    fighter.y += fighter.vy * delta;
    fighter.vy += GRAVITY * delta;
    if (fighter.y + fighter.h >= FLOOR) {
      fighter.y = FLOOR - fighter.h;
      fighter.vy = 0;
      fighter.onGround = true;
    } else {
      fighter.onGround = false;
    }
    fighter.x = clamp(fighter.x, ARENA_LEFT, ARENA_RIGHT - fighter.w);
    fighter.attackCooldown = Math.max(0, fighter.attackCooldown - delta);
    fighter.attackTimer = Math.max(0, fighter.attackTimer - delta);
    fighter.hitFlash = Math.max(0, fighter.hitFlash - delta);
    fighter.motionSpeed = Math.abs(fighter.vx);
    fighter.state = fighter.attackTimer > 0
      ? "attacking"
      : !fighter.onGround
        ? "jumping"
        : fighter.motionSpeed > 25 ? "running" : "idle";
  }

  attack(attacker, target, kind) {
    if (attacker.attackCooldown > 0 || attacker.health <= 0) return false;
    const heavy = kind === "heavy";
    attacker.attackCooldown = heavy ? 0.92 : 0.42;
    attacker.attackTimer = heavy ? 0.34 : 0.22;
    attacker.attackKind = kind;
    const attackerCenter = attacker.x + attacker.w / 2;
    const targetCenter = target.x + target.w / 2;
    const distance = Math.abs(targetCenter - attackerCenter);
    const verticalOverlap = attacker.y < target.y + target.h && attacker.y + attacker.h > target.y;
    const facingTarget = Math.sign(targetCenter - attackerCenter) === attacker.facing;
    const range = heavy ? PLAYER_HEAVY_RANGE : PLAYER_LIGHT_RANGE;
    if (distance <= range && verticalOverlap && facingTarget) {
      const damage = heavy ? attacker.heavyDamage : attacker.lightDamage;
      target.health = Math.max(0, target.health - damage);
      target.hitFlash = 0.18;
      target.vx = attacker.facing * (heavy ? 260 : 170);
      if (target.onGround) target.vy = heavy ? -205 : -115;
      target.onGround = false;
    }
    return true;
  }

  finish(winner, loser) {
    this.stop();
    const winnerName = winner.species.name;
    this.result = winnerName;
    this.root.classList.remove("playing");
    this.resultLabel.hidden = false;
    this.resultLabel.textContent = this.text(
      `VICTORIA: ${winnerName}`,
      `VICTORY: ${winnerName}`
    );
    this.retryButton.hidden = false;
    this.startButton.hidden = true;
    this.setStatus(this.text("COMBATE FINALIZADO", "FIGHT COMPLETE"));
    this.selectionStatus.textContent = this.text(
      `${winnerName} derrotó a ${loser.species.name}`,
      `${winnerName} defeated ${loser.species.name}`
    );
    this.render();
  }

  drawBackground() {
    const rendered = this.environmentRenderer.draw(this.ctx, {
      cameraX: 0,
      viewportWidth: WIDTH,
      viewportHeight: HEIGHT,
      elapsed: this.elapsed
    });
    if (!rendered) {
      const gradient = this.ctx.createLinearGradient(0, 0, 0, HEIGHT);
      gradient.addColorStop(0, "#70877a");
      gradient.addColorStop(1, "#263b2f");
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
      this.ctx.fillStyle = "#795b3d";
      this.ctx.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);
    }
  }

  drawFighter(fighter, index) {
    const ctx = this.ctx;
    if (fighter.hitFlash > 0 && Math.floor(this.elapsed * 30) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }
    const drawn = this.spriteRenderer?.drawAnimated?.(
      ctx,
      fighter.species.spriteKey,
      fighter.x,
      fighter.y,
      fighter.w,
      fighter.h,
      fighter,
      this.elapsed,
      { facing: fighter.facing }
    ) ?? false;
    if (!drawn) {
      ctx.save();
      ctx.translate(fighter.facing < 0 ? fighter.x + fighter.w : fighter.x, fighter.y);
      ctx.scale(fighter.facing < 0 ? -1 : 1, 1);
      const body = index === 0 ? "#7b8e65" : "#9b6856";
      const shadow = index === 0 ? "#26362d" : "#432e2b";
      ctx.fillStyle = shadow;
      ctx.fillRect(12, 55, 108, 34);
      ctx.fillRect(90, 36, 42, 28);
      ctx.fillRect(120, 43, 20, 13);
      ctx.fillRect(5, 65, 30, 9);
      ctx.fillRect(26, 82, 14, 28);
      ctx.fillRect(93, 82, 14, 28);
      ctx.fillStyle = body;
      ctx.fillRect(28, 54, 72, 24);
      ctx.fillRect(91, 39, 38, 20);
      ctx.fillStyle = "#e7d09a";
      ctx.fillRect(127, 45, 5, 4);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (fighter.attackTimer > 0) {
      ctx.fillStyle = fighter.attackKind === "heavy" ? "#ffe18a" : "#d8f36a";
      ctx.fillRect(
        fighter.facing > 0 ? fighter.x + fighter.w - 2 : fighter.x - 20,
        fighter.y + 48,
        22,
        5
      );
    }
  }

  drawHealthBar(x, y, width, fighter, label, alignRight = false) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(14, 22, 18, .86)";
    ctx.fillRect(x, y, width, 44);
    ctx.fillStyle = "#eff3e5";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = alignRight ? "right" : "left";
    ctx.fillText(label, alignRight ? x + width - 12 : x + 12, y + 16);
    ctx.fillStyle = "#38443a";
    ctx.fillRect(x + 12, y + 25, width - 24, 9);
    ctx.fillStyle = fighter.health > 35 ? "#d8f36a" : "#e27b60";
    ctx.fillRect(x + 12, y + 25, (width - 24) * fighter.health / fighter.maxHealth, 9);
    ctx.textAlign = "left";
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    this.drawBackground();
    ctx.fillStyle = "rgba(17, 27, 22, .76)";
    ctx.fillRect(0, 0, WIDTH, 52);
    if (this.fighters.length === 2) {
      this.drawHealthBar(20, 8, 310, this.fighters[0], this.fighters[0].species.name);
      this.drawHealthBar(WIDTH - 330, 8, 310, this.fighters[1], this.fighters[1].species.name, true);
      this.fighters.forEach((fighter, index) => this.drawFighter(fighter, index));
    } else {
      ctx.fillStyle = "#e7ebd9";
      ctx.font = "bold 19px monospace";
      ctx.textAlign = "center";
      ctx.fillText("DINO FIGHTZ", WIDTH / 2, HEIGHT / 2 - 12);
      ctx.font = "11px monospace";
      ctx.fillText(this.text("PLANTEL DE 10 DINOSAURIOS PENDIENTE", "10-DINOSAUR ROSTER PENDING"), WIDTH / 2, HEIGHT / 2 + 18);
      ctx.textAlign = "left";
    }
    if (this.paused) {
      ctx.fillStyle = "rgba(0,0,0,.66)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#f3f1df";
      ctx.font = "bold 34px monospace";
      ctx.textAlign = "center";
      ctx.fillText(this.text("PAUSA", "PAUSED"), WIDTH / 2, HEIGHT / 2);
      ctx.textAlign = "left";
    }
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
    this.rosterElement.removeEventListener("click", this.handleRosterClick);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
  }
}
