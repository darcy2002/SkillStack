import Anthropic from '@anthropic-ai/sdk';
import { getApiKey } from '../utils/config.js';

export interface DualOutput {
  output: string;
  tokens: number;
}

export interface RunResult {
  prompt: string;
  withSkill: DualOutput;
  withoutSkill: DualOutput;
}

function getClient(): Anthropic {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set. Run `skillstack config` or export ANTHROPIC_API_KEY.');
  }
  return new Anthropic({ apiKey });
}

function textOf(content: Anthropic.Messages.ContentBlock[]): string {
  return content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
}

async function callModel(
  client: Anthropic,
  model: string,
  systemPrompt: string | undefined,
  userPrompt: string
): Promise<DualOutput> {
  const resp = await client.messages.create({
    model,
    max_tokens: 1024,
    temperature: 0,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages: [{ role: 'user', content: userPrompt }],
  });
  const tokens = (resp.usage?.input_tokens ?? 0) + (resp.usage?.output_tokens ?? 0);
  return { output: textOf(resp.content), tokens };
}

/**
 * Run a single prompt twice — once with the skill in the system prompt,
 * once without — to isolate the skill's contribution.
 */
export async function runDual(
  prompt: string,
  skillBody: string,
  model: string
): Promise<RunResult> {
  const client = getClient();
  const [withSkill, withoutSkill] = await Promise.all([
    callModel(client, model, skillBody, prompt),
    callModel(client, model, undefined, prompt),
  ]);
  return { prompt, withSkill, withoutSkill };
}

/**
 * Run every task sequentially through runDual.
 * Sequential (not parallel) to avoid rate limits.
 */
export async function runAllTasks(
  tasks: string[],
  skillBody: string,
  model: string
): Promise<RunResult[]> {
  const results: RunResult[] = [];
  for (let i = 0; i < tasks.length; i++) {
    process.stdout.write(`  · task ${i + 1}/${tasks.length}\r`);
    results.push(await runDual(tasks[i], skillBody, model));
  }
  process.stdout.write('\n');
  return results;
}
