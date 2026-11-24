import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { COMBATS_ROSTER, getConfiguredCombatsRoster } from "../src/minigames/Combats.js";
import { MINIGAME_ENVIRONMENT_SCENES } from "../src/minigames/MinigameEnvironment.js";

test("Combats reserves exactly ten numbered dinosaur slots without inventing species", () => {
  assert.equal(COMBATS_ROSTER.length, 10);
  assert.deepEqual(COMBATS_ROSTER.map((entry) => entry.slot), [1,2,3,4,5,6,7,8,9,10]);
  assert.ok(COMBATS_ROSTER.every((entry) => entry.id === null && entry.name === null && entry.spriteKey === null));
  assert.equal(getConfiguredCombatsRoster().length, 0);
});

test("configured roster entries require a name, id and SpriteRenderer key", () => {
  const ready = getConfiguredCombatsRoster([
    { slot: 1, id: "raptor-a", name: "Raptor A", spriteKey: "gala" },
    { slot: 2, id: "raptor-b", name: "Raptor B", spriteKey: "" },
    { slot: 3, id: "raptor-c", name: "", spriteKey: "vasti" },
    { slot: 4, id: "raptor-d", name: "Raptor D", spriteKey: "indoraptor" }
  ]);
  assert.deepEqual(ready.map((entry) => entry.id), ["raptor-a", "raptor-d"]);
});

test("Combats uses the dedicated forest environment and the shared minigame renderer", async () => {
  assert.equal(MINIGAME_ENVIRONMENT_SCENES.combats.environment, "forest");
  const source = await readFile(new URL("../src/minigames/Combats.js", import.meta.url), "utf8");
  assert.match(source, /new MinigameEnvironmentRenderer\(/);
  assert.match(source, /this\.environmentRenderer\.draw\(this\.ctx/);
  assert.match(source, /KeyJ/);
  assert.match(source, /KeyK/);
  assert.match(source, /data-combats-slot/);
});
