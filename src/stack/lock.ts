import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface LockEntry {
  source: string;
  skill: string;
  installedAt: string;
  contentHash: string;
}

export interface LockFile {
  version: 1;
  stackName: string;
  entries: LockEntry[];
}

const LOCK_FILE_NAME = 'skillrank-lock.json';

function lockPath(dir?: string): string {
  return join(dir ?? process.cwd(), LOCK_FILE_NAME);
}

/**
 * Read and parse skillrank-lock.json. Returns null if not found.
 */
export function readLock(dir?: string): LockFile | null {
  const path = lockPath(dir);
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as LockFile;
  } catch {
    return null;
  }
}

/**
 * Write skillrank-lock.json to disk.
 */
export function writeLock(lock: LockFile, dir?: string): void {
  writeFileSync(lockPath(dir), JSON.stringify(lock, null, 2) + '\n', 'utf-8');
}

/**
 * Add (or replace) an entry in the lock file. Returns a new LockFile.
 * Entries are keyed by (source, skill).
 */
export function addToLock(lock: LockFile, entry: LockEntry): LockFile {
  const filtered = lock.entries.filter(
    (e) => !(e.source === entry.source && e.skill === entry.skill)
  );
  return {
    ...lock,
    entries: [...filtered, entry],
  };
}

/**
 * Create an empty lock file for a stack.
 */
export function createLock(stackName: string): LockFile {
  return { version: 1, stackName, entries: [] };
}
