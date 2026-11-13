import { Player } from "./Player.js";
export class AutonomousCompanion {
 constructor(character,x,groundY,slot=0){this.character=character;this.actor=new Player(character,x,groundY);this.slot=slot;this.attackCooldown=0;this.input={keys:new Set(),actions:new Set(),isDown(n){return this.keys.has(n)},consume(n){return this.actions.delete(n)}};}
 update(delta,leader,world,physics,hunters){
  const a=this.actor;this.attackCooldown=Math.max(0,this.attackCooldown-delta);this.input.keys.clear();this.input.actions.clear();
  const dx=leader.x+(this.slot===0?-116:92)-a.x;if(Math.abs(dx)>18)this.input.keys.add(dx>0?"right":"left");
  const dir=dx===0?a.facing:Math.sign(dx);
  const obstacle=world.obstacles.some(o=>o.x+o.w>a.x+(dir>0?a.w:-36)&&o.x<a.x+(dir>0?a.w+112:36)&&o.y+o.h>a.y+12);
  const gap=world.gapAhead(a.x+a.w*(dir>0?1:0),190);
  if(a.onGround&&(obstacle||(gap&&Math.abs(gap.start-a.x)<135)||(leader.y+leader.h<a.y+a.h-38&&Math.abs(dx)<210)))this.input.actions.add("jump");
  const target=hunters.filter(h=>!h.defeated).map(h=>({hunter:h,d:Math.abs(h.x+h.w/2-(a.x+a.w/2))})).filter(v=>v.d<112).sort((x,y)=>x.d-y.d)[0];
  let strike=null;if(target&&this.attackCooldown<=0){a.facing=target.hunter.x>=a.x?1:-1;a.animationState="attack";a.animationTimer=.24;this.attackCooldown=1.55;strike=target.hunter;}
  a.update(delta,this.input);const result=physics.step(a,delta,world.platformsNear(a.x));
  if(result.fell){a.x=Math.max(0,leader.x+(this.slot===0?-116:92));a.y=a.groundY-a.h;a.vx=0;a.vy=0;a.onGround=true;}
  a.motionSpeed=a.vx;return strike&&Math.abs(strike.x+strike.w/2-(a.x+a.w/2))<145?{type:"companion-strike",hunter:strike}:null;
 }
}