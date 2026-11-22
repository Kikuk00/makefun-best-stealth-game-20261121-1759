// Sound, synthesised with WebAudio only — no audio files, no network.
// Footsteps, the alert sting, pickups, the win arpeggio and the caught drone.
export class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  /** Create the audio context on the first user gesture (browsers require it). */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  /** A short tone: frequency slide, waveform, duration and volume. */
  tone(freq, freqEnd, dur, type = 'sine', vol = 0.5, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** A soft filtered noise burst, for footsteps and rustles. */
  noise(dur, vol, cutoff = 900) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  /** A guard's footstep: quiet tick, louder when the guard is close. */
  footstep(close) {
    this.noise(0.07, close ? 0.35 : 0.14, close ? 700 : 500);
  }

  /** The courier's own step while running: a soft scuff. */
  playerStep() {
    this.noise(0.05, 0.12, 1100);
  }

  /** Two-note sting when a guard spots the courier. */
  alertSting() {
    this.tone(392, 392, 0.14, 'square', 0.28);
    this.tone(523, 523, 0.22, 'square', 0.28, 0.13);
  }

  /** A guard growing suspicious: a single questioning blip. */
  suspiciousBlip() {
    this.tone(660, 520, 0.12, 'triangle', 0.25);
  }

  /** Picking up an intel page or the parcel. */
  pickup() {
    this.tone(880, 1320, 0.12, 'sine', 0.4);
    this.tone(1320, 1760, 0.14, 'sine', 0.3, 0.08);
  }

  /** Level complete: a small rising arpeggio. */
  winJingle() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.18, 'triangle', 0.35, i * 0.11));
  }

  /** Caught: a low falling drone. */
  caughtDrone() {
    this.tone(220, 55, 0.9, 'sawtooth', 0.3);
    this.tone(110, 40, 1.1, 'triangle', 0.25, 0.1);
  }
}
