import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_DIR = join(homedir(), '.skillrank');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface SkillrankConfig {
  /** Anthropic API key for bench commands */
  anthropicApiKey?: string;
  /** Default Claude model for bench */
  defaultModel?: string;
  /** Default number of test tasks per skill */
  defaultTasks?: number;
  /** GitHub token for private repos */
  githubToken?: string;
  /** Telemetry opt-out */
  telemetry?: boolean;
}

/**
 * Load config from ~/.skillrank/config.json.
 * Returns empty config if file doesn't exist.
 */
export function loadConfig(): SkillrankConfig {
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }

  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as SkillrankConfig;
  } catch {
    return {};
  }
}

/**
 * Save config to ~/.skillrank/config.json.
 */
export function saveConfig(config: SkillrankConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

/**
 * Get the Anthropic API key.
 * Checks: env var → config file.
 * Returns undefined if not found (caller should prompt).
 */
export function getApiKey(): string | undefined {
  // Environment variable takes priority
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) return envKey;

  // Fall back to config file
  const config = loadConfig();
  return config.anthropicApiKey;
}

/**
 * Store the API key in config.
 */
export function setApiKey(key: string): void {
  const config = loadConfig();
  config.anthropicApiKey = key;
  saveConfig(config);
}

/**
 * Check if bench features are available (API key set).
 */
export function hasBenchAccess(): boolean {
  return !!getApiKey();
}
