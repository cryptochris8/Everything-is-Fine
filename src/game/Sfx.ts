/**
 * Original, synthesized sound stingers (WebAudio): boing, honk, squeak, splash, fanfare...
 * No audio files and no licensing questions; replaceable later by ElevenLabs SFX through
 * the same ids. The AudioContext starts on the first user gesture (browser autoplay rules).
 * Every important sound also has a caption or visual, so nothing depends on audio alone.
 */

type Voice = (ctx: AudioContext, out: AudioNode, t: number) => void;

function tone(ctx: AudioContext, out: AudioNode, t: number, type: OscillatorType, f0: number, f1: number, dur: number, vol: number): void {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(ctx: AudioContext, out: AudioNode, t: number, dur: number, vol: number, freq: number, q = 0.8): void {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let seed = 1234567;
  for (let i = 0; i < len; i++) {
    seed = (seed * 16807) % 2147483647;
    data[i] = (seed / 2147483647) * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(out);
  src.start(t);
}

const VOICES: Record<string, Voice> = {
  boing: (c, o, t) => tone(c, o, t, 'sine', 180, 720, 0.35, 0.35),
  sproing: (c, o, t) => {
    tone(c, o, t, 'triangle', 300, 1200, 0.25, 0.3);
    tone(c, o, t + 0.12, 'triangle', 500, 1500, 0.25, 0.2);
  },
  horn: (c, o, t) => {
    tone(c, o, t, 'square', 392, 392, 0.22, 0.12);
    tone(c, o, t, 'square', 330, 330, 0.22, 0.1);
  },
  squeak: (c, o, t) => tone(c, o, t, 'sine', 1400, 2600, 0.12, 0.25),
  pickup: (c, o, t) => tone(c, o, t, 'triangle', 520, 880, 0.12, 0.2),
  place: (c, o, t) => tone(c, o, t, 'triangle', 600, 300, 0.1, 0.2),
  click: (c, o, t) => tone(c, o, t, 'square', 1100, 900, 0.05, 0.1),
  tick: (c, o, t) => {
    for (let i = 0; i < 4; i++) {
      tone(c, o, t + i * 0.25, 'square', 2000, 1800, 0.03, 0.08);
    }
  },
  whoosh: (c, o, t) => noise(c, o, t, 0.4, 0.3, 900, 0.6),
  spray: (c, o, t) => noise(c, o, t, 1.2, 0.25, 3000, 0.4),
  splash: (c, o, t) => noise(c, o, t, 0.5, 0.35, 1500, 0.5),
  crash: (c, o, t) => {
    noise(c, o, t, 0.6, 0.5, 400, 0.4);
    tone(c, o, t, 'sawtooth', 120, 50, 0.4, 0.15);
  },
  thud: (c, o, t) => tone(c, o, t, 'sine', 140, 50, 0.25, 0.4),
  clank: (c, o, t) => {
    tone(c, o, t, 'square', 700, 650, 0.08, 0.15);
    tone(c, o, t + 0.02, 'square', 1040, 990, 0.1, 0.1);
  },
  stamp: (c, o, t) => tone(c, o, t, 'sine', 200, 60, 0.15, 0.4),
  catch: (c, o, t) => [660, 880, 1320].forEach((f, i) => tone(c, o, t + i * 0.07, 'triangle', f, f, 0.2, 0.2)),
  fanfare: (c, o, t) => [523, 659, 784, 1046].forEach((f, i) => tone(c, o, t + i * 0.12, 'square', f, f, i === 3 ? 0.5 : 0.15, 0.1)),
  alarm: (c, o, t) => [880, 660, 880, 660].forEach((f, i) => tone(c, o, t + i * 0.15, 'square', f, f, 0.13, 0.08)),
  sniff: (c, o, t) => [0, 0.12, 0.24].forEach((d) => noise(c, o, t + d, 0.08, 0.2, 2500, 1)),
  cluck: (c, o, t) => [0, 0.15].forEach((d) => tone(c, o, t + d, 'square', 700, 400, 0.08, 0.1)),
  beep: (c, o, t) => [0, 0.14].forEach((d) => tone(c, o, t + d, 'square', 1200, 1200, 0.08, 0.08)),
  chaos: (c, o, t) => tone(c, o, t, 'sawtooth', 220, 440, 0.3, 0.08),
  award: (c, o, t) => [784, 988, 1175, 1568].forEach((f, i) => tone(c, o, t + i * 0.09, 'triangle', f, f, 0.25, 0.15)),
  rule: (c, o, t) => [440, 349].forEach((f, i) => tone(c, o, t + i * 0.18, 'square', f, f, 0.18, 0.08)),
  news: (c, o, t) => [392, 523, 659, 784, 659].forEach((f, i) => tone(c, o, t + i * 0.14, 'triangle', f, f, 0.22, 0.14)),
  vacuum: (c, o, t) => {
    noise(c, o, t, 1.4, 0.12, 700, 1.4);
    tone(c, o, t, 'sawtooth', 110, 118, 1.4, 0.04);
  },
  meow: (c, o, t) => {
    tone(c, o, t, 'triangle', 520, 880, 0.18, 0.18);
    tone(c, o, t + 0.16, 'triangle', 880, 420, 0.32, 0.16);
  },
  thwump: (c, o, t) => {
    tone(c, o, t, 'sine', 90, 40, 0.35, 0.5);
    noise(c, o, t + 0.05, 0.5, 0.25, 1200, 0.5);
  },
  splat: (c, o, t) => {
    noise(c, o, t, 0.25, 0.4, 500, 0.7);
    tone(c, o, t, 'sine', 220, 70, 0.2, 0.25);
  },
  chitter: (c, o, t) => [0, 0.07, 0.14, 0.21, 0.35, 0.42].forEach((d) => tone(c, o, t + d, 'square', 2400, 1700, 0.04, 0.06)),
  wind: (c, o, t) => noise(c, o, t, 1.8, 0.28, 450, 0.3),
  talk: (c, o, t) => tone(c, o, t, 'triangle', 300 + Math.floor(t * 7919) % 200, 260, 0.06, 0.06),
};

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private volume = 0.8;
  private last = new Map<string, number>();

  /** Call from a click/keypress handler. */
  public unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
          ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) {
          return;
        }
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
    } catch {
      this.ctx = null;
    }
  }

  public setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) {
      this.master.gain.value = this.volume;
    }
  }

  public play(id: string): void {
    const ctx = this.ctx;
    const voice = VOICES[id];
    if (!ctx || !this.master || !voice || this.volume <= 0) {
      return;
    }
    const now = ctx.currentTime;
    // Rate-limit identical sounds so spamming a button never becomes noise.
    if ((this.last.get(id) ?? -1) > now - 0.08) {
      return;
    }
    this.last.set(id, now);
    try {
      voice(ctx, this.master, now);
    } catch {
      // ignore audio failures; captions carry the information
    }
  }

  public has(id: string): boolean {
    return id in VOICES;
  }
}
