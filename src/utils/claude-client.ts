/**
 * claude-client.ts
 * 
 * Drop-in Claude API wrapper that tries two backends:
 * 1. @anthropic-ai/sdk (if ANTHROPIC_API_KEY is set)
 * 2. `ant messages create` CLI (uses your Claude Code subscription auth)
 * 
 * USAGE: Replace direct Anthropic SDK calls with this.
 * 
 * Before:
 *   import Anthropic from '@anthropic-ai/sdk';
 *   const client = new Anthropic({ apiKey });
 *   const response = await client.messages.create({ model, max_tokens, system, messages });
 *   const text = response.content[0].text;
 *   const tokens = response.usage.input_tokens + response.usage.output_tokens;
 * 
 * After:
 *   import { claudeChat } from './claude-client.js';
 *   const { text, inputTokens, outputTokens } = await claudeChat({ model, maxTokens, system, userMessage });
 * 
 * To integrate: Copy this file into src/utils/, then update task-generator.ts, runner.ts, and grader.ts
 * to use claudeChat() instead of the Anthropic SDK directly.
 */

import { execSync } from 'child_process';
import { getApiKey } from './config.js';

export interface ChatRequest {
  model: string;
  maxTokens: number;
  system?: string;
  userMessage: string;
}

export interface ChatResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

type Backend = 'sdk' | 'ant-cli';

/**
 * Detect which backend is available.
 * Priority: SDK (API key) > ant CLI
 */
function detectBackend(): Backend {
  // 1. Check for API key
  if (getApiKey()) {
    return 'sdk';
  }

  // 2. Check for ant CLI
  try {
    execSync('ant --version', { stdio: 'pipe' });
    return 'ant-cli';
  } catch {
    // ant not installed
  }

  throw new Error(
    'No Claude API backend available.\n' +
    'Either:\n' +
    '  • Set ANTHROPIC_API_KEY environment variable\n' +
    '  • Install the Anthropic CLI: npm install -g @anthropic-ai/cli\n' +
    '    Then authenticate: ant auth login'
  );
}

let _backend: Backend | null = null;

function getBackend(): Backend {
  if (!_backend) {
    _backend = detectBackend();
  }
  return _backend;
}

/**
 * Send a chat message to Claude via the best available backend.
 */
export async function claudeChat(req: ChatRequest): Promise<ChatResponse> {
  const backend = getBackend();

  if (backend === 'sdk') {
    return chatViaSDK(req);
  } else {
    return chatViaAntCLI(req);
  }
}

// ── Backend: Anthropic SDK ───────────────────────────────
async function chatViaSDK(req: ChatRequest): Promise<ChatResponse> {
  // Dynamic import so the SDK isn't required if using ant CLI
  const { default: Anthropic } = await import('@anthropic-ai/sdk');

  const client = new Anthropic({ apiKey: getApiKey() });

  const response = await client.messages.create({
    model: req.model,
    max_tokens: req.maxTokens,
    ...(req.system ? { system: req.system } : {}),
    messages: [{ role: 'user', content: req.userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');

  return {
    text: textBlock && 'text' in textBlock ? textBlock.text : '',
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

// ── Backend: ant CLI ─────────────────────────────────────
function chatViaAntCLI(req: ChatRequest): Promise<ChatResponse> {
  // Build the ant messages create command
  // The message must be valid YAML for ant CLI
  const messageYaml = `{role: user, content: ${JSON.stringify(req.userMessage)}}`;

  const args: string[] = [
    'ant', 'messages', 'create',
    '--model', req.model,
    '--max-tokens', String(req.maxTokens),
    '--message', messageYaml,
    '--output-format', 'json',
  ];

  if (req.system) {
    args.push('--system', JSON.stringify(req.system));
  }

  try {
    const stdout = execSync(args.join(' '), {
      encoding: 'utf-8',
      timeout: 120000, // 2 min timeout per call
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const response = JSON.parse(stdout);

    const textBlock = response.content?.find(
      (b: { type: string }) => b.type === 'text'
    );

    return Promise.resolve({
      text: textBlock?.text || '',
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Promise.reject(new Error(`ant CLI failed: ${message}`));
  }
}

/**
 * Check which backend would be used (for status display).
 */
export function getActiveBackend(): { backend: string; detail: string } {
  try {
    const b = getBackend();
    if (b === 'sdk') {
      return { backend: 'Anthropic SDK', detail: 'Using ANTHROPIC_API_KEY' };
    }
    return { backend: 'ant CLI', detail: 'Using Claude subscription auth' };
  } catch {
    return { backend: 'none', detail: 'No backend available' };
  }
}
