import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { AdaptiveMusic } from "../src/audio/AdaptiveMusic.js";
import { SpriteRenderer } from "../src/rendering/SpriteRenderer.js";
import { selectActorPose } from "../src/rendering/AnimationProfiles.js";
import { Player } from "../src/entities/Player.js";
import { HunterEnemy } from "../src/entities/HunterEnemy.js";

const spriteNames = [
  "violeta-idle", "violeta-run-a", "violeta-run-b", "violeta-jump", "violeta-dash", "violeta-duck",
  "vasti-idle", "vasti-run-a", "vasti-run-b", "vasti-jump", "vasti-duck", "vasti-stomp", "vasti-slam",
  "rosa", "rosa-run-a", "rosa-run-b", "rosa-duck",
  "ferrucutus", "ferrucutus-step-a", "ferrucutus-step-b", "ferrucutus-duck",
  "hunter", "hunter-run-a", "hunter-run-b", "hunter-duck",
  "indoraptor", "indoraptor-run-a", "indoraptor-run-b", "indoraptor-duck",
  "indominus", "indominus-run-a", "indominus-run-b", "indominus-duck",
  ...["violeta","vasti","rosa","ferrucutus","hunter","indoraptor","indominus"].flatMap(n => ["attack","land","impact","recover"].map(p => n+"-"+p))
];


test("every production actor sprite is present and resolves its intended source", () => {
  for (const name of spriteNames) {
    const svg = readFileSync(resolve("public/assets/sprites", name + ".svg"), "utf8");
    assert.match(svg, /<svg\b/);
    assert.match(svg, /viewBox=/);
    assert.doesNotMatch(svg, /linearGradient|radialGradient/);
    assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    const sheetBased = /^(?:violeta|rosa)(?:-|$)/.test(name);
    if (sheetBased) {
      assert.match(svg, /href="\.\.\/\.\.\/references\/velociraptor-sprite-sheet\.png"/);
      assert.match(svg, /mask-type="luminance"/);
      assert.match(svg, /feFuncR type="linear" slope="-24" intercept="22\.8"/, "white source pixels must become transparent");
      assert.match(svg, /data-source="velociraptor-sprite-sheet\.png"/);
    } else {
      assert.match(svg, /shape-rendering="crispEdges"/);
      assert.doesNotMatch(svg, /href=/i);
    }
  }
});


test("remaining non-hunter creature assets use crisp, self-contained pixel artwork", () => {
  for (const name of spriteNames.filter((entry) => !entry.startsWith("hunter") && !entry.startsWith("violeta") && !entry.startsWith("rosa"))) {
    const svg = readFileSync(resolve("public/assets/sprites", name + ".svg"), "utf8");
    assert.match(svg, /data-render-style="pixel-art"/);
    assert.match(svg, /data-pixel-grid="4px"/);
    assert.match(svg, /shape-rendering="crispEdges"/);
    assert.ok((svg.match(/<rect\b/g) || []).length >= 30);
    assert.match(svg, /<(?:path|rect)\b/);
    assert.doesNotMatch(svg, /href=/i);
    assert.doesNotMatch(svg, /linearGradient|radialGradient/);
  }
});


test("creature sprites preserve species, age, source sheet and lineage metadata", () => {
  const required = {
    "violeta-idle": [/data-character="Violeta"/, /data-species="Velociraptor"/, /data-age="adult"/, /data-palette="purple-mauve"/, /data-source="velociraptor-sprite-sheet.png"/, /data-frame="adult-idle-2"/],
    "rosa": [/data-character="Rosa"/, /data-species="Velociraptor"/, /data-age="juvenile"/, /data-lineage="Violeta"/, /data-palette="purple-mauve"/, /data-source="juvenile-velociraptor-sprite-sheet.png"/, /data-sheet-size="1024x337"/, /data-frame="juvenile-idle-2"/],
    "vasti-idle": [/data-character="Vasti"/, /data-species="Vastatosaurus rex"/, /data-origin="King Kong 2005"/, /three-fingered forelimbs/, /data-hand-digits="3"/, /data-colors="olive-green brown beige"/],
    "ferrucutus": [/data-character="Ferrucutus Cerastes"/, /data-origin="King Kong 2005"/, /paired nasal horns/],
    "indoraptor": [/data-character="Indoraptor"/, /data-origin="Jurassic World Fallen Kingdom"/, /gold dorsal stripe/],
    "indominus": [/data-character="Indominus Rex"/, /data-origin="Jurassic World"/, /dorsal osteoderms/]
  };
  for (const [name, markers] of Object.entries(required)) {
    const asset = readFileSync(resolve("public/assets/sprites", name + ".svg"), "utf8");
    for (const marker of markers) assert.match(asset, marker, name + " must preserve its identity");
  }
});


test("Violeta uses adult frames cropped from the original source sheet", () => {
  for (const pose of ["idle", "run-a", "run-b", "jump", "dash", "duck"]) {
    const svg = readFileSync(resolve("public/assets/sprites", "violeta-" + pose + ".svg"), "utf8");
    assert.match(svg, /data-character="Violeta"/);
    assert.match(svg, /data-age="adult"/);
    assert.match(svg, /data-palette="purple-mauve"/);
    assert.match(svg, /data-source="velociraptor-sprite-sheet.png"/);
    assert.match(svg, /href="\.\.\/\.\.\/references\/velociraptor-sprite-sheet\.png"/);
  }
});


test("Rosa uses juvenile frames from the same source sheet and lineage", () => {
  const svg = readFileSync(resolve("public/assets/sprites/rosa.svg"), "utf8");
  assert.match(svg, /data-character="Rosa"/);
  assert.match(svg, /data-age="juvenile"/);
  assert.match(svg, /data-lineage="Violeta"/);
  assert.match(svg, /data-palette="purple-mauve"/);
  assert.match(svg, /data-source="juvenile-velociraptor-sprite-sheet.png"/);
  assert.match(svg, /data-sheet-size="1024x337"/);
  assert.match(svg, /data-frame="juvenile-idle-2"/);
  assert.match(svg, /mask-type="luminance"/);
});

test("all Vasti poses declare three fingers and have olive, brown and beige palette", () => {
  for (const pose of ["idle", "run-a", "run-b", "jump", "duck"]) {
    const svg = readFileSync(resolve("public/assets/sprites", "vasti-" + pose + ".svg"), "utf8");
    assert.match(svg, /data-hand-digits="3"/);
    assert.match(svg, /three-fingered forelimbs/);
    assert.match(svg, /fill="#586341"/);
    assert.match(svg, /fill="#887454"/);
    assert.match(svg, /fill="#f0dfba"/);
  }
});

test("Violeta and Vasti run cycles contain two distinct animation frames", () => {
  for (const prefix of ["violeta", "vasti"]) {
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
    assert.match(renderer.get("violeta-idle").src, /violeta-idle\.svg\?v=20261112-rosa-articulated-rig-1$/);
  } finally {
    if (previousImage === undefined) delete globalThis.Image;
    else globalThis.Image = previousImage;
  }
});


test("Vasti renders the original reference artwork from a dedicated SVG on the game canvas",()=>{
 const rendererSource=readFileSync(resolve("src/rendering/SpriteRenderer.js"),"utf8");
 assert.match(rendererSource,/drawReferenceVasti\(/);
 assert.match(rendererSource,/public\/references\/vastatosaurus-rex\.jpg/);
 assert.match(rendererSource,/this\.draw\(context, "vasti"/);
 const svg=readFileSync(resolve("public/assets/sprites/vasti.svg"),"utf8");
 assert.match(svg,/<svg\b/);
 assert.match(svg,/data-reference="vastatosaurus-rex.jpg"/);
 assert.match(svg,/data-source="embedded-original-reference"/);
 assert.match(svg,/data:image\/jpeg;base64,/);
 assert.match(svg,/filter="url\(#paper-key\)"/);
 const reference=readFileSync(resolve("public/references/vastatosaurus-rex.jpg"));
 assert.ok(reference.length>1000,"the in-game source reference image must be present");
});

test("game rendering uses the native canvas instead of a low-resolution blur buffer", () => {
  const mainSource = readFileSync(resolve("src/main.js"), "utf8");
  assert.match(mainSource, /const ctx = canvas\.getContext/);
  assert.match(mainSource, /ctx\.imageSmoothingEnabled = false/);
  assert.match(mainSource, /ctx\.translate\(-Math\.round\(cameraX\), 0\)/);
  assert.doesNotMatch(mainSource, /pixelCanvas|PIXEL_SCALE|displayCtx/);
});


test("sprite renderer smooths the reference-sheet sprites and snaps bounds to integer pixels", () => {
  const rendererSource = readFileSync(resolve("src/rendering/SpriteRenderer.js"), "utf8");
  assert.match(rendererSource, /context\.imageSmoothingEnabled\s*=\s*smoothSprite/);
  assert.match(rendererSource, /const smoothSprite\s*=\s*name\s*===\s*"rosa"/);
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
    const image = renderer.get("violeta-idle");
    assert.equal(image.src, "/Avoid/assets/sprites/violeta-idle.svg?v=20261112-rosa-articulated-rig-1");
    assert.equal(renderer.get("violeta-idle"), image);
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
    assert.equal(renderer.draw(context, "violeta-idle", 10, 20, 64, 62, { facing: -1 }), true);
    assert.equal(calls.some((call) => call[0] === "drawImage"), true);
    assert.equal(renderer.readiness().ready, 1);
  } finally {
    if (previousImage === undefined) delete globalThis.Image;
    else globalThis.Image = previousImage;
  }
});


test("Rosa, Ferrucutus, hunters and both bosses have distinct gait frames", () => {
  const frames = [["rosa-run-a","runA"],["rosa-run-b","runB"],["ferrucutus-step-a","stepA"],["ferrucutus-step-b","stepB"],["hunter-run-a","runA"],["hunter-run-b","runB"],["indoraptor-run-a","runA"],["indoraptor-run-b","runB"],["indominus-run-a","runA"],["indominus-run-b","runB"]];
  for (const [name, pose] of frames) {
    const svg = readFileSync(resolve("public/assets/sprites", name + ".svg"), "utf8");
    assert.match(svg, /^(?:<\?xml[^>]+>\s*)?<svg/);
    if (name.startsWith("rosa-")) {
      assert.match(svg, /href="\.\.\/\.\.\/references\/velociraptor-sprite-sheet\.png"/);
      assert.match(svg, /mask-type="luminance"/);
    } else assert.match(svg, /shape-rendering="crispEdges"/);
    assert.match(svg, new RegExp('data-pose="' + pose + '"'));
  }
  for (const pair of [["rosa-run-a","rosa-run-b"],["ferrucutus-step-a","ferrucutus-step-b"],["hunter-run-a","hunter-run-b"],["indoraptor-run-a","indoraptor-run-b"],["indominus-run-a","indominus-run-b"]]) {
    const a = readFileSync(resolve("public/assets/sprites", pair[0] + ".svg"), "utf8");
    const b = readFileSync(resolve("public/assets/sprites", pair[1] + ".svg"), "utf8");
    assert.notEqual(a, b);
  }
});

test("actor animation profiles select their own cycles and preserve defeated poses",()=>{
 const renderer=Object.create(SpriteRenderer.prototype),selected=[];renderer.draw=(_ctx,name)=>{selected.push(name);return true;};
 const context={save(){},restore(){},translate(){},rotate(){},scale(){}};
 renderer.drawAnimated(context,"beta",0,0,48,48,{id:"rosa",state:"following",motionSpeed:160},1,{});
 renderer.drawAnimated(context,"ferrucutus",0,0,104,74,{id:"ferru",state:"charge"},1,{});
 renderer.drawAnimated(context,"hunter",0,0,50,70,{id:"hunter-1",state:"pursuit"},1,{});
 renderer.drawAnimated(context,"indoraptor",0,0,126,92,{id:"raptor",state:"attacking"},1,{});
 renderer.drawAnimated(context,"indominus",0,0,224,150,{id:"rex",state:"stalking"},1,{});
 renderer.drawAnimated(context,"indominus",0,0,224,150,{id:"rex",state:"attacking",attackName:"roar"},1,{});
 renderer.drawAnimated(context,"indominus",0,0,224,150,{id:"rex",state:"attacking",attackName:"charge"},1,{});
 assert.ok(selected[0].startsWith("rosa-run-"));assert.ok(selected[1].startsWith("ferrucutus-step-"));assert.ok(selected[2].startsWith("hunter-run-"));assert.ok(selected[3].startsWith("indoraptor-run-"));assert.ok(selected[4].startsWith("indominus-run-"));
 assert.equal(selected[5],"indominus","Indominus roar should use its heavy idle/roar pose");
 assert.ok(selected[6].startsWith("indominus-run-"),"Indominus charge should use its run cycle");
 renderer.drawAnimated({},"indominus",0,0,224,150,{id:"rex",state:"defeated",defeated:true},1,{});assert.equal(selected[7],"indominus");
});
test("all non-player actors render through their dedicated animation profiles",()=>{
 const source=readFileSync(resolve("src/main.js"),"utf8");
 for(const actor of ["beta","ferrucutus","hunter","indoraptor","indominus"])assert.match(source,new RegExp('drawAnimated\\(ctx, "'+actor+'"'));
});


test("all actor profiles resolve explicit attack, landing, impact and recovery SVG frames", () => {
  for (const name of ["violeta","vasti","rosa","ferrucutus","hunter","indoraptor","indominus"]) {
    for (const pose of ["attack","land","impact","recover"]) {
      const svg = readFileSync(resolve("public/assets/sprites", name + "-" + pose + ".svg"), "utf8");
      if (name === "violeta" || name === "rosa") {
        assert.match(svg, /mask-type="luminance"/);
        assert.match(svg, /data-source="velociraptor-sprite-sheet.png"/);
      } else assert.match(svg, /shape-rendering="crispEdges"/);
      assert.match(svg, new RegExp('data-pose="' + pose + '"'));
      assert.match(svg, new RegExp('data-motion-accent="' + ({attack:"attack",land:"landing",impact:"impact",recover:"recovery"}[pose]) + '"'));
    }
  }
});

test("pose selection follows live simulation state and preserves boss attack distinctions",()=>{
 assert.equal(selectActorPose("blue",{animationState:"attack"}),"violeta-attack");
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


test("remaining non-hunter standing poses use the shared crisp pixel grid", () => {
  const actors = ["vasti-idle","vasti-attack","vasti-land","vasti-impact","vasti-recover","ferrucutus","ferrucutus-attack","ferrucutus-land","ferrucutus-impact","ferrucutus-recover","indoraptor","indoraptor-attack","indoraptor-land","indoraptor-impact","indoraptor-recover","indominus","indominus-attack","indominus-land","indominus-impact","indominus-recover"];
  for (const name of actors) {
    const svg = readFileSync(resolve("public/assets/sprites", name + ".svg"), "utf8");
    assert.match(svg, /data-render-style="pixel-art"/);
    assert.match(svg, /data-pixel-grid="4px"/);
    assert.match(svg, /shape-rendering="crispEdges"/);
  }
});


test("every character has a dedicated crouch sprite with its correct source treatment", () => {
  const actors = [["violeta","violeta"],["vasti","vasti"],["rosa","rosa"],["ferrucutus","ferrucutus"],["hunter","hunter"],["indoraptor","indoraptor"],["indominus","indominus"]];
  for (const [actor,file] of actors) {
    const svg = readFileSync(resolve("public/assets/sprites", file + "-duck.svg"), "utf8");
    assert.match(svg, /data-pose="duck"/, actor + " has a crouch pose");
    if (actor === "violeta" || actor === "rosa") {
      assert.match(svg, /mask-type="luminance"/);
      assert.match(svg, /data-source="velociraptor-sprite-sheet.png"/);
    } else {
      assert.match(svg, /shape-rendering="crispEdges"/);
      assert.match(svg, actor === "hunter" ? /viewBox="0 0 240 168"/ : /viewBox="0 0 128 128"/);
      assert.match(svg, /<rect\b/);
    }
  }
});

test("player sprites keep dash priority and anchor the crouch pose to the ground",()=>{
 const renderer=Object.create(SpriteRenderer.prototype);
 const draws=[];
 renderer.draw=(_context,name,x,y,width,height,options)=>{draws.push({name,x,y,width,height,options});return true;};
 const context={save(){},restore(){},translate(){},rotate(){},scale(){}};
 renderer.drawDinosaur(context,"blue",100,200,64,42,{dashTimer:.1,duck:false,animationState:"attack",onGround:true,vx:340,normalHeight:62,facing:1},1);
 assert.equal(draws[0].name,"violeta-dash");
 draws.length=0;
 renderer.drawDinosaur(context,"blue",100,200,64,42,{dashTimer:0,duck:true,animationState:null,onGround:true,vx:0,normalHeight:62,facing:1},1);
 assert.equal(draws[0].name,"violeta-duck");
 assert.ok(draws[0].width > 64,"the crouching sprite stays visually larger than its physics box");
 assert.ok(draws[0].height < 62,"the crouch posture is vertically compressed");
 draws.length=0;
 renderer.drawDinosaur(context,"blue",100,200,64,62,{dashTimer:0,duck:false,animationState:null,onGround:true,vx:120,normalHeight:62,facing:1},.5);
 assert.match(draws[0].name,/^violeta-run-/);
});

test("all actors select their dedicated crouch pose", () => {
  const actors = [["blue","violeta-duck"],["vasti","vasti-duck"],["beta","rosa-duck"],["ferrucutus","ferrucutus-duck"],["hunter","hunter-duck"],["indoraptor","indoraptor-duck"],["indominus","indominus-duck"]];
  for (const [actor,pose] of actors) assert.equal(selectActorPose(actor,{state:"ducking"}),pose);
  assert.equal(selectActorPose("ferrucutus",{state:"brace",motionSpeed:100}),"ferrucutus-duck");
  assert.equal(selectActorPose("blue",{duck:true}),"violeta-duck");
});

test("moving characters use gait frames and stationary bosses return to idle",()=>{
 assert.match(selectActorPose("beta",{state:"following",motionSpeed:110},.2),/^rosa-run-/);
 assert.match(selectActorPose("ferrucutus",{state:"charge",motionSpeed:160},.3),/^ferrucutus-step-/);
 assert.match(selectActorPose("hunter",{state:"pursuit",motionSpeed:110},.3),/^hunter-run-/);
 assert.match(selectActorPose("indoraptor",{state:"stalking",motionSpeed:90},.4),/^indoraptor-run-/);
 assert.match(selectActorPose("indominus",{state:"stalking",motionSpeed:90},.5),/^indominus-run-/);
 assert.equal(selectActorPose("indoraptor",{state:"stalking",motionSpeed:0}),"indoraptor");
 assert.equal(selectActorPose("indominus",{state:"stalking",motionSpeed:0}),"indominus");
 assert.equal(selectActorPose("hunter",{state:"patrol",motionSpeed:0}),"hunter");
 const hunter=new HunterEnemy({id:"test-hunter",x:100,patrolStart:0,patrolEnd:400,groundY:100});
 hunter.update(.25,{x:900,y:0,w:60,h:62});
 assert.equal(hunter.motionSpeed,52);
 hunter.takeDamage(1);
 hunter.update(.1,{x:900,y:0,w:60,h:62});
 assert.equal(hunter.motionSpeed,0);
});

test("character selection dialog stays inside the game viewport without scrolling",()=>{
 const css=readFileSync(resolve("src/styles/main.css"),"utf8");
 const layout=css.split("/* Character selection: fixed viewport, no scrolling, bounded sprite art */").at(-1);
 assert.ok(layout && layout!==css,"the final selection layout override exists");
 assert.match(layout,/grid-template-rows:auto auto auto minmax\(0,1fr\) auto/);
 assert.match(layout,/width:min\(860px,100%\)/);
 assert.match(layout,/height:100%/);
 assert.match(layout,/max-height:none/);
 assert.match(layout,/overflow:hidden/);
 assert.match(layout,/max-width:min\(82%,190px\)/);
 assert.match(layout,/max-height:min\(100%,145px\)/);
 assert.match(layout,/grid-template-rows:auto minmax\(0,1fr\) auto auto/);
});


test("all non-hunter dinosaur frames resolve valid source assets", () => {
  const directory = resolve("public/assets/sprites");
  const dinosaurs = readdirSync(directory).filter(name => name.endsWith(".svg") && !name.startsWith("hunter") && !name.includes("-rig-"));
  assert.equal(dinosaurs.length, 53);
  for (const filename of dinosaurs) {
    const svg = readFileSync(resolve(directory, filename), "utf8");
    assert.match(svg, /^(?:<\?xml[^>]+>\s*)?<svg\b/);
    assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.doesNotMatch(svg, /linearGradient|radialGradient/);
    if (filename === "rosa.svg") {
      assert.match(svg, /href="\.\.\/\.\.\/references\/juvenile-velociraptor-sprite-sheet\.png"/);
      assert.match(svg, /data-source="juvenile-velociraptor-sprite-sheet\.png"/);
    } else if (/^(?:violeta|rosa)(?:-|\.)/.test(filename)) {
      assert.match(svg, /href="\.\.\/\.\.\/references\/velociraptor-sprite-sheet\.png"/);
      assert.match(svg, /data-source="velociraptor-sprite-sheet\.png"/);
    } else {
      assert.doesNotMatch(svg, /href=/i);
      assert.match(svg, /data-render-style="pixel-art"/);
    }
  }
});


test("dinosaur resting poses declare their source-based or pixel-art rendering mode", () => {
  for (const filename of ["violeta-idle.svg","rosa.svg","vasti-idle.svg","ferrucutus.svg","indoraptor.svg","indominus.svg"]) {
    const svg = readFileSync(resolve("public/assets/sprites", filename), "utf8");
    if (filename === "violeta-idle.svg" || filename === "rosa.svg") {
      assert.match(svg, filename === "rosa.svg" ? /data-source="juvenile-velociraptor-sprite-sheet.png"/ : /data-source="velociraptor-sprite-sheet.png"/);
      assert.match(svg, /mask-type="luminance"/);
    } else {
      assert.match(svg, /data-pixel-grid="4px"/);
      assert.match(svg, /data-render-style="pixel-art"/);
    }
  }
});


test("Violeta, Rosa and Vasti use dedicated crouch silhouettes from their correct sources", () => {
  for (const file of ["violeta","rosa"]) {
    const svg = readFileSync(resolve("public/assets/sprites", file + "-duck.svg"), "utf8");
    assert.match(svg, /data-pose="duck"/);
    assert.match(svg, /data-source="velociraptor-sprite-sheet.png"/);
    assert.match(svg, /mask-type="luminance"/);
  }
  const vasti = readFileSync(resolve("public/assets/sprites/vasti-duck.svg"), "utf8");
  assert.match(vasti, /data-pose="duck"/);
  assert.match(vasti, /data-render-style="pixel-art"/);
  assert.match(vasti, /data-pixel-grid="4px"/);
  assert.match(vasti, /shape-rendering="crispEdges"/);
  assert.match(vasti, /<rect/);
});


test("Vasti has dedicated grounded stomp and aerial slam animations derived from its reference silhouette", () => {
  for (const [pose, accent] of [["stomp", "stomp"], ["slam", "slam"]]) {
    const svg = readFileSync(resolve("public/assets/sprites", "vasti-" + pose + ".svg"), "utf8");
    assert.match(svg, /data-character="Vasti"/);
    assert.match(svg, /data-hand-digits="3"/);
    assert.match(svg, /data-colors="olive-green brown beige"/);
    assert.match(svg, /data-render-style="pixel-art"/);
    assert.match(svg, /data-pixel-grid="4px"/);
    assert.match(svg, new RegExp('data-pose="' + pose + '"'));
    assert.match(svg, new RegExp('data-motion-accent="' + accent + '"'));
    assert.match(svg, /<rect\b/);
  }
});

test("Vasti's ability selects a grounded stomp or an aerial ground-slam pose", () => {
  const grounded = new Player("vasti", 100, 430);
  assert.equal(grounded.useAbility(), true);
  assert.equal(grounded.animationState, "stomp");
  assert.equal(selectActorPose("vasti", grounded), "vasti-stomp");
  assert.equal(grounded.consumeShockwave(), true);

  const airborne = new Player("vasti", 100, 430);
  airborne.onGround = false;
  assert.equal(airborne.useAbility(), true);
  assert.equal(airborne.animationState, "slam");
  assert.equal(airborne.isSlamming, true);
  assert.equal(selectActorPose("vasti", airborne), "vasti-slam");
});


test("Vasti's complete animation set follows the Vastatosaurus rex reference silhouette", () => {
  const poses = ["idle","run-a","run-b","jump","duck","attack","impact","land","recover","stomp","slam"];
  const artwork = [];
  for (const pose of poses) {
    const svg = readFileSync(resolve("public/assets/sprites", "vasti-" + pose + ".svg"), "utf8");
    assert.match(svg, /data-reference="vastatosaurus-rex\.jpg"/);
    assert.match(svg, /data-hand-digits="3"/);
    assert.match(svg, /data-anatomy="three-fingered forelimbs/);
    assert.match(svg, /data-render-style="pixel-art"/);
    assert.match(svg, /data-pixel-grid="4px"/);
    assert.match(svg, /shape-rendering="crispEdges"/);
    assert.match(svg, /<(?:path|rect)\b/);
    artwork.push(svg);
  }
  assert.equal(new Set(artwork).size, poses.length, "every Vasti pose must have its own artwork");
});


test("Vasti articulated rig separates the original tail, legs, forelimb and lower jaw", () => {
  const rendererSource = readFileSync(resolve("src/rendering/SpriteRenderer.js"), "utf8");
  assert.match(rendererSource, /drawVastiRig\(/);
  assert.match(rendererSource, /const mirror = actorFacing > 0/);
  assert.match(rendererSource, /drawPart\("vasti-rig-tail"/);
  assert.match(rendererSource, /drawPart\("vasti-rig-leg-back"/);
  assert.match(rendererSource, /drawPart\("vasti-rig-leg-front"/);
  assert.match(rendererSource, /drawPart\("vasti-rig-foreleg"/);
  assert.match(rendererSource, /drawPart\("vasti-rig-jaw"/);

  const reference = readFileSync(resolve("public/references/vastatosaurus-rex.jpg"));
  const names = ["body", "tail", "leg-back", "leg-front", "foreleg", "jaw"];
  for (const name of names) {
    const svg = readFileSync(resolve("public/assets/sprites", "vasti-rig-" + name + ".svg"), "utf8");
    assert.match(svg, /data-source="embedded-original-reference"/);
    assert.match(svg, /data:image\/jpeg;base64,/);
    assert.match(svg, /filter="url\(#paper-key\)"/);
    const encoded = svg.match(/data:image\/jpeg;base64,([^"]+)/)?.[1];
    assert.ok(encoded, name + " must embed the reference image");
    assert.deepEqual(Buffer.from(encoded, "base64"), reference, name + " must use the exact original image");
  }
});

test("left and right arrows set the player's facing used by Vasti's mirrored rig", () => {
  const inputSource = readFileSync(resolve("src/core/InputManager.js"), "utf8");
  assert.match(inputSource, /left: \["ArrowLeft", "KeyA"\]/);
  assert.match(inputSource, /right: \["ArrowRight", "KeyD"\]/);
  const player = new Player("vasti", 0, 100);
  const input = {
    direction: "right",
    isDown(action) { return action === this.direction; },
    consume() { return false; }
  };
  player.update(1 / 60, input);
  assert.equal(player.facing, 1, "ArrowRight uses the right-facing direction");
  input.direction = "left";
  player.update(1 / 60, input);
  assert.equal(player.facing, -1, "ArrowLeft uses the left-facing direction");
});


test("Ferrucutus uses an articulated rig cut from its exact reference image", () => {
  const rendererSource = readFileSync(resolve("src/rendering/SpriteRenderer.js"), "utf8");
  assert.match(rendererSource, /drawReferenceFerrucutus\(/);
  assert.match(rendererSource, /drawFerrucutusRig\(/);
  assert.match(rendererSource, /character === "ferrucutus"/);
  assert.match(rendererSource, /const mirror = direction > 0/);

  const reference = readFileSync(resolve("public/references/ferrecutus-cerastes.jpg"));
  const names = ["body", "tail", "leg-back", "leg-front", "foreleg", "jaw"];
  for (const name of names) {
    const svg = readFileSync(resolve("public/assets/sprites", "ferrucutus-rig-" + name + ".svg"), "utf8");
    assert.match(svg, /data-reference="ferrecutus-cerastes\.jpg"/);
    assert.match(svg, /data-source="embedded-original-reference"/);
    assert.match(svg, /data:image\/jpeg;base64,/);
    assert.match(svg, /filter="url\(#paper-key\)"/);
    const encoded = svg.match(/data:image\/jpeg;base64,([^"]+)/)?.[1];
    assert.ok(encoded, name + " must embed the source reference");
    assert.deepEqual(Buffer.from(encoded, "base64"), reference, name + " must contain the exact original image");
  }
});

test("Ferrucutus rescues are wired to the interaction action and update the mission rescue count", () => {
  const mainSource = readFileSync(resolve("src/main.js"), "utf8");
  assert.match(mainSource, /input\.consume\("interact"\)/);
  assert.match(mainSource, /captive\.canInteract\(player\)/);
  assert.match(mainSource, /captive\.rescue\(\)/);
  assert.match(mainSource, /rescues \+= 1/);
  assert.match(mainSource, /new FerrucutusAlly\(/);
  assert.match(mainSource, /drawFerrucutusCage\(/);
});


test("Indominus Rex uses six articulated layers from its exact reference image", () => {
  const rendererSource = readFileSync(resolve("src/rendering/SpriteRenderer.js"), "utf8");
  assert.match(rendererSource, /drawIndominusRig\(/);
  assert.match(rendererSource, /drawReferenceIndominus\(/);
  assert.match(rendererSource, /character === "indominus"/);
  assert.match(rendererSource, /jawAngle = -0\.3/);
  assert.match(rendererSource, /attackName === "roar" \? -0\.56/);

  const reference = readFileSync(resolve("public/references/indominus-rex.jpg"));
  const names = ["body", "tail", "leg-back", "leg-front", "forelimb", "jaw"];
  for (const name of names) {
    const svg = readFileSync(resolve("public/assets/sprites", "indominus-rig-" + name + ".svg"), "utf8");
    assert.match(svg, /data-reference="indominus-rex\.jpg"/);
    assert.match(svg, /data-source="embedded-original-reference"/);
    assert.match(svg, /data:image\/jpeg;base64,/);
    assert.match(svg, /filter="url\(#paper-key\)"/);
    const encoded = svg.match(/data:image\/jpeg;base64,([^"]+)/)?.[1];
    assert.ok(encoded, name + " must embed the original reference");
    assert.deepEqual(Buffer.from(encoded, "base64"), reference, name + " must use the byte-identical source image");
  }
});

test("Indominus jaw opens while running and attacks, and closes in idle", () => {
  const renderer = Object.create(SpriteRenderer.prototype);
  const drawn = [];
  const rotations = [];
  renderer.get = () => ({ complete: true, naturalWidth: 480 });
  renderer.draw = (_context, name) => { drawn.push(name); return true; };
  const context = {
    save() {}, restore() {}, translate() {}, scale() {},
    rotate(angle) { rotations.push(angle); }
  };

  renderer.drawAnimated(context, "indominus", 0, 0, 232, 158, {
    id: "rex-run", direction: -1, state: "stalking", motionSpeed: 90
  }, 0.5, {});
  assert.ok(drawn.includes("indominus-rig-jaw"));
  assert.ok(rotations.at(-1) < -0.29, "running animation keeps the jaw open");

  drawn.length = 0;
  rotations.length = 0;
  renderer.drawAnimated(context, "indominus", 0, 0, 232, 158, {
    id: "rex-roar", direction: -1, state: "telegraph", attackName: "roar"
  }, 0.8, {});
  assert.ok(drawn.includes("indominus-rig-jaw"));
  assert.ok(rotations.at(-1) <= -0.55, "roar opens the jaw widest");

  rotations.length = 0;
  renderer.drawAnimated(context, "indominus", 0, 0, 232, 158, {
    id: "rex-idle", direction: -1, state: "stalking", motionSpeed: 0
  }, 1, {});
  assert.equal(rotations.at(-1), 0, "idle pose keeps the mouth closed");
});

test("Indominus charge attack uses running frames while roar uses the attack pose", () => {
  assert.match(selectActorPose("indominus", { state: "stalking", motionSpeed: 90 }, 0.5), /^indominus-run-/);
  assert.match(selectActorPose("indominus", { state: "attacking", attackName: "charge" }, 1), /^indominus-run-/);
  assert.equal(selectActorPose("indominus", { state: "telegraph", attackName: "roar" }), "indominus-attack");
});


test("Indoraptor rig separates head, jaw, tail, both legs and both forelimbs from its exact reference", () => {
  const rendererSource = readFileSync(resolve("src/rendering/SpriteRenderer.js"), "utf8");
  assert.match(rendererSource, /drawIndoraptorRig\(/);
  assert.match(rendererSource, /drawReferenceIndoraptor\(/);
  assert.match(rendererSource, /character === "indoraptor"/);
  assert.match(rendererSource, /bodyTilt = 0\.24/);
  assert.match(rendererSource, /bodyTilt = 1\.08/);

  const reference = readFileSync(resolve("public/references/indoraptor.jpg"));
  const names = ["body", "tail", "leg-back", "leg-front", "arm-back", "arm-front", "head", "jaw"];
  for (const name of names) {
    const svg = readFileSync(resolve("public/assets/sprites", "indoraptor-rig-" + name + ".svg"), "utf8");
    assert.match(svg, /data-reference="indoraptor\.jpg"/);
    assert.match(svg, /data-source="embedded-original-reference"/);
    assert.match(svg, /data:image\/jpeg;base64,/);
    assert.match(svg, /filter="url\(#paper-key\)"/);
    const encoded = svg.match(/data:image\/jpeg;base64,([^"]+)/)?.[1];
    assert.ok(encoded, name + " must embed the original reference");
    assert.deepEqual(Buffer.from(encoded, "base64"), reference, name + " must contain the exact reference bytes");
  }
});

test("Indoraptor uses a custom low stalking pose and a separate collapsed defeat pose", () => {
  assert.equal(selectActorPose("indoraptor", { state: "stalking", motionSpeed: 0 }), "indoraptor");
  assert.match(selectActorPose("indoraptor", { state: "stalking", motionSpeed: 90 }), /^indoraptor-run-/);
  assert.equal(selectActorPose("indoraptor", { state: "telegraph", attackName: "pounce" }), "indoraptor-attack");
  assert.equal(selectActorPose("indoraptor", { state: "recovering" }), "indoraptor-recover");
  assert.equal(selectActorPose("indoraptor", { state: "defeated", defeated: true }), "indoraptor-defeated");
});

test("Indoraptor articulated rig draws all eight parts and distinguishes pounce posture", () => {
  const renderer = Object.create(SpriteRenderer.prototype);
  const drawn = [];
  const rotations = [];
  renderer.get = () => ({ complete: true, naturalWidth: 297 });
  renderer.draw = (_context, name) => { drawn.push(name); return true; };
  const context = {
    save() {}, restore() {}, translate() {}, scale() {},
    rotate(angle) { rotations.push(angle); }
  };
  renderer.drawAnimated(context, "indoraptor", 0, 0, 144, 135, {
    id: "indo-idle", direction: 1, state: "stalking", motionSpeed: 0
  }, 0.4, {});
  assert.deepEqual(drawn, [
    "indoraptor-rig-tail","indoraptor-rig-leg-back","indoraptor-rig-arm-back",
    "indoraptor-rig-body","indoraptor-rig-leg-front","indoraptor-rig-arm-front",
    "indoraptor-rig-head","indoraptor-rig-jaw"
  ]);

  drawn.length = 0;
  rotations.length = 0;
  renderer.drawAnimated(context, "indoraptor", 0, 0, 144, 135, {
    id: "indo-pounce", direction: -1, state: "attacking", attackName: "pounce"
  }, 0.7, {});
  assert.equal(drawn.length, 8);
  assert.ok(rotations.some(angle => Math.abs(angle - 0.48) < 1e-8), "pounce leans the body forward");
  assert.ok(rotations.some(angle => Math.abs(angle - 0.42) < 1e-8), "pounce thrusts the head forward");
});


test("Violeta uses an articulated rig sourced from the adult velociraptor sprite sheet", () => {
  const rendererSource = readFileSync(resolve("src/rendering/SpriteRenderer.js"), "utf8");
  assert.match(rendererSource, /drawReferenceVioleta\(/);
  assert.match(rendererSource, /kind === "blue" && this\.drawReferenceVioleta/);
  assert.match(rendererSource, /const result = this\.draw\(context, pose, 0, 0, renderWidth, renderHeight/);

  const names = ["body", "tail", "leg-back", "leg-front", "arm-back", "arm-front", "head", "jaw"];
  for (const name of names) {
    const svg = readFileSync(resolve("public/assets/sprites", "violeta-rig-" + name + ".svg"), "utf8");
    assert.match(svg, /data-character="Violeta"/);
    assert.match(svg, /data-age="adult"/);
    assert.match(svg, /data-source="adult-velociraptor-sprite-sheet\.png"/);
    assert.match(svg, /href="\.\.\/\.\.\/references\/adult-velociraptor-sprite-sheet\.png"/);
    assert.match(svg, /width="1024" height="342"/);
    assert.match(svg, /mask-type="luminance"/);
  }
});

test("Violeta rig is visible at an enlarged scale and faces both arrow-key directions", () => {
  const renderer = Object.create(SpriteRenderer.prototype);
  const drawn = [];
  const scales = [];
  renderer.get = () => ({ complete: true, naturalWidth: 128 });
  renderer.draw = (_context, name, x, y, width, height) => {
    drawn.push({ name, x, y, width, height });
    return true;
  };
  const context = {
    save() {}, restore() {}, translate() {},
    rotate() {}, scale(x, y) { scales.push([x, y]); }
  };

  const player = { facing: 1, onGround: true, vx: 0, animationState: null, duck: false };
  renderer.drawDinosaur(context, "blue", 100, 200, 64, 62, player, 0.4, 1);
  assert.equal(drawn.length, 1);
  assert.equal(drawn[0].name, "violeta-idle");
  assert.ok(drawn[0].width >= 78, "rendered sprite is wider than its 64px physics body");
  assert.equal(scales.some(([x]) => x < 0), false, "right arrow direction keeps the source facing right");

  drawn.length = 0;
  scales.length = 0;
  player.facing = -1;
  renderer.drawDinosaur(context, "blue", 100, 200, 64, 62, player, 0.4, 1);
  assert.equal(drawn.length, 1);
  assert.equal(drawn[0].name, "violeta-idle");
  assert.ok(scales.some(([x, y]) => x === -1 && y === 1), "left arrow direction mirrors the visible sprite");
});

test("Violeta articulates its limbs for running, jumping, dashing and crouching", () => {
  const source = readFileSync(resolve("src/rendering/SpriteRenderer.js"), "utf8");
  for (const pose of ["violeta-run-a", "violeta-run-b", "violeta-jump", "violeta-dash", "violeta-duck", "violeta-attack", "violeta-impact", "violeta-land", "violeta-recover"]) {
    assert.match(source, new RegExp('pose === "' + pose + '"'));
  }
  assert.match(source, /backLegAngle = stride \* 0\.42/);
  assert.match(source, /frontLegAngle = -stride \* 0\.4/);
  assert.match(source, /jawAngle = 0\.34/);
});


test("Rosa has an articulated juvenile rig sourced from the dedicated 1024x337 reference sheet", () => {
  const rendererSource = readFileSync(resolve("src/rendering/SpriteRenderer.js"), "utf8");
  assert.match(rendererSource, /drawRosaRig\(/);
  assert.match(rendererSource, /drawReferenceRosa\(/);
  assert.match(rendererSource, /character === "beta" && this\.drawReferenceRosa/);

  const names = ["body", "tail", "leg-back", "leg-front", "arm-back", "arm-front", "head", "jaw"];
  for (const name of names) {
    const svg = readFileSync(resolve("public/assets/sprites", "rosa-rig-" + name + ".svg"), "utf8");
    assert.match(svg, /data-character="Rosa"/);
    assert.match(svg, /data-age="juvenile"/);
    assert.match(svg, /data-lineage="Violeta"/);
    assert.match(svg, /data-source="juvenile-velociraptor-sprite-sheet\.png"/);
    assert.match(svg, /data-sheet-size="1024x337"/);
    assert.match(svg, /href="\.\.\/\.\.\/references\/juvenile-velociraptor-sprite-sheet\.png"/);
    assert.match(svg, /mask-type="luminance"/);
  }
});

test("Rosa is visibly enlarged without changing the 48px companion physics box", () => {
  const renderer = Object.create(SpriteRenderer.prototype);
  const drawn = [];
  const scales = [];
  renderer.get = () => ({ complete: true, naturalWidth: 128 });
  renderer.draw = (_context, name, x, y, width, height) => {
    drawn.push({ name, x, y, width, height });
    return true;
  };
  const context = {
    save() {}, restore() {}, translate() {},
    rotate() {}, scale(x, y) { scales.push([x, y]); }
  };
  const rosa = { id: "rosa-test", state: "confined", facing: -1, motionSpeed: 0, x: 200, y: 300, w: 48, h: 48 };
  renderer.drawAnimated(context, "beta", rosa.x, rosa.y, rosa.w, rosa.h, rosa, 0.3, { facing: rosa.facing });
  assert.equal(drawn.length, 8);
  assert.ok(drawn.every(part => part.name.startsWith("rosa-rig-")));
  assert.ok(drawn.every(part => part.width > 48));
  assert.ok(scales.some(([x, y]) => x === -1 && y === 1), "Rosa's left-facing direction mirrors all rig parts");

  drawn.length = 0;
  scales.length = 0;
  rosa.facing = 1;
  rosa.state = "following";
  rosa.motionSpeed = 150;
  renderer.drawAnimated(context, "beta", rosa.x, rosa.y, rosa.w, rosa.h, rosa, 0.8, { facing: rosa.facing });
  assert.equal(drawn.length, 8);
  assert.ok(drawn.some(part => part.width >= 68), "the juvenile sprite is visibly larger than its physics box");
});

test("Rosa articulates the tail, limbs, head and jaw across follower states", () => {
  const source = readFileSync(resolve("src/rendering/SpriteRenderer.js"), "utf8");
  for (const pose of ["rosa-run-a","rosa-run-b","rosa-duck","rosa-attack","rosa-impact","rosa-land","rosa-recover"]) {
    assert.match(source, new RegExp('pose === "' + pose + '"'));
  }
  assert.match(source, /backLegAngle = stride \* 0\.43/);
  assert.match(source, /frontLegAngle = -stride \* 0\.4/);
  assert.match(source, /jawAngle = 0\.3/);
  assert.equal(selectActorPose("beta", { state: "following", motionSpeed: 150 }).startsWith("rosa-run-"), true);
  assert.equal(selectActorPose("beta", { animationState: "attack" }), "rosa-attack");
});

test("the playable roster is Violeta and Vasti; Rosa remains the rescue objective",()=>{
 const source=readFileSync(resolve("index.html"),"utf8");
 const cards=[...source.matchAll(/data-character="(blue|rosa|vasti)"/g)].map((match)=>match[1]);
 assert.deepEqual(cards,["blue","vasti"]);
 assert.doesNotMatch(source,/data-character="rosa"/);
 const main=readFileSync(resolve("src/main.js"),"utf8");
 assert.match(main,/savedCharacter === "vasti" \? "vasti" : "blue"/);
 assert.match(main,/new Beta\(/);
});
test("the unselected playable dinosaur is the only autonomous companion",()=>{
 const source=readFileSync(resolve("src/main.js"),"utf8");
 assert.match(source,/\["blue",\s*"vasti"\]/);
 assert.doesNotMatch(source,/\["blue",\s*"rosa",\s*"vasti"\]/);
 assert.match(source,/new AutonomousCompanion\(character/);
 assert.match(source,/companion\.update\(delta, player, world, physics, hunters, activeBoss\)/);
 const ai=readFileSync(resolve("src/entities/AutonomousCompanion.js"),"utf8");
 assert.match(ai,/obstacle/);assert.match(ai,/gapAhead/);assert.match(ai,/companion-strike/);assert.match(ai,/companion-boss-strike/);assert.match(ai,/companion-shockwave/);assert.match(ai,/physics\.step/);assert.match(ai,/formationX/);
 assert.match(ai,/actor.character === "blue"/);
 assert.match(ai,/actor.character === "vasti"/);
});
