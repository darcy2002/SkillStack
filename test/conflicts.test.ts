import { describe, it, expect } from 'vitest';
import { detectConflicts } from '../src/bench/conflicts.js';
import type { ParsedSkill } from '../src/utils/skillmd.js';

function mkSkill(name: string, description: string): ParsedSkill {
  return {
    name,
    description,
    body: '',
    metadata: {},
    filePath: `/${name}/SKILL.md`,
    dirName: name,
    contentHash: 'abc',
    hasScripts: false,
    hasReferences: false,
    hasAssets: false,
  };
}

describe('detectConflicts', () => {
  it('flags pairs with high keyword overlap', () => {
    const a = mkSkill('python-format', 'Format python code with black and isort');
    const b = mkSkill('python-lint', 'Format python code with ruff and isort');
    const conflicts = detectConflicts([a, b], 30);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].overlapKeywords).toContain('python');
  });

  it('finds no conflicts for orthogonal descriptions', () => {
    const a = mkSkill('alpha', 'Generate SQL queries for postgres databases');
    const b = mkSkill('beta', 'Convert react components to vue templates');
    expect(detectConflicts([a, b], 30)).toHaveLength(0);
  });

  it('respects the threshold parameter', () => {
    const a = mkSkill('a', 'foo bar baz qux');
    const b = mkSkill('b', 'foo zzz yyy www');
    const low = detectConflicts([a, b], 10);
    const high = detectConflicts([a, b], 90);
    expect(low.length).toBeGreaterThanOrEqual(high.length);
  });
});
