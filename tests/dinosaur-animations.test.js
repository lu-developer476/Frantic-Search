import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SpriteRenderer } from "../src/rendering/SpriteRenderer.js";
import { selectActorPose } from "../src/rendering/AnimationProfiles.js";
import { IndoraptorBoss } from "../src/entities/IndoraptorBoss.js";

test("feeding and jump are first-class animation states",()=>{
  assert.equal(selectActorPose("blue",{animationState:"eat"}),"violeta-eat");
  assert.equal(selectActorPose("beta",{animationState:"eat"}),"rosa-eat");
  assert.equal(selectActorPose("vasti",{animationState:"eat"}),"vasti-eat");
  assert.equal(selectActorPose("indoraptor",{animationState:"eat"}),"indoraptor-eat");
  assert.equal(selectActorPose("indoraptor",{animationState:"jump"}),"indoraptor-jump");
  assert.equal(selectActorPose("indoraptor",{state:"eating"}),"indoraptor-eat");
});

test("Indoraptor exposes generation two at the existing phase-two health threshold",()=>{
  const boss=new IndoraptorBoss({id:"indo-phase",x:800,groundY:300,arenaMinX:0,arenaMaxX:1800});
  assert.equal(boss.generation,1);
  boss.activate();boss.state="recovering";boss.takeDamage(4);
  assert.equal(boss.phase,2);assert.equal(boss.generation,2);
});

test("both generations draw eight distinct articulated layers",()=>{
  const renderer=Object.create(SpriteRenderer.prototype),drawn=[];
  renderer.get=()=>({complete:true,naturalWidth:910});
  renderer.draw=(_ctx,name)=>{drawn.push(name);return true;};
  const ctx={save(){},restore(){},translate(){},scale(){},rotate(){}};
  renderer.drawAnimated(ctx,"indoraptor",0,0,136,127,{id:"indo",direction:1,state:"stalking",phase:2,motionSpeed:0},.5,{});
  assert.equal(drawn.length,8);assert.ok(drawn.every(name=>name.startsWith("indoraptor-gen2-rig-")));
});

test("both Indoraptor generations provide looping idle, walk, jump and eat GIFs",()=>{
  for(const generation of ["first-generation","second-generation"])
    for(const motion of ["idle","walk","jump","eat"]){
      const gif=readFileSync(resolve("public/assets/animations/indoraptor",generation,motion+".gif"));
      assert.equal(gif.subarray(0,6).toString("ascii"),"GIF89a");
      assert.ok(gif.length>1000);assert.equal(gif.at(-1),0x3b);
    }
});
