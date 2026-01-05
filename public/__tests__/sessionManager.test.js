/**
 * Frontend Unit Tests - Session Manager
 * Tests for the sessionManager object in app.js
 */

// Since app.js is a large monolithic file, we extract testable functions
// These tests verify the session manager logic patterns

describe('SessionManager', () => {
  // Create a mock sessionManager following the pattern from app.js
  const sessionManager = {
    STORAGE_KEY: 'mcp_chat_studio_session',
    SCENARIOS_KEY: 'mcp_chat_studio_scenarios',
    PROMPTS_KEY: 'mcp_chat_studio_prompts',
    TOKENS_KEY: 'mcp_chat_studio_tokens',
    SUITES_KEY: 'mcp_chat_studio_suites',
    BRANCHES_KEY: 'mcp_chat_studio_branches',
    FAVORITES_KEY: 'mcp_chat_studio_favorites',

    getWelcomeMessage() {
      return {
        role: 'assistant',
        content: '👋 Welcome to **MCP Chat Studio**! I\'m your AI assistant with MCP tool support.',
      };
    },

    save(data) {
      const session = {
        messages: data.messages || [],
        toolHistory: data.toolHistory || [],
        settings: data.settings || {},
        timestamp: Date.now(),
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    },

    load() {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
          return session;
        }
      }
      return null;
    },

    clear() {
      localStorage.removeItem(this.STORAGE_KEY);
    },

    saveMessages(messages) {
      const session = this.load() || {};
      session.messages = messages;
      this.save(session);
    },

    logToolExecution(entry) {
      const session = this.load() || {};
      session.toolHistory = session.toolHistory || [];
      session.toolHistory.unshift(entry);
      if (session.toolHistory.length > 100) {
        session.toolHistory = session.toolHistory.slice(0, 100);
      }
      this.save(session);
    },

    getToolHistory() {
      const session = this.load();
      return session?.toolHistory || [];
    },

    // Scenarios
    saveScenario(scenario) {
      const scenarios = this.getScenarios();
      scenario.id = `scenario_${Date.now()}`;
      scenario.created = new Date().toISOString();
      scenarios.unshift(scenario);
      localStorage.setItem(this.SCENARIOS_KEY, JSON.stringify(scenarios));
      return scenario.id;
    },

    getScenarios() {
      const stored = localStorage.getItem(this.SCENARIOS_KEY);
      return stored ? JSON.parse(stored) : [];
    },

    getScenario(id) {
      return this.getScenarios().find(s => s.id === id);
    },

    deleteScenario(id) {
      const scenarios = this.getScenarios().filter(s => s.id !== id);
      localStorage.setItem(this.SCENARIOS_KEY, JSON.stringify(scenarios));
    },

    // Token estimation
    estimateTokens(text) {
      if (!text) return 0;
      return Math.ceil(String(text).length / 4);
    },

    // Favorites
    getFavorites() {
      const stored = localStorage.getItem(this.FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    },

    toggleFavorite(toolFullName) {
      const favorites = this.getFavorites();
      const index = favorites.indexOf(toolFullName);
      if (index >= 0) {
        favorites.splice(index, 1);
      } else {
        favorites.push(toolFullName);
      }
      localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(favorites));
      return index < 0;
    },

    isFavorite(toolFullName) {
      return this.getFavorites().includes(toolFullName);
    },

    // Branches
    getBranches() {
      const stored = localStorage.getItem(this.BRANCHES_KEY);
      return stored ? JSON.parse(stored) : [];
    },

    createBranch(name, messages, forkAtIndex) {
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
    },

    loadBranch(branchId) {
      const branch = this.getBranches().find(b => b.id === branchId);
      return branch?.messages || null;
    },

    deleteBranch(id) {
      const branches = this.getBranches().filter(b => b.id !== id);
      localStorage.setItem(this.BRANCHES_KEY, JSON.stringify(branches));
    },
  };

  beforeEach(() => {
    localStorage.clear();
  });

  describe('Session Storage', () => {
    test('getWelcomeMessage returns assistant message', () => {
      const msg = sessionManager.getWelcomeMessage();
      
      expect(msg.role).toBe('assistant');
      expect(msg.content).toContain('MCP Chat Studio');
    });

    test('save and load session', () => {
      const data = {
        messages: [{ role: 'user', content: 'Hello' }],
        toolHistory: [{ tool: 'test', timestamp: Date.now() }],
        settings: { theme: 'dark' }
      };

      sessionManager.save(data);
      const loaded = sessionManager.load();

      expect(loaded.messages).toEqual(data.messages);
      expect(loaded.toolHistory).toEqual(data.toolHistory);
      expect(loaded.settings).toEqual(data.settings);
    });

    test('load returns null for expired session', () => {
      // Save session with old timestamp
      const oldSession = {
        messages: [],
        timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      };
      localStorage.setItem(sessionManager.STORAGE_KEY, JSON.stringify(oldSession));

      const loaded = sessionManager.load();

      expect(loaded).toBeNull();
    });

    test('clear removes session', () => {
      sessionManager.save({ messages: [{ role: 'user', content: 'test' }] });
      sessionManager.clear();

      expect(localStorage.getItem(sessionManager.STORAGE_KEY)).toBeNull();
    });
  });

  describe('Tool History', () => {
    test('logToolExecution adds to history', () => {
      sessionManager.logToolExecution({ tool: 'test1', timestamp: 1 });
      sessionManager.logToolExecution({ tool: 'test2', timestamp: 2 });

      const history = sessionManager.getToolHistory();

      expect(history).toHaveLength(2);
      expect(history[0].tool).toBe('test2'); // Most recent first
    });

    test('history is capped at 100 entries', () => {
      for (let i = 0; i < 110; i++) {
        sessionManager.logToolExecution({ tool: `tool_${i}` });
      }

      const history = sessionManager.getToolHistory();

      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Scenarios', () => {
    test('saveScenario creates with ID and timestamp', () => {
      const id = sessionManager.saveScenario({ name: 'Test Scenario' });

      expect(id).toMatch(/^scenario_/);
      
      const scenario = sessionManager.getScenario(id);
      expect(scenario.name).toBe('Test Scenario');
      expect(scenario.created).toBeDefined();
    });

    test('deleteScenario removes scenario', () => {
      const id = sessionManager.saveScenario({ name: 'To Delete' });
      sessionManager.deleteScenario(id);

      expect(sessionManager.getScenario(id)).toBeUndefined();
    });
  });

  describe('Token Estimation', () => {
    test('estimateTokens returns 0 for empty input', () => {
      expect(sessionManager.estimateTokens('')).toBe(0);
      expect(sessionManager.estimateTokens(null)).toBe(0);
    });

    test('estimateTokens approximates 4 chars per token', () => {
      expect(sessionManager.estimateTokens('test')).toBe(1); // 4 chars
      expect(sessionManager.estimateTokens('hello world')).toBe(3); // 11 chars
      expect(sessionManager.estimateTokens('a'.repeat(100))).toBe(25); // 100 chars
    });
  });

  describe('Favorites', () => {
    test('toggleFavorite adds and removes', () => {
      const result1 = sessionManager.toggleFavorite('server/tool');
      expect(result1).toBe(true); // Added
      expect(sessionManager.isFavorite('server/tool')).toBe(true);

      const result2 = sessionManager.toggleFavorite('server/tool');
      expect(result2).toBe(false); // Removed
      expect(sessionManager.isFavorite('server/tool')).toBe(false);
    });

    test('getFavorites returns empty array by default', () => {
      expect(sessionManager.getFavorites()).toEqual([]);
    });
  });

  describe('Branches', () => {
    test('createBranch creates with forked messages', () => {
      const messages = [
        { role: 'user', content: 'msg1' },
        { role: 'assistant', content: 'msg2' },
        { role: 'user', content: 'msg3' },
      ];

      const branch = sessionManager.createBranch('Test Branch', messages, 1);

      expect(branch.id).toMatch(/^branch_/);
      expect(branch.name).toBe('Test Branch');
      expect(branch.messages).toHaveLength(2); // Forked at index 1
      expect(branch.forkPoint).toBe(1);
    });

    test('loadBranch returns messages', () => {
      const messages = [{ role: 'user', content: 'test' }];
      const branch = sessionManager.createBranch('Test', messages, 0);

      const loaded = sessionManager.loadBranch(branch.id);

      expect(loaded).toEqual([messages[0]]);
    });

    test('deleteBranch removes branch', () => {
      const branch = sessionManager.createBranch('ToDelete', [], 0);
      sessionManager.deleteBranch(branch.id);

      expect(sessionManager.loadBranch(branch.id)).toBeNull();
    });
  });
});

describe('Utility Functions', () => {
  describe('escapeHtml', () => {
    // Replicate the escapeHtml function from app.js
    function escapeHtml(str) {
      if (!str) return '';
      const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return String(str).replace(/[&<>"']/g, m => escapeMap[m]);
    }

    test('escapes HTML entities', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
      expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
      expect(escapeHtml("'single'")).toBe('&#39;single&#39;');
      expect(escapeHtml('A & B')).toBe('A &amp; B');
    });

    test('handles empty and null', () => {
      expect(escapeHtml('')).toBe('');
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    test('handles nested tags', () => {
      const input = '<div onclick="alert(1)">XSS</div>';
      const output = escapeHtml(input);
      
      expect(output).not.toContain('<');
      expect(output).not.toContain('>');
      expect(output).toBe('&lt;div onclick=&quot;alert(1)&quot;&gt;XSS&lt;/div&gt;');
    });
  });

  describe('JSON parsing helpers', () => {
    function tryParseJson(value) {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }

    test('parses valid JSON', () => {
      expect(tryParseJson('{"key": "value"}')).toEqual({ key: 'value' });
      expect(tryParseJson('[1, 2, 3]')).toEqual([1, 2, 3]);
    });

    test('returns null for invalid JSON', () => {
      expect(tryParseJson('not json')).toBeNull();
      expect(tryParseJson(undefined)).toBeNull();
    });
  });

  describe('Cache management', () => {
    // Replicate diff cache pattern from app.js
    const cache = new Map();
    let cacheId = 0;

    function cacheData(data) {
      const id = `item_${++cacheId}`;
      cache.set(id, data);
      // Cleanup old entries
      if (cache.size > 50) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      return id;
    }

    test('caches and retrieves data', () => {
      const id = cacheData({ expected: 'a', actual: 'b' });
      
      expect(cache.has(id)).toBe(true);
      expect(cache.get(id)).toEqual({ expected: 'a', actual: 'b' });
    });

    test('limits cache size', () => {
      cache.clear();
      cacheId = 0;

      for (let i = 0; i < 60; i++) {
        cacheData({ value: i });
      }

      expect(cache.size).toBeLessThanOrEqual(50);
    });
  });
});
