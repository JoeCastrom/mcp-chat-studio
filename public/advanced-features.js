/**
 * Advanced Features UI
 * Collections, Monitors, Tool Explorer, Mocks, Scripts, Documentation, Contracts
 */

// ==========================================
// COLLECTIONS MANAGER
// ==========================================

let currentCollection = null;
let collections = [];

async function loadCollections() {
  try {
    const res = await fetch('/api/collections');
    const data = await res.json();
    collections = data.collections || [];
    renderCollectionsList();
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
        <button class="btn-small" onclick="event.stopPropagation(); runCollection('${col.id}')">▶️ Run</button>
        <button class="btn-small" onclick="event.stopPropagation(); exportCollection('${col.id}')">📥 Export</button>
        <button class="btn-small btn-danger" onclick="event.stopPropagation(); deleteCollection('${col.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

async function createCollectionModal() {
  const name = prompt('Collection name:');
  if (!name) return;

  const description = prompt('Description (optional):');

  try {
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, scenarios: [] })
    });

    if (!res.ok) throw new Error(await res.text());

    await loadCollections();
    showNotification('Collection created!', 'success');
  } catch (error) {
    showNotification('Failed to create collection: ' + error.message, 'error');
  }
}

async function runCollection(id) {
  try {
    showNotification('Running collection...', 'info');
    const res = await fetch(`/api/collections/${id}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stopOnError: false })
    });

    const results = await res.json();

    const message = `✅ ${results.passed} passed, ❌ ${results.failed} failed, ⏭️ ${results.skipped} skipped`;
    showNotification(message, results.failed === 0 ? 'success' : 'warning');
  } catch (error) {
    showNotification('Failed to run collection: ' + error.message, 'error');
  }
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
  if (!confirm('Delete this collection?')) return;

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

  const name = prompt('Monitor name:');
  if (!name) return;

  const collectionId = prompt(`Collection ID (available: ${collections.map(c => c.id).join(', ')}):`);
  if (!collectionId) return;

  const schedule = prompt('Schedule (examples: 5m, 1h, 0 */6 * * *):');
  if (!schedule) return;

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
  if (!confirm('Delete this monitor?')) return;

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
    // Load statistics
    const statsRes = await fetch('/api/toolexplorer/stats');
    const stats = await statsRes.json();
    renderToolExplorerStats(stats);

    // Load leaderboard
    const leaderRes = await fetch('/api/toolexplorer/leaderboard');
    const leaderboard = await leaderRes.json();
    renderLeaderboard(leaderboard);

    // Load health
    const healthRes = await fetch('/api/toolexplorer/health');
    const health = await healthRes.json();
    renderHealthDashboard(health);
  } catch (error) {
    console.error('Failed to load tool explorer:', error);
  }
}

function renderToolExplorerStats(stats) {
  const el = document.getElementById('toolExplorerStats');
  if (!el) return;

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
        <div class="stat-value">${(stats.avgSuccessRate * 100 || 0).toFixed(1)}%</div>
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

  if (!data.tools || data.tools.length === 0) {
    el.innerHTML = '<div class="empty-state">No tool usage data yet</div>';
    return;
  }

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
        ${data.tools.map((tool, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${tool.server}</td>
            <td><code>${tool.tool}</code></td>
            <td>${tool.calls}</td>
            <td>${(tool.successRate * 100).toFixed(1)}%</td>
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

  const statusColor = health.status === 'healthy' ? 'green' :
                      health.status === 'warning' ? 'orange' : 'red';

  el.innerHTML = `
    <div class="health-status" style="border-left: 4px solid ${statusColor}">
      <h3>System Health: <span style="color: ${statusColor}">${health.status?.toUpperCase()}</span></h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${health.healthyTools || 0}</div>
          <div class="stat-label">🟢 Healthy Tools</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${health.warningTools || 0}</div>
          <div class="stat-label">🟡 Warning</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${health.criticalTools || 0}</div>
          <div class="stat-label">🔴 Critical</div>
        </div>
      </div>
      ${health.problematicTools && health.problematicTools.length > 0 ? `
        <div class="problematic-tools">
          <h4>Problematic Tools:</h4>
          <ul>
            ${health.problematicTools.map(t => `
              <li>
                <strong>${t.server}.${t.tool}</strong>:
                ${(t.errorRate * 100).toFixed(1)}% errors,
                ${t.avgLatency}ms latency
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
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
        <button class="btn-small" onclick="viewMockDetails('${mock.id}')">👁️ View</button>
        <button class="btn-small" onclick="resetMockStats('${mock.id}')">🔄 Reset</button>
        <button class="btn-small btn-danger" onclick="deleteMock('${mock.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

async function createMockServerModal() {
  const name = prompt('Mock server name:');
  if (!name) return;

  const description = prompt('Description (optional):');

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

  alert(details);
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
  if (!confirm('Delete this mock server?')) return;

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
  const name = prompt('Script name:');
  if (!name) return;

  const type = prompt('Type (pre or post):');
  if (!type || !['pre', 'post'].includes(type)) {
    showNotification('Type must be "pre" or "post"', 'error');
    return;
  }

  const description = prompt('Description (optional):');

  const code = prompt('JavaScript code:\n(Use pm.variables, pm.test, pm.expect)');
  if (!code) return;

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

  const newCode = prompt('Edit code:', script.code);
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
  if (!confirm('Delete this script?')) return;

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

async function loadContracts() {
  try {
    const res = await fetch('/api/contracts');
    const data = await res.json();
    contracts = data.contracts || [];
    renderContractsList();
  } catch (error) {
    console.error('Failed to load contracts:', error);
  }
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

    return `
      <div class="contract-card">
        <div class="contract-header">
          <h3>${statusIcon} ${contract.toolName}</h3>
          <span class="badge">${contract.server}</span>
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
  const server = prompt('Server name:');
  if (!server) return;

  const toolName = prompt('Tool name:');
  if (!toolName) return;

  const version = prompt('Contract version (default 1.0.0):') || '1.0.0';

  const schemaJson = prompt('Paste JSON Schema:');
  if (!schemaJson) return;

  try {
    const schema = JSON.parse(schemaJson);

    const res = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        server,
        toolName,
        version,
        schema
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
  const contract = contracts.find(c => c.id === id);
  if (!contract) return;

  const schemaStr = JSON.stringify(contract.schema, null, 2);

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
      const errors = result.errors.map(e => `${e.field}: ${e.message}`).join('\n');
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

    if (result.breakingChanges.length === 0) {
      showNotification('✅ No breaking changes detected!', 'success');
    } else {
      const changes = result.breakingChanges.map(c =>
        `${c.type}: ${c.field} - ${c.description}`
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
  if (!confirm('Delete this contract?')) return;

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

  // Initialize contracts if on that tab
  const contractsPanel = document.getElementById('contractsPanel');
  if (contractsPanel) {
    loadContracts();
  }
}
