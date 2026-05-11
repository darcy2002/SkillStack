import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { parseSkillMd, parseSkillMdContent, toSkillMd, extractKeywords } from '../src/utils/skillmd.js';

describe('skillmd parser', () => {
  it('parses frontmatter and body', () => {
    const dir = mkdtempSync(join(tmpdir(), 'skillmd-'));
    const file = join(dir, 'SKILL.md');
    writeFileSync(
      file,
      `---\nname: test-skill\ndescription: A test skill for parsing\n---\n\nHello world body.`
    );
    const parsed = parseSkillMd(file);
    expect(parsed.name).toBe('test-skill');
    expect(parsed.description).toBe('A test skill for parsing');
    expect(parsed.body).toContain('Hello world body');
    expect(parsed.contentHash).toBeTruthy();
  });

  it('roundtrips through toSkillMd', () => {
    const raw = `---\nname: x\ndescription: y\n---\n\nbody`;
    const parsed = parseSkillMdContent(raw);
    const re = toSkillMd(parsed);
    const reparsed = parseSkillMdContent(re);
    expect(reparsed.name).toBe('x');
    expect(reparsed.description).toBe('y');
    expect(reparsed.body).toBe('body');
  });
});

describe('extractKeywords', () => {
  it('removes stopwords and short tokens', () => {
    const kws = extractKeywords('Use this to format a python script');
    expect(kws).toContain('format');
    expect(kws).toContain('python');
    expect(kws).toContain('script');
    expect(kws).not.toContain('the');
    expect(kws).not.toContain('to');
  });

  it('lowercases and strips punctuation', () => {
    const kws = extractKeywords('Generate Tests, Verify, Validate!');
    expect(kws).toContain('generate');
    expect(kws).toContain('tests');
    expect(kws).toContain('verify');
  });
});
