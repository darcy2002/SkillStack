import { describe, it, expect } from 'vitest';
import { resolveStack, resolveOne } from '../src/stack/resolver.js';
import type { StackManifest } from '../src/stack/parser.js';

describe('stack resolver', () => {
  const manifest: StackManifest = {
    name: 'demo',
    author: 'alice',
    description: 'demo stack',
    skills: [
      { source: 'vercel/skills', skill: 'frontend-design' },
      { source: 'anthropic/skills', skill: 'testing-strategy' },
    ],
  };

  it('emits agent flags when agents are configured', () => {
    const resolved = resolveStack({ ...manifest, agents: ['claude-code', 'cursor'] });
    expect(resolved).toHaveLength(2);
    expect(resolved[0].command).toBe(
      'npx skills add vercel/skills --skill "frontend-design" -a claude-code -a cursor -y'
    );
    expect(resolved[0].label).toBe('frontend-design from vercel/skills');
  });

  it('omits agent flags when agents are not set', () => {
    const resolved = resolveStack(manifest);
    expect(resolved[1].command).toBe(
      'npx skills add anthropic/skills --skill "testing-strategy" -y'
    );
  });

  it('resolveOne builds a single command', () => {
    expect(resolveOne({ source: 'a/b', skill: 'c' }, ['claude-code'])).toBe(
      'npx skills add a/b --skill "c" -a claude-code -y'
    );
    expect(resolveOne({ source: 'a/b', skill: 'c' })).toBe(
      'npx skills add a/b --skill "c" -y'
    );
  });
});
