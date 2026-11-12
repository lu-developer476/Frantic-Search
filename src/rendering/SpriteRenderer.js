import { ACTOR_ANIMATION_PROFILES, selectActorPose } from "./AnimationProfiles.js";

const SPRITE_ASSET_VERSION="20261112-vasti-reference-in-game-2";
const BASE=[
 "violeta-idle","violeta-run-a","violeta-run-b","violeta-jump","violeta-dash","violeta-duck",
 "vasti-idle","vasti-run-a","vasti-run-b","vasti-jump","vasti-duck",
 "rosa","rosa-run-a","rosa-run-b","rosa-duck",
 "ferrucutus","ferrucutus-step-a","ferrucutus-step-b","ferrucutus-duck",
 "hunter","hunter-run-a","hunter-run-b","hunter-duck",
 "indoraptor","indoraptor-run-a","indoraptor-run-b","indoraptor-duck",
 "indominus","indominus-run-a","indominus-run-b","indominus-duck"
];
const SPRITES=[...BASE,"vasti-stomp","vasti-slam",...["violeta","vasti","rosa","ferrucutus","hunter","indoraptor","indominus"].flatMap(name=>["attack","land","impact","recover"].map(pose=>name+"-"+pose))];

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
  this.referenceImage=null;
  this.referenceSprite=null;
  this.referenceFailed=false;
  this.onAssetChange=typeof onAssetChange==="function"?onAssetChange:null;
  this.preload();
  this.preloadVastiReference();
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

 // Vasti uses the exact repository reference image in-game, not a redraw that merely
 // resembles it. It is rasterized once on the native pixel grid and then animated.
 preloadVastiReference(){
  const image=new Image();
  image.decoding="async";
  image.onload=()=>{
   if(!image.naturalWidth||!image.naturalHeight){this.referenceFailed=true;return;}
   const canvas=document.createElement("canvas");
   canvas.width=128;canvas.height=128;
   const context=canvas.getContext("2d",{willReadFrequently:true});
   context.clearRect(0,0,128,128);
   const scale=Math.min(120/image.naturalWidth,112/image.naturalHeight);
   const width=Math.max(1,Math.round(image.naturalWidth*scale));
   const height=Math.max(1,Math.round(image.naturalHeight*scale));
   const x=Math.round((128-width)/2),y=Math.round((128-height)/2);
   context.imageSmoothingEnabled=false;
   context.drawImage(image,x,y,width,height);
   // Knock out only near-white edge/background pixels; preserve the dinosaur's
   // highlights and beige underside by restricting removal to edge-connected pixels.
   const pixels=context.getImageData(0,0,128,128);
   const {data}=pixels;
   const visited=new Uint8Array(128*128);
   const queue=[];
   const isBackground=(index)=>{
    const p=index*4,r=data[p],g=data[p+1],b=data[p+2];
    return r>238&&g>238&&b>232;
   };
   for(let i=0;i<128;i++){
    for(const index of [i,127*128+i,i*128,i*128+127]){
     if(!visited[index]&&isBackground(index)){visited[index]=1;queue.push(index);}
    }
   }
   for(let cursor=0;cursor<queue.length;cursor++){
    const index=queue[cursor],p=index*4;data[p+3]=0;
    const x0=index%128,y0=Math.floor(index/128);
    for(const next of [x0>0?index-1:-1,x0<127?index+1:-1,y0>0?index-128:-1,y0<127?index+128:-1]){
     if(next>=0&&!visited[next]&&isBackground(next)){visited[next]=1;queue.push(next);}
    }
   }
   context.putImageData(pixels,0,0);
   this.referenceSprite=canvas;
   this.referenceImage=image;
   this.onAssetChange?.("vasti-reference",this.readiness());
  };
  image.onerror=()=>{this.referenceFailed=true;this.onAssetChange?.("vasti-reference",this.readiness());};
  image.src=this.baseUrl+"references/vastatosaurus-rex.jpg?v="+SPRITE_ASSET_VERSION;
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

 drawReferenceVasti(context,x,y,width,height,actor,elapsed,alpha=1){
  const sprite=this.referenceSprite;
  if(!sprite)return false;
  const phase=phaseOf(actor,"vasti");
  const pose=selectActorPose("vasti",actor,elapsed);
  let bob=0,tilt=0,sx=1,sy=1,offsetY=0;
  if(pose==="vasti-run-a"||pose==="vasti-run-b"){
   const gait=Math.sin(elapsed*9.2*Math.PI+phase);
   bob=Math.round(Math.abs(gait)*2);
   tilt=gait*.035;
   sx=1+Math.abs(gait)*.025;sy=1-Math.abs(gait)*.035;
  }else if(pose==="vasti-jump"){
   tilt=-.055;offsetY=-2;
  }else if(pose==="vasti-stomp"){
   sy=.88;sx=1.08;offsetY=4;
  }else if(pose==="vasti-slam"){
   tilt=.08;sx=1.08;sy=.9;offsetY=3;
  }else if(pose==="vasti-attack"){
   tilt=.045;
  }else if(pose==="vasti-impact"){
   tilt=-.045;offsetY=1;
  }else if(pose==="vasti-land"){
   sx=1.06;sy=.9;offsetY=3;
  }else if(pose==="vasti-recover"){
   const settle=Math.max(0,Math.sin(elapsed*18+phase));
   bob=Math.round(settle*1.5);
  }else if(pose==="vasti-idle"){
   bob=Math.round(Math.sin(elapsed*2.3+phase)*1.25);
  }else if(pose==="vasti-duck"){
   sy=.82;offsetY=6;
  }
  context.save();
  context.globalAlpha*=alpha;
  context.imageSmoothingEnabled=false;
  const drawWidth=Math.max(1,Math.round(width*sx));
  const drawHeight=Math.max(1,Math.round(height*sy));
  const drawX=Math.round(x+(width-drawWidth)/2);
  const drawY=Math.round(y+(height-drawHeight)/2+bob+offsetY);
  const centerX=drawX+drawWidth/2,centerY=drawY+drawHeight/2;
  context.translate(centerX,centerY);
  if(actor?.facing<0)context.scale(-1,1);
  context.rotate(tilt);
  context.drawImage(sprite,-drawWidth/2,-drawHeight/2,drawWidth,drawHeight);
  context.restore();
  return true;
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

  if(kind!=="blue"&&this.drawReferenceVasti(context,x,y,width,height,{...player,animationState:player?.animationState??(pose==="vasti-idle"?null:pose.replace("vasti-",""))},elapsed,alpha))return true;
  const crouching=player?.duck===true&&pose===prefix+"-duck";
  const naturalHeight=crouching?(player?.normalHeight??height):height;
  const drawY=crouching?y+height-naturalHeight:y;
  return this.draw(context,pose,x,drawY,width,naturalHeight,{alpha,facing:player?.facing??1});
 }

 readiness(){return{ready:this.loaded.size+(this.referenceSprite?1:0),total:SPRITES.length+1,failed:this.failed.size+(this.referenceFailed?1:0)};}
}
