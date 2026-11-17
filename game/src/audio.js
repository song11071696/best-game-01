// Salvage Drift — every sound is synthesized with WebAudio. No audio files,
// so the game stays silent on disk and loud in the browser.
export class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  /** Create/resume the context. Call from a user gesture (click or key). */
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  /** A short oscillator blip that slides from freq to freq2. */
  tone({ freq = 440, freq2 = null, dur = 0.1, type = 'square', vol = 0.2, delay = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freq2 !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq2), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Filtered noise burst (explosions, hits). */
  noise({ dur = 0.25, vol = 0.3, freq = 1200, delay = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
  }

  shoot()   { this.tone({ freq: 880, freq2: 220, dur: 0.08, type: 'square', vol: 0.10 }); }
  enemyDie(){ this.noise({ dur: 0.3, vol: 0.28, freq: 900 }); this.tone({ freq: 220, freq2: 40, dur: 0.25, type: 'sawtooth', vol: 0.16 }); }
  rockDie() { this.noise({ dur: 0.18, vol: 0.2, freq: 600 }); }
  pickup()  { this.tone({ freq: 660, freq2: 1320, dur: 0.09, type: 'sine', vol: 0.16 }); }
  hit()     { this.noise({ dur: 0.2, vol: 0.3, freq: 500 }); this.tone({ freq: 160, freq2: 60, dur: 0.2, type: 'sawtooth', vol: 0.22 }); }
  dash()    { this.noise({ dur: 0.16, vol: 0.14, freq: 2400 }); }
  upgrade() { [523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, dur: 0.14, type: 'triangle', vol: 0.18, delay: i * 0.07 })); }
  wave()    { this.tone({ freq: 196, freq2: 392, dur: 0.35, type: 'triangle', vol: 0.2 }); }
  boss()    { this.tone({ freq: 110, freq2: 55, dur: 0.5, type: 'sawtooth', vol: 0.22 }); }
  over()    { [392, 330, 262, 196].forEach((f, i) => this.tone({ freq: f, dur: 0.3, type: 'triangle', vol: 0.2, delay: i * 0.16 })); }
}
