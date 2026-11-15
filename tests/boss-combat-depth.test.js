import test from "node:test";
import assert from "node:assert/strict";
import { IndoraptorBoss } from "../src/entities/IndoraptorBoss.js";
import { IndominusRexBoss } from "../src/entities/IndominusRexBoss.js";
import { CollisionSystem } from "../src/systems/CollisionSystem.js";

test("Indoraptor phase two introduces a fast, low shadow lunge",()=>{
 const b=new IndoraptorBoss({id:"indo-phase-two",x:500,groundY:430});b.activate();b.health=4;assert.equal(b.phase,2);
 b.attackIndex=0;assert.equal(b.chooseAttack(),"pounce");b.attackIndex=1;assert.equal(b.chooseAttack(),"claw");b.attackIndex=2;assert.equal(b.chooseAttack(),"shadow-lunge");
 b.state="attacking";b.attackName="shadow-lunge";b.direction=1;
 assert.equal(CollisionSystem.bossAttackHit({x:650,y:368,w:64,h:62},b),true);
 assert.equal(CollisionSystem.bossAttackHit({x:650,y:280,w:64,h:62},b),false);
});
test("Indominus phase two adds a directional ground shockwave",()=>{
 const b=new IndominusRexBoss({id:"rex-phase-two",x:500,groundY:430});b.activate();b.health=7;assert.equal(b.phase,2);b.attackIndex=3;assert.equal(b.chooseAttack(500),"stomp");
 b.state="attacking";b.attackName="stomp";b.direction=1;
 assert.equal(CollisionSystem.bossAttackHit({x:b.x+b.w+20,y:368,w:64,h:62},b),true);
 assert.equal(CollisionSystem.bossAttackHit({x:b.x+b.w+20,y:280,w:64,h:62},b),false);
});
test("a clean dodge extends recovery and creates a counter window",()=>{
 const b=new IndoraptorBoss({id:"indo-dodge-window",x:500,groundY:430});b.activate();b.state="attacking";b.attackName="claw";b.stateTimer=.01;
 b.update(.02,{x:1300,y:368,w:64,h:62});assert.equal(b.state,"recovering");assert.equal(b.lastAttackMissed,true);
 assert.ok(b.stateTimer>b.recoveryDuration());assert.equal(b.isVulnerable,true);
});
test("a successful enemy hit does not receive the dodge recovery bonus",()=>{
 const b=new IndoraptorBoss({id:"indo-hit-window",x:500,groundY:430});b.activate();b.state="attacking";b.attackName="claw";b.stateTimer=.01;
 b.update(.02,{x:650,y:368,w:64,h:62});assert.equal(b.state,"recovering");assert.equal(b.lastAttackMissed,false);
 assert.equal(b.stateTimer,b.recoveryDuration());
});
test("a hit during recovery opens a longer phase-transition stagger",()=>{
 const b=new IndoraptorBoss({id:"indo-phase-break",x:500,groundY:430});b.activate();b.state="recovering";
 const result=b.takeDamage(4);assert.equal(result.hit,true);assert.equal(result.phaseChanged,true);assert.equal(b.phase,2);
 assert.equal(b.state,"stunned");assert.equal(b.stateTimer,.58);assert.equal(b.isVulnerable,true);
});
test("Indominus retains its three opening attacks before phase two",()=>{
 const b=new IndominusRexBoss({id:"rex-openers",x:500,groundY:430});b.activate();
 b.attackIndex=0;const a=b.chooseAttack(500);b.attackIndex=1;const c=b.chooseAttack(500);b.attackIndex=2;const d=b.chooseAttack(500);
 assert.deepEqual([a,c,d],["roar","charge","tail-sweep"]);
});
