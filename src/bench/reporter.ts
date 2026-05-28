import { writeFileSync } from 'fs';
import chalk from 'chalk';
import { dim, divider } from '../utils/ui.js';
import type { Conflict } from './conflicts.js';

export type SkillStatus = 'strong' | 'weak' | 'broken';

export interface SkillReport {
  name: string;
  score: number;
  delta: number;
  status: SkillStatus;
  tasks: Array<{ prompt: string; scoreWith: number; scoreWithout: number }>;
}

export interface BenchReport {
  timestamp: string;
  model: string;
  skills: SkillReport[];
  conflicts: Conflict[];
  totalTokens: number;
  estimatedCost: string;
}

export function statusFromScore(score: number): SkillStatus {
  if (score >= 80) return 'strong';
  if (score >= 50) return 'weak';
  return 'broken';
}

function col(text: string, width: number, colorFn: (s: string) => string): string {
  return colorFn(text) + ' '.repeat(Math.max(0, width - text.length));
}

function scoreCol(score: number, width: number): string {
  const text = `${score}/100`;
  const colorFn = score >= 80 ? chalk.green : score >= 50 ? chalk.yellow : chalk.red;
  return col(text, width, colorFn);
}

function deltaCol(delta: number, width: number): string {
  const text = `${delta >= 0 ? '+' : ''}${delta}`;
  const colorFn = delta >= 20 ? chalk.green : delta >= 5 ? chalk.yellow : delta >= 0 ? chalk.dim : chalk.red;
  return col(text, width, colorFn);
}

function statusLabel(score: number): string {
  if (score >= 80) return chalk.green('✅ Strong');
  if (score >= 50) return chalk.yellow('⚠️  Weak');
  return chalk.red('❌ Broken');
}

/**
 * Render the bench scorecard to the terminal.
 */
export function renderTerminal(report: BenchReport): void {
  const sep = '  ' + chalk.dim('─'.repeat(55));
  console.log();
  console.log(
    '  ' +
      chalk.bold('Skill'.padEnd(22)) +
      chalk.bold('Score'.padEnd(9)) +
      chalk.bold('Δ vs raw'.padEnd(11)) +
      chalk.bold('Status')
  );
  console.log(sep);
  for (const s of report.skills) {
    const name = s.name.slice(0, 21).padEnd(22);
    const score = scoreCol(s.score, 9);
    const delta = deltaCol(s.delta, 11);
    console.log(`  ${name}${score}${delta}${statusLabel(s.score)}`);
  }
  console.log(sep);

  if (report.conflicts.length > 0) {
    console.log();
    console.log(chalk.yellow('  ⚠ Conflicts detected:'));
    for (const c of report.conflicts) {
      console.log(
        `    → ${chalk.bold(c.skillA)} & ${chalk.bold(c.skillB)} both trigger on: ` +
          dim(c.overlapKeywords.join(', ')) +
          chalk.dim(`  (${c.overlapPercent}% overlap)`)
      );
    }
  }

  console.log();
  divider();
  console.log(
    `  ${dim('Model:')} ${report.model}   ` +
      `${dim('Tokens:')} ${report.totalTokens.toLocaleString()}   ` +
      `${dim('Est. cost:')} ${report.estimatedCost}`
  );
  console.log();
}

export function writeJsonReport(report: BenchReport, path: string = 'bench-report.json'): void {
  writeFileSync(path, JSON.stringify(report, null, 2) + '\n', 'utf-8');
}

const statusEmoji: Record<SkillStatus, string> = {
  strong: '🟢',
  weak: '🟡',
  broken: '🔴',
};

export function writeMarkdownReport(report: BenchReport, path: string = 'bench-report.md'): void {
  const lines: string[] = [];
  lines.push('# ⚡ skillrank bench report');
  lines.push('');
  lines.push(`_Generated ${report.timestamp} · model \`${report.model}\`_`);
  lines.push('');
  lines.push('| Skill | Score | Δ vs raw | Status |');
  lines.push('|---|---:|---:|:---:|');
  for (const s of report.skills) {
    const sign = s.delta >= 0 ? '+' : '';
    lines.push(
      `| **${s.name}** | ${s.score}/100 | ${sign}${s.delta} | ${statusEmoji[s.status]} ${s.status} |`
    );
  }
  lines.push('');

  if (report.conflicts.length > 0) {
    lines.push('## ⚠ Conflicts');
    lines.push('');
    for (const c of report.conflicts) {
      lines.push(
        `- **${c.skillA}** ↔ **${c.skillB}** — overlap on \`${c.overlapKeywords.join('`, `')}\` (${c.overlapPercent}%)`
      );
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(`Total tokens: **${report.totalTokens.toLocaleString()}** · Est. cost: **${report.estimatedCost}**`);
  lines.push('');
  writeFileSync(path, lines.join('\n'), 'utf-8');
}
