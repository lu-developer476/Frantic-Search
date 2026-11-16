const PROLOGUE_DURATIONS = Object.freeze({
  rest: 4.2,
  capture: 5.4,
  search: 8.3,
  advance: 13.75
});

const DIALOGUE_TO_SEQUENCE = Object.freeze({
  "capture-dialog": "search",
  "tracks-dialog": "character-select",
  "alliance-dialog": "advance"
});

export const PROLOGUE_MILESTONES = Object.freeze({
  capture: 2000,
  encounter: 2500,
  fightEnd: 2800,
  levelOne: 5000
});

export const PROLOGUE_VENATOSAURUS_KINDS = Object.freeze([
  "venatosaurus-impavidus",
  "venatosaurus-saevidicus"
]);

export class CampaignPrologue {
  constructor({ startX = 145 } = {}) {
    if (!Number.isFinite(startX)) {
      throw new TypeError("startX must be a finite number.");
    }

    this.startX = startX;
    this.captureX = startX + PROLOGUE_MILESTONES.capture;
    this.jeepX = this.captureX - 78;
    this.jeepVisualX = this.jeepX;
    this.trackX = startX + PROLOGUE_MILESTONES.encounter;
    this.encounterX = this.trackX;
    this.fightEndX = startX + PROLOGUE_MILESTONES.fightEnd;
    this.levelOneX = startX + PROLOGUE_MILESTONES.levelOne;
    this.phase = "rest";
    this.active = true;
    this.elapsed = 0;
    this.violetaActor = null;
    this.vastiActor = null;
    this.companionActor = null;
    this.venatosauruses = [];
    this.hunters = [];
    this.rosaCaptured = false;
    this.tracksFound = false;
    this.predatorsDefeated = false;
    this.selectedCharacter = null;
    this.tutorial = null;
    this.strikeShown = false;
    this.soundCueTimer = 0;
  }

  get progress() {
    const duration = PROLOGUE_DURATIONS[this.phase];
    return duration ? Math.max(0, Math.min(1, this.elapsed / duration)) : 0;
  }

  captureAtMilestone(player) {
    if (!this.active || this.phase !== "explore" || !player ||
        !Number.isFinite(player.x) || !Number.isFinite(player.w)) return false;
    if (player.x + player.w / 2 < this.captureX) return false;

    player.x = this.captureX - player.w / 2;
    player.vx = 0;
    this.phase = "capture";
    this.elapsed = 0;
    return true;
  }

  update(delta) {
    if (!Number.isFinite(delta) || delta < 0) {
      throw new RangeError("Prologue delta must be a finite, non-negative number.");
    }
    if (!this.active || !PROLOGUE_DURATIONS[this.phase]) return null;

    const completedPhase = this.phase;
    this.elapsed = Math.min(PROLOGUE_DURATIONS[completedPhase], this.elapsed + delta);
    if (this.elapsed < PROLOGUE_DURATIONS[completedPhase]) return null;

    if (completedPhase === "rest") {
      this.phase = "explore";
      this.elapsed = 0;
      return "rest";
    }

    if (completedPhase === "advance") {
      this.phase = "complete";
      this.elapsed = 0;
      this.active = false;
      return "advance";
    }

    this.phase = completedPhase === "capture" ? "capture-dialog" : "tracks-dialog";
    this.elapsed = 0;
    return completedPhase;
  }

  continueAfterNarration() {
    const nextPhase = DIALOGUE_TO_SEQUENCE[this.phase];
    if (!nextPhase) return null;
    this.phase = nextPhase;
    this.elapsed = 0;
    return nextPhase;
  }

  beginFight(character) {
    if (!this.active || this.phase !== "character-select" ||
        !["blue", "vasti"].includes(character)) return false;
    this.selectedCharacter = character;
    this.phase = "fight";
    this.elapsed = 0;
    return true;
  }

  completeFight(worldDistance, predatorsDefeated, tutorialComplete) {
    if (!this.active || this.phase !== "fight" ||
        !Number.isFinite(worldDistance) || worldDistance < PROLOGUE_MILESTONES.fightEnd ||
        !predatorsDefeated || !tutorialComplete) return false;
    this.predatorsDefeated = true;
    this.phase = "alliance-dialog";
    this.elapsed = 0;
    return true;
  }
}
