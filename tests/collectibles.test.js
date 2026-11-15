import test from "node:test";
import assert from "node:assert/strict";
import { generateSectionCollectibles, COLLECTIBLE_TOTALS } from "../src/world/CollectibleGenerator.js";
import { PlatformWorld } from "../src/world/PlatformWorld.js";
import { GAME, WORLD } from "../src/config/GameConfig.js";
test("field survey contains twelve amber fossils and three research drives",()=>{
 assert.deepEqual(COLLECTIBLE_TOTALS,{amber:12,intel:3});
 const world=new PlatformWorld(GAME.groundY,{seed:314159});world.extendTo(WORLD.totalLength+1);
 assert.equal(world.collectibleSpawns.filter(x=>x.type==="amber").length,12);
 assert.equal(world.collectibleSpawns.filter(x=>x.type==="intel").length,3);
 assert.equal(new Set(world.collectibleSpawns.map(x=>x.id)).size,15);
});
test("collectible generation is deterministic and varies across seeds",()=>{
 const args={seed:271828,sectionIndex:2,sectionStart:13000,sectionLength:7600,groundY:430};
 assert.deepEqual(generateSectionCollectibles(args),generateSectionCollectibles(args));
 assert.notDeepEqual(generateSectionCollectibles(args),generateSectionCollectibles({...args,seed:123456}));
});
test("indoor Rosa containment does not contain outdoor collectibles",()=>{
 const world=new PlatformWorld(GAME.groundY,{seed:20261115});world.extendTo(WORLD.totalLength+1);
 assert.equal(world.collectibleSpawns.some(x=>x.sectionIndex===5),false);
});
test("collectibles spawn within supported section floor",()=>{
 const world=new PlatformWorld(GAME.groundY,{seed:987654});world.extendTo(WORLD.totalLength+1);
 for(const item of world.collectibleSpawns){
  assert.ok(item.x>=WORLD.sectionStarts[item.sectionIndex]);
  assert.ok(item.x<WORLD.sectionStarts[item.sectionIndex]+WORLD.sectionLengths[item.sectionIndex]);
  assert.equal(world.hasGroundSupportAt(item.x,GAME.groundY,false),true,item.id);
  assert.ok(item.y<GAME.groundY&&item.y+item.h>GAME.groundY-100);
 }
});
