import matter from 'gray-matter';

export interface ConvertedSkill {
  filename: string;
  content: string;
}

/**
 * Convert a SKILL.md file to Cursor's .mdc rule format.
 *
 * Cursor .mdc format:
 * ---
 * description: <skill description>
 * alwaysApply: false
 * ---
 * <body content>
 *
 * Note: Cursor 2.3+ also reads SKILL.md natively from .cursor/skills/,
 * so this conversion is mainly for older Cursor versions or .cursor/rules/.
 */
export function toMdc(skillmdContent: string): ConvertedSkill {
  const { data, content } = matter(skillmdContent);

  const name = data.name || 'unnamed-skill';
  const description = data.description || '';

  const mdcFrontmatter = [
    '---',
    `description: ${description}`,
    'alwaysApply: false',
    '---',
  ].join('\n');

  return {
    filename: `${name}.mdc`,
    content: `${mdcFrontmatter}\n${content.trim()}\n`,
  };
}

/**
 * Convert a SKILL.md file to Windsurf's plain .md rule format.
 * Windsurf rules are plain markdown without YAML frontmatter.
 * We prepend the description as a heading for context.
 */
export function toWindsurfMd(skillmdContent: string): ConvertedSkill {
  const { data, content } = matter(skillmdContent);

  const name = data.name || 'unnamed-skill';
  const description = data.description || '';

  // Windsurf just wants plain markdown — prepend skill context
  const header = description
    ? `# ${name}\n\n> ${description}\n\n`
    : `# ${name}\n\n`;

  return {
    filename: `${name}.md`,
    content: `${header}${content.trim()}\n`,
  };
}

/**
 * Convert SKILL.md to the appropriate format for a target agent.
 * Returns null if no conversion is needed (agent reads SKILL.md natively).
 */
export function convertForAgent(
  skillmdContent: string,
  agentFormat: 'skillmd' | 'mdc' | 'md-rule'
): ConvertedSkill | null {
  switch (agentFormat) {
    case 'skillmd':
      return null; // No conversion needed
    case 'mdc':
      return toMdc(skillmdContent);
    case 'md-rule':
      return toWindsurfMd(skillmdContent);
  }
}
