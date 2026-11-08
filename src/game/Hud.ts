/**
 * The HUD: DOM overlay inside the engine's `#ui-container` (above the canvas). Objective,
 * Chaos Meter, interaction prompt, captions, speech bubbles pinned over heads, dialogue
 * choices, toasts, the title card, pause/settings, the Channel 4 news end card, touch
 * buttons and the (hidden by default) Director debug panel.
 *
 * Accessibility: every spoken line is captioned; caption size is a setting; no flashing.
 */
import type { NewsReport } from '../sim/gameplay/news.js';
import type { Interaction } from '../sim/sim.js';
import type { ActiveChoices } from '../sim/world/state.js';
import { PAD, labelsFor, padGlyph, type Device, type Labels, type PadStyle } from './Controls.js';

export interface HudSettings {
  captions: boolean;
  reducedMotion: boolean;
  volume: number;
  captionScale: number;
  difficulty: 'easy' | 'normal' | 'hard';
}

export interface HudCallbacks {
  onStart(): void;
  onResume(): void;
  onChoose(i: number): void;
  onInteract(): void;
  onThrow(): void;
  onNextDay(): void;
  onReplayDay(): void;
  onSettings(s: Partial<HudSettings>): void;
  onResetSave(): void;
  /** Touch JUMP button: true on press, false on release. */
  onJump(down: boolean): void;
  onPause(): void;
  onUnstick(): void;
}

const EMOJI: Record<string, string> = {
  '!': '❗',
  '?': '❓',
  heart: '❤️',
  anger: '💢',
  sweat: '💦',
  music: '🎵',
  zzz: '💤',
  star: '⭐',
  dizzy: '💫',
  laugh: '😂',
  gasp: '😮',
  thumbsup: '👍',
  note: '📝',
};

const CSS = `
.eif-root{position:absolute;inset:0;pointer-events:none;z-index:30;font-family:"Trebuchet MS","Arial Rounded MT Bold","Segoe UI",system-ui,sans-serif;color:#2b2118;user-select:none;-webkit-user-select:none}
.eif-root *{box-sizing:border-box}
.eif-panel{background:rgba(255,250,238,.94);border:3px solid #2b2118;border-radius:14px;box-shadow:0 4px 0 #2b2118}
.eif-obj{position:absolute;left:16px;top:16px;max-width:min(440px,60vw);padding:10px 14px;font-weight:700;font-size:17px;line-height:1.25;display:flex;gap:10px;align-items:flex-start}
.eif-obj .lbl{font-size:11px;letter-spacing:.12em;color:#b0502a;display:block;margin-bottom:2px}
.eif-arrow{width:30px;height:30px;flex:0 0 30px;border-radius:50%;background:#ffd23f;border:2px solid #2b2118;display:flex;align-items:center;justify-content:center;font-size:18px;transition:transform .12s}
.eif-dist{font-size:12px;color:#6b5a48;font-weight:700}
.eif-side{margin-top:6px;padding-top:5px;border-top:2px dashed #d9c9a8;font-size:13px;color:#7a3e1d}
.eif-chaos{position:absolute;right:16px;top:16px;width:min(260px,40vw);padding:8px 12px}
.eif-chaos .row{display:flex;justify-content:space-between;font-weight:900;font-size:13px;letter-spacing:.06em}
.eif-bar{height:16px;border:2px solid #2b2118;border-radius:9px;background:#efe6d2;overflow:hidden;margin-top:5px}
.eif-fill{height:100%;width:0;background:linear-gradient(90deg,#7bed9f,#ffd23f 45%,#ff8a3d 70%,#ff4757);transition:width .25s}
.eif-day{font-size:11px;color:#6b5a48;margin-top:4px;font-weight:700;display:flex;justify-content:space-between}
.eif-prompt{position:absolute;left:50%;bottom:118px;transform:translateX(-50%);padding:8px 16px;font-weight:800;font-size:18px;white-space:nowrap;display:none}
.eif-prompt.hot{background:#fff3b0}
.eif-key{display:inline-block;min-width:26px;padding:1px 7px;margin-right:8px;border:2px solid #2b2118;border-radius:7px;background:#fff;font-weight:900;text-align:center;box-shadow:0 2px 0 #2b2118}
.eif-held{position:absolute;left:50%;bottom:86px;transform:translateX(-50%);font-size:13px;font-weight:700;color:#fff;text-shadow:0 1px 2px #000,0 0 6px #000;display:none;white-space:nowrap}
.eif-caps{position:absolute;left:50%;bottom:168px;transform:translateX(-50%);width:min(760px,92vw);display:flex;flex-direction:column;align-items:center;gap:6px}
.eif-cap{background:rgba(20,16,12,.82);color:#fff;padding:7px 14px;border-radius:10px;font-weight:700;font-size:calc(17px*var(--cs,1));text-align:center;line-height:1.3}
.eif-cap b{color:#ffd23f}
.eif-bubble{position:absolute;transform:translate(-50%,-100%);max-width:min(300px,46vw);padding:7px 11px;font-weight:700;font-size:calc(15px*var(--cs,1));line-height:1.25;text-align:center;pointer-events:none}
.eif-bubble:after{content:"";position:absolute;left:50%;bottom:-11px;margin-left:-8px;border:8px solid transparent;border-top-color:#2b2118}
.eif-bubble .who{display:block;font-size:11px;letter-spacing:.08em;color:#b0502a;font-weight:900}
.eif-emote{position:absolute;transform:translate(-50%,-100%);font-size:30px;filter:drop-shadow(0 2px 0 rgba(0,0,0,.35))}
.eif-choices{position:absolute;right:20px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:8px;width:min(400px,46vw)}
.eif-choice{pointer-events:auto;cursor:pointer;text-align:left;padding:10px 14px;font:inherit;font-weight:800;font-size:17px;background:#fffaf0;border:3px solid #2b2118;border-radius:12px;box-shadow:0 3px 0 #2b2118;color:#2b2118}
.eif-choice:hover{background:#fff3b0}
.eif-toasts{position:absolute;left:50%;top:16px;transform:translateX(-50%);display:flex;flex-direction:column;gap:6px;align-items:center;width:min(520px,60vw)}
.eif-toast{padding:8px 14px;font-weight:800;font-size:15px;text-align:center}
.eif-toast.rule{background:#ffe0e0}.eif-toast.award{background:#fff3b0}.eif-toast.callback{background:#e0f2ff}
.eif-over{position:absolute;inset:0;pointer-events:auto;display:flex;align-items:center;justify-content:center;background:rgba(43,33,24,.45);padding:16px}
.eif-card{max-width:620px;width:100%;padding:22px 24px;max-height:94vh;overflow:auto}
.eif-title{font-size:clamp(34px,7vw,64px);font-weight:900;line-height:.95;letter-spacing:-.01em;color:#ff5a36;text-shadow:3px 3px 0 #2b2118;-webkit-text-stroke:2px #2b2118;margin:0}
.eif-sub{font-size:18px;font-weight:800;margin:8px 0 2px}
.eif-tag{font-style:italic;color:#6b5a48;margin:0 0 14px}
.eif-btn{pointer-events:auto;cursor:pointer;font:inherit;font-weight:900;font-size:18px;padding:10px 18px;margin:4px 6px 4px 0;border:3px solid #2b2118;border-radius:12px;background:#ffd23f;box-shadow:0 3px 0 #2b2118;color:#2b2118}
.eif-btn.alt{background:#fffaf0}
.eif-controls{font-size:14px;line-height:1.6;margin-top:12px;color:#4a3c2e}
.eif-set{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0;font-weight:700}
.eif-news{background:#14213d;color:#fff;border-color:#000}
.eif-news .ch{display:flex;justify-content:space-between;font-size:12px;letter-spacing:.14em;font-weight:900;color:#ffd23f}
.eif-news h2{font-size:clamp(22px,4vw,32px);line-height:1.1;margin:10px 0;color:#fff;text-transform:uppercase}
.eif-news .lower{background:#e63946;padding:4px 10px;font-weight:900;letter-spacing:.08em;display:inline-block;margin-bottom:8px}
.eif-news p{margin:8px 0;line-height:1.4;color:#e8eaf0}
.eif-news .stats{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0;font-weight:900}
.eif-news .stats span{background:#fca311;color:#14213d;padding:4px 10px;border-radius:8px}
.eif-news .note{font-size:14px;color:#ffd23f;margin:4px 0}
.eif-touch{position:absolute;right:20px;bottom:230px;display:none;grid-template-columns:76px 76px;gap:12px}
.eif-touch button{pointer-events:auto;touch-action:none;width:76px;height:76px;border-radius:50%;font:inherit;font-weight:900;font-size:15px;border:3px solid #2b2118;background:#ffd23f;box-shadow:0 3px 0 #2b2118;color:#2b2118}
.eif-touch button.alt{background:#fffaf0}
.eif-touch button.on{background:#ff8a3d;color:#fff}
.eif-touch button.jump{grid-column:span 2;justify-self:end}
.eif-stick{position:absolute;display:none;width:112px;height:112px;margin:-56px 0 0 -56px;border-radius:50%;background:rgba(255,250,238,.28);border:3px solid rgba(43,33,24,.45);pointer-events:none}
.eif-knob{position:absolute;left:31px;top:31px;width:44px;height:44px;border-radius:50%;background:rgba(255,210,63,.9);border:3px solid #2b2118}
.eif-tpause{position:absolute;right:16px;top:112px;display:none;pointer-events:auto;touch-action:none;width:52px;height:52px;border-radius:50%;font:inherit;font-weight:900;font-size:18px;border:3px solid #2b2118;background:#fffaf0;box-shadow:0 3px 0 #2b2118;color:#2b2118}
.eif-pad{display:none;margin:0 0 0 8px}
.dev-pad .eif-pad{display:inline-block}
.eif-debug{position:absolute;left:16px;bottom:16px;width:min(560px,70vw);max-height:46vh;overflow:auto;background:rgba(0,0,0,.78);color:#9effa0;font:12px/1.35 Consolas,monospace;padding:8px;border-radius:8px;white-space:pre-wrap;display:none;pointer-events:auto}
.eif-hint{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);padding:10px 16px;font-weight:900;font-size:18px;display:none}
@media (max-width:640px){.eif-obj{font-size:14px;top:10px;left:10px}.eif-chaos{top:10px;right:10px}.eif-prompt{font-size:15px;bottom:140px}}
`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent?: HTMLElement, html?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (html !== undefined) {
    e.innerHTML = html;
  }
  parent?.appendChild(e);
  return e;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

interface Bubble {
  el: HTMLDivElement;
  actor: string;
  left: number;
  emote: boolean;
  /** Caption text to show if the speaker is off-screen when the line starts. */
  pendingCaption: string | null;
  dur: number;
}

export class Hud {
  public readonly root: HTMLDivElement;
  private readonly obj: HTMLDivElement;
  private readonly objText: HTMLDivElement;
  private readonly arrow: HTMLDivElement;
  private readonly chaosFill: HTMLDivElement;
  private readonly chaosLabel: HTMLSpanElement;
  private readonly dayLabel: HTMLDivElement;
  private readonly prompt: HTMLDivElement;
  private readonly held: HTMLDivElement;
  private readonly caps: HTMLDivElement;
  private readonly choicesBox: HTMLDivElement;
  private readonly toasts: HTMLDivElement;
  private readonly touch: HTMLDivElement;
  private readonly debugBox: HTMLDivElement;
  private readonly hint: HTMLDivElement;
  private overlay: HTMLDivElement | null = null;
  private bubbles: Bubble[] = [];
  private settings: HudSettings;
  public touchMode = false;
  private device: Device = 'keyboard';
  private padStyle: PadStyle = 'xbox';
  private labels: Labels = labelsFor('keyboard', 'xbox');
  private readonly stickBase: HTMLDivElement;
  private readonly stickKnob: HTMLDivElement;
  private readonly pauseBtn: HTMLButtonElement;
  private controlsLine: HTMLElement | null = null;
  private lastChoices: { c: ActiveChoices; fromName: string | null } | null = null;

  public constructor(host: HTMLElement, private readonly cb: HudCallbacks, settings: HudSettings) {
    this.settings = { ...settings };
    const style = document.createElement('style');
    style.textContent = CSS;
    host.appendChild(style);
    this.root = el('div', 'eif-root', host);
    this.obj = el('div', 'eif-obj eif-panel', this.root);
    this.arrow = el('div', 'eif-arrow', this.obj, '➜');
    this.objText = el('div', '', this.obj);
    this.obj.style.display = 'none';
    const chaos = el('div', 'eif-chaos eif-panel', this.root);
    const row = el('div', 'row', chaos);
    el('span', '', row, 'CHAOS METER');
    this.chaosLabel = el('span', '', row, 'CALM');
    this.chaosFill = el('div', 'eif-fill', el('div', 'eif-bar', chaos));
    this.dayLabel = el('div', 'eif-day', chaos);
    this.caps = el('div', 'eif-caps', this.root);
    this.prompt = el('div', 'eif-prompt eif-panel', this.root);
    this.held = el('div', 'eif-held', this.root);
    this.choicesBox = el('div', 'eif-choices', this.root);
    this.toasts = el('div', 'eif-toasts', this.root);
    this.hint = el('div', 'eif-hint eif-panel', this.root);
    this.touch = el('div', 'eif-touch', this.root);
    const tb = (label: string, cls: string, fn: () => void, up?: () => void) => {
      const b = el('button', cls, this.touch, label);
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        fn();
      });
      if (up) {
        const release = (e: Event) => {
          e.stopPropagation();
          up();
        };
        b.addEventListener('pointerup', release);
        b.addEventListener('pointercancel', release);
        b.addEventListener('pointerleave', release);
      }
      return b;
    };
    tb('USE', '', () => this.cb.onInteract());
    tb('THROW', '', () => this.cb.onThrow());
    tb('JUMP', 'alt jump', () => this.cb.onJump(true), () => this.cb.onJump(false));
    // Athlete Domains' floating stick: drawn wherever the thumb lands on the left side.
    this.stickBase = el('div', 'eif-stick', this.root);
    this.stickKnob = el('div', 'eif-knob', this.stickBase);
    this.pauseBtn = el('button', 'eif-tpause', this.root, '❚❚');
    this.pauseBtn.setAttribute('aria-label', 'Pause');
    this.pauseBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.cb.onPause();
    });
    this.debugBox = el('div', 'eif-debug', this.root);
    this.applySettings();
  }

  // ------------------------------------------------------------- persistent widgets

  public setObjective(text: string | null, side: string | null = null): void {
    this.obj.style.display = text ? 'flex' : 'none';
    if (text) {
      this.objText.innerHTML = `<span class="lbl">OBJECTIVE</span>${esc(text)}<div class="eif-dist"></div>${side ? `<div class="eif-side">⚡ Also happening: ${esc(side)}</div>` : ''}`;
    }
  }

  /** angle: radians, 0 = straight ahead of the camera, positive = to the right. */
  public setObjectiveDirection(angle: number | null, distance: number | null): void {
    this.arrow.style.visibility = angle === null ? 'hidden' : 'visible';
    if (angle !== null) {
      this.arrow.style.transform = `rotate(${angle - Math.PI / 2}rad)`;
    }
    const d = this.objText.querySelector('.eif-dist');
    if (d) {
      d.textContent = distance !== null && distance > 3 ? `${Math.round(distance)} m` : distance !== null ? 'here!' : '';
    }
  }

  public setChaos(value: number, tier: number): void {
    this.chaosFill.style.width = `${Math.max(0, Math.min(100, value))}%`;
    this.chaosLabel.textContent = ['CALM', 'LIVELY', 'WILD', 'UNHINGED'][tier] ?? 'CALM';
  }

  public setDay(day: number, difficulty: string, seed: number): void {
    this.dayLabel.innerHTML = `<span>DAY ${day}</span><span>${difficulty.toUpperCase()} · seed ${seed}</span>`;
  }

  public setPrompt(i: Interaction | null, holding: string | null, canThrow: boolean): void {
    if (!i) {
      this.prompt.style.display = 'none';
    } else {
      const key = this.labels.interact;
      this.prompt.style.display = 'block';
      this.prompt.classList.toggle('hot', 'highlight' in i ? i.highlight : i.kind === 'place' || i.kind === 'give');
      this.prompt.innerHTML = `<span class="eif-key">${key}</span>${esc(i.prompt)}`;
    }
    this.held.style.display = holding ? 'block' : 'none';
    if (holding) {
      this.held.textContent = `Holding: ${holding}${canThrow ? `  ·  ${this.labels.throw} to throw` : ''}`;
    }
  }

  public setHint(text: string | null): void {
    this.hint.style.display = text ? 'block' : 'none';
    if (text) {
      this.hint.textContent = text;
    }
  }

  public setTouchMode(on: boolean): void {
    this.touchMode = on;
    this.refreshDevice();
  }

  /** Switch button labels (and touch buttons) to the device the player last used. */
  public setDevice(device: Device, style: PadStyle): void {
    if (device === this.device && style === this.padStyle) {
      return;
    }
    this.device = device;
    this.padStyle = style;
    this.refreshDevice();
  }

  public get activeDevice(): Device {
    return this.device;
  }

  private refreshDevice(): void {
    this.labels = labelsFor(this.device, this.padStyle);
    const showTouch = this.touchMode && this.device === 'touch';
    this.touch.style.display = showTouch ? 'grid' : 'none';
    this.pauseBtn.style.display = showTouch ? 'block' : 'none';
    this.root.classList.toggle('dev-pad', this.device === 'gamepad');
    for (const span of this.root.querySelectorAll<HTMLElement>('.eif-pad[data-pad]')) {
      span.textContent = padGlyph(Number(span.dataset.pad), this.padStyle);
    }
    if (this.controlsLine) {
      this.controlsLine.innerHTML = this.labels.summary;
    }
    if (this.lastChoices) {
      this.setChoices(this.lastChoices.c, this.lastChoices.fromName);
    }
  }

  /** Show the floating stick: base centre and knob centre in viewport CSS pixels (null hides it). */
  public setStick(base: { x: number; y: number } | null, knob?: { x: number; y: number }): void {
    if (!base) {
      this.stickBase.style.display = 'none';
      return;
    }
    const host = this.root.getBoundingClientRect();
    this.stickBase.style.display = 'block';
    this.stickBase.style.left = `${base.x - host.left}px`;
    this.stickBase.style.top = `${base.y - host.top}px`;
    const k = knob ?? base;
    this.stickKnob.style.transform = `translate(${k.x - base.x}px, ${k.y - base.y}px)`;
  }

  /** A gamepad glyph badge that only shows while a gamepad is the active device. */
  private padBadge(button: number): string {
    return `<span class="eif-key eif-pad" data-pad="${button}">${esc(padGlyph(button, this.padStyle))}</span>`;
  }

  // ------------------------------------------------------------- transient text

  public caption(html: string, dur: number): void {
    const c = el('div', 'eif-cap', this.caps, html);
    while (this.caps.children.length > 3) {
      this.caps.firstChild?.remove();
    }
    window.setTimeout(() => c.remove(), Math.max(1200, dur * 1000));
  }

  public say(actorId: string, name: string, text: string, dur: number): void {
    this.bubbles = this.bubbles.filter((b) => {
      if (b.actor === actorId && !b.emote) {
        b.el.remove();
        return false;
      }
      return true;
    });
    const e = el('div', 'eif-bubble eif-panel', this.root, `<span class="who">${esc(name.toUpperCase())}</span>${esc(text)}`);
    e.style.display = 'none';
    // On-screen speakers get a bubble; off-screen ones get a caption (so nothing is missed).
    this.bubbles.push({ el: e, actor: actorId, left: dur, emote: false, pendingCaption: `<b>${esc(name)}:</b> ${esc(text)}`, dur });
  }

  public emote(actorId: string, emote: string): void {
    const e = el('div', 'eif-emote', this.root, EMOJI[emote] ?? '❗');
    e.style.display = 'none';
    this.bubbles.push({ el: e, actor: actorId, left: 1.6, emote: true, pendingCaption: null, dur: 1.6 });
  }

  /** project: actor id → screen position above the head (null if off-screen / unknown). */
  public updateBubbles(dt: number, project: (actor: string) => { x: number; y: number } | null): void {
    const stack = new Map<string, number>();
    this.bubbles = this.bubbles.filter((b) => {
      b.left -= dt;
      if (b.left <= 0) {
        b.el.remove();
        return false;
      }
      const p = project(b.actor);
      if (b.pendingCaption) {
        if (!p && this.settings.captions) {
          this.caption(b.pendingCaption, b.dur);
        }
        b.pendingCaption = null;
      }
      if (!p) {
        b.el.style.display = 'none';
        return true;
      }
      const lift = stack.get(b.actor) ?? 0;
      b.el.style.display = 'block';
      b.el.style.left = `${p.x}px`;
      b.el.style.top = `${p.y - lift - (b.emote ? 0 : 0)}px`;
      stack.set(b.actor, lift + (b.emote ? 34 : 0));
      return true;
    });
  }

  public setChoices(c: ActiveChoices | null, fromName: string | null): void {
    this.choicesBox.innerHTML = '';
    this.lastChoices = c ? { c, fromName } : null;
    if (!c) {
      return;
    }
    const count = c.options.length;
    if (fromName) {
      el('div', 'eif-cap', this.choicesBox, `<b>Reply to ${esc(fromName)}:</b>`);
    }
    for (const o of c.options) {
      const b = el('button', 'eif-choice', this.choicesBox, `<span class="eif-key">${esc(this.labels.reply(o.index, count))}</span>${esc(o.text)}`);
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.cb.onChoose(o.index);
      });
    }
  }

  public toast(text: string, kind: string): void {
    const t = el('div', `eif-toast eif-panel ${kind}`, this.toasts, esc(text));
    while (this.toasts.children.length > 3) {
      this.toasts.firstChild?.remove();
    }
    window.setTimeout(() => t.remove(), kind === 'info' ? 2600 : 4200);
  }

  public clearTransient(): void {
    this.caps.innerHTML = '';
    this.toasts.innerHTML = '';
    this.choicesBox.innerHTML = '';
    this.lastChoices = null;
    for (const b of this.bubbles) {
      b.el.remove();
    }
    this.bubbles = [];
  }

  // ------------------------------------------------------------- overlays

  private openOverlay(): HTMLDivElement {
    this.closeOverlay();
    this.overlay = el('div', 'eif-over', this.root);
    this.overlay.addEventListener('pointerdown', (e) => e.stopPropagation());
    return this.overlay;
  }

  public closeOverlay(): void {
    this.overlay?.remove();
    this.overlay = null;
    this.controlsLine = null;
  }

  public get overlayOpen(): boolean {
    return this.overlay !== null;
  }

  public showTitle(day: number, headlines: string[], hasSave: boolean): void {
    const o = this.openOverlay();
    const card = el('div', 'eif-card eif-panel', o);
    el('h1', 'eif-title', card, 'EVERYTHING<br>IS FINE!');
    el('div', 'eif-sub', card, 'Welcome to Pleasant Pines');
    el('p', 'eif-tag', card, 'Good neighbors. Bad decisions. Endless possibilities.');
    if (hasSave && headlines.length) {
      el('div', 'eif-controls', card, `<b>Previously in Pleasant Pines:</b><br>${headlines.slice(-2).map((h) => `📰 ${esc(h)}`).join('<br>')}`);
    }
    const start = el('button', 'eif-btn', card, `${day > 1 ? `START DAY ${day}` : 'MOVE IN'}${this.padBadge(PAD.A)}`);
    start.addEventListener('click', () => this.cb.onStart());
    const diff = el('button', 'eif-btn alt', card, `Difficulty: ${this.settings.difficulty.toUpperCase()}`);
    diff.addEventListener('click', () => {
      const order = ['easy', 'normal', 'hard'] as const;
      const next = order[(order.indexOf(this.settings.difficulty) + 1) % 3]!;
      this.settings.difficulty = next;
      diff.textContent = `Difficulty: ${next.toUpperCase()}`;
      this.cb.onSettings({ difficulty: next });
    });
    const set = el('button', 'eif-btn alt', card, 'Settings');
    set.addEventListener('click', () => this.showSettings(() => this.showTitle(day, headlines, hasSave)));
    this.controlsLine = el('div', 'eif-controls', card, this.labels.summary);
    el('div', 'eif-controls', card, '<span style="font-size:12px">An AppalachAI Studios game.</span>');
  }

  public showPause(): void {
    const o = this.openOverlay();
    const card = el('div', 'eif-card eif-panel', o);
    el('div', 'eif-sub', card, 'Paused. Everything is fine.');
    const resume = el('button', 'eif-btn', card, `RESUME${this.padBadge(PAD.START)}`);
    resume.addEventListener('click', () => this.cb.onResume());
    const stuck = el('button', 'eif-btn alt', card, `I'm stuck!${this.padBadge(PAD.SELECT)}`);
    stuck.addEventListener('click', () => {
      this.cb.onUnstick();
      this.cb.onResume();
    });
    this.settingsBody(card);
  }

  public showSettings(back: () => void): void {
    const o = this.openOverlay();
    const card = el('div', 'eif-card eif-panel', o);
    el('div', 'eif-sub', card, 'Settings');
    this.settingsBody(card);
    const b = el('button', 'eif-btn', card, 'BACK');
    b.addEventListener('click', back);
  }

  private settingsBody(card: HTMLElement): void {
    const s = this.settings;
    const row = (label: string, control: HTMLElement) => {
      const r = el('label', 'eif-set', card);
      el('span', '', r, label);
      r.appendChild(control);
    };
    const diff = document.createElement('select');
    for (const d of ['easy', 'normal', 'hard']) {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d.toUpperCase();
      opt.selected = s.difficulty === d;
      diff.appendChild(opt);
    }
    diff.style.pointerEvents = 'auto';
    diff.addEventListener('change', () => this.update({ difficulty: diff.value as HudSettings['difficulty'] }));
    row('Difficulty (applies from the next day)', diff);
    const check = (key: 'captions' | 'reducedMotion') => {
      const c = document.createElement('input');
      c.type = 'checkbox';
      c.checked = s[key];
      c.style.pointerEvents = 'auto';
      c.addEventListener('change', () => this.update({ [key]: c.checked }));
      return c;
    };
    row('Caption off-screen dialogue', check('captions'));
    row('Reduced motion / fewer effects', check('reducedMotion'));
    const range = (key: 'volume' | 'captionScale', min: number, max: number, step: number) => {
      const c = document.createElement('input');
      c.type = 'range';
      c.min = String(min);
      c.max = String(max);
      c.step = String(step);
      c.value = String(s[key]);
      c.style.pointerEvents = 'auto';
      c.addEventListener('input', () => this.update({ [key]: Number(c.value) }));
      return c;
    };
    row('Volume', range('volume', 0, 1, 0.05));
    row('Text size', range('captionScale', 0.8, 1.6, 0.1));
    const reset = el('button', 'eif-btn alt', card, 'Forget the neighborhood (reset save)');
    reset.addEventListener('click', () => {
      if (reset.dataset.armed) {
        this.cb.onResetSave();
      } else {
        reset.dataset.armed = '1';
        reset.textContent = 'Click again: everyone forgets you';
      }
    });
  }

  private update(p: Partial<HudSettings>): void {
    this.settings = { ...this.settings, ...p };
    this.applySettings();
    this.cb.onSettings(p);
  }

  private applySettings(): void {
    this.root.style.setProperty('--cs', String(this.settings.captionScale));
  }

  public showNews(r: NewsReport, nextDay: number): void {
    const o = this.openOverlay();
    const card = el('div', 'eif-card eif-panel eif-news', o);
    el('div', 'ch', card, `<span>📺 PLEASANT PINES LOCAL NEWS</span><span>CHANNEL 4 · DAY ${r.day}</span>`);
    el('h2', '', card, esc(r.headline));
    el('div', 'lower', card, `TONIGHT: ${esc(r.outcomeTitle.toUpperCase())}`);
    for (const s of r.stories) {
      el('p', '', card, esc(s));
    }
    el(
      'div',
      'stats',
      card,
      `<span>Problems solved: ${r.stats.problemsSolved}</span><span>New problems: ${r.stats.problemsCreated}</span><span>Peak chaos: ${r.stats.chaosPeak}%</span>`,
    );
    for (const rule of r.newRules) {
      el('div', 'note', card, `📋 New HOA rule: ${esc(rule)}`);
    }
    for (const a of r.awards) {
      el('div', 'note', card, `🏅 ${esc(a)}`);
    }
    el('p', '', card, `<i>"Back to you." — ${esc(r.anchor)}</i>`);
    const next = el('button', 'eif-btn', card, `NEXT DAY (DAY ${nextDay}) ➜${this.padBadge(PAD.A)}`);
    next.addEventListener('click', () => this.cb.onNextDay());
    const again = el('button', 'eif-btn alt', card, `Replay this day (same seed)${this.padBadge(PAD.Y)}`);
    again.addEventListener('click', () => this.cb.onReplayDay());
    el('div', 'eif-controls', card, `<span style="font-size:12px;color:#aab">Share this day: seed ${r.seed}</span>`);
  }

  // ------------------------------------------------------------- debug

  public setDebugVisible(on: boolean): void {
    this.debugBox.style.display = on ? 'block' : 'none';
  }

  public get debugVisible(): boolean {
    return this.debugBox.style.display === 'block';
  }

  public setDebug(text: string): void {
    if (this.debugVisible) {
      this.debugBox.textContent = text;
    }
  }

  public get currentSettings(): HudSettings {
    return { ...this.settings };
  }
}
