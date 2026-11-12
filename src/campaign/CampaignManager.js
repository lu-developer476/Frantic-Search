const OPENING = [
  { speaker: "MISSION CONTROL", text: "Convoy sighted on the coastal highway. The poachers are moving a young raptor toward an unregistered research site." },
  { speaker: "MISSION CONTROL", text: "The signal matches Rosa. Your objective is to locate the containment wing, disable its security locks and extract her alive." },
  { speaker: "VIOLETA", text: "That is my daughter. We are bringing her home." },
  { speaker: "MISSION CONTROL", text: "Violeta and Vasti, you are cleared to proceed. Keep each other alive." }
];

export class CampaignManager {
  constructor() {
    this.flags = {
      indoraptorDefeated: false,
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

  begin() {
    this.queueScene("opening", "OPERATION: LOST HATCHLING", OPENING);
  }

  queueScene(id, title, lines) {
    if (this.seenScenes.has(id) || this.flags.completed) return false;
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
    if (worldX >= 1500) {
      this.chapter = "REDWOOD FRONTIER";
      this.objective = "TRACK THE CONVOY";
      this.queueScene("redwood-arrival", "REDWOOD FRONTIER", [
        { speaker: "MISSION CONTROL", text: "The convoy left the highway and entered the redwood corridor. Thermal readings show armed escorts ahead." },
        { speaker: "VASTI", text: "Then we clear the path. Keep moving." }
      ]);
    }
    if (worldX >= 3000) {
      this.chapter = "POACHER BLACK SITE";
      this.objective = this.flags.indoraptorDefeated ? "PUSH INTO THE FACILITY" : "SURVIVE THE INDORAPTOR";
      this.queueScene("black-site-arrival", "UNREGISTERED FACILITY", [
        { speaker: "MISSION CONTROL", text: "We found it. A clandestine research complex hidden beyond the forest. The perimeter is guarded." },
        { speaker: "MISSION CONTROL", text: "An apex containment signal is moving inside the complex. Do not let it reach the surface." }
      ]);
    }
    if (worldX >= 6000) {
      this.chapter = "CONTAINMENT WING";
      this.objective = this.flags.indominusDefeated ? "ENTER THE CONTAINMENT WING" : "NEUTRALIZE THE INDOMINUS";
    }
    if (worldX >= 7500 && !this.flags.betaFreed) {
      this.chapter = "ROSA CONTAINMENT";
      this.refreshObjective();
      this.queueScene("facility-entry", "CONTAINMENT WING", [
        { speaker: "MISSION CONTROL", text: "You are inside the facility. The security network controls the containment doors and life-support systems." },
        { speaker: "MISSION CONTROL", text: "Restore the auxiliary power relay first. Then release the internal security lock. Rosa's cell is deeper in the wing." },
        { speaker: "VIOLETA", text: "I can hear her. We're close." }
      ]);
    }
    if (this.flags.betaFreed) {
      this.chapter = "EXTRACTION";
      this.objective = "ESCORT ROSA TO EXTRACTION";
    }
  }

  onBossDefeated(kind) {
    if (kind === "indoraptor") {
      this.flags.indoraptorDefeated = true;
      this.objective = "ADVANCE TO THE BLACK SITE";
      this.queueScene("indoraptor-defeated", "THREAT NEUTRALIZED", [
        { speaker: "MISSION CONTROL", text: "Indoraptor is down. The facility's outer security just lost its primary perimeter asset." },
        { speaker: "VASTI", text: "No more surprises. Find the hatchling." }
      ]);
    }
    if (kind === "indominus") {
      this.flags.indominusDefeated = true;
      this.objective = "ENTER THE CONTAINMENT WING";
      this.queueScene("indominus-defeated", "CONTAINMENT BREACHED", [
        { speaker: "MISSION CONTROL", text: "Indominus Rex neutralized. Its containment systems are offline, but Rosa's cell is still sealed." },
        { speaker: "VIOLETA", text: "That thing was guarding her. I'm coming, Rosa." }
      ]);
    }
    this.refreshObjective();
  }

  activateConsole(kind) {
    if (kind === "security" && !this.flags.powerRestored) return false;
    if (kind === "power") {
      this.flags.powerRestored = true;
      this.objective = "RELEASE THE SECURITY LOCK";
      this.queueScene("power-restored", "AUXILIARY POWER RESTORED", [
        { speaker: "MISSION CONTROL", text: "Auxiliary power is back online. The internal security terminal is responding." },
        { speaker: "MISSION CONTROL", text: "One more system. Release the containment lock." }
      ]);
    } else if (kind === "security" && this.flags.powerRestored) {
      this.flags.securityReleased = true;
      this.objective = "FIND ROSA'S CELL";
      this.queueScene("security-released", "CONTAINMENT LOCK RELEASED", [
        { speaker: "MISSION CONTROL", text: "Security lockdown disengaged. Cell block C is now accessible." },
        { speaker: "VIOLETA", text: "Rosa! Stay where you are. I'm right here." }
      ]);
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
    this.chapter = "EXTRACTION";
    this.objective = "ESCORT ROSA TO EXTRACTION";
    this.queueScene("beta-rescued", "SUBJECT ROSA SECURED", [
      { speaker: "ROSA", text: "Mrrr...!" },
      { speaker: "VIOLETA", text: "There you are. I promised I would find you." },
      { speaker: "MISSION CONTROL", text: "Rosa's vital signs are stable. Extraction team is approaching the east service gate. Bring her to the marker." },
      { speaker: "VASTI", text: "No one gets left behind. Let's go." }
    ]);
    return true;
  }

  complete() {
    if (!this.flags.betaFreed || this.flags.completed) return false;
    this.objective = "MISSION COMPLETE";
    const queued = this.queueScene("campaign-complete", "OPERATION COMPLETE", [
      { speaker: "MISSION CONTROL", text: "Extraction confirmed. Rosa is safe and the clandestine facility has been exposed." },
      { speaker: "VIOLETA", text: "You're home, little one. We're together again." },
      { speaker: "VASTI", text: "This is not the end of the wild. But this time, we brought our family back." }
    ]);
    this.flags.completed = true;
    return queued;
  }

  refreshObjective() {
    if (this.flags.completed) this.objective = "MISSION COMPLETE";
    else if (this.flags.betaFreed) this.objective = "ESCORT ROSA TO EXTRACTION";
    else if (this.flags.securityReleased) this.objective = "FIND ROSA'S CELL";
    else if (this.flags.powerRestored) this.objective = "RELEASE THE SECURITY LOCK";
    else if (this.flags.indominusDefeated) this.objective = "RESTORE AUXILIARY POWER";
  }
}
