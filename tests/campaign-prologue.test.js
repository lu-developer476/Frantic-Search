import test from "node:test";
import assert from "node:assert/strict";
import { CampaignPrologue } from "../src/campaign/CampaignPrologue.js";

test("Rosa and Violeta rest before Rosa becomes playable", () => {
  const prologue = new CampaignPrologue({ startX: 100 });
  assert.equal(prologue.phase, "rest");
  const nearJeep = { x: prologue.jeepX + 45, w: 54 };
  assert.equal(prologue.canInteract(nearJeep), false);
  assert.equal(prologue.update(2.39), null);
  assert.equal(prologue.update(0.02), "rest");
  assert.equal(prologue.phase, "explore");
  assert.equal(prologue.canInteract(nearJeep), true);
});

test("the prologue sequences capture, tracking, fight and alliance in order", () => {
  const prologue = new CampaignPrologue();
  assert.equal(prologue.update(2.4), "rest");
  const player = { x: prologue.jeepX + 45, w: 54 };
  assert.equal(prologue.interactWithJeep(player), true);

  assert.equal(prologue.update(3.79), null);
  assert.equal(prologue.update(0.02), "capture");
  assert.equal(prologue.phase, "capture-dialog");
  assert.equal(prologue.continueAfterNarration(), "search");

  assert.equal(prologue.update(5.19), null);
  assert.equal(prologue.update(0.02), "search");
  assert.equal(prologue.phase, "tracks-dialog");
  assert.equal(prologue.continueAfterNarration(), "fight");

  assert.equal(prologue.update(5.7), "fight");
  assert.equal(prologue.phase, "alliance-dialog");
  assert.equal(prologue.continueAfterNarration(), "complete");
  assert.equal(prologue.active, false);
  assert.equal(prologue.update(1), null);
});

test("prologue durations reject invalid delta values", () => {
  const prologue = new CampaignPrologue();
  assert.throws(() => prologue.update(-0.1), RangeError);
  assert.throws(() => prologue.update(Number.NaN), RangeError);
  assert.throws(() => new CampaignPrologue({ startX: Infinity }), TypeError);
});
