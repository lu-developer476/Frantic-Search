const PROLOGUE_DURATIONS = Object.freeze({
  rest: 4.2,
  capture: 5.4,
  search: 6.2,
  fight: 8.4,
  advance: 5.4
});

const DIALOGUE_TO_SEQUENCE = Object.freeze({
  "capture-dialog": "search",
  "tracks-dialog": "fight",
  "alliance-dialog": "advance"
});

export const PROLOGUE_MILESTONES = Object.freeze({
  capture: 1000,
  encounter: 1200,
  fightEnd: 1500,
  levelOne: 1800
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
    this.venatosauruses = [];
    this.hunters = [];
    this.rosaCaptured = false;
    this.tracksFound = false;
    this.predatorsDefeated = false;
    this.strikeShown = false;
    this.soundCueTimer = 0;
  }

  get progress() {
    const duration = PROLOGUE_DURATIONS[this.phase];
    return duration ? Math.max(0, Math.min(1, this.elapsed / duration)) : 0;
  }

  canInteract(player, radius = 52) {
    if (!this.active || this.phase !== "explore" || !player ||
        !Number.isFinite(player.x) || !Number.isFinite(player.w) ||
        !Number.isFinite(radius) || radius < 0) return false;
    const playerCenter = player.x + player.w / 2;
    return Math.abs(playerCenter - this.captureX) <= radius;
  }

  interactWithJeep(player) {
    if (!this.canInteract(player)) return false;
    // Anchor the capture to the exact 1,000 m milestone, not to the edge of
    // the interaction radius. The player is physically aligned with the jeep.
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

    this.phase = completedPhase === "capture" ? "capture-dialog"
      : completedPhase === "search" ? "tracks-dialog"
        : completedPhase === "fight" ? "alliance-dialog" : "complete";
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
}
