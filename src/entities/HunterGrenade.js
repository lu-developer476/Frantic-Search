export const HUNTER_GRENADE_ASSETS = Object.freeze({ orange:"orange-grenade.gif", yellow:"yellow-grenade.gif" });
export const GRENADE_EXPLOSION_DURATION = 0.42;
export class HunterGrenade {
  constructor({x,y,targetX,groundY,shooterId=null,type="orange",flightTime=0.9,gravity=900,blastRadius=104,damage=1}) {
    this.x=Number(x)||0; this.y=Number(y)||0;
    this.targetX=Number.isFinite(targetX)?targetX:this.x;
    this.groundY=Number.isFinite(groundY)?groundY:this.y+28;
    this.shooterId=shooterId; this.type=type==="yellow"?"yellow":"orange";
    this.asset=HUNTER_GRENADE_ASSETS[this.type]; this.size=22;
    this.gravity=Math.max(1,gravity); this.flightTime=Math.max(0.35,flightTime);
    this.blastRadius=Math.max(1,blastRadius); this.damage=Math.max(0,damage);
    this.active=true; this.exploded=false; this.justExploded=false;
    this.explosionLife=GRENADE_EXPLOSION_DURATION; this.fuse=this.flightTime+0.18;
    const landingY=this.groundY-this.size/2;
    this.vx=Math.max(-420,Math.min(420,(this.targetX-this.x)/this.flightTime));
    this.vy=(landingY-this.y-0.5*this.gravity*this.flightTime**2)/this.flightTime;
  }
  update(delta) {
    this.justExploded=false; if(!this.active)return;
    const step=Math.max(0,Math.min(0.1,Number(delta)||0));
    if(this.exploded) {
      this.explosionLife=Math.max(0,this.explosionLife-step);
      if(this.explosionLife===0)this.active=false;
      return;
    }
    this.x+=this.vx*step;
    this.y+=this.vy*step+0.5*this.gravity*step**2;
    this.vy+=this.gravity*step; this.fuse=Math.max(0,this.fuse-step);
    if((this.y+this.size/2>=this.groundY&&this.vy>=0)||this.fuse===0) {
      this.y=Math.min(this.y,this.groundY-this.size/2); this.explode();
    }
  }
  explode() {
    if(this.exploded||!this.active)return false;
    this.exploded=true; this.justExploded=true; this.vx=0; this.vy=0;
    this.explosionLife=GRENADE_EXPLOSION_DURATION; return true;
  }
}
