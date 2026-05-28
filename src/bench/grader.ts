import Anthropic from '@anthropic-ai/sdk';
import { getApiKey } from '../utils/config.js';
import type { RunResult } from './runner.js';

export interface GradeResult {
  prompt: string;
  scoreWith: number;
  scoreWithout: number;
  delta: number;
  reasoning: string;
}

interface RawGrade {
  scoreA: number;
  scoreB: number;
  reasoning: string;
}

const GRADER_SYSTEM = `You are an expert code and content quality judge. You will evaluate two outputs
for the same prompt. Score each from 0-100 on:
- Relevance (does it address the prompt?)
- Quality (is it well-structured, correct, complete?)
- Usefulness (would a developer find this helpful?)

Return ONLY a JSON object: { "scoreA": number, "scoreB": number, "reasoning": "brief explanation" }`;

function getClient(): Anthropic {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set.');
  }
  return new Anthropic({ apiKey });
}

function parseGrade(text: string): RawGrade | null {
  const clean = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```$/i, '').trim();
  const tryParse = (s: string): RawGrade | null => {
    try {
      const o = JSON.parse(s);
      if (
        typeof o === 'object' && o !== null &&
        typeof o.scoreA === 'number' &&
        typeof o.scoreB === 'number' &&
        typeof o.reasoning === 'string'
      ) {
        return o as RawGrade;
      }
    } catch {
      /* fall through */
    }
    return null;
  };

  const direct = tryParse(clean);
  if (direct) return direct;
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) return tryParse(match[0]);
  return null;
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Grade two outputs for the same prompt. Randomizes A/B assignment to
 * prevent position bias, then maps results back to with/without.
 */
export async function gradeOutputs(
  prompt: string,
  outputWith: string,
  outputWithout: string,
  model: string
): Promise<{ scoreWith: number; scoreWithout: number; reasoning: string }> {
  const client = getClient();
  // Random A/B assignment
  const swap = Math.random() < 0.5;
  const outputA = swap ? outputWithout : outputWith;
  const outputB = swap ? outputWith : outputWithout;

  const user = `Prompt: ${prompt}\n\n--- Output A ---\n${outputA}\n\n--- Output B ---\n${outputB}`;

  const resp = await client.messages.create({
    model,
    max_tokens: 512,
    temperature: 0,
    system: GRADER_SYSTEM,
    messages: [{ role: 'user', content: user }],
  });
  const text = resp.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
  const parsed = parseGrade(text);
  if (!parsed) {
    throw new Error(`Could not parse grader output: ${text.slice(0, 200)}`);
  }
  const a = clamp(parsed.scoreA);
  const b = clamp(parsed.scoreB);
  return {
    scoreWith: swap ? b : a,
    scoreWithout: swap ? a : b,
    reasoning: parsed.reasoning,
  };
}

/**
 * Grade every RunResult and return per-prompt scorecards.
 */
export async function gradeAllResults(
  results: RunResult[],
  model: string
): Promise<GradeResult[]> {
  const out: GradeResult[] = [];
  for (let i = 0; i < results.length; i++) {
    process.stdout.write(`  · grading ${i + 1}/${results.length}\r`);
    const r = results[i];
    const g = await gradeOutputs(r.prompt, r.withSkill.output, r.withoutSkill.output, model);
    out.push({
      prompt: r.prompt,
      scoreWith: g.scoreWith,
      scoreWithout: g.scoreWithout,
      delta: g.scoreWith - g.scoreWithout,
      reasoning: g.reasoning,
    });
  }
  process.stdout.write('\n');
  return out;
}
