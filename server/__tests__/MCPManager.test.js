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
  Client: jest.fn(() => new MockClient())
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: jest.fn(),
  getDefaultEnvironment: jest.fn(() => ({}))
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/client/sse.js', () => ({
  SSEClientTransport: jest.fn()
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
  });

  describe('Configuration Management', () => {
    test('should add server configuration', async () => {
      const config = {
        type: 'stdio',
        command: 'python',
        args: ['-m', 'test_server'],
        env: { API_KEY: 'test' }
      };

      await manager.addServer('test-server', config);

      expect(manager.configs.has('test-server')).toBe(true);
      expect(manager.configs.get('test-server')).toEqual(config);
    });

    test('should remove server', async () => {
      const config = {
        type: 'stdio',
        command: 'python',
        args: ['-m', 'test_server']
      };

      await manager.addServer('test-server', config);
      await manager.removeServer('test-server');

      expect(manager.configs.has('test-server')).toBe(false);
    });
  });

  describe('Connection Management', () => {
    test('should connect to STDIO server', async () => {
      const config = {
        type: 'stdio',
        command: 'python',
        args: ['-m', 'test_server']
      };

      mockConnect.mockResolvedValue(true);
      mockListTools.mockResolvedValue({ tools: [] });

      await manager.addServer('test-server', config);
      await manager.connect('test-server');

      expect(mockConnect).toHaveBeenCalled();
    });

    test('should disconnect from server', async () => {
      const config = {
        type: 'stdio',
        command: 'python',
        args: ['-m', 'test_server']
      };

      mockConnect.mockResolvedValue(true);
      mockListTools.mockResolvedValue({ tools: [] });
      mockClose.mockResolvedValue(true);

      await manager.addServer('test-server', config);
      await manager.connect('test-server');
      await manager.disconnect('test-server');

      expect(mockClose).toHaveBeenCalled();
    });

    test('should handle connection errors', async () => {
      const config = {
        type: 'stdio',
        command: 'invalid-command',
        args: []
      };

      mockConnect.mockRejectedValue(new Error('Connection failed'));

      await manager.addServer('test-server', config);

      await expect(manager.connect('test-server')).rejects.toThrow('Connection failed');
    });
  });

  describe('Tool Operations', () => {
    beforeEach(async () => {
      const config = {
        type: 'stdio',
        command: 'python',
        args: ['-m', 'test_server']
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
                param: { type: 'string' }
              }
            }
          }
        ]
      });

      await manager.addServer('test-server', config);
      await manager.connect('test-server');
    });

    test('should list all tools', () => {
      const tools = manager.getAllTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test_tool');
      expect(tools[0].serverName).toBe('test-server');
    });

    test('should call tool successfully', async () => {
      const expectedResult = {
        content: [{ type: 'text', text: 'Tool result' }]
      };

      mockCallTool.mockResolvedValue(expectedResult);

      const result = await manager.callTool('test-server', 'test_tool', { param: 'value' });

      expect(mockCallTool).toHaveBeenCalledWith('test_tool', { param: 'value' });
      expect(result).toEqual(expectedResult);
    });

    test('should handle tool call errors', async () => {
      mockCallTool.mockRejectedValue(new Error('Tool execution failed'));

      await expect(
        manager.callTool('test-server', 'test_tool', { param: 'value' })
      ).rejects.toThrow('Tool execution failed');
    });
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
        args: ['-m', 'test_server']
      };

      mockConnect.mockResolvedValue(true);
      mockListTools.mockResolvedValue({ tools: [] });

      await manager.addServer('test-server', config);
      await manager.connect('test-server');

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
        requiresAuth: true
      };

      mockConnect.mockResolvedValue(true);
      mockListTools.mockResolvedValue({ tools: [] });

      await manager.addServer('auth-server', config);
      await manager.connect('auth-server', null, 'test-token');

      expect(mockConnect).toHaveBeenCalled();
    });
  });

  describe('Multi-user Support', () => {
    test('should isolate connections by session', async () => {
      const config = {
        type: 'stdio',
        command: 'python',
        args: ['-m', 'test_server']
      };

      mockConnect.mockResolvedValue(true);
      mockListTools.mockResolvedValue({ tools: [] });

      await manager.addServer('test-server', config);
      await manager.connect('test-server', 'session1');
      await manager.connect('test-server', 'session2');

      const status1 = manager.getStatus('session1');
      const status2 = manager.getStatus('session2');

      expect(status1['test-server']?.connected).toBe(true);
      expect(status2['test-server']?.connected).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle calling tool on disconnected server', async () => {
      await expect(
        manager.callTool('nonexistent-server', 'test_tool', {})
      ).rejects.toThrow();
    });

    test('should handle invalid server configuration', async () => {
      const config = {
        // Missing required fields
        type: 'invalid'
      };

      await expect(
        manager.addServer('invalid-server', config)
      ).rejects.toThrow();
    });
  });
});
