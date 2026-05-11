import { spinner, status, error, banner } from '../utils/ui.js';
import { parseStackFile, parseStackYaml, type StackManifest } from '../stack/parser.js';
import { resolveStack, resolveOne } from '../stack/resolver.js';
import { readLock, writeLock, addToLock, createLock, type LockFile } from '../stack/lock.js';
import { parseGitHubRef, fetchFromGitHub } from '../utils/github.js';
import { detectAgents } from '../agents/detector.js';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { existsSync } from 'fs';

interface InstallOptions {
  file?: string;
  agent?: string[];
  yes?: boolean;
}

function hashEntry(source: string, skill: string): string {
  return createHash('sha256').update(`${source}::${skill}`).digest('hex').slice(0, 16);
}

export async function installCommand(
  stack: string | undefined,
  options: InstallOptions
): Promise<void> {
  banner();

  let manifest: StackManifest;
  let restoredFromLock = false;

  if (options.file) {
    manifest = parseStackFile(options.file);
  } else if (stack) {
    const ref = parseGitHubRef(stack);
    const s = spinner(`Fetching stack from ${ref.owner}/${ref.repo}...`);
    try {
      const yaml = await fetchFromGitHub(ref);
      manifest = parseStackYaml(yaml);
      s.succeed(`Loaded stack: ${manifest.name} by ${manifest.author}`);
    } catch (err) {
      s.fail('Failed to fetch stack');
      error((err as Error).message);
      process.exit(1);
    }
  } else {
    // No args: prefer lock file, then skillstack.yaml
    const existingLock = readLock();
    if (existingLock && existingLock.entries.length > 0) {
      status.info(`Restoring "${existingLock.stackName}" from skillstack-lock.json...`);
      manifest = {
        name: existingLock.stackName,
        author: 'lockfile',
        description: 'Restored from lock file',
        skills: existingLock.entries.map((e) => ({ source: e.source, skill: e.skill })),
      };
      restoredFromLock = true;
    } else if (existsSync('./skillstack.yaml')) {
      manifest = parseStackFile('./skillstack.yaml');
    } else {
      error(
        'No stack specified. Use: skillstack install <user/repo>, skillstack install -f ./skillstack.yaml, ' +
          'or place a skillstack.yaml / skillstack-lock.json in the current directory.'
      );
      process.exit(1);
      return;
    }
  }

  const agents = detectAgents();
  if (agents.length === 0) {
    error('No coding agents detected on this machine.');
    process.exit(1);
  }

  const targetAgents = options.agent ?? manifest.agents ?? agents.map((a) => a.config.name);
  const effectiveManifest: StackManifest = { ...manifest, agents: targetAgents };
  const resolved = resolveStack(effectiveManifest);

  status.info(
    `Installing ${resolved.length} skill(s) to ${targetAgents.length} agent(s)${
      restoredFromLock ? ' (from lock)' : ''
    }...`
  );

  // Seed lock from existing (so we don't lose unrelated entries)
  let lock: LockFile = readLock() ?? createLock(manifest.name);
  if (lock.stackName !== manifest.name) {
    lock = createLock(manifest.name);
  }

  let installed = 0;
  let failed = 0;

  for (const r of resolved) {
    const s = spinner(`Installing ${r.label}...`);
    try {
      execSync(r.command, { stdio: 'pipe', timeout: 60000 });
      s.succeed(`${r.skill.skill}`);
      installed++;
      lock = addToLock(lock, {
        source: r.skill.source,
        skill: r.skill.skill,
        installedAt: new Date().toISOString(),
        contentHash: hashEntry(r.skill.source, r.skill.skill),
      });
    } catch {
      s.fail(`${r.skill.skill} — failed to install`);
      failed++;
    }
  }

  // Persist lock if we installed anything
  if (installed > 0) {
    try {
      writeLock(lock);
      status.ok(`Wrote skillstack-lock.json (${lock.entries.length} entries).`);
    } catch (err) {
      status.fail(`Could not write lock file: ${(err as Error).message}`);
    }
  }

  console.log();
  status.ok(`Stack "${manifest.name}" installed: ${installed} succeeded, ${failed} failed.`);

  // Silence unused warning for resolveOne (re-exported for command-line callers)
  void resolveOne;
}
