export class AudioManager {
  constructor(){this.context=null;this.enabled=true}
  unlock(){if(!this.enabled)return;if(!this.context){const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(AudioContextClass)this.context=new AudioContextClass()}if(this.context?.state==="suspended")this.context.resume()}
  setEnabled(value){this.enabled=value;if(value)this.unlock()}
  tone(frequency=440,duration=.08,type="sine",volume=.035,slide=0){if(!this.enabled||!this.context)return;const now=this.context.currentTime;const oscillator=this.context.createOscillator();const gain=this.context.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,now);if(slide)oscillator.frequency.exponentialRampToValueAtTime(Math.max(30,frequency+slide),now+duration);gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);oscillator.connect(gain);gain.connect(this.context.destination);oscillator.start(now);oscillator.stop(now+duration)}
  jump(){this.tone(260,.13,"triangle",.045,260)}
  collect(){this.tone(660,.09,"sine",.04,240);setTimeout(()=>this.tone(880,.12,"sine",.03,180),65)}
  hit(){this.tone(150,.25,"sawtooth",.055,-90)}
  rescue(){this.tone(520,.12,"triangle",.04,250);setTimeout(()=>this.tone(780,.18,"triangle",.035,220),110)}
}