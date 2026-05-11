import { readFileSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import matter from 'gray-matter';

export interface ParsedSkill {
  /** Skill name from frontmatter */
  name: string;
  /** Description from frontmatter (used for agent discovery) */
  description: string;
  /** Full markdown body (instructions) */
  body: string;
  /** Raw frontmatter data */
  metadata: Record<string, unknown>;
  /** Absolute path to the SKILL.md file */
  filePath: string;
  /** Parent directory name */
  dirName: string;
  /** Content hash for diffing */
  contentHash: string;
  /** Has scripts/ directory */
  hasScripts: boolean;
  /** Has references/ directory */
  hasReferences: boolean;
  /** Has assets/ directory */
  hasAssets: boolean;
}

/**
 * Parse a SKILL.md file into structured data.
 */
export function parseSkillMd(filePath: string): ParsedSkill {
  const raw = readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  const skillDir = dirname(filePath);

  return {
    name: (data.name as string) || basename(skillDir),
    description: (data.description as string) || '',
    body: content.trim(),
    metadata: data,
    filePath,
    dirName: basename(skillDir),
    contentHash: simpleHash(raw),
    hasScripts: existsSync(join(skillDir, 'scripts')),
    hasReferences: existsSync(join(skillDir, 'references')),
    hasAssets: existsSync(join(skillDir, 'assets')),
  };
}

/**
 * Parse raw SKILL.md content (when you already have the string).
 */
export function parseSkillMdContent(
  raw: string,
  filePath: string = '<inline>'
): ParsedSkill {
  const { data, content } = matter(raw);

  return {
    name: (data.name as string) || 'unnamed',
    description: (data.description as string) || '',
    body: content.trim(),
    metadata: data,
    filePath,
    dirName: basename(dirname(filePath)),
    contentHash: simpleHash(raw),
    hasScripts: false,
    hasReferences: false,
    hasAssets: false,
  };
}

/**
 * Reconstruct SKILL.md content from parsed data.
 */
export function toSkillMd(skill: ParsedSkill): string {
  const frontmatter = ['---'];
  frontmatter.push(`name: ${skill.name}`);
  frontmatter.push(`description: ${skill.description}`);

  // Include any extra metadata fields
  for (const [key, value] of Object.entries(skill.metadata)) {
    if (key !== 'name' && key !== 'description') {
      frontmatter.push(`${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
    }
  }

  frontmatter.push('---');

  return `${frontmatter.join('\n')}\n\n${skill.body}\n`;
}

/**
 * Extract trigger keywords from a skill's description.
 * Used for conflict detection (overlapping descriptions).
 */
export function extractKeywords(description: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
    'once', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both',
    'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than',
    'too', 'very', 'just', 'because', 'if', 'when', 'where', 'how', 'what',
    'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'i', 'me',
    'my', 'myself', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she',
    'her', 'it', 'its', 'they', 'them', 'their', 'use', 'using', 'file',
    'files', 'user', 'asks', 'wants', 'work', 'working',
  ]);

  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

/**
 * Simple FNV-1a hash for content diffing.
 * Not cryptographic — just for detecting changes.
 */
function simpleHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
