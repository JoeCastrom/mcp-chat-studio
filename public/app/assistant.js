// STUDIO ASSISTANT WIDGET
      // ==========================================

      const ASSISTANT_STORAGE_KEY = 'mcp_chat_studio_assistant';
      let assistantMessages = [];
      let assistantOpen = false;
      let assistantDock = 'right';
      let assistantPopout = false;
      let assistantLastFAQ = null;
      let assistantPopoutPos = { x: null, y: null };
      let assistantDragState = null;
      let assistantSize = 'default';
      let assistantCustomSize = null;
      let assistantResizeState = null;
      let assistantLLMReady = true;
      let assistantLLMOverride = false;
      let assistantRecentCommands = [];
      let assistantLastTool = null;

      const assistantPrompt = `You are the MCP Chat Studio assistant. Help users learn and use the app.
You answer questions about MCP servers, Inspector, Workflows, Scenarios, Collections, Contracts, Mocks, Debugger, Workspace mode, and the Generator.
Be concise, suggest next actions, and ask a clarifying question if needed.
If asked about Test in Studio or project folders, say the folder must contain server.py (Python) or server.js (Node) plus requirements.txt/package.json.`;

      const assistantFAQ = [
        {
          title: 'Connect a server',
          keywords: ['connect', 'server', 'mcp', 'add server', 'template'],
          answer: 'Use the **MCP Servers** sidebar → **Add** → pick a template or fill in command/args. Click **Connect** to see tools.'
        },
        {
          title: 'Run a tool',
          keywords: ['inspector', 'run tool', 'execute', 'tool call'],
          answer: 'Go to **Inspector**, select server + tool, fill args, then **Execute**. Results show below with protocol logs.'
        },
        {
          title: 'Record scenarios',
          keywords: ['scenario', 'record', 'replay', 'recording'],
          answer: 'Open **Scenarios**, click **Start Recording**, then execute tools in Inspector. Stop and **Save Scenario**.'
        },
        {
          title: 'Collections + reports',
          keywords: ['collection', 'run report', 'runner', 'iterations'],
          answer: 'Create a **Collection**, add scenarios, then **Run**. The report shows pass/fail + exports (JSON/JUnit).'
        },
        {
          title: 'Matrix runs',
          keywords: ['matrix', 'compare servers', 'cross-server'],
          answer: 'Use **Scenario → Matrix** or **Inspector → Diff → Cross‑Server Snapshot**. Connect 2+ servers for heatmaps.'
        },
        {
          title: 'Generator (OpenAPI)',
          keywords: ['generator', 'openapi', 'proxy', 'generate server'],
          answer: 'Open **Generator**, load an OpenAPI spec, select endpoints, then **Generate Code** or **Download ZIP**. OpenAPI Proxy mode creates a real MCP server that calls your API.'
        },
        {
          title: 'Test in Studio (project folder)',
          keywords: ['test in studio', 'project folder', 'working directory', 'cwd', 'zip', 'save to folder'],
          answer: 'Click **Test in Studio** after generating. Paste the folder path that contains `server.py` (Python) or `server.js` (Node), plus `requirements.txt` or `package.json`. Studio cannot detect paths automatically.'
        },
        {
          title: 'Assistant OpenAPI import',
          keywords: ['assistant', 'upload', 'paste', 'openapi url', 'openapi json'],
          answer: 'Paste an OpenAPI URL/JSON here or click the 📎 button to upload a spec. I can import it into the Generator for you.'
        },
        {
          title: 'Quick Start',
          keywords: ['quick start', 'start', 'getting started', 'guide'],
          answer: 'Use the **🚀 Start** button in the header for a guided checklist with jump‑buttons to Inspector, Scenarios, Collections, Contracts, and Generator.'
        },
        {
          title: 'Contracts',
          keywords: ['contract', 'schema', 'breaking change', 'regression'],
          answer: 'Go to **Contracts** → **New Contract**. Validate responses and use **Schema Regression** to diff snapshots.'
        },
        {
          title: 'Mocks',
          keywords: ['mock', 'mock server', 'offline'],
          answer: 'Go to **Mocks**, create or **From History**, then **Connect** to register as an MCP server.'
        },
        {
          title: 'Workflow debugger',
          keywords: ['debugger', 'workflow', 'breakpoint', 'step'],
          answer: 'Create a workflow, then open **Debugger** to start a session, step nodes, and inspect variables.'
        },
        {
          title: 'Workspace mode',
          keywords: ['workspace', 'panels', 'layout', 'dock'],
          answer: 'Toggle **Workspace** in the header. Right‑click to add panels, use the mini‑map + zoom, and save sessions.'
        },
        {
          title: 'LLM settings',
          keywords: ['llm', 'provider', 'model', 'apikey', 'api key'],
          answer: 'Click the **⚙️** button to set provider/model/base URL, add API keys, or pick visible providers.'
        }
      ];

      function loadAssistantState() {
        try {
          const raw = localStorage.getItem(ASSISTANT_STORAGE_KEY);
          if (!raw) return null;
          return JSON.parse(raw);
        } catch (error) {
          return null;
        }
      }

      function saveAssistantState() {
        try {
          localStorage.setItem(ASSISTANT_STORAGE_KEY, JSON.stringify({
            open: assistantOpen,
            messages: assistantMessages.slice(-30),
            dock: assistantDock,
            popout: assistantPopout,
            popoutPos: assistantPopoutPos,
            size: assistantSize,
            customSize: assistantCustomSize,
            recentCommands: assistantRecentCommands,
            lastTool: assistantLastTool
          }));
        } catch (error) {
          console.warn('[Assistant] Failed to save:', error.message);
        }
      }

      function applyAssistantLayout() {
        const widget = document.getElementById('assistantWidget');
        const panel = document.getElementById('assistantPanel');
        if (!widget || !panel) return;
        widget.classList.toggle('dock-left', assistantDock === 'left');
        panel.classList.toggle('popout', assistantPopout);
        const hasCustom = assistantCustomSize && Number.isFinite(assistantCustomSize.width) && Number.isFinite(assistantCustomSize.height);
        panel.classList.toggle('large', assistantSize === 'large' && !hasCustom);
        if (hasCustom) {
          panel.style.width = `${assistantCustomSize.width}px`;
          panel.style.height = `${assistantCustomSize.height}px`;
          panel.style.maxHeight = `${assistantCustomSize.height}px`;
        } else {
          panel.style.width = '';
          panel.style.height = '';
          panel.style.maxHeight = '';
        }
        if (assistantPopout) {
          panel.style.right = 'auto';
          panel.style.left = assistantPopoutPos.x !== null ? `${assistantPopoutPos.x}px` : '';
          panel.style.top = assistantPopoutPos.y !== null ? `${assistantPopoutPos.y}px` : '';
          panel.style.bottom = assistantPopoutPos.x !== null ? 'auto' : '';
        } else {
          panel.style.left = '';
          panel.style.top = '';
          panel.style.bottom = '';
          panel.style.right = '';
        }
      }

      function toggleAssistantDock() {
        assistantDock = assistantDock === 'left' ? 'right' : 'left';
        applyAssistantLayout();
        saveAssistantState();
      }

      function toggleAssistantPopout() {
        assistantPopout = !assistantPopout;
        applyAssistantLayout();
        saveAssistantState();
      }

      function toggleAssistantSize() {
        if (assistantCustomSize) {
          assistantCustomSize = null;
          assistantSize = 'default';
        } else {
          assistantSize = assistantSize === 'large' ? 'default' : 'large';
        }
        applyAssistantLayout();
        saveAssistantState();
      }

      function startAssistantResize(event) {
        if (event.button !== 0) return;
        const panel = document.getElementById('assistantPanel');
        if (!panel) return;
        const rect = panel.getBoundingClientRect();
        assistantResizeState = {
          startX: event.clientX,
          startY: event.clientY,
          startWidth: rect.width,
          startHeight: rect.height
        };
        event.preventDefault();
      }

      document.addEventListener('mousemove', event => {
        if (!assistantResizeState) return;
        const panel = document.getElementById('assistantPanel');
        if (!panel) return;
        const deltaX = event.clientX - assistantResizeState.startX;
        const deltaY = event.clientY - assistantResizeState.startY;
        const minWidth = 280;
        const minHeight = 260;
        const maxWidth = Math.min(window.innerWidth - 24, 720);
        const maxHeight = Math.min(window.innerHeight - 24, 720);
        const width = Math.max(minWidth, Math.min(maxWidth, assistantResizeState.startWidth + deltaX));
        const height = Math.max(minHeight, Math.min(maxHeight, assistantResizeState.startHeight + deltaY));
        assistantCustomSize = { width: Math.round(width), height: Math.round(height) };
        applyAssistantLayout();
      });

      function getPanelLabel(panelId) {
        const map = {
          chatPanel: 'Chat',
          inspectorPanel: 'Inspector',
          historyPanel: 'History',
          scenariosPanel: 'Scenarios',
          workflowsPanel: 'Workflows',
          generatorPanel: 'Generator',
          collectionsPanel: 'Collections',
          monitorsPanel: 'Monitors',
          toolexplorerPanel: 'Tool Explorer',
          mocksPanel: 'Mocks',
          scriptsPanel: 'Scripts',
          docsPanel: 'Docs',
          contractsPanel: 'Contracts',
          performancePanel: 'Performance',
          debuggerPanel: 'Debugger',
          brainPanel: 'Brain'
        };
        return map[panelId] || panelId || 'Unknown';
      }

      function getWorkspacePanelLabel(type) {
        const fallback = {
          chat: 'Chat',
          inspector: 'Inspector',
          workflows: 'Workflows',
          scenarios: 'Scenarios',
          collections: 'Collections',
          history: 'History',
          toolexplorer: 'Tool Explorer',
          performance: 'Performance',
          debugger: 'Debugger',
          brain: 'Brain'
        };
        if (typeof floatingWorkspace !== 'undefined' && floatingWorkspace.panelDefs?.[type]?.title) {
          return floatingWorkspace.panelDefs[type].title;
        }
        return fallback[type] || type;
      }

      function getAssistantContext() {
        const isWorkspace = document.body.classList.contains('workspace-mode');
        const layout = isWorkspace ? 'Workspace' : 'Classic';

        let activePanel = 'Unknown';
        let openPanels = [];

        if (isWorkspace && typeof floatingWorkspace !== 'undefined') {
          const activeEl = document.querySelector('.floating-panel.active');
          const activePanelId = activeEl?.id;
          const activePanelMeta = floatingWorkspace.panels?.find(p => p.id === activePanelId);
          activePanel = activePanelMeta ? getWorkspacePanelLabel(activePanelMeta.type) : 'Workspace';
          openPanels = (floatingWorkspace.panels || []).map(p => getWorkspacePanelLabel(p.type));
        } else {
          const activeClassic = document.querySelector('.content-panel.active')?.id
            || localStorage.getItem('activeClassicPanel');
          activePanel = getPanelLabel(activeClassic);
        }

        const serverCount = document.getElementById('serverCount')?.textContent?.trim() || '0';
        const inspectorServer = document.getElementById('inspectorServerSelect')?.value || '';
        const inspectorTool = document.getElementById('inspectorToolSelect')?.value || '';

        return {
          layout,
          activePanel,
          openPanels: Array.from(new Set(openPanels)).slice(0, 6),
          inspector: {
            server: inspectorServer || null,
            tool: inspectorTool || null
          },
          connectedServers: serverCount
        };
      }

      function buildAssistantContextMessage() {
        const ctx = getAssistantContext();
        const panels = ctx.openPanels.length ? ctx.openPanels.join(', ') : 'N/A';
        const lastToolLabel = assistantLastTool?.tool
          ? `${assistantLastTool.tool}${assistantLastTool.server ? ` @ ${assistantLastTool.server}` : ''}`
          : null;
        return [
          `Layout: ${ctx.layout}`,
          `Active panel: ${ctx.activePanel}`,
          `Open panels: ${panels}`,
          `Connected servers: ${ctx.connectedServers}`,
          lastToolLabel ? `Last tool: ${lastToolLabel}` : null,
          ctx.inspector.server ? `Inspector server: ${ctx.inspector.server}` : null,
          ctx.inspector.tool ? `Inspector tool: ${ctx.inspector.tool}` : null
        ].filter(Boolean).join('\n');
      }

      function isAssistantLLMAvailable() {
        return !assistantLLMOverride && assistantLLMReady;
      }

      function updateAssistantContextLabel() {
        const label = document.getElementById('assistantContextLabel');
        if (!label) return;
        const ctx = getAssistantContext();
        const suffix = ctx.activePanel ? `· ${ctx.activePanel}` : '';
        const status = isAssistantLLMAvailable() ? '' : '· LLM not configured';
        const lastTool = assistantLastTool?.tool ? `· Last tool: ${assistantLastTool.tool}` : '';
        label.textContent = `Context: ${ctx.layout} ${suffix} ${lastTool} ${status}`.replace(/\s+/g, ' ').trim();
      }

      function formatAssistantContent(content) {
        const safeContent = escapeHtml(content || '');
        let formatted = safeContent;
        formatted = formatted.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\n/g, '<br>');
        return sanitizeHtml(formatted);
      }

      function appendAssistantHint(msgEl, hintText) {
        if (!msgEl) return;
        const hintHtml = `<br><strong>Next:</strong> ${escapeHtml(hintText)}`;
        msgEl.innerHTML = sanitizeHtml(`${msgEl.innerHTML}${hintHtml}`);
      }

      function renderAssistantMessages() {
        const list = document.getElementById('assistantMessages');
        if (!list) return;
        if (!assistantMessages.length) {
          list.innerHTML = '<div class="assistant-message assistant">Ask me anything about MCP Chat Studio.</div>';
          return;
        }
        list.innerHTML = assistantMessages.map(msg => {
          if (msg.type === 'action' && msg.action) {
            return `
              <div class="assistant-message assistant">
                <div style="margin-bottom: 6px;">${formatAssistantContent(msg.content || '')}</div>
                <button class="btn" onclick="${msg.action}">${escapeHtml(msg.actionLabel || 'Run')}</button>
              </div>
            `;
          }
          return `<div class="assistant-message ${msg.role}">${formatAssistantContent(msg.content)}</div>`;
        }).join('');
        list.scrollTop = list.scrollHeight;
      }

      function renderAssistantChips() {
        const chipWrap = document.getElementById('assistantChips');
        if (!chipWrap) return;
        if (!assistantRecentCommands.length) {
          chipWrap.innerHTML = '';
          chipWrap.style.display = 'none';
          return;
        }
        chipWrap.style.display = 'flex';
        chipWrap.innerHTML = assistantRecentCommands.map(cmd => {
          const label = cmd.length > 32 ? `${cmd.slice(0, 29)}…` : cmd;
          return `
          <button class="assistant-chip" type="button" onclick="sendAssistantCommandFromChip(${JSON.stringify(cmd)})" title="${escapeHtml(cmd)}">
            ${escapeHtml(label)}
          </button>
        `;
        }).join('');
      }

      function recordAssistantCommand(command) {
        const normalized = command.trim().replace(/\s+/g, ' ');
        if (!normalized) return;
        const lower = normalized.toLowerCase();
        assistantRecentCommands = [
          normalized,
          ...assistantRecentCommands.filter(cmd => cmd.toLowerCase() !== lower)
        ].slice(0, 6);
        renderAssistantChips();
        saveAssistantState();
      }

      function sendAssistantCommandFromChip(command) {
        const input = document.getElementById('assistantInput');
        if (!input) return;
        input.value = command;
        sendAssistantMessage();
      }

      function toggleAssistant(forceOpen) {
        const panel = document.getElementById('assistantPanel');
        if (!panel) return;
        assistantOpen = typeof forceOpen === 'boolean' ? forceOpen : !assistantOpen;
        panel.classList.toggle('open', assistantOpen);
        if (assistantOpen) {
          updateAssistantContextLabel();
          renderAssistantMessages();
          renderAssistantChips();
          document.getElementById('assistantInput')?.focus();
        }
        saveAssistantState();
      }

      function clearAssistantChat() {
        assistantMessages = [];
        assistantLastFAQ = null;
        renderAssistantMessages();
        saveAssistantState();
      }

      function triggerAssistantFileUpload() {
        document.getElementById('assistantFileInput')?.click();
      }

      async function handleAssistantFileUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          const dropzone = document.getElementById('assistantDropzone');
          if (dropzone) {
            dropzone.classList.add('active', 'accepted');
            setTimeout(() => dropzone.classList.remove('accepted'), 450);
          }
          showNotification('OpenAPI file accepted. Importing...', 'success');
          const text = await file.text();
          await handleAssistantOpenApiText(text, file.name || 'local file');
        } catch (error) {
          assistantMessages.push({ role: 'assistant', content: `Failed to read file: ${error.message}` });
          renderAssistantMessages();
          saveAssistantState();
        } finally {
          const dropzone = document.getElementById('assistantDropzone');
          dropzone?.classList.remove('active');
          event.target.value = '';
        }
      }

      function initAssistantDropzone() {
        const panel = document.getElementById('assistantPanel');
        const dropzone = document.getElementById('assistantDropzone');
        if (!panel || !dropzone) return;
        let dragDepth = 0;

        const show = () => dropzone.classList.add('active');
        const hide = () => dropzone.classList.remove('active');

        panel.addEventListener('dragenter', event => {
          if (!event.dataTransfer?.types?.includes('Files')) return;
          dragDepth += 1;
          show();
        });

        panel.addEventListener('dragover', event => {
          if (!event.dataTransfer?.types?.includes('Files')) return;
          event.preventDefault();
        });

        panel.addEventListener('dragleave', event => {
          if (!event.dataTransfer?.types?.includes('Files')) return;
          dragDepth = Math.max(0, dragDepth - 1);
          if (dragDepth === 0) hide();
        });

        panel.addEventListener('drop', async event => {
          if (!event.dataTransfer?.files?.length) return;
          event.preventDefault();
          dragDepth = 0;
          hide();
          const file = event.dataTransfer.files[0];
          if (!file) return;
          try {
            dropzone.classList.add('accepted');
            showNotification('OpenAPI file accepted. Importing...', 'success');
            const text = await file.text();
            await handleAssistantOpenApiText(text, file.name || 'dropped file');
            setTimeout(() => dropzone.classList.remove('accepted'), 400);
          } catch (error) {
            assistantMessages.push({ role: 'assistant', content: `Failed to read file: ${error.message}` });
            renderAssistantMessages();
            saveAssistantState();
            dropzone.classList.remove('accepted');
          }
        });
      }

      function extractOpenApiUrl(content) {
        const urlMatch = content.match(/https?:\/\/[^\s)"]+/i);
        if (!urlMatch) return null;
        const url = urlMatch[0];
        const lower = url.toLowerCase();
        if (lower.includes('openapi') || lower.includes('swagger') || lower.endsWith('.json') || lower.endsWith('.yaml') || lower.endsWith('.yml')) {
          return url;
        }
        return null;
      }

      function extractOpenApiJson(content) {
        let text = content.trim();
        const fenced = text.match(/```(?:json|yaml)?\s*([\s\S]*?)```/i);
        if (fenced) text = fenced[1].trim();
        if (!text.startsWith('{')) return null;
        try {
          const parsed = JSON.parse(text);
          if (parsed && (parsed.openapi || parsed.swagger)) {
            return parsed;
          }
        } catch (error) {
          return null;
        }
        return null;
      }

      async function tryMainChatOpenApi(content) {
        const url = extractOpenApiUrl(content);
        if (url) {
          const confirmed = await appConfirm(`Import OpenAPI from ${url}?`, {
            title: 'OpenAPI detected',
            confirmText: 'Import',
            cancelText: 'Cancel'
          });
          if (!confirmed) return true;
          const msg = appendMessage('assistant', '✅ Importing OpenAPI into Generator...');
          if (document.body.classList.contains('workspace-mode')) {
            if (typeof floatingWorkspace !== 'undefined' && floatingWorkspace.panels?.some(p => p.type === 'generator')) {
              floatingWorkspace.focusPanelByType('generator');
            } else {
              openWorkspacePanel('generator');
            }
          } else {
            openPanelByName('generator');
          }
          const input = document.getElementById('openApiUrlInput');
          if (input) input.value = url;
          await loadOpenApiFromUrl();
          appendAssistantHint(msg, 'click Generate Code or Test in Studio.');
          return true;
        }

        const jsonSpec = extractOpenApiJson(content);
        if (jsonSpec) {
          const confirmed = await appConfirm('Import OpenAPI JSON into Generator?', {
            title: 'OpenAPI detected',
            confirmText: 'Import',
            cancelText: 'Cancel'
          });
          if (!confirmed) return true;
          const msg = appendMessage('assistant', '✅ Importing OpenAPI JSON into Generator...');
          if (document.body.classList.contains('workspace-mode')) {
            if (typeof floatingWorkspace !== 'undefined' && floatingWorkspace.panels?.some(p => p.type === 'generator')) {
              floatingWorkspace.focusPanelByType('generator');
            } else {
              openWorkspacePanel('generator');
            }
          } else {
            openPanelByName('generator');
          }
          applyOpenApiSpec(jsonSpec, 'main chat paste');
          appendAssistantHint(msg, 'click Generate Code or Test in Studio.');
          return true;
        }
        return false;
      }

      function pulseAssistantUploadButton() {
        const buttons = document.querySelectorAll('.assistant-icon-btn');
        if (!buttons.length) return;
        const target = Array.from(buttons).find(btn => btn.textContent?.trim() === '📎');
        if (!target) return;
        target.classList.add('pulse');
        setTimeout(() => target.classList.remove('pulse'), 1600);
      }

      async function handleAssistantOpenApiUrl(url) {
        const confirmed = await appConfirm(`Load OpenAPI from ${url}?`, {
          title: 'OpenAPI detected',
          confirmText: 'Load',
          cancelText: 'Cancel'
        });
        if (!confirmed) {
          assistantMessages.push({ role: 'assistant', content: 'Okay, not loading that OpenAPI spec.' });
          renderAssistantMessages();
          saveAssistantState();
          return true;
        }
        if (document.body.classList.contains('workspace-mode')) {
          if (typeof floatingWorkspace !== 'undefined' && floatingWorkspace.panels?.some(p => p.type === 'generator')) {
            floatingWorkspace.focusPanelByType('generator');
          } else {
            openWorkspacePanel('generator');
          }
        } else {
          openPanelByName('generator');
        }
        const input = document.getElementById('openApiUrlInput');
        if (input) input.value = url;
        await loadOpenApiFromUrl();
        assistantMessages.push({ role: 'assistant', content: '✅ Loaded OpenAPI into Generator.' });
        assistantMessages.push({
          type: 'action',
          content: 'Next: generate and test the MCP proxy.',
          action: 'assistantGenerateAndTestOpenApi()',
          actionLabel: 'Generate + Test'
        });
        renderAssistantMessages();
        saveAssistantState();
        return true;
      }

      async function handleAssistantOpenApiText(text, source) {
        const confirmed = await appConfirm(`Import OpenAPI from ${source}?`, {
          title: 'OpenAPI detected',
          confirmText: 'Import',
          cancelText: 'Cancel'
        });
        if (!confirmed) {
          assistantMessages.push({ role: 'assistant', content: 'Okay, not importing that spec.' });
          renderAssistantMessages();
          saveAssistantState();
          return true;
        }
        if (document.body.classList.contains('workspace-mode')) {
          if (typeof floatingWorkspace !== 'undefined' && floatingWorkspace.panels?.some(p => p.type === 'generator')) {
            floatingWorkspace.focusPanelByType('generator');
          } else {
            openWorkspacePanel('generator');
          }
        } else {
          openPanelByName('generator');
        }
        await parseOpenApiText(text, source);
        assistantMessages.push({ role: 'assistant', content: '✅ OpenAPI imported into Generator.' });
        assistantMessages.push({
          type: 'action',
          content: 'Next: generate and test the MCP proxy.',
          action: 'assistantGenerateAndTestOpenApi()',
          actionLabel: 'Generate + Test'
        });
        renderAssistantMessages();
        saveAssistantState();
        return true;
      }

      async function tryAssistantOpenApi(content) {
        const url = extractOpenApiUrl(content);
        if (url) {
          return await handleAssistantOpenApiUrl(url);
        }
        const jsonSpec = extractOpenApiJson(content);
        if (jsonSpec) {
          const confirmed = await appConfirm('Import OpenAPI JSON into Generator?', {
            title: 'OpenAPI detected',
            confirmText: 'Import',
            cancelText: 'Cancel'
          });
          if (!confirmed) {
            assistantMessages.push({ role: 'assistant', content: 'Okay, not importing that JSON.' });
            renderAssistantMessages();
            saveAssistantState();
            return true;
          }
          if (document.body.classList.contains('workspace-mode')) {
            if (typeof floatingWorkspace !== 'undefined' && floatingWorkspace.panels?.some(p => p.type === 'generator')) {
              floatingWorkspace.focusPanelByType('generator');
            } else {
              openWorkspacePanel('generator');
            }
          } else {
            openPanelByName('generator');
          }
          applyOpenApiSpec(jsonSpec, 'assistant paste');
          assistantMessages.push({ role: 'assistant', content: '✅ OpenAPI JSON imported into Generator.' });
          assistantMessages.push({
            type: 'action',
            content: 'Next: generate and test the MCP proxy.',
            action: 'assistantGenerateAndTestOpenApi()',
            actionLabel: 'Generate + Test'
          });
          renderAssistantMessages();
          saveAssistantState();
          return true;
        }
        return false;
      }

      function assistantGenerateAndTestOpenApi() {
        try {
          generateMCPCode();
          showGeneratorTestModal();
        } catch (error) {
          appendMessage('error', `Generator failed: ${error.message}`);
        }
      }

      function findAssistantFAQ(message) {
        const text = message.toLowerCase();
        let best = null;
        let bestScore = 0;
        assistantFAQ.forEach(entry => {
          const score = entry.keywords.reduce((sum, keyword) => (
            text.includes(keyword) ? sum + 1 : sum
          ), 0);
          if (score > bestScore) {
            bestScore = score;
            best = entry;
          }
        });
        if (best && bestScore >= 1) return best;
        return null;
      }

      async function sendAssistantMessage() {
        const input = document.getElementById('assistantInput');
        const sendBtn = document.getElementById('assistantSendBtn');
        if (!input || !sendBtn) return;
        const content = input.value.trim();
        if (!content) return;

        assistantMessages.push({ role: 'user', content });
        recordAssistantCommand(content);
        input.value = '';
        renderAssistantMessages();
        updateAssistantContextLabel();

        if (await tryAssistantOpenApi(content)) {
          return;
        }

        if (await tryAssistantAction(content)) {
          saveAssistantState();
          return;
        }

        const lower = content.toLowerCase();
        if (assistantLastFAQ && (lower === 'details' || lower === 'more')) {
          const followUp = assistantLastFAQ.question;
          const faqAnswer = assistantLastFAQ.answer;
          assistantLastFAQ = null;
          await callAssistantLLM({
            question: followUp,
            faqAnswer
          }, sendBtn);
          return;
        }

        const faqHit = findAssistantFAQ(content);
        if (faqHit) {
          assistantLastFAQ = { question: content, answer: faqHit.answer };
          assistantMessages.push({
            role: 'assistant',
            content: `${faqHit.answer}\n\nNeed more detail? Reply **details** to ask the LLM.`
          });
          renderAssistantMessages();
          saveAssistantState();
          return;
        }

        await callAssistantLLM({ question: content }, sendBtn);
      }

      async function callAssistantLLM({ question, faqAnswer }, sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = '...';

        const contextMessage = buildAssistantContextMessage();
        const history = assistantMessages.slice(-12);
        const payload = [
          { role: 'system', content: assistantPrompt },
          { role: 'system', content: `Context:\n${contextMessage}` },
          ...history
        ];
        if (faqAnswer) {
          payload.splice(2, 0, { role: 'system', content: `FAQ context: ${faqAnswer}` });
        }

        try {
          if (assistantLLMOverride) {
            assistantLLMReady = false;
            assistantMessages.push({
              role: 'assistant',
              content: 'LLM is disabled for QA testing. Turn it back on in ⚙️ LLM Settings.'
            });
            return;
          }
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              messages: payload,
              useTools: false,
              stream: false
            })
          });
          const data = await response.json();
          if (!response.ok || data?.error) {
            assistantLLMReady = false;
            const reason = data?.error || response.statusText || 'LLM unavailable';
            assistantMessages.push({
              role: 'assistant',
              content: `LLM request failed: ${reason}. Open ⚙️ LLM Settings to configure a provider.`
            });
          } else {
            assistantLLMReady = true;
            const reply = data.choices?.[0]?.message?.content || 'No response generated.';
            assistantMessages.push({ role: 'assistant', content: reply });
          }
        } catch (error) {
          assistantLLMReady = false;
          assistantMessages.push({ role: 'assistant', content: `Error: ${error.message}` });
        } finally {
          sendBtn.disabled = false;
          sendBtn.textContent = 'Send';
          renderAssistantMessages();
          saveAssistantState();
          updateAssistantContextLabel();
        }
      }

      async function showAssistantCommands() {
        const actions = [
          'Open <panel> (e.g., "open inspector", "open collections")',
          'Switch to workspace / classic',
          'Build workspace <preset|panels> (e.g., "build workspace debug", "build workspace with chat, inspector, workflows")',
          'Add panel <name> / Close panel <name>',
          'Arrange workspace / Fit all',
          'Resize panel <name> 600x500',
          'Save workspace session <name>',
          'Load workspace session <name>',
          'Delete workspace session <name>',
          'Export workspace / Import workspace',
          'Toggle minimap / Toggle grid',
          'Zoom in / Zoom out / Reset zoom',
          'Run scenario <name>',
          'Run collection <name>',
          'Run matrix (from last Inspector request)',
          'Start recording / Stop recording',
          'Open add server',
          'Clear history'
        ];

        await appAlert(actions.map(item => `• ${item}`).join('\n'), {
          title: 'Assistant Commands'
        });
      }

      function openPanelByName(panelKey) {
        const map = {
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
          contracts: 'contractsPanel',
          performance: 'performancePanel',
          debugger: 'debuggerPanel',
          brain: 'brainPanel'
        };
        if (document.body.classList.contains('workspace-mode')) {
          if (typeof floatingWorkspace !== 'undefined' && typeof floatingWorkspace.focusPanelByType === 'function') {
            floatingWorkspace.focusPanelByType(panelKey);
            return true;
          }
        }
        const panelId = map[panelKey];
        if (panelId && typeof switchClassicPanel === 'function') {
          switchClassicPanel(panelId);
          return true;
        }
        return false;
      }

      function openWorkspacePanel(panelKey) {
        if (typeof floatingWorkspace === 'undefined') return false;
        if (!document.body.classList.contains('workspace-mode')) {
          setLayoutMode('workspace');
        }
        floatingWorkspace.togglePanel(panelKey);
        return true;
      }

      function closeWorkspacePanel(panelKey) {
        if (typeof floatingWorkspace === 'undefined') return false;
        const panel = floatingWorkspace.panels?.find(p => p.type === panelKey);
        if (!panel) return false;
        floatingWorkspace.closePanel(panel.id);
        return true;
      }

      function resizeWorkspacePanel(panelKey, width, height) {
        if (typeof floatingWorkspace === 'undefined') return false;
        const panel = floatingWorkspace.panels?.find(p => p.type === panelKey);
        if (!panel) return false;
        panel.width = width;
        panel.height = height;
        const el = document.getElementById(panel.id);
        if (el) {
          el.style.width = `${width}px`;
          el.style.height = `${height}px`;
        }
        floatingWorkspace.updateConnections();
        floatingWorkspace.updateMiniMap();
        floatingWorkspace.saveLayout();
        return true;
      }

      function minimizeWorkspacePanel(panelKey, shouldMinimize) {
        if (typeof floatingWorkspace === 'undefined') return false;
        const panel = floatingWorkspace.panels?.find(p => p.type === panelKey);
        if (!panel) return false;
        if (panel.minimized === shouldMinimize) return true;
        floatingWorkspace.toggleMinimize(panel.id);
        return true;
      }

      function arrangeWorkspacePanels() {
        if (typeof floatingWorkspace === 'undefined') return false;
        const panels = floatingWorkspace.panels || [];
        if (!panels.length) return false;
        const cols = 3;
        const gapX = 420;
        const gapY = 320;
        const startX = 80;
        const startY = 80;
        panels.forEach((panel, idx) => {
          panel.x = startX + (idx % cols) * gapX;
          panel.y = startY + Math.floor(idx / cols) * gapY;
          const el = document.getElementById(panel.id);
          if (el) {
            el.style.left = `${panel.x}px`;
            el.style.top = `${panel.y}px`;
          }
        });
        floatingWorkspace.updateConnections();
        floatingWorkspace.updateMiniMap();
        floatingWorkspace.saveLayout();
        return true;
      }

      async function tryAssistantAction(message) {
        const text = message.toLowerCase();
        const hasVerb = (verbs) => verbs.some(v => text.includes(v));
        const extractName = (phrases) => {
          for (const phrase of phrases) {
            const idx = text.indexOf(phrase);
            if (idx >= 0) {
              const raw = message.slice(idx + phrase.length).trim();
              return raw.replace(/^["']|["']$/g, '').trim();
            }
          }
          return '';
        };
        const matchByName = (items, name) => {
          const lowered = name.toLowerCase();
          return items.filter(item => item.name?.toLowerCase().includes(lowered));
        };

        const openVerbs = ['open', 'show', 'go to', 'switch to', 'take me to'];
        const runVerbs = ['run', 'execute', 'start'];
        const toggleVerbs = ['toggle', 'switch'];

        const panelKeywords = {
          chat: ['chat'],
          inspector: ['inspector', 'tool runner', 'tools'],
          history: ['history', 'log'],
          scenarios: ['scenario', 'recording'],
          workflows: ['workflow', 'flows'],
          collections: ['collection'],
          monitors: ['monitor', 'health'],
          toolexplorer: ['tool explorer', 'analytics', 'leaderboard'],
          mocks: ['mock'],
          scripts: ['script'],
          docs: ['docs', 'documentation'],
          contracts: ['contract'],
          performance: ['performance', 'latency'],
          debugger: ['debugger'],
          brain: ['brain', 'timeline']
        };

        const panelKeyFromText = Object.keys(panelKeywords)
          .find(key => panelKeywords[key].some(keyword => text.includes(keyword)));

        if (hasVerb(openVerbs)) {
          if (panelKeyFromText) {
            openPanelByName(panelKeyFromText);
            assistantMessages.push({ role: 'assistant', content: `✅ Opened ${panelKeywords[panelKeyFromText][0].replace(/^\w/, c => c.toUpperCase())}.` });
            return true;
          }
        }

        if (hasVerb(openVerbs) && (text.includes('add server') || text.includes('server modal'))) {
          showAddServerModal();
          assistantMessages.push({ role: 'assistant', content: '✅ Opened Add MCP Server.' });
          return true;
        }

        if (text.includes('upload') && (text.includes('openapi') || text.includes('spec') || text.includes('json') || text.includes('yaml'))) {
          pulseAssistantUploadButton();
          assistantMessages.push({
            role: 'assistant',
            content: 'Drop an OpenAPI JSON/YAML file onto this panel or click the **📎** button. Browsers block auto‑opening the file picker from text commands.'
          });
          return true;
        }

        if (hasVerb(toggleVerbs) && text.includes('workspace')) {
          setLayoutMode('workspace');
          assistantMessages.push({ role: 'assistant', content: '✅ Switched to Workspace mode.' });
          return true;
        }
        if (hasVerb(toggleVerbs) && text.includes('classic')) {
          setLayoutMode('classic');
          assistantMessages.push({ role: 'assistant', content: '✅ Switched to Classic mode.' });
          return true;
        }

        if (text.includes('build workspace') || text.includes('new workspace') || text.includes('reset workspace')) {
          if (!document.body.classList.contains('workspace-mode')) {
            setLayoutMode('workspace');
          }
          const presets = ['debug', 'testing', 'development', 'analytics'];
          const preset = presets.find(name => text.includes(name));
          const requestedPanels = Object.keys(panelKeywords).filter(key =>
            panelKeywords[key].some(keyword => text.includes(keyword))
          );

          const confirmed = await appConfirm('This will replace your current workspace layout. Continue?', {
            title: 'Build Workspace',
            confirmText: 'Build'
          });
          if (!confirmed) {
            assistantMessages.push({ role: 'assistant', content: 'Cancelled. Workspace not changed.' });
            return true;
          }

          if (preset && typeof floatingWorkspace !== 'undefined') {
            floatingWorkspace.loadPreset(preset);
            assistantMessages.push({ role: 'assistant', content: `✅ Loaded workspace preset "${preset}".` });
            return true;
          }

          if (requestedPanels.length > 0 && typeof floatingWorkspace !== 'undefined') {
            floatingWorkspace.closeAllPanels({ skipSave: true });
            requestedPanels.forEach((type, index) => {
              floatingWorkspace.addPanel(type, 100 + (index % 3) * 400, 80 + Math.floor(index / 3) * 300, {
                skipSave: true,
                skipConnections: true,
                skipMiniMap: true
              });
            });
            floatingWorkspace.updateConnections();
            floatingWorkspace.updateMiniMap();
            floatingWorkspace.saveLayout();
            assistantMessages.push({ role: 'assistant', content: `✅ Built workspace with ${requestedPanels.join(', ')}.` });
            return true;
          }

          if (typeof floatingWorkspace !== 'undefined') {
            floatingWorkspace.loadPreset('development');
            assistantMessages.push({ role: 'assistant', content: '✅ Loaded workspace preset "development".' });
            return true;
          }
        }

        if (text.includes('show presets') || text.includes('workspace presets')) {
          if (typeof floatingWorkspace !== 'undefined') {
            floatingWorkspace.showPresetsModal();
            assistantMessages.push({ role: 'assistant', content: '✅ Opened workspace presets.' });
            return true;
          }
        }

        if (text.includes('command palette')) {
          if (typeof floatingWorkspace !== 'undefined') {
            floatingWorkspace.showCommandPalette();
            assistantMessages.push({ role: 'assistant', content: '✅ Opened command palette.' });
            return true;
          }
        }

        if (text.includes('fit all')) {
          if (typeof floatingWorkspace !== 'undefined') {
            const confirmed = await appConfirm('Fit all panels into view?', {
              title: 'Fit All Panels',
              confirmText: 'Fit'
            });
            if (!confirmed) {
              assistantMessages.push({ role: 'assistant', content: 'Cancelled. Fit all skipped.' });
              return true;
            }
            floatingWorkspace.fitAll();
            assistantMessages.push({ role: 'assistant', content: '✅ Fit all panels.' });
            return true;
          }
        }

        if (text.includes('arrange') || text.includes('tidy')) {
          if (arrangeWorkspacePanels()) {
            const confirmed = await appConfirm('Auto-arrange all workspace panels?', {
              title: 'Arrange Workspace',
              confirmText: 'Arrange'
            });
            if (!confirmed) {
              assistantMessages.push({ role: 'assistant', content: 'Cancelled. Layout unchanged.' });
              return true;
            }
            arrangeWorkspacePanels();
            assistantMessages.push({ role: 'assistant', content: '✅ Arranged workspace panels.' });
            return true;
          }
        }

        if (text.includes('toggle minimap') || text.includes('minimap')) {
          if (typeof floatingWorkspace !== 'undefined') {
            floatingWorkspace.toggleMiniMap();
            assistantMessages.push({ role: 'assistant', content: '✅ Toggled minimap.' });
            return true;
          }
        }

        if (text.includes('toggle grid') || text.includes('grid snap')) {
          if (typeof floatingWorkspace !== 'undefined') {
            floatingWorkspace.snapToGrid = !floatingWorkspace.snapToGrid;
            assistantMessages.push({ role: 'assistant', content: `✅ Grid snap ${floatingWorkspace.snapToGrid ? 'enabled' : 'disabled'}.` });
            return true;
          }
        }

        if (text.includes('zoom in')) {
          if (typeof floatingWorkspace !== 'undefined') {
            floatingWorkspace.zoomIn();
            assistantMessages.push({ role: 'assistant', content: '✅ Zoomed in.' });
            return true;
          }
        }

        if (text.includes('zoom out')) {
          if (typeof floatingWorkspace !== 'undefined') {
            floatingWorkspace.zoomOut();
            assistantMessages.push({ role: 'assistant', content: '✅ Zoomed out.' });
            return true;
          }
        }

        if (text.includes('reset zoom')) {
          if (typeof floatingWorkspace !== 'undefined') {
            floatingWorkspace.resetZoom();
            assistantMessages.push({ role: 'assistant', content: '✅ Reset zoom.' });
            return true;
          }
        }

        if (text.includes('add panel') && panelKeyFromText) {
          if (openWorkspacePanel(panelKeyFromText)) {
            assistantMessages.push({ role: 'assistant', content: `✅ Added ${panelKeywords[panelKeyFromText][0]} panel.` });
            return true;
          }
        }

        if ((text.includes('close panel') || text.includes('remove panel')) && panelKeyFromText) {
          if (closeWorkspacePanel(panelKeyFromText)) {
            assistantMessages.push({ role: 'assistant', content: `✅ Closed ${panelKeywords[panelKeyFromText][0]} panel.` });
            return true;
          }
        }

        if (text.includes('resize') && panelKeyFromText) {
          const sizeMatch = text.match(/(\d{2,4})\s*[x×]\s*(\d{2,4})/);
          if (!sizeMatch) {
            assistantMessages.push({ role: 'assistant', content: 'Please provide a size, e.g., "resize inspector 600x500".' });
            return true;
          }
          const width = parseInt(sizeMatch[1], 10);
          const height = parseInt(sizeMatch[2], 10);
          const confirmed = await appConfirm(`Resize ${panelKeywords[panelKeyFromText][0]} to ${width}x${height}?`, {
            title: 'Resize Panel',
            confirmText: 'Resize'
          });
          if (!confirmed) {
            assistantMessages.push({ role: 'assistant', content: 'Cancelled. Panel not resized.' });
            return true;
          }
          if (resizeWorkspacePanel(panelKeyFromText, width, height)) {
            assistantMessages.push({ role: 'assistant', content: `✅ Resized ${panelKeywords[panelKeyFromText][0]} to ${width}x${height}.` });
            return true;
          }
        }

        if ((text.includes('minimize') || text.includes('collapse')) && panelKeyFromText) {
          if (minimizeWorkspacePanel(panelKeyFromText, true)) {
            assistantMessages.push({ role: 'assistant', content: `✅ Minimized ${panelKeywords[panelKeyFromText][0]} panel.` });
            return true;
          }
        }

        if ((text.includes('maximize') || text.includes('restore')) && panelKeyFromText) {
          if (minimizeWorkspacePanel(panelKeyFromText, false)) {
            assistantMessages.push({ role: 'assistant', content: `✅ Restored ${panelKeywords[panelKeyFromText][0]} panel.` });
            return true;
          }
        }

        if (text.includes('save workspace') || text.includes('save session')) {
          if (typeof floatingWorkspace !== 'undefined') {
            const name = extractName(['save workspace', 'save session']) || await appPrompt('Session name:', {
              title: 'Save Workspace Session',
              label: 'Session name',
              required: true
            });
            if (!name) return true;
            floatingWorkspace.saveWorkspaceSession(name);
            assistantMessages.push({ role: 'assistant', content: `✅ Saved workspace session "${name}".` });
            return true;
          }
        }

        if (text.includes('load session') || text.includes('load workspace')) {
          if (typeof floatingWorkspace !== 'undefined') {
            const name = extractName(['load session', 'load workspace']);
            const sessions = floatingWorkspace.getWorkspaceSessions() || [];
            if (!sessions.length) {
              assistantMessages.push({ role: 'assistant', content: 'No saved workspace sessions found.' });
              return true;
            }
            if (!name) {
              floatingWorkspace.showSessionsModal();
              assistantMessages.push({ role: 'assistant', content: '✅ Opened workspace sessions.' });
              return true;
            }
            const matches = matchByName(sessions, name);
            if (matches.length !== 1) {
              assistantMessages.push({ role: 'assistant', content: matches.length ? `Multiple sessions match: ${matches.map(m => `"${m.name}"`).join(', ')}` : `No session named "${name}".` });
              return true;
            }
            floatingWorkspace.loadWorkspaceSession(matches[0].id);
            assistantMessages.push({ role: 'assistant', content: `✅ Loaded workspace session "${matches[0].name}".` });
            return true;
          }
        }

        if (text.includes('delete session') || text.includes('remove session')) {
          if (typeof floatingWorkspace !== 'undefined') {
            const name = extractName(['delete session', 'remove session']);
            const sessions = floatingWorkspace.getWorkspaceSessions() || [];
            if (!sessions.length) {
              assistantMessages.push({ role: 'assistant', content: 'No saved workspace sessions found.' });
              return true;
            }
            if (!name) {
              floatingWorkspace.showSessionsModal();
              assistantMessages.push({ role: 'assistant', content: '✅ Opened workspace sessions.' });
              return true;
            }
            const matches = matchByName(sessions, name);
            if (matches.length !== 1) {
              assistantMessages.push({ role: 'assistant', content: matches.length ? `Multiple sessions match: ${matches.map(m => `"${m.name}"`).join(', ')}` : `No session named "${name}".` });
              return true;
            }
            const confirmed = await appConfirm(`Delete workspace session "${matches[0].name}"?`, {
              title: 'Delete Workspace Session',
              confirmText: 'Delete',
              confirmVariant: 'danger'
            });
            if (!confirmed) {
              assistantMessages.push({ role: 'assistant', content: 'Cancelled. Session not deleted.' });
              return true;
            }
            floatingWorkspace.deleteWorkspaceSession(matches[0].id);
            assistantMessages.push({ role: 'assistant', content: `✅ Deleted workspace session "${matches[0].name}".` });
            return true;
          }
        }

        if (text.includes('export workspace')) {
          if (typeof floatingWorkspace !== 'undefined') {
            floatingWorkspace.exportWorkspace();
            assistantMessages.push({ role: 'assistant', content: '✅ Exported workspace bundle.' });
            return true;
          }
        }

        if (text.includes('import workspace')) {
          if (typeof floatingWorkspace !== 'undefined') {
            floatingWorkspace.importWorkspace();
            assistantMessages.push({ role: 'assistant', content: '✅ Choose a workspace bundle to import.' });
            return true;
          }
        }

        if (hasVerb(runVerbs) && (text.includes('matrix') || text.includes('cross-server'))) {
          if (typeof runInspectorMatrix === 'function') {
            await runInspectorMatrix();
            assistantMessages.push({ role: 'assistant', content: '✅ Running cross‑server matrix from the last Inspector request.' });
            return true;
          }
        }

        if (hasVerb(runVerbs) && text.includes('scenario')) {
          const scenarioName = extractName(['run scenario', 'replay scenario', 'run the scenario']);
          const scenarios = sessionManager.getScenarios();
          if (!scenarios.length) {
            assistantMessages.push({ role: 'assistant', content: 'No scenarios saved yet. Record one from Inspector → Scenarios.' });
            return true;
          }
          let target = scenarios[0];
          if (scenarioName) {
            const matches = matchByName(scenarios, scenarioName);
            if (matches.length === 1) {
              target = matches[0];
            } else if (matches.length > 1) {
              assistantMessages.push({
                role: 'assistant',
                content: `I found multiple scenarios: ${matches.map(m => `"${m.name}"`).join(', ')}. Please tell me the exact name.`
              });
              return true;
            } else {
              assistantMessages.push({ role: 'assistant', content: `I couldn't find a scenario named "${scenarioName}". Try another name.` });
              return true;
            }
          }
          openPanelByName('scenarios');
          const confirmed = await appConfirm(`Run scenario "${target.name}" now?`, {
            title: 'Run Scenario',
            confirmText: 'Run'
          });
          if (!confirmed) {
            assistantMessages.push({ role: 'assistant', content: 'Cancelled. Scenario not run.' });
            return true;
          }
          await replayScenario(target.id);
          assistantMessages.push({ role: 'assistant', content: `✅ Running scenario "${target.name}".` });
          return true;
        }

        if (hasVerb(runVerbs) && text.includes('collection')) {
          const collectionName = extractName(['run collection', 'run the collection']);
          let collections = [];
          try {
            const res = await fetch('/api/collections');
            const data = await res.json();
            collections = data.collections || [];
          } catch (error) {
            assistantMessages.push({ role: 'assistant', content: `Could not load collections: ${error.message}` });
            return true;
          }
          if (!collections.length) {
            assistantMessages.push({ role: 'assistant', content: 'No collections found. Create one in the Collections tab.' });
            return true;
          }
          let target = collections[0];
          if (collectionName) {
            const matches = matchByName(collections, collectionName);
            if (matches.length === 1) {
              target = matches[0];
            } else if (matches.length > 1) {
              assistantMessages.push({
                role: 'assistant',
                content: `I found multiple collections: ${matches.map(m => `"${m.name}"`).join(', ')}. Please tell me the exact name.`
              });
              return true;
            } else {
              assistantMessages.push({ role: 'assistant', content: `I couldn't find a collection named "${collectionName}". Try another name.` });
              return true;
            }
          }
          openPanelByName('collections');
          if (typeof runCollection === 'function') {
            const confirmed = await appConfirm(`Run collection "${target.name}" now?`, {
              title: 'Run Collection',
              confirmText: 'Run'
            });
            if (!confirmed) {
              assistantMessages.push({ role: 'assistant', content: 'Cancelled. Collection not run.' });
              return true;
            }
            await runCollection(target.id);
            assistantMessages.push({ role: 'assistant', content: `✅ Running collection "${target.name}".` });
          } else {
            assistantMessages.push({ role: 'assistant', content: 'Collection runner is not available in this view.' });
          }
          return true;
        }

        if (hasVerb(openVerbs) && (text.includes('settings') || text.includes('llm'))) {
          showSettingsModal();
          assistantMessages.push({ role: 'assistant', content: '✅ Opened LLM Settings.' });
          return true;
        }

        if (text.includes('start recording')) {
          if (!isRecording) toggleRecording();
          assistantMessages.push({ role: 'assistant', content: '✅ Recording started. Execute tools in Inspector.' });
          return true;
        }
        if (text.includes('stop recording')) {
          if (isRecording) toggleRecording();
          assistantMessages.push({ role: 'assistant', content: '✅ Recording stopped.' });
          return true;
        }

        if (text.includes('clear history')) {
          const cleared = await clearToolHistory();
          assistantMessages.push({
            role: 'assistant',
            content: cleared ? '✅ History cleared.' : 'Cancelled. History not cleared.'
          });
          return true;
        }

        return false;
      }

      function initStudioAssistant() {
        const toggleBtn = document.getElementById('assistantToggle');
        if (toggleBtn) {
          toggleBtn.addEventListener('click', () => toggleAssistant());
        }
        const input = document.getElementById('assistantInput');
        if (input) {
          input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendAssistantMessage();
            }
          });
        }
        const saved = loadAssistantState();
        assistantOpen = saved?.open || false;
        assistantMessages = saved?.messages || [];
        assistantDock = saved?.dock || 'right';
        assistantPopout = saved?.popout || false;
        assistantPopoutPos = saved?.popoutPos || { x: null, y: null };
        assistantSize = saved?.size || 'default';
        assistantCustomSize = saved?.customSize || null;
        assistantRecentCommands = Array.isArray(saved?.recentCommands) ? saved.recentCommands : [];
        assistantLastTool = saved?.lastTool || null;
        assistantLLMOverride = localStorage.getItem('mcp_assistant_llm_override') === 'true';
        assistantLLMReady = true;
        if (assistantOpen) {
          document.getElementById('assistantPanel')?.classList.add('open');
        }
        renderAssistantMessages();
        renderAssistantChips();
        updateAssistantContextLabel();
        applyAssistantLayout();
        setInterval(updateAssistantContextLabel, 4000);

        const header = document.querySelector('#assistantPanel .assistant-header');
        if (header) {
          header.addEventListener('mousedown', event => {
            if (!assistantPopout) return;
            const panel = document.getElementById('assistantPanel');
            if (!panel) return;
            const rect = panel.getBoundingClientRect();
            assistantDragState = {
              offsetX: event.clientX - rect.left,
              offsetY: event.clientY - rect.top
            };
            event.preventDefault();
          });
        }

        const resizeHandle = document.querySelector('#assistantPanel .assistant-resize-handle');
        if (resizeHandle) {
          resizeHandle.addEventListener('mousedown', event => startAssistantResize(event));
        }

        initAssistantDropzone();

        document.addEventListener('mousemove', event => {
          if (!assistantDragState || !assistantPopout) return;
          const panel = document.getElementById('assistantPanel');
          if (!panel) return;
          const width = panel.offsetWidth || 320;
          const height = panel.offsetHeight || 320;
          const maxX = Math.max(8, window.innerWidth - width - 8);
          const maxY = Math.max(8, window.innerHeight - height - 8);
          const x = Math.min(maxX, Math.max(8, event.clientX - assistantDragState.offsetX));
          const y = Math.min(maxY, Math.max(8, event.clientY - assistantDragState.offsetY));
          assistantPopoutPos = { x, y };
          panel.style.left = `${x}px`;
          panel.style.top = `${y}px`;
          panel.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
          if (assistantDragState) {
            assistantDragState = null;
            saveAssistantState();
          }
          if (assistantResizeState) {
            assistantResizeState = null;
            saveAssistantState();
          }
        });
      }

      async function saveSettings(event) {
        event.preventDefault();

        const provider = document.getElementById('llmProvider').value;
        const model = document.getElementById('llmModel').value.trim();
        const temperature = parseFloat(document.getElementById('llmTemperature').value);
        const base_url = document.getElementById('llmBaseUrl').value.trim();
        const api_key = document.getElementById('llmApiKey').value.trim();
        const clear_api_key = document.getElementById('llmClearApiKey').checked;
        const auth_type = document.getElementById('llmAuthType').value;
        const auth_url = document.getElementById('llmAuthUrl').value.trim();
        const auth_client_id = document.getElementById('llmAuthClientId').value.trim();
        const auth_client_secret = document.getElementById('llmAuthClientSecret').value.trim();
        const auth_scope = document.getElementById('llmAuthScope').value.trim();
        const auth_audience = document.getElementById('llmAuthAudience').value.trim();
        const clear_auth_secret = document.getElementById('llmClearAuthSecret').checked;
        const assistantOverride = document.getElementById('assistantLlmOverride')?.checked || false;

        assistantLLMOverride = assistantOverride;
        localStorage.setItem('mcp_assistant_llm_override', assistantOverride ? 'true' : 'false');
        updateAssistantContextLabel();

        if (!model) {
          appendMessage('error', 'Model name is required');
          return;
        }

        const payload = { provider, model, temperature };
        if (base_url) payload.base_url = base_url;
        if (api_key) payload.api_key = api_key;
        if (clear_api_key) payload.clear_api_key = true;

        if (provider === 'custom') {
          payload.auth_type = auth_type;
          payload.auth_url = auth_url;
          payload.auth_client_id = auth_client_id;
          payload.auth_client_secret = auth_client_secret;
          payload.auth_scope = auth_scope;
          payload.auth_audience = auth_audience;
          if (clear_auth_secret) payload.clear_auth_secret = true;
        }

        try {
          const response = await fetch('/api/llm/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
          });

          const data = await response.json();

          if (data.error) {
            appendMessage('error', `Failed to save settings: ${data.error}`);
          } else {
            appendMessage('system', `✅ LLM settings updated: ${provider} / ${model}`);
            updateModelBadge(); // Update header badge
            hideSettingsModal();
          }
        } catch (error) {
          appendMessage('error', `Failed to save settings: ${error.message}`);
        }
      }

      // Temperature slider update
      document.getElementById('llmTemperature')?.addEventListener('input', e => {
        document.getElementById('tempValue').textContent = e.target.value;
      });

      document.getElementById('llmModel')?.addEventListener('input', e => {
        const provider = document.getElementById('llmProvider')?.value;
        if (provider !== 'ollama') return;
        const select = document.getElementById('ollamaModelSelect');
        if (!select) return;
        const value = e.target.value.trim();
        select.value = value && Array.from(select.options).some(opt => opt.value === value) ? value : '';
      });

      // Close modals on Escape key
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          closeWorkspaceMenu();
          if (document.getElementById('addServerModal').classList.contains('active')) {
            hideAddServerModal();
          }
          if (document.getElementById('settingsModal').classList.contains('active')) {
            hideSettingsModal();
          }
          closeProviderMenu();
          if (document.getElementById('oauthSettingsModal').classList.contains('active')) {
            hideOAuthSettingsModal();
          }
          if (document.getElementById('confirmDeleteModal').classList.contains('active')) {
            hideConfirmDeleteModal();
          }
          if (document.getElementById('importConfigModal').classList.contains('active')) {
            hideImportConfigModal();
          }
        }
      });

      document.addEventListener('click', e => {
        const menu = document.getElementById('workspaceMenu');
        if (menu && !menu.contains(e.target)) {
          closeWorkspaceMenu();
        }
        const providerMenu = document.getElementById('providerMenu');
        if (providerMenu && !providerMenu.contains(e.target)) {
          closeProviderMenu();
        }
      });

      // ==========================================
      // THEME TOGGLE
      // ==========================================

      function toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Update icon
        document.getElementById('themeIcon').textContent = newTheme === 'light' ? '☀️' : '🌙';
      }

      // Apply saved theme on load
      (function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        const icon = document.getElementById('themeIcon');
        if (icon) icon.textContent = savedTheme === 'light' ? '☀️' : '🌙';
      })();

      // ==========================================
      // LAYOUT TOGGLE (Classic Grid vs Floating Workspace)
      // ==========================================

      function updateLayoutSwitch() {
        const isWorkspace = document.body.classList.contains('workspace-mode');
        const classicBtn = document.getElementById('layoutClassicBtn');
        const workspaceBtn = document.getElementById('layoutWorkspaceBtn');
        if (classicBtn && workspaceBtn) {
          classicBtn.classList.toggle('active', !isWorkspace);
          workspaceBtn.classList.toggle('active', isWorkspace);
          classicBtn.setAttribute('aria-pressed', String(!isWorkspace));
          workspaceBtn.setAttribute('aria-pressed', String(isWorkspace));
        }
      }

      function setLayoutMode(mode) {
        const isWorkspace = document.body.classList.contains('workspace-mode');
        if (mode === 'workspace' && !isWorkspace) {
          toggleLayout();
        } else if (mode === 'classic' && isWorkspace) {
          toggleLayout();
        } else {
          updateLayoutSwitch();
        }
      }

      function toggleLayout() {
        const body = document.body;
        const isWorkspaceMode = body.classList.contains('workspace-mode');

        if (isWorkspaceMode) {
          // Switch to Classic Grid layout
          body.classList.remove('workspace-mode');
          localStorage.setItem('layout', 'classic');

          // Update button
          const layoutIcon = document.getElementById('layoutIcon');
          const layoutText = document.getElementById('layoutText');
          if (layoutIcon) layoutIcon.textContent = '📋';
          if (layoutText) layoutText.textContent = 'Classic';

          // Cleanup workspace elements
          if (typeof floatingWorkspace !== 'undefined') {
            // Close all panels and restore content to original locations
            if (typeof floatingWorkspace.closeAllPanels === 'function') {
              floatingWorkspace.closeAllPanels({ skipSave: true });
            }

            // Call cleanup method to remove event listeners
            if (typeof floatingWorkspace.cleanup === 'function') {
              floatingWorkspace.cleanup();
            }

            // Remove workspace elements
            const workspaceCanvas = document.getElementById('workspaceCanvas');
            if (workspaceCanvas) workspaceCanvas.remove();

            const quickAccessBar = document.getElementById('quickAccessBar');
            if (quickAccessBar) quickAccessBar.remove();

            const zoomControls = document.getElementById('zoomControls');
            if (zoomControls) zoomControls.remove();

            const minimap = document.getElementById('workspaceMinimap');
            if (minimap) minimap.remove();

            const sidebarOverlay = document.getElementById('workspaceSidebarOverlay');
            if (sidebarOverlay) sidebarOverlay.remove();

            const radialMenu = document.getElementById('radialMenu');
            if (radialMenu) radialMenu.remove();

            const commandPalette = document.getElementById('commandPalette');
            if (commandPalette) commandPalette.remove();

            // Mark as not initialized
            floatingWorkspace.initialized = false;
          }

          // Show classic layout
          restoreClassicShell();

          // Restore last active panel in classic view
          const savedPanel = localStorage.getItem('activeClassicPanel') || 'chatPanel';
          if (typeof switchClassicPanel === 'function') {
            switchClassicPanel(savedPanel);
          } else {
            const chatPanel = document.getElementById('chatPanel');
            if (chatPanel) chatPanel.classList.add('active');
          }

        } else {
          // Switch to Floating Workspace
          body.classList.add('workspace-mode');
          localStorage.setItem('layout', 'workspace');
          setWorkflowsActive(false);

          // Update button
          const layoutIcon = document.getElementById('layoutIcon');
          const layoutText = document.getElementById('layoutText');
          if (layoutIcon) layoutIcon.textContent = '🎨';
          if (layoutText) layoutText.textContent = 'Workspace';

          // Initialize floating workspace
          if (typeof floatingWorkspace !== 'undefined') {
            if (!floatingWorkspace.initialized) {
              console.log('Initializing workspace from toggle...');
              floatingWorkspace.init();
              floatingWorkspace.initialized = true;
            } else {
              console.log('Workspace already initialized');
            }
          } else {
            console.error('floatingWorkspace not defined!');
          }
          maybeShowWorkspaceTemplateHint();
        }
        updateLayoutSwitch();
        closeWorkspaceMenu();
      }

      function setWorkflowsActive(isActive) {
        document.body.classList.toggle('workflows-active', Boolean(isActive));
      }

      window.setWorkflowsActive = setWorkflowsActive;

      // Switch between panels in classic view
      window.switchClassicPanel = function(panelId) {
        // Hide all panels
        document.querySelectorAll('.content-panel').forEach(panel => {
          panel.classList.remove('active');
          panel.style.display = 'none';
        });

        // Show selected panel
        const targetPanel = document.getElementById(panelId);
        if (targetPanel) {
          targetPanel.classList.add('active');
          targetPanel.style.display = 'flex';
          targetPanel.style.flexDirection = 'column';
          if (panelId === 'brainPanel' && typeof initBrainView === 'function') {
            initBrainView();
          }
        }

        setWorkflowsActive(panelId === 'workflowsPanel');

        if (panelId !== 'workflowsPanel') {
          closeAIBuilderIfOpen();
        }

        if (panelId === 'inspectorPanel' && typeof loadInspectorServers === 'function') {
          loadInspectorServers();
        }
        if (panelId === 'debuggerPanel' && typeof loadDebuggerWorkflows === 'function') {
          loadDebuggerWorkflows();
        }
        if (panelId === 'workflowsPanel' && typeof loadWorkflowsList === 'function') {
          loadWorkflowsList();
        }

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        const targetBtn = document.querySelector(`[data-panel="${panelId}"]`);
        if (targetBtn) {
          targetBtn.classList.add('active');
        }

        // Save active panel to localStorage
        localStorage.setItem('activeClassicPanel', panelId);
      };

      // Apply saved layout on load
      (function initLayout() {
        const savedLayout = localStorage.getItem('layout') || 'workspace';
        const body = document.body;
        const layoutIcon = document.getElementById('layoutIcon');
        const layoutText = document.getElementById('layoutText');

        if (savedLayout === 'workspace') {
          body.classList.add('workspace-mode');
          if (layoutIcon) layoutIcon.textContent = '🎨';
          if (layoutText) layoutText.textContent = 'Workspace';
          setWorkflowsActive(false);
          maybeShowWorkspaceTemplateHint();
        } else {
          body.classList.remove('workspace-mode');
          if (layoutIcon) layoutIcon.textContent = '📋';
          if (layoutText) layoutText.textContent = 'Classic';
          restoreClassicShell();

          // Restore last active panel in classic view
          const savedPanel = localStorage.getItem('activeClassicPanel') || 'chatPanel';
          setTimeout(() => switchClassicPanel(savedPanel), 100);
        }
        updateLayoutSwitch();
      })();

      function closeAIBuilderIfOpen() {
        const aiBuilder = document.getElementById('aiBuilderSidebar');
        if (!aiBuilder) return;
        aiBuilder.style.transform = 'translateX(100%)';
      }

      function restoreClassicShell() {
        const main = document.querySelector('.main');
        const sidebar = document.getElementById('sidebar');
        const tabNav = document.getElementById('tabNav');
        const chatContainer = document.querySelector('.chat-container');

        if (main) main.style.display = '';
        if (tabNav) tabNav.style.display = '';
        if (sidebar) {
          sidebar.style.display = '';
          sidebar.style.height = '';
          sidebar.classList.remove('collapsed');
          if (main && sidebar.parentElement !== main) {
            if (chatContainer && chatContainer.parentElement === main) {
              main.insertBefore(sidebar, chatContainer);
            } else {
              main.insertBefore(sidebar, main.firstChild);
            }
          }
        }

        closeAIBuilderIfOpen();
      }

      // ==========================================
      // CHAT BRAIN SPLIT VIEW
      // ==========================================

      function toggleBrainView() {
        const panel = document.getElementById('chatBrainPanel');
        const btn = document.getElementById('toggleBrainBtn');
        if (!panel) return;

        const isOpen = panel.dataset.open === 'true';
        if (isOpen) {
          panel.style.width = '0';
          panel.style.minWidth = '0';
          panel.dataset.open = 'false';
          if (btn) btn.setAttribute('aria-pressed', 'false');
        } else {
          panel.style.width = '35%';
          panel.style.minWidth = '280px';
          panel.dataset.open = 'true';
          if (btn) btn.setAttribute('aria-pressed', 'true');
          if (typeof initBrainView === 'function') {
            initBrainView();
          }
        }
      }

      function refreshBrainView() {
        if (typeof updateBrainGraph !== 'function') return;
        const messages = Array.from(document.querySelectorAll('#messages .message'));
        updateBrainGraph(messages);
      }

      // ==========================================
      // MODEL BADGE UPDATE
      // ==========================================

      async function updateModelBadge() {
        try {
          const response = await fetch('/api/llm/config', { credentials: 'include' });
          const config = await response.json();

          const providerEmojis = {
            ollama: '🦙',
            openai: '🤖',
            anthropic: '🎭',
            gemini: '💎',
            azure: '☁️',
            groq: '⚡',
            together: '🤝',
            openrouter: '🌐',
            custom: '🧩',
          };

          document.getElementById('modelProvider').textContent =
            providerEmojis[config.provider] || '🤖';
          document.getElementById('modelName').textContent = config.model || 'unknown';

          const workflowIconEl = document.getElementById('workflowModelIcon');
          const workflowNameEl = document.getElementById('workflowModelName');
          if (workflowIconEl && workflowNameEl) {
            workflowIconEl.textContent = providerEmojis[config.provider] || '🤖';
            workflowNameEl.textContent = config.model || 'unknown';
          }
        } catch (e) {
          console.error('Failed to update model badge:', e);
        }
      }

      // Update badge on page load
      updateModelBadge();

      // Update workflow toolbar model badge
      async function updateWorkflowModelBadge() {
        try {
          const response = await fetch('/api/llm/config', { credentials: 'include' });
          const config = await response.json();

          const providerEmojis = {
            ollama: '🦙',
            openai: '🤖',
            anthropic: '🎭',
            gemini: '💎',
            azure: '☁️',
            groq: '⚡',
            together: '🤝',
            openrouter: '🌐',
            custom: '🧩',
          };

          const iconEl = document.getElementById('workflowModelIcon');
          const nameEl = document.getElementById('workflowModelName');
          
          if (iconEl && nameEl) {
            iconEl.textContent = providerEmojis[config.provider] || '🤖';
            nameEl.textContent = config.model || 'unknown';
          }
        } catch (e) {
          console.error('Failed to update workflow model badge:', e);
          const iconEl = document.getElementById('workflowModelIcon');
          const nameEl = document.getElementById('workflowModelName');
          if (iconEl && nameEl) {
            iconEl.textContent = '🤖';
            nameEl.textContent = 'unknown';
          }
        }
      }

      // ==========================================

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          initStudioAssistant();
        });
      } else {
        initStudioAssistant();
      }

      window.toggleAssistant = toggleAssistant;
      window.toggleAssistantDock = toggleAssistantDock;
      window.toggleAssistantPopout = toggleAssistantPopout;
      window.toggleAssistantSize = toggleAssistantSize;
      window.startAssistantResize = startAssistantResize;
      window.clearAssistantChat = clearAssistantChat;
      window.showAssistantCommands = showAssistantCommands;
      window.sendAssistantMessage = sendAssistantMessage;
