const THEMES = {
  coastal: {
    tempo: 96, root: 45, scale: [0, 3, 5, 7, 10],
    bass: [0, 0, 5, 3, 0, 7, 5, 3],
    melody: [7, null, 10, 7, 5, null, 3, null, 7, 10, 12, null, 10, 7, 5, null],
    chord: [0, 5, 3, 7]
  },
  forest: {
    tempo: 104, root: 43, scale: [0, 2, 5, 7, 9],
    bass: [0, 0, 7, 5, 0, 9, 7, 5],
    melody: [9, null, 7, 5, 2, null, 5, null, 9, 12, 9, null, 7, 5, 2, null],
    chord: [0, 7, 5, 9]
  },
  industrial: {
    tempo: 108, root: 41, scale: [0, 3, 5, 6, 10],
    bass: [0, 0, 3, 6, 0, 5, 3, 10],
    melody: [10, null, 6, 5, 3, null, 6, null, 10, 13, 10, null, 6, 5, 3, null],
    chord: [0, 6, 3, 5]
  },
  facility: {
    tempo: 88, root: 40, scale: [0, 2, 3, 7, 10],
    bass: [0, 0, 3, 7, 0, 10, 7, 3],
    melody: [10, null, 7, null, 3, null, 2, null, 10, null, 7, 3, null, 2, null, null],
    chord: [0, 3, 7, 10]
  },
  boss: {
    tempo: 128, root: 38, scale: [0, 2, 3, 7, 8],
    bass: [0, 0, 3, 0, 7, 0, 8, 3],
    melody: [8, 7, null, 3, 8, null, 10, 7, 8, 12, 10, 7, 3, null, 2, null],
    chord: [0, 3, 8, 7]
  },
  extraction: {
    tempo: 92, root: 45, scale: [0, 2, 5, 7, 9],
    bass: [0, 5, 0, 7, 0, 5, 9, 7],
    melody: [9, null, 7, 5, 2, null, 5, 7, 9, null, 12, 9, 7, 5, 2, null],
    chord: [0, 5, 7, 9]
  },
  victory: {
    tempo: 100, root: 48, scale: [0, 2, 4, 7, 9],
    bass: [0, 0, 4, 7, 0, 9, 7, 4],
    melody: [9, null, 7, 4, 2, null, 4, 7, 9, 12, 11, 9, 7, 4, 2, null],
    chord: [0, 4, 7, 9]
  },
  defeat: {
    tempo: 72, root: 40, scale: [0, 3, 5, 7, 10],
    bass: [0, null, 0, null, 5, null, 3, null],
    melody: [10, null, null, 7, null, 5, null, 3, 2, null, null, null, 0, null, null, null],
    chord: [0, 3, 7, 5]
  }
};

const semitone = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

export class MusicManager {
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

  start(context, themeName = "coastal") {
    if (!context) return false;
    this.context = context;
    if (!this.master) {
      this.master = context.createGain();
      this.master.gain.value = 0;
      this.master.connect(context.destination);
    }
    this.setTheme(themeName);
    this.applyGain();
    if (context.state === "suspended") context.resume();
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 30);
    return true;
  }

  setTheme(name) {
    if (!THEMES[name] || this.themeName === name) return;
    this.themeName = name;
    this.theme = THEMES[name];
    this.step = 0;
    this.nextAt = this.context ? this.context.currentTime + 0.04 : 0;
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    this.applyGain();
  }

  setPaused(value) {
    this.paused = Boolean(value);
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

  note(midi, start, duration, { type = "triangle", volume = 0.035, cutoff = 2400 } = {}) {
    if (!this.context || !this.master || !this.enabled || this.paused) return;
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(semitone(midi), start);
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

    if (step % 2 === 0 && bass !== null) {
      this.note(theme.root + bass - 12, at, eighth * 1.8, {
        type: "triangle", volume: 0.048, cutoff: 540
      });
    }

    if (melody !== null && step % 2 === 0) {
      this.note(theme.root + 12 + melody, at, eighth * 1.2, {
        type: "triangle", volume: 0.026, cutoff: 2100
      });
    } else if (melody !== null && step % 4 === 3) {
      this.note(theme.root + 24 + melody, at, eighth * 0.7, {
        type: "sine", volume: 0.012, cutoff: 3200
      });
    }

    if (step === 0 || step === 8) {
      const chordRoot = theme.root + theme.chord[Math.floor(this.step / 8) % theme.chord.length];
      this.note(chordRoot + 12, at, eighth * 7.4, {
        type: "sine", volume: 0.009, cutoff: 780
      });
      this.note(chordRoot + 19, at, eighth * 7.4, {
        type: "sine", volume: 0.006, cutoff: 920
      });
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
    this.applyGain();
  }
}
