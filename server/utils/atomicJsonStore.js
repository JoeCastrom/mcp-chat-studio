/**
 * Atomic JSON Store Utility
 * Provides safe file writes with atomic rename and per-file mutex
 */

import { writeFileSync, renameSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { writeFile, rename, unlink, mkdir } from 'fs/promises';
import { dirname } from 'path';

// In-process mutex per file path
const fileLocks = new Map();

/**
 * Acquire lock for a file path (async)
 */
async function acquireLock(filePath) {
  const maxWait = 10000; // 10 second timeout
  const start = Date.now();

  while (fileLocks.get(filePath)) {
    if (Date.now() - start > maxWait) {
      throw new Error(`Lock timeout for ${filePath}`);
    }
    await new Promise(r => setTimeout(r, 10));
  }
  fileLocks.set(filePath, true);
}

/**
 * Release lock for a file path
 */
function releaseLock(filePath) {
  fileLocks.delete(filePath);
}

/**
 * Ensure directory exists for file path
 */
function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Ensure directory exists for file path (async)
 */
async function ensureDirAsync(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

/**
 * Write JSON atomically (async version with mutex)
 * - Acquires per-file lock
 * - Writes to .tmp file
 * - Renames to target (atomic on POSIX, near-atomic on Windows)
 */
export async function atomicWriteJson(filePath, data) {
  await acquireLock(filePath);
  const tmpPath = filePath + '.tmp';

  try {
    await ensureDirAsync(filePath);
    const content = JSON.stringify(data, null, 2);
    await writeFile(tmpPath, content, 'utf8');
    await rename(tmpPath, filePath);
  } catch (error) {
    // Clean up temp file on error
    try {
      if (existsSync(tmpPath)) {
        await unlink(tmpPath);
      }
    } catch (_e) {
      // Ignore cleanup errors
    }
    throw error;
  } finally {
    releaseLock(filePath);
  }
}

/**
 * Write JSON atomically (sync version)
 * For backwards compatibility with existing sync code
 * Note: No mutex protection in sync version (would require async/await)
 */
export function atomicWriteJsonSync(filePath, data) {
  const tmpPath = filePath + '.tmp';

  try {
    ensureDir(filePath);
    const content = JSON.stringify(data, null, 2);
    writeFileSync(tmpPath, content, 'utf8');
    renameSync(tmpPath, filePath);
  } catch (error) {
    // Clean up temp file on error
    try {
      if (existsSync(tmpPath)) {
        unlinkSync(tmpPath);
      }
    } catch (_e) {
      // Ignore cleanup errors
    }
    throw error;
  }
}

export default {
  atomicWriteJson,
  atomicWriteJsonSync,
};
