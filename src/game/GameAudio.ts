/**
 * The game's recorded audio (ElevenLabs, baked by tools/build-audio.mjs): the theme song and
 * music beds, the sound effects and the neighbours' voices, through the engine's audio
 * system so the same @project/assets paths work in dev and in a Studio build.
 *
 * - Music beds and the ambience are looping SoundNodes, crossfaded per frame (audioPlan.ts).
 * - Sound effects and voice lines are one-shots on the GlobalAudioManager ('SFX' / 'Voice').
 * - Voices queue (one at a time) and duck the music; a line that waits too long is dropped.
 * - Anything without a file falls back to the synthesized stingers in Sfx.ts.
 */
import * as ENGINE from '@gnsx/genesys.js';

import { MUSIC_FILES, SFX_FILES, VOICE_LINES } from './audioManifest.js';
import { FADE_RATE, NEWS_SCRIPT, VoiceQueue, approach, mixTargets, voiceIndex, voiceKey, type AudioPhase, type MusicTrack } from './audioPlan.js';

type Bed = MusicTrack | 'ambience';

const now = (): number => (globalThis.performance?.now() ?? Date.now()) / 1000;

export class GameAudio {
  private readonly beds = new Map<Bed, { node: ENGINE.SoundNode; key: string; vol: number; started: boolean }>();
  private readonly voices = voiceIndex(VOICE_LINES);
  private readonly queue = new VoiceQueue(4);
  private voice: ENGINE.SoundHandle | null = null;
  /** A line is decoding / starting (its handle hasn't arrived yet). */
  private pending = false;
  /** Bumped by hush(): a line that finishes loading after a hush is stopped at once. */
  private generation = 0;
  private loaded = false;
  private unlocked = false;
  private newsAt: number | null = null;
  private newsStep = 0;
  /** News card: hold the theme back until the anchor has signed off. */
  private holdTheme = false;

  public constructor(private readonly world: ENGINE.World) {}

  /** Create the looping beds and start decoding them (and preloading the effects). */
  public async init(): Promise<void> {
    const beds: [Bed, string | undefined][] = [
      ['theme', MUSIC_FILES.theme],
      ['street', MUSIC_FILES.street],
      ['chaos', MUSIC_FILES.chaos],
      ['ambience', SFX_FILES.ambience],
    ];
    const nodes: ENGINE.SoundNode[] = [];
    for (const [bed, file] of beds) {
      if (!file) {
        continue;
      }
      const res = new ENGINE.SoundResource();
      res.name = bed;
      res.audioPath = file;
      res.volume = 1;
      const node = ENGINE.SoundNode.create({ name: `Audio:${bed}`, sounds: [res], loop: true, positional: false, autoPlay: false, bus: bed === 'ambience' ? 'Ambience' : 'Music' });
      this.world.add(node);
      nodes.push(node);
      this.beds.set(bed, { node, key: bed, vol: 0, started: false });
    }
    const gam = this.world.globalAudioManager;
    const effects = Object.entries(SFX_FILES).filter(([id]) => id !== 'ambience');
    await Promise.allSettled([...nodes.map((n) => n.waitForLoad()), ...effects.map(([id, file]) => gam.loadSound(id, file))]);
    this.loaded = true;
    if (this.unlocked) {
      this.startBeds();
    }
  }

  /** Call from a click / key / tap: browsers only let audio start after a gesture. */
  public unlock(): void {
    const ctx = this.world.audioListener?.context;
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
    this.unlocked = true;
    if (this.loaded) {
      this.startBeds();
    }
  }

  private startBeds(): void {
    for (const bed of this.beds.values()) {
      if (!bed.started) {
        bed.started = true;
        // Start silent; update() fades each bed to its target.
        void bed.node.play(bed.key, 0.0001, true);
      }
    }
  }

  public setVolume(v: number): void {
    this.world.globalAudioManager.getBus('Master')?.setVolume(Math.max(0, Math.min(1, v)));
  }

  public hasSfx(id: string): boolean {
    return id in SFX_FILES && id !== 'ambience';
  }

  public playSfx(id: string, gain = 1): void {
    const file = SFX_FILES[id];
    if (!file || !this.unlocked) {
      return;
    }
    void this.world.globalAudioManager.playGlobalSound(file, { bus: 'SFX', volume: 0.85 * gain });
  }

  /** Queue the recorded line for this speaker + text. Returns false if it isn't voiced. */
  public say(speaker: string, text: string): boolean {
    const file = this.voices.get(voiceKey(speaker, text));
    if (!file) {
      return false;
    }
    if (this.unlocked) {
      this.queue.push(file, now());
    }
    return true;
  }

  /** Stop talking (new day, back to the title). */
  public hush(): void {
    this.queue.clear();
    this.generation++;
    this.pending = false;
    if (this.voice) {
      this.world.globalAudioManager.stopSound(this.voice);
      this.voice = null;
    }
    this.newsAt = null;
    this.holdTheme = false;
  }

  /** A new day: the theme starts from the top for the cold open (unless it's already playing). */
  public coldOpen(): void {
    const theme = this.beds.get('theme');
    if (theme?.started && theme.vol < 0.05) {
      void theme.node.play(theme.key, 0.0001, true);
    }
  }

  /** The news card: sting, anchor, theme. */
  public startNews(): void {
    this.hush();
    this.newsAt = now();
    this.newsStep = 0;
    this.holdTheme = true;
  }

  public get talking(): boolean {
    return this.pending || (this.voice !== null && this.world.globalAudioManager.isSoundPlaying(this.voice));
  }

  /** Debug / probe readout. */
  public debugState(): { loaded: boolean; unlocked: boolean; context: string | null; beds: Record<string, number>; talking: boolean; queued: number; voicesPlayed: number } {
    const beds: Record<string, number> = {};
    for (const [name, bed] of this.beds) {
      beds[name] = +bed.vol.toFixed(3);
    }
    return { loaded: this.loaded, unlocked: this.unlocked, context: this.world.audioListener?.context.state ?? null, beds, talking: this.talking, queued: this.queue.size, voicesPlayed: this.voicesPlayed };
  }

  private voicesPlayed = 0;

  public update(dt: number, phase: AudioPhase, chaos: number, finale: boolean, opening = false): void {
    const t = now();
    // News script.
    if (this.newsAt !== null) {
      while (this.newsStep < NEWS_SCRIPT.length && t - this.newsAt >= NEWS_SCRIPT[this.newsStep]!.at) {
        const step = NEWS_SCRIPT[this.newsStep++]!;
        if (step.sfx) {
          this.playSfx(step.sfx);
        }
        if (step.anchor) {
          this.say('anchor', step.anchor);
        }
        if (step.music) {
          this.holdTheme = false;
        }
      }
      if (this.newsStep >= NEWS_SCRIPT.length) {
        this.newsAt = null;
      }
    }
    // Dialogue: one line at a time.
    if (!this.talking) {
      this.voice = null;
      const next = this.queue.next(t);
      if (next) {
        const gen = this.generation;
        const gam = this.world.globalAudioManager;
        this.pending = true;
        void gam
          .playGlobalSound(next.file, { bus: 'Voice', volume: 1 })
          .then((h) => {
            if (gen !== this.generation) {
              if (h) {
                gam.stopSound(h);
              }
              return;
            }
            this.voice = h;
            this.pending = false;
            if (h) {
              this.voicesPlayed++;
            }
          })
          .catch(() => {
            if (gen === this.generation) {
              this.pending = false;
            }
          });
      }
    }
    // Beds.
    const talking = this.talking;
    const targets = mixTargets(phase, chaos, finale, talking, opening);
    if (this.holdTheme) {
      targets.theme = 0;
    }
    for (const [name, bed] of this.beds) {
      if (!bed.started) {
        continue;
      }
      bed.vol = approach(bed.vol, targets[name], FADE_RATE, dt);
      bed.node.getAudio(bed.key)?.setVolume(Math.max(0.0001, bed.vol));
    }
  }
}
