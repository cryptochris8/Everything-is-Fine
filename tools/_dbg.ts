import { CONTENT } from '../src/sim/content/index.ts';
import { simulateDay } from '../src/sim/debug/bot.ts';
import { freshSave } from '../src/sim/memory/save.ts';
import { Sim } from '../src/sim/sim.ts';
const seed = Number(process.argv[2] ?? 300); const policy = (process.argv[3] ?? 'helpful') as never;
const sim = new Sim({ seed, content: CONTENT, save: freshSave() });
simulateDay(sim, { policy, seed: 3 });
console.log(sim.timeline.map(e => `${e.t} ${e.source}: ${e.what}`).join('\n'));
