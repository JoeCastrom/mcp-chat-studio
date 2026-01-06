/**
 * MockServerManager Unit Tests
 */

import { jest } from '@jest/globals';

// Mock file system operations
const mockFileData = new Map();

jest.unstable_mockModule('fs', () => ({
  readFileSync: jest.fn(path => {
    if (mockFileData.has(path)) {
      return mockFileData.get(path);
    }
    throw new Error(`File not found: ${path}`);
  }),
  writeFileSync: jest.fn((path, data) => {
    mockFileData.set(path, data);
  }),
  existsSync: jest.fn(path => {
    return mockFileData.has(path) || path.includes('data');
  }),
  mkdirSync: jest.fn(),
}));

// Import after mocking
const { MockServerManager, getMockServerManager: _getMockServerManager } =
  await import('../services/MockServerManager.js');

describe('MockServerManager', () => {
  let manager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFileData.clear();

    // Create fresh instance for each test
    manager = new MockServerManager();
  });

  describe('CRUD Operations', () => {
    test('createMock should create mock with name', () => {
      const mock = manager.createMock({
        name: 'Test Mock',
        description: 'A test mock server',
      });

      expect(mock.id).toBeDefined();
      expect(mock.id).toMatch(/^mock_/);
      expect(mock.name).toBe('Test Mock');
      expect(mock.description).toBe('A test mock server');
      expect(mock.tools).toEqual([]);
      expect(mock.callCount).toBe(0);
      expect(mock.createdAt).toBeDefined();
    });

    test('createMock should throw error when name is missing', () => {
      expect(() => manager.createMock({ description: 'No name' })).toThrow('Mock name is required');
    });

    test('createMock should apply default values', () => {
      const mock = manager.createMock({ name: 'Minimal' });

      expect(mock.description).toBe('');
      expect(mock.tools).toEqual([]);
      expect(mock.resources).toEqual([]);
      expect(mock.prompts).toEqual([]);
      expect(mock.delay).toBe(0);
      expect(mock.errorRate).toBe(0);
    });

    test('getAllMocks should return all mocks', () => {
      manager.createMock({ name: 'Mock 1' });
      manager.createMock({ name: 'Mock 2' });

      const mocks = manager.getAllMocks();

      expect(mocks).toHaveLength(2);
      expect(mocks[0].name).toBe('Mock 1');
      expect(mocks[1].name).toBe('Mock 2');
    });

    test('getMock should return mock by ID', () => {
      const created = manager.createMock({ name: 'Test Mock' });
      const retrieved = manager.getMock(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.name).toBe('Test Mock');
    });

    test('getMock should throw error for non-existent ID', () => {
      expect(() => manager.getMock('nonexistent_id')).toThrow('Mock nonexistent_id not found');
    });

    test('updateMock should update mock properties', () => {
      const created = manager.createMock({ name: 'Original' });
      const updated = manager.updateMock(created.id, { name: 'Updated' });

      expect(updated.name).toBe('Updated');
      expect(updated.id).toBe(created.id); // ID preserved
      expect(updated.callCount).toBe(0); // Stats preserved
    });

    test('deleteMock should remove mock', () => {
      const created = manager.createMock({ name: 'To Delete' });

      const result = manager.deleteMock(created.id);

      expect(result.success).toBe(true);
      expect(() => manager.getMock(created.id)).toThrow();
    });
  });

  describe('Tool Calls', () => {
    test('callTool should return tool response', async () => {
      const mock = manager.createMock({
        name: 'API Mock',
        tools: [
          {
            name: 'get_user',
            description: 'Get user by ID',
            inputSchema: { type: 'object' },
            response: { id: '{{userId}}', name: 'Test User' },
          },
        ],
      });

      const result = await manager.callTool(mock.id, 'get_user', { userId: '123' });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.isError).toBe(false);

      // Check variable substitution worked
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe('123');
    });

    test('callTool should throw error for non-existent tool', async () => {
      const mock = manager.createMock({ name: 'Empty Mock' });

      await expect(manager.callTool(mock.id, 'nonexistent', {})).rejects.toThrow(
        'Tool nonexistent not found'
      );
    });

    test('callTool should increment call count', async () => {
      const mock = manager.createMock({
        name: 'Counter Mock',
        tools: [{ name: 'test', response: 'ok' }],
      });

      expect(mock.callCount).toBe(0);

      await manager.callTool(mock.id, 'test', {});
      await manager.callTool(mock.id, 'test', {});

      const updated = manager.getMock(mock.id);
      expect(updated.callCount).toBe(2);
    });

    test('callTool should respect delay setting', async () => {
      const mock = manager.createMock({
        name: 'Slow Mock',
        delay: 100,
        tools: [{ name: 'slow', response: 'done' }],
      });

      const start = Date.now();
      await manager.callTool(mock.id, 'slow', {});
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(100);
    });

    test('callTool should simulate errors based on errorRate', async () => {
      const mock = manager.createMock({
        name: 'Flaky Mock',
        errorRate: 1.0, // Always fail
        tools: [{ name: 'flaky', response: 'ok' }],
      });

      await expect(manager.callTool(mock.id, 'flaky', {})).rejects.toThrow('Simulated error');
    });
  });

  describe('Variable Substitution', () => {
    test('substituteVariables should replace {{var}} in strings', () => {
      const result = manager.substituteVariables('Hello {{name}}!', { name: 'World' });

      expect(result).toBe('Hello World!');
    });

    test('substituteVariables should handle nested objects', () => {
      const result = manager.substituteVariables(
        { user: '{{username}}', id: '{{userId}}' },
        { username: 'john', userId: '123' }
      );

      expect(result).toEqual({ user: 'john', id: '123' });
    });

    test('substituteVariables should handle arrays', () => {
      const result = manager.substituteVariables(['{{a}}', '{{b}}'], { a: 'first', b: 'second' });

      expect(result).toEqual(['first', 'second']);
    });

    test('substituteVariables should preserve unmatched variables', () => {
      const result = manager.substituteVariables('{{unknown}}', { name: 'value' });

      expect(result).toBe('{{unknown}}');
    });
  });

  describe('Resources', () => {
    test('getResource should return resource content', async () => {
      const mock = manager.createMock({
        name: 'Resource Mock',
        resources: [
          {
            uri: 'file://test.txt',
            name: 'Test File',
            mimeType: 'text/plain',
            content: 'File content here',
          },
        ],
      });

      const result = await manager.getResource(mock.id, 'file://test.txt');

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('file://test.txt');
      expect(result.contents[0].text).toBe('File content here');
    });

    test('getResource should throw for non-existent resource', async () => {
      const mock = manager.createMock({ name: 'Empty' });

      await expect(manager.getResource(mock.id, 'file://missing')).rejects.toThrow(
        'Resource file://missing not found'
      );
    });

    test('listResources should return resource list', () => {
      const mock = manager.createMock({
        name: 'Resource Mock',
        resources: [
          {
            uri: 'file://a.txt',
            name: 'File A',
            description: 'First file',
            mimeType: 'text/plain',
          },
        ],
      });

      const result = manager.listResources(mock.id);

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].uri).toBe('file://a.txt');
    });
  });

  describe('Prompts', () => {
    test('getPrompt should return prompt with substitution', async () => {
      const mock = manager.createMock({
        name: 'Prompt Mock',
        prompts: [
          {
            name: 'greeting',
            description: 'A greeting prompt',
            messages: [{ role: 'user', content: 'Hello {{name}}' }],
          },
        ],
      });

      const result = await manager.getPrompt(mock.id, 'greeting', { name: 'Alice' });

      expect(result.description).toBe('A greeting prompt');
      expect(result.messages[0].content).toBe('Hello Alice');
    });

    test('listPrompts should return prompt list', () => {
      const mock = manager.createMock({
        name: 'Prompt Mock',
        prompts: [
          {
            name: 'test_prompt',
            description: 'A test prompt',
            arguments: [],
          },
        ],
      });

      const result = manager.listPrompts(mock.id);

      expect(result.prompts).toHaveLength(1);
      expect(result.prompts[0].name).toBe('test_prompt');
    });
  });

  describe('Statistics', () => {
    test('getStatistics should return correct counts', () => {
      manager.createMock({ name: 'Mock 1' });
      manager.createMock({ name: 'Mock 2' });

      const stats = manager.getStatistics();

      expect(stats.totalMocks).toBe(2);
      expect(stats.totalCalls).toBe(0);
      expect(stats.avgCallsPerMock).toBe(0);
    });

    test('resetStats should clear call counts', async () => {
      const mock = manager.createMock({
        name: 'Counter',
        tools: [{ name: 'test', response: 'ok' }],
      });

      await manager.callTool(mock.id, 'test', {});
      expect(manager.getMock(mock.id).callCount).toBe(1);

      manager.resetStats(mock.id);
      expect(manager.getMock(mock.id).callCount).toBe(0);
    });

    test('resetStats without ID should clear all', async () => {
      const mock1 = manager.createMock({
        name: 'Mock 1',
        tools: [{ name: 'test', response: 'ok' }],
      });
      const mock2 = manager.createMock({
        name: 'Mock 2',
        tools: [{ name: 'test', response: 'ok' }],
      });

      await manager.callTool(mock1.id, 'test', {});
      await manager.callTool(mock2.id, 'test', {});

      manager.resetStats();

      expect(manager.getMock(mock1.id).callCount).toBe(0);
      expect(manager.getMock(mock2.id).callCount).toBe(0);
    });
  });

  describe('Create From Collection', () => {
    test('createFromCollection should generate mock from scenarios', () => {
      const mock = manager.createFromCollection('col_123', 'Test Collection', [
        { name: 'Get User', description: 'Fetch user data', expectedOutput: { id: 1 } },
        { name: 'Create User', description: 'Create new user', expectedOutput: { success: true } },
      ]);

      expect(mock.name).toBe('Mock: Test Collection');
      expect(mock.tools).toHaveLength(2);
      expect(mock.tools[0].name).toBe('get_user');
      expect(mock.tools[1].name).toBe('create_user');
    });
  });

  describe('List Tools', () => {
    test('listTools should return tool definitions', () => {
      const mock = manager.createMock({
        name: 'Tool Mock',
        tools: [
          {
            name: 'my_tool',
            description: 'Does something',
            inputSchema: { type: 'object', properties: { param: { type: 'string' } } },
            response: 'result',
          },
        ],
      });

      const result = manager.listTools(mock.id);

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('my_tool');
      expect(result.tools[0].description).toBe('Does something');
      expect(result.tools[0].inputSchema).toBeDefined();
    });
  });
});
