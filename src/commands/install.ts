import { spinner, status, error, banner } from '../utils/ui.js';
import { parseStackFile, parseStackYaml } from '../stack/parser.js';
import { parseGitHubRef, fetchFromGitHub } from '../utils/github.js';
import { detectAgents } from '../agents/detector.js';
import { execSync } from 'child_process';

interface InstallOptions {
  file?: string;
  agent?: string[];
  yes?: boolean;
}

export async function installCommand(
  stack: string | undefined,
  options: InstallOptions
): Promise<void> {
  banner();

  // Determine source: local file or GitHub
  let manifest;

  if (options.file) {
    // Local file
    manifest = parseStackFile(options.file);
  } else if (stack) {
    // GitHub reference
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
    // Check for local skillstack.yaml
    try {
      manifest = parseStackFile('./skillstack.yaml');
    } catch {
      error('No stack specified. Use: skillstack install <user/repo> or skillstack install -f ./skillstack.yaml');
      process.exit(1);
    }
  }

  // Detect agents
  const agents = detectAgents();
  if (agents.length === 0) {
    error('No coding agents detected on this machine.');
    process.exit(1);
  }

  // Filter agents if specified
  const targetAgents = options.agent || manifest.agents || agents.map((a) => a.config.name);
  status.info(`Installing ${manifest.skills.length} skills to ${targetAgents.length} agent(s)...`);

  // Shell out to npx skills add for each skill
  let installed = 0;
  let failed = 0;

  for (const skill of manifest.skills) {
    const agentFlags = targetAgents.map((a) => `-a ${a}`).join(' ');
    const cmd = `npx skills add ${skill.source} --skill "${skill.skill}" ${agentFlags} -y`;

    try {
      const s = spinner(`Installing ${skill.skill} from ${skill.source}...`);
      execSync(cmd, { stdio: 'pipe', timeout: 60000 });
      s.succeed(`${skill.skill}`);
      installed++;
    } catch {
      status.fail(`${skill.skill} — failed to install`);
      failed++;
    }
  }

  // Summary
  console.log();
  status.ok(`Stack "${manifest.name}" installed: ${installed} skills succeeded, ${failed} failed.`);
}
