import { writeFileSync } from 'fs';
import chalk from 'chalk';
import { createTable, scoreColor, deltaColor, statusBadge, dim, divider } from '../utils/ui.js';
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

/**
 * Render the bench scorecard to the terminal.
 */
export function renderTerminal(report: BenchReport): void {
  const table = createTable(['Skill', 'Score', 'Δ vs raw', 'Status']);
  for (const s of report.skills) {
    table.push([s.name, scoreColor(s.score), deltaColor(s.delta), statusBadge(s.score)]);
  }
  console.log(table.toString());

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
  lines.push('# ⚡ skillstack bench report');
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
