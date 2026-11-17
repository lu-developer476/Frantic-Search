import { GAME, LEVELS, WORLD } from "../config/GameConfig.js";
import { getCampaignSceneCopy } from "../i18n.js";

export const BOSS_ENCOUNTER_FLAGS = Object.freeze({
  "indoraptor-first-generation": "indoraptorFirstDefeated",
  "indoraptor-second-generation": "indoraptorSecondDefeated",
  "indominus-first-generation": "indominusFirstDefeated",
  "indominus-second-generation": "indominusSecondDefeated",
  "indominus-second-generation-variant": "indominusVariantDefeated"
});

const INDORAPTOR_ENCOUNTERS = [
  "indoraptor-first-generation",
  "indoraptor-second-generation"
];
const INDOMINUS_ENCOUNTERS = [
  "indominus-first-generation",
  "indominus-second-generation",
  "indominus-second-generation-variant"
];

export class CampaignManager {
  constructor() {
    this.flags = {
      indoraptorFirstDefeated: false,
      indoraptorSecondDefeated: false,
      indoraptorDefeated: false,
      indominusFirstDefeated: false,
      indominusSecondDefeated: false,
      indominusVariantDefeated: false,
      indominusDefeated: false,
      powerRestored: false,
      securityReleased: false,
      betaFreed: false,
      completed: false
    };
    this.seenScenes = new Set();
    this.queue = [];
    this.activeScene = null;
    this.objective = "FOLLOW THE CONVOY";
    this.chapter = "COASTAL HIGHWAY";
    this.facilityConsoles = [];
  }

  beginPrologue() {
    this.queueCampaignScene("prologue-intro");
  }

  begin() {
    this.queueCampaignScene("opening");
  }

  queueCampaignScene(id) {
    const scene = getCampaignSceneCopy(id, "en");
    if (!scene) throw new RangeError(`Unknown campaign scene: ${id}`);
    return this.queueScene(id, scene.title, scene.lines);
  }

  queueScene(id, title, lines) {
    if (this.seenScenes.has(id) || this.flags.completed) return false;
    if (!Array.isArray(lines) || lines.length === 0 ||
        lines.some((line) => typeof line !== "string" || !line.trim())) {
      throw new TypeError("Narrator scenes must contain non-empty text paragraphs.");
    }

    this.seenScenes.add(id);
    this.queue.push({ id, title, lines, index: 0 });
    if (!this.activeScene) this.activeScene = this.queue.shift();
    return true;
  }

  get sceneOpen() {
    return Boolean(this.activeScene);
  }

  get currentLine() {
    return this.activeScene?.lines[this.activeScene.index] ?? null;
  }

  advanceScene() {
    if (!this.activeScene) return false;
    this.activeScene.index += 1;
    if (this.activeScene.index >= this.activeScene.lines.length) {
      this.activeScene = this.queue.shift() ?? null;
    }
    return true;
  }

  updateLocation(worldX) {
    const chapterStart = (index) => GAME.playerX + LEVELS[index].distance;

    if (worldX >= chapterStart(1)) {
      this.chapter = LEVELS[1].name;
      this.objective = this.flags.indoraptorDefeated ? "BREACH THE BLACK SITE" : "SURVIVE THE REDWOOD FRONTIER";
      this.queueCampaignScene("redwood-arrival");
    }
    if (worldX >= chapterStart(2)) {
      this.chapter = LEVELS[2].name;
      this.objective = this.flags.indoraptorDefeated ? "BREACH THE BLACK SITE" : "DEFEAT THE INDORAPTOR";
      this.queueCampaignScene("black-site-arrival");
    }
    if (worldX >= WORLD.sectionStarts[3]) {
      this.objective = this.flags.indoraptorDefeated ? "BREACH THE BLACK SITE" : "DEFEAT THE INDORAPTOR";
      this.queueCampaignScene("black-site-interior");
    }
    if (worldX >= chapterStart(3)) {
      this.chapter = LEVELS[3].name;
      this.objective = this.flags.indominusDefeated ? "RESTORE AUXILIARY POWER" : "DEFEAT THE INDOMINUS REX";
      this.queueCampaignScene("containment-perimeter-arrival");
    }
    if (worldX >= chapterStart(4)) {
      this.chapter = LEVELS[4].name;
      this.refreshObjective();
      this.queueCampaignScene("facility-entry");
    }

    if (this.flags.betaFreed) {
      this.objective = "ESCORT BRISA TO THE EAST GATE";
      if (worldX >= chapterStart(5)) {
        this.chapter = LEVELS[5].name;
        this.queueCampaignScene("extraction-arrival");
      } else {
        this.chapter = LEVELS[4].name;
      }
    }
  }

  onBossDefeated(kind, encounterId = null) {
    if (kind === "indoraptor") {
      const wasComplete = this.flags.indoraptorDefeated;
      const encounterFlag = BOSS_ENCOUNTER_FLAGS[encounterId];
      if (encounterFlag?.startsWith("indoraptor")) {
        this.flags[encounterFlag] = true;
      } else if (!encounterId) {
        // Keep the original public method call compatible with existing campaign integrations.
        this.flags.indoraptorFirstDefeated = true;
        this.flags.indoraptorSecondDefeated = true;
      }

      this.flags.indoraptorDefeated = INDORAPTOR_ENCOUNTERS.every((id) =>
        this.flags[BOSS_ENCOUNTER_FLAGS[id]]
      );
      if (!wasComplete && this.flags.indoraptorDefeated) {
        this.objective = "BREACH THE BLACK SITE";
        this.queueCampaignScene("indoraptor-defeated");
      }
    }

    if (kind === "indominus") {
      const wasComplete = this.flags.indominusDefeated;
      const encounterFlag = BOSS_ENCOUNTER_FLAGS[encounterId];
      if (encounterFlag?.startsWith("indominus")) {
        this.flags[encounterFlag] = true;
      } else if (!encounterId) {
        this.flags.indominusFirstDefeated = true;
        this.flags.indominusSecondDefeated = true;
        this.flags.indominusVariantDefeated = true;
      }

      this.flags.indominusDefeated = INDOMINUS_ENCOUNTERS.every((id) =>
        this.flags[BOSS_ENCOUNTER_FLAGS[id]]
      );
      if (!wasComplete && this.flags.indominusDefeated) {
        this.objective = "RESTORE AUXILIARY POWER";
        this.queueCampaignScene("indominus-defeated");
      }
    }
    this.refreshObjective();
  }

  activateConsole(kind) {
    if (kind === "security" && !this.flags.powerRestored) return false;
    if (kind === "power") {
      this.flags.powerRestored = true;
      this.objective = "RELEASE THE SECURITY LOCK";
      this.queueCampaignScene("power-restored");
    } else if (kind === "security" && this.flags.powerRestored) {
      this.flags.securityReleased = true;
      this.objective = "FREE BRISA";
      this.queueCampaignScene("security-released");
    }
    this.refreshObjective();
    return kind === "power" || kind === "security";
  }

  canFreeBeta() {
    return this.flags.indominusDefeated &&
      this.flags.powerRestored &&
      this.flags.securityReleased &&
      !this.flags.betaFreed;
  }

  freeBeta() {
    if (!this.canFreeBeta()) return false;
    this.flags.betaFreed = true;
    this.chapter = LEVELS[4].name;
    this.objective = "ESCORT BRISA TO THE EAST GATE";
    this.queueCampaignScene("beta-rescued");
    return true;
  }

  complete() {
    if (!this.flags.betaFreed || this.flags.completed) return false;
    this.objective = "MISSION COMPLETE";
    const queued = this.queueCampaignScene("campaign-complete");
    this.flags.completed = true;
    return queued;
  }

  refreshObjective() {
    if (this.flags.completed) this.objective = "MISSION COMPLETE";
    else if (this.flags.betaFreed) this.objective = "ESCORT BRISA TO THE EAST GATE";
    else if (this.flags.securityReleased) this.objective = "FREE BRISA";
    else if (this.flags.powerRestored) this.objective = "RELEASE THE SECURITY LOCK";
    else if (this.flags.indominusDefeated) this.objective = "RESTORE AUXILIARY POWER";
  }
}
