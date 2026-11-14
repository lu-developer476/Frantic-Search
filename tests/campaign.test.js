import test from "node:test";
import assert from "node:assert/strict";
import { CampaignManager } from "../src/campaign/CampaignManager.js";
import { Beta } from "../src/entities/Beta.js";
import { FacilityConsole } from "../src/entities/FacilityConsole.js";

function drainScenes(campaign) {
  let guard = 0;
  while (campaign.sceneOpen && guard < 40) {
    campaign.advanceScene();
    guard += 1;
  }
  assert.ok(guard < 40, "dialogue queue should not get stuck");
}

function progressToFacility(campaign) {
  campaign.begin();
  drainScenes(campaign);
  campaign.updateLocation(3000);
  drainScenes(campaign);
  campaign.updateLocation(6000);
  drainScenes(campaign);
  campaign.onBossDefeated("indoraptor");
  drainScenes(campaign);
  campaign.updateLocation(9000);
  drainScenes(campaign);
  campaign.updateLocation(12000);
  drainScenes(campaign);
  campaign.onBossDefeated("indominus");
  drainScenes(campaign);
  campaign.updateLocation(15000);
  drainScenes(campaign);
}

test("security terminal stays locked until auxiliary power is restored", () => {
  const campaign = new CampaignManager();
  assert.equal(campaign.activateConsole("security"), false);
  assert.equal(campaign.flags.securityReleased, false);
  assert.equal(campaign.activateConsole("power"), true);
  drainScenes(campaign);
  assert.equal(campaign.activateConsole("security"), true);
  assert.equal(campaign.flags.powerRestored, true);
  assert.equal(campaign.flags.securityReleased, true);
});

test("Beta cannot be freed until Indominus, power and security are complete", () => {
  const campaign = new CampaignManager();
  assert.equal(campaign.canFreeBeta(), false);
  campaign.onBossDefeated("indominus");
  assert.equal(campaign.canFreeBeta(), false);
  campaign.activateConsole("power");
  drainScenes(campaign);
  assert.equal(campaign.canFreeBeta(), false);
  campaign.activateConsole("security");
  assert.equal(campaign.canFreeBeta(), true);
  assert.equal(campaign.freeBeta(), true);
  assert.equal(campaign.flags.betaFreed, true);
  assert.equal(campaign.objective, "ESCORT ROSA TO EXTRACTION");
});

test("complete narrative can only be queued after Beta is rescued", () => {
  const campaign = new CampaignManager();
  assert.equal(campaign.complete(), false);
  campaign.flags.indominusDefeated = true;
  campaign.flags.powerRestored = true;
  campaign.flags.securityReleased = true;
  assert.equal(campaign.freeBeta(), true);
  drainScenes(campaign);
  assert.equal(campaign.complete(), true);
  assert.equal(campaign.flags.completed, true);
  assert.equal(campaign.activeScene?.id, "campaign-complete");
  assert.equal(campaign.complete(), false);
});

test("opening and chapter narration is queued in order and can be advanced", () => {
  const campaign = new CampaignManager();
  campaign.begin();
  assert.equal(campaign.activeScene.id, "opening");
  assert.equal(campaign.activeScene.lines.length, 4);
  assert.ok(campaign.activeScene.lines.every((line) => typeof line === "string" && line.length > 0));
  assert.equal(typeof campaign.currentLine, "string");
  drainScenes(campaign);
  campaign.updateLocation(3000);
  assert.equal(campaign.activeScene.id, "redwood-arrival");
  drainScenes(campaign);
  campaign.updateLocation(6000);
  assert.equal(campaign.activeScene.id, "black-site-arrival");
  drainScenes(campaign);
  campaign.updateLocation(9000);
  assert.equal(campaign.activeScene.id, "black-site-interior");
});

test("narrative scenes reject character dialogue objects", () => {
  const campaign = new CampaignManager();
  assert.throws(
    () => campaign.queueScene("character-dialogue", "NOT ALLOWED", [{ speaker: "Violeta", text: "..." }]),
    TypeError
  );
});

test("facility terminals only interact in range and activate once", () => {
  const terminal = new FacilityConsole({ id: "power", kind: "power", x: 100, groundY: 430 });
  const player = { x: 100, y: 368, w: 64, h: 62 };
  assert.equal(terminal.canInteract(player), true);
  assert.equal(terminal.activate(), true);
  assert.equal(terminal.canInteract(player), false);
  assert.equal(terminal.activate(), false);
  player.x = 500;
  assert.equal(terminal.canInteract(player), false);
});

test("Beta follows the rescued player and can only be extracted once", () => {
  const beta = new Beta({ x: 8400, groundY: 430 });
  assert.equal(beta.rescue(), true);
  assert.equal(beta.state, "following");
  const player = { x: 8400, y: 368, w: 64, h: 62 };
  for (let i = 0; i < 120; i += 1) {
    player.x += 340 / 60;
    beta.update(1 / 60, player);
  }
  assert.ok(Math.abs((player.x - beta.x) - beta.followDistance) < 15);
  assert.equal(beta.extract(), true);
  assert.equal(beta.state, "extracted");
  assert.equal(beta.extract(), false);
});

test("the full rescue and epilogue progression is completable", () => {
  const campaign = new CampaignManager();
  progressToFacility(campaign);
  assert.equal(campaign.flags.indoraptorDefeated, true);
  assert.equal(campaign.flags.indominusDefeated, true);
  assert.equal(campaign.activateConsole("power"), true);
  drainScenes(campaign);
  assert.equal(campaign.activateConsole("security"), true);
  drainScenes(campaign);
  assert.equal(campaign.freeBeta(), true);
  drainScenes(campaign);
  assert.equal(campaign.complete(), true);
  assert.equal(campaign.activeScene?.id, "campaign-complete");
});


test("the extraction chapter begins only after Rosa is freed and the route is reached", () => {
  const campaign = new CampaignManager();
  campaign.flags.betaFreed = true;
  campaign.updateLocation(17250);
  assert.equal(campaign.chapter, "ROSA CONTAINMENT");
  assert.equal(campaign.objective, "ESCORT ROSA TO EXTRACTION");
  drainScenes(campaign);
  campaign.updateLocation(17300);
  assert.equal(campaign.chapter, "EXTRACTION ZONE");
  assert.equal(campaign.activeScene?.id, "extraction-arrival");
});
