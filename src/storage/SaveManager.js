const KEY="avoid-save-v1";
const DEFAULTS={bestDistance:0,rescues:0,muted:false,selectedCharacter:"blue"};
export class SaveManager{
  constructor(){this.data=this.load()}
  load(){try{return{...DEFAULTS,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return{...DEFAULTS}}}
  save(){try{localStorage.setItem(KEY,JSON.stringify(this.data))}catch{/* Storage may be unavailable in private contexts. */}}
  update(patch){this.data={...this.data,...patch};this.save();return this.data}
  get(key){return this.data[key]}
}