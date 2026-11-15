import { BossEnemy } from "./BossEnemy.js";
export class IndoraptorBoss extends BossEnemy {
 constructor({id,x,groundY,arenaMinX,arenaMaxX,generation=1,title,formLabel,formLabelEs}){
  super({id,kind:"indoraptor",x,groundY,width:136,height:127,health:8,detectionRange:470,preferredDistance:178,moveSpeed:152,attackCooldown:1.4});
  this.generation=Number(generation)>=2?2:1;this.title=title??`INDORAPTOR // GEN ${this.generation}`;
  this.formLabel=formLabel??(this.generation===2?"SECOND-GENERATION SPECIMEN":"ORIGINAL SPECIMEN");
  this.formLabelEs=formLabelEs??(this.generation===2?"EJEMPLAR DE SEGUNDA GENERACIÓN":"EJEMPLAR ORIGINAL");
  if(Number.isFinite(arenaMinX))this.arenaMinX=arenaMinX;if(Number.isFinite(arenaMaxX))this.arenaMaxX=arenaMaxX;
 }
 chooseAttack(){if(this.phase===2&&this.attackIndex%3===2)return"shadow-lunge";return this.attackIndex%2===0?"pounce":"claw";}
 telegraphDuration(){if(this.attackName==="shadow-lunge")return 0.52;return(this.phase===2?0.48:0.68)+(this.attackName==="claw"?-0.12:0);}
 attackDuration(){if(this.attackName==="shadow-lunge")return 0.34;return this.attackName==="pounce"?0.46:0.24;}
 recoveryDuration(){if(this.attackName==="shadow-lunge")return 0.96;return this.phase===2?0.62:0.82;}
 onTelegraph(){this.y=this.baseY+Math.sin(this.stateTimer*18)*(this.attackName==="shadow-lunge"?4:2);}
 onAttack(delta){
  if(this.attackName==="pounce"){this.x+=this.direction*(this.phase===2?420:320)*delta;this.y=this.baseY-Math.sin(this.attackProgress*Math.PI)*(this.phase===2?106:92);}
  else if(this.attackName==="shadow-lunge"){this.x+=this.direction*(this.phase===2?560:490)*delta;this.y=this.baseY;}
  else{this.x+=this.direction*(this.phase===2?255:185)*delta;this.y=this.baseY;}
  this.x=Math.max(this.arenaMinX,Math.min(this.arenaMaxX-this.w,this.x));
 }
 get attackBox(){
  if(this.state!=="attacking")return null;
  if(this.attackName==="pounce")return{x:this.direction>0?this.x+this.w-22:this.x-112,y:this.baseY+this.h*0.6,w:146,h:50};
  if(this.attackName==="shadow-lunge")return{x:this.direction>0?this.x+this.w-22:this.x-154,y:this.baseY+50,w:178,h:58};
  return{x:this.direction>0?this.x+this.w-8:this.x-78,y:this.y+this.h*0.52,w:98,h:52};
 }
}