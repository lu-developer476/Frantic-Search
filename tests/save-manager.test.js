import test from "node:test";
import assert from "node:assert/strict";
import {
  SaveManager,
  isValidCampaignProgress,
  isValidCampaignSnapshot
} from "../src/storage/SaveManager.js";

const FLAGS = {
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

function createSnapshot(overrides = {}) {
  return {
    schemaVersion: 1,
    selectedCharacter: "blue",
    levelIndex: 0,
    distance: 0,
    worldSeed: 123456,
    rescues: 0,
    playerHealth: 5,
    stegoceratopsCooldown: 0,
    collectedCollectibleIds: [],
    rescuedFerrucutusCageIds: [],
    allies: [],
    campaign: {
      flags: { ...FLAGS },
      seenScenes: ["opening"],
      queue: [],
      activeScene: {
        id: "opening",
        title: "OPERATION: LOST HATCHLING",
        lines: ["The search begins."],
        index: 0
      },
      objective: "FOLLOW THE CONVOY",
      chapter: "COASTAL HIGHWAY"
    },
    ...overrides
  };
}

function installStorage(t, initial = null) {
  const previous = globalThis.localStorage;
  const entries = new Map();
  if (initial !== null) entries.set("avoid-save-v1", JSON.stringify(initial));

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem(key) { return entries.has(key) ? entries.get(key) : null; },
      setItem(key, value) { entries.set(key, String(value)); },
      removeItem(key) { entries.delete(key); }
    }
  });

  t.after(() => {
    if (previous === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, "localStorage", { configurable: true, value: previous });
  });

  return entries;
}

test("legacy preferences and statistics survive the campaign-save upgrade", (t) => {
  installStorage(t, {
    bestDistance: 4820,
    rescues: 7,
    muted: true,
    selectedCharacter: "vasti",
    language: "en",
    environmentMode: "gray"
  });

  const save = new SaveManager();
  assert.equal(save.get("bestDistance"), 4820);
  assert.equal(save.get("rescues"), 7);
  assert.equal(save.get("muted"), true);
  assert.equal(save.get("selectedCharacter"), "vasti");
  assert.equal(save.get("language"), "en");
  assert.equal(save.get("environmentMode"), "gray");
  assert.equal(save.getCampaignProgress(), null);
});

test("campaign progress round-trips with separate continue and retry snapshots", (t) => {
  const storage = installStorage(t);
  const save = new SaveManager();
  const opening = createSnapshot();
  const checkpoint = createSnapshot({ levelIndex: 1, distance: 7200 });
  const current = createSnapshot({ levelIndex: 1, distance: 8050, playerHealth: 4 });

  assert.equal(isValidCampaignSnapshot(opening), true);
  assert.equal(isValidCampaignProgress({
    schemaVersion: 1,
    savedAt: Date.now(),
    snapshot: current,
    levelStartSnapshot: opening,
    checkpointSnapshot: checkpoint
  }), true);

  assert.equal(save.saveCampaignProgress({
    snapshot: current,
    levelStartSnapshot: opening,
    checkpointSnapshot: checkpoint
  }), true);

  const reloaded = new SaveManager().getCampaignProgress();
  assert.equal(reloaded.snapshot.distance, 8050);
  assert.equal(reloaded.snapshot.playerHealth, 4);
  assert.equal(reloaded.levelStartSnapshot.distance, 0);
  assert.equal(reloaded.checkpointSnapshot.distance, 7200);
  assert.equal(reloaded.snapshot.worldSeed, 123456);
  assert.ok(JSON.parse(storage.get("avoid-save-v1")).campaignSave.savedAt > 0);
});

test("invalid or incompatible campaign data is rejected instead of restored", (t) => {
  installStorage(t);
  const save = new SaveManager();
  const invalid = createSnapshot({ worldSeed: -10 });

  assert.equal(isValidCampaignSnapshot(invalid), false);
  assert.equal(save.saveCampaignProgress({ snapshot: invalid }), false);
  assert.equal(save.getCampaignProgress(), null);
});

test("campaign deletion preserves lifetime records and user preferences", (t) => {
  installStorage(t, { bestDistance: 12000, rescues: 9, muted: true });
  const save = new SaveManager();
  const snapshot = createSnapshot();

  assert.equal(save.saveCampaignProgress({ snapshot }), true);
  save.clearCampaignProgress();

  const reloaded = new SaveManager();
  assert.equal(reloaded.getCampaignProgress(), null);
  assert.equal(reloaded.get("bestDistance"), 12000);
  assert.equal(reloaded.get("rescues"), 9);
  assert.equal(reloaded.get("muted"), true);
});

test("malformed local storage falls back to defaults without breaking startup", (t) => {
  const storage = installStorage(t);
  storage.set("avoid-save-v1", "{not valid JSON");

  const save = new SaveManager();
  assert.equal(save.get("bestDistance"), 0);
  assert.equal(save.getCampaignProgress(), null);
});

test("legacy snapshots without collectible fields remain valid",()=>{
 const legacy=createSnapshot();delete legacy.collectedCollectibleIds;
 assert.equal(isValidCampaignSnapshot(legacy),true);
});
test("collectible progress permits six health only after six amber fossils",()=>{
 const ids=["amber-0-1","amber-0-2","amber-1-1","amber-1-2","amber-2-1","amber-2-2","intel-2"];
 assert.equal(isValidCampaignSnapshot(createSnapshot({playerHealth:6,collectedCollectibleIds:ids})),true);
 assert.equal(isValidCampaignSnapshot(createSnapshot({playerHealth:6,collectedCollectibleIds:["amber-0-1"]})),false);
 assert.equal(isValidCampaignSnapshot(createSnapshot({playerHealth:7,collectedCollectibleIds:ids})),false);
 assert.equal(isValidCampaignSnapshot(createSnapshot({collectedCollectibleIds:["unknown"]})),false);
});
test("continue and checkpoint data retain collected collectible IDs",(t)=>{
 installStorage(t);const save=new SaveManager();
 const current=createSnapshot({collectedCollectibleIds:["amber-0-1","intel-2"],playerHealth:6});
 const start=createSnapshot(),checkpoint=createSnapshot({collectedCollectibleIds:["amber-0-1"]});
 assert.equal(save.saveCampaignProgress({snapshot:current,levelStartSnapshot:start,checkpointSnapshot:checkpoint}),true);
 const loaded=new SaveManager().getCampaignProgress();
 assert.deepEqual(loaded.snapshot.collectedCollectibleIds,["amber-0-1","intel-2"]);
 assert.deepEqual(loaded.levelStartSnapshot.collectedCollectibleIds,[]);
 assert.deepEqual(loaded.checkpointSnapshot.collectedCollectibleIds,["amber-0-1"]);
});


test("malformed collectible ledgers are rejected without throwing", () => {
  const snapshot = createSnapshot();
  assert.equal(isValidCampaignSnapshot({ ...snapshot, collectedCollectibleIds: "amber-0-1" }), false);
  assert.equal(isValidCampaignSnapshot({ ...snapshot, collectedCollectibleIds: { fossil: true } }), false);
});
