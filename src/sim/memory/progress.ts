/**
 * Folds a finished day into the persistent save: memory flags, relationships, HOA rules,
 * awards and the headline archive. Only facts the ledger recorded are carried forward.
 */
import type { NewsReport } from '../gameplay/news.js';
import type { Sim } from '../sim.js';
import type { SaveData } from './save.js';

export function commitDay(sim: Sim, report: NewsReport): SaveData {
  const prev = sim.save;
  const memory = { ...prev.memory };
  for (const [k, v] of sim.memory) {
    memory[k] = v;
  }
  for (const c of sim.completed) {
    if (sim.incidentById(c.id)?.kind === 'major') {
      memory[`recent.${c.id}`] = sim.day;
    }
  }
  const affinity = { ...prev.affinity };
  for (const [k, v] of sim.affinity) {
    affinity[k] = Math.round(v * 100) / 100;
  }
  const hoaRules = [...prev.hoaRules];
  const awards = [...prev.awards];
  for (const e of sim.ledger.all()) {
    if (e.key.startsWith('hoa_rule_new.')) {
      const id = e.key.slice('hoa_rule_new.'.length);
      if (!hoaRules.some((r) => r.id === id)) {
        hoaRules.push({ id, text: String(e.value), day: sim.day });
      }
    }
    if (e.key.startsWith('award_new.')) {
      const id = e.key.slice('award_new.'.length);
      if (!awards.some((a) => a.id === id)) {
        awards.push({ id, text: String(e.value), day: sim.day });
      }
    }
  }
  return {
    ...prev,
    day: prev.day + 1,
    memory,
    affinity,
    hoaRules,
    awards,
    headlines: [...prev.headlines, { day: sim.day, seed: sim.seed, headline: report.headline, outcome: report.outcome }].slice(-30),
    difficulty: sim.difficulty,
    stats: {
      daysPlayed: prev.stats.daysPlayed + 1,
      problemsSolved: prev.stats.problemsSolved + report.stats.problemsSolved,
      problemsCreated: prev.stats.problemsCreated + report.stats.problemsCreated,
      bestChaos: Math.max(prev.stats.bestChaos, report.stats.chaosPeak),
    },
  };
}
