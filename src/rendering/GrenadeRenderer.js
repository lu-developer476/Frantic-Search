import { GRENADE_EXPLOSION_DURATION, HUNTER_GRENADE_ASSETS } from "../entities/HunterGrenade.js";
export function drawHunterGrenade(context, grenade, spriteRenderer, elapsed = 0, offsetX = 0) {
  if(!grenade?.active)return false;
  const x=grenade.x-offsetX; context.save();
  if(grenade.exploded) {
    const progress=Math.max(0,Math.min(1,1-grenade.explosionLife/GRENADE_EXPLOSION_DURATION));
    context.globalAlpha*=1-progress;
    context.strokeStyle=grenade.type==="yellow"?"#ffe16a":"#ff8b42";
    context.lineWidth=6*(1-progress)+1;
    context.beginPath(); context.arc(x,grenade.y,Math.max(3,grenade.blastRadius*progress),0,Math.PI*2); context.stroke();
    context.fillStyle=grenade.type==="yellow"?"#ffe16a":"#ff8b42";
    context.globalAlpha*=0.45; context.beginPath();
    context.arc(x,grenade.y,Math.max(2,9*(1-progress)),0,Math.PI*2); context.fill();
  } else {
    context.translate(x,grenade.y); context.rotate(Math.atan2(grenade.vy,grenade.vx));
    const file=HUNTER_GRENADE_ASSETS[grenade.type]??HUNTER_GRENADE_ASSETS.orange;
    const drawn=spriteRenderer?.drawAnimatedReference(context,file,-12,-11,24,22,grenade,elapsed);
    if(!drawn) {
      context.fillStyle=grenade.type==="yellow"?"#e6bd45":"#d76d35";
      context.beginPath(); context.arc(0,0,8,0,Math.PI*2); context.fill();
    }
  }
  context.restore(); return true;
}
