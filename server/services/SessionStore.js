import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SESSIONS_FILE = join(__dirname, '../../data/sessions.json');

function ensureDataDir() {
  const dir = dirname(SESSIONS_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function loadAllSessions() {
  try {
    if (!existsSync(SESSIONS_FILE)) return {};
    return JSON.parse(readFileSync(SESSIONS_FILE, 'utf8') || '{}');
  } catch (error) {
    console.warn('[SessionStore] Failed to read sessions:', error.message);
    return {};
  }
}

function saveAllSessions(data) {
  ensureDataDir();
  writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2));
}

export function getSession(sessionId) {
  if (!sessionId) return null;
  const sessions = loadAllSessions();
  return sessions[sessionId] || null;
}

export function saveSession(sessionId, payload) {
  if (!sessionId) return;
  const sessions = loadAllSessions();
  const existing = sessions[sessionId] || {};
  sessions[sessionId] = {
    ...existing,
    ...payload,
    updatedAt: new Date().toISOString(),
    createdAt: existing.createdAt || new Date().toISOString(),
  };
  saveAllSessions(sessions);
}

export function clearSession(sessionId) {
  if (!sessionId) return;
  const sessions = loadAllSessions();
  if (sessions[sessionId]) {
    delete sessions[sessionId];
    saveAllSessions(sessions);
  }
}
