import test from "node:test";
import assert from "node:assert/strict";
import {
  CampaignPrologue,
  PROLOGUE_MILESTONES,
  PROLOGUE_VENATOSAURUS_KINDS
} from "../src/campaign/CampaignPrologue.js";

test("the prologue fixes the capture, encounter, battle-end and Level 1 milestones", () => {
  const prologue = new CampaignPrologue({ startX: 100 });

  assert.equal(prologue.captureX - prologue.startX, 1000);
  assert.equal(prologue.jeepX + 78, prologue.captureX);
  assert.equal(prologue.trackX - prologue.startX, 1200);
  assert.equal(prologue.encounterX - prologue.startX, 1200);
  assert.equal(prologue.fightEndX - prologue.startX, 1500);
  assert.equal(prologue.levelOneX - prologue.startX, 1800);
  assert.deepEqual(PROLOGUE_MILESTONES, {
    capture: 1000,
    encounter: 1200,
    fightEnd: 1500,
    levelOne: 1800
  });
});

test("Rosa rests beside Violeta, explores under player control and is captured at 1,000 m", () => {
  const prologue = new CampaignPrologue({ startX: 100 });
  assert.equal(prologue.phase, "rest");

  const player = { x: prologue.captureX - 27, w: 54, vx: 20 };
  assert.equal(prologue.canInteract(player), false);
  assert.equal(prologue.update(4.19), null);
  assert.equal(prologue.update(0.02), "rest");
  assert.equal(prologue.phase, "explore");
  assert.equal(prologue.canInteract(player), true);
  assert.equal(prologue.interactWithJeep(player), true);
  assert.equal(player.x + player.w / 2, prologue.captureX);
  assert.equal(player.vx, 0);
  assert.equal(prologue.phase, "capture");
});

test("Violeta follows the trail to 1,200 m, finds Vasti with both Venatosaurus species, then reaches 1,800 m", () => {
  const prologue = new CampaignPrologue({ startX: 145 });
  assert.equal(prologue.update(4.2), "rest");

  const player = { x: prologue.captureX - 27, w: 54 };
  assert.equal(prologue.interactWithJeep(player), true);
  assert.equal(prologue.update(5.4), "capture");
  assert.equal(prologue.phase, "capture-dialog");
  assert.equal(prologue.continueAfterNarration(), "search");

  assert.equal(prologue.update(6.2), "search");
  assert.equal(prologue.phase, "tracks-dialog");
  assert.equal(prologue.trackX - prologue.startX, 1200);
  assert.equal(prologue.continueAfterNarration(), "fight");

  assert.equal(prologue.update(8.4), "fight");
  assert.equal(prologue.phase, "alliance-dialog");
  assert.equal(prologue.fightEndX - prologue.encounterX, 300);
  assert.equal(PROLOGUE_VENATOSAURUS_KINDS.length, 2);
  assert.deepEqual([...PROLOGUE_VENATOSAURUS_KINDS].sort(), [
    "venatosaurus-impavidus",
    "venatosaurus-saevidicus"
  ]);
  assert.equal(prologue.continueAfterNarration(), "advance");

  assert.equal(prologue.update(5.4), "advance");
  assert.equal(prologue.phase, "complete");
  assert.equal(prologue.active, false);
  assert.equal(prologue.levelOneX - prologue.startX, 1800);
  assert.equal(prologue.update(1), null);
});

test("prologue durations reject invalid delta values", () => {
  const prologue = new CampaignPrologue();
  assert.throws(() => prologue.update(-0.1), RangeError);
  assert.throws(() => prologue.update(Number.NaN), RangeError);
  assert.throws(() => new CampaignPrologue({ startX: Infinity }), TypeError);
});
