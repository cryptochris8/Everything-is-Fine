/** Seed sweep: run whole days headless with the bot and summarize what happened. */
import { validateContent } from '../src/sim/comedy/validate.ts';
import { CONTENT } from '../src/sim/content/index.ts';
import { NEWS } from '../src/sim/content/news.ts';
import { simulateDay, type BotPolicy } from '../src/sim/debug/bot.ts';
import { buildNews } from '../src/sim/gameplay/news.ts';
import { commitDay } from '../src/sim/memory/progress.ts';
import { freshSave } from '../src/sim/memory/save.ts';
import { Sim } from '../src/sim/sim.ts';

const issues = validateContent(CONTENT.incidents, NEWS);
console.log(`validation issues: ${issues.length}`);
for (const i of issues) console.log('  ', i.incident, i.where, i.problem);

const n = Number(process.argv[2] ?? 12);
const verbose = process.argv.includes('-v');
const policies: BotPolicy[] = ['helpful', 'lazy', 'slow'];
const outcomes = new Map<string, number>();
const comps = new Map<string, number>();
for (const policy of policies) {
  for (let seed = 1; seed <= n; seed++) {
    let save = freshSave();
    const days: string[] = [];
    for (let day = 0; day < 2; day++) {
      const sim = new Sim({ seed: seed * 100 + day, content: CONTENT, save });
      simulateDay(sim, { policy, seed });
      const r = buildNews(sim);
      outcomes.set(r.outcome, (outcomes.get(r.outcome) ?? 0) + 1);
      const majors = sim.completed.filter((c) => sim.incidentById(c.id)?.kind === 'major').map((c) => c.id);
      for (const m of majors) comps.set(m, (comps.get(m) ?? 0) + 1);
      days.push(`d${sim.day} t=${sim.t.toFixed(0)} ${sim.dayOver ? '' : 'UNFINISHED '}${r.outcome} chaos^${r.stats.chaosPeak} [${majors.join(',')}] "${r.headline}"`);
      if (verbose && seed === 1) console.log(sim.timeline.map((e) => `${e.t} ${e.source}: ${e.what}`).join('\n'));
      save = commitDay(sim, r);
    }
    console.log(`${policy.padEnd(7)} seed ${seed}: ${days.join('  ||  ')}`);
  }
}
console.log('outcomes', Object.fromEntries(outcomes));
console.log('majors', Object.fromEntries(comps));
