const KEY = "avoid-save-v1";
const CAMPAIGN_SAVE_VERSION = 1;
const CAMPAIGN_FLAGS = [
  "indoraptorFirstDefeated",
  "indoraptorSecondDefeated",
  "indoraptorDefeated",
  "indominusFirstDefeated",
  "indominusSecondDefeated",
  "indominusVariantDefeated",
  "indominusDefeated",
  "powerRestored",
  "securityReleased",
  "betaFreed",
  "completed"
];

const DEFAULTS = {
  bestDistance: 0,
  rescues: 0,
  muted: false,
  selectedCharacter: "blue",
  campaignCompleted: false,
  completedCampaigns: 0,
  campaignCheckpointReached: false,
  campaignSave: null
};

function isNonEmptyString(value, maxLength = 180) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isCollectibleId(value) {
  if (!isNonEmptyString(value, 80)) return false;
  const parts = value.split("-");
  const digits = (part) => part.length > 0 && /^[0-9]+$/.test(part);
  if (!digits(parts[1] ?? "")) return false;

  const section = Number(parts[1]);

  if (parts[0] === "amber") {
    if (parts.length !== 3 || !digits(parts[2])) return false;
    const slot = Number(parts[2]);
    return section >= 0 && section <= 6 && section !== 5 &&
      slot >= 1 && slot <= 2;
  }

  if (parts[0] === "intel") {
    // Previous saves used "intel-2"; current generator writes "intel-2-1".
    const legacyId = parts.length === 2;
    const generatedId = parts.length === 3 &&
      digits(parts[2]) && Number(parts[2]) === 1;
    return (legacyId || generatedId) && section >= 2 && section <= 4;
  }

  if (parts[0] === "egg") {
    if (parts.length !== 3 || !digits(parts[2])) return false;
    const slot = Number(parts[2]);
    const validSection = [0, 1, 2, 3, 4, 6].includes(section);
    const maxSlot = section === 6 ? 2 : 1;
    return validSection && slot >= 1 && slot <= maxSlot;
  }

  return false;
}
function isScene(scene) {
  return Boolean(
    scene &&
    typeof scene === "object" &&
    isNonEmptyString(scene.id, 100) &&
    isNonEmptyString(scene.title, 180) &&
    Array.isArray(scene.lines) &&
    scene.lines.length > 0 &&
    scene.lines.length <= 32 &&
    scene.lines.every((line) => isNonEmptyString(line, 2000)) &&
    Number.isInteger(scene.index) &&
    scene.index >= 0 &&
    scene.index < scene.lines.length
  );
}

export function isValidCampaignSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || snapshot.schemaVersion !== CAMPAIGN_SAVE_VERSION) {
    return false;
  }

  const campaign = snapshot.campaign;
  const flags = campaign?.flags;
  const validFlags = flags && typeof flags === "object" &&
    CAMPAIGN_FLAGS.every((key) => typeof flags[key] === "boolean");
  const collectedIds = Array.isArray(snapshot.collectedCollectibleIds)
    ? snapshot.collectedCollectibleIds
    : [];
  const validCollectibles = snapshot.collectedCollectibleIds === undefined ||
    (Array.isArray(snapshot.collectedCollectibleIds) &&
      collectedIds.length <= 22 &&
      new Set(collectedIds).size === collectedIds.length &&
      collectedIds.every(isCollectibleId));
  const healthCap = collectedIds.filter((id) => typeof id === "string" && id.startsWith("amber-")).length >= 6 ? 6 : 5;

  return (
    (snapshot.selectedCharacter === "blue" || snapshot.selectedCharacter === "vasti") &&
    Number.isInteger(snapshot.levelIndex) &&
    snapshot.levelIndex >= 0 &&
    snapshot.levelIndex <= 5 &&
    Number.isFinite(snapshot.distance) &&
    snapshot.distance >= 0 &&
    snapshot.distance <= 100000 &&
    Number.isInteger(snapshot.worldSeed) &&
    snapshot.worldSeed > 0 &&
    snapshot.worldSeed <= 0xffffffff &&
    Number.isInteger(snapshot.rescues) &&
    snapshot.rescues >= 0 &&
    Number.isInteger(snapshot.playerHealth) &&
    snapshot.playerHealth >= 1 &&
    snapshot.playerHealth <= healthCap &&
    validCollectibles &&
    Number.isFinite(snapshot.stegoceratopsCooldown) &&
    snapshot.stegoceratopsCooldown >= 0 &&
    snapshot.stegoceratopsCooldown <= 30 &&
    Array.isArray(snapshot.allies) &&
    snapshot.allies.length <= 20 &&
    snapshot.allies.every((ally) =>
      ally &&
      isNonEmptyString(ally.id, 140) &&
      Number.isFinite(ally.distanceBehind) &&
      ally.distanceBehind >= 0 &&
      ally.distanceBehind <= 100000
    ) &&
    Array.isArray(snapshot.rescuedFerrucutusCageIds) &&
    snapshot.rescuedFerrucutusCageIds.length <= 20 &&
    snapshot.rescuedFerrucutusCageIds.every((id) => isNonEmptyString(id, 140)) &&
    validFlags &&
    flags.completed === false &&
    Array.isArray(campaign.seenScenes) &&
    campaign.seenScenes.length <= 128 &&
    campaign.seenScenes.every((id) => isNonEmptyString(id, 100)) &&
    Array.isArray(campaign.queue) &&
    campaign.queue.length <= 32 &&
    campaign.queue.every(isScene) &&
    (campaign.activeScene === null || isScene(campaign.activeScene)) &&
    isNonEmptyString(campaign.objective, 180) &&
    isNonEmptyString(campaign.chapter, 180)
  );
}

export function isValidCampaignProgress(progress) {
  if (!progress || typeof progress !== "object" ||
      progress.schemaVersion !== CAMPAIGN_SAVE_VERSION ||
      !Number.isFinite(progress.savedAt) ||
      !isValidCampaignSnapshot(progress.snapshot) ||
      !isValidCampaignSnapshot(progress.levelStartSnapshot) ||
      !isValidCampaignSnapshot(progress.checkpointSnapshot)) {
    return false;
  }

  const reference = progress.snapshot;
  return [progress.levelStartSnapshot, progress.checkpointSnapshot].every((snapshot) =>
    snapshot.worldSeed === reference.worldSeed &&
    snapshot.selectedCharacter === reference.selectedCharacter
  );
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export class SaveManager {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ...DEFAULTS };
      const data = { ...DEFAULTS, ...parsed };
      if (typeof data.campaignCheckpointReached !== "boolean") data.campaignCheckpointReached = false;
      if (!isValidCampaignProgress(data.campaignSave)) data.campaignSave = null;
      return data;
    } catch {
      return { ...DEFAULTS };
    }
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
      return true;
    } catch {
      // Storage may be unavailable in private contexts or restricted browser modes.
      return false;
    }
  }

  update(patch) {
    this.data = { ...this.data, ...patch };
    this.save();
    return this.data;
  }

  get(key) {
    return this.data[key];
  }

  getCampaignProgress() {
    const progress = this.data.campaignSave;
    if (!isValidCampaignProgress(progress)) {
      if (progress !== null) this.update({ campaignSave: null });
      return null;
    }
    try {
      return cloneJson(progress);
    } catch {
      return null;
    }
  }

  saveCampaignProgress({ snapshot, levelStartSnapshot = snapshot, checkpointSnapshot = snapshot } = {}) {
    const progress = {
      schemaVersion: CAMPAIGN_SAVE_VERSION,
      savedAt: Date.now(),
      snapshot,
      levelStartSnapshot,
      checkpointSnapshot
    };
    if (!isValidCampaignProgress(progress)) return false;

    try {
      this.update({ campaignSave: cloneJson(progress) });
      return true;
    } catch {
      return false;
    }
  }

  clearCampaignProgress() {
    this.update({ campaignSave: null, campaignCheckpointReached: false });
  }
}
