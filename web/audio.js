/** Small, locally synthesized cues. Audio is created only after an opted-in gesture. */
export class GameAudio {
  constructor() {
    this.enabled = false;
    this.context = null;
    this.master = null;
    this.lastStep = -Infinity;
    this.noise = null;
    this.voices = new Set();
  }
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) this.suspend();
  }
  suspend() {
    // Discard in-flight cues rather than replaying them after a hidden tab resumes.
    for (const source of this.voices) {
      try { source.stop(); } catch { /* The cue may already have ended. */ }
      source.disconnect();
    }
    this.voices.clear();
    if (this.context?.state === "running") this.context.suspend().catch(() => {});
  }
  prepare() {
    if (!this.enabled || document.hidden) return false;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.3;
      this.master.connect(this.context.destination);
      // A fixed noise pattern avoids touching the engine's random generator.
      this.noise = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * 0.2), this.context.sampleRate);
      const data = this.noise.getChannelData(0);
      let state = 0x75a41;
      for (let i = 0; i < data.length; i++) {
        state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
        data[i] = (state >>> 0) / 2147483648 - 1;
      }
    }
    if (this.context.state === "suspended") this.context.resume().catch(() => {});
    return this.context.state !== "closed";
  }
  note(frequency, delay, length, volume, type = "sine", endFrequency = frequency) {
    if (this.voices.size >= 24) return;
    const context = this.context, start = context.currentTime + delay;
    const oscillator = context.createOscillator(), envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + length);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    this.voices.add(oscillator);
    oscillator.onended = () => {
      this.voices.delete(oscillator); oscillator.disconnect(); envelope.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + length + 0.015);
  }
  texture(frequency, length, volume) {
    if (this.voices.size >= 24) return;
    const context = this.context, start = context.currentTime;
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), envelope = context.createGain();
    source.buffer = this.noise;
    filter.type = "lowpass";
    filter.frequency.value = frequency;
    envelope.gain.setValueAtTime(volume, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);
    source.connect(filter); filter.connect(envelope); envelope.connect(this.master);
    this.voices.add(source);
    source.onended = () => {
      this.voices.delete(source); source.disconnect(); filter.disconnect(); envelope.disconnect();
    };
    source.start(start); source.stop(start + length);
  }
  play(kind = "step") {
    try {
      if (!this.prepare()) return;
      const now = performance.now();
      if (kind === "step") {
        if (now - this.lastStep < 90) return;
        this.lastStep = now;
        this.texture(420, 0.045, 0.045);
        this.note(145, 0, 0.055, 0.025, "triangle", 92);
      } else if (kind === "hit") {
        this.texture(1600, 0.09, 0.12);
        this.note(120, 0, 0.17, 0.18, "triangle", 48);
      } else if (kind === "reward") {
        for (const [i, frequency] of [392, 493.88, 587.33, 783.99].entries())
          this.note(frequency, i * 0.055, 0.32, 0.055, "sine");
      } else if (kind === "skill") {
        this.note(196, 0, 0.25, 0.08, "triangle", 392);
        this.note(587.33, 0.07, 0.28, 0.05, "sine", 783.99);
        this.texture(2200, 0.13, 0.035);
      } else if (kind === "dash") {
        this.texture(850, 0.11, 0.06);
        this.note(290, 0, 0.12, 0.035, "sine", 110);
      } else if (kind === "guard") {
        this.note(174.61, 0, 0.2, 0.06, "triangle");
        this.note(261.63, 0.035, 0.14, 0.035, "sine");
      } else if (kind === "potion") {
        this.note(329.63, 0, 0.2, 0.045);
        this.note(493.88, 0.07, 0.25, 0.045);
      }
    } catch {
      // Muted, unsupported or unavailable audio never blocks a game action.
    }
  }
}
