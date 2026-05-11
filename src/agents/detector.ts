import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { AGENTS, type AgentConfig } from './paths.js';

export interface DetectedAgent {
  config: AgentConfig;
  /** All valid skill directories found for this agent */
  skillDirs: string[];
  /** Number of skills found across all dirs */
  skillCount: number;
}

/**
 * Scan the filesystem for installed coding agents.
 * Checks both global (~/) and local (cwd) paths.
 *
 * @param cwd - Working directory for local path checks (defaults to process.cwd())
 * @returns Array of detected agents with their skill directories
 */
export function detectAgents(cwd: string = process.cwd()): DetectedAgent[] {
  const detected: DetectedAgent[] = [];

  for (const agent of AGENTS) {
    const foundDirs: string[] = [];

    // Check global paths (absolute)
    for (const gPath of agent.globalPaths) {
      if (existsSync(gPath)) {
        foundDirs.push(gPath);
      }
    }

    // Check local paths (relative to cwd)
    if (agent.localPaths.length > 0) {
      const localDir = join(cwd, ...agent.localPaths);
      if (existsSync(localDir)) {
        foundDirs.push(localDir);
      }
    }

    if (foundDirs.length > 0) {
      const skillCount = countSkills(foundDirs);
      detected.push({
        config: agent,
        skillDirs: foundDirs,
        skillCount,
      });
    }
  }

  return detected;
}

/**
 * Count SKILL.md files across directories.
 * Skills are folders containing a SKILL.md file.
 */
function countSkills(dirs: string[]): number {
  let count = 0;

  for (const dir of dirs) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillFile = join(dir, entry.name, 'SKILL.md');
          if (existsSync(skillFile)) {
            count++;
          }
        }
        // Also count bare SKILL.md files (some agents symlink directly)
        if (entry.isFile() && entry.name === 'SKILL.md') {
          count++;
        }
      }
    } catch {
      // Directory not readable — skip
    }
  }

  return count;
}

/**
 * Detect a specific agent by name.
 */
export function detectAgent(
  name: string,
  cwd: string = process.cwd()
): DetectedAgent | undefined {
  return detectAgents(cwd).find(
    (d) => d.config.name === name.toLowerCase()
  );
}

/**
 * Quick check: is at least one agent installed?
 */
export function hasAnyAgent(cwd: string = process.cwd()): boolean {
  return detectAgents(cwd).length > 0;
}
