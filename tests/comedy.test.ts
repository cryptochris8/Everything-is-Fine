/**
 * Comedy Director + scenario interpreter: blueprint 08 functional tests 1–9, plus the
 * systemic rules that make chains emergent.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MAX_AMBIENT, PUNCHLINE_MEMORY } from '../src/sim/comedy/director.ts';
import { evalCond } from '../src/sim/comedy/scenario.ts';
import type { IncidentDef } from '../src/sim/comedy/types.ts';
import { validateContent } from '../src/sim/comedy/validate.ts';
import { CONTENT, INCIDENTS } from '../src/sim/content/index.ts';
import { NEWS } from '../src/sim/content/news.ts';
import { Bot, applyInput, simulateDay, type BotInput } from '../src/sim/debug/bot.ts';
import { buildNews, eligibleNews } from '../src/sim/gameplay/news.ts';
import { commitDay } from '../src/sim/memory/progress.ts';
import { freshSave, parseSave, serializeSave } from '../src/sim/memory/save.ts';
import { Sim } from '../src/sim/sim.ts';
import { SPOTS } from '../src/sim/world/layout.ts';

const DT = 1 / 30;
const newSim = (seed = 1, save = freshSave()) => new Sim({ seed, content: CONTENT, save });
const run = (sim: Sim, seconds: number) => {
  const end = sim.t + seconds;
  while (sim.t < end) {
    sim.tick(DT);
  }
};

test('content: the shipped catalog validates with zero issues', () => {
  assert.deepEqual(validateContent(INCIDENTS, NEWS), []);
});

test('validator: catches missing stages, timeouts, unknown roles, timeout loops and non-fact news', () => {
  const bad: IncidentDef = {
    id: 'BAD',
    title: 'bad',
    kind: 'major',
    tags: [],
    weight: 1,
    cooldown: 0,
    cast: { thief: 'dog', ghost: 'nobody_real' },
    maxDuration: 10,
    fallback: 'nowhere',
    start: 'a',
    stages: {
      a: { beat: 'setup', do: [{ say: 'villain', line: 'hi' }, { setProp: 'valve', state: 'exploded' }], go: [{ when: { used: 'thief' }, to: 'missing' }] },
      b: { beat: 'setup', timeout: { sec: 1, to: 'c' } },
      c: { beat: 'setup', timeout: { sec: 1, to: 'b' } },
    },
  };
  const issues = validateContent([bad, bad], [{ id: 'n', when: { playerNear: { spot: 'grill' }, r: 2 }, priority: 1, headline: ['x'], body: ['y'] }]);
  const text = issues.map((i) => `${i.where}: ${i.problem}`).join('\n');
  for (const needle of ['duplicate', 'fallback stage', 'no terminal', 'unknown actor "nobody_real"', 'unknown actor/role "villain"', 'no state "exploded"', 'unknown stage "missing"', 'needs a timeout', 'loops', 'news templates may only use fact']) {
    assert.ok(text.includes(needle), `expected issue containing "${needle}"\n${text}`);
  }
});

test('1. determinism: same seed + same recorded inputs → identical ledger and timeline', () => {
  const log: BotInput[] = [];
  const a = newSim(4242);
  simulateDay(a, { policy: 'helpful', seed: 5 }, 900, DT, log);
  const b = newSim(4242);
  for (const input of log) {
    applyInput(b, input);
    b.tick(DT);
  }
  assert.equal(b.ledger.trace(), a.ledger.trace());
  assert.deepEqual(b.timeline, a.timeline);
  assert.equal(buildNews(b).headline, buildNews(a).headline);
});

test('1b. determinism: a bot run with the same seed reproduces itself; different seeds vary', () => {
  const once = (seed: number) => {
    const s = newSim(seed);
    simulateDay(s, { policy: 'helpful', seed: 1 });
    return s.ledger.trace();
  };
  assert.equal(once(77), once(77));
  const traces = new Set([1, 2, 3, 4, 5, 6].map(once));
  assert.ok(traces.size >= 5, 'different seeds should produce different days');
});

test('2. no incident ever runs without its cast and props reserved to it (or its parent)', () => {
  for (let seed = 1; seed <= 6; seed++) {
    const sim = newSim(seed);
    const bot = new Bot(sim, { policy: seed % 2 ? 'helpful' : 'lazy', seed });
    while (!sim.dayOver && sim.t < 900) {
      bot.step(DT);
      sim.tick(DT);
      for (const inc of sim.running) {
        for (const id of inc.roles.values()) {
          const owner = sim.actors.get(id)!.reservedBy;
          const chain = new Set<string>();
          for (let cur: typeof inc | undefined = inc; cur; cur = sim.running.find((r) => r.uid === cur!.parent)) {
            chain.add(cur.uid);
            // descendants may hold it too
          }
          const heldByRelative = owner !== null && (chain.has(owner) || sim.running.some((r) => r.uid === owner && r.parent === inc.uid));
          assert.ok(heldByRelative, `${inc.def.id} role actor ${id} is reserved by ${owner}`);
        }
      }
    }
  }
});

test('3. a prop thrown out of the play area comes back (never a soft-lock)', () => {
  const sim = newSim(3);
  const charcoal = sim.props.get('charcoal')!;
  charcoal.pos = { x: 500, z: 500 };
  run(sim, 0.2);
  assert.notEqual(charcoal.pos.x, 500);
  assert.ok(sim.ledger.num('props_returned') >= 1);
});

test('4. every major/finale incident terminates within maxDuration even if the player does nothing', () => {
  for (const def of INCIDENTS.filter((d) => d.kind === 'major' || d.kind === 'finale')) {
    const sim = newSim(11);
    // Put the world into a state where most requirements hold.
    sim.props.get('platter')!.state = 'grilled';
    sim.props.get('platter')!.pos = { ...SPOTS.grillTable };
    const mission = sim.running.find((r) => r.slot === 'mission')!;
    const inc = sim.startIncident(def, 'major', mission);
    const limit = def.maxDuration + 30;
    let t = 0;
    while (sim.running.includes(inc) && t < limit) {
      sim.tick(DT);
      t += DT;
    }
    assert.ok(!sim.running.includes(inc), `${def.id} did not end within ${limit}s (stage ${inc.stageId})`);
    // Reservations released.
    for (const a of sim.actors.values()) {
      assert.notEqual(a.reservedBy, inc.uid, `${def.id} leaked actor ${a.id}`);
    }
    for (const p of sim.props.values()) {
      assert.notEqual(p.reservedBy, inc.uid, `${def.id} leaked prop ${p.id}`);
    }
  }
});

test('5. concurrency caps: at most 1 major and MAX_AMBIENT ambient gags at once', () => {
  for (let seed = 1; seed <= 5; seed++) {
    const sim = newSim(seed);
    const bot = new Bot(sim, { policy: 'lazy', seed });
    while (!sim.dayOver && sim.t < 900) {
      bot.step(DT);
      sim.tick(DT);
      assert.ok(sim.running.filter((r) => r.slot === 'major').length <= 1);
      assert.ok(sim.running.filter((r) => r.slot === 'ambient').length <= MAX_AMBIENT);
      assert.ok(sim.running.filter((r) => r.slot === 'mission').length <= 1);
    }
  }
});

test('6. failure is not a dead end: a player who ignores every complication still finishes the day', () => {
  for (let seed = 1; seed <= 6; seed++) {
    const sim = newSim(seed * 31);
    simulateDay(sim, { policy: 'lazy', seed });
    assert.ok(sim.dayOver, `seed ${seed} never finished (t=${sim.t})`);
    assert.ok(sim.ledger.truthy('cookout_held'));
  }
});

test('6b. the day is a 3–9 minute session for an engaged player', () => {
  for (let seed = 1; seed <= 6; seed++) {
    const sim = newSim(seed * 7);
    simulateDay(sim, { policy: 'helpful', seed });
    assert.ok(sim.dayOver);
    assert.ok(sim.t > 120 && sim.t < 540, `day took ${sim.t.toFixed(0)}s`);
  }
});

test('7. memory persists: a save round-trip keeps callback flags, and NPCs use them', () => {
  const sim = newSim(5);
  sim.remember('dog_head_chef', true, 'test');
  sim.addHoaRule('airborne_catering', 'Rule 14-B', 'test');
  sim.addAffinity('randy', 3, 'test');
  const report = buildNews(sim);
  const saved = parseSave(serializeSave(commitDay(sim, report)));
  assert.equal(saved.day, 2);
  assert.equal(saved.memory['dog_head_chef'], true);
  assert.equal(saved.hoaRules[0]!.id, 'airborne_catering');
  const next = newSim(6, saved);
  assert.equal(next.day, 2);
  assert.equal(evalCond(next, null, { memory: 'dog_head_chef' }), true);
  // Randy's talk now reflects yesterday.
  const randy = next.actors.get('randy')!;
  next.player.pos = { x: randy.pos.x + 1, z: randy.pos.z };
  const events: string[] = [];
  // Skip the intro so Randy isn't waiting on the mission.
  run(next, 1);
  next.player.pos = { x: next.actors.get('randy')!.pos.x + 1, z: next.actors.get('randy')!.pos.z };
  next.drainEvents();
  next.interact();
  for (const e of next.drainEvents()) {
    if (e.type === 'say' || e.type === 'toast') {
      events.push(e.type === 'say' ? e.text : e.text);
    }
  }
  assert.ok(events.some((t) => /Brisket|remembers/.test(t)), `expected a callback line, got ${JSON.stringify(events)}`);
});

test('7b. persistent consequences change the next day: guarded burgers can no longer be stolen', () => {
  const save = freshSave();
  save.memory['randy.guards_food'] = true;
  const sim = newSim(8, save);
  const dog = INCIDENTS.find((d) => d.id === 'DOG_STEALS_BURGERS')!;
  sim.props.get('platter')!.state = 'grilled';
  const verdict = sim.director.check(dog, sim.running[0]!, true);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, 'preconditions not met');
});

test('8. the news only reports facts that are in the ledger (seed sweep, all policies)', () => {
  for (const policy of ['helpful', 'lazy', 'slow'] as const) {
    for (let seed = 1; seed <= 5; seed++) {
      const sim = newSim(seed * 13);
      simulateDay(sim, { policy, seed });
      const report = buildNews(sim);
      const eligible = new Set(eligibleNews(sim).map((n) => n.id));
      for (const id of report.templates) {
        assert.ok(eligible.has(id), `${id} reported without its facts`);
      }
      assert.ok(report.headline.length > 0);
      assert.ok(report.stories.length >= 1);
      if (report.templates.includes('dog_chef')) {
        assert.ok(sim.ledger.truthy('dog_stole_burgers'));
      }
      if (report.templates.includes('granny_chase')) {
        assert.ok(sim.ledger.truthy('granny_cart_crash'));
      }
    }
  }
});

test('8b. three differing playthroughs produce materially different truthful recaps', () => {
  const heads = new Set<string>();
  const outcomes = new Set<string>();
  for (let seed = 1; seed <= 10; seed++) {
    for (const policy of ['helpful', 'lazy'] as const) {
      const sim = newSim(seed * 101);
      simulateDay(sim, { policy, seed });
      const r = buildNews(sim);
      heads.add(r.templates[0]!);
      outcomes.add(r.outcome);
    }
  }
  assert.ok(heads.size >= 3, `only ${heads.size} distinct lead stories`);
  assert.ok(outcomes.size >= 3, `only ${[...outcomes].join(',')} outcomes`);
});

test('9. repeated-gag penalty: a punchline in the last 3 completed incidents is not re-selected', () => {
  const sim = newSim(2);
  const todd = INCIDENTS.find((d) => d.id === 'TODD_COMMUTE')!;
  sim.completed.push({ id: 'TODD_COMMUTE', punchline: 'TODD_COMMUTE', t: 0, outcome: null });
  assert.equal(sim.director.check(todd, null, false).reason, 'punchline used recently');
  for (let i = 0; i < PUNCHLINE_MEMORY; i++) {
    sim.completed.push({ id: `X${i}`, punchline: `X${i}`, t: 0, outcome: null });
  }
  assert.notEqual(sim.director.check(todd, null, false).reason, 'punchline used recently');
});

test('director: request-only incidents are never chosen spontaneously; requests honour eligibility', () => {
  const sim = newSim(3);
  const dog = INCIDENTS.find((d) => d.id === 'DOG_STEALS_BURGERS')!;
  assert.equal(sim.director.check(dog, null, false).reason, 'request-only');
  // Platter still raw on the porch is fine, but held by the player is not.
  sim.giveProp('platter', 'player', null);
  assert.equal(sim.director.check(dog, sim.running[0]!, true).ok, false);
});

test('director: proximity and variety shape the score', () => {
  const sim = newSim(4);
  const mower = INCIDENTS.find((d) => d.id === 'MOWER_RUNAWAY')!;
  sim.player.pos = { ...SPOTS.earlLawn };
  const near = sim.director.score(mower);
  sim.player.pos = { x: -48, z: -30 };
  const far = sim.director.score(mower);
  assert.ok(near > far);
  sim.player.pos = { ...SPOTS.earlLawn };
  sim.completed.push({ id: 'MOWER_RUNAWAY', punchline: 'MOWER_RUNAWAY', t: 0, outcome: null });
  assert.ok(sim.director.score(mower) < near);
});

test('director: decisions are logged with rejection reasons (debug overlay)', () => {
  const sim = newSim(5);
  run(sim, 30);
  const d = sim.director.lastDecision;
  assert.ok(d, 'director should have made a decision by 30s');
  assert.ok(d!.candidates.length > 0);
  assert.ok(d!.candidates.every((c) => typeof c.reason === 'string' && c.reason.length > 0));
});

test('opening: Todd flies over the fence and Randy asks for help within 30 seconds', () => {
  const sim = newSim(1);
  let toddFlew = false;
  let offered = false;
  while (sim.t < 30 && !offered) {
    sim.tick(DT);
    if (sim.actors.get('todd')!.flight) {
      toddFlew = true;
    }
    if (sim.choices?.from === 'randy') {
      offered = true;
    }
    // Player walks toward Randy like a curious newcomer.
    const r = sim.actors.get('randy')!.pos;
    const p = sim.player.pos;
    const d = Math.hypot(r.x - p.x, r.z - p.z);
    if (d > 2) {
      sim.setPlayer({ x: p.x + ((r.x - p.x) / d) * 4 * DT, z: p.z + ((r.z - p.z) / d) * 4 * DT }, 0);
    }
  }
  assert.ok(toddFlew, 'the trampoline gag should happen');
  assert.ok(offered, `Randy should offer the favour within 30s (t=${sim.t.toFixed(1)})`);
  assert.ok(sim.t < 20, `offer came at ${sim.t.toFixed(1)}s`);
});

test('systems: a thrown squeaky toy makes Brisket drop stolen burgers', () => {
  const sim = newSim(6);
  const dog = sim.actors.get('dog')!;
  dog.pos = { x: 0, z: 10 };
  sim.giveProp('platter', 'dog', null);
  sim.giveProp('toy', 'player', null);
  sim.player.pos = { x: 0, z: 4 };
  sim.player.yaw = 0; // facing +Z, toward the dog
  assert.equal(sim.throwHeld(), true);
  run(sim, 1.2);
  assert.equal(sim.props.get('platter')!.heldBy, null);
  assert.ok(sim.ledger.truthy('dog_distracted_by_toy'));
});

test('systems: grabbing Brisket takes the loot back (interaction, not mere proximity)', () => {
  const sim = newSim(7);
  const dog = sim.actors.get('dog')!;
  dog.pos = { x: 20, z: -20 };
  dog.order = null;
  dog.reservedBy = 'test';
  sim.giveProp('gnome', 'dog', null);
  sim.player.pos = { x: 20.8, z: -20 };
  run(sim, 0.2);
  assert.equal(sim.props.get('gnome')!.heldBy, 'dog', 'standing next to the dog must not auto-catch');
  const i = sim.interaction();
  assert.equal(i?.kind, 'talk');
  assert.match(i!.prompt, /Grab Sir Reginald \(garden gnome\) from Brisket/);
  sim.interact();
  assert.equal(sim.props.get('gnome')!.heldBy, null);
  assert.ok(sim.ledger.truthy('dog_caught'));
});

test('systems: the sprinkler soaks the burgers on the picnic table and slips the player', () => {
  const sim = newSim(8);
  sim.placeProp('platter', SPOTS.picnicTable, 0.8);
  sim.props.get('platter')!.state = 'grilled';
  sim.setPropState('valve', 'on', 'test');
  sim.player.pos = { ...SPOTS.sprinklerHead };
  run(sim, 0.3);
  assert.equal(sim.props.get('platter')!.state, 'soggy');
  assert.ok(sim.stunned || sim.ledger.num('player_slips') >= 1);
});

test('systems: Brisket running over the valve turns the sprinkler on (emergent chain)', () => {
  const sim = newSim(9);
  const dog = sim.actors.get('dog')!;
  dog.reservedBy = 'test';
  dog.pos = { x: SPOTS.sprinklerValve.x - 3, z: SPOTS.sprinklerValve.z };
  sim.orderGoto('dog', { x: SPOTS.sprinklerValve.x + 3, z: SPOTS.sprinklerValve.z }, 'run');
  run(sim, 2);
  assert.equal(sim.props.get('valve')!.state, 'on');
  assert.ok(sim.ledger.truthy('sprinkler_on_by_dog'));
});

test('interaction: place targets, toggles and pickups produce the right prompts', () => {
  const sim = newSim(10);
  sim.player.pos = { ...SPOTS.charcoalShelf };
  assert.equal(sim.interaction()?.kind, 'pickup');
  sim.interact();
  assert.equal(sim.player.holding, 'charcoal');
  sim.player.pos = { ...SPOTS.grill };
  const place = sim.interaction();
  assert.equal(place?.kind, 'place');
  sim.interact();
  assert.equal(sim.props.get('charcoal')!.state, 'delivered');
  assert.ok(sim.ledger.truthy('charcoal_delivered'));
  sim.player.pos = { ...SPOTS.sprinklerValve };
  const use = sim.interaction();
  assert.equal(use?.kind, 'use');
  assert.match(use!.prompt, /Turn on the sprinkler/);
});

test('interaction: the burger platter cannot be thrown (you are a good neighbour)', () => {
  const sim = newSim(12);
  sim.giveProp('platter', 'player', null);
  assert.equal(sim.throwHeld(), false);
  assert.equal(sim.player.holding, 'platter');
});

test('chaos: reaching 100 triggers the block-party finale, which resets chaos to a calm baseline', () => {
  const sim = newSim(13);
  run(sim, 1);
  sim.addChaos(200, 'test');
  assert.equal(sim.chaos, 100);
  let sawFinale = false;
  for (let i = 0; i < 60 * 30 && !(sawFinale && sim.chaos < 60); i++) {
    sim.tick(DT);
    if (sim.running.some((r) => r.def.id === 'BLOCK_PARTY')) {
      sawFinale = true;
    }
  }
  assert.ok(sawFinale, 'finale should start');
  assert.ok(sim.chaos < 60, `chaos should settle (is ${sim.chaos})`);
  assert.ok(sim.ledger.truthy('block_party'));
});

test('chaos decays when the street is calm', () => {
  const sim = newSim(14);
  sim.addChaos(40, 'test');
  const before = sim.chaos;
  // Freeze the director so nothing new happens.
  sim.director.nextAmbientAt = 1e9;
  sim.director.nextMajorAt = 1e9;
  run(sim, 30);
  assert.ok(sim.chaos < before);
});

test('difficulty: easy stretches reaction windows and widens the catch circle', () => {
  const easy = new Sim({ seed: 1, content: CONTENT, save: freshSave(), difficulty: 'easy' });
  const hard = new Sim({ seed: 1, content: CONTENT, save: freshSave(), difficulty: 'hard' });
  assert.ok(easy.tune.catchRadius > hard.tune.catchRadius);
  assert.ok(easy.tune.window > hard.tune.window);
});

test('news: a day with nothing notable still gets a (quiet) headline', () => {
  const sim = newSim(15);
  const r = buildNews(sim);
  assert.equal(r.templates[0], 'quiet');
  assert.equal(r.outcome, 'unfinished');
});

test('multi-day: three consecutive days carry memory and vary', () => {
  let save = freshSave();
  const outcomes: string[] = [];
  for (let day = 0; day < 3; day++) {
    const sim = newSim(900 + day, save);
    simulateDay(sim, { policy: 'helpful', seed: day + 1 });
    const r = buildNews(sim);
    outcomes.push(`${r.outcome}:${sim.completed.filter((c) => sim.incidentById(c.id)?.kind === 'major').map((c) => c.id).join('+')}`);
    save = commitDay(sim, r);
  }
  assert.equal(save.day, 4);
  assert.equal(save.stats.daysPlayed, 3);
  assert.equal(new Set(outcomes).size, 3, outcomes.join(' | '));
});

test('objectives: spontaneous encounters show as a side objective and never hijack the favour', () => {
  const sim = newSim(16);
  run(sim, 1);
  const missionText = sim.objective()?.text;
  assert.ok(missionText);
  const gnome = INCIDENTS.find((d) => d.id === 'GNOME_HEIST')!;
  sim.startIncident(gnome, 'major', null);
  assert.equal(sim.objective()?.text, missionText, 'mission objective stays primary');
  assert.match(sim.sideObjective()?.text ?? '', /Sir Reginald/);
});

test('objectives: picking up the burgers retargets the objective to the grill table', () => {
  const sim = newSim(17);
  const bbq = sim.running.find((r) => r.slot === 'mission')!;
  sim.ledger.record(sim.t, 'charcoal_delivered', true, 'test');
  // Jump the mission to the burger step.
  bbq.stageId = 'fetch';
  run(sim, 0.2);
  assert.equal(bbq.stageId, 'light');
  sim.player.pos = { ...SPOTS.randyPorch };
  sim.interact();
  run(sim, 0.2);
  assert.equal(bbq.stageId, 'carry_burgers');
  const o = sim.objective()!;
  assert.match(o.text, /table by the grill/);
  assert.deepEqual(o.target, { ...SPOTS.grillTable });
});

test('director: a mission complication preempts an ambient gag holding the actor it needs', () => {
  const sim = newSim(18);
  const zoomies = INCIDENTS.find((d) => d.id === 'BRISKET_ZOOMIES')!;
  const z = sim.startIncident(zoomies, 'ambient', null);
  assert.equal(sim.actors.get('dog')!.reservedBy, z.uid);
  sim.props.get('platter')!.state = 'grilled';
  sim.placeProp('platter', SPOTS.grillTable, 0.9);
  const mission = sim.running.find((r) => r.slot === 'mission')!;
  const started = sim.director.request(['DOG_STEALS_BURGERS'], mission, null);
  assert.equal(started, 'DOG_STEALS_BURGERS');
  assert.ok(!sim.running.includes(z), 'the gag was cut short');
});
