import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const STORE_PATH = join(DATA_DIR, 'oauth-config.json');

export async function loadPersistedOAuthConfig() {
  try {
    const raw = await readFile(STORE_PATH, 'utf8');
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') {
      return {};
    }
    return data;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    console.warn('[OAuthConfigStore] Failed to load persisted config:', error.message);
    return null;
  }
}

export async function savePersistedOAuthConfig(config) {
  await mkdir(DATA_DIR, { recursive: true });
  const payload = JSON.stringify(config || {}, null, 2);
  await writeFile(STORE_PATH, payload, 'utf8');
}

export async function clearPersistedOAuthConfig() {
  try {
    await unlink(STORE_PATH);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('[OAuthConfigStore] Failed to clear persisted config:', error.message);
    }
  }
}
