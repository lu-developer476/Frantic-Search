import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AdaptiveMusic } from "../src/audio/AdaptiveMusic.js";
import { SpriteRenderer } from "../src/rendering/SpriteRenderer.js";
import { selectActorPose } from "../src/rendering/AnimationProfiles.js";
import { Player } from "../src/entities/Player.js";

const spriteNames = [
  "blue-idle", "blue-run-a", "blue-run-b", "blue-jump", "blue-dash", "blue-duck",
  "vasti-idle", "vasti-run-a", "vasti-run-b", "vasti-jump", "vasti-duck",
  "beta", "beta-run-a", "beta-run-b",
  "ferrucutus", "ferrucutus-step-a", "ferrucutus-step-b",
  "hunter", "hunter-run-a", "hunter-run-b",
  "indoraptor", "indoraptor-run-a", "indoraptor-run-b",
  "indominus", "indominus-run-a", "indominus-run-b",
  ...["blue","vasti","beta","ferrucutus","hunter","indoraptor","indominus"].flatMap(n => ["attack","land","impact","recover"].map(p => n+"-"+p))
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
    assert.match(renderer.get("blue-idle").src, /blue-idle\.svg\?v=20261112-actor-motion-3$/);
  } finally {
    if (previousImage === undefined) delete globalThis.Image;
    else globalThis.Image = previousImage;
  }
});


test("game rendering uses the native canvas instead of a low-resolution blur buffer", () => {
  const mainSource = readFileSync(resolve("src/main.js"), "utf8");
  assert.match(mainSource, /const ctx = canvas\.getContext/);
  assert.match(mainSource, /ctx\.imageSmoothingEnabled = false/);
  assert.match(mainSource, /ctx\.translate\(-Math\.round\(cameraX\), 0\)/);
  assert.doesNotMatch(mainSource, /pixelCanvas|PIXEL_SCALE|displayCtx/);
});

test("sprite renderer disables smoothing and snaps sprite bounds to integer pixels", () => {
  const rendererSource = readFileSync(resolve("src/rendering/SpriteRenderer.js"), "utf8");
  assert.match(rendererSource, /context\.imageSmoothingEnabled = false/);
  assert.match(rendererSource, /x = Math\.round\(x\)/);
  assert.match(rendererSource, /y = Math\.round\(y\)/);
  assert.match(rendererSource, /width = Math\.max\(1, Math\.round\(width\)\)/);
  assert.match(rendererSource, /height = Math\.max\(1, Math\.round\(height\)\)/);
});

test("simulation uses one guarded animation-frame scheduler and survives frame errors", () => {
  const mainSource = readFileSync(resolve("src/main.js"), "utf8");
  assert.match(mainSource, /function scheduleFrame\(\)/);
  assert.match(mainSource, /frameRequestId !== null/);
  assert.match(mainSource, /function handleFrameError\(error\)/);
  assert.match(mainSource, /catch \(error\) \{\s*handleFrameError\(error\);/);
  assert.match(mainSource, /document\.addEventListener\("visibilitychange"/);
  assert.equal((mainSource.match(/requestAnimationFrame\(frame\)/g) || []).length, 1);
});

test("language changes do not reset, start or stop the simulation frame scheduler", () => {
  const mainSource = readFileSync(resolve("src/main.js"), "utf8");
  const languageBlock = mainSource.match(/function setLanguage\(nextLocale\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.ok(languageBlock.length > 0);
  assert.doesNotMatch(languageBlock, /scheduleFrame|cancelScheduledFrame|requestAnimationFrame|running\s*=|paused\s*=/);
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
    assert.equal(image.src, "/Avoid/assets/sprites/blue-idle.svg?v=20261112-actor-motion-2");
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

test("Rosa, Ferrucutus, hunters and both bosses have distinct pixel-art gait frames", () => {
 const frames=[["beta-run-a","runA"],["beta-run-b","runB"],["ferrucutus-step-a","stepA"],["ferrucutus-step-b","stepB"],["hunter-run-a","runA"],["hunter-run-b","runB"],["indoraptor-run-a","runA"],["indoraptor-run-b","runB"],["indominus-run-a","runA"],["indominus-run-b","runB"]];
 for(const [name,pose] of frames){const svg=readFileSync(resolve("public/assets/sprites",name+".svg"),"utf8");assert.match(svg,/^<svg/);assert.match(svg,/shape-rendering="crispEdges"/);assert.match(svg,new RegExp('data-pose="'+pose+'"'));}
 for(const pair of [["beta-run-a","beta-run-b"],["ferrucutus-step-a","ferrucutus-step-b"],["hunter-run-a","hunter-run-b"],["indoraptor-run-a","indoraptor-run-b"],["indominus-run-a","indominus-run-b"]]){const a=readFileSync(resolve("public/assets/sprites",pair[0]+".svg"),"utf8");const b=readFileSync(resolve("public/assets/sprites",pair[1]+".svg"),"utf8");assert.notEqual(a,b);}
});
test("actor animation profiles select their own cycles and preserve defeated poses",()=>{
 const renderer=Object.create(SpriteRenderer.prototype),selected=[];renderer.draw=(_ctx,name)=>{selected.push(name);return true;};
 renderer.drawAnimated({},"beta",0,0,48,48,{id:"rosa",state:"following",motionSpeed:160},1,{});
 renderer.drawAnimated({},"ferrucutus",0,0,104,74,{id:"ferru",state:"charge"},1,{});
 renderer.drawAnimated({},"hunter",0,0,50,70,{id:"hunter-1",state:"pursuit"},1,{});
 renderer.drawAnimated({},"indoraptor",0,0,126,92,{id:"raptor",state:"attacking"},1,{});
 renderer.drawAnimated({},"indominus",0,0,224,150,{id:"rex",state:"stalking"},1,{});
 renderer.drawAnimated({},"indominus",0,0,224,150,{id:"rex",state:"attacking",attackName:"roar"},1,{});
 renderer.drawAnimated({},"indominus",0,0,224,150,{id:"rex",state:"attacking",attackName:"charge"},1,{});
 assert.ok(selected[0].startsWith("beta-run-"));assert.ok(selected[1].startsWith("ferrucutus-step-"));assert.ok(selected[2].startsWith("hunter-run-"));assert.ok(selected[3].startsWith("indoraptor-run-"));assert.ok(selected[4].startsWith("indominus-run-"));
 assert.equal(selected[5],"indominus","Indominus roar should use its heavy idle/roar pose");
 assert.ok(selected[6].startsWith("indominus-run-"),"Indominus charge should use its run cycle");
 renderer.drawAnimated({},"indominus",0,0,224,150,{id:"rex",state:"defeated",defeated:true},1,{});assert.equal(selected[7],"indominus");
});
test("all non-player actors render through their dedicated animation profiles",()=>{
 const source=readFileSync(resolve("src/main.js"),"utf8");
 for(const actor of ["beta","ferrucutus","hunter","indoraptor","indominus"])assert.match(source,new RegExp('drawAnimated\\(ctx, "'+actor+'"'));
});

import { selectActorPose } from "../src/rendering/AnimationProfiles.js";
test("all actor profiles resolve explicit attack, landing, impact and recovery SVG frames",()=>{
 for(const name of ["blue","vasti","beta","ferrucutus","hunter","indoraptor","indominus"]){
  for(const pose of ["attack","land","impact","recover"]){
   const svg=readFileSync(resolve("public/assets/sprites",name+"-"+pose+".svg"),"utf8");
   assert.match(svg,/shape-rendering="crispEdges"/);
   assert.match(svg,new RegExp('data-pose="'+pose+'"'));
   assert.match(svg,new RegExp('data-motion-accent="'+({attack:"attack",land:"landing",impact:"impact",recover:"recovery"}[pose])+'"'));
  }
 }
});
test("pose selection follows live simulation state and preserves boss attack distinctions",()=>{
 assert.equal(selectActorPose("blue",{animationState:"attack"}),"blue-attack");
 assert.equal(selectActorPose("vasti",{animationState:"landing"}),"vasti-land");
 assert.equal(selectActorPose("hunter",{state:"stunned"}),"hunter-impact");
 assert.equal(selectActorPose("indoraptor",{state:"recovering"}),"indoraptor-recover");
 assert.equal(selectActorPose("indominus",{state:"attacking",attackName:"roar"}),"indominus-attack");
 assert.equal(selectActorPose("indominus",{state:"defeated",defeated:true}),"indominus");
 assert.match(selectActorPose("hunter",{state:"pursuit",motionSpeed:140}),/^hunter-run-/);
});

test("player attack, impact and landing animations transition through recovery",()=>{
 const player=new Player("blue",100,430);
 assert.equal(player.takeHit(),true);
 assert.equal(player.animationState,"impact");
 player.update(.28,{isDown:()=>false,consume:()=>false});
 assert.equal(player.animationState,"recovery");
 player.update(.16,{isDown:()=>false,consume:()=>false});
 assert.equal(player.animationState,null);
 player.onLand();
 assert.equal(player.animationState,"landing");
 player.update(.2,{isDown:()=>false,consume:()=>false});
 assert.equal(player.animationState,"recovery");
 player.update(.16,{isDown:()=>false,consume:()=>false});
 assert.equal(player.animationState,null);
 player.useAbility();
 assert.equal(player.animationState,"attack");
});
