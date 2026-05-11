import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { detectAgents } from '../agents/detector.js';
import { parseSkillMd, type ParsedSkill } from '../utils/skillmd.js';

export interface SkillInventoryEntry {
  skill: ParsedSkill;
  agent: string;
  dir: string;
}

export type SkillMatrix = Map<string, Map<string, { hash: string; path: string }>>;

function findSkillFiles(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    try {
      const st = statSync(full);
      if (st.isDirectory()) {
        const candidate = join(full, 'SKILL.md');
        if (existsSync(candidate)) out.push(candidate);
      } else if (st.isFile() && entry === 'SKILL.md') {
        out.push(full);
      }
    } catch {
      // skip
    }
  }
  return out;
}

/**
 * Build a cross-agent skill matrix: skillName → agentName → { hash, path }.
 */
export function buildMatrix(
  cwd?: string
): { matrix: SkillMatrix; agents: string[]; allSkills: string[] } {
  const detected = detectAgents(cwd);
  const matrix: SkillMatrix = new Map();
  const agents = detected.map((d) => d.config.name);
  const skillSet = new Set<string>();

  for (const agent of detected) {
    for (const skillDir of agent.skillDirs) {
      for (const file of findSkillFiles(skillDir)) {
        try {
          const parsed = parseSkillMd(file);
          skillSet.add(parsed.name);
          if (!matrix.has(parsed.name)) matrix.set(parsed.name, new Map());
          matrix.get(parsed.name)!.set(agent.config.name, {
            hash: parsed.contentHash,
            path: file,
          });
        } catch {
          // skip
        }
      }
    }
  }

  return { matrix, agents, allSkills: Array.from(skillSet).sort() };
}
