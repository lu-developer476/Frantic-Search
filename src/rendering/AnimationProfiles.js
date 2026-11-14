export const ACTOR_ANIMATION_PROFILES = Object.freeze({
 blue:{base:"violeta-idle",states:{attack:"violeta-attack",eat:"violeta-eat",landing:"violeta-land",impact:"violeta-impact",recovery:"violeta-recover"},frames:["violeta-run-a","violeta-run-b"],fps:10},
 vasti:{base:"vasti-idle",states:{attack:"vasti-attack",eat:"vasti-eat",stomp:"vasti-stomp",slam:"vasti-slam",landing:"vasti-land",impact:"vasti-impact",recovery:"vasti-recover"},moving:["running","following","extracted","patrol","pursuit","charging"],frames:["vasti-run-a","vasti-run-b"],fps:5.4},
 beta:{base:"rosa",duck:"rosa-duck",states:{attack:"rosa-attack",eat:"rosa-eat",landing:"rosa-land",impact:"rosa-impact",recovery:"rosa-recover"},moving:["following","extracted"],frames:["rosa-run-a","rosa-run-b"],fps:8.2},
 rosa:{base:"rosa",duck:"rosa-duck",states:{attack:"rosa-attack",eat:"rosa-eat",landing:"rosa-land",impact:"rosa-impact",recovery:"rosa-recover"},moving:["following","extracted","running"],frames:["rosa-run-a","rosa-run-b"],fps:8.2},
 ferrucutus:{base:"ferrucutus",duck:"ferrucutus-duck",crouching:["brace","bridge","holding-bridge"],states:{attack:"ferrucutus-attack",landing:"ferrucutus-land",impact:"ferrucutus-impact",recovery:"ferrucutus-recover"},moving:["scout","brace","bridge","holding-bridge","charge"],frames:["ferrucutus-step-a","ferrucutus-step-b"],fps:5.4},
 hunter:{base:"hunter",duck:"hunter-duck",states:{attack:"hunter-attack",landing:"hunter-land",impact:"hunter-impact",recovery:"hunter-recover"},moving:["patrol","pursuit"],frames:["hunter-run-a","hunter-run-b"],fps:10.5},
 indoraptor:{base:"indoraptor",duck:"indoraptor-duck",states:{attack:"indoraptor-attack",eat:"indoraptor-eat",jump:"indoraptor-jump",landing:"indoraptor-land",impact:"indoraptor-impact",recovery:"indoraptor-recover",defeated:"indoraptor-defeated"},moving:["stalking"],frames:["indoraptor-run-a","indoraptor-run-b"],fps:9.2},
 indominus:{base:"indominus",duck:"indominus-duck",states:{attack:"indominus-attack",landing:"indominus-land",impact:"indominus-impact",recovery:"indominus-recover"},moving:["stalking"],frames:["indominus-run-a","indominus-run-b"],fps:4.4}
});

const CROUCH_STATES = new Set(["duck","ducking","crouch","crouching","crouched"]);

export function selectActorPose(character,actor={},elapsed=0){
 const profile=ACTOR_ANIMATION_PROFILES[character];
 if(!profile)return character;
 if(actor.defeated||actor.state==="defeated")return character==="indoraptor"?"indoraptor-defeated":profile.base;

 if(actor.animationState&&profile.states[actor.animationState])return profile.states[actor.animationState];
 if(actor.state==="stunned"||actor.state==="damaged")return profile.states.impact??profile.base;
 if((actor.state==="eating"||actor.state==="eat")&&profile.states.eat)return profile.states.eat;
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
 if(character==="indominus"&&actor.state==="attacking"&&actor.attackName==="charge"){
  return profile.frames[Math.floor(Math.max(0,elapsed)*(profile.fps??8))%profile.frames.length];
 }
 if(actor.state==="attacking"||actor.state==="attack"||actor.state==="charge"){
  return profile.states.attack??profile.base;
 }
 return profile.base;
}
