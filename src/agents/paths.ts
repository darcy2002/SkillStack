import { homedir } from 'os';
import { join } from 'path';

export interface AgentConfig {
  name: string;
  displayName: string;
  /** Directories to check for skill presence (global + local) */
  globalPaths: string[];
  localPaths: string[];
  /** Native SKILL.md or needs conversion */
  format: 'skillmd' | 'mdc' | 'md-rule';
  /** npx skills agent identifier */
  npxSkillsId: string;
}

const home = homedir();

/**
 * All supported agents with their skill directory paths and format info.
 * Paths use ~ expansion at runtime via resolve().
 */
export const AGENTS: AgentConfig[] = [
  {
    name: 'claude-code',
    displayName: 'Claude Code',
    globalPaths: [join(home, '.claude', 'skills')],
    localPaths: ['.claude', 'skills'],
    format: 'skillmd',
    npxSkillsId: 'claude-code',
  },
  {
    name: 'codex',
    displayName: 'Codex',
    globalPaths: [
      join(home, '.codex', 'skills'),
      join(home, '.agents', 'skills'),
    ],
    localPaths: ['.agents', 'skills'],
    format: 'skillmd',
    npxSkillsId: 'codex',
  },
  {
    name: 'cursor',
    displayName: 'Cursor',
    globalPaths: [],
    localPaths: ['.cursor', 'skills'],
    format: 'skillmd', // Cursor 2.3+ reads SKILL.md from .cursor/skills/
    npxSkillsId: 'cursor',
  },
  {
    name: 'copilot',
    displayName: 'GitHub Copilot',
    globalPaths: [],
    localPaths: ['.github', 'skills'],
    format: 'skillmd',
    npxSkillsId: 'github-copilot',
  },
  {
    name: 'gemini',
    displayName: 'Gemini CLI',
    globalPaths: [join(home, '.gemini', 'skills')],
    localPaths: ['.gemini', 'skills'],
    format: 'skillmd',
    npxSkillsId: 'gemini-cli',
  },
  {
    name: 'windsurf',
    displayName: 'Windsurf',
    globalPaths: [],
    localPaths: ['.windsurf', 'rules'],
    format: 'md-rule',
    npxSkillsId: 'windsurf',
  },
  {
    name: 'kiro',
    displayName: 'Kiro CLI',
    globalPaths: [join(home, '.kiro', 'skills')],
    localPaths: ['.kiro', 'skills'],
    format: 'skillmd',
    npxSkillsId: 'kiro-cli',
  },
  {
    name: 'opencode',
    displayName: 'OpenCode',
    globalPaths: [join(home, '.agents', 'skills')],
    localPaths: ['.agents', 'skills'],
    format: 'skillmd',
    npxSkillsId: 'opencode',
  },
  {
    name: 'roo',
    displayName: 'Roo',
    globalPaths: [],
    localPaths: ['.roo', 'skills'],
    format: 'skillmd',
    npxSkillsId: 'roo',
  },
  {
    name: 'amp',
    displayName: 'Amp',
    globalPaths: [],
    localPaths: ['.amp', 'skills'],
    format: 'skillmd',
    npxSkillsId: 'amp',
  },
];

/**
 * Look up an agent config by name (case-insensitive, supports aliases).
 */
export function getAgent(name: string): AgentConfig | undefined {
  const lower = name.toLowerCase().replace(/\s+/g, '-');
  return AGENTS.find(
    (a) => a.name === lower || a.npxSkillsId === lower || a.displayName.toLowerCase().replace(/\s+/g, '-') === lower
  );
}

/**
 * Get all agent names for CLI help text.
 */
export function agentNames(): string[] {
  return AGENTS.map((a) => a.name);
}
