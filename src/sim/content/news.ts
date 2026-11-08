/**
 * PLEASANT PINES LOCAL NEWS — end-of-day recap templates (blueprint 05 NEWS-01).
 *
 * Every template is gated ONLY on ledger facts (validated: no other condition types), so
 * the anchor can never report something that did not happen. Priority picks the headline;
 * other eligible stories fill the body. Anchor: Chet Mabry, Channel 4 (fictional).
 */
import type { Cond } from '../comedy/types.js';

export interface NewsTemplate {
  id: string;
  when: Cond;
  priority: number;
  headline: readonly string[];
  body: readonly string[];
}

export const NEWS: readonly NewsTemplate[] = [
  {
    id: 'block_party',
    when: { fact: 'block_party' },
    priority: 100,
    headline: ['BLOCK PARTY DECLARED AFTER CHAOS REACHES "MAXIMUM"', 'NEIGHBORHOOD ACHIEVES PEAK PARTY; OFFICIALS "FINE"'],
    body: ['Chaos levels on Maple Street reached their legal maximum this afternoon, at which point residents simply started a party. Linda Price of the HOA confirmed that everything is fine.'],
  },
  {
    id: 'dog_chef',
    when: { all: [{ fact: 'dog_head_chef' }, { fact: 'dog_stole_burgers' }] },
    priority: 90,
    headline: ['LOCAL DOG PROMOTED TO HEAD CHEF AFTER DARING BURGER HEIST', 'BRISKET, 6, ACQUIRES ENTIRE COOKOUT; CELEBRATES BIRTHDAY'],
    body: ['A routine cookout took a turn when Brisket, a dog, made off with all six burgers. Owner Big Randy described the theft as "honestly impressive."'],
  },
  {
    id: 'clipboard',
    when: { fact: 'burgers_on_clipboard' },
    priority: 88,
    headline: ['BURGERS LAND ON HOA CLIPBOARD IN PERFECT GRID; NEW RULE ISSUED', 'AIRBORNE CATERING INCIDENT PROMPTS RULE 14-B'],
    body: ["An experimental burger-flipping device sent six patties airborne before they landed on HOA President Linda Price's clipboard. \"In a grid,\" Price noted. \"Neatly. I hate that.\""],
  },
  {
    id: 'caught',
    when: { fact: 'burgers_caught' },
    priority: 86,
    headline: ['NEW RESIDENT MAKES "CATCH OF THE CENTURY" AT LOCAL COOKOUT', 'SIX BURGERS, ONE CATCH: NEIGHBORS STUNNED'],
    body: ["Witnesses say a newcomer caught six airborne burgers launched by Earl Dobbs's Flip-O-Matic 3000. Dobbs called it \"a successful test.\""],
  },
  {
    id: 'roof',
    when: { fact: 'burgers_on_roof' },
    priority: 85,
    headline: ['BURGERS STRANDED ON ROOF; TRAMPOLINE NEIGHBOR RESPONDS', 'ROOFTOP BURGER RESCUE: "THIS IS WHAT I TRAIN FOR"'],
    body: ['Burgers launched from a backyard grill came to rest on a roof. They were retrieved by a neighbor who commutes by trampoline. Nobody reacted.'],
  },
  {
    id: 'water_bbq',
    when: { fact: 'water_bbq' },
    priority: 84,
    headline: ['FIRST ANNUAL "WATER BBQ" HELD IN ANKLE-DEEP YARD', 'SPRINKLER TURNS COOKOUT INTO WATER PARK; GUESTS STAY ANYWAY'],
    body: ['Guests at a Maple Street cookout stood in ankle-deep water after a sprinkler activated mid-event. Organizers have already declared it an annual tradition. It has happened once.'],
  },
  {
    id: 'lawn_arrow',
    when: { fact: 'lawn_arrow' },
    priority: 80,
    headline: ['ROBOT MOWER CARVES GIANT ARROW POINTING AT HOA PRESIDENT\'S HOME', 'MOW-BOT 9000 "DISCOVERS ART"'],
    body: ["A robotic mower left its assigned lawn and mowed a giant arrow across three properties. It points directly at the home of the HOA president. Inventor Earl Dobbs is \"very proud and a little afraid.\""],
  },
  {
    id: 'gnome_collector',
    when: { fact: 'dog_gnome_collector' },
    priority: 78,
    headline: ['GNOME WATCH FORMED AFTER DOG REVEALED AS SERIAL GNOME COLLECTOR'],
    body: ['Sir Reginald, a garden gnome, was found in a dog house alongside ten other gnomes of unknown origin. A Gnome Watch is now in effect.'],
  },
  {
    id: 'chickens_vip',
    when: { fact: 'chickens_vip' },
    priority: 76,
    headline: ['CHICKENS OCCUPY VIP SEATING; HOST SAYS "THEY RSVP\'D"'],
    body: ['Escaped poultry took the best seats at a neighborhood picnic table. The HOA has since banned poultry from VIP seating.'],
  },
  {
    id: 'grill_ruined',
    when: { fact: 'grill_ruined' },
    priority: 74,
    headline: ['"FLAVOR EVENT" CLAIMS LOCAL GRILL', 'GRILL RETIRES AFTER "FLAVOR EVENT"; OWNER "DOWNSIZING"'],
    body: ['A backyard grill was lost to what its owner insists was "not a fire." He plans to continue grilling on a camp stove "with heart."'],
  },
  {
    id: 'toy_save',
    when: { fact: 'toy_saved_burgers' },
    priority: 72,
    headline: ['SQUEAKY TOY FOILS BURGER HEIST'],
    body: ['A burger theft was cut short when a quick-thinking resident threw a squeaky hot dog toy. The suspect dropped the evidence immediately. "Priorities," said a witness.'],
  },
  {
    id: 'granny_chase',
    when: { fact: 'granny_cart_crash' },
    priority: 70,
    headline: ['GOLF CART PURSUIT ENDS IN BUSH; DRIVER "FINE"'],
    body: ['Self-appointed sheriff Darlene Hatfield joined a burger pursuit by golf cart. The pursuit ended in a bush. "The bush had it coming," Hatfield said.'],
  },
  {
    id: 'granny_shortcut',
    when: { fact: 'granny_shortcut' },
    priority: 66,
    headline: ['GRANDMOTHER TAKES "SHORTCUT" THROUGH OWN PRIZE GARDEN'],
    body: ['A charcoal delivery by golf cart included an unscheduled trip through a prize-winning tomato garden.'],
  },
  {
    id: 'hedge',
    when: { fact: 'granny_hedge_crash' },
    priority: 65,
    headline: ['HEDGE "CAME OUT OF NOWHERE," SAYS GOLF CART DRIVER'],
    body: ["A golf cart made unscheduled contact with HOA President Linda Price's hedges. Price described the hedges as \"compliant until today.\""],
  },
  {
    id: 'sprinkler_dog',
    when: { fact: 'sprinkler_on_by_dog' },
    priority: 64,
    headline: ['DOG TURNS ON SPRINKLER WHILE FLEEING; LAWN "VERY HYDRATED"'],
    body: ['While fleeing the scene, a dog stepped directly on a sprinkler valve. "Of course he did," said everyone.'],
  },
  {
    id: 'sprinkler_prevented',
    when: { fact: 'sprinkler_prevented' },
    priority: 50,
    headline: ['RESIDENT DEFUSES SPRINKLER TIMER WITH SECONDS TO SPARE'],
    body: ['A sprinkler timer counting down toward a cookout was shut off just in time. HOA President Linda Price described herself as "almost disappointed."'],
  },
  {
    id: 'flipper_off',
    when: { fact: 'flipper_disabled_early' },
    priority: 48,
    headline: ['LOCAL INVENTION SWITCHED OFF BEFORE ANYTHING HAPPENED; INVENTOR "FINE WITH IT"'],
    body: ['The Flip-O-Matic 3000 was switched off before its first flip. Inventor Earl Dobbs called it "not ready. Never ready."'],
  },
  {
    id: 'mower_stopped',
    when: { fact: 'mower_stopped' },
    priority: 46,
    headline: ['ROGUE MOW-BOT HALTED BY NEW RESIDENT'],
    body: ['A robotic mower that had abandoned "tasteful stripes" was switched off before it could, in its inventor\'s words, "discover sculpture."'],
  },
  {
    id: 'chickens_shooed',
    when: { fact: 'chickens_shooed' },
    priority: 44,
    headline: ['ESCAPED CHICKENS RETURNED HOME; "THEY WERE MUTTERING"'],
    body: ['A small flock that learned to operate its own coop latch was shooed home without incident. The chickens declined to comment.'],
  },
  {
    id: 'gnome_rescued',
    when: { fact: 'gnome_rescued' },
    priority: 42,
    headline: ['SIR REGINALD THE GNOME RESCUED FROM CANINE CAPTIVITY'],
    body: ['A prized garden gnome was recovered after a brief abduction. Its owner issued a laminated commendation.'],
  },
  {
    id: 'deputized',
    when: { fact: 'award_new.deputized' },
    priority: 40,
    headline: ['NEW RESIDENT DEPUTIZED BY SELF-APPOINTED SHERIFF'],
    body: ['Granny Darlene Hatfield has named a new honorary deputy. The position has no authority, no pay, and a very shiny badge.'],
  },
  {
    id: 'permit',
    when: { any: [{ fact: 'permit_signed' }, { fact: 'permit_signed_twice' }] },
    priority: 30,
    headline: ['RESIDENT COMPLETES FORM C-4 FOR RECREATIONAL CHARCOAL'],
    body: ['Paperwork for the transport of one (1) bag of charcoal was completed in full. The HOA called it "a good start."'],
  },
  {
    id: 'linda_noted',
    when: { fact: 'linda_noted_you' },
    priority: 28,
    headline: ['HOA "NOTES" NEW RESIDENT. IN PEN.'],
    body: ['A newcomer walked past a mandatory form today. It has been noted. In pen.'],
  },
  {
    id: 'slips',
    when: { fact: 'player_slips', gte: 2 },
    priority: 20,
    headline: ['LOCAL LAWN DECLARED "SLIPPERY"'],
    body: ['At least one resident slipped on a wet lawn more than once today. Witnesses rated the falls "graceful."'],
  },
  {
    id: 'boxes',
    when: { fact: 'boxes_unpacked', gte: 3 },
    priority: 12,
    headline: ['NEW RESIDENT STILL UNPACKING'],
    body: ['Sources confirm the new resident has unpacked several boxes and found at least one item they do not remember owning.'],
  },
  {
    id: 'cookout',
    when: { fact: 'cookout_held' },
    priority: 10,
    headline: ['COOKOUT HELD ON MAPLE STREET; EVERYTHING FINE', 'BIG RANDY HOSTS COOKOUT; NOBODY ON FIRE'],
    body: ['Big Randy hosted a cookout today. Burgers were served. Neighbors attended. Everything was fine.'],
  },
  {
    id: 'quiet',
    when: { always: true },
    priority: 0,
    headline: ['QUIET DAY ON MAPLE STREET. SUSPICIOUSLY QUIET.'],
    body: ['Nothing happened in Pleasant Pines today. Residents are concerned.'],
  },
];

export const ANCHOR = 'Chet Mabry, Channel 4';

/** Ending titles for the end card (keyed by mission outcome). */
export const OUTCOME_TITLES: Readonly<Record<string, string>> = {
  dog_chef: 'The Birthday Dog Cookout',
  water_bbq: 'The First Annual Water BBQ',
  clipboard_catering: 'Airborne Catering',
  perfect_catch: 'The Catch of the Century',
  potluck: 'The Accidental Potluck',
  soggy: 'Soggy but Sincere',
  dusty: 'A Little Dusty (Adds Crunch)',
  classic: 'A Perfectly Normal Cookout',
};
