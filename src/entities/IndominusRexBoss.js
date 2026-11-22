import { BossEnemy } from "./BossEnemy.js";
import { getDinosaurHitbox } from "../config/DinosaurSizing.js";

const INDOMINUS_SIZE = getDinosaurHitbox("indominus");
export class IndominusRexBoss extends BossEnemy {
 constructor({id,x,groundY,arenaMinX,arenaMaxX,variant="first-generation",title,formLabel,formLabelEs}){
  super({id,kind:"indominus",x,groundY,width:INDOMINUS_SIZE.w,height:INDOMINUS_SIZE.h,health:14,detectionRange:620,preferredDistance:280,moveSpeed:78,attackCooldown:1.65});
  this.variant=["first-generation","second-generation","second-generation-variant"].includes(variant)?variant:"first-generation";
  this.generation=this.variant==="first-generation"?1:2;this.character=this.variant==="second-generation-variant"?"indominus-variant":"indominus";
  this.title=title??(this.variant==="second-generation-variant"?"INDOMINUS REX // GEN 2 VARIANT":`INDOMINUS REX // GEN ${this.generation}`);
  this.formLabel=formLabel??(this.variant==="first-generation"?"ORIGINAL SPECIMEN":this.variant==="second-generation-variant"?"SECOND-GENERATION VARIANT":"SECOND-GENERATION SPECIMEN");
  this.formLabelEs=formLabelEs??(this.variant==="first-generation"?"EJEMPLAR ORIGINAL":this.variant==="second-generation-variant"?"VARIANTE DE SEGUNDA GENERACIÓN":"EJEMPLAR DE SEGUNDA GENERACIÓN");
  if(Number.isFinite(arenaMinX))this.arenaMinX=arenaMinX;if(Number.isFinite(arenaMaxX))this.arenaMaxX=arenaMaxX;
 }
 get roarRadius(){return this.phase===2?292:230;}
 chooseAttack(distance){if(this.phase===2&&this.attackIndex%4===3)return"stomp";const p=this.attackIndex%3;if(p===0&&(distance>220||this.phase===2))return"roar";if(p===1)return"charge";return"tail-sweep";}
 telegraphDuration(){if(this.attackName==="roar")return this.phase===2?0.62:0.88;if(this.attackName==="stomp")return 0.72;return this.phase===2?0.5:0.72;}
 attackDuration(){if(this.attackName==="roar"||this.attackName==="stomp")return 0.42;return this.attackName==="charge"?0.62:0.34;}
 recoveryDuration(){if(this.attackName==="stomp")return 1.12;return this.phase===2?0.78:1.05;}
 onTelegraph(){this.y=this.baseY;}
 onAttack(delta){
  if(this.attackName==="charge")this.x+=this.direction*(this.phase===2?560:390)*delta;
  else if(this.attackName==="tail-sweep")this.x+=this.direction*(this.phase===2?110:75)*delta;
  else if(this.attackName==="stomp"){this.x+=this.direction*54*delta;this.y=this.baseY-Math.sin(this.attackProgress*Math.PI)*26;}
  this.x=Math.max(this.arenaMinX,Math.min(this.arenaMaxX-this.w,this.x));
 }
 get attackBox(){
  if(this.state!=="attacking")return null;
  if(this.attackName==="roar")return{x:this.x-this.roarRadius,y:this.groundY-58,w:this.w+this.roarRadius*2,h:62};
  if(this.attackName==="charge")return{x:this.direction>0?this.x+this.w-28:this.x-152,y:this.y+46,w:180,h:93};
  if(this.attackName==="stomp"){const width=this.phase===2?286:246;return{x:this.direction>0?this.x+this.w-12:this.x-width+12,y:this.groundY-44,w:width,h:48};}
  return{x:this.direction>0?this.x-110:this.x+this.w-10,y:this.y+74,w:this.phase===2?150:120,h:68};
 }
}