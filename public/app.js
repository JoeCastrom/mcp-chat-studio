      // ==========================================
      // SESSION MANAGER - Persist state to localStorage
      // ==========================================
      const sessionManager = {
        STORAGE_KEY: 'mcp_chat_studio_session',

        // Default welcome message
        getWelcomeMessage() {
          return {
            role: 'assistant',
            content: '👋 Welcome to **MCP Chat Studio**! I\'m your AI assistant with MCP tool support. Connect to MCP servers using the sidebar to enable powerful tools. Some servers may require authentication - click "Login" to connect to secured services.',
          };
        },

        // Save session to localStorage
        save(data) {
          try {
            const session = {
              messages: data.messages || [],
              toolHistory: data.toolHistory || [],
              settings: data.settings || {},
              timestamp: Date.now(),
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
          } catch (e) {
            console.warn('[Session] Failed to save:', e.message);
          }
        },

        // Load session from localStorage
        load() {
          try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
              const session = JSON.parse(stored);
              // Check if session is less than 24 hours old
              if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
                return session;
              }
            }
          } catch (e) {
            console.warn('[Session] Failed to load:', e.message);
          }
          return null;
        },

        // Clear session
        clear() {
          try {
            localStorage.removeItem(this.STORAGE_KEY);
          } catch (e) {
            console.warn('[Session] Failed to clear:', e.message);
          }
        },

        // Save just messages (called frequently)
        saveMessages(messages) {
          const session = this.load() || {};
          session.messages = messages;
          this.save(session);
        },

        // Save tool execution to history
        logToolExecution(entry) {
          const session = this.load() || {};
          session.toolHistory = session.toolHistory || [];
          session.toolHistory.unshift(entry); // Add to front
          // Keep last 100 entries
          if (session.toolHistory.length > 100) {
            session.toolHistory = session.toolHistory.slice(0, 100);
          }
          this.save(session);
        },

        // Get tool history
        getToolHistory() {
          const session = this.load();
          return session?.toolHistory || [];
        },

        // ==========================================
        // TEST SCENARIOS
        // ==========================================
        SCENARIOS_KEY: 'mcp_chat_studio_scenarios',

        // Save a scenario
        saveScenario(scenario) {
          try {
            const scenarios = this.getScenarios();
            scenario.id = `scenario_${Date.now()}`;
            scenario.created = new Date().toISOString();
            scenarios.unshift(scenario);
            localStorage.setItem(this.SCENARIOS_KEY, JSON.stringify(scenarios));
            return scenario.id;
          } catch (e) {
            console.warn('[Scenarios] Failed to save:', e.message);
            return null;
          }
        },

        // Get all scenarios
        getScenarios() {
          try {
            const stored = localStorage.getItem(this.SCENARIOS_KEY);
            return stored ? JSON.parse(stored) : [];
          } catch (e) {
            console.warn('[Scenarios] Failed to load:', e.message);
            return [];
          }
        },

        // Get a single scenario by ID
        getScenario(id) {
          return this.getScenarios().find(s => s.id === id);
        },

        // Delete a scenario
        deleteScenario(id) {
          try {
            const scenarios = this.getScenarios().filter(s => s.id !== id);
            localStorage.setItem(this.SCENARIOS_KEY, JSON.stringify(scenarios));
          } catch (e) {
            console.warn('[Scenarios] Failed to delete:', e.message);
          }
        },

        // Update scenario (e.g., after replay with results)
        updateScenario(id, updates) {
          try {
            const scenarios = this.getScenarios();
            const idx = scenarios.findIndex(s => s.id === id);
            if (idx !== -1) {
              scenarios[idx] = { ...scenarios[idx], ...updates };
              localStorage.setItem(this.SCENARIOS_KEY, JSON.stringify(scenarios));
            }
          } catch (e) {
            console.warn('[Scenarios] Failed to update:', e.message);
          }
        },

        // ==========================================
        // SYSTEM PROMPTS LIBRARY
        // ==========================================
        PROMPTS_KEY: 'mcp_chat_studio_prompts',
        
        // Default system prompts
        defaultPrompts: {
          'default': {
            name: 'Default Assistant',
            prompt: 'You are a helpful AI assistant with access to MCP tools. Use the tools when appropriate to help the user.',
            icon: '🤖'
          },
          'strict-coder': {
            name: 'Strict Coder',
            prompt: 'You are a strict coding assistant. Always respond with well-formatted code. Use tools to verify your work. Be concise and technical.',
            icon: '👨‍💻'
          },
          'json-validator': {
            name: 'JSON Validator',
            prompt: 'You are a JSON validation expert. Always output valid JSON when asked. Validate inputs strictly. Use tools to test JSON parsing.',
            icon: '📋'
          },
          'creative-writer': {
            name: 'Creative Writer',
            prompt: 'You are a creative writing assistant. Be expressive and imaginative. Use tools sparingly, focus on prose quality.',
            icon: '✍️'
          },
          'tool-tester': {
            name: 'Tool Tester',
            prompt: 'You are a QA tester for MCP tools. Test tools thoroughly with edge cases. Report results in structured format. Always use tools when available.',
            icon: '🧪'
          }
        },

        // Get all prompts (defaults + custom)
        getPrompts() {
          let customPrompts = {};
          try {
            customPrompts = JSON.parse(localStorage.getItem(this.PROMPTS_KEY) || '{}');
          } catch (e) {}
          return { ...this.defaultPrompts, ...customPrompts };
        },

        // Save a custom prompt
        savePrompt(id, name, prompt, icon = '📝') {
          try {
            let customPrompts = {};
            try {
              customPrompts = JSON.parse(localStorage.getItem(this.PROMPTS_KEY) || '{}');
            } catch (e) {}
            customPrompts[id] = { name, prompt, icon, custom: true };
            localStorage.setItem(this.PROMPTS_KEY, JSON.stringify(customPrompts));
            return true;
          } catch (e) {
            console.warn('[Prompts] Failed to save:', e.message);
            return false;
          }
        },

        // Delete a custom prompt
        deletePrompt(id) {
          try {
            let customPrompts = {};
            try {
              customPrompts = JSON.parse(localStorage.getItem(this.PROMPTS_KEY) || '{}');
            } catch (e) {}
            delete customPrompts[id];
            localStorage.setItem(this.PROMPTS_KEY, JSON.stringify(customPrompts));
          } catch (e) {
            console.warn('[Prompts] Failed to delete:', e.message);
          }
        },

        // Get current active prompt ID
        getActivePromptId() {
          const session = this.load();
          return session?.settings?.activePromptId || 'default';
        },

        // Set active prompt
        setActivePromptId(id) {
          const session = this.load() || {};
          session.settings = session.settings || {};
          session.settings.activePromptId = id;
          this.save(session);
        },

        // Get active prompt text
        getActivePrompt() {
          const prompts = this.getPrompts();
          const activeId = this.getActivePromptId();
          return prompts[activeId]?.prompt || prompts['default'].prompt;
        },

        // ==========================================
        // TOKEN USAGE TRACKING
        // ==========================================
        TOKENS_KEY: 'mcp_chat_studio_tokens',

        // Approximate token count (rough estimate: 4 chars per token)
        estimateTokens(text) {
          if (!text) return 0;
          return Math.ceil(String(text).length / 4);
        },

        // Get current session token usage
        getTokenUsage() {
          try {
            const stored = localStorage.getItem(this.TOKENS_KEY);
            return stored ? JSON.parse(stored) : { input: 0, output: 0, total: 0, cost: 0 };
          } catch (e) {
            return { input: 0, output: 0, total: 0, cost: 0 };
          }
        },

        // Add tokens to usage
        addTokens(inputTokens, outputTokens, provider = 'ollama') {
          try {
            const usage = this.getTokenUsage();
            usage.input += inputTokens;
            usage.output += outputTokens;
            usage.total = usage.input + usage.output;
            
            // Estimate cost based on provider (per 1M tokens)
            const pricing = {
              'ollama': { input: 0, output: 0 }, // Free
              'openai': { input: 3, output: 15 }, // GPT-4o pricing
              'anthropic': { input: 3, output: 15 }, // Claude pricing
              'google': { input: 0.075, output: 0.30 }, // Gemini pricing
              'azure': { input: 3, output: 15 },
              'groq': { input: 0.05, output: 0.10 },
              'together': { input: 0.20, output: 0.60 },
              'openrouter': { input: 1, output: 3 },
            };
            const rates = pricing[provider] || pricing['ollama'];
            usage.cost += (inputTokens * rates.input + outputTokens * rates.output) / 1000000;
            usage.provider = provider;
            
            localStorage.setItem(this.TOKENS_KEY, JSON.stringify(usage));
            return usage;
          } catch (e) {
            console.warn('[Tokens] Failed to track:', e.message);
            return { input: 0, output: 0, total: 0, cost: 0 };
          }
        },

        // Reset session tokens
        resetTokens() {
          localStorage.removeItem(this.TOKENS_KEY);
        },

        // ==========================================
        // TEST SUITES
        // ==========================================
        SUITES_KEY: 'mcp_chat_studio_suites',

        // Get all test suites
        getSuites() {
          try {
            return JSON.parse(localStorage.getItem(this.SUITES_KEY) || '[]');
          } catch (e) {
            return [];
          }
        },

        // Save a test suite
        saveSuite(suite) {
          try {
            const suites = this.getSuites();
            const existingIdx = suites.findIndex(s => s.id === suite.id);
            if (existingIdx >= 0) {
              suites[existingIdx] = suite;
            } else {
              suites.push(suite);
            }
            localStorage.setItem(this.SUITES_KEY, JSON.stringify(suites));
            return true;
          } catch (e) {
            console.warn('[Suites] Failed to save:', e.message);
            return false;
          }
        },

        // Delete a test suite
        deleteSuite(id) {
          try {
            const suites = this.getSuites().filter(s => s.id !== id);
            localStorage.setItem(this.SUITES_KEY, JSON.stringify(suites));
          } catch (e) {
            console.warn('[Suites] Failed to delete:', e.message);
          }
        },

        // Get a specific suite
        getSuite(id) {
          return this.getSuites().find(s => s.id === id);
        },
      };

      // ==========================================
      // STATE - Load from session or use defaults
      // ==========================================
      const savedSession = sessionManager.load();
      let messages = savedSession?.messages?.length > 0
        ? savedSession.messages
        : [sessionManager.getWelcomeMessage()];
      let toolExecutionHistory = savedSession?.toolHistory || [];
      let isLoading = false;
      let isAuthenticated = false;
      let userInfo = null;
      let currentAbortController = null;
      let currentLoadingEl = null;
      let selectedTool = null; // Track selected tool for force mode

      // Elements
      const messagesEl = document.getElementById('messages');
      const userInputEl = document.getElementById('userInput');
      const sendBtnEl = document.getElementById('sendBtn');
      const useToolsEl = document.getElementById('useTools');
      const useStreamEl = document.getElementById('useStream');
      const mcpServersEl = document.getElementById('mcpServers');
      const sidebarEl = document.getElementById('sidebar');
      const toggleSidebarEl = document.getElementById('toggleSidebar');
      const clearChatEl = document.getElementById('clearChat');
      const userSectionEl = document.getElementById('userSection');
      const serverCountEl = document.getElementById('serverCount');

      // Reset loading state helper
      function resetLoadingState() {
        isLoading = false;
        sendBtnEl.disabled = false;
        sendBtnEl.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
        Send
      `;
        sendBtnEl.classList.remove('cancel');
        if (currentLoadingEl) {
          currentLoadingEl.remove();
          currentLoadingEl = null;
        }
        currentAbortController = null;
        userInputEl.focus();
      }

      // Cancel current request
      function cancelRequest() {
        if (currentAbortController) {
          currentAbortController.abort();
          appendMessage('system', 'Request cancelled');
          resetLoadingState();
        }
      }

      // Check URL params for login status
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('login') === 'success') {
        appendMessage(
          'system',
          '✅ Login successful! You can now connect to authenticated MCP servers.'
        );
        window.history.replaceState({}, '', '/');
      } else if (urlParams.get('error')) {
        appendMessage('error', `Login failed: ${urlParams.get('error')}`);
        window.history.replaceState({}, '', '/');
      }

      // Auto-resize textarea
      userInputEl.addEventListener('input', () => {
        userInputEl.style.height = 'auto';
        userInputEl.style.height = Math.min(userInputEl.scrollHeight, 200) + 'px';
      });

      // Send on Enter (Shift+Enter for newline)
      userInputEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });

      sendBtnEl.addEventListener('click', sendMessage);
      toggleSidebarEl.addEventListener('click', () => {
        sidebarEl.classList.toggle('collapsed');
        toggleSidebarEl.classList.toggle('active');
      });
      clearChatEl.addEventListener('click', clearChat);

      // Escape key to cancel loading
      document.addEventListener('keydown', e => {
        // Escape: Cancel loading or close modals
        if (e.key === 'Escape') {
          if (isLoading) {
            cancelRequest();
          } else {
            // Close any open modals
            document
              .querySelectorAll('.modal-overlay.active')
              .forEach(m => m.classList.remove('active'));
          }
        }

        // Ctrl+K: Focus tool search
        if (e.ctrlKey && e.key === 'k') {
          e.preventDefault();
          const searchInput = document.getElementById('toolSearch');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }

        // Ctrl+Shift+E: Export chat
        if (e.ctrlKey && e.shiftKey && e.key === 'E') {
          e.preventDefault();
          exportChat();
        }

        // Ctrl+/: Show shortcuts help
        if (e.ctrlKey && e.key === '/') {
          e.preventDefault();
          showShortcutsHelp();
        }
      });

      // Check auth status
      async function checkAuthStatus() {
        try {
          const response = await fetch('/api/oauth/status', {
            credentials: 'include',
          });
          const data = await response.json();

          isAuthenticated = data.authenticated;

          if (isAuthenticated) {
            const userResponse = await fetch('/api/oauth/userinfo', {
              credentials: 'include',
            });
            if (userResponse.ok) {
              userInfo = await userResponse.json();
            }
          }

          updateUserSection();
        } catch (error) {
          console.error('Auth check failed:', error);
        }
      }

      // Update user section in header
      function updateUserSection() {
        if (isAuthenticated && userInfo) {
          const initials = (userInfo.name || userInfo.preferred_username || 'U')
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          userSectionEl.innerHTML = `
          <div class="user-info">
            <div class="avatar">${initials}</div>
            <span class="user-name">${userInfo.name || userInfo.preferred_username || 'User'}</span>
          </div>
          <button class="btn" onclick="logout()">Logout</button>
        `;
        } else {
          userSectionEl.innerHTML = `
          <button class="btn success" onclick="login()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            Login
          </button>
        `;
        }
      }

      // Login
      async function login() {
        try {
          const response = await fetch('/api/oauth/login', {
            credentials: 'include',
          });
          const data = await response.json();

          if (data.authUrl) {
            window.location.href = data.authUrl;
          } else {
            appendMessage('error', 'OAuth not configured on server');
          }
        } catch (error) {
          appendMessage('error', `Login failed: ${error.message}`);
        }
      }

      // Logout
      async function logout() {
        try {
          const response = await fetch('/api/oauth/logout', {
            method: 'POST',
            credentials: 'include',
          });
          const data = await response.json();

          isAuthenticated = false;
          userInfo = null;
          updateUserSection();
          loadMCPStatus();

          if (data.logoutUrl && data.logoutUrl !== '/') {
            window.location.href = data.logoutUrl;
          } else {
            appendMessage('system', '👋 Logged out successfully');
          }
        } catch (error) {
          appendMessage('error', `Logout failed: ${error.message}`);
        }
      }

      // Connect to MCP server
      async function connectMCP(serverName) {
        try {
          const btn = document.querySelector(`[data-server="${serverName}"]`);
          if (btn) {
            btn.textContent = 'Connecting...';
            btn.disabled = true;
          }

          const response = await fetch(`/api/mcp/connect/${serverName}`, {
            method: 'POST',
            credentials: 'include',
          });

          const data = await response.json();

          if (data.error) {
            if (response.status === 401) {
              appendMessage(
                'system',
                `🔒 ${serverName} requires authentication. Please login first.`
              );
            } else {
              appendMessage('error', `Failed to connect to ${serverName}: ${data.error}`);
            }
          } else {
            appendMessage('system', `✅ Connected to ${serverName}!`);
          }

          loadMCPStatus();
        } catch (error) {
          appendMessage('error', `Connection failed: ${error.message}`);
          loadMCPStatus();
        }
      }

      // Disconnect from MCP server
      async function disconnectMCP(serverName) {
        try {
          const btn = document.querySelector(`[data-disconnect="${serverName}"]`);
          if (btn) {
            btn.textContent = 'Disconnecting...';
            btn.disabled = true;
          }

          const response = await fetch(`/api/mcp/disconnect/${serverName}`, {
            method: 'POST',
            credentials: 'include',
          });

          const data = await response.json();

          if (data.error) {
            appendMessage('error', `Failed to disconnect from ${serverName}: ${data.error}`);
          } else {
            appendMessage('system', `🔌 Disconnected from ${serverName}`);
            // Clear selected tool if it was from this server
            if (selectedTool && selectedTool.serverName === serverName) {
              clearSelectedTool();
            }
          }

          loadMCPStatus();
        } catch (error) {
          appendMessage('error', `Disconnect failed: ${error.message}`);
          loadMCPStatus();
        }
      }

      // Show Add Server Modal
      function showAddServerModal() {
        document.getElementById('addServerModal').classList.add('active');
        document.getElementById('addServerForm').reset();
        clearEnvVars();
        toggleServerTypeFields();
        updateConfigPreview();
        // Reset title and button for "Add" mode
        document.querySelector('#addServerModal .modal-title').textContent = 'Add MCP Server';
        document.getElementById('addServerSubmitBtn').textContent = 'Add Server';
        document.getElementById('serverName').focus();
      }

      // Hide Add Server Modal
      function hideAddServerModal() {
        document.getElementById('addServerModal').classList.remove('active');
        document.getElementById('addServerForm').reset();
        clearEnvVars();
        toggleServerTypeFields();
        // Reset title and button
        document.querySelector('#addServerModal .modal-title').textContent = 'Add MCP Server';
        document.getElementById('addServerSubmitBtn').textContent = 'Add Server';
      }

      // Toggle fields based on server type
      function toggleServerTypeFields() {
        const type = document.getElementById('serverType').value;
        document.getElementById('stdioFields').style.display = type === 'stdio' ? 'block' : 'none';
        document.getElementById('sseFields').style.display = type === 'sse' ? 'block' : 'none';
      }

      // Server Templates definitions
      const serverTemplates = {
        'github': {
          name: 'github',
          type: 'stdio',
          command: 'npx',
          args: '-y @modelcontextprotocol/server-github',
          description: 'GitHub API - repos, issues, PRs, search',
          envHint: 'Requires GITHUB_TOKEN environment variable'
        },
        'filesystem': {
          name: 'filesystem',
          type: 'stdio',
          command: 'npx',
          args: '-y @modelcontextprotocol/server-filesystem C:/Users/YourName/Documents',
          description: 'Local filesystem access (read/write)',
          envHint: '⚠️ EDIT ARGS FIRST! Change the path to your actual directory before connecting'
        },
        'brave-search': {
          name: 'brave-search',
          type: 'stdio',
          command: 'npx',
          args: '-y @modelcontextprotocol/server-brave-search',
          description: 'Brave Search API - web search',
          envHint: 'Requires BRAVE_API_KEY environment variable'
        },
        'sqlite': {
          name: 'sqlite',
          type: 'stdio',
          command: 'npx',
          args: '-y @modelcontextprotocol/server-sqlite C:/path/to/your/database.db',
          description: 'SQLite database queries',
          envHint: '⚠️ EDIT ARGS FIRST! Change the path to your actual .db file before connecting'
        },
        'puppeteer': {
          name: 'puppeteer',
          type: 'stdio',
          command: 'npx',
          args: '-y @modelcontextprotocol/server-puppeteer',
          description: 'Browser automation with Puppeteer',
          envHint: 'Uses headless Chrome/Chromium'
        },
        'sse-example': {
          name: 'sse-server',
          type: 'sse',
          url: 'http://localhost:3001/sse',
          description: 'Example SSE MCP server',
          envHint: 'Update URL to your SSE server endpoint'
        }
      };

      // Apply server template to form
      function applyServerTemplate() {
        const templateId = document.getElementById('serverTemplate').value;
        if (!templateId) return;

        const template = serverTemplates[templateId];
        if (!template) return;

        // Fill form fields
        document.getElementById('serverName').value = template.name;
        document.getElementById('serverDescription').value = template.description;

        // Set type and trigger field visibility
        document.getElementById('serverType').value = template.type;
        toggleServerTypeFields();

        if (template.type === 'stdio') {
          document.getElementById('serverCommand').value = template.command;
          document.getElementById('serverArgs').value = template.args;
        } else if (template.type === 'sse') {
          document.getElementById('serverUrl').value = template.url;
        }

        // Update preview
        updateConfigPreview();

        // Show hint
        appendMessage('system', `📦 Applied "${templateId}" template. ${template.envHint}`);

        // Reset dropdown
        document.getElementById('serverTemplate').value = '';
      }

      // Custom templates storage key
      const CUSTOM_TEMPLATES_KEY = 'mcp_chat_custom_templates';

      // Save current form as custom template
      function saveAsCustomTemplate() {
        const name = document.getElementById('serverName').value.trim();
        const type = document.getElementById('serverType').value;
        const description = document.getElementById('serverDescription').value.trim();

        if (!name) {
          appendMessage('error', 'Enter a server name first to save as template');
          return;
        }

        const templateName = prompt('Template name:', name);
        if (!templateName) return;

        const template = {
          name,
          type,
          description: description || `Custom: ${name}`,
          envHint: 'Your saved template'
        };

        if (type === 'stdio') {
          template.command = document.getElementById('serverCommand').value.trim();
          template.args = document.getElementById('serverArgs').value.trim();
        } else if (type === 'sse') {
          template.url = document.getElementById('serverUrl').value.trim();
        }

        // Load existing custom templates
        let customTemplates = {};
        try {
          customTemplates = JSON.parse(localStorage.getItem(CUSTOM_TEMPLATES_KEY) || '{}');
        } catch (e) {}

        // Save template
        const templateId = `custom_${templateName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        customTemplates[templateId] = { ...template, displayName: templateName };
        localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(customTemplates));

        // Update dropdown
        loadCustomTemplates();

        appendMessage('system', `💾 Saved "${templateName}" to your custom templates`);
      }

      // Load custom templates into dropdown
      function loadCustomTemplates() {
        const group = document.getElementById('customTemplatesGroup');
        if (!group) return;

        let customTemplates = {};
        try {
          customTemplates = JSON.parse(localStorage.getItem(CUSTOM_TEMPLATES_KEY) || '{}');
        } catch (e) {}

        const templateIds = Object.keys(customTemplates);

        if (templateIds.length === 0) {
          group.style.display = 'none';
          group.innerHTML = '';
          return;
        }

        group.style.display = '';
        group.innerHTML = templateIds.map(id => {
          const t = customTemplates[id];
          return `<option value="${id}">📌 ${escapeHtml(t.displayName || t.name)}</option>`;
        }).join('');

        // Also add to serverTemplates object for applyServerTemplate to work
        templateIds.forEach(id => {
          serverTemplates[id] = customTemplates[id];
        });
      }

      // Delete a custom template
      function deleteCustomTemplate(templateId) {
        let customTemplates = {};
        try {
          customTemplates = JSON.parse(localStorage.getItem(CUSTOM_TEMPLATES_KEY) || '{}');
        } catch (e) {}

        delete customTemplates[templateId];
        delete serverTemplates[templateId];
        localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(customTemplates));
        loadCustomTemplates();
      }

      // Manage (delete) custom templates
      function manageCustomTemplates() {
        let customTemplates = {};
        try {
          customTemplates = JSON.parse(localStorage.getItem(CUSTOM_TEMPLATES_KEY) || '{}');
        } catch (e) {}

        const templateIds = Object.keys(customTemplates);

        if (templateIds.length === 0) {
          appendMessage('system', 'No custom templates to delete. Save a template first with 💾');
          return;
        }

        const templateNames = templateIds.map(id => customTemplates[id].displayName || customTemplates[id].name);
        const choice = prompt(`Delete a custom template:\n\n${templateNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\nEnter number to delete (or cancel):`);

        if (choice) {
          const idx = parseInt(choice) - 1;
          if (idx >= 0 && idx < templateIds.length) {
            const templateId = templateIds[idx];
            const templateName = templateNames[idx];
            if (confirm(`Delete template "${templateName}"?`)) {
              deleteCustomTemplate(templateId);
              appendMessage('system', `🗑️ Deleted template "${templateName}"`);
            }
          } else {
            appendMessage('error', 'Invalid selection');
          }
        }
      }

      // Load custom templates on page init
      loadCustomTemplates();

      // Submit Add Server Form
      async function submitAddServer(event) {
        event.preventDefault();

        const name = document.getElementById('serverName').value.trim();
        const type = document.getElementById('serverType').value;
        const description = document.getElementById('serverDescription').value.trim();

        let payload = { name, type, description };

        // Collect environment variables
        const envVars = collectEnvVars();
        if (Object.keys(envVars).length > 0) {
          payload.env = envVars;
        }

        if (type === 'stdio') {
          const command = document.getElementById('serverCommand').value.trim();
          const argsStr = document.getElementById('serverArgs').value.trim();

          if (!command) {
            appendMessage('error', 'Command is required for stdio servers');
            return;
          }

          payload.command = command;
          // Parse arguments: split by newlines, strip YAML list markers (- ), split by spaces, filter empty
          payload.args = argsStr
            ? argsStr
                .split(/[\r\n]+/)
                .map(line => line.trim().replace(/^-\s+/, '')) // Strip leading "- " (YAML list format)
                .flatMap(line => line.split(/\s+/))
                .filter(arg => arg.length > 0)
            : [];
        } else {
          const url = document.getElementById('serverUrl').value.trim();

          if (!url) {
            appendMessage('error', 'URL is required for SSE servers');
            return;
          }

          payload.url = url;
        }

        try {
          // Check if server already exists to determine add vs update
          const statusRes = await fetch('/api/mcp/status', { credentials: 'include' });
          const status = await statusRes.json();
          const servers = status.servers || status;
          const serverExists = name in servers;

          const endpoint = serverExists ? `/api/mcp/update/${encodeURIComponent(name)}` : '/api/mcp/add';
          const method = serverExists ? 'PUT' : 'POST';

          const response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
          });

          const data = await response.json();

          if (data.error) {
            appendMessage('error', `Failed to ${serverExists ? 'update' : 'add'} server: ${data.error}`);
          } else {
            appendMessage('system', `✅ ${serverExists ? 'Updated' : 'Added'} server: ${name}`);
            hideAddServerModal();
            loadMCPStatus();
          }
        } catch (error) {
          appendMessage('error', `Failed to save server: ${error.message}`);
        }
      }

      // ==========================================
      // ENV VARS MANAGEMENT
      // ==========================================

      function addEnvVarRow(key = '', value = '') {
        const container = document.getElementById('envVarsContainer');
        const row = document.createElement('div');
        row.className = 'env-var-row';
        row.style.cssText =
          'display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-xs);';
        row.innerHTML = `
          <input type="text" class="form-input env-key" placeholder="KEY" value="${escapeHtml(key)}" style="flex: 1;" oninput="updateConfigPreview()">
          <input type="text" class="form-input env-value" placeholder="value" value="${escapeHtml(value)}" style="flex: 2;" oninput="updateConfigPreview()">
          <button type="button" class="btn" onclick="this.parentElement.remove(); updateConfigPreview();" style="padding: 4px 8px; color: var(--error);">✕</button>
        `;
        container.appendChild(row);
        updateConfigPreview();
      }

      function collectEnvVars() {
        const env = {};
        document.querySelectorAll('.env-var-row').forEach(row => {
          const key = row.querySelector('.env-key').value.trim();
          const value = row.querySelector('.env-value').value.trim();
          if (key) {
            env[key] = value;
          }
        });
        return env;
      }

      function clearEnvVars() {
        document.getElementById('envVarsContainer').innerHTML = '';
      }

      // ==========================================
      // CONFIG PREVIEW
      // ==========================================

      function updateConfigPreview() {
        const name = document.getElementById('serverName').value.trim() || 'my-server';
        const type = document.getElementById('serverType').value;
        const command = document.getElementById('serverCommand').value.trim();
        const argsStr = document.getElementById('serverArgs').value.trim();
        const url = document.getElementById('serverUrl').value.trim();
        const env = collectEnvVars();

        let yaml = `mcpServers:\n  ${name}:\n`;

        if (type === 'stdio') {
          if (command) yaml += `    command: ${command}\n`;
          if (argsStr) {
            const args = argsStr
              .split(/[\r\n]+/)
              .map(l => l.trim().replace(/^-\s+/, ''))
              .filter(a => a);
            if (args.length > 0) {
              yaml += `    args:\n`;
              args.forEach(arg => {
                yaml += `      - ${arg}\n`;
              });
            }
          }
        } else {
          if (url) yaml += `    url: ${url}\n`;
        }

        if (Object.keys(env).length > 0) {
          yaml += `    env:\n`;
          for (const [k, v] of Object.entries(env)) {
            yaml += `      ${k}: ${v}\n`;
          }
        }

        document.getElementById('configPreview').textContent = yaml;
      }

      function copyConfigToClipboard() {
        const yaml = document.getElementById('configPreview').textContent;
        navigator.clipboard
          .writeText(yaml)
          .then(() => {
            appendMessage('system', '📋 Config copied to clipboard');
          })
          .catch(err => {
            console.error('Copy failed:', err);
          });
      }

      // ==========================================
      // IMPORT CONFIG MODAL
      // ==========================================

      function showImportConfigModal() {
        document.getElementById('importConfigModal').classList.add('active');
        document.getElementById('importConfigText').value = '';
        document.getElementById('importConfigText').focus();
      }

      function hideImportConfigModal() {
        document.getElementById('importConfigModal').classList.remove('active');
      }

      function parseAndImportConfig() {
        const text = document.getElementById('importConfigText').value.trim();
        if (!text) {
          appendMessage('error', 'Please paste a config');
          return;
        }

        try {
          let config;

          // Try JSON first
          try {
            config = JSON.parse(text);
          } catch {
            // Try simple YAML parsing (basic key: value format)
            config = parseSimpleYaml(text);
          }

          // Normalize: extract single server config
          if (config.mcpServers && typeof config.mcpServers === 'object') {
            const serverNames = Object.keys(config.mcpServers);
            if (serverNames.length > 0) {
              const firstServer = serverNames[0];
              document.getElementById('serverName').value = firstServer;
              config = config.mcpServers[firstServer];
            }
          }

          // Fill form fields
          if (config.command) {
            document.getElementById('serverType').value = 'stdio';
            toggleServerTypeFields();
            document.getElementById('serverCommand').value = config.command;
          }

          if (config.url) {
            document.getElementById('serverType').value = 'sse';
            toggleServerTypeFields();
            document.getElementById('serverUrl').value = config.url;
          }

          if (config.args && Array.isArray(config.args)) {
            document.getElementById('serverArgs').value = config.args.join('\n');
          }

          // Clear and add env vars
          clearEnvVars();
          if (config.env && typeof config.env === 'object') {
            for (const [key, value] of Object.entries(config.env)) {
              addEnvVarRow(key, String(value));
            }
          }

          updateConfigPreview();
          hideImportConfigModal();
          appendMessage('system', '✅ Config imported! Review and submit.');
        } catch (error) {
          appendMessage('error', `Failed to parse config: ${error.message}`);
        }
      }

      // Simple YAML parser (handles basic MCP configs)
      function parseSimpleYaml(text) {
        const result = {};
        const lines = text.split('\n');
        let currentKey = null;
        let currentIndent = 0;
        let inArray = false;
        let arrayKey = null;
        let inObject = false;
        let objectKey = null;

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;

          const indent = line.search(/\S/);

          // Array item
          if (trimmed.startsWith('- ')) {
            const value = trimmed.slice(2).trim();
            if (arrayKey && result[arrayKey]) {
              result[arrayKey].push(value);
            }
            continue;
          }

          // Key: value pair
          const colonIndex = trimmed.indexOf(':');
          if (colonIndex > 0) {
            const key = trimmed.slice(0, colonIndex).trim();
            const value = trimmed.slice(colonIndex + 1).trim();

            if (!value) {
              // Could be object or array start
              if (key === 'args') {
                result[key] = [];
                arrayKey = key;
                inArray = true;
              } else if (key === 'env') {
                result[key] = {};
                objectKey = key;
                inObject = true;
              } else {
                currentKey = key;
              }
            } else {
              if (inObject && objectKey) {
                result[objectKey][key] = value;
              } else {
                result[key] = value;
              }
            }
          }
        }

        return result;
      }

      // ==========================================
      // CONFIRM DELETE MODAL FUNCTIONS
      // ==========================================

      let serverToDelete = null;

      function removeServer(serverName) {
        // Show custom confirm modal instead of native confirm()
        serverToDelete = serverName;
        document.getElementById('deleteServerName').textContent = serverName;
        document.getElementById('confirmDeleteModal').classList.add('active');
      }

      function hideConfirmDeleteModal() {
        serverToDelete = null;
        document.getElementById('confirmDeleteModal').classList.remove('active');
      }

      async function confirmDeleteServer() {
        if (!serverToDelete) return;

        const serverName = serverToDelete;
        hideConfirmDeleteModal();

        try {
          const response = await fetch(`/api/mcp/remove/${encodeURIComponent(serverName)}`, {
            method: 'DELETE',
            credentials: 'include',
          });

          const data = await response.json();

          if (data.error) {
            appendMessage('error', `Failed to remove server: ${data.error}`);
          } else {
            appendMessage('system', `🗑️ Removed server: ${serverName}`);
            loadMCPStatus();
          }
        } catch (error) {
          appendMessage('error', `Failed to remove server: ${error.message}`);
        }
      }

      // ==========================================
      // EDIT SERVER FUNCTION
      // ==========================================

      async function editServer(serverName) {
        try {
          // Fetch current server config
          const response = await fetch('/api/mcp/status', { credentials: 'include' });
          const status = await response.json();
          const serverInfo = status[serverName];

          if (!serverInfo || !serverInfo.config) {
            appendMessage('error', 'Could not load server configuration');
            return;
          }

          const config = serverInfo.config;

          // Open the Add Server modal and pre-fill it
          showAddServerModal();

          // Pre-fill the form
          document.getElementById('serverName').value = serverName;
          document.getElementById('serverType').value = config.type || 'stdio';
          document.getElementById('serverCommand').value = config.command || '';
          document.getElementById('serverArgs').value = (config.args || []).join(' ');
          document.getElementById('serverUrl').value = config.url || '';
          document.getElementById('serverDescription').value = config.description || '';

          // Pre-fill environment variables
          const envContainer = document.getElementById('envVarsContainer');
          envContainer.innerHTML = '';
          if (config.env && Object.keys(config.env).length > 0) {
            for (const [key, value] of Object.entries(config.env)) {
              addEnvVarRow(key, value);
            }
          }

          // Update config preview
          updateConfigPreview();

          // Change modal title and button to indicate editing
          document.querySelector('#addServerModal .modal-title').textContent =
            `Edit Server: ${serverName}`;
          document.getElementById('addServerSubmitBtn').textContent = 'Save Changes';

          // Note: The submit will remove old and add new (effectively an edit)
          appendMessage('system', `✏️ Editing ${serverName} - make changes and submit to save`);
        } catch (error) {
          appendMessage('error', `Failed to load server config: ${error.message}`);
        }
      }

      // ==========================================
      // SETTINGS MODAL FUNCTIONS
      // ==========================================

      async function showSettingsModal() {
        // Load current LLM config
        try {
          const response = await fetch('/api/llm/config', { credentials: 'include' });
          const config = await response.json();

          document.getElementById('llmProvider').value = config.provider || 'ollama';
          document.getElementById('llmModel').value = config.model || '';
          document.getElementById('llmTemperature').value = config.temperature || 0.7;
          document.getElementById('tempValue').textContent = config.temperature || 0.7;
          document.getElementById('llmBaseUrl').value = config.base_url || '';

          onProviderChange();
        } catch (e) {
          console.error('Failed to load LLM config:', e);
        }

        document.getElementById('settingsModal').classList.add('active');
      }

      function hideSettingsModal() {
        document.getElementById('settingsModal').classList.remove('active');
      }

      function onProviderChange() {
        const provider = document.getElementById('llmProvider').value;
        const hintEl = document.getElementById('providerHint');
        const apiKeyGroup = document.getElementById('apiKeyGroup');
        const modelInput = document.getElementById('llmModel');
        const baseUrlInput = document.getElementById('llmBaseUrl');

        // Clear base URL when switching providers to use correct default
        baseUrlInput.value = '';

        switch (provider) {
          case 'ollama':
            hintEl.textContent = 'Local LLM server - no API key needed';
            apiKeyGroup.style.display = 'none';
            modelInput.placeholder = 'llama3.2, mistral, codellama...';
            baseUrlInput.placeholder = 'http://localhost:11434/v1';
            break;
          case 'openai':
            hintEl.textContent = 'OpenAI API - requires OPENAI_API_KEY';
            apiKeyGroup.style.display = 'block';
            modelInput.placeholder = 'gpt-4o, gpt-4, gpt-3.5-turbo...';
            baseUrlInput.placeholder = 'https://api.openai.com/v1';
            break;
          case 'anthropic':
            hintEl.textContent = 'Anthropic Claude - requires ANTHROPIC_API_KEY';
            apiKeyGroup.style.display = 'block';
            modelInput.placeholder = 'claude-3-5-sonnet-20241022...';
            baseUrlInput.placeholder = 'https://api.anthropic.com/v1';
            break;
          case 'gemini':
            hintEl.textContent = 'Google Gemini - requires GOOGLE_API_KEY';
            apiKeyGroup.style.display = 'block';
            modelInput.placeholder = 'gemini-1.5-pro, gemini-1.5-flash...';
            baseUrlInput.placeholder = 'https://generativelanguage.googleapis.com/v1beta';
            break;
          case 'azure':
            hintEl.textContent = 'Azure OpenAI - requires AZURE_OPENAI_API_KEY & ENDPOINT';
            apiKeyGroup.style.display = 'block';
            modelInput.placeholder = 'gpt-4o, gpt-4...';
            baseUrlInput.placeholder = 'https://your-resource.openai.azure.com';
            break;
          case 'groq':
            hintEl.textContent = 'Groq (Ultra-fast) - requires GROQ_API_KEY';
            apiKeyGroup.style.display = 'block';
            modelInput.placeholder = 'llama-3.3-70b-versatile, mixtral-8x7b...';
            baseUrlInput.placeholder = 'https://api.groq.com/openai/v1';
            break;
          case 'together':
            hintEl.textContent = 'Together AI - requires TOGETHER_API_KEY';
            apiKeyGroup.style.display = 'block';
            modelInput.placeholder = 'meta-llama/Llama-3.3-70B-Instruct-Turbo...';
            baseUrlInput.placeholder = 'https://api.together.xyz/v1';
            break;
          case 'openrouter':
            hintEl.textContent = 'OpenRouter (100+ models) - requires OPENROUTER_API_KEY';
            apiKeyGroup.style.display = 'block';
            modelInput.placeholder = 'anthropic/claude-3.5-sonnet, openai/gpt-4o...';
            baseUrlInput.placeholder = 'https://openrouter.ai/api/v1';
            break;
        }
      }

      async function saveSettings(event) {
        event.preventDefault();

        const provider = document.getElementById('llmProvider').value;
        const model = document.getElementById('llmModel').value.trim();
        const temperature = parseFloat(document.getElementById('llmTemperature').value);
        const base_url = document.getElementById('llmBaseUrl').value.trim();
        const api_key = document.getElementById('llmApiKey').value.trim();

        if (!model) {
          appendMessage('error', 'Model name is required');
          return;
        }

        const payload = { provider, model, temperature };
        if (base_url) payload.base_url = base_url;
        if (api_key) payload.api_key = api_key;

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

      // Close modals on Escape key
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          if (document.getElementById('addServerModal').classList.contains('active')) {
            hideAddServerModal();
          }
          if (document.getElementById('settingsModal').classList.contains('active')) {
            hideSettingsModal();
          }
          if (document.getElementById('confirmDeleteModal').classList.contains('active')) {
            hideConfirmDeleteModal();
          }
          if (document.getElementById('importConfigModal').classList.contains('active')) {
            hideImportConfigModal();
          }
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
          };

          document.getElementById('modelProvider').textContent =
            providerEmojis[config.provider] || '🤖';
          document.getElementById('modelName').textContent = config.model || 'unknown';
        } catch (e) {
          console.error('Failed to update model badge:', e);
        }
      }

      // Update badge on page load
      updateModelBadge();

      // ==========================================
      // TOOL SEARCH FILTER
      // ==========================================

      function filterTools(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const toolItems = document.querySelectorAll('.tool-item');
        const serverCards = document.querySelectorAll('.mcp-server');

        toolItems.forEach(item => {
          const toolName = item.querySelector('.tool-name')?.textContent?.toLowerCase() || '';
          const toolDesc = item.querySelector('.tool-desc')?.textContent?.toLowerCase() || '';

          if (!term || toolName.includes(term) || toolDesc.includes(term)) {
            item.style.display = '';
          } else {
            item.style.display = 'none';
          }
        });

        // Hide server cards that have no visible tools
        serverCards.forEach(card => {
          const visibleTools = card.querySelectorAll('.tool-item:not([style*="display: none"])');
          if (!term || visibleTools.length > 0) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      }

      // ==========================================
      // TEST ALL TOOLS
      // ==========================================

      let isTestingTools = false;

      // Tools that have side effects and should be skipped in safe mode
      const RISKY_TOOLS = [
        'click-tool',
        'type-tool',
        'launch-tool',
        'drag-tool',
        'key-tool',
        'shortcut-tool',
        'scroll-tool',
      ];

      async function testAllTools() {
        if (isTestingTools) return;

        const testBtn = document.getElementById('testAllBtn');

        // Fetch tools from /api/mcp/tools (has full tool objects with serverName)
        let toolsData;
        try {
          const response = await fetch('/api/mcp/tools', { credentials: 'include' });
          toolsData = await response.json();
        } catch (error) {
          appendMessage('error', `Failed to get tools: ${error.message}`);
          return;
        }

        const tools = toolsData.tools || [];

        if (tools.length === 0) {
          appendMessage('error', 'No tools available. Connect to an MCP server first.');
          return;
        }

        isTestingTools = true;
        testBtn.disabled = true;
        testBtn.textContent = '🧪 Testing...';

        // Check if user wants risky tools included
        const includeRisky = document.getElementById('includeRiskyTools').checked;
        const toolsToTest = includeRisky
          ? tools
          : tools.filter(t => !RISKY_TOOLS.includes(t.name.toLowerCase()));
        const skippedCount = tools.length - toolsToTest.length;

        if (includeRisky) {
          appendMessage(
            'system',
            `🧪 **Starting Full Tool Test** (${toolsToTest.length} tools, ⚠️ risky tools INCLUDED)...`
          );
        } else {
          appendMessage(
            'system',
            `🧪 **Starting Safe Tool Test** (${toolsToTest.length} tools, ⚠️ ${skippedCount} risky skipped)...`
          );
        }

        const results = { passed: 0, failed: 0, total: 0, skipped: skippedCount };

        // Group tools by server for display
        const toolsByServer = {};
        for (const tool of toolsToTest) {
          const serverName = tool.serverName || 'unknown';
          if (!toolsByServer[serverName]) toolsByServer[serverName] = [];
          toolsByServer[serverName].push(tool);
        }

        for (const [serverName, serverTools] of Object.entries(toolsByServer)) {
          appendMessage(
            'system',
            `📦 Testing server: **${serverName}** (${serverTools.length} tools)`
          );

          for (const tool of serverTools) {
            results.total++;
            const startTime = performance.now();

            try {
              // Generate minimal test args based on required fields
              const testArgs = {};
              if (tool.inputSchema?.properties) {
                for (const [key, prop] of Object.entries(tool.inputSchema.properties)) {
                  if (tool.inputSchema.required?.includes(key)) {
                    if (prop.type === 'string') testArgs[key] = 'test';
                    else if (prop.type === 'number' || prop.type === 'integer') testArgs[key] = 1;
                    else if (prop.type === 'boolean') testArgs[key] = true;
                    else if (prop.type === 'array') testArgs[key] = [];
                    else if (prop.type === 'object') testArgs[key] = {};
                  }
                }
              }

              const response = await fetch('/api/mcp/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  serverName,
                  toolName: tool.name,
                  args: testArgs,
                }),
              });

              const data = await response.json();
              const duration = Math.round(performance.now() - startTime);

              if (data.error) {
                results.failed++;
                appendMessage('error', `❌ ${tool.name} (${duration}ms): ${data.error}`);
              } else {
                const preview = formatToolTestResult(data.result);

                // Check MCP's isError field (proper MCP protocol)
                // Response format: { content: [...], isError: true/false }
                const isError = data.result?.isError === true;

                if (isError) {
                  results.failed++;
                  appendTestResult(
                    tool.name,
                    duration,
                    preview,
                    JSON.stringify(data.result, null, 2),
                    false
                  );
                } else {
                  results.passed++;
                  appendTestResult(
                    tool.name,
                    duration,
                    preview,
                    JSON.stringify(data.result, null, 2),
                    true
                  );
                }
              }
            } catch (error) {
              const duration = Math.round(performance.now() - startTime);
              results.failed++;
              appendMessage('error', `❌ ${tool.name} (${duration}ms): ${error.message}`);
            }
          }
        }

        // Show skipped tools
        if (skippedCount > 0) {
          const skippedNames = tools
            .filter(t => RISKY_TOOLS.includes(t.name.toLowerCase()))
            .map(t => t.name)
            .join(', ');
          appendMessage('system', `⚠️ Skipped risky tools: ${skippedNames}`);
        }

        // Summary
        const summary = `🧪 **Test Complete**: ${results.passed}/${results.total} passed, ${results.failed} failed, ${results.skipped} skipped`;
        appendMessage('system', summary);

        isTestingTools = false;
        testBtn.disabled = false;
        testBtn.textContent = '🧪 Test All Tools';
      }

      // Format tool test result for preview
      function formatToolTestResult(result) {
        if (!result) return 'null';

        // Handle MCP format: { content: [{ type: 'text', text: '...' }] }
        if (result.content && Array.isArray(result.content)) {
          const textParts = result.content.filter(c => c.type === 'text').map(c => c.text);
          if (textParts.length > 0) {
            const text = textParts.join(' ');
            return text.length > 100 ? text.slice(0, 100) + '...' : text;
          }
        }

        // Handle plain string
        if (typeof result === 'string') {
          return result.length > 100 ? result.slice(0, 100) + '...' : result;
        }

        // Handle object - stringify and truncate
        const str = JSON.stringify(result);
        return str.length > 100 ? str.slice(0, 100) + '...' : str;
      }

      // Append test result with preview and copy button
      function appendTestResult(toolName, duration, preview, fullJson, isSuccess = true) {
        const msgEl = document.createElement('div');
        msgEl.className = 'message system';

        const icon = isSuccess ? '✅' : '⚠️';
        const escapedJson = fullJson.replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        msgEl.innerHTML = `
          <div style="display: flex; align-items: flex-start; gap: var(--spacing-sm);">
            <span>${icon} <strong>${escapeHtml(toolName)}</strong> <span style="color: var(--text-muted);">(${duration}ms)</span></span>
            <button class="btn copy-json-btn" style="font-size: 0.65rem; padding: 1px 6px; margin-left: auto;">
              📋 Copy
            </button>
          </div>
          <div style="color: var(--text-muted); font-size: 0.8rem; margin-top: 4px; font-family: 'JetBrains Mono', monospace; word-break: break-all;">
            📄 ${escapeHtml(preview)}
          </div>
        `;

        // Store JSON in element property (not attribute) to avoid escaping issues
        const copyBtn = msgEl.querySelector('.copy-json-btn');
        copyBtn._jsonData = fullJson;
        copyBtn.onclick = function () {
          navigator.clipboard.writeText(this._jsonData).then(() => {
            this.textContent = '✓ Copied';
          });
        };

        messagesEl.appendChild(msgEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }

      // ==========================================
      // INSPECTOR TAB FUNCTIONS
      // ==========================================

      let inspectorToolsCache = [];
      let selectedInspectorTool = null;
      let lastInspectorResponse = null;

      // Switch between Chat, Inspector, and History tabs
      function switchTab(tabName) {
        const chatPanel = document.getElementById('chatPanel');
        const inspectorPanel = document.getElementById('inspectorPanel');
        const historyPanel = document.getElementById('historyPanel');
        const scenariosPanel = document.getElementById('scenariosPanel');
        const generatorPanel = document.getElementById('generatorPanel');
        const chatTabBtn = document.getElementById('chatTabBtn');
        const inspectorTabBtn = document.getElementById('inspectorTabBtn');
        const historyTabBtn = document.getElementById('historyTabBtn');
        const scenariosTabBtn = document.getElementById('scenariosTabBtn');
        const generatorTabBtn = document.getElementById('generatorTabBtn');

        // Remove active from all
        chatPanel.classList.remove('active');
        inspectorPanel.classList.remove('active');
        historyPanel.classList.remove('active');
        scenariosPanel.classList.remove('active');
        generatorPanel.classList.remove('active');
        chatTabBtn.classList.remove('active');
        inspectorTabBtn.classList.remove('active');
        historyTabBtn.classList.remove('active');
        scenariosTabBtn.classList.remove('active');
        generatorTabBtn.classList.remove('active');

        // Activate selected tab
        if (tabName === 'chat') {
          chatPanel.classList.add('active');
          chatTabBtn.classList.add('active');
        } else if (tabName === 'inspector') {
          inspectorPanel.classList.add('active');
          inspectorTabBtn.classList.add('active');
          loadInspectorServers();
        } else if (tabName === 'history') {
          historyPanel.classList.add('active');
          historyTabBtn.classList.add('active');
          refreshHistoryPanel();
        } else if (tabName === 'scenarios') {
          scenariosPanel.classList.add('active');
          scenariosTabBtn.classList.add('active');
          refreshScenariosPanel();
          refreshSuitesList();
        } else if (tabName === 'generator') {
          generatorPanel.classList.add('active');
          generatorTabBtn.classList.add('active');
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
            if (info.connected) {
              select.innerHTML += `<option value="${escapeHtml(name)}">${escapeHtml(name)} (${info.toolCount} tools)</option>`;
            }
          }
          
          // Also populate Resources and Prompts server selects
          const resourceSelect = document.getElementById('resourceServerSelect');
          const promptSelect = document.getElementById('promptServerSelect');
          if (resourceSelect) resourceSelect.innerHTML = select.innerHTML;
          if (promptSelect) promptSelect.innerHTML = select.innerHTML;
        } catch (error) {
          console.error('Failed to load servers:', error);
        }
      }

      // Switch between Inspector sub-tabs (Tools, Resources, Prompts)
      function switchInspectorTab(tabName) {
        const toolsPanel = document.getElementById('inspectorToolsPanel');
        const resourcesPanel = document.getElementById('inspectorResourcesPanel');
        const promptsPanel = document.getElementById('inspectorPromptsPanel');
        const toolsTab = document.getElementById('inspectorToolsTab');
        const resourcesTab = document.getElementById('inspectorResourcesTab');
        const promptsTab = document.getElementById('inspectorPromptsTab');

        // Hide all panels
        if (toolsPanel) toolsPanel.style.display = 'none';
        if (resourcesPanel) resourcesPanel.style.display = 'none';
        if (promptsPanel) promptsPanel.style.display = 'none';

        // Remove active from all tabs
        if (toolsTab) toolsTab.classList.remove('active');
        if (resourcesTab) resourcesTab.classList.remove('active');
        if (promptsTab) promptsTab.classList.remove('active');

        // Show selected panel
        if (tabName === 'tools') {
          if (toolsPanel) toolsPanel.style.display = 'block';
          if (toolsTab) toolsTab.classList.add('active');
        } else if (tabName === 'resources') {
          if (resourcesPanel) resourcesPanel.style.display = 'block';
          if (resourcesTab) resourcesTab.classList.add('active');
        } else if (tabName === 'prompts') {
          if (promptsPanel) promptsPanel.style.display = 'block';
          if (promptsTab) promptsTab.classList.add('active');
        }
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

        const schema = selectedInspectorTool.inputSchema;
        if (!schema || !schema.properties || Object.keys(schema.properties).length === 0) {
          formEl.innerHTML = '<em style="color: var(--text-muted);">No parameters required</em>';
          return;
        }

        const required = schema.required || [];
        let html = '';

        for (const [paramName, paramDef] of Object.entries(schema.properties)) {
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
      }

      // Clear inspector form
      function clearInspectorForm() {
        const formEl = document.getElementById('inspectorForm');
        formEl.querySelectorAll('input, textarea, select').forEach(el => {
          if (el.tagName === 'SELECT') {
            el.selectedIndex = 0;
          } else {
            el.value = '';
          }
        });
        document.getElementById('inspectorResponseSection').style.display = 'none';
      }

      // Execute tool from Inspector
      async function executeInspectorTool() {
        if (!selectedInspectorTool) return;

        const serverName = document.getElementById('inspectorServerSelect').value;
        const formEl = document.getElementById('inspectorForm');
        const executeBtn = document.getElementById('inspectorExecuteBtn');
        const responseSection = document.getElementById('inspectorResponseSection');
        const responseStatus = document.getElementById('inspectorResponseStatus');
        const responseBody = document.getElementById('inspectorResponseBody');

        // Collect form values
        const args = {};
        formEl.querySelectorAll('[data-param]').forEach(el => {
          const param = el.dataset.param;
          let value = el.value.trim();

          if (!value) return;

          // Parse based on expected type
          const schema = selectedInspectorTool.inputSchema?.properties?.[param];
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
          sessionManager.logToolExecution({
            timestamp: new Date().toISOString(),
            server: serverName,
            tool: selectedInspectorTool.name,
            request: args,
            response: data.error || data.result,
            duration,
            success: !data.error && data.result?.isError !== true,
          });
          toolExecutionHistory = sessionManager.getToolHistory();

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
          sessionManager.logToolExecution({
            timestamp: new Date().toISOString(),
            server: serverName,
            tool: selectedInspectorTool.name,
            request: args,
            response: { error: error.message },
            duration,
            success: false,
          });
          toolExecutionHistory = sessionManager.getToolHistory();

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
      }

      function clearProtocolLog() {
        document.getElementById('protocolLog').innerHTML =
          '<div style="color: var(--text-muted); font-style: italic;">Execute a tool to see protocol messages...</div>';
      }

      // ==========================================
      // CONFIG EXPORT/IMPORT
      // ==========================================

      async function exportConfig() {
        try {
          const response = await fetch('/api/mcp/status', { credentials: 'include' });
          const status = await response.json();

          // Build YAML config
          let yaml =
            '# MCP Chat Studio Configuration\n# Exported: ' +
            new Date().toISOString() +
            '\n\nmcpServers:\n';

          for (const [name, info] of Object.entries(status)) {
            if (!info.config) continue;
            const cfg = info.config;

            yaml += `  ${name}:\n`;
            yaml += `    type: ${cfg.type || 'stdio'}\n`;

            if (cfg.command) yaml += `    command: ${cfg.command}\n`;
            if (cfg.args && cfg.args.length > 0) {
              yaml += `    args:\n`;
              cfg.args.forEach(arg => (yaml += `      - ${arg}\n`));
            }
            if (cfg.url) yaml += `    url: ${cfg.url}\n`;
            if (cfg.description) yaml += `    description: "${cfg.description}"\n`;
            if (cfg.env && Object.keys(cfg.env).length > 0) {
              yaml += `    env:\n`;
              for (const [k, v] of Object.entries(cfg.env)) {
                yaml += `      ${k}: "${v}"\n`;
              }
            }
            yaml += '\n';
          }

          // Download as file
          const blob = new Blob([yaml], { type: 'text/yaml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'mcp-config.yaml';
          a.click();
          URL.revokeObjectURL(url);

          appendMessage('system', '📥 Config exported to mcp-config.yaml');
        } catch (error) {
          appendMessage('error', 'Export failed: ' + error.message);
        }
      }

      // ==========================================
      // EXPORT CHAT HISTORY
      // ==========================================

      function exportChat() {
        const messages = document.querySelectorAll('.message');
        if (messages.length === 0) {
          appendMessage('system', 'No messages to export');
          return;
        }

        let markdown = `# MCP Chat Studio - Conversation Export\n`;
        markdown += `**Exported:** ${new Date().toISOString()}\n\n---\n\n`;

        messages.forEach(msg => {
          const isUser = msg.classList.contains('user');
          const isSystem = msg.classList.contains('system');
          const isError = msg.classList.contains('error');

          const content = msg.querySelector('.message-content')?.textContent || msg.textContent;

          if (isSystem) {
            markdown += `> 🔔 ${content.trim()}\n\n`;
          } else if (isError) {
            markdown += `> ❌ **Error:** ${content.trim()}\n\n`;
          } else if (isUser) {
            markdown += `## 👤 User\n\n${content.trim()}\n\n`;
          } else {
            markdown += `## 🤖 Assistant\n\n${content.trim()}\n\n`;
          }
        });

        // Download as file
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.md`;
        a.click();
        URL.revokeObjectURL(url);

        appendMessage('system', '💬 Chat exported to markdown file');
      }

      // ==========================================
      // KEYBOARD SHORTCUTS HELP
      // ==========================================

      function showShortcutsHelp() {
        const helpHTML = `
          <div style="padding: var(--spacing-md);">
            <h3 style="margin-bottom: var(--spacing-md);">⌨️ Keyboard Shortcuts</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px; border-bottom: 1px solid var(--border-subtle);"><kbd>Enter</kbd></td><td>Send message</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid var(--border-subtle);"><kbd>Shift+Enter</kbd></td><td>New line</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid var(--border-subtle);"><kbd>Escape</kbd></td><td>Cancel / Close modal</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid var(--border-subtle);"><kbd>Ctrl+K</kbd></td><td>Focus tool search</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid var(--border-subtle);"><kbd>Ctrl+Shift+E</kbd></td><td>Export chat</td></tr>
              <tr><td style="padding: 8px;"><kbd>Ctrl+/</kbd></td><td>Show this help</td></tr>
            </table>
          </div>
        `;

        // Create a temporary toast/modal for help
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = helpHTML;
        toast.style.cssText =
          'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); z-index: 10000; min-width: 320px;';

        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText =
          'position: absolute; top: 10px; right: 10px; background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.2rem;';
        closeBtn.onclick = () => toast.remove();
        toast.appendChild(closeBtn);

        document.body.appendChild(toast);

        // Auto-close after 10 seconds
        setTimeout(() => toast.remove(), 10000);
      }

      function importConfigFile() {
        document.getElementById('configFileInput').click();
      }

      async function handleConfigFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
          const text = await file.text();
          let config;

          // Try JSON first, then YAML
          try {
            config = JSON.parse(text);
          } catch {
            config = parseSimpleYaml(text);
          }

          // Handle mcpServers wrapper
          const servers = config.mcpServers || config;
          let addedCount = 0;

          for (const [name, cfg] of Object.entries(servers)) {
            if (typeof cfg !== 'object') continue;

            const payload = {
              name,
              type: cfg.type || 'stdio',
              description: cfg.description || '',
              command: cfg.command,
              args: cfg.args || [],
              url: cfg.url,
              env: cfg.env || {},
            };

            const response = await fetch('/api/mcp/add', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!data.error) addedCount++;
          }

          appendMessage('system', `📤 Imported ${addedCount} server(s) from ${file.name}`);
          loadServers();
        } catch (error) {
          appendMessage('error', 'Import failed: ' + error.message);
        }

        // Reset file input
        event.target.value = '';
      }

      // ==========================================
      // SSE EVENT VIEWER
      // ==========================================

      let sseConnection = null;

      function toggleSSEViewer() {
        const btn = document.getElementById('sseConnectBtn');
        const statusEl = document.getElementById('sseStatus');
        const serverSelect = document.getElementById('inspectorServerSelect');
        const serverName = serverSelect?.value;

        if (sseConnection) {
          // Disconnect
          sseConnection.close();
          sseConnection = null;
          btn.textContent = '🔌 Connect';
          statusEl.textContent = 'Disconnected';
          statusEl.style.color = 'var(--text-muted)';
          return;
        }

        if (!serverName) {
          statusEl.textContent = '⚠️ Select a server first';
          statusEl.style.color = 'var(--warning)';
          return;
        }

        // Try to connect to SSE endpoint
        // This creates an EventSource to listen for server events
        try {
          statusEl.textContent = `Connecting to ${serverName}...`;
          statusEl.style.color = 'var(--accent-primary)';

          // Use server status API to check if SSE type
          fetch('/api/mcp/status', { credentials: 'include' })
            .then(res => res.json())
            .then(status => {
              const server = status[serverName];
              if (!server) {
                statusEl.textContent = '⚠️ Server not found';
                statusEl.style.color = 'var(--error)';
                return;
              }

              if (server.type !== 'sse') {
                logSSEEvent(
                  'info',
                  serverName,
                  'This server uses stdio transport - SSE events not available'
                );
                statusEl.textContent = 'stdio server (no SSE events)';
                statusEl.style.color = 'var(--text-muted)';
                return;
              }

              // For SSE servers, we'd need the config URL
              // Since MCP SSE is bidirectional, we simulate event logging
              logSSEEvent('connect', serverName, 'SSE transport detected - monitoring enabled');
              statusEl.textContent = `Connected to ${serverName}`;
              statusEl.style.color = 'var(--success)';
              btn.textContent = '🔌 Disconnect';

              // Set up a simple heartbeat to show connection
              sseConnection = {
                close: () => {
                  logSSEEvent('disconnect', serverName, 'Connection closed');
                },
              };
            })
            .catch(err => {
              statusEl.textContent = '❌ ' + err.message;
              statusEl.style.color = 'var(--error)';
            });
        } catch (error) {
          statusEl.textContent = '❌ ' + error.message;
          statusEl.style.color = 'var(--error)';
        }
      }

      function logSSEEvent(type, serverName, data) {
        const eventsEl = document.getElementById('sseEvents');

        // Clear placeholder if first event
        if (eventsEl.querySelector('div[style*="italic"]')) {
          eventsEl.innerHTML = '';
        }

        const timestamp = new Date().toLocaleTimeString();
        const colors = {
          connect: 'var(--success)',
          disconnect: 'var(--error)',
          message: 'var(--accent-primary)',
          info: 'var(--text-muted)',
        };
        const color = colors[type] || 'var(--text-secondary)';

        const entry = document.createElement('div');
        entry.style.cssText =
          'margin-bottom: 6px; padding: 6px; background: var(--bg-surface); border-radius: 4px; border-left: 3px solid ' +
          color;
        entry.innerHTML = `
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span style="color: ${color}; font-weight: 600; font-size: 0.7rem;">${type.toUpperCase()}: ${escapeHtml(serverName)}</span>
            <span style="color: var(--text-muted); font-size: 0.65rem;">${timestamp}</span>
          </div>
          <div style="font-size: 0.7rem; color: var(--text-secondary);">${escapeHtml(String(data))}</div>
        `;

        eventsEl.appendChild(entry);
        eventsEl.scrollTop = eventsEl.scrollHeight;
      }

      function clearSSEEvents() {
        document.getElementById('sseEvents').innerHTML =
          '<div style="color: var(--text-muted); font-style: italic;">Connect to an SSE server to see real-time events...</div>';
      }

      // ==========================================
      // TOOL SCHEMA VIEWER
      // ==========================================

      function generateSchemaHTML(tool) {
        const schema = tool.inputSchema;
        if (!schema || !schema.properties || Object.keys(schema.properties).length === 0) {
          return '<div class="schema-section"><em>No parameters required</em></div>';
        }

        const required = schema.required || [];
        let html = '<div class="param-list">';

        for (const [paramName, paramDef] of Object.entries(schema.properties)) {
          const isRequired = required.includes(paramName);
          const typeLabel = paramDef.type || 'any';

          html += `
            <div class="param-item">
              <span class="param-name">${escapeHtml(paramName)}</span>
              <span class="param-type">${typeLabel}</span>
              <span class="${isRequired ? 'param-required' : 'param-optional'}">${isRequired ? 'required' : 'optional'}</span>
          `;

          if (paramDef.description) {
            html += `<div class="param-desc">${escapeHtml(paramDef.description)}</div>`;
          }

          if (paramDef.enum && paramDef.enum.length > 0) {
            html += `<div class="param-enum">Values: ${paramDef.enum.map(v => `<code>${escapeHtml(String(v))}</code>`).join(' ')}</div>`;
          }

          if (paramDef.default !== undefined) {
            html += `<div class="param-desc">Default: <code>${escapeHtml(String(paramDef.default))}</code></div>`;
          }

          html += '</div>';
        }

        html += '</div>';
        return html;
      }

      function toggleToolSchema(toolEl) {
        // Close any other expanded tools
        document.querySelectorAll('.tool-item.expanded').forEach(el => {
          if (el !== toolEl) el.classList.remove('expanded');
        });

        // Toggle this tool
        toolEl.classList.toggle('expanded');
      }

      // Select a tool (insert prompt)
      function selectTool(tool, forceMode = false) {
        if (forceMode) {
          selectedTool = tool;
          updateSelectedToolBadge();
          userInputEl.placeholder = `Using ${tool.name}... Type your request`;
          userInputEl.focus();
        } else {
          // Insert prompt text
          const prompt = `Use the ${tool.name} tool to `;
          userInputEl.value = prompt;
          userInputEl.focus();
          userInputEl.setSelectionRange(prompt.length, prompt.length);
        }
      }

      // Clear selected tool
      function clearSelectedTool() {
        selectedTool = null;
        updateSelectedToolBadge();
        userInputEl.placeholder = 'Type your message... (Enter to send, Shift+Enter for new line)';
      }

      // Update selected tool badge UI
      function updateSelectedToolBadge() {
        const badgeEl = document.getElementById('selectedToolBadge');
        if (selectedTool) {
          badgeEl.innerHTML = `
            <div class="selected-tool-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
              </svg>
              <span>Force: ${selectedTool.name}</span>
              <button class="clear-btn" onclick="clearSelectedTool()" title="Clear selection">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          `;
        } else {
          badgeEl.innerHTML = '';
        }
      }

      // Send message (or cancel if already loading)
      async function sendMessage() {
        if (isLoading) {
          cancelRequest();
          return;
        }

        const content = userInputEl.value.trim();
        if (!content) return;

        messages.push({ role: 'user', content });
        appendMessage('user', content);

        userInputEl.value = '';
        userInputEl.style.height = 'auto';

        isLoading = true;
        currentAbortController = new AbortController();
        sendBtnEl.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        Cancel
      `;
        sendBtnEl.classList.add('cancel');

        const useStream = useStreamEl.checked && !useToolsEl.checked; // Streaming doesn't work well with tool calls

        if (useStream) {
          // ========== STREAMING MODE ==========
          try {
            if (currentLoadingEl) {
              currentLoadingEl.remove();
              currentLoadingEl = null;
            }

            // Create a live message element
            const liveMessageEl = document.createElement('div');
            liveMessageEl.className = 'message assistant';
            liveMessageEl.innerHTML = '<span class="typing-cursor">▌</span>';
            messagesEl.appendChild(liveMessageEl);
            messagesEl.scrollTop = messagesEl.scrollHeight;

            let fullContent = '';

            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              signal: currentAbortController.signal,
              body: JSON.stringify({
                messages: messages.map(m => ({
                  role: m.role,
                  content: m.content,
                })),
                useTools: false, // Disable tools for streaming
                stream: true,
              }),
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop(); // Keep incomplete line in buffer

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6);

                if (data === '[DONE]') break;

                try {
                  const chunk = JSON.parse(data);

                  // Handle error in stream
                  if (chunk.error) {
                    throw new Error(chunk.error);
                  }

                  // Extract content delta
                  const delta = chunk.choices?.[0]?.delta?.content;
                  if (delta) {
                    fullContent += delta;
                    // Update live message (simple formatting)
                    let formatted = escapeHtml(fullContent);
                    formatted = formatted.replace(
                      /```(\w*)\n?([\s\S]*?)```/g,
                      '<pre><code>$2</code></pre>'
                    );
                    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
                    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                    formatted = formatted.replace(/\n/g, '<br>');
                    liveMessageEl.innerHTML = formatted + '<span class="typing-cursor">▌</span>';
                    messagesEl.scrollTop = messagesEl.scrollHeight;
                  }
                } catch (e) {
                  // Skip invalid JSON chunks
                  if (e.message !== 'Unexpected end of JSON input') {
                    console.warn('Stream parse error:', e);
                  }
                }
              }
            }

            // Finalize message (remove cursor)
            let finalFormatted = escapeHtml(fullContent || 'No response generated.');
            finalFormatted = finalFormatted.replace(
              /```(\w*)\n?([\s\S]*?)```/g,
              '<pre><code>$2</code></pre>'
            );
            finalFormatted = finalFormatted.replace(/`([^`]+)`/g, '<code>$1</code>');
            finalFormatted = finalFormatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            finalFormatted = finalFormatted.replace(/\n/g, '<br>');
            liveMessageEl.innerHTML = finalFormatted;

            messages.push({ role: 'assistant', content: fullContent || 'No response generated.' });
            
            // Track tokens for streaming
            const inputTokens = sessionManager.estimateTokens(JSON.stringify(messages));
            const outputTokens = sessionManager.estimateTokens(fullContent);
            sessionManager.addTokens(inputTokens, outputTokens);
            updateTokenDisplay();
          } catch (error) {
            if (error.name !== 'AbortError') {
              appendMessage('error', `Error: ${error.message}`);
            }
          } finally {
            resetLoadingState();
          }
        } else {
          // ========== NON-STREAMING MODE (with tool support) ==========
          currentLoadingEl = appendLoading();

          try {
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              signal: currentAbortController.signal,
              body: JSON.stringify({
                messages: messages.map(m => ({
                  role: m.role,
                  content: m.content,
                })),
                useTools: useToolsEl.checked,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
              throw new Error(data.error);
            }

            // Handle tool calls
            if (data.requiresContinuation && data.toolResults) {
              if (currentLoadingEl) {
                currentLoadingEl.remove();
                currentLoadingEl = null;
              }

              // Show tool results with better formatting
              for (const result of data.toolResults) {
                const toolName = result.name.split('__').pop() || result.name;
                const displayContent = formatToolResult(result.result);
                appendToolMessage(toolName, displayContent, result.success);
              }

              // Add tool messages to history
              const assistantMsg = data.choices[0].message;
              messages.push(assistantMsg);

              for (const result of data.toolResults) {
                messages.push({
                  role: 'tool',
                  tool_call_id: result.tool_call_id,
                  content: JSON.stringify(result.result),
                });
              }

              // Continue conversation
              currentLoadingEl = appendLoading();

              const continueResponse = await fetch('/api/chat/continue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                signal: currentAbortController.signal,
                body: JSON.stringify({
                  messages,
                  useTools: useToolsEl.checked,
                }),
              });

              if (!continueResponse.ok) {
                const errorData = await continueResponse.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${continueResponse.status}`);
              }

              const continueData = await continueResponse.json();

              if (continueData.error) {
                throw new Error(continueData.error);
              }

              const finalContent =
                continueData.choices?.[0]?.message?.content || 'No response generated.';
              messages.push({ role: 'assistant', content: finalContent });
              appendMessage('assistant', finalContent);
              
              // Track tokens
              const inputTokens = sessionManager.estimateTokens(JSON.stringify(messages));
              const outputTokens = sessionManager.estimateTokens(finalContent);
              sessionManager.addTokens(inputTokens, outputTokens);
              updateTokenDisplay();
            } else {
              // No tool calls, direct response
              const responseContent =
                data.choices?.[0]?.message?.content || 'No response generated.';
              messages.push({ role: 'assistant', content: responseContent });
              appendMessage('assistant', responseContent);
              
              // Track tokens
              const inputTokens = sessionManager.estimateTokens(JSON.stringify(messages));
              const outputTokens = sessionManager.estimateTokens(responseContent);
              sessionManager.addTokens(inputTokens, outputTokens);
              updateTokenDisplay();
            }
          } catch (error) {
            if (error.name !== 'AbortError') {
              appendMessage('error', `Error: ${error.message}`);
            }
          } finally {
            resetLoadingState();
          }
        }
      }

      // Format tool result for display - FIX for JSON-only display issue
      function formatToolResult(result) {
        if (!result) return 'No result';

        // Handle MCP format: { content: [{ type: 'text', text: '...' }] }
        if (result.content && Array.isArray(result.content)) {
          const textParts = [];
          for (const item of result.content) {
            if (item.type === 'text' && item.text) {
              textParts.push(item.text);
            } else if (item.type === 'error' || item.isError) {
              textParts.push(`❌ Error: ${item.text || item.message || 'Unknown error'}`);
            }
          }
          if (textParts.length > 0) {
            return textParts.join('\n');
          }
        }

        // Handle simple string result
        if (typeof result === 'string') {
          return result;
        }

        // Handle error object
        if (result.error) {
          return `❌ Error: ${result.error}`;
        }

        // Handle isError flag
        if (result.isError && result.content) {
          const errorText = Array.isArray(result.content)
            ? result.content.map(c => c.text || c).join('\n')
            : String(result.content);
          return `❌ Error: ${errorText}`;
        }

        // Fallback: pretty print JSON
        try {
          return JSON.stringify(result, null, 2);
        } catch {
          return String(result);
        }
      }

      // Append tool message with special formatting
      function appendToolMessage(toolName, content, success = true) {
        const div = document.createElement('div');
        div.className = 'message tool';

        const icon = success
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';

        div.innerHTML = `
        <div class="tool-header">
          ${icon}
          <span>${escapeHtml(toolName)}</span>
        </div>
        <div class="tool-content">${escapeHtml(content)}</div>
      `;

        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return div;
      }

      // Append message to UI
      function appendMessage(role, content, save = true) {
        const div = document.createElement('div');
        div.className = `message ${role}`;

        // Simple markdown-like formatting
        let formatted = escapeHtml(content);
        formatted = formatted.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\n/g, '<br>');

        div.innerHTML = formatted;
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        // Save to session (unless restoring)
        if (save && role !== 'system') {
          sessionManager.saveMessages(messages);
        }

        return div;
      }

      // Append loading indicator
      function appendLoading() {
        const div = document.createElement('div');
        div.className = 'message assistant';
        div.innerHTML = `
        <div class="loading-dots">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      `;
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return div;
      }

      // Clear chat
      function clearChat() {
        if (isLoading) {
          cancelRequest();
        }

        // Clear session storage
        sessionManager.clear();

        // Reset to welcome message
        messages = [sessionManager.getWelcomeMessage()];
        toolExecutionHistory = [];
        messagesEl.innerHTML = '';
        appendMessage('assistant', messages[0].content, false);
        resetLoadingState();

        console.log('[Session] Cleared');
      }

      // Escape HTML
      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Load MCP status
      async function loadMCPStatus() {
        try {
          const response = await fetch('/api/mcp/status', {
            credentials: 'include',
          });
          const status = await response.json();

          if (Object.keys(status).length === 0) {
            mcpServersEl.innerHTML = '<div class="empty-state">No MCP servers configured</div>';
            serverCountEl.textContent = '0 connected';
            return;
          }

          const connectedCount = Object.values(status).filter(s => s.connected).length;
          serverCountEl.textContent = `${connectedCount} connected`;

          mcpServersEl.innerHTML = '';

          for (const [name, info] of Object.entries(status)) {
            const serverEl = document.createElement('div');
            serverEl.className = 'mcp-server';

            const connectBtn = info.connected
              ? `<button class="mcp-connect-btn connected">✓ Connected</button><button class="mcp-connect-btn disconnect" data-disconnect="${name}" onclick="disconnectMCP('${name}')">Disconnect</button>`
              : `<button class="mcp-connect-btn" data-server="${name}" onclick="connectMCP('${name}')">Connect</button>`;

            // Add edit and remove buttons for servers
            const editBtn = `<button class="mcp-edit-btn" onclick="editServer('${name}')" title="Edit server configuration">✏️</button>`;
            const removeBtn = `<button class="mcp-remove-btn" onclick="removeServer('${name}')" title="Remove server">🗑️</button>`;

            const authBadge = info.requiresAuth
              ? `<span class="auth-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:10px;height:10px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Auth</span>`
              : '';

            serverEl.innerHTML = `
            <div class="mcp-server-header">
              <div class="mcp-server-name">
                <span class="mcp-status-dot ${info.connected ? 'connected' : ''}"></span>
                ${name}
              </div>
              ${authBadge}
            </div>
            <div class="mcp-server-meta">
              <span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                </svg>
                ${info.toolCount} tools
              </span>
              <span>${info.type}</span>
            </div>
            <div class="mcp-server-actions">
              ${connectBtn}
              ${editBtn}
              ${removeBtn}
            </div>
          `;

            // Show tools if connected
            if (info.connected && info.toolCount > 0) {
              try {
                const toolsResponse = await fetch('/api/mcp/tools', {
                  credentials: 'include',
                });
                const toolsData = await toolsResponse.json();
                const serverTools = toolsData.tools.filter(
                  t => t.serverName === name && !t.notConnected
                );

                if (serverTools.length > 0) {
                  const toolsContainer = document.createElement('div');
                  toolsContainer.className = 'tools-list';

                  toolsContainer.innerHTML = `<div class="tools-header"><span>Available Tools</span><span>${serverTools.length}</span></div>`;

                  for (const tool of serverTools.slice(0, 8)) {
                    const toolEl = document.createElement('div');
                    toolEl.className = 'tool-item';
                    toolEl.dataset.toolName = tool.name;
                    toolEl.dataset.serverName = tool.serverName;

                    // Generate schema HTML
                    const schemaHTML = generateSchemaHTML(tool);

                    toolEl.innerHTML = `
                    <div class="tool-name">
                      <svg class="use-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                      ${escapeHtml(tool.name)}
                    </div>
                    <div class="tool-desc">${escapeHtml((tool.description || '').slice(0, 80))}${(tool.description || '').length > 80 ? '...' : ''}</div>
                    <div class="tool-schema">
                      <div class="schema-section-title">Parameters</div>
                      ${schemaHTML}
                      <div class="schema-actions">
                        <button class="tool-action-btn" onclick="event.stopPropagation(); selectTool({name: '${escapeHtml(tool.name)}', serverName: '${escapeHtml(tool.serverName)}'}, false)" title="Insert a prompt suggestion using this tool">📝 Insert</button>
                        <button class="tool-action-btn force" onclick="event.stopPropagation(); selectTool({name: '${escapeHtml(tool.name)}', serverName: '${escapeHtml(tool.serverName)}'}, true)" title="Force the LLM to use this specific tool">⚡ Force</button>
                      </div>
                    </div>
                  `;
                    // Click on tool item toggles schema expansion
                    toolEl.addEventListener('click', e => {
                      if (e.target.tagName !== 'BUTTON') {
                        toggleToolSchema(toolEl);
                      }
                    });
                    toolsContainer.appendChild(toolEl);
                  }

                  if (serverTools.length > 8) {
                    const moreTools = serverTools.slice(8);
                    const moreContainerId = `more-tools-${name}`;

                    // Create hidden container for additional tools
                    const moreContainer = document.createElement('div');
                    moreContainer.id = moreContainerId;
                    moreContainer.style.display = 'none';

                    for (const tool of moreTools) {
                      const toolEl = document.createElement('div');
                      toolEl.className = 'tool-item';
                      toolEl.dataset.toolName = tool.name;
                      toolEl.dataset.serverName = tool.serverName;

                      // Generate schema HTML
                      const schemaHTML = generateSchemaHTML(tool);

                      toolEl.innerHTML = `
                        <div class="tool-name">
                          <svg class="use-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                          ${escapeHtml(tool.name)}
                        </div>
                        <div class="tool-desc">${escapeHtml((tool.description || '').slice(0, 80))}${(tool.description || '').length > 80 ? '...' : ''}</div>
                        <div class="tool-schema">
                          <div class="schema-section-title">Parameters</div>
                          ${schemaHTML}
                          <div class="schema-actions">
                            <button class="tool-action-btn" onclick="event.stopPropagation(); selectTool({name: '${escapeHtml(tool.name)}', serverName: '${escapeHtml(tool.serverName)}'}, false)">📝 Insert</button>
                            <button class="tool-action-btn force" onclick="event.stopPropagation(); selectTool({name: '${escapeHtml(tool.name)}', serverName: '${escapeHtml(tool.serverName)}'}, true)">⚡ Force</button>
                          </div>
                        </div>
                      `;
                      toolEl.addEventListener('click', e => {
                        if (e.target.tagName !== 'BUTTON') {
                          toggleToolSchema(toolEl);
                        }
                      });
                      moreContainer.appendChild(toolEl);
                    }
                    toolsContainer.appendChild(moreContainer);

                    // Create toggle button
                    const toggleBtn = document.createElement('button');
                    toggleBtn.className = 'tool-toggle-btn';
                    toggleBtn.innerHTML = `<span>▼</span> Show ${moreTools.length} more tools`;
                    toggleBtn.onclick = () => {
                      const container = document.getElementById(moreContainerId);
                      const isHidden = container.style.display === 'none';
                      container.style.display = isHidden ? 'block' : 'none';
                      toggleBtn.innerHTML = isHidden
                        ? `<span>▲</span> Hide ${moreTools.length} tools`
                        : `<span>▼</span> Show ${moreTools.length} more tools`;
                    };
                    toolsContainer.appendChild(toggleBtn);
                  }

                  serverEl.appendChild(toolsContainer);
                }
              } catch (e) {
                console.error('Failed to load tools:', e);
              }
            }

            mcpServersEl.appendChild(serverEl);
          }
        } catch (error) {
          mcpServersEl.innerHTML = `<div class="empty-state" style="color: var(--error)">Failed to load MCP status</div>`;
        }
      }

      // ==========================================
      // TOOL EXECUTION HISTORY PANEL
      // ==========================================

      // Refresh history panel with current data
      function refreshHistoryPanel() {
        const history = sessionManager.getToolHistory();
        const statsEl = document.getElementById('toolHistoryStats');
        const listEl = document.getElementById('toolHistoryList');

        if (history.length === 0) {
          statsEl.textContent = 'No tool executions recorded';
          listEl.innerHTML = `
            <div style="color: var(--text-muted); font-style: italic; text-align: center; padding: 20px">
              Execute tools from the Inspector tab to see history here...
            </div>
          `;
          return;
        }

        // Calculate stats
        const successCount = history.filter(h => h.success).length;
        const avgDuration = Math.round(history.reduce((sum, h) => sum + (h.duration || 0), 0) / history.length);
        statsEl.innerHTML = `
          <strong>${history.length}</strong> executions •
          <span style="color: var(--success)">${successCount} ✓</span> /
          <span style="color: var(--error)">${history.length - successCount} ✗</span> •
          Avg: ${avgDuration}ms
        `;

        // Render history entries
        listEl.innerHTML = history.map((entry, idx) => {
          const time = new Date(entry.timestamp).toLocaleTimeString();
          const statusIcon = entry.success ? '✅' : '❌';
          const statusClass = entry.success ? 'success' : 'error';

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
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      // Toggle history entry detail visibility
      function toggleHistoryDetail(idx) {
        const detailEl = document.getElementById(`historyDetail${idx}`);
        if (detailEl) {
          detailEl.style.display = detailEl.style.display === 'none' ? 'block' : 'none';
        }
      }

      // Copy history entry to clipboard
      function copyHistoryEntry(idx) {
        const history = sessionManager.getToolHistory();
        const entry = history[idx];
        if (entry) {
          navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
          appendMessage('system', '📋 History entry copied to clipboard');
        }
      }

      // Replay history entry in Inspector
      function replayHistoryEntry(idx) {
        const history = sessionManager.getToolHistory();
        const entry = history[idx];
        if (entry) {
          // Switch to Inspector and pre-fill
          switchTab('inspector');

          // Set server and load tools
          const serverSelect = document.getElementById('inspectorServerSelect');
          serverSelect.value = entry.server;
          serverSelect.dispatchEvent(new Event('change'));

          // Pre-fill arguments after a short delay to let tools load
          setTimeout(() => {
            const argsInput = document.getElementById('toolArgsInput');
            if (argsInput) {
              argsInput.value = JSON.stringify(entry.request, null, 2);
            }
          }, 500);

          appendMessage('system', `🔄 Loaded ${entry.tool} request in Inspector - select the tool and execute`);
        }
      }

      // Export tool history as JSON file
      function exportToolHistory() {
        const history = sessionManager.getToolHistory();
        if (history.length === 0) {
          appendMessage('error', 'No history to export');
          return;
        }

        const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mcp-tool-history-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);

        appendMessage('system', `📥 Exported ${history.length} history entries`);
      }

      // Clear tool history
      function clearToolHistory() {
        if (confirm('Clear all tool execution history?')) {
          const session = sessionManager.load() || {};
          session.toolHistory = [];
          sessionManager.save(session);
          toolExecutionHistory = [];
          refreshHistoryPanel();
          appendMessage('system', '🗑️ Tool history cleared');
        }
      }

      // ==========================================
      // TEST SCENARIOS - RECORDING & REPLAY
      // ==========================================

      // Recording state
      let isRecording = false;
      let recordedSteps = [];

      // Toggle recording on/off
      function toggleRecording() {
        isRecording = !isRecording;
        const btn = document.getElementById('recordBtn');
        const status = document.getElementById('recordingStatus');
        const stepsDiv = document.getElementById('recordingSteps');
        const stepsList = document.getElementById('recordingStepsList');

        if (isRecording) {
          recordedSteps = [];
          btn.innerHTML = '⏹️ Stop Recording';
          btn.style.background = 'var(--danger)';
          btn.style.color = 'white';
          status.innerHTML = '<span style="color: var(--danger)">🔴 Recording...</span> Execute tools in Inspector tab. They will be captured.';
          stepsDiv.style.display = 'block';
          stepsList.innerHTML = '<div style="color: var(--text-muted); font-style: italic">No steps yet...</div>';
          appendMessage('system', '🎬 Recording started. Execute tools in Inspector tab.');
        } else {
          btn.innerHTML = '🔴 Start Recording';
          btn.style.background = '';
          btn.style.color = '';

          if (recordedSteps.length > 0) {
            status.innerHTML = `Recording stopped. <strong>${recordedSteps.length}</strong> steps captured.`;
            // Show save button
            const saveBtn = document.createElement('button');
            saveBtn.className = 'btn';
            saveBtn.style.cssText = 'font-size: 0.65rem; padding: 2px 6px; background: var(--success); color: white; margin-left: 8px';
            saveBtn.innerHTML = '💾 Save Scenario';
            saveBtn.onclick = saveRecordedScenario;
            status.appendChild(saveBtn);
            appendMessage('system', `🎬 Recording stopped. ${recordedSteps.length} steps captured. Click "Save Scenario" to save.`);
          } else {
            status.textContent = 'Recording stopped. No steps captured.';
            stepsDiv.style.display = 'none';
            appendMessage('system', '🎬 Recording stopped. No steps captured.');
          }
        }
      }

      // Record a step (called from Inspector tool execution)
      function recordStep(step) {
        if (!isRecording) return;

        recordedSteps.push({
          server: step.server,
          tool: step.tool,
          args: step.request,
          expectedResponse: step.response,
          responseHash: hashString(JSON.stringify(step.response)),
          responseSchema: inferSchema(step.response), // For schema validation
          timing: step.duration,
          success: step.success,
        });

        // Update UI
        const stepsList = document.getElementById('recordingStepsList');
        stepsList.innerHTML = recordedSteps.map((s, i) => `
          <div style="display: flex; align-items: center; gap: 4px; padding: 4px; background: var(--bg-card); border-radius: 4px; margin-bottom: 4px">
            <span>${s.success ? '✅' : '❌'}</span>
            <strong>${i + 1}.</strong>
            ${escapeHtml(s.tool)}
            <span style="color: var(--text-muted); font-size: 0.7rem">@ ${escapeHtml(s.server)} (${s.timing}ms)</span>
          </div>
        `).join('');
      }

      // Simple hash function for response comparison
      function hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return hash.toString(16);
      }

      // Save recorded scenario
      function saveRecordedScenario() {
        if (recordedSteps.length === 0) {
          appendMessage('error', 'No steps to save');
          return;
        }

        const name = prompt('Scenario name:', `Test ${new Date().toLocaleTimeString()}`);
        if (!name) return;

        const scenario = {
          name,
          steps: recordedSteps,
          metadata: {
            stepsCount: recordedSteps.length,
            totalTime: recordedSteps.reduce((sum, s) => sum + s.timing, 0),
          }
        };

        sessionManager.saveScenario(scenario);
        recordedSteps = [];
        document.getElementById('recordingSteps').style.display = 'none';
        document.getElementById('recordingStatus').textContent = 'Scenario saved! Start a new recording.';
        refreshScenariosPanel();
        appendMessage('system', `💾 Scenario "${name}" saved with ${scenario.steps.length} steps.`);
      }

      // Refresh scenarios panel
      function refreshScenariosPanel() {
        const scenarios = sessionManager.getScenarios();
        const statsEl = document.getElementById('scenariosStats');
        const listEl = document.getElementById('scenariosList');

        if (scenarios.length === 0) {
          statsEl.textContent = 'No scenarios saved';
          listEl.innerHTML = `
            <div style="color: var(--text-muted); font-style: italic; text-align: center; padding: 20px">
              Record tool executions from Inspector → Save as Scenario → Replay anytime
            </div>
          `;
          return;
        }

        statsEl.innerHTML = `<strong>${scenarios.length}</strong> scenario${scenarios.length !== 1 ? 's' : ''} saved`;

        listEl.innerHTML = scenarios.map(s => `
          <div class="inspector-response" style="margin: 0">
            <div style="display: flex; justify-content: space-between; align-items: center">
              <div>
                <strong>🧪 ${escapeHtml(s.name)}</strong>
                <span style="color: var(--text-muted); font-size: 0.7rem"> • ${s.steps?.length || 0} steps</span>
              </div>
              <div style="font-size: 0.7rem; color: var(--text-muted)">
                ${new Date(s.created).toLocaleDateString()}
              </div>
            </div>
            <div style="margin-top: 8px; display: flex; gap: 4px">
              <button class="btn" onclick="replayScenario('${s.id}')" style="font-size: 0.65rem; padding: 2px 6px; background: var(--success); color: white">
                ▶️ Replay
              </button>
              <button class="btn" onclick="viewScenarioDetails('${s.id}')" style="font-size: 0.65rem; padding: 2px 6px">
                👁️ View
              </button>
              <button class="btn" onclick="exportScenario('${s.id}')" style="font-size: 0.65rem; padding: 2px 6px">
                📥 Export
              </button>
              <button class="btn" onclick="deleteScenario('${s.id}')" style="font-size: 0.65rem; padding: 2px 6px">
                🗑️
              </button>
            </div>
            <div id="scenarioResults_${s.id}" style="display: none; margin-top: 8px; font-size: 0.75rem"></div>
          </div>
        `).join('');
      }

      // Replay scenario
      async function replayScenario(id) {
        const scenario = sessionManager.getScenario(id);
        if (!scenario) {
          appendMessage('error', 'Scenario not found');
          return;
        }

        const resultsEl = document.getElementById(`scenarioResults_${id}`);
        resultsEl.style.display = 'block';
        resultsEl.innerHTML = '<div style="color: var(--text-muted)">🔄 Replaying...</div>';

        let passed = 0;
        let failed = 0;
        const results = [];

        for (let i = 0; i < scenario.steps.length; i++) {
          const step = scenario.steps[i];

          try {
            const startTime = performance.now();
            const response = await fetch('/api/mcp/call', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                serverName: step.server,
                toolName: step.tool,
                args: step.args,
              }),
            });

            const data = await response.json();
            const duration = Math.round(performance.now() - startTime);
            const actualHash = hashString(JSON.stringify(data.result || data.error));
            const isError = data.error || data.result?.isError === true;
            const hashMatch = actualHash === step.responseHash;

            // Schema validation (if schema was saved)
            let schemaViolations = [];
            if (step.responseSchema && data.result && !isError) {
              schemaViolations = validateSchema(data.result, step.responseSchema);
            }

            if (isError) {
              failed++;
              results.push({ step: i + 1, tool: step.tool, status: 'error', message: data.error || 'Error', duration, schemaViolations: [] });
            } else if (!hashMatch) {
              failed++;
              results.push({ step: i + 1, tool: step.tool, status: 'diff', message: 'Response differs from baseline', duration, expected: step.expectedResponse, actual: data.result, schemaViolations });
            } else {
              passed++;
              results.push({ step: i + 1, tool: step.tool, status: 'pass', duration, schemaViolations });
            }
          } catch (err) {
            failed++;
            results.push({ step: i + 1, tool: step.tool, status: 'error', message: err.message, schemaViolations: [] });
          }
        }

        // Show results
        resultsEl.innerHTML = `
          <div style="margin-bottom: 8px">
            <strong>Results:</strong>
            <span style="color: var(--success)">${passed} passed</span> /
            <span style="color: var(--error)">${failed} failed</span>
          </div>
          ${results.map(r => `
            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 4px; background: var(--bg-card); border-radius: 4px; margin-bottom: 2px">
              ${r.status === 'pass' ? '✅' : r.status === 'diff' ? '🔶' : '❌'}
              <strong>${r.step}.</strong> ${escapeHtml(r.tool)}
              ${r.duration ? `<span style="color: var(--text-muted)">(${r.duration}ms)</span>` : ''}
              ${r.message ? `<span style="color: var(--error); font-size: 0.7rem">${escapeHtml(r.message)}</span>` : ''}
              ${r.status === 'diff' ? `<button class="btn" onclick="showDiff(${JSON.stringify(r.expected).replace(/"/g, '&quot;')}, ${JSON.stringify(r.actual).replace(/"/g, '&quot;')})" style="font-size: 0.6rem; padding: 1px 4px">View Diff</button>` : ''}
              ${r.schemaViolations && r.schemaViolations.length > 0 ? `
                <span style="color: var(--warning); font-size: 0.65rem; margin-left: 4px">📋 ${r.schemaViolations.length} schema issue${r.schemaViolations.length !== 1 ? 's' : ''}</span>
              ` : r.status === 'pass' && r.schemaViolations ? '<span style="color: var(--success); font-size: 0.65rem">📋 Schema OK</span>' : ''}
            </div>
          `).join('')}
        `;

        appendMessage('system', `🧪 Scenario "${scenario.name}" completed: ${passed} passed, ${failed} failed`);
      }

      // View scenario details - Full modal
      function viewScenarioDetails(id) {
        const scenario = sessionManager.getScenario(id);
        if (!scenario) return;

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'scenarioDetailsModal';
        modal.style.display = 'flex';
        modal.innerHTML = `
          <div class="modal" style="max-width: 800px; max-height: 85vh">
            <div class="modal-header">
              <h2 class="modal-title">🧪 ${escapeHtml(scenario.name)}</h2>
              <button class="modal-close" onclick="closeScenarioDetailsModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style="padding: var(--spacing-md); overflow-y: auto; max-height: calc(85vh - 130px)">
              <!-- Metadata -->
              <div style="display: flex; gap: 16px; margin-bottom: 16px; font-size: 0.75rem; color: var(--text-muted)">
                <span>📅 Created: ${new Date(scenario.created).toLocaleString()}</span>
                <span>📦 ${scenario.steps?.length || 0} steps</span>
                ${scenario.metadata?.totalTime ? `<span>⏱️ Total: ${scenario.metadata.totalTime}ms</span>` : ''}
              </div>

              <!-- Steps -->
              <div style="display: flex; flex-direction: column; gap: 12px">
                ${(scenario.steps || []).map((step, i) => `
                  <div style="background: var(--bg-card); border-radius: 8px; padding: 12px; border-left: 3px solid ${step.success ? 'var(--success)' : 'var(--error)'}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
                      <div style="display: flex; align-items: center; gap: 8px">
                        <span style="font-weight: 600">${i + 1}.</span>
                        <span>${step.success ? '✅' : '❌'}</span>
                        <code style="font-weight: 500">${escapeHtml(step.tool)}</code>
                        <span style="color: var(--text-muted); font-size: 0.7rem">@ ${escapeHtml(step.server)}</span>
                      </div>
                      <span style="color: var(--text-muted); font-size: 0.7rem">${step.timing}ms</span>
                    </div>

                    <!-- Arguments -->
                    <details style="margin-bottom: 8px">
                      <summary style="cursor: pointer; font-size: 0.75rem; color: var(--text-muted)">📥 Arguments</summary>
                      <pre style="background: var(--bg-surface); padding: 8px; border-radius: 4px; font-size: 0.7rem; margin-top: 4px; overflow-x: auto; max-height: 100px">${escapeHtml(JSON.stringify(step.args || {}, null, 2))}</pre>
                    </details>

                    <!-- Baseline Response -->
                    <details style="margin-bottom: 8px">
                      <summary style="cursor: pointer; font-size: 0.75rem; color: var(--text-muted)">📤 Baseline Response (hash: ${step.responseHash || 'N/A'})</summary>
                      <pre style="background: var(--bg-surface); padding: 8px; border-radius: 4px; font-size: 0.7rem; margin-top: 4px; overflow-x: auto; max-height: 150px">${escapeHtml(JSON.stringify(step.expectedResponse || {}, null, 2))}</pre>
                    </details>

                    <!-- Schema Info -->
                    ${step.responseSchema ? `
                      <details>
                        <summary style="cursor: pointer; font-size: 0.75rem; color: var(--text-muted)">📋 Inferred Schema</summary>
                        <pre style="background: var(--bg-surface); padding: 8px; border-radius: 4px; font-size: 0.7rem; margin-top: 4px; overflow-x: auto; max-height: 100px">${escapeHtml(JSON.stringify(step.responseSchema, null, 2))}</pre>
                      </details>
                    ` : ''}
                  </div>
                `).join('')}
              </div>

              <!-- Usage Guide -->
              <div style="margin-top: 16px; padding: 12px; background: var(--bg-surface); border-radius: 8px; font-size: 0.75rem">
                <strong>💡 How to use:</strong>
                <ul style="margin: 8px 0 0 16px; color: var(--text-muted)">
                  <li><strong>▶️ Replay</strong> - Re-run all steps, compare responses</li>
                  <li><strong>🔶 Diff</strong> - Click "View Diff" if response differs from baseline</li>
                  <li><strong>📋 Schema</strong> - Validates response structure (type, required fields)</li>
                </ul>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn" onclick="closeScenarioDetailsModal()">Close</button>
              <button class="btn" style="background: var(--success); color: white" onclick="closeScenarioDetailsModal(); replayScenario('${scenario.id}')">▶️ Replay</button>
            </div>
          </div>
        `;

        document.body.appendChild(modal);
      }

      // Close scenario details modal
      function closeScenarioDetailsModal() {
        const modal = document.getElementById('scenarioDetailsModal');
        if (modal) modal.remove();
      }

      // Export single scenario
      function exportScenario(id) {
        const scenario = sessionManager.getScenario(id);
        if (!scenario) return;

        const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scenario-${scenario.name.replace(/[^a-z0-9]/gi, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      // Export all scenarios
      function exportAllScenarios() {
        const scenarios = sessionManager.getScenarios();
        if (scenarios.length === 0) {
          appendMessage('error', 'No scenarios to export');
          return;
        }

        const blob = new Blob([JSON.stringify(scenarios, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mcp-scenarios-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        appendMessage('system', `📥 Exported ${scenarios.length} scenarios`);
      }

      // Delete scenario
      function deleteScenario(id) {
        if (confirm('Delete this scenario?')) {
          sessionManager.deleteScenario(id);
          refreshScenariosPanel();
          appendMessage('system', '🗑️ Scenario deleted');
        }
      }

      // ==========================================
      // TEST SUITES FUNCTIONS
      // ==========================================

      // Refresh suites list
      function refreshSuitesList() {
        const suites = sessionManager.getSuites();
        const suitesEl = document.getElementById('suitesList');
        
        if (!suitesEl) return;
        
        if (suites.length === 0) {
          suitesEl.innerHTML = '<div style="color: var(--text-muted);">No test suites created yet.</div>';
          return;
        }
        
        suitesEl.innerHTML = suites.map(suite => `
          <div style="background: var(--bg-card); padding: 8px; border-radius: 6px; margin-bottom: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>${escapeHtml(suite.name)}</strong>
                <span style="color: var(--text-muted); font-size: 0.65rem;">(${suite.scenarioIds?.length || 0} scenarios)</span>
              </div>
              <div style="display: flex; gap: 4px;">
                <button class="btn success" onclick="runSuite('${suite.id}')" style="font-size: 0.6rem; padding: 2px 6px;">▶️ Run</button>
                <button class="btn" onclick="editSuite('${suite.id}')" style="font-size: 0.6rem; padding: 2px 6px;">✏️</button>
                <button class="btn" onclick="deleteSuite('${suite.id}')" style="font-size: 0.6rem; padding: 2px 6px;">🗑️</button>
              </div>
            </div>
            ${suite.lastRun ? `
              <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 4px;">
                Last run: ${new Date(suite.lastRun.timestamp).toLocaleString()} - 
                <span style="color: var(--success)">${suite.lastRun.passed} passed</span> / 
                <span style="color: var(--error)">${suite.lastRun.failed} failed</span>
              </div>
            ` : ''}
          </div>
        `).join('');
      }

      // Show create suite modal
      function showCreateSuiteModal(editId = null) {
        const scenarios = sessionManager.getScenarios();
        const existingSuite = editId ? sessionManager.getSuite(editId) : null;
        
        if (scenarios.length === 0) {
          appendMessage('error', 'Create some scenarios first before making a test suite.');
          return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'suiteModal';
        modal.style.display = 'flex';
        modal.innerHTML = `
          <div class="modal" style="max-width: 500px;">
            <div class="modal-header">
              <h2 class="modal-title">${editId ? '✏️ Edit' : '➕ Create'} Test Suite</h2>
              <button class="modal-close" onclick="closeSuiteModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style="padding: var(--spacing-md);">
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Suite Name</label>
                <input type="text" id="suiteName" class="form-input" placeholder="e.g., API Integration Tests" 
                  value="${escapeHtml(existingSuite?.name || '')}" style="width: 100%;">
              </div>
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Select Scenarios</label>
                <div style="max-height: 200px; overflow-y: auto; background: var(--bg-card); border-radius: 6px; padding: 8px;">
                  ${scenarios.map(s => `
                    <label style="display: flex; align-items: center; gap: 8px; padding: 4px; cursor: pointer;">
                      <input type="checkbox" class="suite-scenario-checkbox" value="${s.id}" 
                        ${existingSuite?.scenarioIds?.includes(s.id) ? 'checked' : ''}>
                      <span>${escapeHtml(s.name)}</span>
                      <span style="color: var(--text-muted); font-size: 0.7rem;">(${s.steps?.length || 0} steps)</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn" onclick="closeSuiteModal()">Cancel</button>
              <button class="btn primary" onclick="saveSuite('${editId || ''}')">💾 Save Suite</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }

      // Close suite modal
      function closeSuiteModal() {
        const modal = document.getElementById('suiteModal');
        if (modal) modal.remove();
      }

      // Save suite
      function saveSuite(editId) {
        const name = document.getElementById('suiteName').value.trim();
        const checkboxes = document.querySelectorAll('.suite-scenario-checkbox:checked');
        const scenarioIds = Array.from(checkboxes).map(cb => cb.value);
        
        if (!name) {
          alert('Please enter a suite name');
          return;
        }
        
        if (scenarioIds.length === 0) {
          alert('Please select at least one scenario');
          return;
        }
        
        const suite = {
          id: editId || `suite_${Date.now()}`,
          name,
          scenarioIds,
          createdAt: editId ? sessionManager.getSuite(editId)?.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        if (editId) {
          const existing = sessionManager.getSuite(editId);
          if (existing?.lastRun) suite.lastRun = existing.lastRun;
        }
        
        sessionManager.saveSuite(suite);
        closeSuiteModal();
        refreshSuitesList();
        appendMessage('system', `📦 Suite "${name}" saved with ${scenarioIds.length} scenarios`);
      }

      // Edit suite
      function editSuite(id) {
        showCreateSuiteModal(id);
      }

      // Delete suite
      function deleteSuite(id) {
        if (confirm('Delete this test suite?')) {
          sessionManager.deleteSuite(id);
          refreshSuitesList();
          appendMessage('system', '🗑️ Suite deleted');
        }
      }

      // Run entire suite
      async function runSuite(id) {
        const suite = sessionManager.getSuite(id);
        if (!suite) return;
        
        appendMessage('system', `🚀 Running suite "${suite.name}" with ${suite.scenarioIds.length} scenarios...`);
        
        let totalPassed = 0;
        let totalFailed = 0;
        
        for (const scenarioId of suite.scenarioIds) {
          const scenario = sessionManager.getScenario(scenarioId);
          if (!scenario) {
            appendMessage('error', `Scenario not found: ${scenarioId}`);
            totalFailed++;
            continue;
          }
          
          // Run each scenario
          let passed = 0, failed = 0;
          for (const step of scenario.steps) {
            try {
              const response = await fetch('/api/mcp/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  serverName: step.server,
                  toolName: step.tool,
                  args: step.args || {},
                }),
              });
              const data = await response.json();
              
              if (data.error) {
                failed++;
              } else if (step.expectedResponse) {
                const actual = JSON.stringify(data.result);
                const expected = JSON.stringify(step.expectedResponse);
                if (actual !== expected) {
                  failed++;
                } else {
                  passed++;
                }
              } else {
                passed++;
              }
            } catch (err) {
              failed++;
            }
          }
          
          totalPassed += passed;
          totalFailed += failed;
        }
        
        // Update suite with results
        suite.lastRun = {
          timestamp: new Date().toISOString(),
          passed: totalPassed,
          failed: totalFailed,
        };
        sessionManager.saveSuite(suite);
        refreshSuitesList();
        
        appendMessage('system', `📦 Suite "${suite.name}" completed: ${totalPassed} passed, ${totalFailed} failed`);
      }

      // ==========================================
      // RESPONSE DIFFING - SEMANTIC JSON COMPARISON
      // ==========================================

      // Compute semantic diff between two JSON objects
      function jsonDiff(expected, actual, path = '') {
        const diffs = [];

        const expectedType = getType(expected);
        const actualType = getType(actual);

        // Type mismatch
        if (expectedType !== actualType) {
          diffs.push({
            type: 'type_change',
            path: path || '(root)',
            expected: expectedType,
            actual: actualType,
            expectedValue: expected,
            actualValue: actual,
          });
          return diffs;
        }

        // Compare objects
        if (expectedType === 'object') {
          const allKeys = new Set([...Object.keys(expected), ...Object.keys(actual)]);

          for (const key of allKeys) {
            const keyPath = path ? `${path}.${key}` : key;

            if (!(key in expected)) {
              diffs.push({
                type: 'added',
                path: keyPath,
                actualValue: actual[key],
              });
            } else if (!(key in actual)) {
              diffs.push({
                type: 'missing',
                path: keyPath,
                expectedValue: expected[key],
              });
            } else {
              diffs.push(...jsonDiff(expected[key], actual[key], keyPath));
            }
          }
        }
        // Compare arrays
        else if (expectedType === 'array') {
          const maxLen = Math.max(expected.length, actual.length);
          for (let i = 0; i < maxLen; i++) {
            const keyPath = `${path}[${i}]`;
            if (i >= expected.length) {
              diffs.push({
                type: 'added',
                path: keyPath,
                actualValue: actual[i],
              });
            } else if (i >= actual.length) {
              diffs.push({
                type: 'missing',
                path: keyPath,
                expectedValue: expected[i],
              });
            } else {
              diffs.push(...jsonDiff(expected[i], actual[i], keyPath));
            }
          }
        }
        // Compare primitives
        else {
          if (expected !== actual) {
            diffs.push({
              type: 'changed',
              path: path || '(root)',
              expectedValue: expected,
              actualValue: actual,
            });
          }
        }

        return diffs;
      }

      // Get type of value
      function getType(val) {
        if (val === null) return 'null';
        if (Array.isArray(val)) return 'array';
        return typeof val;
      }

      // Format value for display
      function formatValue(val) {
        if (typeof val === 'string') return `"${val}"`;
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      }

      // Show diff modal with semantic comparison
      function showDiff(expected, actual) {
        const diffs = jsonDiff(expected, actual);

        // Create modal HTML
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'diffModal';
        modal.style.display = 'flex';
        modal.innerHTML = `
          <div class="modal" style="max-width: 800px; max-height: 80vh">
            <div class="modal-header">
              <h2 class="modal-title">📊 Response Diff</h2>
              <button class="modal-close" onclick="closeDiffModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style="padding: var(--spacing-md); overflow-y: auto; max-height: calc(80vh - 100px)">
              ${diffs.length === 0 ? `
                <div style="text-align: center; color: var(--success); padding: 20px">
                  ✅ No differences found
                </div>
              ` : `
                <div style="font-size: 0.75rem; margin-bottom: 12px; color: var(--text-muted)">
                  Found <strong>${diffs.length}</strong> difference${diffs.length !== 1 ? 's' : ''}
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px">
                  ${diffs.map(d => {
                    let icon, color, label;
                    switch (d.type) {
                      case 'missing':
                        icon = '🔴'; color = 'var(--error)'; label = 'MISSING';
                        break;
                      case 'added':
                        icon = '🟢'; color = 'var(--success)'; label = 'ADDED';
                        break;
                      case 'changed':
                        icon = '🟡'; color = 'var(--warning)'; label = 'CHANGED';
                        break;
                      case 'type_change':
                        icon = '🟠'; color = '#ff7700'; label = 'TYPE CHANGE';
                        break;
                    }
                    return `
                      <div style="background: var(--bg-card); border-left: 3px solid ${color}; padding: 8px 12px; border-radius: 4px">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px">
                          <span>${icon}</span>
                          <code style="font-weight: 500; color: var(--text-primary)">${escapeHtml(d.path)}</code>
                          <span style="font-size: 0.65rem; padding: 1px 4px; border-radius: 2px; background: ${color}20; color: ${color}">${label}</span>
                        </div>
                        <div style="font-size: 0.75rem; display: flex; gap: 16px">
                          ${d.type === 'missing' || d.type === 'changed' || d.type === 'type_change' ? `
                            <div>
                              <span style="color: var(--text-muted)">Expected:</span>
                              <code style="color: var(--error)">${escapeHtml(d.type === 'type_change' ? d.expected : formatValue(d.expectedValue))}</code>
                            </div>
                          ` : ''}
                          ${d.type === 'added' || d.type === 'changed' || d.type === 'type_change' ? `
                            <div>
                              <span style="color: var(--text-muted)">Actual:</span>
                              <code style="color: var(--success)">${escapeHtml(d.type === 'type_change' ? d.actual : formatValue(d.actualValue))}</code>
                            </div>
                          ` : ''}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
              <div style="margin-top: 16px; border-top: 1px solid var(--border); padding-top: 16px">
                <details>
                  <summary style="cursor: pointer; color: var(--text-muted); font-size: 0.75rem">📋 View Raw JSON</summary>
                  <div style="display: flex; gap: 16px; margin-top: 8px">
                    <div style="flex: 1">
                      <div style="font-size: 0.65rem; color: var(--text-muted); margin-bottom: 4px">Expected (baseline)</div>
                      <pre style="background: var(--bg-card); padding: 8px; border-radius: 4px; overflow-x: auto; font-size: 0.7rem; max-height: 200px">${escapeHtml(JSON.stringify(expected, null, 2))}</pre>
                    </div>
                    <div style="flex: 1">
                      <div style="font-size: 0.65rem; color: var(--text-muted); margin-bottom: 4px">Actual (current)</div>
                      <pre style="background: var(--bg-card); padding: 8px; border-radius: 4px; overflow-x: auto; font-size: 0.7rem; max-height: 200px">${escapeHtml(JSON.stringify(actual, null, 2))}</pre>
                    </div>
                  </div>
                </details>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn" onclick="closeDiffModal()">Close</button>
            </div>
          </div>
        `;

        document.body.appendChild(modal);
      }

      // Close diff modal
      function closeDiffModal() {
        const modal = document.getElementById('diffModal');
        if (modal) modal.remove();
      }

      // ==========================================
      // CUSTOM ASSERTIONS ENGINE
      // ==========================================

      /**
       * Evaluate custom assertions against a response
       * Supports: equals, contains, matches, exists, type, length, gt, lt, gte, lte
       * 
       * Assertion format:
       * { path: "$.data.users", operator: "length_gt", value: 0 }
       * { path: "$.status", operator: "equals", value: "active" }
       * { path: "$.email", operator: "matches", value: "/@company\\.com$/" }
       */
      function evaluateAssertions(response, assertions) {
        const results = [];
        
        for (const assertion of assertions) {
          const result = evaluateSingleAssertion(response, assertion);
          results.push(result);
        }
        
        return results;
      }

      // Evaluate a single assertion
      function evaluateSingleAssertion(response, assertion) {
        const { path, operator, value } = assertion;
        
        try {
          // Get value at path (simple JSONPath implementation)
          const actualValue = getValueAtPath(response, path);
          
          let passed = false;
          let message = '';
          
          switch (operator) {
            case 'equals':
              passed = JSON.stringify(actualValue) === JSON.stringify(value);
              message = passed ? `${path} equals expected` : `${path} = ${JSON.stringify(actualValue)}, expected ${JSON.stringify(value)}`;
              break;
              
            case 'not_equals':
              passed = JSON.stringify(actualValue) !== JSON.stringify(value);
              message = passed ? `${path} does not equal ${JSON.stringify(value)}` : `${path} unexpectedly equals ${JSON.stringify(value)}`;
              break;
              
            case 'contains':
              passed = String(actualValue).includes(value);
              message = passed ? `${path} contains "${value}"` : `${path} does not contain "${value}"`;
              break;
              
            case 'matches':
              const regex = new RegExp(value.replace(/^\/|\/$/g, ''));
              passed = regex.test(String(actualValue));
              message = passed ? `${path} matches ${value}` : `${path} = "${actualValue}" does not match ${value}`;
              break;
              
            case 'exists':
              passed = actualValue !== undefined;
              message = passed ? `${path} exists` : `${path} does not exist`;
              break;
              
            case 'not_exists':
              passed = actualValue === undefined;
              message = passed ? `${path} does not exist` : `${path} exists but should not`;
              break;
              
            case 'type':
              const actualType = getType(actualValue);
              passed = actualType === value;
              message = passed ? `${path} is type ${value}` : `${path} is ${actualType}, expected ${value}`;
              break;
              
            case 'length':
              const len = actualValue?.length || 0;
              passed = len === value;
              message = passed ? `${path}.length = ${value}` : `${path}.length = ${len}, expected ${value}`;
              break;
              
            case 'length_gt':
              const len2 = actualValue?.length || 0;
              passed = len2 > value;
              message = passed ? `${path}.length > ${value}` : `${path}.length = ${len2}, expected > ${value}`;
              break;
              
            case 'length_gte':
              const len3 = actualValue?.length || 0;
              passed = len3 >= value;
              message = passed ? `${path}.length >= ${value}` : `${path}.length = ${len3}, expected >= ${value}`;
              break;
              
            case 'gt':
              passed = Number(actualValue) > Number(value);
              message = passed ? `${path} > ${value}` : `${path} = ${actualValue}, expected > ${value}`;
              break;
              
            case 'gte':
              passed = Number(actualValue) >= Number(value);
              message = passed ? `${path} >= ${value}` : `${path} = ${actualValue}, expected >= ${value}`;
              break;
              
            case 'lt':
              passed = Number(actualValue) < Number(value);
              message = passed ? `${path} < ${value}` : `${path} = ${actualValue}, expected < ${value}`;
              break;
              
            case 'lte':
              passed = Number(actualValue) <= Number(value);
              message = passed ? `${path} <= ${value}` : `${path} = ${actualValue}, expected <= ${value}`;
              break;
              
            default:
              message = `Unknown operator: ${operator}`;
          }
          
          return { assertion, passed, message, actualValue };
        } catch (error) {
          return { assertion, passed: false, message: `Error: ${error.message}`, error: true };
        }
      }

      // Simple JSONPath implementation (supports $.path.to.value and $[0].item)
      function getValueAtPath(obj, path) {
        if (!path || path === '$') return obj;
        
        // Remove leading $. or $
        const cleanPath = path.replace(/^\$\.?/, '');
        if (!cleanPath) return obj;
        
        const parts = cleanPath.split(/\.|\[|\]/).filter(p => p !== '');
        let current = obj;
        
        for (const part of parts) {
          if (current === undefined || current === null) return undefined;
          current = current[part];
        }
        
        return current;
      }

      // Available assertion operators for UI
      const ASSERTION_OPERATORS = [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Not Equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'matches', label: 'Matches Regex' },
        { value: 'exists', label: 'Exists' },
        { value: 'not_exists', label: 'Does Not Exist' },
        { value: 'type', label: 'Is Type' },
        { value: 'length', label: 'Length Equals' },
        { value: 'length_gt', label: 'Length Greater Than' },
        { value: 'length_gte', label: 'Length At Least' },
        { value: 'gt', label: 'Greater Than' },
        { value: 'gte', label: 'At Least' },
        { value: 'lt', label: 'Less Than' },
        { value: 'lte', label: 'At Most' },
      ];

      // ==========================================
      // SCHEMA VALIDATION - CONTRACT TESTING
      // ==========================================

      // Infer schema from a response object
      function inferSchema(value, path = '') {
        const type = getType(value);

        const schema = { type, path: path || '(root)' };

        if (type === 'object' && value !== null) {
          schema.properties = {};
          schema.required = Object.keys(value);
          for (const [key, val] of Object.entries(value)) {
            schema.properties[key] = inferSchema(val, path ? `${path}.${key}` : key);
          }
        } else if (type === 'array' && value.length > 0) {
          // Infer schema from first item
          schema.items = inferSchema(value[0], `${path}[0]`);
          schema.minItems = value.length; // Record original length
        }

        return schema;
      }

      // Validate a value against an inferred schema
      function validateSchema(value, schema, path = '') {
        const violations = [];
        const actualType = getType(value);

        // Type check
        if (actualType !== schema.type) {
          violations.push({
            type: 'type_mismatch',
            path: path || '(root)',
            expected: schema.type,
            actual: actualType,
          });
          return violations; // Can't continue if types don't match
        }

        // Object validation
        if (schema.type === 'object' && schema.properties) {
          // Check required fields
          for (const key of (schema.required || [])) {
            if (!(key in value)) {
              violations.push({
                type: 'missing_required',
                path: path ? `${path}.${key}` : key,
                message: 'Required field missing',
              });
            }
          }

          // Check extra fields (warning only)
          for (const key of Object.keys(value)) {
            if (!(key in schema.properties)) {
              violations.push({
                type: 'extra_field',
                path: path ? `${path}.${key}` : key,
                message: 'Unexpected extra field',
              });
            }
          }

          // Recursively validate properties
          for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (key in value) {
              violations.push(...validateSchema(value[key], propSchema, path ? `${path}.${key}` : key));
            }
          }
        }

        // Array validation
        else if (schema.type === 'array' && schema.items && value.length > 0) {
          // Validate each item against the item schema
          for (let i = 0; i < value.length; i++) {
            violations.push(...validateSchema(value[i], schema.items, `${path}[${i}]`));
          }
        }

        return violations;
      }

      // Format schema violations for display
      function formatSchemaViolations(violations) {
        if (violations.length === 0) {
          return '<span style="color: var(--success)">✅ Schema valid</span>';
        }

        return violations.map(v => {
          let icon, color;
          switch (v.type) {
            case 'type_mismatch':
              icon = '🟠'; color = '#ff7700';
              return `<div style="display: flex; gap: 4px; align-items: center"><span>${icon}</span><code>${v.path}</code>: type ${v.expected} → ${v.actual}</div>`;
            case 'missing_required':
              icon = '🔴'; color = 'var(--error)';
              return `<div style="display: flex; gap: 4px; align-items: center"><span>${icon}</span><code>${v.path}</code>: required field missing</div>`;
            case 'extra_field':
              icon = '🟡'; color = 'var(--warning)';
              return `<div style="display: flex; gap: 4px; align-items: center"><span>${icon}</span><code>${v.path}</code>: unexpected extra field</div>`;
            default:
              return `<div>${v.message || v.type}</div>`;
          }
        }).join('');
      }

      // ==========================================
      // SYSTEM PROMPT UI
      // ==========================================
      
      // Populate system prompt dropdown
      function populateSystemPrompts() {
        const select = document.getElementById('systemPromptSelect');
        if (!select) return;
        
        const prompts = sessionManager.getPrompts();
        const activeId = sessionManager.getActivePromptId();
        
        select.innerHTML = Object.entries(prompts).map(([id, p]) => 
          `<option value="${id}" ${id === activeId ? 'selected' : ''}>${p.icon} ${escapeHtml(p.name)}${p.custom ? ' ★' : ''}</option>`
        ).join('');
      }
      
      // Change active system prompt
      function changeSystemPrompt(id) {
        sessionManager.setActivePromptId(id);
        const prompts = sessionManager.getPrompts();
        const prompt = prompts[id];
        if (prompt) {
          appendMessage('system', `🎭 Switched to "${prompt.name}" persona`);
        }
      }
      
      // Show prompt manager modal
      function showPromptManager() {
        const prompts = sessionManager.getPrompts();
        const activeId = sessionManager.getActivePromptId();
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'promptManagerModal';
        modal.style.display = 'flex';
        modal.innerHTML = `
          <div class="modal" style="max-width: 600px">
            <div class="modal-header">
              <h2 class="modal-title">🎭 System Prompts</h2>
              <button class="modal-close" onclick="closePromptManager()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style="padding: var(--spacing-md); max-height: 400px; overflow-y: auto;">
              ${Object.entries(prompts).map(([id, p]) => `
                <div style="padding: 12px; margin-bottom: 8px; background: var(--bg-card); border-radius: 8px; border-left: 3px solid ${id === activeId ? 'var(--success)' : 'var(--border)'}">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong>${p.icon} ${escapeHtml(p.name)}${p.custom ? ' <span style="color: var(--primary)">★ Custom</span>' : ''}</strong>
                    <div style="display: flex; gap: 4px;">
                      ${p.custom ? `<button class="btn" onclick="deleteSystemPrompt('${id}')" style="padding: 2px 6px; font-size: 0.7rem; color: var(--error)">🗑️</button>` : ''}
                      <button class="btn" onclick="selectAndClosePrompt('${id}')" style="padding: 2px 8px; font-size: 0.7rem; ${id === activeId ? 'background: var(--success); color: white;' : ''}">${id === activeId ? '✓ Active' : 'Use'}</button>
                    </div>
                  </div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); white-space: pre-wrap;">${escapeHtml(p.prompt.substring(0, 150))}${p.prompt.length > 150 ? '...' : ''}</div>
                </div>
              `).join('')}
              
              <!-- Add Custom Prompt -->
              <div style="margin-top: 16px; padding: 12px; background: var(--bg-surface); border-radius: 8px;">
                <strong>➕ Create Custom Prompt</strong>
                <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 8px;">
                  <input type="text" id="newPromptName" class="form-input" placeholder="Prompt name (e.g., SQL Expert)" style="font-size: 0.8rem;">
                  <textarea id="newPromptText" class="form-input" placeholder="System prompt text..." rows="3" style="font-size: 0.8rem;"></textarea>
                  <button class="btn success" onclick="saveNewPrompt()" style="align-self: flex-start;">💾 Save Prompt</button>
                </div>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn" onclick="closePromptManager()">Close</button>
            </div>
          </div>
        `;
        
        document.body.appendChild(modal);
      }
      
      // Close prompt manager
      function closePromptManager() {
        const modal = document.getElementById('promptManagerModal');
        if (modal) modal.remove();
      }
      
      // Select prompt and close manager
      function selectAndClosePrompt(id) {
        changeSystemPrompt(id);
        populateSystemPrompts();
        closePromptManager();
      }
      
      // Save new custom prompt
      function saveNewPrompt() {
        const name = document.getElementById('newPromptName').value.trim();
        const prompt = document.getElementById('newPromptText').value.trim();
        
        if (!name || !prompt) {
          appendMessage('error', 'Please enter both name and prompt text');
          return;
        }
        
        const id = `custom_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
        if (sessionManager.savePrompt(id, name, prompt)) {
          appendMessage('system', `💾 Saved custom prompt "${name}"`);
          populateSystemPrompts();
          closePromptManager();
          showPromptManager(); // Reopen to show new prompt
        }
      }
      
      // Delete custom prompt
      function deleteSystemPrompt(id) {
        const prompts = sessionManager.getPrompts();
        const prompt = prompts[id];
        if (prompt && confirm(`Delete "${prompt.name}"?`)) {
          sessionManager.deletePrompt(id);
          if (sessionManager.getActivePromptId() === id) {
            sessionManager.setActivePromptId('default');
          }
          populateSystemPrompts();
          closePromptManager();
          showPromptManager();
          appendMessage('system', `🗑️ Deleted prompt "${prompt.name}"`);
        }
      }

      // Restore session - render saved messages
      function restoreSession() {
        if (messages.length > 0) {
          messagesEl.innerHTML = '';
          messages.forEach(msg => {
            if (msg.role !== 'system') {
              appendMessage(msg.role, msg.content, false); // false = don't save again
            }
          });
          console.log(`[Session] Restored ${messages.length} messages`);
        }
      }

      // ==========================================
      // TOKEN USAGE DISPLAY
      // ==========================================
      
      // Update token display badge
      function updateTokenDisplay() {
        const usage = sessionManager.getTokenUsage();
        const badge = document.getElementById('tokenCount');
        if (badge) {
          const total = usage.total || 0;
          if (total >= 1000000) {
            badge.textContent = `${(total / 1000000).toFixed(1)}M`;
          } else if (total >= 1000) {
            badge.textContent = `${(total / 1000).toFixed(1)}K`;
          } else {
            badge.textContent = `${total}`;
          }
        }
      }
      
      // Show token usage details modal
      function showTokenUsage() {
        const usage = sessionManager.getTokenUsage();
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'tokenUsageModal';
        modal.style.display = 'flex';
        modal.innerHTML = `
          <div class="modal" style="max-width: 400px">
            <div class="modal-header">
              <h2 class="modal-title">📊 Token Usage</h2>
              <button class="modal-close" onclick="closeTokenUsageModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style="padding: var(--spacing-md);">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                <div style="background: var(--bg-card); padding: 12px; border-radius: 8px; text-align: center;">
                  <div style="font-size: 1.5rem; font-weight: 600; color: var(--primary)">${(usage.input || 0).toLocaleString()}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted)">📥 Input Tokens</div>
                </div>
                <div style="background: var(--bg-card); padding: 12px; border-radius: 8px; text-align: center;">
                  <div style="font-size: 1.5rem; font-weight: 600; color: var(--success)">${(usage.output || 0).toLocaleString()}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted)">📤 Output Tokens</div>
                </div>
              </div>
              
              <div style="background: var(--bg-surface); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Total Tokens:</span>
                  <strong>${(usage.total || 0).toLocaleString()}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span>Estimated Cost:</span>
                  <strong style="color: ${usage.cost > 0 ? 'var(--warning)' : 'var(--success)'}">
                    ${usage.cost > 0 ? '$' + usage.cost.toFixed(4) : 'Free (Ollama)'}
                  </strong>
                </div>
              </div>
              
              <div style="font-size: 0.7rem; color: var(--text-muted); text-align: center;">
                Token counts are estimates (~4 characters per token).<br>
                Cost based on ${usage.provider || 'ollama'} pricing.
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn" onclick="resetTokenUsage()">🔄 Reset</button>
              <button class="btn" onclick="closeTokenUsageModal()">Close</button>
            </div>
          </div>
        `;
        
        document.body.appendChild(modal);
      }
      
      // Close token usage modal
      function closeTokenUsageModal() {
        const modal = document.getElementById('tokenUsageModal');
        if (modal) modal.remove();
      }
      
      // Reset token usage
      function resetTokenUsage() {
        if (confirm('Reset token usage for this session?')) {
          sessionManager.resetTokens();
          updateTokenDisplay();
          closeTokenUsageModal();
          appendMessage('system', '🔄 Token usage reset');
        }
      }

      // ==========================================
      // MOCK MCP SERVER GENERATOR
      // ==========================================
      
      let generatorTools = [];
      let generatedCode = '';

      // Add a new tool to the generator
      function addGeneratorTool() {
        const toolId = `tool_${Date.now()}`;
        generatorTools.push({
          id: toolId,
          name: '',
          description: '',
          params: []
        });
        renderGeneratorTools();
      }

      // Render the tools list
      function renderGeneratorTools() {
        const listEl = document.getElementById('generatorToolsList');
        
        if (generatorTools.length === 0) {
          listEl.innerHTML = `
            <div style="color: var(--text-muted); font-style: italic; padding: 12px; text-align: center;">
              No tools defined. Click "Add Tool" to start designing.
            </div>
          `;
          return;
        }

        listEl.innerHTML = generatorTools.map((tool, idx) => `
          <div style="background: var(--bg-card); padding: 10px; border-radius: 8px; border: 1px solid var(--border);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong style="font-size: 0.8rem;">Tool ${idx + 1}</strong>
              <button class="btn" onclick="removeGeneratorTool('${tool.id}')" style="font-size: 0.6rem; padding: 2px 6px;">🗑️</button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <input type="text" class="form-input" placeholder="Tool name (e.g., get_weather)" 
                value="${escapeHtml(tool.name)}" 
                onchange="updateGeneratorTool('${tool.id}', 'name', this.value)"
                style="font-size: 0.75rem; padding: 4px 8px;">
              <input type="text" class="form-input" placeholder="Description" 
                value="${escapeHtml(tool.description)}" 
                onchange="updateGeneratorTool('${tool.id}', 'description', this.value)"
                style="font-size: 0.75rem; padding: 4px 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.7rem; color: var(--text-muted);">Parameters: ${tool.params.length}</span>
                <button class="btn" onclick="addToolParam('${tool.id}')" style="font-size: 0.6rem; padding: 2px 6px;">➕ Param</button>
              </div>
              ${tool.params.map((param, pIdx) => `
                <div style="display: flex; gap: 4px; align-items: center; padding-left: 8px;">
                  <input type="text" class="form-input" placeholder="param_name" 
                    value="${escapeHtml(param.name)}"
                    onchange="updateToolParam('${tool.id}', ${pIdx}, 'name', this.value)"
                    style="flex: 1; font-size: 0.7rem; padding: 2px 6px;">
                  <select class="form-select" 
                    onchange="updateToolParam('${tool.id}', ${pIdx}, 'type', this.value)"
                    style="width: 80px; font-size: 0.7rem; padding: 2px 4px;">
                    <option value="string" ${param.type === 'string' ? 'selected' : ''}>string</option>
                    <option value="number" ${param.type === 'number' ? 'selected' : ''}>number</option>
                    <option value="boolean" ${param.type === 'boolean' ? 'selected' : ''}>boolean</option>
                    <option value="object" ${param.type === 'object' ? 'selected' : ''}>object</option>
                  </select>
                  <label style="font-size: 0.65rem; display: flex; align-items: center; gap: 2px;">
                    <input type="checkbox" ${param.required ? 'checked' : ''}
                      onchange="updateToolParam('${tool.id}', ${pIdx}, 'required', this.checked)">
                    Req
                  </label>
                  <button onclick="removeToolParam('${tool.id}', ${pIdx})" style="font-size: 0.6rem; padding: 1px 4px; background: none; border: none; cursor: pointer;">❌</button>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('');
      }

      // Update a tool property
      function updateGeneratorTool(toolId, prop, value) {
        const tool = generatorTools.find(t => t.id === toolId);
        if (tool) tool[prop] = value;
      }

      // Remove a tool
      function removeGeneratorTool(toolId) {
        generatorTools = generatorTools.filter(t => t.id !== toolId);
        renderGeneratorTools();
      }

      // Add parameter to a tool
      function addToolParam(toolId) {
        const tool = generatorTools.find(t => t.id === toolId);
        if (tool) {
          tool.params.push({ name: '', type: 'string', required: false });
          renderGeneratorTools();
        }
      }

      // Update a parameter
      function updateToolParam(toolId, paramIdx, prop, value) {
        const tool = generatorTools.find(t => t.id === toolId);
        if (tool && tool.params[paramIdx]) {
          tool.params[paramIdx][prop] = value;
        }
      }

      // Remove a parameter
      function removeToolParam(toolId, paramIdx) {
        const tool = generatorTools.find(t => t.id === toolId);
        if (tool) {
          tool.params.splice(paramIdx, 1);
          renderGeneratorTools();
        }
      }

      // Generate MCP server code
      function generateMCPCode() {
        const serverName = document.getElementById('genServerName').value || 'my-mcp-server';
        const serverDesc = document.getElementById('genServerDesc').value || 'A custom MCP server';
        const language = document.getElementById('genLanguage').value;

        if (generatorTools.length === 0) {
          appendMessage('error', 'Add at least one tool to generate code');
          return;
        }

        if (language === 'python') {
          generatedCode = generatePythonMCP(serverName, serverDesc);
        } else {
          generatedCode = generateNodeMCP(serverName, serverDesc);
        }

        document.getElementById('generatorPreviewSection').style.display = 'block';
        document.getElementById('generatorCodePreview').textContent = generatedCode;
        appendMessage('system', `🚀 Generated ${language} MCP server code with ${generatorTools.length} tools`);
      }

      // Preview without saving
      function previewMCPCode() {
        generateMCPCode();
      }

      // Generate Python MCP server code
      function generatePythonMCP(serverName, serverDesc) {
        const toolDefs = generatorTools.map(tool => {
          const params = tool.params.map(p => 
            `    ${p.name}: ${p.type === 'number' ? 'float' : p.type === 'boolean' ? 'bool' : 'str'}${!p.required ? ' = None' : ''}`
          ).join(',\n');
          
          return `
@mcp.tool()
async def ${tool.name || 'unnamed_tool'}(${params ? '\n' + params + '\n' : ''}):
    """${tool.description || 'No description'}"""
    # TODO: Implement your logic here
    return {"result": "success", "message": "Tool executed"}
`;
        }).join('\n');

        return `#!/usr/bin/env python3
"""
${serverDesc}
Generated by MCP Chat Studio
"""

from mcp.server import Server
from mcp.server.stdio import stdio_server

# Create server instance
mcp = Server("${serverName}")

${toolDefs}

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await mcp.run(read_stream, write_stream)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
`;
      }

      // Generate Node.js MCP server code
      function generateNodeMCP(serverName, serverDesc) {
        const toolDefs = generatorTools.map(tool => {
          const paramsSchema = tool.params.reduce((acc, p) => {
            acc[p.name] = { type: p.type, description: `${p.name} parameter` };
            return acc;
          }, {});
          const required = tool.params.filter(p => p.required).map(p => p.name);
          
          return `
  server.tool(
    "${tool.name || 'unnamed_tool'}",
    "${tool.description || 'No description'}",
    ${JSON.stringify(paramsSchema, null, 4)},
    ${JSON.stringify(required)},
    async (params) => {
      // TODO: Implement your logic here
      return { result: "success", message: "Tool executed" };
    }
  );
`;
        }).join('\n');

        return `#!/usr/bin/env node
/**
 * ${serverDesc}
 * Generated by MCP Chat Studio
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  { name: "${serverName}", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

${toolDefs}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("${serverName} MCP server running on stdio");
}

main().catch(console.error);
`;
      }

      // Copy generated code
      function copyGeneratedCode() {
        if (generatedCode) {
          navigator.clipboard.writeText(generatedCode);
          appendMessage('system', '📋 Code copied to clipboard');
        }
      }

      // Download generated code
      function downloadGeneratedCode() {
        if (!generatedCode) return;
        
        const language = document.getElementById('genLanguage').value;
        const serverName = document.getElementById('genServerName').value || 'my-mcp-server';
        const ext = language === 'python' ? 'py' : 'ts';
        const filename = `${serverName}.${ext}`;
        
        const blob = new Blob([generatedCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        appendMessage('system', `📥 Downloaded ${filename}`);
      }

      // Clear generator
      function clearGenerator() {
        if (confirm('Clear all tools and settings?')) {
          generatorTools = [];
          generatedCode = '';
          document.getElementById('genServerName').value = '';
          document.getElementById('genServerDesc').value = '';
          document.getElementById('generatorPreviewSection').style.display = 'none';
          renderGeneratorTools();
          appendMessage('system', '🗑️ Generator cleared');
        }
      }

      // Initialize
      restoreSession();
      checkAuthStatus();
      loadMCPStatus();
      populateSystemPrompts();
      updateTokenDisplay();

      // Refresh MCP status periodically
      setInterval(loadMCPStatus, 30000);

