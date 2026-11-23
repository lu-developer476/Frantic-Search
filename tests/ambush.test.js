import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import {
  bestAmbushWave,
  difficultyForWave,
  enemiesInWave,
  isWaveCleared,
  overlaps,
  Ambush
} from "../src/minigames/Ambush.js";

test("Ambush increases enemy counts by wave and caps the simultaneous wave size", () => {
  assert.equal(enemiesInWave(1), 3);
  assert.equal(enemiesInWave(5), 7);
  assert.equal(enemiesInWave(20), 12);
});

test("Ambush difficulty increases health and speed while tightening spawn intervals", () => {
  const first = difficultyForWave(1);
  const fourth = difficultyForWave(4);
  const tenth = difficultyForWave(10);
  assert.equal(first.healthBonus, 0);
  assert.equal(fourth.healthBonus, 1);
  assert.equal(tenth.healthBonus, 3);
  assert.ok(fourth.speedMultiplier > first.speedMultiplier);
  assert.ok(tenth.spawnInterval < fourth.spawnInterval);
  assert.ok(tenth.spawnInterval >= 0.3);
});

test("A Ambush wave clears only after every enemy has spawned and been defeated", () => {
  const enemies = [{ defeated: true }, { defeated: true }];
  assert.equal(isWaveCleared(1, enemies), false);
  assert.equal(isWaveCleared(0, [...enemies, { defeated: false }]), false);
  assert.equal(isWaveCleared(0, enemies), true);
  assert.equal(isWaveCleared(0, []), true);
});

test("Ambush records never decrease and remain non-negative integers", () => {
  assert.equal(bestAmbushWave(4, 7), 7);
  assert.equal(bestAmbushWave(8, 3), 8);
  assert.equal(bestAmbushWave(-2, 0), 0);
});

test("Ambush uses strict rectangle overlap for contact and projectile checks", () => {
  assert.equal(overlaps({x:0,y:0,w:20,h:20},{x:19,y:4,w:10,h:10}), true);
  assert.equal(overlaps({x:0,y:0,w:20,h:20},{x:20,y:4,w:10,h:10}), false);
});


test("Ambush initializes and renders its menu before a player role is selected", () => {
  const context = {
    clearRect() {},
    createLinearGradient() {
      return { addColorStop() {} };
    },
    fillRect() {},
    fillText() {}
  };
  const canvas = {
    getContext: () => context,
    addEventListener() {},
    removeEventListener() {}
  };
  const elements = new Map();
  const root = {
    querySelector(selector) {
      if (selector === "canvas") return canvas;
      if (!elements.has(selector)) {
        elements.set(selector, {
          hidden: selector === "[data-ambush-result]",
          textContent: "",
          addEventListener() {},
          focus() {},
          dataset: {}
        });
      }
      return elements.get(selector);
    },
    querySelectorAll() {
      return [];
    }
  };

  const previousWindow = globalThis.window;
  globalThis.window = {
    addEventListener() {},
    removeEventListener() {}
  };

  try {
    const game = new Ambush(root);
    assert.equal(game.player, null);
    assert.equal(game.running, false);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("Empty Stomach references the shipped velociraptor walk animation", async () => {
  const source = await readFile(new URL("../src/minigames/Persecution.js", import.meta.url), "utf8");
  assert.match(source, /velociraptor-walk\.gif/);
  await access(new URL("../public/minigame/persecution/gif/enemies/velociraptor/velociraptor-walk.gif", import.meta.url));
});

test("defeated Emboscada enemies are not rendered with reduced opacity", async () => {
  const source = await readFile(new URL("../src/minigames/Ambush.js", import.meta.url), "utf8");
  assert.match(source, /if \(!player && \(actor\.defeated \|\| actor\.health <= 0\)\) return/);
  assert.match(source, /if \(!enemy \|\| enemy\.defeated \|\| enemy\.health <= 0\) return/);
  assert.doesNotMatch(source, /actor\.defeated \? 0\.35|enemy\.defeated \? 0\.36/);
  assert.match(source, /drawTacticalEffect/);
});


test("Ambush renders player and hunter characters with the supplied human GIFs", async () => {
  const source = await readFile(new URL("../src/minigames/Ambush.js", import.meta.url), "utf8");
  assert.match(source, /human-v1/);
  assert.match(source, /human-v2/);
  assert.doesNotMatch(source, /ctx\.fillRect\(7, 58, 25, 5\)/);
  await access(new URL("../public/references/human-v1.gif", import.meta.url));
  await access(new URL("../public/references/human-v2.gif", import.meta.url));
});
