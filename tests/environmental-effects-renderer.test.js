import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { EFFECTS_LAYER_NAMES, EFFECTS_PIXEL_SCALE, EnvironmentalEffectsRenderer } from "../src/rendering/EnvironmentalEffectsRenderer.js";

function createCanvasFactory(){
  const canvases=[];
  const createCanvas=()=>{
    const calls=[];
    const context={
      calls,imageSmoothingEnabled:true,globalAlpha:1,shadowBlur:0,fillStyle:"",
      setTransform(...args){calls.push(["setTransform",...args]);},
      clearRect(...args){calls.push(["clearRect",...args]);},
      save(){calls.push(["save"]);},restore(){calls.push(["restore"]);},
      translate(...args){calls.push(["translate",...args]);},
      fillRect(...args){calls.push(["fillRect",...args]);}
    };
    const canvas={width:1,height:1,getContext:()=>context};
    canvases.push({canvas,context,calls});return canvas;
  };
  return {createCanvas,canvases};
}
function createTargetContext(){
  const draws=[],calls=[];
  return {
    canvas:{width:960,height:540},draws,calls,imageSmoothingEnabled:true,globalAlpha:1,
    save(){calls.push(["save"]);},restore(){calls.push(["restore"]);},
    drawImage(canvas,...args){draws.push({canvas,args,smoothing:this.imageSmoothingEnabled});}
  };
}

test("ambient effects use independent nearest-neighbor pixel layers",()=>{
  const factory=createCanvasFactory(),renderer=new EnvironmentalEffectsRenderer({createCanvas:factory.createCanvas}),target=createTargetContext();
  assert.equal(EFFECTS_PIXEL_SCALE,3);
  assert.deepEqual(EFFECTS_LAYER_NAMES,["back-motes","wind","weather","dust","particles"]);
  assert.deepEqual(renderer.layers.map(layer=>layer.name),EFFECTS_LAYER_NAMES);
  assert.equal(factory.canvases.length,EFFECTS_LAYER_NAMES.length);
  renderer.drawAmbientBack(target,{environment:"redwood",cameraX:120,viewportWidth:960,viewportHeight:540,elapsed:3});
  assert.equal(target.draws.length,1);
  assert.equal(target.draws[0].smoothing,false);
  assert.equal(factory.canvases[0].canvas.width,320);
  assert.equal(factory.canvases[0].canvas.height,180);
  assert.ok(factory.canvases[0].calls.some(call=>call[0]==="fillRect"));
});

test("biome profiles draw wind, coastal rain, industrial ash and environmental dust",()=>{
  const factory=createCanvasFactory(),renderer=new EnvironmentalEffectsRenderer({createCanvas:factory.createCanvas}),target=createTargetContext();
  renderer.drawWind(target,{environment:"coastal",cameraX:300,viewportWidth:960,viewportHeight:540,elapsed:2});
  renderer.drawWeather(target,{environment:"coastal",cameraX:300,viewportWidth:960,viewportHeight:540,elapsed:2});
  const coastal= factory.canvases[2].calls.filter(call=>call[0]==="fillRect").length;
  renderer.drawWeather(target,{environment:"black-site",cameraX:300,viewportWidth:960,viewportHeight:540,elapsed:2});
  const industrial=factory.canvases[2].calls.filter(call=>call[0]==="fillRect").length;
  renderer.drawDust(target,{environment:"extraction",cameraX:300,viewportWidth:960,viewportHeight:540,elapsed:2});
  assert.ok(factory.canvases[1].calls.some(call=>call[0]==="fillRect"));
  assert.ok(coastal>0,"coastal drizzle must be drawn");
  assert.ok(industrial>coastal && industrial!==coastal,"black-site ash adds a distinct weather pattern");
  assert.ok(factory.canvases[3].calls.some(call=>call[0]==="fillRect"));
});

test("redwood leaves are denser than sterile indoor motes and indoor air has no outdoor weather",()=>{
  const factory=createCanvasFactory(),renderer=new EnvironmentalEffectsRenderer({createCanvas:factory.createCanvas}),target=createTargetContext();
  renderer.drawAmbientBack(target,{environment:"redwood",viewportWidth:960,viewportHeight:540,elapsed:1});
  const redwood=factory.canvases[0].calls.filter(call=>call[0]==="fillRect").length;
  renderer.drawAmbientBack(target,{environment:"rosa-containment",viewportWidth:960,viewportHeight:540,elapsed:1});
  const indoor=factory.canvases[0].calls.filter(call=>call[0]==="fillRect").length;
  assert.ok(redwood>indoor);
  renderer.drawWeather(target,{environment:"rosa-containment",viewportWidth:960,viewportHeight:540,elapsed:1});
  assert.equal(factory.canvases[2].calls.filter(call=>call[0]==="fillRect").length,0);
});

test("gameplay particles keep world coordinates with camera compensation",()=>{
  const factory=createCanvasFactory(),renderer=new EnvironmentalEffectsRenderer({createCanvas:factory.createCanvas}),target=createTargetContext();
  renderer.drawParticles(target,{cameraX:321.6,viewportWidth:960,viewportHeight:540,particles:[{x:410,y:180,size:4,life:.3,max:.6,color:"#fff"}]});
  const layer=factory.canvases[4];
  assert.ok(layer.calls.some(call=>call[0]==="translate"&&call[1]===-322));
  assert.ok(layer.calls.some(call=>call[0]==="fillRect"&&call[1]===410));
  assert.deepEqual(target.draws[0].args,[322,0,960,540]);
});

test("dash dust clouds are block-rasterized without mutating their source objects",()=>{
  const factory=createCanvasFactory(),renderer=new EnvironmentalEffectsRenderer({createCanvas:factory.createCanvas}),target=createTargetContext();
  const clouds=[{x:500,y:300,w:205,h:90,life:.5,max:.72}],original=structuredClone(clouds);
  renderer.drawDust(target,{environment:"redwood",cameraX:240,viewportWidth:960,viewportHeight:540,elapsed:3,dustClouds:clouds});
  assert.deepEqual(clouds,original);
  assert.ok(factory.canvases[3].calls.filter(call=>call[0]==="fillRect").length>10);
});

test("effect layers resize and reject invalid scales or missing layer names",()=>{
  const factory=createCanvasFactory(),renderer=new EnvironmentalEffectsRenderer({createCanvas:factory.createCanvas});
  renderer.drawAmbientBack(createTargetContext(),{environment:"coastal",viewportWidth:1200,viewportHeight:600,elapsed:0});
  assert.ok(factory.canvases.every(({canvas})=>canvas.width===400&&canvas.height===200));
  assert.throws(()=>new EnvironmentalEffectsRenderer({pixelScale:0,createCanvas:factory.createCanvas}),RangeError);
  assert.throws(()=>new EnvironmentalEffectsRenderer({pixelScale:1.5,createCanvas:factory.createCanvas}),RangeError);
  assert.throws(()=>renderer.drawLayer(createTargetContext(),"unknown",{},()=>{}),RangeError);
});

test("campaign integrates layered ambient effects without changing physics or sprite assets",async()=>{
  const [main,effects,platforms,collision,sprites]=await Promise.all([
    readFile(new URL("../src/main.js",import.meta.url),"utf8"),
    readFile(new URL("../src/rendering/EnvironmentalEffectsRenderer.js",import.meta.url),"utf8"),
    readFile(new URL("../src/world/PlatformWorld.js",import.meta.url),"utf8"),
    readFile(new URL("../src/systems/CollisionSystem.js",import.meta.url),"utf8"),
    readFile(new URL("../src/rendering/SpriteRenderer.js",import.meta.url),"utf8")
  ]);
  assert.match(main,/new EnvironmentalEffectsRenderer\(\)/);
  for(const method of ["drawAmbientBack","drawWind","drawWeather","drawDust","drawParticles"])assert.match(main,new RegExp("effectsRenderer\\."+method+"\\(ctx"));
  assert.match(platforms,/this\.platforms\.push/);
  assert.match(collision,/platform\.x|platform\.y/);
  assert.match(sprites,/REFERENCE_PNG_CHARACTERS/);
  assert.doesNotMatch(effects,/\.(?:png|gif)\b/i);
  assert.doesNotMatch(effects,/PlatformWorld|CollisionSystem|PhysicsSystem/);
});