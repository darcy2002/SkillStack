import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CACHE_DIR = join(homedir(), '.skillrank', 'cache');

export interface RepoRef {
  owner: string;
  repo: string;
  branch?: string;
}

/**
 * Parse a GitHub reference string into owner/repo.
 * Supports: "user/repo", "https://github.com/user/repo", "github.com/user/repo"
 */
export function parseGitHubRef(ref: string): RepoRef {
  // Full URL
  const urlMatch = ref.match(
    /(?:https?:\/\/)?github\.com\/([^/]+)\/([^/\s#?]+)/
  );
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2].replace(/\.git$/, ''),
    };
  }

  // owner/repo shorthand
  const shortMatch = ref.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2],
    };
  }

  throw new Error(
    `Invalid stack reference: "${ref}". Use "owner/repo" or a GitHub URL.`
  );
}

/**
 * Fetch a file from a GitHub repo using raw.githubusercontent.com.
 * No auth needed for public repos.
 */
export async function fetchFromGitHub(
  ref: RepoRef,
  filePath: string = 'skillrank.yaml'
): Promise<string> {
  const branch = ref.branch || 'main';
  const url = `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${branch}/${filePath}`;

  const response = await fetch(url);

  if (!response.ok) {
    // Try 'master' branch if 'main' fails
    if (branch === 'main') {
      const masterUrl = `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/master/${filePath}`;
      const masterResponse = await fetch(masterUrl);
      if (masterResponse.ok) {
        return masterResponse.text();
      }
    }

    throw new Error(
      `Could not fetch ${filePath} from ${ref.owner}/${ref.repo}. ` +
      `HTTP ${response.status}: ${response.statusText}`
    );
  }

  return response.text();
}

/**
 * Clone a repo to the cache directory (for stacks with extra files).
 * Returns the local cache path.
 */
export function cloneRepo(ref: RepoRef): string {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }

  const repoDir = join(CACHE_DIR, `${ref.owner}--${ref.repo}`);

  if (existsSync(repoDir)) {
    // Pull latest
    try {
      execSync('git pull --ff-only', { cwd: repoDir, stdio: 'pipe' });
    } catch {
      // If pull fails, nuke and re-clone
      execSync(`rm -rf "${repoDir}"`);
    }
  }

  if (!existsSync(repoDir)) {
    const url = `https://github.com/${ref.owner}/${ref.repo}.git`;
    execSync(`git clone --depth 1 "${url}" "${repoDir}"`, { stdio: 'pipe' });
  }

  return repoDir;
}

/**
 * Read a file from a cloned repo cache.
 */
export function readCachedFile(ref: RepoRef, filePath: string): string {
  const repoDir = join(CACHE_DIR, `${ref.owner}--${ref.repo}`);
  const fullPath = join(repoDir, filePath);

  if (!existsSync(fullPath)) {
    throw new Error(`File not found in cache: ${filePath}`);
  }

  return readFileSync(fullPath, 'utf-8');
}
