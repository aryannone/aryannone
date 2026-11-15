// =====================================================================
//  Procedural audio: a chill lo-fi loop + game sound effects.
//  Everything is synthesised with the Web Audio API.
// =====================================================================

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Fmaj7 -> Em7 -> Dm7 -> Cmaj7 (a classic lo-fi progression)
const CHORDS = [
  [53, 57, 60, 64], // F A C E
  [52, 55, 59, 62], // E G B D
  [50, 53, 57, 60], // D F A C
  [48, 52, 55, 59], // C E G B
];
const PENTA = [72, 74, 76, 79, 81, 84]; // C major pentatonic, for the melody
const BPM = 78;

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicOn = true;
    this.sfxOn = true;
    try {
      const saved = JSON.parse(localStorage.getItem('campus-audio') || '{}');
      if (typeof saved.music === 'boolean') this.musicOn = saved.music;
      if (typeof saved.sfx === 'boolean') this.sfxOn = saved.sfx;
    } catch {}
  }

  save() {
    try {
      localStorage.setItem('campus-audio', JSON.stringify({ music: this.musicOn, sfx: this.sfxOn }));
    } catch {}
  }

  // Must be called from a user gesture (click / key press)
  init() {
    if (this.ctx) return this.ctx.resume();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());

    this.master = ctx.createDynamicsCompressor();
    this.master.connect(ctx.destination);

    // Music bus with a "muffle" filter (used when a panel is open)
    this.muffle = ctx.createBiquadFilter();
    this.muffle.type = 'lowpass';
    this.muffle.frequency.value = 18000;
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = this.musicOn ? 0.55 : 0;
    this.musicGain.connect(this.muffle).connect(this.master);

    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = this.sfxOn ? 0.7 : 0;
    this.sfxGain.connect(this.master);

    // Shared noise buffer for drums, steps and vinyl crackle
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.startCrackle();
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.15;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  setMusic(on) {
    this.musicOn = on;
    this.save();
    if (this.ctx) this.musicGain.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.3);
  }

  setSfx(on) {
    this.sfxOn = on;
    this.save();
    if (this.ctx) this.sfxGain.gain.setTargetAtTime(on ? 0.7 : 0, this.ctx.currentTime, 0.05);
  }

  setMuffled(m) {
    if (!this.ctx) return;
    this.muffle.frequency.setTargetAtTime(m ? 900 : 18000, this.ctx.currentTime, 0.25);
  }

  // ---------------- music sequencer ----------------
  schedule() {
    const ctx = this.ctx;
    if (ctx.state !== 'running') return;
    const sixteenth = 60 / BPM / 4;
    while (this.nextTime < ctx.currentTime + 0.12) {
      // swing every off-16th slightly for that lazy feel
      const swing = this.step % 2 ? sixteenth * 0.18 : 0;
      this.playStep(this.step, this.nextTime + swing);
      this.nextTime += sixteenth;
      this.step = (this.step + 1) % 64; // 4 bars of 16 steps
    }
  }

  playStep(step, t) {
    if (!this.musicOn) return;
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const chord = CHORDS[bar];

    if (s === 0) chord.forEach((n, i) => this.pad(midi(n), t + i * 0.012, 60 / BPM * 4));
    if (s === 0 || s === 10) this.bass(midi(chord[0] - 12), t, s === 0 ? 0.9 : 0.4);
    if (s === 0 || s === 7 || s === 8) this.kick(t, s === 7 ? 0.5 : 1);
    if (s === 4 || s === 12) this.snare(t);
    if (s % 2 === 0) this.hat(t, s % 4 === 2 ? 0.5 : 0.3);
    // sparse, random melody notes
    if ((s === 2 || s === 6 || s === 11 || s === 14) && Math.random() < 0.35) {
      this.pluck(midi(PENTA[(Math.random() * PENTA.length) | 0]), t, 0.08, this.musicGain);
    }
  }

  env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  pad(freq, t, dur) {
    const ctx = this.ctx;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1100;
    const g = ctx.createGain();
    this.env(g, t, 0.35, 0.05, dur);
    g.connect(this.musicGain);
    f.connect(g);
    for (const det of [-6, 6]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = freq;
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  bass(freq, t, vel) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    this.env(g, t, 0.02, 0.22 * vel, 0.9);
    o.connect(g).connect(this.musicGain);
    o.start(t);
    o.stop(t + 1);
  }

  kick(t, vel) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    const g = ctx.createGain();
    this.env(g, t, 0.004, 0.5 * vel, 0.3);
    o.connect(g).connect(this.musicGain);
    o.start(t);
    o.stop(t + 0.32);
  }

  noiseHit(t, type, freq, q, peak, dur, dest) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, 0.003, peak, dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.02);
  }

  snare(t) {
    this.noiseHit(t, 'bandpass', 1800, 0.8, 0.12, 0.18, this.musicGain);
  }

  hat(t, v) {
    this.noiseHit(t, 'highpass', 7000, 0.5, 0.03 * v * 2, 0.05, this.musicGain);
  }

  pluck(freq, t, peak, dest) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = ctx.createGain();
    this.env(g, t, 0.005, peak, 0.6);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.65);
  }

  startCrackle() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 3000;
    const g = ctx.createGain();
    g.gain.value = 0.006;
    src.connect(f).connect(g).connect(this.musicGain);
    src.start();
  }

  // ---------------- sound effects ----------------
  sfx(name) {
    const ctx = this.ctx;
    if (!ctx || !this.sfxOn || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.005;
    const out = this.sfxGain;
    switch (name) {
      case 'step':
        this.noiseHit(t, 'lowpass', 500 + Math.random() * 300, 1, 0.08, 0.07, out);
        break;
      case 'open':
        this.pluck(midi(72), t, 0.18, out);
        this.pluck(midi(79), t + 0.07, 0.15, out);
        break;
      case 'close':
        this.pluck(midi(79), t, 0.12, out);
        this.pluck(midi(72), t + 0.07, 0.1, out);
        break;
      case 'visit':
        [72, 76, 79, 84].forEach((n, i) => this.pluck(midi(n), t + i * 0.08, 0.16, out));
        break;
      case 'complete':
        [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => this.pluck(midi(n), t + i * 0.09, 0.18, out));
        break;
      case 'bell':
        for (const [fr, dt] of [[2100, 0], [2100, 0.16]]) {
          const o = ctx.createOscillator();
          o.frequency.value = fr;
          const o2 = ctx.createOscillator();
          o2.frequency.value = fr * 1.5;
          const g = ctx.createGain();
          this.env(g, t + dt, 0.003, 0.08, 0.5);
          o.connect(g);
          o2.connect(g);
          g.connect(out);
          o.start(t + dt);
          o2.start(t + dt);
          o.stop(t + dt + 0.55);
          o2.stop(t + dt + 0.55);
        }
        break;
      case 'jump':
        {
          const o = ctx.createOscillator();
          o.type = 'square';
          o.frequency.setValueAtTime(300, t);
          o.frequency.exponentialRampToValueAtTime(700, t + 0.12);
          const g = ctx.createGain();
          this.env(g, t, 0.005, 0.04, 0.15);
          o.connect(g).connect(out);
          o.start(t);
          o.stop(t + 0.17);
        }
        break;
      case 'hi':
        this.pluck(midi(76), t, 0.08, out);
        this.pluck(midi(81), t + 0.06, 0.08, out);
        break;
      case 'click':
        this.pluck(midi(84), t, 0.08, out);
        break;
      case 'coin':
        this.pluck(midi(88), t, 0.12, out);
        this.pluck(midi(95), t + 0.06, 0.12, out);
        break;
      case 'ring':
        [79, 83, 86].forEach((n, i) => this.pluck(midi(n), t + i * 0.05, 0.12, out));
        break;
      case 'start':
        [67, 67, 79].forEach((n, i) => this.pluck(midi(n), t + i * 0.16, 0.14, out));
        break;
      case 'fail':
        [72, 67, 60].forEach((n, i) => this.pluck(midi(n), t + i * 0.14, 0.13, out));
        break;
      case 'kick':
        this.noiseHit(t, 'lowpass', 900, 1.2, 0.35, 0.09, out);
        break;
      case 'goal':
        this.noiseHit(t, 'bandpass', 1400, 0.6, 0.18, 0.9, out);
        [72, 76, 79, 84, 88].forEach((n, i) => this.pluck(midi(n), t + i * 0.07, 0.15, out));
        break;
    }
  }
}

export const audio = new AudioEngine();
