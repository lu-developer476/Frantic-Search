const PROLOGUE_DURATIONS = Object.freeze({
  rest: 2.4,
  capture: 3.8,
  search: 5.2,
  fight: 5.6
});

const DIALOGUE_TO_SEQUENCE = Object.freeze({
  "capture-dialog": "search",
  "tracks-dialog": "fight",
  "alliance-dialog": "complete"
});

export class CampaignPrologue {
  constructor({ startX = 145, jeepOffset = 660, trackOffset = 360, encounterOffset = 500 } = {}) {
    for (const [name, value] of Object.entries({ startX, jeepOffset, trackOffset, encounterOffset })) {
      if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number.`);
    }
    if (jeepOffset <= 0 || trackOffset <= 0 || encounterOffset <= 0) {
      throw new RangeError("Prologue landmarks must be placed ahead of the starting point.");
    }

    this.startX = startX;
    this.jeepX = startX + jeepOffset;
    this.jeepVisualX = this.jeepX;
    this.trackX = this.jeepX + trackOffset;
    this.encounterX = this.trackX + encounterOffset;
    this.phase = "rest";
    this.active = true;
    this.elapsed = 0;
    this.violetaActor = null;
    this.vastiActor = null;
    this.venatosaurus = null;
    this.hunters = [];
    this.rosaCaptured = false;
    this.tracksFound = false;
    this.predatorDefeated = false;
    this.strikeShown = false;
    this.soundCueTimer = 0;
  }

  get progress() {
    const duration = PROLOGUE_DURATIONS[this.phase];
    return duration ? Math.max(0, Math.min(1, this.elapsed / duration)) : 0;
  }

  canInteract(player, radius = 116) {
    if (!this.active || this.phase !== "explore" || !player ||
        !Number.isFinite(player.x) || !Number.isFinite(player.w) ||
        !Number.isFinite(radius) || radius < 0) return false;
    const playerCenter = player.x + player.w / 2;
    const jeepCenter = this.jeepX + 78;
    return Math.abs(playerCenter - jeepCenter) <= radius;
  }

  interactWithJeep(player) {
    if (!this.canInteract(player)) return false;
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

    this.phase = completedPhase === "capture" ? "capture-dialog"
      : completedPhase === "search" ? "tracks-dialog"
        : "alliance-dialog";
    this.elapsed = 0;
    return completedPhase;
  }

  continueAfterNarration() {
    const nextPhase = DIALOGUE_TO_SEQUENCE[this.phase];
    if (!nextPhase) return null;
    this.phase = nextPhase;
    this.elapsed = 0;
    if (nextPhase === "complete") this.active = false;
    return nextPhase;
  }
}
