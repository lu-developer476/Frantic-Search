import { ACTOR_ANIMATION_PROFILES, selectActorPose } from "./AnimationProfiles.js";

const SPRITE_ASSET_VERSION="20261112-vasti-reference-svg-1";
const BASE=[
 "violeta-idle","violeta-run-a","violeta-run-b","violeta-jump","violeta-dash","violeta-duck",
 "vasti",
 "rosa","rosa-run-a","rosa-run-b","rosa-duck",
 "ferrucutus","ferrucutus-step-a","ferrucutus-step-b","ferrucutus-duck",
 "hunter","hunter-run-a","hunter-run-b","hunter-duck",
 "indoraptor","indoraptor-run-a","indoraptor-run-b","indoraptor-duck",
 "indominus","indominus-run-a","indominus-run-b","indominus-duck"
];
const SPRITES=[...BASE,...["violeta","rosa","ferrucutus","hunter","indoraptor","indominus"].flatMap(name=>["attack","land","impact","recover"].map(pose=>name+"-"+pose))];

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
  const smoothSprite=name==="rosa"||name.startsWith("rosa-")||name.startsWith("violeta-");
  context.imageSmoothingEnabled=smoothSprite;
  context.globalAlpha*=alpha;
  x=Math.round(x);y=Math.round(y);
  width=Math.max(1,Math.round(width));height=Math.max(1,Math.round(height));
  if(facing<0||flip){context.translate(x+width,y);context.scale(-1,1);context.drawImage(image,0,0,width,height);}
  else context.drawImage(image,x,y,width,height);
  context.restore();
  return true;
 }

 drawReferenceVasti(context,x,y,width,height,actor,elapsed,alpha=1,poseOverride=null){
  // The original public/references/vastatosaurus-rex.jpg artwork is embedded in public/assets/sprites/vasti.svg.
  // Every pose uses this same authoritative artwork; only the body transform changes.
  const pose=poseOverride??selectActorPose("vasti",actor,elapsed);
  const phase=phaseOf(actor,"vasti");
  let bob=0,offsetY=0,sx=1,sy=1,tilt=0;
  if(pose==="vasti-run-a"||pose==="vasti-run-b"){
   const gait=Math.sin(elapsed*9.2*Math.PI+phase);bob=Math.round(Math.abs(gait)*2);tilt=gait*.025;
  }else if(pose==="vasti-jump"){offsetY=-2;tilt=-.035;}
  else if(pose==="vasti-stomp"){sy=.94;sx=1.04;offsetY=2;}
  else if(pose==="vasti-slam"){tilt=.04;sx=1.06;sy=.9;offsetY=3;}
  else if(pose==="vasti-attack"){tilt=.025;}
  else if(pose==="vasti-impact"){tilt=-.035;offsetY=1;}
  else if(pose==="vasti-land"){sx=1.04;sy=.92;offsetY=3;}
  else if(pose==="vasti-recover"){bob=Math.round(Math.max(0,Math.sin(elapsed*18+phase))*1.5);}
  else if(pose==="vasti-idle"){bob=Math.round(Math.sin(elapsed*2.3+phase)*1.25);}
  else if(pose==="vasti-duck"){sy=.82;offsetY=6;}
  const w=Math.max(1,Math.round(width*sx)),h=Math.max(1,Math.round(height*sy));
  const dx=Math.round(x+(width-w)/2),dy=Math.round(y+(height-h)/2+bob+offsetY);
  context.save();context.translate(dx+w/2,dy+h/2);context.rotate(tilt);
  const result=this.draw(context,"vasti",-w/2,-h/2,w,h,{alpha,facing:actor?.facing??1});
  context.restore();return result;
 }

 drawAnimated(context,character,x,y,width,height,actor,elapsed,options={}){
  if(character==="vasti"&&this.drawReferenceVasti(context,x,y,width,height,actor,elapsed,options.alpha??1))return true;
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
  const character=kind==="blue"?"blue":"vasti";
  const prefix=kind==="blue"?"violeta":"vasti";
  let pose=selectActorPose(character,player,elapsed);
  if(player?.dashTimer>0&&kind==="blue")pose="violeta-dash";
  else if(player?.duck)pose=prefix+"-duck";
  else if(player&&!player.onGround&&!player.animationState)pose=prefix+"-jump";
  else if(player&&Math.abs(player.vx)>30&&!player.animationState){
   const fps=Math.max(8,Math.min(13,Math.abs(player.vx)/27));
   pose=prefix+"-run-"+(Math.floor(elapsed*fps+phaseOf(player,kind))%2===0?"a":"b");
  }else if(!player?.animationState)pose=prefix+"-idle";

  if(kind!=="blue"&&this.drawReferenceVasti(context,x,y,width,height,player??{},elapsed,alpha,pose))return true;
  const crouching=player?.duck===true&&pose===prefix+"-duck";
  const naturalHeight=crouching?(player?.normalHeight??height):height;
  const drawY=crouching?y+height-naturalHeight:y;
  return this.draw(context,pose,x,drawY,width,naturalHeight,{alpha,facing:player?.facing??1});
 }

 readiness(){return{ready:this.loaded.size,total:SPRITES.length,failed:this.failed.size};}
}
