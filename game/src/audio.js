// Original synthesized audio for SUNCOAST: HEATLINE — no audio files, every
// sound is generated live with the Web Audio API: an engine hum, a two-tone
// police siren, a gunshot noise burst and job chimes. Silent until the first
// user gesture, and fully guarded so a missing AudioContext never breaks play.
export class GameAudio {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenHigh = false;
    this.sirenTimer = 0;
  }

  /** Call from a user gesture: creates the context and starts the engine hum. */
  unlock() {
    if (this.enabled) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.enabled = true;
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0.0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);
      this.sirenOsc.start();
    } catch (err) {
      this.enabled = false;
    }
  }

  /** Engine pitch follows speed; siren wails while wanted. Call each frame. */
  update(speedKmh, wanted, now) {
    if (!this.enabled || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      const t = this.ctx.currentTime;
      this.engineOsc.frequency.setTargetAtTime(50 + speedKmh * 1.1, t, 0.08);
      this.engineGain.gain.setTargetAtTime(speedKmh > 1 ? 0.05 : 0.015, t, 0.1);
      if (wanted > 0) {
        this.sirenGain.gain.setTargetAtTime(0.035, t, 0.2);
        if (now - this.sirenTimer > 0.45) {
          this.sirenTimer = now;
          this.sirenHigh = !this.sirenHigh;
          this.sirenOsc.frequency.setTargetAtTime(this.sirenHigh ? 950 : 700, t, 0.05);
        }
      } else {
        this.sirenGain.gain.setTargetAtTime(0.0, t, 0.2);
      }
    } catch (err) { /* audio is cosmetic; never break the game */ }
  }

  /** Short filtered noise burst for a gunshot. */
  gunshot() {
    if (!this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * 0.12);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1800;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start();
    } catch (err) { /* cosmetic */ }
  }

  /** Two-note chime for a pickup or a completed job. */
  chime(high = false) {
    if (!this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const notes = high ? [660, 880] : [523, 659];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.25, t + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.12);
        osc.stop(t + i * 0.12 + 0.55);
      });
    } catch (err) { /* cosmetic */ }
  }
}
