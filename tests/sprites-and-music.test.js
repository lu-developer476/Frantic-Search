import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MusicManager } from "../src/audio/MusicManager.js";
import { SpriteRenderer } from "../src/rendering/SpriteRenderer.js";

const spriteNames = [
  "blue-idle", "blue-run-a", "blue-run-b", "blue-jump", "blue-dash", "blue-duck",
  "vasti-idle", "vasti-run-a", "vasti-run-b", "vasti-jump", "vasti-duck",
  "beta", "ferrucutus", "hunter", "indoraptor", "indominus"
];

test("every production actor sprite is present and self-contained", () => {
  for (const name of spriteNames) {
    const path = resolve("public/assets/sprites", name + ".svg");
    const svg = readFileSync(path, "utf8");
    assert.match(svg, /<svg\b/);
    assert.match(svg, /viewBox=/);
    assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.doesNotMatch(svg, /href=/i, "sprites should not depend on remote images");
  }
});

class FakeNode {
  constructor() {
    this.gain = { value: 1, setTargetAtTime: () => {}, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} };
    this.frequency = { setValueAtTime: () => {} };
    this.connections = [];
    this.stopped = false;
  }
  connect(target) { this.connections.push(target); }
  disconnect() {}
  start() {}
  stop() { this.stopped = true; }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = "running";
    this.destination = {};
    this.nodes = [];
  }
  createGain() { const node = new FakeNode(); this.nodes.push(node); return node; }
  createOscillator() { const node = new FakeNode(); this.nodes.push(node); return node; }
  createBiquadFilter() { const node = new FakeNode(); this.nodes.push(node); return node; }
}

test("music manager schedules original music and switches adaptive themes", () => {
  const music = new MusicManager();
  const context = new FakeAudioContext();
  assert.equal(music.start(context, "coastal"), true);
  music.schedule();
  assert.ok(context.nodes.length > 1);
  music.setTheme("boss");
  assert.equal(music.themeName, "boss");
  assert.equal(music.step, 0);
  music.setDucked(true);
  music.setPaused(true);
  music.setEnabled(false);
  music.stop();
  assert.equal(music.timer, null);
});

test("sprite renderer uses base paths and draws cached images without reloading", () => {
  const previousImage = globalThis.Image;
  class FakeImage {
    constructor() { this.complete = false; this.naturalWidth = 0; this.src = ""; }
  }
  globalThis.Image = FakeImage;
  try {
    const renderer = new SpriteRenderer("/Avoid/");
    const image = renderer.get("blue-idle");
    assert.equal(image.src, "/Avoid/assets/sprites/blue-idle.svg");
    assert.equal(renderer.get("blue-idle"), image);
    image.complete = true;
    image.naturalWidth = 240;
    image.naturalHeight = 170;
    const calls = [];
    const context = {
      globalAlpha: 1,
      save() {},
      restore() {},
      translate(...args) { calls.push(["translate", ...args]); },
      scale(...args) { calls.push(["scale", ...args]); },
      drawImage(...args) { calls.push(["drawImage", ...args]); }
    };
    assert.equal(renderer.draw(context, "blue-idle", 10, 20, 64, 62, { facing: -1 }), true);
    assert.equal(calls.some((call) => call[0] === "drawImage"), true);
    assert.equal(renderer.readiness().ready, 1);
  } finally {
    if (previousImage === undefined) delete globalThis.Image;
    else globalThis.Image = previousImage;
  }
});
