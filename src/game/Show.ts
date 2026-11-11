/**
 * The Genesys adapter's conductor. Owns one Sim per day and keeps the 3D world, HUD and
 * sound in step with it: player position/buttons in, presentation events out.
 *
 * Flow: title → day (sim) → news end card → next day (memory carried in the save).
 */
import * as ENGINE from '@gnsx/genesys.js';
import * as THREE from 'three';

import { validateContent } from '../sim/comedy/validate.js';
import { ACTOR_BY_ID, actorName } from '../sim/content/cast.js';
import { CONTENT } from '../sim/content/index.js';
import { NEWS } from '../sim/content/news.js';
import { PROP_BY_ID } from '../sim/content/props.js';
import { hashString, parseSeed } from '../sim/core/rng.js';
import { Bot, type BotPolicy } from '../sim/debug/bot.js';
import { parseDifficulty } from '../sim/gameplay/difficulty.js';
import { buildNews, type NewsReport } from '../sim/gameplay/news.js';
import { commitDay } from '../sim/memory/progress.js';
import { BrowserStore, freshSave, parseSave, serializeSave, type SaveData } from '../sim/memory/save.js';
import { Sim } from '../sim/sim.js';
import { PLAYER_SPAWN } from '../sim/world/layout.js';
import type { SimEvent } from '../sim/world/state.js';
import { buildGallery, type Gallery } from './art/gallery.js';
import { SKY_TEXTURE } from './ShippedAssets.js';
import { createActorView, type ActorView } from './Characters.js';
import { ButtonEdges, keyAction, padAction, padStyleFromId, stickMagnitude, type Action, type Device, type PadStyle } from './Controls.js';
import {
  CAMERA,
  JumpBuffer,
  STICK_CENTRE,
  dragLook,
  followBase,
  inStickZone,
  isRunning,
  keyLook,
  keysStick,
  padLook,
  padStick,
  rotateStick,
  stickFromOffset,
  strongest,
  wrapAngle,
  type StickVector,
} from './athlete.js';
import { athleteInput } from './AthleteControl.js';
import { Fx } from './Fx.js';
import { Hud, type HudSettings } from './Hud.js';
import { G, buildNeighborhood } from './Neighborhood.js';
import { NeighborPawn } from './Player.js';
import { createPropViews, type PropCtx, type PropView } from './PropViews.js';
import { Sfx } from './Sfx.js';
import { GameAudio } from './GameAudio.js';
import { OPENING_THEME_SECONDS, distanceGain } from './audioPlan.js';

type Phase = 'title' | 'playing' | 'paused' | 'news';
type PadSnapshot = { id: string; buttons: boolean[]; values: number[]; axes: number[] };

const params = new URLSearchParams(globalThis.location?.search ?? '');
/** Debug/verification only: run the comedy clock faster (`?timescale=3`). */
const TIMESCALE = Math.max(0.25, Math.min(6, Number(params.get('timescale') ?? 1) || 1));

export class Show {
  private world: ENGINE.World | null = null;
  private sim: Sim | null = null;
  private hud: Hud | null = null;
  private fx: Fx | null = null;
  private readonly sfx = new Sfx();
  /** Recorded music, effects and voices (ElevenLabs); Sfx is the synthesized fallback. */
  private audio: GameAudio | null = null;
  private readonly store = new BrowserStore();
  private save: SaveData = freshSave();
  private saveBeforeDay: SaveData = freshSave();
  private phase: Phase = 'title';
  private actorViews = new Map<string, ActorView>();
  private propViews = new Map<string, PropView>();
  private readonly tmp = new THREE.Vector3();
  private readonly playerPos = new THREE.Vector3();
  private playerYaw = 0;
  private newsAt: number | null = null;
  private report: NewsReport | null = null;
  private lastSeed = 0;
  private bot: Bot | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private touch = false;
  private pointerHandler: ((e: PointerEvent) => void) | null = null;
  /** The device the player last used; drives button labels and the touch buttons. */
  private device: Device = 'keyboard';
  private padStyle: PadStyle = 'xbox';
  private readonly padEdges = new ButtonEdges();
  /** Athlete Domains controls (athlete.ts): jump buffer, phone stick, drag-to-look, last pad frame. */
  private readonly jumpBuf = new JumpBuffer();
  private stick: { id: number; base: { x: number; y: number }; vec: StickVector } | null = null;
  private lookDrag: { id: number; x: number; y: number } | null = null;
  private touchJumpHeld = false;
  private lastPad: PadSnapshot | null = null;
  private dragHandlers: { down: (e: PointerEvent) => void; move: (e: PointerEvent) => void; up: (e: PointerEvent) => void; menu: (e: Event) => void } | null = null;
  private hintUntil = 0;
  private gallery: Gallery | null = null;
  /** Engine 18 quirk: the initial spawn wedges the capsule ~1 m into the ground; one teleport fixes it. */
  private spawnSettled = false;
  private pawnAge = 0;
  public ready = false;

  public begin(world: ENGINE.World): void {
    this.world = world;
    const issues = validateContent(CONTENT.incidents, NEWS);
    if (issues.length) {
      console.error('[EIF] content validation failed', issues);
    }
    this.save = params.has('reset') ? freshSave() : parseSave(this.store.load());
    const urlDiff = parseDifficulty(params.get('difficulty'));
    if (urlDiff) {
      this.save.difficulty = urlDiff;
    }
    this.touch = isTouchPrimary();
    this.device = this.touch ? 'touch' : 'keyboard';
    this.setupLighting(world);
    buildNeighborhood(world);
    if (params.has('gallery')) {
      this.gallery = buildGallery(world, G);
    }
    for (const id of ACTOR_BY_ID.keys()) {
      this.actorViews.set(id, createActorView(world, id));
    }
    this.propViews = createPropViews(world);
    this.fx = new Fx(world);
    this.fx.reducedMotion = this.save.settings.reducedMotion;
    this.sfx.setVolume(this.save.settings.volume);
    this.audio = new GameAudio(world);
    this.audio.setVolume(this.save.settings.volume);
    void this.audio.init();

    const container = world.gameContainer;
    if (!container) throw new Error('Show needs a rendered world: gameContainer is undefined (headless)');
    const host = container.querySelector<HTMLElement>('#ui-container') ?? container;
    this.hud = new Hud(
      host,
      {
        onStart: () => this.startDay(null),
        onResume: () => this.resume(),
        onChoose: (i) => this.sim?.choose(i),
        onInteract: () => this.doInteract(),
        onThrow: () => this.doThrow(),
        onNextDay: () => this.startDay(null),
        onReplayDay: () => this.replayDay(),
        onSettings: (s) => this.applySettings(s),
        onResetSave: () => {
          this.store.clear();
          this.save = freshSave();
          this.hud?.closeOverlay();
          this.showTitle();
        },
        onJump: (down) => this.touchJump(down),
        onPause: () => this.act({ kind: 'pause' }),
        onUnstick: () => this.unstick(),
      },
      { ...this.save.settings, difficulty: this.save.difficulty },
    );
    this.hud.setTouchMode(this.touch);
    this.hud.setDevice(this.device, this.padStyle);
    this.hud.setDebugVisible(params.has('debug'));
    this.installInput();
    this.installDebugApi();

    // A sim exists even behind the title, so the street is alive (and Todd is on his trampoline).
    this.sim = this.newSim(this.pickSeed());
    if (params.has('autostart') || params.has('bot')) {
      this.startDay(this.lastSeed);
    } else {
      this.showTitle();
    }
    this.ready = true;
  }

  public end(): void {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
    }
    const host = this.world?.gameContainer;
    if (host && this.dragHandlers) {
      host.removeEventListener('pointerdown', this.dragHandlers.down);
      host.removeEventListener('pointermove', this.dragHandlers.move);
      host.removeEventListener('pointerup', this.dragHandlers.up);
      host.removeEventListener('pointercancel', this.dragHandlers.up);
      host.removeEventListener('contextmenu', this.dragHandlers.menu);
    }
    if (this.pointerHandler) {
      window.removeEventListener('pointerdown', this.pointerHandler, true);
    }
  }

  // ============================================================ days

  private pickSeed(): number {
    const fromUrl = params.get('seed');
    if (fromUrl && this.save.day === parseSave(this.store.load()).day) {
      return parseSeed(fromUrl, 1);
    }
    // Fresh randomness per day is fine here: the seed is shown and shareable, and everything
    // INSIDE the day is derived from it deterministically.
    return (hashString(`${Date.now()}:${this.save.day}`) ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  }

  private newSim(seed: number): Sim {
    this.lastSeed = seed;
    return new Sim({ seed, content: CONTENT, save: structuredClone(this.save) });
  }

  private showTitle(): void {
    this.phase = 'title';
    this.hud?.showTitle(this.save.day, this.save.headlines.map((h) => h.headline), this.save.stats.daysPlayed > 0);
  }

  private startDay(seed: number | null): void {
    this.unlockAudio();
    const s = seed ?? (this.phase === 'title' && this.sim && this.sim.t < 0.5 ? this.lastSeed : this.pickSeed());
    this.saveBeforeDay = structuredClone(this.save);
    this.sim = this.newSim(s);
    this.report = null;
    this.newsAt = null;
    this.audio?.hush();
    this.audio?.coldOpen();
    this.fx?.reset();
    this.hud?.closeOverlay();
    this.hud?.clearTransient();
    this.hud?.setDay(this.save.day, this.sim.difficulty, s);
    this.hud?.setChaos(0, 0);
    this.hud?.setObjective(null);
    const pawn = this.pawn();
    pawn?.teleport(PLAYER_SPAWN.x, G + 1.6, PLAYER_SPAWN.z, Math.PI);
    pawn?.setFrozen(false);
    this.phase = 'playing';
    const policy = params.get('bot');
    this.bot = policy !== null ? new Bot(this.sim, { policy: (['helpful', 'lazy', 'slow'].includes(policy) ? policy : 'helpful') as BotPolicy, choice: 'random', seed: s }) : null;
    // Athlete Domains camera: behind the athlete (who faces +Z at spawn), at the resting pitch.
    athleteInput.look = { yaw: 0, pitch: CAMERA.defaultPitch };
    athleteInput.enabled = this.bot === null;
    this.hintUntil = this.sim.t + 8;
    console.warn(`[EIF] day ${this.save.day} start seed=${s} difficulty=${this.sim.difficulty}`);
  }

  private replayDay(): void {
    this.save = structuredClone(this.saveBeforeDay);
    this.store.store(serializeSave(this.save));
    this.startDay(this.lastSeed);
  }

  private finishDay(): void {
    const sim = this.sim!;
    const report = buildNews(sim);
    this.report = report;
    this.save = commitDay(sim, report);
    this.store.store(serializeSave(this.save));
    this.phase = 'news';
    this.pawn()?.setFrozen(true);
    if (this.audio) {
      this.audio.startNews();
    } else {
      this.sfx.play('news');
    }
    this.hud?.setObjective(null);
    this.hud?.setPrompt(null, null, false);
    this.hud?.showNews(report, this.save.day);
    console.warn(`[EIF] day over: ${report.outcome} | ${report.headline}`);
  }

  // ============================================================ per frame

  public tick(dt: number): void {
    const world = this.world;
    const sim = this.sim;
    const hud = this.hud;
    if (!world || !sim || !hud) {
      return;
    }
    const pawn = this.pawn();
    if (pawn && !this.spawnSettled) {
      // Teleports issued during the pawn's first second land ~2 m low; wait for it to warm up.
      this.pawnAge += dt;
      if (this.pawnAge > 1.5) {
        this.spawnSettled = true;
        pawn.teleport(PLAYER_SPAWN.x, G + 1.6, PLAYER_SPAWN.z, Math.PI);
      }
    }
    if (pawn) {
      pawn.getWorldPosition(this.playerPos);
      // Safety net (the engine has no kill-Z): anyone who falls out of the world lands back home.
      if (this.playerPos.y < G - 6 && this.spawnSettled) {
        pawn.teleport(PLAYER_SPAWN.x, G + 2.5, PLAYER_SPAWN.z, Math.PI);
        this.hud?.caption('You reappear on your own sidewalk. Pleasant Pines does not discuss what happened.', 3);
        console.warn('[EIF] player fell out of the world; returned to spawn');
      }
      const fwd = pawn.forwardDirection();
      this.playerYaw = Math.atan2(fwd.x, fwd.z);
    }
    this.pollGamepad();
    this.audio?.update(Math.min(dt, 0.1), this.phase, sim.chaos, sim.running.some((r) => r.def.kind === 'finale'), sim.t < OPENING_THEME_SECONDS);
    const simDt = Math.min(dt, 0.1) * TIMESCALE;
    if (this.phase === 'playing') {
      if (this.bot) {
        // The autopilot teleports the pawn; the camera swings round behind it.
        athleteInput.enabled = false;
        const d = wrapAngle(this.playerYaw - athleteInput.look.yaw);
        athleteInput.look = { yaw: athleteInput.look.yaw + d * Math.min(1, dt * 4), pitch: CAMERA.defaultPitch };
      }
      if (this.bot && this.spawnSettled) {
        const input = this.bot.decide(simDt);
        if (pawn) {
          pawn.teleport(input.pos.x, this.playerPos.y, input.pos.z, input.yaw + Math.PI);
        }
        sim.setPlayer(input.pos, input.yaw);
        if (input.choose !== null) {
          sim.choose(input.choose);
        }
        if (input.interact) {
          sim.interact();
        }
        if (input.throw) {
          sim.throwHeld();
        }
      } else if (!this.bot) {
        sim.setPlayer({ x: this.playerPos.x, z: this.playerPos.z }, this.playerYaw);
        this.gatherInput(dt);
        pawn?.setHolding(sim.player.holding !== null);
      }
      sim.tick(simDt);
      for (const e of sim.drainEvents()) {
        this.onEvent(e);
      }
      if (sim.dayOver && this.newsAt === null) {
        this.newsAt = sim.t + 3;
      }
      if (this.newsAt !== null && sim.t >= this.newsAt) {
        this.newsAt = null;
        this.finishDay();
      }
    } else {
      athleteInput.move = STICK_CENTRE;
      athleteInput.jump = false;
      athleteInput.run = false;
    }
    if (this.phase === 'title') {
      // The street stays alive behind the title card (ambient life only; the mission waits).
      sim.drainEvents();
    }

    this.gallery?.update(dt);

    // Views.
    for (const [id, view] of this.actorViews) {
      const a = sim.actors.get(id);
      if (a) {
        const seated = id === 'granny' && sim.props.get('cart')!.heldBy === 'granny';
        view.update(a, sim.t, dt, seated);
      }
    }
    const ctx: PropCtx = { simT: sim.t, dt, playerPos: this.playerPos, playerYaw: this.playerYaw, actors: sim.actors };
    for (const [id, view] of this.propViews) {
      const p = sim.props.get(id);
      if (p) {
        view.update(p, ctx);
      }
    }
    if (this.phase === 'playing') {
      this.fx?.update(simDt, sim);
    }

    // HUD.
    if (this.phase === 'playing') {
      const i = sim.interaction();
      const held = sim.player.holding;
      hud.setPrompt(sim.stunned ? null : i, held ? PROP_BY_ID.get(held)?.name ?? held : null, held ? PROP_BY_ID.get(held)?.throwable ?? false : false);
      const o = sim.objective();
      if (o?.target) {
        const dx = o.target.x - this.playerPos.x;
        const dz = o.target.z - this.playerPos.z;
        let rel = -(Math.atan2(dx, dz) - this.playerYaw);
        rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        hud.setObjectiveDirection(rel, Math.hypot(dx, dz));
      } else {
        hud.setObjectiveDirection(null, null);
      }
      if (!this.touch && !this.bot && this.device === 'keyboard' && sim.t < this.hintUntil && sim.t > 1.5) {
        hud.setHint('Hold the right mouse button (or drag on the right side) to look around');
      } else {
        hud.setHint(null);
      }
    }
    hud.updateBubbles(dt, (actor) => this.project(actor));
    if (hud.debugVisible) {
      hud.setDebug(this.debugText());
    }
  }

  private onEvent(e: SimEvent): void {
    const hud = this.hud!;
    switch (e.type) {
      case 'say':
        hud.say(e.actor, actorName(e.actor), e.text, e.dur);
        if (!this.audio?.say(e.actor, e.text)) {
          this.sfx.play('talk');
        }
        break;
      case 'caption':
        hud.caption(escapeHtml(e.text), e.dur);
        break;
      case 'emote':
        hud.emote(e.actor, e.emote);
        break;
      case 'fx':
        this.fx?.burst(e.kind, e.at, e.y, e.r, e.dur);
        break;
      case 'sound':
        this.playSound(e.id, e.at);
        break;
      case 'objective':
        hud.setObjective(e.text, e.side);
        break;
      case 'choices':
        hud.setChoices(e.choices, e.choices?.from ? actorName(e.choices.from) : null);
        break;
      case 'stun':
        if (e.dur > 0) {
          this.pawn()?.stun(e.dur);
          this.playSound(e.kind === 'slip' ? 'splash' : 'thud');
        }
        break;
      case 'bounce':
        this.pawn()?.bounce(e.power);
        this.playSound('boing');
        break;
      case 'chaos':
        hud.setChaos(e.value, e.tier);
        break;
      case 'toast':
        hud.toast(e.text, e.kind);
        this.playSound(e.kind === 'award' ? 'award' : e.kind === 'rule' ? 'rule' : 'chaos');
        break;
      case 'propLanded':
        this.playSound('thud');
        break;
      default:
        break;
    }
  }

  // ============================================================ input

  private doInteract(): void {
    if (this.phase !== 'playing' || !this.sim) {
      return;
    }
    const i = this.sim.interact();
    if (i) {
      for (const e of this.sim.drainEvents()) {
        this.onEvent(e);
      }
    }
  }

  private doThrow(): void {
    if (this.phase !== 'playing' || !this.sim) {
      return;
    }
    const had = this.sim.player.holding;
    this.sim.throwHeld();
    if (had && !this.sim.player.holding) {
      this.pawn()?.gesture('toss');
    }
    for (const e of this.sim.drainEvents()) {
      this.onEvent(e);
    }
  }

  private installInput(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.repeat || !e.isTrusted) {
        // Untrusted = our own synthetic Space from the touch JUMP button.
        return;
      }
      this.unlockAudio();
      this.setDevice('keyboard');
      if (e.code === 'Space' && this.phase === 'playing') {
        e.preventDefault();
        this.jumpBuf.press(performance.now());
      }
      const action = keyAction(e.code, this.phase);
      if (action?.kind === 'pause') {
        e.preventDefault();
      }
      if (action) {
        this.act(action);
      }
    };
    window.addEventListener('keydown', this.keyHandler);
    this.installDragLook();
    this.pointerHandler = (e: PointerEvent) => {
      this.unlockAudio();
      if (e.pointerType === 'touch') {
        this.setDevice('touch');
      } else if (e.pointerType === 'mouse') {
        this.setDevice('keyboard');
      }
    };
    window.addEventListener('pointerdown', this.pointerHandler, true);
  }

  /** One place every device's input lands. */
  private act(a: Action): void {
    switch (a.kind) {
      case 'toggleDebug':
        this.hud?.setDebugVisible(!this.hud.debugVisible);
        return;
      case 'start':
        if (this.phase === 'title') {
          this.startDay(null);
        }
        return;
      case 'nextDay':
        if (this.phase === 'news') {
          this.startDay(null);
        }
        return;
      case 'replayDay':
        if (this.phase === 'news') {
          this.replayDay();
        }
        return;
      case 'resume':
        this.resume();
        return;
      case 'pause':
        this.pause();
        return;
    }
    if (this.phase !== 'playing') {
      return;
    }
    switch (a.kind) {
      case 'interact':
        this.doInteract();
        return;
      case 'throw':
        this.doThrow();
        return;
      case 'choose':
        this.sim?.choose(a.index);
        return;
      case 'unstick':
        this.unstick();
        return;
    }
  }

  private setDevice(d: Device): void {
    if (d === 'touch' && !this.touch) {
      return; // a laptop touchscreen tap: the on-screen sticks were never enabled
    }
    this.device = d;
    this.hud?.setDevice(d, this.padStyle);
  }

  /** The first connected gamepad, as plain data (null when none). */
  private readPad(): PadSnapshot | null {
    let pads: ReadonlyArray<Gamepad | null> = [];
    try {
      pads = globalThis.navigator?.getGamepads?.() ?? [];
    } catch {
      return null;
    }
    for (const p of pads) {
      if (p && p.connected !== false) {
        return { id: p.id, buttons: Array.from(p.buttons, (b) => b.pressed), values: Array.from(p.buttons, (b) => b.value), axes: Array.from(p.axes) };
      }
    }
    return null;
  }

  private pollGamepad(): void {
    const pad = this.readPad();
    this.lastPad = pad;
    if (!pad) {
      this.padEdges.reset();
      return;
    }
    const pressed = this.padEdges.update(pad.buttons);
    if (pressed.length || stickMagnitude(pad.axes, 0.35) > 0) {
      this.padStyle = padStyleFromId(pad.id);
      this.unlockAudio();
      this.setDevice('gamepad');
    }
    const choiceCount = this.sim?.choices?.options.length ?? 0;
    if (this.phase === 'playing' && pressed.includes(0)) {
      this.jumpBuf.press(performance.now()); // A
    }
    for (const b of pressed) {
      const a = padAction(b, this.phase, choiceCount);
      if (a) {
        this.act(a);
      }
    }
  }

  /** Touch JUMP (Athlete Domains: held hops again on landing; a quick tap is buffered). */
  private touchJump(down: boolean): void {
    this.touchJumpHeld = down && this.phase === 'playing';
    if (this.touchJumpHeld) {
      this.jumpBuf.press(performance.now());
    }
  }

  /**
   * One frame of Athlete Domains input → `athleteInput` (read by NeighborPawn):
   * WASD/arrows · left stick · D-pad (unless replies are showing) · phone stick — the strongest wins,
   * turned into world axes by the camera's yaw; Q/E/R/F and the right stick look; Shift, B, RT or
   * full tilt run; Space, A or JUMP jump (buffered).
   */
  private gatherInput(dt: number): void {
    const world = this.world;
    if (!world) {
      return;
    }
    const im = world.inputManager;
    const k = (code: string) => im.isKeyDown(code);
    let look = keyLook(athleteInput.look, { turnLeft: k('KeyQ'), turnRight: k('KeyE'), lookUp: k('KeyR'), lookDown: k('KeyF') }, dt);
    const keys = keysStick(k('KeyW') || k('ArrowUp'), k('KeyS') || k('ArrowDown'), k('KeyA') || k('ArrowLeft'), k('KeyD') || k('ArrowRight'));
    const pad = this.lastPad;
    let padMove: StickVector = STICK_CENTRE;
    let leftTilt = 0;
    let padB = false;
    let padTrigger = 0;
    let padA = false;
    if (pad) {
      const left = padStick(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
      leftTilt = left.magnitude;
      const b = pad.buttons;
      const dpad = (this.sim?.choices ? STICK_CENTRE : keysStick(!!b[12], !!b[13], !!b[14], !!b[15]));
      padMove = strongest(left, dpad);
      const right = padStick(pad.axes[2] ?? 0, pad.axes[3] ?? 0);
      look = padLook(look, right.x, -right.z, dt);
      padB = !!b[1];
      padTrigger = pad.values[7] ?? 0;
      padA = !!b[0];
    }
    const touch = this.stick?.vec ?? STICK_CENTRE;
    const move = strongest(touch, keys, padMove);
    const mover = this.pawn()?.mover;
    const rising = !!mover && !mover.getGrounded() && mover.getVelocities().vertical > 0;
    athleteInput.look = look;
    athleteInput.move = rotateStick(move, look.yaw);
    athleteInput.run = isRunning({ shift: k('ShiftLeft') || k('ShiftRight'), tilt: Math.max(touch.magnitude, leftTilt), padB, padTrigger });
    athleteInput.jump = this.jumpBuf.read(performance.now(), rising, k('Space') || padA || this.touchJumpHeld);
    athleteInput.enabled = true;
  }

  /**
   * Athlete Domains looking round: hold the right mouse button anywhere, or drag on the right half
   * (the left half is the phone stick's). No pointer lock. On touch, a thumb landing on the left
   * side (below the top quarter) starts the floating stick.
   */
  private installDragLook(): void {
    const host = this.world?.gameContainer;
    if (!host) {
      return;
    }
    const down = (e: PointerEvent) => {
      if (this.phase !== 'playing' || this.bot || this.hud?.overlayOpen) {
        return;
      }
      const box = host.getBoundingClientRect();
      const fx = (e.clientX - box.left) / Math.max(1, box.width);
      const fy = (e.clientY - box.top) / Math.max(1, box.height);
      const rightHalf = fx >= 0.5;
      if (e.pointerType === 'touch' && !this.stick && inStickZone(fx, fy)) {
        this.stick = { id: e.pointerId, base: { x: e.clientX, y: e.clientY }, vec: STICK_CENTRE };
        this.hud?.setStick(this.stick.base);
        return;
      }
      const looking = e.pointerType === 'mouse' ? e.button === 2 || (e.button === 0 && rightHalf) : rightHalf;
      if (!looking || this.lookDrag) {
        return;
      }
      try {
        host.setPointerCapture(e.pointerId);
      } catch {
        // Without capture a drag that leaves the window just ends there.
      }
      this.lookDrag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent) => {
      const st = this.stick;
      if (st && st.id === e.pointerId) {
        const knob = { x: e.clientX, y: e.clientY };
        st.base = followBase(st.base, knob);
        st.vec = stickFromOffset(knob.x - st.base.x, knob.y - st.base.y);
        this.hud?.setStick(st.base, knob);
        return;
      }
      const d = this.lookDrag;
      if (d && d.id === e.pointerId) {
        athleteInput.look = dragLook(athleteInput.look, e.clientX - d.x, e.clientY - d.y);
        d.x = e.clientX;
        d.y = e.clientY;
      }
    };
    const up = (e: PointerEvent) => {
      if (this.stick?.id === e.pointerId) {
        this.stick = null;
        this.hud?.setStick(null);
      }
      if (this.lookDrag?.id === e.pointerId) {
        this.lookDrag = null;
      }
    };
    const menu = (e: Event) => e.preventDefault(); // right-drag looks; no context menu
    host.addEventListener('pointerdown', down);
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerup', up);
    host.addEventListener('pointercancel', up);
    host.addEventListener('contextmenu', menu);
    this.dragHandlers = { down, move, up, menu };
  }

  private canvas(): HTMLCanvasElement | null {
    return this.world?.gameContainer?.querySelector('canvas') ?? null;
  }

  private pause(): void {
    if (this.phase !== 'playing') {
      return;
    }
    this.phase = 'paused';
    this.pawn()?.setFrozen(true);
    this.stick = null;
    this.lookDrag = null;
    this.hud?.setStick(null);
    this.hud?.showPause();
  }

  private resume(): void {
    if (this.phase !== 'paused') {
      return;
    }
    this.hud?.closeOverlay();
    this.phase = 'playing';
    this.pawn()?.setFrozen(false);
  }

  /** "I'm stuck!" (pause menu) / Select: quick reset for soft-locks — pop back to the sidewalk in front of you. */
  private unstick(): void {
    const pawn = this.pawn();
    if (!pawn) {
      return;
    }
    const z = this.playerPos.z >= 0 ? 5 : -5;
    pawn.teleport(Math.max(-46, Math.min(46, this.playerPos.x)), G + 2.5, z);
    this.hud?.caption('You dust yourself off on the sidewalk. Nobody saw. (Linda saw.)', 2.6);
  }

  private applySettings(s: Partial<HudSettings>): void {
    const { difficulty, ...rest } = s;
    if (difficulty) {
      this.save.difficulty = difficulty;
      if (this.phase === 'title') {
        this.sim = this.newSim(this.lastSeed);
      }
    }
    this.save.settings = { ...this.save.settings, ...rest };
    this.sfx.setVolume(this.save.settings.volume);
    this.audio?.setVolume(this.save.settings.volume);
    if (this.fx) {
      this.fx.reducedMotion = this.save.settings.reducedMotion;
    }
    this.store.store(serializeSave(this.save));
  }

  // ============================================================ helpers

  private unlockAudio(): void {
    this.sfx.unlock();
    this.audio?.unlock();
  }

  /** A recorded effect if we have one (quieter from across the street), else the synthesized stinger. */
  private playSound(id: string, at: { x: number; z: number } | null = null): void {
    if (this.audio?.hasSfx(id)) {
      const d = at ? Math.hypot(at.x - this.playerPos.x, at.z - this.playerPos.z) : null;
      this.audio.playSfx(id, distanceGain(d));
    } else {
      this.sfx.play(id);
    }
  }


  private pawn(): NeighborPawn | null {
    const p = this.world?.getFirstPlayerPawn();
    return p instanceof NeighborPawn ? p : null;
  }

  private project(actor: string): { x: number; y: number } | null {
    const view = this.actorViews.get(actor);
    const world = this.world;
    const cam = world?.getActiveCamera() as THREE.Camera | null | undefined;
    const container = world?.gameContainer;
    if (!view || !cam || !container || !view.root.visible) {
      return null;
    }
    const p = view.headTop(this.tmp).project(cam);
    if (p.z > 1 || p.z < -1 || Math.abs(p.x) > 1.15 || Math.abs(p.y) > 1.15) {
      return null;
    }
    const w = container.clientWidth;
    const h = container.clientHeight;
    return { x: Math.max(80, Math.min(w - 80, ((p.x + 1) / 2) * w)), y: Math.max(60, ((1 - p.y) / 2) * h) };
  }

  private setupLighting(world: ENGINE.World): void {
    const sun = world.getNodes(ENGINE.DirectionalLightNode)[0];
    if (sun) {
      sun.color = new THREE.Color('#fff1d6');
      sun.position.set(-30, 60, -25);
      sun.lookAt(0, 0, 0);
    }
    world.add(ENGINE.HemisphereLightNode.create({ color: 0xcfeaff, groundColor: 0x7fae4f, intensity: 1.4 }));
    world.add(ENGINE.FogNode.create({ fogMode: ENGINE.FogMode.Linear, fogColor: new THREE.Color('#cfe8ff'), fogNear: 70, fogFar: 190 }));
    if (!params.has('oldart')) {
      // Toon-cel panorama from the Skybox library (see ShippedAssets.ts). The template's SkyNode
      // would draw in front of it, so it is retired.
      world.add(
        ENGINE.SceneEnvironmentNode.create({
          name: 'PleasantPinesSky',
          sourceType: ENGINE.EnvironmentSourceType.Textured,
          textureUrl: SKY_TEXTURE,
          backgroundIntensity: 1,
          backgroundBlurriness: 0,
          envMapIntensity: 0.5,
        }),
      );
      for (const sky of world.getNodes(ENGINE.SkyNode)) {
        sky.setHiddenInGame(true);
      }
    }
  }

  private debugText(): string {
    const sim = this.sim;
    if (!sim) {
      return '';
    }
    const d = sim.director.lastDecision;
    const lines = [
      `EVERYTHING IS FINE! — Director debug   (\` to hide)`,
      `seed ${sim.seed}  day ${sim.day}  t ${sim.t.toFixed(1)}  ${sim.difficulty}  chaos ${sim.chaos.toFixed(0)} (peak ${sim.chaosPeak.toFixed(0)})  phase ${this.phase}`,
      `objective: ${sim.objective()?.text ?? '-'}`,
      `running:`,
      ...sim.running.map((r) => `  [${r.slot}] ${r.def.id} @ ${r.stageId}  roles ${[...r.roles].map(([k, v]) => `${k}=${v}`).join(',')}`),
      `reservations: ${[...sim.actors.values()].filter((a) => a.reservedBy).map((a) => `${a.id}→${a.reservedBy}`).join(' ')}`,
      `last decision (${d?.slot ?? '-'} @${d?.t.toFixed(0) ?? '-'}): picked ${d?.picked ?? 'nothing'}`,
      ...(d?.candidates ?? []).map((c) => `  ${c.ok ? '✓' : '✗'} ${c.id}: ${c.reason}${c.ok ? ` (score ${c.score.toFixed(2)})` : ''}`),
      `memory: ${[...sim.memory.keys()].filter((k) => !k.startsWith('recent.')).join(', ') || '-'}`,
      `timeline:`,
      ...sim.timeline.slice(-14).map((e) => `  ${e.t.toFixed(1)} ${e.source}: ${e.what}`),
    ];
    return lines.join('\n');
  }

  private installDebugApi(): void {
    const self = this;
    const api = {
      get ready(): boolean {
        return self.ready;
      },
      phase: () => this.phase,
      sim: () => this.sim,
      start: (seed?: number) => this.startDay(seed ?? null),
      next: () => this.startDay(null),
      trigger: (id: string) => {
        const def = this.sim?.incidentById(id);
        if (this.sim && def) {
          this.sim.startIncident(def, def.kind === 'ambient' ? 'ambient' : 'major', this.sim.running.find((r) => r.slot === 'mission') ?? null);
        }
        return !!def;
      },
      chaos: (n: number) => this.sim?.addChaos(n, 'debug'),
      tp: (x: number, y: number, z: number) => this.pawn()?.teleport(x, y, z),
      report: () => this.report,
      audio: () => this.audio?.debugState() ?? null,
      debug: (on = true) => this.hud?.setDebugVisible(on),
      look: () => ({ ...athleteInput.look, move: athleteInput.move, run: athleteInput.run }),
      /** Aim the camera (probe framing): yaw 0 looks north (+Z), π looks south. */
      setLook: (yaw: number, pitch?: number) => {
        athleteInput.look = { yaw, pitch: pitch ?? athleteInput.look.pitch };
      },
      sky: () => {
        const w = this.world;
        if (!w) {
          return null;
        }
        const bg = w.getRenderScene().background as THREE.Texture | THREE.Color | null;
        return {
          skyNodes: w.getNodes(ENGINE.SkyNode).map((n) => ({ hiddenInGame: n.isHiddenInGame(), hidden: n.isHidden() })),
          envNodes: w.getNodes(ENGINE.SceneEnvironmentNode).map((n) => ({ name: n.name, url: n.textureUrl, hasTex: !!n.getSceneEnvironmentData().background })),
          background: bg ? ((bg as THREE.Texture).isTexture ? `texture:${(bg as THREE.Texture).name || 'unnamed'}` : 'color') : null,
        };
      },
      stats: () => ({
        phase: this.phase,
        seed: this.lastSeed,
        day: this.save.day,
        t: this.sim?.t ?? 0,
        chaos: Math.round(this.sim?.chaos ?? 0),
        objective: this.sim?.objective()?.text ?? null,
        running: this.sim?.running.map((r) => `${r.def.id}@${r.stageId}`) ?? [],
        completed: this.sim?.completed.map((c) => c.id) ?? [],
        dayOver: this.sim?.dayOver ?? false,
        headline: this.report?.headline ?? null,
        outcome: this.report?.outcome ?? null,
        player: { x: +this.playerPos.x.toFixed(2), y: +this.playerPos.y.toFixed(2), z: +this.playerPos.z.toFixed(2), yaw: +this.playerYaw.toFixed(2) },
        storage: BrowserStore.available(),
      }),
    };
    (globalThis as Record<string, unknown>).__eif = api;
  }
}

function isTouchPrimary(): boolean {
  const forced = params.get('touch');
  if (forced !== null) {
    return forced !== '0';
  }
  try {
    return globalThis.matchMedia?.('(pointer: coarse)').matches === true && globalThis.matchMedia?.('(hover: none)').matches === true;
  } catch {
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export { isTouchPrimary };
