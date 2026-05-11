import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import chalk from 'chalk';
import enquirer from 'enquirer';
import { createTable, status, dim } from '../utils/ui.js';
import { getAgent } from '../agents/paths.js';
import { detectAgent } from '../agents/detector.js';
import { convertForAgent } from '../agents/converter.js';
import type { DiffEntry, SkillStatus } from './differ.js';
import type { SkillMatrix } from './scanner.js';

const statusGlyph: Record<SkillStatus, string> = {
  synced: chalk.green('✔'),
  outdated: chalk.yellow('⚠'),
  missing: chalk.red('✖'),
  'only-here': chalk.cyan('●'),
};

export function showDiffTable(diff: DiffEntry[], agents: string[]): void {
  if (diff.length === 0) {
    status.ok('All skills are in sync across all agents! ✔');
    return;
  }
  const table = createTable(['Skill', ...agents, 'Source']);
  for (const entry of diff) {
    const row: string[] = [chalk.bold(entry.skillName)];
    for (const a of agents) {
      row.push(statusGlyph[entry.statuses.get(a) ?? 'missing']);
    }
    row.push(dim(entry.sourceAgent));
    table.push(row);
  }
  console.log(table.toString());
  console.log(
    `  ${chalk.green('✔')} synced   ${chalk.yellow('⚠')} outdated   ` +
      `${chalk.red('✖')} missing   ${chalk.cyan('●')} only-here`
  );
}

function copyDirRecursive(src: string, dest: string): void {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const sp = join(src, entry);
    const dp = join(dest, entry);
    const st = statSync(sp);
    if (st.isDirectory()) {
      copyDirRecursive(sp, dp);
    } else {
      copyFileSync(sp, dp);
    }
  }
}

function writeSkillToAgent(
  skillName: string,
  sourceFile: string,
  targetAgent: string
): { ok: boolean; reason?: string } {
  const cfg = getAgent(targetAgent);
  if (!cfg) return { ok: false, reason: `unknown agent ${targetAgent}` };

  const detected = detectAgent(targetAgent);
  // Prefer detected skillDirs[0], else first global path, else first local.
  let targetRoot: string | undefined =
    detected?.skillDirs[0] ??
    cfg.globalPaths[0] ??
    (cfg.localPaths.length > 0 ? join(process.cwd(), ...cfg.localPaths) : undefined);
  if (!targetRoot) return { ok: false, reason: 'no target directory configured' };

  mkdirSync(targetRoot, { recursive: true });
  const skillmdContent = readFileSync(sourceFile, 'utf-8');

  if (cfg.format === 'skillmd') {
    // Copy whole skill folder
    const srcDir = dirname(sourceFile);
    const destDir = join(targetRoot, basename(srcDir));
    copyDirRecursive(srcDir, destDir);
    return { ok: true };
  }

  const converted = convertForAgent(skillmdContent, cfg.format);
  if (!converted) return { ok: false, reason: 'conversion returned null' };
  writeFileSync(join(targetRoot, converted.filename), converted.content, 'utf-8');
  return { ok: true };
}

export async function reconcile(
  diff: DiffEntry[],
  matrix: SkillMatrix,
  agents: string[],
  dryRun: boolean
): Promise<void> {
  const broken = diff.filter((d) => {
    for (const s of d.statuses.values()) if (s !== 'synced' && s !== 'only-here') return true;
    return false;
  });

  if (broken.length === 0) {
    status.ok('All skills are in sync across all agents! ✔');
    return;
  }

  showDiffTable(broken, agents);
  if (dryRun) {
    status.info('Dry run — no changes made.');
    return;
  }

  const { confirm } = (await enquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Sync ${broken.length} skill(s) across agents?`,
    initial: true,
  })) as { confirm: boolean };
  if (!confirm) {
    status.info('Skipped.');
    return;
  }

  for (const entry of broken) {
    const source = matrix.get(entry.skillName)?.get(entry.sourceAgent);
    if (!source) {
      status.fail(`${entry.skillName}: no source file found`);
      continue;
    }
    for (const agent of agents) {
      const st = entry.statuses.get(agent);
      if (st === 'missing' || st === 'outdated') {
        const res = writeSkillToAgent(entry.skillName, source.path, agent);
        if (res.ok) {
          status.ok(`${entry.skillName} → ${agent}`);
        } else {
          status.fail(`${entry.skillName} → ${agent} (${res.reason})`);
        }
      }
    }
  }
}
