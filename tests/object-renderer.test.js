import test from "node:test";
import assert from "node:assert/strict";
import { OBJECT_LAYER_NAMES, ObjectRenderer } from "../src/rendering/ObjectRenderer.js";

test("object layers draw straight onto the game context inside save/restore", () => {
  const renderer = new ObjectRenderer();
  const events = [];
  const context = { save: () => events.push("save"), restore: () => events.push("restore") };
  for (const name of OBJECT_LAYER_NAMES) {
    events.length = 0;
    renderer.drawLayer(context, name, {}, (target) => { assert.equal(target, context); events.push("draw"); });
    assert.deepEqual(events, ["save", "draw", "restore"], name);
  }
});

test("unknown layers throw and the context is restored when drawing fails", () => {
  const renderer = new ObjectRenderer();
  let restored = 0;
  const context = { save() {}, restore() { restored += 1; } };
  assert.throws(() => renderer.drawLayer(context, "nope", {}, () => {}), RangeError);
  assert.throws(() => renderer.drawLayer(context, "food", {}, () => { throw new Error("boom"); }), /boom/);
  assert.equal(restored, 1);
});
