/**
 * Prop grammar (blueprint 04): every interactive object as data — states, how the player
 * can use it, where it can be placed, and how it recovers if it leaves play.
 */
import type { Vec2 } from '../core/vec.js';
import type { SpotId } from '../world/layout.js';

export interface PlaceTarget {
  spot: SpotId;
  r: number;
  y: number;
  /** Verb shown in the prompt: "Put the charcoal by the grill". */
  verb: string;
  state?: string;
  fact?: string;
}

export interface PropDef {
  id: string;
  name: string;
  home: SpotId;
  offset?: Vec2;
  y: number;
  initial: string;
  states: readonly string[];
  carry: boolean;
  throwable: boolean;
  /** Toggle behaviour for fixed props: state → [prompt verb, next state]. */
  use?: Readonly<Record<string, readonly [string, string]>>;
  /** Shown instead of a toggle when the state has no `use` entry. */
  inspect?: string;
  placeTargets?: readonly PlaceTarget[];
  count?: number;
  /** Light props get pushed by leaf blowers / wind. */
  light?: boolean;
  /** Category for the debug panel. */
  category: 'food' | 'tool' | 'gadget' | 'fixture' | 'toy' | 'decor' | 'vehicle';
  interactRadius?: number;
}

export const PROPS: readonly PropDef[] = [
  {
    id: 'charcoal',
    name: 'bag of charcoal',
    category: 'tool',
    home: 'charcoalShelf',
    y: 0,
    initial: 'stored',
    states: ['stored', 'carried', 'dropped', 'delivered'],
    carry: true,
    throwable: true,
    placeTargets: [{ spot: 'grill', r: 3, y: 0, verb: 'Set the charcoal by the grill', state: 'delivered', fact: 'charcoal_delivered' }],
  },
  {
    id: 'platter',
    name: 'burger platter',
    category: 'food',
    home: 'randyPorch',
    y: 0.85,
    initial: 'raw',
    states: ['raw', 'grilled', 'stolen', 'dusty', 'soggy', 'served', 'eaten', 'airborne'],
    carry: true,
    throwable: false,
    count: 6,
    placeTargets: [
      { spot: 'grillTable', r: 2.8, y: 0.9, verb: 'Set the burgers by the grill', fact: 'platter_at_grill' },
      { spot: 'picnicTable', r: 3, y: 0.8, verb: 'Serve the burgers', fact: 'platter_on_picnic_table' },
    ],
  },
  {
    id: 'toy',
    name: 'squeaky hot dog toy',
    category: 'toy',
    home: 'dogHouse',
    offset: { x: 1.6, z: -1.2 },
    y: 0,
    initial: 'idle',
    states: ['idle', 'thrown', 'chewed'],
    carry: true,
    throwable: true,
    light: true,
  },
  {
    id: 'valve',
    name: 'sprinkler valve',
    category: 'fixture',
    home: 'sprinklerValve',
    y: 0,
    initial: 'off',
    states: ['off', 'on', 'jammed', 'ticking'],
    carry: false,
    throwable: false,
    use: {
      off: ['Turn on the sprinkler', 'on'],
      on: ['Turn off the sprinkler', 'off'],
      ticking: ['Shut off the sprinkler timer', 'off'],
    },
    inspect: 'Wrestle the jammed valve',
  },
  {
    id: 'grill',
    name: "Randy's grill",
    category: 'fixture',
    home: 'grill',
    y: 0,
    initial: 'cold',
    states: ['cold', 'cooking', 'smoking', 'flaming', 'ruined', 'campstove'],
    carry: false,
    throwable: false,
    inspect: 'Admire the grill',
    interactRadius: 1.6,
  },
  {
    id: 'flipper',
    name: 'Flip-O-Matic 3000',
    category: 'gadget',
    home: 'earlWorkbench',
    y: 0.95,
    initial: 'stored',
    states: ['stored', 'installed', 'flipping', 'rogue', 'disabled'],
    carry: false,
    throwable: false,
    use: {
      installed: ['Hit the big red OFF button', 'disabled'],
      flipping: ['Hit the big red OFF button', 'disabled'],
      rogue: ['Tackle the OFF button', 'disabled'],
    },
    inspect: 'Read the warning label',
  },
  {
    id: 'cart',
    name: "Granny's golf cart",
    category: 'vehicle',
    home: 'cartPark',
    y: 0,
    initial: 'parked',
    states: ['parked', 'driving', 'stuck'],
    carry: false,
    throwable: false,
    inspect: "Honk Granny's horn",
    interactRadius: 2.4,
  },
  {
    id: 'gate',
    name: 'chicken coop gate',
    category: 'fixture',
    home: 'coopGate',
    y: 0,
    initial: 'closed',
    states: ['closed', 'open', 'broken'],
    carry: false,
    throwable: false,
    use: { closed: ['Open the coop gate', 'open'], open: ['Close the coop gate', 'closed'] },
    inspect: 'Prop the broken gate back up',
  },
  {
    id: 'gnome',
    name: 'Sir Reginald (garden gnome)',
    category: 'decor',
    home: 'lindaGnome',
    y: 0,
    initial: 'placed',
    states: ['placed', 'taken', 'moved'],
    carry: true,
    throwable: true,
    light: true,
    placeTargets: [{ spot: 'lindaGnome', r: 2.2, y: 0, verb: 'Return Sir Reginald', state: 'placed', fact: 'gnome_returned' }],
  },
  {
    id: 'clipboard',
    name: "Linda's HOA clipboard",
    category: 'tool',
    home: 'lindaPorch',
    y: 0,
    initial: 'carried',
    states: ['carried', 'dropped', 'burgered'],
    carry: true,
    throwable: true,
    light: true,
  },
  {
    id: 'board',
    name: 'HOA notice board',
    category: 'fixture',
    home: 'hoaBoard',
    y: 0,
    initial: 'posted',
    states: ['posted'],
    carry: false,
    throwable: false,
    inspect: 'Read the HOA board',
    interactRadius: 2.2,
  },
  {
    id: 'mailbox',
    name: "Earl's self-opening mailbox",
    category: 'gadget',
    home: 'earlMailbox',
    y: 0,
    initial: 'closed',
    states: ['closed', 'open'],
    carry: false,
    throwable: false,
    inspect: 'Check the mail',
  },
  {
    id: 'trampoline',
    name: "Todd's trampoline",
    category: 'toy',
    home: 'trampoline',
    y: 0,
    initial: 'idle',
    states: ['idle'],
    carry: false,
    throwable: false,
    inspect: 'Bounce on the trampoline',
    interactRadius: 2.6,
  },
  {
    id: 'boxes',
    name: 'your moving boxes',
    category: 'decor',
    home: 'movingBoxes',
    y: 0,
    initial: 'packed',
    states: ['packed'],
    carry: false,
    throwable: false,
    inspect: 'Unpack a box',
    interactRadius: 2.2,
  },
  {
    id: 'cake',
    name: "Granny's welcome cake",
    category: 'food',
    home: 'earlWorkbench',
    offset: { x: -1.6, z: 0.2 },
    y: 0.95,
    initial: 'boxed',
    states: ['boxed', 'airborne', 'roof', 'scouted', 'carried', 'dropped', 'rescued', 'delivered', 'squirreled'],
    carry: true,
    throwable: false,
    placeTargets: [{ spot: 'playerPorch', r: 2.6, y: 0, verb: 'Set the cake on your porch', state: 'delivered', fact: 'cake_delivered' }],
  },
  {
    id: 'ladder',
    name: "Earl's ladder",
    category: 'tool',
    home: 'earlGarage',
    offset: { x: 3, z: 0 },
    y: 0,
    initial: 'stored',
    states: ['stored', 'carried', 'dropped', 'leaning'],
    carry: true,
    throwable: false,
    placeTargets: [{ spot: 'playerLadder', r: 2.6, y: 0, verb: 'Lean the ladder against your house', state: 'leaning', fact: 'ladder_leaned' }],
  },
  {
    id: 'forms',
    name: "Linda's HOA forms",
    category: 'tool',
    home: 'hoaBoard',
    offset: { x: 1.4, z: -0.9 },
    y: 0,
    initial: 'stacked',
    states: ['stacked', 'blowing', 'carried', 'dropped', 'rescued', 'filed', 'signed'],
    carry: true,
    throwable: true,
    light: true,
    placeTargets: [{ spot: 'hoaBoard', r: 2.6, y: 0, verb: 'Hand the forms back to the HOA board', state: 'filed', fact: 'forms_filed' }],
  },
];

/** "the bag of charcoal", but "Earl's ladder" and "Sir Reginald (garden gnome)" (names and possessives take no article). */
export function theProp(name: string): string {
  return /^[A-Z]/.test(name) ? name : `the ${name}`;
}

/** Sentence-start form of theProp. */
export function TheProp(name: string): string {
  return /^[A-Z]/.test(name) ? name : `The ${name}`;
}

export const PROP_BY_ID: ReadonlyMap<string, PropDef> = new Map(PROPS.map((p) => [p.id, p]));

/** Things found in the moving boxes. Pure delight; no gameplay. */
export const BOX_FINDS: readonly string[] = [
  "A framed photo of a dog you've never owned. He looks proud of you.",
  'Forty-one rubber bands and a single, confident sock.',
  'A "Welcome Home" mat. It says "Welcome Home" to whoever stands on it. Including raccoons.',
  'A smoke detector. Somehow already beeping.',
  "A cookbook titled \"Grilling for Beginners\". Randy's name is on it. It's a library book. It's overdue since 2009.",
  'Bubble wrap. You pop one bubble. Linda looks up from three houses away.',
  'Your toaster. It was packed with the toast still in it.',
  'A box labeled DO NOT OPEN. It contains another box labeled SERIOUSLY.',
];
