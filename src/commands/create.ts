import { writeFileSync, existsSync } from 'fs';
import { basename, resolve } from 'path';
import { execSync } from 'child_process';
import enquirer from 'enquirer';
import YAML from 'yaml';
import { banner, status, heading, error } from '../utils/ui.js';
import { detectAgents } from '../agents/detector.js';
import { scanAllSkills } from '../bench/scanner.js';
import type { SkillEntry } from '../stack/parser.js';

interface CreateOptions {
  name?: string;
  output: string;
}

function gitUserName(): string {
  try {
    return execSync('git config user.name', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim() || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

export async function createCommand(options: CreateOptions): Promise<void> {
  banner();
  heading('Create a new skillstack');

  const defaultName = options.name ?? basename(resolve(process.cwd()));
  const defaultAuthor = gitUserName();

  const meta = (await enquirer.prompt([
    { type: 'input', name: 'name', message: 'Stack name', initial: defaultName },
    { type: 'input', name: 'author', message: 'Author', initial: defaultAuthor },
    { type: 'input', name: 'description', message: 'Description', initial: 'A curated skill stack' },
  ])) as { name: string; author: string; description: string };

  // Pick target agents
  const detected = detectAgents();
  let targetAgents: string[] = [];
  if (detected.length > 0) {
    const { agents } = (await enquirer.prompt({
      type: 'multiselect',
      name: 'agents',
      message: 'Target agents (space to select)',
      choices: detected.map((d) => ({ name: d.config.name, message: d.config.displayName })),
    })) as { agents: string[] };
    targetAgents = agents ?? [];
  }

  // Pick skills from those already installed
  const installed = scanAllSkills();
  const skillEntries: SkillEntry[] = [];
  if (installed.length > 0) {
    const { picked } = (await enquirer.prompt({
      type: 'multiselect',
      name: 'picked',
      message: 'Pick installed skills to include',
      choices: installed.map((s) => ({ name: s.name, message: `${s.name} — ${s.description.slice(0, 60)}` })),
    })) as { picked: string[] };
    for (const name of picked ?? []) {
      skillEntries.push({ source: 'local', skill: name });
    }
  }

  // Optional: external skills
  let addMore = true;
  while (addMore) {
    const { more } = (await enquirer.prompt({
      type: 'confirm',
      name: 'more',
      message: 'Add a skill from a GitHub source?',
      initial: false,
    })) as { more: boolean };
    if (!more) break;
    const entry = (await enquirer.prompt([
      { type: 'input', name: 'source', message: 'Source (owner/repo or URL)' },
      { type: 'input', name: 'skill', message: 'Skill name' },
    ])) as { source: string; skill: string };
    if (entry.source && entry.skill) {
      skillEntries.push({ source: entry.source.trim(), skill: entry.skill.trim() });
    }
    addMore = true;
  }

  if (skillEntries.length === 0) {
    error('A stack must contain at least one skill.');
    process.exit(1);
  }

  const manifest = {
    name: meta.name,
    author: meta.author,
    version: '0.1.0',
    description: meta.description,
    ...(targetAgents.length > 0 ? { agents: targetAgents } : {}),
    skills: skillEntries,
  };

  const outPath = options.output;
  if (existsSync(outPath)) {
    const { overwrite } = (await enquirer.prompt({
      type: 'confirm',
      name: 'overwrite',
      message: `${outPath} exists. Overwrite?`,
      initial: false,
    })) as { overwrite: boolean };
    if (!overwrite) {
      status.info('Aborted.');
      return;
    }
  }

  writeFileSync(outPath, YAML.stringify(manifest), 'utf-8');
  status.ok(`Wrote ${outPath}`);
  console.log();
  status.info('Next: run `skillstack install` to install this stack.');
}
