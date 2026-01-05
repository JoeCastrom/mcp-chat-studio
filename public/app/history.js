// Tool execution history panel helpers
(() => {
  const HISTORY_PAGE_SIZE = 150;
  let historyPage = 1;

  const getHistoryEntries = () => (typeof window.getHistoryEntries === 'function'
    ? window.getHistoryEntries()
    : []);

  function refreshHistoryPanel() {
    const history = getHistoryEntries();
    const statsEl = document.getElementById('toolHistoryStats');
    const listEl = document.getElementById('toolHistoryList');
    if (!statsEl || !listEl) return;

    if (history.length === 0) {
      historyPage = 1;
      statsEl.textContent = 'No tool executions recorded';
      listEl.innerHTML = `
        <div style="color: var(--text-muted); font-style: italic; text-align: center; padding: 20px">
          Execute tools from the Inspector tab to see history here...
        </div>
      `;
      return;
    }

    const successCount = history.filter(h => h.success).length;
    const avgDuration = Math.round(history.reduce((sum, h) => sum + (h.duration || 0), 0) / history.length);
    statsEl.innerHTML = `
      <strong>${history.length}</strong> executions •
      <span style="color: var(--success)">${successCount} ✓</span> /
      <span style="color: var(--error)">${history.length - successCount} ✗</span> •
      Avg: ${avgDuration}ms
    `;

    const limit = Math.min(history.length, historyPage * HISTORY_PAGE_SIZE);
    const visible = history.slice(0, limit);

    const entriesHtml = visible.map((entry, idx) => {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      const statusIcon = entry.success ? '✅' : '❌';
      return `
        <div class="inspector-response" style="margin: 0; cursor: pointer" onclick="toggleHistoryDetail(${idx})">
          <div style="display: flex; justify-content: space-between; align-items: center">
            <div>
              <strong>${statusIcon} ${escapeHtml(entry.tool)}</strong>
              <span style="color: var(--text-muted); font-size: 0.7rem"> @ ${escapeHtml(entry.server)}</span>
            </div>
            <div style="font-size: 0.7rem; color: var(--text-muted)">
              ${time} • ${entry.duration}ms
            </div>
          </div>
          <div id="historyDetail${idx}" style="display: none; margin-top: 8px; font-size: 0.75rem">
            <div style="margin-bottom: 4px"><strong>Request:</strong></div>
            <pre style="background: var(--bg-card); padding: 8px; border-radius: 4px; overflow-x: auto; max-height: 150px">${escapeHtml(JSON.stringify(entry.request, null, 2))}</pre>
            <div style="margin: 8px 0 4px"><strong>Response:</strong></div>
            <pre style="background: var(--bg-card); padding: 8px; border-radius: 4px; overflow-x: auto; max-height: 200px">${escapeHtml(JSON.stringify(entry.response, null, 2))}</pre>
            <div style="margin-top: 8px">
              <button class="btn" onclick="event.stopPropagation(); copyHistoryEntry(${idx})" style="font-size: 0.65rem; padding: 2px 6px">📋 Copy</button>
              <button class="btn" onclick="event.stopPropagation(); replayHistoryEntry(${idx})" style="font-size: 0.65rem; padding: 2px 6px">🔄 Replay in Inspector</button>
              <button class="btn" onclick="event.stopPropagation(); rerunHistoryEntryDiff(${idx})" style="font-size: 0.65rem; padding: 2px 6px">🔁 Re-run + Diff</button>
              <button class="btn" onclick="event.stopPropagation(); runHistoryEntryMatrix(${idx})" style="font-size: 0.65rem; padding: 2px 6px">🌐 Matrix</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const loadMore = history.length > limit
      ? `<div style="padding: 12px; text-align: center">
          <button class="btn" onclick="loadMoreHistory()">Load ${Math.min(history.length - limit, HISTORY_PAGE_SIZE)} more</button>
        </div>`
      : '';

    listEl.innerHTML = `${entriesHtml}${loadMore}`;
  }

  function loadMoreHistory() {
    historyPage += 1;
    refreshHistoryPanel();
  }

  function toggleHistoryDetail(idx) {
    const detailEl = document.getElementById(`historyDetail${idx}`);
    if (detailEl) {
      detailEl.style.display = detailEl.style.display === 'none' ? 'block' : 'none';
    }
  }

  function copyHistoryEntry(idx) {
    const history = getHistoryEntries();
    const entry = history[idx];
    if (!entry) return;
    navigator.clipboard.writeText(JSON.stringify(entry, null, 2))
      .then(() => window.appendMessage?.('system', '📋 History entry copied to clipboard'))
      .catch(() => window.showNotification?.('Failed to copy history entry.', 'error'));
  }

  async function runHistoryEntryMatrix(idx) {
    const history = getHistoryEntries();
    const entry = history[idx];
    if (!entry) return;

    window.openInspectorPanel?.();
    window.switchInspectorTab?.('diff');
    await window.loadCrossServerOptions?.();

    const toolSelect = document.getElementById('crossToolSelect');
    const baselineSelect = document.getElementById('crossBaselineServerSelect');
    const argsEl = document.getElementById('crossArgs');

    window.ensureToolOption?.(toolSelect, entry.tool, 'from History');
    if (baselineSelect && entry.server) {
      const hasBaseline = Array.from(baselineSelect.options || [])
        .some(option => option.value === entry.server);
      if (hasBaseline) {
        baselineSelect.value = entry.server;
      }
    }
    if (argsEl) {
      argsEl.value = JSON.stringify(entry.request || {}, null, 2);
    }

    if (!toolSelect || !toolSelect.value) {
      window.showNotification?.('This tool is not available on connected servers.', 'error');
      return;
    }

    await window.runCrossServerCompare?.();
  }

  function replayHistoryEntry(idx) {
    const history = getHistoryEntries();
    const entry = history[idx];
    if (!entry) return;

    window.openInspectorPanel?.();
    const serverSelect = document.getElementById('inspectorServerSelect');
    if (serverSelect) {
      serverSelect.value = entry.server;
      serverSelect.dispatchEvent(new Event('change'));
    }
    setTimeout(() => {
      const argsInput = document.getElementById('toolArgsInput');
      if (argsInput) {
        argsInput.value = JSON.stringify(entry.request, null, 2);
      }
    }, 500);

    window.appendMessage?.('system', `🔄 Loaded ${entry.tool} request in Inspector - select the tool and execute`);
  }

  async function rerunHistoryEntryDiff(idx) {
    const history = getHistoryEntries();
    const entry = history[idx];
    if (!entry) {
      window.showNotification?.('History entry not found.', 'error');
      return;
    }
    if (!entry.server || !entry.tool) {
      window.showNotification?.('History entry is missing server or tool.', 'error');
      return;
    }

    const startTime = performance.now();
    try {
      const response = await fetch('/api/mcp/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          serverName: entry.server,
          toolName: entry.tool,
          args: entry.request || {}
        })
      });

      const data = await response.json();
      const duration = Math.round(performance.now() - startTime);
      const result = data.error || data.result;

      window.updateToolHistory?.({
        timestamp: new Date().toISOString(),
        server: entry.server,
        tool: entry.tool,
        request: entry.request || {},
        response: result,
        duration,
        success: !data.error && data.result?.isError !== true,
        meta: { source: 'history-diff', baseline: entry.timestamp }
      });
      refreshHistoryPanel();

      window.showDiff?.(entry.response ?? {}, result ?? {});
      window.showNotification?.('Re-run completed. Showing diff.', data.error ? 'warning' : 'success');
    } catch (error) {
      window.showNotification?.(`Re-run failed: ${error.message}`, 'error');
    }
  }

  function exportToolHistory() {
    const history = getHistoryEntries();
    if (history.length === 0) {
      window.appendMessage?.('error', 'No history to export');
      return;
    }

    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-tool-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    window.appendMessage?.('system', `📥 Exported ${history.length} history entries`);
  }

  async function clearToolHistory() {
    const confirmed = await window.appConfirm?.('Clear all tool execution history?', {
      title: 'Clear History',
      confirmText: 'Clear',
      confirmVariant: 'danger'
    });
    if (!confirmed) return false;
    const session = window.sessionManager?.load?.() || {};
    session.toolHistory = [];
    window.sessionManager?.save?.(session);
    window.toolExecutionHistory = [];
    refreshHistoryPanel();
    window.appendMessage?.('system', '🗑️ Tool history cleared');
    return true;
  }

  window.refreshHistoryPanel = refreshHistoryPanel;
  window.toggleHistoryDetail = toggleHistoryDetail;
  window.copyHistoryEntry = copyHistoryEntry;
  window.replayHistoryEntry = replayHistoryEntry;
  window.rerunHistoryEntryDiff = rerunHistoryEntryDiff;
  window.runHistoryEntryMatrix = runHistoryEntryMatrix;
  window.exportToolHistory = exportToolHistory;
  window.clearToolHistory = clearToolHistory;
  window.loadMoreHistory = loadMoreHistory;
})();
