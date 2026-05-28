import { existsSync } from 'fs';
import { execSync } from 'child_process';
import enquirer from 'enquirer';
import { banner, status, error } from '../utils/ui.js';
import { parseStackFile } from '../stack/parser.js';

interface PublishOptions {
  private?: boolean;
}

function run(cmd: string): string {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
}

function safeRun(cmd: string): { ok: boolean; out: string } {
  try {
    return { ok: true, out: run(cmd) };
  } catch (err) {
    return { ok: false, out: (err as Error).message };
  }
}

export async function publishCommand(_options: PublishOptions): Promise<void> {
  banner();

  if (!existsSync('./skillrank.yaml')) {
    error('No skillrank.yaml found in current directory. Run `skillrank create` first.');
    process.exit(1);
  }

  let manifest;
  try {
    manifest = parseStackFile('./skillrank.yaml');
  } catch (err) {
    error((err as Error).message);
    process.exit(1);
    return;
  }
  status.ok(`Loaded stack: ${manifest.name}`);

  // git init if needed
  if (!existsSync('.git')) {
    run('git init -b main');
    status.ok('Initialized git repository.');
  }

  // Check remote
  const remote = safeRun('git remote get-url origin');
  if (!remote.ok) {
    const { user } = (await enquirer.prompt({
      type: 'input',
      name: 'user',
      message: 'GitHub username',
    })) as { user: string };
    if (!user) {
      error('GitHub username required.');
      process.exit(1);
    }
    status.info(
      `Create a repo named '${manifest.name}' on GitHub at https://github.com/new, then press Enter.`
    );
    await (enquirer.prompt({
      type: 'input',
      name: 'ack',
      message: 'Press Enter to continue',
    }) as Promise<{ ack: string }>);
    run(`git remote add origin https://github.com/${user}/${manifest.name}.git`);
    status.ok(`Added remote origin.`);
  }

  // Stage files that should be published
  const candidates = ['skillrank.yaml', 'skillrank-lock.json', 'README.md', 'LICENSE'];
  const staged: string[] = [];
  for (const f of candidates) {
    if (existsSync(f)) {
      safeRun(`git add ${f}`);
      staged.push(f);
    }
  }
  status.info(`Staged: ${staged.join(', ')}`);

  // Commit (allow empty so re-publishes don't fail)
  const commit = safeRun(`git commit -m "feat: publish ${manifest.name} stack"`);
  if (!commit.ok && !/nothing to commit/i.test(commit.out)) {
    status.warn(`Commit issue: ${commit.out}`);
  }

  // Push
  const push = safeRun('git push -u origin main');
  if (!push.ok) {
    error(`Push failed: ${push.out}`);
    process.exit(1);
  }

  // Parse remote to compute install command
  const remoteUrl = safeRun('git remote get-url origin').out;
  const match = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);
  if (match) {
    const [, owner, repo] = match;
    console.log();
    status.ok(`Published! Others can install with:`);
    console.log(`    npx skillrank install ${owner}/${repo}`);
  } else {
    status.ok('Published!');
  }
}
