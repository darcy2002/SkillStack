import { banner, status, error, heading, spinner } from '../utils/ui.js';
import { getApiKey } from '../utils/config.js';
import { scanSkillByName, scanAllSkills } from '../bench/scanner.js';
import { generateTasks } from '../bench/task-generator.js';
import { runAllTasks } from '../bench/runner.js';
import { gradeAllResults } from '../bench/grader.js';
import { renderTerminal, statusFromScore, type BenchReport } from '../bench/reporter.js';

interface ScoreOptions {
  model: string;
}

const COST_PER_TOKEN = 6 / 1_000_000;

export async function scoreCommand(skillName: string, options: ScoreOptions): Promise<void> {
  banner();

  if (!getApiKey()) {
    error('Score requires a Claude API key. Set ANTHROPIC_API_KEY env var.');
    process.exit(1);
  }

  const skill = scanSkillByName(skillName);
  if (!skill) {
    error(`Skill "${skillName}" not found.`);
    const all = scanAllSkills();
    if (all.length > 0) {
      console.log('  Available skills:');
      for (const s of all) console.log(`    - ${s.name}`);
    }
    process.exit(1);
    return;
  }

  heading(`Scoring: ${skill.name}`);

  const gen = spinner('Generating 3 test tasks...');
  let tasks: string[];
  try {
    tasks = (await generateTasks(skill, 3, options.model)).tasks;
    gen.succeed(`Generated ${tasks.length} task(s).`);
  } catch (err) {
    gen.fail(`Task generation failed: ${(err as Error).message}`);
    process.exit(1);
    return;
  }

  const runResults = await runAllTasks(tasks, skill.body, options.model);
  const grades = await gradeAllResults(runResults, options.model);

  const avgWith = Math.round(grades.reduce((a, g) => a + g.scoreWith, 0) / grades.length);
  const avgDelta = Math.round(grades.reduce((a, g) => a + g.delta, 0) / grades.length);
  const totalTokens = runResults.reduce(
    (a, r) => a + r.withSkill.tokens + r.withoutSkill.tokens,
    0
  );

  const report: BenchReport = {
    timestamp: new Date().toISOString(),
    model: options.model,
    skills: [
      {
        name: skill.name,
        score: avgWith,
        delta: avgDelta,
        status: statusFromScore(avgWith),
        tasks: grades.map((g) => ({
          prompt: g.prompt,
          scoreWith: g.scoreWith,
          scoreWithout: g.scoreWithout,
        })),
      },
    ],
    conflicts: [],
    totalTokens,
    estimatedCost: `$${(totalTokens * COST_PER_TOKEN).toFixed(2)}`,
  };

  console.log();
  renderTerminal(report);
  status.ok(`Done.`);
}
