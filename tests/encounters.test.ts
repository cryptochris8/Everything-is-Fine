/**
 * The three free-roam encounters added on 2026-11-07: Admiral Biscuit on the robot vacuum,
 * the welcome cake on the roof, and Linda's HOA forms in the wind. Each is tested both ways:
 * the player fixes it, and the player lets it happen (the funny ending must still land and
 * leave its mark: a fact for the news, a memory for tomorrow, an HOA rule).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { IncidentDef } from '../src/sim/comedy/types.ts';
import { CONTENT, INCIDENTS } from '../src/sim/content/index.ts';
import { ACTOR_BY_ID } from '../src/sim/content/cast.ts';
import { PROP_BY_ID, TheProp, theProp } from '../src/sim/content/props.ts';
import { buildNews, eligibleNews } from '../src/sim/gameplay/news.ts';
import { freshSave } from '../src/sim/memory/save.ts';
import { Sim } from '../src/sim/sim.ts';
import { SPOTS } from '../src/sim/world/layout.ts';
import { dist } from '../src/sim/core/vec.ts';

const DT = 1 / 30;
const FAR = { x: 40, z: -28 };

const newSim = (seed: number) => new Sim({ seed, content: CONTENT, save: freshSave() });
const def = (id: string): IncidentDef => INCIDENTS.find((d) => d.id === id)!;
const run = (sim: Sim, seconds: number) => {
  const end = sim.t + seconds;
  while (sim.t < end) {
    sim.tick(DT);
  }
};
/** Tick until the incident ends (or the cap), keeping the player parked where they are. */
const runToEnd = (sim: Sim, inc: ReturnType<Sim['startIncident']>, cap: number) => {
  let t = 0;
  while (sim.running.includes(inc) && t < cap) {
    sim.tick(DT);
    t += DT;
  }
  return !sim.running.includes(inc);
};
const startEncounter = (sim: Sim, id: string) => {
  // Encounters are spontaneous; clear the street so the Director doesn't start others first.
  sim.setPlayer(FAR, 0);
  return sim.startIncident(def(id), 'major', null);
};

test('encounters: the new cast member and props exist with the states their scenarios use', () => {
  assert.equal(ACTOR_BY_ID.get('cat')?.name, 'Admiral Biscuit');
  assert.ok(PROP_BY_ID.get('cake')!.states.includes('squirreled'));
  assert.ok(PROP_BY_ID.get('ladder')!.placeTargets!.some((t) => t.spot === 'playerLadder' && t.state === 'leaning'));
  assert.ok(PROP_BY_ID.get('forms')!.placeTargets!.some((t) => t.spot === 'hoaBoard' && t.state === 'filed'));
  for (const id of ['CAT_VACUUM', 'CAKE_ON_ROOF', 'HOA_FORMS_WIND']) {
    assert.equal(def(id).kind, 'major', id);
  }
});

test('cat vacuum: scooping Admiral Biscuit mid-voyage ends it kindly', () => {
  const sim = newSim(31);
  const inc = startEncounter(sim, 'CAT_VACUUM');
  run(sim, 4);
  const cat = sim.actors.get('cat')!;
  assert.ok(cat.order, 'the cat is under way');
  sim.setPlayer({ x: cat.pos.x + 0.8, z: cat.pos.z }, 0);
  const i = sim.interaction();
  assert.equal(i?.kind, 'talk');
  assert.match(i!.prompt, /Admiral Biscuit/);
  sim.interact();
  run(sim, 0.2);
  assert.equal(inc.stageId, 'rescued');
  sim.setPlayer(FAR, 0);
  assert.ok(runToEnd(sim, inc, 30));
  assert.ok(sim.ledger.truthy('cat_rescued'));
  assert.ok(!sim.ledger.truthy('cat_cleaned_street'));
  assert.equal(cat.reservedBy === inc.uid, false, 'the cat is released');
});

test('cat vacuum: left alone, he cleans the whole street and Linda gets a rule out of it', () => {
  const sim = newSim(32);
  const inc = startEncounter(sim, 'CAT_VACUUM');
  run(sim, 15);
  assert.equal(inc.stageId, 'cleaning', 'the second beat lands mid-voyage');
  assert.ok(runToEnd(sim, inc, def('CAT_VACUUM').maxDuration + 10));
  assert.ok(sim.ledger.truthy('cat_cleaned_street'));
  assert.equal(sim.memory.get('hoa.rule.cat_vehicles'), true);
  assert.equal(sim.memory.get('admiral_cleaned_street'), true);
  const cat = sim.actors.get('cat')!;
  assert.ok(dist(cat.pos, SPOTS.lindaHedges) < 3 || cat.order, 'he finished at Linda\'s hedges (or is heading home)');
});

test('cake on roof: the Parcel Pitcher puts the cake out of reach on your roof', () => {
  const sim = newSim(33);
  const inc = startEncounter(sim, 'CAKE_ON_ROOF');
  run(sim, 9.5);
  assert.equal(inc.stageId, 'fetch');
  const cake = sim.props.get('cake')!;
  assert.equal(cake.state, 'roof');
  assert.equal(cake.flight, null);
  assert.ok(dist(cake.pos, SPOTS.playerRoof) < 0.5);
  assert.ok(cake.y > 3, 'it rests up on the roof');
  // Standing at the front of the house is not close enough to grab it.
  sim.setPlayer({ ...SPOTS.playerLadder }, Math.PI);
  const i = sim.interaction();
  assert.ok(!(i?.kind === 'pickup' && i.prop === 'cake'), 'cannot reach the cake from the ground');
  // Nor from the side yard, right under the eave (out of reach: it is up on the roof).
  sim.setPlayer({ x: 6.4, z: SPOTS.playerRoof.z }, -Math.PI / 2);
  const side = sim.interaction();
  assert.ok(!(side?.kind === 'pickup' && side.prop === 'cake'), 'cannot reach the cake from beside the house');
});

test('cake on roof: fetching and leaning the ladder rescues the cake', () => {
  const sim = newSim(34);
  const inc = startEncounter(sim, 'CAKE_ON_ROOF');
  run(sim, 9.5);
  const ladder = sim.props.get('ladder')!;
  sim.setPlayer({ x: ladder.pos.x - 0.8, z: ladder.pos.z }, 0);
  const pick = sim.interaction();
  assert.equal(pick?.kind, 'pickup');
  assert.equal(pick?.kind === 'pickup' && pick.prop, 'ladder');
  sim.interact();
  run(sim, 0.2);
  assert.equal(inc.stageId, 'carry');
  sim.setPlayer({ ...SPOTS.playerLadder }, Math.PI);
  const place = sim.interaction();
  assert.equal(place?.kind, 'place');
  assert.match(place!.prompt, /Lean the ladder/);
  sim.interact();
  run(sim, 0.2);
  assert.equal(sim.props.get('ladder')!.state, 'leaning');
  assert.equal(sim.props.get('cake')!.heldBy, 'player');
  assert.equal(sim.player.holding, 'cake');
  assert.ok(sim.ledger.truthy('cake_rescued'));
  assert.equal(sim.memory.get('granny.cake_saved'), true);
  assert.ok(runToEnd(sim, inc, 10));
  assert.ok(!sim.ledger.truthy('squirrels_got_cake'));
});

test('cake on roof: putting the ladder down sends you back for it (no soft-lock)', () => {
  const sim = newSim(35);
  const inc = startEncounter(sim, 'CAKE_ON_ROOF');
  run(sim, 9.5);
  const ladder = sim.props.get('ladder')!;
  sim.setPlayer({ x: ladder.pos.x - 0.8, z: ladder.pos.z }, 0);
  sim.interact();
  run(sim, 0.2);
  sim.setPlayer({ x: 20, z: 0 }, 0);
  sim.dropHeld();
  run(sim, 0.2);
  assert.equal(inc.stageId, 'fetch_again');
  assert.deepEqual(sim.sideObjective()?.target, { ...sim.props.get('ladder')!.pos });
});

test('cake on roof: ignore it and the squirrels get the cake', () => {
  const sim = newSim(36);
  const inc = startEncounter(sim, 'CAKE_ON_ROOF');
  assert.ok(runToEnd(sim, inc, def('CAKE_ON_ROOF').maxDuration + 10));
  assert.ok(sim.ledger.truthy('squirrels_got_cake'));
  assert.equal(sim.props.get('cake')!.state, 'squirreled');
  assert.equal(sim.memory.get('squirrels_have_cake'), true);
  assert.equal(sim.memory.get('hoa.rule.baked_goods_airspace'), true);
});

test('hoa forms: grab them between gusts and hand them back to the board', () => {
  const sim = newSim(37);
  const inc = startEncounter(sim, 'HOA_FORMS_WIND');
  run(sim, 7.2);
  assert.equal(inc.stageId, 'gust1');
  const forms = sim.props.get('forms')!;
  assert.equal(forms.flight, null, 'landed between gusts');
  assert.ok(dist(forms.pos, { x: -8, z: 2.5 }) < 0.5);
  sim.setPlayer({ x: forms.pos.x + 1, z: forms.pos.z }, 0);
  const pick = sim.interaction();
  assert.equal(pick?.kind === 'pickup' && pick.prop, 'forms');
  sim.interact();
  run(sim, 0.2);
  assert.equal(inc.stageId, 'caught');
  sim.setPlayer({ ...SPOTS.hoaBoard }, 0);
  const place = sim.interaction();
  assert.equal(place?.kind, 'place');
  assert.match(place!.prompt, /Hand the forms back/);
  sim.interact();
  run(sim, 0.2);
  assert.equal(forms.state, 'filed');
  assert.ok(runToEnd(sim, inc, 10));
  assert.ok(sim.ledger.truthy('forms_caught'));
  assert.equal(sim.memory.get('linda.forms_saved'), true);
  assert.equal(sim.memory.get('award.paperwork_hero'), true);
});

test('hoa forms: three gusts, then the coop, where the chickens sign everything', () => {
  const sim = newSim(38);
  const inc = startEncounter(sim, 'HOA_FORMS_WIND');
  const seen = new Set<string>();
  let t = 0;
  while (sim.running.includes(inc) && t < def('HOA_FORMS_WIND').maxDuration + 10) {
    seen.add(inc.stageId);
    sim.tick(DT);
    t += DT;
  }
  assert.ok(!sim.running.includes(inc));
  for (const s of ['gust1', 'gust2', 'gust3', 'last_gust']) {
    assert.ok(seen.has(s), `missing beat ${s}`);
  }
  const forms = sim.props.get('forms')!;
  assert.equal(forms.state, 'signed');
  assert.ok(dist(forms.pos, SPOTS.coop) < 1);
  assert.ok(sim.ledger.truthy('chickens_signed_forms'));
  assert.equal(sim.memory.get('hoa.rule.poultry_office'), true);
  const report = buildNews(sim);
  assert.ok(eligibleNews(sim).some((n) => n.id === 'chickens_board'));
  assert.match(report.headline, /CHICKEN|POULTRY/);
});

test('encounters: Linda, Granny and Earl remember tomorrow what happened today', () => {
  const lines = (id: string, key: string) => ACTOR_BY_ID.get(id)!.talk.find((g) => g.when && 'memory' in g.when && g.when.memory === key);
  assert.ok(lines('linda', 'hoa.rule.poultry_office'));
  assert.ok(lines('linda', 'hoa.rule.cat_vehicles'));
  assert.ok(lines('linda', 'linda.forms_saved'));
  assert.ok(lines('granny', 'squirrels_have_cake'));
  assert.ok(lines('granny', 'granny.cake_saved'));
  assert.ok(lines('earl', 'squirrels_have_cake'));
});

test('prompts: proper names and possessives take no article', () => {
  assert.equal(theProp('bag of charcoal'), 'the bag of charcoal');
  assert.equal(theProp("Earl's ladder"), "Earl's ladder");
  assert.equal(TheProp('squeaky hot dog toy'), 'The squeaky hot dog toy');
  assert.equal(TheProp("Granny's welcome cake"), "Granny's welcome cake");
  const sim = newSim(39);
  const ladder = sim.props.get('ladder')!;
  sim.setPlayer({ x: ladder.pos.x - 0.8, z: ladder.pos.z }, 0);
  assert.equal(sim.interaction()?.prompt, "Pick up Earl's ladder");
});
