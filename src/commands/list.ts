import { banner, heading, status, agentBadge, createTable, dim } from '../utils/ui.js';
import { detectAgents } from '../agents/detector.js';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { parseSkillMd } from '../utils/skillmd.js';

interface ListOptions {
  agents?: boolean;
}

export async function listCommand(options: ListOptions): Promise<void> {
  banner();

  const agents = detectAgents();

  if (agents.length === 0) {
    status.warn('No coding agents detected on this machine.');
    console.log(dim('  Checked: Claude Code, Cursor, Codex, Copilot, Gemini, Windsurf, Kiro, OpenCode, Roo, Amp'));
    return;
  }

  heading('Detected agents');

  for (const agent of agents) {
    console.log(`  ${agentBadge(agent.config.name)}  ${agent.skillCount} skill(s)`);

    if (options.agents) {
      // Show skills per agent
      for (const dir of agent.skillDirs) {
        try {
          const entries = readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const skillFile = join(dir, entry.name, 'SKILL.md');
              if (existsSync(skillFile)) {
                try {
                  const skill = parseSkillMd(skillFile);
                  console.log(`    ${dim('•')} ${skill.name} ${dim('— ' + skill.description.slice(0, 60))}`);
                } catch {
                  console.log(`    ${dim('•')} ${entry.name} ${dim('(could not parse)')}`);
                }
              }
            }
          }
        } catch {
          // Skip unreadable directories
        }
      }
    }
  }

  if (!options.agents) {
    console.log(dim('\n  Use --agents to see skills per agent'));
  }
}
