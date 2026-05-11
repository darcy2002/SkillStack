import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs before importing the module under test
vi.mock('fs', async (orig) => {
  const actual = (await orig()) as typeof import('fs');
  return {
    ...actual,
    existsSync: vi.fn(() => false),
    readdirSync: vi.fn(() => []),
  };
});

import * as fs from 'fs';
import { detectAgents, hasAnyAgent } from '../src/agents/detector.js';

const existsMock = fs.existsSync as unknown as ReturnType<typeof vi.fn>;
const readdirMock = fs.readdirSync as unknown as ReturnType<typeof vi.fn>;

describe('detectAgents', () => {
  beforeEach(() => {
    existsMock.mockReset();
    readdirMock.mockReset();
    existsMock.mockReturnValue(false);
    readdirMock.mockReturnValue([]);
  });

  it('detects no agents on a clean system', () => {
    expect(detectAgents('/tmp/nothing')).toEqual([]);
    expect(hasAnyAgent('/tmp/nothing')).toBe(false);
  });

  it('detects an agent when its directory exists', () => {
    existsMock.mockImplementation((p: unknown) => {
      const path = String(p);
      // Pretend Claude Code's global dir exists
      return path.endsWith('.claude/skills');
    });
    readdirMock.mockReturnValue([]);
    const agents = detectAgents('/tmp/clean');
    const names = agents.map((a) => a.config.name);
    expect(names).toContain('claude-code');
  });

  it('reports a skill count of zero when no SKILL.md files exist', () => {
    existsMock.mockImplementation((p: unknown) => String(p).endsWith('.claude/skills'));
    readdirMock.mockImplementation((_: string, opts?: { withFileTypes?: boolean }) => {
      if (opts?.withFileTypes) return [];
      return [];
    });
    const agents = detectAgents('/tmp/clean');
    const cc = agents.find((a) => a.config.name === 'claude-code');
    expect(cc).toBeDefined();
    expect(cc!.skillCount).toBe(0);
  });
});
