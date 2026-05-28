import { Command } from 'commander';
import chalk from 'chalk';
import { installCommand } from './commands/install.js';
import { benchCommand } from './commands/bench.js';
import { syncCommand } from './commands/sync.js';
import { createCommand } from './commands/create.js';
import { publishCommand } from './commands/publish.js';
import { listCommand } from './commands/list.js';
import { scoreCommand } from './commands/score.js';

const program = new Command();

program
  .name('skillrank')
  .description(
    chalk.bold('Curated, tested, shareable agent skill bundles.\n') +
    chalk.dim('Stacks · Bench · Sync — for the open agent skills ecosystem.')
  )
  .version('0.1.0');

// ── install ──────────────────────────────────────────────
program
  .command('install [stack]')
  .alias('i')
  .description('Install a skill stack from GitHub or local skillrank.yaml')
  .option('-f, --file <path>', 'Path to local skillrank.yaml')
  .option('-a, --agent <agents...>', 'Target specific agents (e.g. claude-code cursor)')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(installCommand);

// ── bench ────────────────────────────────────────────────
program
  .command('bench')
  .description('Benchmark installed skills — score quality, find conflicts')
  .option('-s, --stack <path>', 'Bench only skills in a specific stack file')
  .option('-m, --model <model>', 'Claude model for skill testing', 'claude-sonnet-4-6')
  .option('-g, --grader-model <model>', 'Claude model for grading', 'claude-haiku-4-5-20251001')
  .option('-t, --tasks <n>', 'Test prompts per skill', '3')
  .option('--json', 'Output raw JSON instead of table')
  .option('--md', 'Also write bench-report.md')
  .action(benchCommand);

// ── sync ─────────────────────────────────────────────────
program
  .command('sync')
  .description('Audit and sync skills across all detected agents')
  .option('--dry-run', 'Show diff without making changes')
  .option('-a, --agent <agents...>', 'Limit to specific agents')
  .action(syncCommand);

// ── create ───────────────────────────────────────────────
program
  .command('create')
  .description('Interactively create a new skillrank.yaml')
  .option('-n, --name <name>', 'Stack name')
  .option('-o, --output <path>', 'Output path', './skillrank.yaml')
  .action(createCommand);

// ── publish ──────────────────────────────────────────────
program
  .command('publish')
  .description('Publish your stack to GitHub')
  .option('--private', 'Create a private repository')
  .action(publishCommand);

// ── list ─────────────────────────────────────────────────
program
  .command('list')
  .alias('ls')
  .description('List installed stacks and skills')
  .option('--agents', 'Group by agent')
  .action(listCommand);

// ── score (quick single-skill bench) ─────────────────────
program
  .command('score <skill>')
  .description('Quick benchmark a single installed skill')
  .option('-m, --model <model>', 'Claude model to use', 'claude-sonnet-4-6')
  .action(scoreCommand);

// ── parse & run ──────────────────────────────────────────
program.parse();
