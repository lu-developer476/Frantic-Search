import "./styles/main.css";
import { GAME, LEVELS } from "./config/GameConfig.js";
import { AudioManager } from "./audio/AudioManager.js";
import { SaveManager } from "./storage/SaveManager.js";
import { InputManager } from "./core/InputManager.js";
import { Player } from "./entities/Player.js";
import { PhysicsSystem } from "./systems/PhysicsSystem.js";
import { CollisionSystem } from "./systems/CollisionSystem.js";
import { PlatformWorld } from "./world/PlatformWorld.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const overlay = document.querySelector("#overlay");
const stateLabel = document.querySelector("#game-state");
const distanceLabel = document.querySelector("#distance");
const rescuesLabel = document.querySelector("#rescues");
const bestLabel = document.querySelector("#best");
const abilityLabel = document.querySelector("#ability-status");

const save = new SaveManager();
const audio = new AudioManager();
const input = new InputManager(window, canvas);
const physics = new PhysicsSystem({ gravity: GAME.gravity, worldBottom: GAME.height + 150 });

let selected = save.get("selectedCharacter");
let running = false;
let paused = false;
let last = 0;
let accumulator = 0;
let elapsed = 0;
let distance = 0;
let rescues = 0;
let cameraX = 0;
let player = new Player(selected, GAME.playerX, GAME.groundY);
let world = new PlatformWorld(GAME.groundY);
let particles = [];

const rand = (min, max) => min + Math.random() * (max - min);
const level = () => [...LEVELS].reverse().find((item) => distance >= item.distance) || LEVELS[0];
const best = () => Math.max(save.get("bestDistance"), Math.floor(distance));

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

function drawDino(x, y, width, height, color, kind, phase = 0, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  const leg = Math.sin(phase * 13) * 7;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(18, height * 0.56);
  ctx.lineTo(-12, height * 0.42);
  ctx.lineTo(8, height * 0.67);
  ctx.lineTo(26, height * 0.69);
  ctx.fill();
  roundedRect(ctx, 16, height * 0.36, width * 0.55, height * 0.43, kind === "blue" ? 13 : 18);
  ctx.beginPath();
  ctx.moveTo(width * 0.48, height * 0.49);
  ctx.lineTo(width * 0.63, height * 0.12);
  ctx.lineTo(width * 0.83, height * 0.14);
  ctx.lineTo(width * 0.78, height * 0.55);
  ctx.fill();
  roundedRect(ctx, width * 0.64, height * 0.06, width * 0.34, height * 0.22, 9);
  ctx.fillRect(width * 0.86, height * 0.2, width * 0.14, 5);
  ctx.fillStyle = "#111918";
  ctx.beginPath();
  ctx.arc(width * 0.88, height * 0.12, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = kind === "vasti" ? 11 : 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(width * 0.35, height * 0.72);
  ctx.lineTo(width * 0.31 + leg, height * 0.96);
  ctx.moveTo(width * 0.62, height * 0.72);
  ctx.lineTo(width * 0.66 - leg, height * 0.96);
  ctx.stroke();
  if (kind === "blue") {
    ctx.strokeStyle = "#d5e7e0";
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(width * (0.28 + i * 0.12), height * 0.43);
      ctx.lineTo(width * (0.34 + i * 0.12), height * 0.58);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = "#e8b58d";
    ctx.beginPath();
    ctx.moveTo(width * 0.25, height * 0.38);
    ctx.lineTo(width * 0.48, height * 0.43);
    ctx.lineTo(width * 0.35, height * 0.52);
    ctx.fill();
  }
  ctx.restore();
}

function drawBackground() {
  const currentLevel = level();
  const gradient = ctx.createLinearGradient(0, 0, 0, GAME.height);
  gradient.addColorStop(0, currentLevel.sky);
  gradient.addColorStop(1, "#819078");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GAME.width, GAME.height);
  ctx.fillStyle = "#192b29";
  ctx.beginPath();
  ctx.moveTo(0, 310);
  for (let x = 0; x <= GAME.width; x += 80) {
    ctx.lineTo(x, 280 + Math.sin((x + cameraX * 0.12) * 0.013 + elapsed * 0.12) * 34);
  }
  ctx.lineTo(GAME.width, GAME.height);
  ctx.lineTo(0, GAME.height);
  ctx.fill();
  for (let i = 0; i < 12; i += 1) {
    const x = ((i * 113 - cameraX * 0.18) % 1100 + 1100) % 1100 - 60;
    const y = 270 + (i % 3) * 22;
    ctx.fillStyle = i % 2 ? "#304638" : "#263b34";
    ctx.beginPath();
    ctx.moveTo(x, y + 100);
    ctx.lineTo(x + 28, y - 30 - (i % 3) * 13);
    ctx.lineTo(x + 57, y + 100);
    ctx.fill();
    ctx.fillRect(x + 24, y + 55, 8, 75);
  }
  ctx.fillStyle = "#d4dfb022";
  for (let i = 0; i < 18; i += 1) {
    const x = (i * 71 + elapsed * 12) % GAME.width;
    const y = 100 + (i * 47) % 280;
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawPlatform(platform) {
  if (platform.kind === "ground") {
    ctx.fillStyle = "#293a31";
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
    ctx.fillStyle = "#89936b";
    ctx.fillRect(platform.x, platform.y, platform.w, 5);
    ctx.fillStyle = "#aab18a55";
    for (let i = 0; i < Math.floor(platform.w / 42); i += 1) {
      ctx.fillRect(platform.x + i * 42 + 15, platform.y + 22 + (i % 3) * 9, 13, 2);
    }
    return;
  }
  ctx.fillStyle = "#435543";
  roundedRect(ctx, platform.x, platform.y, platform.w, platform.h, 5);
  ctx.fillStyle = "#9aa276";
  ctx.fillRect(platform.x + 3, platform.y, platform.w - 6, 4);
  ctx.fillStyle = "#26382f";
  ctx.fillRect(platform.x + 12, platform.y + platform.h, platform.w - 24, 7);
}

function drawObstacle(obstacle) {
  ctx.save();
  if (obstacle.type === "crate") {
    ctx.fillStyle = "#7b583c";
    roundedRect(ctx, obstacle.x, obstacle.y, obstacle.w, obstacle.h, 4);
    ctx.strokeStyle = "#c19a69";
    ctx.lineWidth = 4;
    ctx.strokeRect(obstacle.x + 5, obstacle.y + 5, obstacle.w - 10, obstacle.h - 10);
    ctx.beginPath();
    ctx.moveTo(obstacle.x + 6, obstacle.y + 6);
    ctx.lineTo(obstacle.x + obstacle.w - 6, obstacle.y + obstacle.h - 6);
    ctx.moveTo(obstacle.x + obstacle.w - 6, obstacle.y + 6);
    ctx.lineTo(obstacle.x + 6, obstacle.y + obstacle.h - 6);
    ctx.stroke();
  } else if (obstacle.type === "hunter") {
    ctx.fillStyle = "#c3c8b7";
    roundedRect(ctx, obstacle.x + 8, obstacle.y + 14, obstacle.w - 16, obstacle.h - 14, 5);
    ctx.fillStyle = "#b78c62";
    ctx.beginPath();
    ctx.arc(obstacle.x + obstacle.w / 2, obstacle.y + 10, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#303a35";
    ctx.fillRect(obstacle.x + 5, obstacle.y + obstacle.h - 8, obstacle.w - 10, 8);
  } else {
    ctx.fillStyle = "#b5b99c";
    ctx.beginPath();
    ctx.moveTo(obstacle.x, obstacle.y + obstacle.h);
    ctx.lineTo(obstacle.x + obstacle.w * 0.15, obstacle.y + obstacle.h * 0.35);
    ctx.lineTo(obstacle.x + obstacle.w * 0.36, obstacle.y + obstacle.h * 0.48);
    ctx.lineTo(obstacle.x + obstacle.w * 0.55, obstacle.y);
    ctx.lineTo(obstacle.x + obstacle.w * 0.78, obstacle.y + obstacle.h * 0.4);
    ctx.lineTo(obstacle.x + obstacle.w, obstacle.y + obstacle.h);
    ctx.fill();
  }
  ctx.restore();
}

function burst(x, y, color = "#d8f36a", count = 12) {
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x, y,
      vx: rand(-170, 170),
      vy: rand(-240, 40),
      life: rand(0.3, 0.7),
      max: 0.7,
      color,
      size: rand(2, 5)
    });
  }
}

function handleAbilityImpact() {
  if (!player.consumeShockwave()) return;
  const radius = 190;
  let destroyed = 0;
  world.obstacles = world.obstacles.filter((obstacle) => {
    const close = Math.abs(obstacle.x + obstacle.w / 2 - (player.x + player.w / 2)) < radius;
    const sameLevel = Math.abs(obstacle.y - (player.y + player.h - obstacle.h)) < 105;
    if (close && sameLevel && obstacle.x > player.x - 35) {
      burst(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h / 2, "#e8b58d", 14);
      destroyed += 1;
      return false;
    }
    return true;
  });
  if (destroyed) audio.collect();
  burst(player.x + player.w / 2, player.y + player.h, "#d8f36a", 18);
}

function update(delta) {
  if (!running || paused) return;
  elapsed += delta;
  player.update(delta, input);
  const physicsResult = physics.step(player, delta, world.platformsNear(player.x));
  handleAbilityImpact();
  if (physicsResult.fell) {
    endGame();
    return;
  }

  world.extendTo(player.x + 2800);
  world.pruneBehind(player.x);
  distance = Math.max(0, player.x - GAME.playerX);
  cameraX = Math.max(0, player.x - 330);

  for (const obstacle of world.obstacles) {
    if (!obstacle.passed && obstacle.x + obstacle.w < player.x) {
      obstacle.passed = true;
      if (obstacle.type === "hunter") {
        rescues += 1;
        audio.rescue();
        burst(obstacle.x, obstacle.y, "#d8f36a", 18);
      }
    }
    if (!obstacle.passed && player.invulnerable <= 0 && CollisionSystem.obstacleHit(player, obstacle)) {
      endGame();
      return;
    }
  }

  for (const particle of particles) {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += 600 * delta;
    particle.life -= delta;
  }
  particles = particles.filter((particle) => particle.life > 0);

  distanceLabel.textContent = Math.floor(distance).toString().padStart(4, "0") + " m";
  rescuesLabel.textContent = String(rescues).padStart(2, "0");
  bestLabel.textContent = Math.floor(best()).toString().padStart(4, "0") + " m";
  if (abilityLabel) {
    const ready = player.abilityCooldown <= 0;
    abilityLabel.textContent = ready ? "HABILIDAD LISTA" : "RECARGA " + player.abilityCooldown.toFixed(1) + "s";
    abilityLabel.classList.toggle("ready", ready);
  }
}

function render() {
  drawBackground();
  ctx.save();
  ctx.translate(-cameraX, 0);
  for (const platform of world.visiblePlatforms(cameraX, GAME.width)) drawPlatform(platform);
  for (const obstacle of world.visibleObstacles(cameraX, GAME.width)) drawObstacle(obstacle);
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.max);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;

  const companionIsBlue = selected !== "blue";
  const companionWidth = companionIsBlue ? 60 : 72;
  const companionHeight = companionIsBlue ? 58 : 62;
  const companionX = Math.max(0, player.x - 94);
  const companionY = player.y + player.h - companionHeight + Math.sin(elapsed * 8) * 2;
  drawDino(
    companionX, companionY, companionWidth, companionHeight,
    companionIsBlue ? "#75a99b" : "#d2a27d",
    companionIsBlue ? "blue" : "vasti", elapsed - 0.12, 0.95
  );

  const isBlue = selected === "blue";
  const blink = player.invulnerable > 0 && Math.floor(elapsed * 18) % 2 === 0;
  drawDino(
    player.x, player.y, player.w, player.h,
    isBlue ? "#75a99b" : "#d2a27d",
    isBlue ? "blue" : "vasti", elapsed, blink ? 0.35 : 1
  );
  if (player.dashTimer > 0) {
    ctx.fillStyle = "#d8f36a66";
    ctx.fillRect(player.x - 20, player.y + player.h * 0.48, player.w + 8, 4);
  }
  ctx.restore();

  ctx.fillStyle = "#eaf0d9";
  ctx.font = "11px monospace";
  ctx.fillText(level().name, 24, 34);
  ctx.fillStyle = "#d8f36a";
  ctx.fillRect(24, 47, Math.min(220, distance / 12), 3);
  ctx.fillStyle = "#d2a27d";
  ctx.font = "10px monospace";
  ctx.fillText(selected === "blue" ? "BLUE // DOUBLE JUMP + DASH" : "VASTI // HEAVY STOMP", 24, GAME.height - 18);
}

function frame(now) {
  const frameDelta = Math.min((now - last) / 1000 || 0, GAME.maxFrameDelta);
  last = now;
  accumulator = Math.min(accumulator + frameDelta, GAME.fixedStep * 5);
  let steps = 0;
  while (accumulator >= GAME.fixedStep && steps < 5 && running && !paused) {
    update(GAME.fixedStep);
    accumulator -= GAME.fixedStep;
    steps += 1;
  }
  if (steps === 5 && accumulator >= GAME.fixedStep) accumulator = 0;
  render();
  if (running && !paused) requestAnimationFrame(frame);
}

function resetPlayer() {
  player = new Player(selected, GAME.playerX, GAME.groundY);
  world = new PlatformWorld(GAME.groundY);
  cameraX = 0;
  particles = [];
}

function start() {
  audio.unlock();
  resetPlayer();
  overlay.classList.add("hidden");
  running = true;
  paused = false;
  elapsed = 0;
  accumulator = 0;
  distance = 0;
  rescues = 0;
  stateLabel.textContent = "IN PROGRESS";
  rescuesLabel.textContent = "00";
  last = performance.now();
  render();
  requestAnimationFrame(frame);
}

function endGame() {
  if (!running) return;
  running = false;
  audio.hit();
  burst(player.x + player.w / 2, player.y + player.h / 2, "#e8a77d", 24);
  save.update({
    bestDistance: Math.max(save.get("bestDistance"), Math.floor(distance)),
    rescues: save.get("rescues") + rescues
  });
  bestLabel.textContent = String(save.get("bestDistance")).padStart(4, "0") + " m";
  stateLabel.textContent = "SIGNAL LOST";
  overlay.querySelector(".overlay-kicker").textContent = "MISSION INTERRUPTED";
  overlay.querySelector("h2").innerHTML = "THE WILD<br><em>STRIKES BACK.</em>";
  overlay.querySelector("p").textContent = "Distancia: " + Math.floor(distance) + " m · Rescates: " + rescues + ". Volvé a intentarlo.";
  overlay.querySelector("button").textContent = "REINTENTAR ↗";
  overlay.classList.remove("hidden");
  render();
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  stateLabel.textContent = paused ? "PAUSED" : "IN PROGRESS";
  if (paused) {
    overlay.querySelector(".overlay-kicker").textContent = "OPERATION PAUSED";
    overlay.querySelector("h2").innerHTML = "CATCH YOUR<br><em>BREATH.</em>";
    overlay.querySelector("p").textContent = "La operación está en pausa.";
    overlay.querySelector("button").textContent = "CONTINUAR ↗";
    overlay.classList.remove("hidden");
  } else {
    overlay.classList.add("hidden");
    accumulator = 0;
    last = performance.now();
    requestAnimationFrame(frame);
  }
}

function selectCharacter(value) {
  selected = value;
  save.update({ selectedCharacter: value });
  document.querySelectorAll(".character-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.character === value);
  });
  if (!running) {
    player = new Player(selected, GAME.playerX, GAME.groundY);
    render();
  }
}

document.querySelectorAll(".character-card").forEach((card) => {
  card.addEventListener("click", () => selectCharacter(card.dataset.character));
});
document.querySelector("#start-button").addEventListener("click", start);
document.querySelector("#overlay-start").addEventListener("click", () => {
  if (paused) {
    togglePause();
    return;
  }
  start();
});
document.querySelector("#sound-toggle").addEventListener("click", () => {
  const enabled = !audio.enabled;
  audio.setEnabled(enabled);
  document.querySelector("#sound-toggle").innerHTML = enabled ? "♫ <span>SONIDO</span>" : "♪ <span>SILENCIO</span>";
  save.update({ muted: !enabled });
});
window.addEventListener("keydown", (event) => {
  if (event.code === "KeyP" && !event.repeat) togglePause();
  if (event.code === "Enter" && !running && !paused) start();
});

bestLabel.textContent = String(save.get("bestDistance")).padStart(4, "0") + " m";
rescuesLabel.textContent = String(save.get("rescues")).padStart(2, "0");
if (save.get("muted")) {
  audio.setEnabled(false);
  document.querySelector("#sound-toggle").innerHTML = "♪ <span>SILENCIO</span>";
}

selectCharacter(selected);
render();
