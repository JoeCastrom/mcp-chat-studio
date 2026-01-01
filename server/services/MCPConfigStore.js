import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const STORE_PATH = join(DATA_DIR, 'mcp-servers.json');

export async function loadPersistedServers() {
  try {
    const raw = await readFile(STORE_PATH, 'utf8');
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') {
      return {};
    }
    return data;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    console.warn('[MCPConfigStore] Failed to load persisted servers:', error.message);
    return {};
  }
}

export async function savePersistedServers(servers) {
  await mkdir(DATA_DIR, { recursive: true });
  const payload = JSON.stringify(servers || {}, null, 2);
  await writeFile(STORE_PATH, payload, 'utf8');
}

export async function upsertPersistedServer(name, config) {
  const servers = await loadPersistedServers();
  servers[name] = config;
  await savePersistedServers(servers);
}

export async function removePersistedServer(name) {
  const servers = await loadPersistedServers();
  if (servers[name]) {
    delete servers[name];
    await savePersistedServers(servers);
  }
}
