import { error, banner, spinner, status, heading } from '../utils/ui.js';
import { getApiKey } from '../utils/config.js';
import { scanAllSkills } from '../bench/scanner.js';
import { generateTasks } from '../bench/task-generator.js';
import { runAllTasks } from '../bench/runner.js';
import { gradeAllResults } from '../bench/grader.js';
import { detectConflicts } from '../bench/conflicts.js';
import {
  renderTerminal,
  writeJsonReport,
  writeMarkdownReport,
  statusFromScore,
  type BenchReport,
  type SkillReport,
} from '../bench/reporter.js';

interface BenchOptions {
  stack?: string;
  model: string;
  graderModel: string;
  tasks: string;
  json?: boolean;
  md?: boolean;
}

// Rough sonnet-4 pricing: $3/M input, $15/M output. We don't track
// in/out split per call, so blend at ~$6/M overall as a conservative est.
const COST_PER_TOKEN = 6 / 1_000_000;

function formatCost(tokens: number): string {
  const cost = tokens * COST_PER_TOKEN;
  return `$${cost.toFixed(2)}`;
}

export async function benchCommand(options: BenchOptions): Promise<void> {
  banner();

  const apiKey = getApiKey();
  if (!apiKey) {
    error(
      'Bench requires a Claude API key.\n' +
        '  Set ANTHROPIC_API_KEY env var, or run:\n' +
        '  skillstack config --api-key <your-key>'
    );
    process.exit(1);
  }

  const model = options.model;
  const graderModel = options.graderModel;
  const tasksPerSkill = Math.max(1, parseInt(options.tasks, 10) || 3);

  // 1. Scan
  const scanSpin = spinner('Scanning installed skills...');
  const skills = scanAllSkills();
  scanSpin.succeed(`Found ${skills.length} installed skill(s).`);

  if (skills.length === 0) {
    status.warn('No skills found. Install some via `skillstack install` first.');
    return;
  }

  const skillReports: SkillReport[] = [];
  let totalTokens = 0;

  for (const skill of skills) {
    heading(`Benchmarking: ${skill.name}`);

    // 2. Generate tasks
    const genSpin = spinner(`Generating test tasks for ${skill.name}...`);
    let tasks: string[];
    try {
      const gen = await generateTasks(skill, tasksPerSkill, model);
      tasks = gen.tasks;
      genSpin.succeed(`Generated ${tasks.length} task(s).`);
    } catch (err) {
      genSpin.fail(`Task generation failed: ${(err as Error).message}`);
      continue;
    }

    // 3. Run
    const runSpin = spinner(`Running benchmarks for ${skill.name}...`);
    runSpin.stop();
    let runResults;
    try {
      runResults = await runAllTasks(tasks, skill.body, model);
      totalTokens += runResults.reduce(
        (acc, r) => acc + r.withSkill.tokens + r.withoutSkill.tokens,
        0
      );
      status.ok(`Ran ${runResults.length} dual prompt(s).`);
    } catch (err) {
      status.fail(`Runner failed: ${(err as Error).message}`);
      continue;
    }

    // 4. Grade
    const gradeSpin = spinner(`Grading outputs for ${skill.name}...`);
    gradeSpin.stop();
    let grades;
    try {
      grades = await gradeAllResults(runResults, graderModel);
      status.ok(`Graded ${grades.length} result(s).`);
    } catch (err) {
      status.fail(`Grader failed: ${(err as Error).message}`);
      continue;
    }

    const avgWith = Math.round(grades.reduce((a, g) => a + g.scoreWith, 0) / grades.length);
    const avgDelta = Math.round(grades.reduce((a, g) => a + g.delta, 0) / grades.length);
    skillReports.push({
      name: skill.name,
      score: avgWith,
      delta: avgDelta,
      status: statusFromScore(avgWith),
      tasks: grades.map((g) => ({
        prompt: g.prompt,
        scoreWith: g.scoreWith,
        scoreWithout: g.scoreWithout,
      })),
    });
  }

  // 5. Conflicts
  const conflictSpin = spinner('Checking for conflicts...');
  const conflicts = detectConflicts(skills);
  conflictSpin.succeed(
    conflicts.length > 0
      ? `Detected ${conflicts.length} conflict(s).`
      : 'No conflicts detected.'
  );

  // 6. Report
  const report: BenchReport = {
    timestamp: new Date().toISOString(),
    model,
    skills: skillReports,
    conflicts,
    totalTokens,
    estimatedCost: formatCost(totalTokens),
  };

  console.log();
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    renderTerminal(report);
  }

  if (options.json) writeJsonReport(report);
  if (options.md) {
    writeMarkdownReport(report);
    status.ok('Wrote bench-report.md');
  }
}
