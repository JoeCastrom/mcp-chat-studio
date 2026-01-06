// ==========================================
// DEVELOPMENT MODE LOGGER
// ==========================================
const isDevelopment =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const logger = {
  log: (...args) => isDevelopment && console.log(...args),
  warn: (...args) => console.warn(...args), // Always show warnings
  error: (...args) => console.error(...args), // Always show errors
  debug: (...args) => isDevelopment && console.log('[DEBUG]', ...args),
};

const CSRF_COOKIE_NAME = 'csrf_token';

function getCookieValue(name) {
  return (
    document.cookie
      .split(';')
      .map(item => item.trim())
      .filter(Boolean)
      .map(item => item.split('='))
      .find(([key]) => key === name)?.[1] || ''
  );
}

function isSameOriginUrl(url) {
  try {
    const target = new URL(url, window.location.origin);
    return target.origin === window.location.origin;
  } catch (error) {
    return false;
  }
}

function shouldAttachCsrf(method, url) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(method)) return false;
  return isSameOriginUrl(url);
}

const originalFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const request = input instanceof Request ? input : new Request(input, init);
  const method = (request.method || 'GET').toUpperCase();
  if (shouldAttachCsrf(method, request.url)) {
    const token = getCookieValue(CSRF_COOKIE_NAME);
    if (token) {
      const headers = new Headers(request.headers);
      headers.set('X-CSRF-Token', token);
      const updated = new Request(request, { headers });
      return originalFetch(updated);
    }
  }
  return originalFetch(request);
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
      content:
        '👋 Welcome to **MCP Chat Studio**! I\'m your AI assistant with MCP tool support. Connect to MCP servers using the sidebar to enable powerful tools. Some servers may require authentication - click "Login" to connect to secured services.',
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
      queueSessionSync(session);
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
      clearServerSession();
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

    if (typeof window.recordMockEntry === 'function') {
      window.recordMockEntry(entry);
    }
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
    default: {
      name: 'Default Assistant',
      prompt:
        'You are a helpful AI assistant with access to MCP tools. Use the tools when appropriate to help the user.',
      icon: '🤖',
    },
    'strict-coder': {
      name: 'Strict Coder',
      prompt:
        'You are a strict coding assistant. Always respond with well-formatted code. Use tools to verify your work. Be concise and technical.',
      icon: '👨‍💻',
    },
    'json-validator': {
      name: 'JSON Validator',
      prompt:
        'You are a JSON validation expert. Always output valid JSON when asked. Validate inputs strictly. Use tools to test JSON parsing.',
      icon: '📋',
    },
    'creative-writer': {
      name: 'Creative Writer',
      prompt:
        'You are a creative writing assistant. Be expressive and imaginative. Use tools sparingly, focus on prose quality.',
      icon: '✍️',
    },
    'tool-tester': {
      name: 'Tool Tester',
      prompt:
        'You are a QA tester for MCP tools. Test tools thoroughly with edge cases. Report results in structured format. Always use tools when available.',
      icon: '🧪',
    },
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
        ollama: { input: 0, output: 0 }, // Free
        openai: { input: 3, output: 15 }, // GPT-4o pricing
        anthropic: { input: 3, output: 15 }, // Claude pricing
        google: { input: 0.075, output: 0.3 }, // Gemini pricing
        azure: { input: 3, output: 15 },
        groq: { input: 0.05, output: 0.1 },
        together: { input: 0.2, output: 0.6 },
        openrouter: { input: 1, output: 3 },
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
        parentId: null,
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

let sessionSyncTimer = null;
let sessionSyncPayload = null;

function queueSessionSync(payload) {
  sessionSyncPayload = payload;
  if (sessionSyncTimer) return;
  sessionSyncTimer = setTimeout(async () => {
    const data = sessionSyncPayload;
    sessionSyncPayload = null;
    sessionSyncTimer = null;
    if (!data) return;
    try {
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.warn('[Session] Server sync failed:', error.message);
    }
  }, 1500);
}

async function restoreSessionFromServer() {
  try {
    const response = await fetch('/api/session', { credentials: 'include' });
    const data = await response.json();
    const serverSession = data?.session;
    if (!serverSession?.messages?.length) return;

    const localSession = sessionManager.load();
    const localCount = localSession?.messages?.length ?? messages.length;
    const localTimestamp = localSession?.timestamp || 0;
    const serverUpdatedAt = serverSession.updatedAt ? Date.parse(serverSession.updatedAt) : 0;
    const shouldRestore = localCount <= 1 || (serverUpdatedAt && serverUpdatedAt > localTimestamp);

    if (!shouldRestore) return;

    const mergedSession = {
      ...localSession,
      ...serverSession,
      settings: {
        ...(localSession?.settings || {}),
        ...(serverSession?.settings || {}),
      },
      messages: serverSession.messages,
      toolHistory: serverSession.toolHistory || [],
    };

    messages = mergedSession.messages;
    toolExecutionHistory = mergedSession.toolHistory;
    sessionManager.save(mergedSession);
    refreshSessionUI();
    console.log('[Session] Restored session from server');
  } catch (error) {
    console.warn('[Session] Server restore failed:', error.message);
  }
}

async function clearServerSession() {
  try {
    await fetch('/api/session', {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch (error) {
    console.warn('[Session] Server clear failed:', error.message);
  }
}

// ==========================================
// STATE - Load from session or use defaults
// ==========================================
const savedSession = sessionManager.load();
let messages =
  savedSession?.messages?.length > 0 ? savedSession.messages : [sessionManager.getWelcomeMessage()];
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

function getMessagesContainer() {
  if (messagesEl && messagesEl.isConnected) return messagesEl;
  return document.getElementById('messages');
}

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

function getHistoryEntries() {
  const history = sessionManager.getToolHistory();
  if (history.length > 0) return history;
  return Array.isArray(toolExecutionHistory) ? toolExecutionHistory : [];
}

function updateToolHistory(entry) {
  sessionManager.logToolExecution(entry);
  const history = sessionManager.getToolHistory();
  if (history.length > 0) {
    toolExecutionHistory = history;
  } else {
    toolExecutionHistory = [entry, ...toolExecutionHistory];
  }
  if (entry) {
    assistantLastTool = {
      tool: entry.tool || entry.toolName || entry.name || null,
      server: entry.server || entry.serverName || null,
      timestamp: entry.timestamp || new Date().toISOString(),
    };
    saveAssistantState();
    updateAssistantContextLabel();
  }
  if (typeof refreshHistoryPanel === 'function') {
    refreshHistoryPanel();
  }
}

function ensureToolOption(selectEl, toolName, sourceLabel) {
  if (!selectEl || !toolName) return;
  const exists = Array.from(selectEl.options || []).some(option => option.value === toolName);
  if (!exists) {
    const opt = document.createElement('option');
    opt.value = toolName;
    opt.textContent = `${toolName} (${sourceLabel || 'manual'})`;
    selectEl.appendChild(opt);
  }
  selectEl.value = toolName;
}

function showNotification(message, type = 'info') {
  if (!message) return;
  let container = document.getElementById('notificationContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'notification-container';
    document.body.appendChild(container);
  }
  const durations = {
    success: 5500,
    info: 6000,
    warning: 7000,
    error: 8000,
  };
  const duration = durations[type] || 4500;
  const toast = document.createElement('div');
  toast.className = `notification ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
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
  appendMessage('system', '✅ Login successful! You can now connect to authenticated MCP servers.');
  window.history.replaceState({}, '', '/');
} else if (urlParams.get('error')) {
  appendMessage('error', `Login failed: ${urlParams.get('error')}`);
  window.history.replaceState({}, '', '/');
}

async function checkSharedSessionLink() {
  const shareToken = urlParams.get('share');
  if (!shareToken) return;
  try {
    const response = await fetch(`/api/session/share/${shareToken}`, { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) {
      showNotification(data.error || 'Shared session not found', 'error');
      window.history.replaceState({}, '', '/');
      return;
    }

    const sharedSession = data.session;
    const messageCount = sharedSession?.messages?.length || 0;
    const historyCount = sharedSession?.toolHistory?.length || 0;
    const confirmed = await appConfirm(
      `Import shared session with ${messageCount} messages and ${historyCount} tool runs?`,
      { title: 'Import Shared Session', confirmText: 'Import' }
    );
    if (!confirmed) {
      window.history.replaceState({}, '', '/');
      return;
    }

    messages = sharedSession.messages || [sessionManager.getWelcomeMessage()];
    toolExecutionHistory = sharedSession.toolHistory || [];
    sessionManager.save(sharedSession);
    restoreSession();
    if (typeof refreshHistoryPanel === 'function') {
      refreshHistoryPanel();
    }
    updateTokenDisplay();
    if (typeof window.refreshBrainView === 'function') {
      window.refreshBrainView();
    }
    showNotification('Shared session imported.', 'success');
  } catch (error) {
    showNotification(`Failed to import shared session: ${error.message}`, 'error');
  } finally {
    window.history.replaceState({}, '', '/');
  }
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
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
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
    const tabs = [
      'chat',
      'inspector',
      'history',
      'scenarios',
      'workflows',
      'generator',
      'collections',
      'monitors',
      'toolexplorer',
    ];
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
          ${
            currentSessionId
              ? `
          <button class="btn" onclick="copySessionId()" title="Copy session ID for CLI">
            🔑 ${sessionShort}
          </button>
          `
              : ''
          }
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
  navigator.clipboard
    .writeText(currentSessionId)
    .then(() => {
      notifyUser('Session ID copied for CLI use.', 'success');
    })
    .catch(() => {
      notifyUser('Failed to copy session ID.', 'error');
    });
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
        appendMessage('system', `🔒 ${serverName} requires authentication. Please login first.`);
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
  const requiresAuthEl = document.getElementById('serverRequiresAuth');
  if (requiresAuthEl) requiresAuthEl.checked = false;
  const cwdEl = document.getElementById('serverCwd');
  if (cwdEl) cwdEl.value = '';
  toggleServerTypeFields();
  updateConfigPreview();
  loadExistingServerTemplates();
  loadCustomTemplates();
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
  const requiresAuthEl = document.getElementById('serverRequiresAuth');
  if (requiresAuthEl) requiresAuthEl.checked = false;
  const cwdEl = document.getElementById('serverCwd');
  if (cwdEl) cwdEl.value = '';
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
  github: {
    name: 'github',
    type: 'stdio',
    command: 'npx',
    args: '-y @modelcontextprotocol/server-github',
    description: 'GitHub API - repos, issues, PRs, search',
    envHint: 'Requires GITHUB_TOKEN environment variable',
  },
  filesystem: {
    name: 'filesystem',
    type: 'stdio',
    command: 'npx',
    args: '-y @modelcontextprotocol/server-filesystem C:/Users/YourName/Documents',
    description: 'Local filesystem access (read/write)',
    envHint: '⚠️ EDIT ARGS FIRST! Change the path to your actual directory before connecting',
  },
  'brave-search': {
    name: 'brave-search',
    type: 'stdio',
    command: 'npx',
    args: '-y @modelcontextprotocol/server-brave-search',
    description: 'Brave Search API - web search',
    envHint: 'Requires BRAVE_API_KEY environment variable',
  },
  sqlite: {
    name: 'sqlite',
    type: 'stdio',
    command: 'npx',
    args: '-y @modelcontextprotocol/server-sqlite C:/path/to/your/database.db',
    description: 'SQLite database queries',
    envHint: '⚠️ EDIT ARGS FIRST! Change the path to your actual .db file before connecting',
  },
  puppeteer: {
    name: 'puppeteer',
    type: 'stdio',
    command: 'npx',
    args: '-y @modelcontextprotocol/server-puppeteer',
    description: 'Browser automation with Puppeteer',
    envHint: 'Uses headless Chrome/Chromium',
  },
  'sse-example': {
    name: 'sse-server',
    type: 'sse',
    url: 'http://localhost:3001/sse',
    description: 'Example SSE MCP server',
    envHint: 'Update URL to your SSE server endpoint',
  },
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
            args: Array.isArray(config.args) ? config.args.join('\n') : config.args || '',
            cwd: config.cwd || '',
            url: config.url || '',
            env: config.env,
            description: config.description || `Configured MCP server: ${name}`,
            envHint: 'Loaded from your configured servers',
            requiresAuth: config.requiresAuth || config.requiresOAuth || false,
          },
        };
      })
      .filter(Boolean);

    if (existing.length === 0) {
      group.style.display = 'none';
      group.innerHTML = '';
      return;
    }

    group.style.display = '';
    group.innerHTML = existing
      .map(item => {
        serverTemplates[item.id] = item.template;
        return `<option value="${item.id}">${escapeHtml(item.label)}</option>`;
      })
      .join('');
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
    const cwdEl = document.getElementById('serverCwd');
    if (cwdEl) cwdEl.value = template.cwd || '';
    document.getElementById('serverArgs').value = template.args;
  } else if (template.type === 'sse') {
    document.getElementById('serverUrl').value = template.url;
  }
  const requiresAuthEl = document.getElementById('serverRequiresAuth');
  if (requiresAuthEl) {
    requiresAuthEl.checked = !!template.requiresAuth;
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
  const formName = document.getElementById('serverName').value.trim();
  const type = document.getElementById('serverType').value;
  const description = document.getElementById('serverDescription').value.trim();
  const env = collectEnvVars();
  const requiresAuth = document.getElementById('serverRequiresAuth')?.checked || false;

  const templateName = await appPrompt('Template name:', {
    title: 'Save Template',
    label: 'Template name',
    defaultValue: formName || 'My MCP Server',
    required: true,
  });
  if (!templateName) return;
  const name = formName || templateName;

  const template = {
    name,
    type,
    description: description || `Custom: ${name}`,
    envHint: 'Your saved template',
    requiresAuth,
  };

  if (type === 'stdio') {
    template.command = document.getElementById('serverCommand').value.trim();
    template.cwd = document.getElementById('serverCwd')?.value.trim() || '';
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
  try {
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(customTemplates));
  } catch (error) {
    appendMessage(
      'error',
      'Failed to save template to local storage. Check browser storage settings.'
    );
    return;
  }

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
  group.innerHTML = templateIds
    .map(id => {
      const t = customTemplates[id];
      return `<option value="${id}">📌 ${escapeHtml(t.displayName || t.name)}</option>`;
    })
    .join('');

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
    label: `${index + 1}. ${customTemplates[id].displayName || customTemplates[id].name}`,
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
        required: true,
      },
    ],
  });
  if (!result.confirmed) return;
  const templateId = result.values.templateId;
  const templateName =
    customTemplates[templateId]?.displayName || customTemplates[templateId]?.name || templateId;
  const confirmed = await appConfirm(`Delete template "${templateName}"?`, {
    title: 'Confirm Delete',
    confirmText: 'Delete',
    confirmVariant: 'danger',
  });
  if (!confirmed) return;
  deleteCustomTemplate(templateId);
  appendMessage('system', `🗑️ Deleted template "${templateName}"`);
}

// Load custom templates on page init
loadCustomTemplates();

// Submit Add Server Form
function stripWrappingQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function submitAddServer(event) {
  event.preventDefault();

  const name = document.getElementById('serverName').value.trim();
  const type = document.getElementById('serverType').value;
  const description = document.getElementById('serverDescription').value.trim();
  const requiresAuth = document.getElementById('serverRequiresAuth')?.checked || false;

  let payload = { name, type, description, requiresAuth };

  // Collect environment variables
  const envVars = collectEnvVars();
  if (Object.keys(envVars).length > 0) {
    payload.env = envVars;
  }

  if (type === 'stdio') {
    const command = stripWrappingQuotes(document.getElementById('serverCommand').value.trim());
    const argsStr = document.getElementById('serverArgs').value.trim();
    const cwdRaw = document.getElementById('serverCwd')?.value.trim();
    const cwd = cwdRaw ? stripWrappingQuotes(cwdRaw) : '';

    if (!command) {
      appendMessage('error', 'Command is required for stdio servers');
      return;
    }

    payload.command = command;
    if (cwd) payload.cwd = cwd;
    // Parse arguments: split by newlines, strip YAML list markers (- ), split by spaces, filter empty
    payload.args = argsStr
      ? argsStr
          .split(/[\r\n]+/)
          .map(line => line.trim().replace(/^-\s+/, '')) // Strip leading "- " (YAML list format)
          .flatMap(line => line.split(/\s+/))
          .map(arg => stripWrappingQuotes(arg))
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
  row.style.cssText = 'display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-xs);';
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
  const cwd = document.getElementById('serverCwd')?.value.trim();
  const argsStr = document.getElementById('serverArgs').value.trim();
  const url = document.getElementById('serverUrl').value.trim();
  const env = collectEnvVars();
  const requiresAuth = document.getElementById('serverRequiresAuth')?.checked || false;

  let yaml = `mcpServers:\n  ${name}:\n`;

  if (type === 'stdio') {
    if (command) yaml += `    command: ${command}\n`;
    if (cwd) yaml += `    cwd: ${cwd}\n`;
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

  if (requiresAuth) {
    yaml += `    requiresAuth: true\n`;
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

async function parseAndImportConfig() {
  const text = document.getElementById('importConfigText').value.trim();
  if (!text) {
    appendMessage('error', 'Please paste a config');
    return;
  }

  try {
    const response = await fetch('/api/mcp/parse-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || `Parse failed (${response.status})`);
    }

    const servers = data.servers || {};
    const serverNames = Object.keys(servers);
    if (serverNames.length === 0) {
      throw new Error('No MCP servers found in config');
    }

    const firstServer = serverNames[0];
    let config = servers[firstServer];
    document.getElementById('serverName').value = firstServer;

    // Fill form fields
    if (config.command) {
      document.getElementById('serverType').value = 'stdio';
      toggleServerTypeFields();
      document.getElementById('serverCommand').value = config.command;
    }

    const cwdEl = document.getElementById('serverCwd');
    if (cwdEl) cwdEl.value = config.cwd || '';

    if (config.url) {
      document.getElementById('serverType').value = 'sse';
      toggleServerTypeFields();
      document.getElementById('serverUrl').value = config.url;
    }

    if (config.args && Array.isArray(config.args)) {
      document.getElementById('serverArgs').value = config.args.join('\n');
    }

    const requiresAuthEl = document.getElementById('serverRequiresAuth');
    if (requiresAuthEl) {
      requiresAuthEl.checked = !!(config.requiresAuth || config.requiresOAuth);
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
    const extra =
      serverNames.length > 1
        ? ` Imported ${serverNames.length} servers; showing "${firstServer}".`
        : '';
    appendMessage('system', `✅ Config imported! Review and submit.${extra}`);
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
    const requiresAuthEl = document.getElementById('serverRequiresAuth');
    if (requiresAuthEl) {
      requiresAuthEl.checked = !!(config.requiresAuth || config.requiresOAuth);
    }

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

const LLM_PROVIDER_VISIBILITY_KEY = 'mcp_llm_provider_visibility';
let llmAllowedProviders = null;

async function loadLLMConfig() {
  const response = await fetch('/api/llm/config', { credentials: 'include' });
  const config = await response.json();
  llmAllowedProviders = Array.isArray(config.allowedProviders) ? config.allowedProviders : null;
  if (config?.provider) {
    const visibility = loadProviderVisibility();
    visibility[config.provider] = true;
    saveProviderVisibility(visibility);
  }
  return config;
}

function loadProviderVisibility() {
  try {
    const raw = localStorage.getItem(LLM_PROVIDER_VISIBILITY_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function saveProviderVisibility(map) {
  localStorage.setItem(LLM_PROVIDER_VISIBILITY_KEY, JSON.stringify(map));
}

function getProviderOptions() {
  const select = document.getElementById('llmProvider');
  if (!select) return [];
  return Array.from(select.options)
    .map(option => ({
      value: option.value,
      label: option.textContent?.trim() || option.value,
    }))
    .filter(option => option.value);
}

function getAllowedProviderSet() {
  if (Array.isArray(llmAllowedProviders) && llmAllowedProviders.length > 0) {
    return new Set(llmAllowedProviders);
  }
  return null;
}

function updateProviderSummary(providerValue) {
  const summaryEl = document.getElementById('llmProviderSummary');
  const select = document.getElementById('llmProvider');
  if (!summaryEl || !select) return;
  const option = Array.from(select.options).find(opt => opt.value === providerValue);
  summaryEl.textContent = option
    ? option.textContent?.trim() || option.value
    : providerValue || 'Unknown';
}

function getVisibleProviderOptions() {
  const options = getProviderOptions();
  const allowedSet = getAllowedProviderSet();
  const visibility = loadProviderVisibility();
  const current = document.getElementById('llmProvider')?.value;
  return options.filter(option => {
    const allowed = !allowedSet || allowedSet.has(option.value);
    const visible = visibility[option.value] !== false || option.value === current;
    return allowed && visible;
  });
}

function renderProviderMenuItems(selectedProvider) {
  const popover = document.getElementById('providerMenuPopover');
  if (!popover) return;

  const visibleOptions = getVisibleProviderOptions();
  if (visibleOptions.length === 0) {
    popover.innerHTML = `
            <div class="form-hint" style="padding: 8px 12px">No visible providers.</div>
            <div class="workspace-menu-divider"></div>
            <button class="workspace-menu-item" onclick="showSettingsModal()">
              <span class="menu-icon">⚙️</span>
              <span class="menu-content">
                <span class="menu-title">LLM Settings</span>
                <span class="menu-hint">Enable providers</span>
              </span>
            </button>
          `;
    return;
  }

  popover.innerHTML = visibleOptions
    .map(option => {
      const isActive = option.value === selectedProvider;
      const label = option.label;
      const match = label.match(/^(\S+)\s+(.*)$/);
      const icon = match ? match[1] : '🤖';
      const title = match ? match[2] : label;
      return `
              <button
                class="workspace-menu-item provider-menu-item${isActive ? ' active' : ''}"
                data-provider="${escapeHtml(option.value)}"
              >
                <span class="menu-icon">${escapeHtml(icon)}</span>
                <span class="menu-content">
                  <span class="menu-title">${escapeHtml(title)}</span>
                  <span class="menu-hint">${isActive ? 'Current provider' : 'Switch provider'}</span>
                </span>
              </button>
            `;
    })
    .join('');

  popover.innerHTML += `
          <div class="workspace-menu-divider"></div>
          <button class="workspace-menu-item" onclick="showSettingsModal()">
            <span class="menu-icon">⚙️</span>
            <span class="menu-content">
              <span class="menu-title">LLM Settings</span>
              <span class="menu-hint">Visibility, auth, model</span>
            </span>
          </button>
        `;

  popover.querySelectorAll('[data-provider]').forEach(button => {
    button.addEventListener('click', () => {
      selectLLMProvider(button.dataset.provider);
    });
  });
}

function renderProviderVisibilityOptions() {
  const container = document.getElementById('llmProviderVisibility');
  if (!container) return;

  const options = getProviderOptions();
  const allowedSet = getAllowedProviderSet();
  const visibility = loadProviderVisibility();
  const currentProvider = document.getElementById('llmProvider')?.value;
  const available = allowedSet ? options.filter(option => allowedSet.has(option.value)) : options;

  container.innerHTML = available
    .map(option => {
      const isCurrent = option.value === currentProvider;
      const checked = visibility[option.value] !== false || isCurrent;
      return `
            <label style="display: flex; gap: 8px; align-items: center; font-size: 0.78rem">
              <input
                type="checkbox"
                data-provider="${escapeHtml(option.value)}"
                ${checked ? 'checked' : ''}
                ${isCurrent ? 'disabled' : ''}
              />
              <span>${escapeHtml(option.label)}${isCurrent ? ' (current)' : ''}</span>
            </label>
          `;
    })
    .join('');

  container.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => {
      const map = loadProviderVisibility();
      map[input.dataset.provider] = input.checked;
      saveProviderVisibility(map);
      applyProviderVisibility();
      renderProviderMenuItems(document.getElementById('llmProvider')?.value);
    });
  });

  const hint = document.getElementById('llmProviderVisibilityHint');
  if (hint && allowedSet) {
    hint.textContent = `Admin allow-list enforced: ${Array.from(allowedSet).join(', ')}`;
  } else if (hint) {
    hint.textContent = 'Hide providers you don’t use. Admin allow-lists always apply.';
  }
}

function applyProviderVisibility() {
  const select = document.getElementById('llmProvider');
  if (!select) return;

  const options = Array.from(select.options);
  const allowedSet = getAllowedProviderSet();
  const visibility = loadProviderVisibility();
  const current = select.value;
  let firstVisible = '';

  options.forEach(option => {
    const isAllowed = !allowedSet || allowedSet.has(option.value);
    const isVisible = isAllowed && (visibility[option.value] !== false || option.value === current);
    option.hidden = !isVisible;
    option.disabled = !isVisible;
    if (isVisible && !firstVisible) {
      firstVisible = option.value;
    }
  });

  const isCurrentAllowed = !allowedSet || allowedSet.has(current);
  if (!isCurrentAllowed) {
    select.value = firstVisible || '';
    onProviderChange(false);
  }

  const providerPopover = document.getElementById('providerMenuPopover');
  if (providerPopover && providerPopover.classList.contains('open')) {
    renderProviderMenuItems(select.value);
  }
}

function resetProviderVisibility() {
  localStorage.removeItem(LLM_PROVIDER_VISIBILITY_KEY);
  renderProviderVisibilityOptions();
  applyProviderVisibility();
  renderProviderMenuItems(document.getElementById('llmProvider')?.value);
}

async function toggleProviderMenu(forceOpen = false) {
  const popover = document.getElementById('providerMenuPopover');
  const toggle = document.getElementById('modelBadge');
  if (!popover || !toggle) return;
  closeWorkspaceMenu();

  const isOpen = popover.classList.contains('open');
  if (isOpen && !forceOpen) {
    closeProviderMenu();
    return;
  }

  try {
    const config = await loadLLMConfig();
    const provider = config.provider || 'ollama';
    const select = document.getElementById('llmProvider');
    if (select) {
      select.value = provider;
    }
    applyProviderVisibility();
    updateProviderSummary(document.getElementById('llmProvider')?.value);
    renderProviderMenuItems(document.getElementById('llmProvider')?.value);
  } catch (error) {
    console.error('Failed to load LLM providers:', error);
  }

  popover.classList.add('open');
  toggle.setAttribute('aria-expanded', 'true');
}

function openProviderMenu() {
  toggleProviderMenu(true);
}

function closeProviderMenu() {
  const popover = document.getElementById('providerMenuPopover');
  const toggle = document.getElementById('modelBadge');
  if (popover) popover.classList.remove('open');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

function openProviderMenuFromSettings() {
  hideSettingsModal();
  openProviderMenu();
}

async function selectLLMProvider(provider) {
  if (!provider) return;
  try {
    const response = await fetch('/api/llm/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ provider }),
    });
    const data = await response.json();
    if (data.error) {
      appendMessage('error', `Failed to switch provider: ${data.error}`);
      return;
    }
    const select = document.getElementById('llmProvider');
    if (select) {
      select.value = provider;
    }
    const visibility = loadProviderVisibility();
    visibility[provider] = true;
    saveProviderVisibility(visibility);
    onProviderChange(false);
    updateProviderSummary(provider);
    renderProviderMenuItems(provider);
    updateModelBadge();
    closeProviderMenu();
  } catch (error) {
    appendMessage('error', `Failed to switch provider: ${error.message}`);
  }
}

async function showSettingsModal() {
  closeProviderMenu();
  // Load current LLM config
  try {
    const config = await loadLLMConfig();

    document.getElementById('llmProvider').value = config.provider || 'ollama';
    document.getElementById('llmModel').value = config.model || '';
    document.getElementById('llmTemperature').value = config.temperature || 0.7;
    document.getElementById('tempValue').textContent = config.temperature || 0.7;
    document.getElementById('llmBaseUrl').value = config.base_url || '';
    document.getElementById('llmApiKey').value = '';
    document.getElementById('llmClearApiKey').checked = false;
    const authTypeValue =
      config.auth_type || (config.provider === 'custom' && config.hasApiKey ? 'bearer' : 'none');
    document.getElementById('llmAuthType').value = authTypeValue;
    document.getElementById('llmAuthUrl').value = config.auth_url || '';
    document.getElementById('llmAuthClientId').value = config.auth_client_id || '';
    document.getElementById('llmAuthClientSecret').value = '';
    document.getElementById('llmClearAuthSecret').checked = false;
    document.getElementById('llmAuthScope').value = config.auth_scope || '';
    document.getElementById('llmAuthAudience').value = config.auth_audience || '';
    document.getElementById('llmAuthHeaderName').value = config.auth_extra_header_name || '';
    const headerValueEl = document.getElementById('llmAuthHeaderValue');
    if (headerValueEl) {
      headerValueEl.value = '';
      headerValueEl.placeholder = config.hasAuthExtraHeader ? 'Stored (hidden)' : 'Bearer sk-...';
    }
    document.getElementById('llmClearAuthHeader').checked = false;
    renderProviderVisibilityOptions();
    applyProviderVisibility();
    onProviderChange(false);
    updateProviderSummary(document.getElementById('llmProvider').value);
    const assistantOverride = localStorage.getItem('mcp_assistant_llm_override') === 'true';
    const assistantOverrideEl = document.getElementById('assistantLlmOverride');
    if (assistantOverrideEl) assistantOverrideEl.checked = assistantOverride;
  } catch (e) {
    console.error('Failed to load LLM config:', e);
  }

  // Load session token for CLI usage (if authenticated)
  try {
    const tokenSection = document.getElementById('sessionTokenSection');
    const tokenInput = document.getElementById('sessionTokenValue');
    const statusRes = await fetch('/api/oauth/status', { credentials: 'include' });
    const status = await statusRes.json();
    if (status?.sessionId) {
      if (tokenInput) tokenInput.value = status.sessionId;
      if (tokenSection) tokenSection.style.display = '';
    } else if (tokenSection) {
      tokenSection.style.display = 'none';
    }
  } catch (e) {
    console.warn('Failed to load session token:', e.message);
    const tokenSection = document.getElementById('sessionTokenSection');
    if (tokenSection) tokenSection.style.display = 'none';
  }

  document.getElementById('settingsModal').classList.add('active');
}

function hideSettingsModal() {
  document.getElementById('settingsModal').classList.remove('active');
}

// ==========================================
// OAUTH SETTINGS MODAL
// ==========================================

async function showOAuthSettingsModal() {
  try {
    const [configRes, statusRes] = await Promise.all([
      fetch('/api/oauth/config', { credentials: 'include' }),
      fetch('/api/oauth/status', { credentials: 'include' }),
    ]);

    const config = configRes.ok ? await configRes.json() : {};
    const status = statusRes.ok ? await statusRes.json() : {};

    document.getElementById('oauthProvider').value = config.provider || 'keycloak';
    document.getElementById('oauthClientId').value = config.client_id || '';
    document.getElementById('oauthClientSecret').value = '';
    document.getElementById('oauthClearSecret').checked = false;
    document.getElementById('oauthRedirectUri').value =
      config.redirect_uri || `${window.location.origin}/api/oauth/callback`;
    document.getElementById('oauthScopes').value = Array.isArray(config.scopes)
      ? config.scopes.join(' ')
      : config.scopes || '';
    document.getElementById('oauthUsePkce').value = config.use_pkce === false ? 'false' : 'true';
    const selfSignedEl = document.getElementById('oauthAllowSelfSigned');
    if (selfSignedEl) selfSignedEl.checked = !!config.disable_ssl_verify;
    document.getElementById('oauthKeycloakUrl').value = config.keycloak_url || '';
    document.getElementById('oauthKeycloakRealm').value = config.keycloak_realm || '';
    document.getElementById('oauthAuthorizeUrl').value = config.authorize_url || '';
    document.getElementById('oauthTokenUrl').value = config.token_url || '';
    document.getElementById('oauthUserinfoUrl').value = config.userinfo_url || '';
    document.getElementById('oauthLogoutUrl').value = config.logout_url || '';

    const statusEl = document.getElementById('oauthStatusInfo');
    if (statusEl) {
      const statusParts = [];
      statusParts.push(
        config.disabled ? 'OAuth disabled' : config.configured ? 'Configured' : 'Not configured'
      );
      statusParts.push(status.authenticated ? 'Authenticated' : 'Not logged in');
      if (config.source) {
        statusParts.push(`Source: ${config.source === 'ui' ? 'UI override' : 'config.yaml'}`);
      }
      statusEl.textContent = statusParts.join(' • ');
    }

    const secretHint = document.getElementById('oauthSecretHint');
    if (secretHint) {
      secretHint.textContent = config.hasClientSecret
        ? 'Secret stored. Leave blank to keep current.'
        : 'Optional for public clients.';
    }

    onOAuthProviderChange();
    document.getElementById('oauthSettingsModal').classList.add('active');
  } catch (error) {
    appendMessage('error', `Failed to load OAuth settings: ${error.message}`);
  }
}

function hideOAuthSettingsModal() {
  document.getElementById('oauthSettingsModal').classList.remove('active');
}

function onOAuthProviderChange() {
  const provider = document.getElementById('oauthProvider').value;
  const keycloakFields = document.getElementById('oauthKeycloakFields');
  const customFields = document.getElementById('oauthCustomFields');

  if (keycloakFields) {
    keycloakFields.style.display = provider === 'keycloak' ? 'block' : 'none';
  }
  if (customFields) {
    customFields.style.display = provider === 'custom' ? 'block' : 'none';
  }
}

function getOAuthFormPayload() {
  const provider = document.getElementById('oauthProvider').value;
  const clientId = document.getElementById('oauthClientId').value.trim();
  const clientSecret = document.getElementById('oauthClientSecret').value.trim();
  const clearSecret = document.getElementById('oauthClearSecret').checked;
  const redirectUri = document.getElementById('oauthRedirectUri').value.trim();
  const scopes = document.getElementById('oauthScopes').value.trim();
  const usePkce = document.getElementById('oauthUsePkce').value === 'true';
  const disableSslVerify = document.getElementById('oauthAllowSelfSigned')?.checked || false;
  const keycloakUrl = document.getElementById('oauthKeycloakUrl').value.trim();
  const keycloakRealm = document.getElementById('oauthKeycloakRealm').value.trim();
  const authorizeUrl = document.getElementById('oauthAuthorizeUrl').value.trim();
  const tokenUrl = document.getElementById('oauthTokenUrl').value.trim();
  const userinfoUrl = document.getElementById('oauthUserinfoUrl').value.trim();
  const logoutUrl = document.getElementById('oauthLogoutUrl').value.trim();

  const customEndpoints =
    provider === 'custom'
      ? {
          authorize_url: authorizeUrl,
          token_url: tokenUrl,
          userinfo_url: userinfoUrl,
          logout_url: logoutUrl,
        }
      : {
          authorize_url: '',
          token_url: '',
          userinfo_url: '',
          logout_url: '',
        };

  const payload = {
    provider,
    client_id: clientId,
    redirect_uri: redirectUri,
    scopes,
    use_pkce: usePkce,
    disable_ssl_verify: disableSslVerify,
    keycloak_url: keycloakUrl,
    keycloak_realm: keycloakRealm,
    authorize_url: customEndpoints.authorize_url,
    token_url: customEndpoints.token_url,
    userinfo_url: customEndpoints.userinfo_url,
    logout_url: customEndpoints.logout_url,
    clear_secret: clearSecret,
  };

  if (clientSecret) {
    payload.client_secret = clientSecret;
  }

  return { payload, clientId, redirectUri };
}

async function saveOAuthSettings(event) {
  event.preventDefault();

  const { payload, clientId } = getOAuthFormPayload();

  if (!clientId) {
    await appAlert('Client ID is required to configure OAuth.', { title: 'Missing Client ID' });
    return;
  }

  try {
    const response = await fetch('/api/oauth/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (data.error) {
      showNotification(`Failed to save OAuth config: ${data.error}`, 'error');
      return;
    }

    showNotification('OAuth configuration saved.', 'success');
    hideOAuthSettingsModal();
    checkAuthStatus();
  } catch (error) {
    showNotification(`Failed to save OAuth config: ${error.message}`, 'error');
  }
}

async function testOAuthSettings() {
  const { payload, clientId, redirectUri } = getOAuthFormPayload();

  if (!clientId) {
    await appAlert('Client ID is required to test OAuth.', { title: 'Missing Client ID' });
    return;
  }

  if (!redirectUri) {
    await appAlert('Redirect URI is required to test OAuth.', { title: 'Missing Redirect URI' });
    return;
  }

  const originCallback = `${window.location.origin}/api/oauth/callback`;
  if (redirectUri && redirectUri !== originCallback) {
    const proceed = await appConfirm(
      `Redirect URI does not match the current app URL.\n\nApp: ${originCallback}\nOAuth: ${redirectUri}\n\nContinue anyway?`,
      { title: 'Redirect URI mismatch', confirmText: 'Continue' }
    );
    if (!proceed) return;
  }

  try {
    const saveResponse = await fetch('/api/oauth/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const saveData = await saveResponse.json();

    if (saveData.error) {
      showNotification(`Failed to save OAuth config: ${saveData.error}`, 'error');
      return;
    }

    const loginResponse = await fetch('/api/oauth/login', { credentials: 'include' });
    const loginData = await loginResponse.json();
    if (loginData.error || !loginData.authUrl) {
      showNotification(loginData.error || 'OAuth login failed.', 'error');
      return;
    }

    window.open(loginData.authUrl, '_blank', 'noopener');
    showNotification('OAuth test started. Complete login in the new tab.', 'info');
    checkAuthStatus();
  } catch (error) {
    showNotification(`OAuth test failed: ${error.message}`, 'error');
  }
}

async function disableOAuthConfig() {
  const confirmed = await appConfirm('Disable OAuth and clear the stored configuration?', {
    title: 'Disable OAuth',
    confirmText: 'Disable',
    confirmVariant: 'danger',
  });
  if (!confirmed) return;

  try {
    const response = await fetch('/api/oauth/config', {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await response.json();
    if (data.error) {
      showNotification(`Failed to disable OAuth: ${data.error}`, 'error');
      return;
    }
    showNotification('OAuth disabled.', 'success');
    hideOAuthSettingsModal();
    checkAuthStatus();
  } catch (error) {
    showNotification(`Failed to disable OAuth: ${error.message}`, 'error');
  }
}

async function copySessionToken() {
  const input = document.getElementById('sessionTokenValue');
  if (!input || !input.value) {
    appendMessage('error', 'No session token available.');
    return;
  }
  try {
    await navigator.clipboard.writeText(input.value);
    appendMessage('system', '✅ Session token copied to clipboard.');
  } catch (error) {
    appendMessage('error', 'Failed to copy token: ' + error.message);
  }
}

async function shareSessionLink() {
  try {
    const response = await fetch('/api/session/share', {
      method: 'POST',
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) {
      showNotification(data.error || 'Failed to create share link', 'error');
      return;
    }
    const shareUrl = `${window.location.origin}/?share=${data.token}`;
    await navigator.clipboard.writeText(shareUrl);
    showNotification('Share link copied to clipboard.', 'success');
  } catch (error) {
    showNotification(`Failed to share session: ${error.message}`, 'error');
  }
}

async function resetPersistedServers() {
  const confirmed = await appConfirm(
    'Clear saved MCP server configs? Active connections will remain until you remove them.',
    {
      title: 'Reset Saved Servers',
      confirmText: 'Reset',
      confirmVariant: 'danger',
    }
  );
  if (!confirmed) return;

  try {
    const response = await fetch('/api/mcp/persisted', {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      showNotification(data.error || 'Failed to reset saved servers', 'error');
      return;
    }
    showNotification('Saved server configs cleared.', 'success');
    loadMCPStatus();
  } catch (error) {
    showNotification(`Failed to reset saved servers: ${error.message}`, 'error');
  }
}

function safeParseJson(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function readLocalValue(key) {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  return safeParseJson(raw);
}

function writeLocalValue(key, value) {
  if (value === undefined) return;
  if (value === null) {
    localStorage.removeItem(key);
    return;
  }
  if (typeof value === 'string') {
    localStorage.setItem(key, value);
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

async function fetchJsonSafe(url, fallback) {
  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    return fallback;
  }
}

async function exportProjectBundle() {
  try {
    const bundle = await collectProjectBundle();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `mcp-chat-studio-bundle-${timestamp}.json`;
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    appendMessage('system', `📦 Project bundle exported (${filename})`);
  } catch (error) {
    appendMessage('error', `Project export failed: ${error.message}`);
  }
}

function triggerProjectBundleImport() {
  document.getElementById('projectBundleInput')?.click();
}

async function handleProjectBundleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const bundle = JSON.parse(text);
    const summary = summarizeProjectBundle(bundle);
    const confirmed = await appConfirm(`Import project bundle?\n${summary}`, {
      title: 'Import Project Bundle',
      confirmText: 'Import',
    });
    if (!confirmed) {
      event.target.value = '';
      return;
    }

    await applyProjectBundle(bundle);
    appendMessage('system', '✅ Project bundle imported.');

    const reload = await appConfirm('Reload now to apply local data changes?', {
      title: 'Reload to Apply',
      confirmText: 'Reload',
      cancelText: 'Later',
    });
    if (reload) window.location.reload();
  } catch (error) {
    appendMessage('error', `Import failed: ${error.message}`);
  } finally {
    event.target.value = '';
  }
}

function summarizeProjectBundle(bundle) {
  const server = bundle?.server || {};
  const local = bundle?.local || {};
  const counts = [
    `collections: ${(server.collections || []).length}`,
    `workflows: ${(server.workflows || []).length}`,
    `contracts: ${(server.contracts || []).length}`,
    `mocks: ${(server.mocks || []).length}`,
    `scripts: ${(server.scripts || []).length}`,
    `monitors: ${(server.monitors || []).length}`,
    `workspace templates: ${(server.workspaceTemplates || []).length}`,
    `servers: ${Object.keys(server.mcpServers || {}).length}`,
  ];
  const localKeys = Object.keys(local || {});
  const localSummary = localKeys.length ? `local items: ${localKeys.length}` : 'local items: 0';
  return `${counts.join(', ')}\n${localSummary}`;
}

async function collectProjectBundle() {
  const collectionsIndex = await fetchJsonSafe('/api/collections', { collections: [] });
  const collections = await Promise.all(
    (collectionsIndex.collections || []).map(async col => {
      try {
        const res = await fetch(`/api/collections/${col.id}/export`, { credentials: 'include' });
        const text = await res.text();
        return JSON.parse(text);
      } catch (error) {
        return col;
      }
    })
  );

  const workflows = await fetchJsonSafe('/api/workflows', []);
  const contractsData = await fetchJsonSafe('/api/contracts', { contracts: [] });
  const contracts = contractsData.contracts || [];
  const scriptsData = await fetchJsonSafe('/api/scripts', { scripts: [] });
  const mocksData = await fetchJsonSafe('/api/mocks', { mocks: [] });
  const monitorsData = await fetchJsonSafe('/api/monitors', { monitors: [] });
  const workspaceData = await fetchJsonSafe('/api/workspaces', { templates: [] });
  const statusData = await fetchJsonSafe('/api/mcp/status', {});

  const mcpServers = {};
  Object.entries(statusData || {}).forEach(([name, info]) => {
    const config = info?.config;
    if (!config || config.type === 'mock') return;
    mcpServers[name] = config;
  });

  return {
    format: 'mcp-chat-studio-bundle',
    version: 1,
    exportedAt: new Date().toISOString(),
    local: {
      layoutMode: localStorage.getItem('layout') || null,
      workspaceLayout: readLocalValue('mcp_workspace_layout'),
      workspaceSessions: readLocalValue('mcp_workspace_sessions'),
      workspacePresets: readLocalValue('mcp_workspace_presets'),
      scenarios: readLocalValue(sessionManager.SCENARIOS_KEY),
      session: readLocalValue(sessionManager.STORAGE_KEY),
      branches: readLocalValue(sessionManager.BRANCHES_KEY),
      variables: readLocalValue(VARIABLE_STORE_KEY),
      inspectorVariables: readLocalValue(INSPECTOR_VARIABLES_KEY),
      customTemplates: readLocalValue(CUSTOM_TEMPLATES_KEY),
    },
    server: {
      collections,
      workflows,
      contracts,
      mocks: mocksData.mocks || [],
      scripts: scriptsData.scripts || [],
      monitors: monitorsData.monitors || [],
      workspaceTemplates: workspaceData.templates || [],
      mcpServers,
    },
  };
}

async function applyProjectBundle(bundle) {
  const local = bundle?.local || {};
  const server = bundle?.server || {};

  if (local.layoutMode) localStorage.setItem('layout', String(local.layoutMode));
  writeLocalValue('mcp_workspace_layout', local.workspaceLayout);
  writeLocalValue('mcp_workspace_sessions', local.workspaceSessions);
  writeLocalValue('mcp_workspace_presets', local.workspacePresets);
  writeLocalValue(sessionManager.SCENARIOS_KEY, local.scenarios);
  writeLocalValue(sessionManager.STORAGE_KEY, local.session);
  writeLocalValue(sessionManager.BRANCHES_KEY, local.branches);
  writeLocalValue(VARIABLE_STORE_KEY, local.variables);
  writeLocalValue(INSPECTOR_VARIABLES_KEY, local.inspectorVariables);
  writeLocalValue(CUSTOM_TEMPLATES_KEY, local.customTemplates);

  const status = await fetchJsonSafe('/api/mcp/status', {});
  const existingServers = new Set(Object.keys(status || {}));

  for (const [name, config] of Object.entries(server.mcpServers || {})) {
    const payload = { name, ...config };
    if (existingServers.has(name)) {
      await fetch(`/api/mcp/update/${name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/mcp/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
    }
  }

  for (const collection of server.collections || []) {
    await fetch('/api/collections/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(collection),
    });
  }

  for (const workflow of server.workflows || []) {
    await fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(workflow),
    });
  }

  for (const contract of server.contracts || []) {
    await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(contract),
    });
  }

  const existingScripts = await fetchJsonSafe('/api/scripts', { scripts: [] });
  const scriptMap = new Map((existingScripts.scripts || []).map(s => [s.id, s]));
  const scriptNameMap = new Map((existingScripts.scripts || []).map(s => [s.name, s.id]));

  for (const script of server.scripts || []) {
    const existingId =
      script.id && scriptMap.has(script.id) ? script.id : scriptNameMap.get(script.name);
    if (existingId) {
      await fetch(`/api/scripts/${existingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(script),
      });
    } else {
      await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(script),
      });
    }
  }

  const existingMocks = await fetchJsonSafe('/api/mocks', { mocks: [] });
  const mockMap = new Map((existingMocks.mocks || []).map(m => [m.id, m]));
  const mockNameMap = new Map((existingMocks.mocks || []).map(m => [m.name, m.id]));

  for (const mock of server.mocks || []) {
    const existingId = mock.id && mockMap.has(mock.id) ? mock.id : mockNameMap.get(mock.name);
    if (existingId) {
      await fetch(`/api/mocks/${existingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(mock),
      });
    } else {
      await fetch('/api/mocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(mock),
      });
    }
  }

  for (const monitor of server.monitors || []) {
    await fetch('/api/monitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(monitor),
    });
  }

  const existingTemplates = await fetchJsonSafe('/api/workspaces', { templates: [] });
  const templateMap = new Map((existingTemplates.templates || []).map(t => [t.id, t]));
  const templateNameMap = new Map((existingTemplates.templates || []).map(t => [t.name, t.id]));

  for (const template of server.workspaceTemplates || []) {
    const existingId =
      template.id && templateMap.has(template.id)
        ? template.id
        : templateNameMap.get(template.name);
    if (existingId) {
      await fetch(`/api/workspaces/${existingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(template),
      });
    } else {
      await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(template),
      });
    }
  }

  if (typeof loadCollections === 'function') await loadCollections();
  if (typeof loadWorkflowsList === 'function') loadWorkflowsList();
  if (typeof loadContracts === 'function') await loadContracts();
  if (typeof loadMockServers === 'function') await loadMockServers();
  if (typeof loadScripts === 'function') await loadScripts();
  if (typeof loadMonitors === 'function') await loadMonitors();
  if (typeof loadInspectorServers === 'function') loadInspectorServers();
  if (typeof loadMCPStatus === 'function') loadMCPStatus();
  if (window.floatingWorkspace?.loadWorkspaceTemplates) {
    await window.floatingWorkspace.loadWorkspaceTemplates();
  }
  if (typeof loadInspectorVariables === 'function') {
    loadInspectorVariables();
  }
  if (typeof loadInspectorAuthSettings === 'function') {
    loadInspectorAuthSettings();
  }
}

function onProviderChange(resetBaseUrl = true) {
  const provider = document.getElementById('llmProvider').value;
  updateProviderSummary(provider);
  const hintEl = document.getElementById('providerHint');
  const apiKeyGroup = document.getElementById('apiKeyGroup');
  const modelInput = document.getElementById('llmModel');
  const baseUrlInput = document.getElementById('llmBaseUrl');
  const authSection = document.getElementById('llmAuthSection');
  const authFields = document.getElementById('llmAuthFields');
  const extraHeaderGroup = document.getElementById('llmExtraHeaderGroup');
  const ollamaGroup = document.getElementById('ollamaModelGroup');
  const modelGroup = document.getElementById('llmModelGroup');

  // Clear base URL when switching providers to use correct default
  if (resetBaseUrl) {
    baseUrlInput.value = '';
  }

  switch (provider) {
    case 'ollama':
      hintEl.textContent = 'Local LLM server - no API key needed';
      apiKeyGroup.style.display = 'none';
      if (authSection) authSection.style.display = 'none';
      if (authFields) authFields.style.display = 'none';
      if (extraHeaderGroup) extraHeaderGroup.style.display = 'none';
      modelInput.placeholder = 'llama3.2, mistral, codellama...';
      baseUrlInput.placeholder = 'http://localhost:11434/v1';
      if (ollamaGroup) {
        ollamaGroup.style.display = 'block';
        loadOllamaModels();
      }
      if (modelGroup) modelGroup.style.display = 'none';
      break;
    case 'openai':
      hintEl.textContent = 'OpenAI API - requires OPENAI_API_KEY';
      apiKeyGroup.style.display = 'block';
      if (authSection) authSection.style.display = 'none';
      if (authFields) authFields.style.display = 'none';
      if (extraHeaderGroup) extraHeaderGroup.style.display = 'none';
      modelInput.placeholder = 'gpt-4o, gpt-4, gpt-3.5-turbo...';
      baseUrlInput.placeholder = 'https://api.openai.com/v1';
      if (ollamaGroup) ollamaGroup.style.display = 'none';
      if (modelGroup) modelGroup.style.display = 'block';
      break;
    case 'anthropic':
      hintEl.textContent = 'Anthropic Claude - requires ANTHROPIC_API_KEY';
      apiKeyGroup.style.display = 'block';
      if (authSection) authSection.style.display = 'none';
      if (authFields) authFields.style.display = 'none';
      if (extraHeaderGroup) extraHeaderGroup.style.display = 'none';
      modelInput.placeholder = 'claude-3-5-sonnet-20241022...';
      baseUrlInput.placeholder = 'https://api.anthropic.com/v1';
      if (ollamaGroup) ollamaGroup.style.display = 'none';
      if (modelGroup) modelGroup.style.display = 'block';
      break;
    case 'gemini':
      hintEl.textContent = 'Google Gemini - requires GOOGLE_API_KEY';
      apiKeyGroup.style.display = 'block';
      if (authSection) authSection.style.display = 'none';
      if (authFields) authFields.style.display = 'none';
      if (extraHeaderGroup) extraHeaderGroup.style.display = 'none';
      modelInput.placeholder = 'gemini-1.5-pro, gemini-1.5-flash...';
      baseUrlInput.placeholder = 'https://generativelanguage.googleapis.com/v1beta';
      if (ollamaGroup) ollamaGroup.style.display = 'none';
      if (modelGroup) modelGroup.style.display = 'block';
      break;
    case 'azure':
      hintEl.textContent = 'Azure OpenAI - requires AZURE_OPENAI_API_KEY & ENDPOINT';
      apiKeyGroup.style.display = 'block';
      if (authSection) authSection.style.display = 'none';
      if (authFields) authFields.style.display = 'none';
      if (extraHeaderGroup) extraHeaderGroup.style.display = 'none';
      modelInput.placeholder = 'gpt-4o, gpt-4...';
      baseUrlInput.placeholder = 'https://your-resource.openai.azure.com';
      if (ollamaGroup) ollamaGroup.style.display = 'none';
      if (modelGroup) modelGroup.style.display = 'block';
      break;
    case 'groq':
      hintEl.textContent = 'Groq (Ultra-fast) - requires GROQ_API_KEY';
      apiKeyGroup.style.display = 'block';
      if (authSection) authSection.style.display = 'none';
      if (authFields) authFields.style.display = 'none';
      if (extraHeaderGroup) extraHeaderGroup.style.display = 'none';
      modelInput.placeholder = 'llama-3.3-70b-versatile, mixtral-8x7b...';
      baseUrlInput.placeholder = 'https://api.groq.com/openai/v1';
      if (ollamaGroup) ollamaGroup.style.display = 'none';
      if (modelGroup) modelGroup.style.display = 'block';
      break;
    case 'together':
      hintEl.textContent = 'Together AI - requires TOGETHER_API_KEY';
      apiKeyGroup.style.display = 'block';
      if (authSection) authSection.style.display = 'none';
      if (authFields) authFields.style.display = 'none';
      if (extraHeaderGroup) extraHeaderGroup.style.display = 'none';
      modelInput.placeholder = 'meta-llama/Llama-3.3-70B-Instruct-Turbo...';
      baseUrlInput.placeholder = 'https://api.together.xyz/v1';
      if (ollamaGroup) ollamaGroup.style.display = 'none';
      if (modelGroup) modelGroup.style.display = 'block';
      break;
    case 'openrouter':
      hintEl.textContent = 'OpenRouter (100+ models) - requires OPENROUTER_API_KEY';
      apiKeyGroup.style.display = 'block';
      if (authSection) authSection.style.display = 'none';
      if (authFields) authFields.style.display = 'none';
      if (extraHeaderGroup) extraHeaderGroup.style.display = 'none';
      modelInput.placeholder = 'anthropic/claude-3.5-sonnet, openai/gpt-4o...';
      baseUrlInput.placeholder = 'https://openrouter.ai/api/v1';
      if (ollamaGroup) ollamaGroup.style.display = 'none';
      if (modelGroup) modelGroup.style.display = 'block';
      break;
    case 'custom':
      hintEl.textContent = 'Custom OpenAI-compatible endpoint';
      if (authSection) authSection.style.display = 'block';
      onLLMAuthTypeChange();
      if (extraHeaderGroup) extraHeaderGroup.style.display = 'block';
      modelInput.placeholder = 'gpt-4, llama3.1, custom-model';
      baseUrlInput.placeholder = 'https://your-llm.example.com/v1';
      if (ollamaGroup) ollamaGroup.style.display = 'none';
      if (modelGroup) modelGroup.style.display = 'block';
      break;
  }
}

function onLLMAuthTypeChange() {
  const provider = document.getElementById('llmProvider').value;
  const authType = document.getElementById('llmAuthType').value;
  const authFields = document.getElementById('llmAuthFields');
  const apiKeyGroup = document.getElementById('apiKeyGroup');
  if (provider !== 'custom') return;
  if (apiKeyGroup) {
    apiKeyGroup.style.display = authType === 'bearer' ? 'block' : 'none';
  }
  if (authFields) {
    authFields.style.display = authType === 'client_credentials' ? 'block' : 'none';
  }
}

async function loadOllamaModels() {
  const provider = document.getElementById('llmProvider')?.value;
  if (provider !== 'ollama') return;
  const select = document.getElementById('ollamaModelSelect');
  const hint = document.getElementById('ollamaModelHint');
  if (!select || !hint) return;

  select.innerHTML = '<option value="">Loading models...</option>';
  select.disabled = true;

  const baseUrlInput = document.getElementById('llmBaseUrl')?.value.trim();
  const url = baseUrlInput
    ? `/api/llm/models?base_url=${encodeURIComponent(baseUrlInput)}`
    : '/api/llm/models';

  try {
    const res = await fetch(url, { credentials: 'include' });
    const data = await res.json();
    const models = Array.isArray(data.models) ? data.models : [];
    const currentModel = document.getElementById('llmModel')?.value.trim();

    select.innerHTML =
      '<option value="">Select installed model</option>' +
      models
        .map(model => `<option value="${escapeHtml(model)}">${escapeHtml(model)}</option>`)
        .join('');
    select.disabled = false;

    if (currentModel && models.includes(currentModel)) {
      select.value = currentModel;
    }

    if (models.length === 0) {
      hint.textContent = 'No Ollama models found. Run `ollama pull <model>` then refresh.';
    } else {
      hint.textContent = `Found ${models.length} installed model${models.length > 1 ? 's' : ''}.`;
    }
  } catch (error) {
    select.innerHTML = '<option value="">Failed to load models</option>';
    select.disabled = true;
    hint.textContent = `Could not fetch models: ${error.message}`;
  }
}

document.getElementById('ollamaModelSelect')?.addEventListener('change', e => {
  const value = e.target.value;
  if (value) {
    const modelInput = document.getElementById('llmModel');
    if (modelInput) modelInput.value = value;
  }
});

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
    appendMessage('system', `📦 Testing server: **${serverName}** (${serverTools.length} tools)`);

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

  const container = getMessagesContainer();
  if (container) {
    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;
  }
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
      if (cfg.requiresAuth || cfg.requiresOAuth) yaml += `    requiresAuth: true\n`;
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

function showQuickStartModal() {
  const layoutMode = document.body.classList.contains('workspace-mode') ? 'Workspace' : 'Classic';
  const serverCountText = document.getElementById('serverCount')?.textContent || '0 connected';
  const modelName = document.getElementById('modelName')?.textContent || 'LLM';

  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.id = 'quickStartModal';
  modal.style.display = 'flex';
  modal.innerHTML = `
          <div class="modal" style="max-width: 760px;">
            <div class="modal-header">
              <h2 class="modal-title">🚀 Quick Start</h2>
              <button class="modal-close" onclick="closeQuickStartModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style="padding: var(--spacing-md); display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 0.75rem; color: var(--text-muted);">
                <span>Mode: <strong style="color: var(--text-primary);">${layoutMode}</strong></span>
                <span>Servers: <strong style="color: var(--text-primary);">${serverCountText}</strong></span>
                <span>LLM: <strong style="color: var(--text-primary);">${escapeHtml(modelName)}</strong></span>
              </div>

              <div style="display: grid; gap: 12px;">
                <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 12px;">
                  <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 6px;">Test an MCP server</div>
                  <div class="generator-actions">
                    <button class="btn" onclick="showAddServerModal(); closeQuickStartModal();">Add Server</button>
                    <button class="btn" onclick="openPanelByName('inspector'); closeQuickStartModal();">Inspector</button>
                    <button class="btn" onclick="openPanelByName('history'); closeQuickStartModal();">History</button>
                    <button class="btn" onclick="openPanelByName('scenarios'); closeQuickStartModal();">Scenarios</button>
                    <button class="btn" onclick="openPanelByName('collections'); closeQuickStartModal();">Collections</button>
                  </div>
                  <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 6px;">
                    Run a tool, record a scenario, then build a collection run report.
                  </div>
                </div>

                <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 12px;">
                  <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 6px;">Validate & compare</div>
                  <div class="generator-actions">
                    <button class="btn" onclick="openPanelByName('contracts'); closeQuickStartModal();">Contracts</button>
                    <button class="btn" onclick="openPanelByName('inspector'); closeQuickStartModal();">Diff / Matrix</button>
                    <button class="btn" onclick="openPanelByName('mocks'); closeQuickStartModal();">Mocks</button>
                    <button class="btn" onclick="openPanelByName('debugger'); closeQuickStartModal();">Debugger</button>
                  </div>
                  <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 6px;">
                    Track schema drift, compare servers, and mock error paths.
                  </div>
                </div>

                <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 12px;">
                  <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 6px;">Build an MCP server</div>
                  <div class="generator-actions">
                    <button class="btn" onclick="openPanelByName('generator'); closeQuickStartModal();">Generator</button>
                    <button class="btn" onclick="openPanelByName('docs'); closeQuickStartModal();">Docs</button>
                    <button class="btn" onclick="openPanelByName('workflows'); closeQuickStartModal();">Workflows</button>
                  </div>
                  <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 6px;">
                    Import OpenAPI, generate proxy code, and wire it into Studio.
                  </div>
                </div>

                <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 12px;">
                  <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 6px;">Layout & help</div>
                  <div class="generator-actions">
                    <button class="btn" onclick="setLayoutMode('classic')">Classic</button>
                    <button class="btn" onclick="setLayoutMode('workspace')">Workspace</button>
                    <button class="btn" onclick="toggleAssistant(true); closeQuickStartModal();">Studio Assistant</button>
                    <button class="btn" onclick="showShortcutsHelp(); closeQuickStartModal();">Shortcuts</button>
                  </div>
                  <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 6px;">
                    Pick the layout that fits the task and open the assistant for guided commands.
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn" onclick="closeQuickStartModal()">Close</button>
            </div>
          </div>
        `;

  document.body.appendChild(modal);
}

function closeQuickStartModal() {
  const modal = document.getElementById('quickStartModal');
  if (modal) modal.remove();
}

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
    const response = await fetch('/api/mcp/parse-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || `Parse failed (${response.status})`);
    }

    const servers = data.servers || {};
    let addedCount = 0;

    for (const [name, cfg] of Object.entries(servers)) {
      if (typeof cfg !== 'object') continue;

      const payload = {
        name,
        type: cfg.type || (cfg.command ? 'stdio' : 'sse'),
        description: cfg.description || '',
        command: cfg.command,
        args: cfg.args || [],
        url: cfg.url,
        env: cfg.env || {},
        cwd: cfg.cwd,
        requiresAuth: cfg.requiresAuth || cfg.requiresOAuth || false,
        timeout: cfg.timeout,
        mockId: cfg.mockId,
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
    loadMCPStatus();
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

function buildChatRequestMessages() {
  const base = messages.map(m => ({
    role: m.role,
    content: m.content,
    ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
  }));
  const systemPrompt = sessionManager.getActivePrompt();
  if (systemPrompt) {
    return [{ role: 'system', content: systemPrompt }, ...base];
  }
  return base;
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

  if (await tryMainChatOpenApi(content)) {
    return;
  }

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

      const requestMessages = buildChatRequestMessages();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: currentAbortController.signal,
        body: JSON.stringify({
          messages: requestMessages,
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
      const inputTokens = sessionManager.estimateTokens(JSON.stringify(requestMessages));
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
      const requestMessages = buildChatRequestMessages();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: currentAbortController.signal,
        body: JSON.stringify({
          messages: requestMessages,
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
      if (data.toolFallback) {
        const reason = data.toolFallbackReason ? ` (${data.toolFallbackReason})` : '';
        appendMessage('system', `⚠️ Tools were disabled for this response${reason}`);
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

        const continueMessages = buildChatRequestMessages();
        const continueResponse = await fetch('/api/chat/continue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: currentAbortController.signal,
          body: JSON.stringify({
            messages: continueMessages,
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
        const inputTokens = sessionManager.estimateTokens(JSON.stringify(continueMessages));
        const outputTokens = sessionManager.estimateTokens(finalContent);
        sessionManager.addTokens(inputTokens, outputTokens);
        updateTokenDisplay();
      } else {
        // No tool calls, direct response
        const responseContent = data.choices?.[0]?.message?.content || 'No response generated.';
        messages.push({ role: 'assistant', content: responseContent });
        appendMessage('assistant', responseContent);

        // Track tokens
        const inputTokens = sessionManager.estimateTokens(JSON.stringify(requestMessages));
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

  const container = getMessagesContainer();
  if (container) {
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }
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
  formatted = sanitizeHtml(formatted);

  div.innerHTML = formatted;
  const container = getMessagesContainer();
  if (container) {
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  // Save to session (unless restoring)
  if (save && role !== 'system') {
    sessionManager.saveMessages(messages);
  }

  if (typeof window.refreshBrainView === 'function') {
    window.refreshBrainView();
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
  const container = getMessagesContainer();
  if (container) {
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }
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
  const container = getMessagesContainer();
  if (container) {
    container.innerHTML = '';
  }
  appendMessage('assistant', messages[0].content, false);
  resetLoadingState();
  if (typeof resetBrainTimeline === 'function') {
    resetBrainTimeline();
  }
  if (typeof window.refreshBrainView === 'function') {
    window.refreshBrainView();
  }

  console.log('[Session] Cleared');
}

// Load MCP status
async function loadMCPStatus() {
  try {
    const response = await fetch('/api/mcp/status', {
      credentials: 'include',
    });
    const notice = response.headers.get('X-MCP-Config-Notice');
    if (notice) {
      showNotification(notice, 'warning');
    }
    const status = await response.json();
    window.lastMcpStatus = status;

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

      const statusLabel = info.connected
        ? { text: 'Connected', cls: 'status-connected' }
        : info.lastError
          ? { text: 'Failed', cls: 'status-error' }
          : { text: 'Not connected', cls: 'status-idle' };

      const statusTitle = info.lastError ? `Last error: ${info.lastError}` : '';
      const errorBtn = info.lastError
        ? `<button class="mcp-error-btn" onclick="showServerError('${name}')" title="View error details" aria-label="View error details">Details</button>`
        : '';

      const connectBtn = info.connected
        ? `<button class="mcp-connect-btn connected">✓ Connected</button><button class="mcp-connect-btn disconnect" data-disconnect="${name}" onclick="disconnectMCP('${name}')">Disconnect</button>`
        : `<button class="mcp-connect-btn" data-server="${name}" onclick="connectMCP('${name}')">Connect</button>`;

      // Add edit and remove buttons for servers
      const editBtn = `<button class="mcp-edit-btn" onclick="editServer('${name}')" title="Edit server configuration">✏️</button>`;
      const removeBtn = `<button class="mcp-remove-btn" onclick="removeServer('${name}')" title="Remove server">🗑️</button>`;

      const authBadge = info.requiresAuth
        ? `<span class="auth-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:10px;height:10px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Auth</span>`
        : '';

      const dotClass = info.connected ? 'connected' : info.lastError ? 'error' : '';

      serverEl.innerHTML = `
            <div class="mcp-server-header">
              <div class="mcp-server-name">
                <span class="mcp-status-dot ${dotClass}"></span>
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
              <span class="mcp-status-label ${statusLabel.cls}" title="${escapeHtml(statusTitle)}">${statusLabel.text}</span>
              ${errorBtn}
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
          const serverTools = toolsData.tools.filter(t => t.serverName === name && !t.notConnected);

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

function showServerError(serverName) {
  const status = window.lastMcpStatus?.servers || window.lastMcpStatus || {};
  const info = status?.[serverName];
  const message = info?.lastError || 'No error details available.';
  const hint = getServerErrorHint(message);
  const hintHtml = hint ? `<div class="mcp-error-hint">${escapeHtml(hint)}</div>` : '';
  const actionsHtml = `
          <div class="mcp-error-actions">
            <button class="btn" onclick="retryServerConnectFromError('${escapeHtml(serverName)}')">Retry Connect</button>
            <button class="btn" onclick="copyServerError('${escapeHtml(serverName)}')">Copy Error</button>
          </div>
        `;
  appAlert(message, {
    title: `Connection error: ${serverName}`,
    bodyHtml: `${hintHtml}${actionsHtml}`,
    confirmText: 'Close',
  });
}

function getServerErrorHint(message) {
  if (!message) return '';
  const lower = message.toLowerCase();
  if (lower.includes('no module named') && lower.includes('mcp')) {
    return 'Install the MCP SDK: pip install mcp';
  }
  if (lower.includes('module not found') && lower.includes('mcp')) {
    return 'Install the MCP SDK: pip install mcp';
  }
  if (lower.includes('python') && (lower.includes('not found') || lower.includes('enoent'))) {
    return 'Python was not found. Install Python and ensure it is on your PATH.';
  }
  if (lower.includes('node') && (lower.includes('not found') || lower.includes('enoent'))) {
    return 'Node.js was not found. Install Node.js and ensure it is on your PATH.';
  }
  if (
    lower.includes('no such file') ||
    lower.includes('cwd') ||
    lower.includes('working directory')
  ) {
    return 'Check the project folder path (cwd) and make sure server.py/server.js exists there.';
  }
  if (lower.includes('connection closed')) {
    return 'The server exited during startup. Try running it manually first and check dependencies.';
  }
  if (lower.includes('permission')) {
    return 'Check file permissions and antivirus blocks on the generated folder.';
  }
  return '';
}

function retryServerConnectFromError(serverName) {
  notifyUser(`Retrying connection to ${serverName}...`, 'info');
  connectMCP(serverName);
}

function copyServerError(serverName) {
  const status = window.lastMcpStatus?.servers || window.lastMcpStatus || {};
  const info = status?.[serverName];
  const message = info?.lastError || '';
  if (!message) {
    notifyUser('No error details to copy.', 'warning');
    return;
  }
  const text = `${serverName}: ${message}`;
  navigator.clipboard
    .writeText(text)
    .then(() => notifyUser('Error copied to clipboard.', 'success'))
    .catch(() => notifyUser('Failed to copy error.', 'error'));
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
    status.innerHTML =
      '<span style="color: var(--danger)">🔴 Recording...</span> Execute tools in Inspector tab. They will be captured.';
    stepsDiv.style.display = 'block';
    stepsList.innerHTML =
      '<div style="color: var(--text-muted); font-style: italic">No steps yet...</div>';
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
      saveBtn.style.cssText =
        'font-size: 0.65rem; padding: 2px 6px; background: var(--success); color: white; margin-left: 8px';
      saveBtn.innerHTML = '💾 Save Scenario';
      saveBtn.onclick = saveRecordedScenario;
      status.appendChild(saveBtn);
      appendMessage(
        'system',
        `🎬 Recording stopped. ${recordedSteps.length} steps captured. Click "Save Scenario" to save.`
      );
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
  stepsList.innerHTML = recordedSteps
    .map(
      (s, i) => `
          <div style="display: flex; align-items: center; gap: 4px; padding: 4px; background: var(--bg-card); border-radius: 4px; margin-bottom: 4px">
            <span>${s.success ? '✅' : '❌'}</span>
            <strong>${i + 1}.</strong>
            ${escapeHtml(s.tool)}
            <span style="color: var(--text-muted); font-size: 0.7rem">@ ${escapeHtml(s.server)} (${s.timing}ms)</span>
          </div>
        `
    )
    .join('');
}

// Simple hash function for response comparison
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
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
    required: true,
  });
  if (!name) return;

  const scenario = {
    name,
    steps: recordedSteps,
    metadata: {
      stepsCount: recordedSteps.length,
      totalTime: recordedSteps.reduce((sum, s) => sum + s.timing, 0),
    },
  };

  sessionManager.saveScenario(scenario);
  recordedSteps = [];
  document.getElementById('recordingSteps').style.display = 'none';
  document.getElementById('recordingStatus').textContent = 'Scenario saved! Start a new recording.';
  refreshScenariosPanel();
  appendMessage('system', `💾 Scenario "${name}" saved with ${scenario.steps.length} steps.`);
}

const DATASETS_KEY = 'mcp_chat_studio_datasets';

function loadDatasets() {
  try {
    const data = JSON.parse(localStorage.getItem(DATASETS_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

function saveDatasets(datasets) {
  localStorage.setItem(DATASETS_KEY, JSON.stringify(datasets));
}

function getDatasetById(datasetId) {
  return loadDatasets().find(dataset => dataset.id === datasetId);
}

function renderDatasetManagerList() {
  const listEl = document.getElementById('datasetManagerList');
  if (!listEl) return;

  const datasets = loadDatasets();
  if (datasets.length === 0) {
    listEl.innerHTML =
      '<div class="empty-state">No datasets yet. Add one to run data-driven scenarios.</div>';
    return;
  }

  listEl.innerHTML = datasets
    .map(
      dataset => `
          <div class="dataset-card">
            <div>
              <strong>${escapeHtml(dataset.name)}</strong>
              <div style="font-size: 0.7rem; color: var(--text-muted)">
                ${dataset.rows?.length || 0} row${(dataset.rows?.length || 0) !== 1 ? 's' : ''} • ${new Date(dataset.createdAt).toLocaleString()}
              </div>
            </div>
            <div style="display: flex; gap: 6px">
              <button class="btn" onclick="copyDataset('${dataset.id}')" style="font-size: 0.65rem; padding: 2px 6px">📋 Copy</button>
              <button class="btn" onclick="deleteDataset('${dataset.id}')" style="font-size: 0.65rem; padding: 2px 6px">🗑️</button>
            </div>
          </div>
        `
    )
    .join('');
}

function showDatasetManager() {
  const existing = document.getElementById('datasetManagerModal');
  if (existing) {
    existing.remove();
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'datasetManagerModal';
  modal.style.display = 'flex';
  modal.innerHTML = `
          <div class="modal" style="max-width: 760px; max-height: 85vh">
            <div class="modal-header">
              <h2 class="modal-title">📚 Dataset Library</h2>
              <button class="modal-close" onclick="closeDatasetManager()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style="padding: var(--spacing-md); overflow-y: auto; max-height: calc(85vh - 130px)">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
                <div style="font-size: 0.8rem; color: var(--text-muted)">
                  Reuse datasets across scenarios and data runs.
                </div>
                <button class="btn" onclick="createDatasetModal()">➕ New Dataset</button>
              </div>
              <div id="datasetManagerList" style="display: flex; flex-direction: column; gap: 8px"></div>
            </div>
            <div class="modal-actions">
              <button class="btn" onclick="closeDatasetManager()">Close</button>
            </div>
          </div>
        `;
  document.body.appendChild(modal);
  renderDatasetManagerList();
}

function closeDatasetManager() {
  const modal = document.getElementById('datasetManagerModal');
  if (modal) modal.remove();
}

async function createDatasetModal(prefill = {}) {
  const result = await appFormModal({
    title: 'New Dataset',
    confirmText: 'Save',
    fields: [
      {
        id: 'name',
        label: 'Dataset name',
        required: true,
        value: prefill.name || '',
        placeholder: 'User smoke data',
      },
      {
        id: 'data',
        label: 'Rows (JSON array)',
        type: 'textarea',
        rows: 6,
        monospace: true,
        value: prefill.data || '[]',
        hint: 'Each row is merged into variables when running a scenario.',
      },
    ],
  });

  if (!result.confirmed) return;

  const name = (result.values.name || '').trim();
  if (!name) return;

  let rows = [];
  try {
    const parsed = JSON.parse(result.values.data || '[]');
    if (Array.isArray(parsed)) {
      rows = parsed;
    } else {
      rows = [parsed];
    }
  } catch (error) {
    showNotification('Invalid dataset JSON: ' + error.message, 'error');
    return;
  }

  if (!rows.length) {
    showNotification('Dataset is empty.', 'warning');
    return;
  }

  const datasets = loadDatasets();
  const id = `dataset_${Date.now()}`;
  datasets.unshift({
    id,
    name,
    rows,
    createdAt: new Date().toISOString(),
  });
  saveDatasets(datasets);
  renderDatasetManagerList();
  showNotification(`Dataset "${name}" saved.`, 'success');
}

async function deleteDataset(datasetId) {
  const dataset = getDatasetById(datasetId);
  if (!dataset) return;
  const confirmed = await appConfirm(`Delete dataset "${dataset.name}"?`, {
    title: 'Delete Dataset',
    confirmText: 'Delete',
    confirmVariant: 'danger',
  });
  if (!confirmed) return;
  const datasets = loadDatasets().filter(item => item.id !== datasetId);
  saveDatasets(datasets);
  renderDatasetManagerList();
  showNotification('Dataset deleted.', 'success');
}

function copyDataset(datasetId) {
  const dataset = getDatasetById(datasetId);
  if (!dataset) return;
  navigator.clipboard.writeText(JSON.stringify(dataset.rows || [], null, 2));
  showNotification('Dataset copied to clipboard.', 'success');
}

async function createScenarioFromHistory() {
  const history = getHistoryEntries();
  if (!history.length) {
    await appAlert('No tool executions recorded yet.', { title: 'No History' });
    return;
  }

  const maxCount = history.length;
  const defaultCount = Math.min(maxCount, 5);
  const result = await appFormModal({
    title: 'Create Scenario from History',
    confirmText: 'Create',
    fields: [
      {
        id: 'name',
        label: 'Scenario name',
        required: true,
        value: `History ${new Date().toLocaleTimeString()}`,
        placeholder: 'History replay',
      },
      {
        id: 'count',
        label: 'Recent calls to include',
        type: 'number',
        required: true,
        value: defaultCount,
        hint: `Up to ${maxCount} call${maxCount !== 1 ? 's' : ''} available.`,
        validate: value => {
          if (!Number.isFinite(value) || value <= 0) return 'Enter a number greater than 0';
          if (value > maxCount)
            return `Only ${maxCount} call${maxCount !== 1 ? 's' : ''} available`;
          return '';
        },
      },
      {
        id: 'includeFailures',
        label: 'Include failed calls',
        type: 'select',
        value: 'no',
        options: [
          { value: 'no', label: 'Only successful calls' },
          { value: 'yes', label: 'Include failures' },
        ],
      },
    ],
  });

  if (!result.confirmed) return;

  const name = (result.values.name || '').trim();
  if (!name) return;

  const includeFailures = result.values.includeFailures === 'yes';
  const source = includeFailures ? history : history.filter(entry => entry.success);
  if (!source.length) {
    await appAlert('No successful calls found in history.', { title: 'No Steps' });
    return;
  }

  const count = Math.min(Number(result.values.count) || source.length, source.length);
  const entries = source.slice(0, count).reverse();
  const steps = entries.map(entry => {
    const response = entry.response ?? {};
    return {
      server: entry.server,
      tool: entry.tool,
      args: entry.request ?? {},
      expectedResponse: response,
      responseHash: hashString(JSON.stringify(response)),
      responseSchema: inferSchema(response),
      timing: entry.duration,
      success: entry.success,
    };
  });

  const scenario = {
    name,
    steps,
    metadata: {
      source: 'history',
      createdFromHistory: true,
      createdAt: new Date().toISOString(),
    },
  };

  sessionManager.saveScenario(scenario);
  refreshScenariosPanel();
  showNotification(
    `Scenario "${name}" created from ${steps.length} call${steps.length !== 1 ? 's' : ''}.`,
    'success'
  );
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

  listEl.innerHTML = scenarios
    .map(
      s => `
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
              <button class="btn" onclick="runScenarioMatrix('${s.id}')" style="font-size: 0.65rem; padding: 2px 6px" title="Matrix compares across servers (connect 2+ for heatmap)">
                🌐 Matrix
              </button>
              <button class="btn" onclick="runScenarioDataset('${s.id}')" style="font-size: 0.65rem; padding: 2px 6px">
                📊 Data Run
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
        `
    )
    .join('');
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
      const args =
        Object.keys(runtimeVariables).length > 0
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
      const resultPayload = data.error || data.result;
      const actualHash = hashString(JSON.stringify(resultPayload));
      const isError = data.error || data.result?.isError === true;
      const expectsError = step.expectError === true;
      const hashMatch = actualHash === step.responseHash;

      // Schema validation (if schema was saved)
      let schemaViolations = [];
      if (!expectsError && step.responseSchema && data.result && !isError) {
        schemaViolations = validateSchema(data.result, step.responseSchema);
      }

      // Custom assertions evaluation
      let assertionResults = [];
      let assertionsFailed = 0;
      if (
        !expectsError &&
        step.assertions &&
        step.assertions.length > 0 &&
        data.result &&
        !isError
      ) {
        for (const assertion of step.assertions) {
          const result = evaluateSingleAssertion(data.result, assertion);
          assertionResults.push({
            path: assertion.path,
            operator: assertion.operator,
            expected: assertion.value,
            actual: result.actualValue,
            passed: result.passed,
            message: result.message,
          });
          if (!result.passed) assertionsFailed++;
        }
      }

      let status = 'pass';
      let message = '';
      let expected = null;
      let actual = null;

      if (expectsError) {
        expected = step.expectedResponse;
        if (isError) {
          actual = resultPayload;
          if (!hashMatch) {
            status = 'diff';
            message = 'Error differs from expected';
          }
        } else {
          status = 'diff';
          message = 'Expected error, got success';
          actual = data.result;
        }
      } else if (isError) {
        status = 'error';
        message = data.error || 'Error';
      } else if (assertionsFailed > 0) {
        status = 'assertion_fail';
        message = `${assertionsFailed} assertion(s) failed`;
        expected = step.expectedResponse;
        actual = data.result;
      } else if (!hashMatch) {
        status = 'diff';
        message = 'Response differs from baseline';
        expected = step.expectedResponse;
        actual = data.result;
      }

      if (status === 'pass') {
        passed++;
      } else {
        failed++;
      }

      results.push({
        step: i + 1,
        tool: step.tool,
        status,
        message,
        duration,
        expected,
        actual,
        schemaViolations,
        assertionResults,
      });

      if (!isError && !expectsError) {
        const extracted = extractScenarioVariables(data.result, step.extract || step.variables);
        if (Object.keys(extracted).length > 0) {
          Object.assign(runtimeVariables, extracted);
        }
      }
    } catch (err) {
      failed++;
      results.push({
        step: i + 1,
        tool: step.tool,
        status: 'error',
        message: err.message,
        schemaViolations: [],
      });
    }
  }

  // Show results - cache large data to avoid huge onclick attributes
  const resultHtml = results
    .map(r => {
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
              ${
                r.schemaViolations && r.schemaViolations.length > 0
                  ? `
                <span style="color: var(--warning); font-size: 0.65rem; margin-left: 4px">📋 ${r.schemaViolations.length} schema issue${r.schemaViolations.length !== 1 ? 's' : ''}</span>
              `
                  : r.status === 'pass' && r.schemaViolations
                    ? '<span style="color: var(--success); font-size: 0.65rem">📋 Schema OK</span>'
                    : ''
              }
              ${
                assertId
                  ? `
                <span style="font-size: 0.65rem; margin-left: 4px; ${r.assertionResults.every(a => a.passed) ? 'color: var(--success)' : 'color: var(--error)'}">
                  🔍 ${r.assertionResults.filter(a => a.passed).length}/${r.assertionResults.length} assertions
                </span>
                <button class="btn" onclick="showAssertionResultsById('${assertId}')" style="font-size: 0.6rem; padding: 1px 4px">Details</button>
              `
                  : ''
              }
            </div>
          `;
    })
    .join('');

  resultsEl.innerHTML = `
          <div style="margin-bottom: 8px">
            <strong>Results:</strong>
            <span style="color: var(--success)">${passed} passed</span> /
            <span style="color: var(--error)">${failed} failed</span>
          </div>
          ${resultHtml}
        `;

  appendMessage(
    'system',
    `🧪 Scenario "${scenario.name}" completed: ${passed} passed, ${failed} failed`
  );
}

async function runScenarioDataset(id) {
  const scenario = sessionManager.getScenario(id);
  if (!scenario) {
    appendMessage('error', 'Scenario not found');
    return;
  }
  if (!scenario.steps || scenario.steps.length === 0) {
    await appAlert('This scenario has no steps yet.', { title: 'No Steps' });
    return;
  }

  const datasets = loadDatasets();
  const datasetOptions = [{ value: 'custom', label: 'Custom JSON' }].concat(
    datasets.map(dataset => ({
      value: dataset.id,
      label: `${dataset.name} (${dataset.rows?.length || 0} rows)`,
    }))
  );

  const result = await appFormModal({
    title: 'Scenario Data Run',
    confirmText: 'Run',
    fields: [
      {
        id: 'datasetSource',
        label: 'Dataset source',
        type: 'select',
        value: 'custom',
        options: datasetOptions,
      },
      {
        id: 'dataset',
        label: 'Dataset (JSON array)',
        type: 'textarea',
        value: '[]',
        rows: 6,
        monospace: true,
        hint: 'Example: [{"userId":1,"email":"a@b.com"},{"userId":2,"email":"b@b.com"}]',
      },
      {
        id: 'stopOnError',
        label: 'On failure',
        type: 'select',
        value: 'no',
        options: [
          { value: 'no', label: 'Continue all iterations' },
          { value: 'yes', label: 'Stop on first failure' },
        ],
      },
      {
        id: 'maxIterations',
        label: 'Max iterations (optional)',
        type: 'number',
        value: '',
        placeholder: 'Leave blank to run all rows',
      },
    ],
  });

  if (!result.confirmed) return;

  let dataset = [];
  const datasetSource = result.values.datasetSource || 'custom';
  if (datasetSource !== 'custom') {
    const selected = getDatasetById(datasetSource);
    if (!selected) {
      await appAlert('Selected dataset not found.', { title: 'Dataset Missing' });
      return;
    }
    dataset = Array.isArray(selected.rows) ? selected.rows : [];
  } else {
    const datasetInput = (result.values.dataset || '').trim();
    try {
      if (!datasetInput) {
        await appAlert('Provide a JSON array of objects.', { title: 'Missing Dataset' });
        return;
      }
      const parsed = JSON.parse(datasetInput);
      if (Array.isArray(parsed)) {
        dataset = parsed;
      } else if (parsed && typeof parsed === 'object') {
        dataset = [parsed];
      } else {
        throw new Error('Dataset must be a JSON array of objects.');
      }
    } catch (error) {
      await appAlert(`Invalid dataset JSON: ${error.message}`, { title: 'Invalid Dataset' });
      return;
    }
  }

  if (dataset.length === 0) {
    await appAlert('Dataset is empty.', { title: 'No Rows' });
    return;
  }

  const maxIterations = Number(result.values.maxIterations);
  if (Number.isFinite(maxIterations) && maxIterations > 0) {
    dataset = dataset.slice(0, maxIterations);
  }

  const baseVariables = getRuntimeVariables();
  if (baseVariables === null) {
    appendMessage('error', 'Invalid Variables JSON. Fix it before running.');
    return;
  }

  const resultsEl = document.getElementById(`scenarioResults_${id}`);
  resultsEl.style.display = 'block';
  resultsEl.innerHTML = `<div style="color: var(--text-muted)">📊 Running ${dataset.length} dataset row${dataset.length !== 1 ? 's' : ''}...</div>`;

  const stopOnError = result.values.stopOnError === 'yes';
  let totalPassed = 0;
  let totalFailed = 0;
  const iterationResults = [];

  for (let rowIndex = 0; rowIndex < dataset.length; rowIndex++) {
    const rawRow = dataset[rowIndex];
    const row =
      rawRow && typeof rawRow === 'object' && !Array.isArray(rawRow) ? rawRow : { value: rawRow };
    const runtimeVariables = { ...(baseVariables || {}), ...(row || {}) };
    let passed = 0;
    let failed = 0;
    const results = [];
    let totalTime = 0;

    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];

      try {
        const startTime = performance.now();
        const args =
          Object.keys(runtimeVariables).length > 0
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
        totalTime += duration;
        const resultPayload = data.error || data.result;
        const actualHash = hashString(JSON.stringify(resultPayload));
        const isError = data.error || data.result?.isError === true;
        const expectsError = step.expectError === true;
        const hashMatch = actualHash === step.responseHash;

        let schemaViolations = [];
        if (!expectsError && step.responseSchema && data.result && !isError) {
          schemaViolations = validateSchema(data.result, step.responseSchema);
        }

        let assertionResults = [];
        let assertionsFailed = 0;
        if (
          !expectsError &&
          step.assertions &&
          step.assertions.length > 0 &&
          data.result &&
          !isError
        ) {
          for (const assertion of step.assertions) {
            const result = evaluateSingleAssertion(data.result, assertion);
            assertionResults.push({
              path: assertion.path,
              operator: assertion.operator,
              expected: assertion.value,
              actual: result.actualValue,
              passed: result.passed,
              message: result.message,
            });
            if (!result.passed) assertionsFailed++;
          }
        }

        let status = 'pass';
        let message = '';
        let expected = null;
        let actual = null;

        if (expectsError) {
          expected = step.expectedResponse;
          if (isError) {
            actual = resultPayload;
            if (!hashMatch) {
              status = 'diff';
              message = 'Error differs from expected';
            }
          } else {
            status = 'diff';
            message = 'Expected error, got success';
            actual = data.result;
          }
        } else if (isError) {
          status = 'error';
          message = data.error || 'Error';
        } else if (assertionsFailed > 0) {
          status = 'assertion_fail';
          message = `${assertionsFailed} assertion(s) failed`;
          expected = step.expectedResponse;
          actual = data.result;
        } else if (!hashMatch) {
          status = 'diff';
          message = 'Response differs from baseline';
          expected = step.expectedResponse;
          actual = data.result;
        }

        if (status === 'pass') {
          passed++;
        } else {
          failed++;
        }

        results.push({
          step: i + 1,
          tool: step.tool,
          status,
          message,
          duration,
          expected,
          actual,
          schemaViolations,
          assertionResults,
        });

        if (!isError && !expectsError) {
          const extracted = extractScenarioVariables(data.result, step.extract || step.variables);
          if (Object.keys(extracted).length > 0) {
            Object.assign(runtimeVariables, extracted);
          }
        }
      } catch (err) {
        failed++;
        results.push({
          step: i + 1,
          tool: step.tool,
          status: 'error',
          message: err.message,
          schemaViolations: [],
        });
      }

      if (stopOnError && failed > 0) break;
    }

    const iterationStatus = failed > 0 ? 'failed' : 'passed';
    if (iterationStatus === 'passed') {
      totalPassed++;
    } else {
      totalFailed++;
    }

    iterationResults.push({
      index: rowIndex + 1,
      row,
      passed,
      failed,
      totalTime,
      status: iterationStatus,
      results,
    });

    if (stopOnError && failed > 0) break;
  }

  const iterationHtml = iterationResults
    .map(iteration => {
      const statusIcon = iteration.status === 'passed' ? '✅' : '❌';
      const rowJson = JSON.stringify(iteration.row || {});
      const rowPreview = rowJson.length > 140 ? `${rowJson.slice(0, 140)}…` : rowJson;
      const stepHtml = iteration.results
        .map(r => {
          let diffId = null;
          if ((r.status === 'diff' || r.status === 'assertion_fail') && r.expected && r.actual) {
            diffId = cacheDiffData(r.expected, r.actual);
          }
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
                ${
                  r.schemaViolations && r.schemaViolations.length > 0
                    ? `
                  <span style="color: var(--warning); font-size: 0.65rem; margin-left: 4px">📋 ${r.schemaViolations.length} schema issue${r.schemaViolations.length !== 1 ? 's' : ''}</span>
                `
                    : r.status === 'pass' && r.schemaViolations
                      ? '<span style="color: var(--success); font-size: 0.65rem">📋 Schema OK</span>'
                      : ''
                }
                ${
                  assertId
                    ? `
                  <span style="font-size: 0.65rem; margin-left: 4px; ${r.assertionResults.every(a => a.passed) ? 'color: var(--success)' : 'color: var(--error)'}">
                    🔍 ${r.assertionResults.filter(a => a.passed).length}/${r.assertionResults.length} assertions
                  </span>
                  <button class="btn" onclick="showAssertionResultsById('${assertId}')" style="font-size: 0.6rem; padding: 1px 4px">Details</button>
                `
                    : ''
                }
              </div>
            `;
        })
        .join('');

      return `
            <details class="matrix-result" ${iteration.status === 'failed' ? 'open' : ''}>
              <summary>
                <span>${statusIcon} Iteration ${iteration.index}</span>
                <span style="color: var(--text-muted)">${iteration.totalTime}ms</span>
              </summary>
              <div style="font-size: 0.7rem; color: var(--text-muted); margin: 6px 0">${escapeHtml(rowPreview)}</div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px">
                <span class="pill">✅ ${iteration.passed}</span>
                <span class="pill">❌ ${iteration.failed}</span>
              </div>
              <div>${stepHtml}</div>
            </details>
          `;
    })
    .join('');

  resultsEl.innerHTML = `
          <div style="margin-bottom: 8px">
            <strong>Data Run:</strong>
            <span style="color: var(--success)">${totalPassed} passed</span> /
            <span style="color: var(--error)">${totalFailed} failed</span>
          </div>
          ${iterationHtml}
        `;
}

async function runScenarioOnServer(steps, serverName, baseVariables) {
  let passed = 0;
  let failed = 0;
  let diffCount = 0;
  let assertionFailures = 0;
  let totalTime = 0;
  const results = [];
  const runtimeVariables = { ...(baseVariables || {}) };

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    try {
      const startTime = performance.now();
      const args =
        Object.keys(runtimeVariables).length > 0
          ? applyTemplateVariables(step.args, runtimeVariables)
          : step.args;

      const response = await fetch('/api/mcp/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          serverName,
          toolName: step.tool,
          args,
        }),
      });

      const data = await response.json();
      const duration = Math.round(performance.now() - startTime);
      totalTime += duration;

      const resultPayload = data.error || data.result;
      const actualHash = hashString(JSON.stringify(resultPayload));
      const isError = data.error || data.result?.isError === true;
      const expectsError = step.expectError === true;
      const hashMatch = actualHash === step.responseHash;

      let schemaViolations = [];
      if (!expectsError && step.responseSchema && data.result && !isError) {
        schemaViolations = validateSchema(data.result, step.responseSchema);
      }

      let assertionResults = [];
      let assertionsFailed = 0;
      if (
        !expectsError &&
        step.assertions &&
        step.assertions.length > 0 &&
        data.result &&
        !isError
      ) {
        for (const assertion of step.assertions) {
          const result = evaluateSingleAssertion(data.result, assertion);
          assertionResults.push({
            path: assertion.path,
            operator: assertion.operator,
            expected: assertion.value,
            actual: result.actualValue,
            passed: result.passed,
            message: result.message,
          });
          if (!result.passed) assertionsFailed++;
        }
      }

      let status = 'pass';
      let message = '';
      let expected = null;
      let actual = null;

      if (expectsError) {
        expected = step.expectedResponse;
        if (isError) {
          actual = resultPayload;
          if (!hashMatch) {
            status = 'diff';
            message = 'Error differs from expected';
          }
        } else {
          status = 'diff';
          message = 'Expected error, got success';
          actual = data.result;
        }
      } else if (isError) {
        status = 'error';
        message = data.error || 'Error';
      } else if (assertionsFailed > 0) {
        status = 'assertion_fail';
        message = `${assertionsFailed} assertion(s) failed`;
        expected = step.expectedResponse;
        actual = data.result;
      } else if (!hashMatch) {
        status = 'diff';
        message = 'Response differs from baseline';
        expected = step.expectedResponse;
        actual = data.result;
      }

      if (status === 'pass') {
        passed++;
      } else {
        failed++;
        if (status === 'diff') diffCount++;
        if (status === 'assertion_fail') assertionFailures++;
      }

      if (!isError && !expectsError) {
        const extracted = extractScenarioVariables(data.result, step.extract || step.variables);
        if (Object.keys(extracted).length > 0) {
          Object.assign(runtimeVariables, extracted);
        }
      }

      results.push({
        step: i + 1,
        tool: step.tool,
        status,
        message,
        duration,
        expected,
        actual: actual ?? resultPayload,
        schemaViolations,
        assertionResults,
      });
    } catch (err) {
      failed++;
      results.push({
        step: i + 1,
        tool: step.tool,
        status: 'error',
        message: err.message,
        schemaViolations: [],
        actual: null,
        expected: step.expectedResponse,
      });
    }
  }

  return {
    server: serverName,
    passed,
    failed,
    diffCount,
    assertionFailures,
    totalTime,
    results,
  };
}

async function runScenarioMatrix(id) {
  const scenario = sessionManager.getScenario(id);
  if (!scenario) {
    appendMessage('error', 'Scenario not found');
    return;
  }

  const steps = scenario.steps || [];
  if (steps.length === 0) {
    await appAlert('This scenario has no steps yet.', { title: 'No Steps' });
    return;
  }

  const stepServers = Array.from(new Set(steps.map(step => step.server).filter(Boolean)));
  if (stepServers.length === 0) {
    await appAlert('Scenario steps are missing server info.', { title: 'Missing Server' });
    return;
  }
  if (stepServers.length > 1) {
    await appAlert(
      'Matrix runs require a single-server scenario. Use Collections for multi-server flows.',
      { title: 'Multiple Servers Detected' }
    );
    return;
  }

  let connectedServers = [];
  try {
    const res = await fetch('/api/mcp/status', { credentials: 'include' });
    const status = await res.json();
    const servers = status.servers || status;
    connectedServers = Object.entries(servers || {})
      .filter(([, info]) => info?.connected || info?.userConnected)
      .map(([name]) => name);
  } catch (error) {
    await appAlert('Failed to load MCP status. Make sure servers are running.', {
      title: 'Server Status Error',
    });
    return;
  }

  if (!connectedServers.length) {
    await appAlert('No connected MCP servers detected. Connect one to run the matrix.', {
      title: 'No Connected Servers',
    });
    return;
  }

  const baseServer = stepServers[0];
  const orderedServers = [baseServer, ...connectedServers.filter(server => server !== baseServer)];
  const serverPills = connectedServers
    .map(server => {
      const isBaseline = server === baseServer;
      return `<span class="pill"${isBaseline ? ' style="border-color: var(--accent); color: var(--accent)"' : ''}>${escapeHtml(server)}${isBaseline ? ' (baseline)' : ''}</span>`;
    })
    .join('');

  const modalResult = await showAppModal({
    title: 'Matrix Run',
    message: `Run "${scenario.name}" across ${connectedServers.length} connected server(s)?`,
    bodyHtml: `
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 10px">
              Scenario built for <strong>${escapeHtml(baseServer)}</strong>. Each step will run against every connected server.
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px">${serverPills}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px">
              Heatmap appears after the run. Connect 2+ servers to compare across transports.
            </div>
          `,
    confirmText: 'Run',
    cancelText: 'Cancel',
    showCancel: true,
  });

  if (!modalResult.confirmed) return;

  const variables = getRuntimeVariables();
  if (variables === null) {
    appendMessage('error', 'Invalid Variables JSON. Fix it before running.');
    return;
  }

  const resultsEl = document.getElementById(`scenarioResults_${id}`);
  resultsEl.style.display = 'block';
  resultsEl.innerHTML = `<div style="color: var(--text-muted)">🌐 Running matrix on ${connectedServers.length} server${connectedServers.length !== 1 ? 's' : ''}...</div>`;

  const matrixResults = [];
  for (const serverName of orderedServers) {
    const runResult = await runScenarioOnServer(steps, serverName, variables || {});
    matrixResults.push(runResult);
  }

  const baselineResult = matrixResults.find(result => result.server === baseServer) || null;
  const baselineSteps = baselineResult ? baselineResult.results : [];

  const baselineDiffs = matrixResults.map(result => {
    if (!baselineResult || result.server === baseServer) {
      return { total: 0, stepDiffs: [] };
    }

    const stepDiffs = result.results.map((stepResult, index) => {
      const baselineStep = baselineSteps[index];
      if (!baselineStep || baselineStep.status === 'error' || stepResult.status === 'error') {
        return { count: null, diffId: null };
      }
      const diffList = jsonDiff(baselineStep.actual ?? {}, stepResult.actual ?? {});
      const count = diffList.length;
      const diffId =
        count > 0 ? cacheDiffData(baselineStep.actual ?? {}, stepResult.actual ?? {}) : null;
      return { count, diffId };
    });

    const total = stepDiffs.reduce((sum, item) => sum + (item.count || 0), 0);
    return { total, stepDiffs };
  });

  const passedServers = matrixResults.filter(r => r.failed === 0).length;
  const failedServers = matrixResults.length - passedServers;

  const stepLabels = steps.map((step, index) => step.tool || `Step ${index + 1}`);
  const durations = matrixResults
    .flatMap(result => result.results.map(r => r.duration || 0))
    .filter(Boolean);
  const maxDuration = Math.max(1, ...durations);
  const minDuration = Math.min(...durations);

  const getHeatColor = (duration, status) => {
    if (status === 'error') return 'rgba(239, 68, 68, 0.5)';
    if (status === 'diff' || status === 'assertion_fail') return 'rgba(245, 158, 11, 0.4)';
    const ratio =
      maxDuration === minDuration ? 0 : (duration - minDuration) / (maxDuration - minDuration);
    const green = 180 - Math.round(ratio * 80);
    const red = 80 + Math.round(ratio * 120);
    return `rgba(${red}, ${green}, 110, 0.45)`;
  };

  const heatmapRows = matrixResults
    .map(result => {
      const isBaseline = result.server === baseServer;
      const cells = stepLabels
        .map((_, idx) => {
          const step = result.results[idx];
          const duration = step?.duration || 0;
          const status = step?.status || 'unknown';
          const color = getHeatColor(duration, status);
          return `
              <div class="matrix-heat-cell" style="background: ${color}" title="${escapeHtml(result.server)} · Step ${idx + 1} · ${duration}ms (${status})">
                ${duration ? `${duration}ms` : '–'}
              </div>
            `;
        })
        .join('');
      return `
            <div class="matrix-heat-row${isBaseline ? ' baseline' : ''}">
              <div class="matrix-heat-label">${escapeHtml(result.server)}</div>
              ${cells}
            </div>
          `;
    })
    .join('');

  const heatmapHtml = `
          <div class="matrix-heatmap">
            <div class="matrix-heat-row matrix-heat-header">
              <div class="matrix-heat-label">Server</div>
              ${stepLabels.map((label, idx) => `<div class="matrix-heat-cell">${escapeHtml(label || `Step ${idx + 1}`)}</div>`).join('')}
            </div>
            ${heatmapRows}
          </div>
        `;

  const matrixHtml = matrixResults
    .map((result, resultIndex) => {
      const statusIcon = result.failed > 0 ? '❌' : '✅';
      const summaryBadges = [
        `<span class="pill">Steps: ${result.passed + result.failed}</span>`,
        `<span class="pill">✅ ${result.passed}</span>`,
        `<span class="pill">❌ ${result.failed}</span>`,
      ];
      if (result.diffCount > 0)
        summaryBadges.push(`<span class="pill">Δ ${result.diffCount}</span>`);
      if (result.assertionFailures > 0)
        summaryBadges.push(`<span class="pill">🔍 ${result.assertionFailures}</span>`);
      if (result.server !== baseServer && baselineDiffs[resultIndex]?.total) {
        summaryBadges.push(
          `<span class="pill">Δ baseline ${baselineDiffs[resultIndex].total}</span>`
        );
      }

      const stepHtml = result.results
        .map((r, stepIndex) => {
          let diffId = null;
          if ((r.status === 'diff' || r.status === 'assertion_fail') && r.expected && r.actual) {
            diffId = cacheDiffData(r.expected, r.actual);
          }
          let assertId = null;
          if (r.assertionResults && r.assertionResults.length > 0) {
            assertId = cacheAssertionResults(r.assertionResults);
          }
          const baselineDiff = baselineDiffs[resultIndex]?.stepDiffs?.[stepIndex] || null;
          return `
              <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 4px; background: var(--bg-card); border-radius: 4px; margin-bottom: 2px">
                ${r.status === 'pass' ? '✅' : r.status === 'diff' ? '🔶' : r.status === 'assertion_fail' ? '🔴' : '❌'}
                <strong>${r.step}.</strong> ${escapeHtml(r.tool)}
                ${r.duration ? `<span style="color: var(--text-muted)">(${r.duration}ms)</span>` : ''}
                ${r.message ? `<span style="color: var(--error); font-size: 0.7rem">${escapeHtml(r.message)}</span>` : ''}
                ${diffId ? `<button class="btn" onclick="showDiffById('${diffId}')" style="font-size: 0.6rem; padding: 1px 4px">View Diff</button>` : ''}
                ${
                  baselineDiff && baselineDiff.count !== null
                    ? `
                  <span style="font-size: 0.65rem; color: var(--warning); margin-left: 4px">Δ baseline ${baselineDiff.count}</span>
                  ${baselineDiff.diffId ? `<button class="btn" onclick="showDiffById('${baselineDiff.diffId}')" style="font-size: 0.6rem; padding: 1px 4px">View Δ</button>` : ''}
                `
                    : ''
                }
                ${
                  r.schemaViolations && r.schemaViolations.length > 0
                    ? `
                  <span style="color: var(--warning); font-size: 0.65rem; margin-left: 4px">📋 ${r.schemaViolations.length} schema issue${r.schemaViolations.length !== 1 ? 's' : ''}</span>
                `
                    : r.status === 'pass' && r.schemaViolations
                      ? '<span style="color: var(--success); font-size: 0.65rem">📋 Schema OK</span>'
                      : ''
                }
                ${
                  assertId
                    ? `
                  <span style="font-size: 0.65rem; margin-left: 4px; ${r.assertionResults.every(a => a.passed) ? 'color: var(--success)' : 'color: var(--error)'}">
                    🔍 ${r.assertionResults.filter(a => a.passed).length}/${r.assertionResults.length} assertions
                  </span>
                  <button class="btn" onclick="showAssertionResultsById('${assertId}')" style="font-size: 0.6rem; padding: 1px 4px">Details</button>
                `
                    : ''
                }
              </div>
            `;
        })
        .join('');

      return `
            <details class="matrix-result">
              <summary>
                <span>${statusIcon} ${escapeHtml(result.server)}</span>
                <span style="color: var(--text-muted)">${result.totalTime}ms total</span>
              </summary>
              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 10px">${summaryBadges.join('')}</div>
              <div>${stepHtml || '<div style="color: var(--text-muted)">No steps executed.</div>'}</div>
            </details>
          `;
    })
    .join('');

  const matrixPayload = {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    baseServer,
    servers: orderedServers,
    steps,
    results: matrixResults,
    createdAt: new Date().toISOString(),
  };
  window.lastMatrixRun = matrixPayload;

  resultsEl.innerHTML = `
          <div style="margin-bottom: 8px">
            <strong>Matrix Results:</strong>
            <span style="color: var(--success)">${passedServers} passed</span> /
            <span style="color: var(--error)">${failedServers} failed</span>
          </div>
          ${
            connectedServers.length < 2
              ? `
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 6px">
              Connect another server to compare results across transports.
            </div>
          `
              : ''
          }
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px">
            <button class="btn" onclick="exportMatrixResults()">📦 Export Matrix</button>
          </div>
          ${heatmapHtml}
          ${matrixHtml}
        `;
}

function exportMatrixResults(payload) {
  const data = payload || window.lastMatrixRun;
  if (!data) {
    showNotification('No matrix results to export yet.', 'warning');
    return;
  }
  const slugify =
    typeof slugifyName === 'function'
      ? slugifyName
      : value =>
          String(value || 'matrix')
            .replace(/[^a-z0-9]+/gi, '_')
            .toLowerCase();
  const name = slugify(data.scenarioName || 'scenario');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `scenario-matrix-${name}-${timestamp}.json`;
  if (typeof downloadJsonFile === 'function') {
    downloadJsonFile(filename, data);
  } else {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  showNotification('Matrix results exported.', 'success');
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
            ${
              extracts.length === 0
                ? `
              <div style="font-size: 0.7rem; color: var(--text-muted); font-style: italic">No variables set</div>
            `
                : extracts
                    .map(
                      (extract, ei) => `
              <div style="display: flex; align-items: center; gap: 6px; font-size: 0.7rem; padding: 4px; background: var(--bg-surface); border-radius: 4px; margin-bottom: 2px">
                <code style="color: var(--primary)">${escapeHtml(extract.name)}</code>
                <span style="color: var(--text-muted)">←</span>
                ${
                  extract.path
                    ? `<code>${escapeHtml(extract.path)}</code>`
                    : `<code>${escapeHtml(extract.value === undefined ? '(empty)' : typeof extract.value === 'string' ? extract.value : JSON.stringify(extract.value))}</code>`
                }
                <button onclick="removeExtractFromStep('${scenarioId}', ${stepIndex}, ${ei})" style="font-size: 0.6rem; padding: 1px 4px; background: none; border: none; cursor: pointer; color: var(--error)">✕</button>
              </div>
            `
                    )
                    .join('')
            }
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
                ${(scenario.steps || [])
                  .map(
                    (step, i) => `
                  <div style="background: var(--bg-card); border-radius: 8px; padding: 12px; border-left: 3px solid ${step.expectError ? 'var(--warning)' : step.success ? 'var(--success)' : 'var(--error)'}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
                      <div style="display: flex; align-items: center; gap: 8px">
                        <span style="font-weight: 600">${i + 1}.</span>
                        <span>${step.expectError ? '⚠️' : step.success ? '✅' : '❌'}</span>
                        <code style="font-weight: 500">${escapeHtml(step.tool)}</code>
                        <span style="color: var(--text-muted); font-size: 0.7rem">@ ${escapeHtml(step.server)}</span>
                        ${step.expectError ? '<span class="pill" style="border-color: var(--warning); color: var(--warning)">Expected error</span>' : ''}
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
                      <summary style="cursor: pointer; font-size: 0.75rem; color: var(--text-muted)">${step.expectError ? '⚠️ Expected Error' : '📤 Baseline Response'} (hash: ${step.responseHash || 'N/A'})</summary>
                      <pre style="background: var(--bg-surface); padding: 8px; border-radius: 4px; font-size: 0.7rem; margin-top: 4px; overflow-x: auto; max-height: 150px">${escapeHtml(JSON.stringify(step.expectedResponse || {}, null, 2))}</pre>
                    </details>

                    <!-- Schema Info -->
                    ${
                      step.responseSchema
                        ? `
                      <details>
                        <summary style="cursor: pointer; font-size: 0.75rem; color: var(--text-muted)">📋 Inferred Schema</summary>
                        <pre style="background: var(--bg-surface); padding: 8px; border-radius: 4px; font-size: 0.7rem; margin-top: 4px; overflow-x: auto; max-height: 100px">${escapeHtml(JSON.stringify(step.responseSchema, null, 2))}</pre>
                      </details>
                    `
                        : ''
                    }

                    <!-- Assertions -->
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border)">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px">
                        <span style="font-size: 0.75rem; font-weight: 500; color: var(--primary)">🔍 Assertions</span>
                        <button class="btn" onclick="addAssertionToStep('${scenario.id}', ${i})" style="font-size: 0.6rem; padding: 2px 6px">➕ Add</button>
                      </div>
                      ${
                        (step.assertions || []).length === 0
                          ? `
                        <div style="font-size: 0.7rem; color: var(--text-muted); font-style: italic">No assertions defined</div>
                      `
                          : (step.assertions || [])
                              .map(
                                (assertion, ai) => `
                        <div style="display: flex; align-items: center; gap: 4px; font-size: 0.7rem; padding: 4px; background: var(--bg-surface); border-radius: 4px; margin-bottom: 2px">
                          <code style="color: var(--primary)">${escapeHtml(assertion.path)}</code>
                          <span style="color: var(--text-muted)">${escapeHtml(assertion.operator)}</span>
                          <code>${escapeHtml(String(assertion.value))}</code>
                          <button onclick="removeAssertionFromStep('${scenario.id}', ${i}, ${ai})" style="font-size: 0.6rem; padding: 1px 4px; background: none; border: none; cursor: pointer; color: var(--error)">✕</button>
                        </div>
                      `
                              )
                              .join('')
                      }
                    </div>
                    ${renderExtractSection(step, scenario.id, i)}
                  </div>
                `
                  )
                  .join('')}
              </div>

              <!-- Usage Guide -->
              <div style="margin-top: 16px; padding: 12px; background: var(--bg-surface); border-radius: 8px; font-size: 0.75rem">
                <strong>💡 How to use:</strong>
                <ul style="margin: 8px 0 0 16px; color: var(--text-muted)">
                  <li><strong>▶️ Replay</strong> - Re-run all steps, compare responses</li>
                  <li><strong>📊 Data Run</strong> - Run with a dataset JSON array</li>
                  <li><strong>🔶 Diff</strong> - Click "View Diff" if response differs from baseline</li>
                  <li><strong>📋 Schema</strong> - Validates response structure (type, required fields)</li>
                </ul>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn" onclick="closeScenarioDetailsModal()">Close</button>
              <button class="btn" onclick="closeScenarioDetailsModal(); runScenarioDataset('${scenario.id}')">📊 Data Run</button>
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
  document.getElementById('assertionOperator').addEventListener('change', e => {
    const valueContainer = document.getElementById('assertionValueContainer');
    valueContainer.style.display = ['exists', 'not_exists'].includes(e.target.value)
      ? 'none'
      : 'block';
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

  const extracts = normalizeExtractList(
    scenario.steps[stepIndex].extract || scenario.steps[stepIndex].variables
  );
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

  const extracts = normalizeExtractList(
    scenario.steps[stepIndex].extract || scenario.steps[stepIndex].variables
  );
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
                  ${assertionResults
                    .map(
                      a => `
                    <tr style="border-bottom: 1px solid var(--border); ${a.passed ? '' : 'background: rgba(255,0,0,0.1);'}">
                      <td style="padding: 6px;">${a.passed ? '✅' : '❌'}</td>
                      <td style="padding: 6px;"><code>${escapeHtml(a.path)}</code></td>
                      <td style="padding: 6px;">${escapeHtml(a.operator)}</td>
                      <td style="padding: 6px;"><code>${escapeHtml(String(a.expected ?? ''))}</code></td>
                      <td style="padding: 6px;"><code>${escapeHtml(String(a.actual ?? 'undefined'))}</code></td>
                    </tr>
                    ${
                      !a.passed
                        ? `
                      <tr style="background: rgba(255,0,0,0.05);">
                        <td></td>
                        <td colspan="4" style="padding: 4px 6px; font-size: 0.7rem; color: var(--error);">
                          ⚠️ ${escapeHtml(a.message || 'Assertion failed')}
                        </td>
                      </tr>
                    `
                        : ''
                    }
                  `
                    )
                    .join('')}
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
    confirmVariant: 'danger',
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

  suitesEl.innerHTML = suites
    .map(
      suite => `
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
            ${
              suite.lastRun
                ? `
              <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 4px;">
                Last run: ${new Date(suite.lastRun.timestamp).toLocaleString()} - 
                <span style="color: var(--success)">${suite.lastRun.passed} passed</span> / 
                <span style="color: var(--error)">${suite.lastRun.failed} failed</span>
              </div>
            `
                : ''
            }
          </div>
        `
    )
    .join('');
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
                  ${scenarios
                    .map(
                      s => `
                    <label style="display: flex; align-items: center; gap: 8px; padding: 4px; cursor: pointer;">
                      <input type="checkbox" class="suite-scenario-checkbox" value="${s.id}" 
                        ${existingSuite?.scenarioIds?.includes(s.id) ? 'checked' : ''}>
                      <span>${escapeHtml(s.name)}</span>
                      <span style="color: var(--text-muted); font-size: 0.7rem;">(${s.steps?.length || 0} steps)</span>
                    </label>
                  `
                    )
                    .join('')}
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
    confirmVariant: 'danger',
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

  appendMessage(
    'system',
    `🚀 Running suite "${suite.name}" with ${suite.scenarioIds.length} scenarios...`
  );

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
    let passed = 0,
      failed = 0;
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

  appendMessage(
    'system',
    `📦 Suite "${suite.name}" completed: ${totalPassed} passed, ${totalFailed} failed`
  );
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
              ${
                diffs.length === 0
                  ? `
                <div style="text-align: center; color: var(--success); padding: 20px">
                  ✅ No differences found
                </div>
              `
                  : `
                <div style="font-size: 0.75rem; margin-bottom: 12px; color: var(--text-muted)">
                  Found <strong>${diffs.length}</strong> difference${diffs.length !== 1 ? 's' : ''}
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px">
                  ${diffs
                    .map(d => {
                      let icon, color, label;
                      switch (d.type) {
                        case 'missing':
                          icon = '🔴';
                          color = 'var(--error)';
                          label = 'MISSING';
                          break;
                        case 'added':
                          icon = '🟢';
                          color = 'var(--success)';
                          label = 'ADDED';
                          break;
                        case 'changed':
                          icon = '🟡';
                          color = 'var(--warning)';
                          label = 'CHANGED';
                          break;
                        case 'type_change':
                          icon = '🟠';
                          color = '#ff7700';
                          label = 'TYPE CHANGE';
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
                          ${
                            d.type === 'missing' || d.type === 'changed' || d.type === 'type_change'
                              ? `
                            <div>
                              <span style="color: var(--text-muted)">Expected:</span>
                              <code style="color: var(--error)">${escapeHtml(d.type === 'type_change' ? d.expected : formatValue(d.expectedValue))}</code>
                            </div>
                          `
                              : ''
                          }
                          ${
                            d.type === 'added' || d.type === 'changed' || d.type === 'type_change'
                              ? `
                            <div>
                              <span style="color: var(--text-muted)">Actual:</span>
                              <code style="color: var(--success)">${escapeHtml(d.type === 'type_change' ? d.actual : formatValue(d.actualValue))}</code>
                            </div>
                          `
                              : ''
                          }
                        </div>
                      </div>
                    `;
                    })
                    .join('')}
                </div>
              `
              }
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
        message = passed
          ? `${path} equals expected`
          : `${path} = ${JSON.stringify(actualValue)}, expected ${JSON.stringify(value)}`;
        break;

      case 'not_equals':
        passed = JSON.stringify(actualValue) !== JSON.stringify(value);
        message = passed
          ? `${path} does not equal ${JSON.stringify(value)}`
          : `${path} unexpectedly equals ${JSON.stringify(value)}`;
        break;

      case 'contains':
        passed = String(actualValue).includes(value);
        message = passed ? `${path} contains "${value}"` : `${path} does not contain "${value}"`;
        break;

      case 'matches':
        const regex = new RegExp(value.replace(/^\/|\/$/g, ''));
        passed = regex.test(String(actualValue));
        message = passed
          ? `${path} matches ${value}`
          : `${path} = "${actualValue}" does not match ${value}`;
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
        message = passed
          ? `${path} is type ${value}`
          : `${path} is ${actualType}, expected ${value}`;
        break;

      case 'length':
        const len = actualValue?.length || 0;
        passed = len === value;
        message = passed
          ? `${path}.length = ${value}`
          : `${path}.length = ${len}, expected ${value}`;
        break;

      case 'length_gt':
        const len2 = actualValue?.length || 0;
        passed = len2 > value;
        message = passed
          ? `${path}.length > ${value}`
          : `${path}.length = ${len2}, expected > ${value}`;
        break;

      case 'length_gte':
        const len3 = actualValue?.length || 0;
        passed = len3 >= value;
        message = passed
          ? `${path}.length >= ${value}`
          : `${path}.length = ${len3}, expected >= ${value}`;
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
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
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
      value: parseFilterValue(match[3]),
    };
  }
  match = raw.match(/^@\.([^\s]+)\s*$/);
  if (match) {
    return {
      type: 'filter',
      path: match[1].trim(),
      operator: 'truthy',
      value: true,
    };
  }
  return {
    type: 'filter',
    path: raw,
    operator: 'truthy',
    value: true,
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
    for (const key of schema.required || []) {
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

  return violations
    .map(v => {
      let icon, color;
      switch (v.type) {
        case 'type_mismatch':
          icon = '🟠';
          color = '#ff7700';
          return `<div style="display: flex; gap: 4px; align-items: center"><span>${icon}</span><code>${v.path}</code>: type ${v.expected} → ${v.actual}</div>`;
        case 'missing_required':
          icon = '🔴';
          color = 'var(--error)';
          return `<div style="display: flex; gap: 4px; align-items: center"><span>${icon}</span><code>${v.path}</code>: required field missing</div>`;
        case 'extra_field':
          icon = '🟡';
          color = 'var(--warning)';
          return `<div style="display: flex; gap: 4px; align-items: center"><span>${icon}</span><code>${v.path}</code>: unexpected extra field</div>`;
        default:
          return `<div>${v.message || v.type}</div>`;
      }
    })
    .join('');
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

  select.innerHTML = Object.entries(prompts)
    .map(
      ([id, p]) =>
        `<option value="${id}" ${id === activeId ? 'selected' : ''}>${p.icon} ${escapeHtml(p.name)}${p.custom ? ' ★' : ''}</option>`
    )
    .join('');
}

const systemPromptSelect = document.getElementById('systemPromptSelect');
if (systemPromptSelect) {
  systemPromptSelect.addEventListener('focus', () => {
    if (systemPromptSelect.options.length === 0) {
      populateSystemPrompts();
    }
  });
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
              ${Object.entries(prompts)
                .map(
                  ([id, p]) => `
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
              `
                )
                .join('')}
              
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
    confirmVariant: 'danger',
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
  const container = getMessagesContainer();
  if (!container) return false;
  if (messages.length > 0) {
    container.innerHTML = '';
    messages.forEach(msg => {
      if (msg.role !== 'system') {
        appendMessage(msg.role, msg.content, false); // false = don't save again
      }
    });
    console.log(`[Session] Restored ${messages.length} messages`);
  }
  return true;
}

function refreshSessionUI(retry = 0) {
  const rendered = restoreSession();
  if (!rendered) {
    if (retry < 3) {
      setTimeout(() => refreshSessionUI(retry + 1), 250);
    }
    return;
  }
  if (typeof refreshHistoryPanel === 'function') {
    refreshHistoryPanel();
  }
  updateTokenDisplay();
  if (typeof window.refreshBrainView === 'function') {
    window.refreshBrainView();
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
    confirmVariant: 'danger',
  });
  if (!confirmed) return;
  sessionManager.resetTokens();
  updateTokenDisplay();
  closeTokenUsageModal();
  appendMessage('system', '🔄 Token usage reset');
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
    required: true,
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
              ${
                branches.length === 0
                  ? `
                <div style="text-align: center; color: var(--text-muted); padding: 20px;">
                  No branches yet. Hover over a message and click 🌿 to fork.
                </div>
              `
                  : branches
                      .map(
                        b => `
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
              `
                      )
                      .join('')
              }
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
    confirmVariant: 'danger',
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
    required: true,
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
    savedAt: new Date().toISOString(),
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
    appendMessage(
      'system',
      `🔄 Loading ${envName} environment (${profile.servers.length} servers)...`
    );

    // Disconnect current servers first
    const statusRes = await fetch('/api/mcp/status', { credentials: 'include' });
    const currentStatus = await statusRes.json();
    const currentServers = currentStatus.servers || currentStatus;

    for (const serverName of Object.keys(currentServers || {})) {
      try {
        await fetch(`/api/mcp/disconnect/${encodeURIComponent(serverName)}`, {
          method: 'POST',
          credentials: 'include',
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
          credentials: 'include',
        });
        if (res.ok) connected++;
      } catch (e) {
        console.warn(`Failed to connect ${server.name}`);
      }
    }

    appendMessage(
      'system',
      `✅ ${envName}: ${connected}/${profile.servers.length} servers connected`
    );
  } else {
    appendMessage(
      'system',
      `🆕 ${envName} environment (no saved config - configure servers and switch away to save)`
    );
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
        config: info.config || null,
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
    createdAt: new Date().toISOString(),
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
    required: true,
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
              ${
                branches.length === 0
                  ? `
                <div style="text-align: center; color: var(--text-muted); padding: 20px;">
                  No branches yet. Hover over a message and click 🌿 to fork.
                </div>
              `
                  : branches
                      .map(
                        b => `
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
              `
                      )
                      .join('')
              }
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
    confirmVariant: 'danger',
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
    required: true,
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
      credentials: 'include',
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
      eventsEl.innerHTML =
        '<div style="color: var(--text-muted); font-style: italic; padding: 12px">No events captured yet...</div>';
      return;
    }

    let html = '';
    for (const event of data.events.reverse()) {
      const time = new Date(event.timestamp).toLocaleTimeString();
      const typeColor =
        event.type === 'error'
          ? 'var(--danger)'
          : event.type === 'response'
            ? 'var(--success)'
            : 'var(--info)';
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
    const response = await fetch(
      `/api/inspector/timeline/${timelineSessionId}/export?format=json`,
      {
        credentials: 'include',
      }
    );
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
      credentials: 'include',
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
let bulkTestLastRun = null;

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

function buildFuzzValue(type, options = {}) {
  const { edgeBias = true, includeInvalid = true } = options;
  const values = [];
  const add = val => values.push(val);

  switch (type) {
    case 'string':
      add('');
      if (edgeBias) {
        add(' ');
        add('0');
        add('⚡');
        add('long_' + 'x'.repeat(32));
      }
      add('example');
      if (includeInvalid) add(123);
      break;
    case 'number':
    case 'integer':
      add(0);
      if (edgeBias) {
        add(1);
        add(-1);
        add(Number.MAX_SAFE_INTEGER);
        add(Number.MIN_SAFE_INTEGER);
      }
      add(42);
      if (includeInvalid) add('NaN');
      break;
    case 'boolean':
      add(true);
      add(false);
      if (includeInvalid) add('true');
      break;
    case 'array':
      add([]);
      if (edgeBias) add([1, 2, 3]);
      if (includeInvalid) add({});
      break;
    case 'object':
      add({});
      if (edgeBias) add({ example: 'value' });
      if (includeInvalid) add([]);
      break;
    default:
      add(null);
      if (includeInvalid) add('unknown');
      break;
  }

  return values;
}

function buildFuzzCases(schema, options = {}) {
  if (!schema || typeof schema !== 'object') return [];
  const properties = schema.properties || {};
  const required = schema.required || [];
  const keys = Object.keys(properties);
  if (keys.length === 0) return [{}];

  const perKeyValues = keys.map(key => {
    const propSchema = properties[key] || {};
    const type = propSchema.type || 'string';
    const values = buildFuzzValue(type, options);
    return { key, values, required: required.includes(key) };
  });

  const cases = [];
  const base = {};
  perKeyValues.forEach(entry => {
    if (entry.required) {
      base[entry.key] = entry.values[0];
    }
  });
  cases.push({ ...base });

  perKeyValues.forEach(entry => {
    entry.values.forEach(value => {
      cases.push({ ...base, [entry.key]: value });
    });
  });

  if (options.includeInvalid) {
    perKeyValues
      .filter(entry => entry.required)
      .forEach(entry => {
        const missing = { ...base };
        delete missing[entry.key];
        cases.push(missing);
      });
  }

  const unique = [];
  const seen = new Set();
  cases.forEach(item => {
    const key = JSON.stringify(item);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  });

  return unique;
}

function generateFuzzCases() {
  const serverName = document.getElementById('bulkTestServerSelect').value;
  const toolName = document.getElementById('bulkTestToolSelect').value;
  if (!serverName || !toolName) {
    appendMessage('error', 'Select a server and tool first.');
    return;
  }

  const toolDef = bulkTestCache.find(
    tool => tool.serverName === serverName && tool.name === toolName
  );
  if (!toolDef) {
    appendMessage('error', 'Tool schema not found.');
    return;
  }

  const count = Math.min(
    50,
    Math.max(1, Number(document.getElementById('fuzzVariantCount')?.value || 12))
  );
  const includeInvalid = document.getElementById('fuzzIncludeInvalid')?.checked ?? true;
  const edgeBias = document.getElementById('fuzzEdgeBias')?.checked ?? true;

  const cases = buildFuzzCases(toolDef.inputSchema || {}, { includeInvalid, edgeBias });
  const sliced = cases.slice(0, count);

  const textarea = document.getElementById('bulkTestInputs');
  if (textarea) {
    textarea.value = JSON.stringify(sliced, null, 2);
  }

  appendMessage('system', `🧪 Generated ${sliced.length} fuzz inputs from schema.`);
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
      credentials: 'include',
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
              ${
                results.stats
                  ? `
                <div><strong>Avg Latency:</strong> ${Math.round(results.stats.avgDuration)}ms</div>
                <div><strong>Min:</strong> ${Math.round(results.stats.minDuration)}ms</div>
                <div><strong>Max:</strong> ${Math.round(results.stats.maxDuration)}ms</div>
                <div><strong>p95:</strong> ${Math.round(results.stats.p95Duration)}ms</div>
              `
                  : ''
              }
            </div>
          `;

    const heatmapData = computeBulkHeatmap(results.results || []);
    renderBulkTestHeatmap(heatmapData);

    // Results table
    let html = '<table style="width: 100%; border-collapse: collapse; font-size: 0.7rem">';
    html +=
      '<thead><tr style="background: var(--bg-card); font-weight: 500"><th style="padding: 6px; text-align: left">#</th><th style="padding: 6px; text-align: left">Status</th><th style="padding: 6px; text-align: left">Duration</th><th style="padding: 6px; text-align: left">Output</th></tr></thead><tbody>';

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

    bulkTestLastRun = {
      serverName,
      toolName,
      inputs,
      results,
      heatmap: heatmapData,
      createdAt: new Date().toISOString(),
    };

    appendMessage(
      'system',
      `✅ Bulk test completed: ${results.successful}/${results.total} successful`
    );
  } catch (error) {
    appendMessage('error', `Bulk test failed: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '▶️ Run Bulk Test';
  }
}

function computeBulkHeatmap(rows) {
  if (!rows.length) {
    return { minDuration: 0, maxDuration: 0, cells: [] };
  }

  const durations = rows.map(row => row.duration || 0);
  const maxDuration = Math.max(1, ...durations);
  const minDuration = Math.min(...durations);

  const getHeatColor = (duration, status) => {
    if (status === 'error') return 'rgba(239, 68, 68, 0.5)';
    const ratio =
      maxDuration === minDuration ? 0 : (duration - minDuration) / (maxDuration - minDuration);
    const green = 180 - Math.round(ratio * 80);
    const red = 80 + Math.round(ratio * 120);
    return `rgba(${red}, ${green}, 110, 0.45)`;
  };

  const cells = rows.map(row => ({
    index: row.index,
    duration: row.duration || 0,
    status: row.status || 'unknown',
    color: getHeatColor(row.duration || 0, row.status || 'unknown'),
  }));

  return { minDuration, maxDuration, cells };
}

function renderBulkTestHeatmap(heatmapData) {
  const container = document.getElementById('bulkTestHeatmap');
  if (!container) return;

  const cells = heatmapData?.cells || [];
  if (!cells.length) {
    container.innerHTML = '';
    return;
  }

  const headerCells = cells
    .map((_, index) => `<div class="matrix-heat-cell">#${index + 1}</div>`)
    .join('');

  const heatCells = cells
    .map(cell => {
      const label = cell.status === 'success' ? `${cell.duration}ms` : 'err';
      return `
            <div class="matrix-heat-cell" style="background: ${cell.color}" title="Input ${cell.index + 1} · ${cell.duration}ms (${cell.status})">
              ${label}
            </div>
          `;
    })
    .join('');

  const fastColor =
    cells.find(cell => cell.status !== 'error')?.color || 'rgba(90, 180, 110, 0.45)';
  const slowColor =
    cells
      .slice()
      .reverse()
      .find(cell => cell.status !== 'error')?.color || 'rgba(180, 100, 110, 0.45)';

  container.innerHTML = `
          <div class="matrix-heatmap bulk-heatmap">
            <div class="bulk-heatmap-legend">
              <span class="bulk-heatmap-dot" style="background: ${fastColor}"></span> Fast
              <span class="bulk-heatmap-dot" style="background: ${slowColor}"></span> Slow
              <span class="bulk-heatmap-dot" style="background: rgba(239, 68, 68, 0.5)"></span> Error
              <span class="bulk-heatmap-note">Latency gradient across inputs</span>
            </div>
            <div class="matrix-heat-row matrix-heat-header">
              <div class="matrix-heat-label">Inputs</div>
              ${headerCells}
            </div>
            <div class="matrix-heat-row">
              <div class="matrix-heat-label">Latency</div>
              ${heatCells}
            </div>
          </div>
        `;
}

async function exportBulkTestResults() {
  if (!bulkTestLastRun || !bulkTestLastRun.results) {
    appendMessage('error', 'Run a bulk test first.');
    return;
  }

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    serverName: bulkTestLastRun.serverName,
    toolName: bulkTestLastRun.toolName,
    inputs: bulkTestLastRun.inputs,
    results: bulkTestLastRun.results,
    heatmap: bulkTestLastRun.heatmap || null,
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bulk-test-results-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  appendMessage('system', '📥 Results exported');
}

async function exportBulkTestResultsText() {
  const results = document.getElementById('bulkTestResults')?.textContent;
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

  appendMessage('system', '📄 Results exported');
}

async function saveBulkFailuresAsScenario() {
  if (!bulkTestLastRun || !bulkTestLastRun.results?.results) {
    appendMessage('error', 'Run a bulk test first.');
    return;
  }

  const failures = bulkTestLastRun.results.results.filter(result => result.status === 'error');
  if (!failures.length) {
    appendMessage('system', 'No failures to save.');
    return;
  }

  const defaultName = `Failures - ${bulkTestLastRun.toolName || 'Tool'}`;
  const name = await appPrompt('Scenario name:', {
    title: 'Save Failures',
    label: 'Scenario name',
    defaultValue: defaultName,
    required: true,
  });
  if (!name) return;

  const steps = failures.map(result => ({
    server: bulkTestLastRun.serverName,
    tool: bulkTestLastRun.toolName,
    args: result.input || {},
    expectedResponse: result.error || 'Unknown error',
    responseHash: hashString(JSON.stringify(result.error || 'Unknown error')),
    responseSchema: null,
    timing: result.duration || 0,
    success: false,
    expectError: true,
  }));

  const scenario = {
    name,
    steps,
    metadata: {
      source: 'bulk-test',
      createdAt: new Date().toISOString(),
      totalFailures: failures.length,
    },
  };

  sessionManager.saveScenario(scenario);
  refreshScenariosPanel();
  showNotification(
    `Scenario "${name}" saved with ${steps.length} failing case${steps.length !== 1 ? 's' : ''}.`,
    'success'
  );
}

async function saveBulkFailuresAsDataset() {
  if (!bulkTestLastRun || !bulkTestLastRun.results?.results) {
    appendMessage('error', 'Run a bulk test first.');
    return;
  }

  const failures = bulkTestLastRun.results.results.filter(result => result.status === 'error');
  if (!failures.length) {
    appendMessage('system', 'No failures to save.');
    return;
  }

  const defaultName = `Failures - ${bulkTestLastRun.toolName || 'Tool'}`;
  const name = await appPrompt('Dataset name:', {
    title: 'Save Failure Dataset',
    label: 'Dataset name',
    defaultValue: defaultName,
    required: true,
  });
  if (!name) return;

  const rows = failures.map(result => {
    const input = result.input;
    const base =
      input && typeof input === 'object' && !Array.isArray(input) ? { ...input } : { value: input };
    base._bulkError = result.error || 'Unknown error';
    return base;
  });

  const datasets = loadDatasets();
  datasets.unshift({
    id: `dataset_${Date.now()}`,
    name,
    rows,
    createdAt: new Date().toISOString(),
    source: 'bulk-test',
    tool: bulkTestLastRun.toolName,
    server: bulkTestLastRun.serverName,
  });
  saveDatasets(datasets);
  renderDatasetManagerList();
  showNotification(
    `Dataset "${name}" saved with ${rows.length} row${rows.length !== 1 ? 's' : ''}.`,
    'success'
  );
}

// ==========================================
// ADVANCED INSPECTOR - DIFF
// ==========================================
let diffToolsCache = [];
let crossServerToolsCache = [];
let crossServerServersCache = [];
let crossServerSelected = new Set();
let crossServerCommonOnly = true;

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

async function loadCrossServerOptions() {
  const toolSelect = document.getElementById('crossToolSelect');
  const baselineSelect = document.getElementById('crossBaselineServerSelect');
  if (!toolSelect || !baselineSelect) return;

  try {
    const statusRes = await fetch('/api/mcp/status', { credentials: 'include' });
    const status = await statusRes.json();
    const servers = status.servers || status;
    crossServerServersCache = Object.entries(servers || {})
      .filter(([, info]) => info.connected || info.userConnected)
      .map(([name]) => name);

    const toolsRes = await fetch('/api/mcp/tools', { credentials: 'include' });
    const data = await toolsRes.json();
    const tools = data.tools || [];
    crossServerToolsCache = tools.filter(
      tool => !tool.notConnected && crossServerServersCache.includes(tool.serverName)
    );
    renderCrossServerServerPicker();
    updateCrossServerToolOptions();
  } catch (error) {
    console.error('Failed to load cross-server options:', error);
  }
}

function getCrossServerSelectedServers() {
  if (!crossServerServersCache.length) return [];
  if (!crossServerSelected.size) return [...crossServerServersCache];
  return crossServerServersCache.filter(name => crossServerSelected.has(name));
}

function renderCrossServerServerPicker() {
  const container = document.getElementById('crossServerPicker');
  if (!container) return;
  if (!crossServerServersCache.length) {
    container.innerHTML =
      '<span style="font-size: 0.7rem; color: var(--text-muted)">Connect servers to compare.</span>';
    return;
  }
  crossServerSelected = new Set(
    [...crossServerSelected].filter(name => crossServerServersCache.includes(name))
  );
  if (!crossServerSelected.size) {
    crossServerServersCache.forEach(name => crossServerSelected.add(name));
  }
  container.innerHTML = crossServerServersCache
    .map(name => {
      const checked = crossServerSelected.has(name) ? 'checked' : '';
      const active = crossServerSelected.has(name) ? 'active' : '';
      return `
            <label class="cross-server-pill ${active}" title="Include ${escapeHtml(name)} in comparison">
              <input type="checkbox" ${checked} onchange="toggleCrossServerSelection('${escapeHtml(name)}', this.checked)" />
              ${escapeHtml(name)}
            </label>
          `;
    })
    .join('');
}

function toggleCrossServerSelection(name, checked) {
  if (checked) {
    crossServerSelected.add(name);
  } else {
    crossServerSelected.delete(name);
  }
  updateCrossServerToolOptions();
}

function selectAllCrossServers(selectAll) {
  if (!crossServerServersCache.length) return;
  crossServerSelected.clear();
  if (selectAll) {
    crossServerServersCache.forEach(name => crossServerSelected.add(name));
  }
  renderCrossServerServerPicker();
  updateCrossServerToolOptions();
}

function updateCrossServerToolOptions() {
  const toolSelect = document.getElementById('crossToolSelect');
  const baselineSelect = document.getElementById('crossBaselineServerSelect');
  const commonToggle = document.getElementById('crossCommonOnly');
  const hintEl = document.getElementById('crossServerHint');
  if (!toolSelect || !baselineSelect) return;

  crossServerCommonOnly = commonToggle ? commonToggle.checked : false;
  const selectedServers = getCrossServerSelectedServers();
  const previousBaseline = baselineSelect.value;
  baselineSelect.innerHTML =
    '<option value="">-- Auto baseline --</option>' +
    selectedServers
      .map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
      .join('');

  if (!selectedServers.length) {
    toolSelect.innerHTML = '<option value="">-- Select Tool --</option>';
    if (hintEl) {
      hintEl.textContent = 'Connect servers to compare. Baseline auto-selects the first server.';
    }
    return;
  }

  if (previousBaseline && selectedServers.includes(previousBaseline)) {
    baselineSelect.value = previousBaseline;
  } else if (selectedServers.length) {
    baselineSelect.value = selectedServers[0];
  }

  if (hintEl) {
    const serverNote =
      selectedServers.length < 2
        ? 'Connect 2+ servers for meaningful diffs.'
        : 'Baseline auto-selects the first server.';
    hintEl.textContent = `Select servers and choose a baseline. Common tools limits to overlaps. ${serverNote}`;
  }

  const toolMap = new Map();
  crossServerToolsCache.forEach(tool => {
    if (!selectedServers.includes(tool.serverName)) return;
    if (!toolMap.has(tool.serverName)) toolMap.set(tool.serverName, new Set());
    toolMap.get(tool.serverName).add(tool.name);
  });

  let toolNames = [];
  if (crossServerCommonOnly) {
    const sets = selectedServers.map(name => toolMap.get(name) || new Set());
    if (sets.length) {
      const [first, ...rest] = sets;
      toolNames = Array.from(first).filter(name => rest.every(set => set.has(name)));
    }
  } else {
    const union = new Set();
    toolMap.forEach(set => set.forEach(name => union.add(name)));
    toolNames = Array.from(union);
  }

  toolNames.sort();
  const previous = toolSelect.value;
  toolSelect.innerHTML =
    '<option value="">-- Select Tool --</option>' +
    toolNames
      .map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
      .join('');
  if (previous && toolNames.includes(previous)) {
    toolSelect.value = previous;
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
        label2: 'Result B',
      }),
      credentials: 'include',
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

async function runCrossServerCompare() {
  const toolName = document.getElementById('crossToolSelect')?.value;
  const baselineServer = document.getElementById('crossBaselineServerSelect')?.value;
  const argsText = document.getElementById('crossArgs')?.value.trim();

  if (!toolName) {
    appendMessage('error', 'Select a tool to compare.');
    return;
  }

  let args = {};
  if (argsText) {
    try {
      args = JSON.parse(argsText);
    } catch (error) {
      appendMessage('error', `Invalid JSON: ${error.message}`);
      return;
    }
  }

  const variables = getRuntimeVariables();
  if (variables === null) {
    appendMessage('error', 'Invalid Variables JSON. Fix it before running.');
    return;
  }
  if (variables && Object.keys(variables).length > 0) {
    args = applyTemplateVariables(args, variables);
  }

  const selectedServers = getCrossServerSelectedServers();
  if (!selectedServers.length) {
    showNotification('Select at least one server to compare.', 'warning');
    return;
  }

  let serversWithTool = crossServerToolsCache
    .filter(tool => tool.name === toolName)
    .map(tool => tool.serverName);
  let servers = selectedServers.filter(name => serversWithTool.includes(name));

  if (!servers.length) {
    servers = selectedServers.slice();
    if (!servers.length) {
      showNotification('No connected servers expose this tool.', 'error');
      return;
    }
    showNotification('Tool not found in tool list; attempting all connected servers.', 'warning');
  }

  const baseline = baselineServer && servers.includes(baselineServer) ? baselineServer : servers[0];

  const btn = document.getElementById('crossRunBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Running...';
  }

  const resultsSection = document.getElementById('crossServerResultsSection');
  const resultsEl = document.getElementById('crossServerResults');
  const summaryEl = document.getElementById('crossServerSummary');
  if (resultsSection) resultsSection.style.display = 'block';
  if (resultsEl) {
    resultsEl.innerHTML = '<div style="color: var(--text-muted)">Running across servers...</div>';
  }

  const results = [];
  for (const serverName of servers) {
    const startTime = performance.now();
    try {
      const response = await fetch('/api/mcp/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          serverName,
          toolName,
          args,
        }),
      });
      const data = await response.json();
      const duration = Math.round(performance.now() - startTime);
      const isError = data.error || data.result?.isError === true;
      results.push({
        server: serverName,
        duration,
        status: isError ? 'error' : 'success',
        response: data.error || data.result,
      });
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      results.push({
        server: serverName,
        duration,
        status: 'error',
        response: { error: error.message },
      });
    }
  }

  const baselineResult = results.find(result => result.server === baseline);
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.length - successCount;

  if (summaryEl) {
    const hint = servers.length < 2 ? ' • Connect 2+ servers to compare across transports.' : '';
    summaryEl.textContent = `Baseline: ${baseline} • ✅ ${successCount} / ❌ ${errorCount}${hint}`;
  }

  if (resultsEl) {
    resultsEl.innerHTML = results
      .map(result => {
        let diffId = null;
        let diffCount = null;
        if (
          baselineResult &&
          result.server !== baseline &&
          baselineResult.status === 'success' &&
          result.status === 'success'
        ) {
          const diffList = jsonDiff(baselineResult.response ?? {}, result.response ?? {});
          diffCount = diffList.length;
          if (diffCount > 0) {
            diffId = cacheDiffData(baselineResult.response ?? {}, result.response ?? {});
          }
        }

        const statusIcon = result.status === 'success' ? '✅' : '❌';
        return `
              <details class="matrix-result" ${result.status === 'error' ? 'open' : ''}>
                <summary>
                  <span>${statusIcon} ${escapeHtml(result.server)}</span>
                  <span style="color: var(--text-muted)">${result.duration}ms</span>
                </summary>
                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0">
                  <span class="pill">${result.status}</span>
                  ${result.server === baseline ? '<span class="pill">Baseline</span>' : ''}
                  ${diffCount !== null ? `<span class="pill">Δ ${diffCount}</span>` : ''}
                  ${diffId ? `<button class="btn" onclick="showDiffById('${diffId}')" style="font-size: 0.6rem; padding: 1px 4px">View Δ</button>` : ''}
                </div>
                <pre style="background: var(--bg-card); padding: 10px; border-radius: 8px; max-height: 240px; overflow: auto; margin: 0; font-size: 0.7rem">${escapeHtml(JSON.stringify(result.response, null, 2))}</pre>
              </details>
            `;
      })
      .join('');
  }

  appendMessage('system', `🌐 Cross-server snapshot completed for ${toolName}`);

  if (btn) {
    btn.disabled = false;
    btn.textContent = '🌐 Run Across Servers';
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
  const serverSelect =
    side === 'current'
      ? document.getElementById('schemaServerSelectB')
      : document.getElementById('schemaServerSelect');
  const toolSelect =
    side === 'current'
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

  getSchemaFor(serverName, toolName)
    .then(schema => {
      if (!schema) {
        updateSchemaBaselineStatus('Schema not found for selected tool.', true);
        return;
      }
      const baselines = JSON.parse(localStorage.getItem(SCHEMA_BASELINE_KEY) || '{}');
      const key = `${serverName}::${toolName}`;
      baselines[key] = { schema, savedAt: new Date().toISOString() };
      localStorage.setItem(SCHEMA_BASELINE_KEY, JSON.stringify(baselines));
      updateSchemaBaselineStatus(`Baseline saved for ${toolName} (${serverName}).`);
    })
    .catch(error => {
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
        label2: labelB,
      }),
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
restoreSessionFromServer();
checkSharedSessionLink();
checkAuthStatus();
loadMCPStatus();
populateSystemPrompts();
updateTokenDisplay();
initEnvProfile();
if (typeof loadInspectorVariables === 'function') {
  loadInspectorVariables();
}
if (typeof loadInspectorAuthSettings === 'function') {
  loadInspectorAuthSettings();
}
if (typeof loadMockRecorderState === 'function') {
  loadMockRecorderState();
}
if (typeof renderMockRecorder === 'function') {
  renderMockRecorder();
}

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
if (typeof toggleInspectorInputMode === 'function') {
  window.toggleInspectorInputMode = toggleInspectorInputMode;
}
if (typeof fillInspectorDefaults === 'function') {
  window.fillInspectorDefaults = fillInspectorDefaults;
}
if (typeof saveInspectorVariables === 'function') {
  window.saveInspectorVariables = saveInspectorVariables;
}
if (typeof clearInspectorVariables === 'function') {
  window.clearInspectorVariables = clearInspectorVariables;
}
if (typeof showVariablesManager === 'function') {
  window.showVariablesManager = showVariablesManager;
}
if (typeof loadInspectorServers === 'function') {
  window.loadInspectorServers = loadInspectorServers;
}
window.appConfirm = appConfirm;
window.appAlert = appAlert;
window.appPrompt = appPrompt;
window.appFormModal = appFormModal;
if (typeof getGlobalVariables === 'function') {
  window.getGlobalVariables = getGlobalVariables;
}
if (typeof getEnvironmentVariables === 'function') {
  window.getEnvironmentVariables = getEnvironmentVariables;
}
if (typeof getRuntimeVariables === 'function') {
  window.getRuntimeVariables = getRuntimeVariables;
}
if (typeof toggleMockRecorder === 'function') {
  window.toggleMockRecorder = toggleMockRecorder;
}
if (typeof clearMockRecorder === 'function') {
  window.clearMockRecorder = clearMockRecorder;
}
if (typeof createMockFromRecorder === 'function') {
  window.createMockFromRecorder = createMockFromRecorder;
}
if (typeof recordMockEntry === 'function') {
  window.recordMockEntry = recordMockEntry;
}
if (typeof loadSchemaDiffServers === 'function') {
  window.loadSchemaDiffServers = loadSchemaDiffServers;
}
if (typeof loadSchemaDiffTools === 'function') {
  window.loadSchemaDiffTools = loadSchemaDiffTools;
}
if (typeof saveSchemaBaseline === 'function') {
  window.saveSchemaBaseline = saveSchemaBaseline;
}
if (typeof compareSchemaBaseline === 'function') {
  window.compareSchemaBaseline = compareSchemaBaseline;
}
if (typeof runSchemaDiff === 'function') {
  window.runSchemaDiff = runSchemaDiff;
}
window.getToolExecutionHistory = () => toolExecutionHistory;
window.getLocalScenarios = () => sessionManager.getScenarios();
window.createScenarioFromHistory = createScenarioFromHistory;
if (typeof runScenarioMatrix === 'function') {
  window.runScenarioMatrix = runScenarioMatrix;
}
if (typeof runScenarioDataset === 'function') {
  window.runScenarioDataset = runScenarioDataset;
}
if (typeof showDatasetManager === 'function') {
  window.showDatasetManager = showDatasetManager;
}
if (typeof loadCrossServerOptions === 'function') {
  window.loadCrossServerOptions = loadCrossServerOptions;
}
if (typeof updateCrossServerToolOptions === 'function') {
  window.updateCrossServerToolOptions = updateCrossServerToolOptions;
}
if (typeof toggleCrossServerSelection === 'function') {
  window.toggleCrossServerSelection = toggleCrossServerSelection;
}
if (typeof selectAllCrossServers === 'function') {
  window.selectAllCrossServers = selectAllCrossServers;
}
if (typeof runCrossServerCompare === 'function') {
  window.runCrossServerCompare = runCrossServerCompare;
}
if (typeof runInspectorMatrix === 'function') {
  window.runInspectorMatrix = runInspectorMatrix;
}
if (typeof generateFuzzCases === 'function') {
  window.generateFuzzCases = generateFuzzCases;
}
if (typeof saveBulkFailuresAsScenario === 'function') {
  window.saveBulkFailuresAsScenario = saveBulkFailuresAsScenario;
}
if (typeof saveBulkFailuresAsDataset === 'function') {
  window.saveBulkFailuresAsDataset = saveBulkFailuresAsDataset;
}
if (typeof exportBulkTestResultsText === 'function') {
  window.exportBulkTestResultsText = exportBulkTestResultsText;
}
if (typeof showOAuthSettingsModal === 'function') {
  window.showOAuthSettingsModal = showOAuthSettingsModal;
}
if (typeof hideOAuthSettingsModal === 'function') {
  window.hideOAuthSettingsModal = hideOAuthSettingsModal;
}
if (typeof saveOAuthSettings === 'function') {
  window.saveOAuthSettings = saveOAuthSettings;
}
if (typeof disableOAuthConfig === 'function') {
  window.disableOAuthConfig = disableOAuthConfig;
}
if (typeof resetProviderVisibility === 'function') {
  window.resetProviderVisibility = resetProviderVisibility;
}
if (typeof shareSessionLink === 'function') {
  window.shareSessionLink = shareSessionLink;
}
