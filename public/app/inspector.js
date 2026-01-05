// INSPECTOR TAB FUNCTIONS
      // ==========================================

      let inspectorToolsCache = [];
      let selectedInspectorTool = null;
      let lastInspectorResponse = null;
      let lastInspectorRequest = null;
      const INSPECTOR_AUTH_KEY = 'mcp_chat_studio_inspector_auth';
      let inspectorPreviewRAF = null;

      // Switch between tabs
      function switchTab(tabName) {
        if (document.body.classList.contains('workspace-mode')) {
          if (typeof floatingWorkspace !== 'undefined' && typeof floatingWorkspace.togglePanel === 'function') {
            floatingWorkspace.togglePanel(tabName);
          }
          return;
        }
        const panelMap = {
          chat: 'chatPanel',
          inspector: 'inspectorPanel',
          history: 'historyPanel',
          scenarios: 'scenariosPanel',
          workflows: 'workflowsPanel',
          generator: 'generatorPanel',
          collections: 'collectionsPanel',
          monitors: 'monitorsPanel',
          toolexplorer: 'toolexplorerPanel',
          mocks: 'mocksPanel',
          scripts: 'scriptsPanel',
          docs: 'docsPanel',
          contracts: 'contractsPanel'
        };
        const targetPanel = panelMap[tabName];
        if (targetPanel && typeof switchClassicPanel === 'function') {
          switchClassicPanel(targetPanel);
          return;
        }
        setWorkflowsActive(tabName === 'workflows');
        if (tabName !== 'workflows') {
          closeAIBuilderIfOpen();
        }
        // Get all panels and buttons
        const panels = ['chatPanel', 'inspectorPanel', 'historyPanel', 'scenariosPanel',
                        'generatorPanel', 'workflowsPanel', 'collectionsPanel', 'monitorsPanel',
                        'toolexplorerPanel', 'mocksPanel', 'scriptsPanel', 'docsPanel', 'contractsPanel'];
        const buttons = ['chatTabBtn', 'inspectorTabBtn', 'historyTabBtn', 'scenariosTabBtn',
                         'generatorTabBtn', 'workflowsTabBtn', 'collectionsTabBtn', 'monitorsTabBtn',
                         'toolexplorerTabBtn', 'mocksTabBtn', 'scriptsTabBtn', 'docsTabBtn', 'contractsTabBtn'];

        // Remove active from all panels and buttons
        panels.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.classList.remove('active');
        });
        buttons.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.classList.remove('active');
        });

        // Activate selected tab
        if (tabName === 'chat') {
          document.getElementById('chatPanel').classList.add('active');
          document.getElementById('chatTabBtn').classList.add('active');
        } else if (tabName === 'inspector') {
          document.getElementById('inspectorPanel').classList.add('active');
          document.getElementById('inspectorTabBtn').classList.add('active');
          loadInspectorServers();
        } else if (tabName === 'history') {
          document.getElementById('historyPanel').classList.add('active');
          document.getElementById('historyTabBtn').classList.add('active');
          refreshHistoryPanel();
        } else if (tabName === 'scenarios') {
          document.getElementById('scenariosPanel').classList.add('active');
          document.getElementById('scenariosTabBtn').classList.add('active');
          refreshScenariosPanel();
          refreshSuitesList();
        } else if (tabName === 'generator') {
          document.getElementById('generatorPanel').classList.add('active');
          document.getElementById('generatorTabBtn').classList.add('active');
        } else if (tabName === 'workflows') {
          document.getElementById('workflowsPanel').classList.add('active');
          document.getElementById('workflowsTabBtn').classList.add('active');
          updateWorkflowModelBadge();
          if (typeof loadWorkflowsList === 'function') loadWorkflowsList();
        } else if (tabName === 'collections') {
          document.getElementById('collectionsPanel').classList.add('active');
          document.getElementById('collectionsTabBtn').classList.add('active');
          if (typeof loadCollections === 'function') loadCollections();
        } else if (tabName === 'monitors') {
          document.getElementById('monitorsPanel').classList.add('active');
          document.getElementById('monitorsTabBtn').classList.add('active');
          if (typeof loadMonitors === 'function') loadMonitors();
        } else if (tabName === 'toolexplorer') {
          document.getElementById('toolexplorerPanel').classList.add('active');
          document.getElementById('toolexplorerTabBtn').classList.add('active');
          if (typeof loadToolExplorer === 'function') loadToolExplorer();
        } else if (tabName === 'mocks') {
          document.getElementById('mocksPanel').classList.add('active');
          document.getElementById('mocksTabBtn').classList.add('active');
          if (typeof loadMockServers === 'function') loadMockServers();
        } else if (tabName === 'scripts') {
          document.getElementById('scriptsPanel').classList.add('active');
          document.getElementById('scriptsTabBtn').classList.add('active');
          if (typeof loadScripts === 'function') loadScripts();
        } else if (tabName === 'docs') {
          document.getElementById('docsPanel').classList.add('active');
          document.getElementById('docsTabBtn').classList.add('active');
        } else if (tabName === 'contracts') {
          document.getElementById('contractsPanel').classList.add('active');
          document.getElementById('contractsTabBtn').classList.add('active');
          if (typeof loadContracts === 'function') loadContracts();
        }
      }

      // Load connected servers into Inspector dropdown
      async function loadInspectorServers() {
        const select = document.getElementById('inspectorServerSelect');

        try {
          const response = await fetch('/api/mcp/status', { credentials: 'include' });
          const status = await response.json();

          select.innerHTML = '<option value="">-- Select Server --</option>';

          // API returns servers directly at root, not nested in .servers
          const servers = status.servers || status;
          for (const [name, info] of Object.entries(servers)) {
            if (info.connected || info.userConnected) {
              const toolCount = typeof info.toolCount === 'number' ? info.toolCount : 0;
              select.innerHTML += `<option value="${escapeHtml(name)}">${escapeHtml(name)} (${toolCount} tools)</option>`;
            }
          }

          // Also populate Resources, Prompts, Bulk Test, and Diff server selects
          const resourceSelect = document.getElementById('resourceServerSelect');
          const promptSelect = document.getElementById('promptServerSelect');
          const bulkTestServerSelect = document.getElementById('bulkTestServerSelect');
          const diffServerSelect = document.getElementById('diffServerSelect');
          if (resourceSelect) resourceSelect.innerHTML = select.innerHTML;
          if (promptSelect) promptSelect.innerHTML = select.innerHTML;
          if (bulkTestServerSelect) bulkTestServerSelect.innerHTML = select.innerHTML;
          if (diffServerSelect) diffServerSelect.innerHTML = select.innerHTML;
        } catch (error) {
          console.error('Failed to load servers:', error);
        }
      }

      // Switch between Inspector sub-tabs (Tools, Resources, Prompts, Timeline, Bulk Test, Diff)
      function switchInspectorTab(tabName) {
        const panels = {
          tools: document.getElementById('inspectorToolsPanel'),
          resources: document.getElementById('inspectorResourcesPanel'),
          prompts: document.getElementById('inspectorPromptsPanel'),
          timeline: document.getElementById('inspectorTimelinePanel'),
          bulktest: document.getElementById('inspectorBulkTestPanel'),
          diff: document.getElementById('inspectorDiffPanel')
        };

        const tabs = {
          tools: document.getElementById('inspectorToolsTab'),
          resources: document.getElementById('inspectorResourcesTab'),
          prompts: document.getElementById('inspectorPromptsTab'),
          timeline: document.getElementById('inspectorTimelineTab'),
          bulktest: document.getElementById('inspectorBulkTestTab'),
          diff: document.getElementById('inspectorDiffTab')
        };

        // Hide all panels and remove active from all tabs
        for (const [name, panel] of Object.entries(panels)) {
          if (panel) panel.style.display = 'none';
        }
        for (const [name, tab] of Object.entries(tabs)) {
          if (tab) tab.classList.remove('active');
        }

        // Show selected panel and activate tab
        if (panels[tabName]) {
          panels[tabName].style.display = 'block';
        }
        if (tabs[tabName]) {
          tabs[tabName].classList.add('active');
        }

        // Initialize new panels when switched to
        if (tabName === 'timeline') {
          loadTimelineServers();
        } else if (tabName === 'bulktest') {
          loadBulkTestServers();
        } else if (tabName === 'diff') {
          loadDiffServers();
          loadSchemaDiffServers();
          loadCrossServerOptions();
        }

        if (tabName !== 'workflowsPanel' && tabName !== 'workflows') {
          closeAIBuilderIfOpen();
        }
      }

      function openInspectorPanel() {
        if (document.body.classList.contains('workspace-mode')) {
          if (typeof floatingWorkspace !== 'undefined' && typeof floatingWorkspace.focusPanelByType === 'function') {
            floatingWorkspace.focusPanelByType('inspector');
            return;
          }
          if (typeof floatingWorkspace !== 'undefined' && typeof floatingWorkspace.togglePanel === 'function') {
            floatingWorkspace.togglePanel('inspector');
            return;
          }
        }
        switchTab('inspector');
      }

      // ==========================================
      // MCP RESOURCES
      // ==========================================
      let currentResourceContent = null;

      async function loadServerResources() {
        const serverName = document.getElementById('resourceServerSelect').value;
        const listEl = document.getElementById('resourcesList');

        if (!serverName) {
          listEl.innerHTML = '<div style="color: var(--text-muted); font-style: italic; padding: 12px;">Select a server to view available resources...</div>';
          document.getElementById('resourceContentSection').style.display = 'none';
          return;
        }

        listEl.innerHTML = '<div style="color: var(--text-muted); padding: 12px;">Loading resources...</div>';

        try {
          const response = await fetch(`/api/mcp/resources/${encodeURIComponent(serverName)}`, { credentials: 'include' });
          const data = await response.json();

          if (data.error) {
            listEl.innerHTML = `<div style="color: var(--error); padding: 12px;">❌ ${escapeHtml(data.error)}</div>`;
            return;
          }

          const resources = data.resources || [];
          if (resources.length === 0) {
            listEl.innerHTML = '<div style="color: var(--text-muted); padding: 12px;">No resources available from this server.</div>';
            return;
          }

          listEl.innerHTML = resources.map(r => `
            <div class="resource-item" style="padding: 8px 12px; margin-bottom: 4px; background: var(--bg-card); border-radius: 6px; cursor: pointer; transition: all 0.2s;" onclick="readResource('${escapeHtml(serverName)}', '${escapeHtml(r.uri)}')">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.2rem;">${r.mimeType?.includes('image') ? '🖼️' : r.mimeType?.includes('json') ? '📋' : '📄'}</span>
                <div>
                  <div style="font-weight: 500;">${escapeHtml(r.name || r.uri)}</div>
                  <div style="font-size: 0.7rem; color: var(--text-muted);">${escapeHtml(r.uri)}</div>
                  ${r.description ? `<div style="font-size: 0.7rem; color: var(--text-secondary);">${escapeHtml(r.description)}</div>` : ''}
                </div>
              </div>
            </div>
          `).join('');
        } catch (error) {
          listEl.innerHTML = `<div style="color: var(--error); padding: 12px;">❌ Failed to load resources: ${escapeHtml(error.message)}</div>`;
        }
      }

      async function readResource(serverName, uri) {
        const contentSection = document.getElementById('resourceContentSection');
        const contentEl = document.getElementById('resourceContent').querySelector('pre');

        contentSection.style.display = 'block';
        contentEl.textContent = 'Loading...';

        try {
          const response = await fetch(`/api/mcp/resources/${encodeURIComponent(serverName)}/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ uri }),
          });
          const data = await response.json();

          if (data.error) {
            contentEl.textContent = `Error: ${data.error}`;
            currentResourceContent = null;
            return;
          }

          const content = data.contents?.[0]?.text || data.contents?.[0]?.blob || JSON.stringify(data, null, 2);
          contentEl.textContent = content;
          currentResourceContent = content;
        } catch (error) {
          contentEl.textContent = `Error: ${error.message}`;
          currentResourceContent = null;
        }
      }

      function copyResourceContent() {
        if (currentResourceContent) {
          navigator.clipboard.writeText(currentResourceContent);
          appendMessage('system', '📋 Resource content copied to clipboard');
        }
      }

      // ==========================================
      // MCP PROMPTS
      // ==========================================
      let currentPromptContent = null;

      async function loadServerPrompts() {
        const serverName = document.getElementById('promptServerSelect').value;
        const listEl = document.getElementById('promptsList');

        if (!serverName) {
          listEl.innerHTML = '<div style="color: var(--text-muted); font-style: italic; padding: 12px;">Select a server to view available prompts...</div>';
          document.getElementById('promptPreviewSection').style.display = 'none';
          return;
        }

        listEl.innerHTML = '<div style="color: var(--text-muted); padding: 12px;">Loading prompts...</div>';

        try {
          const response = await fetch(`/api/mcp/prompts/${encodeURIComponent(serverName)}`, { credentials: 'include' });
          const data = await response.json();

          if (data.error) {
            listEl.innerHTML = `<div style="color: var(--error); padding: 12px;">❌ ${escapeHtml(data.error)}</div>`;
            return;
          }

          const prompts = data.prompts || [];
          if (prompts.length === 0) {
            listEl.innerHTML = '<div style="color: var(--text-muted); padding: 12px;">No prompts available from this server.</div>';
            return;
          }

          listEl.innerHTML = prompts.map(p => `
            <div class="prompt-item" style="padding: 8px 12px; margin-bottom: 4px; background: var(--bg-card); border-radius: 6px; cursor: pointer; transition: all 0.2s;" onclick="getPrompt('${escapeHtml(serverName)}', '${escapeHtml(p.name)}')">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.2rem;">💬</span>
                <div>
                  <div style="font-weight: 500;">${escapeHtml(p.name)}</div>
                  ${p.description ? `<div style="font-size: 0.7rem; color: var(--text-secondary);">${escapeHtml(p.description)}</div>` : ''}
                  ${p.arguments?.length ? `<div style="font-size: 0.65rem; color: var(--text-muted);">Args: ${p.arguments.map(a => a.name).join(', ')}</div>` : ''}
                </div>
              </div>
            </div>
          `).join('');
        } catch (error) {
          listEl.innerHTML = `<div style="color: var(--error); padding: 12px;">❌ Failed to load prompts: ${escapeHtml(error.message)}</div>`;
        }
      }

      async function getPrompt(serverName, promptName) {
        const previewSection = document.getElementById('promptPreviewSection');
        const previewEl = document.getElementById('promptPreview').querySelector('pre');

        previewSection.style.display = 'block';
        previewEl.textContent = 'Loading...';

        try {
          const response = await fetch(`/api/mcp/prompts/${encodeURIComponent(serverName)}/get`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name: promptName, arguments: {} }),
          });
          const data = await response.json();

          if (data.error) {
            previewEl.textContent = `Error: ${data.error}`;
            currentPromptContent = null;
            return;
          }

          const messages = data.messages || [];
          const content = messages.map(m => `[${m.role}]\n${m.content?.text || m.content}`).join('\n\n');
          previewEl.textContent = content || JSON.stringify(data, null, 2);
          currentPromptContent = content;
        } catch (error) {
          previewEl.textContent = `Error: ${error.message}`;
          currentPromptContent = null;
        }
      }

      function usePromptInChat() {
        if (currentPromptContent) {
          const userInput = document.getElementById('userInput');
          userInput.value = currentPromptContent;
          userInput.focus();
          switchTab('chat');
          appendMessage('system', '💬 Prompt loaded into input. Edit as needed and send!');
        }
      }

      // Load tools for selected server
      async function loadInspectorTools() {
        const serverName = document.getElementById('inspectorServerSelect').value;
        const toolSelect = document.getElementById('inspectorToolSelect');

        if (!serverName) {
          toolSelect.innerHTML = '<option value="">-- Select Tool --</option>';
          document.getElementById('inspectorFormSection').style.display = 'none';
          return;
        }

        try {
          const response = await fetch('/api/mcp/tools', { credentials: 'include' });
          const data = await response.json();

          inspectorToolsCache = (data.tools || []).filter(t => t.serverName === serverName);

          toolSelect.innerHTML = '<option value="">-- Select Tool --</option>';
          for (const tool of inspectorToolsCache) {
            toolSelect.innerHTML += `<option value="${escapeHtml(tool.name)}">${escapeHtml(tool.name)}</option>`;
          }
        } catch (error) {
          console.error('Failed to load tools:', error);
        }
      }

      const INSPECTOR_VARIABLES_KEY = 'mcp_chat_studio_inspector_variables';
      const VARIABLE_STORE_KEY = 'mcp_chat_studio_variable_store';

      function loadVariableStore() {
        try {
          const data = JSON.parse(localStorage.getItem(VARIABLE_STORE_KEY) || '{}');
          return {
            global: data && typeof data.global === 'object' && !Array.isArray(data.global) ? data.global : {},
            environments: data && typeof data.environments === 'object' && !Array.isArray(data.environments)
              ? data.environments
              : {}
          };
        } catch (e) {
          return { global: {}, environments: {} };
        }
      }

      function saveVariableStore(store) {
        const payload = {
          global: store?.global || {},
          environments: store?.environments || {}
        };
        localStorage.setItem(VARIABLE_STORE_KEY, JSON.stringify(payload));
      }

      function normalizeVariableObject(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
        return value;
      }

      function getGlobalVariables() {
        const store = loadVariableStore();
        return normalizeVariableObject(store.global);
      }

      function getEnvironmentVariables(envName = getCurrentEnv()) {
        const store = loadVariableStore();
        return normalizeVariableObject(store.environments?.[envName]);
      }

      function updateInspectorVariablesStatus(message, isError = false) {
        const statusEl = document.getElementById('inspectorVariablesStatus');
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.style.color = isError ? 'var(--error)' : 'var(--text-muted)';
      }

      function loadInspectorVariables() {
        const input = document.getElementById('inspectorVariablesInput');
        if (!input) return;
        const stored = localStorage.getItem(INSPECTOR_VARIABLES_KEY);
        if (stored) {
          input.value = stored;
          updateInspectorVariablesStatus('Loaded saved variables');
        }
        renderInspectorPreview();
      }

      function saveInspectorVariables() {
        const input = document.getElementById('inspectorVariablesInput');
        if (!input) return;
        const raw = input.value.trim();

        if (!raw) {
          localStorage.removeItem(INSPECTOR_VARIABLES_KEY);
          updateInspectorVariablesStatus('Cleared variables');
          renderInspectorPreview();
          return;
        }

        try {
          JSON.parse(raw);
          localStorage.setItem(INSPECTOR_VARIABLES_KEY, raw);
          updateInspectorVariablesStatus('Variables saved');
          renderInspectorPreview();
        } catch (error) {
          updateInspectorVariablesStatus('Invalid JSON: ' + error.message, true);
        }
      }

      function clearInspectorVariables() {
        const input = document.getElementById('inspectorVariablesInput');
        if (!input) return;
        input.value = '';
        localStorage.removeItem(INSPECTOR_VARIABLES_KEY);
        updateInspectorVariablesStatus('Cleared variables');
        renderInspectorPreview();
      }

      function getInspectorVariables() {
        const input = document.getElementById('inspectorVariablesInput');
        const raw = (input?.value || localStorage.getItem(INSPECTOR_VARIABLES_KEY) || '').trim();
        if (!raw) return {};
        try {
          return JSON.parse(raw);
        } catch (error) {
          updateInspectorVariablesStatus('Invalid JSON: ' + error.message, true);
          return null;
        }
      }

      function getRuntimeVariables() {
        const inspectorVars = getInspectorVariables();
        if (inspectorVars === null) return null;
        return {
          ...getGlobalVariables(),
          ...getEnvironmentVariables(),
          ...(inspectorVars || {})
        };
      }

      function toolSupportsInspectorAuth(tool) {
        if (!tool) return false;
        if (tool.inputSchema?.properties?.__headers || tool.inputSchema?.properties?.__query) {
          return true;
        }
        return false;
      }

      function getInspectorAuthSettings() {
        const enabled = document.getElementById('inspectorAuthEnabled')?.checked || false;
        const type = document.getElementById('inspectorAuthType')?.value || 'none';
        const apiKey = document.getElementById('inspectorAuthApiKey')?.value || '';
        const apiKeyName = document.getElementById('inspectorAuthApiKeyName')?.value || '';
        const apiKeyIn = document.getElementById('inspectorAuthApiKeyIn')?.value || 'header';
        const bearer = document.getElementById('inspectorAuthBearer')?.value || '';
        const basicUser = document.getElementById('inspectorAuthBasicUser')?.value || '';
        const basicPass = document.getElementById('inspectorAuthBasicPass')?.value || '';
        const headersJson = document.getElementById('inspectorAuthHeaders')?.value || '';
        const queryJson = document.getElementById('inspectorAuthQuery')?.value || '';
        return {
          enabled,
          type,
          apiKey,
          apiKeyName,
          apiKeyIn,
          bearer,
          basicUser,
          basicPass,
          headersJson,
          queryJson
        };
      }

      function updateInspectorAuthStatus(message, isError = false) {
        const statusEl = document.getElementById('inspectorAuthStatus');
        if (!statusEl) return;
        statusEl.textContent = message || '';
        statusEl.style.color = isError ? 'var(--error)' : 'var(--text-muted)';
      }

      function onInspectorAuthTypeChange() {
        const type = document.getElementById('inspectorAuthType')?.value || 'none';
        const bearerGroup = document.getElementById('inspectorAuthBearerGroup');
        const basicGroup = document.getElementById('inspectorAuthBasicGroup');
        const apiKeyGroup = document.getElementById('inspectorAuthApiKeyGroup');
        if (bearerGroup) bearerGroup.style.display = type === 'bearer' ? 'block' : 'none';
        if (basicGroup) basicGroup.style.display = type === 'basic' ? 'block' : 'none';
        if (apiKeyGroup) apiKeyGroup.style.display = type === 'apikey' ? 'block' : 'none';
        saveInspectorAuthSettings();
        renderInspectorPreview();
      }

      function toggleInspectorAuth(enabled, skipSave) {
        const fields = document.getElementById('inspectorAuthFields');
        if (fields) fields.style.display = enabled ? 'block' : 'none';
        updateInspectorAuthStatus(enabled ? 'Auth overrides enabled for this request.' : 'Auth overrides disabled.');
        if (enabled) onInspectorAuthTypeChange();
        if (!skipSave) saveInspectorAuthSettings();
        renderInspectorPreview();
      }

      function loadInspectorAuthSettings() {
        const stored = localStorage.getItem(INSPECTOR_AUTH_KEY);
        if (!stored) {
          toggleInspectorAuth(false, true);
          return;
        }
        try {
          const data = JSON.parse(stored);
          const enabledEl = document.getElementById('inspectorAuthEnabled');
          if (enabledEl) enabledEl.checked = !!data.enabled;
          const typeEl = document.getElementById('inspectorAuthType');
          if (typeEl) typeEl.value = data.type || 'none';
          const apiKeyEl = document.getElementById('inspectorAuthApiKey');
          if (apiKeyEl) apiKeyEl.value = data.apiKey || '';
          const apiKeyNameEl = document.getElementById('inspectorAuthApiKeyName');
          if (apiKeyNameEl) apiKeyNameEl.value = data.apiKeyName || '';
          const apiKeyInEl = document.getElementById('inspectorAuthApiKeyIn');
          if (apiKeyInEl) apiKeyInEl.value = data.apiKeyIn || 'header';
          const bearerEl = document.getElementById('inspectorAuthBearer');
          if (bearerEl) bearerEl.value = data.bearer || '';
          const basicUserEl = document.getElementById('inspectorAuthBasicUser');
          if (basicUserEl) basicUserEl.value = data.basicUser || '';
          const basicPassEl = document.getElementById('inspectorAuthBasicPass');
          if (basicPassEl) basicPassEl.value = data.basicPass || '';
          const headersEl = document.getElementById('inspectorAuthHeaders');
          if (headersEl) headersEl.value = data.headersJson || '';
          const queryEl = document.getElementById('inspectorAuthQuery');
          if (queryEl) queryEl.value = data.queryJson || '';
        } catch (error) {
          console.warn('Failed to load inspector auth settings', error);
        }
        onInspectorAuthTypeChange();
        const enabled = document.getElementById('inspectorAuthEnabled')?.checked || false;
        toggleInspectorAuth(enabled, true);
      }

      function saveInspectorAuthSettings() {
        const data = getInspectorAuthSettings();
        localStorage.setItem(INSPECTOR_AUTH_KEY, JSON.stringify(data));
      }

      function parseInspectorAuthJson(raw, label) {
        if (!raw || !raw.trim()) return {};
        try {
          const parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { error: `${label} must be a JSON object.` };
          }
          return parsed;
        } catch (error) {
          return { error: `${label} JSON invalid: ${error.message}` };
        }
      }

      function buildInspectorAuthOverrides(tool, variables, silent = false) {
        const settings = getInspectorAuthSettings();
        if (!settings.enabled) return null;
        if (!toolSupportsInspectorAuth(tool)) {
          const message = 'Auth overrides ignored. This tool does not support OpenAPI-style auth overrides.';
          if (!silent) {
            showNotification(message, 'warning');
            updateInspectorAuthStatus(message, true);
          }
          return null;
        }

        const headers = {};
        const query = {};

        if (settings.type === 'bearer' && settings.bearer) {
          headers.Authorization = `Bearer ${settings.bearer}`;
        } else if (settings.type === 'basic' && (settings.basicUser || settings.basicPass)) {
          const token = btoa(`${settings.basicUser || ''}:${settings.basicPass || ''}`);
          headers.Authorization = `Basic ${token}`;
        } else if (settings.type === 'apikey' && settings.apiKey) {
          const keyName = settings.apiKeyName || 'X-API-Key';
          if (settings.apiKeyIn === 'query') {
            query[keyName] = settings.apiKey;
          } else {
            headers[keyName] = settings.apiKey;
          }
        }

        const extraHeaders = parseInspectorAuthJson(settings.headersJson, 'Headers');
        if (extraHeaders?.error) {
          updateInspectorAuthStatus(extraHeaders.error, true);
          return { error: extraHeaders.error };
        }
        const extraQuery = parseInspectorAuthJson(settings.queryJson, 'Query');
        if (extraQuery?.error) {
          updateInspectorAuthStatus(extraQuery.error, true);
          return { error: extraQuery.error };
        }

        Object.entries(extraHeaders).forEach(([key, value]) => {
          headers[key] = value;
        });
        Object.entries(extraQuery).forEach(([key, value]) => {
          query[key] = value;
        });

        const resolvedHeaders = variables ? applyTemplateVariables(headers, variables) : headers;
        const resolvedQuery = variables ? applyTemplateVariables(query, variables) : query;

        const normalizedHeaders = Object.fromEntries(
          Object.entries(resolvedHeaders || {}).map(([key, value]) => [key, String(value)])
        );
        const normalizedQuery = Object.fromEntries(
          Object.entries(resolvedQuery || {}).map(([key, value]) => [key, String(value)])
        );

        updateInspectorAuthStatus('Auth overrides ready.', false);

        return {
          __headers: normalizedHeaders,
          __query: normalizedQuery
        };
      }

      function parseVariablesInput(raw) {
        if (!raw || !raw.trim()) return {};
        return JSON.parse(raw);
      }

      async function showVariablesManager() {
        const envName = getCurrentEnv();
        const store = loadVariableStore();
        const globalJson = JSON.stringify(store.global || {}, null, 2);
        const envJson = JSON.stringify(store.environments?.[envName] || {}, null, 2);

        const result = await appFormModal({
          title: `🧩 Variables (${envName})`,
          message: 'Global variables apply everywhere. Environment variables override globals. Inspector variables override both when running tools.',
          confirmText: 'Save Variables',
          cancelText: 'Cancel',
          maxWidth: '720px',
          fields: [
            {
              id: 'globalVars',
              label: 'Global Variables (all environments)',
              type: 'textarea',
              rows: 8,
              monospace: true,
              value: globalJson,
              validate: (value) => {
                if (!value || !value.trim()) return null;
                try {
                  const parsed = JSON.parse(value);
                  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return null;
                  return 'Must be a JSON object';
                } catch (error) {
                  return `Invalid JSON: ${error.message}`;
                }
              }
            },
            {
              id: 'envVars',
              label: `${envName} Variables`,
              type: 'textarea',
              rows: 8,
              monospace: true,
              value: envJson,
              validate: (value) => {
                if (!value || !value.trim()) return null;
                try {
                  const parsed = JSON.parse(value);
                  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return null;
                  return 'Must be a JSON object';
                } catch (error) {
                  return `Invalid JSON: ${error.message}`;
                }
              }
            }
          ]
        });

        if (!result.confirmed) return;

        try {
          const globalVars = parseVariablesInput(result.values.globalVars);
          const envVars = parseVariablesInput(result.values.envVars);
          const updated = loadVariableStore();
          updated.global = globalVars;
          updated.environments = updated.environments || {};
          updated.environments[envName] = envVars;
          saveVariableStore(updated);
          appendMessage('system', `🧩 Saved variables for ${envName}`);
          renderInspectorPreview();
        } catch (error) {
          appendMessage('error', `Failed to save variables: ${error.message}`);
        }
      }

      function resolveVariablePath(path, variables) {
        return path.split('.').reduce((value, key) => {
          if (value && Object.prototype.hasOwnProperty.call(value, key)) {
            return value[key];
          }
          return undefined;
        }, variables);
      }

      function applyTemplateVariables(value, variables) {
        if (Array.isArray(value)) {
          return value.map(item => applyTemplateVariables(item, variables));
        }
        if (value && typeof value === 'object') {
          const result = {};
          Object.entries(value).forEach(([key, val]) => {
            result[key] = applyTemplateVariables(val, variables);
          });
          return result;
        }
        if (typeof value === 'string') {
          const exactMatch = value.match(/^{{\s*([^}]+)\s*}}$/);
          if (exactMatch) {
            const resolved = resolveVariablePath(exactMatch[1].trim(), variables);
            if (resolved !== undefined) return resolved;
          }

          return value.replace(/{{\s*([^}]+)\s*}}/g, (match, key) => {
            const resolved = resolveVariablePath(key.trim(), variables);
            if (resolved === undefined || resolved === null) return match;
            return typeof resolved === 'string' ? resolved : JSON.stringify(resolved);
          });
        }
        return value;
      }

      const MOCK_RECORDER_KEY = 'mcp_chat_studio_mock_recorder';
      const mockRecorderState = {
        recording: false,
        entries: []
      };

      function loadMockRecorderState() {
        try {
          const stored = JSON.parse(localStorage.getItem(MOCK_RECORDER_KEY) || '{}');
          mockRecorderState.recording = Boolean(stored.recording);
          mockRecorderState.entries = Array.isArray(stored.entries) ? stored.entries : [];
        } catch (error) {
          mockRecorderState.recording = false;
          mockRecorderState.entries = [];
        }
      }

      function saveMockRecorderState() {
        localStorage.setItem(MOCK_RECORDER_KEY, JSON.stringify({
          recording: mockRecorderState.recording,
          entries: mockRecorderState.entries
        }));
      }

      function renderMockRecorder() {
        const list = document.getElementById('mockRecorderList');
        const stats = document.getElementById('mockRecorderStats');
        const status = document.getElementById('mockRecorderStatus');
        const toggle = document.getElementById('mockRecorderToggle');
        if (!list || !stats || !status || !toggle) return;

        toggle.checked = mockRecorderState.recording;
        status.textContent = mockRecorderState.recording ? 'Recording on' : 'Recording off';
        status.style.color = mockRecorderState.recording ? 'var(--success)' : 'var(--text-muted)';

        const entries = mockRecorderState.entries || [];
        const total = entries.length;
        const successes = entries.filter(e => e.success).length;
        const failures = total - successes;
        const servers = Array.from(new Set(entries.map(e => e.server).filter(Boolean)));

        stats.innerHTML = `
          <span class="pill">Captured: ${total}</span>
          <span class="pill">✅ ${successes}</span>
          <span class="pill">❌ ${failures}</span>
          <span class="pill">Servers: ${servers.length}</span>
        `;

        if (total === 0) {
          list.innerHTML = '<div style="color: var(--text-muted)">No captured calls yet.</div>';
          return;
        }

        list.innerHTML = entries.slice(0, 6).map(entry => `
          <div class="mock-recorder-item">
            <div style="display: flex; gap: 8px; align-items: center">
              <span class="mock-recorder-dot ${entry.success ? 'success' : 'fail'}"></span>
              <div>
                <div style="font-weight: 600; color: var(--text-primary)">${escapeHtml(entry.tool || 'tool')}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted)">${escapeHtml(entry.server || 'server')} • ${entry.duration || 0}ms</div>
              </div>
            </div>
            <div style="font-size: 0.7rem; color: var(--text-muted)">${new Date(entry.timestamp).toLocaleTimeString()}</div>
          </div>
        `).join('');

        if (total > 6) {
          list.innerHTML += `<div style="font-size: 0.7rem; color: var(--text-muted)">+${total - 6} more captured calls</div>`;
        }
      }

      function toggleMockRecorder(enabled) {
        mockRecorderState.recording = Boolean(enabled);
        saveMockRecorderState();
        renderMockRecorder();
      }

      function clearMockRecorder() {
        mockRecorderState.entries = [];
        saveMockRecorderState();
        renderMockRecorder();
      }

      function recordMockEntry(entry) {
        if (!mockRecorderState.recording) return;
        mockRecorderState.entries.unshift({
          timestamp: entry.timestamp || new Date().toISOString(),
          server: entry.server,
          tool: entry.tool,
          request: entry.request,
          response: entry.response,
          duration: entry.duration || 0,
          success: entry.success !== false
        });
        if (mockRecorderState.entries.length > 50) {
          mockRecorderState.entries = mockRecorderState.entries.slice(0, 50);
        }
        saveMockRecorderState();
        renderMockRecorder();
      }

      async function createMockFromRecorder() {
        const entries = mockRecorderState.entries || [];
        if (entries.length === 0) {
          appendMessage('error', 'No recorded tool calls to convert.');
          return;
        }

        const steps = entries.map(entry => ({
          server: entry.server,
          tool: entry.tool,
          response: entry.response,
          status: entry.success ? 'passed' : 'failed'
        }));
        const results = {
          collectionName: 'Mock Recorder',
          scenarios: [{ name: 'Recorded Calls', steps }]
        };

        if (typeof createMocksFromRun === 'function') {
          await createMocksFromRun(results);
        } else {
          appendMessage('error', 'Mock creation unavailable. Reload the app and try again.');
        }
      }

      function collectVariablePlaceholders(value, collector) {
        if (typeof value === 'string') {
          const matches = value.matchAll(/{{\s*([^}]+)\s*}}/g);
          for (const match of matches) {
            const key = match[1]?.trim();
            if (key) collector.add(key);
          }
          return;
        }
        if (Array.isArray(value)) {
          value.forEach(item => collectVariablePlaceholders(item, collector));
          return;
        }
        if (value && typeof value === 'object') {
          Object.values(value).forEach(val => collectVariablePlaceholders(val, collector));
        }
      }

      function buildInspectorArgs(rawMode) {
        const formEl = document.getElementById('inspectorForm');
        const rawEl = document.getElementById('inspectorRawInput');
        let args = {};

        if (rawMode) {
          const rawValue = rawEl?.value.trim() || '';
          if (rawValue) {
            try {
              args = JSON.parse(rawValue);
            } catch (error) {
              return { error: `Invalid JSON input: ${error.message}` };
            }
          }
        } else {
          formEl.querySelectorAll('[data-param]').forEach(el => {
            const param = el.dataset.param;
            let value = el.value.trim();

            if (!value) return;

            const schema = selectedInspectorTool?.inputSchema?.properties?.[param];
            if (schema) {
              if (schema.type === 'number') {
                value = parseFloat(value);
              } else if (schema.type === 'integer') {
                value = parseInt(value, 10);
              } else if (schema.type === 'boolean') {
                value = value === 'true';
              } else if (schema.type === 'array' || schema.type === 'object') {
                try {
                  value = JSON.parse(value);
                } catch {
                  // Keep as string if parse fails
                }
              }
            }

            args[param] = value;
          });
        }

        return { args };
      }

      function renderInspectorPreview() {
        if (inspectorPreviewRAF) {
          cancelAnimationFrame(inspectorPreviewRAF);
        }
        inspectorPreviewRAF = requestAnimationFrame(() => {
          inspectorPreviewRAF = null;
          const previewSection = document.getElementById('inspectorPreviewSection');
          const previewBody = document.getElementById('inspectorPreviewBody');
          const previewMeta = document.getElementById('inspectorPreviewMeta');
          if (!previewSection || !previewBody || !previewMeta) return;

          if (!selectedInspectorTool) {
            previewSection.style.display = 'none';
            return;
          }

          previewSection.style.display = 'block';
          const rawMode = document.getElementById('inspectorRawMode')?.checked;
          const parsed = buildInspectorArgs(rawMode);
          if (parsed.error) {
            previewBody.textContent = `❌ ${parsed.error}`;
            previewMeta.innerHTML = '';
            return;
          }

          const variables = getRuntimeVariables();
          if (variables === null) {
            previewBody.textContent = '❌ Invalid variables JSON';
            previewMeta.innerHTML = '';
            return;
          }

          const placeholders = new Set();
          collectVariablePlaceholders(parsed.args, placeholders);

          const resolvedArgs = applyTemplateVariables(parsed.args, variables);
          let previewArgs = { ...resolvedArgs };

          const authOverrides = buildInspectorAuthOverrides(selectedInspectorTool, variables, true);
          if (authOverrides?.error) {
            previewBody.textContent = `❌ ${authOverrides.error}`;
            previewMeta.innerHTML = '';
            return;
          }
          if (authOverrides?.__headers && Object.keys(authOverrides.__headers).length) {
            previewArgs.__headers = authOverrides.__headers;
          }
          if (authOverrides?.__query && Object.keys(authOverrides.__query).length) {
            previewArgs.__query = authOverrides.__query;
          }

          previewBody.textContent = JSON.stringify(previewArgs, null, 2);

          const used = [];
          const missing = [];
          placeholders.forEach(key => {
            const resolved = resolveVariablePath(key, variables);
            if (resolved === undefined || resolved === null) {
              missing.push(key);
            } else {
              used.push(key);
            }
          });

          if (used.length === 0 && missing.length === 0) {
            previewMeta.innerHTML = '<span class="inspector-preview-pill">No variables used</span>';
            return;
          }

          const usedHtml = used.length > 0
            ? `<span class="inspector-preview-pill">Used: ${escapeHtml(used.join(', '))}</span>`
            : '';
          const missingHtml = missing.length > 0
            ? `<span class="inspector-preview-pill warn">Missing: ${escapeHtml(missing.join(', '))}</span>`
            : '';
          previewMeta.innerHTML = `${usedHtml}${missingHtml}`;
        });
      }

      function buildDefaultArgs(schema) {
        const defaults = {};
        if (!schema || !schema.properties) return defaults;
        Object.entries(schema.properties).forEach(([paramName, paramDef]) => {
          if (paramName.startsWith('__')) return;
          if (paramDef.default !== undefined) {
            defaults[paramName] = paramDef.default;
          } else if ((schema.required || []).includes(paramName)) {
            defaults[paramName] = paramDef.type === 'array' ? [] : '';
          }
        });
        return defaults;
      }

      function toggleInspectorInputMode(isRaw) {
        const formEl = document.getElementById('inspectorForm');
        const rawEl = document.getElementById('inspectorRawInput');
        if (!formEl || !rawEl) return;

        if (isRaw) {
          rawEl.style.display = 'block';
          formEl.style.display = 'none';
        } else {
          rawEl.style.display = 'none';
          formEl.style.display = 'block';
        }
        renderInspectorPreview();
      }

      function fillInspectorDefaults() {
        if (!selectedInspectorTool) return;
        const rawEl = document.getElementById('inspectorRawInput');
        const rawToggle = document.getElementById('inspectorRawMode');
        if (!rawEl) return;
        const defaults = buildDefaultArgs(selectedInspectorTool.inputSchema);
        rawEl.value = JSON.stringify(defaults, null, 2);
        if (rawToggle && !rawToggle.checked) {
          rawToggle.checked = true;
          toggleInspectorInputMode(true);
        }
        renderInspectorPreview();
      }

      // Generate input form based on tool schema
      function generateInspectorForm() {
        const toolName = document.getElementById('inspectorToolSelect').value;
        const formSection = document.getElementById('inspectorFormSection');
        const formEl = document.getElementById('inspectorForm');
        const descEl = document.getElementById('inspectorToolDescription');

        if (!toolName) {
          formSection.style.display = 'none';
          selectedInspectorTool = null;
          return;
        }

        selectedInspectorTool = inspectorToolsCache.find(t => t.name === toolName);
        if (!selectedInspectorTool) return;

        formSection.style.display = 'block';
        descEl.textContent = selectedInspectorTool.description || '';
        const authNotice = document.getElementById('inspectorAuthNotice');
        if (authNotice) {
          if (toolSupportsInspectorAuth(selectedInspectorTool)) {
            authNotice.textContent = 'Auth overrides apply to this tool.';
            authNotice.style.color = 'var(--text-muted)';
          } else {
            authNotice.textContent = 'Auth overrides apply to OpenAPI proxy tools only.';
            authNotice.style.color = 'var(--warning)';
          }
        }

        const schema = selectedInspectorTool.inputSchema;
        if (!schema || !schema.properties || Object.keys(schema.properties).length === 0) {
          formEl.innerHTML = '<em style="color: var(--text-muted);">No parameters required</em>';
          const rawEl = document.getElementById('inspectorRawInput');
          if (rawEl) rawEl.value = '{}';
          toggleInspectorInputMode(document.getElementById('inspectorRawMode')?.checked);
          return;
        }

        const required = schema.required || [];
        let html = '';

        for (const [paramName, paramDef] of Object.entries(schema.properties)) {
          if (paramName.startsWith('__')) {
            continue;
          }
          const isRequired = required.includes(paramName);
          const typeLabel = paramDef.type || 'any';
          const reqBadge = isRequired ? '<span class="required">*</span>' : '';

          html += `
            <div class="inspector-field">
              <label>
                ${escapeHtml(paramName)} ${reqBadge}
                <span class="type-badge">${typeLabel}</span>
              </label>
          `;

          // Generate appropriate input based on type
          if (paramDef.type === 'boolean') {
            html += `
              <select class="form-select" data-param="${escapeHtml(paramName)}">
                <option value="">-- Select --</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            `;
          } else if (paramDef.type === 'number' || paramDef.type === 'integer') {
            html += `<input type="number" class="form-input" data-param="${escapeHtml(paramName)}" placeholder="${escapeHtml(paramDef.description || '')}" step="${paramDef.type === 'integer' ? '1' : 'any'}">`;
          } else if (paramDef.type === 'array' || paramDef.type === 'object') {
            const placeholder =
              paramDef.type === 'array' ? '["item1", "item2"]' : '{"key": "value"}';
            html += `<textarea class="form-input" data-param="${escapeHtml(paramName)}" rows="3" placeholder="${placeholder}">${paramDef.default ? JSON.stringify(paramDef.default) : ''}</textarea>`;
          } else if (paramDef.enum && paramDef.enum.length > 0) {
            html += `<select class="form-select" data-param="${escapeHtml(paramName)}"><option value="">-- Select --</option>`;
            for (const val of paramDef.enum) {
              html += `<option value="${escapeHtml(String(val))}">${escapeHtml(String(val))}</option>`;
            }
            html += '</select>';
          } else {
            // Default to string input
            html += `<input type="text" class="form-input" data-param="${escapeHtml(paramName)}" placeholder="${escapeHtml(paramDef.description || '')}">`;
          }

          if (paramDef.description) {
            html += `<small style="color: var(--text-muted);">${escapeHtml(paramDef.description)}</small>`;
          }

          html += '</div>';
        }

        formEl.innerHTML = html;

        const rawEl = document.getElementById('inspectorRawInput');
        if (rawEl) {
          rawEl.value = JSON.stringify(buildDefaultArgs(schema), null, 2);
        }
        toggleInspectorInputMode(document.getElementById('inspectorRawMode')?.checked);

        formEl.querySelectorAll('input, textarea, select').forEach(el => {
          el.addEventListener('input', renderInspectorPreview);
          el.addEventListener('change', renderInspectorPreview);
        });
        renderInspectorPreview();
      }

      // Clear inspector form
      function clearInspectorForm() {
        const formEl = document.getElementById('inspectorForm');
        const rawEl = document.getElementById('inspectorRawInput');
        formEl.querySelectorAll('input, textarea, select').forEach(el => {
          if (el.tagName === 'SELECT') {
            el.selectedIndex = 0;
          } else {
            el.value = '';
          }
        });
        if (rawEl) rawEl.value = '';
        document.getElementById('inspectorResponseSection').style.display = 'none';
        renderInspectorPreview();
      }

      // Execute tool from Inspector
      async function executeInspectorTool() {
        if (!selectedInspectorTool) return;

        const serverName = document.getElementById('inspectorServerSelect').value;
        const rawMode = document.getElementById('inspectorRawMode')?.checked;
        const executeBtn = document.getElementById('inspectorExecuteBtn');
        const responseSection = document.getElementById('inspectorResponseSection');
        const responseStatus = document.getElementById('inspectorResponseStatus');
        const responseBody = document.getElementById('inspectorResponseBody');

        const parsedArgs = buildInspectorArgs(rawMode);
        if (parsedArgs.error) {
          responseSection.style.display = 'block';
          responseStatus.textContent = '❌ Invalid input';
          responseStatus.className = 'inspector-status error';
          responseBody.className = 'inspector-response error';
          responseBody.textContent = parsedArgs.error;
          return;
        }
        let args = parsedArgs.args;

        const variables = getRuntimeVariables();
        if (variables === null) {
          responseSection.style.display = 'block';
          responseStatus.textContent = '❌ Invalid variables JSON';
          responseStatus.className = 'inspector-status error';
          responseBody.className = 'inspector-response error';
          responseBody.textContent = 'Fix the Variables JSON before executing.';
          return;
        }

        args = applyTemplateVariables(args, variables);

        const authOverrides = buildInspectorAuthOverrides(selectedInspectorTool, variables);
        if (authOverrides?.error) {
          responseSection.style.display = 'block';
          responseStatus.textContent = '❌ Auth overrides invalid';
          responseStatus.className = 'inspector-status error';
          responseBody.className = 'inspector-response error';
          responseBody.textContent = authOverrides.error;
          return;
        }
        if (authOverrides) {
          const nextArgs = { ...args };
          if (authOverrides.__headers && Object.keys(authOverrides.__headers).length) {
            nextArgs.__headers = authOverrides.__headers;
          }
          if (authOverrides.__query && Object.keys(authOverrides.__query).length) {
            nextArgs.__query = authOverrides.__query;
          }
          args = nextArgs;
        }

        lastInspectorRequest = {
          serverName,
          toolName: selectedInspectorTool.name,
          args
        };

        // Execute
        executeBtn.disabled = true;
        executeBtn.textContent = '⏳ Executing...';

        const startTime = performance.now();

        // Log the request
        const requestPayload = {
          serverName,
          toolName: selectedInspectorTool.name,
          args,
        };
        logProtocolMessage('request', selectedInspectorTool.name, requestPayload);

        try {
          const response = await fetch('/api/mcp/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(requestPayload),
          });

          const data = await response.json();
          const duration = Math.round(performance.now() - startTime);

          // Log the response
          logProtocolMessage(
            'response',
            selectedInspectorTool.name,
            data.error || data.result,
            duration
          );

          // Log to tool execution history
          updateToolHistory({
            timestamp: new Date().toISOString(),
            server: serverName,
            tool: selectedInspectorTool.name,
            request: args,
            response: data.error || data.result,
            duration,
            success: !data.error && data.result?.isError !== true,
          });
          refreshBrainView();

          // Record step for scenarios (if recording is active)
          recordStep({
            server: serverName,
            tool: selectedInspectorTool.name,
            request: args,
            response: data.error || data.result,
            duration,
            success: !data.error && data.result?.isError !== true,
          });

          lastInspectorResponse = data;
          responseSection.style.display = 'block';

          const isError = data.error || data.result?.isError === true;

          if (isError) {
            responseStatus.className = 'inspector-status error';
            responseStatus.innerHTML = `❌ Error <span style="color: var(--text-muted);">(${duration}ms)</span>`;
            responseBody.className = 'inspector-response error';
          } else {
            responseStatus.className = 'inspector-status success';
            responseStatus.innerHTML = `✅ Success <span style="color: var(--text-muted);">(${duration}ms)</span>`;
            responseBody.className = 'inspector-response success';
          }

          responseBody.textContent = JSON.stringify(data.error || data.result, null, 2);
        } catch (error) {
          const duration = Math.round(performance.now() - startTime);

          // Log failed execution to history
          updateToolHistory({
            timestamp: new Date().toISOString(),
            server: serverName,
            tool: selectedInspectorTool.name,
            request: args,
            response: { error: error.message },
            duration,
            success: false,
          });
          refreshBrainView();

          // Record step for scenarios (if recording is active)
          recordStep({
            server: serverName,
            tool: selectedInspectorTool.name,
            request: args,
            response: { error: error.message },
            duration,
            success: false,
          });

          responseSection.style.display = 'block';
          responseStatus.className = 'inspector-status error';
          responseStatus.innerHTML = `❌ Error <span style="color: var(--text-muted);">(${duration}ms)</span>`;
          responseBody.className = 'inspector-response error';
          responseBody.textContent = error.message;
          lastInspectorResponse = { error: error.message };
        } finally {
          executeBtn.disabled = false;
          executeBtn.textContent = '▶️ Execute';
        }
      }

      async function runInspectorMatrix() {
        if (!lastInspectorRequest) {
          appendMessage('error', 'Run a tool in Inspector first.');
          return;
        }

        openInspectorPanel();
        switchInspectorTab('diff');
        await loadCrossServerOptions();

        const toolSelect = document.getElementById('crossToolSelect');
        const baselineSelect = document.getElementById('crossBaselineServerSelect');
        const argsEl = document.getElementById('crossArgs');

        ensureToolOption(toolSelect, lastInspectorRequest.toolName, 'from Inspector');

        if (baselineSelect && lastInspectorRequest.serverName) {
          const hasBaseline = Array.from(baselineSelect.options || [])
            .some(option => option.value === lastInspectorRequest.serverName);
          if (hasBaseline) {
            baselineSelect.value = lastInspectorRequest.serverName;
          }
        }

        if (argsEl) {
          argsEl.value = JSON.stringify(lastInspectorRequest.args || {}, null, 2);
        }

        if (!toolSelect || !toolSelect.value) {
          showNotification('This tool is not available on connected servers.', 'error');
          return;
        }

        await runCrossServerCompare();
      }

      // Copy inspector response to clipboard
      function copyInspectorResponse() {
        if (!lastInspectorResponse) return;
        const json = JSON.stringify(
          lastInspectorResponse.error || lastInspectorResponse.result,
          null,
          2
        );
        navigator.clipboard.writeText(json).then(() => {
          appendMessage('system', '📋 Response copied to clipboard');
        });
      }

      // Protocol Logging
      function logProtocolMessage(direction, toolName, data, duration = null) {
        const logEl = document.getElementById('protocolLog');

        // Clear placeholder if first message
        if (logEl.querySelector('div[style*="italic"]')) {
          logEl.innerHTML = '';
        }

        const timestamp = new Date().toLocaleTimeString();
        const icon = direction === 'request' ? '→' : '←';
        const color = direction === 'request' ? 'var(--accent-primary)' : 'var(--success)';
        const durationStr = duration
          ? ` <span style="color: var(--text-muted);">(${duration}ms)</span>`
          : '';

        const entry = document.createElement('div');
        entry.style.cssText =
          'margin-bottom: 8px; padding: 8px; background: var(--bg-surface); border-radius: 6px; border-left: 3px solid ' +
          color;
        entry.innerHTML = `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: ${color}; font-weight: 600;">${icon} ${direction.toUpperCase()}: ${escapeHtml(toolName)}${durationStr}</span>
            <span style="color: var(--text-muted); font-size: 0.7rem;">${timestamp}</span>
          </div>
          <pre style="margin: 0; font-size: 0.7rem; overflow-x: auto; white-space: pre-wrap; color: var(--text-secondary);">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
        `;

        logEl.appendChild(entry);
        logEl.scrollTop = logEl.scrollHeight;
        const maxEntries = 200;
        while (logEl.children.length > maxEntries) {
          logEl.removeChild(logEl.firstChild);
        }
      }

      function clearProtocolLog() {
        document.getElementById('protocolLog').innerHTML =
          '<div style="color: var(--text-muted); font-style: italic;">Execute a tool to see protocol messages...</div>';
      }

      if (document.readyState !== 'loading') {
        loadInspectorVariables();
        loadInspectorAuthSettings();
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          loadInspectorVariables();
          loadInspectorAuthSettings();
        });
      }

      // ==========================================
