import "./styles/main.css";
import { GAME, LEVELS } from "./config/GameConfig.js";
import { AudioManager } from "./audio/AudioManager.js";
import { SaveManager } from "./storage/SaveManager.js";
import { InputManager } from "./core/InputManager.js";
import { Player } from "./entities/Player.js";
import { HunterEnemy } from "./entities/HunterEnemy.js";
import { FerrucutusAlly } from "./entities/FerrucutusAlly.js";
import { IndoraptorBoss } from "./entities/IndoraptorBoss.js";
import { IndominusRexBoss } from "./entities/IndominusRexBoss.js";
import { PhysicsSystem } from "./systems/PhysicsSystem.js";
import { CollisionSystem } from "./systems/CollisionSystem.js";
import { PlatformWorld } from "./world/PlatformWorld.js";
import { CampaignManager } from "./campaign/CampaignManager.js";
import { Beta } from "./entities/Beta.js";
import { FacilityConsole } from "./entities/FacilityConsole.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const overlay = document.querySelector("#overlay");
const stateLabel = document.querySelector("#game-state");
const distanceLabel = document.querySelector("#distance");
const rescuesLabel = document.querySelector("#rescues");
const bestLabel = document.querySelector("#best");
const abilityLabel = document.querySelector("#ability-status");
const healthLabel = document.querySelector("#health-status");
const campaignObjectiveLabel = document.querySelector("#campaign-objective");
const campaignChapterLabel = document.querySelector("#campaign-chapter");
const interactionHintLabel = document.querySelector("#interaction-hint");
const storyPanel = document.querySelector("#story-panel");
const storyTitle = document.querySelector("#story-title");
const storySpeaker = document.querySelector("#story-speaker");
const storyText = document.querySelector("#story-text");
const storyProgress = document.querySelector("#story-progress");
const storyNextButton = document.querySelector("#story-next");

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
let hunters = [];
let allies = [];
let seenHunterSpawns = new Set();
let seenAllySpawns = new Set();
let seenBossSpawns = new Set();
let bosses = [];
let activeBoss = null;
let bossCueTimer = 0;
let bossCueTitle = "";
let dashHitIds = new Set();
let particles = [];
let campaign = new CampaignManager();
let beta = null;
let facilityConsoles = [];
let extractionX = null;
let campaignSaved = false;

const rand = (min, max) => min + Math.random() * (max - min);
const level = () => [...LEVELS].reverse().find((item) => distance >= item.distance) || LEVELS[0];
const best = () => Math.max(save.get("bestDistance"), Math.floor(distance));

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

function drawDino(x, y, width, height, color, kind, phase = 0, alpha = 1, facing = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(facing < 0 ? x + width : x, y);
  if (facing < 0) ctx.scale(-1, 1);
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
  if (currentLevel.environment === "industrial" || currentLevel.environment === "facility") {
    ctx.fillStyle = "#111b20";
    ctx.fillRect(0, 300, GAME.width, 240);
    for (let i = 0; i < 5; i += 1) {
      const x = ((i * 240 - cameraX * 0.28) % 1300 + 1300) % 1300 - 120;
      const height = 115 + (i % 3) * 28;
      ctx.fillStyle = i % 2 ? "#354247" : "#2b373c";
      ctx.fillRect(x, 270 - height, 178, height);
      ctx.fillStyle = "#7c8c85";
      for (let j = 0; j < 4; j += 1) {
        ctx.fillRect(x + 18 + j * 38, 285 - height + 26, 19, 5);
        ctx.fillRect(x + 18 + j * 38, 285 - height + 64, 19, 5);
      }
      ctx.fillStyle = "#d8f36a";
      ctx.fillRect(x + 12, 278 - height, 46, 3);
    }
    ctx.fillStyle = "#ed8e5530";
    ctx.fillRect(0, 356, GAME.width, 3);
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
    ctx.fillStyle = level().ground;
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
    ctx.fillStyle = "#89936b";
    ctx.fillRect(platform.x, platform.y, platform.w, 5);
    ctx.fillStyle = "#aab18a55";
    for (let i = 0; i < Math.floor(platform.w / 42); i += 1) {
      ctx.fillRect(platform.x + i * 42 + 15, platform.y + 22 + (i % 3) * 9, 13, 2);
    }
    return;
  }
  if (platform.kind === "ally-bridge") {
    ctx.fillStyle = "#8b9b70";
    roundedRect(ctx, platform.x, platform.y, platform.w, platform.h, 5);
    ctx.fillStyle = "#d8f36a";
    ctx.fillRect(platform.x + 3, platform.y + 2, platform.w - 6, 3);
    ctx.fillStyle = "#47563b";
    for (let x = platform.x + 12; x < platform.x + platform.w - 8; x += 28) {
      ctx.fillRect(x, platform.y + 7, 12, 3);
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

function drawFacilityProp(prop) {
  if (prop.kind === "security-fence") {
    ctx.fillStyle = "#171f22";
    ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
    ctx.fillStyle = "#71817d";
    ctx.fillRect(prop.x, prop.y, prop.w, 3);
    for (let x = prop.x + 8; x < prop.x + prop.w; x += 26) {
      ctx.fillStyle = "#778580";
      ctx.fillRect(x, prop.y - 38, 3, 38);
    }
    return;
  }

  if (prop.kind === "facility-lamp") {
    ctx.fillStyle = "#202a2c";
    ctx.fillRect(prop.x + 10, prop.y, 8, prop.h);
    ctx.fillStyle = "#87958a";
    ctx.fillRect(prop.x, prop.y, 28, 8);
    ctx.fillStyle = "#e4d9a1";
    ctx.fillRect(prop.x + 4, prop.y + 8, 20, 8);
    ctx.fillStyle = "#e4d9a122";
    ctx.beginPath();
    ctx.moveTo(prop.x + 4, prop.y + 16);
    ctx.lineTo(prop.x - 65, GAME.groundY);
    ctx.lineTo(prop.x + 93, GAME.groundY);
    ctx.closePath();
    ctx.fill();
    return;
  }

  ctx.fillStyle = prop.kind === "containment-wing" ? "#424c50" : "#313d42";
  ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
  ctx.fillStyle = "#68777a";
  ctx.fillRect(prop.x, prop.y, prop.w, 7);
  ctx.fillStyle = "#182326";
  for (let x = prop.x + 18; x < prop.x + prop.w - 18; x += 52) {
    ctx.fillRect(x, prop.y + 35, 31, Math.max(28, prop.h - 72));
    ctx.fillStyle = prop.kind === "containment-wing" ? "#8cb1a4" : "#758a85";
    ctx.fillRect(x + 5, prop.y + 41, 21, 4);
    ctx.fillStyle = "#182326";
  }
  ctx.fillStyle = "#d8f36a";
  ctx.fillRect(prop.x + 14, prop.y + 16, Math.min(90, prop.w - 28), 3);
  if (prop.kind === "containment-wing") {
    ctx.strokeStyle = "#a9b7a4";
    ctx.lineWidth = 4;
    ctx.strokeRect(prop.x + 32, prop.y + 54, prop.w - 64, prop.h - 72);
    ctx.fillStyle = "#8bb6a044";
    ctx.fillRect(prop.x + 36, prop.y + 58, prop.w - 72, prop.h - 80);
    ctx.fillStyle = "#d8f36a";
    ctx.font = "10px monospace";
    ctx.fillText("CELL BLOCK C", prop.x + 48, prop.y + prop.h - 28);
  }
}

function drawFacilityConsole(consoleEntity) {
  const x = consoleEntity.x;
  const y = consoleEntity.y;
  ctx.save();
  ctx.fillStyle = "#202a2d";
  roundedRect(ctx, x, y + 18, consoleEntity.w, 60, 6);
  ctx.fillStyle = "#71817b";
  ctx.fillRect(x + 5, y + 20, consoleEntity.w - 10, 5);
  ctx.fillStyle = consoleEntity.activated ? "#d8f36a" : "#e18c62";
  roundedRect(ctx, x + 8, y + 7, consoleEntity.w - 16, 28, 4);
  ctx.fillStyle = "#14201f";
  ctx.fillRect(x + 12, y + 12, consoleEntity.w - 24, 17);
  ctx.fillStyle = consoleEntity.activated ? "#d8f36a" : "#e18c62";
  ctx.fillRect(x + 17, y + 17, consoleEntity.w - 34, 4);
  ctx.fillStyle = "#9aa69d";
  ctx.font = "8px monospace";
  ctx.fillText(consoleEntity.kind === "power" ? "PWR" : "LOCK", x + 7, y + 2);
  if (consoleEntity.activated) {
    ctx.fillStyle = "#d8f36a";
    ctx.font = "9px monospace";
    ctx.fillText("ONLINE", x - 2, y - 10);
  }
  ctx.restore();
}

function drawBeta(entity) {
  if (!entity) return;
  const bob = Math.sin(entity.animation * 5) * 2;
  const x = entity.x;
  const y = entity.y + bob;
  ctx.save();
  if (entity.state === "confined") {
    ctx.fillStyle = "#a3c9ba1b";
    roundedRect(ctx, x - 12, y - 12, entity.w + 24, entity.h + 15, 12);
    ctx.strokeStyle = "#9bb5ac";
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 12, y - 12, entity.w + 24, entity.h + 15);
    ctx.fillStyle = "#ed8e55";
    ctx.font = "9px monospace";
    ctx.fillText("CONTAINMENT // BETA", x - 24, y - 22);
  }
  ctx.translate(entity.facing < 0 ? x + entity.w : x, y);
  if (entity.facing < 0) ctx.scale(-1, 1);
  ctx.fillStyle = "#6f9c8b";
  ctx.beginPath();
  ctx.moveTo(14, 29);
  ctx.lineTo(-10, 23);
  ctx.lineTo(8, 36);
  ctx.fill();
  ctx.fillStyle = "#83b3a1";
  ctx.beginPath();
  ctx.ellipse(24, 27, 19, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(37, 18, 13, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c8d8bb";
  ctx.beginPath();
  ctx.arc(42, 15, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6f9c8b";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(18, 37);
  ctx.lineTo(17, 45);
  ctx.moveTo(31, 37);
  ctx.lineTo(34, 45);
  ctx.stroke();
  ctx.restore();
}

function drawExtractionMarker(x) {
  if (!Number.isFinite(x)) return;
  ctx.fillStyle = "#1b2929";
  ctx.fillRect(x, GAME.groundY - 190, 18, 190);
  ctx.fillRect(x + 180, GAME.groundY - 190, 18, 190);
  ctx.fillRect(x, GAME.groundY - 190, 198, 16);
  ctx.fillStyle = "#d8f36a";
  ctx.fillRect(x + 22, GAME.groundY - 166, 154, 4);
  ctx.fillStyle = "#edf3e5";
  ctx.font = "11px monospace";
  ctx.fillText("EXTRACTION", x + 28, GAME.groundY - 139);
  ctx.fillStyle = "#d8f36a";
  ctx.font = "8px monospace";
  ctx.fillText("EAST GATE", x + 60, GAME.groundY - 123);
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


function drawFerrucutus(ally) {
  const x = ally.x;
  const y = ally.y;
  const phase = elapsed * 7;
  const step = Math.sin(phase) * 6;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#a9a477";
  ctx.beginPath();
  ctx.moveTo(26, 43);
  ctx.lineTo(-18, 29);
  ctx.lineTo(4, 52);
  ctx.fill();
  roundedRect(ctx, 21, 29, 59, 31, 15);
  ctx.fillStyle = "#b8b58a";
  ctx.beginPath();
  ctx.ellipse(77, 29, 26, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7e8761";
  ctx.beginPath();
  ctx.moveTo(61, 20);
  ctx.lineTo(51, 1);
  ctx.lineTo(72, 15);
  ctx.lineTo(88, -4);
  ctx.lineTo(89, 18);
  ctx.lineTo(109, 16);
  ctx.lineTo(96, 31);
  ctx.lineTo(64, 39);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#e1d7ad";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(67, 17);
  ctx.lineTo(53, 3);
  ctx.moveTo(90, 16);
  ctx.lineTo(103, 2);
  ctx.stroke();
  ctx.fillStyle = "#27352b";
  ctx.beginPath();
  ctx.arc(88, 24, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#858c62";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(38, 54);
  ctx.lineTo(35 + step, 70);
  ctx.moveTo(68, 54);
  ctx.lineTo(70 - step, 70);
  ctx.stroke();
  ctx.restore();

  if (ally.state === "brace" || ally.state === "bridge") {
    ctx.fillStyle = "#d8f36a";
    ctx.font = "10px monospace";
    ctx.fillText("FERRUCUTUS // SUPPORT", x - 15, y - 14);
  } else if (ally.state === "charge") {
    ctx.fillStyle = "#e8c58a";
    ctx.font = "10px monospace";
    ctx.fillText("ALLY ATTACK", x + 8, y - 14);
  }
}

function drawHunter(hunter) {
  ctx.save();
  const x = hunter.x;
  const y = hunter.y;
  const alert = hunter.state === "investigate" || hunter.state === "windup" || hunter.state === "attack";
  const stunned = hunter.state === "stunned";
  const defeated = hunter.defeated;

  ctx.globalAlpha = defeated ? 0.48 : 1;
  ctx.fillStyle = defeated ? "#4f5a50" : "#343c37";
  roundedRect(ctx, x + 8, y + 18, 24, 39, 5);
  ctx.fillStyle = "#b6a083";
  ctx.beginPath();
  ctx.arc(x + 20, y + 11, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#202a28";
  ctx.fillRect(x + 7, y + 4, 26, 7);
  ctx.fillStyle = "#a3a58e";
  ctx.fillRect(x + 8, y + 27, 7, 23);
  ctx.fillRect(x + 25, y + 27, 7, 23);
  ctx.strokeStyle = "#303a35";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 53);
  ctx.lineTo(x + 11, y + 64);
  ctx.moveTo(x + 26, y + 53);
  ctx.lineTo(x + 30, y + 64);
  ctx.stroke();

  if (alert && !defeated) {
    ctx.fillStyle = "#ed8e55";
    ctx.fillRect(x + 17, y - 10, 5, 13);
    ctx.beginPath();
    ctx.arc(x + 19.5, y + 7, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (stunned) {
    ctx.fillStyle = "#d8f36a";
    ctx.font = "16px monospace";
    ctx.fillText("✳", x + 12, y - 3);
  } else if (defeated) {
    ctx.fillStyle = "#d8f36a";
    ctx.font = "9px monospace";
    ctx.fillText("CAPTIVE FREE", x - 14, y - 8);
  }

  if (!defeated) {
    ctx.fillStyle = "#17201a";
    ctx.fillRect(x + 5, y - 18, 30, 4);
    ctx.fillStyle = hunter.health > 1 ? "#d8f36a" : "#ed8e55";
    ctx.fillRect(x + 5, y - 18, 30 * hunter.health / 2, 4);
  }
  ctx.restore();

  const attack = hunter.attackBox;
  if (attack) {
    ctx.fillStyle = "#ed8e5528";
    ctx.fillRect(attack.x, attack.y, attack.w, attack.h);
  }
}

function syncEncounters() {
  for (const spawn of world.hunterSpawns) {
    if (seenHunterSpawns.has(spawn.id)) continue;
    seenHunterSpawns.add(spawn.id);
    hunters.push(new HunterEnemy({
      ...spawn,
      groundY: GAME.groundY
    }));
  }

  for (const spawn of world.allySpawns) {
    if (seenAllySpawns.has(spawn.id)) continue;
    seenAllySpawns.add(spawn.id);
    allies.push(new FerrucutusAlly({
      ...spawn,
      groundY: GAME.groundY
    }));
  }
}

function syncFacility() {
  if (!world.facilitySpawns || facilityConsoles.length > 0) return;
  facilityConsoles = world.facilitySpawns.consoles.map((spawn) =>
    new FacilityConsole({ ...spawn, groundY: GAME.groundY })
  );
  beta = new Beta({ x: world.facilitySpawns.beta, groundY: GAME.groundY });
  extractionX = world.facilitySpawns.extraction;
}

function updateCampaignHud() {
  if (campaignObjectiveLabel) campaignObjectiveLabel.textContent = campaign.objective;
  if (campaignChapterLabel) campaignChapterLabel.textContent = campaign.chapter;
  if (rescuesLabel) rescuesLabel.textContent = String(rescues).padStart(2, "0");
}

function renderStoryPanel() {
  if (!campaign.sceneOpen) {
    storyPanel?.classList.add("hidden");
    return;
  }
  const scene = campaign.activeScene;
  const line = campaign.currentLine;
  if (!scene || !line || !storyPanel) return;
  storyTitle.textContent = scene.title;
  storySpeaker.textContent = line.speaker;
  storyText.textContent = line.text;
  storyProgress.textContent = (scene.index + 1) + " / " + scene.lines.length;
  storyNextButton.textContent = scene.index + 1 >= scene.lines.length ? "CONTINUAR ↗" : "SIGUIENTE →";
  storyPanel.classList.remove("hidden");
}

function showCampaignEnding() {
  if (!campaign.flags.completed) return;
  storyPanel?.classList.add("hidden");
  overlay.querySelector(".overlay-kicker").textContent = "OPERATION COMPLETE";
  overlay.querySelector("h2").innerHTML = "WE BROUGHT<br><em>HER HOME.</em>";
  overlay.querySelector("p").textContent = "Beta fue rescatada. La instalación clandestina quedó expuesta. Campaña completada.";
  overlay.querySelector("button").textContent = "JUGAR DE NUEVO ↗";
  overlay.classList.remove("hidden");
  stateLabel.textContent = "MISSION COMPLETE";
}

function advanceStory() {
  campaign.advanceScene();
  renderStoryPanel();
  if (!campaign.sceneOpen && campaign.flags.completed) showCampaignEnding();
}

function interactWithFacility() {
  for (const terminal of facilityConsoles) {
    if (!terminal.canInteract(player)) continue;
    if (terminal.kind === "security" && !campaign.flags.powerRestored) {
      campaign.queueScene("security-terminal-locked", "SECURITY TERMINAL LOCKED", [
        { speaker: "MISSION CONTROL", text: "The security terminal has no auxiliary power. Activate the power relay first." }
      ]);
      renderStoryPanel();
      return true;
    }
    if (campaign.activateConsole(terminal.kind)) {
      terminal.activate();
      audio.rescue();
      renderStoryPanel();
      updateCampaignHud();
      return true;
    }
  }

  if (beta && beta.state === "confined" &&
      Math.abs((player.x + player.w / 2) - (beta.x + beta.w / 2)) < 112) {
    if (!campaign.canFreeBeta()) {
      campaign.queueScene("beta-cell-locked-hint", "CELL BLOCK C", [
        { speaker: "MISSION CONTROL", text: "Beta's cell is still sealed. Restore auxiliary power and disengage the security lock before attempting extraction." }
      ]);
      renderStoryPanel();
      return true;
    }
    if (beta.rescue() && campaign.freeBeta()) {
      rescues += 1;
      audio.rescue();
      burst(beta.x + beta.w / 2, beta.y + beta.h / 2, "#d8f36a", 28);
      renderStoryPanel();
      updateCampaignHud();
      return true;
    }
  }
  return false;
}

function finishCampaign() {
  if (campaignSaved || !campaign.complete()) return;
  campaignSaved = true;
  running = false;
  save.update({
    campaignCompleted: true,
    completedCampaigns: save.get("completedCampaigns") + 1,
    rescues: save.get("rescues") + rescues,
    bestDistance: Math.max(save.get("bestDistance"), Math.floor(distance))
  });
  audio.rescue();
  beta?.extract();
  renderStoryPanel();
}

function pruneEncounterBookkeeping() {
  const activeHunterIds = new Set([
    ...world.hunterSpawns.map((spawn) => spawn.id),
    ...hunters.map((hunter) => hunter.id)
  ]);
  const activeAllyIds = new Set([
    ...world.allySpawns.map((spawn) => spawn.id),
    ...allies.map((ally) => ally.id)
  ]);
  const activeBossIds = new Set([
    ...world.bossSpawns.map((spawn) => spawn.id),
    ...bosses.map((boss) => boss.id)
  ]);

  for (const id of seenHunterSpawns) {
    if (!activeHunterIds.has(id)) seenHunterSpawns.delete(id);
  }
  for (const id of seenAllySpawns) {
    if (!activeAllyIds.has(id)) seenAllySpawns.delete(id);
  }
  for (const id of seenBossSpawns) {
    if (!activeBossIds.has(id)) seenBossSpawns.delete(id);
  }
}

function registerHunterResult(hunter, result) {
  if (!result || !result.hit) return;
  if (result.defeated) {
    if (result.rescued) {
      rescues += 1;
      audio.rescue();
      burst(hunter.x + hunter.w / 2, hunter.y + 12, "#d8f36a", 22);
    } else {
      audio.hit();
      burst(hunter.x + hunter.w / 2, hunter.y + 12, "#e8a77d", 16);
    }
  } else {
    audio.hit();
    burst(hunter.x + hunter.w / 2, hunter.y + hunter.h / 2, "#e8a77d", 9);
  }
}

function damageHunter(hunter, amount, source) {
  if (hunter.defeated) return;
  const result = hunter.takeDamage(amount);
  registerHunterResult(hunter, result);
  if (source === "blue-dash" && result.hit) {
    dashHitIds.add(hunter.id);
  }
}

function damagePlayer() {
  if (!player.takeHit()) return;
  audio.hit();
  burst(player.x + player.w / 2, player.y + player.h / 2, "#ed8e55", 15);
  if (player.health <= 0) endGame();
}


function drawIndoraptor(boss) {
  const x = boss.x;
  const y = boss.y;
  const phase = elapsed * 10;
  const stride = Math.sin(phase) * 5;
  ctx.save();
  ctx.globalAlpha = boss.defeated ? 0.4 : 1;
  ctx.translate(x, y);
  ctx.fillStyle = "#27222f";
  ctx.beginPath();
  ctx.moveTo(26, 53);
  ctx.lineTo(-32, 28);
  ctx.lineTo(12, 67);
  ctx.fill();
  roundedRect(ctx, 25, 35, 75, 39, 17);
  ctx.fillStyle = "#332b3d";
  ctx.beginPath();
  ctx.moveTo(73, 48);
  ctx.lineTo(91, 13);
  ctx.lineTo(116, 19);
  ctx.lineTo(126, 35);
  ctx.lineTo(110, 53);
  ctx.lineTo(84, 64);
  ctx.fill();
  ctx.fillStyle = "#6a4b68";
  for (let i = 0; i < 5; i += 1) {
    const sx = 35 + i * 12;
    ctx.beginPath();
    ctx.moveTo(sx, 37);
    ctx.lineTo(sx + 5, 18 - (i % 2) * 5);
    ctx.lineTo(sx + 12, 40);
    ctx.fill();
  }
  ctx.strokeStyle = "#51445b";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(43, 68);
  ctx.lineTo(38 + stride, 89);
  ctx.moveTo(83, 68);
  ctx.lineTo(86 - stride, 89);
  ctx.stroke();
  ctx.strokeStyle = "#8a8290";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(82, 58);
  ctx.lineTo(96, 76);
  ctx.lineTo(108, 70);
  ctx.stroke();
  ctx.fillStyle = "#ff6759";
  ctx.beginPath();
  ctx.arc(111, 29, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (boss.state === "telegraph") {
    ctx.strokeStyle = "#ff806c";
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 6]);
    ctx.strokeRect(
      boss.direction > 0 ? boss.x + boss.w - 10 : boss.x - 150,
      boss.groundY - 68,
      150,
      54
    );
    ctx.setLineDash([]);
    ctx.fillStyle = "#ff9b7e";
    ctx.font = "11px monospace";
    ctx.fillText(boss.attackName === "pounce" ? "POUNCE INCOMING" : "CLAW STRIKE", boss.x - 5, boss.y - 18);
  }
}

function drawIndominus(boss) {
  const x = boss.x;
  const y = boss.y;
  const phase = elapsed * 5;
  const stride = Math.sin(phase) * 4;
  ctx.save();
  ctx.globalAlpha = boss.defeated ? 0.4 : 1;
  ctx.translate(x, y);
  ctx.fillStyle = "#b9b5a8";
  ctx.beginPath();
  ctx.moveTo(58, 91);
  ctx.lineTo(-52, 67);
  ctx.lineTo(22, 112);
  ctx.fill();
  roundedRect(ctx, 34, 55, 126, 74, 30);
  ctx.fillStyle = "#d1ccbc";
  ctx.beginPath();
  ctx.moveTo(126, 69);
  ctx.lineTo(155, 23);
  ctx.lineTo(197, 20);
  ctx.lineTo(222, 42);
  ctx.lineTo(208, 69);
  ctx.lineTo(172, 84);
  ctx.lineTo(140, 91);
  ctx.fill();
  ctx.fillStyle = "#8b8a7a";
  for (let i = 0; i < 8; i += 1) {
    const sx = 54 + i * 15;
    ctx.beginPath();
    ctx.moveTo(sx, 58);
    ctx.lineTo(sx + 7, 35 - (i % 2) * 8);
    ctx.lineTo(sx + 14, 64);
    ctx.fill();
  }
  ctx.strokeStyle = "#a19e90";
  ctx.lineWidth = 17;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(79, 112);
  ctx.lineTo(75 + stride, 147);
  ctx.moveTo(143, 112);
  ctx.lineTo(148 - stride, 147);
  ctx.stroke();
  ctx.strokeStyle = "#8d897b";
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(133, 84);
  ctx.lineTo(111, 110);
  ctx.lineTo(124, 117);
  ctx.stroke();
  ctx.fillStyle = "#24221f";
  ctx.beginPath();
  ctx.arc(194, 38, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2eee2";
  ctx.fillRect(202, 60, 18, 4);
  ctx.restore();

  if (boss.state === "telegraph") {
    ctx.strokeStyle = "#ffb26b";
    ctx.lineWidth = 3;
    if (boss.attackName === "roar") {
      ctx.beginPath();
      ctx.ellipse(
        boss.x + boss.w / 2,
        boss.groundY - 4,
        boss.roarRadius * 0.55,
        18,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(
        boss.x + boss.w / 2,
        boss.groundY - 4,
        boss.roarRadius,
        28,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.fillStyle = "#ffc078";
      ctx.font = "11px monospace";
      ctx.fillText("SONIC ROAR // JUMP", boss.x + 25, boss.y - 18);
    } else {
      ctx.setLineDash([9, 6]);
      ctx.strokeRect(
        boss.direction > 0 ? boss.x + boss.w - 10 : boss.x - 190,
        boss.groundY - 106,
        190,
        84
      );
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffc078";
      ctx.font = "11px monospace";
      ctx.fillText(
        boss.attackName === "charge" ? "CHARGE INCOMING" : "TAIL SWEEP",
        boss.x + 20,
        boss.y - 18
      );
    }
  }
}

function drawBoss(boss) {
  if (boss.kind === "indoraptor") drawIndoraptor(boss);
  else drawIndominus(boss);

  if (boss.isVulnerable && !boss.defeated) {
    ctx.save();
    ctx.strokeStyle = "#d8f36a";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.48 + Math.sin(elapsed * 16) * 0.22;
    ctx.strokeRect(boss.x + 3, boss.y + 3, boss.w - 6, boss.h - 6);
    ctx.restore();
  }

  if (boss.state === "attacking" && boss.attackBox) {
    const box = boss.attackBox;
    ctx.fillStyle = "#ff75522b";
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }
}

function drawBossArenaBoundary() {
  if (!activeBoss || activeBoss.defeated) return;
  for (const boundaryX of [activeBoss.arenaMinX, activeBoss.arenaMaxX]) {
    ctx.save();
    ctx.globalAlpha = 0.62 + Math.sin(elapsed * 7) * 0.12;
    ctx.fillStyle = "#d8f36a";
    ctx.fillRect(boundaryX - 3, GAME.groundY - 224, 6, 224);
    ctx.fillStyle = "#f7f2df";
    ctx.fillRect(boundaryX - 1, GAME.groundY - 224, 2, 224);
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = "#d8f36a";
    ctx.fillRect(boundaryX - 18, GAME.groundY - 224, 36, 224);
    ctx.restore();
  }
}

function drawBossHud() {
  if (activeBoss && !activeBoss.defeated) {
    const barX = 250;
    const barY = 71;
    const barWidth = 460;
    ctx.fillStyle = "#101716dd";
    ctx.fillRect(barX - 14, barY - 28, barWidth + 28, 62);
    ctx.fillStyle = "#e8eee0";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      activeBoss.kind === "indoraptor" ? "MINIBOSS // INDORAPTOR" : "MINIBOSS // INDOMINUS REX",
      GAME.width / 2,
      barY - 11
    );
    ctx.fillStyle = "#35403a";
    ctx.fillRect(barX, barY, barWidth, 9);
    ctx.fillStyle = activeBoss.phase === 2 ? "#ff805f" : "#d8f36a";
    ctx.fillRect(barX, barY, barWidth * (activeBoss.health / activeBoss.maxHealth), 9);
    ctx.fillStyle = "#b9c4b8";
    ctx.font = "9px monospace";
    ctx.fillText("FASE " + activeBoss.phase, GAME.width / 2, barY + 23);
    ctx.fillStyle = activeBoss.isVulnerable ? "#d8f36a" : "#a5b0a5";
    ctx.font = "8px monospace";
    ctx.fillText(
      activeBoss.isVulnerable ? "VENTANA DE ATAQUE // EXPUESTO" : "ESPERÁ SU RECUPERACIÓN",
      GAME.width / 2,
      barY + 35
    );
    ctx.textAlign = "start";
  }

  if (bossCueTimer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, bossCueTimer * 1.5);
    ctx.fillStyle = "#0d1514dd";
    ctx.fillRect(215, 185, 530, 90);
    ctx.strokeStyle = "#d8f36a";
    ctx.lineWidth = 1;
    ctx.strokeRect(215, 185, 530, 90);
    ctx.fillStyle = "#d8f36a";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("APEX THREAT DETECTED", GAME.width / 2, 211);
    ctx.fillStyle = "#f0f2e9";
    ctx.font = "bold 29px sans-serif";
    ctx.fillText(bossCueTitle, GAME.width / 2, 249);
    ctx.textAlign = "start";
    ctx.restore();
  }
}

function syncBossEncounter() {
  if (activeBoss) return;

  for (const spawn of world.bossSpawns) {
    if (seenBossSpawns.has(spawn.id) || player.x < spawn.x - 620) continue;

    seenBossSpawns.add(spawn.id);
    const BossType = spawn.kind === "indoraptor" ? IndoraptorBoss : IndominusRexBoss;
    const boss = new BossType({
      ...spawn,
      x: spawn.x + (spawn.kind === "indominus" ? 90 : 45),
      groundY: GAME.groundY,
      arenaMinX: spawn.x - 570,
      arenaMaxX: spawn.x + 560
    });
    boss.activate();
    bosses.push(boss);
    activeBoss = boss;
    bossCueTitle = spawn.kind === "indoraptor" ? "INDORAPTOR" : "INDOMINUS REX";
    bossCueTimer = 2.8;
    audio.bossWarning();
    break;
  }
}

function damageBoss(boss, amount, source) {
  if (!boss || boss.defeated) return;
  const result = boss.takeDamage(amount);
  if (!result.hit) return;

  audio.bossHit();
  burst(
    boss.x + boss.w / 2,
    boss.y + boss.h * 0.52,
    result.defeated ? "#d8f36a" : "#ff9877",
    result.defeated ? 34 : 15
  );

  if (result.phaseChanged) {
    bossCueTitle = "PHASE " + boss.phase;
    bossCueTimer = 1.8;
    audio.bossWarning();
  }

  if (result.defeated) {
    bossCueTitle = boss.kind === "indoraptor" ? "INDORAPTOR DEFEATED" : "INDOMINUS DEFEATED";
    bossCueTimer = 2.4;
    audio.bossDefeat();
    campaign.onBossDefeated(boss.kind);
    updateCampaignHud();
    renderStoryPanel();
    activeBoss = null;
  }
}

function handleAbilityImpact() {
  if (!player.consumeShockwave()) return;
  const radius = 190;
  let destroyed = 0;
  for (const hunter of hunters) {
    if (!hunter.defeated && Math.abs(hunter.x + hunter.w / 2 - (player.x + player.w / 2)) < radius) {
      damageHunter(hunter, 2, "vasti-stomp");
    }
  }
  if (activeBoss && Math.abs(activeBoss.x + activeBoss.w / 2 - (player.x + player.w / 2)) < radius + Math.max(80, activeBoss.w * 0.45)) {
    damageBoss(activeBoss, 2, "vasti-shockwave");
  }
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
  bossCueTimer = Math.max(0, bossCueTimer - delta);
  world.update(delta);

  player.update(delta, input);
  if (player.consumeJumpEvent()) audio.jump();
  const abilityEvent = player.consumeAbilityEvent();
  if (abilityEvent === "dash" || abilityEvent === "stomp") audio.collect();
  if (abilityEvent === "slam") audio.hit();

  const physicsResult = physics.step(player, delta, world.platformsNear(player.x));
  if (physicsResult.fell) {
    endGame();
    return;
  }
  if (activeBoss && !activeBoss.defeated) {
    const arenaLeft = activeBoss.arenaMinX;
    const arenaRight = activeBoss.arenaMaxX - player.w;
    if (player.x < arenaLeft) {
      player.x = arenaLeft;
      player.vx = Math.max(0, player.vx);
    } else if (player.x > arenaRight) {
      player.x = arenaRight;
      player.vx = Math.min(0, player.vx);
    }
  }

  world.extendTo(player.x + 2800);
  world.pruneBehind(player.x);
  syncEncounters();
  syncBossEncounter();
  distance = Math.max(0, player.x - GAME.playerX);
  cameraX = Math.max(0, player.x - 330);

  for (const hunter of hunters) {
    const previousState = hunter.state;
    hunter.update(delta, player);
    if (previousState !== hunter.state && (hunter.state === "investigate" || hunter.state === "windup")) audio.collect();

    if (
      player.dashTimer > 0 &&
      !hunter.defeated &&
      !dashHitIds.has(hunter.id) &&
      CollisionSystem.bodyHit(player, hunter)
    ) {
      damageHunter(hunter, 1, "blue-dash");
    }

    if (
      !hunter.defeated &&
      (CollisionSystem.hunterAttackHit(player, hunter) ||
        ((hunter.state === "pursuit" || hunter.state === "attack") && CollisionSystem.bodyHit(player, hunter)))
    ) {
      damagePlayer();
      if (player.health <= 0) return;
    }
  }

  if (activeBoss) {
    const boss = activeBoss;
    const bossEvent = boss.update(delta, player);
    if (bossEvent === "telegraph") audio.bossWarning();
    if (bossEvent === "attack") audio.bossAttack();

    if (
      player.dashTimer > 0 &&
      !boss.defeated &&
      !dashHitIds.has(boss.id) &&
      CollisionSystem.bodyHit(player, boss)
    ) {
      dashHitIds.add(boss.id);
      damageBoss(boss, 1, "blue-dash");
    }

    if (!boss.defeated && CollisionSystem.bossAttackHit(player, boss)) {
      damagePlayer();
      if (player.health <= 0) return;
    }
  }

  for (const ally of allies) {
    const event = ally.update(delta, player, world, hunters, activeBoss);
    if (event?.type === "ally-strike") {
      registerHunterResult(event.enemy, event.result);
      audio.collect();
    } else if (event?.type === "ally-boss-strike") {
      damageBoss(event.boss, 1, "ferrucutus");
      burst(event.boss.x + event.boss.w / 2, event.boss.y + event.boss.h * 0.7, "#d8f36a", 10);
    } else if (event?.type === "bridge-created") {
      audio.rescue();
      burst(event.bridge.start + (event.bridge.end - event.bridge.start) / 2, GAME.groundY - 8, "#d8f36a", 16);
    }
  }

  allies = allies.filter((ally) => !ally.departed);
  hunters = hunters.filter((hunter) => hunter.x + hunter.w >= cameraX - 1100);
  bosses = bosses.filter((boss) => boss.x + boss.w >= cameraX - 850 || boss === activeBoss);
  pruneEncounterBookkeeping();
  if (player.dashTimer <= 0) dashHitIds.clear();
  handleAbilityImpact();

  for (const obstacle of world.obstacles) {
    if (CollisionSystem.obstacleHit(player, obstacle)) {
      damagePlayer();
      if (player.health <= 0) return;
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
  if (healthLabel) {
    healthLabel.textContent = "INTEGRIDAD " + String(player.health).padStart(2, "0") + "/03";
  }
}

function render() {
  drawBackground();
  ctx.save();
  ctx.translate(-cameraX, 0);
  for (const platform of world.visiblePlatforms(cameraX, GAME.width)) drawPlatform(platform);
  drawBossArenaBoundary();
  for (const obstacle of world.visibleObstacles(cameraX, GAME.width)) drawObstacle(obstacle);
  for (const hunter of hunters) {
    if (hunter.x + hunter.w >= cameraX - 90 && hunter.x <= cameraX + GAME.width + 90) drawHunter(hunter);
  }
  for (const ally of allies) {
    if (ally.x + ally.w >= cameraX - 100 && ally.x <= cameraX + GAME.width + 100) drawFerrucutus(ally);
  }
  for (const boss of bosses) {
    if (boss.x + boss.w >= cameraX - 180 && boss.x <= cameraX + GAME.width + 180) drawBoss(boss);
  }
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
    companionIsBlue ? "blue" : "vasti", elapsed - 0.12, 0.95, player.facing
  );

  const isBlue = selected === "blue";
  const blink = player.invulnerable > 0 && Math.floor(elapsed * 18) % 2 === 0;
  drawDino(
    player.x, player.y, player.w, player.h,
    isBlue ? "#75a99b" : "#d2a27d",
    isBlue ? "blue" : "vasti", elapsed, blink ? 0.35 : 1, player.facing
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
  ctx.fillStyle = "#d8f36a";
  ctx.fillText("FERRUCUTUS SUPPORT // APEX AI ACTIVE", GAME.width - 292, GAME.height - 18);
  drawBossHud();
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
  hunters = [];
  allies = [];
  seenHunterSpawns = new Set();
  seenAllySpawns = new Set();
  seenBossSpawns = new Set();
  bosses = [];
  activeBoss = null;
  bossCueTimer = 0;
  bossCueTitle = "";
  dashHitIds = new Set();
  syncEncounters();
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
  if (healthLabel) healthLabel.textContent = "INTEGRIDAD 03/03";
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

document.querySelectorAll("[data-action]").forEach((button) => {
  const action = button.dataset.action;
  const release = () => {
    input.setAction(action, false);
    button.classList.remove("pressed");
  };
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    input.setAction(action, true);
    button.classList.add("pressed");
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

bestLabel.textContent = String(save.get("bestDistance")).padStart(4, "0") + " m";
rescuesLabel.textContent = String(save.get("rescues")).padStart(2, "0");
if (save.get("muted")) {
  audio.setEnabled(false);
  document.querySelector("#sound-toggle").innerHTML = "♪ <span>SILENCIO</span>";
}

selectCharacter(selected);
render();
