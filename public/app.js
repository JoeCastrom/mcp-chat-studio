      // ==========================================
      // DEVELOPMENT MODE LOGGER
      // ==========================================
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const logger = {
        log: (...args) => isDevelopment && console.log(...args),
        warn: (...args) => console.warn(...args), // Always show warnings
        error: (...args) => console.error(...args), // Always show errors
        debug: (...args) => isDevelopment && console.log('[DEBUG]', ...args)
      };

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

        // ==========================================
        // SESSION BRANCHING
        // ==========================================
        BRANCHES_KEY: 'mcp_chat_studio_branches',

        // Get all branches
        getBranches() {
          try {
            return JSON.parse(localStorage.getItem(this.BRANCHES_KEY) || '[]');
          } catch (e) {
            return [];
          }
        },

        // Create a branch from current messages at specific index
        createBranch(name, messages, forkAtIndex) {
          try {
            const branches = this.getBranches();
            const branch = {
              id: `branch_${Date.now()}`,
              name,
              messages: messages.slice(0, forkAtIndex + 1),
              forkPoint: forkAtIndex,
              createdAt: new Date().toISOString(),
              parentId: null
            };
            branches.push(branch);
            localStorage.setItem(this.BRANCHES_KEY, JSON.stringify(branches));
            return branch;
          } catch (e) {
            console.warn('[Branches] Failed to create:', e.message);
            return null;
          }
        },

        // Load a branch (replace current messages)
        loadBranch(branchId) {
          const branch = this.getBranches().find(b => b.id === branchId);
          return branch?.messages || null;
        },

        // Delete a branch
        deleteBranch(id) {
          try {
            const branches = this.getBranches().filter(b => b.id !== id);
            localStorage.setItem(this.BRANCHES_KEY, JSON.stringify(branches));
          } catch (e) {
            console.warn('[Branches] Failed to delete:', e.message);
          }
        },

        // Get branch by ID
        getBranch(id) {
          return this.getBranches().find(b => b.id === id);
        },

        // ==========================================
        // TOOL FAVORITES
        // ==========================================
        FAVORITES_KEY: 'mcp_chat_studio_favorites',

        // Get all favorite tool IDs
        getFavorites() {
          try {
            return JSON.parse(localStorage.getItem(this.FAVORITES_KEY)) || [];
          } catch (e) {
            return [];
          }
        },

        // Toggle favorite status for a tool
        toggleFavorite(toolFullName) {
          const favorites = this.getFavorites();
          const index = favorites.indexOf(toolFullName);
          if (index >= 0) {
            favorites.splice(index, 1);
          } else {
            favorites.push(toolFullName);
          }
          localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(favorites));
          return index < 0; // Returns true if now favorited
        },

        // Check if tool is favorited
        isFavorite(toolFullName) {
          return this.getFavorites().includes(toolFullName);
        },

        // Generate cURL command for a tool call
        generateCurlCommand(serverName, toolName, args = {}) {
          const url = `http://localhost:3000/api/mcp/call`;
          const body = JSON.stringify({ serverName, toolName, args });
          return `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '${body.replace(/'/g, "'\"'\"'")}'`;
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
      let currentSessionId = null;
      let currentAbortController = null;
      let currentLoadingEl = null;
      let selectedTool = null; // Track selected tool for force mode
      
      // Cache for large data to avoid huge JSON in onclick attributes
      const diffDataCache = new Map();
      let diffDataId = 0;
      
      // Store diff data and return an ID
      function cacheDiffData(expected, actual) {
        const id = `diff_${++diffDataId}`;
        diffDataCache.set(id, { expected, actual });
        // Clean up old entries (keep last 50)
        if (diffDataCache.size > 50) {
          const firstKey = diffDataCache.keys().next().value;
          diffDataCache.delete(firstKey);
        }
        return id;
      }
      
      // Get cached diff data
      function getCachedDiffData(id) {
        return diffDataCache.get(id);
      }
      
      // Show diff from cached data
      function showDiffById(id) {
        const data = getCachedDiffData(id);
        if (data) {
          showDiff(data.expected, data.actual);
        }
      }
      
      // Cache for assertion results
      const assertionCache = new Map();
      let assertionCacheId = 0;
      
      function cacheAssertionResults(results) {
        const id = `assert_${++assertionCacheId}`;
        assertionCache.set(id, results);
        if (assertionCache.size > 50) {
          assertionCache.delete(assertionCache.keys().next().value);
        }
        return id;
      }
      
      function showAssertionResultsById(id) {
        const results = assertionCache.get(id);
        if (results) {
          showAssertionResults(results);
        }
      }

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

      function notifyUser(message, type = 'info') {
        if (typeof showNotification === 'function') {
          showNotification(message, type);
          return;
        }
        appendMessage('system', message);
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

      // Optional: Toggle sidebar button (not used in floating workspace)
      if (toggleSidebarEl) {
        toggleSidebarEl.addEventListener('click', () => {
          sidebarEl.classList.toggle('collapsed');
          toggleSidebarEl.classList.toggle('active');
        });
      }

      // Optional: Clear chat button (not used in floating workspace)
      if (clearChatEl) {
        clearChatEl.addEventListener('click', clearChat);
      }

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

        // Ctrl+K: Focus tool search (classic mode only)
        if (e.ctrlKey && e.key === 'k') {
          if (document.body.classList.contains('workspace-mode')) {
            return;
          }
          e.preventDefault();
          const searchInput = document.getElementById('toolSearch');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }

        // Ctrl+T: Quick tool search (classic mode only)
        if (e.ctrlKey && e.key === 't') {
          if (document.body.classList.contains('workspace-mode')) {
            return;
          }
          e.preventDefault();
          const searchInput = document.getElementById('toolSearch');
          if (searchInput) {
            searchInput.select();
          }
        }

        // Ctrl+R: Refresh all servers
        if (e.ctrlKey && e.key === 'r') {
          e.preventDefault();
          location.reload();
        }

        // F5: Re-run last tool (disabled browser default)
        if (e.key === 'F5') {
          e.preventDefault();
          // Rerun last inspector tool call if available
          const lastTool = window.lastToolCall;
          if (lastTool) {
            executeTool(lastTool.server, lastTool.tool, lastTool.args);
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

        // Ctrl+1-9 and Ctrl+0: Switch tabs (covers all 13 tabs)
        if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
          e.preventDefault();
          const tabs = ['chat', 'inspector', 'history', 'scenarios', 'workflows', 'generator', 'collections', 'monitors', 'toolexplorer'];
          const index = parseInt(e.key) - 1;
          if (tabs[index]) {
            switchTab(tabs[index]);
          }
        }
        // Ctrl+0 / Ctrl+B: Switch to mocks tab
        if (e.ctrlKey && (e.key === '0' || e.key === 'b' || e.key === 'B')) {
          e.preventDefault();
          switchTab('mocks');
        }
        // Alt+1-3: Additional tabs (scripts, docs, contracts)
        if (e.altKey && e.key >= '1' && e.key <= '3') {
          e.preventDefault();
          const extraTabs = ['scripts', 'docs', 'contracts'];
          const index = parseInt(e.key) - 1;
          if (extraTabs[index]) {
            switchTab(extraTabs[index]);
          }
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
          currentSessionId = data.sessionId || null;

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
          const sessionShort = currentSessionId
            ? `${currentSessionId.slice(0, 4)}…${currentSessionId.slice(-4)}`
            : 'Session';

          userSectionEl.innerHTML = `
          <div class="user-info">
            <div class="avatar">${initials}</div>
            <span class="user-name">${userInfo.name || userInfo.preferred_username || 'User'}</span>
          </div>
          ${currentSessionId ? `
          <button class="btn" onclick="copySessionId()" title="Copy session ID for CLI">
            🔑 ${sessionShort}
          </button>
          ` : ''}
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
          currentSessionId = null;
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

      function copySessionId() {
        if (!currentSessionId) {
          notifyUser('No session ID available. Please login again.', 'warning');
          return;
        }
        navigator.clipboard.writeText(currentSessionId).then(() => {
          notifyUser('Session ID copied for CLI use.', 'success');
        }).catch(() => {
          notifyUser('Failed to copy session ID.', 'error');
        });
      }

      function openWorkspaceTemplates() {
        if (typeof floatingWorkspace !== 'undefined' && typeof floatingWorkspace.showTemplatesModal === 'function') {
          floatingWorkspace.showTemplatesModal();
          return;
        }
        notifyUser('Workspace templates are available in Workspace mode.', 'info');
      }

      function openWorkspaceSessions() {
        if (!document.body.classList.contains('workspace-mode')) {
          notifyUser('Switch to Workspace mode to manage sessions.', 'info');
          return;
        }
        if (typeof floatingWorkspace !== 'undefined' && typeof floatingWorkspace.showSessionsModal === 'function') {
          floatingWorkspace.showSessionsModal();
          return;
        }
        notifyUser('Workspace sessions are available in Workspace mode.', 'info');
      }

      function exportWorkspaceBundle() {
        if (!document.body.classList.contains('workspace-mode')) {
          notifyUser('Switch to Workspace mode to export a bundle.', 'info');
          return;
        }
        if (typeof floatingWorkspace !== 'undefined' && typeof floatingWorkspace.exportWorkspace === 'function') {
          floatingWorkspace.exportWorkspace();
          return;
        }
        notifyUser('Workspace export is available in Workspace mode.', 'info');
      }

      function importWorkspaceBundle() {
        if (!document.body.classList.contains('workspace-mode')) {
          notifyUser('Switch to Workspace mode to import a bundle.', 'info');
          return;
        }
        if (typeof floatingWorkspace !== 'undefined' && typeof floatingWorkspace.importWorkspace === 'function') {
          floatingWorkspace.importWorkspace();
          return;
        }
        notifyUser('Workspace import is available in Workspace mode.', 'info');
      }

      function toggleWorkspaceMenu() {
        const popover = document.getElementById('workspaceMenuPopover');
        const toggle = document.getElementById('workspaceMenuToggle');
        if (!popover || !toggle) return;
        const isOpen = popover.classList.contains('open');
        if (isOpen) {
          closeWorkspaceMenu();
        } else {
          popover.classList.add('open');
          toggle.setAttribute('aria-expanded', 'true');
        }
      }

      function closeWorkspaceMenu() {
        const popover = document.getElementById('workspaceMenuPopover');
        const toggle = document.getElementById('workspaceMenuToggle');
        if (popover) popover.classList.remove('open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }

      function maybeShowWorkspaceTemplateHint() {
        if (localStorage.getItem('workspace_templates_hint') === 'shown') return;
        localStorage.setItem('workspace_templates_hint', 'shown');
        notifyUser('Tip: open Workspace Templates (🗂️) to load a layout fast.', 'info');
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
          if (typeof loadInspectorServers === 'function') {
            loadInspectorServers();
          }
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
          if (typeof loadInspectorServers === 'function') {
            loadInspectorServers();
          }
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
        loadExistingServerTemplates();
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

      async function loadExistingServerTemplates() {
        const group = document.getElementById('existingServersGroup');
        if (!group) return;

        try {
          Object.keys(serverTemplates)
            .filter(id => id.startsWith('existing_'))
            .forEach(id => delete serverTemplates[id]);

          const response = await fetch('/api/mcp/status', { credentials: 'include' });
          const status = await response.json();
          const servers = status.servers || status;
          const entries = Object.entries(servers || {}).filter(([, info]) => info?.config);
          const existing = entries
            .map(([name, info]) => {
              const config = info.config || {};
              const type = config.type || (config.command ? 'stdio' : 'sse');
              if (type === 'mock') return null;
              return {
                id: `existing_${name}`,
                label: `🔁 ${name}`,
                template: {
                  name,
                  type,
                  command: config.command || '',
                  args: Array.isArray(config.args) ? config.args.join('\n') : (config.args || ''),
                  url: config.url || '',
                  env: config.env,
                  description: config.description || `Configured MCP server: ${name}`,
                  envHint: 'Loaded from your configured servers'
                }
              };
            })
            .filter(Boolean);

          if (existing.length === 0) {
            group.style.display = 'none';
            group.innerHTML = '';
            return;
          }

          group.style.display = '';
          group.innerHTML = existing.map(item => {
            serverTemplates[item.id] = item.template;
            return `<option value="${item.id}">${escapeHtml(item.label)}</option>`;
          }).join('');
        } catch (error) {
          group.style.display = 'none';
          group.innerHTML = '';
        }
      }

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

        clearEnvVars();
        if (template.env && typeof template.env === 'object') {
          for (const [key, value] of Object.entries(template.env)) {
            addEnvVarRow(key, String(value));
          }
        }

        // Update preview
        updateConfigPreview();

        // Show hint
        const hint = template.envHint ? ` ${template.envHint}` : '';
        appendMessage('system', `📦 Applied "${templateId}" template.${hint}`);

        // Reset dropdown
        document.getElementById('serverTemplate').value = '';
      }

      // Custom templates storage key
      const CUSTOM_TEMPLATES_KEY = 'mcp_chat_custom_templates';

      // Save current form as custom template
      async function saveAsCustomTemplate() {
        const name = document.getElementById('serverName').value.trim();
        const type = document.getElementById('serverType').value;
        const description = document.getElementById('serverDescription').value.trim();
        const env = collectEnvVars();

        if (!name) {
          appendMessage('error', 'Enter a server name first to save as template');
          return;
        }

        const templateName = await appPrompt('Template name:', {
          title: 'Save Template',
          label: 'Template name',
          defaultValue: name,
          required: true
        });
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
        if (Object.keys(env).length > 0) {
          template.env = env;
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
      async function manageCustomTemplates() {
        let customTemplates = {};
        try {
          customTemplates = JSON.parse(localStorage.getItem(CUSTOM_TEMPLATES_KEY) || '{}');
        } catch (e) {}

        const templateIds = Object.keys(customTemplates);

        if (templateIds.length === 0) {
          appendMessage('system', 'No custom templates to delete. Save a template first with 💾');
          return;
        }

        const options = templateIds.map((id, index) => ({
          value: id,
          label: `${index + 1}. ${customTemplates[id].displayName || customTemplates[id].name}`
        }));
        const result = await appFormModal({
          title: 'Delete Template',
          message: 'Select a template to delete.',
          confirmText: 'Delete',
          confirmVariant: 'danger',
          fields: [
            {
              id: 'templateId',
              label: 'Template',
              type: 'select',
              options,
              required: true
            }
          ]
        });
        if (!result.confirmed) return;
        const templateId = result.values.templateId;
        const templateName = customTemplates[templateId]?.displayName || customTemplates[templateId]?.name || templateId;
        const confirmed = await appConfirm(`Delete template "${templateName}"?`, {
          title: 'Confirm Delete',
          confirmText: 'Delete',
          confirmVariant: 'danger'
        });
        if (!confirmed) return;
        deleteCustomTemplate(templateId);
        appendMessage('system', `🗑️ Deleted template "${templateName}"`);
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
          closeWorkspaceMenu();
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

      document.addEventListener('click', e => {
        const menu = document.getElementById('workspaceMenu');
        if (menu && !menu.contains(e.target)) {
          closeWorkspaceMenu();
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

      // Switch between tabs
      function switchTab(tabName) {
        if (document.body.classList.contains('workspace-mode')) {
          if (typeof floatingWorkspace !== 'undefined' && typeof floatingWorkspace.togglePanel === 'function') {
            floatingWorkspace.togglePanel(tabName);
          }
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
        }

        if (tabName !== 'workflowsPanel' && tabName !== 'workflows') {
          closeAIBuilderIfOpen();
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
      }

      function saveInspectorVariables() {
        const input = document.getElementById('inspectorVariablesInput');
        if (!input) return;
        const raw = input.value.trim();

        if (!raw) {
          localStorage.removeItem(INSPECTOR_VARIABLES_KEY);
          updateInspectorVariablesStatus('Cleared variables');
          return;
        }

        try {
          JSON.parse(raw);
          localStorage.setItem(INSPECTOR_VARIABLES_KEY, raw);
          updateInspectorVariablesStatus('Variables saved');
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

      function buildDefaultArgs(schema) {
        const defaults = {};
        if (!schema || !schema.properties) return defaults;
        Object.entries(schema.properties).forEach(([paramName, paramDef]) => {
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
          const rawEl = document.getElementById('inspectorRawInput');
          if (rawEl) rawEl.value = '{}';
          toggleInspectorInputMode(document.getElementById('inspectorRawMode')?.checked);
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

        const rawEl = document.getElementById('inspectorRawInput');
        if (rawEl) {
          rawEl.value = JSON.stringify(buildDefaultArgs(schema), null, 2);
        }
        toggleInspectorInputMode(document.getElementById('inspectorRawMode')?.checked);
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
      }

      // Execute tool from Inspector
      async function executeInspectorTool() {
        if (!selectedInspectorTool) return;

        const serverName = document.getElementById('inspectorServerSelect').value;
        const formEl = document.getElementById('inspectorForm');
        const rawMode = document.getElementById('inspectorRawMode')?.checked;
        const rawEl = document.getElementById('inspectorRawInput');
        const executeBtn = document.getElementById('inspectorExecuteBtn');
        const responseSection = document.getElementById('inspectorResponseSection');
        const responseStatus = document.getElementById('inspectorResponseStatus');
        const responseBody = document.getElementById('inspectorResponseBody');

        // Collect form values
        let args = {};
        if (rawMode) {
          const rawValue = rawEl?.value.trim() || '';
          if (rawValue) {
            try {
              args = JSON.parse(rawValue);
            } catch (error) {
              responseSection.style.display = 'block';
              responseStatus.textContent = '❌ Invalid JSON input';
              responseStatus.className = 'inspector-status error';
              responseBody.className = 'inspector-response error';
              responseBody.textContent = error.message;
              return;
            }
          }
        } else {
          formEl.querySelectorAll('[data-param]').forEach(el => {
            const param = el.dataset.param;
            let value = el.value.trim();

            if (!value) return;

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
        }

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
              <tr><td style="padding: 8px; border-bottom: 1px solid var(--border-subtle);"><kbd>Ctrl+K</kbd></td><td>Command palette (Workspace) / Tool search (Classic)</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid var(--border-subtle);"><kbd>Ctrl+Shift+P</kbd></td><td>Command palette (Workspace)</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid var(--border-subtle);"><kbd>Ctrl+T</kbd></td><td>Quick tool search (Classic)</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid var(--border-subtle);"><kbd>Ctrl+R</kbd></td><td>Refresh all servers</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid var(--border-subtle);"><kbd>F5</kbd></td><td>Re-run last tool</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid var(--border-subtle);"><kbd>Ctrl+Shift+E</kbd></td><td>Export chat</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid var(--border-subtle);"><kbd>Ctrl+1-9</kbd></td><td>Switch tabs (Classic)</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid var(--border-subtle);"><kbd>Ctrl+0</kbd></td><td>Open Mocks tab</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid var(--border-subtle);"><kbd>Ctrl+B</kbd></td><td>Open Mocks tab</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid var(--border-subtle);"><kbd>Alt+1-3</kbd></td><td>Open Scripts / Docs / Contracts</td></tr>
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

      function sanitizeErrorMessage(message) {
        if (typeof message !== 'string') return message;
        const lines = message.split('\n');
        const filtered = lines.filter((line, index) => {
          if (index === 0) return true;
          const trimmed = line.trim();
          if (trimmed.startsWith('at ')) return false;
          if (trimmed.startsWith('node:') || trimmed.startsWith('file:')) return false;
          if (trimmed.includes('/node_modules/') || trimmed.includes('\\node_modules\\')) return false;
          return true;
        });
        return filtered.join('\n');
      }

      // Append message to UI
      function appendMessage(role, content, save = true) {
        const div = document.createElement('div');
        div.className = `message ${role}`;

        // Simple markdown-like formatting
        const safeContent = role === 'error' ? sanitizeErrorMessage(content) : content;
        let formatted = escapeHtml(safeContent);
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

        refreshBrainView();
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
        if (typeof resetBrainTimeline === 'function') {
          resetBrainTimeline();
        }
        refreshBrainView();

        console.log('[Session] Cleared');
      }

      // Escape HTML
      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      function formatModalMessage(message) {
        if (!message) return '';
        return escapeHtml(message).replace(/\n/g, '<br>');
      }

      function showAppModal(options = {}) {
        const {
          title = 'Confirm',
          message = '',
          bodyHtml = '',
          fields = [],
          confirmText = 'OK',
          cancelText = 'Cancel',
          showCancel = true,
          confirmVariant = 'primary',
          maxWidth = '520px'
        } = options;

        return new Promise(resolve => {
          const overlay = document.createElement('div');
          overlay.className = 'modal-overlay active';
          overlay.dataset.appModal = 'true';

          const messageHtml = formatModalMessage(message);
          const fieldHtml = fields.map((field, index) => {
            const fieldId = field.id || `field_${index}`;
            const label = field.label ? `<label class="form-label" for="${fieldId}">${escapeHtml(field.label)}</label>` : '';
            const hint = field.hint ? `<div class="form-hint">${escapeHtml(field.hint)}</div>` : '';
            const requiredAttr = field.required ? 'required' : '';
            const placeholder = field.placeholder ? escapeHtml(field.placeholder) : '';
            const value = field.value ?? '';
            const inputStyle = field.monospace ? 'font-family: "JetBrains Mono", monospace;' : '';

            let inputHtml = '';
            if (field.type === 'textarea') {
              const rows = field.rows || 5;
              inputHtml = `<textarea class="form-input" id="${fieldId}" ${requiredAttr} placeholder="${placeholder}" rows="${rows}" style="${inputStyle}">${escapeHtml(String(value))}</textarea>`;
            } else if (field.type === 'select') {
              const optionsHtml = (field.options || []).map(opt => {
                const optValue = opt.value ?? opt;
                const optLabel = opt.label ?? optValue;
                const selected = optValue === value ? 'selected' : '';
                return `<option value="${escapeHtml(String(optValue))}" ${selected}>${escapeHtml(String(optLabel))}</option>`;
              }).join('');
              inputHtml = `<select class="form-select" id="${fieldId}" ${requiredAttr}>${optionsHtml}</select>`;
            } else {
              const type = field.type || 'text';
              inputHtml = `<input class="form-input" id="${fieldId}" type="${type}" ${requiredAttr} placeholder="${placeholder}" value="${escapeHtml(String(value))}" style="${inputStyle}" />`;
            }

            return `
              <div class="form-group" data-field-group="${fieldId}">
                ${label}
                ${inputHtml}
                <div class="form-error">Required</div>
                ${hint}
              </div>
            `;
          }).join('');

          const confirmClass = confirmVariant === 'danger' ? 'btn danger' : 'btn primary';
          overlay.innerHTML = `
            <div class="modal" style="max-width: ${maxWidth}">
              <div class="modal-header">
                <h2 class="modal-title">${escapeHtml(title)}</h2>
                <button class="modal-close" data-action="cancel" aria-label="Close">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              ${messageHtml ? `<div style="margin-bottom: 12px; font-size: 0.85rem; color: var(--text-secondary)">${messageHtml}</div>` : ''}
              ${bodyHtml ? `<div style="margin-bottom: 12px">${bodyHtml}</div>` : ''}
              ${fieldHtml ? `<div>${fieldHtml}</div>` : ''}
              <div class="modal-actions">
                ${showCancel ? `<button class="btn" data-action="cancel">${escapeHtml(cancelText)}</button>` : ''}
                <button class="${confirmClass}" data-action="confirm">${escapeHtml(confirmText)}</button>
              </div>
            </div>
          `;

          document.body.appendChild(overlay);

          const cleanup = (result) => {
            overlay.remove();
            document.removeEventListener('keydown', onKeyDown);
            resolve(result);
          };

          const onKeyDown = (event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              cleanup({ confirmed: false, values: {} });
            }
          };

          const validateFields = () => {
            let valid = true;
            const values = {};
            fields.forEach((field, index) => {
              const fieldId = field.id || `field_${index}`;
              const input = overlay.querySelector(`#${fieldId}`);
              const group = overlay.querySelector(`[data-field-group="${fieldId}"]`);
              const errorEl = group?.querySelector('.form-error');
              let value = input?.value ?? '';
              if (field.type === 'number') {
                value = value === '' ? '' : Number(value);
              }

              const isEmpty = value === '' || value === null || value === undefined;
              if (field.required && isEmpty) {
                valid = false;
                if (errorEl) {
                  errorEl.textContent = 'Required';
                  errorEl.style.display = 'block';
                }
                if (group) group.classList.add('has-error');
              } else if (field.validate) {
                const error = field.validate(value);
                if (error) {
                  valid = false;
                  if (errorEl) {
                    errorEl.textContent = error;
                    errorEl.style.display = 'block';
                  }
                  if (group) group.classList.add('has-error');
                } else if (group) {
                  group.classList.remove('has-error');
                  if (errorEl) errorEl.style.display = 'none';
                }
              } else if (group) {
                group.classList.remove('has-error');
                if (errorEl) errorEl.style.display = 'none';
              }

              values[field.name || field.id || `field_${index}`] = value;
            });
            return { valid, values };
          };

          overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
              cleanup({ confirmed: false, values: {} });
            }
          });

          overlay.querySelectorAll('[data-action="cancel"]').forEach(btn => {
            btn.addEventListener('click', () => cleanup({ confirmed: false, values: {} }));
          });

          const confirmBtn = overlay.querySelector('[data-action="confirm"]');
          if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
              const { valid, values } = validateFields();
              if (!valid) return;
              cleanup({ confirmed: true, values });
            });
          }

          document.addEventListener('keydown', onKeyDown);

          const firstInput = overlay.querySelector('input, textarea, select');
          if (firstInput) {
            setTimeout(() => firstInput.focus(), 50);
          }
        });
      }

      async function appConfirm(message, options = {}) {
        const result = await showAppModal({
          title: options.title || 'Confirm',
          message,
          confirmText: options.confirmText || 'Confirm',
          cancelText: options.cancelText || 'Cancel',
          confirmVariant: options.confirmVariant || 'primary',
          showCancel: true
        });
        return result.confirmed;
      }

      async function appAlert(message, options = {}) {
        await showAppModal({
          title: options.title || 'Notice',
          message,
          bodyHtml: options.bodyHtml || '',
          confirmText: options.confirmText || 'OK',
          showCancel: false
        });
      }

      async function appPrompt(message, options = {}) {
        const result = await showAppModal({
          title: options.title || 'Input',
          message,
          confirmText: options.confirmText || 'Save',
          cancelText: options.cancelText || 'Cancel',
          fields: [
            {
              id: 'value',
              label: options.label || 'Value',
              type: options.multiline ? 'textarea' : (options.type || 'text'),
              value: options.defaultValue ?? '',
              placeholder: options.placeholder || '',
              required: options.required || false,
              rows: options.rows,
              monospace: options.monospace || false,
              hint: options.hint
            }
          ]
        });
        if (!result.confirmed) return null;
        return result.values.value;
      }

      async function appFormModal(options = {}) {
        return showAppModal(options);
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
      async function clearToolHistory() {
        const confirmed = await appConfirm('Clear all tool execution history?', {
          title: 'Clear History',
          confirmText: 'Clear',
          confirmVariant: 'danger'
        });
        if (!confirmed) return;
        const session = sessionManager.load() || {};
        session.toolHistory = [];
        sessionManager.save(session);
        toolExecutionHistory = [];
        refreshHistoryPanel();
        appendMessage('system', '🗑️ Tool history cleared');
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
      async function saveRecordedScenario() {
        if (recordedSteps.length === 0) {
          appendMessage('error', 'No steps to save');
          return;
        }

        const name = await appPrompt('Scenario name:', {
          title: 'Save Scenario',
          label: 'Scenario name',
          defaultValue: `Test ${new Date().toLocaleTimeString()}`,
          required: true
        });
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

        const variables = getRuntimeVariables();
        if (variables === null) {
          appendMessage('error', 'Invalid Variables JSON. Fix it before replaying.');
          return;
        }
        const runtimeVariables = { ...(variables || {}) };

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
            const args = Object.keys(runtimeVariables).length > 0
              ? applyTemplateVariables(step.args, runtimeVariables)
              : step.args;
            const response = await fetch('/api/mcp/call', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                serverName: step.server,
                toolName: step.tool,
                args,
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

            // Custom assertions evaluation
            let assertionResults = [];
            let assertionsFailed = 0;
            if (step.assertions && step.assertions.length > 0 && data.result && !isError) {
              for (const assertion of step.assertions) {
                const result = evaluateSingleAssertion(data.result, assertion);
                assertionResults.push({
                  path: assertion.path,
                  operator: assertion.operator,
                  expected: assertion.value,
                  actual: result.actualValue,
                  passed: result.passed,
                  message: result.message
                });
                if (!result.passed) assertionsFailed++;
              }
            }

            if (isError) {
              failed++;
              results.push({ step: i + 1, tool: step.tool, status: 'error', message: data.error || 'Error', duration, schemaViolations: [], assertionResults: [] });
            } else if (assertionsFailed > 0) {
              failed++;
              results.push({ step: i + 1, tool: step.tool, status: 'assertion_fail', message: `${assertionsFailed} assertion(s) failed`, duration, expected: step.expectedResponse, actual: data.result, schemaViolations, assertionResults });
            } else if (!hashMatch) {
              failed++;
              results.push({ step: i + 1, tool: step.tool, status: 'diff', message: 'Response differs from baseline', duration, expected: step.expectedResponse, actual: data.result, schemaViolations, assertionResults });
            } else {
              passed++;
              results.push({ step: i + 1, tool: step.tool, status: 'pass', duration, schemaViolations, assertionResults });
            }

            if (!isError) {
              const extracted = extractScenarioVariables(data.result, step.extract || step.variables);
              if (Object.keys(extracted).length > 0) {
                Object.assign(runtimeVariables, extracted);
              }
            }
          } catch (err) {
            failed++;
            results.push({ step: i + 1, tool: step.tool, status: 'error', message: err.message, schemaViolations: [] });
          }
        }

        // Show results - cache large data to avoid huge onclick attributes
        const resultHtml = results.map(r => {
          // Cache diff data for this result
          let diffId = null;
          if ((r.status === 'diff' || r.status === 'assertion_fail') && r.expected && r.actual) {
            diffId = cacheDiffData(r.expected, r.actual);
          }
          
          // Cache assertion results
          let assertId = null;
          if (r.assertionResults && r.assertionResults.length > 0) {
            assertId = cacheAssertionResults(r.assertionResults);
          }
          
          return `
            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 4px; background: var(--bg-card); border-radius: 4px; margin-bottom: 2px">
              ${r.status === 'pass' ? '✅' : r.status === 'diff' ? '🔶' : r.status === 'assertion_fail' ? '🔴' : '❌'}
              <strong>${r.step}.</strong> ${escapeHtml(r.tool)}
              ${r.duration ? `<span style="color: var(--text-muted)">(${r.duration}ms)</span>` : ''}
              ${r.message ? `<span style="color: var(--error); font-size: 0.7rem">${escapeHtml(r.message)}</span>` : ''}
              ${diffId ? `<button class="btn" onclick="showDiffById('${diffId}')" style="font-size: 0.6rem; padding: 1px 4px">View Diff</button>` : ''}
              ${r.schemaViolations && r.schemaViolations.length > 0 ? `
                <span style="color: var(--warning); font-size: 0.65rem; margin-left: 4px">📋 ${r.schemaViolations.length} schema issue${r.schemaViolations.length !== 1 ? 's' : ''}</span>
              ` : r.status === 'pass' && r.schemaViolations ? '<span style="color: var(--success); font-size: 0.65rem">📋 Schema OK</span>' : ''}
              ${assertId ? `
                <span style="font-size: 0.65rem; margin-left: 4px; ${r.assertionResults.every(a => a.passed) ? 'color: var(--success)' : 'color: var(--error)'}">
                  🔍 ${r.assertionResults.filter(a => a.passed).length}/${r.assertionResults.length} assertions
                </span>
                <button class="btn" onclick="showAssertionResultsById('${assertId}')" style="font-size: 0.6rem; padding: 1px 4px">Details</button>
              ` : ''}
            </div>
          `;
        }).join('');

        resultsEl.innerHTML = `
          <div style="margin-bottom: 8px">
            <strong>Results:</strong>
            <span style="color: var(--success)">${passed} passed</span> /
            <span style="color: var(--error)">${failed} failed</span>
          </div>
          ${resultHtml}
        `;

        appendMessage('system', `🧪 Scenario "${scenario.name}" completed: ${passed} passed, ${failed} failed`);
      }

      function normalizeExtractList(extractConfig) {
        if (!extractConfig) return [];
        if (Array.isArray(extractConfig)) {
          return extractConfig.filter(item => item && item.name);
        }
        if (typeof extractConfig === 'object') {
          return Object.entries(extractConfig).map(([name, value]) => {
            if (typeof value === 'string' && value.trim().startsWith('$')) {
              return { name, path: value };
            }
            return { name, value };
          });
        }
        return [];
      }

      function renderExtractSection(step, scenarioId, stepIndex) {
        const extracts = normalizeExtractList(step.extract || step.variables);
        return `
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border)">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px">
              <span style="font-size: 0.75rem; font-weight: 500; color: var(--primary)">🧩 Variables</span>
              <button class="btn" onclick="addExtractToStep('${scenarioId}', ${stepIndex})" style="font-size: 0.6rem; padding: 2px 6px">➕ Add</button>
            </div>
            ${extracts.length === 0 ? `
              <div style="font-size: 0.7rem; color: var(--text-muted); font-style: italic">No variables set</div>
            ` : extracts.map((extract, ei) => `
              <div style="display: flex; align-items: center; gap: 6px; font-size: 0.7rem; padding: 4px; background: var(--bg-surface); border-radius: 4px; margin-bottom: 2px">
                <code style="color: var(--primary)">${escapeHtml(extract.name)}</code>
                <span style="color: var(--text-muted)">←</span>
                ${extract.path
                  ? `<code>${escapeHtml(extract.path)}</code>`
                  : `<code>${escapeHtml(extract.value === undefined ? '(empty)' : typeof extract.value === 'string' ? extract.value : JSON.stringify(extract.value))}</code>`}
                <button onclick="removeExtractFromStep('${scenarioId}', ${stepIndex}, ${ei})" style="font-size: 0.6rem; padding: 1px 4px; background: none; border: none; cursor: pointer; color: var(--error)">✕</button>
              </div>
            `).join('')}
          </div>
        `;
      }

      function extractScenarioVariables(response, extractConfig) {
        const extracts = normalizeExtractList(extractConfig);
        if (!extracts.length) return {};
        const vars = {};
        extracts.forEach(item => {
          if (!item.name) return;
          if (Object.prototype.hasOwnProperty.call(item, 'value')) {
            vars[item.name] = item.value;
            return;
          }
          if (item.path) {
            vars[item.name] = getValueAtPath(response, item.path);
          }
        });
        return vars;
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

                    <!-- Assertions -->
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border)">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px">
                        <span style="font-size: 0.75rem; font-weight: 500; color: var(--primary)">🔍 Assertions</span>
                        <button class="btn" onclick="addAssertionToStep('${scenario.id}', ${i})" style="font-size: 0.6rem; padding: 2px 6px">➕ Add</button>
                      </div>
                      ${(step.assertions || []).length === 0 ? `
                        <div style="font-size: 0.7rem; color: var(--text-muted); font-style: italic">No assertions defined</div>
                      ` : (step.assertions || []).map((assertion, ai) => `
                        <div style="display: flex; align-items: center; gap: 4px; font-size: 0.7rem; padding: 4px; background: var(--bg-surface); border-radius: 4px; margin-bottom: 2px">
                          <code style="color: var(--primary)">${escapeHtml(assertion.path)}</code>
                          <span style="color: var(--text-muted)">${escapeHtml(assertion.operator)}</span>
                          <code>${escapeHtml(String(assertion.value))}</code>
                          <button onclick="removeAssertionFromStep('${scenario.id}', ${i}, ${ai})" style="font-size: 0.6rem; padding: 1px 4px; background: none; border: none; cursor: pointer; color: var(--error)">✕</button>
                        </div>
                      `).join('')}
                    </div>
                    ${renderExtractSection(step, scenario.id, i)}
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

      // Add assertion to a step
      function addAssertionToStep(scenarioId, stepIndex) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'addAssertionModal';
        modal.style.display = 'flex';
        modal.innerHTML = `
          <div class="modal" style="max-width: 450px">
            <div class="modal-header">
              <h2 class="modal-title">🔍 Add Assertion</h2>
              <button class="modal-close" onclick="closeAddAssertionModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style="padding: var(--spacing-md); display: flex; flex-direction: column; gap: 12px;">
              <div>
                <label style="font-size: 0.75rem; font-weight: 500;">JSONPath (e.g., $.content[0].text)</label>
                <input type="text" id="assertionPath" class="form-input" placeholder="$.fieldName" style="width: 100%;">
              </div>
              <div>
                <label style="font-size: 0.75rem; font-weight: 500;">Operator</label>
                <select id="assertionOperator" class="form-select" style="width: 100%;">
                  <option value="equals">Equals</option>
                  <option value="not_equals">Not Equals</option>
                  <option value="contains">Contains</option>
                  <option value="matches">Matches Regex</option>
                  <option value="exists">Exists</option>
                  <option value="not_exists">Does Not Exist</option>
                  <option value="type">Is Type</option>
                  <option value="length">Length Equals</option>
                  <option value="length_gt">Length Greater Than</option>
                  <option value="length_gte">Length At Least</option>
                  <option value="gt">Greater Than</option>
                  <option value="gte">At Least</option>
                  <option value="lt">Less Than</option>
                  <option value="lte">At Most</option>
                </select>
              </div>
              <div id="assertionValueContainer">
                <label style="font-size: 0.75rem; font-weight: 500;">Expected Value</label>
                <input type="text" id="assertionValue" class="form-input" placeholder="expected value" style="width: 100%;">
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn" onclick="closeAddAssertionModal()">Cancel</button>
              <button class="btn primary" onclick="saveAssertion('${scenarioId}', ${stepIndex})">Add Assertion</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        
        // Hide value field for exists/not_exists operators
        document.getElementById('assertionOperator').addEventListener('change', (e) => {
          const valueContainer = document.getElementById('assertionValueContainer');
          valueContainer.style.display = ['exists', 'not_exists'].includes(e.target.value) ? 'none' : 'block';
        });
      }

      // Close add assertion modal
      function closeAddAssertionModal() {
        const modal = document.getElementById('addAssertionModal');
        if (modal) modal.remove();
      }

      // Save assertion to scenario step
      async function saveAssertion(scenarioId, stepIndex) {
        const path = document.getElementById('assertionPath').value.trim();
        const operator = document.getElementById('assertionOperator').value;
        let value = document.getElementById('assertionValue').value;
        
        if (!path) {
          await appAlert('Please enter a JSONPath', { title: 'Missing JSONPath' });
          return;
        }
        
        // Parse value as number if numeric
        if (!isNaN(value) && value !== '') {
          value = Number(value);
        }
        
        const scenario = sessionManager.getScenario(scenarioId);
        if (!scenario || !scenario.steps[stepIndex]) return;
        
        // Initialize assertions array if not exists
        if (!scenario.steps[stepIndex].assertions) {
          scenario.steps[stepIndex].assertions = [];
        }
        
        // Add assertion
        scenario.steps[stepIndex].assertions.push({ path, operator, value });
        
        // Save updated scenario
        sessionManager.updateScenario(scenarioId, { steps: scenario.steps });
        
        closeAddAssertionModal();
        closeScenarioDetailsModal();
        viewScenarioDetails(scenarioId); // Refresh modal
        
        appendMessage('system', `🔍 Added assertion: ${path} ${operator}`);
      }

      // Remove assertion from step
      function removeAssertionFromStep(scenarioId, stepIndex, assertionIndex) {
        const scenario = sessionManager.getScenario(scenarioId);
        if (!scenario || !scenario.steps[stepIndex]?.assertions) return;
        
        scenario.steps[stepIndex].assertions.splice(assertionIndex, 1);
        sessionManager.updateScenario(scenarioId, { steps: scenario.steps });
        
        closeScenarioDetailsModal();
        viewScenarioDetails(scenarioId); // Refresh modal
        
        appendMessage('system', '🗑️ Assertion removed');
      }

      function addExtractToStep(scenarioId, stepIndex) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'addExtractModal';
        modal.style.display = 'flex';
        modal.innerHTML = `
          <div class="modal" style="max-width: 450px">
            <div class="modal-header">
              <h2 class="modal-title">🧩 Set Variable</h2>
              <button class="modal-close" onclick="closeAddExtractModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style="padding: var(--spacing-md); display: flex; flex-direction: column; gap: 12px;">
              <div>
                <label style="font-size: 0.75rem; font-weight: 500;">Variable name</label>
                <input type="text" id="extractName" class="form-input" placeholder="token" style="width: 100%;">
              </div>
              <div>
                <label style="font-size: 0.75rem; font-weight: 500;">JSONPath (optional)</label>
                <input type="text" id="extractPath" class="form-input" placeholder="$.data.id" style="width: 100%;">
              </div>
              <div>
                <label style="font-size: 0.75rem; font-weight: 500;">Value (optional)</label>
                <input type="text" id="extractValue" class="form-input" placeholder="literal value or JSON" style="width: 100%;">
              </div>
              <div style="font-size: 0.7rem; color: var(--text-muted)">
                If JSONPath is provided, it extracts from the response. Otherwise the Value is used.
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn" onclick="closeAddExtractModal()">Cancel</button>
              <button class="btn primary" onclick="saveExtract('${scenarioId}', ${stepIndex})">Save</button>
            </div>
          </div>
        `;

        document.body.appendChild(modal);
      }

      function closeAddExtractModal() {
        const modal = document.getElementById('addExtractModal');
        if (modal) modal.remove();
      }

      function parseExtractValue(raw) {
        if (raw === undefined || raw === null) return undefined;
        const trimmed = String(raw).trim();
        if (!trimmed) return undefined;
        try {
          return JSON.parse(trimmed);
        } catch (error) {
          return trimmed;
        }
      }

      async function saveExtract(scenarioId, stepIndex) {
        const name = document.getElementById('extractName')?.value?.trim();
        const path = document.getElementById('extractPath')?.value?.trim();
        const rawValue = document.getElementById('extractValue')?.value;
        const value = parseExtractValue(rawValue);

        if (!name) {
          await appAlert('Variable name is required.', { title: 'Missing Variable' });
          return;
        }

        if (!path && value === undefined) {
          await appAlert('Provide a JSONPath or a value.', { title: 'Missing Value' });
          return;
        }

        const scenario = sessionManager.getScenario(scenarioId);
        if (!scenario || !scenario.steps[stepIndex]) return;

        const extracts = normalizeExtractList(scenario.steps[stepIndex].extract || scenario.steps[stepIndex].variables);
        const entry = { name };
        if (path) {
          entry.path = path;
        } else {
          entry.value = value;
        }
        extracts.push(entry);
        scenario.steps[stepIndex].extract = extracts;

        sessionManager.updateScenario(scenarioId, { steps: scenario.steps });
        closeAddExtractModal();
        closeScenarioDetailsModal();
        viewScenarioDetails(scenarioId);
      }

      function removeExtractFromStep(scenarioId, stepIndex, extractIndex) {
        const scenario = sessionManager.getScenario(scenarioId);
        if (!scenario || !scenario.steps[stepIndex]) return;

        const extracts = normalizeExtractList(scenario.steps[stepIndex].extract || scenario.steps[stepIndex].variables);
        extracts.splice(extractIndex, 1);
        scenario.steps[stepIndex].extract = extracts;
        sessionManager.updateScenario(scenarioId, { steps: scenario.steps });

        closeScenarioDetailsModal();
        viewScenarioDetails(scenarioId);
      }

      // Show assertion results modal
      function showAssertionResults(assertionResults) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'assertionResultsModal';
        modal.style.display = 'flex';
        modal.innerHTML = `
          <div class="modal" style="max-width: 600px">
            <div class="modal-header">
              <h2 class="modal-title">🔍 Assertion Results</h2>
              <button class="modal-close" onclick="document.getElementById('assertionResultsModal').remove()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style="padding: var(--spacing-md); max-height: 400px; overflow-y: auto;">
              <table style="width: 100%; font-size: 0.75rem; border-collapse: collapse;">
                <thead>
                  <tr style="text-align: left; border-bottom: 1px solid var(--border);">
                    <th style="padding: 6px; width: 30px;"></th>
                    <th style="padding: 6px;">Path</th>
                    <th style="padding: 6px;">Operator</th>
                    <th style="padding: 6px;">Expected</th>
                    <th style="padding: 6px;">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  ${assertionResults.map(a => `
                    <tr style="border-bottom: 1px solid var(--border); ${a.passed ? '' : 'background: rgba(255,0,0,0.1);'}">
                      <td style="padding: 6px;">${a.passed ? '✅' : '❌'}</td>
                      <td style="padding: 6px;"><code>${escapeHtml(a.path)}</code></td>
                      <td style="padding: 6px;">${escapeHtml(a.operator)}</td>
                      <td style="padding: 6px;"><code>${escapeHtml(String(a.expected ?? ''))}</code></td>
                      <td style="padding: 6px;"><code>${escapeHtml(String(a.actual ?? 'undefined'))}</code></td>
                    </tr>
                    ${!a.passed ? `
                      <tr style="background: rgba(255,0,0,0.05);">
                        <td></td>
                        <td colspan="4" style="padding: 4px 6px; font-size: 0.7rem; color: var(--error);">
                          ⚠️ ${escapeHtml(a.message || 'Assertion failed')}
                        </td>
                      </tr>
                    ` : ''}
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div class="modal-actions">
              <button class="btn" onclick="document.getElementById('assertionResultsModal').remove()">Close</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
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
      async function deleteScenario(id) {
        const confirmed = await appConfirm('Delete this scenario?', {
          title: 'Delete Scenario',
          confirmText: 'Delete',
          confirmVariant: 'danger'
        });
        if (!confirmed) return;
        sessionManager.deleteScenario(id);
        refreshScenariosPanel();
        appendMessage('system', '🗑️ Scenario deleted');
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
      async function saveSuite(editId) {
        const name = document.getElementById('suiteName').value.trim();
        const checkboxes = document.querySelectorAll('.suite-scenario-checkbox:checked');
        const scenarioIds = Array.from(checkboxes).map(cb => cb.value);
        
        if (!name) {
          await appAlert('Please enter a suite name', { title: 'Missing Name' });
          return;
        }
        
        if (scenarioIds.length === 0) {
          await appAlert('Please select at least one scenario', { title: 'No Scenarios Selected' });
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
      async function deleteSuite(id) {
        const confirmed = await appConfirm('Delete this test suite?', {
          title: 'Delete Suite',
          confirmText: 'Delete',
          confirmVariant: 'danger'
        });
        if (!confirmed) return;
        sessionManager.deleteSuite(id);
        refreshSuitesList();
        appendMessage('system', '🗑️ Suite deleted');
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

      function parseFilterValue(raw) {
        const trimmed = raw.trim();
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
          return trimmed.slice(1, -1);
        }
        if (trimmed === 'true') return true;
        if (trimmed === 'false') return false;
        if (trimmed === 'null') return null;
        const num = Number(trimmed);
        if (!Number.isNaN(num)) return num;
        return trimmed;
      }

      function parseFilterToken(token) {
        const raw = token.slice(3, -2).trim();
        let match = raw.match(/^@\.([^\s]+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
        if (match) {
          return {
            type: 'filter',
            path: match[1].trim(),
            operator: match[2],
            value: parseFilterValue(match[3])
          };
        }
        match = raw.match(/^@\.([^\s]+)\s*$/);
        if (match) {
          return {
            type: 'filter',
            path: match[1].trim(),
            operator: 'truthy',
            value: true
          };
        }
        return {
          type: 'filter',
          path: raw,
          operator: 'truthy',
          value: true
        };
      }

      function tokenizePath(path) {
        const cleanPath = path.replace(/^\$\.?/, '');
        if (!cleanPath) return [];
        const tokens = [];
        const regex = /(\[\?\([^\]]+\)\])|(?:\[(?:'([^']+)'|"([^"]+)"|(\d+|\*))\])|([^.[]+)/g;
        let match;
        while ((match = regex.exec(cleanPath)) !== null) {
          if (match[1]) {
            tokens.push(parseFilterToken(match[1]));
            continue;
          }
          tokens.push(match[2] || match[3] || match[4] || match[5]);
        }
        return tokens;
      }

      function resolveFilterPath(obj, path) {
        if (!path) return obj;
        const parts = path.split('.').filter(Boolean);
        return parts.reduce((value, key) => {
          if (value === undefined || value === null) return undefined;
          if (Array.isArray(value) && Number.isFinite(Number(key))) {
            return value[Number(key)];
          }
          return value[key];
        }, obj);
      }

      function matchesFilter(item, filter) {
        const actual = resolveFilterPath(item, filter.path);
        switch (filter.operator) {
          case '==':
            return actual == filter.value;
          case '!=':
            return actual != filter.value;
          case '>':
            return Number(actual) > Number(filter.value);
          case '>=':
            return Number(actual) >= Number(filter.value);
          case '<':
            return Number(actual) < Number(filter.value);
          case '<=':
            return Number(actual) <= Number(filter.value);
          case 'truthy':
            return Boolean(actual);
          default:
            return Boolean(actual);
        }
      }

      // JSONPath-ish implementation with support for $.*, array indices, and wildcards
      function getValueAtPath(obj, path) {
        if (!path || path === '$') return obj;
        const tokens = tokenizePath(path);
        if (tokens.length === 0) return obj;

        let results = [obj];
        tokens.forEach(token => {
          const next = [];
          results.forEach(value => {
            if (value === undefined || value === null) return;
            if (token && typeof token === 'object' && token.type === 'filter') {
              const candidates = Array.isArray(value)
                ? value
                : typeof value === 'object'
                  ? Object.values(value)
                  : [];
              candidates.forEach(item => {
                if (matchesFilter(item, token)) next.push(item);
              });
              return;
            }
            if (token === '*') {
              if (Array.isArray(value)) {
                next.push(...value);
              } else if (typeof value === 'object') {
                next.push(...Object.values(value));
              }
              return;
            }

            const numeric = Number.isFinite(Number(token)) ? Number(token) : null;
            if (Array.isArray(value)) {
              if (numeric !== null) {
                if (value[numeric] !== undefined) next.push(value[numeric]);
              } else if (Object.prototype.hasOwnProperty.call(value, token)) {
                next.push(value[token]);
              }
              return;
            }

            if (typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, token)) {
              next.push(value[token]);
            }
          });
          results = next;
        });

        if (results.length === 0) return undefined;
        return results.length === 1 ? results[0] : results;
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
      async function deleteSystemPrompt(id) {
        const prompts = sessionManager.getPrompts();
        const prompt = prompts[id];
        if (!prompt) return;
        const confirmed = await appConfirm(`Delete "${prompt.name}"?`, {
          title: 'Delete Prompt',
          confirmText: 'Delete',
          confirmVariant: 'danger'
        });
        if (!confirmed) return;
        sessionManager.deletePrompt(id);
        if (sessionManager.getActivePromptId() === id) {
          sessionManager.setActivePromptId('default');
        }
        populateSystemPrompts();
        closePromptManager();
        showPromptManager();
        appendMessage('system', `🗑️ Deleted prompt "${prompt.name}"`);
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
      async function resetTokenUsage() {
        const confirmed = await appConfirm('Reset token usage for this session?', {
          title: 'Reset Tokens',
          confirmText: 'Reset',
          confirmVariant: 'danger'
        });
        if (!confirmed) return;
        sessionManager.resetTokens();
        updateTokenDisplay();
        closeTokenUsageModal();
        appendMessage('system', '🔄 Token usage reset');
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
      async function clearGenerator() {
        const confirmed = await appConfirm('Clear all tools and settings?', {
          title: 'Clear Generator',
          confirmText: 'Clear',
          confirmVariant: 'danger'
        });
        if (!confirmed) return;
        generatorTools = [];
        generatedCode = '';
        document.getElementById('genServerName').value = '';
        document.getElementById('genServerDesc').value = '';
        document.getElementById('generatorPreviewSection').style.display = 'none';
        renderGeneratorTools();
        appendMessage('system', '🗑️ Generator cleared');
      }

      // ==========================================
      // CHAT SESSION BRANCHING
      // ==========================================

      // Fork conversation at a specific message index
      async function forkAtMessage(messageIndex) {
        const name = await appPrompt('Enter a name for this branch:', {
          title: 'Create Branch',
          label: 'Branch name',
          defaultValue: `Branch at message ${messageIndex + 1}`,
          required: true
        });
        if (!name) return;
        
        const branch = sessionManager.createBranch(name, messages, messageIndex);
        if (branch) {
          appendMessage('system', `🌿 Created branch "${name}" with ${messageIndex + 1} messages`);
        }
      }

      // Show branches modal
      function showBranchesModal() {
        const branches = sessionManager.getBranches();
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'branchesModal';
        modal.style.display = 'flex';
        modal.innerHTML = `
          <div class="modal" style="max-width: 500px;">
            <div class="modal-header">
              <h2 class="modal-title">🌿 Conversation Branches</h2>
              <button class="modal-close" onclick="closeBranchesModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style="padding: var(--spacing-md); max-height: 400px; overflow-y: auto;">
              ${branches.length === 0 ? `
                <div style="text-align: center; color: var(--text-muted); padding: 20px;">
                  No branches yet. Hover over a message and click 🌿 to fork.
                </div>
              ` : branches.map(b => `
                <div style="background: var(--bg-card); padding: 12px; border-radius: 8px; margin-bottom: 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <strong>${escapeHtml(b.name)}</strong>
                      <div style="font-size: 0.7rem; color: var(--text-muted);">
                        ${b.messages?.length || 0} messages • ${new Date(b.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style="display: flex; gap: 4px;">
                      <button class="btn success" onclick="loadBranchAndClose('${b.id}')" style="font-size: 0.65rem; padding: 3px 8px;">Load</button>
                      <button class="btn" onclick="deleteBranchAndRefresh('${b.id}')" style="font-size: 0.65rem; padding: 3px 8px;">🗑️</button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="modal-actions">
              <button class="btn" onclick="saveCurrentAsBranch()">💾 Save Current as Branch</button>
              <button class="btn" onclick="closeBranchesModal()">Close</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }

      // Close branches modal
      function closeBranchesModal() {
        const modal = document.getElementById('branchesModal');
        if (modal) modal.remove();
      }

      // Load a branch and close modal
      function loadBranchAndClose(branchId) {
        const branchMessages = sessionManager.loadBranch(branchId);
        if (branchMessages) {
          messages = branchMessages;
          sessionManager.saveMessages(messages);
          renderMessages();
          closeBranchesModal();
          appendMessage('system', '🌿 Branch loaded - continue your conversation from this point');
        }
      }

      // Delete branch and refresh modal
      async function deleteBranchAndRefresh(branchId) {
        const confirmed = await appConfirm('Delete this branch?', {
          title: 'Delete Branch',
          confirmText: 'Delete',
          confirmVariant: 'danger'
        });
        if (!confirmed) return;
        sessionManager.deleteBranch(branchId);
        closeBranchesModal();
        showBranchesModal();
        appendMessage('system', '🗑️ Branch deleted');
      }

      // Save current conversation as a branch
      async function saveCurrentAsBranch() {
        const name = await appPrompt('Enter a name for this branch:', {
          title: 'Save Branch',
          label: 'Branch name',
          defaultValue: `Snapshot ${new Date().toLocaleString()}`,
          required: true
        });
        if (!name) return;
        
        const branch = sessionManager.createBranch(name, messages, messages.length - 1);
        if (branch) {
          closeBranchesModal();
          showBranchesModal();
          appendMessage('system', `💾 Saved current conversation as "${name}"`);
        }
      }

      // ==========================================
      // MULTI-ENVIRONMENT PROFILES
      // ==========================================

      const ENV_PROFILES_KEY = 'mcp_chat_studio_env_profiles';
      const CURRENT_ENV_KEY = 'mcp_chat_studio_current_env';

      // Get environment profiles
      function getEnvProfiles() {
        try {
          return JSON.parse(localStorage.getItem(ENV_PROFILES_KEY) || '{}');
        } catch (e) {
          return {};
        }
      }

      // Save environment profile
      function saveEnvProfile(envName, config) {
        const profiles = getEnvProfiles();
        profiles[envName] = {
          ...config,
          savedAt: new Date().toISOString()
        };
        localStorage.setItem(ENV_PROFILES_KEY, JSON.stringify(profiles));
      }

      // Get current environment
      function getCurrentEnv() {
        return localStorage.getItem(CURRENT_ENV_KEY) || 'development';
      }

      // Switch environment
      async function switchEnvironment(envName) {
        const oldEnv = getCurrentEnv();
        
        if (oldEnv === envName) return; // No change
        
        // Save current configuration to old environment (fetch from API)
        await saveCurrentConfigToEnv(oldEnv);
        
        // Set new environment
        localStorage.setItem(CURRENT_ENV_KEY, envName);
        
        // Load config from new environment
        const profiles = getEnvProfiles();
        const profile = profiles[envName];
        
        if (profile && profile.servers && profile.servers.length > 0) {
          appendMessage('system', `🔄 Loading ${envName} environment (${profile.servers.length} servers)...`);
          
          // Disconnect current servers first
          const statusRes = await fetch('/api/mcp/status', { credentials: 'include' });
          const currentStatus = await statusRes.json();
          const currentServers = currentStatus.servers || currentStatus;
          
          for (const serverName of Object.keys(currentServers || {})) {
            try {
              await fetch(`/api/mcp/disconnect/${encodeURIComponent(serverName)}`, {
                method: 'POST',
                credentials: 'include'
              });
            } catch (e) {
              console.warn(`Failed to disconnect ${serverName}`);
            }
          }
          
          // Reconnect servers from profile
          let connected = 0;
          for (const server of profile.servers) {
            try {
              const res = await fetch(`/api/mcp/connect/${encodeURIComponent(server.name)}`, {
                method: 'POST',
                credentials: 'include'
              });
              if (res.ok) connected++;
            } catch (e) {
              console.warn(`Failed to connect ${server.name}`);
            }
          }
          
          appendMessage('system', `✅ ${envName}: ${connected}/${profile.servers.length} servers connected`);
        } else {
          appendMessage('system', `🆕 ${envName} environment (no saved config - configure servers and switch away to save)`);
        }
        
        // Update the dropdown
        document.getElementById('envProfile').value = envName;
        
        // Refresh UI
        loadMCPStatus();
      }

      // Save current configuration to environment (from live API)
      async function saveCurrentConfigToEnv(envName) {
        try {
          const res = await fetch('/api/mcp/status', { credentials: 'include' });
          const data = await res.json();
          const serversData = data.servers || data;
          
          const servers = [];
          for (const [name, info] of Object.entries(serversData || {})) {
            servers.push({
              name,
              status: info.status,
              connected: info.connected,
              config: info.config || null
            });
          }
          
          if (servers.length > 0) {
            saveEnvProfile(envName, { servers });
          }
        } catch (e) {
          console.warn('[Env] Failed to save config:', e.message);
        }
      }

      // Show environment info
      function showEnvInfo() {
        const profiles = getEnvProfiles();
        const currentEnv = getCurrentEnv();
        
        let info = `**Current:** ${currentEnv}\n\n`;
        for (const [env, profile] of Object.entries(profiles)) {
          const serverCount = profile.servers?.length || 0;
          const savedAt = profile.savedAt ? new Date(profile.savedAt).toLocaleString() : 'Never';
          info += `**${env}:** ${serverCount} servers (saved: ${savedAt})\n`;
        }
        
        appendMessage('system', `🌍 Environment Profiles:\n${info}`);
      }

      // Initialize environment selector
      function initEnvProfile() {
        const select = document.getElementById('envProfile');
        if (select) {
          select.value = getCurrentEnv();
        }
      }

      // ==========================================
      // CHAT SESSION BRANCHING
      // ==========================================
      
      const BRANCHES_KEY = 'mcp_chat_studio_branches';

      // Get all branches
      function getBranches() {
        try {
          return JSON.parse(localStorage.getItem(BRANCHES_KEY) || '[]');
        } catch (e) {
          return [];
        }
      }

      // Save branches
      function saveBranches(branches) {
        localStorage.setItem(BRANCHES_KEY, JSON.stringify(branches));
      }

      // Create a branch from current conversation
      function createBranch(name, messageList, forkAtIndex) {
        const branches = getBranches();
        const branch = {
          id: `branch_${Date.now()}`,
          name,
          messages: messageList.slice(0, forkAtIndex + 1),
          forkIndex: forkAtIndex,
          createdAt: new Date().toISOString()
        };
        branches.push(branch);
        saveBranches(branches);
        return branch;
      }

      // Load a branch
      function loadBranch(branchId) {
        const branches = getBranches();
        const branch = branches.find(b => b.id === branchId);
        if (branch) {
          messages = [...branch.messages];
          renderMessages();
          sessionManager.save(messages, toolExecutionHistory);
          return branch;
        }
        return null;
      }

      // Delete a branch
      function deleteBranch(id) {
        const branches = getBranches();
        const filtered = branches.filter(b => b.id !== id);
        saveBranches(filtered);
      }

      // Fork conversation at a specific message index
      async function forkAtMessage(messageIndex) {
        const name = await appPrompt('Enter a name for this branch:', {
          title: 'Create Branch',
          label: 'Branch name',
          defaultValue: `Branch at message ${messageIndex + 1}`,
          required: true
        });
        if (!name) return;
        
        const branch = createBranch(name, messages, messageIndex);
        if (branch) {
          appendMessage('system', `🌿 Created branch "${name}" with ${messageIndex + 1} messages`);
        }
      }

      // Show branches modal
      function showBranchesModal() {
        const branches = getBranches();
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'branchesModal';
        modal.style.display = 'flex';
        modal.innerHTML = `
          <div class="modal" style="max-width: 500px;">
            <div class="modal-header">
              <h2 class="modal-title">🌿 Conversation Branches</h2>
              <button class="modal-close" onclick="closeBranchesModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style="padding: var(--spacing-md); max-height: 400px; overflow-y: auto;">
              ${branches.length === 0 ? `
                <div style="text-align: center; color: var(--text-muted); padding: 20px;">
                  No branches yet. Hover over a message and click 🌿 to fork.
                </div>
              ` : branches.map(b => `
                <div style="background: var(--bg-card); padding: 12px; border-radius: 8px; margin-bottom: 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <strong>${escapeHtml(b.name)}</strong>
                      <div style="font-size: 0.7rem; color: var(--text-muted);">
                        ${b.messages?.length || 0} messages • ${new Date(b.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div style="display: flex; gap: 4px;">
                      <button class="btn" onclick="loadBranchAndClose('${b.id}')" style="font-size: 0.7rem; padding: 4px 8px;">Load</button>
                      <button class="btn" onclick="deleteBranchAndRefresh('${b.id}')" style="font-size: 0.7rem; padding: 4px 8px; color: var(--error);">🗑️</button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="modal-actions">
              <button class="btn" onclick="saveCurrentAsBranch()">💾 Save Current</button>
              <button class="btn" onclick="closeBranchesModal()">Close</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }

      // Close branches modal
      function closeBranchesModal() {
        const modal = document.getElementById('branchesModal');
        if (modal) modal.remove();
      }

      // Load branch and close modal
      function loadBranchAndClose(branchId) {
        closeBranchesModal();
        const branch = loadBranch(branchId);
        if (branch) {
          appendMessage('system', `🌿 Loaded branch "${branch.name}"`);
        }
      }

      // Delete branch and refresh modal
      async function deleteBranchAndRefresh(id) {
        const confirmed = await appConfirm('Delete this branch?', {
          title: 'Delete Branch',
          confirmText: 'Delete',
          confirmVariant: 'danger'
        });
        if (!confirmed) return;
        deleteBranch(id);
        closeBranchesModal();
        showBranchesModal();
      }

      // Save current conversation as a branch
      async function saveCurrentAsBranch() {
        const name = await appPrompt('Enter a name for this branch:', {
          title: 'Save Branch',
          label: 'Branch name',
          defaultValue: `Snapshot ${new Date().toLocaleString()}`,
          required: true
        });
        if (!name) return;
        
        const branch = createBranch(name, messages, messages.length - 1);
        if (branch) {
          closeBranchesModal();
          showBranchesModal();
          appendMessage('system', `💾 Saved current conversation as "${name}"`);
        }
      }

      // ==========================================
      // ADVANCED INSPECTOR - TIMELINE
      // ==========================================
      let timelineSessionId = null;

      async function loadTimelineServers() {
        const select = document.getElementById('timelineServerFilter');
        try {
          const response = await fetch('/api/mcp/status', { credentials: 'include' });
          const status = await response.json();

          select.innerHTML = '<option value="">All Servers</option>';
          const servers = status.servers || status;
          for (const [name, info] of Object.entries(servers)) {
            if (info.connected) {
              select.innerHTML += `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
            }
          }
        } catch (error) {
          console.error('Failed to load servers:', error);
        }
      }

      async function startTimeline() {
        try {
          timelineSessionId = `session_${Date.now()}`;
          const response = await fetch('/api/inspector/timeline/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: timelineSessionId }),
            credentials: 'include'
          });

          if (response.ok) {
            document.getElementById('timelineSessionStatus').textContent =
              `✅ Tracking (Session: ${timelineSessionId})`;
            document.getElementById('timelineSessionStatus').style.color = 'var(--success)';
            appendMessage('system', `⏱️ Timeline tracking started`);
          }
        } catch (error) {
          appendMessage('error', `Failed to start timeline: ${error.message}`);
        }
      }

      async function refreshTimeline() {
        if (!timelineSessionId) {
          document.getElementById('timelineEvents').innerHTML =
            '<div style="color: var(--text-muted); font-style: italic; padding: 12px">Start timeline tracking to see events...</div>';
          return;
        }

        try {
          const serverFilter = document.getElementById('timelineServerFilter').value;
          const typeFilter = document.getElementById('timelineTypeFilter').value;

          let url = `/api/inspector/timeline/${timelineSessionId}?limit=100`;
          if (serverFilter) url += `&serverName=${encodeURIComponent(serverFilter)}`;
          if (typeFilter) url += `&type=${encodeURIComponent(typeFilter)}`;

          const response = await fetch(url, { credentials: 'include' });
          const data = await response.json();

          const eventsEl = document.getElementById('timelineEvents');
          if (!data.events || data.events.length === 0) {
            eventsEl.innerHTML = '<div style="color: var(--text-muted); font-style: italic; padding: 12px">No events captured yet...</div>';
            return;
          }

          let html = '';
          for (const event of data.events.reverse()) {
            const time = new Date(event.timestamp).toLocaleTimeString();
            const typeColor = event.type === 'error' ? 'var(--danger)' :
                            event.type === 'response' ? 'var(--success)' : 'var(--info)';
            const dirIcon = event.direction === 'outgoing' ? '→' : '←';

            html += `
              <div style="padding: 8px; border-bottom: 1px solid var(--border); font-family: monospace">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px">
                  <span style="color: ${typeColor}; font-weight: 500">${dirIcon} ${event.type.toUpperCase()}</span>
                  <span style="color: var(--text-muted)">${time}</span>
                </div>
                <div style="font-size: 0.7rem; color: var(--text-secondary)">
                  Server: ${escapeHtml(event.serverName || 'N/A')} | Method: ${escapeHtml(event.method || 'N/A')}
                  ${event.duration ? ` | ${event.duration}ms` : ''}
                </div>
              </div>
            `;
          }
          eventsEl.innerHTML = html;
        } catch (error) {
          console.error('Failed to refresh timeline:', error);
        }
      }

      async function exportTimeline() {
        if (!timelineSessionId) {
          appendMessage('error', 'No timeline session active');
          return;
        }

        try {
          const response = await fetch(`/api/inspector/timeline/${timelineSessionId}/export?format=json`, {
            credentials: 'include'
          });
          const text = await response.text();

          const blob = new Blob([text], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `timeline-${timelineSessionId}.json`;
          a.click();
          URL.revokeObjectURL(url);

          appendMessage('system', '📥 Timeline exported');
        } catch (error) {
          appendMessage('error', `Export failed: ${error.message}`);
        }
      }

      async function clearTimeline() {
        if (!timelineSessionId) return;

        try {
          await fetch(`/api/inspector/timeline/${timelineSessionId}/clear`, {
            method: 'DELETE',
            credentials: 'include'
          });

          document.getElementById('timelineEvents').innerHTML =
            '<div style="color: var(--text-muted); font-style: italic; padding: 12px">Timeline cleared</div>';
          timelineSessionId = null;
          document.getElementById('timelineSessionStatus').textContent =
            'Not tracking. Click "Start" to begin capturing messages.';
          document.getElementById('timelineSessionStatus').style.color = 'var(--text-muted)';
          appendMessage('system', '🗑️ Timeline cleared');
        } catch (error) {
          console.error('Failed to clear timeline:', error);
        }
      }

      // ==========================================
      // ADVANCED INSPECTOR - BULK TEST
      // ==========================================
      let bulkTestCache = [];

      async function loadBulkTestServers() {
        const select = document.getElementById('bulkTestServerSelect');
        try {
          const response = await fetch('/api/mcp/status', { credentials: 'include' });
          const status = await response.json();

          select.innerHTML = '<option value="">-- Select Server --</option>';
          const servers = status.servers || status;
          for (const [name, info] of Object.entries(servers)) {
            if (info.connected) {
              select.innerHTML += `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
            }
          }
        } catch (error) {
          console.error('Failed to load servers:', error);
        }
      }

      async function loadBulkTestTools() {
        const serverName = document.getElementById('bulkTestServerSelect').value;
        const toolSelect = document.getElementById('bulkTestToolSelect');

        if (!serverName) {
          toolSelect.innerHTML = '<option value="">-- Select Tool --</option>';
          return;
        }

        try {
          const response = await fetch('/api/mcp/tools', { credentials: 'include' });
          const data = await response.json();

          bulkTestCache = (data.tools || []).filter(t => t.serverName === serverName);

          toolSelect.innerHTML = '<option value="">-- Select Tool --</option>';
          for (const tool of bulkTestCache) {
            toolSelect.innerHTML += `<option value="${escapeHtml(tool.name)}">${escapeHtml(tool.name)}</option>`;
          }
        } catch (error) {
          console.error('Failed to load tools:', error);
        }
      }

      async function runBulkTest() {
        const serverName = document.getElementById('bulkTestServerSelect').value;
        const toolName = document.getElementById('bulkTestToolSelect').value;
        const inputsText = document.getElementById('bulkTestInputs').value.trim();
        const parallel = document.getElementById('bulkTestParallel').checked;
        const continueOnError = document.getElementById('bulkTestContinueOnError').checked;

        if (!serverName || !toolName || !inputsText) {
          appendMessage('error', 'Please select server, tool, and provide inputs');
          return;
        }

        let inputs;
        try {
          inputs = JSON.parse(inputsText);
          if (!Array.isArray(inputs)) {
            throw new Error('Inputs must be a JSON array');
          }
        } catch (error) {
          appendMessage('error', `Invalid JSON: ${error.message}`);
          return;
        }

        const variables = getRuntimeVariables();
        if (variables === null) {
          appendMessage('error', 'Invalid Variables JSON. Fix it before running bulk tests.');
          return;
        }
        if (variables && Object.keys(variables).length > 0) {
          inputs = inputs.map(input => applyTemplateVariables(input, variables));
        }

        const btn = document.getElementById('bulkTestRunBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Running...';

        try {
          const response = await fetch('/api/inspector/bulk-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serverName, toolName, inputs, parallel, continueOnError }),
            credentials: 'include'
          });

          const results = await response.json();

          // Show results
          document.getElementById('bulkTestResultsSection').style.display = 'block';

          // Summary
          const summaryEl = document.getElementById('bulkTestSummary');
          summaryEl.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px">
              <div><strong>Total:</strong> ${results.total}</div>
              <div style="color: var(--success)"><strong>✓ Successful:</strong> ${results.successful}</div>
              <div style="color: var(--danger)"><strong>✗ Failed:</strong> ${results.failed}</div>
              <div><strong>Duration:</strong> ${results.duration}ms</div>
              ${results.stats ? `
                <div><strong>Avg Latency:</strong> ${Math.round(results.stats.avgDuration)}ms</div>
                <div><strong>Min:</strong> ${Math.round(results.stats.minDuration)}ms</div>
                <div><strong>Max:</strong> ${Math.round(results.stats.maxDuration)}ms</div>
                <div><strong>p95:</strong> ${Math.round(results.stats.p95Duration)}ms</div>
              ` : ''}
            </div>
          `;

          // Results table
          let html = '<table style="width: 100%; border-collapse: collapse; font-size: 0.7rem">';
          html += '<thead><tr style="background: var(--bg-card); font-weight: 500"><th style="padding: 6px; text-align: left">#</th><th style="padding: 6px; text-align: left">Status</th><th style="padding: 6px; text-align: left">Duration</th><th style="padding: 6px; text-align: left">Output</th></tr></thead><tbody>';

          for (const result of results.results) {
            const statusColor = result.status === 'success' ? 'var(--success)' : 'var(--danger)';
            const statusIcon = result.status === 'success' ? '✓' : '✗';
            const output = result.error || JSON.stringify(result.output).substring(0, 100);

            html += `
              <tr style="border-bottom: 1px solid var(--border)">
                <td style="padding: 6px">${result.index + 1}</td>
                <td style="padding: 6px; color: ${statusColor}">${statusIcon} ${result.status}</td>
                <td style="padding: 6px">${result.duration}ms</td>
                <td style="padding: 6px; font-family: monospace; max-width: 300px; overflow: hidden; text-overflow: ellipsis">${escapeHtml(output)}</td>
              </tr>
            `;
          }
          html += '</tbody></table>';
          document.getElementById('bulkTestResults').innerHTML = html;

          appendMessage('system', `✅ Bulk test completed: ${results.successful}/${results.total} successful`);

        } catch (error) {
          appendMessage('error', `Bulk test failed: ${error.message}`);
        } finally {
          btn.disabled = false;
          btn.textContent = '▶️ Run Bulk Test';
        }
      }

      async function exportBulkTestResults() {
        const results = document.getElementById('bulkTestResults').textContent;
        if (!results) {
          appendMessage('error', 'No results to export');
          return;
        }

        const blob = new Blob([results], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bulk-test-results-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        appendMessage('system', '📥 Results exported');
      }

      // ==========================================
      // ADVANCED INSPECTOR - DIFF
      // ==========================================
      let diffToolsCache = [];

      async function loadDiffServers() {
        const select = document.getElementById('diffServerSelect');
        try {
          const response = await fetch('/api/mcp/status', { credentials: 'include' });
          const status = await response.json();

          select.innerHTML = '<option value="">-- Select Server --</option>';
          const servers = status.servers || status;
          for (const [name, info] of Object.entries(servers)) {
            if (info.connected) {
              select.innerHTML += `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
            }
          }
        } catch (error) {
          console.error('Failed to load servers:', error);
        }
      }

      async function loadDiffTools() {
        const serverName = document.getElementById('diffServerSelect').value;
        const toolSelect = document.getElementById('diffToolSelect');

        if (!serverName) {
          toolSelect.innerHTML = '<option value="">-- Select Tool --</option>';
          return;
        }

        try {
          const response = await fetch('/api/mcp/tools', { credentials: 'include' });
          const data = await response.json();

          diffToolsCache = (data.tools || []).filter(t => t.serverName === serverName);

          toolSelect.innerHTML = '<option value="">-- Select Tool --</option>';
          for (const tool of diffToolsCache) {
            toolSelect.innerHTML += `<option value="${escapeHtml(tool.name)}">${escapeHtml(tool.name)}</option>`;
          }
        } catch (error) {
          console.error('Failed to load tools:', error);
        }
      }

      async function runDiff() {
        const serverName = document.getElementById('diffServerSelect').value;
        const toolName = document.getElementById('diffToolSelect').value;
        const args1Text = document.getElementById('diffArgs1').value.trim();
        const args2Text = document.getElementById('diffArgs2').value.trim();

        if (!serverName || !toolName || !args1Text || !args2Text) {
          appendMessage('error', 'Please select server, tool, and provide both argument sets');
          return;
        }

        let args1, args2;
        try {
          args1 = JSON.parse(args1Text);
          args2 = JSON.parse(args2Text);
        } catch (error) {
          appendMessage('error', `Invalid JSON: ${error.message}`);
          return;
        }

        const variables = getRuntimeVariables();
        if (variables === null) {
          appendMessage('error', 'Invalid Variables JSON. Fix it before running diff.');
          return;
        }
        if (variables && Object.keys(variables).length > 0) {
          args1 = applyTemplateVariables(args1, variables);
          args2 = applyTemplateVariables(args2, variables);
        }

        const btn = document.getElementById('diffRunBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Comparing...';

        try {
          const response = await fetch('/api/inspector/diff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              serverName,
              toolName,
              args1,
              args2,
              label1: 'Result A',
              label2: 'Result B'
            }),
            credentials: 'include'
          });

          const diffResult = await response.json();

          // Show results
          document.getElementById('diffResultsSection').style.display = 'block';

          // Similarity score
          const similarity = (diffResult.similarity * 100).toFixed(1);
          const similarityEl = document.getElementById('diffSimilarity');
          similarityEl.innerHTML = `<strong>Similarity:</strong> ${similarity}% ${diffResult.identical ? '(Identical)' : ''}`;
          similarityEl.style.color = diffResult.identical ? 'var(--success)' : 'var(--warning)';

          // Diff view
          let html = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">';

          // Side A
          html += `
            <div>
              <h4 style="margin: 0 0 8px 0; font-size: 0.85rem">${diffResult.label1}</h4>
              <pre style="background: var(--bg-card); padding: 12px; border-radius: 8px; max-height: 400px; overflow: auto; margin: 0; font-size: 0.7rem">${escapeHtml(diffResult.text1)}</pre>
            </div>
          `;

          // Side B
          html += `
            <div>
              <h4 style="margin: 0 0 8px 0; font-size: 0.85rem">${diffResult.label2}</h4>
              <pre style="background: var(--bg-card); padding: 12px; border-radius: 8px; max-height: 400px; overflow: auto; margin: 0; font-size: 0.7rem">${escapeHtml(diffResult.text2)}</pre>
            </div>
          `;

          html += '</div>';

          // Diff summary
          if (diffResult.diff) {
            const changes = diffResult.diff.filter(d => d.type !== 'unchanged').length;
            html += `<div style="margin-top: 12px; padding: 8px; background: var(--bg-card); border-radius: 8px; font-size: 0.75rem">
              <strong>Changes:</strong> ${changes} line(s) different
            </div>`;
          }

          document.getElementById('diffResults').innerHTML = html;

          appendMessage('system', `🔀 Diff completed: ${similarity}% similar`);

        } catch (error) {
          appendMessage('error', `Diff failed: ${error.message}`);
        } finally {
          btn.disabled = false;
          btn.textContent = '🔀 Compare';
        }
      }

      // ==========================================
      // TOOL SCHEMA DIFF
      // ==========================================
      const SCHEMA_BASELINE_KEY = 'mcp_tool_schema_baselines';
      let schemaToolsCache = null;

      async function loadSchemaDiffServers() {
        const selectA = document.getElementById('schemaServerSelect');
        const selectB = document.getElementById('schemaServerSelectB');
        if (!selectA || !selectB) return;

        try {
          const response = await fetch('/api/mcp/status', { credentials: 'include' });
          const status = await response.json();
          const servers = status.servers || status;

          const options = Object.entries(servers)
            .filter(([, info]) => info.connected)
            .map(([name]) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
            .join('');

          selectA.innerHTML = '<option value="">-- Baseline Server --</option>' + options;
          selectB.innerHTML = '<option value="">-- Compare Server --</option>' + options;
        } catch (error) {
          console.error('Failed to load schema diff servers:', error);
        }
      }

      async function ensureSchemaToolsCache() {
        if (schemaToolsCache) return schemaToolsCache;
        const response = await fetch('/api/mcp/tools', { credentials: 'include' });
        const data = await response.json();
        schemaToolsCache = data.tools || [];
        return schemaToolsCache;
      }

      async function loadSchemaDiffTools(side) {
        const serverSelect = side === 'current'
          ? document.getElementById('schemaServerSelectB')
          : document.getElementById('schemaServerSelect');
        const toolSelect = side === 'current'
          ? document.getElementById('schemaToolSelectB')
          : document.getElementById('schemaToolSelect');

        if (!serverSelect || !toolSelect) return;
        const serverName = serverSelect.value;

        if (!serverName) {
          toolSelect.innerHTML = '<option value="">-- Select Tool --</option>';
          return;
        }

        try {
          const tools = await ensureSchemaToolsCache();
          const filtered = tools.filter(t => t.serverName === serverName);
          toolSelect.innerHTML = '<option value="">-- Select Tool --</option>';
          filtered.forEach(tool => {
            toolSelect.innerHTML += `<option value="${escapeHtml(tool.name)}">${escapeHtml(tool.name)}</option>`;
          });
        } catch (error) {
          console.error('Failed to load schema diff tools:', error);
        }
      }

      async function getSchemaFor(serverName, toolName) {
        if (!serverName || !toolName) return null;
        const tools = await ensureSchemaToolsCache();
        const tool = tools.find(t => t.serverName === serverName && t.name === toolName);
        return tool?.inputSchema || null;
      }

      function updateSchemaBaselineStatus(message, isError = false) {
        const statusEl = document.getElementById('schemaBaselineStatus');
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.style.color = isError ? 'var(--error)' : 'var(--text-muted)';
      }

      function saveSchemaBaseline() {
        const serverName = document.getElementById('schemaServerSelect').value;
        const toolName = document.getElementById('schemaToolSelect').value;
        if (!serverName || !toolName) {
          updateSchemaBaselineStatus('Select a server and tool to save a baseline.', true);
          return;
        }

        getSchemaFor(serverName, toolName).then(schema => {
          if (!schema) {
            updateSchemaBaselineStatus('Schema not found for selected tool.', true);
            return;
          }
          const baselines = JSON.parse(localStorage.getItem(SCHEMA_BASELINE_KEY) || '{}');
          const key = `${serverName}::${toolName}`;
          baselines[key] = { schema, savedAt: new Date().toISOString() };
          localStorage.setItem(SCHEMA_BASELINE_KEY, JSON.stringify(baselines));
          updateSchemaBaselineStatus(`Baseline saved for ${toolName} (${serverName}).`);
        }).catch(error => {
          updateSchemaBaselineStatus('Failed to save baseline: ' + error.message, true);
        });
      }

      async function compareSchemaBaseline() {
        const serverName = document.getElementById('schemaServerSelect').value;
        const toolName = document.getElementById('schemaToolSelect').value;
        if (!serverName || !toolName) {
          updateSchemaBaselineStatus('Select a server and tool to compare.', true);
          return;
        }

        const baselines = JSON.parse(localStorage.getItem(SCHEMA_BASELINE_KEY) || '{}');
        const key = `${serverName}::${toolName}`;
        const baseline = baselines[key];
        if (!baseline) {
          updateSchemaBaselineStatus('No baseline saved for this tool.', true);
          return;
        }

        const schema = await getSchemaFor(serverName, toolName);
        if (!schema) {
          updateSchemaBaselineStatus('Schema not found for selected tool.', true);
          return;
        }

        await renderSchemaDiff(baseline.schema, schema, 'Baseline', 'Current');
      }

      async function runSchemaDiff() {
        const serverA = document.getElementById('schemaServerSelect').value;
        const toolA = document.getElementById('schemaToolSelect').value;
        const serverB = document.getElementById('schemaServerSelectB').value;
        const toolB = document.getElementById('schemaToolSelectB').value;

        if (!serverA || !toolA || !serverB || !toolB) {
          updateSchemaBaselineStatus('Select both tools to compare.', true);
          return;
        }

        const schemaA = await getSchemaFor(serverA, toolA);
        const schemaB = await getSchemaFor(serverB, toolB);
        if (!schemaA || !schemaB) {
          updateSchemaBaselineStatus('Schema not found for one or both tools.', true);
          return;
        }

        await renderSchemaDiff(schemaA, schemaB, `${toolA} (${serverA})`, `${toolB} (${serverB})`);
      }

      async function renderSchemaDiff(schemaA, schemaB, labelA, labelB) {
        const btn = document.getElementById('schemaDiffRunBtn');
        if (btn) {
          btn.disabled = true;
          btn.textContent = '⏳ Comparing...';
        }

        try {
          const response = await fetch('/api/inspector/diff-existing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              result1: schemaA,
              result2: schemaB,
              label1: labelA,
              label2: labelB
            })
          });
          const diffResult = await response.json();

          const resultsSection = document.getElementById('schemaDiffResultsSection');
          const similarityEl = document.getElementById('schemaDiffSimilarity');
          const resultsEl = document.getElementById('schemaDiffResults');

          if (resultsSection) resultsSection.style.display = 'block';

          const similarity = (diffResult.similarity * 100).toFixed(1);
          if (similarityEl) {
            similarityEl.innerHTML = `<strong>Similarity:</strong> ${similarity}% ${diffResult.identical ? '(Identical)' : ''}`;
            similarityEl.style.color = diffResult.identical ? 'var(--success)' : 'var(--warning)';
          }

          let html = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">';
          html += `
            <div>
              <h4 style="margin: 0 0 8px 0; font-size: 0.85rem">${diffResult.label1}</h4>
              <pre style="background: var(--bg-card); padding: 12px; border-radius: 8px; max-height: 400px; overflow: auto; margin: 0; font-size: 0.7rem">${escapeHtml(diffResult.text1)}</pre>
            </div>
          `;
          html += `
            <div>
              <h4 style="margin: 0 0 8px 0; font-size: 0.85rem">${diffResult.label2}</h4>
              <pre style="background: var(--bg-card); padding: 12px; border-radius: 8px; max-height: 400px; overflow: auto; margin: 0; font-size: 0.7rem">${escapeHtml(diffResult.text2)}</pre>
            </div>
          `;
          html += '</div>';

          if (diffResult.diff) {
            const changes = diffResult.diff.filter(d => d.type !== 'unchanged').length;
            html += `<div style="margin-top: 12px; padding: 8px; background: var(--bg-card); border-radius: 8px; font-size: 0.75rem">
              <strong>Changes:</strong> ${changes} line(s) different
            </div>`;
          }

          if (resultsEl) resultsEl.innerHTML = html;

          updateSchemaBaselineStatus(
            diffResult.identical ? '✅ Schema matches baseline.' : '⚠️ Schema differs from baseline.'
          );
        } catch (error) {
          updateSchemaBaselineStatus('Schema diff failed: ' + error.message, true);
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = '🧬 Compare Schemas';
          }
        }
      }

      // Initialize
      restoreSession();
      checkAuthStatus();
      loadMCPStatus();
      populateSystemPrompts();
      updateTokenDisplay();
      initEnvProfile();
      loadInspectorVariables();

      // Refresh MCP status periodically
      const mcpStatusInterval = setInterval(loadMCPStatus, 30000);

      // Cleanup on page unload
      window.addEventListener('beforeunload', () => {
        if (mcpStatusInterval) {
          clearInterval(mcpStatusInterval);
        }
      });

      // ==========================================
      // EXPOSE FUNCTIONS TO WINDOW FOR FLOATING WORKSPACE
      // ==========================================
      window.showAddServerModal = showAddServerModal;
      window.hideAddServerModal = hideAddServerModal;
      window.applyServerTemplate = applyServerTemplate;
      window.saveAsCustomTemplate = saveAsCustomTemplate;
      window.manageCustomTemplates = manageCustomTemplates;
      window.showImportConfigModal = showImportConfigModal;
      window.hideImportConfigModal = hideImportConfigModal;
      window.parseAndImportConfig = parseAndImportConfig;
      window.confirmDeleteServer = confirmDeleteServer;
      window.hideConfirmDeleteModal = hideConfirmDeleteModal;
      window.submitAddServer = submitAddServer;
      window.addEnvVarRow = addEnvVarRow;
      window.updateConfigPreview = updateConfigPreview;
      window.copyConfigToClipboard = copyConfigToClipboard;
      window.toggleServerTypeFields = toggleServerTypeFields;
      window.loadCustomTemplates = loadCustomTemplates;
      window.switchEnvironment = switchEnvironment;
      window.filterTools = filterTools;
      window.testAllTools = testAllTools;
      window.exportConfig = exportConfig;
      window.importConfigFile = importConfigFile;
      window.handleConfigFileImport = handleConfigFileImport;
      window.toggleInspectorInputMode = toggleInspectorInputMode;
      window.fillInspectorDefaults = fillInspectorDefaults;
      window.saveInspectorVariables = saveInspectorVariables;
      window.clearInspectorVariables = clearInspectorVariables;
      window.showVariablesManager = showVariablesManager;
      window.loadInspectorServers = loadInspectorServers;
      window.appConfirm = appConfirm;
      window.appAlert = appAlert;
      window.appPrompt = appPrompt;
      window.appFormModal = appFormModal;
      window.loadSchemaDiffServers = loadSchemaDiffServers;
      window.loadSchemaDiffTools = loadSchemaDiffTools;
      window.saveSchemaBaseline = saveSchemaBaseline;
      window.compareSchemaBaseline = compareSchemaBaseline;
      window.runSchemaDiff = runSchemaDiff;
      window.getToolExecutionHistory = () => toolExecutionHistory;
      window.getLocalScenarios = () => sessionManager.getScenarios();

