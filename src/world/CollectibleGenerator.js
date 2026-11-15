const SECTION_COLLECTIBLE_LAYOUT=Object.freeze([
 {amber:[0.24,0.86],intel:[]},
 {amber:[0.15,0.36],intel:[]},
 {amber:[0.14,0.38],intel:[0.56]},
 {amber:[0.34,0.68],intel:[0.76]},
 {amber:[0.09,0.95],intel:[0.17]},
 {amber:[],intel:[]},
 {amber:[0.17,0.92],intel:[]}
]);
export const COLLECTIBLE_TOTALS=Object.freeze({amber:12,intel:3});
function seededCollectibleRandom(seed){
 let state=seed>>>0;
 return()=>{state+=0x6d2b79f5;let value=state;value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);return((value^(value>>>14))>>>0)/4294967296;};
}
export function generateSectionCollectibles({seed,sectionIndex,sectionStart,sectionLength,groundY}){
 const layout=SECTION_COLLECTIBLE_LAYOUT[sectionIndex];if(!layout)return[];
 const random=seededCollectibleRandom((seed^Math.imul(sectionIndex+1,0x85ebca6b)^0x51ed270b)>>>0);
 const result=[];
 for(const[type,ratios]of [["amber",layout.amber],["intel",layout.intel]]){
  ratios.forEach((ratio,slot)=>{
   result.push({
    id:type==="amber"?"amber-"+sectionIndex+"-"+(slot+1):"intel-"+sectionIndex,
    type,sectionIndex,
    x:sectionStart+Math.round(sectionLength*ratio)+Math.round((random()-.5)*54),
    y:groundY-82-Math.round(random()*10),w:32,h:34,phase:random()*Math.PI*2
   });
  });
 }
 return result;
}
