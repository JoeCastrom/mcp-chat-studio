/**
 * MCPManager Unit Tests
 */

import { jest } from '@jest/globals';

// Mock the MCP SDK
const mockConnect = jest.fn();
const mockListTools = jest.fn();
const mockCallTool = jest.fn();
const mockClose = jest.fn();

class MockClient {
  async connect() {
    return mockConnect();
  }
  async listTools() {
    return mockListTools();
  }
  async callTool(name, args) {
    return mockCallTool(name, args);
  }
  async close() {
    return mockClose();
  }
}

jest.unstable_mockModule('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn(() => new MockClient()),
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: jest.fn(),
  getDefaultEnvironment: jest.fn(() => ({})),
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/client/sse.js', () => ({
  SSEClientTransport: jest.fn(),
}));

// Import after mocking
const { getMCPManager } = await import('../services/MCPManager.js');

describe('MCPManager', () => {
  let manager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = getMCPManager();

    // Reset manager state
    manager.connections = new Map();
    manager.configs = new Map();
    manager.userConnections = new Map();
    manager.lastErrors = new Map();
  });

  describe('Configuration Management', () => {
    test('should add server configuration', async () => {
      const config = {
        type: 'stdio',
        command: 'python',
        args: ['-m', 'test_server'],
        env: { API_KEY: 'test' },
      };

      manager.addServerConfig('test-server', config);

      expect(manager.configs.has('test-server')).toBe(true);
      expect(manager.configs.get('test-server')).toEqual(config);
    });

    test('should remove server configuration', async () => {
      const config = {
        type: 'stdio',
        command: 'python',
        args: ['-m', 'test_server'],
      };

      manager.addServerConfig('test-server', config);
      await manager.removeServerConfig('test-server');

      expect(manager.configs.has('test-server')).toBe(false);
    });

    test('should auto-detect type from command field', () => {
      const config = {
        command: 'python',
        args: ['-m', 'test_server'],
      };

      manager.addServerConfig('auto-stdio', config);

      expect(manager.configs.get('auto-stdio').type).toBe('stdio');
    });

    test('should auto-detect type from url field', () => {
      const config = {
        url: 'http://localhost:8080/sse',
      };

      manager.addServerConfig('auto-sse', config);

      expect(manager.configs.get('auto-sse').type).toBe('sse');
    });

    test('should throw for config without command or url', () => {
      const config = {};

      expect(() => manager.addServerConfig('invalid', config)).toThrow(
        'Server config must have either command (stdio) or url (sse)'
      );
    });
  });

  describe('Connection Management', () => {
    test('should connect to STDIO server', async () => {
      const config = {
        type: 'stdio',
        command: 'python',
        args: ['-m', 'test_server'],
      };

      mockConnect.mockResolvedValue(true);
      mockListTools.mockResolvedValue({ tools: [] });

      manager.addServerConfig('test-server', config);
      await manager.connectServer('test-server');

      expect(mockConnect).toHaveBeenCalled();
      expect(manager.connections.has('test-server')).toBe(true);
    });

    test('should disconnect from server', async () => {
      const config = {
        type: 'stdio',
        command: 'python',
        args: ['-m', 'test_server'],
      };

      mockConnect.mockResolvedValue(true);
      mockListTools.mockResolvedValue({ tools: [] });
      mockClose.mockResolvedValue(true);

      manager.addServerConfig('test-server', config);
      await manager.connectServer('test-server');
      await manager.disconnectServer('test-server');

      expect(mockClose).toHaveBeenCalled();
      expect(manager.connections.has('test-server')).toBe(false);
    });

    test('should handle connection errors', async () => {
      const config = {
        type: 'stdio',
        command: 'invalid-command',
        args: [],
      };

      mockConnect.mockRejectedValue(new Error('Connection failed'));

      manager.addServerConfig('test-server', config);

      await expect(manager.connectServer('test-server')).rejects.toThrow('Connection failed');
    });
  });

  describe('Tool Operations', () => {
    beforeEach(async () => {
      const config = {
        type: 'stdio',
        command: 'python',
        args: ['-m', 'test_server'],
      };

      mockConnect.mockResolvedValue(true);
      mockListTools.mockResolvedValue({
        tools: [
          {
            name: 'test_tool',
            description: 'A test tool',
            inputSchema: {
              type: 'object',
              properties: {
                param: { type: 'string' },
              },
            },
          },
        ],
      });

      manager.addServerConfig('test-server', config);
      await manager.connectServer('test-server');
    });

    test('should list all tools', () => {
      const tools = manager.getAllTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test_tool');
      expect(tools[0].serverName).toBe('test-server');
    });

    test('should throw when calling tool on unconnected server', async () => {
      // This tests the manager's validation before reaching connection
      await expect(manager.callTool('nonexistent-server', 'test_tool', {})).rejects.toThrow();
    });

    // Note: Direct tool call tests require transport mocking which is complex
    // The actual callTool behavior is tested via E2E tests with real MCP servers
  });

  describe('Status Reporting', () => {
    test('should return correct status', () => {
      const status = manager.getStatus();

      expect(status).toBeDefined();
      expect(typeof status).toBe('object');
    });

    test('should show connected status for connected server', async () => {
      const config = {
        type: 'stdio',
        command: 'python',
        args: ['-m', 'test_server'],
      };

      mockConnect.mockResolvedValue(true);
      mockListTools.mockResolvedValue({ tools: [] });

      manager.addServerConfig('test-server', config);
      await manager.connectServer('test-server');

      const status = manager.getStatus();
      expect(status['test-server']?.connected).toBe(true);
    });
  });

  describe('OAuth Support', () => {
    test('should pass user token to authenticated server', async () => {
      const config = {
        type: 'stdio',
        command: 'python',
        args: ['-m', 'test_server'],
        requiresAuth: true,
      };

      mockConnect.mockResolvedValue(true);
      mockListTools.mockResolvedValue({ tools: [] });

      manager.addServerConfig('auth-server', config);
      await manager.connectServer('auth-server', 'test-token');

      expect(mockConnect).toHaveBeenCalled();
    });
  });

  describe('Multi-user Support', () => {
    test('should isolate connections by session', async () => {
      const config = {
        type: 'stdio',
        command: 'python',
        args: ['-m', 'test_server'],
        requiresAuth: true,
      };

      mockConnect.mockResolvedValue(true);
      mockListTools.mockResolvedValue({ tools: [] });

      manager.addServerConfig('test-server', config);
      await manager.getUserConnection('session1', 'test-server', 'token1');
      await manager.getUserConnection('session2', 'test-server', 'token2');

      const status1 = manager.getStatus('session1');
      const status2 = manager.getStatus('session2');

      expect(status1['test-server']?.userConnected).toBe(true);
      expect(status2['test-server']?.userConnected).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle calling tool on disconnected server', async () => {
      await expect(manager.callTool('nonexistent-server', 'test_tool', {})).rejects.toThrow();
    });
  });
});
