import { describe, it, expect } from 'vitest';
import { parseStackYaml, validateManifest } from '../src/stack/parser.js';

describe('stack parser', () => {
  it('parses a valid skillstack.yaml', () => {
    const yaml = `
name: my-stack
author: alice
description: My favorite skills
agents: [claude-code, cursor]
skills:
  - source: vercel/skills
    skill: frontend-design
  - source: anthropic/skills
    skill: testing-strategy
`;
    const m = parseStackYaml(yaml);
    expect(m.name).toBe('my-stack');
    expect(m.author).toBe('alice');
    expect(m.skills).toHaveLength(2);
    expect(m.agents).toEqual(['claude-code', 'cursor']);
  });

  it('parses without optional agents and bench fields', () => {
    const yaml = `
name: minimal
author: bob
description: bare minimum
skills:
  - source: foo/bar
    skill: x
`;
    const m = parseStackYaml(yaml);
    expect(m.agents).toBeUndefined();
    expect(m.bench).toBeUndefined();
  });

  it('rejects manifests missing required fields', () => {
    const errs = validateManifest({ skills: [] });
    const fields = errs.map((e) => e.field);
    expect(fields).toContain('name');
    expect(fields).toContain('author');
    expect(fields).toContain('description');
    expect(fields).toContain('skills');
  });

  it('rejects skill entries missing source or skill', () => {
    const errs = validateManifest({
      name: 'n',
      author: 'a',
      description: 'd',
      skills: [{ source: 'foo' }, { skill: 'bar' }],
    });
    const fields = errs.map((e) => e.field);
    expect(fields).toContain('skills[0].skill');
    expect(fields).toContain('skills[1].source');
  });

  it('rejects bench.tasks_per_skill out of range', () => {
    const errs = validateManifest({
      name: 'n',
      author: 'a',
      description: 'd',
      skills: [{ source: 'a', skill: 'b' }],
      bench: { tasks_per_skill: 99 },
    });
    expect(errs.some((e) => e.field === 'bench.tasks_per_skill')).toBe(true);
  });
});
