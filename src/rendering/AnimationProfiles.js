export const ACTOR_ANIMATION_PROFILES = Object.freeze({
 blue:{base:"blue-idle",states:{attack:"blue-attack",landing:"blue-land",impact:"blue-impact",recovery:"blue-recover"}},
 vasti:{base:"vasti-idle",states:{attack:"vasti-attack",landing:"vasti-land",impact:"vasti-impact",recovery:"vasti-recover"}},
 beta:{base:"beta",states:{},moving:["following","extracted"],frames:["beta-run-a","beta-run-b"],fps:8.2},
 ferrucutus:{base:"ferrucutus",states:{attack:"ferrucutus-attack",landing:"ferrucutus-land",impact:"ferrucutus-impact",recovery:"ferrucutus-recover"},moving:["scout","brace","charge"],frames:["ferrucutus-step-a","ferrucutus-step-b"],fps:5.4},
 hunter:{base:"hunter",states:{attack:"hunter-attack",landing:"hunter-land",impact:"hunter-impact",recovery:"hunter-recover"},moving:["patrol","pursuit","attack"],frames:["hunter-run-a","hunter-run-b"],fps:10.5},
 indoraptor:{base:"indoraptor",states:{attack:"indoraptor-attack",landing:"indoraptor-land",impact:"indoraptor-impact",recovery:"indoraptor-recover"},moving:["stalking","attacking"],frames:["indoraptor-run-a","indoraptor-run-b"],fps:9.2},
 indominus:{base:"indominus",states:{attack:"indominus-attack",landing:"indominus-land",impact:"indominus-impact",recovery:"indominus-recover"},moving:["stalking"],frames:["indominus-run-a","indominus-run-b"],fps:4.4}
});
export function selectActorPose(character,actor={},elapsed=0){
 const p=ACTOR_ANIMATION_PROFILES[character]; if(!p)return character;
 if(actor.defeated||actor.state==="defeated")return p.base;
 if(actor.animationState&&p.states[actor.animationState])return p.states[actor.animationState];
 if(actor.state==="stunned"||actor.state==="damaged")return p.states.impact??p.base;
 if(actor.state==="recover"||actor.state==="recovering")return p.states.recovery??p.base;
 if(actor.state==="telegraph"||actor.state==="windup")return p.states.attack??p.base;
 if(actor.state==="attacking"||actor.state==="attack"||actor.state==="charge"){
  if(character==="indominus"&&actor.attackName==="roar")return p.states.attack;
  return p.states.attack??p.base;
 }
 if(p.moving?.includes(actor.state)&&p.frames?.length&&(typeof actor.motionSpeed!=="number"||Math.abs(actor.motionSpeed)>24))return p.frames[Math.floor(elapsed*(p.fps??8))%p.frames.length];
 return p.base;
}