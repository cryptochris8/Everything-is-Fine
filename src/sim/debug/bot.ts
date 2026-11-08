/**
 * Autopilot "player" for headless tests, seed sweeps and the in-game `?bot=1` demo mode.
 * It plays like a reasonable newcomer: follows the objective arrow, picks things up,
 * answers questions, and (if helpful) reacts to complications.
 *
 *   helpful — reacts fast: grabs threatened burgers, throws the toy at a thief, hits switches.
 *   lazy    — does the favour but ignores complications ("let it happen" endings).
 *   slow    — helpful, but at a stroll (misses tight windows; exercises middle outcomes).
 */
import { Rng } from '../core/rng.js';
import { dist, norm, sub, yawOf, type Vec2 } from '../core/vec.js';
import type { Sim } from '../sim.js';

export type BotPolicy = 'helpful' | 'lazy' | 'slow';

export interface BotOptions {
  policy?: BotPolicy;
  /** Fixed choice index, or 'random' (seeded). */
  choice?: number | 'random';
  seed?: number;
  speed?: number;
}

/** Input the bot produced this tick (so a recorder can log exactly what was fed to the sim). */
export interface BotInput {
  pos: Vec2;
  yaw: number;
  interact: boolean;
  throw: boolean;
  choose: number | null;
}

export class Bot {
  private readonly rng: Rng;
  private nextActAt = 0;
  private readonly policy: BotPolicy;
  private readonly speed: number;
  /** Some newcomers chat with Earl in his garage (which unlocks his inventions). */
  private readonly chatsWithEarl: boolean;
  private chatted = false;

  public constructor(private readonly sim: Sim, private readonly opts: BotOptions = {}) {
    this.policy = opts.policy ?? 'helpful';
    this.rng = new Rng(opts.seed ?? 7);
    this.speed = opts.speed ?? (this.policy === 'slow' ? 2.6 : 5);
    this.chatsWithEarl = this.rng.chance(0.5);
  }

  /** Decide this tick's input (does not touch the sim). */
  public decide(dt: number): BotInput {
    const sim = this.sim;
    const p = sim.player;
    const out: BotInput = { pos: { ...p.pos }, yaw: p.yaw, interact: false, throw: false, choose: null };
    if (sim.dayOver) {
      return out;
    }
    if (sim.choices) {
      const n = sim.choices.options.length;
      const c = this.opts.choice;
      out.choose = c === 'random' || c === undefined ? (c === 'random' ? this.rng.int(0, n - 1) : 0) : Math.min(n - 1, c);
      return out;
    }
    const majorRunning = sim.running.some((r) => r.slot === 'major');
    if (this.policy === 'lazy' && majorRunning && !sim.running.some((r) => r.def.id === 'GRANNY_CART_DELIVERY' || r.def.id === 'LINDA_CHARCOAL_PERMIT' || r.def.id === 'QUIET_WALK')) {
      return out;
    }
    if (sim.stunned) {
      return out;
    }

    // Dog has something: helpful bots use the toy if they have it, else chase.
    const dog = sim.actors.get('dog')!;
    const dogHas = [...sim.props.values()].find((x) => x.heldBy === 'dog' && x.id !== 'toy');
    let target: Vec2 | null = sim.objective()?.target ?? null;
    if (dogHas && this.policy !== 'lazy') {
      if (p.holding === 'toy' && dist(p.pos, dog.pos) < 7) {
        out.yaw = yawOf(sub(dog.pos, p.pos));
        out.throw = true;
        return out;
      }
      const toy = sim.props.get('toy')!;
      const wantToy = !p.holding && toy.heldBy === null && !toy.flight && dist(p.pos, toy.pos) < dist(p.pos, dog.pos);
      target = wantToy ? toy.pos : dog.pos;
      if (wantToy && dist(p.pos, toy.pos) < 1.6) {
        out.interact = true;
        return out;
      }
    }
    // Curious newcomers chat with Earl before grabbing the charcoal (unlocks his inventions).
    const earl = sim.actors.get('earl')!;
    const charcoal = sim.props.get('charcoal')!;
    if (this.chatsWithEarl && !this.chatted && !p.holding && charcoal.state === 'stored' && target && dist(target, charcoal.pos) < 0.5 && !earl.reservedBy) {
      target = earl.pos;
      if (dist(p.pos, earl.pos) < 2.0) {
        const i = sim.interaction();
        if (i?.kind === 'talk' && i.actor === 'earl') {
          this.chatted = true;
          out.interact = true;
          return out;
        }
      }
    }
    if (!target) {
      return out;
    }
    const d = dist(p.pos, target);
    if (d > 1.3) {
      const dir = norm(sub(target, p.pos));
      const step = Math.min(d - 1.0, this.speed * dt);
      out.pos = { x: p.pos.x + dir.x * step, z: p.pos.z + dir.z * step };
      out.yaw = yawOf(dir);
    }
    if (d < 2.4 && sim.t >= this.nextActAt) {
      const i = sim.interaction();
      if (i && i.kind !== 'drop') {
        out.interact = true;
        this.nextActAt = sim.t + 0.7;
      }
    }
    return out;
  }

  /** Decide and apply to the sim. */
  public step(dt: number): BotInput {
    const input = this.decide(dt);
    applyInput(this.sim, input);
    return input;
  }
}

export function applyInput(sim: Sim, input: BotInput): void {
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
}

/** Run a whole day headless. Returns the sim when the day ends (or the time cap hits). */
export function simulateDay(sim: Sim, opts: BotOptions = {}, maxSeconds = 900, dt = 1 / 30, log?: BotInput[]): Sim {
  const bot = new Bot(sim, opts);
  while (!sim.dayOver && sim.t < maxSeconds) {
    const input = bot.step(dt);
    log?.push(input);
    sim.tick(dt);
  }
  return sim;
}
