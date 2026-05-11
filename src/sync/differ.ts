import type { SkillMatrix } from './scanner.js';

export type SkillStatus = 'synced' | 'missing' | 'outdated' | 'only-here';

export interface DiffEntry {
  skillName: string;
  statuses: Map<string, SkillStatus>;
  latestHash: string;
  sourceAgent: string;
}

// Authoritative ordering for tie-breaking when picking the "latest" version.
const AUTHORITY_ORDER = [
  'claude-code',
  'codex',
  'cursor',
  'copilot',
  'gemini',
  'windsurf',
  'kiro',
  'opencode',
  'roo',
  'amp',
];

function pickLatest(
  agentVersions: Map<string, { hash: string; path: string }>
): { hash: string; agent: string } {
  // Tally hashes
  const tally = new Map<string, { count: number; agents: string[] }>();
  for (const [agent, v] of agentVersions) {
    const t = tally.get(v.hash) ?? { count: 0, agents: [] };
    t.count++;
    t.agents.push(agent);
    tally.set(v.hash, t);
  }

  let bestHash = '';
  let bestCount = -1;
  let bestAgent = '';
  for (const [hash, info] of tally) {
    const authoritative = info.agents
      .slice()
      .sort((a, b) => AUTHORITY_ORDER.indexOf(a) - AUTHORITY_ORDER.indexOf(b))[0];
    if (
      info.count > bestCount ||
      (info.count === bestCount &&
        AUTHORITY_ORDER.indexOf(authoritative) <
          AUTHORITY_ORDER.indexOf(bestAgent))
    ) {
      bestHash = hash;
      bestCount = info.count;
      bestAgent = authoritative;
    }
  }
  return { hash: bestHash, agent: bestAgent };
}

function issueCount(statuses: Map<string, SkillStatus>): number {
  let n = 0;
  for (const s of statuses.values()) {
    if (s !== 'synced' && s !== 'only-here') n++;
  }
  return n;
}

export function computeDiff(matrix: SkillMatrix, agents: string[]): DiffEntry[] {
  const result: DiffEntry[] = [];

  for (const [skillName, perAgent] of matrix) {
    const statuses = new Map<string, SkillStatus>();
    const { hash: latestHash, agent: sourceAgent } = pickLatest(perAgent);

    const onlyOne = perAgent.size === 1;
    for (const a of agents) {
      const v = perAgent.get(a);
      if (!v) {
        statuses.set(a, 'missing');
      } else if (onlyOne) {
        statuses.set(a, 'only-here');
      } else if (v.hash === latestHash) {
        statuses.set(a, 'synced');
      } else {
        statuses.set(a, 'outdated');
      }
    }

    result.push({ skillName, statuses, latestHash, sourceAgent });
  }

  result.sort((a, b) => issueCount(b.statuses) - issueCount(a.statuses));
  return result;
}
