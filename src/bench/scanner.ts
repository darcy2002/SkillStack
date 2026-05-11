import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { detectAgents } from '../agents/detector.js';
import { parseSkillMd, type ParsedSkill } from '../utils/skillmd.js';

/**
 * Walk an agent skill directory and collect SKILL.md file paths.
 * Looks one level deep (each skill = a folder with SKILL.md).
 */
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
      // skip unreadable
    }
  }
  return out;
}

/**
 * Scan every detected agent and return all installed skills.
 * Deduplicates by skill name — a skill installed in multiple agents
 * appears once (first occurrence wins).
 */
export function scanAllSkills(cwd?: string): ParsedSkill[] {
  const agents = detectAgents(cwd);
  const seen = new Map<string, ParsedSkill>();

  for (const agent of agents) {
    for (const skillDir of agent.skillDirs) {
      for (const file of findSkillFiles(skillDir)) {
        try {
          const parsed = parseSkillMd(file);
          if (!seen.has(parsed.name)) {
            seen.set(parsed.name, parsed);
          }
        } catch {
          // ignore unparseable
        }
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Find a single skill by name across all detected agents.
 */
export function scanSkillByName(name: string, cwd?: string): ParsedSkill | null {
  const all = scanAllSkills(cwd);
  return all.find((s) => s.name === name) ?? null;
}
