import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';

// ── Branding ─────────────────────────────────────────────
export const LOGO = chalk.bold.magenta('⚡ skillstack');

export function banner(): void {
  console.log();
  console.log(`  ${LOGO}  ${chalk.dim('v0.1.0')}`);
  console.log(chalk.dim('  Curated, tested, shareable agent skill bundles.'));
  console.log();
}

// ── Status indicators ────────────────────────────────────
export const status = {
  ok: (msg: string) => console.log(`  ${chalk.green('✔')} ${msg}`),
  fail: (msg: string) => console.log(`  ${chalk.red('✖')} ${msg}`),
  warn: (msg: string) => console.log(`  ${chalk.yellow('⚠')} ${msg}`),
  info: (msg: string) => console.log(`  ${chalk.blue('ℹ')} ${msg}`),
  skip: (msg: string) => console.log(`  ${chalk.dim('○')} ${chalk.dim(msg)}`),
};

// ── Spinners ─────────────────────────────────────────────
export function spinner(text: string) {
  return ora({
    text,
    spinner: 'dots',
    color: 'magenta',
  }).start();
}

// ── Tables ───────────────────────────────────────────────
export function createTable(head: string[], colWidths?: number[]): Table.Table {
  return new Table({
    head: head.map((h) => chalk.bold(h)),
    ...(colWidths ? { colWidths } : {}),
    style: {
      head: [],
      border: ['dim'],
      compact: false,
    },
    chars: {
      top: '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
      bottom: '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
      left: '│', 'left-mid': '├', mid: '─', 'mid-mid': '┼',
      right: '│', 'right-mid': '┤', middle: '│',
    },
  });
}

// ── Bench scorecard colors ───────────────────────────────
export function scoreColor(score: number): string {
  if (score >= 80) return chalk.green(`${score}/100`);
  if (score >= 50) return chalk.yellow(`${score}/100`);
  return chalk.red(`${score}/100`);
}

export function deltaColor(delta: number): string {
  if (delta >= 20) return chalk.green(`+${delta}`);
  if (delta >= 5) return chalk.yellow(`+${delta}`);
  if (delta >= 0) return chalk.dim(`+${delta}`);
  return chalk.red(`${delta}`);
}

export function statusBadge(score: number): string {
  if (score >= 80) return chalk.bgGreen.black(' Strong ');
  if (score >= 50) return chalk.bgYellow.black('  Weak  ');
  return chalk.bgRed.white(' Broken ');
}

// ── Misc formatting ──────────────────────────────────────
export function agentBadge(name: string): string {
  const colors: Record<string, typeof chalk.blue> = {
    'claude-code': chalk.magenta,
    cursor: chalk.blue,
    codex: chalk.green,
    copilot: chalk.cyan,
    gemini: chalk.yellow,
    windsurf: chalk.red,
    kiro: chalk.white,
    opencode: chalk.gray,
    roo: chalk.magentaBright,
    amp: chalk.blueBright,
  };
  const colorFn = colors[name] || chalk.white;
  return colorFn(`[${name}]`);
}

export function heading(text: string): void {
  console.log();
  console.log(chalk.bold.underline(text));
  console.log();
}

export function dim(text: string): string {
  return chalk.dim(text);
}

export function bold(text: string): string {
  return chalk.bold(text);
}

export function error(msg: string): void {
  console.error(`\n  ${chalk.red.bold('Error:')} ${msg}\n`);
}

export function divider(): void {
  console.log(chalk.dim('  ─'.repeat(30)));
}
