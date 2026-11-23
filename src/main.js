import "./styles/main.css";
import "./styles/typography.css";
import { inject } from "@vercel/analytics";
import { GAME, LEVELS, WORLD } from "./config/GameConfig.js";
import { getDinosaurHitbox } from "./config/DinosaurSizing.js";

inject();
import { AudioManager } from "./audio/AudioManager.js";
import { AdaptiveMusic } from "./audio/AdaptiveMusic.js";
import { SaveManager } from "./storage/SaveManager.js";
import { InputManager } from "./core/InputManager.js";
import { Player } from "./entities/Player.js";
import { AutonomousCompanion } from "./entities/AutonomousCompanion.js";
import { HunterEnemy } from "./entities/HunterEnemy.js";
import { HunterProjectile } from "./entities/HunterProjectile.js";
import { WildDinosaur } from "./entities/WildDinosaur.js";
import { LigocristusPrey, Brontosaurus } from "./entities/LigocristusPrey.js";
import {
  createBrontosaurusBackPlatforms,
  startBrontosaurusRide,
  updateBrontosaurusRide
} from "./systems/BrontosaurusMountSystem.js";
import { FerrucutusAlly } from "./entities/FerrucutusAlly.js";
import { FerrucutusCaptive } from "./entities/FerrucutusCaptive.js";
import { IndoraptorBoss } from "./entities/IndoraptorBoss.js";
import { IndominusRexBoss } from "./entities/IndominusRexBoss.js";
import { PhysicsSystem } from "./systems/PhysicsSystem.js";
import { CollisionSystem } from "./systems/CollisionSystem.js";
import { beginEnemyFade, advanceEnemyFade, getEnemyOpacity, isEnemyFadeComplete } from "./systems/EnemyFadeSystem.js";
import { dropLigocristusFood, dropVenatosaurusFood } from "./systems/FoodSystem.js";
import { BOSS_ARENA_HALF_WIDTH, PlatformWorld } from "./world/PlatformWorld.js";
import { COLLECTIBLE_TOTALS } from "./world/CollectibleGenerator.js";
import { CampaignManager, BOSS_ENCOUNTER_FLAGS } from "./campaign/CampaignManager.js";
import { CampaignPrologue, PROLOGUE_VENATOSAURUS_KINDS } from "./campaign/CampaignPrologue.js";
import { getLevelCheckpointDistance, canActivateLevelCheckpoint } from "./campaign/CheckpointManager.js";
import { Beta } from "./entities/Beta.js";
import { FacilityConsole } from "./entities/FacilityConsole.js";
import { SpriteRenderer } from "./rendering/SpriteRenderer.js";
import { AtmosphereRenderer } from "./rendering/AtmosphereRenderer.js";
import { ImageParallax } from "./rendering/ImageParallax.js";
import { CRATE_VARIANTS, OBJECT_SPECS, PORTAL_FRAMES, SLICES, fillTiled, imageSize, sharedEnvironmentAssets } from "./rendering/EnvironmentAssets.js";
import { TerrainRenderer } from "./rendering/TerrainRenderer.js";
import { ObjectRenderer } from "./rendering/ObjectRenderer.js";
import { EnvironmentalEffectsRenderer } from "./rendering/EnvironmentalEffectsRenderer.js";
import { roundedRect, observeCanvasViewport } from "./rendering/CanvasUtils.js";
import { t as uiText, translateText, getModalTutorialCopy, getCampaignSceneCopy } from "./i18n.js";
import { Persecution } from "./minigames/Persecution.js";
import { Hunting } from "./minigames/Hunting.js";
import { Ambush } from "./minigames/Ambush.js";
import { Race } from "./minigames/Race.js";

const canvas = document.querySelector("#game");
const nativeDesktopPlayback = window.matchMedia("(min-width: 768px) and (any-pointer: fine)");
const isVercelPreview = document.documentElement.classList.contains("vercel-preview");
const desktopPlayback = {
  get matches() {
    return isVercelPreview || nativeDesktopPlayback.matches;
  },
  addEventListener: nativeDesktopPlayback.addEventListener.bind(nativeDesktopPlayback)
};
// Render directly to the native 960×540 game canvas. The old 320×180
// intermediate buffer discarded most sprite detail before it was enlarged again.
const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
// The primary campaign canvas is reserved for pixel-art gameplay, not legacy-resolution labels.
ctx.fillText = () => {};
ctx.strokeText = () => {};
ctx.imageSmoothingEnabled = false;
const atmosphereRenderer = new AtmosphereRenderer({ parallax: new ImageParallax() });
const environmentAssets = sharedEnvironmentAssets();
environmentAssets.preload(OBJECT_SPECS);
const art = (spec) => environmentAssets.get(spec);
const terrainRenderer = new TerrainRenderer();
const objectRenderer = new ObjectRenderer();
const effectsRenderer = new EnvironmentalEffectsRenderer();
const resizeMainCanvas = observeCanvasViewport(canvas.parentElement, canvas, (width) => {
  GAME.width = width;
  ctx.imageSmoothingEnabled = false;
});
let spriteRenderPending = false;
const spriteRenderer = new SpriteRenderer(import.meta.env.BASE_URL, (_asset, _readiness, status) => {
  // Failed legacy assets must not trigger extra full-canvas redraws. The active game
  // loop already renders successful loads; when static, coalesce them into one frame.
  if (status !== "loaded" || (running && !paused) || spriteRenderPending) return;
  spriteRenderPending = true;
  requestAnimationFrame(() => {
    spriteRenderPending = false;
    if (!running || paused) render();
  });
});
const overlay = document.querySelector("#overlay");
const startScreen = document.querySelector("#start-screen");
const startScreenTitle = document.querySelector("#start-screen-title");
const startScreenSubtitle = document.querySelector("#start-screen-subtitle");
const startScreenMessage = document.querySelector("#start-screen-message");
const startButton = document.querySelector("#start-button");
const startMenuHome = document.querySelector("#start-menu-home");
const startMenuOptions = document.querySelector("#start-menu-options");
const campaignMenu = document.querySelector("#campaign-menu");
const minigamesMenu = document.querySelector("#minigames-menu");
const campaignButton = document.querySelector("#campaign-button");
const newCampaignButton = document.querySelector("#new-campaign-button");
const campaignBackButton = document.querySelector("#campaign-back-button");
const minigamesButton = document.querySelector("#minigames-button");
const startMenuBackButton = document.querySelector("#start-menu-back-button");
const minigamesBackButton = document.querySelector("#minigames-back-button");
const explorationButton = document.querySelector("#exploration-button");
const explorationBiomeDialog = document.querySelector("#exploration-biome-dialog");
const explorationBiomeBackButton = document.querySelector("#exploration-biome-back");
const persecutionButton = document.querySelector("#persecution-button");
const persecutionPanel = document.querySelector("#persecution-panel");
const huntingButton = document.querySelector("#hunting-button");
const huntingPanel = document.querySelector("#hunting-panel");
const ambushButton = document.querySelector("#ambush-button");
const raceButton = document.querySelector("#race-button");
const racePanel = document.querySelector("#race-panel");
const ambushPanel = document.querySelector("#ambush-panel");
const startScreenArtwork = document.querySelector(".start-screen-artwork");
const defaultStartScreenArtwork = `${import.meta.env.BASE_URL}artwork/8bits-artwork.png`;
const minigamesStartScreenArtwork = `${import.meta.env.BASE_URL}artwork/coral-8bits-artwork.png`;
// Keep one entry per minigame; null falls back to the current menu page artwork.
const minigamePreviewSources = new Map([
  [persecutionButton, minigamesStartScreenArtwork],
  [huntingButton, `${import.meta.env.BASE_URL}artwork/hunting-artwork.png`],
  [ambushButton, `${import.meta.env.BASE_URL}artwork/ambush-artwork.png`],
  [raceButton, `${import.meta.env.BASE_URL}artwork/race-artwork.png`],
  [explorationButton, `${import.meta.env.BASE_URL}artwork/exploration-artwork.png`]
]);
let hoveredMinigameButton = null;
let focusedMinigameButton = null;
const continueCampaignButton = document.querySelector("#continue-campaign-button");
const deleteCampaignSaveButton = document.querySelector("#delete-campaign-save-button");
const deleteCampaignConfirmation = document.querySelector("#delete-campaign-confirmation");
const confirmDeleteCampaignSaveButton = document.querySelector("#confirm-delete-campaign-save");
const cancelDeleteCampaignSaveButton = document.querySelector("#cancel-delete-campaign-save");
const overlayActionButton = document.querySelector("#overlay-action-button");
const overlayContent = overlay.querySelector(".overlay-content");
const overlayExitButton = document.querySelector("#overlay-exit-button");
const retryOptions = document.querySelector("#retry-options");
const retryLevelStartButton = document.querySelector("#retry-level-start");
const retryCheckpointButton = document.querySelector("#retry-checkpoint");
const retryCancelButton = document.querySelector("#retry-cancel");
const pauseMenu = document.querySelector("#pause-menu");
const pauseContinueButton = document.querySelector("#pause-continue");
const pauseRestartButton = document.querySelector("#pause-restart");
const pauseExitButton = document.querySelector("#pause-exit");
const pauseConfirmation = document.querySelector("#pause-confirmation");
const pauseConfirmationTitle = document.querySelector("#pause-confirmation-title");
const pauseConfirmationMessage = document.querySelector("#pause-confirmation-message");
const confirmPauseActionButton = document.querySelector("#confirm-pause-action");
const cancelPauseActionButton = document.querySelector("#cancel-pause-action");
let pendingPauseAction = null;
let pauseActionTrigger = null;
let deleteCampaignSaveTrigger = null;
let failureScreenActive = false;
let levelStartSnapshot = null;
let latestLevelCheckpoint = null;
let campaignAutosaveElapsed = 0;
const stateLabel = document.querySelector("#game-state");
const distanceLabel = document.querySelector("#distance");
const rescuesLabel = document.querySelector("#rescues");
const bestLabel = document.querySelector("#best");
const playerHealthMeter = document.querySelector("#player-health-meter");
const playerHealthFill = document.querySelector("#player-health-fill");
const playerHealthDamage = document.querySelector("#player-health-damage");
let displayedPlayerHealthRatio = null;
const abilityLabel = document.querySelector("#ability-status");
const controlsLabel = document.querySelector(".hud-controls");
const stegoceratopsStatusLabel = document.querySelector("#stegoceratops-status");
const campaignObjectiveLabel = document.querySelector("#campaign-objective");
const campaignBriefHeader = document.querySelector(".mission-brief-header");
const operationHeader = document.querySelector(".panel-head");
const campaignChapterLabel = document.querySelector("#campaign-chapter");
const secondaryObjectivesLabel = document.querySelector("#secondary-objectives");
const interactionHintLabel = document.querySelector("#interaction-hint");
const storyPanel = document.querySelector("#story-panel");
const storyTitle = document.querySelector("#story-title");
const storyText = document.querySelector("#story-text");
const storyProgress = document.querySelector("#story-progress");
const storyNextButton = document.querySelector("#story-next");
const gameplayBriefDialog = document.querySelector("#gameplay-brief-dialog");
const gameplayBriefTitle = document.querySelector("#gameplay-brief-title");
const gameplayBriefContext = document.querySelector("#gameplay-brief-context");
const gameplayBriefList = document.querySelector("#gameplay-brief-list");
const gameplayBriefNote = document.querySelector("#gameplay-brief-note");
const gameplayBriefContinueButton = document.querySelector("#gameplay-brief-continue");
const gameplayBriefExitButton = document.querySelector("#gameplay-brief-exit");
let pendingGameplayBriefAction = null;
let gameplayBriefPausedGame = false;
let tutorialReturnFocus = null;
let tutorialPausedMode = null;
const dinoModal = document.querySelector("#dino-modal");
const characterConfirmation = document.querySelector("#character-confirmation");
const confirmationTitle = document.querySelector("#character-confirmation-title");
const confirmCharacterButton = document.querySelector("#confirm-character");
const cancelCharacterButton = document.querySelector("#cancel-character");
const playCharacterButton = document.querySelector("#play-character");
const backCharacterConfirmationButton = document.querySelector("#back-character-confirmation");
let selectionReturn = "start";
let activeStartMenuPage = "home";
let selectionMenuPage = "home";
let pendingGameMode = "campaign";
let selectedExplorationBiomeIndex = 0;
let prologueCharacterSelectionPending = false;
const menuToggle = document.querySelector("#menu-toggle");
const navMenu = document.querySelector("#nav-menu");
const soundIcon = document.querySelector("#sound-icon");
const soundLabel = document.querySelector("#sound-label");

const save = new SaveManager();
const returnFromMinigame = () => {
  document.body.classList.remove("game-session-active");
  if (!running && !desktopBlocked) {
    operationHeader?.classList.remove("is-hidden");
    campaignBriefHeader?.classList.remove("is-hidden");
    showStartMenuPage("minigames");
  }
};
const persecution = new Persecution(persecutionPanel, returnFromMinigame, showGameplayBrief);
const hunting = new Hunting(huntingPanel, returnFromMinigame, spriteRenderer, showGameplayBrief);
const ambush = new Ambush(ambushPanel, returnFromMinigame, spriteRenderer, showGameplayBrief);
const race = new Race(racePanel, returnFromMinigame);
const audio = new AudioManager();
const music = new AdaptiveMusic();
music.setSamples(audio.samples);
audio.onSamplesLoaded = () => music.syncFileTrack();
let locale = save.get("language") || "es";
const savedEnvironmentMode = save.get("environmentMode");
let environmentMode = ["beige", "gray"].includes(savedEnvironmentMode) ? savedEnvironmentMode : "beige";
let desktopBlocked = false;
const input = new InputManager(window, canvas);
const physics = new PhysicsSystem({ gravity: GAME.gravity, worldBottom: GAME.height + 150 });

const savedCharacter = save.get("selectedCharacter");
let selected = savedCharacter === "vasti" ? "vasti" : "blue";
// Brisa is a rescue objective, never a playable character. Migrate old saves
// that may contain the previous mistaken "rosa" selection back to Gala.
if (savedCharacter !== selected) save.update({ selectedCharacter: selected });
let running = false;
let paused = false;
let explorationMode = false;
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
let hunterProjectiles = [];
let tacticalCombatEffects = [];
let venatosauruses = [];
let foodSources = [];
let wildlife = [];
let wildlifeJeepChases = [];
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
let rescuedFerrucutusCageIds = new Set();
let seenHunterSpawns = new Set();
let seenBossSpawns = new Set();
let collectibles = [];
let seenCollectibleSpawns = new Set();
let collectedCollectibleIds = new Set();
let pickupCueTimer = 0;
let pickupCueTitle = "";
let pickupCueMessage = "";
let bosses = [];
let activeBoss = null;
let bossCueTimer = 0;
let bossCueTitle = "";
let dashHitIds = new Set();
let dashDustClouds = [];
let particles = [];
let campaign = new CampaignManager();
let campaignPrologue = null;
let beta = null;
let autonomousCompanions = [];
let facilityConsoles = [];
let extractionX = null;
let campaignSaved = false;

const CAMPAIGN_AUTOSAVE_INTERVAL = 12;
const BASE_STEGOCERATOPS_COOLDOWN = 30;
const INTEL_STEGOCERATOPS_COOLDOWN = 24;
const AMBER_MAX_HEALTH_MILESTONE = 6;
const AMBER_BONUS_HEALTH = 1;
const rand = (min, max) => min + Math.random() * (max - min);
const level = () => campaignPrologue?.active
  ? LEVELS[1]
  : levelTransition?.phase === "exit"
    ? LEVELS[levelTransition.fromIndex]
    : [...LEVELS].reverse().find((item) => distance >= item.distance) || LEVELS[0];
const currentMusicTheme = () => campaignPrologue?.active ? "forest" : campaign.flags.completed ? "victory" : activeBoss ? "boss" : beta?.state === "following" ? "extraction" : level().musicTheme;
const best = () => Math.max(save.get("bestDistance"), Math.floor(distance));
const ui = (key) => uiText(key, locale);
const tr = (value) => translateText(value, locale);

function updateMinigamePreview() {
  const activeButton = hoveredMinigameButton || focusedMinigameButton;
  const previewSrc = activeButton ? minigamePreviewSources.get(activeButton) : null;
  const pageArtwork = activeStartMenuPage === "minigames"
    ? minigamesStartScreenArtwork
    : defaultStartScreenArtwork;
  const nextSrc = previewSrc || pageArtwork;

  if (startScreenArtwork && startScreenArtwork.getAttribute("src") !== nextSrc) {
    startScreenArtwork.src = nextSrc;
  }
  startScreenArtwork?.classList.toggle("is-minigame-preview", Boolean(previewSrc));
}

function advanceEnemyFades(delta) {
  for (const enemy of [...hunters, ...venatosauruses, ...bosses, ...foodSources.filter((food) => food.defeated)]) {
    advanceEnemyFade(enemy, delta);
  }
}

function addTacticalCombatEffect(type, x, y, facing = 1) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const duration = type === "muzzle" ? 0.13 : 0.24;
  tacticalCombatEffects.push({ type, x, y, facing, life: duration, max: duration, elapsed: 0 });
}

function advanceTacticalCombatEffects(delta) {
  for (const effect of tacticalCombatEffects) {
    effect.elapsed += delta;
    effect.life = Math.max(0, effect.life - delta);
  }
  tacticalCombatEffects = tacticalCombatEffects.filter((effect) => effect.life > 0);
}

function drawTacticalCombatEffects(context = ctx) {
  for (const effect of tacticalCombatEffects) {
    spriteRenderer.drawTacticalEffect(
      context, effect.type, effect.x - cameraX, effect.y, effect.elapsed,
      { alpha: effect.life / effect.max, facing: effect.facing }
    );
  }
}

const spriteFailures = new Set();

function drawSpriteSafely(key, draw) {
  try {
    return draw();
  } catch (error) {
    if (!spriteFailures.has(key)) {
      spriteFailures.add(key);
      console.warn("[Frantic Search] Sprite rendering failed; using the Canvas fallback:", key, error);
    }
    return false;
  }
}

function drawAnimatedSafely(...args) {
  const character = args[1] ?? "unknown";
  return drawSpriteSafely("animated:" + character, () => spriteRenderer.drawAnimated(...args));
}

function drawDino(x, y, width, height, color, kind, phase = 0, alpha = 1, facing = 1, actor = null) {
  if (drawSpriteSafely("dinosaur:" + kind, () =>
    spriteRenderer.drawDinosaur(ctx, kind, x, y, width, height, actor, phase, alpha)
  )) return;

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
  atmosphereRenderer.draw(ctx, {
    scene,
    environment: scene.environment,
    cameraX,
    viewportWidth: GAME.width,
    viewportHeight: GAME.height,
    groundY: GAME.groundY
  });
}




function drawFacilityProp(prop, context = ctx) {
  context.imageSmoothingEnabled = false;
  const view = { visibleLeft: cameraX - 50, visibleRight: cameraX + GAME.width + 50 };
  if (prop.kind === "security-fence") {
    const deck = art(SLICES.hazardDeck);
    if (deck) fillTiled(context, deck, prop.x, prop.y, prop.w, imageSize(deck)[1], view);
    return;
  }
  const wall = art(SLICES.greyBlock);
  if (wall) fillTiled(context, wall, prop.x, prop.y, prop.w, prop.h, view);
  const sign = art(prop.kind === "containment-wing" ? SLICES.radiationSign : SLICES.hazardSign);
  if (sign) context.drawImage(sign, Math.round(prop.x + 14), Math.round(prop.y + 14));
  if (prop.kind === "containment-wing") {
    context.fillStyle = "#d8f36a";
    context.font = "10px monospace";
    context.fillText(tr("CELL BLOCK C"), prop.x + 48, prop.y + prop.h - 28);
  }
}
function drawFacilityConsole(consoleEntity, context = ctx) {
  const sprite = art(consoleEntity.activated ? SLICES.computerOn : SLICES.computerOff);
  context.save();
  context.imageSmoothingEnabled = false;
  if (sprite) {
    const [width, height] = imageSize(sprite);
    context.drawImage(sprite, Math.round(consoleEntity.x + (consoleEntity.w - width) / 2), Math.round(consoleEntity.y + consoleEntity.h - height));
  }
  context.fillStyle = "#9aa69d";
  context.font = "8px monospace";
  context.fillText(locale === "es" ? (consoleEntity.kind === "power" ? "ENE" : "SEG") : (consoleEntity.kind === "power" ? "PWR" : "LOCK"), consoleEntity.x + 7, consoleEntity.y - 2);
  if (consoleEntity.activated) {
    context.fillStyle = "#d8f36a";
    context.font = "9px monospace";
    context.fillText(tr("ONLINE"), consoleEntity.x - 2, consoleEntity.y - 12);
  }
  context.restore();
}
function drawBrisaContainmentFrame(context, entity) {
  if (!entity || entity.state !== "confined") return;
  const x = entity.x;
  const y = entity.y;
  context.save();
  context.fillStyle = "#a3c9ba1b";
  roundedRect(context, x - 12, y - 12, entity.w + 24, entity.h + 15, 12);
  context.strokeStyle = "#9bb5ac";
  context.lineWidth = 3;
  context.strokeRect(x - 12, y - 12, entity.w + 24, entity.h + 15);
  context.restore();
}

function drawBrisa(entity) {
  if (!entity) return;
  const drawn = drawAnimatedSafely(
    ctx, "brisa", entity.x, entity.y, entity.w, entity.h,
    entity, elapsed, { facing: entity.facing }
  );
  if (!drawn) {
    drawDino(entity.x, entity.y, entity.w, entity.h, "#75a99b", "rosa", elapsed, 1, entity.facing ?? 1, entity);
  }
}

function drawExtractionMarker(x, context = ctx) {
  if (!Number.isFinite(x)) return;
  const unlocked = beta?.state === "following" || beta?.state === "extracted";
  const frame = unlocked ? PORTAL_FRAMES[3 + (Math.floor(elapsed * 6) % 3)] : PORTAL_FRAMES[0];
  const portal = art(SLICES[frame]);
  context.save();
  context.imageSmoothingEnabled = false;
  if (portal) {
    const [width, height] = imageSize(portal);
    context.drawImage(portal, Math.round(x + 99 - width / 2), GAME.groundY - height);
  }
  context.fillStyle = "#edf3e5";
  context.font = "11px monospace";
  context.textAlign = "center";
  context.fillText(tr(unlocked ? "EXTRACTION" : "EXIT LOCKED"), x + 99, GAME.groundY - 112);
  context.fillStyle = "#d8f36a";
  context.font = "8px monospace";
  context.fillText(tr("EAST GATE"), x + 99, GAME.groundY - 100);
  context.restore();
}
function drawObstacle(obstacle, context = ctx) {
  context.save();
  if (obstacle.type === "crate") {
    const variant = CRATE_VARIANTS[Math.abs(Math.round(obstacle.x / 52)) % CRATE_VARIANTS.length];
    const crate = art(SLICES[variant]);
    if (crate) {
      context.imageSmoothingEnabled = false;
      context.drawImage(crate, obstacle.x, obstacle.y, obstacle.w, obstacle.h);
    }
  } else if (obstacle.type === "hunter") {
    context.fillStyle = "#d1c5a0";
    context.fillRect(obstacle.x + 8, obstacle.y + 14, obstacle.w - 16, obstacle.h - 14);
    context.fillStyle = "#a8794f";
    context.fillRect(obstacle.x + obstacle.w / 2 - 9, obstacle.y, 18, 18);
    context.fillStyle = "#303a35";
    context.fillRect(obstacle.x + 5, obstacle.y + obstacle.h - 8, obstacle.w - 10, 8);
  } else {
    context.fillStyle = "#686f61";
    context.beginPath();
    context.moveTo(obstacle.x, obstacle.y + obstacle.h);
    context.lineTo(obstacle.x + obstacle.w * 0.08, obstacle.y + obstacle.h * 0.52);
    context.lineTo(obstacle.x + obstacle.w * 0.20, obstacle.y + 4);
    context.lineTo(obstacle.x + obstacle.w * 0.80, obstacle.y + 4);
    context.lineTo(obstacle.x + obstacle.w * 0.92, obstacle.y + obstacle.h * 0.48);
    context.lineTo(obstacle.x + obstacle.w, obstacle.y + obstacle.h);
    context.closePath();
    context.fill();
    context.fillStyle = "#929982";
    context.fillRect(obstacle.x + obstacle.w * 0.22, obstacle.y + 5, obstacle.w * 0.55, 5);
    context.fillStyle = "#4d584b";
    context.fillRect(obstacle.x + obstacle.w * 0.12, obstacle.y + obstacle.h * 0.72, obstacle.w * 0.27, 4);
    context.fillRect(obstacle.x + obstacle.w * 0.68, obstacle.y + obstacle.h * 0.64, obstacle.w * 0.19, 5);
    context.fillStyle = "#c0c0a0";
    context.fillRect(obstacle.x + obstacle.w * 0.32, obstacle.y + 9, obstacle.w * 0.20, 3);
  }
  context.restore();

}
function createDashDustCloud() {
  const direction = Math.sign(player.facing) || 1;
  const width = 205;
  const height = player.h + 14;
  const x = direction > 0 ? player.x - 135 : player.x + player.w - 70;
  const y = player.y - 6;
  const lifetime = 0.72;
  dashDustClouds.push({
    x, y, w: width, h: height,
    life: lifetime, max: lifetime,
    hitIds: new Set()
  });
  burst(x + width * 0.58, y + height * 0.72, "#c8bca1", 9);
}

function updateDashDust(delta) {
  for (const cloud of dashDustClouds) {
    cloud.life = Math.max(0, cloud.life - delta);
    if (cloud.life <= 0) continue;

    for (const enemy of venatosauruses) {
      if (
        enemy.defeated ||
        cloud.hitIds.has(enemy.id) ||
        !["pursuit", "windup", "attack"].includes(enemy.state)
      ) continue;

      // Venatosaurus head position follows its facing direction; only a face-level
      // contact with the dust plume interrupts an active pursuit.
      const faceX = enemy.x + enemy.w * (enemy.direction > 0 ? 0.82 : 0.18);
      const faceY = enemy.y + enemy.h * 0.34;
      const hitFace = faceX >= cloud.x && faceX <= cloud.x + cloud.w &&
        faceY >= cloud.y && faceY <= cloud.y + cloud.h;
      if (!hitFace) continue;

      cloud.hitIds.add(enemy.id);
      enemy.stun(2 + delta);
      burst(faceX, faceY, "#d7c8a7", 8);
    }
  }
  dashDustClouds = dashDustClouds.filter((cloud) => cloud.life > 0);
}

function drawDashDustCloud(cloud, context = ctx) {
  const fade = Math.max(0, Math.min(1, cloud.life / cloud.max));
  if (fade <= 0) return;
  const rise = (1 - fade) * 12;
  const puffs = [
    [0.10, 0.72, 0.15, 0.23], [0.27, 0.48, 0.17, 0.28],
    [0.46, 0.64, 0.19, 0.25], [0.63, 0.42, 0.16, 0.28],
    [0.80, 0.65, 0.16, 0.23], [0.94, 0.77, 0.10, 0.18]
  ];
  context.save();
  context.globalAlpha = fade * 0.68;
  puffs.forEach(([px, py, rx, ry], index) => {
    const width = Math.max(4, Math.round(cloud.w * rx * 0.82));
    const height = Math.max(3, Math.round(cloud.h * ry * 0.55));
    const x = Math.round(cloud.x + cloud.w * px - width / 2);
    const y = Math.round(cloud.y + cloud.h * py - rise - height / 2);
    context.fillStyle = index % 2 ? "#c0b397" : "#d9ccb0";
    context.fillRect(x, y, width, height);
    context.fillRect(x + Math.round(width * 0.2), y - 3, Math.max(3, Math.round(width * 0.5)), 3);
  });
  context.globalAlpha = fade * 0.56;
  context.fillStyle = "#e0d5bd";
  context.fillRect(cloud.x + cloud.w * 0.18, cloud.y + cloud.h * 0.52 - rise, 12, 5);
  context.fillRect(cloud.x + cloud.w * 0.68, cloud.y + cloud.h * 0.31 - rise, 9, 4);
  context.restore();
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


function drawWorldHealthBar(x, y, width, health, maxHealth = 3) {
  const barWidth = Math.max(1, Math.round(width));
  const ratio = maxHealth > 0 ? Math.max(0, Math.min(1, health / maxHealth)) : 0;
  ctx.save();
  ctx.fillStyle = "#101916";
  ctx.fillRect(Math.round(x), Math.round(y), barWidth, 4);
  ctx.fillStyle = "#4cdb70";
  ctx.fillRect(Math.round(x) + 1, Math.round(y) + 1, Math.round(Math.max(0, barWidth - 2) * ratio), 2);
  ctx.restore();
}

function drawReferenceHealthBar(actor, width = 36) {
  const definition = spriteRenderer.getReferenceConfig(actor.character, actor);
  const bounds = definition?.file ? spriteRenderer.referenceBounds.get(definition.file) : null;
  const spriteWidth = Math.max(1, Math.round(actor.w * (definition?.scale ?? 1)));
  const spriteHeight = bounds?.width > 0
    ? Math.max(1, Math.round(spriteWidth * bounds.height / bounds.width))
    : Math.max(1, Math.round(actor.h * 0.65));
  const spriteLeft = actor.x + actor.w / 2 - spriteWidth / 2;
  const spriteTop = actor.y + actor.h - spriteHeight;
  const sourceFacing = definition?.sourceFacing ?? 1;
  const facing = Math.sign(actor.direction ?? actor.facing ?? sourceFacing) || sourceFacing;
  // Health bars follow the actor's actual facing direction, not the source PNG's unflipped orientation.
  const headOffset = facing > 0 ? 0.82 : 0.18;
  const headCenterX = spriteLeft + spriteWidth * headOffset;
  const barWidth = Math.min(width, Math.max(26, Math.round(spriteWidth * 0.34)));
  drawWorldHealthBar(
    headCenterX - barWidth / 2,
    spriteTop - 5,
    barWidth,
    actor.health ?? 0,
    actor.maxHealth ?? 3
  );
}

function drawFerrucutus(ally) {
  const x = ally.x;
  const y = ally.y;
  if (!drawAnimatedSafely(ctx, "ferrucutus", x, y, ally.w, ally.h, ally, elapsed, { facing: ally.direction })) return;
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


function drawFerrucutusCageBack(context, captive) {
  const { x, y, w, h } = captive;
  const ground = captive.groundY;
  context.save();
  context.fillStyle = "#101918dd";
  context.fillRect(x + 5, ground - 24, w - 10, 21);
  context.fillStyle = "#1a2425";
  context.fillRect(x, y + 8, 8, h - 18);
  context.fillRect(x + w - 8, y + 8, 8, h - 18);
  context.fillRect(x + 4, y, w - 8, 10);
  context.fillRect(x + 4, ground - 18, w - 8, 8);
  context.restore();
}

function drawFerrucutusCageFront(context, captive) {
  const { x, y, w, h } = captive;
  const ground = captive.groundY;
  const frame = "#1a2425";
  const steel = "#71817e";
  const highlight = "#aeb8a4";
  context.save();
  context.fillStyle = steel;
  for (let barX = x + 13; barX < x + w - 8; barX += 27) {
    context.fillRect(barX, y + 10, 4, h - 30);
    context.fillStyle = highlight;
    context.fillRect(barX + 1, y + 12, 1, h - 34);
    context.fillStyle = steel;
  }
  context.fillStyle = frame;
  context.fillRect(x + 3, y + 34, w - 6, 5);
  context.fillRect(x + 3, y + 82, w - 6, 5);
  context.fillStyle = highlight;
  context.fillRect(x + 6, y + 10, w - 12, 2);
  context.fillRect(x + 6, ground - 16, w - 12, 2);
  context.fillStyle = "#202c2d";
  context.fillRect(x + w - 27, y + 42, 16, 25);
  context.fillStyle = "#e18a58";
  context.fillRect(x + w - 23, y + 47, 8, 5);
  context.fillStyle = "#d8f36a";
  context.fillRect(x + w - 21, y + 58, 4, 4);
  context.restore();
}

function drawHunter(hunter) {
  const x = hunter.x;
  const y = hunter.y;
  const alert = hunter.state === "investigate" || hunter.state === "windup" || hunter.state === "attack";
  const defeated = hunter.defeated;
  const alpha = getEnemyOpacity(hunter);

  const spriteDrawn = drawAnimatedSafely(ctx, "hunter", x - 6, y - 5, hunter.w + 12, hunter.h + 8, hunter, elapsed, {
    alpha,
    facing: hunter.direction
  });
  if (!spriteDrawn) {
    // Poachers have no supplied PNG reference, so keep their gameplay actors visible
    // with a crisp native-Canvas fallback while dinosaur PNGs load independently.
    const stride = Math.sin(elapsed * 10 + hunter.x * 0.045);
    ctx.save();
    ctx.globalAlpha *= alpha;
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
  }

  if (!defeated) {
    drawWorldHealthBar(x + 4, y - 7, 30, hunter.health, hunter.maxHealth);
  }

  if (hunter.state === "attack" && !defeated) {
    ctx.fillStyle = "#ff6a3d";
    ctx.beginPath();
    ctx.arc(hunter.direction > 0 ? x + hunter.w + 7 : x - 7, y + 31, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHunterProjectile(projectile, context = ctx) {
  const fade = Math.min(1, projectile.life / 0.18);
  context.save();
  context.globalAlpha = fade;
  context.shadowColor = "#ff1f2d";
  context.shadowBlur = 15;
  context.fillStyle = "#b81725";
  context.beginPath();
  context.arc(projectile.x, projectile.y, projectile.radius + 2, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = "#ff3644";
  context.beginPath();
  context.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#ffd5d5";
  context.beginPath();
  context.arc(projectile.x - projectile.radius * 0.32, projectile.y - projectile.radius * 0.34, projectile.radius * 0.28, 0, Math.PI * 2);
  context.fill();
  context.restore();

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
    foodSources.push(new LigocristusPrey({
      ...spawn,
      groundY: spawn.groundY ?? GAME.groundY,
      patrolStart: spawn.x - 125,
      patrolEnd: spawn.x + 165
    }));
  }

  for (const spawn of world.brontosaurusSpawns) {
    if (seenBrontosaurusSpawns.has(spawn.id)) continue;
    seenBrontosaurusSpawns.add(spawn.id);
    const animal = new Brontosaurus({
      ...spawn,
      groundY: spawn.groundY ?? GAME.groundY,
      patrolStart: spawn.patrolStart ?? spawn.x - 430,
      patrolEnd: spawn.patrolEnd ?? spawn.x + 650
    });
    wildlife.push(animal);
    if (spawn.jeepChase) {
      wildlifeJeepChases.push({
        id: "jeep-chase-" + animal.id,
        animalId: animal.id,
        x: animal.x - 720,
        elapsed: 0,
        duration: 8.5,
        phase: (String(animal.id).length % 7) * 0.7
      });
    }
  }
  for(const spawn of world.collectibleSpawns){
    if(seenCollectibleSpawns.has(spawn.id))continue;
    seenCollectibleSpawns.add(spawn.id);
    if(!collectedCollectibleIds.has(spawn.id))collectibles.push({...spawn});
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

function updateStegoceratopsHud() {
  if(!stegoceratopsStatusLabel)return;
  const ready=stegoceratopsCooldown<=0,upgrade=hasIntelSupportUpgrade();
  const status=ready?ui("abilityReady")+(upgrade?" · "+currentStegoceratopsCooldown()+"s":""):ui("cooldown")+" "+stegoceratopsCooldown.toFixed(1)+"s";
  stegoceratopsStatusLabel.textContent="STEGOCERATOPS [C] - "+status+(upgrade?" · "+ui("supportUpgrade"):"");
  stegoceratopsStatusLabel.classList.toggle("ready",ready);
}

function updatePlayerAbilityHud() {
  const controlledCharacter = player.character;
  if (abilityLabel) {
    const ready = player.abilityCooldown <= 0;
    const readyText = controlledCharacter === "vasti" ? ui("stompReady") : ui("dashReady");
    abilityLabel.textContent = ready ? readyText : ui("cooldown") + " " + player.abilityCooldown.toFixed(1) + "s";
    abilityLabel.classList.toggle("ready", ready);
  }
  if (controlsLabel) {
    const base = ui("controls");
    const action = controlledCharacter === "vasti"
      ? (locale === "es" ? "X: PISOTÓN" : "X: STOMP")
      : controlledCharacter === "rosa"
        ? (locale === "es" ? "X: ZARPAZO" : "X: POUNCE")
        : (locale === "es" ? "X: EMBESTIR" : "X: DASH");
    controlsLabel.textContent = base.replace(locale === "es" ? "X: EMBESTIR" : "X: DASH", action);
  }
}

function updatePlayerHealthHud() {
  if (!playerHealthMeter || !playerHealthFill) return;
  const maxHealth = Math.max(1, player.maxHealth ?? 3);
  const health = Math.max(0, Math.min(maxHealth, player.health ?? 0));
  const ratio = health / maxHealth;
  playerHealthFill.style.width = (ratio * 100) + "%";
  playerHealthMeter.setAttribute("aria-valuemax", String(maxHealth));
  playerHealthMeter.setAttribute("aria-valuenow", String(health));

  if (displayedPlayerHealthRatio !== null && ratio < displayedPlayerHealthRatio && playerHealthDamage) {
    const lostRatio = displayedPlayerHealthRatio - ratio;
    playerHealthDamage.style.left = (ratio * 100) + "%";
    playerHealthDamage.style.width = (lostRatio * 100) + "%";
    playerHealthDamage.classList.remove("is-fading");
    void playerHealthDamage.offsetWidth;
    playerHealthDamage.classList.add("is-fading");
  }
  displayedPlayerHealthRatio = ratio;
}

function tryEatFood(actor, radius = 150) {
  if (!actor || actor.health >= (actor.maxHealth ?? 3)) return false;
  const actorCenter = actor.x + actor.w / 2;
  const source = foodSources
    .filter((item) => !item.consumed && (item.kind !== "ligocristus" || item.defeated) && Math.abs(item.x + item.w / 2 - actorCenter) <= radius &&
      Math.abs((item.y + item.h) - (actor.y + actor.h)) < 125)
    .sort((a, b) => Math.abs(a.x - actor.x) - Math.abs(b.x - actor.x))[0];
  if (!source) return false;
  source.consume?.();
  source.consumed = true;
  actor.health = Math.min(actor.maxHealth ?? 5, actor.health + 1);
  actor.feedingTimer = 0.75;
  burst(source.x + source.w / 2, source.y + source.h / 2, "#9bd48a", 14);
  audio.collect();
  return true;
}

function collectedCount(type) {
  const prefix=type+"-";let count=0;
  for(const id of collectedCollectibleIds)if(id.startsWith(prefix))count+=1;
  return count;
}
function hasIntelSupportUpgrade(){return collectedCount("intel")>=COLLECTIBLE_TOTALS.intel;}
function currentStegoceratopsCooldown(){return hasIntelSupportUpgrade()?INTEL_STEGOCERATOPS_COOLDOWN:BASE_STEGOCERATOPS_COOLDOWN;}
function applyCollectibleUnlocks(){
  if(collectedCount("amber")>=AMBER_MAX_HEALTH_MILESTONE)player.maxHealth=Math.max(player.maxHealth,5+AMBER_BONUS_HEALTH);
  if(hasIntelSupportUpgrade())stegoceratopsCooldown=Math.min(stegoceratopsCooldown,INTEL_STEGOCERATOPS_COOLDOWN);
}
function showPickupNotice(titleKey,messageKey){pickupCueTitle=titleKey;pickupCueMessage=messageKey;pickupCueTimer=2.8;}
function collectNearbyCollectibles(){
  const bounds={x:player.x+12,y:player.y+8,w:Math.max(12,player.w-24),h:Math.max(12,player.h-16)};
  for(let index=collectibles.length-1;index>=0;index-=1){
    const item=collectibles[index],pickup={x:item.x-16,y:item.y-4,w:32,h:38};
    if(collectedCollectibleIds.has(item.id)||!CollisionSystem.overlaps(bounds,pickup))continue;
    const previousAmber=collectedCount("amber"),previousIntel=hasIntelSupportUpgrade();
    collectedCollectibleIds.add(item.id);collectibles.splice(index,1);
    if(item.type==="amber"){
      const healed=player.health<player.maxHealth;
      if(healed)player.health=Math.min(player.maxHealth,player.health+1);
      const count=collectedCount("amber");
      let message=healed?"healthRestored":"fieldSurveyProgress";
      if(count>=AMBER_MAX_HEALTH_MILESTONE&&previousAmber<AMBER_MAX_HEALTH_MILESTONE){
        player.maxHealth=Math.max(player.maxHealth,5+AMBER_BONUS_HEALTH);
        player.health=Math.min(player.maxHealth,player.health+1);
        message="maxHealthReward";
      }else if(count>=COLLECTIBLE_TOTALS.amber){player.health=player.maxHealth;message="fullSurveyReward";}
      showPickupNotice("amberSampleRecovered",message);
      burst(item.x,item.y+item.h/2,"#f3c36b",18);
    }else if(item.type==="intel"){
      showPickupNotice("intelDriveRecovered",!previousIntel&&hasIntelSupportUpgrade()?"supportUpgradeReward":"intelProgress");
      burst(item.x,item.y+item.h/2,"#79d9d2",20);
    }else if(item.type==="egg"){
      showPickupNotice("eggRecovered","");
      burst(item.x,item.y+item.h/2,"#f1d49a",22);
    }
    audio.collect();applyCollectibleUnlocks();updateCampaignHud();updatePlayerHealthHud();updateStegoceratopsHud();
  }
}
function drawFoodDrop(food, context = ctx) {
  const bob = Math.sin(elapsed * 4.2 + food.x * 0.013) * 2;
  const centerX = food.x + food.w / 2;
  const centerY = food.y + food.h / 2 + bob;

  context.save();
  context.translate(Math.round(centerX), Math.round(centerY));
  context.globalAlpha = 0.96;
  context.shadowBlur = 10;
  context.shadowColor = "#9bd48a";
  context.fillStyle = "rgba(155, 212, 138, 0.22)";
  context.beginPath();
  context.arc(0, 0, 18 + Math.sin(elapsed * 4.8 + food.x * 0.01) * 1.2, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;

  // Pixel-art meat on a bone, matching the game's chunky sprite language.
  context.fillStyle = "#1b2521";
  context.fillRect(-17, -8, 25, 16);
  context.fillRect(-13, -11, 18, 22);
  context.fillRect(7, -4, 10, 8);
  context.fillRect(14, -7, 6, 6);
  context.fillRect(14, 1, 6, 6);

  context.fillStyle = "#8f3c3d";
  context.fillRect(-15, -7, 20, 14);
  context.fillRect(-12, -9, 15, 18);
  context.fillRect(-17, -4, 24, 8);
  context.fillStyle = "#c86d59";
  context.fillRect(-10, -6, 8, 3);
  context.fillRect(-4, 2, 6, 2);
  context.fillStyle = "#eadfc1";
  context.fillRect(8, -2, 8, 4);
  context.fillRect(15, -5, 4, 4);
  context.fillRect(15, 1, 4, 4);
  context.fillStyle = "#fff4d8";
  context.fillRect(10, -1, 4, 2);
  context.restore();

}
function drawCollectible(context,item){
  const bob=Math.sin(elapsed*3.4+item.phase)*3,centerY=item.y+item.h/2+bob;
  const glow=item.type==="amber"?"#ffd36d":item.type==="egg"?"#f1d49a":"#68e4df";
  context.save();context.globalAlpha=.78+Math.sin(elapsed*5+item.phase)*.12;context.shadowBlur=12;
  context.shadowColor=glow;context.fillStyle=glow;
  context.beginPath();context.arc(item.x,centerY,15+Math.sin(elapsed*4+item.phase)*1.5,0,Math.PI*2);context.fill();context.shadowBlur=0;
  if(item.type==="amber"){
    context.fillStyle="#a85c28";context.beginPath();context.moveTo(item.x,centerY-12);context.lineTo(item.x+8,centerY-1);
    context.lineTo(item.x+3,centerY+12);context.lineTo(item.x-7,centerY+7);context.lineTo(item.x-9,centerY-5);context.closePath();context.fill();
    context.fillStyle="#fff0a8";context.fillRect(item.x-2,centerY-8,3,6);context.fillRect(item.x+3,centerY-1,3,4);
  }else if(item.type==="egg"){
    context.fillStyle="#fff5df";context.strokeStyle="#a7794d";context.lineWidth=2;
    context.beginPath();context.ellipse(item.x,centerY,7,11,0,0,Math.PI*2);context.fill();context.stroke();
    context.fillStyle="#d8a85d";context.fillRect(item.x-3,centerY-5,3,3);context.fillRect(item.x+1,centerY+1,3,3);
  }else{
    context.fillStyle="#143c4b";context.fillRect(item.x-10,centerY-8,20,17);
    context.strokeStyle="#dcffef";context.lineWidth=2;context.strokeRect(item.x-10,centerY-8,20,17);
    context.fillStyle="#aaf8e7";context.fillRect(item.x-4,centerY-3,8,3);context.fillRect(item.x-4,centerY+3,3,2);context.fillRect(item.x+2,centerY+3,3,2);
  }
  context.restore();
}
function drawPickupNotice(){
  if(pickupCueTimer<=0)return;
  ctx.save();
  ctx.globalAlpha=Math.min(1,pickupCueTimer*1.4);
  ctx.shadowColor="rgba(0,0,0,.9)";
  ctx.shadowBlur=4;
  ctx.textAlign="center";
  ctx.fillStyle="#fff1c7";ctx.font="11px monospace";ctx.fillText(ui(pickupCueTitle),GAME.width/2,482);
  ctx.fillStyle="#d8f3d8";ctx.font="9px monospace";ctx.fillText(ui(pickupCueMessage),GAME.width/2,498);
  ctx.restore();
}

function updateCampaignHud() {
  if (explorationMode) {
    if (campaignObjectiveLabel) campaignObjectiveLabel.textContent = ui("explorationObjective");
    if (campaignChapterLabel) campaignChapterLabel.textContent = ui("exploration");
    if (secondaryObjectivesLabel) secondaryObjectivesLabel.textContent = ui("explorationHint");
  } else {
    if (campaignObjectiveLabel) campaignObjectiveLabel.textContent = tr(campaign.objective);
    if (campaignChapterLabel) campaignChapterLabel.textContent = tr(campaign.chapter);
    if (secondaryObjectivesLabel) secondaryObjectivesLabel.textContent = ui("fieldSamples") + " " + collectedCount("amber") + "/" + COLLECTIBLE_TOTALS.amber +
      " · " + ui("intelFiles") + " " + collectedCount("intel") + "/" + COLLECTIBLE_TOTALS.intel;
  }
  if (rescuesLabel) rescuesLabel.textContent = String(rescues).padStart(2, "0");
}


function updatePrologueDistance(worldX) {
  if (!campaignPrologue) return;
  distance = Math.max(0, Math.floor(worldX - campaignPrologue.startX));
  if (distanceLabel) distanceLabel.textContent = String(distance).padStart(4, "0") + " m";
  if (bestLabel) bestLabel.textContent = String(Math.floor(best())).padStart(4, "0") + " m";
}

function beginCampaignPrologue() {
  // Brisa starts at 0 m beside Gala; the counter measures from their clearing.
  const prologue = new CampaignPrologue({ startX: GAME.playerX + 74 });
  campaignPrologue = prologue;
  campaign.chapter = "FOREST CLEARING";
  campaign.objective = "INVESTIGATE THE NOISE";
  distance = 0;

  player.setCharacter("rosa");
  player.x = prologue.startX - player.w / 2;
  player.y = GAME.groundY - player.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.facing = 1;
  player.state = "resting";
  player.motionSpeed = 0;

  prologue.violetaActor = new Player("blue", prologue.startX - 70 - 32, GAME.groundY);
  prologue.violetaActor.x = prologue.startX - 70 - prologue.violetaActor.w / 2;
  prologue.violetaActor.y = GAME.groundY - prologue.violetaActor.h + 5;
  prologue.violetaActor.state = "resting";
  prologue.violetaActor.motionSpeed = 0;
  player.animationState = null;
  campaign.beginPrologue();

  // Hunters remain off-screen until the jeep ambush starts at 2,000 m.
  prologue.hunters = [
    {
      id: "prologue-poacher-left", x: prologue.jeepX - 190, y: GAME.groundY - 68,
      w: 44, h: 68, health: 1, maxHealth: 1, state: "patrol", direction: 1, defeated: false
    },
    {
      id: "prologue-poacher-right", x: prologue.jeepX + 210, y: GAME.groundY - 68,
      w: 44, h: 68, health: 1, maxHealth: 1, state: "patrol", direction: -1, defeated: false
    }
  ];

  hunters = [];
  hunterProjectiles = [];
  venatosauruses = [];
  foodSources = [];
  wildlife = [];
  wildlifeJeepChases = [];
  ferrucutusCaptives = [];
  allies = [];
  autonomousCompanions = [];
  collectibles = [];
  bosses = [];
  activeBoss = null;
  stegoceratops = null;
  cameraX = 0;
  if (interactionHintLabel) interactionHintLabel.textContent = "";
  updateCampaignHud();
  updatePlayerAbilityHud();
  updatePrologueDistance(prologue.startX);
}

function beginPrologueSearch() {
  const prologue = campaignPrologue;
  if (!prologue?.active) return;

  // Brisa is now inside the poachers' jeep. Gala becomes the controlled
  // protagonist and follows the tracks from 2,000 m to the 2,500 m encounter.
  player = prologue.violetaActor;
  player.setCharacter("blue");
  player.x = prologue.captureX - player.w / 2;
  player.y = GAME.groundY - player.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.facing = 1;
  player.state = "running";
  player.motionSpeed = 0;
  player.animationState = null;
  player.animationTimer = 0;
  prologue.violetaActor = player;
  prologue.searchStartX = prologue.captureX;
  prologue.tracksFound = true;

  // Basilio is already locked in combat when Gala reaches the rocky opening.
  prologue.vastiActor = new Player("vasti", prologue.encounterX + 105, GAME.groundY);
  prologue.vastiActor.x = prologue.encounterX + 105 - prologue.vastiActor.w / 2;
  prologue.vastiActor.y = GAME.groundY - prologue.vastiActor.h;
  prologue.vastiActor.facing = -1;
  prologue.vastiActor.state = "attack";
  prologue.vastiActor.animationState = "stomp";

  const predatorOffsets = [85, 245];
  prologue.venatosauruses = PROLOGUE_VENATOSAURUS_KINDS.map((kind, index) => {
    const x = prologue.encounterX + predatorOffsets[index] - 56;
    const enemy = new WildDinosaur({
      id: "prologue-" + kind,
      kind,
      x,
      groundY: GAME.groundY,
      patrolStart: Math.max(prologue.fightStartX, x - 80),
      patrolEnd: Math.min(prologue.fightEndX, x + 150),
      direction: index === 0 ? -1 : 1
    });
    enemy.state = "attack";
    enemy.stateTimer = 0.8 + index * 0.2;
    return enemy;
  });

  campaign.chapter = "FOREST TRAIL";
  campaign.objective = "FOLLOW BRISA'S TRAIL";
  cameraX = Math.max(0, prologue.captureX - 360);
  updateCampaignHud();
  updatePlayerHealthHud();
  updatePlayerAbilityHud();
  audio.collect();
}

function beginPrologueFight() {
  const prologue = campaignPrologue;
  if (!prologue?.active || !prologue.beginFight(selected)) return;

  // The selection changes the player actor; the other protagonist becomes
  // an autonomous partner for the remainder of the campaign.
  player.setCharacter(selected);
  player.x = prologue.encounterX - player.w / 2;
  player.y = GAME.groundY - player.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.facing = 1;
  player.state = "running";
  player.motionSpeed = 0;
  player.animationState = null;
  player.health = Math.max(1, Math.min(player.maxHealth, player.health));
  player.maxSpeed = Math.min(player.maxSpeed, 190);

  const companionCharacter = selected === "blue" ? "vasti" : "blue";
  const companion = new AutonomousCompanion(
    companionCharacter,
    prologue.encounterX - 120,
    GAME.groundY,
    0
  );
  companion.actor.x = prologue.encounterX - 120 - companion.actor.w / 2;
  companion.actor.y = GAME.groundY - companion.actor.h;
  companion.actor.facing = 1;
  autonomousCompanions = [companion];

  prologue.companionActor = companion.actor;
  prologue.violetaActor = selected === "blue" ? player : companion.actor;
  prologue.vastiActor = selected === "vasti" ? player : companion.actor;
  prologue.predatorsDefeated = false;
  prologue.strikeShown = false;
  prologue.tutorial = {
    moved: false,
    jumped: false,
    abilityUsed: false,
    startCenter: prologue.encounterX
  };

  prologue.venatosauruses.forEach((enemy, index) => {
    enemy.health = 3;
    enemy.maxHealth = 3;
    enemy.defeated = false;
    enemy.state = "attack";
    enemy.stateTimer = 0;
    enemy.attackCooldown = 0.4 + index * 0.25;
  });

  dashHitIds = new Set();
  prologueCharacterSelectionPending = false;
  setCharacterSelectionModalOpen(false);
  dinoModal.classList.remove("prologue-selection");
  dinoModal.classList.add("hidden");
  cancelCharacterButton.hidden = false;
  characterConfirmation.classList.add("hidden");
  music.setDucked(false);
  campaign.chapter = "ROCKY OPENING";
  campaign.objective = "HELP BASILIO";
  cameraX = Math.max(0, prologue.encounterX - 360);
  updateCampaignHud();
  updatePlayerHealthHud();
  updatePlayerAbilityHud();
  audio.bossWarning();
}

function beginPrologueAdvance() {
  const prologue = campaignPrologue;
  if (!prologue?.active || !prologue.predatorsDefeated) return;

  player.x = prologue.fightEndX - player.w / 2;
  player.y = GAME.groundY - player.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.facing = 1;
  player.state = "running";
  player.motionSpeed = 170;
  player.animationState = null;

  for (const companion of autonomousCompanions) {
    companion.actor.x = prologue.fightEndX - 120 - companion.actor.w / 2;
    companion.actor.y = GAME.groundY - companion.actor.h;
    companion.actor.vx = 0;
    companion.actor.vy = 0;
    companion.actor.onGround = true;
    companion.actor.facing = 1;
    companion.actor.state = "running";
    companion.actor.motionSpeed = 170;
    companion.actor.animationState = null;
  }

  campaign.chapter = "FOREST ROUTE";
  campaign.objective = "REACH THE COASTAL HIGHWAY";
  cameraX = Math.max(0, prologue.fightEndX - 360);
  updateCampaignHud();
}

function finishCampaignPrologue() {
  if (!campaignPrologue || campaignPrologue.phase !== "complete") return;
  campaignPrologue = null;
  prologueCharacterSelectionPending = false;
  resetPlayer();
  campaign.begin();
  levelStartSnapshot = captureRestartSnapshot(0, 0);
  latestLevelCheckpoint = levelStartSnapshot;
  persistCampaignProgressSnapshot(levelStartSnapshot);
  distance = 0;
  cameraX = 0;
  if (distanceLabel) distanceLabel.textContent = "0000 m";
  if (bestLabel) bestLabel.textContent = String(Math.floor(best())).padStart(4, "0") + " m";
  updatePlayerHealthHud();
  updatePlayerAbilityHud();
  updateCampaignHud();
  renderStoryPanel();
  music.setTheme(currentMusicTheme());
  audio.setAmbient(currentMusicTheme());
  render();
  showGameplayBrief("campaign", null, LEVELS[0].name);
}

function damageProloguePredator(enemy, amount = 1) {
  if (!enemy || enemy.defeated) return false;
  const result = enemy.takeDamage(amount);
  if (!result.hit) return false;
  addTacticalCombatEffect("impact", enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.55, enemy.direction);
  audio.hit();
  burst(
    enemy.x + enemy.w / 2,
    enemy.y + enemy.h * 0.55,
    result.defeated ? "#9bd48a" : "#e8a77d",
    result.defeated ? 22 : 10
  );
  return true;
}

function applyPrologueShockwave(originX, originY, radius, amount) {
  const prologue = campaignPrologue;
  if (!prologue) return;
  for (const enemy of prologue.venatosauruses) {
    if (enemy.defeated) continue;
    const dx = Math.abs(enemy.x + enemy.w / 2 - originX);
    const dy = Math.abs(enemy.y + enemy.h - originY);
    if (dx <= radius && dy <= 112) damageProloguePredator(enemy, amount);
  }
}

function updatePrologueFight(delta) {
  const prologue = campaignPrologue;
  if (!prologue || prologue.phase !== "fight") return;

  player.update(delta, input);
  if (player.consumeJumpEvent()) {
    audio.jump();
    prologue.tutorial.jumped = true;
  }
  const abilityEvent = player.consumeAbilityEvent();
  if (abilityEvent) {
    prologue.tutorial.abilityUsed = true;
    if (abilityEvent === "dash") audio.dash();
  else if (abilityEvent === "stomp") audio.stomp();
    else if (abilityEvent === "slam") audio.hit();
  }

  const physicsResult = physics.step(player, delta, world.platformsNear(player.x));
  if (physicsResult.fell) {
    endGame();
    return;
  }

  const minimumX = prologue.fightStartX - player.w / 2;
  const maximumX = prologue.fightEndX - player.w / 2;
  player.x = Math.max(minimumX, Math.min(maximumX, player.x));
  const playerCenter = player.x + player.w / 2;
  if (Math.abs(playerCenter - prologue.tutorial.startCenter) >= 40) {
    prologue.tutorial.moved = true;
  }

  if (player.dashTimer > 0) {
    for (const enemy of prologue.venatosauruses) {
      if (!enemy.defeated && !dashHitIds.has(enemy.id) && CollisionSystem.bodyHit(player, enemy)) {
        damageProloguePredator(enemy, 1);
        dashHitIds.add(enemy.id);
      }
    }
  } else {
    dashHitIds.clear();
  }

  if (player.consumeShockwave()) {
    applyPrologueShockwave(player.x + player.w / 2, player.y + player.h, 190, 2);
  }

  for (const companion of autonomousCompanions) {
    const event = companion.update(
      delta,
      player,
      world,
      physics,
      prologue.venatosauruses
    );
    const companionMinX = prologue.fightStartX - companion.actor.w / 2;
    const companionMaxX = prologue.fightEndX - companion.actor.w / 2;
    companion.actor.x = Math.max(companionMinX, Math.min(companionMaxX, companion.actor.x));
    if (event?.type === "companion-strike" && !event.hunter.defeated) {
      damageProloguePredator(event.hunter, 1);
    } else if (event?.type === "companion-shockwave") {
      applyPrologueShockwave(event.x, event.y, event.radius, 1);
    }
  }

  const targets = [
    { target: player, kind: "protagonist" },
    ...autonomousCompanions.map((companion) => ({
      target: companion.actor,
      kind: "protagonist"
    }))
  ];
  for (const enemy of prologue.venatosauruses) {
    if (enemy.defeated) continue;
    const event = enemy.update(delta, targets);
    enemy.x = Math.max(
      prologue.fightStartX,
      Math.min(prologue.fightEndX - enemy.w, enemy.x)
    );
    if (event?.type === "attack") {
      if (event.target === player) {
        damagePlayer();
        if (!running || player.health <= 0) return;
      } else if (event.target && autonomousCompanions.some(
        (companion) => companion.actor === event.target
      )) {
        damageCompanion(event.target);
      }
    }
  }

  prologue.predatorsDefeated = prologue.venatosauruses.every((enemy) => enemy.defeated);
  updatePrologueDistance(playerCenter);
  cameraX = Math.max(0, playerCenter - 360);
  updatePlayerHealthHud();
  updatePlayerAbilityHud();

  const tutorialComplete = prologue.tutorial.moved &&
    prologue.tutorial.jumped && prologue.tutorial.abilityUsed;
  if (prologue.completeFight(distance, prologue.predatorsDefeated, tutorialComplete)) {
    campaign.chapter = "FOREST ROUTE";
    campaign.objective = "REACH THE COASTAL HIGHWAY";
    campaign.queueScene("prologue-alliance", "AN UNEXPECTED ALLY", [
      "The fight carries across the rocky clearing. Gala and Basilio work together against the Venatosaurus impavidus and Venatosaurus saevidicus, using their different strengths to keep the predators at bay.",
      "At 2,800 meters, both predators are defeated. Basilio agrees to help Gala follow the poachers' trail and bring Brisa home."
    ]);
    updateCampaignHud();
    renderStoryPanel();
  }
}

function updateCampaignPrologue(delta) {
  const prologue = campaignPrologue;
  if (!prologue?.active || prologueCharacterSelectionPending) return;
  elapsed += delta;

  if (prologue.phase === "rest") {
    const event = prologue.update(delta);
    if (event === "rest") {
      prologue.rosaAnimationStartedAt = elapsed;
      prologue.soundCueTimer = 3.2;
      campaign.objective = "INVESTIGATE THE NOISE";
      audio.collect();
      updateCampaignHud();
    }
    return;
  }

  if (prologue.phase === "explore") {
    prologue.soundCueTimer = Math.max(0, prologue.soundCueTimer - delta);
    player.update(delta, input);
    player.state = Math.abs(player.vx) > 30 ? "running" : "resting";
    if (player.consumeJumpEvent()) audio.jump();
    const abilityEvent = player.consumeAbilityEvent();
    if (abilityEvent === "pounce") audio.collect();
    const result = physics.step(player, delta, world.platformsNear(player.x));
    if (result.fell) {
      endGame();
      return;
    }

    player.x = Math.max(
      prologue.startX - player.w / 2,
      Math.min(prologue.captureX + player.w / 2, player.x)
    );
    player.vx = Math.max(-player.maxSpeed, Math.min(player.maxSpeed, player.vx));
    const playerCenter = player.x + player.w / 2;
    cameraX = Math.max(0, playerCenter - 330);
    updatePrologueDistance(playerCenter);

    // Crossing 2,000 m starts the jeep cinematic automatically.
    if (prologue.captureAtMilestone(player)) {
      player.animationState = "impact";
      player.animationTimer = 0.4;
      player.state = "stunned";
      cameraX = Math.max(0, prologue.jeepX - 330);
      updatePrologueDistance(prologue.captureX);
      audio.hit();
    }
    if (interactionHintLabel) interactionHintLabel.textContent = "";
    return;
  }

  if (prologue.phase === "capture") {
    const progress = prologue.progress;
    const center = prologue.captureX;
    prologue.hunters[0].x = prologue.jeepX - 190 + progress * 170;
    prologue.hunters[1].x = prologue.jeepX + 210 - progress * 138;
    prologue.hunters.forEach((hunter) => {
      hunter.state = progress > 0.25 ? "investigate" : "patrol";
      hunter.direction = hunter.x < center ? 1 : -1;
    });
    player.x = prologue.captureX - player.w / 2;
    player.facing = -1;
    player.vx = 0;
    player.animationState = progress < 0.64 ? "impact" : null;
    player.state = progress < 0.64 ? "stunned" : "resting";
    if (progress > 0.42) {
      prologue.violetaActor.animationState = "impact";
      prologue.violetaActor.state = "stunned";
    }
    if (progress > 0.72) prologue.rosaCaptured = true;
    prologue.violetaActor.x = prologue.startX - 70 - prologue.violetaActor.w / 2 +
      Math.max(0, progress - 0.68) * 74;
    prologue.violetaActor.motionSpeed = progress > 0.68 ? 90 : 0;
    prologue.jeepVisualX = prologue.jeepX + Math.max(0, progress - 0.7) * 250;
    cameraX = Math.max(0, prologue.jeepVisualX - 330);
    const event = prologue.update(delta);
    if (event === "capture") {
      prologue.violetaActor.state = "alert";
      prologue.violetaActor.animationState = null;
      campaign.objective = "FOLLOW BRISA'S TRAIL";
      campaign.queueScene("prologue-capture", "THE NOISE IN THE WOODS", [
        "At 2,000 meters, Brisa reaches a narrow service track and spots a lone poachers' jeep. No hunters are visible; the vehicle appears abandoned.",
        "As she approaches, two hunters burst from cover and cut off her way home. Brisa struggles, but they force her into the jeep and speed away. Gala wakes to the engine and follows the tracks."
      ]);
      updateCampaignHud();
      renderStoryPanel();
    }
    if (interactionHintLabel) interactionHintLabel.textContent = "";
    return;
  }

  if (prologue.phase === "search") {
    // This 500 m section is fully playable: Gala follows the tracks herself.
    player.update(delta, input);
    player.state = Math.abs(player.vx) > 30 ? "running" : "alert";
    if (player.consumeJumpEvent()) audio.jump();
    const abilityEvent = player.consumeAbilityEvent();
    if (abilityEvent === "dash") audio.dash();

    const result = physics.step(player, delta, world.platformsNear(player.x));
    if (result.fell) {
      endGame();
      return;
    }

    player.x = Math.max(
      prologue.searchStartX - player.w / 2,
      Math.min(prologue.trackX - player.w / 2, player.x)
    );
    player.motionSpeed = player.vx;
    player.facing = player.vx === 0 ? player.facing : Math.sign(player.vx);
    const playerCenter = player.x + player.w / 2;
    cameraX = Math.max(0, playerCenter - 330);
    updatePrologueDistance(playerCenter);

    if (prologue.reachEncounter(player)) {
      player.y = GAME.groundY - player.h;
      player.vx = 0;
      player.vy = 0;
      player.onGround = true;
      player.jumpCount = 0;
      player.state = "alert";
      player.motionSpeed = 0;
      player.animationState = null;
      player.animationTimer = 0;
      cameraX = Math.max(0, prologue.trackX - 360);
      updatePrologueDistance(prologue.trackX);

      campaign.chapter = "ROCKY OPENING";
      campaign.objective = "CHOOSE YOUR DINOSAUR";
      campaign.queueScene("prologue-tracks", "A FIGHT IN THE UNDERGROWTH", [
        "After following Brisa's tracks for 500 meters, Gala reaches a rocky opening at 2,500 meters. Basilio is already fighting two predators: a Venatosaurus impavidus and a Venatosaurus saevidicus.",
        "The two animals attack from different angles. Gala closes in to help Basilio, and the struggle spreads across the 2,200–2,800 meter clearing."
      ]);
      updateCampaignHud();
      renderStoryPanel();
    }
    if (interactionHintLabel) interactionHintLabel.textContent = "";
    return;
  }

  if (prologue.phase === "fight") {
    updatePrologueFight(delta);
    return;
  }

  if (prologue.phase === "advance") {
    const progress = prologue.progress;
    const leaderCenter = prologue.fightEndX +
      (prologue.levelOneX - prologue.fightEndX) * progress;
    player.x = leaderCenter - player.w / 2;
    player.y = GAME.groundY - player.h;
    player.vx = 170;
    player.vy = 0;
    player.onGround = true;
    player.state = "running";
    player.motionSpeed = 170;
    player.facing = 1;
    player.animationState = null;

    for (const companion of autonomousCompanions) {
      companion.actor.x = leaderCenter - 120 - companion.actor.w / 2;
      companion.actor.y = GAME.groundY - companion.actor.h;
      companion.actor.vx = 170;
      companion.actor.vy = 0;
      companion.actor.onGround = true;
      companion.actor.state = "running";
      companion.actor.motionSpeed = 170;
      companion.actor.facing = 1;
      companion.actor.animationState = null;
    }

    cameraX = Math.max(0, leaderCenter - 360);
    updatePrologueDistance(leaderCenter);
    const event = prologue.update(delta);
    if (event === "advance") finishCampaignPrologue();
  }
}

function drawJeep(x, y, { scale = 1, alpha = 1, label = "POACHER // 04" } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#172323";
  ctx.fillRect(4, 25, 154, 43);
  ctx.fillStyle = "#5d694f";
  ctx.fillRect(18, 6, 96, 34);
  ctx.fillStyle = "#8b9670";
  ctx.fillRect(25, 11, 38, 22);
  ctx.fillRect(68, 11, 37, 22);
  ctx.fillStyle = "#283d3b";
  ctx.fillRect(65, 8, 5, 32);
  ctx.fillStyle = "#c69b5d";
  ctx.fillRect(110, 25, 42, 43);
  ctx.fillStyle = "#e5bd73";
  ctx.fillRect(121, 32, 24, 5);
  ctx.fillStyle = "#d8b36d";
  ctx.fillRect(8, 41, 12, 8);
  ctx.fillRect(147, 41, 12, 8);
  for (const wheelX of [27, 119]) {
    ctx.fillStyle = "#101719";
    ctx.beginPath(); ctx.arc(wheelX, 68, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#718078";
    ctx.beginPath(); ctx.arc(wheelX, 68, 6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "#e6d5a1";
  ctx.font = "9px monospace";
  ctx.fillText(label, 27, -5);
  ctx.restore();
}

function drawPrologueJeep(x) {
  drawJeep(x, GAME.groundY - 78);
}

function drawWildlifeJeep(chase) {
  const sway = Math.sin(elapsed * 1.7 + chase.phase) * 5;
  drawJeep(chase.x + sway, GAME.groundY - 78, {
    scale: 0.78,
    alpha: 0.78,
    label: "POACHER"
  });
}

function updateWildlifeJeepChases(delta) {
  const active = [];
  for (const chase of wildlifeJeepChases) {
    const animal = wildlife.find((candidate) => candidate.id === chase.animalId);
    if (!animal || chase.elapsed >= chase.duration) continue;
    const inScene = animal.x + animal.w >= cameraX - 850 &&
      animal.x <= cameraX + GAME.width + 850;
    if (inScene) {
      chase.elapsed = Math.min(chase.duration, chase.elapsed + delta);
      const targetX = animal.x - 184;
      chase.x += (targetX - chase.x) * Math.min(1, delta * 0.72);
    }
    if (chase.elapsed < chase.duration) active.push(chase);
  }
  wildlifeJeepChases = active;
}

function drawPrologueTracks(prologue) {
  if (!["search", "tracks-dialog", "character-select", "fight", "alliance-dialog", "advance"].includes(prologue.phase)) return;
  const start = prologue.captureX + 10;
  const end = prologue.trackX + 28;
  ctx.save();
  ctx.strokeStyle = "#332d26";
  ctx.lineWidth = 7;
  ctx.globalAlpha = prologue.tracksFound ? 0.84 : 0.35;
  for (const offset of [-19, 19]) {
    ctx.beginPath();
    ctx.moveTo(start, GAME.groundY - 5 + offset);
    ctx.lineTo(end, GAME.groundY - 5 + offset);
    ctx.stroke();
  }
  ctx.strokeStyle = "#b5a17b";
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.36;
  for (let x = start + 14; x < end; x += 45) {
    ctx.beginPath();
    ctx.moveTo(x, GAME.groundY - 11);
    ctx.lineTo(x + 15, GAME.groundY + 1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCampaignPrologueActors() {
  const prologue = campaignPrologue;
  if (!prologue?.active) return;

  if (["rest", "explore", "capture", "capture-dialog"].includes(prologue.phase)) {
    // Keep the jeep completely out of view until Brisa reaches the 2,000 m
    // milestone. The hunters are revealed later during the ambush animation.
    if (["capture", "capture-dialog"].includes(prologue.phase)) {
      drawPrologueJeep(prologue.jeepVisualX ?? prologue.jeepX);
    }
    drawDino(
      prologue.violetaActor.x, prologue.violetaActor.y,
      prologue.violetaActor.w, prologue.violetaActor.h,
      "#75a99b", "blue", elapsed, 0.98, prologue.violetaActor.facing, prologue.violetaActor
    );
    if (prologue.phase === "rest") {
      ctx.fillStyle = "#f2e8c2";
      ctx.font = "12px monospace";
      ctx.fillText("Z", prologue.violetaActor.x + 65, prologue.violetaActor.y - 12);
      ctx.fillText("z", prologue.violetaActor.x + 77, prologue.violetaActor.y - 21);
      ctx.fillText("Z", player.x + 48, player.y - 10);
    } else if (prologue.phase === "explore" && prologue.soundCueTimer > 0) {
      ctx.fillStyle = "#f3c36b";
      ctx.font = "22px monospace";
      ctx.fillText("!", player.x + 48, player.y - 12);
    }
    const ambushIsVisible = prologue.phase === "capture-dialog" ||
      (prologue.phase === "capture" && prologue.progress >= 0.28);
    if (ambushIsVisible) {
      prologue.hunters.forEach((hunter) => drawHunter(hunter));
    }
  }

  drawPrologueTracks(prologue);
  if (["search", "tracks-dialog", "character-select"].includes(prologue.phase)) {
    if (prologue.rosaCaptured) {
      drawPrologueJeep(prologue.jeepVisualX ?? prologue.jeepX);
    }
    const actor = prologue.violetaActor;
    drawDino(actor.x, actor.y, actor.w, actor.h, "#75a99b", "blue", elapsed, 1, actor.facing, actor);
    if (prologue.vastiActor) {
      const vasti = prologue.vastiActor;
      drawDino(vasti.x, vasti.y, vasti.w, vasti.h, "#68784e", "vasti", elapsed, 1, vasti.facing, vasti);
    }
    for (const enemy of prologue.venatosauruses) {
      drawAnimatedSafely(
        ctx, enemy.kind, enemy.x, enemy.y, enemy.w, enemy.h,
        enemy, elapsed, { facing: enemy.direction, alpha: enemy.defeated ? 0.38 : 1 }
      );
      if (!enemy.defeated) drawReferenceHealthBar(enemy);
    }
  }

  if (["fight", "alliance-dialog", "advance"].includes(prologue.phase)) {
    const violeta = prologue.violetaActor;
    const vasti = prologue.vastiActor;
    drawDino(violeta.x, violeta.y, violeta.w, violeta.h, "#75a99b", "blue", elapsed, 1, violeta.facing, violeta);
    drawDino(vasti.x, vasti.y, vasti.w, vasti.h, "#68784e", "vasti", elapsed, 1, vasti.facing, vasti);
    if (prologue.phase !== "advance") {
      for (const enemy of prologue.venatosauruses) {
        drawAnimatedSafely(
          ctx, enemy.kind, enemy.x, enemy.y, enemy.w, enemy.h,
          enemy, elapsed, { facing: enemy.direction, alpha: enemy.defeated ? 0.38 : 1 }
        );
        if (!enemy.defeated) drawReferenceHealthBar(enemy);
      }
    }
  }
}

function drawCampaignPrologueCaption() {
  const prologue = campaignPrologue;
  if (!prologue?.active || campaign.sceneOpen) return;
  const captions = {
    rest: "prologueRest",
    explore: "prologueExplore",
    capture: "prologueCapture",
    search: "prologueSearch",
    fight: "prologueFight",
    advance: "prologueAdvance"
  };
  const key = captions[prologue.phase];
  if (!key) return;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.9)";
  ctx.shadowBlur = 4;
  ctx.fillStyle = "#edf3e5";
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  ctx.fillText(ui(key), GAME.width / 2, 41);
  ctx.textAlign = "start";
  ctx.restore();

  if (prologue.phase === "fight" && prologue.tutorial) {
    const tutorial = prologue.tutorial;
    const hint = !tutorial.moved ? ui("prologueTutorialMove")
      : !tutorial.jumped ? ui("prologueTutorialJump")
        : !tutorial.abilityUsed ? ui(selected === "vasti" ? "prologueTutorialStomp" : "prologueTutorialDash")
          : ui("prologueTutorialDefeat");
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.9)";
    ctx.shadowBlur = 4;
    ctx.fillStyle = "#edf3e5";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(hint, GAME.width / 2, GAME.height - 37);
    ctx.textAlign = "start";
    ctx.restore();
  }
}

function renderStoryPanel({ syncAudio = true } = {}) {
  if (!campaign.sceneOpen) {
    storyPanel?.classList.add("hidden");
    if (syncAudio) music.setDucked(false);
    return;
  }
  const scene = campaign.activeScene;
  const catalogCopy = scene ? getCampaignSceneCopy(scene.id, locale) : null;
  // Some runtime scenes are queued with their own title and lines instead of
  // a catalog entry. Always render that inline copy so an unknown scene ID
  // cannot leave campaign.sceneOpen blocking the game with no visible dialog.
  const copy = catalogCopy ?? (scene ? {
    title: translateText(scene.title, locale),
    lines: scene.lines.map((lineText) => translateText(lineText, locale))
  } : null);
  const line = copy?.lines[scene?.index];
  if (!scene || !line || !storyPanel) return;
  storyTitle.textContent = copy.title;
  storyText.textContent = line;
  storyProgress.textContent = (scene.index + 1) + " / " + copy.lines.length;
  storyNextButton.textContent = scene.index + 1 >= copy.lines.length ? ui("continue") : ui("next");
  storyPanel.classList.remove("hidden");
  if (syncAudio) music.setDucked(true);
}

function showCampaignEnding() {
  if (!campaign.flags.completed) return;
  failureScreenActive = false;
  overlayContent.hidden = false;
  retryOptions.classList.add("hidden");
  overlayExitButton.hidden = true;
  storyPanel?.classList.add("hidden");
  overlay.querySelector(".overlay-kicker").textContent = ui("operationComplete");
  overlay.querySelector("h2").innerHTML = locale === "es" ? "LA TRAJIMOS<br><em>A CASA.</em>" : "WE BROUGHT<br><em>HER HOME.</em>";
  overlay.querySelector("h2").hidden = false;
  overlay.querySelector("p").hidden = false;
  overlay.querySelector("p").textContent = ui("rescuedMessage");
  overlay.querySelector("button").textContent = ui("replay");
  overlay.querySelector("button").hidden = false;
  overlay.classList.remove("hidden");
  stateLabel.textContent = ui("missionComplete");
}

function advanceStory() {
  campaign.advanceScene();
  let requestPrologueCharacterSelection = false;
  if (!campaign.sceneOpen && campaignPrologue?.active) {
    const nextPhase = campaignPrologue.continueAfterNarration();
    if (nextPhase === "search") beginPrologueSearch();
    else if (nextPhase === "character-select") requestPrologueCharacterSelection = true;
    else if (nextPhase === "advance") beginPrologueAdvance();
    else if (nextPhase === "complete") finishCampaignPrologue();
  }
  renderStoryPanel();
  if (requestPrologueCharacterSelection) openPrologueCharacterSelection();
  if (!campaign.sceneOpen && campaign.flags.completed) {
    finalDeparture = true;
    finalDepartureDone = false;
    storyPanel?.classList.add("hidden");
  }
}

function interactWithFacility() {
  if (!explorationMode) {
  const captive = ferrucutusCaptives.find((entry) => entry.canInteract(player));
  if (captive && captive.rescue(player)) {
    rescuedFerrucutusCageIds.add(captive.id);
    ferrucutusCaptives = ferrucutusCaptives.filter((entry) => entry !== captive);
    rescues += 1;
    allies.push(new FerrucutusAlly({
      id: "rescued-" + captive.id,
      x: captive.x + 18,
      groundY: GAME.groundY
    }));
    audio.cageOpen();
    audio.rescue();
    burst(captive.x + captive.w / 2, captive.y + captive.h / 2, "#d8f36a", 26);
    updateCampaignHud();
    return true;
  }

  for (const terminal of facilityConsoles) {
    if (!terminal.canInteract(player)) continue;
    if (terminal.kind === "security" && !campaign.flags.powerRestored) {
      campaign.queueScene("security-terminal-locked", "SECURITY TERMINAL LOCKED", [
        "The security terminal has no auxiliary power. The power relay must be activated first."
      ]);
      renderStoryPanel();
      return true;
    }
    if (campaign.activateConsole(terminal.kind)) {
      terminal.activate();
      audio.terminal();
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
        "Brisa's cell remains sealed. Auxiliary power must be restored and the security lock disengaged before she can be freed."
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
  save.clearCampaignProgress();
  refreshContinueCampaignButton();
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
  addTacticalCombatEffect("impact", hunter.x + hunter.w / 2, hunter.y + hunter.h / 2, hunter.direction);
  if (result.defeated) {
    if (hunter instanceof WildDinosaur) {
      dropVenatosaurusFood(hunter, foodSources);
    } else {
      beginEnemyFade(hunter);
      foodSources.push({ id: "food-" + hunter.id, kind: "hunter", x: hunter.x + 2, y: hunter.y + hunter.h - 22, w: 54, h: 22, consumed: false });
    }
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

function resolveEnemyPitfall(enemy, delta) {
  const wasFalling = enemy.fellIntoPit;
  if (!world.resolveGroundPitfall(enemy, GAME.groundY, delta)) return false;

  if (!wasFalling) {
    burst(enemy.x + enemy.w / 2, GAME.groundY - 8, "#87966f", 8);
  }
  if (enemy.defeated && !enemy.pitfallFadeStarted) {
    enemy.pitfallFadeStarted = true;
    if (enemy instanceof WildDinosaur) dropVenatosaurusFood(enemy, foodSources);
    else beginEnemyFade(enemy);
  }
  return true;
}

function damageHunter(hunter, amount, source) {
  if (hunter.defeated) return;
  const result = hunter.takeDamage(amount);
  registerHunterResult(hunter, result);
  if (source === "blue-dash" && result.hit) {
    dashHitIds.add(hunter.id);
  }
}

function damageLigocristus(prey, amount = 1) {
  if (!prey || prey.defeated || prey.consumed) return;
  const result = prey.takeDamage(amount);
  if (!result.hit) return;
  addTacticalCombatEffect("impact", prey.x + prey.w / 2, prey.y + prey.h * 0.55, prey.direction);
  audio.hit();
  burst(prey.x + prey.w / 2, prey.y + prey.h * 0.55, result.defeated ? "#9bd48a" : "#e8a77d", result.defeated ? 18 : 8);
  if (result.defeated) dropLigocristusFood(prey, foodSources);
}

function damageVenatosaurus(enemy, amount = 1) {
  if (!enemy || enemy.defeated) return;
  const result = enemy.takeDamage(amount);
  if (!result.hit) return;
  addTacticalCombatEffect("impact", enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.55, enemy.direction);
  audio.hit();
  burst(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.55, result.defeated ? "#9bd48a" : "#e8a77d", result.defeated ? 22 : 10);
  if (result.defeated) dropVenatosaurusFood(enemy, foodSources);
}

function damagePlayer() {
  if (!player.takeHit()) return;
  addTacticalCombatEffect("impact", player.x + player.w / 2, player.y + player.h / 2, player.facing);
  updatePlayerHealthHud();
  audio.hit();
  burst(player.x + player.w / 2, player.y + player.h / 2, "#ed8e55", 15);
  if (player.health <= 0) endGame();
}

function damageCompanion(actor) {
  if (!actor?.takeHit?.()) return false;
  addTacticalCombatEffect("impact", actor.x + actor.w / 2, actor.y + actor.h / 2, actor.facing);
  audio.hit();
  burst(actor.x + actor.w / 2, actor.y + actor.h / 2, "#ed8e55", 12);
  return true;
}


function drawIndoraptor(boss) {
  const drawn=drawAnimatedSafely(ctx,"indoraptor",boss.x-4,boss.y-4,boss.w+8,boss.h+8,boss,elapsed,{alpha:getEnemyOpacity(boss),facing:boss.direction});
  if(!drawn)return;
  if(boss.state==="telegraph"){
    ctx.strokeStyle="#ff806c";ctx.lineWidth=3;ctx.setLineDash([7,6]);
    if(boss.attackName==="shadow-lunge")ctx.strokeRect(boss.direction>0?boss.x+boss.w-22:boss.x-154,boss.baseY+50,178,58);
    else{const w=boss.attackName==="pounce"?150:102;ctx.strokeRect(boss.direction>0?boss.x+boss.w-10:boss.x-w,boss.groundY-68,w,54);}
    ctx.setLineDash([]);
    const cue=boss.attackName==="pounce"?"POUNCE INCOMING":boss.attackName==="shadow-lunge"?"SHADOW LUNGE // JUMP":"CLAW STRIKE";
    ctx.fillStyle="#ff9b7e";ctx.font="11px monospace";ctx.fillText(tr(cue),boss.x-5,boss.y-18);
  }
}
function drawIndominus(boss) {
  const kind=boss.character??"indominus";
  const drawn=drawAnimatedSafely(ctx,kind,boss.x-4,boss.y-4,boss.w+8,boss.h+8,boss,elapsed,{alpha:getEnemyOpacity(boss),facing:boss.direction});
  if(!drawn)return;
  if(boss.state==="telegraph"){
    ctx.strokeStyle="#ffb26b";ctx.lineWidth=3;
    if(boss.attackName==="roar"){
      ctx.beginPath();ctx.ellipse(boss.x+boss.w/2,boss.groundY-4,boss.roarRadius*.55,18,0,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.ellipse(boss.x+boss.w/2,boss.groundY-4,boss.roarRadius,28,0,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle="#ffc078";ctx.font="11px monospace";ctx.fillText(tr("SONIC ROAR // JUMP"),boss.x+25,boss.y-18);
    }else if(boss.attackName==="stomp"){
      const sx=boss.direction>0?boss.x+boss.w-12:boss.x+12,ex=sx+boss.direction*(boss.phase===2?286:246);
      ctx.setLineDash([10,7]);
      for(let n=0;n<3;n++){ctx.beginPath();ctx.moveTo(sx,boss.groundY-10-n*7);ctx.lineTo(ex,boss.groundY-10-n*7);ctx.stroke();}
      ctx.setLineDash([]);ctx.fillStyle="#ffc078";ctx.font="11px monospace";ctx.fillText(tr("GROUND SHOCKWAVE // JUMP"),boss.x+20,boss.y-18);
    }else{
      ctx.setLineDash([9,6]);
      ctx.strokeRect(boss.attackName==="charge"?(boss.direction>0?boss.x+boss.w-10:boss.x-190):(boss.direction>0?boss.x-110:boss.x+boss.w-10),boss.groundY-106,boss.attackName==="charge"?190:120,84);
      ctx.setLineDash([]);ctx.fillStyle="#ffc078";ctx.font="11px monospace";ctx.fillText(tr(boss.attackName==="charge"?"CHARGE INCOMING":"TAIL SWEEP"),boss.x+20,boss.y-18);
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

function drawBossArenaBoundary(context = ctx) {
  if (!activeBoss || activeBoss.defeated) return;
  const beam = art(SLICES.laserBeam);
  if (!beam) return;
  const [beamWidth] = imageSize(beam);
  for (const boundaryX of [activeBoss.arenaMinX, activeBoss.arenaMaxX]) {
    context.save();
    context.imageSmoothingEnabled = false;
    context.globalAlpha = 0.72 + Math.sin(elapsed * 7) * 0.18;
    fillTiled(context, beam, Math.round(boundaryX - beamWidth / 2), GAME.groundY - 224, beamWidth, 224);
    context.restore();
  }
}
function drawBossHud() {
  if(activeBoss&&!activeBoss.defeated){
    const x=250,y=78,w=460,phaseTwo=activeBoss.phase===2;
    ctx.save();
    ctx.shadowColor="rgba(0,0,0,.9)";
    ctx.shadowBlur=4;
    ctx.fillStyle="#e8eee0";ctx.font="12px monospace";ctx.textAlign="center";
    ctx.fillText(tr(activeBoss.title||(activeBoss.kind==="indoraptor"?"MINIBOSS // INDORAPTOR":"MINIBOSS // INDOMINUS REX")),GAME.width/2,y-25);
    ctx.fillStyle=phaseTwo?"#ffb26b":"#d8f36a";ctx.font="9px monospace";
    ctx.fillText(tr(phaseTwo?"PHASE 2 // ENRAGED":"PHASE 1 // HUNTING"),GAME.width/2,y-12);
    ctx.shadowBlur=0;
    ctx.fillStyle="#35403a";ctx.fillRect(x,y,w,10);
    ctx.fillStyle="#4cdb70";ctx.fillRect(x,y,w*(activeBoss.health/activeBoss.maxHealth),10);
    ctx.fillStyle="#101716";ctx.fillRect(x+w/2-1,y-2,2,14);
    ctx.shadowBlur=4;
    ctx.fillStyle="#b9c4b8";ctx.font="9px monospace";
    ctx.fillText(locale==="es"?(activeBoss.formLabelEs??"EJEMPLAR"):(activeBoss.formLabel??"SPECIMEN"),GAME.width/2,y+25);
    const status=activeBoss.isVulnerable?(activeBoss.lastAttackMissed?"DODGE SUCCESSFUL // COUNTER NOW":"ATTACK WINDOW // EXPOSED"):activeBoss.state==="telegraph"?"READ THE TELEGRAPH":activeBoss.state==="attacking"?"DODGE THE ATTACK":"WAIT FOR ITS RECOVERY";
    ctx.fillStyle=activeBoss.isVulnerable?"#d8f36a":"#a5b0a5";ctx.font="8px monospace";ctx.fillText(tr(status),GAME.width/2,y+37);
    ctx.restore();
  }
  if(bossCueTimer>0){
    ctx.save();
    ctx.globalAlpha=Math.min(1,bossCueTimer*1.5);
    ctx.shadowColor="rgba(0,0,0,.9)";ctx.shadowBlur=5;
    ctx.fillStyle="#d8f36a";ctx.font="11px monospace";ctx.textAlign="center";ctx.fillText(tr("APEX THREAT DETECTED"),GAME.width/2,211);
    ctx.fillStyle="#f0f2e9";ctx.font="29px sans-serif";ctx.fillText(bossCueTitle,GAME.width/2,249);
    ctx.restore();
  }
}
function syncBossEncounter() {
  if (activeBoss) return;

  for (const spawn of world.bossSpawns) {
    if (seenBossSpawns.has(spawn.id) || player.x < spawn.x - BOSS_ARENA_HALF_WIDTH - 20) continue;

    seenBossSpawns.add(spawn.id);
    const BossType = spawn.kind === "indoraptor" ? IndoraptorBoss : IndominusRexBoss;
    const boss = new BossType({
      ...spawn,
      x: spawn.x + (spawn.kind === "indominus" ? 90 : 45),
      groundY: GAME.groundY,
      arenaMinX: spawn.x - BOSS_ARENA_HALF_WIDTH,
      arenaMaxX: spawn.x + BOSS_ARENA_HALF_WIDTH
    });
    boss.activate();
    bosses.push(boss);
    activeBoss = boss;
    bossCueTitle = boss.title || (spawn.kind === "indoraptor" ? "INDORAPTOR" : "INDOMINUS REX");
    bossCueTimer = 2.8;
    audio.bossWarning();
    break;
  }
}

function damageBoss(boss, amount, source) {
  if (!boss || boss.defeated) return;
  const result = boss.takeDamage(amount);
  if (!result.hit) return;

  addTacticalCombatEffect("impact", boss.x + boss.w / 2, boss.y + boss.h * 0.52, boss.direction);
  audio.bossHit();
  burst(
    boss.x + boss.w / 2,
    boss.y + boss.h * 0.52,
    result.defeated ? "#d8f36a" : "#ff9877",
    result.defeated ? 34 : 15
  );

  if (result.phaseChanged) {
    bossCueTitle = locale === "es" ? "COMBATE INTENSIFICADO" : "COMBAT INTENSIFIES";
    bossCueTimer = 1.8;
    audio.bossWarning();
  }

  if (result.defeated) {
    beginEnemyFade(boss);
    bossCueTitle = boss.title || (boss.kind === "indoraptor" ? "INDORAPTOR DEFEATED" : "INDOMINUS DEFEATED");
    bossCueTimer = 2.4;
    audio.bossDefeat();
    if (!explorationMode) {
      campaign.onBossDefeated(boss.kind, boss.id);
      renderStoryPanel();
    }
    updateCampaignHud();
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
  for (const prey of foodSources) {
    if (prey.kind === "ligocristus" && !prey.defeated &&
        Math.abs(prey.x + prey.w / 2 - (player.x + player.w / 2)) < radius) damageLigocristus(prey, 2);
  }
  const bossGrounded=activeBoss&&Math.abs(activeBoss.y+activeBoss.h-GAME.groundY)<=42;
  if(bossGrounded&&Math.abs(activeBoss.x+activeBoss.w/2-(player.x+player.w/2))<radius+Math.max(80,activeBoss.w*.45)){
    damageBoss(activeBoss,2,"vasti-shockwave");
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
    player.x += speed * delta; player.vx = speed; player.facing = 1; player.animationState = null; player.animationTimer = 0;
    for (const companion of autonomousCompanions) { companion.actor.x += speed * delta; companion.actor.vx = speed; companion.actor.facing = 1; companion.actor.animationState = null; companion.actor.animationTimer = 0; }
    for (const ally of allies) { ally.x += speed * delta; ally.motionSpeed = speed; ally.direction = 1; }
    if (beta?.state === "following") { beta.x += speed * delta; beta.motionSpeed = speed; beta.facing = 1; }
    const protagonistsOffscreen = player.x - levelTransition.cameraX > GAME.width + 130 &&
      autonomousCompanions.every((companion) => companion.actor.x - levelTransition.cameraX > GAME.width + 130);
    const alliesOffscreen = allies.every((ally) => ally.x + ally.w - levelTransition.cameraX > GAME.width + 100);
    const rosaOffscreen = !beta || beta.state !== "following" || beta.x - levelTransition.cameraX > GAME.width + 130;
    if (protagonistsOffscreen && alliesOffscreen && rosaOffscreen) {
      const baseX = GAME.playerX + levelTransition.nextDistance;
      player.x = baseX - 190;
      for (const companion of autonomousCompanions) companion.actor.x = baseX - 310;
      if (beta?.state === "following") { beta.x = baseX - beta.followDistance - 142; beta.y = player.y + player.h - beta.h; }
      cameraX = Math.max(0, baseX - 330);
      levelTransition.phase = "enter";
    }
    return;
  }
  const baseX = GAME.playerX + levelTransition.nextDistance;
  player.x = Math.min(baseX, player.x + speed * delta); player.vx = speed; player.facing = 1; player.animationState = null; player.animationTimer = 0;
  for (const companion of autonomousCompanions) { companion.actor.x = Math.min(baseX - 116, companion.actor.x + speed * delta); companion.actor.vx = speed; companion.actor.facing = 1; companion.actor.animationState = null; companion.actor.animationTimer = 0; }
  for (const ally of allies) { ally.x += speed * delta; ally.motionSpeed = speed; ally.direction = 1; }
  if (beta?.state === "following") { beta.x = Math.min(baseX - beta.followDistance, beta.x + speed * delta); beta.motionSpeed = speed; beta.facing = 1; }
  if (player.x >= baseX && autonomousCompanions.every((companion) => companion.actor.x >= baseX - 116)) {
    player.x = baseX; player.vx = 0;
    for (const companion of autonomousCompanions) { companion.actor.x = baseX - 116; companion.actor.vx = 0; }
    if (beta?.state === "following") { beta.x = baseX - beta.followDistance; beta.motionSpeed = 0; }
    allies = allies.filter((ally) => ally.x + ally.w < cameraX + GAME.width + 100);
    const enteredLevelIndex = levelTransition.nextIndex;
    distance = levelTransition.nextDistance;
    levelTransition = null;
    saveLevelEntrySnapshot(enteredLevelIndex);
    if (!explorationMode) showGameplayBrief("campaign", null, LEVELS[enteredLevelIndex].name);
  }
}

function activateStegoceratops() {
  if(stegoceratops||stegoceratopsCooldown>0||!running||campaign.flags.completed)return false;
  stegoceratopsCooldown=currentStegoceratopsCooldown();
  const stegoSize = getDinosaurHitbox("stegoceratops");
  stegoceratops = { id: "stegoceratops-special", x: cameraX - stegoSize.w - 20, y: GAME.groundY - stegoSize.h, w: stegoSize.w, h: stegoSize.h, direction: 1, state: "charge", hitIds: new Set() };
  audio.stegoCharge();
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
  if (!running || paused || prologueCharacterSelectionPending || (!explorationMode && campaign.sceneOpen)) return;
  if (campaignPrologue?.active) {
    updateCampaignPrologue(delta);
    return;
  }
  elapsed += delta;
  advanceTacticalCombatEffects(delta);
  bossCueTimer = Math.max(0, bossCueTimer - delta);
  pickupCueTimer = Math.max(0, pickupCueTimer - delta);
  world.update(delta);

  if (finalDeparture) {
    const speed = 265;
    player.x += speed * delta; player.vx = speed; player.facing = 1; player.animationState = null; player.animationTimer = 0;
    for (const companion of autonomousCompanions) { companion.actor.x += speed * delta; companion.actor.vx = speed; companion.actor.facing = 1; companion.actor.animationState = null; companion.actor.animationTimer = 0; }
    for (const ally of allies) { ally.x += speed * delta; ally.motionSpeed = speed; ally.direction = 1; }
    if (beta) { beta.x += speed * delta; beta.motionSpeed = speed; beta.facing = 1; }
    const protagonistsOffscreen = player.x - cameraX > GAME.width + 150 &&
      autonomousCompanions.every((companion) => companion.actor.x - cameraX > GAME.width + 150);
    const rosaOffscreen = !beta || beta.x - cameraX > GAME.width + 150;
    const alliesOffscreen = allies.every((ally) => ally.x + ally.w - cameraX > GAME.width + 100);
    if (protagonistsOffscreen && rosaOffscreen && alliesOffscreen) {
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
    player.x = Math.min(GAME.playerX, player.x + 230 * delta); player.vx = 230; player.facing = 1; player.animationState = null; player.animationTimer = 0;
    for (const companion of autonomousCompanions) { companion.actor.x = Math.min(GAME.playerX - 116, companion.actor.x + 230 * delta); companion.actor.vx = 230; companion.actor.facing = 1; companion.actor.animationState = null; companion.actor.animationTimer = 0; }
    if (player.x >= GAME.playerX && autonomousCompanions.every((companion) => companion.actor.x >= GAME.playerX - 116)) {
      player.x = GAME.playerX; player.vx = 0;
      for (const companion of autonomousCompanions) { companion.actor.x = GAME.playerX - 116; companion.actor.vx = 0; }
      introSequence = false;
    }
    return;
  }
  player.update(delta, input);
  if (input.consume("special")) activateStegoceratops();
  const jumped = player.consumeJumpEvent();
  if (jumped) audio.jump();
  if (player.brontosaurusRide && jumped) player.brontosaurusRide = null;
  const abilityEvent = player.consumeAbilityEvent();
  if (abilityEvent === "dash") {
    dashHitIds.clear();
    createDashDustCloud();
  }
  if (abilityEvent === "dash") audio.dash();
    else if (abilityEvent === "stomp") audio.stomp();
  if (abilityEvent === "slam") audio.hit();

  const brontosaurusBacks = createBrontosaurusBackPlatforms(wildlife, selected);
  const wasFalling = !player.onGround && player.vy >= 0;
  const physicsResult = player.brontosaurusRide
    ? { fell: player.y > 760, landed: false }
    : physics.step(player, delta, [...world.platformsNear(player.x), ...brontosaurusBacks]);
  if (!player.brontosaurusRide && wasFalling && physicsResult.landed) {
    const landedBack = brontosaurusBacks.find((platform) =>
      Math.abs(player.y + player.h - platform.y) <= 1 &&
      player.x + player.w > platform.x && player.x < platform.x + platform.w
    );
    if (landedBack) startBrontosaurusRide(player, landedBack.animal);
  }
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

  if (beta?.state === "confined" && player.x + player.w > beta.x + 10) {
    player.x = beta.x - player.w + 10;
    player.vx = Math.min(0, player.vx);
  }

  world.extendTo(player.x + WORLD.maxSectionLength + 1200);
  if (!explorationMode) world.pruneBehind(player.x);
  syncEncounters();
  syncBossEncounter();
  syncFacility();
  music.setTheme(currentMusicTheme());
  audio.setAmbient(currentMusicTheme());
  distance = explorationMode ? player.x - GAME.playerX : Math.max(0, player.x - GAME.playerX);
  if (!explorationMode) campaign.updateLocation(player.x);
  updateCampaignHud();
  if (!explorationMode && campaign.sceneOpen) {
    distanceLabel.textContent = Math.floor(distance).toString().padStart(4, "0") + " m";
    bestLabel.textContent = Math.floor(best()).toString().padStart(4, "0") + " m";
    renderStoryPanel();
    return;
  }
  if (input.consume("interact")) {
    interactWithFacility();
    if (campaign.sceneOpen) return;
  }
  cameraX = Math.max(0, player.x - 330);
  const currentLevelIndex = LEVELS.reduce((current, item, index) => distance >= item.distance ? index : current, 0);
  if (!explorationMode && currentLevelIndex > lastLevelIndex && currentLevelIndex < LEVELS.length) {
    const nextDistance = LEVELS[currentLevelIndex].distance;
    player.x = GAME.playerX + nextDistance;
    distance = nextDistance;
    cameraX = Math.max(0, player.x - 330);
    if (beta?.state === "following") beta.x = player.x - beta.followDistance;
    levelTransition = { phase: "exit", fromIndex: lastLevelIndex, nextIndex: currentLevelIndex, nextDistance, cameraX };
    lastLevelIndex = currentLevelIndex;
    return;
  }

  collectNearbyCollectibles();

  for (const hunter of hunters) {
    const previousState = hunter.state;
    const hunterEvent = hunter.update(delta, player);
    if (resolveEnemyPitfall(hunter, delta)) continue;
    if (previousState !== hunter.state && (hunter.state === "investigate" || hunter.state === "windup")) audio.collect();
    if (hunterEvent?.type === "shoot") {
      hunterProjectiles.push(new HunterProjectile(hunterEvent.projectile));
      addTacticalCombatEffect("muzzle", hunterEvent.projectile.x, hunterEvent.projectile.y, hunter.direction);
    }

    if (
      player.dashTimer > 0 &&
      !hunter.defeated &&
      !dashHitIds.has(hunter.id) &&
      CollisionSystem.bodyHit(player, hunter)
    ) {
      damageHunter(hunter, 1, "blue-dash");
    }
  }

  const projectileTargets = [
    { entity: player, kind: "player" },
    ...autonomousCompanions.map((companion) => ({ entity: companion.actor, kind: "companion" })),
    ...venatosauruses.filter((enemy) => !enemy.defeated).map((enemy) => ({ entity: enemy, kind: "wild-dinosaur" })),
    ...(activeBoss && !activeBoss.defeated ? [{ entity: activeBoss, kind: "boss" }] : [])
  ];
  for (const projectile of hunterProjectiles) {
    projectile.update(delta);
    if (!projectile.active) continue;
    const hit = projectileTargets.find(({ entity }) => CollisionSystem.projectileHit(projectile, entity));
    if (!hit) continue;
    projectile.active = false;

    if (hit.kind === "player") damagePlayer();
    else if (hit.kind === "companion") damageCompanion(hit.entity);
    else if (hit.kind === "wild-dinosaur") damageVenatosaurus(hit.entity, projectile.damage);
    else if (hit.kind === "boss") damageBoss(hit.entity, projectile.damage, "hunter-projectile");

    if (!running || player.health <= 0) return;
  }
  hunterProjectiles = hunterProjectiles.filter((projectile) => projectile.active);

  updateDashDust(delta);

  for (const enemy of venatosauruses) {
    const targets = [
      { target: player, kind: "protagonist" },
      ...autonomousCompanions.map((companion) => ({ target: companion.actor, kind: "protagonist" })),
      ...venatosauruses.filter((other) => other !== enemy && !other.defeated).map((other) => ({ target: other, kind: "venatosaurus" })),
      ...foodSources.filter((prey) => prey.kind === "ligocristus" && !prey.defeated && !prey.consumed).map((prey) => ({ target: prey, kind: "ligocristus" }))
    ];
    const event = enemy.update(delta, targets);
    if (resolveEnemyPitfall(enemy, delta)) continue;
    if (event?.type === "attack") {
      if (event.target === player) { damagePlayer(); if (player.health <= 0) return; }
      else if (venatosauruses.includes(event.target)) damageVenatosaurus(event.target, 1);
      else if (foodSources.includes(event.target) && event.target.kind === "ligocristus") damageLigocristus(event.target, 1);
      else if (event.target?.takeHit?.()) { audio.hit(); burst(event.target.x + event.target.w / 2, event.target.y + event.target.h / 2, "#ed8e55", 10); }
    }
    if (!enemy.defeated) tryEatFood(enemy);
    if (player.dashTimer > 0 && !enemy.defeated && !dashHitIds.has(enemy.id) && CollisionSystem.bodyHit(player, enemy)) {
      damageVenatosaurus(enemy, 1);
      dashHitIds.add(enemy.id);
    }
  }

  if (player.dashTimer > 0) {
    for (const prey of foodSources) {
      if (prey.kind !== "ligocristus" || prey.defeated || prey.consumed || dashHitIds.has(prey.id)) continue;
      if (CollisionSystem.bodyHit(player, prey)) {
        damageLigocristus(prey, 1);
        dashHitIds.add(prey.id);
      }
    }
  }

  const preyThreats = [
    player,
    ...autonomousCompanions.map((companion) => companion.actor),
    ...venatosauruses.filter((enemy) => !enemy.defeated)
  ];
  for (const source of foodSources) source.update?.(delta, preyThreats);
  for (const animal of wildlife) {
    const previousX = animal.x;
    animal.update(delta, venatosauruses);
    if (player.brontosaurusRide?.animalId === animal.id) {
      updateBrontosaurusRide(player, animal, delta, previousX);
    }
  }
  updateWildlifeJeepChases(delta);

  for (const companion of autonomousCompanions) {
    tryEatFood(companion.actor);
    const event = companion.update(delta, player, world, physics, [...hunters, ...venatosauruses], activeBoss);
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

  if (activeBoss) tryEatFood(activeBoss);
  updateStegoceratops(delta);

  for (const ally of allies) {
    const event = ally.update(delta, player, world, [...hunters, ...venatosauruses], activeBoss);
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

  advanceEnemyFades(delta);
  allies = allies.filter((ally) => !ally.departed);
  foodSources = foodSources.filter((food) => !food.consumed && food.x + food.w >= cameraX - 1100 &&
    !(food.defeated && isEnemyFadeComplete(food)));
  // Defeated Venatosaurus remain as faint carcasses; only camera pruning removes them.
  venatosauruses = venatosauruses.filter((enemy) =>
    enemy.x + enemy.w >= cameraX - 1100 &&
    (enemy.retainDefeatedRemains || !isEnemyFadeComplete(enemy))
  );
  wildlife = wildlife.filter((animal) => animal.x + animal.w >= cameraX - 500);
  ferrucutusCaptives = ferrucutusCaptives.filter((captive) => captive.x + captive.w >= cameraX - 900);
  hunters = hunters.filter((hunter) => hunter.x + hunter.w >= cameraX - 1100 && !isEnemyFadeComplete(hunter));
  const rosaEvent = beta?.update(delta, player, world);
  if (rosaEvent?.type === "rosa-crate-break") {
    audio.collect();
    for (const crate of rosaEvent.obstacles) {
      burst(crate.x + crate.w / 2, crate.y + crate.h / 2, "#d6a45f", 14);
    }
  }
  bosses = bosses.filter((boss) => (boss.x + boss.w >= cameraX - 850 || boss === activeBoss) && !isEnemyFadeComplete(boss));
  pruneEncounterBookkeeping();
  if (player.dashTimer <= 0) dashHitIds.clear();
  handleAbilityImpact();

  for (const obstacle of world.obstacles) {
    if (
      CollisionSystem.obstacleDamagesDinosaur(obstacle) &&
      CollisionSystem.obstacleHit(player, obstacle)
    ) {
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
  updatePlayerHealthHud();
  updatePlayerAbilityHud();
  updateStegoceratopsHud();
  if (beta?.state === "following" && extractionX && player.x >= extractionX && beta.x >= extractionX - 220) {
    finishCampaign();
  }
  if (interactionHintLabel) {
    const nearbyConsole = facilityConsoles.find((terminal) => terminal.canInteract(player));
    const nearBeta = beta && beta.state === "confined" && Math.abs(player.x - beta.x) < 112;
    const nearFerrucutus = ferrucutusCaptives.some((captive) => captive.canInteract(player));
    const canInteract = Boolean(nearbyConsole || nearBeta || nearFerrucutus);
    interactionHintLabel.textContent = canInteract
      ? ui("interact")
      : beta?.state === "following" ? "BRISA // " + ui("escorting") : "";
  }
  updateLevelCheckpoint();
  updateCampaignAutosave(delta);
}

function render() {
  drawBackground();
  ctx.save();
  ctx.translate(-Math.round(cameraX), 0);
  for (const chase of wildlifeJeepChases) {
    if (chase.x + 160 >= cameraX - 120 && chase.x <= cameraX + GAME.width + 120) {
      drawWildlifeJeep(chase);
    }
  }
  for (const animal of wildlife) {
    if (animal.x + animal.w >= cameraX - 120 && animal.x <= cameraX + GAME.width + 120) {
      drawAnimatedSafely(ctx, "brontosaurus", animal.x, animal.y, animal.w, animal.h, animal, elapsed, { alpha: 0.9, facing: animal.facing });
    }
  }
  terrainRenderer.drawPlatforms(ctx, {
    platforms: world.visiblePlatforms(cameraX, GAME.width),
    cameraX,
    viewportWidth: GAME.width,
    viewportHeight: GAME.height,
    scene: level()
  });
  terrainRenderer.drawGroundCover(ctx, {
    cameraX,
    viewportWidth: GAME.width,
    groundY: GAME.groundY,
    scene: level()
  });
  const objectLayerOptions = {
    cameraX,
    viewportWidth: GAME.width,
    viewportHeight: GAME.height
  };
  objectRenderer.drawLayer(ctx, "collectibles", objectLayerOptions, (layerContext) => {
    for (const item of collectibles) {
      if (item.x + item.w >= cameraX - 50 && item.x - item.w <= cameraX + GAME.width + 50) {
        drawCollectible(layerContext, item);
      }
    }
  });
  objectRenderer.drawLayer(ctx, "facility", objectLayerOptions, (layerContext) => {
    for (const prop of world.facilityProps) {
      if (prop.x + prop.w >= cameraX - 50 && prop.x <= cameraX + GAME.width + 50) {
        drawFacilityProp(prop, layerContext);
      }
    }
  });
  objectRenderer.drawLayer(ctx, "arena-boundary", objectLayerOptions, (layerContext) => {
    drawBossArenaBoundary(layerContext);
  });
  objectRenderer.drawLayer(ctx, "interactives", objectLayerOptions, (layerContext) => {
    for (const terminal of facilityConsoles) drawFacilityConsole(terminal, layerContext);
    drawExtractionMarker(extractionX, layerContext);
  });
  const visibleObstacles = world.visibleObstacles(cameraX, GAME.width);
  terrainRenderer.drawRockFormations(ctx, {
    obstacles: visibleObstacles.filter((obstacle) => obstacle.type === "rock"),
    cameraX,
    viewportWidth: GAME.width,
    viewportHeight: GAME.height,
    scene: level()
  });
  objectRenderer.drawLayer(ctx, "obstacles", objectLayerOptions, (layerContext) => {
    for (const obstacle of visibleObstacles) {
      if (obstacle.type !== "rock") drawObstacle(obstacle, layerContext);
    }
  });
  const visibleCaptives = ferrucutusCaptives.filter((captive) =>
    captive.x + captive.w >= cameraX - 70 && captive.x <= cameraX + GAME.width + 70
  );
  objectRenderer.drawLayer(ctx, "cage-back", objectLayerOptions, (layerContext) => {
    for (const captive of visibleCaptives) drawFerrucutusCageBack(layerContext, captive);
  });
  for (const captive of visibleCaptives) {
    drawAnimatedSafely(
      ctx, "ferrucutus", captive.dinosaurX, captive.dinosaurY,
      captive.dinosaurW, captive.dinosaurH, captive, elapsed
    );
  }
  objectRenderer.drawLayer(ctx, "cage-front", objectLayerOptions, (layerContext) => {
    for (const captive of visibleCaptives) drawFerrucutusCageFront(layerContext, captive);
  });
  for (const food of foodSources) {
    if (food.consumed || food.x + food.w < cameraX - 80 || food.x > cameraX + GAME.width + 80) continue;
    if (food.kind === "ligocristus") {
      const spriteW = food.spriteW ?? food.w;
      const spriteH = food.spriteH ?? food.h;
      drawAnimatedSafely(
        ctx, "ligocristus",
        food.x + (food.w - spriteW) / 2,
        food.y + food.h - spriteH,
        spriteW, spriteH, food, elapsed, {
          facing: food.direction ?? -1,
          alpha: food.defeated ? getEnemyOpacity(food) : 1
        }
      );
    } else {
      objectRenderer.drawLayer(ctx, "food", objectLayerOptions, (layerContext) => {
        drawFoodDrop(food, layerContext);
      });
    }
  }
  for (const enemy of venatosauruses) {
    if (enemy.x + enemy.w >= cameraX - 90 && enemy.x <= cameraX + GAME.width + 90) {
      drawAnimatedSafely(ctx, enemy.kind, enemy.x, enemy.y, enemy.w, enemy.h, enemy, elapsed, { facing: enemy.direction, alpha: getEnemyOpacity(enemy) });
      if (!enemy.defeated) drawReferenceHealthBar(enemy);
    }
  }
  effectsRenderer.drawDust(ctx, { dustClouds: dashDustClouds });
  for (const hunter of hunters) {
    if (hunter.x + hunter.w >= cameraX - 90 && hunter.x <= cameraX + GAME.width + 90) drawHunter(hunter);
  }
  objectRenderer.drawLayer(ctx, "projectiles", objectLayerOptions, (layerContext) => {
    for (const projectile of hunterProjectiles) {
      if (projectile.x >= cameraX - 30 && projectile.x <= cameraX + GAME.width + 30) {
        drawHunterProjectile(projectile, layerContext);
      }
    }
  });
  for (const ally of allies) {
    if (ally.x + ally.w >= cameraX - 100 && ally.x <= cameraX + GAME.width + 100) drawFerrucutus(ally);
  }
  for (const boss of bosses) {
    if (boss.x + boss.w >= cameraX - 180 && boss.x <= cameraX + GAME.width + 180) drawBoss(boss);
  }
  if (beta?.state === "confined") {
    objectRenderer.drawLayer(ctx, "containment-shell", objectLayerOptions, (layerContext) => {
      drawBrisaContainmentFrame(layerContext, beta);
    });
  }
  if (beta) drawBrisa(beta);
  if (stegoceratops) drawAnimatedSafely(ctx, "stegoceratops", stegoceratops.x, stegoceratops.y, stegoceratops.w, stegoceratops.h, stegoceratops, elapsed, { facing: 1 });
  drawCampaignPrologueActors();
  drawTacticalCombatEffects();
  effectsRenderer.drawParticles(ctx, { particles });

  if (!campaignPrologue?.active) {
    for (const companion of autonomousCompanions) {
      const actor = companion.actor;
      if (actor.x + actor.w < cameraX - 90 || actor.x > cameraX + GAME.width + 90) continue;
      drawDino(actor.x, actor.y, actor.w, actor.h, "#75a99b", actor.character, elapsed + companion.slot * 0.21, 0.96, actor.facing, actor);
      drawReferenceHealthBar(actor);
    }
  }
  const blink = player.invulnerable > 0 && Math.floor(elapsed * 18) % 2 === 0;
  if (campaignPrologue?.active && ["rest", "explore", "capture", "capture-dialog"].includes(campaignPrologue.phase)) {
    const brisaSleeping = campaignPrologue.phase === "rest";
    const brisaY = player.y + (brisaSleeping ? 5 : 0);
    const brisaAnimationElapsed = brisaSleeping
      ? 0
      : Math.max(0, elapsed - (campaignPrologue.rosaAnimationStartedAt ?? elapsed));
    const brisaDrawn = drawSpriteSafely("prologue-brisa", () =>
      spriteRenderer.drawPrologueBrisa(
        ctx, player.x, brisaY, player.w, player.h, player,
        brisaAnimationElapsed, blink ? 0.35 : 1, brisaSleeping
      )
    );
    if (!brisaDrawn) {
      drawDino(
        player.x, brisaY, player.w, player.h, "#75a99b", "brisa", brisaAnimationElapsed,
        blink ? 0.35 : 1, player.facing, player
      );
    }
  } else if (!campaignPrologue?.active) {
    drawDino(player.x, player.y, player.w, player.h, "#75a99b", selected, elapsed, blink ? 0.35 : 1, player.facing, player);
  }
  if (player.brontosaurusRide) {
    ctx.save();
    ctx.fillStyle = "#e8d7a3";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("BRONTOSAURUS RIDE // " + Math.ceil(player.brontosaurusRide.remaining) + "s", player.x + player.w / 2, player.y - 14);
    ctx.restore();
  }
  if (player.dashTimer > 0) {
    ctx.fillStyle = "#d8f36a66";
    ctx.fillRect(player.x - 20, player.y + player.h * 0.48, player.w + 8, 4);
  }
  for (const terminal of facilityConsoles) {
    if (terminal.canInteract(player)) {
      ctx.fillStyle = "#d8f36a";
      ctx.font = "10px monospace";
      ctx.fillText(ui("interact"), terminal.x - 18, terminal.y - 24);
    }
  }
  ctx.restore();

  if (!campaignPrologue?.active) {
    ctx.fillStyle = "#d2a27d";
    ctx.font = "10px monospace";
    ctx.fillText(tr(selected === "blue" ? "GALA // DOUBLE JUMP + DASH" : selected === "rosa" ? "BRISA // JUVENILE RAPTOR" : "BASILIO // HEAVY STOMP"), 24, GAME.height - 18);
    ctx.fillStyle = "#d8f36a";
    ctx.fillText(tr("FERRUCUTUS RESCUE // SUPPORT ACTIVE"), GAME.width - 314, GAME.height - 18);
  }
  drawCampaignPrologueCaption();
  drawBossHud();
  drawPickupNotice();

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

function cloneCampaignScene(scene) {
  return scene ? { ...scene, lines: [...scene.lines] } : null;
}
function currentCampaignLevelIndex() {
  return LEVELS.reduce((current, item, index) => distance >= item.distance ? index : current, 0);
}
function captureRestartSnapshot(levelIndex, distanceValue = distance) {
  return {
    schemaVersion: 1,
    explorationMode,
    selectedCharacter: selected,
    levelIndex,
    distance: Math.max(0, Math.round(distanceValue)),
    worldSeed: world.seed,
    rescues,
    playerHealth: player.health,
    stegoceratopsCooldown,
    rescuedFerrucutusCageIds: [...rescuedFerrucutusCageIds],
    collectedCollectibleIds: [...collectedCollectibleIds].sort(),
    allies: allies.filter((ally) => !ally.departed).map((ally) => ({
      id: ally.id, distanceBehind: Math.max(150, player.x - ally.x)
    })),
    campaign: {
      flags: { ...campaign.flags }, seenScenes: [...campaign.seenScenes],
      queue: campaign.queue.map(cloneCampaignScene), activeScene: cloneCampaignScene(campaign.activeScene),
      objective: campaign.objective, chapter: campaign.chapter
    }
  };
}
function refreshContinueCampaignButton() {
  if (!continueCampaignButton || !deleteCampaignSaveButton) return;
  const available = Boolean(save.getCampaignProgress());
  const checkpointReached = Boolean(save.get("campaignCheckpointReached"));
  continueCampaignButton.hidden = !available;
  deleteCampaignSaveButton.hidden = false;
  continueCampaignButton.disabled = !desktopPlayback.matches;
  deleteCampaignSaveButton.disabled = !available || !checkpointReached || !desktopPlayback.matches;
}
function persistCampaignProgressSnapshot(snapshot) {
  if (explorationMode || !snapshot || campaign.flags.completed) return false;
  const saved = save.saveCampaignProgress({
    snapshot,
    levelStartSnapshot: levelStartSnapshot ?? snapshot,
    checkpointSnapshot: latestLevelCheckpoint ?? levelStartSnapshot ?? snapshot
  });
  if (saved) {
    campaignAutosaveElapsed = 0;
    refreshContinueCampaignButton();
  }
  return saved;
}
function saveCurrentCampaignSafely({ allowNarration = false } = {}) {
  if (
    !running ||
    explorationMode ||
    campaignPrologue?.active ||
    campaign.flags.completed ||
    !player.onGround ||
    activeBoss ||
    levelTransition ||
    finalDeparture ||
    stegoceratops ||
    (campaign.sceneOpen && !allowNarration)
  ) return false;
  return persistCampaignProgressSnapshot(captureRestartSnapshot(currentCampaignLevelIndex()));
}
function updateCampaignAutosave(delta) {
  if (
    !running ||
    explorationMode ||
    campaignPrologue?.active ||
    campaign.flags.completed ||
    campaign.sceneOpen ||
    activeBoss ||
    !player.onGround ||
    levelTransition ||
    finalDeparture ||
    stegoceratops
  ) {
    campaignAutosaveElapsed = 0;
    return;
  }

  campaignAutosaveElapsed += delta;
  if (campaignAutosaveElapsed < CAMPAIGN_AUTOSAVE_INTERVAL) return;
  persistCampaignProgressSnapshot(captureRestartSnapshot(currentCampaignLevelIndex()));
}
function saveLevelEntrySnapshot(levelIndex) {
  if (explorationMode) return;
  levelStartSnapshot = captureRestartSnapshot(levelIndex, LEVELS[levelIndex].distance);
  latestLevelCheckpoint = levelStartSnapshot;
  persistCampaignProgressSnapshot(levelStartSnapshot);
}
function updateLevelCheckpoint() {
  if (!running || explorationMode || campaign.sceneOpen || campaign.flags.completed || !player.onGround) return;
  const levelIndex = currentCampaignLevelIndex();
  if (!canActivateLevelCheckpoint(levelIndex, campaign.flags)) return;
  const checkpointDistance = getLevelCheckpointDistance(levelIndex, { levels: LEVELS, world: WORLD, game: GAME });
  if (distance < checkpointDistance) return;
  if (latestLevelCheckpoint?.levelIndex === levelIndex && latestLevelCheckpoint.distance >= checkpointDistance) return;
  latestLevelCheckpoint = captureRestartSnapshot(levelIndex);
  if (persistCampaignProgressSnapshot(latestLevelCheckpoint)) {
    save.update({ campaignCheckpointReached: true });
    refreshContinueCampaignButton();
  }
  audio.collect();
}
function restoreRestartSnapshot(snapshot, savedProgress = null) {
  if (!snapshot || !desktopPlayback.matches) return false;
  explorationMode = Boolean(snapshot.explorationMode);
  document.body.classList.toggle("exploration-session", explorationMode);
  operationHeader?.classList.toggle("is-hidden", explorationMode);
  campaignBriefHeader?.classList.toggle("is-hidden", explorationMode);
  if (snapshot.selectedCharacter === "blue" || snapshot.selectedCharacter === "vasti") {
    selected = snapshot.selectedCharacter;
    save.update({ selectedCharacter: selected });
    selectCharacter(selected);
  }
  cancelScheduledFrame();
  audio.unlock();
  resetPlayer(snapshot.worldSeed);
  campaign.flags = { ...snapshot.campaign.flags };
  campaign.seenScenes = new Set(snapshot.campaign.seenScenes);
  campaign.queue = snapshot.campaign.queue.map(cloneCampaignScene);
  campaign.activeScene = cloneCampaignScene(snapshot.campaign.activeScene);
  campaign.objective = snapshot.campaign.objective;
  campaign.chapter = snapshot.campaign.chapter;
  distance = snapshot.distance;
  rescues = snapshot.rescues;
  collectedCollectibleIds = new Set(snapshot.collectedCollectibleIds ?? []);
  collectibles = collectibles.filter((item) => !collectedCollectibleIds.has(item.id));
  applyCollectibleUnlocks();
  player.x = GAME.playerX + distance;
  player.y = GAME.groundY - player.h;
  player.vx = 0; player.vy = 0; player.onGround = true;
  player.health = Math.max(1, Math.min(player.maxHealth, snapshot.playerHealth));
  stegoceratopsCooldown = snapshot.stegoceratopsCooldown;
  applyCollectibleUnlocks();
  cameraX = Math.max(0, player.x - 330);
  lastLevelIndex = snapshot.levelIndex;
  introSequence = false; levelTransition = null; finalDeparture = false; finalDepartureDone = false;
  campaignSaved = false;
  campaignAutosaveElapsed = 0;
  if (savedProgress) {
    levelStartSnapshot = savedProgress.levelStartSnapshot;
    latestLevelCheckpoint = savedProgress.checkpointSnapshot;
  } else {
    latestLevelCheckpoint = snapshot;
  }
  world.extendTo(player.x + WORLD.maxSectionLength + 1200);
  world.pruneBehind(player.x);
  syncEncounters();
  rescuedFerrucutusCageIds = new Set(snapshot.rescuedFerrucutusCageIds);
  ferrucutusCaptives = ferrucutusCaptives.filter((captive) =>
    !rescuedFerrucutusCageIds.has(captive.id)
  );
  const actorCutoff = player.x - 280;
  hunters = hunters.filter((actor) => actor.x + actor.w >= actorCutoff);
  venatosauruses = venatosauruses.filter((actor) => actor.x + actor.w >= actorCutoff);
  foodSources = foodSources.filter((actor) => actor.x + actor.w >= actorCutoff);
  wildlife = wildlife.filter((actor) => actor.x + actor.w >= actorCutoff);
  ferrucutusCaptives = ferrucutusCaptives.filter((actor) => actor.x + actor.w >= actorCutoff);
  for (const [encounterId, flag] of Object.entries(BOSS_ENCOUNTER_FLAGS)) {
    if (campaign.flags[flag]) seenBossSpawns.add(encounterId);
  }
  syncBossEncounter();
  syncFacility();
  for (const terminal of facilityConsoles) {
    if ((terminal.kind === "power" && campaign.flags.powerRestored) ||
        (terminal.kind === "security" && campaign.flags.securityReleased)) terminal.activate();
  }
  if (campaign.flags.betaFreed && beta?.state === "confined") {
    beta.rescue(); beta.x = player.x - beta.followDistance; beta.y = player.y + player.h - beta.h;
  }
  allies = snapshot.allies.map((ally) => new FerrucutusAlly({
    id: ally.id, x: player.x - ally.distanceBehind, groundY: GAME.groundY
  }));
  autonomousCompanions.forEach((companion) => {
    companion.actor.x = player.x - 150;
    companion.actor.y = GAME.groundY - companion.actor.h;
    companion.actor.vx = 0; companion.actor.vy = 0;
  });
  elapsed = 0; accumulator = 0; last = performance.now();
  running = true; paused = false; failureScreenActive = false;
  document.body.classList.remove("game-paused");
  startScreen.classList.add("hidden"); dinoModal.classList.add("hidden"); characterConfirmation.classList.add("hidden");
  overlayContent.hidden = false; retryOptions.classList.add("hidden"); overlayExitButton.hidden = true;
  overlay.classList.remove("pause-mode"); overlay.classList.add("hidden"); overlayActionButton.hidden = true;
  pauseMenu.classList.add("hidden"); pauseConfirmation.classList.add("hidden");
  pendingPauseAction = null; pauseActionTrigger = null;
  updatePlayerHealthHud(); updateCampaignHud(); renderStoryPanel();
  stateLabel.textContent = explorationMode ? ui("inProgress") : "";
  music.start(audio.context, currentMusicTheme()); music.setPaused(false); music.setEnabled(audio.enabled);
  document.body.classList.add("game-session-active");
  render();
  showGameplayBrief(explorationMode ? "exploration" : "campaign");
  return true;
}
function openRetryOptions() {
  if (!failureScreenActive) return;
  overlayContent.hidden = true; retryOptions.classList.remove("hidden"); retryLevelStartButton.focus();
}
function closeRetryOptions() {
  retryOptions.classList.add("hidden"); overlayContent.hidden = false; overlayActionButton.focus();
}
function updateDefeatScreenCopy() {
  overlay.querySelector(".overlay-kicker").textContent = ui("missionFailed");
  const title = overlay.querySelector("h2"); title.hidden = false; title.textContent = ui("retryPrompt");
  const message = overlay.querySelector("p"); message.textContent = ""; message.hidden = true;
  overlayActionButton.textContent = ui("retry"); overlayActionButton.hidden = false;
  overlayExitButton.textContent = ui("exit"); overlayExitButton.hidden = false;
  retryLevelStartButton.textContent = ui("retryLevelStart");
  retryCheckpointButton.textContent = ui("retryCheckpoint");
}
function handleFrameError(error) {
  console.error("[Frantic Search] Simulation frame failed:", error);
  cancelScheduledFrame();
  running = false;
  paused = false;
  music.setPaused(true);
  stateLabel.textContent = locale === "es" ? "ERROR DE EJECUCIÓN" : "RUNTIME ERROR";
  overlay.querySelector(".overlay-kicker").textContent = "FRANTIC SEARCH // RUNTIME";
  overlay.querySelector("h2").hidden = false;
  overlay.querySelector("p").hidden = false;
  overlay.querySelector("h2").textContent = locale === "es" ? "SIMULACIÓN DETENIDA." : "SIMULATION STOPPED.";
  overlay.querySelector("p").textContent = locale === "es"
    ? "Se produjo un error durante la actualización o el dibujo. Abrí la consola para ver el detalle y volvé a iniciar la operación."
    : "An error occurred while updating or drawing the game. Open the console for details, then restart the operation.";
  overlay.querySelector("button").hidden = false;
  overlay.querySelector("button").textContent = ui("retry");
  failureScreenActive = false;
  overlayContent.hidden = false;
  retryOptions.classList.add("hidden");
  overlayExitButton.hidden = true;
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

function resetPlayer(worldSeed = undefined) {
  campaignAutosaveElapsed = 0;
  rescuedFerrucutusCageIds = new Set();
  collectibles = [];
  seenCollectibleSpawns = new Set();
  collectedCollectibleIds = new Set();
  pickupCueTimer = 0;
  pickupCueTitle = "";
  pickupCueMessage = "";
  campaign = new CampaignManager();
  campaignPrologue = null;
  prologueCharacterSelectionPending = false;
  dinoModal?.classList.remove("prologue-selection");
  beta = null;
  facilityConsoles = [];
  extractionX = null;
  campaignSaved = false;
  player = new Player(selected, GAME.playerX, GAME.groundY);
  player.x = -155;
  world = new PlatformWorld(GAME.groundY, worldSeed === undefined ? {} : { seed: worldSeed });
  hunters = [];
  hunterProjectiles = [];
  venatosauruses = [];
  foodSources = [];
  wildlife = [];
  wildlifeJeepChases = [];
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
  dashDustClouds = [];
  syncEncounters();
  cameraX = 0;
  particles = [];
}

function start(mode = "campaign") {
  if (!desktopPlayback.matches) return;
  const restartingCurrentSession = running && paused;
  explorationMode = mode === "exploration";
  document.body.classList.toggle("exploration-session", explorationMode);
  if (!explorationMode && !restartingCurrentSession) {
    save.update({ campaignCheckpointReached: false });
  }
  operationHeader?.classList.toggle("is-hidden", explorationMode);
  campaignBriefHeader?.classList.toggle("is-hidden", explorationMode);
  cancelScheduledFrame();
  audio.unlock();
  startScreen.classList.add("hidden");
  setCharacterSelectionModalOpen(false);
  prologueCharacterSelectionPending = false;
  dinoModal.classList.remove("prologue-selection");
  cancelCharacterButton.hidden = false;
  dinoModal.classList.add("hidden");
  overlayActionButton.hidden = true;
  overlayContent.hidden = false;
  retryOptions.classList.add("hidden");
  overlayExitButton.hidden = true;
  failureScreenActive = false;
  pauseMenu.classList.add("hidden");
  pauseConfirmation.classList.add("hidden");
  overlay.classList.remove("pause-mode");
  pendingPauseAction = null;
  pauseActionTrigger = null;
  resetPlayer();
  if (explorationMode) {
    const biomeIndex = Math.max(0, Math.min(LEVELS.length - 1, selectedExplorationBiomeIndex));
    const biomeDistance = Math.max(0, LEVELS[biomeIndex].distance);
    player.x = GAME.playerX + biomeDistance;
    player.y = GAME.groundY - player.h;
    player.vx = 0;
    player.vy = 0;
    distance = biomeDistance;
    lastLevelIndex = biomeIndex;
    cameraX = Math.max(0, player.x - 330);
    introSequence = false;
    world.extendTo(player.x + WORLD.maxSectionLength + 1200);
  }
  if (!explorationMode) beginCampaignPrologue();
  updatePlayerHealthHud();
  music.start(audio.context, currentMusicTheme());
  audio.setAmbient(currentMusicTheme());
  music.setPaused(false);
  music.setEnabled(audio.enabled);
  overlay.classList.add("hidden");
  running = true;
  paused = false;
  document.body.classList.remove("game-paused");
  elapsed = 0;
  accumulator = 0;
  distance = explorationMode
    ? Math.max(0, LEVELS[Math.max(0, Math.min(LEVELS.length - 1, selectedExplorationBiomeIndex))].distance)
    : 0;
  if (explorationMode) {
    player.x = GAME.playerX + distance;
    player.y = GAME.groundY - player.h;
    player.vx = 0;
    player.vy = 0;
    lastLevelIndex = Math.max(0, Math.min(LEVELS.length - 1, selectedExplorationBiomeIndex));
    cameraX = Math.max(0, player.x - 330);
    world.extendTo(player.x + WORLD.maxSectionLength + 1200);
  }
  rescues = 0;
  campaignAutosaveElapsed = 0;
  stateLabel.textContent = explorationMode ? ui("inProgress") : "";
  rescuesLabel.textContent = "00";
  if (!explorationMode && !campaignPrologue) {
    campaign.begin();
    levelStartSnapshot = captureRestartSnapshot(0, 0);
    latestLevelCheckpoint = levelStartSnapshot;
    persistCampaignProgressSnapshot(levelStartSnapshot);
  } else {
    // Do not persist a campaign snapshot until the playable prologue is complete.
    levelStartSnapshot = null;
    latestLevelCheckpoint = null;
  }
  updateCampaignHud();
  renderStoryPanel();
  last = performance.now();
  document.body.classList.add("game-session-active");
  // The first draw happens before the animation loop. Handle it exactly like
  // later frames so a failing asset cannot leave a partially painted frozen scene.
  try {
    render();
  } catch (error) {
    handleFrameError(error);
    return;
  }
  if (explorationMode) {
    showGameplayBrief("exploration");
  } else {
    // The campaign prologue provides its own opening narration. Start its frame
    // loop immediately instead of making the first playable scene wait behind
    // a second, blocking briefing dialog.
    scheduleFrame();
  }
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
  failureScreenActive = true;
  overlayContent.hidden = false;
  retryOptions.classList.add("hidden");
  updateDefeatScreenCopy();
  overlay.classList.remove("hidden");
  render();
}

function togglePause() {
  if (!desktopPlayback.matches || !running) return;
  paused = !paused;
  document.body.classList.toggle("game-paused", paused);
  if (paused) {
    cancelScheduledFrame();
    music.setPaused(true);
    stateLabel.textContent = ui("paused");
    overlay.classList.add("pause-mode");
    overlay.classList.remove("hidden");
    pauseMenu.classList.remove("hidden");
    pauseContinueButton.focus();
  } else {
    closePauseConfirmation(false);
    pauseMenu.classList.add("hidden");
    overlay.classList.remove("pause-mode");
    overlay.classList.add("hidden");
    music.setPaused(false);
    stateLabel.textContent = explorationMode ? ui("inProgress") : "";
    accumulator = 0;
    last = performance.now();
    scheduleFrame();
  }
}

function updatePauseConfirmationCopy() {
  if (!pendingPauseAction) return;
  const restarting = pendingPauseAction === "restart";
  pauseConfirmationTitle.textContent = ui(restarting ? "confirmRestartTitle" : "confirmExitTitle");
  pauseConfirmationMessage.textContent = ui(restarting ? "confirmRestartMessage" : "confirmExitMessage");
}

function requestPauseAction(action, triggerButton) {
  if (!paused || !["restart", "exit"].includes(action)) return;
  pendingPauseAction = action;
  pauseActionTrigger = triggerButton || null;
  updatePauseConfirmationCopy();
  pauseConfirmation.classList.remove("hidden");
  confirmPauseActionButton.focus();
}

function closePauseConfirmation(restoreFocus = true) {
  pauseConfirmation.classList.add("hidden");
  pendingPauseAction = null;
  if (restoreFocus && pauseActionTrigger?.isConnected) pauseActionTrigger.focus();
  pauseActionTrigger = null;
}

function returnToMainMenu() {
  saveCurrentCampaignSafely({ allowNarration: true });
  running = false;
  failureScreenActive = false;
  overlayContent.hidden = false;
  retryOptions.classList.add("hidden");
  overlayExitButton.hidden = true;
  overlayActionButton.hidden = true;
  paused = false;
  cancelScheduledFrame();
  music.stop();
  document.body.classList.remove("game-paused");
  pauseMenu.classList.add("hidden");
  pauseConfirmation.classList.add("hidden");
  overlay.classList.remove("pause-mode");
  overlay.classList.add("hidden");
  prologueCharacterSelectionPending = false;
  dinoModal.classList.remove("prologue-selection");
  cancelCharacterButton.hidden = false;
  dinoModal.classList.add("hidden");
  storyPanel.classList.add("hidden");
  startScreenMessage.textContent = "";
  startScreenMessage.hidden = true;
  explorationMode = false;
  document.body.classList.remove("game-session-active", "exploration-session");
  operationHeader?.classList.remove("is-hidden");
  campaignBriefHeader?.classList.remove("is-hidden");
  pendingGameMode = "campaign";
  showStartMenuPage("home");
  startButton.hidden = false;
  startButton.disabled = !desktopPlayback.matches;
  refreshContinueCampaignButton();
  startScreen.classList.remove("hidden");
  stateLabel.textContent = ui("standby");
  pendingPauseAction = null;
  pauseActionTrigger = null;
  setMenuOpen(false);
  render();
  startButton.focus();
}

function confirmPendingPauseAction() {
  const action = pendingPauseAction;
  if (!action || !paused) return;
  closePauseConfirmation(false);
  if (action === "restart") {
    start(explorationMode ? "exploration" : "campaign");
    return;
  }
  if (action === "exit") returnToMainMenu();
}

function updateCharacterConfirmationCopy() {
  const characterName = selected === "vasti" ? "BASILIO" : "GALA";
  confirmationTitle.textContent = ui("characterConfirmTitle").replace("{character}", characterName);
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
  updateCharacterConfirmationCopy();
  if (!running) {
    player = new Player(selected, GAME.playerX, GAME.groundY);
    updatePlayerAbilityHud();
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
pauseContinueButton.addEventListener("click", () => togglePause());
pauseRestartButton.addEventListener("click", () => requestPauseAction("restart", pauseRestartButton));
pauseExitButton.addEventListener("click", () => requestPauseAction("exit", pauseExitButton));
confirmPauseActionButton.addEventListener("click", confirmPendingPauseAction);
cancelPauseActionButton.addEventListener("click", () => closePauseConfirmation());
pauseConfirmation.addEventListener("click", (event) => {
  if (event.target === pauseConfirmation) closePauseConfirmation();
});
startButton.addEventListener("click", () => showStartMenuPage("options"));
campaignButton.addEventListener("click", () => showStartMenuPage("campaign"));
newCampaignButton.addEventListener("click", () => openDinoModal("start", "campaign"));
campaignBackButton.addEventListener("click", () => {
  showStartMenuPage("options");
  campaignButton.focus();
});
minigamesButton.addEventListener("click", () => showStartMenuPage("minigames"));
startMenuBackButton.addEventListener("click", () => {
  showStartMenuPage("home");
  startButton.focus();
});
minigamesBackButton.addEventListener("click", () => {
  showStartMenuPage("options");
  minigamesButton.focus();
});
for (const button of minigamePreviewSources.keys()) {
  button.addEventListener("pointerenter", () => {
    hoveredMinigameButton = button;
    updateMinigamePreview();
  });
  button.addEventListener("pointerleave", () => {
    if (hoveredMinigameButton === button) {
      hoveredMinigameButton = null;
      updateMinigamePreview();
    }
  });
  button.addEventListener("focus", () => {
    focusedMinigameButton = button;
    updateMinigamePreview();
  });
  button.addEventListener("blur", () => {
    if (focusedMinigameButton === button) {
      focusedMinigameButton = null;
      updateMinigamePreview();
    }
  });
}
explorationButton.addEventListener("click", () => {
  if (!desktopPlayback.matches || desktopBlocked) return;
  openDinoModal("start", "exploration");
});
persecutionButton.addEventListener("click", () => {
  if (!desktopPlayback.matches || desktopBlocked) return;
  startScreen.classList.add("hidden");
  setMenuOpen(false);
  document.body.classList.add("game-session-active");
  operationHeader?.classList.add("is-hidden");
  campaignBriefHeader?.classList.add("is-hidden");
  persecution.open();
});
huntingButton.addEventListener("click", () => {
  if (!desktopPlayback.matches || desktopBlocked) return;
  startScreen.classList.add("hidden");
  setMenuOpen(false);
  document.body.classList.add("game-session-active");
  operationHeader?.classList.add("is-hidden");
  campaignBriefHeader?.classList.add("is-hidden");
  hunting.open();
});
ambushButton.addEventListener("click", () => {
  if (!desktopPlayback.matches || desktopBlocked) return;
  startScreen.classList.add("hidden");
  setMenuOpen(false);
  document.body.classList.add("game-session-active");
  operationHeader?.classList.add("is-hidden");
  campaignBriefHeader?.classList.add("is-hidden");
  ambush.open();
});
raceButton.addEventListener("click", () => {
  if (!desktopPlayback.matches || desktopBlocked) return;
  startScreen.classList.add("hidden");
  setMenuOpen(false);
  document.body.classList.add("game-session-active");
  operationHeader?.classList.add("is-hidden");
  campaignBriefHeader?.classList.add("is-hidden");
  race.open();
});
overlayActionButton.addEventListener("click", () => {
  if (paused) {
    togglePause();
    return;
  }
  if (failureScreenActive) {
    openRetryOptions();
    return;
  }
  if (!running) openDinoModal("overlay", explorationMode ? "exploration" : "campaign");
});
overlayExitButton.addEventListener("click", returnToMainMenu);
retryLevelStartButton.addEventListener("click", () => restoreRestartSnapshot(levelStartSnapshot));
retryCheckpointButton.addEventListener("click", () => restoreRestartSnapshot(latestLevelCheckpoint));
retryCancelButton.addEventListener("click", closeRetryOptions);
continueCampaignButton.addEventListener("click", () => {
  const progress = save.getCampaignProgress();
  if (!progress) {
    refreshContinueCampaignButton();
    return;
  }
  restoreRestartSnapshot(progress.snapshot, progress);
});
function openDeleteCampaignSaveConfirmation() {
  if (!save.getCampaignProgress() || !save.get("campaignCheckpointReached")) {
    refreshContinueCampaignButton();
    return;
  }
  deleteCampaignSaveTrigger = deleteCampaignSaveButton;
  deleteCampaignConfirmation.classList.remove("hidden");
  cancelDeleteCampaignSaveButton.focus();
}

function closeDeleteCampaignSaveConfirmation(restoreFocus = true) {
  deleteCampaignConfirmation.classList.add("hidden");
  if (restoreFocus && deleteCampaignSaveTrigger?.isConnected && !deleteCampaignSaveTrigger.hidden) {
    deleteCampaignSaveTrigger.focus();
  }
  deleteCampaignSaveTrigger = null;
}

function confirmDeleteCampaignSave() {
  if (!save.getCampaignProgress() || !save.get("campaignCheckpointReached")) {
    refreshContinueCampaignButton();
    closeDeleteCampaignSaveConfirmation(false);
    newCampaignButton.focus();
    return;
  }
  save.clearCampaignProgress();
  refreshContinueCampaignButton();
  closeDeleteCampaignSaveConfirmation(false);
  newCampaignButton.focus();
}

deleteCampaignSaveButton.addEventListener("click", openDeleteCampaignSaveConfirmation);
confirmDeleteCampaignSaveButton.addEventListener("click", confirmDeleteCampaignSave);
cancelDeleteCampaignSaveButton.addEventListener("click", () => closeDeleteCampaignSaveConfirmation());
deleteCampaignConfirmation.addEventListener("click", (event) => {
  if (event.target === deleteCampaignConfirmation) closeDeleteCampaignSaveConfirmation();
});
deleteCampaignConfirmation.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  const focusable = [...deleteCampaignConfirmation.querySelectorAll("button:not([disabled]):not([hidden])")];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

function openPrologueCharacterSelection() {
  const prologue = campaignPrologue;
  if (!prologue?.active || prologue.phase !== "character-select" || !desktopPlayback.matches) return;
  prologueCharacterSelectionPending = true;
  setCharacterSelectionModalOpen(true);
  storyPanel?.classList.add("hidden");
  selectionReturn = "prologue";
  pendingGameMode = "campaign";
  characterConfirmation.classList.add("hidden");
  dinoModal.classList.add("prologue-selection");
  cancelCharacterButton.hidden = true;
  selectCharacter(selected);
  dinoModal.classList.remove("hidden");
  music.setDucked(true);
  document.querySelector(".character-card.active")?.focus();
}

function openDinoModal(returnTo = "start", gameMode = "campaign") {
  if (!desktopPlayback.matches || running || desktopBlocked) return;
  selectionReturn = returnTo;
  setCharacterSelectionModalOpen(true);
  pendingGameMode = gameMode;
  prologueCharacterSelectionPending = false;
  dinoModal.classList.remove("prologue-selection");
  cancelCharacterButton.hidden = false;
  selectionMenuPage = activeStartMenuPage;
  characterConfirmation.classList.add("hidden");
  if (returnTo === "start") startScreen.classList.add("hidden");
  selectCharacter(selected);
  dinoModal.classList.remove("hidden");
  document.querySelector(".character-card.active")?.focus();
}

function closeDinoModal() {
  if (prologueCharacterSelectionPending) return;
  setCharacterSelectionModalOpen(false);
  dinoModal.classList.remove("prologue-selection");
  cancelCharacterButton.hidden = false;
  dinoModal.classList.add("hidden");
  characterConfirmation.classList.add("hidden");
  if (selectionReturn === "start") {
    showStartMenuPage(selectionMenuPage);
    (selectionMenuPage === "campaign" ? newCampaignButton : selectionMenuPage === "options" ? campaignButton : selectionMenuPage === "minigames" ? minigamesButton : startButton).focus();
  } else {
    overlay.classList.remove("hidden");
    overlayActionButton.focus();
  }
}

function openCharacterConfirmation() {
  if (dinoModal.classList.contains("hidden") || !desktopPlayback.matches) return;
  if (prologueCharacterSelectionPending) {
    beginPrologueFight();
    return;
  }
  updateCharacterConfirmationCopy();
  dinoModal.classList.add("hidden");
  characterConfirmation.classList.remove("hidden");
  playCharacterButton.focus();
}

function returnToCharacterSelection() {
  characterConfirmation.classList.add("hidden");
  dinoModal.classList.remove("hidden");
  confirmCharacterButton.focus();
}

function startFromDinoModal() {
  if (!dinoModal.classList.contains("hidden") || characterConfirmation.classList.contains("hidden") || !desktopPlayback.matches) return;
  characterConfirmation.classList.add("hidden");
  dinoModal.classList.add("hidden");
  if (pendingGameMode === "exploration") {
    explorationBiomeDialog?.classList.remove("hidden");
    explorationBiomeDialog?.querySelector("[data-exploration-biome]")?.focus();
    return;
  }
  setCharacterSelectionModalOpen(false);
  start(pendingGameMode);
}

function updateStartMenuHeading() {
  const isMinigamesPage = activeStartMenuPage === "minigames";
  startScreenTitle.textContent = isMinigamesPage ? ui("minigames") : ui("startMenuTitle");
  startScreenSubtitle.hidden = isMinigamesPage;
  startScreenSubtitle.textContent = ui("startMenuSubtitle");
}

function showStartMenuPage(page = "home") {
  const nextPage = ["home", "options", "campaign", "minigames"].includes(page) ? page : "home";
  hoveredMinigameButton = null;
  focusedMinigameButton = null;
  activeStartMenuPage = nextPage;
  updateStartMenuHeading();
  updateMinigamePreview();
  startMenuHome.hidden = nextPage !== "home";
  startMenuOptions.hidden = nextPage !== "options";
  campaignMenu.hidden = nextPage !== "campaign";
  minigamesMenu.hidden = nextPage !== "minigames";
  startButton.setAttribute("aria-expanded", String(nextPage !== "home"));
  campaignButton.setAttribute("aria-expanded", String(nextPage === "campaign"));
  minigamesButton.setAttribute("aria-expanded", String(nextPage === "minigames"));
  startScreen.classList.remove("hidden");
}

function getTutorialLines(mode) {
  return getModalTutorialCopy(mode, locale);
}

function getActiveTutorialMode() {
  if (persecutionPanel.classList.contains("active")) return "persecution";
  if (huntingPanel.classList.contains("active")) return "hunting";
  if (ambushPanel.classList.contains("active")) return "ambush";
  if (racePanel.classList.contains("active")) return "race";
  return running && explorationMode ? "exploration" : "campaign";
}

function populateInstructionList(list, lines) {
  list.replaceChildren(...lines.slice(1).map((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    return item;
  }));
}

function showGameplayBrief(mode, proceed = null, context = "") {
  const lines = getTutorialLines(mode);
  const isExplorationBrief = mode === "exploration";
  pendingGameplayBriefAction = typeof proceed === "function" ? proceed : null;
  gameplayBriefPausedGame = running && !paused;
  if (gameplayBriefPausedGame) {
    paused = true;
    cancelScheduledFrame();
    music.setPaused(true);
    document.body.classList.add("game-paused");
  }
  gameplayBriefTitle.textContent = lines[0];
  gameplayBriefContinueButton.textContent = isExplorationBrief ? ui("play") : ui("gameplayBriefContinue");
  gameplayBriefExitButton.textContent = ui("exit");
  gameplayBriefExitButton.hidden = !isExplorationBrief;
  gameplayBriefDialog.classList.toggle("exploration-brief", isExplorationBrief);
  gameplayBriefContext.classList.toggle("game-mode-instructions", isExplorationBrief);
  gameplayBriefContext.textContent = isExplorationBrief ? lines.slice(1).join(" · ") : context;
  gameplayBriefContext.hidden = isExplorationBrief ? false : !context;
  gameplayBriefList.hidden = isExplorationBrief;
  gameplayBriefNote.hidden = isExplorationBrief;
  populateInstructionList(gameplayBriefList, lines);
  gameplayBriefDialog.classList.remove("hidden");
  gameplayBriefContinueButton.focus();
}

function closeGameplayBrief() {
  if (gameplayBriefDialog.classList.contains("hidden")) return;
  gameplayBriefDialog.classList.add("hidden");
  gameplayBriefDialog.classList.remove("exploration-brief");
  gameplayBriefExitButton.hidden = true;
  gameplayBriefContext.classList.remove("game-mode-instructions");
  gameplayBriefContext.hidden = true;
  gameplayBriefList.hidden = false;
  gameplayBriefNote.hidden = false;
  const action = pendingGameplayBriefAction;
  pendingGameplayBriefAction = null;
  if (gameplayBriefPausedGame && running) {
    paused = false;
    document.body.classList.remove("game-paused");
    music.setPaused(false);
    accumulator = 0;
    last = performance.now();
    scheduleFrame();
  }
  gameplayBriefPausedGame = false;
  if (action) action();
}

function exitExplorationBrief() {
  if (!gameplayBriefDialog.classList.contains("exploration-brief")) return;
  pendingGameplayBriefAction = null;
  closeGameplayBrief();
  returnToMainMenu();
}

function openTutorial(trigger = null) {
  const mode = getActiveTutorialMode();
  const lines = getTutorialLines(mode);
  document.querySelector("#tutorial-title").textContent = lines[0];
  populateInstructionList(document.querySelector("#tutorial-list"), lines);
  tutorialReturnFocus = trigger;
  tutorialPausedMode = null;

  if ((mode === "campaign" || mode === "exploration") && running && !paused && !campaign.sceneOpen) {
    togglePause();
    tutorialPausedMode = mode;
  } else if (mode === "persecution" && persecution.running && !persecution.paused) {
    persecution.togglePause();
    tutorialPausedMode = mode;
  } else if (mode === "hunting" && hunting.running && !hunting.paused) {
    hunting.togglePause();
    tutorialPausedMode = mode;
  } else if (mode === "ambush" && ambush.running && !ambush.paused) {
    ambush.togglePause();
    tutorialPausedMode = mode;
  }

  setMenuOpen(false);
  document.querySelector("#tutorial-dialog").classList.remove("hidden");
  document.querySelector("#tutorial-close").focus();
}
function closeTutorial() {
  document.querySelector("#tutorial-dialog").classList.add("hidden");
  if (tutorialPausedMode === "campaign" || tutorialPausedMode === "exploration") {
    if (running && paused) togglePause();
  } else if (tutorialPausedMode === "persecution" && persecution.running && persecution.paused) {
    persecution.togglePause();
  } else if (tutorialPausedMode === "hunting" && hunting.running && hunting.paused) {
    hunting.togglePause();
  } else if (tutorialPausedMode === "ambush" && ambush.running && ambush.paused) {
    ambush.togglePause();
  }
  tutorialPausedMode = null;
  if (tutorialReturnFocus?.isConnected && !tutorialReturnFocus.hidden) tutorialReturnFocus.focus();
  else menuToggle.focus();
  tutorialReturnFocus = null;
}

function setMenuOpen(open) {
  navMenu.classList.toggle("hidden", !open);
  menuToggle.classList.toggle("open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", ui(open ? "closeMenu" : "openMenu"));
}

function setCharacterSelectionModalOpen(open) {
  if (open) setMenuOpen(false);
  document.body.classList.toggle("character-selection-open", open);
}

function setLanguage(nextLocale) {
  if (!["es", "en"].includes(nextLocale) || nextLocale === locale) return;

  locale = nextLocale;
  persecution.setLocale(locale);
  hunting.setLocale(locale);
  ambush.setLocale(locale);
  race.setLocale(locale);
  save.update({ language: locale });
  applyLanguage();
  updateCampaignHud();

  // A language change updates presentation only. It must never start, stop,
  // duplicate or reset the simulation's animation-frame chain.
  if (campaign.sceneOpen) renderStoryPanel({ syncAudio: false });
  if (!running || paused) render();
}

function applyLanguage() {
  persecution.setLocale(locale);
  hunting.setLocale(locale);
  ambush.setLocale(locale);
  race.setLocale(locale);
  document.documentElement.lang = locale;
  document.title = ui("documentTitle");
  document.querySelector('meta[name="description"]')?.setAttribute("content", ui("metaDescription"));
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = ui(element.dataset.i18n);
  });
  updateStartMenuHeading();
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
  updatePauseConfirmationCopy();
  updatePlayerAbilityHud();
  updateStegoceratopsHud();
  updateCharacterConfirmationCopy();

  if (desktopBlocked) {
    stateLabel.textContent = ui("desktopOnly");
    startScreenMessage.textContent = ui("desktopMessage");
    startScreenMessage.hidden = false;
    startButton.hidden = true;
  } else if (paused) {
    stateLabel.textContent = ui("paused");
    updatePauseConfirmationCopy();
  } else if (running) {
    stateLabel.textContent = explorationMode ? ui("inProgress") : "";
  } else if (campaign.flags.completed) {
    showCampaignEnding();
  } else if (failureScreenActive || ["SIGNAL LOST", "SEÑAL PERDIDA"].includes(stateLabel.textContent)) {
    stateLabel.textContent = ui("signalLost");
    updateDefeatScreenCopy();
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
characterConfirmation.addEventListener("click", (event) => {
  if (event.target === characterConfirmation) returnToCharacterSelection();
});
document.querySelector("#cancel-character").addEventListener("click", closeDinoModal);
confirmCharacterButton.addEventListener("click", openCharacterConfirmation);
explorationBiomeBackButton?.addEventListener("click", () => {
  explorationBiomeDialog?.classList.add("hidden");
  dinoModal.classList.remove("hidden");
  confirmCharacterButton.focus();
});
explorationBiomeDialog?.querySelectorAll("[data-exploration-biome]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedExplorationBiomeIndex = Number(button.dataset.explorationBiome) || 0;
    explorationBiomeDialog.classList.add("hidden");
    setCharacterSelectionModalOpen(false);
    start("exploration");
  });
});
backCharacterConfirmationButton.addEventListener("click", returnToCharacterSelection);
playCharacterButton.addEventListener("click", startFromDinoModal);
menuToggle.addEventListener("click", () => setMenuOpen(navMenu.classList.contains("hidden")));
document.querySelector("#tutorial-button").addEventListener("click", () => openTutorial());
document.querySelector("#tutorial-close").addEventListener("click", closeTutorial);
gameplayBriefContinueButton.addEventListener("click", closeGameplayBrief);
gameplayBriefExitButton.addEventListener("click", exitExplorationBrief);
document.addEventListener("keydown", (event) => {
  if (gameplayBriefDialog.classList.contains("hidden")) return;
  event.stopPropagation();
  if (event.key === "Escape") {
    event.preventDefault();
    if (gameplayBriefDialog.classList.contains("exploration-brief")) exitExplorationBrief();
    else closeGameplayBrief();
  }
});
document.querySelector("#tutorial-dialog").addEventListener("click", (event) => {
  if (event.target.id === "tutorial-dialog") closeTutorial();
});
document.addEventListener("keydown", (event) => {
  const tutorialDialog = document.querySelector("#tutorial-dialog");
  if (tutorialDialog.classList.contains("hidden")) return;
  event.stopPropagation();
  if (event.key === "Escape") {
    event.preventDefault();
    closeTutorial();
  }
});
const markSiteLoaded = () => {
  requestAnimationFrame(() => {
    document.documentElement.classList.remove("site-loading");
    document.documentElement.classList.add("site-loaded");
  });
};
if (document.readyState === "complete") markSiteLoaded();
else window.addEventListener("load", markSiteLoaded, { once: true });
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
    audio.setAmbient(currentMusicTheme());
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
    if (!deleteCampaignConfirmation.classList.contains("hidden")) closeDeleteCampaignSaveConfirmation();
    else if (!pauseConfirmation.classList.contains("hidden")) closePauseConfirmation();
    else if (!characterConfirmation.classList.contains("hidden")) returnToCharacterSelection();
    else if (!dinoModal.classList.contains("hidden")) closeDinoModal();
    else if (!navMenu.classList.contains("hidden")) setMenuOpen(false);
    else if (activeStartMenuPage === "minigames") {
      showStartMenuPage("options");
      minigamesButton.focus();
    } else if (activeStartMenuPage === "options") {
      showStartMenuPage("home");
      startButton.focus();
    }
    return;
  }
  if (event.code === "Enter" && event.target instanceof Element && event.target.closest("button, a, input, select, textarea, [role='button']")) return;
  if (event.code === "KeyP" && !event.repeat && !campaign.sceneOpen &&
      !prologueCharacterSelectionPending && pauseConfirmation.classList.contains("hidden")) togglePause();
  if (event.code === "Enter" && !event.repeat && campaign.sceneOpen) advanceStory();
  else if (event.code === "Enter" && !event.repeat && !running && !paused && !desktopBlocked && dinoModal.classList.contains("hidden") && navMenu.classList.contains("hidden")) {
    if (!overlay.classList.contains("hidden")) openDinoModal("overlay", explorationMode ? "exploration" : "campaign");
    else if (activeStartMenuPage === "home") showStartMenuPage("options");
    else if (activeStartMenuPage === "options") openDinoModal("start", "campaign");
    else minigamesButton.focus();
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
  continueCampaignButton.disabled = !canPlay;
  persecutionButton.disabled = !canPlay;
  huntingButton.disabled = !canPlay;
  ambushButton.disabled = !canPlay;
  raceButton.disabled = !canPlay;

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
    saveCurrentCampaignSafely({ allowNarration: true });
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

window.addEventListener("pagehide", () => {
  saveCurrentCampaignSafely({ allowNarration: true });
});

applyLanguage();
setEnvironmentMode(environmentMode);
selectCharacter(selected);
render();
refreshContinueCampaignButton();
syncDesktopAccess();
