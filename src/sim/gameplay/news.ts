/**
 * Builds the end-of-day news report from the ledger. Templates are fact-gated (validated),
 * so the report is a truthful retelling of THIS run.
 */
import { evalCond } from '../comedy/scenario.js';
import { ANCHOR, NEWS, OUTCOME_TITLES, type NewsTemplate } from '../content/news.js';
import type { Sim } from '../sim.js';

export interface NewsReport {
  day: number;
  seed: number;
  anchor: string;
  headline: string;
  stories: string[];
  outcome: string;
  outcomeTitle: string;
  stats: { problemsSolved: number; problemsCreated: number; chaosPeak: number; incidents: number };
  newRules: string[];
  awards: string[];
  /** Template ids used (tests check each one's facts are in the ledger). */
  templates: string[];
}

export function eligibleNews(sim: Sim): NewsTemplate[] {
  return NEWS.filter((n) => evalCond(sim, null, n.when));
}

export function buildNews(sim: Sim): NewsReport {
  const eligible = eligibleNews(sim).sort((a, b) => b.priority - a.priority);
  const lead = eligible[0]!;
  const headline = sim.rngLines.pick(lead.headline);
  const rest = eligible.filter((n) => n !== lead && n.id !== 'quiet');
  const stories = [sim.rngLines.pick(lead.body), ...rest.slice(0, 2).map((n) => sim.rngLines.pick(n.body))];
  const mission = sim.ledger.get('outcome.BBQ');
  const outcome = typeof mission === 'string' ? mission : 'unfinished';
  const newRules = sim.ledger.all().filter((e) => e.key.startsWith('hoa_rule_new.')).map((e) => String(e.value));
  const awards = sim.ledger.all().filter((e) => e.key.startsWith('award_new.')).map((e) => String(e.value));
  return {
    day: sim.day,
    seed: sim.seed,
    anchor: ANCHOR,
    headline,
    stories,
    outcome,
    outcomeTitle: OUTCOME_TITLES[outcome] ?? 'A Day in Pleasant Pines',
    stats: {
      problemsSolved: sim.ledger.num('problems_solved'),
      problemsCreated: sim.ledger.num('problems_created'),
      chaosPeak: Math.round(sim.chaosPeak),
      incidents: sim.completed.filter((c) => sim.incidentById(c.id)?.kind !== 'ambient').length,
    },
    newRules,
    awards,
    templates: [lead.id, ...rest.slice(0, 2).map((n) => n.id)],
  };
}
