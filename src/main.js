import "./styles/main.css";
import {GAME,LEVELS} from "./config/GameConfig.js";
import {AudioManager} from "./audio/AudioManager.js";
import {SaveManager} from "./storage/SaveManager.js";

const canvas=document.querySelector("#game"),ctx=canvas.getContext("2d");
const overlay=document.querySelector("#overlay"),stateLabel=document.querySelector("#game-state");
const distanceLabel=document.querySelector("#distance"),rescuesLabel=document.querySelector("#rescues"),bestLabel=document.querySelector("#best");
const save=new SaveManager(),audio=new AudioManager();
let selected=save.get("selectedCharacter"),running=false,gameOver=false,paused=false,last=0,elapsed=0,distance=0,speed=GAME.baseSpeed,spawnTimer=0,rescues=0,obstacles=[],particles=[],allies=[],keys={};
const player={x:GAME.playerX,y:GAME.groundY-66,w:74,h:66,vy:0,onGround:true,duck:false,invulnerable:0};
const companion={x:player.x-83,y:GAME.groundY-57,w:65,h:57};
const rand=(a,b)=>a+Math.random()*(b-a);
const level=()=>[...LEVELS].reverse().find(l=>distance>=l.distance)||LEVELS[0];
const best=()=>Math.max(save.get("bestDistance"),Math.floor(distance));
function roundedRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function drawDino(x,y,w,h,color,kind,phase=0,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);const leg=Math.sin(phase*13)*7;ctx.fillStyle=color;
  // Tail, torso, neck and head are deliberately original geometric silhouettes.
  ctx.beginPath();ctx.moveTo(18,h*.56);ctx.lineTo(-12,h*.42);ctx.lineTo(8,h*.67);ctx.lineTo(26,h*.69);ctx.fill();
  roundedRect(ctx,16,h*.36,w*.55,h*.43,kind==="blue"?13:18);
  ctx.beginPath();ctx.moveTo(w*.48,h*.49);ctx.lineTo(w*.63,h*.12);ctx.lineTo(w*.83,h*.14);ctx.lineTo(w*.78,h*.55);ctx.fill();
  roundedRect(ctx,w*.64,h*.06,w*.34,h*.22,9);ctx.fillRect(w*.86,h*.2,w*.14,5);
  ctx.fillStyle="#111918";ctx.beginPath();ctx.arc(w*.88,h*.12,3,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=color;ctx.lineWidth=kind==="vasti"?11:7;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(w*.35,h*.72);ctx.lineTo(w*.31+leg,h*.96);ctx.moveTo(w*.62,h*.72);ctx.lineTo(w*.66-leg,h*.96);ctx.stroke();
  if(kind==="blue"){ctx.strokeStyle="#d5e7e0";ctx.lineWidth=3;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(w*(.28+i*.12),h*.43);ctx.lineTo(w*(.34+i*.12),h*.58);ctx.stroke()}}
  else{ctx.fillStyle="#e8b58d";ctx.beginPath();ctx.moveTo(w*.25,h*.38);ctx.lineTo(w*.48,h*.43);ctx.lineTo(w*.35,h*.52);ctx.fill()}
  ctx.restore()}
function drawBackground(dt){const l=level();const grad=ctx.createLinearGradient(0,0,0,GAME.height);grad.addColorStop(0,l.sky);grad.addColorStop(1,"#819078");ctx.fillStyle=grad;ctx.fillRect(0,0,GAME.width,GAME.height);
  // distant ridgeline
  ctx.fillStyle="#192b29";ctx.beginPath();ctx.moveTo(0,310);for(let x=0;x<=GAME.width;x+=80)ctx.lineTo(x,280+Math.sin(x*.013+elapsed*.12)*34);ctx.lineTo(GAME.width,GAME.height);ctx.lineTo(0,GAME.height);ctx.fill();
  for(let i=0;i<12;i++){const x=((i*113-distance*.12)%1100+1100)%1100-60;const y=270+(i%3)*22;ctx.fillStyle=i%2?"#304638":"#263b34";ctx.beginPath();ctx.moveTo(x,y+100);ctx.lineTo(x+28,y-30-(i%3)*13);ctx.lineTo(x+57,y+100);ctx.fill();ctx.fillRect(x+24,y+55,8,75)}
  ctx.fillStyle=l.ground;ctx.fillRect(0,GAME.groundY,GAME.width,GAME.height-GAME.groundY);ctx.fillStyle="#89936b";ctx.fillRect(0,GAME.groundY,GAME.width,5);
  ctx.strokeStyle="#aab18a55";ctx.lineWidth=2;for(let i=0;i<24;i++){const x=((i*53-distance*.9)%1000+1000)%1000;ctx.beginPath();ctx.moveTo(x,GAME.groundY+20);ctx.lineTo(x-12,GAME.groundY+25);ctx.stroke()}
  // atmospheric dust
  ctx.fillStyle="#d4dfb022";for(let i=0;i<18;i++){const x=(i*71+elapsed*12)%GAME.width,y=100+(i*47)%280;ctx.fillRect(x,y,2,2)}}
function drawObstacle(o){ctx.save();if(o.type==="crate"){ctx.fillStyle="#7b583c";roundedRect(ctx,o.x,o.y,o.w,o.h,4);ctx.strokeStyle="#c19a69";ctx.lineWidth=4;ctx.strokeRect(o.x+5,o.y+5,o.w-10,o.h-10);ctx.beginPath();ctx.moveTo(o.x+6,o.y+6);ctx.lineTo(o.x+o.w-6,o.y+o.h-6);ctx.moveTo(o.x+o.w-6,o.y+6);ctx.lineTo(o.x+6,o.y+o.h-6);ctx.stroke()}else if(o.type==="hunter"){ctx.fillStyle="#c3c8b7";roundedRect(ctx,o.x+8,o.y+14,o.w-16,o.h-14,5);ctx.fillStyle="#b78c62";ctx.beginPath();ctx.arc(o.x+o.w/2,o.y+10,10,0,Math.PI*2);ctx.fill();ctx.fillStyle="#303a35";ctx.fillRect(o.x+5,o.y+o.h-8,o.w-10,8)}else{ctx.fillStyle="#b5b99c";ctx.beginPath();ctx.moveTo(o.x,o.y+o.h);ctx.lineTo(o.x+o.w*.15,o.y+o.h*.35);ctx.lineTo(o.x+o.w*.36,o.y+o.h*.48);ctx.lineTo(o.x+o.w*.55,o.y);ctx.lineTo(o.x+o.w*.78,o.y+.4*o.h);ctx.lineTo(o.x+o.w,o.y+o.h);ctx.fill()}ctx.restore()}
function spawn(){const roll=Math.random();const type=roll<.48?"rock":roll<.78?"crate":"hunter";const h=type==="rock"?rand(38,64):type==="crate"?rand(54,78):72;obstacles.push({type,x:GAME.width+30,y:GAME.groundY-h,w:type==="rock"?rand(38,55):type==="crate"?54:43,h,passed:false})}
function burst(x,y,color="#d8f36a",count=12){for(let i=0;i<count;i++)particles.push({x,y,vx:rand(-170,170),vy:rand(-240,40),life:rand(.3,.7),max:.7,color,size:rand(2,5)})}
function rects(a,b){return a.x+12<b.x+b.w-7&&a.x+a.w-12>b.x+7&&a.y+8<b.y+b.h-5&&a.y+a.h-4>b.y+5}
function update(dt){if(!running||paused)return;elapsed+=dt;distance+=speed*dt/10;speed=Math.min(GAME.maxSpeed,GAME.baseSpeed+distance*.12);player.invulnerable=Math.max(0,player.invulnerable-dt);
  const duck=keys.ArrowDown||keys.KeyS;player.duck=duck&&player.onGround;player.h=player.duck?42:66;if(player.onGround)player.y=GAME.groundY-player.h;
  if((keys.Space||keys.ArrowUp||keys.KeyW)&&player.onGround&&!player.duck){player.vy=-690;player.onGround=false;audio.jump();keys.Space=keys.ArrowUp=keys.KeyW=false}
  player.vy+=GAME.gravity*dt;player.y+=player.vy*dt;if(player.y+player.h>=GAME.groundY){player.y=GAME.groundY-player.h;player.vy=0;player.onGround=true}
  companion.x=player.x-83;companion.y=GAME.groundY-57+Math.sin(elapsed*8)*2;
  spawnTimer-=dt;if(spawnTimer<=0){spawn();spawnTimer=rand(GAME.spawnMin,GAME.spawnMax)*Math.max(.55,1-distance/8000)}
  for(const o of obstacles){o.x-=speed*dt;if(!o.passed&&o.x+o.w<player.x){o.passed=true;if(o.type==="hunter"){rescues++;rescuesLabel.textContent=String(rescues).padStart(2,"0");audio.rescue();burst(o.x,o.y,"#d8f36a",18)}}if(rects({x:player.x,y:player.y,w:player.w,h:player.h},o)&&player.invulnerable<=0){endGame();break}}
  obstacles=obstacles.filter(o=>o.x+o.w>-30);
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=600*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);
  distanceLabel.textContent=Math.floor(distance).toString().padStart(4,"0")+" m";rescuesLabel.textContent=String(rescues).padStart(2,"0");bestLabel.textContent=Math.floor(best()).toString().padStart(4,"0")+" m";
}
function render(){drawBackground();const phase=elapsed;for(const o of obstacles)drawObstacle(o);for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size)}ctx.globalAlpha=1;
  // Both protagonists are always visible and present in every level.
  drawDino(companion.x,companion.y,companion.w,companion.h,"#d2a27d","vasti",phase,.95);
  const isBlue=selected==="blue";drawDino(player.x,player.y,player.w,player.h,isBlue?"#75a99b":"#d2a27d",isBlue?"blue":"vasti",phase,player.invulnerable>0&&Math.floor(elapsed*18)%2===0?.35:1);
  if(distance>550&&Math.floor(elapsed*1.4)%9===0){ctx.fillStyle="#d8f36a";ctx.font="12px monospace";ctx.fillText("⚑ TRACKS DETECTED",GAME.width-190,40)}
  ctx.fillStyle="#eaf0d9";ctx.font="11px monospace";ctx.fillText(level().name,24,34);ctx.fillStyle="#d8f36a";ctx.fillRect(24,47,Math.min(220,distance/12),3);
}
function frame(now){const dt=Math.min((now-last)/1000||0,.033);last=now;update(dt);render();if(running&&!paused)requestAnimationFrame(frame)}
function start(){audio.unlock();overlay.classList.add("hidden");running=true;gameOver=false;paused=false;elapsed=0;distance=0;speed=GAME.baseSpeed;spawnTimer=.8;rescues=0;obstacles=[];particles=[];player.y=GAME.groundY-player.h;player.vy=0;player.onGround=true;stateLabel.textContent="IN PROGRESS";rescuesLabel.textContent="00";last=performance.now();requestAnimationFrame(frame)}
function endGame(){running=false;gameOver=true;audio.hit();burst(player.x+35,player.y+30,"#e8a77d",24);save.update({bestDistance:Math.max(save.get("bestDistance"),Math.floor(distance)),rescues:save.get("rescues")+rescues});bestLabel.textContent=String(save.get("bestDistance")).padStart(4,"0")+" m";stateLabel.textContent="SIGNAL LOST";overlay.querySelector(".overlay-kicker").textContent="MISSION INTERRUPTED";overlay.querySelector("h2").innerHTML="THE WILD<br><em>STRIKES BACK.</em>";overlay.querySelector("p").textContent="Distancia: "+Math.floor(distance)+" m · Rescates: "+rescues+". Volvé a intentarlo.";overlay.querySelector("button").textContent="REINTENTAR ↗";overlay.classList.remove("hidden")}
function togglePause(){if(!running)return;paused=!paused;stateLabel.textContent=paused?"PAUSED":"IN PROGRESS";if(paused){overlay.querySelector(".overlay-kicker").textContent="OPERATION PAUSED";overlay.querySelector("h2").innerHTML="CATCH YOUR<br><em>BREATH.</em>";overlay.querySelector("p").textContent="La operación está en pausa.";overlay.querySelector("button").textContent="CONTINUAR ↗";overlay.classList.remove("hidden")}else{overlay.classList.add("hidden");last=performance.now();requestAnimationFrame(frame)}}
function selectCharacter(value){selected=value;save.update({selectedCharacter:value});document.querySelectorAll(".character-card").forEach(card=>card.classList.toggle("active",card.dataset.character===value));if(!running)render()}
document.querySelectorAll(".character-card").forEach(card=>card.addEventListener("click",()=>selectCharacter(card.dataset.character)));
document.querySelector("#start-button").addEventListener("click",start);document.querySelector("#overlay-start").addEventListener("click",()=>{if(paused){togglePause();return}start()});
document.querySelector("#sound-toggle").addEventListener("click",()=>{const enabled=!audio.enabled;audio.setEnabled(enabled);document.querySelector("#sound-toggle").innerHTML=enabled?"♫ <span>SONIDO</span>":"♪ <span>SILENCIO</span>";save.update({muted:!enabled})});
window.addEventListener("keydown",e=>{if(["Space","ArrowUp","ArrowDown"].includes(e.code))e.preventDefault();if(e.code==="KeyP"){togglePause();return}keys[e.code]=true;if((e.code==="Space"||e.code==="Enter")&&!running&&!paused)start()});
window.addEventListener("keyup",e=>{keys[e.code]=false});
canvas.addEventListener("pointerdown",()=>{if(running){keys.Space=true;setTimeout(()=>keys.Space=false,40)}});
bestLabel.textContent=String(save.get("bestDistance")).padStart(4,"0")+" m";rescuesLabel.textContent=String(save.get("rescues")).padStart(2,"0");if(save.get("muted")){audio.setEnabled(false);document.querySelector("#sound-toggle").innerHTML="♪ <span>SILENCIO</span>"}
selectCharacter(selected);render();