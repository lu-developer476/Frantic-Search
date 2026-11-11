const THEMES = {
  coastal: { tempo: 96, root: 45, bass: [0, 0, 5, 3, 0, 7, 5, 3], melody: [7, null, 10, 7, 5, null, 3, null, 7, 10, 12, null, 10, 7, 5, null], chord: [0, 5, 3, 7] },
  forest: { tempo: 104, root: 43, bass: [0, 0, 7, 5, 0, 9, 7, 5], melody: [9, null, 7, 5, 2, null, 5, null, 9, 12, 9, null, 7, 5, 2, null], chord: [0, 7, 5, 9] },
  industrial: { tempo: 108, root: 41, bass: [0, 0, 3, 6, 0, 5, 3, 10], melody: [10, null, 6, 5, 3, null, 6, null, 10, 13, 10, null, 6, 5, 3, null], chord: [0, 6, 3, 5] },
  facility: { tempo: 88, root: 40, bass: [0, 0, 3, 7, 0, 10, 7, 3], melody: [10, null, 7, null, 3, null, 2, null, 10, null, 7, 3, null, 2, null, null], chord: [0, 3, 7, 10] },
  boss: { tempo: 128, root: 38, bass: [0, 0, 3, 0, 7, 0, 8, 3], melody: [8, 7, null, 3, 8, null, 10, 7, 8, 12, 10, 7, 3, null, 2, null], chord: [0, 3, 8, 7] },
  extraction: { tempo: 92, root: 45, bass: [0, 5, 0, 7, 0, 5, 9, 7], melody: [9, null, 7, 5, 2, null, 5, 7, 9, null, 12, 9, 7, 5, 2, null], chord: [0, 5, 7, 9] },
  victory: { tempo: 100, root: 48, bass: [0, 0, 4, 7, 0, 9, 7, 4], melody: [9, null, 7, 4, 2, null, 4, 7, 9, 12, 11, 9, 7, 4, 2, null], chord: [0, 4, 7, 9] },
  defeat: { tempo: 72, root: 40, bass: [0, null, 0, null, 5, null, 3, null], melody: [10, null, null, 7, null, 5, null, 3, 2, null, null, null, 0, null, null, null], chord: [0, 3, 7, 5] }
};
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

export class AdaptiveMusic {
  constructor() {
    this.context = null;
    this.master = null;
    this.timer = null;
    this.enabled = true;
    this.paused = false;
    this.ducked = false;
    this.themeName = null;
    this.theme = THEMES.coastal;
    this.step = 0;
    this.nextAt = 0;
  }

  start(context, theme = "coastal") {
    if (!context) return false;
    this.context = context;
    if (!this.master) {
      this.master = context.createGain();
      this.master.gain.value = 0;
      this.master.connect(context.destination);
    }
    this.setTheme(theme);
    this.applyGain();
    if (context.state === "suspended") context.resume();
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 30);
    return true;
  }

  setTheme(name) {
    if (!THEMES[name] || name === this.themeName) return;
    this.themeName = name;
    this.theme = THEMES[name];
    this.step = 0;
    this.nextAt = this.context ? this.context.currentTime + 0.04 : 0;
  }

  setEnabled(value) {
    const wasEnabled = this.enabled;
    this.enabled = Boolean(value);
    if (!wasEnabled && this.enabled && this.context) this.nextAt = this.context.currentTime + 0.04;
    this.applyGain();
  }

  setPaused(value) {
    const wasPaused = this.paused;
    this.paused = Boolean(value);
    if (wasPaused && !this.paused && this.context) this.nextAt = this.context.currentTime + 0.04;
    this.applyGain();
  }

  setDucked(value) {
    this.ducked = Boolean(value);
    this.applyGain();
  }

  applyGain() {
    if (!this.master || !this.context) return;
    const target = !this.enabled || this.paused ? 0 : this.ducked ? 0.055 : 0.28;
    this.master.gain.setTargetAtTime(target, this.context.currentTime, 0.12);
  }

  note(midi, start, duration, type, volume, cutoff) {
    if (!this.context || !this.master || !this.enabled || this.paused) return;
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(hz(midi), start);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(volume, start + 0.018);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.025);
    oscillator.onended = () => {
      oscillator.disconnect();
      filter.disconnect();
      envelope.disconnect();
    };
  }

  scheduleStep(at) {
    const theme = this.theme;
    const step = this.step % 16;
    const eighth = 60 / theme.tempo / 2;
    const bass = theme.bass[Math.floor(step / 2) % theme.bass.length];
    const melody = theme.melody[step];
    if (step % 2 === 0 && bass !== null) this.note(theme.root + bass - 12, at, eighth * 1.8, "triangle", 0.048, 540);
    if (melody !== null) {
      this.note(theme.root + (step % 4 === 3 ? 24 : 12) + melody, at, eighth * 1.1, step % 4 === 3 ? "sine" : "triangle", step % 4 === 3 ? 0.012 : 0.026, 2600);
    }
    if (step === 0 || step === 8) {
      const chordRoot = theme.root + theme.chord[Math.floor(this.step / 8) % theme.chord.length];
      this.note(chordRoot + 12, at, eighth * 7.4, "sine", 0.009, 780);
      this.note(chordRoot + 19, at, eighth * 7.4, "sine", 0.006, 920);
    }
    this.step += 1;
  }

  schedule() {
    if (!this.context || !this.master || !this.enabled || this.paused) return;
    const horizon = this.context.currentTime + 0.16;
    if (!this.nextAt) this.nextAt = this.context.currentTime + 0.04;
    const interval = 60 / this.theme.tempo / 2;
    while (this.nextAt < horizon) {
      this.scheduleStep(this.nextAt);
      this.nextAt += interval;
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.paused = true;
    if (this.context) this.nextAt = this.context.currentTime + 0.04;
    this.applyGain();
  }
}
