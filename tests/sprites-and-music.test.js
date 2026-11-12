import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AdaptiveMusic } from "../src/audio/AdaptiveMusic.js";
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
    assert.match(svg, /shape-rendering="crispEdges"/, "sprites must preserve hard pixel edges");
    assert.doesNotMatch(svg, /linearGradient|radialGradient/, "sprites should use flat arcade colors, not smooth gradients");
    assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.doesNotMatch(svg, /href=/i, "sprites should not depend on remote images");
  }
});

test("creature sprites preserve the requested species, age and franchise lineages", () => {
  const required = {
    "blue-idle": [/data-character="Violeta"/, /data-species="Velociraptor"/, /data-age="adult"/, /data-sex="female"/, /data-hide="white"/, /data-back="purple"/, /data-dorsal-stripe="magenta"/, /data-eye="gold-ochre"/],
    "beta": [/data-character="Rosa"/, /data-species="Velociraptor"/, /data-age="juvenile"/, /data-lineage="Violeta"/, /data-hide="white"/, /data-back="purple"/, /data-dorsal-stripe="magenta"/, /data-eye="gold-ochre"/],
    "vasti-idle": [/data-character="Vasti"/, /data-species="Vastatosaurus rex"/, /data-origin="King Kong 2005"/, /five-fingered forelimbs/, /data-hand-digits="5"/, /data-colors="olive-green brown beige"/],
    "ferrucutus": [/data-character="Ferrucutus Cerastes"/, /data-origin="King Kong 2005"/, /paired nasal horns/],
    "indoraptor": [/data-character="Indoraptor"/, /data-origin="Jurassic World Fallen Kingdom"/, /gold dorsal stripe/],
    "indominus": [/data-character="Indominus Rex"/, /data-origin="Jurassic World"/, /dorsal osteoderms/]
  };
  for (const [name, markers] of Object.entries(required)) {
    const asset = readFileSync(resolve("public/assets/sprites", name + ".svg"), "utf8");
    for (const marker of markers) assert.match(asset, marker, name + " must preserve its identity");
  }
});

test("Violeta has white hide, a purple back, magenta dorsal stripe and ochre-gold eye in all poses", () => {
  for (const pose of ["idle", "run-a", "run-b", "jump", "dash", "duck"]) {
    const svg = readFileSync(resolve("public/assets/sprites", "blue-" + pose + ".svg"), "utf8");
    assert.match(svg, /data-hide="white"/);
    assert.match(svg, /data-back="purple"/);
    assert.match(svg, /data-dorsal-stripe="magenta"/);
    assert.match(svg, /data-eye="gold-ochre"/);
    assert.match(svg, /fill="#d936a2"/);
    assert.match(svg, /fill="#d5a13c"/);
  }
});

test("Rosa uses the same family colors as Violeta", () => {
  const svg = readFileSync(resolve("public/assets/sprites/beta.svg"), "utf8");
  assert.match(svg, /data-lineage="Violeta"/);
  assert.match(svg, /data-hide="white"/);
  assert.match(svg, /data-back="purple"/);
  assert.match(svg, /data-dorsal-stripe="magenta"/);
  assert.match(svg, /fill="#d936a2"/);
});

test("all Vasti poses declare five fingers and have olive, brown and beige palette", () => {
  for (const pose of ["idle", "run-a", "run-b", "jump", "duck"]) {
    const svg = readFileSync(resolve("public/assets/sprites", "vasti-" + pose + ".svg"), "utf8");
    assert.match(svg, /data-hand-digits="5"/);
    assert.match(svg, /five-fingered forelimbs/);
    assert.match(svg, /fill="#586341"/);
    assert.match(svg, /fill="#887454"/);
    assert.match(svg, /fill="#f0dfba"/);
  }
});

test("Violeta and Vasti run cycles contain two distinct animation frames", () => {
  for (const prefix of ["blue", "vasti"]) {
    const a = readFileSync(resolve("public/assets/sprites", prefix + "-run-a.svg"), "utf8");
    const b = readFileSync(resolve("public/assets/sprites", prefix + "-run-b.svg"), "utf8");
    assert.notEqual(a, b, prefix + " run frames must not be duplicates");
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

test("sprite renderer versions asset URLs to bypass stale cached SVG files", () => {
  const previousImage = globalThis.Image;
  class FakeImage { constructor() { this.complete = false; this.naturalWidth = 0; this.src = ""; } }
  globalThis.Image = FakeImage;
  try {
    const renderer = new SpriteRenderer("/assets/");
    assert.match(renderer.get("blue-idle").src, /blue-idle\.svg\?v=20261112-sprite-fix-1$/);
  } finally {
    if (previousImage === undefined) delete globalThis.Image;
    else globalThis.Image = previousImage;
  }
});

test("music manager schedules original music and switches adaptive themes", () => {
  const music = new AdaptiveMusic();
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
    assert.equal(image.src, "/Avoid/assets/sprites/blue-idle.svg?v=20261112-sprite-fix-1");
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
