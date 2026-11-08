/**
 * The residents of Pleasant Pines. Each owns a recognisable cause-and-effect pattern
 * (blueprint 04): Randy is always sure he can grill, Linda prioritises paperwork over
 * catastrophe, Earl is sincere and wrong about safety margins, Granny arrives uninvited
 * with high-risk transportation.
 *
 * `talk` groups are tried in order; the first whose `when` passes supplies the line. Memory
 * callbacks sit at the top so the world remembers what you did yesterday.
 */
import type { ActorAnim, Cond, Lines } from '../comedy/types.js';
import type { Vec2 } from '../core/vec.js';
import type { SpotId } from '../world/layout.js';

export interface RoutineStep {
  at: SpotId;
  offset?: Vec2;
  wait: readonly [number, number];
  anim?: ActorAnim;
  bark?: Lines;
  /** Chance the bark is said on arrival. */
  barkChance?: number;
}

export interface TalkGroup {
  when?: Cond;
  lines: Lines;
}

export interface ActorDef {
  id: string;
  name: string;
  /** Short description for the debug panel / recap. */
  role: string;
  home: SpotId;
  homeOffset?: Vec2;
  /** Multiplier on style speeds. */
  speed: number;
  /** Prompt verb when the player interacts. */
  verb: string;
  routine: readonly RoutineStep[];
  talk: readonly TalkGroup[];
  /** Hidden until an incident shows them (Todd only appears to fly). */
  startsHidden?: boolean;
  /** Small, low actors (dog, chickens) use a lower interact height in the adapter. */
  size: 'small' | 'medium' | 'large';
  traits: readonly string[];
}

export const STYLE_SPEED: Readonly<Record<string, number>> = {
  stroll: 1.4,
  walk: 2.3,
  waddle: 1.7,
  run: 4.4,
  sprint: 6.2,
  drive: 7.5,
};

export const CAST: readonly ActorDef[] = [
  {
    id: 'randy',
    name: 'Big Randy',
    role: 'barbecue evangelist',
    home: 'grill',
    homeOffset: { x: 0.2, z: -1.6 },
    speed: 0.95,
    verb: 'Talk to Big Randy',
    size: 'large',
    traits: ['generous', 'optimistic', 'grill-confident', 'gadget-lover'],
    routine: [
      { at: 'grill', offset: { x: 0.2, z: -1.6 }, wait: [6, 10], anim: 'grill', bark: ['Smell that? That\'s confidence.', 'Low and slow. Or high and fast. Either way, flavor.'], barkChance: 0.3 },
      { at: 'picnicTable', offset: { x: 0, z: -1.4 }, wait: [4, 6], anim: 'proud', bark: ['Ladies and gentlemen... the cookout.', 'Picture it. Burgers. Here. Legendary.'], barkChance: 0.5 },
    ],
    talk: [
      { when: { memory: 'grill_ruined' }, lines: ["The big grill's resting. This little camp stove's got heart, though.", 'Lost a grill, gained a story. That\'s a good trade, right? Right?'] },
      { when: { memory: 'dog_head_chef' }, lines: ['Brisket has been asking about a raise. I said "after the probation period."', 'Brisket runs the grill on Tuesdays now. Union rules.'] },
      { when: { memory: 'randy.guards_food' }, lines: ["New burger security system. It's me. I am the system.", 'Nobody touches the burgers. Not you. Not Brisket. Not even me, emotionally.'] },
      { when: { memory: 'water_bbq' }, lines: ['Folks are already asking about next year\'s Water BBQ. I said bring floaties.', 'Annual Water BBQ! I\'m calling it annual. It happened once. That counts.'] },
      { when: { affinity: 'randy', gte: 3 }, lines: ["There's my favorite neighbor! Don't tell the others. They know.", 'You and me, neighbor. Grill buddies. Grill... pals. Grillmates. I\'ll workshop it.'] },
      { lines: ["Now that's not smoke. That's flavor finding its way out.", "I've been grilling for thirty years. Some of them successfully.", 'Burgers are like people. You gotta flip \'em at the right time.'] },
    ],
  },
  {
    id: 'linda',
    name: 'Linda',
    role: 'HOA president',
    home: 'lindaHedges',
    homeOffset: { x: 0, z: 1.8 },
    speed: 1.05,
    verb: 'Talk to Linda',
    size: 'medium',
    traits: ['procedural', 'hyper-organized', 'rule-focused'],
    routine: [
      { at: 'lindaHedges', offset: { x: 0, z: 1.8 }, wait: [5, 8], anim: 'write', bark: ['Hedge height: compliant. Hedge attitude: concerning.', 'Seven point two inches. Unacceptable. Wonderful.'], barkChance: 0.35 },
      { at: 'hoaBoard', offset: { x: 0, z: -1.2 }, wait: [4, 7], anim: 'point', bark: ['Notice posted. Notice noticed. Excellent.'], barkChance: 0.4 },
      { at: 'lindaGnome', offset: { x: 1.2, z: 0 }, wait: [3, 5], anim: 'write', bark: ['Sir Reginald, you look immaculate.'], barkChance: 0.5 },
    ],
    talk: [
      { when: { memory: 'hoa.rule.airborne_catering' }, lines: ['Rule 14-B: catering must remain grounded at all times. I wrote it for you. Personally.', 'Per the new bylaws, burgers may not exceed an altitude of four feet.'] },
      { when: { memory: 'hoa.rule.water_events' }, lines: ['All water-based social events now require a Puddle Permit. Form 7-W. In triplicate.'] },
      { when: { memory: 'hoa.rule.chicken_seating' }, lines: ['Poultry may no longer occupy VIP seating. They were very polite about it, which made it harder.'] },
      { when: { memory: 'hoa.rule.mower_art' }, lines: ['All lawn patterns must now be pre-approved. Especially arrows. Especially arrows pointing at me.'] },
      { when: { memory: 'linda.clipboard_saved' }, lines: ['You saved my clipboard. I have filed a commendation. It is also a clipboard.'] },
      { lines: ["The incident itself isn't against the rules. Your lawn chair placement is.", 'Welcome to Pleasant Pines! Your mailbox is two degrees off plumb. Welcome!', 'I don\'t care what happens here. I care that it happens in compliance.'] },
    ],
  },
  {
    id: 'earl',
    name: 'Uncle Earl',
    role: 'enthusiastic inventor',
    home: 'earlWorkbench',
    homeOffset: { x: -1.2, z: -0.8 },
    speed: 0.9,
    verb: 'Talk to Uncle Earl',
    size: 'medium',
    traits: ['creative', 'sincere', 'safety-optimistic'],
    routine: [
      { at: 'earlWorkbench', offset: { x: -1.2, z: -0.8 }, wait: [7, 11], anim: 'grill', bark: ['Just needs more torque.', 'If it explodes, that\'s data.'], barkChance: 0.3 },
      { at: 'earlMailbox', offset: { x: 0.8, z: 1.2 }, wait: [3, 5], anim: 'point', bark: ['Self-opening mailbox, version nine. Stand back. Further.'], barkChance: 0.6 },
    ],
    talk: [
      { when: { memory: 'flipper_flung' }, lines: ['Flip-O-Matic 4000 is almost ready. Now it flips the burgers AND apologizes.', 'I added a seatbelt to the spatula. For the burgers.'] },
      { when: { memory: 'mower_art' }, lines: ['Mow-Bot learned art. I didn\'t teach it art. I\'m very proud and a little scared.'] },
      { when: { memory: 'chickens_freed' }, lines: ['The chickens have tasted freedom. Now they want dental.'] },
      { lines: ['The good news is it worked. The bad news is it worked twice.', 'Every invention is safe if you stand far enough away. That\'s just math.', 'I\'m automating chores! Next: automating the automating.'] },
    ],
  },
  {
    id: 'granny',
    name: 'Granny Darlene',
    role: 'self-appointed neighborhood sheriff',
    home: 'cartPark',
    homeOffset: { x: 0, z: -1.4 },
    speed: 0.8,
    verb: 'Talk to Granny Darlene',
    size: 'medium',
    traits: ['fiercely helpful', 'overconfident driver', 'proud', 'loyal'],
    routine: [
      { at: 'cartPark', offset: { x: 0, z: -1.4 }, wait: [6, 9], anim: 'idle', bark: ['Quiet street. Too quiet. Suspiciously quiet.'], barkChance: 0.3 },
      { at: 'grannyGarden', offset: { x: 1.4, z: 0 }, wait: [5, 7], anim: 'proud', bark: ['Those tomatoes have seen things.'], barkChance: 0.4 },
    ],
    talk: [
      { when: { memory: 'deputized' }, lines: ['Morning, Deputy. Keep your eyes peeled. The squirrels are organizing.', "Deputy! Good. I need backup. For nothing yet. But soon."] },
      { when: { memory: 'granny.cart_crash' }, lines: ['That hedge jumped out at me. I\'ve filed a report against the hedge.', 'The cart has a new dent. I call it character.'] },
      { lines: ["Don't you worry. I've handled worse at the church potluck.", 'Need a ride? The cart does zero to thirty. Mostly sideways.', 'I keep the peace around here. Mostly by disturbing it first.'] },
    ],
  },
  {
    id: 'dog',
    name: 'Brisket',
    role: "Randy's dog, master criminal",
    home: 'dogHouse',
    homeOffset: { x: 0.6, z: -1.6 },
    speed: 1,
    verb: 'Pet Brisket',
    size: 'small',
    traits: ['food-motivated', 'squeak-motivated', 'innocent-looking'],
    routine: [
      { at: 'dogHouse', offset: { x: 0.6, z: -1.6 }, wait: [5, 9], anim: 'sit' },
      { at: 'picnicTable', offset: { x: 1.5, z: 1 }, wait: [3, 5], anim: 'sniff' },
      { at: 'grill', offset: { x: -1.5, z: -1.2 }, wait: [3, 6], anim: 'beg' },
      { at: 'randyPorch', offset: { x: 1, z: -2 }, wait: [3, 5], anim: 'sniff' },
    ],
    talk: [
      { when: { memory: 'dog_head_chef' }, lines: ['Brisket is wearing a tiny chef hat. Nobody gave Brisket a tiny chef hat.'] },
      { lines: ['Brisket wags so hard his whole body agrees.', 'Brisket smells burgers on you. Brisket forgives you for not sharing. For now.', 'Brisket rolls over. This is a trap. You pet him anyway.'] },
    ],
  },
  {
    id: 'todd',
    name: 'Todd',
    role: 'trampoline commuter',
    home: 'trampoline',
    speed: 1.1,
    verb: 'Talk to Todd',
    size: 'medium',
    startsHidden: true,
    traits: ['airborne', 'unbothered'],
    routine: [{ at: 'trampoline', wait: [8, 12], anim: 'idle' }],
    talk: [{ lines: ["Morning! Don't mind me. Commuting.", 'Best way to get the mail. Straight down.', "Hey neighbor! Love the boxes. Very... boxy."] }],
  },
  {
    id: 'mower',
    name: 'Mow-Bot 9000',
    role: "Earl's robot mower",
    home: 'earlMailbox',
    homeOffset: { x: 4, z: 5 },
    speed: 0.7,
    verb: 'Hit the Mow-Bot\'s off switch',
    size: 'small',
    traits: ['ambitious', 'artistic'],
    routine: [{ at: 'earlMailbox', offset: { x: 4, z: 5 }, wait: [10, 14], anim: 'idle' }],
    talk: [{ lines: ['The Mow-Bot beeps. It sounds smug.', 'A tiny screen reads: I AM CUTTING. You have to respect the commitment.'] }],
  },
  {
    id: 'chickens',
    name: 'the chickens',
    role: "Earl's egg-automation flock",
    home: 'coop',
    speed: 0.9,
    verb: 'Shoo the chickens',
    size: 'small',
    traits: ['opportunistic', 'loud'],
    routine: [{ at: 'coop', wait: [6, 10], anim: 'sniff' }],
    talk: [{ lines: ['The chickens regard you with open suspicion.', 'One chicken steps forward. It seems to be their lawyer.'] }],
  },
];

export const ACTOR_BY_ID: ReadonlyMap<string, ActorDef> = new Map(CAST.map((a) => [a.id, a]));

/** Display names for {tokens} in lines. */
export function actorName(id: string): string {
  return ACTOR_BY_ID.get(id)?.name ?? id;
}
