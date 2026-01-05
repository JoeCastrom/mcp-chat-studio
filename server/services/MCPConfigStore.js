import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const STORE_PATH = join(DATA_DIR, 'mcp-servers.json');

function repairJsonStringEscapes(raw) {
  let out = '';
  let inString = false;
  let escaping = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];

    if (!inString) {
      if (ch === '"') {
        inString = true;
      }
      out += ch;
      continue;
    }

    if (escaping) {
      const isValidEscape = '"\\/bfnrtu'.includes(ch);
      out += isValidEscape ? `\\${ch}` : `\\\\${ch}`;
      escaping = false;
      continue;
    }

    if (ch === '\\') {
      escaping = true;
      continue;
    }

    if (ch === '"') {
      inString = false;
      out += ch;
      continue;
    }

    if (ch === '\n') {
      out += '\\n';
      continue;
    }

    if (ch === '\r') {
      out += '\\r';
      continue;
    }

    out += ch;
  }

  if (escaping) {
    out += '\\\\';
  }

  return out;
}

export async function loadPersistedServers() {
  try {
    const raw = await readFile(STORE_PATH, 'utf8');
    try {
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') {
        return {};
      }
      return data;
    } catch (error) {
      const repaired = repairJsonStringEscapes(raw);
      const data = JSON.parse(repaired);
      if (!data || typeof data !== 'object') {
        return {};
      }
      await writeFile(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
      console.warn('[MCPConfigStore] Repaired invalid JSON in mcp-servers.json');
      return data;
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    console.warn('[MCPConfigStore] Failed to load persisted servers:', error.message);
    if (error.name === 'SyntaxError') {
      try {
        const fallbackName = `mcp-servers.json.broken-${Date.now()}`;
        await rename(STORE_PATH, join(DATA_DIR, fallbackName));
        console.warn(`[MCPConfigStore] Moved invalid file to ${fallbackName}`);
      } catch (renameError) {
        console.warn('[MCPConfigStore] Failed to move invalid config:', renameError.message);
      }
    }
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
