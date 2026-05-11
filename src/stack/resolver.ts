import type { StackManifest, SkillEntry } from './parser.js';

export interface ResolvedInstall {
  command: string;
  label: string;
  skill: SkillEntry;
}

/**
 * Build the `npx skills add` command for a single skill entry.
 */
export function resolveOne(skill: SkillEntry, agents?: string[]): string {
  const agentFlags = agents && agents.length > 0
    ? ' ' + agents.map((a) => `-a ${a}`).join(' ')
    : '';
  return `npx skills add ${skill.source} --skill "${skill.skill}"${agentFlags} -y`;
}

/**
 * Convert a parsed StackManifest into the list of installable commands.
 * If `manifest.agents` is not defined, agent flags are omitted and
 * `npx skills` will prompt the user.
 */
export function resolveStack(manifest: StackManifest): ResolvedInstall[] {
  return manifest.skills.map((skill) => ({
    command: resolveOne(skill, manifest.agents),
    label: `${skill.skill} from ${skill.source}`,
    skill,
  }));
}
