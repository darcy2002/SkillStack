import { readFileSync, existsSync } from 'fs';
import YAML from 'yaml';

// ── Types ────────────────────────────────────────────────
export interface SkillEntry {
  /** GitHub owner/repo or local path */
  source: string;
  /** Skill name within the source repo */
  skill: string;
}

export interface BenchConfig {
  /** Number of test tasks per skill (default: 3) */
  tasks_per_skill?: number;
  /** Claude model to use (default: claude-sonnet-4-20250514) */
  model?: string;
}

export interface StackManifest {
  name: string;
  author: string;
  version?: string;
  description: string;
  /** Target agents — if omitted, installs to all detected agents */
  agents?: string[];
  /** Skills in this stack */
  skills: SkillEntry[];
  /** Optional bench configuration */
  bench?: BenchConfig;
}

// ── Validation ───────────────────────────────────────────
export interface ValidationError {
  field: string;
  message: string;
}

export function validateManifest(data: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  const d = data as Record<string, unknown>;

  if (!d || typeof d !== 'object') {
    return [{ field: 'root', message: 'skillrank.yaml must be a YAML object' }];
  }

  // Required string fields
  for (const field of ['name', 'author', 'description']) {
    if (typeof d[field] !== 'string' || (d[field] as string).trim() === '') {
      errors.push({ field, message: `"${field}" is required and must be a non-empty string` });
    }
  }

  // Skills array
  if (!Array.isArray(d.skills)) {
    errors.push({ field: 'skills', message: '"skills" must be an array' });
  } else if (d.skills.length === 0) {
    errors.push({ field: 'skills', message: '"skills" must contain at least one entry' });
  } else {
    for (let i = 0; i < d.skills.length; i++) {
      const s = d.skills[i] as Record<string, unknown>;
      if (typeof s.source !== 'string' || s.source.trim() === '') {
        errors.push({ field: `skills[${i}].source`, message: 'Each skill must have a "source"' });
      }
      if (typeof s.skill !== 'string' || s.skill.trim() === '') {
        errors.push({ field: `skills[${i}].skill`, message: 'Each skill must have a "skill" name' });
      }
    }
  }

  // Optional agents array
  if (d.agents !== undefined) {
    if (!Array.isArray(d.agents)) {
      errors.push({ field: 'agents', message: '"agents" must be an array of agent names' });
    }
  }

  // Optional bench config
  if (d.bench !== undefined) {
    const b = d.bench as Record<string, unknown>;
    if (typeof b !== 'object') {
      errors.push({ field: 'bench', message: '"bench" must be an object' });
    } else {
      if (b.tasks_per_skill !== undefined && (typeof b.tasks_per_skill !== 'number' || b.tasks_per_skill < 1 || b.tasks_per_skill > 10)) {
        errors.push({ field: 'bench.tasks_per_skill', message: 'Must be a number between 1 and 10' });
      }
    }
  }

  return errors;
}

// ── Parsing ──────────────────────────────────────────────

/**
 * Parse a skillrank.yaml file from disk.
 */
export function parseStackFile(filePath: string): StackManifest {
  if (!existsSync(filePath)) {
    throw new Error(`Stack file not found: ${filePath}`);
  }

  const raw = readFileSync(filePath, 'utf-8');
  return parseStackYaml(raw);
}

/**
 * Parse a skillrank.yaml from string content.
 */
export function parseStackYaml(content: string): StackManifest {
  const data = YAML.parse(content);

  const errors = validateManifest(data);
  if (errors.length > 0) {
    const messages = errors.map((e) => `  • ${e.field}: ${e.message}`).join('\n');
    throw new Error(`Invalid skillrank.yaml:\n${messages}`);
  }

  return data as StackManifest;
}
