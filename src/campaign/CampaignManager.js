import { GAME, LEVELS, WORLD } from "../config/GameConfig.js";

const OPENING = [
  "A poacher convoy crosses the coastal highway, carrying a young Velociraptor toward an unregistered research facility.",
  "An intercepted signal identifies the captive as Rosa, Violeta's daughter. The mission is to locate the containment wing, disable its security systems and bring her back alive.",
  "Violeta and Vasti set out together, following the convoy's trail and watching over one another.",
  "The trail leads beyond the highway, into territory controlled by armed poachers and predators held inside the same operation."
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
      this.queueScene("redwood-arrival", "REDWOOD FRONTIER", [
        "The convoy leaves the coastal highway and enters the Redwood Frontier. Towering redwoods close over the route, while armed poacher escorts patrol the forest.",
        "A second set of tracks cuts through the undergrowth. An Indoraptor is hunting ahead, and the route will not be safe until it is stopped."
      ]);
    }
    if (worldX >= chapterStart(2)) {
      this.chapter = LEVELS[2].name;
      this.objective = this.flags.indoraptorDefeated ? "BREACH THE BLACK SITE" : "DEFEAT THE INDORAPTOR";
      this.queueScene("black-site-arrival", "POACHER BLACK SITE", [
        "Beyond the Redwood Frontier, the Poacher Black Site appears behind reinforced fencing and guarded service roads.",
        "Breach the clandestine complex and follow the convoy's trail toward Rosa's containment wing."
      ]);
    }
    if (worldX >= WORLD.sectionStarts[3]) {
      this.objective = this.flags.indoraptorDefeated ? "BREACH THE BLACK SITE" : "DEFEAT THE INDORAPTOR";
      this.queueScene("black-site-interior", "INNER RESEARCH PERIMETER", [
        "The first perimeter is behind the group. A second service corridor leads deeper into the black site, where transport records and containment systems converge.",
        "The route is longer than the convoy trail suggested. Patrols are spread across the industrial grounds, and the next containment sector remains ahead."
      ]);
    }
    if (worldX >= chapterStart(3)) {
      this.chapter = LEVELS[3].name;
      this.objective = this.flags.indominusDefeated ? "RESTORE AUXILIARY POWER" : "DEFEAT THE INDOMINUS REX";
      this.queueScene("containment-perimeter-arrival", "CONTAINMENT PERIMETER", [
        "The inner perimeter opens onto a reinforced containment yard. Heavy blast doors divide this sector from the cell block.",
        "The Indominus Rex is guarding the only route forward. Its defeat is required before the facility's auxiliary systems can be reached."
      ]);
    }
    if (worldX >= chapterStart(4)) {
      this.chapter = LEVELS[4].name;
      this.refreshObjective();
      this.queueScene("facility-entry", "CONTAINMENT WING", [
        "Inside the facility, a security network controls the containment doors and life-support systems.",
        "Rosa's cell is deeper in the wing. The auxiliary power relay must be restored before the internal security lock can be released.",
        "Faint sounds from the cell block confirm that Rosa is still alive. The rescue is close, but the route remains sealed."
      ]);
    }

    if (this.flags.betaFreed) {
      this.objective = "ESCORT ROSA TO THE EAST GATE";
      if (worldX >= chapterStart(5)) {
        this.chapter = LEVELS[5].name;
        this.queueScene("extraction-arrival", "EXTRACTION ZONE", [
          "Rosa is out of containment. The service road beyond the cell block leads to the extraction gate.",
          "The route is still exposed. Keep the group together and reach the east gate to complete the rescue."
        ]);
      } else {
        this.chapter = LEVELS[4].name;
      }
    }
  }

  onBossDefeated(kind) {
    if (kind === "indoraptor") {
      this.flags.indoraptorDefeated = true;
      this.objective = "BREACH THE BLACK SITE";
      this.queueScene("indoraptor-defeated", "THREAT NEUTRALIZED", [
        "The Indoraptor falls at the edge of Redwood Frontier. The route to Poacher Black Site is now open.",
        "The route to the clandestine complex is clear. The search for Rosa continues beyond its perimeter."
      ]);
    }
    if (kind === "indominus") {
      this.flags.indominusDefeated = true;
      this.objective = "RESTORE AUXILIARY POWER";
      this.queueScene("indominus-defeated", "CONTAINMENT BREACHED", [
        "The Indominus Rex is defeated. Its containment systems fall silent, but Rosa's cell remains sealed behind the facility's security network.",
        "With the perimeter threat removed, the path to the containment wing is finally open."
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
        "Auxiliary power returns to the facility. The internal security terminal comes back online.",
        "Only one barrier remains: the containment lock protecting the cell block."
      ]);
    } else if (kind === "security" && this.flags.powerRestored) {
      this.flags.securityReleased = true;
      this.objective = "FREE ROSA";
      this.queueScene("security-released", "CONTAINMENT LOCK RELEASED", [
        "The security lockdown disengages. Cell block C is now accessible.",
        "At the end of the corridor, Rosa's enclosure stands between the family and a long-awaited reunion."
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
    this.chapter = LEVELS[4].name;
    this.objective = "ESCORT ROSA TO THE EAST GATE";
    this.queueScene("beta-rescued", "SUBJECT ROSA SECURED", [
      "Rosa is freed from containment. After everything that happened, she stays close to Violeta as the rescue team approaches the east service gate.",
      "Her vital signs are stable. The only remaining task is to escort her to the extraction marker.",
      "Violeta, Vasti and Rosa leave the cell block together, accompanied by the Ferrucutus they rescued along the way."
    ]);
    return true;
  }

  complete() {
    if (!this.flags.betaFreed || this.flags.completed) return false;
    this.objective = "MISSION COMPLETE";
    const queued = this.queueScene("campaign-complete", "OPERATION COMPLETE", [
      "Extraction is confirmed. Rosa is safe, and evidence from the clandestine facility can expose the operation.",
      "After crossing the facility and its perimeter, the group can finally leave together.",
      "The wilderness remains dangerous, but this rescue brings the family back together."
    ]);
    this.flags.completed = true;
    return queued;
  }

  refreshObjective() {
    if (this.flags.completed) this.objective = "MISSION COMPLETE";
    else if (this.flags.betaFreed) this.objective = "ESCORT ROSA TO THE EAST GATE";
    else if (this.flags.securityReleased) this.objective = "FREE ROSA";
    else if (this.flags.powerRestored) this.objective = "RELEASE THE SECURITY LOCK";
    else if (this.flags.indominusDefeated) this.objective = "RESTORE AUXILIARY POWER";
  }
}
