import test from "node:test";
import assert from "node:assert/strict";
import {
  CampaignPrologue,
  PROLOGUE_MILESTONES,
  PROLOGUE_VENATOSAURUS_KINDS
} from "../src/campaign/CampaignPrologue.js";

test("the prologue fixes the capture, encounter, battle-end and Level 1 milestones", () => {
  const prologue = new CampaignPrologue({ startX: 100 });

  assert.equal(prologue.captureX - prologue.startX, 2000);
  assert.equal(prologue.jeepX + 78, prologue.captureX);
  assert.equal(prologue.trackX - prologue.startX, 2500);
  assert.equal(prologue.encounterX - prologue.startX, 2500);
  assert.equal(prologue.fightEndX - prologue.encounterX, 300);
  assert.equal(prologue.fightEndX - prologue.startX, 2800);
  assert.equal(prologue.levelOneX - prologue.startX, 5000);
  assert.deepEqual(PROLOGUE_MILESTONES, {
    capture: 2000,
    encounter: 2500,
    fightEnd: 2800,
    levelOne: 5000
  });
});

test("Rosa remains playable through 2,000 m, where the jeep cinematic starts automatically", () => {
  const prologue = new CampaignPrologue({ startX: 100 });
  assert.equal(prologue.phase, "rest");
  assert.equal(prologue.update(4.19), null);
  assert.equal(prologue.update(0.02), "rest");
  assert.equal(prologue.phase, "explore");

  const player = { x: prologue.captureX - 28, w: 54, vx: 80 };
  assert.equal(prologue.captureAtMilestone(player), false);
  player.x = prologue.captureX - player.w / 2 + 1;
  assert.equal(prologue.captureAtMilestone(player), true);
  assert.equal(player.x + player.w / 2, prologue.captureX);
  assert.equal(player.vx, 0);
  assert.equal(prologue.phase, "capture");
});

test("Violeta follows the trail to 2,500 m, then the player must choose Violeta or Vasti", () => {
  const prologue = new CampaignPrologue({ startX: 145 });
  assert.equal(prologue.update(4.2), "rest");
  const player = { x: prologue.captureX - 27, w: 54, vx: 0 };
  player.x = prologue.captureX - player.w / 2;
  assert.equal(prologue.captureAtMilestone(player), true);

  assert.equal(prologue.update(5.4), "capture");
  assert.equal(prologue.phase, "capture-dialog");
  assert.equal(prologue.continueAfterNarration(), "search");
  assert.equal(prologue.update(8.3), "search");
  assert.equal(prologue.phase, "tracks-dialog");
  assert.equal(prologue.trackX - prologue.startX, 2500);
  assert.deepEqual([...PROLOGUE_VENATOSAURUS_KINDS].sort(), [
    "venatosaurus-impavidus",
    "venatosaurus-saevidicus"
  ]);
  assert.equal(prologue.continueAfterNarration(), "character-select");
  assert.equal(prologue.beginFight("rosa"), false);
  assert.equal(prologue.beginFight("blue"), true);
  assert.equal(prologue.selectedCharacter, "blue");
  assert.equal(prologue.phase, "fight");
});

test("the tutorial requires the full 300 m fight, both predators and all three control actions", () => {
  const prologue = new CampaignPrologue({ startX: 145 });
  prologue.phase = "character-select";
  assert.equal(prologue.beginFight("vasti"), true);
  assert.equal(prologue.fightEndX - prologue.encounterX, 300);
  assert.equal(prologue.completeFight(2799, true, true), false);
  assert.equal(prologue.completeFight(2800, false, true), false);
  assert.equal(prologue.completeFight(2800, true, false), false);
  assert.equal(prologue.completeFight(2800, true, true), true);
  assert.equal(prologue.phase, "alliance-dialog");
  assert.equal(prologue.continueAfterNarration(), "advance");
  assert.equal(prologue.levelOneX - prologue.fightEndX, 2200);
  assert.equal(prologue.update(13.74), null);
  assert.equal(prologue.update(0.02), "advance");
  assert.equal(prologue.phase, "complete");
  assert.equal(prologue.active, false);
  assert.equal(prologue.update(1), null);
});

test("prologue durations reject invalid delta values", () => {
  const prologue = new CampaignPrologue();
  assert.throws(() => prologue.update(-0.1), RangeError);
  assert.throws(() => prologue.update(Number.NaN), RangeError);
  assert.throws(() => new CampaignPrologue({ startX: Infinity }), TypeError);
});
