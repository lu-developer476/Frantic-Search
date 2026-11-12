import { ACTOR_ANIMATION_PROFILES, selectActorPose } from "./AnimationProfiles.js";

const SPRITE_ASSET_VERSION="20261112-ink-crouch-4";
const BASE=[
 "blue-idle","blue-run-a","blue-run-b","blue-jump","blue-dash","blue-duck",
 "vasti-idle","vasti-run-a","vasti-run-b","vasti-jump","vasti-duck",
 "beta","beta-run-a","beta-run-b","beta-duck",
 "ferrucutus","ferrucutus-step-a","ferrucutus-step-b","ferrucutus-duck",
 "hunter","hunter-run-a","hunter-run-b","hunter-duck",
 "indoraptor","indoraptor-run-a","indoraptor-run-b","indoraptor-duck",
 "indominus","indominus-run-a","indominus-run-b","indominus-duck"
];
const SPRITES=[...BASE,...["blue","vasti","beta","ferrucutus","hunter","indoraptor","indominus"].flatMap(name=>["attack","land","impact","recover"].map(pose=>name+"-"+pose))];

function phaseOf(actor,fallback){
 const key=String(actor?.id??actor?.character??fallback);
 let hash=2166136261;
 for(let i=0;i<key.length;i++){hash^=key.charCodeAt(i);hash=Math.imul(hash,16777619);}
 return ((hash>>>0)%997)/997*Math.PI*2;
}

export class SpriteRenderer{
 constructor(baseUrl=import.meta.env?.BASE_URL??"/",onAssetChange=null){
  this.baseUrl=baseUrl.endsWith("/")?baseUrl:baseUrl+"/";
  this.images=new Map();
  this.failed=new Set();
  this.loaded=new Set();
  this.onAssetChange=typeof onAssetChange==="function"?onAssetChange:null;
  this.preload();
 }

 preload(){for(const name of SPRITES)this.get(name);}

 get(name){
  if(this.images.has(name)||this.failed.has(name))return this.images.get(name)??null;
  const image=new Image();
  image.decoding="async";
  image.onload=()=>{
   if(image.naturalWidth>0){this.loaded.add(name);this.failed.delete(name);}
   else this.failed.add(name);
   if(typeof image.decode==="function")image.decode().catch(()=>{});
   this.onAssetChange?.(name,this.readiness());
  };
  image.onerror=()=>{this.failed.add(name);this.images.delete(name);this.onAssetChange?.(name,this.readiness());};
  this.images.set(name,image);
  image.src=this.baseUrl+"assets/sprites/"+name+".svg?v="+SPRITE_ASSET_VERSION;
  return image;
 }

 draw(context,name,x,y,width,height,{alpha=1,facing=1,flip=false}={}){
  const image=this.get(name);
  if(!image||!image.complete||image.naturalWidth===0)return false;
  context.save();
  context.imageSmoothingEnabled=false;
  context.globalAlpha*=alpha;
  x=Math.round(x);y=Math.round(y);
  width=Math.max(1,Math.round(width));height=Math.max(1,Math.round(height));
  if(facing<0||flip){context.translate(x+width,y);context.scale(-1,1);context.drawImage(image,0,0,width,height);}
  else context.drawImage(image,x,y,width,height);
  context.restore();
  return true;
 }

 drawAnimated(context,character,x,y,width,height,actor,elapsed,options={}){
  const pose=selectActorPose(character,actor,elapsed);
  const profile=ACTOR_ANIMATION_PROFILES[character];
  const phase=phaseOf(actor,character);
  let offset=0;
  if(profile?.frames?.includes(pose)){
   const cadence=(profile.fps??8)*Math.PI;
   offset=Math.round(Math.abs(Math.sin(elapsed*cadence+phase))*2);
  }else if(pose.endsWith("-attack"))offset=Math.round(Math.sin(elapsed*26+phase));
  else if(pose.endsWith("-impact"))offset=Math.round(Math.sin(elapsed*31+phase));
  else if(pose.endsWith("-land"))offset=1;
  else if(pose===profile?.base)offset=Math.round(Math.sin(elapsed*2.3+phase));
  return this.draw(context,pose,x,y+offset,width,height,options);
 }

 drawDinosaur(context,kind,x,y,width,height,player,elapsed,alpha=1){
  const prefix=kind==="blue"?"blue":"vasti";
  let pose;
  if(player?.animationState)pose=selectActorPose(prefix,player,elapsed);
  else if(player?.duck)pose=prefix+"-duck";
  else if(player?.dashTimer>0&&kind==="blue")pose="blue-dash";
  else if(player&&!player.onGround)pose=prefix+"-jump";
  else if(player&&Math.abs(player.vx)>30){
   const fps=Math.max(8,Math.min(13,Math.abs(player.vx)/27));
   pose=prefix+"-run-"+(Math.floor(elapsed*fps+phaseOf(player,kind))%2===0?"a":"b");
  }else pose=prefix+"-idle";

  const crouching=player?.duck===true&&pose===prefix+"-duck";
  const naturalHeight=crouching?(player?.normalHeight??height):height;
  const drawY=crouching?y+height-naturalHeight:y;
  this.draw(context,pose,x,drawY,width,naturalHeight,{alpha,facing:player?.facing??1});
  return true;
 }

 readiness(){return{ready:this.loaded.size,total:SPRITES.length,failed:this.failed.size};}
}
