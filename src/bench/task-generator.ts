import Anthropic from '@anthropic-ai/sdk';
import { getApiKey } from '../utils/config.js';
import type { ParsedSkill } from '../utils/skillmd.js';

export interface GeneratedTasks {
  skillName: string;
  tasks: string[];
}

const SYSTEM_PROMPT = `You are a test prompt generator. Given an agent skill's name and description,
generate exactly {count} realistic user prompts that would trigger this skill.

Rules:
- Each prompt should be a natural request a developer would make
- Prompts should test different aspects of the skill
- Keep prompts concise (1-3 sentences)
- Return ONLY a JSON array of strings, nothing else`;

function extractJsonArray(text: string): string[] | null {
  // Try direct parse
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return parsed;
    }
  } catch {
    /* fall through */
  }
  // Extract first JSON array substring
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
        return parsed;
      }
    } catch {
      /* fall through */
    }
  }
  return null;
}

/**
 * Use Claude to generate `count` realistic test prompts that should trigger
 * the given skill. Retries once on JSON parse failure.
 */
export async function generateTasks(
  skill: ParsedSkill,
  count: number,
  model: string
): Promise<GeneratedTasks> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set. Run `skillrank config` or export ANTHROPIC_API_KEY.');
  }
  const client = new Anthropic({ apiKey });

  const system = SYSTEM_PROMPT.replace('{count}', String(count));
  const user = `Skill name: ${skill.name}\nDescription: ${skill.description}\n\nGenerate ${count} test prompts.`;

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await client.messages.create({
        model,
        max_tokens: 1024,
        temperature: 0.7,
        system,
        messages: [{ role: 'user', content: user }],
      });
      const text = resp.content
        .map((b) => (b.type === 'text' ? b.text : ''))
        .join('')
        .trim();
      const tasks = extractJsonArray(text);
      if (tasks && tasks.length > 0) {
        return { skillName: skill.name, tasks: tasks.slice(0, count) };
      }
      lastError = new Error(`Could not parse task list from model output: ${text.slice(0, 200)}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Unknown task generation failure');
}
