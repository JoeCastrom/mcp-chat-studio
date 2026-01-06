import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { atomicWriteJsonSync } from '../utils/atomicJsonStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STORE_PATH = join(__dirname, '../../data/session-shares.json');
const DEFAULT_TTL_HOURS = 24 * 7;

function loadShares() {
  try {
    if (!existsSync(STORE_PATH)) return {};
    return JSON.parse(readFileSync(STORE_PATH, 'utf8') || '{}');
  } catch (error) {
    console.warn('[SessionShareStore] Failed to read shares:', error.message);
    return {};
  }
}

function saveShares(data) {
  atomicWriteJsonSync(STORE_PATH, data);
}

function cleanupShares(data) {
  const now = Date.now();
  let changed = false;
  Object.entries(data).forEach(([token, entry]) => {
    if (entry?.expiresAt && now > entry.expiresAt) {
      delete data[token];
      changed = true;
    }
  });
  if (changed) saveShares(data);
}

export function createShare(sessionId, ttlHours = DEFAULT_TTL_HOURS) {
  if (!sessionId) return null;
  const data = loadShares();
  cleanupShares(data);
  const token = crypto.randomBytes(10).toString('base64url');
  const now = Date.now();
  data[token] = {
    sessionId,
    createdAt: now,
    expiresAt: now + ttlHours * 60 * 60 * 1000,
  };
  saveShares(data);
  return data[token] ? { token, ...data[token] } : null;
}

export function resolveShare(token) {
  if (!token) return null;
  const data = loadShares();
  cleanupShares(data);
  const entry = data[token];
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    delete data[token];
    saveShares(data);
    return null;
  }
  return entry;
}
