export const ACTOR_ANIMATION_PROFILES = Object.freeze({
 blue:{base:"blue-idle",duck:"blue-duck",states:{attack:"blue-attack",landing:"blue-land",impact:"blue-impact",recovery:"blue-recover"},frames:["blue-run-a","blue-run-b"],fps:10},
 vasti:{base:"vasti-idle",duck:"vasti-duck",states:{attack:"vasti-attack",landing:"vasti-land",impact:"vasti-impact",recovery:"vasti-recover"},frames:["vasti-run-a","vasti-run-b"],fps:8.5},
 beta:{base:"beta",duck:"beta-duck",states:{},moving:["following","extracted"],frames:["beta-run-a","beta-run-b"],fps:8.2},
 ferrucutus:{base:"ferrucutus",duck:"ferrucutus-duck",crouching:["brace","bridge","holding-bridge"],states:{attack:"ferrucutus-attack",landing:"ferrucutus-land",impact:"ferrucutus-impact",recovery:"ferrucutus-recover"},moving:["scout","brace","bridge","holding-bridge","charge"],frames:["ferrucutus-step-a","ferrucutus-step-b"],fps:5.4},
 hunter:{base:"hunter",duck:"hunter-duck",states:{attack:"hunter-attack",landing:"hunter-land",impact:"hunter-impact",recovery:"hunter-recover"},moving:["patrol","pursuit"],frames:["hunter-run-a","hunter-run-b"],fps:10.5},
 indoraptor:{base:"indoraptor",duck:"indoraptor-duck",states:{attack:"indoraptor-attack",landing:"indoraptor-land",impact:"indoraptor-impact",recovery:"indoraptor-recover"},moving:["stalking"],frames:["indoraptor-run-a","indoraptor-run-b"],fps:9.2},
 indominus:{base:"indominus",duck:"indominus-duck",states:{attack:"indominus-attack",landing:"indominus-land",impact:"indominus-impact",recovery:"indominus-recover"},moving:["stalking"],frames:["indominus-run-a","indominus-run-b"],fps:4.4}
});

const CROUCH_STATES = new Set(["duck","ducking","crouch","crouching","crouched"]);

export function selectActorPose(character,actor={},elapsed=0){
 const profile=ACTOR_ANIMATION_PROFILES[character];
 if(!profile)return character;
 if(actor.defeated||actor.state==="defeated")return profile.base;

 if(actor.animationState&&profile.states[actor.animationState])return profile.states[actor.animationState];
 if(actor.state==="stunned"||actor.state==="damaged")return profile.states.impact??profile.base;
 if(actor.state==="recover"||actor.state==="recovering")return profile.states.recovery??profile.base;
 if(actor.state==="telegraph"||actor.state==="windup")return profile.states.attack??profile.base;

 const crouching=actor.duck===true||actor.crouch===true||actor.crouching===true||
  CROUCH_STATES.has(actor.state)||profile.crouching?.includes(actor.state);
 if(crouching&&profile.duck)return profile.duck;

 const speed=typeof actor.motionSpeed==="number"?Math.abs(actor.motionSpeed):null;
 const moving=profile.frames?.length&&profile.moving?.includes(actor.state)&&(speed===null||speed>24);
 if(moving){
  return profile.frames[Math.floor(Math.max(0,elapsed)*(profile.fps??8))%profile.frames.length];
 }
 if(character==="indominus"&&actor.state==="attacking"&&actor.attackName==="roar")return profile.states.attack;
 if(actor.state==="attacking"||actor.state==="attack"||actor.state==="charge"){
  return profile.states.attack??profile.base;
 }
 return profile.base;
}
