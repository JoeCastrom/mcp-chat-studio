/**
 * Advanced Features UI
 * Collections, Monitors, Tool Explorer, Mocks, Scripts, Documentation, Contracts
 */

// ==========================================
// COLLECTIONS MANAGER
// ==========================================

let currentCollection = null;
let collections = [];
const COLLECTION_RUNS_KEY = 'mcp_chat_studio_collection_runs';
const COLLECTION_SNAPSHOTS_KEY = 'mcp_chat_studio_collection_snapshots';
const COLLECTION_GOLDEN_KEY = 'mcp_chat_studio_collection_golden';

function getCollectionRuns() {
  try {
    return JSON.parse(localStorage.getItem(COLLECTION_RUNS_KEY) || '[]');
  } catch (error) {
    return [];
  }
}

function getCollectionSnapshots() {
  try {
    return JSON.parse(localStorage.getItem(COLLECTION_SNAPSHOTS_KEY) || '[]');
  } catch (error) {
    return [];
  }
}

function saveCollectionSnapshots(snapshots) {
  localStorage.setItem(COLLECTION_SNAPSHOTS_KEY, JSON.stringify(snapshots));
}

function renderSnapshotLibraryList() {
  const listEl = document.getElementById('snapshotLibraryList');
  if (!listEl) return;

  const snapshots = getCollectionSnapshots();
  if (snapshots.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No snapshots saved yet.</div>';
    return;
  }

  listEl.innerHTML = snapshots.map(snapshot => `
    <div class="snapshot-card">
      <div>
        <strong>${escapeHtml(snapshot.collectionName || 'Collection')}</strong>
        <div style="font-size: 0.7rem; color: var(--text-muted)">
          ${new Date(snapshot.timestamp).toLocaleString()} • ${snapshot.results?.total || 0} scenarios
        </div>
      </div>
      <div style="display: flex; gap: 6px">
        <button class="btn" onclick="showSnapshotReport('${snapshot.id}')" style="font-size: 0.65rem; padding: 2px 6px">👁️ View</button>
        <button class="btn" onclick="exportSnapshotById('${snapshot.id}')" style="font-size: 0.65rem; padding: 2px 6px">📤 Export</button>
        <button class="btn" onclick="deleteSnapshot('${snapshot.id}')" style="font-size: 0.65rem; padding: 2px 6px">🗑️</button>
      </div>
    </div>
  `).join('');
}

function showSnapshotLibrary() {
  const existing = document.getElementById('snapshotLibraryModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.id = 'snapshotLibraryModal';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal" style="max-width: 760px; max-height: 85vh">
      <div class="modal-header">
        <h2 class="modal-title">📸 Run Snapshots</h2>
        <button class="modal-close" onclick="closeSnapshotLibrary()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div style="padding: var(--spacing-md); overflow-y: auto; max-height: calc(85vh - 130px)">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
          <div style="font-size: 0.8rem; color: var(--text-muted)">
            Deterministic snapshots capture tools, mocks, env vars, and run outputs.
          </div>
          <button class="btn" onclick="importCollectionSnapshot()">📥 Import Snapshot</button>
        </div>
        <div id="snapshotLibraryList" style="display: flex; flex-direction: column; gap: 8px"></div>
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="closeSnapshotLibrary()">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  renderSnapshotLibraryList();
}

function closeSnapshotLibrary() {
  const modal = document.getElementById('snapshotLibraryModal');
  if (modal) modal.remove();
}

function deleteSnapshot(snapshotId) {
  const snapshots = getCollectionSnapshots();
  const filtered = snapshots.filter(snapshot => snapshot.id !== snapshotId);
  saveCollectionSnapshots(filtered);
  renderSnapshotLibraryList();
  showNotification('Snapshot deleted.', 'success');
}

function matchSnapshotCollection(snapshot, collectionId, collectionName) {
  if (!snapshot) return false;
  if (collectionId && snapshot.collectionId === collectionId) return true;
  if (!collectionId && collectionName && snapshot.collectionName === collectionName) return true;
  return false;
}

function getLatestSnapshotForCollection(collectionId, collectionName) {
  const snapshots = getCollectionSnapshots();
  const filtered = snapshots.filter(snapshot => matchSnapshotCollection(snapshot, collectionId, collectionName));
  if (!filtered.length) return null;
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return filtered[0];
}

function getSnapshotById(snapshotId) {
  const snapshots = getCollectionSnapshots();
  return snapshots.find(snapshot => snapshot.id === snapshotId) || null;
}

function exportSnapshotById(snapshotId) {
  const snapshot = getSnapshotById(snapshotId);
  if (!snapshot) {
    showNotification('Snapshot not found.', 'error');
    return;
  }
  const timestamp = (snapshot.timestamp || new Date().toISOString()).replace(/[:.]/g, '-');
  const name = snapshot.collectionName ? snapshot.collectionName.replace(/[^a-z0-9]/gi, '_') : 'collection';
  downloadJsonFile(`snapshot-${name}-${timestamp}.json`, snapshot);
  showNotification('Snapshot exported.', 'success');
}

async function fetchSnapshotResource(url) {
  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
}

async function saveRunSnapshot(results) {
  if (!results) return;
  const snapshots = getCollectionSnapshots();
  const filtered = snapshots.filter(snapshot => !matchSnapshotCollection(snapshot, results.collectionId, results.collectionName));

  const [tools, status, mocks, scripts] = await Promise.all([
    fetchSnapshotResource('/api/mcp/tools'),
    fetchSnapshotResource('/api/mcp/status'),
    fetchSnapshotResource('/api/mocks'),
    fetchSnapshotResource('/api/scripts')
  ]);

  const globals = typeof window.getGlobalVariables === 'function' ? window.getGlobalVariables() : {};
  const envVars = typeof window.getEnvironmentVariables === 'function' ? window.getEnvironmentVariables() : {};

  const snapshot = {
    id: `snapshot_${Date.now()}`,
    runId: results.runId,
    collectionId: results.collectionId,
    collectionName: results.collectionName,
    timestamp: new Date().toISOString(),
    runConfig: results.runConfig || {},
    results,
    environment: {
      globals,
      envVars,
      runEnv: results.runConfig?.environment || {}
    },
    servers: status?.servers || status || {},
    tools: tools?.tools || [],
    mocks: mocks?.mocks || [],
    scripts: scripts?.scripts || []
  };

  filtered.unshift(snapshot);
  saveCollectionSnapshots(filtered.slice(0, 20));
  showNotification('Snapshot saved for deterministic replay.', 'success');
  return snapshot;
}

function clearRunSnapshot(results) {
  const snapshots = getCollectionSnapshots();
  const filtered = snapshots.filter(snapshot => !matchSnapshotCollection(snapshot, results.collectionId, results.collectionName));
  saveCollectionSnapshots(filtered);
  showNotification('Snapshot cleared.', 'success');
}

function importCollectionSnapshot() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const snapshot = parsed?.results ? parsed : (Array.isArray(parsed) ? parsed[0] : null);
      if (!snapshot || !snapshot.results) {
        showNotification('Invalid snapshot file.', 'error');
        return;
      }

      if (!snapshot.id) snapshot.id = `snapshot_${Date.now()}`;
      snapshot.timestamp = snapshot.timestamp || new Date().toISOString();
      snapshot.collectionId = snapshot.collectionId || snapshot.results?.collectionId;
      snapshot.collectionName = snapshot.collectionName || snapshot.results?.collectionName;

      const snapshots = getCollectionSnapshots();
      const filtered = snapshots.filter(existing => !matchSnapshotCollection(existing, snapshot.collectionId, snapshot.collectionName));
      filtered.unshift(snapshot);
      saveCollectionSnapshots(filtered.slice(0, 20));
      renderSnapshotLibraryList();
      renderCollectionRuns();
      showNotification('Snapshot imported.', 'success');
    } catch (error) {
      showNotification('Failed to import snapshot: ' + error.message, 'error');
    }
  };
  input.click();
}

function showSnapshotReport(snapshotOrId) {
  let snapshot = snapshotOrId;
  if (typeof snapshotOrId === 'string') {
    snapshot = getSnapshotById(snapshotOrId);
  }
  if (!snapshot?.results) {
    showNotification('Snapshot not found.', 'error');
    return;
  }
  const snapshotResults = {
    ...snapshot.results,
    snapshotMeta: snapshot
  };
  showCollectionRunReport(snapshotResults);
}

async function driftCheckSnapshot(results) {
  const snapshot = getLatestSnapshotForCollection(results?.collectionId, results?.collectionName);
  if (!snapshot) {
    showNotification('No snapshot available for drift check.', 'warning');
    return;
  }
  const runConfig = snapshot.runConfig || results?.runConfig || { environment: {}, iterations: 1, iterationData: [] };
  const fresh = await runCollectionWithConfig(snapshot.collectionId || results.collectionId, runConfig);
  recordCollectionRun(fresh);
  renderCollectionRuns();
  showCollectionRunReport(fresh);
}

function getGoldenBaselines() {
  try {
    return JSON.parse(localStorage.getItem(COLLECTION_GOLDEN_KEY) || '{}');
  } catch (error) {
    return {};
  }
}

function saveGoldenBaselines(baselines) {
  localStorage.setItem(COLLECTION_GOLDEN_KEY, JSON.stringify(baselines));
}

function getGoldenKey(collectionId, collectionName) {
  if (collectionId) return `id:${collectionId}`;
  if (collectionName) return `name:${collectionName}`;
  return null;
}

function getGoldenBaselineForCollection(collectionId, collectionName) {
  const baselines = getGoldenBaselines();
  const key = getGoldenKey(collectionId, collectionName);
  if (!key) return null;
  return baselines[key] || null;
}

function getGoldenBaselineForRun(results) {
  return getGoldenBaselineForCollection(results?.collectionId, results?.collectionName);
}

function setGoldenBaseline(results) {
  const key = getGoldenKey(results?.collectionId, results?.collectionName);
  if (!key || !results) return;
  const baselines = getGoldenBaselines();
  baselines[key] = {
    runId: results.runId,
    collectionId: results.collectionId,
    collectionName: results.collectionName,
    timestamp: results.endTime || new Date().toISOString(),
    results
  };
  saveGoldenBaselines(baselines);
}

function clearGoldenBaseline(results) {
  const key = getGoldenKey(results?.collectionId, results?.collectionName);
  if (!key) return;
  const baselines = getGoldenBaselines();
  delete baselines[key];
  saveGoldenBaselines(baselines);
}

function findPreviousCollectionRun(currentResults) {
  if (!currentResults) return null;
  const runs = getCollectionRuns();
  const currentId = currentResults.runId;
  const collectionId = currentResults.collectionId;
  const collectionName = currentResults.collectionName;
  const filtered = runs.filter(run => {
    if (currentId && run.id === currentId) return false;
    if (collectionId && run.collectionId === collectionId) return true;
    if (!collectionId && collectionName && run.collectionName === collectionName) return true;
    return false;
  });
  if (filtered.length === 0) return null;
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return filtered[0];
}

function computeRunDelta(currentResults, previousEntry) {
  if (!currentResults || !previousEntry?.results) return null;
  const previousResults = previousEntry.results;
  const delta = {
    previousTimestamp: previousEntry.timestamp,
    passed: currentResults.passed - (previousResults.passed || 0),
    failed: currentResults.failed - (previousResults.failed || 0),
    skipped: currentResults.skipped - (previousResults.skipped || 0),
    duration: (currentResults.duration || 0) - (previousResults.duration || 0),
    newFailures: [],
    recovered: []
  };

  const prevMap = new Map();
  (previousResults.scenarios || []).forEach(scenario => {
    const key = buildScenarioKey(scenario);
    prevMap.set(key, scenario.status);
  });

  (currentResults.scenarios || []).forEach(scenario => {
    const key = buildScenarioKey(scenario);
    const prevStatus = prevMap.get(key);
    if (scenario.status === 'failed' && prevStatus && prevStatus !== 'failed') {
      delta.newFailures.push(key);
    }
    if (scenario.status === 'passed' && prevStatus === 'failed') {
      delta.recovered.push(key);
    }
  });

  return delta;
}

function renderDeltaBlock(delta, title, badgeText) {
  if (!delta) return '';
  const formatDelta = (value) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}`;
  };
  const newFailures = delta.newFailures.slice(0, 3).map(name => `<span class="pill">${escapeHtml(name)}</span>`).join('');
  const recovered = delta.recovered.slice(0, 3).map(name => `<span class="pill">${escapeHtml(name)}</span>`).join('');
  const moreNew = delta.newFailures.length > 3 ? `+${delta.newFailures.length - 3} more` : '';
  const moreRecovered = delta.recovered.length > 3 ? `+${delta.recovered.length - 3} more` : '';

  return `
    <div style="padding: 12px; margin-bottom: 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-surface)">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
        <strong style="font-size: 0.85rem">${escapeHtml(title)}</strong>
        <span style="font-size: 0.7rem; color: var(--text-muted)">${escapeHtml(badgeText || '')}</span>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.75rem; color: var(--text-muted)">
        <span>Passed: ${formatDelta(delta.passed)}</span>
        <span>Failed: ${formatDelta(delta.failed)}</span>
        <span>Skipped: ${formatDelta(delta.skipped)}</span>
        <span>Duration: ${formatDelta(delta.duration)}ms</span>
      </div>
      ${delta.newFailures.length > 0 ? `
        <div style="margin-top: 8px; font-size: 0.75rem; color: var(--error); display: flex; gap: 6px; flex-wrap: wrap; align-items: center">
          <span>New failures:</span> ${newFailures} ${moreNew ? `<span class="pill">${moreNew}</span>` : ''}
        </div>
      ` : ''}
      ${delta.recovered.length > 0 ? `
        <div style="margin-top: 6px; font-size: 0.75rem; color: var(--success); display: flex; gap: 6px; flex-wrap: wrap; align-items: center">
          <span>Recovered:</span> ${recovered} ${moreRecovered ? `<span class="pill">${moreRecovered}</span>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

function buildScenarioKey(scenario) {
  return `${scenario.scenarioName || scenario.name || 'Scenario'} (iter ${scenario.iteration || 1})`;
}

function saveCollectionRuns(runs) {
  localStorage.setItem(COLLECTION_RUNS_KEY, JSON.stringify(runs));
}

function recordCollectionRun(results) {
  const runs = getCollectionRuns();
  const entry = {
    id: `run_${Date.now()}`,
    collectionId: results.collectionId,
    collectionName: results.collectionName,
    timestamp: results.endTime || new Date().toISOString(),
    duration: results.duration || 0,
    summary: {
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      total: results.total
    },
    results
  };
  results.runId = entry.id;
  runs.unshift(entry);
  saveCollectionRuns(runs.slice(0, 20));
}

function clearCollectionRuns() {
  saveCollectionRuns([]);
  renderCollectionRuns();
  showNotification('Collection run history cleared.', 'success');
}

function renderCollectionRuns() {
  const list = document.getElementById('collectionRunsList');
  if (!list) return;
  const runs = getCollectionRuns();

  if (runs.length === 0) {
    list.innerHTML = '<div class="empty-state">No runs yet. Execute a collection to see reports here.</div>';
    return;
  }

  list.innerHTML = runs.map(run => {
    const golden = getGoldenBaselineForCollection(run.collectionId, run.collectionName);
    const isGolden = golden && golden.runId === run.id;
    const goldenBadge = isGolden ? '<span class="pill" style="border-color: var(--accent); color: var(--accent)">⭐ Golden</span>' : '';
    return `
    <div class="collection-card" style="padding: 10px">
      <div class="collection-header">
        <h3>${escapeHtml(run.collectionName || 'Collection')}</h3>
        <div style="display: flex; gap: 6px; align-items: center">
          ${goldenBadge}
          <span class="badge">${run.summary?.total || 0} scenarios</span>
        </div>
      </div>
      <div class="collection-meta">
        <span>${new Date(run.timestamp).toLocaleString()}</span>
        <span>${run.duration || 0}ms</span>
      </div>
      <div style="display: flex; gap: 8px; font-size: 0.75rem; color: var(--text-muted); margin: 6px 0">
        <span>✅ ${run.summary?.passed || 0}</span>
        <span>❌ ${run.summary?.failed || 0}</span>
        <span>⏭️ ${run.summary?.skipped || 0}</span>
      </div>
      <div class="collection-actions">
        <button class="btn-small" onclick="viewCollectionRunReport('${run.id}')">👁️ View</button>
        <button class="btn-small" onclick="rerunCollectionRun('${run.id}')">↻ Rerun</button>
        <button class="btn-small" onclick="exportCollectionRunById('${run.id}')">📥 JSON</button>
        <button class="btn-small" onclick="exportCollectionRunJUnitById('${run.id}')">🧾 JUnit</button>
        <button class="btn-small" onclick="exportCollectionRunHtmlById('${run.id}')">🧾 HTML</button>
        <button class="btn-small" onclick="exportCollectionRunBundleById('${run.id}')">📦 Bundle</button>
        <button class="btn-small" onclick="createMocksFromRunById('${run.id}')">🎭 Mock</button>
      </div>
    </div>
  `;
  }).join('');
}

function selectCollection(id) {
  currentCollection = collections.find(col => col.id === id) || null;
  if (currentCollection) {
    showNotification(`Selected collection: ${currentCollection.name}`, 'info');
  }
}

async function loadCollections() {
  try {
    const res = await fetch('/api/collections');
    const data = await res.json();
    collections = data.collections || [];
    renderCollectionsList();
    renderCollectionRuns();
  } catch (error) {
    console.error('Failed to load collections:', error);
  }
}

function renderCollectionsList() {
  const list = document.getElementById('collectionsList');
  if (!list) return;

  if (collections.length === 0) {
    list.innerHTML = '<div class="empty-state">No collections yet. Create your first collection!</div>';
    return;
  }

  list.innerHTML = collections.map(col => `
    <div class="collection-card" onclick="selectCollection('${col.id}')">
      <div class="collection-header">
        <h3>${col.name}</h3>
        <span class="badge">${col.scenarioCount || 0} scenarios</span>
      </div>
      <p class="collection-desc">${col.description || 'No description'}</p>
      <div class="collection-meta">
        <span>Updated: ${new Date(col.updatedAt).toLocaleDateString()}</span>
      </div>
      <div class="collection-actions">
        <button class="btn-small" onclick="event.stopPropagation(); addScenarioToCollection('${col.id}')">➕ Add Scenario</button>
        <button class="btn-small" onclick="event.stopPropagation(); runCollection('${col.id}')">▶️ Run</button>
        <button class="btn-small" onclick="event.stopPropagation(); editCollectionSettings('${col.id}')">⚙️ Edit</button>
        <button class="btn-small" onclick="event.stopPropagation(); exportCollection('${col.id}')">📥 Export</button>
        <button class="btn-small btn-danger" onclick="event.stopPropagation(); deleteCollection('${col.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

async function createCollectionModal() {
  const result = await appFormModal({
    title: 'New Collection',
    confirmText: 'Create',
    fields: [
      { id: 'name', label: 'Collection name', required: true, placeholder: 'Smoke Tests' },
      { id: 'description', label: 'Description', placeholder: 'Optional' },
      { id: 'variables', label: 'Environment variables (JSON)', type: 'textarea', value: '{}', rows: 4, monospace: true, hint: 'Overrides global + environment variables for this collection.' },
      { id: 'preScripts', label: 'Pre-script IDs (comma-separated)', placeholder: 'auth, setup' },
      { id: 'postScripts', label: 'Post-script IDs (comma-separated)', placeholder: 'cleanup' }
    ]
  });
  if (!result.confirmed) return;

  const name = (result.values.name || '').trim();
  if (!name) return;

  const description = result.values.description || '';
  const variablesInput = (result.values.variables || '').trim();
  let variables = {};
  if (variablesInput) {
    try {
      variables = JSON.parse(variablesInput);
    } catch (error) {
      showNotification('Invalid JSON for variables: ' + error.message, 'error');
      return;
    }
  }

  const preScriptsInput = result.values.preScripts || '';
  const postScriptsInput = result.values.postScripts || '';
  const preScripts = preScriptsInput ? preScriptsInput.split(',').map(s => s.trim()).filter(Boolean) : [];
  const postScripts = postScriptsInput ? postScriptsInput.split(',').map(s => s.trim()).filter(Boolean) : [];

  try {
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, scenarios: [], variables, preScripts, postScripts })
    });

    if (!res.ok) throw new Error(await res.text());

    await loadCollections();
    showNotification('Collection created!', 'success');
  } catch (error) {
    showNotification('Failed to create collection: ' + error.message, 'error');
  }
}

function coerceCsvValue(value) {
  const trimmed = (value ?? '').trim();
  if (trimmed === '') return '';
  if (trimmed === 'null') return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  const numberValue = Number(trimmed);
  if (!Number.isNaN(numberValue) && String(numberValue) === trimmed) return numberValue;
  return trimmed;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
}

function parseCsvToObjects(text) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.trim()).filter(Boolean);
  if (headers.length === 0) return [];
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((key, index) => {
      row[key] = coerceCsvValue(values[index] ?? '');
    });
    return row;
  });
}

function parseIterationDataInput(input) {
  const trimmed = (input || '').trim();
  if (!trimmed) return { data: [] };
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      return { error: 'Iteration data must be a JSON array or CSV text.' };
    }
    return { data: parsed };
  } catch (error) {
    try {
      const rows = parseCsvToObjects(trimmed);
      if (rows.length === 0) {
        return { error: 'CSV data must include a header row and at least one data row.' };
      }
      return { data: rows };
    } catch (csvError) {
      return { error: 'Iteration data must be valid JSON array or CSV.' };
    }
  }
}

async function runCollection(id) {
  try {
    const defaultEnv = getDefaultRunEnvironment();
    const modalFn = typeof showAppModal === 'function' ? showAppModal : appFormModal;
    const modalPromise = modalFn({
      title: 'Run Collection',
      confirmText: 'Run',
      bodyHtml: `
        <div class="form-group">
          <label class="form-label" for="iterationDataFile">Iteration data file (CSV or JSON)</label>
          <input class="form-input" id="iterationDataFile" type="file" accept=".csv,.json" />
          <div class="form-hint">CSV headers become variables. JSON should be an array of objects.</div>
        </div>
      `,
      fields: [
        {
          id: 'environment',
          label: 'Environment variables (JSON)',
          type: 'textarea',
          value: JSON.stringify(defaultEnv, null, 2),
          rows: 4,
          monospace: true,
          hint: 'Defaults to Global + Environment variables. Override as needed.'
        },
        { id: 'stopOnError', label: 'On error', type: 'select', value: 'false', options: [
          { value: 'false', label: 'Continue on error' },
          { value: 'true', label: 'Stop on first error' }
        ] },
        { id: 'iterations', label: 'Iteration count', type: 'number', value: 1 },
        { id: 'iterationData', label: 'Iteration data (JSON array or CSV)', type: 'textarea', value: '', rows: 4, monospace: true },
        { id: 'retries', label: 'Retries per step', type: 'number', value: 0 },
        { id: 'retryDelayMs', label: 'Retry delay (ms)', type: 'number', value: 250 }
      ]
    });
    setTimeout(() => {
      const overlay = document.querySelector('.modal-overlay[data-app-modal="true"]');
      if (!overlay) return;
      const fileInput = overlay.querySelector('#iterationDataFile');
      const dataInput = overlay.querySelector('#iterationData');
      if (!fileInput || !dataInput) return;
      fileInput.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          dataInput.value = text.trim();
        } catch (error) {
          showNotification('Failed to read file: ' + error.message, 'error');
        }
      });
    }, 0);

    const result = await modalPromise;
    if (!result.confirmed) return;

    const envInput = (result.values.environment || '').trim();
    let environment = {};
    if (envInput) {
      try {
        environment = JSON.parse(envInput);
      } catch (error) {
        showNotification('Invalid environment JSON: ' + error.message, 'error');
        return;
      }
    }

    const iterations = Number(result.values.iterations || 1);
    if (!Number.isFinite(iterations) || iterations < 1) {
      showNotification('Iteration count must be a positive number.', 'error');
      return;
    }

    const dataInput = (result.values.iterationData || '').trim();
    const parsedData = parseIterationDataInput(dataInput);
    if (parsedData.error) {
      showNotification(parsedData.error, 'error');
      return;
    }
    const iterationData = parsedData.data || [];

    const retries = Number(result.values.retries || 0);
    const retryDelayMs = Number(result.values.retryDelayMs || 0);
    if (!Number.isFinite(retries) || retries < 0) {
      showNotification('Retries must be a non-negative number.', 'error');
      return;
    }
    if (!Number.isFinite(retryDelayMs) || retryDelayMs < 0) {
      showNotification('Retry delay must be a non-negative number.', 'error');
      return;
    }

    const stopOnError = String(result.values.stopOnError) === 'true';
    const runConfig = { environment, iterations, iterationData, retries, retryDelayMs, stopOnError };
    const results = await runCollectionWithConfig(id, runConfig);

    const message = `✅ ${results.passed} passed, ❌ ${results.failed} failed, ⏭️ ${results.skipped} skipped`;
    showNotification(message, results.failed === 0 ? 'success' : 'warning');
    recordCollectionRun(results);
    renderCollectionRuns();
    showCollectionRunReport(results);
  } catch (error) {
    showNotification('Failed to run collection: ' + error.message, 'error');
  }
}

async function runCollectionWithConfig(collectionId, runConfig) {
  showNotification('Running collection...', 'info');
  const res = await fetch(`/api/collections/${collectionId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stopOnError: !!runConfig.stopOnError,
      environment: runConfig.environment || {},
      iterations: runConfig.iterations || 1,
      iterationData: runConfig.iterationData || [],
      retries: runConfig.retries || 0,
      retryDelayMs: runConfig.retryDelayMs || 0
    })
  });

  const results = await res.json();
  if (!res.ok) {
    throw new Error(results.error || 'Collection run failed');
  }
  results.runConfig = runConfig;
  return results;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

function escapeXml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getDefaultRunEnvironment() {
  const globals = typeof window.getGlobalVariables === 'function' ? window.getGlobalVariables() : {};
  const envVars = typeof window.getEnvironmentVariables === 'function' ? window.getEnvironmentVariables() : {};
  return { ...globals, ...envVars };
}

function downloadTextFile(filename, data, type = 'text/plain') {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCollectionRunReport(results) {
  downloadTextFile('collection-run-report.json', JSON.stringify(results, null, 2), 'application/json');
}

function exportCollectionRunBundle(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = slugifyName(results.collectionName || 'collection');
  const filename = `collection-run-${name}-${timestamp}.json`;
  const payload = {
    exportedAt: new Date().toISOString(),
    run: results
  };
  downloadTextFile(filename, JSON.stringify(payload, null, 2), 'application/json');
}

function exportCollectionRunJUnit(results) {
  const scenarios = results.scenarios || [];
  const totalTime = scenarios.reduce((sum, s) => sum + (s.duration || 0), 0) / 1000;
  const failures = scenarios.filter(s => s.status === 'failed').length;
  const skipped = scenarios.filter(s => s.status === 'skipped').length;

  const testcases = scenarios.map(scenario => {
    const name = `${scenario.scenarioName || scenario.name || 'Scenario'} (iter ${scenario.iteration || 1})`;
    const duration = ((scenario.duration || 0) / 1000).toFixed(3);
    if (scenario.status === 'failed') {
      return `
        <testcase name="${escapeXml(name)}" time="${duration}">
          <failure message="Failed">Failed</failure>
        </testcase>
      `;
    }
    if (scenario.status === 'skipped') {
      return `
        <testcase name="${escapeXml(name)}" time="${duration}">
          <skipped />
        </testcase>
      `;
    }
    return `<testcase name="${escapeXml(name)}" time="${duration}" />`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="MCP Collection Run" tests="${scenarios.length}" failures="${failures}" skipped="${skipped}" time="${totalTime.toFixed(3)}">
${testcases}
</testsuite>`;
  downloadTextFile('collection-run-report.xml', xml, 'application/xml');
}

function exportCollectionRunHtml(results) {
  const scenarios = results.scenarios || [];
  const statusColor = results.failed > 0 ? '#ef4444' : '#22c55e';
  const rows = scenarios.map(scenario => {
    const status = scenario.status || 'unknown';
    const duration = scenario.duration || 0;
    const iter = scenario.iteration || 1;
    return `
      <tr>
        <td>${escapeHtml(scenario.scenarioName || scenario.name || 'Scenario')}</td>
        <td>${iter}</td>
        <td>${status}</td>
        <td>${duration} ms</td>
      </tr>
    `;
  }).join('');

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Collection Run Report</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; background: #0f111a; color: #e5e7eb; margin: 0; padding: 24px; }
      .card { background: #161926; border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
      h1 { margin: 0 0 8px; font-size: 22px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 10px; border-bottom: 1px solid rgba(148, 163, 184, 0.2); text-align: left; }
      th { color: #9ca3af; font-weight: 600; }
      .summary { display: flex; gap: 16px; flex-wrap: wrap; }
      .pill { padding: 6px 10px; border-radius: 999px; background: rgba(148, 163, 184, 0.12); font-size: 12px; }
      .status { color: ${statusColor}; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Collection Run Report</h1>
      <div class="summary">
        <span class="pill">Collection: ${escapeHtml(results.collectionName || 'Collection')}</span>
        <span class="pill">Status: <span class="status">${results.failed > 0 ? 'Failed' : 'Passed'}</span></span>
        <span class="pill">Passed: ${results.passed}</span>
        <span class="pill">Failed: ${results.failed}</span>
        <span class="pill">Skipped: ${results.skipped}</span>
        <span class="pill">Duration: ${results.duration || 0} ms</span>
      </div>
    </div>
    <div class="card">
      <h2 style="margin-top: 0;">Scenario Results</h2>
      <table>
        <thead>
          <tr><th>Scenario</th><th>Iteration</th><th>Status</th><th>Duration</th></tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="4">No scenarios executed.</td></tr>'}</tbody>
      </table>
    </div>
  </body>
</html>`;

  downloadTextFile('collection-run-report.html', html, 'text/html');
}

function getCollectionRunById(runId) {
  const runs = getCollectionRuns();
  return runs.find(run => run.id === runId)?.results || null;
}

function viewCollectionRunReport(runId) {
  const results = getCollectionRunById(runId);
  if (!results) {
    showNotification('Run report not found.', 'error');
    return;
  }
  showCollectionRunReport(results);
}

function exportCollectionRunById(runId) {
  const results = getCollectionRunById(runId);
  if (!results) {
    showNotification('Run report not found.', 'error');
    return;
  }
  exportCollectionRunReport(results);
}

function exportCollectionRunBundleById(runId) {
  const results = getCollectionRunById(runId);
  if (!results) {
    showNotification('Run report not found.', 'error');
    return;
  }
  exportCollectionRunBundle(results);
}

function exportCollectionRunJUnitById(runId) {
  const results = getCollectionRunById(runId);
  if (!results) {
    showNotification('Run report not found.', 'error');
    return;
  }
  exportCollectionRunJUnit(results);
}

function exportCollectionRunHtmlById(runId) {
  const results = getCollectionRunById(runId);
  if (!results) {
    showNotification('Run report not found.', 'error');
    return;
  }
  exportCollectionRunHtml(results);
}

async function createMocksFromRun(results) {
  const steps = (results.scenarios || []).flatMap(s => s.steps || []);
  const servers = Array.from(new Set(steps.map(step => step.server).filter(Boolean)));

  if (servers.length === 0) {
    showNotification('No steps available for mock generation.', 'error');
    return;
  }

  const filterResult = await appFormModal({
    title: 'Generate Mocks from Run',
    confirmText: 'Generate',
    fields: [
      {
        id: 'serverFilter',
        label: 'Server (optional)',
        type: 'select',
        options: [{ value: '', label: 'All servers' }, ...servers.map(server => ({ value: server, label: server }))]
      }
    ]
  });

  if (!filterResult.confirmed) return;
  const serverFilter = filterResult.values.serverFilter;

  let toolDefs = [];
  try {
    const toolsRes = await fetch('/api/mcp/tools', { credentials: 'include' });
    const toolsData = await toolsRes.json();
    toolDefs = toolsData.tools || [];
  } catch (error) {
    console.warn('Failed to load tool schemas for mocks:', error);
  }

  const grouped = new Map();
  steps.forEach(step => {
    if (!step.server || !step.tool) return;
    if (serverFilter && step.server !== serverFilter) return;
    if (step.status !== 'passed') return;
    if (!grouped.has(step.server)) {
      grouped.set(step.server, new Map());
    }
    grouped.get(step.server).set(step.tool, step.response);
  });

  if (grouped.size === 0) {
    showNotification('No successful steps found for mock generation.', 'error');
    return;
  }

  for (const [serverName, toolMap] of grouped.entries()) {
    const tools = [];
    for (const [toolName, response] of toolMap.entries()) {
      const def = toolDefs.find(t => t.serverName === serverName && t.name === toolName);
      tools.push({
        name: toolName,
        description: def?.description || `Recorded from ${serverName}`,
        inputSchema: def?.inputSchema || { type: 'object', properties: {} },
        response
      });
    }

    try {
      await fetch('/api/mocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: `Mock: ${results.collectionName || serverName} (${serverName})`,
          description: `Auto-generated from run ${results.collectionName || ''}`.trim(),
          tools,
          resources: [],
          prompts: [],
          delay: 0,
          errorRate: 0
        })
      });
    } catch (error) {
      console.error('Failed to create mock from run:', error);
    }
  }

  await loadMockServers();
  showNotification('Mock servers generated from run!', 'success');
}

function createMocksFromRunById(runId) {
  const results = getCollectionRunById(runId);
  if (!results) {
    showNotification('Run report not found.', 'error');
    return;
  }
  createMocksFromRun(results);
}

async function rerunCollectionRun(runId) {
  const results = getCollectionRunById(runId);
  if (!results) {
    showNotification('Run report not found.', 'error');
    return;
  }
  await rerunCollectionFromReport(results);
}

async function rerunCollectionFromReport(results) {
  const runConfig = results.runConfig || { environment: {}, iterations: 1, iterationData: [] };
  const fresh = await runCollectionWithConfig(results.collectionId, runConfig);
  const message = `✅ ${fresh.passed} passed, ❌ ${fresh.failed} failed, ⏭️ ${fresh.skipped} skipped`;
  showNotification(message, fresh.failed === 0 ? 'success' : 'warning');
  recordCollectionRun(fresh);
  renderCollectionRuns();
  showCollectionRunReport(fresh);
}

function refreshCollectionRunReport(results) {
  const modal = document.getElementById('collectionRunReportModal');
  if (modal) modal.remove();
  showCollectionRunReport(results);
}

function markGoldenFromReport(results) {
  setGoldenBaseline(results);
  renderCollectionRuns();
  showNotification('Golden baseline saved.', 'success');
  refreshCollectionRunReport(results);
}

function clearGoldenFromReport(results) {
  clearGoldenBaseline(results);
  renderCollectionRuns();
  showNotification('Golden baseline cleared.', 'success');
  refreshCollectionRunReport(results);
}

function showCollectionRunReport(results) {
  window.lastCollectionRunReport = results;
  const goldenEntry = getGoldenBaselineForRun(results);
  const snapshotEntry = results.snapshotMeta || getLatestSnapshotForCollection(results?.collectionId, results?.collectionName);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.id = 'collectionRunReportModal';
  modal.style.display = 'flex';

  const scenariosHtml = (results.scenarios || []).map(scenario => {
    const statusColor = scenario.status === 'passed' ? 'var(--success)' : scenario.status === 'failed' ? 'var(--error)' : 'var(--text-muted)';
    const stepsHtml = (scenario.steps || []).map(step => `
      <div style="padding: 6px 0; border-top: 1px dashed var(--border)">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem">
          <div>
            <strong>${escapeHtml(step.server || '')}</strong> · <code>${escapeHtml(step.tool || '')}</code>
            <span style="margin-left: 6px; color: ${step.status === 'passed' ? 'var(--success)' : 'var(--error)'}">
              ${step.status || ''}
            </span>
          </div>
          <span style="color: var(--text-muted)">${step.duration || 0}ms</span>
        </div>
        ${step.assertions && step.assertions.length ? `
          <div style="margin-top: 4px; font-size: 0.7rem; color: var(--text-muted)">
            Assertions: ${step.assertions.filter(a => a.passed).length}/${step.assertions.length} passed
          </div>
        ` : ''}
      </div>
    `).join('');

    return `
      <details style="border: 1px solid var(--border); border-radius: 8px; padding: 10px; background: var(--bg-surface)">
        <summary style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; flex-direction: column">
            <span style="font-weight: 600">${escapeHtml(scenario.scenarioName || scenario.name || 'Scenario')}</span>
            <span style="font-size: 0.7rem; color: var(--text-muted)">Iteration ${scenario.iteration || 1}</span>
          </div>
          <span style="font-size: 0.75rem; color: ${statusColor}">
            ${scenario.status || 'unknown'} · ${scenario.duration || 0}ms
          </span>
        </summary>
        <div style="margin-top: 8px">
          ${stepsHtml || '<div style="font-size: 0.7rem; color: var(--text-muted)">No steps reported</div>'}
        </div>
      </details>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="modal" style="max-width: 800px; max-height: 85vh">
      <div class="modal-header">
        <h2 class="modal-title">📊 Collection Run Report</h2>
        <button class="modal-close" onclick="document.getElementById('collectionRunReportModal')?.remove()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div style="padding: var(--spacing-md); overflow-y: auto; max-height: calc(85vh - 130px)">
        ${results.snapshotMeta ? `
          <div style="padding: 12px; margin-bottom: 12px; border-radius: 10px; border: 1px solid var(--border); background: rgba(59, 130, 246, 0.08); font-size: 0.75rem">
            <strong>📸 Snapshot Replay</strong>
            <div style="color: var(--text-muted); margin-top: 4px">
              Captured ${new Date(results.snapshotMeta.timestamp).toLocaleString()} ·
              ${Object.keys(results.snapshotMeta.servers || {}).length} servers ·
              ${(results.snapshotMeta.tools || []).length} tools ·
              ${(results.snapshotMeta.mocks || []).length} mocks
            </div>
          </div>
        ` : ''}
        ${(() => {
          const blocks = [];
          const goldenEntry = getGoldenBaselineForRun(results);
          if (goldenEntry) {
            const goldenDelta = computeRunDelta(results, {
              timestamp: goldenEntry.timestamp,
              results: goldenEntry.results
            });
            blocks.push(renderDeltaBlock(
              goldenDelta,
              `⭐ Golden baseline · ${new Date(goldenEntry.timestamp).toLocaleString()}`,
              'Golden baseline'
            ));
          } else {
            blocks.push(`
              <div style="padding: 12px; margin-bottom: 12px; border-radius: 10px; border: 1px dashed var(--border); background: var(--bg-surface); font-size: 0.75rem; color: var(--text-muted)">
                No golden baseline yet. Use ⭐ Set Golden to lock this run.
              </div>
            `);
          }

          if (snapshotEntry && snapshotEntry.runId !== results.runId) {
            const snapshotDelta = computeRunDelta(results, {
              timestamp: snapshotEntry.timestamp,
              results: snapshotEntry.results
            });
            blocks.push(renderDeltaBlock(
              snapshotDelta,
              `📸 Snapshot · ${new Date(snapshotEntry.timestamp).toLocaleString()}`,
              'Snapshot baseline'
            ));
          }

          const previousEntry = findPreviousCollectionRun(results);
          const delta = computeRunDelta(results, previousEntry);
          if (delta) {
            blocks.push(renderDeltaBlock(
              delta,
              `Δ Regression vs ${new Date(delta.previousTimestamp).toLocaleString()}`,
              'Auto compare'
            ));
          }

          return blocks.join('');
        })()}
        <div style="display: flex; gap: 16px; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 12px">
          <span>✅ ${results.passed} passed</span>
          <span>❌ ${results.failed} failed</span>
          <span>⏭️ ${results.skipped} skipped</span>
          <span>🧪 ${results.total} total</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px">
          ${scenariosHtml || '<div style="color: var(--text-muted)">No scenarios executed.</div>'}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="rerunCollectionFromReport(window.lastCollectionRunReport)">↻ Rerun</button>
        <button class="btn" onclick="createMocksFromRun(window.lastCollectionRunReport)">🎭 Mock from Run</button>
        <button class="btn" onclick="saveRunSnapshot(window.lastCollectionRunReport)">📸 Save Snapshot</button>
        ${snapshotEntry ? `
          <button class="btn" onclick="showSnapshotReport('${snapshotEntry.id}')">🎬 Replay Snapshot</button>
          <button class="btn" onclick="exportSnapshotById('${snapshotEntry.id}')">📤 Export Snapshot</button>
          <button class="btn" onclick="driftCheckSnapshot(window.lastCollectionRunReport)">🔍 Drift Check</button>
          <button class="btn" onclick="clearRunSnapshot(window.lastCollectionRunReport)">🧹 Clear Snapshot</button>
        ` : ''}
        ${goldenEntry ? `
          <button class="btn" onclick="markGoldenFromReport(window.lastCollectionRunReport)">⭐ Update Golden</button>
          <button class="btn" onclick="clearGoldenFromReport(window.lastCollectionRunReport)">🧹 Clear Golden</button>
        ` : `
          <button class="btn" onclick="markGoldenFromReport(window.lastCollectionRunReport)">⭐ Set Golden</button>
        `}
        <button class="btn" onclick="exportCollectionRunReport(window.lastCollectionRunReport)">📥 Export JSON</button>
        <button class="btn" onclick="exportCollectionRunJUnit(window.lastCollectionRunReport)">🧾 Export JUnit</button>
        <button class="btn" onclick="exportCollectionRunHtml(window.lastCollectionRunReport)">🧾 Export HTML</button>
        <button class="btn" onclick="exportCollectionRunBundle(window.lastCollectionRunReport)">📦 Export Bundle</button>
        <button class="btn" onclick="document.getElementById('collectionRunReportModal')?.remove()">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

async function exportCollection(id) {
  try {
    const res = await fetch(`/api/collections/${id}/export`);
    const json = await res.text();

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collection-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    showNotification('Failed to export: ' + error.message, 'error');
  }
}

async function deleteCollection(id) {
  const confirmed = await appConfirm('Delete this collection?', {
    title: 'Delete Collection',
    confirmText: 'Delete',
    confirmVariant: 'danger'
  });
  if (!confirmed) return;

  try {
    await fetch(`/api/collections/${id}`, { method: 'DELETE' });
    await loadCollections();
    showNotification('Collection deleted', 'success');
  } catch (error) {
    showNotification('Failed to delete: ' + error.message, 'error');
  }
}

// ==========================================
// MONITORS DASHBOARD
// ==========================================

let monitors = [];

async function loadMonitors() {
  try {
    const res = await fetch('/api/monitors');
    const data = await res.json();
    monitors = data.monitors || [];
    renderMonitorsList();
    loadMonitorStats();
  } catch (error) {
    console.error('Failed to load monitors:', error);
  }
}

function renderMonitorsList() {
  const list = document.getElementById('monitorsList');
  if (!list) return;

  if (monitors.length === 0) {
    list.innerHTML = '<div class="empty-state">No monitors configured. Create one to schedule automated tests!</div>';
    return;
  }

  list.innerHTML = monitors.map(mon => {
    const statusIcon = mon.enabled ? '🟢' : '⚪';
    const lastStatus = mon.lastStatus === 'passed' ? '✅' : mon.lastStatus === 'failed' ? '❌' : '⏸️';

    return `
      <div class="monitor-card">
        <div class="monitor-header">
          <h3>${statusIcon} ${mon.name}</h3>
          <span class="badge">${mon.schedule}</span>
        </div>
        <div class="monitor-stats">
          <div class="stat">
            <span class="stat-label">Last Run:</span>
            <span class="stat-value">${mon.lastRun ? new Date(mon.lastRun).toLocaleString() : 'Never'}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Status:</span>
            <span class="stat-value">${lastStatus} ${mon.lastStatus || 'N/A'}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Run Count:</span>
            <span class="stat-value">${mon.runCount || 0}</span>
          </div>
        </div>
        <div class="monitor-actions">
          <button class="btn-small" onclick="runMonitorNow('${mon.id}')">▶️ Run Now</button>
          <button class="btn-small" onclick="toggleMonitor('${mon.id}', ${!mon.enabled})">
            ${mon.enabled ? '⏸️ Stop' : '▶️ Start'}
          </button>
          <button class="btn-small btn-danger" onclick="deleteMonitor('${mon.id}')">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

async function loadMonitorStats() {
  try {
    const res = await fetch('/api/monitors/stats');
    const stats = await res.json();

    const statsEl = document.getElementById('monitorsStats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-card">
          <div class="stat-value">${stats.totalMonitors || 0}</div>
          <div class="stat-label">Total Monitors</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.activeMonitors || 0}</div>
          <div class="stat-label">Active</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.totalRuns || 0}</div>
          <div class="stat-label">Total Runs</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.failedMonitors || 0}</div>
          <div class="stat-label">Failed</div>
        </div>
      `;
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

async function createMonitorModal() {
  // Get collections for selection
  await loadCollections();

  if (collections.length === 0) {
    showNotification('Create a collection first!', 'error');
    return;
  }

  const result = await appFormModal({
    title: 'New Monitor',
    confirmText: 'Create',
    fields: [
      { id: 'name', label: 'Monitor name', required: true, placeholder: 'Nightly Contract Check' },
      {
        id: 'collectionId',
        label: 'Collection',
        type: 'select',
        required: true,
        options: collections.map(col => ({
          value: col.id,
          label: `${col.name} (${col.id})`
        }))
      },
      { id: 'schedule', label: 'Schedule', required: true, placeholder: '5m, 1h, or cron expression' }
    ]
  });
  if (!result.confirmed) return;

  const name = (result.values.name || '').trim();
  const collectionId = result.values.collectionId;
  const schedule = (result.values.schedule || '').trim();
  if (!name || !collectionId || !schedule) return;

  try {
    const res = await fetch('/api/monitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        collectionId,
        schedule,
        enabled: true,
        environment: {},
        notifications: []
      })
    });

    if (!res.ok) throw new Error(await res.text());

    await loadMonitors();
    showNotification('Monitor created and started!', 'success');
  } catch (error) {
    showNotification('Failed to create monitor: ' + error.message, 'error');
  }
}

async function runMonitorNow(id) {
  try {
    showNotification('Running monitor...', 'info');
    const res = await fetch(`/api/monitors/${id}/run`, { method: 'POST' });
    const results = await res.json();

    showNotification(`Monitor completed: ${results.passed} passed, ${results.failed} failed`,
      results.failed === 0 ? 'success' : 'warning');

    await loadMonitors();
  } catch (error) {
    showNotification('Failed to run monitor: ' + error.message, 'error');
  }
}

async function toggleMonitor(id, enable) {
  try {
    const endpoint = enable ? 'start' : 'stop';
    await fetch(`/api/monitors/${id}/${endpoint}`, { method: 'POST' });
    await loadMonitors();
    showNotification(`Monitor ${enable ? 'started' : 'stopped'}`, 'success');
  } catch (error) {
    showNotification('Failed to toggle monitor: ' + error.message, 'error');
  }
}

async function deleteMonitor(id) {
  const confirmed = await appConfirm('Delete this monitor?', {
    title: 'Delete Monitor',
    confirmText: 'Delete',
    confirmVariant: 'danger'
  });
  if (!confirmed) return;

  try {
    await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
    await loadMonitors();
    showNotification('Monitor deleted', 'success');
  } catch (error) {
    showNotification('Failed to delete: ' + error.message, 'error');
  }
}

// ==========================================
// TOOL EXPLORER & ANALYTICS
// ==========================================

async function loadToolExplorer() {
  try {
    const [statsRes, leaderRes, healthRes, toolsRes] = await Promise.all([
      fetch('/api/toolexplorer/stats'),
      fetch('/api/toolexplorer/leaderboard'),
      fetch('/api/toolexplorer/health'),
      fetch('/api/mcp/tools')
    ]);

    const statsData = await statsRes.json();
    const statsList = Array.isArray(statsData.stats)
      ? statsData.stats
      : Array.isArray(statsData)
        ? statsData
        : [];

    const toolsData = await toolsRes.json();
    const connectedTools = (toolsData.tools || []).filter(t => !t.notConnected);

    let totalCalls = 0;
    let totalSuccess = 0;
    let totalFailures = 0;
    let totalDuration = 0;

    statsList.forEach(stat => {
      const calls = Number(stat.totalCalls) || 0;
      const success = Number(stat.successCount) || 0;
      const failure = Number(stat.failureCount) || 0;
      const avgDuration = Number(stat.avgDuration) || 0;
      totalCalls += calls;
      totalSuccess += success;
      totalFailures += failure;
      totalDuration += avgDuration * success;
    });

    const avgSuccessRate = totalCalls > 0 ? (totalSuccess / totalCalls) : 0;
    const avgLatency = totalSuccess > 0 ? Math.round(totalDuration / totalSuccess) : 0;
    const totalTools = connectedTools.length || statsList.length;

    renderToolExplorerStats({
      totalTools,
      totalCalls,
      avgSuccessRate,
      avgLatency
    });

    const leaderboard = await leaderRes.json();
    renderLeaderboard(leaderboard);

    const health = await healthRes.json();
    renderHealthDashboard({
      ...health,
      totalTools,
      totalCalls,
      totalFailures,
      overallSuccessRate: health.overallSuccessRate ?? (avgSuccessRate * 100)
    });
    renderFlakeRadar();
    initFlakeAlerts();
  } catch (error) {
    console.error('Failed to load tool explorer:', error);
  }
}

function renderToolExplorerStats(stats) {
  const el = document.getElementById('toolExplorerStats');
  if (!el) return;

  const successRate = typeof stats.avgSuccessRate === 'number' ? stats.avgSuccessRate : 0;
  const successPercent = successRate > 1 ? successRate : successRate * 100;

  el.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.totalTools || 0}</div>
        <div class="stat-label">Total Tools</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.totalCalls || 0}</div>
        <div class="stat-label">Total Calls</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${successPercent.toFixed(1)}%</div>
        <div class="stat-label">Success Rate</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.avgLatency || 0}ms</div>
        <div class="stat-label">Avg Latency</div>
      </div>
    </div>
  `;
}

function renderLeaderboard(data) {
  const el = document.getElementById('toolLeaderboard');
  if (!el) return;

  const tools = Array.isArray(data)
    ? data
    : Array.isArray(data.leaderboard)
      ? data.leaderboard
      : Array.isArray(data.tools)
        ? data.tools
        : [];

  if (tools.length === 0) {
    el.innerHTML = '<div class="empty-state">No tool usage data yet</div>';
    return;
  }

  const rows = tools.map(tool => {
    const server = tool.server || tool.serverName || 'unknown';
    const name = tool.tool || tool.toolName || 'unknown';
    const calls = tool.calls ?? tool.totalCalls ?? 0;
    const rawSuccess = tool.successRate ?? 0;
    const successRate = rawSuccess > 1 ? rawSuccess : rawSuccess * 100;
    const avgLatency = tool.avgLatency ?? tool.avgDuration ?? 0;
    return { server, name, calls, successRate, avgLatency };
  });

  el.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Server</th>
          <th>Tool</th>
          <th>Calls</th>
          <th>Success Rate</th>
          <th>Avg Latency</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((tool, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${tool.server}</td>
            <td><code>${tool.name}</code></td>
            <td>${tool.calls}</td>
            <td>${tool.successRate.toFixed(1)}%</td>
            <td>${tool.avgLatency}ms</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderHealthDashboard(health) {
  const el = document.getElementById('healthDashboard');
  if (!el) return;

  const successRate = typeof health.overallSuccessRate === 'number' ? health.overallSuccessRate : 0;
  const status = successRate >= 95 ? 'healthy' : successRate >= 80 ? 'warning' : 'critical';
  const statusColor = status === 'healthy' ? 'green' :
                      status === 'warning' ? 'orange' : 'red';
  const problematic = health.problematicTools || [];
  const slowTools = health.slowTools || [];
  const totalTools = health.totalTools || 0;
  const warningCount = problematic.length;
  const criticalCount = slowTools.length;
  const healthyCount = Math.max(totalTools - warningCount - criticalCount, 0);

  el.innerHTML = `
    <div class="health-status" style="border-left: 4px solid ${statusColor}">
      <h3>System Health: <span style="color: ${statusColor}">${status.toUpperCase()}</span></h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${healthyCount}</div>
          <div class="stat-label">🟢 Healthy Tools</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${warningCount}</div>
          <div class="stat-label">🟡 Warning</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${criticalCount}</div>
          <div class="stat-label">🔴 Critical</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${successRate.toFixed(1)}%</div>
          <div class="stat-label">Success Rate</div>
        </div>
      </div>
      ${problematic.length > 0 ? `
        <div class="problematic-tools">
          <h4>Problematic Tools:</h4>
          <ul>
            ${problematic.map(t => `
              <li>
                <strong>${t.server}.${t.tool}</strong>:
                ${t.successRate?.toFixed(1) ?? 0}% success
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
      ${slowTools.length > 0 ? `
        <div class="problematic-tools">
          <h4>Slow Tools:</h4>
          <ul>
            ${slowTools.map(t => `
              <li>
                <strong>${t.server}.${t.tool}</strong>:
                p95 ${t.p95Duration}ms
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
}

const FLAKE_ALERT_KEY = 'mcp_chat_studio_flake_alerts';
let flakeAlertState = {
  enabled: false,
  baseline: null,
  lastCheck: null
};
let flakeAlertInterval = null;

function computeFlakeRows(history) {
  const grouped = new Map();
  (history || []).forEach(entry => {
    if (!entry?.server || !entry?.tool) return;
    const key = `${entry.server}__${entry.tool}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(entry);
  });

  const percentile = (values, p) => {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
    return sorted[idx];
  };

  const failureRate = entries => {
    if (!entries.length) return 0;
    const failures = entries.filter(entry => !entry.success).length;
    return failures / entries.length;
  };

  const rows = [];
  grouped.forEach((entries, key) => {
    const recent = entries.slice(0, 20);
    const failures = recent.filter(entry => !entry.success).length;
    const total = recent.length;
    if (!total) return;

    const durations = recent.map(entry => Number(entry.duration || 0)).filter(value => Number.isFinite(value) && value > 0);
    const median = percentile(durations, 50);
    const p95 = percentile(durations, 95);
    const jitter = median > 0 ? Math.round(((p95 - median) / median) * 100) : 0;

    const recentRate = failureRate(recent.slice(0, 5));
    const prevRate = failureRate(recent.slice(5, 10));
    let trend = 'stable';
    if (recentRate - prevRate >= 0.2) trend = 'rising';
    if (prevRate - recentRate >= 0.2) trend = 'improving';

    const score = Math.min(Math.round((failures / total) * 100 + jitter * 0.35), 100);
    const [server, tool] = key.split('__');

    rows.push({
      key,
      server,
      tool,
      total,
      failures,
      median,
      p95,
      jitter,
      score,
      failureRate: failures / total,
      trend
    });
  });

  return rows;
}

function getHistoryForFlakes() {
  return typeof window.getToolExecutionHistory === 'function'
    ? window.getToolExecutionHistory()
    : [];
}

function renderFlakeRadar() {
  const el = document.getElementById('flakeRadar');
  if (!el) return;

  const history = getHistoryForFlakes();
  if (!history || history.length === 0) {
    el.innerHTML = '<div class="empty-state">No history yet. Run tools to see flake risk.</div>';
    return;
  }

  const rows = computeFlakeRows(history);
  if (rows.length === 0) {
    el.innerHTML = '<div class="empty-state">No usable history yet.</div>';
    return;
  }

  rows.sort((a, b) => b.score - a.score);
  const top = rows.slice(0, 6);

  const trendIcon = trend => {
    if (trend === 'rising') return '📈';
    if (trend === 'improving') return '📉';
    return '➖';
  };

  el.innerHTML = `
    <div style="display: flex; flex-wrap: wrap; gap: 10px">
      ${top.map(row => `
        <div class="flake-card">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px">
            <strong>${escapeHtml(row.tool)}</strong>
            <span class="pill">Risk ${row.score}</span>
          </div>
          <div style="font-size: 0.7rem; color: var(--text-muted)">${escapeHtml(row.server)}</div>
          <div class="flake-metrics">
            <span>❌ ${row.failures}/${row.total}</span>
            <span>p95 ${row.p95}ms</span>
            <span>Jitter ${row.jitter}%</span>
            <span>${trendIcon(row.trend)} ${row.trend}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function loadFlakeAlertState() {
  try {
    const stored = JSON.parse(localStorage.getItem(FLAKE_ALERT_KEY) || '{}');
    flakeAlertState = {
      enabled: Boolean(stored.enabled),
      baseline: stored.baseline || null,
      lastCheck: stored.lastCheck || null
    };
  } catch (error) {
    flakeAlertState = { enabled: false, baseline: null, lastCheck: null };
  }
}

function saveFlakeAlertState() {
  localStorage.setItem(FLAKE_ALERT_KEY, JSON.stringify(flakeAlertState));
}

function startFlakeAlertInterval() {
  if (flakeAlertInterval) clearInterval(flakeAlertInterval);
  if (!flakeAlertState.enabled || !flakeAlertState.baseline) return;
  flakeAlertInterval = setInterval(() => {
    checkFlakeAlerts({ silent: true });
  }, 120000);
}

function buildFlakeBaseline(rows) {
  const baseline = {};
  rows.forEach(row => {
    baseline[row.key] = {
      score: row.score,
      failureRate: row.failureRate,
      jitter: row.jitter,
      p95: row.p95,
      total: row.total
    };
  });
  return baseline;
}

function renderFlakeAlerts() {
  const statusEl = document.getElementById('flakeAlertStatus');
  const listEl = document.getElementById('flakeAlertList');
  const toggle = document.getElementById('flakeAlertToggle');
  if (!statusEl || !listEl || !toggle) return;

  toggle.checked = flakeAlertState.enabled;
  if (!flakeAlertState.baseline) {
    statusEl.textContent = 'No baseline set yet. Capture one to detect rising flake risk.';
    listEl.innerHTML = '';
    return;
  }

  const baselineTime = new Date(flakeAlertState.baseline.capturedAt).toLocaleString();
  statusEl.textContent = `Baseline captured: ${baselineTime}.`;

  if (!flakeAlertState.lastCheck) {
    listEl.innerHTML = '<div style="color: var(--text-muted)">No check run yet.</div>';
    return;
  }

  const { checkedAt, summary, top } = flakeAlertState.lastCheck;
  const stamp = new Date(checkedAt).toLocaleString();
  listEl.innerHTML = `
    <div class="flake-alert-item">
      <div>
        <strong>Last check</strong>
        <div style="font-size: 0.7rem; color: var(--text-muted)">${stamp}</div>
      </div>
      <div style="display: flex; gap: 6px; flex-wrap: wrap">
        <span class="pill">Alerts: ${summary.alerts}</span>
        <span class="pill">Stable: ${summary.stable}</span>
      </div>
    </div>
    ${(top || []).map(item => `
      <div class="flake-alert-item">
        <div>
          <strong>${escapeHtml(item.tool)}</strong>
          <div style="font-size: 0.7rem; color: var(--text-muted)">${escapeHtml(item.server)}</div>
        </div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap">
          <span class="pill">+${item.deltaScore}</span>
          <span class="pill">Fail ${Math.round(item.failureRate * 100)}%</span>
          <span class="pill">Jitter ${item.jitter}%</span>
        </div>
      </div>
    `).join('')}
    ${(top || []).length === 0 ? '<div style="color: var(--text-muted)">No changes detected.</div>' : ''}
  `;
}

async function setFlakeBaseline() {
  const history = getHistoryForFlakes();
  if (!history || history.length === 0) {
    showNotification('Run some tools before setting a baseline.', 'warning');
    return;
  }
  const rows = computeFlakeRows(history);
  flakeAlertState.baseline = {
    capturedAt: new Date().toISOString(),
    tools: buildFlakeBaseline(rows)
  };
  flakeAlertState.lastCheck = null;
  saveFlakeAlertState();
  renderFlakeAlerts();
  startFlakeAlertInterval();
  showNotification('Flake baseline captured.', 'success');
}

async function checkFlakeAlerts(options = {}) {
  if (!flakeAlertState.baseline) {
    if (!options.silent) {
      showNotification('Set a flake baseline first.', 'warning');
    }
    renderFlakeAlerts();
    return;
  }

  const history = getHistoryForFlakes();
  const rows = computeFlakeRows(history);
  const baseline = flakeAlertState.baseline.tools || {};

  const alerts = [];
  let stable = 0;
  rows.forEach(row => {
    const base = baseline[row.key];
    if (!base) return;
    const deltaScore = row.score - base.score;
    const deltaFailure = row.failureRate - base.failureRate;
    const deltaJitter = row.jitter - base.jitter;
    const isAlert = deltaScore >= 15 || deltaFailure >= 0.15 || deltaJitter >= 30;
    if (isAlert) {
      alerts.push({
        server: row.server,
        tool: row.tool,
        deltaScore,
        failureRate: row.failureRate,
        jitter: row.jitter
      });
    } else {
      stable += 1;
    }
  });

  alerts.sort((a, b) => b.deltaScore - a.deltaScore);
  const top = alerts.slice(0, 5);

  flakeAlertState.lastCheck = {
    checkedAt: new Date().toISOString(),
    summary: {
      alerts: alerts.length,
      stable
    },
    top
  };
  saveFlakeAlertState();
  renderFlakeAlerts();

  if (alerts.length > 0 && !options.silent) {
    showNotification(`Flake alerts: ${alerts.length} tool(s) regressed.`, 'warning');
  } else if (!options.silent) {
    showNotification('Flake alerts: no regressions detected.', 'success');
  }
}

function clearFlakeBaseline() {
  flakeAlertState.baseline = null;
  flakeAlertState.lastCheck = null;
  saveFlakeAlertState();
  renderFlakeAlerts();
  showNotification('Flake baseline cleared.', 'success');
}

function toggleFlakeAlerts(enabled) {
  flakeAlertState.enabled = Boolean(enabled);
  saveFlakeAlertState();
  renderFlakeAlerts();
  startFlakeAlertInterval();
}

function initFlakeAlerts() {
  loadFlakeAlertState();
  renderFlakeAlerts();
  startFlakeAlertInterval();
}

async function exportToolStats() {
  try {
    const res = await fetch('/api/toolexplorer/export?format=csv');
    const csv = await res.text();

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tool-stats.csv';
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    showNotification('Failed to export: ' + error.message, 'error');
  }
}

window.showSnapshotLibrary = showSnapshotLibrary;
window.importCollectionSnapshot = importCollectionSnapshot;
window.showSnapshotReport = showSnapshotReport;
window.exportSnapshotById = exportSnapshotById;
window.deleteSnapshot = deleteSnapshot;

// ==========================================
// MOCK SERVERS MANAGER
// ==========================================

let mockServers = [];

async function loadMockServers() {
  try {
    const res = await fetch('/api/mocks');
    const data = await res.json();
    mockServers = data.mocks || [];
    renderMockServersList();
  } catch (error) {
    console.error('Failed to load mocks:', error);
  }
}

function renderMockServersList() {
  const list = document.getElementById('mockServersList');
  if (!list) return;

  if (mockServers.length === 0) {
    list.innerHTML = '<div class="empty-state">No mock servers. Create one to simulate MCP responses!</div>';
    return;
  }

  list.innerHTML = mockServers.map(mock => `
    <div class="mock-card">
      <div class="mock-header">
        <h3>${mock.name}</h3>
        <span class="badge">${mock.tools?.length || 0} tools</span>
      </div>
      <p class="mock-desc">${mock.description || 'No description'}</p>
      <div class="mock-stats">
        <span>📞 ${mock.callCount || 0} calls</span>
        <span>⏱️ ${mock.delay || 0}ms delay</span>
        <span>⚠️ ${(mock.errorRate * 100 || 0)}% error rate</span>
      </div>
      <div class="mock-actions">
        <button class="btn-small" onclick="connectMockServer('${mock.id}')">🔌 Connect</button>
        <button class="btn-small" onclick="viewMockDetails('${mock.id}')">👁️ View</button>
        <button class="btn-small" onclick="resetMockStats('${mock.id}')">🔄 Reset</button>
        <button class="btn-small btn-danger" onclick="deleteMock('${mock.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

function slugifyName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'mock';
}

async function connectMockServer(mockId) {
  const mock = mockServers.find(m => m.id === mockId);
  const mockName = mock?.name || mockId;
  const defaultName = `mock_${slugifyName(mockName)}`;
  const serverName = await appPrompt('MCP server name for this mock:', {
    title: 'Connect Mock Server',
    label: 'Server name',
    defaultValue: defaultName,
    required: true
  });
  if (!serverName) return;

  try {
    let status = {};
    try {
      const statusRes = await fetch('/api/mcp/status', { credentials: 'include' });
      status = await statusRes.json();
    } catch (error) {
      console.warn('Failed to load MCP status:', error);
    }

    const existing = status[serverName];
    if (existing) {
      if (!(existing.config?.type === 'mock' && existing.config?.mockId === mockId)) {
        showNotification('That server name is already in use.', 'error');
        return;
      }
    } else {
      const addRes = await fetch('/api/mcp/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: serverName,
          type: 'mock',
          mockId,
          description: `Mock server for ${mockName || mockId}`
        })
      });

      if (!addRes.ok) throw new Error(await addRes.text());
    }

    const connectRes = await fetch(`/api/mcp/connect/${encodeURIComponent(serverName)}`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!connectRes.ok) throw new Error(await connectRes.text());

    showNotification(`Connected mock as ${serverName}`, 'success');
    if (typeof loadMCPStatus === 'function') {
      loadMCPStatus();
    }
  } catch (error) {
    showNotification('Failed to connect mock: ' + error.message, 'error');
  }
}

async function createMockServerModal() {
  const result = await appFormModal({
    title: 'New Mock Server',
    confirmText: 'Create',
    fields: [
      { id: 'name', label: 'Mock server name', required: true, placeholder: 'Test Mock Server' },
      { id: 'description', label: 'Description', placeholder: 'Optional' }
    ]
  });
  if (!result.confirmed) return;

  const name = (result.values.name || '').trim();
  if (!name) return;

  const description = result.values.description || '';

  try {
    const res = await fetch('/api/mocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        tools: [],
        resources: [],
        prompts: [],
        delay: 0,
        errorRate: 0
      })
    });

    if (!res.ok) throw new Error(await res.text());

    await loadMockServers();
    showNotification('Mock server created!', 'success');
  } catch (error) {
    showNotification('Failed to create mock: ' + error.message, 'error');
  }
}

async function addScenarioToCollection(collectionId) {
  const scenarios = typeof window.getLocalScenarios === 'function' ? window.getLocalScenarios() : [];
  if (!scenarios || scenarios.length === 0) {
    showNotification('No local scenarios found. Record one first in Scenarios.', 'error');
    return;
  }

  const result = await appFormModal({
    title: 'Add Scenario',
    confirmText: 'Add',
    fields: [
      {
        id: 'scenarioId',
        label: 'Scenario',
        type: 'select',
        required: true,
        options: scenarios.map(s => ({
          value: s.id,
          label: `${s.name} (${s.steps?.length || 0} steps)`
        }))
      }
    ]
  });
  if (!result.confirmed) return;
  const scenario = scenarios.find(s => s.id === result.values.scenarioId);
  if (!scenario) {
    showNotification('Invalid selection.', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/collections/${collectionId}/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: scenario.name,
        description: scenario.description || '',
        steps: scenario.steps || [],
        variables: scenario.variables || {},
        preScripts: scenario.preScripts || [],
        postScripts: scenario.postScripts || []
      })
    });

    if (!res.ok) throw new Error(await res.text());
    await loadCollections();
    showNotification(`Scenario "${scenario.name}" added to collection`, 'success');
  } catch (error) {
    showNotification('Failed to add scenario: ' + error.message, 'error');
  }
}

async function editCollectionSettings(collectionId) {
  try {
    const res = await fetch(`/api/collections/${collectionId}`);
    if (!res.ok) throw new Error(await res.text());
    const collection = await res.json();

    const result = await appFormModal({
      title: 'Edit Collection',
      confirmText: 'Save',
      fields: [
        {
          id: 'variables',
          label: 'Environment variables (JSON)',
          type: 'textarea',
          value: JSON.stringify(collection.variables || {}, null, 2),
          rows: 5,
          monospace: true,
          hint: 'Overrides global + environment variables for this collection.'
        },
        {
          id: 'preScripts',
          label: 'Pre-script IDs (comma-separated)',
          value: (collection.preScripts || []).join(', ')
        },
        {
          id: 'postScripts',
          label: 'Post-script IDs (comma-separated)',
          value: (collection.postScripts || []).join(', ')
        }
      ]
    });
    if (!result.confirmed) return;

    const variablesInput = (result.values.variables || '').trim();
    let variables = {};
    if (variablesInput) {
      try {
        variables = JSON.parse(variablesInput);
      } catch (error) {
        showNotification('Invalid JSON for variables: ' + error.message, 'error');
        return;
      }
    }

    const preScriptsInput = result.values.preScripts || '';
    const postScriptsInput = result.values.postScripts || '';

    const preScripts = preScriptsInput ? preScriptsInput.split(',').map(s => s.trim()).filter(Boolean) : [];
    const postScripts = postScriptsInput ? postScriptsInput.split(',').map(s => s.trim()).filter(Boolean) : [];

    const updateRes = await fetch(`/api/collections/${collectionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variables, preScripts, postScripts })
    });

    if (!updateRes.ok) throw new Error(await updateRes.text());
    await loadCollections();
    showNotification('Collection updated', 'success');
  } catch (error) {
    showNotification('Failed to update collection: ' + error.message, 'error');
  }
}

async function createMockFromHistory() {
  const history = typeof window.getToolExecutionHistory === 'function'
    ? window.getToolExecutionHistory()
    : [];

  if (!history || history.length === 0) {
    showNotification('No tool history available to build mocks.', 'error');
    return;
  }

  const serverOptions = Array.from(new Set(history.map(entry => entry.server).filter(Boolean))).map(server => ({
    value: server,
    label: server
  }));
  const filterResult = await appFormModal({
    title: 'Generate Mocks',
    confirmText: 'Generate',
    fields: [
      {
        id: 'serverFilter',
        label: 'Server (optional)',
        type: 'select',
        options: [{ value: '', label: 'All servers' }, ...serverOptions]
      }
    ]
  });
  if (!filterResult.confirmed) return;
  const serverFilter = filterResult.values.serverFilter;
  const filteredHistory = serverFilter
    ? history.filter(entry => entry.server === serverFilter)
    : history;

  if (filteredHistory.length === 0) {
    showNotification('No history entries match that server.', 'error');
    return;
  }

  let toolDefs = [];
  try {
    const toolsRes = await fetch('/api/mcp/tools', { credentials: 'include' });
    const toolsData = await toolsRes.json();
    toolDefs = toolsData.tools || [];
  } catch (error) {
    console.warn('Failed to load tool schemas for mocks:', error);
  }

  const grouped = new Map();
  filteredHistory.forEach(entry => {
    if (!entry.server || !entry.tool) return;
    if (!grouped.has(entry.server)) {
      grouped.set(entry.server, new Map());
    }
    const toolMap = grouped.get(entry.server);
    if (!toolMap.has(entry.tool)) {
      toolMap.set(entry.tool, entry);
    }
  });

  for (const [serverName, toolMap] of grouped.entries()) {
    const tools = [];

    for (const [toolName, entry] of toolMap.entries()) {
      const def = toolDefs.find(t => t.serverName === serverName && t.name === toolName);
      tools.push({
        name: toolName,
        description: def?.description || `Recorded from ${serverName}`,
        inputSchema: def?.inputSchema || { type: 'object', properties: {} },
        response: entry.response
      });
    }

    try {
      await fetch('/api/mocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: `Mock: ${serverName}`,
          description: 'Auto-generated from tool history',
          tools,
          resources: [],
          prompts: [],
          delay: 0,
          errorRate: 0
        })
      });
    } catch (error) {
      console.error('Failed to create mock from history:', error);
    }
  }

  await loadMockServers();
  showNotification('Mock servers generated from history!', 'success');
}

async function viewMockDetails(id) {
  const mock = mockServers.find(m => m.id === id);
  if (!mock) return;

  const details = `
Mock Server: ${mock.name}
Description: ${mock.description || 'N/A'}
Tools: ${mock.tools?.length || 0}
Resources: ${mock.resources?.length || 0}
Prompts: ${mock.prompts?.length || 0}
Total Calls: ${mock.callCount || 0}
Delay: ${mock.delay || 0}ms
Error Rate: ${(mock.errorRate * 100 || 0)}%

Tools:
${mock.tools?.map(t => `  - ${t.name}: ${t.description || 'No description'}`).join('\n') || '  (none)'}
  `;

  await appAlert('', {
    title: 'Mock Details',
    bodyHtml: `<pre style="white-space: pre-wrap; font-size: 0.75rem; color: var(--text-secondary)">${escapeHtml(details)}</pre>`,
    confirmText: 'Close'
  });
}

async function resetMockStats(id) {
  try {
    await fetch(`/api/mocks/${id}/reset`, { method: 'POST' });
    await loadMockServers();
    showNotification('Statistics reset', 'success');
  } catch (error) {
    showNotification('Failed to reset: ' + error.message, 'error');
  }
}

async function deleteMock(id) {
  const confirmed = await appConfirm('Delete this mock server?', {
    title: 'Delete Mock',
    confirmText: 'Delete',
    confirmVariant: 'danger'
  });
  if (!confirmed) return;

  try {
    await fetch(`/api/mocks/${id}`, { method: 'DELETE' });
    await loadMockServers();
    showNotification('Mock server deleted', 'success');
  } catch (error) {
    showNotification('Failed to delete: ' + error.message, 'error');
  }
}

// ==========================================
// SCRIPTS EDITOR
// ==========================================

let scripts = [];

async function loadScripts() {
  try {
    const res = await fetch('/api/scripts');
    const data = await res.json();
    scripts = data.scripts || [];
    renderScriptsList();
  } catch (error) {
    console.error('Failed to load scripts:', error);
  }
}

function renderScriptsList() {
  const list = document.getElementById('scriptsList');
  if (!list) return;

  if (scripts.length === 0) {
    list.innerHTML = '<div class="empty-state">No scripts yet. Create pre/post scripts for automated testing!</div>';
    return;
  }

  list.innerHTML = scripts.map(script => {
    const typeIcon = script.type === 'pre' ? '⏮️' : '⏭️';
    const enabledIcon = script.enabled ? '✅' : '⏸️';

    return `
      <div class="script-card">
        <div class="script-header">
          <h3>${typeIcon} ${script.name}</h3>
          <span class="badge">${script.type}-request</span>
          <span class="badge">${enabledIcon}</span>
        </div>
        <p class="script-desc">${script.description || 'No description'}</p>
        <div class="script-actions">
          <button class="btn-small" onclick="editScript('${script.id}')">✏️ Edit</button>
          <button class="btn-small" onclick="testScript('${script.id}')">▶️ Test</button>
          <button class="btn-small" onclick="toggleScript('${script.id}', ${!script.enabled})">
            ${script.enabled ? '⏸️ Disable' : '▶️ Enable'}
          </button>
          <button class="btn-small btn-danger" onclick="deleteScript('${script.id}')">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

async function createScriptModal() {
  const result = await appFormModal({
    title: 'New Script',
    confirmText: 'Create',
    fields: [
      { id: 'name', label: 'Script name', required: true },
      {
        id: 'type',
        label: 'Type',
        type: 'select',
        required: true,
        options: [
          { value: 'pre', label: 'pre-request' },
          { value: 'post', label: 'post-request' }
        ]
      },
      { id: 'description', label: 'Description', placeholder: 'Optional' },
      {
        id: 'code',
        label: 'JavaScript code (pm.variables, pm.test, pm.expect)',
        type: 'textarea',
        rows: 8,
        monospace: true,
        required: true
      }
    ]
  });
  if (!result.confirmed) return;

  const name = (result.values.name || '').trim();
  const type = result.values.type;
  const description = result.values.description || '';
  const code = result.values.code || '';
  if (!name || !code) return;

  try {
    // Validate first
    const validateRes = await fetch('/api/scripts/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    const validation = await validateRes.json();
    if (!validation.valid) {
      showNotification('Syntax error: ' + validation.error, 'error');
      return;
    }

    const res = await fetch('/api/scripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, description, code, enabled: true })
    });

    if (!res.ok) throw new Error(await res.text());

    await loadScripts();
    showNotification('Script created!', 'success');
  } catch (error) {
    showNotification('Failed to create script: ' + error.message, 'error');
  }
}

async function editScript(id) {
  const script = scripts.find(s => s.id === id);
  if (!script) return;

  const newCode = await appPrompt('Edit code:', {
    title: 'Edit Script',
    label: script.name || 'Script code',
    defaultValue: script.code,
    multiline: true,
    rows: 8,
    monospace: true,
    required: true
  });
  if (!newCode) return;

  try {
    await fetch(`/api/scripts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: newCode })
    });

    await loadScripts();
    showNotification('Script updated!', 'success');
  } catch (error) {
    showNotification('Failed to update: ' + error.message, 'error');
  }
}

async function testScript(id) {
  try {
    const context = {
      variables: {},
      environment: {},
      request: {},
      response: { content: [{ text: 'Test response' }] }
    };

    const res = await fetch(`/api/scripts/${id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context })
    });

    const result = await res.json();

    if (result.assertions) {
      const passed = result.assertions.filter(a => a.passed).length;
      const failed = result.assertions.filter(a => !a.passed).length;
      showNotification(`Test completed: ${passed} passed, ${failed} failed`,
        failed === 0 ? 'success' : 'warning');
    } else {
      showNotification('Script executed successfully', 'success');
    }
  } catch (error) {
    showNotification('Test failed: ' + error.message, 'error');
  }
}

async function toggleScript(id, enable) {
  try {
    await fetch(`/api/scripts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: enable })
    });

    await loadScripts();
    showNotification(`Script ${enable ? 'enabled' : 'disabled'}`, 'success');
  } catch (error) {
    showNotification('Failed to toggle: ' + error.message, 'error');
  }
}

async function deleteScript(id) {
  const confirmed = await appConfirm('Delete this script?', {
    title: 'Delete Script',
    confirmText: 'Delete',
    confirmVariant: 'danger'
  });
  if (!confirmed) return;

  try {
    await fetch(`/api/scripts/${id}`, { method: 'DELETE' });
    await loadScripts();
    showNotification('Script deleted', 'success');
  } catch (error) {
    showNotification('Failed to delete: ' + error.message, 'error');
  }
}

// ==========================================
// CONTRACT TESTING
// ==========================================

let contracts = [];
let lastSchemaSnapshot = null;
let lastSchemaDiff = null;
const SCHEMA_WATCH_KEY = 'mcp_chat_studio_schema_watch';
let schemaWatchState = {
  enabled: false,
  baseline: null,
  lastCheck: null,
  offlineServers: []
};
let schemaWatchInterval = null;

async function loadContracts() {
  try {
    const res = await fetch('/api/contracts');
    const data = await res.json();
    contracts = data.contracts || [];
    renderContractsList();
    loadSchemaDiffBadge();
    initSchemaWatch();
  } catch (error) {
    console.error('Failed to load contracts:', error);
  }
}

function updateSchemaDiffBadge(summary) {
  const badge = document.getElementById('schemaDiffBadge');
  if (!badge || !summary) return;

  const summaryText = document.getElementById('schemaDiffSummaryText');
  const generatedAt = summary.generatedAt || new Date().toISOString();
  const timestamp = new Date(generatedAt).toLocaleString();

  const { added, removed, changed, totalChanges } = summary;
  badge.style.display = 'inline-block';
  badge.classList.remove('badge-success', 'badge-warning', 'badge-danger');

  if (totalChanges === 0) {
    badge.classList.add('badge-success');
    badge.textContent = 'Schema OK';
  } else {
    badge.classList.add('badge-warning');
    badge.textContent = `${totalChanges} changes`;
  }

  badge.title = `Added: ${added}, Removed: ${removed}, Changed: ${changed}`;
  if (summaryText) {
    summaryText.textContent = `Last diff: ${totalChanges} change(s) · ${timestamp} (added ${added}, removed ${removed}, changed ${changed})`;
  }
  localStorage.setItem('schemaDiffSummary', JSON.stringify({ ...summary, generatedAt }));
}

function loadSchemaDiffBadge() {
  const stored = localStorage.getItem('schemaDiffSummary');
  if (!stored) return;
  try {
    const summary = JSON.parse(stored);
    updateSchemaDiffBadge(summary);
  } catch (error) {
    console.warn('Failed to load schema diff summary:', error);
  }
}

async function fetchSchemaSnapshot() {
  const res = await fetch('/api/mcp/tools');
  if (!res.ok) {
    throw new Error('Failed to load tools snapshot');
  }
  const data = await res.json();
  const tools = (data.tools || [])
    .filter(tool => !tool.notConnected)
    .map(tool => ({
      serverName: tool.serverName,
      name: tool.name,
      description: tool.description || '',
      inputSchema: tool.inputSchema || { type: 'object', properties: {} }
    }))
    .sort((a, b) => {
      if (a.serverName === b.serverName) return a.name.localeCompare(b.name);
      return a.serverName.localeCompare(b.serverName);
    });

  const snapshot = {
    capturedAt: new Date().toISOString(),
    toolCount: tools.length,
    tools
  };
  lastSchemaSnapshot = snapshot;
  return snapshot;
}

function downloadJsonFile(filename, data) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportSchemaSnapshot() {
  try {
    const snapshot = await fetchSchemaSnapshot();
    const timestamp = snapshot.capturedAt.replace(/[:.]/g, '-');
    downloadJsonFile(`mcp-schema-snapshot-${timestamp}.json`, snapshot);
    showNotification('Schema snapshot exported.', 'success');
  } catch (error) {
    showNotification('Failed to export snapshot: ' + error.message, 'error');
  }
}

function compareSchemaSnapshot() {
  const input = document.getElementById('schemaBaselineInput');
  if (input) input.click();
}

async function handleSchemaBaselineFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const baseline = JSON.parse(text);
    const current = await fetchSchemaSnapshot();
    const diff = diffSchemaSnapshots(baseline, current);
    showSchemaDiffModal(diff, baseline, current);
  } catch (error) {
    showNotification('Failed to compare snapshots: ' + error.message, 'error');
  } finally {
    event.target.value = '';
  }
}

function stableStringify(value) {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function loadSchemaWatchState() {
  try {
    const stored = JSON.parse(localStorage.getItem(SCHEMA_WATCH_KEY) || '{}');
    schemaWatchState = {
      enabled: Boolean(stored.enabled),
      baseline: stored.baseline || null,
      lastCheck: stored.lastCheck || null,
      offlineServers: stored.offlineServers || []
    };
  } catch (error) {
    schemaWatchState = { enabled: false, baseline: null, lastCheck: null, offlineServers: [] };
  }
}

function saveSchemaWatchState() {
  localStorage.setItem(SCHEMA_WATCH_KEY, JSON.stringify(schemaWatchState));
}

function startSchemaWatchInterval() {
  if (schemaWatchInterval) clearInterval(schemaWatchInterval);
  if (!schemaWatchState.enabled || !schemaWatchState.baseline) return;
  schemaWatchInterval = setInterval(() => {
    checkSchemaWatch({ silent: true });
  }, 120000);
}

async function fetchConnectedServers() {
  try {
    const res = await fetch('/api/mcp/status', { credentials: 'include' });
    const status = await res.json();
    const servers = status.servers || status;
    return new Set(
      Object.entries(servers || {})
        .filter(([, info]) => info?.connected || info?.userConnected)
        .map(([name]) => name)
    );
  } catch (error) {
    return new Set();
  }
}

function snapshotToolMap(snapshot, connectedServers = null) {
  const tools = Array.isArray(snapshot)
    ? snapshot
    : snapshot?.tools || [];
  const map = new Map();
  const filtered = connectedServers
    ? tools.filter(tool => connectedServers.has(tool.serverName))
    : tools;
  filtered.forEach(tool => {
    const key = `${tool.serverName}__${tool.name}`;
    const schema = tool.inputSchema || { type: 'object', properties: {} };
    const hash = stableStringify(schema);
    map.set(key, {
      key,
      serverName: tool.serverName,
      name: tool.name,
      description: tool.description || '',
      inputSchema: schema,
      hash
    });
  });
  return map;
}

function diffSchemaMaps(baselineMap, currentMap) {
  const added = [];
  const removed = [];
  const changed = [];

  currentMap.forEach((tool, key) => {
    const previous = baselineMap.get(key);
    if (!previous) {
      added.push(tool);
      return;
    }
    if (previous.hash !== tool.hash) {
      changed.push({ tool, previous });
    }
  });

  baselineMap.forEach((tool, key) => {
    if (!currentMap.has(key)) {
      removed.push(tool);
    }
  });

  return {
    summary: {
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      totalChanges: added.length + removed.length + changed.length
    },
    added,
    removed,
    changed
  };
}

async function captureSchemaWatchBaseline() {
  try {
    const snapshot = await fetchSchemaSnapshot();
    schemaWatchState.baseline = snapshot;
    schemaWatchState.lastCheck = null;
    saveSchemaWatchState();
    renderSchemaWatch();
    startSchemaWatchInterval();
    showNotification('Schema baseline captured.', 'success');
  } catch (error) {
    showNotification('Failed to capture baseline: ' + error.message, 'error');
  }
}

async function checkSchemaWatch(options = {}) {
  if (!schemaWatchState.baseline) {
    renderSchemaWatch();
    if (!options.silent) {
      showNotification('Set a baseline before checking.', 'error');
    }
    return;
  }

  const connectedServers = await fetchConnectedServers();
  const currentSnapshot = await fetchSchemaSnapshot();
  const baselineMap = snapshotToolMap(schemaWatchState.baseline, connectedServers);
  const currentMap = snapshotToolMap(currentSnapshot, connectedServers);
  const diff = diffSchemaMaps(baselineMap, currentMap);

  const baselineServers = new Set(
    (schemaWatchState.baseline?.tools || []).map(tool => tool.serverName)
  );
  const offlineServers = Array.from(baselineServers).filter(server => !connectedServers.has(server));

  schemaWatchState.lastCheck = {
    checkedAt: new Date().toISOString(),
    diff
  };
  schemaWatchState.offlineServers = offlineServers;
  saveSchemaWatchState();
  renderSchemaWatch();

  if (diff.summary.totalChanges > 0 && !options.silent) {
    showNotification(`Schema drift detected: ${diff.summary.totalChanges} change(s)`, 'warning');
  } else if (!options.silent) {
    showNotification('Schema watch: no changes detected.', 'success');
  }
}

function clearSchemaWatchBaseline() {
  schemaWatchState.baseline = null;
  schemaWatchState.lastCheck = null;
  schemaWatchState.offlineServers = [];
  saveSchemaWatchState();
  renderSchemaWatch();
  showNotification('Schema watch baseline cleared.', 'success');
}

function toggleSchemaWatch(enabled) {
  schemaWatchState.enabled = Boolean(enabled);
  saveSchemaWatchState();
  renderSchemaWatch();
  startSchemaWatchInterval();
}

function renderSchemaWatch() {
  const statusEl = document.getElementById('schemaWatchStatus');
  const listEl = document.getElementById('schemaWatchList');
  const toggle = document.getElementById('schemaWatchToggle');
  if (!statusEl || !listEl || !toggle) return;

  toggle.checked = schemaWatchState.enabled;
  if (!schemaWatchState.baseline) {
    statusEl.textContent = 'No baseline set yet. Capture a baseline to start watching.';
    listEl.innerHTML = '';
    return;
  }

  const capturedAt = new Date(schemaWatchState.baseline.capturedAt).toLocaleString();
  statusEl.textContent = `Baseline captured: ${capturedAt}.`;

  if (schemaWatchState.offlineServers?.length) {
    statusEl.textContent += ` Offline: ${schemaWatchState.offlineServers.join(', ')}.`;
  }

  const lastCheck = schemaWatchState.lastCheck;
  if (!lastCheck) {
    listEl.innerHTML = '<div style="color: var(--text-muted)">No check run yet.</div>';
    return;
  }

  const diff = lastCheck.diff;
  const summary = diff.summary || { added: 0, removed: 0, changed: 0, totalChanges: 0 };
  const timestamp = new Date(lastCheck.checkedAt).toLocaleString();

  listEl.innerHTML = `
    <div class="schema-watch-item">
      <div>
        <strong>Last check</strong>
        <div style="font-size: 0.7rem; color: var(--text-muted)">${timestamp}</div>
      </div>
      <div style="display: flex; gap: 6px; flex-wrap: wrap">
        <span class="pill">Added: ${summary.added}</span>
        <span class="pill">Removed: ${summary.removed}</span>
        <span class="pill">Changed: ${summary.changed}</span>
      </div>
    </div>
    ${diff.added.slice(0, 3).map(tool => `
      <div class="schema-watch-item">
        <div>
          <strong>➕ ${escapeHtml(tool.name)}</strong>
          <div style="font-size: 0.7rem; color: var(--text-muted)">${escapeHtml(tool.serverName)}</div>
        </div>
        <span class="pill">New</span>
      </div>
    `).join('')}
    ${diff.changed.slice(0, 3).map(entry => `
      <div class="schema-watch-item">
        <div>
          <strong>✏️ ${escapeHtml(entry.tool.name)}</strong>
          <div style="font-size: 0.7rem; color: var(--text-muted)">${escapeHtml(entry.tool.serverName)}</div>
        </div>
        <span class="pill">Changed</span>
      </div>
    `).join('')}
    ${diff.removed.slice(0, 3).map(tool => `
      <div class="schema-watch-item">
        <div>
          <strong>➖ ${escapeHtml(tool.name)}</strong>
          <div style="font-size: 0.7rem; color: var(--text-muted)">${escapeHtml(tool.serverName)}</div>
        </div>
        <span class="pill">Removed</span>
      </div>
    `).join('')}
    ${(diff.added.length + diff.changed.length + diff.removed.length) === 0
      ? '<div style="color: var(--text-muted)">No changes detected.</div>'
      : ''
    }
  `;
}

function initSchemaWatch() {
  loadSchemaWatchState();
  renderSchemaWatch();
  startSchemaWatchInterval();
}

function diffSchemaSnapshots(baselineSnapshot, currentSnapshot) {
  const baselineTools = Array.isArray(baselineSnapshot)
    ? baselineSnapshot
    : baselineSnapshot.tools || [];
  const currentTools = Array.isArray(currentSnapshot)
    ? currentSnapshot
    : currentSnapshot.tools || [];

  const baselineMap = new Map();
  baselineTools.forEach(tool => {
    const key = `${tool.serverName}__${tool.name}`;
    baselineMap.set(key, tool);
  });

  const added = [];
  const removed = [];
  const changed = [];

  currentTools.forEach(tool => {
    const key = `${tool.serverName}__${tool.name}`;
    const previous = baselineMap.get(key);
    if (!previous) {
      added.push(tool);
      return;
    }
    const previousSchema = stableStringify(previous.inputSchema || {});
    const currentSchema = stableStringify(tool.inputSchema || {});
    if (previousSchema !== currentSchema) {
      changed.push({
        tool,
        previous
      });
    }
    baselineMap.delete(key);
  });

  baselineMap.forEach(tool => removed.push(tool));

  return {
    summary: {
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      totalChanges: added.length + removed.length + changed.length
    },
    added,
    removed,
    changed
  };
}

function exportSchemaDiff() {
  if (!lastSchemaDiff) {
    showNotification('No schema diff available yet.', 'warning');
    return;
  }
  downloadJsonFile('schema-diff.json', lastSchemaDiff);
}

function exportCurrentSchemaSnapshot() {
  if (!lastSchemaSnapshot) {
    showNotification('No schema snapshot available yet.', 'warning');
    return;
  }
  downloadJsonFile('schema-snapshot-current.json', lastSchemaSnapshot);
}

function copySchemaDiffCommand() {
  const command = 'mcp-test schema diff ./schema-baseline.json ./schema-current.json --format junit --out ./schema-diff.xml --gate';
  navigator.clipboard.writeText(command)
    .then(() => showNotification('CI command copied to clipboard.', 'success'))
    .catch(error => showNotification('Failed to copy command: ' + error.message, 'error'));
}

function showSchemaDiffModal(diff, baseline, current) {
  lastSchemaDiff = diff;
  lastSchemaSnapshot = current;
  updateSchemaDiffBadge(diff.summary);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.id = 'schemaDiffModal';
  modal.style.display = 'flex';

  const addedList = diff.added.map(tool => `
    <div style="padding: 6px 0; border-top: 1px dashed var(--border)">
      <strong>${escapeHtml(tool.serverName)}.${escapeHtml(tool.name)}</strong>
    </div>
  `).join('');
  const removedList = diff.removed.map(tool => `
    <div style="padding: 6px 0; border-top: 1px dashed var(--border)">
      <strong>${escapeHtml(tool.serverName)}.${escapeHtml(tool.name)}</strong>
    </div>
  `).join('');
  const changedList = diff.changed.map(entry => `
    <div style="padding: 6px 0; border-top: 1px dashed var(--border)">
      <strong>${escapeHtml(entry.tool.serverName)}.${escapeHtml(entry.tool.name)}</strong>
      <div style="font-size: 0.7rem; color: var(--text-muted)">Schema changed</div>
    </div>
  `).join('');

  modal.innerHTML = `
    <div class="modal" style="max-width: 820px; max-height: 85vh">
      <div class="modal-header">
        <h2 class="modal-title">🧭 Schema Regression Diff</h2>
        <button class="modal-close" onclick="document.getElementById('schemaDiffModal')?.remove()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div style="padding: var(--spacing-md); overflow-y: auto; max-height: calc(85vh - 130px)">
        <div style="display: flex; gap: 16px; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 12px">
          <span>✅ Added: ${diff.summary.added}</span>
          <span>🗑️ Removed: ${diff.summary.removed}</span>
          <span>✏️ Changed: ${diff.summary.changed}</span>
          <span>Σ Total: ${diff.summary.totalChanges}</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px">
          <div style="border: 1px solid var(--border); border-radius: 8px; padding: 10px; background: var(--bg-surface)">
            <div style="font-weight: 600; margin-bottom: 6px">Added</div>
            ${addedList || '<div style="color: var(--text-muted); font-size: 0.75rem">No additions</div>'}
          </div>
          <div style="border: 1px solid var(--border); border-radius: 8px; padding: 10px; background: var(--bg-surface)">
            <div style="font-weight: 600; margin-bottom: 6px">Removed</div>
            ${removedList || '<div style="color: var(--text-muted); font-size: 0.75rem">No removals</div>'}
          </div>
          <div style="border: 1px solid var(--border); border-radius: 8px; padding: 10px; background: var(--bg-surface)">
            <div style="font-weight: 600; margin-bottom: 6px">Changed</div>
            ${changedList || '<div style="color: var(--text-muted); font-size: 0.75rem">No changes</div>'}
          </div>
        </div>
      </div>
      <div class="modal-actions" style="gap: 8px">
        <button class="btn" onclick="exportSchemaDiff()">📥 Export Diff</button>
        <button class="btn" onclick="exportCurrentSchemaSnapshot()">📦 Export Current</button>
        <button class="btn" onclick="document.getElementById('schemaDiffModal')?.remove()">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function renderContractsList() {
  const list = document.getElementById('contractsList');
  if (!list) return;

  if (contracts.length === 0) {
    list.innerHTML = '<div class="empty-state">No contracts defined. Upload a JSON schema to validate tool responses!</div>';
    return;
  }

  list.innerHTML = contracts.map(contract => {
    const statusIcon = contract.lastValidation?.valid ? '✅' : contract.lastValidation ? '❌' : '⏸️';
    const breakingChanges = contract.breakingChanges?.length || 0;
    const toolLabel = contract.toolName || contract.name || 'Unknown tool';
    const serverLabel = contract.server || 'unknown';

    return `
      <div class="contract-card">
        <div class="contract-header">
          <h3>${statusIcon} ${toolLabel}</h3>
          <span class="badge">${serverLabel}</span>
          ${breakingChanges > 0 ? `<span class="badge badge-danger">${breakingChanges} breaking changes</span>` : ''}
        </div>
        <p class="contract-desc">
          Schema version: ${contract.version || '1.0.0'}
          ${contract.lastValidation ? ` | Last validated: ${new Date(contract.lastValidation.timestamp).toLocaleString()}` : ''}
        </p>
        <div class="contract-stats">
          <span>📊 ${contract.validationCount || 0} validations</span>
          <span>✅ ${contract.successCount || 0} passed</span>
          <span>❌ ${contract.failureCount || 0} failed</span>
        </div>
        <div class="contract-actions">
          <button class="btn-small" onclick="viewContract('${contract.id}')">👁️ View Schema</button>
          <button class="btn-small" onclick="validateContract('${contract.id}')">▶️ Validate</button>
          <button class="btn-small" onclick="detectBreakingChanges('${contract.id}')">🔍 Check Changes</button>
          <button class="btn-small btn-danger" onclick="deleteContract('${contract.id}')">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

async function createContractModal() {
  const result = await appFormModal({
    title: 'New Contract',
    confirmText: 'Create',
    fields: [
      { id: 'server', label: 'Server name', required: true },
      { id: 'toolName', label: 'Tool name', required: true },
      { id: 'version', label: 'Contract version', value: '1.0.0' },
      { id: 'schema', label: 'JSON Schema', type: 'textarea', rows: 6, monospace: true, required: true },
      { id: 'sampleArgs', label: 'Sample args JSON', type: 'textarea', rows: 4, monospace: true }
    ]
  });
  if (!result.confirmed) return;

  const server = (result.values.server || '').trim();
  const toolName = (result.values.toolName || '').trim();
  const version = result.values.version || '1.0.0';
  const schemaJson = result.values.schema || '';
  const sampleArgsJson = result.values.sampleArgs || '';
  if (!server || !toolName || !schemaJson.trim()) return;

  try {
    const schema = JSON.parse(schemaJson);
    let sampleArgs = {};
    if (sampleArgsJson.trim()) {
      sampleArgs = JSON.parse(sampleArgsJson);
    }

    const res = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        server,
        toolName,
        version,
        schema,
        sampleArgs
      })
    });

    if (!res.ok) throw new Error(await res.text());

    await loadContracts();
    showNotification('Contract created!', 'success');
  } catch (error) {
    showNotification('Failed to create contract: ' + error.message, 'error');
  }
}

async function viewContract(id) {
  let contract = contracts.find(c => c.id === id);
  if (!contract) return;

  if (!contract.schema) {
    try {
      const res = await fetch(`/api/contracts/${id}`);
      if (res.ok) {
        contract = await res.json();
      }
    } catch (error) {
      console.warn('Failed to load contract schema:', error);
    }
  }

  const schemaStr = JSON.stringify(contract.schema || {}, null, 2);

  // Create a modal to display schema
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  modal.innerHTML = `
    <div style="background: var(--bg-surface); padding: 24px; border-radius: 12px; max-width: 800px; max-height: 80vh; overflow: auto;">
      <h2>${contract.server}.${contract.toolName} Contract Schema</h2>
      <p style="color: var(--text-secondary); margin-bottom: 12px;">Version: ${contract.version}</p>
      <pre style="background: var(--bg-card); padding: 16px; border-radius: 8px; overflow: auto; max-height: 400px;"><code>${schemaStr}</code></pre>
      <button class="btn" onclick="this.closest('div').parentElement.remove()" style="margin-top: 12px;">Close</button>
    </div>
  `;

  document.body.appendChild(modal);
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
}

async function validateContract(id) {
  try {
    showNotification('Validating contract...', 'info');

    const res = await fetch(`/api/contracts/${id}/validate`, { method: 'POST' });
    const result = await res.json();

    if (result.valid) {
      showNotification('✅ Contract validation passed!', 'success');
    } else {
      const errors = (result.errors || []).map(e => {
        if (typeof e === 'string') return e;
        return `${e.field || 'response'}: ${e.message || e.error || 'Validation error'}`;
      }).join('\n');
      showNotification(`❌ Validation failed:\n${errors}`, 'error');
    }

    await loadContracts();
  } catch (error) {
    showNotification('Failed to validate: ' + error.message, 'error');
  }
}

async function detectBreakingChanges(id) {
  try {
    showNotification('Checking for breaking changes...', 'info');

    const res = await fetch(`/api/contracts/${id}/breaking-changes`);
    const result = await res.json();

    if (!result.breakingChanges || result.breakingChanges.length === 0) {
      showNotification('✅ No breaking changes detected!', 'success');
    } else {
      const changes = result.breakingChanges.map(c =>
        `${c.type}: ${c.field} - ${c.description || c.message || 'Change detected'}`
      ).join('\n');
      showNotification(`⚠️ Breaking changes found:\n${changes}`, 'warning');

      // Update contract list
      await loadContracts();
    }
  } catch (error) {
    showNotification('Failed to check changes: ' + error.message, 'error');
  }
}

async function deleteContract(id) {
  const confirmed = await appConfirm('Delete this contract?', {
    title: 'Delete Contract',
    confirmText: 'Delete',
    confirmVariant: 'danger'
  });
  if (!confirmed) return;

  try {
    await fetch(`/api/contracts/${id}`, { method: 'DELETE' });
    await loadContracts();
    showNotification('Contract deleted', 'success');
  } catch (error) {
    showNotification('Failed to delete: ' + error.message, 'error');
  }
}

async function runPreDeploymentCheck() {
  try {
    showNotification('Running pre-deployment validation...', 'info');

    const res = await fetch('/api/contracts/pre-deployment-check', { method: 'POST' });
    const result = await res.json();

    const passed = result.results.filter(r => r.valid).length;
    const failed = result.results.filter(r => !r.valid).length;

    if (failed === 0) {
      showNotification(`✅ All ${passed} contracts validated successfully!`, 'success');
    } else {
      showNotification(`⚠️ ${passed} passed, ${failed} failed. Check details.`, 'warning');
    }
  } catch (error) {
    showNotification('Failed to run check: ' + error.message, 'error');
  }
}

// ==========================================
// DOCUMENTATION VIEWER
// ==========================================

let connectedServers = [];

async function loadConnectedServers() {
  try {
    const res = await fetch('/api/mcp/status');
    const statusData = await res.json();

    // Transform status object into array of servers
    connectedServers = Object.entries(statusData).map(([name, status]) => ({
      name,
      transport: status.type || 'stdio',
      connected: status.connected,
      toolCount: status.toolCount || 0
    })).filter(s => s.connected); // Only show connected servers

    return connectedServers;
  } catch (error) {
    console.error('Failed to load servers:', error);
    return [];
  }
}

async function showServerSelectionModal(action = 'generate') {
  // Load connected servers
  const servers = await loadConnectedServers();

  if (servers.length === 0) {
    showNotification('No servers connected. Please connect a server first.', 'warning');
    return;
  }

  // Create modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  const serverOptions = servers.map(s =>
    `<option value="${s.name}">${s.name} (${s.transport || 'stdio'})</option>`
  ).join('');

  modal.innerHTML = `
    <div style="background: var(--bg-surface); padding: 24px; border-radius: 12px; min-width: 400px;">
      <h2 style="margin-top: 0;">${action === 'generate' ? '🚀 Generate Documentation' : '👁️ Preview Documentation'}</h2>
      <p style="color: var(--text-secondary); margin-bottom: 20px;">
        Select a server or generate for all connected servers
      </p>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500;">Server:</label>
        <select id="serverSelect" style="
          width: 100%;
          padding: 10px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg-card);
          color: var(--text-primary);
          font-size: 0.95rem;
        ">
          <option value="__ALL__">📚 All Servers (${servers.length} total)</option>
          ${serverOptions}
        </select>
      </div>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button class="btn" onclick="this.closest('div').parentElement.remove()" style="background: var(--bg-card);">
          Cancel
        </button>
        <button class="btn primary" id="confirmBtn">
          ${action === 'generate' ? '🚀 Generate' : '👁️ Preview'}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Handle confirm
  document.getElementById('confirmBtn').onclick = async () => {
    const select = document.getElementById('serverSelect');
    const selectedServer = select.value;

    modal.remove();

    if (action === 'generate') {
      await executeGenerateDocumentation(selectedServer);
    } else {
      await executePreviewDocumentation(selectedServer);
    }
  };

  // Close on background click
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
}

async function generateDocumentation() {
  await showServerSelectionModal('generate');
}

async function executeGenerateDocumentation(serverName) {
  try {
    showNotification('Generating documentation...', 'info');

    let url;
    if (serverName === '__ALL__') {
      url = '/api/documentation/generate-all?format=html';
    } else {
      url = `/api/documentation/generate/${serverName}?format=html&save=true`;
    }

    const res = await fetch(url, { method: 'POST' });

    if (serverName === '__ALL__') {
      const data = await res.json();
      const successful = data.results.filter(r => r.success).length;
      showNotification(`✅ Generated docs for ${successful} servers!`, 'success');
    } else {
      const data = await res.json();
      showNotification('✅ Documentation generated and saved!', 'success');

      // Show preview
      executePreviewDocumentation(serverName);
    }
  } catch (error) {
    showNotification('Failed to generate: ' + error.message, 'error');
  }
}

async function previewDocumentation() {
  await showServerSelectionModal('preview');
}

async function executePreviewDocumentation(serverName) {
  if (serverName === '__ALL__') {
    showNotification('Please select a specific server to preview', 'warning');
    return;
  }

  try {
    const url = `/api/documentation/preview/${serverName}?format=html`;
    window.open(url, '_blank');
  } catch (error) {
    showNotification('Failed to preview: ' + error.message, 'error');
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
    color: white;
    font-weight: 500;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add CSS animations
// ==========================================
// PERFORMANCE PROFILING
// ==========================================
async function loadPerformanceMetrics() {
  try {
    // Get tool explorer stats which includes performance metrics
    const response = await fetch('/api/toolexplorer/stats');
    if (!response.ok) {
      console.error('Failed to load performance metrics');
      return;
    }

    const data = await response.json();
    renderPerformanceMetrics(data);
  } catch (error) {
    console.error('Error loading performance metrics:', error);
    // Show placeholder data
    renderPerformanceMetrics({
      avgResponseTime: null,
      p95Latency: null,
      totalCalls: 0,
      slowestTools: []
    });
  }
}

function renderPerformanceMetrics(data) {
  // Update summary stats
  const avgEl = document.getElementById('avgResponseTime');
  const p95El = document.getElementById('p95Latency');
  const totalEl = document.getElementById('totalCalls');

  if (avgEl) avgEl.textContent = data.avgResponseTime ? `${data.avgResponseTime.toFixed(0)}ms` : '-';
  if (p95El) p95El.textContent = data.p95Latency ? `${data.p95Latency.toFixed(0)}ms` : '-';
  if (totalEl) totalEl.textContent = data.totalCalls ? data.totalCalls.toLocaleString() : '0';

  // Render slowest tools
  const slowestToolsEl = document.getElementById('slowestTools');
  if (slowestToolsEl && data.slowestTools) {
    slowestToolsEl.innerHTML = '<h4 style="font-size: 0.9rem; margin-bottom: 8px">Slowest Tools</h4>';
    data.slowestTools.slice(0, 5).forEach(tool => {
      slowestToolsEl.innerHTML += `
        <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-card); border-radius: 4px">
          <span>${tool.name}</span>
          <span style="color: ${tool.avgTime > 1000 ? 'var(--error)' : 'var(--text-secondary)'}">${tool.avgTime.toFixed(0)}ms</span>
        </div>
      `;
    });
  }
}

// ==========================================
// WORKFLOW DEBUGGER
// ==========================================
let debuggerState = {
  sessionId: null,
  currentWorkflowId: null,
  breakpoints: [],
  status: 'idle',
  stepMode: false,
  lastState: null
};

async function loadDebuggerWorkflows() {
  const select = document.getElementById('debuggerWorkflowSelect');
  if (!select) return;

  try {
    const res = await fetch('/api/workflows');
    const workflows = await res.json();

    if (!Array.isArray(workflows) || workflows.length === 0) {
      select.innerHTML = '<option value="">No workflows found</option>';
      return;
    }

    select.innerHTML = workflows.map(workflow => `
      <option value="${escapeHtml(workflow.id)}">${escapeHtml(workflow.name || workflow.id)}</option>
    `).join('');

    if (typeof workflowState !== 'undefined' && workflowState.currentId) {
      const hasCurrent = workflows.some(w => w.id === workflowState.currentId);
      if (hasCurrent) select.value = workflowState.currentId;
    }

    if (!debuggerState.sessionId) {
      await updateDebuggerTimeline();
    }
  } catch (error) {
    select.innerHTML = '<option value="">Failed to load workflows</option>';
  }
}

function onDebuggerWorkflowSelect() {
  const select = document.getElementById('debuggerWorkflowSelect');
  debuggerState.currentWorkflowId = select?.value || null;
  debuggerState.breakpoints = [];
}

function getDebuggerWorkflowId() {
  const select = document.getElementById('debuggerWorkflowSelect');
  if (select?.value) return select.value;
  if (typeof workflowState !== 'undefined' && workflowState.currentId) return workflowState.currentId;
  return null;
}

function getDebuggerInput() {
  const inputEl = document.getElementById('debuggerInput');
  const raw = inputEl?.value?.trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    showNotification('Debugger input must be valid JSON', 'warning');
    return null;
  }
}

async function startDebugSession(forceStepMode = null) {
  const workflowId = getDebuggerWorkflowId();
  if (!workflowId) {
    showNotification('Select a workflow to debug', 'warning');
    return;
  }

  const input = getDebuggerInput();
  if (input === null) return;

  const stepToggle = document.getElementById('debuggerStepMode');
  const stepMode = typeof forceStepMode === 'boolean'
    ? forceStepMode
    : Boolean(stepToggle?.checked);

  try {
    const res = await fetch(`/api/workflows/${workflowId}/debug/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input,
        breakpoints: debuggerState.breakpoints,
        stepMode
      })
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const data = await res.json();
    debuggerState.sessionId = data.sessionId;
    debuggerState.status = data.status || 'ready';
    debuggerState.currentWorkflowId = workflowId;
    debuggerState.stepMode = stepMode;

    await executeDebugSession();
  } catch (error) {
    showNotification('Failed to start debugger: ' + error.message, 'error');
  }
}

async function stepThroughWorkflow() {
  const stepToggle = document.getElementById('debuggerStepMode');
  if (stepToggle) stepToggle.checked = true;

  if (!debuggerState.sessionId) {
    await startDebugSession(true);
    return;
  }

  try {
    await fetch(`/api/workflows/debug/${debuggerState.sessionId}/step`, { method: 'POST' });
    await updateDebuggerTimeline();
  } catch (error) {
    showNotification('Failed to step workflow: ' + error.message, 'error');
  }
}

async function executeDebugSession() {
  if (!debuggerState.sessionId) return;
  try {
    await fetch(`/api/workflows/debug/${debuggerState.sessionId}/execute`, { method: 'POST' });
    await updateDebuggerTimeline();
  } catch (error) {
    showNotification('Failed to execute debugger: ' + error.message, 'error');
  }
}

async function resumeDebugSession() {
  if (!debuggerState.sessionId) {
    showNotification('No debug session to resume', 'warning');
    return;
  }

  try {
    await fetch(`/api/workflows/debug/${debuggerState.sessionId}/resume`, { method: 'POST' });
    await updateDebuggerTimeline();
  } catch (error) {
    showNotification('Failed to resume debugger: ' + error.message, 'error');
  }
}

async function abortDebugSession() {
  if (!debuggerState.sessionId) {
    showNotification('No debug session to abort', 'warning');
    return;
  }

  try {
    await fetch(`/api/workflows/debug/${debuggerState.sessionId}/abort`, { method: 'POST' });
    await fetch(`/api/workflows/debug/${debuggerState.sessionId}`, { method: 'DELETE' });
  } catch (error) {
    showNotification('Failed to abort debugger: ' + error.message, 'error');
  } finally {
    debuggerState.sessionId = null;
    debuggerState.status = 'idle';
    debuggerState.lastState = null;
    await updateDebuggerTimeline();
  }
}

async function toggleBreakpoints() {
  const current = debuggerState.breakpoints.join(', ');
  const input = await appPrompt('Breakpoint node IDs (comma separated):', {
    title: 'Breakpoints',
    label: 'Node IDs',
    defaultValue: current
  });
  if (input === null) return;

  const nextBreakpoints = input
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  if (!debuggerState.sessionId) {
    debuggerState.breakpoints = nextBreakpoints;
    showNotification('Breakpoints saved. Start debugger to apply.', 'info');
    return;
  }

  const toAdd = nextBreakpoints.filter(id => !debuggerState.breakpoints.includes(id));
  const toRemove = debuggerState.breakpoints.filter(id => !nextBreakpoints.includes(id));

  try {
    for (const nodeId of toAdd) {
      await fetch(`/api/workflows/debug/${debuggerState.sessionId}/breakpoint/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId })
      });
    }

    for (const nodeId of toRemove) {
      await fetch(`/api/workflows/debug/${debuggerState.sessionId}/breakpoint/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId })
      });
    }

    debuggerState.breakpoints = nextBreakpoints;
    await updateDebuggerTimeline();
  } catch (error) {
    showNotification('Failed to update breakpoints: ' + error.message, 'error');
  }
}

async function updateDebuggerTimeline() {
  const stepsEl = document.getElementById('executionSteps');
  const variablesEl = document.getElementById('currentVariables');
  const statusEl = document.getElementById('debuggerStatus');

  if (!stepsEl) return;

  if (!debuggerState.sessionId) {
    stepsEl.innerHTML = `<div style="padding: 12px; color: var(--text-secondary)">No active debug session. Start one to see execution.</div>`;
    if (variablesEl) variablesEl.textContent = '';
    if (statusEl) statusEl.textContent = 'Status: idle';
    return;
  }

  try {
    const res = await fetch(`/api/workflows/debug/${debuggerState.sessionId}/state`);
    if (!res.ok) throw new Error(await res.text());
    const state = await res.json();
    debuggerState.lastState = state;
    debuggerState.status = state.status;
    debuggerState.breakpoints = state.breakpoints || debuggerState.breakpoints;

    if (statusEl) {
      const currentNode = state.currentNode?.id ? ` | Node: ${state.currentNode.id}` : '';
      statusEl.textContent = `Status: ${state.status}${currentNode}`;
    }

    const executionLog = state.executionLog || [];
    if (executionLog.length === 0) {
      stepsEl.innerHTML = `<div style="padding: 12px; color: var(--text-secondary)">Waiting for execution data...</div>`;
    } else {
      stepsEl.innerHTML = executionLog.map(entry => `
        <div style="padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-surface)">
          <div style="display: flex; justify-content: space-between; gap: 8px; font-size: 0.8rem; font-weight: 600">
            <span>${escapeHtml(entry.nodeId)} <span style="color: var(--text-secondary)">(${escapeHtml(entry.type)})</span></span>
            <span style="color: ${entry.status === 'success' ? 'var(--success)' : 'var(--error)'}">${escapeHtml(entry.status)}</span>
          </div>
          <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px">${escapeHtml(entry.timestamp || '')}</div>
          ${entry.error ? `<div style="margin-top: 6px; color: var(--error); font-size: 0.75rem">${escapeHtml(entry.error)}</div>` : ''}
        </div>
      `).join('');
    }

    if (variablesEl) {
      variablesEl.textContent = JSON.stringify(state.variables || {}, null, 2);
    }
  } catch (error) {
    stepsEl.innerHTML = `<div style="padding: 12px; color: var(--error)">Failed to load debug state: ${escapeHtml(error.message)}</div>`;
  }
}

const advancedFeaturesStyle = document.createElement('style');
advancedFeaturesStyle.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`;
document.head.appendChild(advancedFeaturesStyle);

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdvancedFeatures);
} else {
  initAdvancedFeatures();
}

function initAdvancedFeatures() {
  // Initialize collections if on that tab
  const collectionsPanel = document.getElementById('collectionsPanel');
  if (collectionsPanel) {
    loadCollections();
  }

  // Initialize monitors if on that tab
  const monitorsPanel = document.getElementById('monitorsPanel');
  if (monitorsPanel) {
    loadMonitors();
  }

  // Initialize tool explorer if on that tab
  const toolExplorerPanel = document.getElementById('toolExplorerPanel');
  if (toolExplorerPanel) {
    loadToolExplorer();
  }

  // Initialize mocks if on that tab
  const mocksPanel = document.getElementById('mocksPanel');
  if (mocksPanel) {
    loadMockServers();
  }

  // Initialize scripts if on that tab
  const scriptsPanel = document.getElementById('scriptsPanel');
  if (scriptsPanel) {
    loadScripts();
  }

  // Initialize workflow debugger
  const debuggerPanel = document.getElementById('debuggerPanel');
  if (debuggerPanel) {
    loadDebuggerWorkflows();
    updateDebuggerTimeline();
  }

  // Initialize contracts if on that tab
  const contractsPanel = document.getElementById('contractsPanel');
  if (contractsPanel) {
    loadContracts();
  }
}
