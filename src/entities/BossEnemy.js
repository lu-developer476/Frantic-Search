function overlapsHitbox(target, box, inset = 6) {
  if (!target || !box) return false;
  return target.x + inset < box.x + box.w && target.x + target.w - inset > box.x &&
    target.y + inset < box.y + box.h && target.y + target.h - inset > box.y;
}
export class BossEnemy {
  constructor({id,kind,x,groundY,width,height,health,detectionRange,preferredDistance,moveSpeed,attackCooldown}) {
    Object.assign(this,{id,kind,x,groundY,w:width,h:height,health,maxHealth:health,detectionRange,preferredDistance,moveSpeed,
      baseAttackCooldown:attackCooldown,attackCooldown,damageCooldown:0,state:"dormant",stateTimer:0,attackName:null,attackProgress:0,
      direction:-1,defeated:false,active:false,arenaMinX:x-520,arenaMaxX:x+560,attackIndex:0,warning:false,motionSpeed:0,
      attackConnected:false,lastAttackMissed:false,lastAttackName:null});
    this.baseY=groundY-height;this.y=this.baseY;
  }
  get phase(){return this.health<=Math.ceil(this.maxHealth*0.5)?2:1;}
  get isVulnerable(){return this.active&&!this.defeated&&(this.state==="recovering"||this.state==="stunned");}
  activate(){if(this.defeated)return false;this.active=true;this.state="stalking";return true;}
  update(delta,target){
    const previousX=this.x;this.motionSpeed=0;if(!this.active||this.defeated)return null;
    this.attackCooldown=Math.max(0,this.attackCooldown-delta);this.damageCooldown=Math.max(0,this.damageCooldown-delta);this.stateTimer=Math.max(0,this.stateTimer-delta);
    const separation=target.x+target.w/2-(this.x+this.w/2),distance=Math.abs(separation);this.direction=separation>=0?1:-1;
    if(this.state==="stunned"){if(this.stateTimer<=0){this.state="stalking";this.lastAttackMissed=false;}return null;}
    if(this.state==="stalking"){
      if(distance>this.preferredDistance)this.x+=this.direction*this.moveSpeed*delta;
      this.x=Math.max(this.arenaMinX,Math.min(this.arenaMaxX-this.w,this.x));this.y=this.baseY;
      this.motionSpeed=delta>0?(this.x-previousX)/delta:0;
      if(distance<=this.detectionRange&&this.attackCooldown<=0){this.beginAttack(distance,target);return"telegraph";}return null;
    }
    if(this.state==="telegraph"){
      this.onTelegraph(delta,target);
      if(this.stateTimer<=0){this.state="attacking";this.attackProgress=0;this.stateTimer=this.attackDuration();this.warning=false;return"attack";}return null;
    }
    if(this.state==="attacking"){
      this.attackProgress=1-this.stateTimer/this.attackDuration();this.onAttack(delta,target);this.motionSpeed=delta>0?(this.x-previousX)/delta:0;
      this.attackConnected=this.attackConnected||overlapsHitbox(target,this.attackBox);
      if(this.stateTimer<=0){
        this.lastAttackMissed=!this.attackConnected;this.lastAttackName=this.attackName;this.state="recovering";
        this.stateTimer=this.recoveryDuration()+this.dodgeRecoveryBonus();this.attackCooldown=this.baseAttackCooldown/(this.phase===2?1.35:1);
        this.warning=false;this.attackName=null;this.y=this.baseY;return"recover";
      }return null;
    }
    if(this.state==="recovering"&&this.stateTimer<=0){this.state="stalking";this.lastAttackMissed=false;return"ready";}return null;
  }
  beginAttack(distance,target){this.attackName=this.chooseAttack(distance,target);this.state="telegraph";this.stateTimer=this.telegraphDuration();this.warning=true;this.attackConnected=false;this.lastAttackMissed=false;this.attackIndex+=1;}
  chooseAttack(){return"attack";}
  telegraphDuration(){return 0.7;}
  attackDuration(){return 0.35;}
  recoveryDuration(){return 0.8;}
  dodgeRecoveryBonus(){return this.lastAttackMissed?(this.phase===2?0.34:0.22):0;}
  onTelegraph(){}
  onAttack(){}
  takeDamage(amount=1){
    if(this.defeated||!this.active||amount<=0||this.damageCooldown>0||!this.isVulnerable)return{hit:false,defeated:this.defeated,blocked:!this.isVulnerable};
    const previousPhase=this.phase;this.health=Math.max(0,this.health-amount);this.damageCooldown=0.22;
    if(this.health<=0){this.defeated=true;this.active=false;this.state="defeated";this.attackName=null;this.warning=false;this.lastAttackMissed=false;this.y=this.baseY;return{hit:true,defeated:true,phaseChanged:false};}
    const phaseChanged=this.phase!==previousPhase;this.state="stunned";this.stateTimer=phaseChanged?0.58:0.32;
    this.attackName=null;this.warning=false;this.y=this.baseY;return{hit:true,defeated:false,phaseChanged};
  }
  get attackBox(){return null;}
}