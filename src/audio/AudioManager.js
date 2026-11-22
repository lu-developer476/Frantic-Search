import { SampleBank } from "./SampleBank.js";
import { SAMPLE_MANIFEST } from "./sample-manifest.js";

export class AudioManager {
  constructor(samples = new SampleBank(SAMPLE_MANIFEST)){this.context=null;this.enabled=true;this.samples=samples;this.ambientName=null;this.ambientSource=null;this.ambientMaster=null;this.onSamplesLoaded=null}
  unlock(){if(!this.enabled)return;if(!this.context){const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(AudioContextClass){this.context=new AudioContextClass();this.samples.load(this.context).then(()=>{this.restartAmbient();this.onSamplesLoaded?.()})}}if(this.context?.state==="suspended")this.context.resume()}
  setEnabled(value){this.enabled=value;if(value)this.unlock();this.applyAmbientGain()}
  tone(frequency=440,duration=.08,type="sine",volume=.035,slide=0){if(!this.enabled||!this.context)return;const now=this.context.currentTime;const oscillator=this.context.createOscillator();const gain=this.context.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,now);if(slide)oscillator.frequency.exponentialRampToValueAtTime(Math.max(30,frequency+slide),now+duration);gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);oscillator.connect(gain);gain.connect(this.context.destination);oscillator.start(now);oscillator.stop(now+duration)}
  // Reproduce el sample del evento si está disponible; devuelve false para usar el fallback sintetizado.
  sample(name){if(!this.enabled||!this.context||!this.samples.has(name))return false;return Boolean(this.samples.play(this.context,this.context.destination,name))}
  ambientGainTarget(){return this.enabled?1:0}
  applyAmbientGain(){if(this.ambientMaster&&this.context)this.ambientMaster.gain.setTargetAtTime(this.ambientGainTarget(),this.context.currentTime,.15)}
  // Cambia el loop ambiente según el tema del capítulo. Sin archivo para ese tema, mantiene el actual.
  setAmbient(theme){const key=`ambient-${theme}`;if(!this.samples.manifest[key]||key===this.ambientName)return;this.ambientName=key;this.restartAmbient()}
  restartAmbient(){if(!this.context||!this.ambientName||!this.samples.has(this.ambientName))return;if(this.ambientSource){try{this.ambientSource.stop()}catch{}this.ambientSource=null}if(!this.ambientMaster){this.ambientMaster=this.context.createGain();this.ambientMaster.connect(this.context.destination)}this.ambientMaster.gain.value=this.ambientGainTarget();this.ambientSource=this.samples.play(this.context,this.ambientMaster,this.ambientName,{loop:true})}
  jump(){if(this.sample("jump"))return;this.tone(260,.13,"triangle",.045,260)}
  collect(){if(this.sample("collect"))return;this.tone(660,.09,"sine",.04,240);setTimeout(()=>this.tone(880,.12,"sine",.03,180),65)}
  hit(){if(this.sample("hit"))return;this.tone(150,.25,"sawtooth",.055,-90)}
  rescue(){if(this.sample("rescue"))return;this.tone(520,.12,"triangle",.04,250);setTimeout(()=>this.tone(780,.18,"triangle",.035,220),110)}
  bossWarning(){if(this.sample("boss-warning"))return;this.tone(115,.42,"sawtooth",.065,-35);setTimeout(()=>this.tone(82,.5,"triangle",.05,-18),170)}
  bossAttack(){if(this.sample("boss-attack"))return;this.tone(190,.12,"square",.045,150);setTimeout(()=>this.tone(95,.22,"sawtooth",.045,-45),75)}
  bossHit(){if(this.sample("boss-hit"))return;this.tone(125,.16,"triangle",.06,-65);setTimeout(()=>this.tone(360,.07,"square",.025,90),45)}
  bossDefeat(){if(this.sample("boss-defeat"))return;this.tone(220,.25,"triangle",.05,160);setTimeout(()=>this.tone(440,.35,"sine",.045,250),180)}
  dash(){if(this.sample("dash"))return;this.tone(420,.12,"sawtooth",.035,-260)}
  stomp(){if(this.sample("stomp"))return;this.tone(90,.22,"triangle",.07,-50);setTimeout(()=>this.tone(60,.18,"sine",.06,-20),60)}
  shot(){if(this.sample("shot"))return;this.tone(300,.08,"square",.04,-180)}
  eat(){if(this.sample("eat"))return;this.tone(200,.07,"triangle",.04,-80);setTimeout(()=>this.tone(170,.07,"triangle",.035,-60),90)}
  terminal(){if(this.sample("terminal"))return;this.tone(740,.06,"square",.03,120);setTimeout(()=>this.tone(990,.08,"square",.025,80),70)}
  door(){if(this.sample("door"))return;this.tone(140,.3,"sawtooth",.04,120)}
  cageOpen(){if(this.sample("cage-open"))return;this.tone(240,.1,"square",.04,-100);setTimeout(()=>this.tone(160,.2,"sawtooth",.04,-60),90)}
  stegoCharge(){if(this.sample("stego-charge"))return;this.tone(110,.45,"sawtooth",.06,-40);setTimeout(()=>this.tone(80,.4,"triangle",.05,-20),160)}
  checkpoint(){if(this.sample("checkpoint"))return;this.tone(520,.1,"sine",.04,200);setTimeout(()=>this.tone(780,.14,"sine",.035,200),90)}
}
