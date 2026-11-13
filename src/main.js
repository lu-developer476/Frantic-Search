import "./styles/main.css";
import { inject } from "@vercel/analytics";
import { GAME, LEVELS } from "./config/GameConfig.js";

inject();
import { AudioManager } from "./audio/AudioManager.js";
import { AdaptiveMusic } from "./audio/AdaptiveMusic.js";
import { SaveManager } from "./storage/SaveManager.js";
import { InputManager } from "./core/InputManager.js";
import { Player } from "./entities/Player.js";
import { AutonomousCompanion } from "./entities/AutonomousCompanion.js";
import { HunterEnemy } from "./entities/HunterEnemy.js";
import { WildDinosaur } from "./entities/WildDinosaur.js";
import { FerrucutusAlly } from "./entities/FerrucutusAlly.js";
import { FerrucutusCaptive } from "./entities/FerrucutusCaptive.js";
import { IndoraptorBoss } from "./entities/IndoraptorBoss.js";
import { IndominusRexBoss } from "./entities/IndominusRexBoss.js";
import { PhysicsSystem } from "./systems/PhysicsSystem.js";
import { CollisionSystem } from "./systems/CollisionSystem.js";
import { PlatformWorld } from "./world/PlatformWorld.js";
import { CampaignManager } from "./campaign/CampaignManager.js";
import { Beta } from "./entities/Beta.js";
import { FacilityConsole } from "./entities/FacilityConsole.js";
import { SpriteRenderer } from "./rendering/SpriteRenderer.js";
import { t as uiText, translateText } from "./i18n.js";

const canvas = document.querySelector("#game");
const desktopPlayback = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
// Render directly to the native 960×540 game canvas. The old 320×180
// intermediate buffer discarded most sprite detail before it was enlarged again.
const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
ctx.imageSmoothingEnabled = false;
const spriteRenderer = new SpriteRenderer(import.meta.env.BASE_URL, () => {
  // Assets may finish loading while the simulation is running. The normal frame loop
  // will draw them; only force a redraw while the game is static or paused.
  if (!running || paused) render();
});
const overlay = document.querySelector("#overlay");
const startScreen = document.querySelector("#start-screen");
const startScreenMessage = document.querySelector("#start-screen-message");
const startButton = document.querySelector("#start-button");
const overlayActionButton = document.querySelector("#overlay-action-button");
const stateLabel = document.querySelector("#game-state");
const distanceLabel = document.querySelector("#distance");
const rescuesLabel = document.querySelector("#rescues");
const bestLabel = document.querySelector("#best");
const abilityLabel = document.querySelector("#ability-status");
const campaignObjectiveLabel = document.querySelector("#campaign-objective");
const campaignChapterLabel = document.querySelector("#campaign-chapter");
const interactionHintLabel = document.querySelector("#interaction-hint");
const storyPanel = document.querySelector("#story-panel");
const storyTitle = document.querySelector("#story-title");
const storySpeaker = document.querySelector("#story-speaker");
const storyText = document.querySelector("#story-text");
const storyProgress = document.querySelector("#story-progress");
const storyNextButton = document.querySelector("#story-next");
const dinoModal = document.querySelector("#dino-modal");
let selectionReturn = "start";
const menuToggle = document.querySelector("#menu-toggle");
const navMenu = document.querySelector("#nav-menu");
const soundIcon = document.querySelector("#sound-icon");
const soundLabel = document.querySelector("#sound-label");

const save = new SaveManager();
const audio = new AudioManager();
const music = new AdaptiveMusic();
let locale = save.get("language") || "es";
const savedEnvironmentMode = save.get("environmentMode");
let environmentMode = ["beige", "gray"].includes(savedEnvironmentMode) ? savedEnvironmentMode : "beige";
let desktopBlocked = false;
const input = new InputManager(window, canvas);
const physics = new PhysicsSystem({ gravity: GAME.gravity, worldBottom: GAME.height + 150 });

const savedCharacter = save.get("selectedCharacter");
let selected = savedCharacter === "vasti" ? "vasti" : "blue";
// Rosa is a rescue objective, never a playable character. Migrate old saves
// that may contain the previous mistaken "rosa" selection back to Violeta.
if (savedCharacter !== selected) save.update({ selectedCharacter: selected });
let running = false;
let paused = false;
let last = 0;
let accumulator = 0;
let frameRequestId = null;
let elapsed = 0;
let distance = 0;
let rescues = 0;
let cameraX = 0;
let player = new Player(selected, GAME.playerX, GAME.groundY);
let world = new PlatformWorld(GAME.groundY);
let hunters = [];
let venatosauruses = [];
let foodSources = [];
let wildlife = [];
let seenVenatosaurusSpawns = new Set();
let seenFoodSpawns = new Set();
let seenBrontosaurusSpawns = new Set();
let stegoceratops = null;
let stegoceratopsCooldown = 0;
let introSequence = false;
let levelTransition = null;
let lastLevelIndex = 0;
let finalDeparture = false;
let finalDepartureDone = false;
let allies = [];
let ferrucutusCaptives = [];
let seenFerrucutusCages = new Set();
let seenHunterSpawns = new Set();
let seenBossSpawns = new Set();
let bosses = [];
let activeBoss = null;
let bossCueTimer = 0;
let bossCueTitle = "";
let dashHitIds = new Set();
let particles = [];
let campaign = new CampaignManager();
let beta = null;
let autonomousCompanions = [];
let facilityConsoles = [];
let extractionX = null;
let campaignSaved = false;

const rand = (min, max) => min + Math.random() * (max - min);
const level = () => levelTransition?.phase === "exit"
  ? LEVELS[levelTransition.fromIndex]
  : [...LEVELS].reverse().find((item) => distance >= item.distance) || LEVELS[0];
const currentMusicTheme = () => campaign.flags.completed ? "victory" : activeBoss ? "boss" : beta?.state === "following" ? "extraction" : level().environment === "wild" ? "coastal" : level().environment;
const best = () => Math.max(save.get("bestDistance"), Math.floor(distance));
const ui = (key) => uiText(key, locale);
const tr = (value) => translateText(value, locale);

function drawDino(x, y, width, height, color, kind, phase = 0, alpha = 1, facing = 1, actor = null) {
  if (spriteRenderer.drawDinosaur(ctx, kind, x, y, width, height, actor, phase, alpha)) return;

  // Pixel-cell fallback follows the same low, long-bodied V-Rex silhouette as the SVG set.
  const palette = kind === "vasti"
    ? { edge: "#202720", deep: "#3f4b35", hide: "#586341", mid: "#68784e", light: "#77845a", brown: "#887454", belly: "#c9b991", eye: "#d1a148" }
    : { edge: "#202720", deep: "#3f4b35", hide: color || "#586341", mid: "#68784e", light: "#77845a", brown: "#887454", belly: "#c9b991", eye: "#d1a148" };

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(facing < 0 ? x + width : x, y);
  if (facing < 0) ctx.scale(-1, 1);
  ctx.scale(width / 128, height / 128);
  const cell = (fill, px, py, w, h) => {
    ctx.fillStyle = fill;
    ctx.fillRect(px, py, w, h);
  };

  // Muscular hind legs and broad feet.
  cell(palette.edge, 36, 64, 24, 40);
  cell(palette.deep, 40, 72, 12, 28);
  cell(palette.edge, 60, 64, 20, 44);
  cell(palette.hide, 64, 72, 12, 28);
  cell(palette.brown, 28, 100, 20, 4);
  cell(palette.brown, 72, 100, 20, 4);

  // Long, tapering tail and deep barrel torso.
  cell(palette.edge, 4, 56, 44, 16);
  cell(palette.mid, 8, 56, 32, 8);
  cell(palette.hide, 12, 60, 32, 4);
  cell(palette.brown, 12, 64, 24, 4);
  cell(palette.edge, 28, 44, 64, 32);
  cell(palette.hide, 32, 48, 52, 24);
  cell(palette.light, 40, 48, 36, 8);
  cell(palette.brown, 40, 64, 40, 8);
  cell(palette.belly, 44, 64, 32, 8);

  // Compact skull, blunt muzzle and ochre eye.
  cell(palette.edge, 76, 36, 48, 32);
  cell(palette.light, 84, 40, 40, 20);
  cell(palette.brown, 88, 56, 32, 8);
  cell(palette.belly, 96, 56, 20, 4);
  cell(palette.edge, 108, 40, 8, 4);
  cell(palette.eye, 112, 40, 4, 4);
  cell(palette.edge, 120, 48, 4, 4);

  // Three short digits on the tucked forelimb.
  cell(palette.edge, 76, 64, 12, 8);
  cell(palette.deep, 80, 68, 4, 4);
  cell(palette.edge, 78, 72, 4, 8);
  cell(palette.edge, 82, 72, 4, 8);
  cell(palette.edge, 86, 72, 4, 8);
  cell(palette.brown, 78, 76, 4, 4);
  cell(palette.belly, 82, 76, 4, 4);
  cell(palette.belly, 86, 76, 4, 4);
  ctx.restore();
}
function drawBackground() {
  const scene = level();
  const shift = (cameraX * 0.13) % 1120;
  const environment = scene.environment;
  ctx.fillStyle = scene.sky;
  ctx.fillRect(0, 0, GAME.width, GAME.height);
  ctx.fillStyle = scene.sun;
  ctx.fillRect(770, 58, 34, 34);
  ctx.fillRect(762, 66, 50, 18);
  ctx.fillStyle = scene.sunShade;
  ctx.fillRect(778, 92, 18, 5);

  for (let i = 0; i < 5; i += 1) {
    const x = ((i * 248 - cameraX * 0.075) % 1180 + 1180) % 1180 - 100;
    const y = 62 + (i % 3) * 43;
    ctx.fillStyle = scene.cloudShadow;
    ctx.fillRect(x + 8, y + 8, 58, 12);
    ctx.fillRect(x + 20, y, 34, 12);
    ctx.fillStyle = scene.cloud;
    ctx.fillRect(x, y + 4, 58, 10);
    ctx.fillRect(x + 13, y - 4, 35, 12);
  }

  for (let i = -1; i < 6; i += 1) {
    const x = i * 260 - shift;
    ctx.fillStyle = scene.mountain;
    ctx.beginPath();
    ctx.moveTo(x, 402);
    ctx.lineTo(x + 52, 326);
    ctx.lineTo(x + 88, 350);
    ctx.lineTo(x + 145, 266);
    ctx.lineTo(x + 204, 350);
    ctx.lineTo(x + 226, 329);
    ctx.lineTo(x + 278, 402);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = scene.snow;
    ctx.fillRect(x + 130, 282, 18, 8);
    ctx.fillRect(x + 144, 274, 12, 8);
    ctx.fillRect(x + 159, 288, 12, 7);
  }

  for (let i = -1; i < 5; i += 1) {
    const x = i * 310 - ((cameraX * 0.22) % 1240);
    ctx.fillStyle = scene.ridge;
    ctx.beginPath();
    ctx.moveTo(x, 430);
    ctx.lineTo(x + 22, 370);
    ctx.lineTo(x + 76, 342);
    ctx.lineTo(x + 142, 366);
    ctx.lineTo(x + 202, 326);
    ctx.lineTo(x + 268, 368);
    ctx.lineTo(x + 310, 430);
    ctx.closePath();
    ctx.fill();
  }

  if (environment === "wild" || environment === "forest") {
    for (let i = 0; i < 13; i += 1) {
      const x = ((i * 103 - cameraX * 0.34) % 1160 + 1160) % 1160 - 80;
      const base = 427 - (i % 3) * 10;
      const size = 25 + (i % 4) * 8;
      ctx.fillStyle = scene.treeTrunk;
      ctx.fillRect(x + size * 0.43, base - size, 8, size + 8);
      ctx.fillStyle = i % 2 ? scene.tree : scene.treeLight;
      ctx.fillRect(x + 3, base - size - 18, size + 14, 20);
      ctx.fillRect(x + 11, base - size - 29, size - 2, 13);
      ctx.fillRect(x - 5, base - size - 8, 12, 13);
    }
  } else {
    for (let i = 0; i < 6; i += 1) {
      const x = ((i * 218 - cameraX * 0.29) % 1320 + 1320) % 1320 - 150;
      const height = 96 + (i % 3) * 30;
      ctx.fillStyle = scene.buildingShadow;
      ctx.fillRect(x + 7, 302 - height, 174, height + 128);
      ctx.fillStyle = scene.building;
      ctx.fillRect(x, 294 - height, 174, height + 136);
      ctx.fillStyle = scene.buildingLight;
      ctx.fillRect(x, 294 - height, 174, 7);
      for (let j = 0; j < 4; j += 1) {
        ctx.fillStyle = scene.window;
        ctx.fillRect(x + 16 + j * 39, 314 - height, 18, 8);
        ctx.fillRect(x + 16 + j * 39, 350 - height, 18, 8);
      }
      ctx.fillStyle = scene.warning;
      ctx.fillRect(x + 15, 302 - height, 38, 4);
    }
  }

  ctx.fillStyle = scene.under;
  ctx.fillRect(0, 430, GAME.width, 110);
  ctx.fillStyle = scene.detail;
  for (let i = 0; i < 24; i += 1) {
    const x = ((i * 67 - cameraX * 0.48) % 1020 + 1020) % 1020;
    const y = 408 + (i % 4) * 6;
    ctx.fillRect(x, y, 5, 3);
    if (i % 3 === 0) ctx.fillRect(x + 4, y - 4, 3, 5);
  }
}


function drawPlatform(platform) {
  const scene = level();
  if (platform.kind === "ground") {
    ctx.fillStyle = scene.soil;
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
    ctx.fillStyle = scene.grass;
    ctx.fillRect(platform.x, platform.y, platform.w, 8);
    ctx.fillStyle = scene.detail;
    for (let i = 0; i < Math.floor(platform.w / 52); i += 1) {
      const x = platform.x + i * 52 + 13;
      ctx.fillRect(x, platform.y + 17 + (i % 3) * 8, 11, 3);
      if (i % 2 === 0) ctx.fillRect(x + 7, platform.y + 13 + (i % 3) * 8, 4, 5);
    }
    ctx.fillStyle = scene.rock;
    for (let i = 0; i < Math.floor(platform.w / 145); i += 1) {
      ctx.fillRect(platform.x + i * 145 + 72, platform.y + 34, 8, 4);
      ctx.fillRect(platform.x + i * 145 + 80, platform.y + 31, 5, 3);
    }
    return;
  }
  if (platform.kind === "ally-bridge") {
    ctx.fillStyle = "#8b9b70";
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
    ctx.fillStyle = "#f1d66a";
    ctx.fillRect(platform.x, platform.y, platform.w, 5);
    ctx.fillStyle = "#47563b";
    for (let x = platform.x + 8; x < platform.x + platform.w - 4; x += 24) ctx.fillRect(x, platform.y + 8, 11, 4);
    return;
  }
  ctx.fillStyle = scene.platform;
  ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
  ctx.fillStyle = scene.platformTop;
  ctx.fillRect(platform.x, platform.y, platform.w, 5);
  ctx.fillStyle = scene.platformShadow;
  ctx.fillRect(platform.x + 8, platform.y + platform.h, platform.w - 16, 6);
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
    ctx.fillText(tr("CELL BLOCK C"), prop.x + 48, prop.y + prop.h - 28);
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
  ctx.fillText(locale === "es" ? (consoleEntity.kind === "power" ? "ENE" : "SEG") : (consoleEntity.kind === "power" ? "PWR" : "LOCK"), x + 7, y + 2);
  if (consoleEntity.activated) {
    ctx.fillStyle = "#d8f36a";
    ctx.font = "9px monospace";
    ctx.fillText(tr("ONLINE"), x - 2, y - 10);
  }
  ctx.restore();
}

function drawBeta(entity) {
  if (!entity) return;
  const x = entity.x;
  const y = entity.y;
  ctx.save();
  if (entity.state === "confined") {
    ctx.fillStyle = "#a3c9ba1b";
    roundedRect(ctx, x - 12, y - 12, entity.w + 24, entity.h + 15, 12);
    ctx.strokeStyle = "#9bb5ac";
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 12, y - 12, entity.w + 24, entity.h + 15);
    ctx.fillStyle = "#ed8e55";
    ctx.font = "9px monospace";
    ctx.fillText(tr("CONTAINMENT // ROSA"), x - 24, y - 22);
  }
  spriteRenderer.drawAnimated(ctx, "beta", x, y, entity.w, entity.h, entity, entity.animation, { facing: entity.facing });
  ctx.restore();
  return;
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
  ctx.fillText(tr(beta?.state === "following" || beta?.state === "extracted" ? "EXTRACTION" : "EXIT LOCKED"), x + 28, GAME.groundY - 139);
  ctx.fillStyle = "#d8f36a";
  ctx.font = "8px monospace";
  ctx.fillText(tr("EAST GATE"), x + 60, GAME.groundY - 123);
}

function drawObstacle(obstacle) {
  ctx.save();
  if (obstacle.type === "crate") {
    ctx.fillStyle = "#a66b3d";
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
    ctx.fillStyle = "#d6a45f";
    ctx.fillRect(obstacle.x + 4, obstacle.y + 4, obstacle.w - 8, 5);
    ctx.fillRect(obstacle.x + 4, obstacle.y + obstacle.h - 8, obstacle.w - 8, 4);
    ctx.fillStyle = "#70472f";
    ctx.fillRect(obstacle.x + 8, obstacle.y + 10, 5, obstacle.h - 20);
    ctx.fillRect(obstacle.x + obstacle.w - 13, obstacle.y + 10, 5, obstacle.h - 20);
    ctx.fillStyle = "#d6a45f";
    ctx.fillRect(obstacle.x + 9, obstacle.y + 10, obstacle.w - 18, 4);
    ctx.fillRect(obstacle.x + 9, obstacle.y + obstacle.h - 14, obstacle.w - 18, 4);
  } else if (obstacle.type === "hunter") {
    ctx.fillStyle = "#d1c5a0";
    ctx.fillRect(obstacle.x + 8, obstacle.y + 14, obstacle.w - 16, obstacle.h - 14);
    ctx.fillStyle = "#a8794f";
    ctx.fillRect(obstacle.x + obstacle.w / 2 - 9, obstacle.y, 18, 18);
    ctx.fillStyle = "#303a35";
    ctx.fillRect(obstacle.x + 5, obstacle.y + obstacle.h - 8, obstacle.w - 10, 8);
  } else {
    ctx.fillStyle = "#b8b08a";
    ctx.beginPath();
    ctx.moveTo(obstacle.x, obstacle.y + obstacle.h);
    ctx.lineTo(obstacle.x + obstacle.w * 0.15, obstacle.y + obstacle.h * 0.35);
    ctx.lineTo(obstacle.x + obstacle.w * 0.36, obstacle.y + obstacle.h * 0.48);
    ctx.lineTo(obstacle.x + obstacle.w * 0.55, obstacle.y);
    ctx.lineTo(obstacle.x + obstacle.w * 0.78, obstacle.y + obstacle.h * 0.4);
    ctx.lineTo(obstacle.x + obstacle.w, obstacle.y + obstacle.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e0d5a4";
    ctx.fillRect(obstacle.x + obstacle.w * 0.22, obstacle.y + obstacle.h * 0.42, 8, 4);
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
  if (particles.length > 280) particles.splice(0, particles.length - 280);
}


function drawFerrucutus(ally) {
  const x = ally.x;
  const y = ally.y;
  if (!spriteRenderer.drawAnimated(ctx, "ferrucutus", x, y, ally.w, ally.h, ally, elapsed, { facing: ally.direction })) return;
  if (ally.state === "brace" || ally.state === "bridge" || ally.state === "charge") {
    ctx.fillStyle = "#d8f36a";
    ctx.font = "10px monospace";
    ctx.fillText(tr(ally.state === "charge" ? "ALLY ATTACK" : "FERRUCUTUS // SUPPORT"), x - 15, y - 14);
  }
  return;
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
    ctx.fillText(tr("FERRUCUTUS // SUPPORT"), x - 15, y - 14);
  } else if (ally.state === "charge") {
    ctx.fillStyle = "#e8c58a";
    ctx.font = "10px monospace";
    ctx.fillText(tr("ALLY ATTACK"), x + 8, y - 14);
  }
}


function drawFerrucutusCage(captive) {
  const { x, y, w, h } = captive;
  const ground = captive.groundY;
  const frame = "#1a2425";
  const steel = "#71817e";
  const highlight = "#aeb8a4";
  ctx.save();
  ctx.fillStyle = "#101918dd";
  ctx.fillRect(x + 5, ground - 24, w - 10, 21);
  ctx.fillStyle = frame;
  ctx.fillRect(x, y + 8, 8, h - 18);
  ctx.fillRect(x + w - 8, y + 8, 8, h - 18);
  ctx.fillRect(x + 4, y, w - 8, 10);
  ctx.fillRect(x + 4, ground - 18, w - 8, 8);

  spriteRenderer.drawAnimated(
    ctx, "ferrucutus", captive.dinosaurX, captive.dinosaurY,
    captive.dinosaurW, captive.dinosaurH, captive, elapsed
  );

  ctx.fillStyle = steel;
  for (let barX = x + 13; barX < x + w - 8; barX += 27) {
    ctx.fillRect(barX, y + 10, 4, h - 30);
    ctx.fillStyle = highlight;
    ctx.fillRect(barX + 1, y + 12, 1, h - 34);
    ctx.fillStyle = steel;
  }
  ctx.fillStyle = frame;
  ctx.fillRect(x + 3, y + 34, w - 6, 5);
  ctx.fillRect(x + 3, y + 82, w - 6, 5);
  ctx.fillStyle = highlight;
  ctx.fillRect(x + 6, y + 10, w - 12, 2);
  ctx.fillRect(x + 6, ground - 16, w - 12, 2);
  ctx.fillStyle = "#202c2d";
  ctx.fillRect(x + w - 27, y + 42, 16, 25);
  ctx.fillStyle = "#e18a58";
  ctx.fillRect(x + w - 23, y + 47, 8, 5);
  ctx.fillStyle = "#d8f36a";
  ctx.fillRect(x + w - 21, y + 58, 4, 4);
  ctx.fillStyle = "#e8c58a";
  ctx.font = "8px monospace";
  ctx.fillText(tr("FERRUCUTUS // CONFINED"), x + 9, y - 7);
  ctx.restore();
}

function drawHunter(hunter) {
  const x = hunter.x;
  const y = hunter.y;
  const alert = hunter.state === "investigate" || hunter.state === "windup" || hunter.state === "attack";
  const defeated = hunter.defeated;

  const spriteDrawn = spriteRenderer.drawAnimated(ctx, "hunter", x - 6, y - 5, hunter.w + 12, hunter.h + 8, hunter, elapsed, {
    alpha: defeated ? 0.48 : 1,
    facing: hunter.direction
  });
  if (!spriteDrawn) {
    // Poachers have no supplied PNG reference, so keep their gameplay actors visible
    // with a crisp native-Canvas fallback while dinosaur PNGs load independently.
    const stride = Math.sin(elapsed * 10 + hunter.x * 0.045);
    ctx.save();
    ctx.globalAlpha *= defeated ? 0.48 : 1;
    ctx.translate(hunter.direction < 0 ? x + hunter.w : x, y);
    if (hunter.direction < 0) ctx.scale(-1, 1);
    ctx.fillStyle = "#202a29";
    ctx.fillRect(7, 58, 25, 5);
    ctx.fillStyle = "#bd9a72";
    ctx.fillRect(11, 5, 17, 17);
    ctx.fillStyle = "#3e493f";
    ctx.fillRect(9, 3, 21, 8);
    ctx.fillRect(6, 23, 27, 23);
    ctx.fillStyle = "#ad8050";
    ctx.fillRect(10, 26, 19, 13);
    ctx.fillStyle = "#d1c5a0";
    ctx.fillRect(12, 23, 15, 4);
    ctx.fillStyle = "#3e493f";
    ctx.fillRect(5, 28, 7, 18);
    ctx.fillRect(29, 28, 7, 18);
    ctx.fillStyle = "#25302b";
    ctx.fillRect(10, 45, 8, 15 + Math.round(stride * 3));
    ctx.fillRect(23, 45, 8, 15 - Math.round(stride * 3));
    ctx.fillStyle = "#141c1b";
    ctx.fillRect(25, 31, 17, 4);
    ctx.fillRect(39, 29, 4, 3);
    ctx.restore();
  }

  if (alert && !defeated) {
    ctx.fillStyle = "#ed8e55";
    ctx.beginPath();
    ctx.arc(x + 20, y - 6, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (hunter.state === "stunned") {
    ctx.fillStyle = "#d8f36a";
    ctx.font = "16px monospace";
    ctx.fillText("✳", x + 12, y - 3);
  } else if (defeated) {
    ctx.fillStyle = "#d8f36a";
    ctx.font = "9px monospace";
    ctx.fillText(tr("CAPTIVE FREE"), x - 14, y - 8);
  }

  if (!defeated) {
    ctx.fillStyle = "#17201a";
    ctx.fillRect(x + 5, y - 18, 30, 4);
    ctx.fillStyle = hunter.health > 1 ? "#d8f36a" : "#ed8e55";
    ctx.fillRect(x + 5, y - 18, 30 * hunter.health / 2, 4);
  }

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

  for (const spawn of world.ferrucutusCageSpawns) {
    if (seenFerrucutusCages.has(spawn.id)) continue;
    seenFerrucutusCages.add(spawn.id);
    ferrucutusCaptives.push(new FerrucutusCaptive({
      ...spawn,
      groundY: spawn.groundY ?? GAME.groundY
    }));
  }

  for (const spawn of world.venatosaurusSpawns) {
    if (seenVenatosaurusSpawns.has(spawn.id)) continue;
    seenVenatosaurusSpawns.add(spawn.id);
    venatosauruses.push(new WildDinosaur({ ...spawn, groundY: GAME.groundY }));
  }

  for (const spawn of world.foodSpawns) {
    if (seenFoodSpawns.has(spawn.id)) continue;
    seenFoodSpawns.add(spawn.id);
    foodSources.push({ ...spawn, y: GAME.groundY - 82, w: 112, h: 82, consumed: false });
  }

  for (const spawn of world.brontosaurusSpawns) {
    if (seenBrontosaurusSpawns.has(spawn.id)) continue;
    seenBrontosaurusSpawns.add(spawn.id);
    wildlife.push({ ...spawn, y: GAME.groundY - 178, w: 300, h: 178, facing: 1 });
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

function tryEatFood(actor, radius = 150) {
  if (!actor || actor.health >= (actor.maxHealth ?? 3)) return false;
  const actorCenter = actor.x + actor.w / 2;
  const source = foodSources
    .filter((item) => !item.consumed && Math.abs(item.x + item.w / 2 - actorCenter) <= radius &&
      Math.abs((item.y + item.h) - (actor.y + actor.h)) < 125)
    .sort((a, b) => Math.abs(a.x - actor.x) - Math.abs(b.x - actor.x))[0];
  if (!source) return false;
  source.consumed = true;
  actor.health = Math.min(actor.maxHealth ?? 3, actor.health + 1);
  actor.feedingTimer = 0.75;
  burst(source.x + source.w / 2, source.y + source.h / 2, "#9bd48a", 14);
  audio.collect();
  return true;
}

function updateCampaignHud() {
  if (campaignObjectiveLabel) campaignObjectiveLabel.textContent = tr(campaign.objective);
  if (campaignChapterLabel) campaignChapterLabel.textContent = tr(campaign.chapter);
  if (rescuesLabel) rescuesLabel.textContent = String(rescues).padStart(2, "0");
}

function renderStoryPanel({ syncAudio = true } = {}) {
  if (!campaign.sceneOpen) {
    storyPanel?.classList.add("hidden");
    if (syncAudio) music.setDucked(false);
    return;
  }
  const scene = campaign.activeScene;
  const line = campaign.currentLine;
  if (!scene || !line || !storyPanel) return;
  storyTitle.textContent = tr(scene.title);
  storySpeaker.textContent = tr(line.speaker);
  storyText.textContent = tr(line.text);
  storyProgress.textContent = (scene.index + 1) + " / " + scene.lines.length;
  storyNextButton.textContent = scene.index + 1 >= scene.lines.length ? ui("continue") : ui("next");
  storyPanel.classList.remove("hidden");
  if (syncAudio) music.setDucked(true);
}

function showCampaignEnding() {
  if (!campaign.flags.completed) return;
  storyPanel?.classList.add("hidden");
  overlay.querySelector(".overlay-kicker").textContent = ui("operationComplete");
  overlay.querySelector("h2").innerHTML = locale === "es" ? "LA TRAJIMOS<br><em>A CASA.</em>" : "WE BROUGHT<br><em>HER HOME.</em>";
  overlay.querySelector("p").textContent = ui("rescuedMessage");
  overlay.querySelector("button").textContent = ui("replay");
  overlay.querySelector("button").hidden = false;
  overlay.classList.remove("hidden");
  stateLabel.textContent = ui("missionComplete");
}

function advanceStory() {
  campaign.advanceScene();
  renderStoryPanel();
  if (!campaign.sceneOpen && campaign.flags.completed) {
    finalDeparture = true;
    finalDepartureDone = false;
    storyPanel?.classList.add("hidden");
  }
}

function interactWithFacility() {
  const captive = ferrucutusCaptives.find((entry) => entry.canInteract(player));
  if (captive && captive.rescue(player)) {
    ferrucutusCaptives = ferrucutusCaptives.filter((entry) => entry !== captive);
    rescues += 1;
    allies.push(new FerrucutusAlly({
      id: "rescued-" + captive.id,
      x: captive.x + 18,
      groundY: GAME.groundY
    }));
    audio.rescue();
    burst(captive.x + captive.w / 2, captive.y + captive.h / 2, "#d8f36a", 26);
    updateCampaignHud();
    return true;
  }

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
        { speaker: "MISSION CONTROL", text: "Rosa's cell is still sealed. Restore auxiliary power and disengage the security lock before attempting extraction." }
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
  const food = foodSources.find((item) => !item.consumed &&
    Math.abs(item.x + item.w / 2 - (player.x + player.w / 2)) < 145 &&
    Math.abs((item.y + item.h) - (player.y + player.h)) < 125);
  if (food && tryEatFood(player)) return true;
  return false;
}

function finishCampaign() {
  if (campaignSaved || !campaign.complete()) return;
  campaignSaved = true;
  save.update({
    campaignCompleted: true,
    completedCampaigns: save.get("completedCampaigns") + 1,
    rescues: save.get("rescues") + rescues,
    bestDistance: Math.max(save.get("bestDistance"), Math.floor(distance))
  });
  audio.rescue();
  music.setTheme("victory");
  music.setPaused(false);
  beta?.extract();
  renderStoryPanel();
}

function pruneEncounterBookkeeping() {
  const activeHunterIds = new Set([
    ...world.hunterSpawns.map((spawn) => spawn.id),
    ...hunters.map((hunter) => hunter.id)
  ]);
  const activeFerrucutusCageIds = new Set([
    ...world.ferrucutusCageSpawns.map((spawn) => spawn.id),
    ...ferrucutusCaptives.map((captive) => captive.id)
  ]);
  const activeBossIds = new Set([
    ...world.bossSpawns.map((spawn) => spawn.id),
    ...bosses.map((boss) => boss.id)
  ]);

  for (const id of seenHunterSpawns) {
    if (!activeHunterIds.has(id)) seenHunterSpawns.delete(id);
  }
  for (const id of seenFerrucutusCages) {
    if (!activeFerrucutusCageIds.has(id)) seenFerrucutusCages.delete(id);
  }
  for (const id of seenBossSpawns) {
    if (!activeBossIds.has(id)) seenBossSpawns.delete(id);
  }
}

function registerHunterResult(hunter, result) {
  if (!result || !result.hit) return;
  if (result.defeated) {
    foodSources.push({ id: "food-" + hunter.id, kind: "hunter", x: hunter.x + 2, y: hunter.y + hunter.h - 22, w: 42, h: 20, consumed: false });
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

function damageVenatosaurus(enemy, amount = 1) {
  if (!enemy || enemy.defeated) return;
  const result = enemy.takeDamage(amount);
  if (!result.hit) return;
  audio.hit();
  burst(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.55, result.defeated ? "#9bd48a" : "#e8a77d", result.defeated ? 22 : 10);
  if (result.defeated) {
    foodSources.push({ id: "food-" + enemy.id, kind: "venatosaurus", x: enemy.x + 10, y: enemy.y + enemy.h - 24, w: 54, h: 22, consumed: false });
  }
}

function damagePlayer() {
  if (!player.takeHit()) return;
  audio.hit();
  burst(player.x + player.w / 2, player.y + player.h / 2, "#ed8e55", 15);
  if (player.health <= 0) endGame();
}


function drawIndoraptor(boss) {
  const spriteDrawn = spriteRenderer.drawAnimated(ctx, "indoraptor", boss.x - 4, boss.y - 4, boss.w + 8, boss.h + 8, boss, elapsed, { alpha: boss.defeated ? 0.4 : 1, facing: boss.direction });
  if (!spriteDrawn) return;
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
    ctx.fillText(tr(boss.attackName === "pounce" ? "POUNCE INCOMING" : "CLAW STRIKE"), boss.x - 5, boss.y - 18);
  }
}

function drawIndominus(boss) {
  const spriteDrawn = spriteRenderer.drawAnimated(ctx, "indominus", boss.x - 4, boss.y - 4, boss.w + 8, boss.h + 8, boss, elapsed, { alpha: boss.defeated ? 0.4 : 1, facing: boss.direction });
  if (!spriteDrawn) return;
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
      ctx.fillText(tr("SONIC ROAR // JUMP"), boss.x + 25, boss.y - 18);
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
        tr(boss.attackName === "charge" ? "CHARGE INCOMING" : "TAIL SWEEP"),
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
      tr(activeBoss.kind === "indoraptor" ? "MINIBOSS // INDORAPTOR" : "MINIBOSS // INDOMINUS REX"),
      GAME.width / 2,
      barY - 11
    );
    ctx.fillStyle = "#35403a";
    ctx.fillRect(barX, barY, barWidth, 9);
    ctx.fillStyle = activeBoss.phase === 2 ? "#ff805f" : "#d8f36a";
    ctx.fillRect(barX, barY, barWidth * (activeBoss.health / activeBoss.maxHealth), 9);
    ctx.fillStyle = "#b9c4b8";
    ctx.font = "9px monospace";
    ctx.fillText((locale === "es" ? "FASE " : "PHASE ") + activeBoss.phase, GAME.width / 2, barY + 23);
    ctx.fillStyle = activeBoss.isVulnerable ? "#d8f36a" : "#a5b0a5";
    ctx.font = "8px monospace";
    ctx.fillText(
      tr(activeBoss.isVulnerable ? "VENTANA DE ATAQUE // EXPUESTO" : "ESPERÁ SU RECUPERACIÓN"),
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
    ctx.fillText(tr("APEX THREAT DETECTED"), GAME.width / 2, 211);
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
  for (const enemy of venatosauruses) {
    if (!enemy.defeated && Math.abs(enemy.x + enemy.w / 2 - (player.x + player.w / 2)) < radius) damageVenatosaurus(enemy, 2);
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

function updateLevelTransition(delta) {
  if (!levelTransition) return;
  const speed = 270;
  if (levelTransition.phase === "exit") {
    player.x += speed * delta;
    for (const companion of autonomousCompanions) companion.actor.x += speed * delta;
    for (const ally of allies) ally.x += speed * delta;
    if (player.x - levelTransition.cameraX > GAME.width + 130) {
      const baseX = GAME.playerX + levelTransition.nextDistance;
      player.x = baseX - 190;
      for (const companion of autonomousCompanions) companion.actor.x = baseX - 310;
      cameraX = Math.max(0, baseX - 330);
      levelTransition.phase = "enter";
    }
    return;
  }
  const baseX = GAME.playerX + levelTransition.nextDistance;
  player.x = Math.min(baseX, player.x + speed * delta);
  for (const companion of autonomousCompanions) companion.actor.x = Math.min(baseX - 116, companion.actor.x + speed * delta);
  for (const ally of allies) ally.x += speed * delta;
  if (player.x >= baseX && autonomousCompanions.every((companion) => companion.actor.x >= baseX - 116)) {
    player.x = baseX;
    for (const companion of autonomousCompanions) companion.actor.x = baseX - 116;
    allies = allies.filter((ally) => ally.x + ally.w < cameraX + GAME.width + 100);
    distance = levelTransition.nextDistance;
    levelTransition = null;
  }
}

function activateStegoceratops() {
  if (stegoceratops || stegoceratopsCooldown > 0 || !running || campaign.flags.completed) return false;
  stegoceratopsCooldown = 30;
  stegoceratops = { id: "stegoceratops-special", x: cameraX - 190, y: GAME.groundY - 126, w: 170, h: 126, direction: 1, state: "charge", hitIds: new Set() };
  audio.collect();
  return true;
}

function updateStegoceratops(delta) {
  stegoceratopsCooldown = Math.max(0, stegoceratopsCooldown - delta);
  if (!stegoceratops) return;
  stegoceratops.x += 790 * delta;
  const overlaps = (target) => stegoceratops.x + stegoceratops.w > target.x + 8 &&
    stegoceratops.x < target.x + target.w - 8;
  for (const hunter of hunters) {
    if (!hunter.defeated && overlaps(hunter)) damageHunter(hunter, 999, "stegoceratops");
  }
  for (const enemy of venatosauruses) {
    if (!enemy.defeated && overlaps(enemy)) damageVenatosaurus(enemy, 999);
  }
  for (const boss of bosses) {
    if (boss.defeated || stegoceratops.hitIds.has(boss.id) || !overlaps(boss)) continue;
    stegoceratops.hitIds.add(boss.id);
    if (boss.health > 1) {
      if (!boss.isVulnerable) { boss.state = "recovering"; boss.stateTimer = 0; boss.damageCooldown = 0; }
      damageBoss(boss, 1, "stegoceratops");
    }
  }
  if (stegoceratops.x > cameraX + GAME.width + 180) stegoceratops = null;
}

function update(delta) {
  if (!running || paused || campaign.sceneOpen) return;
  elapsed += delta;
  bossCueTimer = Math.max(0, bossCueTimer - delta);
  world.update(delta);

  if (finalDeparture) {
    const speed = 265;
    player.x += speed * delta;
    for (const companion of autonomousCompanions) companion.actor.x += speed * delta;
    for (const ally of allies) ally.x += speed * delta;
    if (beta) beta.x += speed * delta;
    if (player.x - cameraX > GAME.width + 150) {
      finalDeparture = false;
      finalDepartureDone = true;
      running = false;
      cancelScheduledFrame();
      showCampaignEnding();
    }
    return;
  }
  if (levelTransition) { updateLevelTransition(delta); return; }
  if (introSequence) {
    player.x = Math.min(GAME.playerX, player.x + 230 * delta);
    for (const companion of autonomousCompanions) companion.actor.x = Math.min(GAME.playerX - 116, companion.actor.x + 230 * delta);
    if (player.x >= GAME.playerX && autonomousCompanions.every((companion) => companion.actor.x >= GAME.playerX - 116)) {
      player.x = GAME.playerX;
      for (const companion of autonomousCompanions) companion.actor.x = GAME.playerX - 116;
      introSequence = false;
    }
    return;
  }
  player.update(delta, input);
  if (input.consume("special")) activateStegoceratops();
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

  if (beta?.state === "confined" && extractionX && player.x + player.w > extractionX - 18) {
    player.x = extractionX - player.w - 18;
    player.vx = Math.min(0, player.vx);
  }

  world.extendTo(player.x + 2800);
  world.pruneBehind(player.x);
  syncEncounters();
  syncBossEncounter();
  syncFacility();
  music.setTheme(currentMusicTheme());
  campaign.updateLocation(player.x);
  updateCampaignHud();
  if (campaign.sceneOpen) return;
  if (input.consume("interact")) {
    interactWithFacility();
    if (campaign.sceneOpen) return;
  }
  distance = Math.max(0, player.x - GAME.playerX);
  cameraX = Math.max(0, player.x - 330);
  const currentLevelIndex = LEVELS.reduce((current, item, index) => distance >= item.distance ? index : current, 0);
  if (currentLevelIndex > lastLevelIndex && currentLevelIndex < LEVELS.length) {
    const nextDistance = LEVELS[currentLevelIndex].distance;
    player.x = GAME.playerX + nextDistance;
    distance = nextDistance;
    cameraX = Math.max(0, player.x - 330);
    levelTransition = { phase: "exit", fromIndex: lastLevelIndex, nextIndex: currentLevelIndex, nextDistance, cameraX };
    lastLevelIndex = currentLevelIndex;
    return;
  }

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

  for (const enemy of venatosauruses) {
    const targets = [
      { target: player, kind: "protagonist" },
      ...autonomousCompanions.map((companion) => ({ target: companion.actor, kind: "protagonist" })),
      ...venatosauruses.filter((other) => other !== enemy && !other.defeated).map((other) => ({ target: other, kind: "venatosaurus" }))
    ];
    const event = enemy.update(delta, targets);
    if (event?.type === "attack") {
      if (event.target === player) { damagePlayer(); if (player.health <= 0) return; }
      else if (venatosauruses.includes(event.target)) damageVenatosaurus(event.target, 1);
      else if (event.target?.takeHit?.()) { audio.hit(); burst(event.target.x + event.target.w / 2, event.target.y + event.target.h / 2, "#ed8e55", 10); }
    }
    tryEatFood(enemy);
    if (player.dashTimer > 0 && !enemy.defeated && CollisionSystem.bodyHit(player, enemy)) damageVenatosaurus(enemy, 1);
  }

  for (const companion of autonomousCompanions) {
    tryEatFood(companion.actor);
    const event = companion.update(delta, player, world, physics, hunters, activeBoss);
    if (event?.type === "companion-strike" && !event.hunter.defeated) {
      damageHunter(event.hunter, 1, "companion");
    } else if (event?.type === "companion-boss-strike" && !event.boss.defeated) {
      damageBoss(event.boss, 1, "companion");
      burst(event.boss.x + event.boss.w / 2, event.boss.y + event.boss.h * 0.65, "#8ed8c0", 9);
    } else if (event?.type === "companion-shockwave") {
      let hit = false;
      for (const hunter of hunters) {
        if (hunter.defeated) continue;
        const dx = Math.abs(hunter.x + hunter.w / 2 - event.x);
        const dy = Math.abs(hunter.y + hunter.h - event.y);
        if (dx <= event.radius && dy <= 112) {
          damageHunter(hunter, 1, "companion-stomp");
          hit = true;
        }
      }
      if (activeBoss && !activeBoss.defeated && activeBoss.isVulnerable &&
          Math.abs(activeBoss.x + activeBoss.w / 2 - event.x) <= event.radius + activeBoss.w * 0.35) {
        damageBoss(activeBoss, 1, "companion-stomp");
        hit = true;
      }
      if (hit) burst(event.x, event.y, "#8ed8c0", 16);
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

  tryEatFood(player);
  if (activeBoss) tryEatFood(activeBoss);
  updateStegoceratops(delta);

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
  foodSources = foodSources.filter((food) => !food.consumed && food.x + food.w >= cameraX - 1100);
  venatosauruses = venatosauruses.filter((enemy) => enemy.x + enemy.w >= cameraX - 1100);
  wildlife = wildlife.filter((animal) => animal.x + animal.w >= cameraX - 500);
  ferrucutusCaptives = ferrucutusCaptives.filter((captive) => captive.x + captive.w >= cameraX - 900);
  hunters = hunters.filter((hunter) => hunter.x + hunter.w >= cameraX - 1100);
  beta?.update(delta, player);
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
    abilityLabel.textContent = ready ? ui("abilityReady") : ui("cooldown") + " " + player.abilityCooldown.toFixed(1) + "s";
    abilityLabel.classList.toggle("ready", ready);
  }
  if (beta?.state === "following" && extractionX && player.x >= extractionX && beta.x >= extractionX - 220) {
    finishCampaign();
  }
  if (interactionHintLabel) {
    const nearbyConsole = facilityConsoles.find((terminal) => terminal.canInteract(player));
    const nearBeta = beta && beta.state === "confined" && Math.abs(player.x - beta.x) < 112;
    const nearFerrucutus = ferrucutusCaptives.some((captive) => captive.canInteract(player));
    interactionHintLabel.textContent = nearbyConsole
      ? "E // " + (nearbyConsole.kind === "power" ? ui("activatePower") : ui("openSecurity"))
      : nearBeta ? "E // " + ui("beta")
      : nearFerrucutus ? "E // " + ui("freeFerrucutus")
      : beta?.state === "following" ? "ROSA // " + ui("escorting") : "";
  }
}

function render() {
  drawBackground();
  ctx.save();
  ctx.translate(-Math.round(cameraX), 0);
  for (const platform of world.visiblePlatforms(cameraX, GAME.width)) drawPlatform(platform);
  for (const prop of world.facilityProps) {
    if (prop.x + prop.w >= cameraX - 50 && prop.x <= cameraX + GAME.width + 50) drawFacilityProp(prop);
  }
  drawBossArenaBoundary();
  for (const terminal of facilityConsoles) drawFacilityConsole(terminal);
  drawExtractionMarker(extractionX);
  for (const obstacle of world.visibleObstacles(cameraX, GAME.width)) drawObstacle(obstacle);
  for (const captive of ferrucutusCaptives) {
    if (captive.x + captive.w >= cameraX - 70 && captive.x <= cameraX + GAME.width + 70) drawFerrucutusCage(captive);
  }
  for (const animal of wildlife) {
    if (animal.x + animal.w >= cameraX - 120 && animal.x <= cameraX + GAME.width + 120) {
      spriteRenderer.drawAnimated(ctx, "brontosaurus", animal.x, animal.y, animal.w, animal.h, animal, elapsed, { alpha: 0.9, facing: animal.facing });
    }
  }
  for (const food of foodSources) {
    if (food.consumed || food.x + food.w < cameraX - 80 || food.x > cameraX + GAME.width + 80) continue;
    if (food.kind === "ligocristus") {
      spriteRenderer.drawAnimated(ctx, "ligocristus", food.x, food.y, food.w, food.h, food, elapsed, { facing: -1 });
    } else {
      ctx.fillStyle = food.kind === "hunter" ? "#6b6250" : "#485b45";
      ctx.fillRect(food.x, food.y + 12, food.w, food.h - 12);
      ctx.fillStyle = "#9bd48a";
      ctx.fillRect(food.x + 6, food.y + 8, 12, 4);
    }
  }
  for (const enemy of venatosauruses) {
    if (enemy.x + enemy.w >= cameraX - 90 && enemy.x <= cameraX + GAME.width + 90) {
      spriteRenderer.drawAnimated(ctx, enemy.kind, enemy.x, enemy.y, enemy.w, enemy.h, enemy, elapsed, { facing: enemy.direction });
      if (!enemy.defeated) {
        ctx.fillStyle = "#17201a"; ctx.fillRect(enemy.x + 16, enemy.y - 12, 76, 4);
        ctx.fillStyle = "#ed8e55"; ctx.fillRect(enemy.x + 16, enemy.y - 12, 76 * enemy.health / enemy.maxHealth, 4);
      }
    }
  }
  for (const hunter of hunters) {
    if (hunter.x + hunter.w >= cameraX - 90 && hunter.x <= cameraX + GAME.width + 90) drawHunter(hunter);
  }
  for (const ally of allies) {
    if (ally.x + ally.w >= cameraX - 100 && ally.x <= cameraX + GAME.width + 100) drawFerrucutus(ally);
  }
  for (const boss of bosses) {
    if (boss.x + boss.w >= cameraX - 180 && boss.x <= cameraX + GAME.width + 180) drawBoss(boss);
  }
  if (beta) drawBeta(beta);
  if (stegoceratops) spriteRenderer.drawAnimated(ctx, "stegoceratops", stegoceratops.x, stegoceratops.y, stegoceratops.w, stegoceratops.h, stegoceratops, elapsed, { facing: 1 });
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.max);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;

  for (const companion of autonomousCompanions) {
    const actor = companion.actor;
    if (actor.x + actor.w < cameraX - 90 || actor.x > cameraX + GAME.width + 90) continue;
    drawDino(actor.x, actor.y, actor.w, actor.h, "#75a99b", actor.character, elapsed + companion.slot * 0.21, 0.96, actor.facing, actor);
  }
  const blink = player.invulnerable > 0 && Math.floor(elapsed * 18) % 2 === 0;
  drawDino(player.x, player.y, player.w, player.h, "#75a99b", selected, elapsed, blink ? 0.35 : 1, player.facing, player);
  if (player.dashTimer > 0) {
    ctx.fillStyle = "#d8f36a66";
    ctx.fillRect(player.x - 20, player.y + player.h * 0.48, player.w + 8, 4);
  }
  for (const terminal of facilityConsoles) {
    if (terminal.canInteract(player)) {
      ctx.fillStyle = "#d8f36a";
      ctx.font = "10px monospace";
      ctx.fillText(tr("E // INTERACT"), terminal.x - 18, terminal.y - 24);
    }
  }
  if (beta && beta.state === "confined" && Math.abs(player.x - beta.x) < 112) {
    ctx.fillStyle = "#d8f36a";
    ctx.font = "10px monospace";
    ctx.fillText(tr(campaign.canFreeBeta() ? "E // FREE ROSA" : "CELL LOCKED"), beta.x - 12, beta.y - 30);
  }
  ctx.restore();

  ctx.fillStyle = "#eaf0d9";
  ctx.font = "11px monospace";
  ctx.fillText(tr(level().name), 24, 34);
  ctx.fillStyle = "#d8f36a";
  ctx.fillRect(24, 47, Math.min(220, distance / 12), 3);
  ctx.fillStyle = "#d2a27d";
  ctx.font = "10px monospace";
  ctx.fillText(tr(selected === "blue" ? "VIOLETA // DOUBLE JUMP + DASH" : selected === "rosa" ? "ROSA // JUVENILE RAPTOR" : "VASTI // HEAVY STOMP"), 24, GAME.height - 18);
  ctx.fillStyle = "#d8f36a";
  ctx.fillText(tr("FERRUCUTUS RESCUE // SUPPORT ACTIVE"), GAME.width - 314, GAME.height - 18);
  ctx.fillStyle = stegoceratopsCooldown <= 0 ? "#d8f36a" : "#e8c58a";
  ctx.fillText("STEGOCERATOPS [C] // " + (stegoceratopsCooldown <= 0 ? "READY" : stegoceratopsCooldown.toFixed(1) + "s"), GAME.width - 250, 34);
  drawBossHud();

  // All actors and scenery were drawn directly at native game resolution.
}

function cancelScheduledFrame() {
  if (frameRequestId !== null) {
    cancelAnimationFrame(frameRequestId);
    frameRequestId = null;
  }
}

function scheduleFrame() {
  if (!running || paused || frameRequestId !== null || document.hidden) return;
  frameRequestId = requestAnimationFrame(frame);
}

function handleFrameError(error) {
  console.error("[Frantic Search] Simulation frame failed:", error);
  cancelScheduledFrame();
  running = false;
  paused = false;
  music.setPaused(true);
  stateLabel.textContent = locale === "es" ? "ERROR DE EJECUCIÓN" : "RUNTIME ERROR";
  overlay.querySelector(".overlay-kicker").textContent = "FRANTIC SEARCH // RUNTIME";
  overlay.querySelector("h2").textContent = locale === "es" ? "SIMULACIÓN DETENIDA." : "SIMULATION STOPPED.";
  overlay.querySelector("p").textContent = locale === "es"
    ? "Se produjo un error durante la actualización o el dibujo. Abrí la consola para ver el detalle y volvé a iniciar la operación."
    : "An error occurred while updating or drawing the game. Open the console for details, then restart the operation.";
  overlay.querySelector("button").hidden = false;
  overlay.querySelector("button").textContent = ui("retry");
  overlay.classList.remove("hidden");
}

function frame(now) {
  // Clear the handle first so this callback can safely schedule its successor.
  frameRequestId = null;
  if (!running || paused || document.hidden) return;

  try {
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
  } catch (error) {
    handleFrameError(error);
    return;
  }

  scheduleFrame();
}

function resetPlayer() {
  campaign = new CampaignManager();
  beta = null;
  facilityConsoles = [];
  extractionX = null;
  campaignSaved = false;
  player = new Player(selected, GAME.playerX, GAME.groundY);
  player.x = -155;
  world = new PlatformWorld(GAME.groundY);
  hunters = [];
  venatosauruses = [];
  foodSources = [];
  wildlife = [];
  seenVenatosaurusSpawns = new Set();
  seenFoodSpawns = new Set();
  seenBrontosaurusSpawns = new Set();
  stegoceratops = null;
  stegoceratopsCooldown = 0;
  introSequence = true;
  levelTransition = null;
  lastLevelIndex = 0;
  finalDeparture = false;
  finalDepartureDone = false;
  allies = [];
  autonomousCompanions = ["blue", "vasti"]
    .filter(character => character !== selected)
    .map((character) => new AutonomousCompanion(character, -280, GAME.groundY, 0));
  ferrucutusCaptives = [];
  seenHunterSpawns = new Set();
  seenFerrucutusCages = new Set();
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
  if (!desktopPlayback.matches) return;
  cancelScheduledFrame();
  audio.unlock();
  startScreen.classList.add("hidden");
  dinoModal.classList.add("hidden");
  overlayActionButton.hidden = true;
  resetPlayer();
  music.start(audio.context, currentMusicTheme());
  music.setPaused(false);
  music.setEnabled(audio.enabled);
  overlay.classList.add("hidden");
  running = true;
  paused = false;
  document.body.classList.remove("game-paused");
  elapsed = 0;
  accumulator = 0;
  distance = 0;
  rescues = 0;
  stateLabel.textContent = ui("inProgress");
  rescuesLabel.textContent = "00";
  campaign.begin();
  updateCampaignHud();
  renderStoryPanel();
  last = performance.now();
  render();
  scheduleFrame();
}

function endGame() {
  if (!running) return;
  running = false;
  introSequence = false;
  levelTransition = null;
  finalDeparture = false;
  cancelScheduledFrame();
  music.setTheme("defeat");
  music.setPaused(false);
  audio.hit();
  burst(player.x + player.w / 2, player.y + player.h / 2, "#e8a77d", 24);
  save.update({
    bestDistance: Math.max(save.get("bestDistance"), Math.floor(distance)),
    rescues: save.get("rescues") + rescues
  });
  bestLabel.textContent = String(save.get("bestDistance")).padStart(4, "0") + " m";
  stateLabel.textContent = ui("signalLost");
  overlay.querySelector(".overlay-kicker").textContent = ui("missionInterrupted");
  overlay.querySelector("h2").innerHTML = locale === "es" ? "LA NATURALEZA<br><em>CONTRAATACA.</em>" : "THE WILD<br><em>STRIKES BACK.</em>";
  overlay.querySelector("p").textContent = ui("defeatMessage").replace("{distance}", String(Math.floor(distance))).replace("{rescues}", String(rescues));
  overlay.querySelector("button").hidden = false;
  overlay.querySelector("button").textContent = ui("retry");
  overlay.classList.remove("hidden");
  render();
}

function togglePause() {
  if (!desktopPlayback.matches || !running) return;
  paused = !paused;
  document.body.classList.toggle("game-paused", paused);
  if (paused) cancelScheduledFrame();
  music.setPaused(paused);
  stateLabel.textContent = paused ? ui("paused") : ui("inProgress");
  if (paused) {
    overlay.querySelector(".overlay-kicker").textContent = ui("operationPaused");
    overlay.querySelector("h2").innerHTML = ui("pauseTitle");
    overlay.querySelector("p").textContent = ui("pausedMessage");
    overlay.querySelector("button").hidden = false;
    overlay.querySelector("button").textContent = ui("continue");
    overlay.classList.remove("hidden");
  } else {
    overlay.querySelector("button").hidden = true;
    overlay.classList.add("hidden");
    accumulator = 0;
    last = performance.now();
    scheduleFrame();
  }
}

function selectCharacter(value) {
  if (value !== "blue" && value !== "vasti") return;
  selected = value;
  save.update({ selectedCharacter: value });
  document.querySelectorAll(".character-card").forEach((card) => {
    const active = card.dataset.character === value;
    card.classList.toggle("active", active);
    card.setAttribute("aria-pressed", String(active));
  });
  if (!running) {
    player = new Player(selected, GAME.playerX, GAME.groundY);
    render();
  }
}

document.querySelectorAll(".character-card").forEach((card) => {
  card.addEventListener("click", () => selectCharacter(card.dataset.character));

  const preview = card.querySelector(".character-art img");
  if (!preview) return;
  const idleSource = preview.dataset.idleSrc || preview.src;
  const runFrames = [preview.dataset.runASrc, preview.dataset.runBSrc].filter(Boolean);
  if (runFrames.length !== 2) return;

  let frame = 0;
  let animationTimer = null;
  card.addEventListener("mouseenter", () => {
    if (animationTimer !== null) return;
    frame = 0;
    preview.src = runFrames[frame];
    animationTimer = window.setInterval(() => {
      frame = (frame + 1) % runFrames.length;
      preview.src = runFrames[frame];
    }, 140);
  });
  card.addEventListener("mouseleave", () => {
    if (animationTimer !== null) window.clearInterval(animationTimer);
    animationTimer = null;
    preview.src = idleSource;
  });
});
storyNextButton?.addEventListener("click", advanceStory);
startButton.addEventListener("click", () => openDinoModal("start"));
overlayActionButton.addEventListener("click", () => {
  if (paused) {
    togglePause();
    return;
  }
  if (!running) openDinoModal("overlay");
});

function openDinoModal(returnTo = "start") {
  if (!desktopPlayback.matches || running || desktopBlocked) return;
  selectionReturn = returnTo;
  if (returnTo === "start") startScreen.classList.add("hidden");
  selectCharacter(selected);
  dinoModal.classList.remove("hidden");
  document.querySelector(".character-card.active")?.focus();
}

function closeDinoModal() {
  dinoModal.classList.add("hidden");
  if (selectionReturn === "start") {
    startScreen.classList.remove("hidden");
    startButton.focus();
  } else {
    overlay.classList.remove("hidden");
    overlayActionButton.focus();
  }
}

function startFromDinoModal() {
  if (dinoModal.classList.contains("hidden") || !desktopPlayback.matches) return;
  dinoModal.classList.add("hidden");
  start();
}

function setMenuOpen(open) {
  navMenu.classList.toggle("hidden", !open);
  menuToggle.classList.toggle("open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", ui(open ? "closeMenu" : "openMenu"));
}

function setLanguage(nextLocale) {
  if (!["es", "en"].includes(nextLocale) || nextLocale === locale) return;

  locale = nextLocale;
  save.update({ language: locale });
  applyLanguage();
  updateCampaignHud();

  // A language change updates presentation only. It must never start, stop,
  // duplicate or reset the simulation's animation-frame chain.
  if (campaign.sceneOpen) renderStoryPanel({ syncAudio: false });
  if (!running || paused) render();
}

function applyLanguage() {
  document.documentElement.lang = locale;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = ui(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    element.setAttribute("aria-label", ui(element.dataset.i18nAria));
  });
  document.querySelectorAll("[data-language]").forEach((button) => {
    const active = button.dataset.language === locale;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  soundLabel.textContent = audio.enabled ? ui("sound") : ui("silence");
  menuToggle.setAttribute("aria-label", ui(navMenu.classList.contains("hidden") ? "openMenu" : "closeMenu"));
  if (abilityLabel) abilityLabel.textContent = player.abilityCooldown <= 0 ? ui("abilityReady") : ui("cooldown") + " " + player.abilityCooldown.toFixed(1) + "s";

  if (desktopBlocked) {
    stateLabel.textContent = ui("desktopOnly");
    startScreenMessage.textContent = ui("desktopMessage");
    startScreenMessage.hidden = false;
    startButton.hidden = true;
  } else if (paused) {
    stateLabel.textContent = ui("paused");
    overlay.querySelector(".overlay-kicker").textContent = ui("operationPaused");
    overlay.querySelector("h2").innerHTML = ui("pauseTitle");
    overlay.querySelector("p").textContent = ui("pausedMessage");
    overlay.querySelector("button").textContent = ui("continue");
  } else if (running) {
    stateLabel.textContent = ui("inProgress");
  } else if (campaign.flags.completed) {
    showCampaignEnding();
  } else if (["SIGNAL LOST", "SEÑAL PERDIDA"].includes(stateLabel.textContent)) {
    stateLabel.textContent = ui("signalLost");
    overlay.querySelector(".overlay-kicker").textContent = ui("missionInterrupted");
    overlay.querySelector("h2").innerHTML = locale === "es" ? "LA NATURALEZA<br><em>CONTRAATACA.</em>" : "THE WILD<br><em>STRIKES BACK.</em>";
    overlay.querySelector("p").textContent = ui("defeatMessage").replace("{distance}", String(Math.floor(distance))).replace("{rescues}", String(rescues));
    overlay.querySelector("button").textContent = ui("retry");
  } else {
    stateLabel.textContent = ui("standby");
    startScreenMessage.textContent = "";
    startScreenMessage.hidden = true;
  }
}

function setEnvironmentMode(mode) {
  if (!["beige", "gray"].includes(mode)) return;
  environmentMode = mode;
  save.update({ environmentMode });
  document.documentElement.classList.remove("site-mode-beige", "site-mode-gray");
  document.documentElement.classList.add(`site-mode-${mode}`);
  document.documentElement.dataset.environmentMode = mode;
  document.querySelectorAll("[data-mode]").forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

dinoModal.addEventListener("click", (event) => {
  if (event.target === dinoModal) closeDinoModal();
});
document.querySelector("#cancel-character").addEventListener("click", closeDinoModal);
document.querySelector("#confirm-character").addEventListener("click", startFromDinoModal);
menuToggle.addEventListener("click", () => setMenuOpen(navMenu.classList.contains("hidden")));
document.querySelectorAll("[data-language]").forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.language));
});
document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => setEnvironmentMode(button.dataset.mode));
});
document.addEventListener("pointerdown", (event) => {
  if (!navMenu.classList.contains("hidden") && !event.target.closest(".nav-actions")) setMenuOpen(false);
});

document.querySelector("#sound-toggle").addEventListener("click", () => {
  const enabled = !audio.enabled;
  audio.setEnabled(enabled);
  music.setEnabled(enabled);
  if (enabled) {
    music.start(audio.context, currentMusicTheme());
    music.setPaused(paused);
    music.setDucked(campaign.sceneOpen);
  }
  soundIcon.textContent = enabled ? "♫" : "♪";
  soundLabel.textContent = enabled ? ui("sound") : ui("silence");
  save.update({ muted: !enabled });
});
window.addEventListener("keydown", (event) => {
  if (!desktopPlayback.matches) return;
  if (event.code === "Escape" && !event.repeat) {
    if (!dinoModal.classList.contains("hidden")) closeDinoModal();
    else if (!navMenu.classList.contains("hidden")) setMenuOpen(false);
    return;
  }
  if (event.code === "Enter" && event.target instanceof Element && event.target.closest("button, a, input, select, textarea, [role='button']")) return;
  if (event.code === "KeyP" && !event.repeat && !campaign.sceneOpen) togglePause();
  if (event.code === "Enter" && !event.repeat && campaign.sceneOpen) advanceStory();
  else if (event.code === "Enter" && !event.repeat && !running && !paused && !desktopBlocked && dinoModal.classList.contains("hidden") && navMenu.classList.contains("hidden")) {
    openDinoModal(overlay.classList.contains("hidden") ? "start" : "overlay");
  }
});

bestLabel.textContent = String(save.get("bestDistance")).padStart(4, "0") + " m";
rescuesLabel.textContent = String(save.get("rescues")).padStart(2, "0");
updateCampaignHud();
renderStoryPanel();
if (save.get("muted")) {
  audio.setEnabled(false);
  music.setEnabled(false);
  soundIcon.textContent = "♪";
  soundLabel.textContent = ui("silence");
}

function syncDesktopAccess() {
  const canPlay = desktopPlayback.matches;
  startButton.disabled = !canPlay;

  if (!canPlay) {
    if (running) {
      running = false;
      paused = false;
      cancelScheduledFrame();
      music.setPaused(true);
      storyPanel.classList.add("hidden");
    }
    desktopBlocked = true;
    dinoModal.classList.add("hidden");
    overlayActionButton.hidden = true;
    overlay.classList.add("hidden");
    stateLabel.textContent = ui("desktopOnly");
    startScreenMessage.textContent = ui("desktopMessage");
    startScreenMessage.hidden = false;
    startButton.hidden = true;
    startScreen.classList.remove("hidden");
    render();
    return;
  }

  if (desktopBlocked) {
    desktopBlocked = false;
    stateLabel.textContent = ui("standby");
    startScreenMessage.textContent = "";
    startScreenMessage.hidden = true;
    startButton.hidden = false;
    overlay.classList.add("hidden");
    startScreen.classList.remove("hidden");
  }
}
desktopPlayback.addEventListener("change", syncDesktopAccess);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelScheduledFrame();
    return;
  }
  if (running && !paused) {
    // Browsers throttle RAF in background tabs. Drop stale elapsed time on return.
    accumulator = 0;
    last = performance.now();
    scheduleFrame();
  } else {
    render();
  }
});

applyLanguage();
setEnvironmentMode(environmentMode);
selectCharacter(selected);
render();
syncDesktopAccess();
