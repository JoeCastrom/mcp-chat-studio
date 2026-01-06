import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AUDIT_FILE = join(__dirname, '../../data/audit.log');

function ensureLogDir() {
  const dir = dirname(AUDIT_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function scrubValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (value.length <= 6) return '***';
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }
  return value;
}

function scrubSecrets(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = Array.isArray(obj) ? [] : {};
  Object.entries(obj).forEach(([key, value]) => {
    const lowered = key.toLowerCase();
    if (
      ['token', 'secret', 'password', 'api_key', 'apikey', 'client_secret'].some(k =>
        lowered.includes(k)
      )
    ) {
      clone[key] = scrubValue(value);
      return;
    }
    if (value && typeof value === 'object') {
      clone[key] = scrubSecrets(value);
    } else {
      clone[key] = value;
    }
  });
  return clone;
}

export function logAudit(event, data = {}) {
  try {
    ensureLogDir();
    const entry = {
      ts: new Date().toISOString(),
      event,
      data: scrubSecrets(data),
    };
    appendFileSync(AUDIT_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (error) {
    console.warn('[Audit] Failed to write audit entry:', error.message);
  }
}
