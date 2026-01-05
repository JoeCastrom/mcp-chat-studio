import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STORE_PATH = join(__dirname, '../../data/oauth-tokens.json');
const TOKEN_KEY = process.env.OAUTH_TOKEN_KEY || '';

const memoryTokens = new Map();
let loaded = false;
let warned = false;

function warnOnce(message) {
  if (warned) return;
  warned = true;
  console.warn(message);
}

function ensureDir() {
  const dir = dirname(STORE_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function getKey() {
  if (!TOKEN_KEY) return null;
  return crypto.createHash('sha256').update(TOKEN_KEY).digest();
}

function encryptPayload(payload, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const raw = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(raw), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64')
  };
}

function decryptPayload(payload, key) {
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const data = Buffer.from(payload.data, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  return JSON.parse(decrypted);
}

function loadFromDisk() {
  if (loaded) return;
  loaded = true;
  if (!existsSync(STORE_PATH)) return;

  try {
    const raw = readFileSync(STORE_PATH, 'utf8');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed?.payload) return;

    const key = getKey();
    if (!key) {
      warnOnce('[OAuthTokenStore] OAUTH_TOKEN_KEY missing; tokens kept in memory only.');
      return;
    }

    const decoded = decryptPayload(parsed.payload, key);
    Object.entries(decoded || {}).forEach(([sessionId, token]) => {
      memoryTokens.set(sessionId, token);
    });
  } catch (error) {
    console.warn('[OAuthTokenStore] Failed to load tokens:', error.message);
  }
}

function persistToDisk() {
  const key = getKey();
  if (!key) {
    warnOnce('[OAuthTokenStore] OAUTH_TOKEN_KEY missing; tokens kept in memory only.');
    return;
  }
  ensureDir();
  const payload = Object.fromEntries(memoryTokens.entries());
  const encrypted = encryptPayload(payload, key);
  writeFileSync(STORE_PATH, JSON.stringify({ payload: encrypted }, null, 2));
}

export function getToken(sessionId) {
  if (!sessionId) return null;
  loadFromDisk();
  return memoryTokens.get(sessionId) || null;
}

export function setToken(sessionId, token) {
  if (!sessionId) return;
  loadFromDisk();
  memoryTokens.set(sessionId, token);
  persistToDisk();
}

export function deleteToken(sessionId) {
  if (!sessionId) return;
  loadFromDisk();
  if (memoryTokens.delete(sessionId)) {
    persistToDisk();
  }
}

export function clearTokens() {
  loadFromDisk();
  memoryTokens.clear();
  if (existsSync(STORE_PATH)) {
    try {
      writeFileSync(STORE_PATH, JSON.stringify({ payload: null }, null, 2));
    } catch (error) {
      console.warn('[OAuthTokenStore] Failed to clear tokens:', error.message);
    }
  }
}
