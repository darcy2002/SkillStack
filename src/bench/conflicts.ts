import { extractKeywords, type ParsedSkill } from '../utils/skillmd.js';

export interface Conflict {
  skillA: string;
  skillB: string;
  overlapKeywords: string[];
  overlapPercent: number;
}

/**
 * Detect pairs of skills whose trigger keywords overlap above `threshold`.
 * High overlap suggests the agent may have trouble picking the right skill.
 */
export function detectConflicts(skills: ParsedSkill[], threshold: number = 40): Conflict[] {
  const conflicts: Conflict[] = [];
  const kw = skills.map((s) => ({
    skill: s,
    keywords: new Set(extractKeywords(s.description)),
  }));

  for (let i = 0; i < kw.length; i++) {
    for (let j = i + 1; j < kw.length; j++) {
      const a = kw[i];
      const b = kw[j];
      if (a.keywords.size === 0 || b.keywords.size === 0) continue;

      const overlap: string[] = [];
      for (const k of a.keywords) {
        if (b.keywords.has(k)) overlap.push(k);
      }
      if (overlap.length === 0) continue;

      const denom = Math.min(a.keywords.size, b.keywords.size);
      const pct = Math.round((overlap.length / denom) * 100);
      if (pct >= threshold) {
        conflicts.push({
          skillA: a.skill.name,
          skillB: b.skill.name,
          overlapKeywords: overlap,
          overlapPercent: pct,
        });
      }
    }
  }

  conflicts.sort((x, y) => y.overlapPercent - x.overlapPercent);
  return conflicts;
}
