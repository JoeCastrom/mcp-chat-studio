/**
 * CollectionManager Unit Tests
 */

import { jest } from '@jest/globals';

// Mock file system operations
const mockFileData = new Map();
const mockDirContents = new Map();

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
    return mockFileData.has(path) || mockDirContents.has(path) || path.includes('collections');
  }),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(path => {
    return mockDirContents.get(path) || [];
  }),
  unlinkSync: jest.fn(path => {
    mockFileData.delete(path);
  }),
}));

// Mock MCPManager
jest.unstable_mockModule('../services/MCPManager.js', () => ({
  getMCPManager: jest.fn(() => ({
    callTool: jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: '{"status": "success", "data": {"id": 123}}' }],
    }),
  })),
}));

// Mock ScriptRunner
jest.unstable_mockModule('../services/ScriptRunner.js', () => ({
  getScriptRunner: jest.fn(() => ({
    executeAllPreScripts: jest.fn().mockResolvedValue({ variables: {} }),
    executeAllPostScripts: jest
      .fn()
      .mockResolvedValue({ context: { variables: {} }, assertions: [] }),
  })),
}));

// Import after mocking
const { CollectionManager, getCollectionManager } =
  await import('../services/CollectionManager.js');

describe('CollectionManager', () => {
  let manager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFileData.clear();
    mockDirContents.clear();

    // Create fresh instance for each test
    manager = new CollectionManager();
  });

  describe('CRUD Operations', () => {
    test('createCollection should create collection with name and description', () => {
      const collection = manager.createCollection({
        name: 'Test Collection',
        description: 'A test collection',
      });

      expect(collection.id).toBeDefined();
      expect(collection.name).toBe('Test Collection');
      expect(collection.description).toBe('A test collection');
      expect(collection.scenarios).toEqual([]);
      expect(collection.createdAt).toBeDefined();
      expect(collection.updatedAt).toBeDefined();
    });

    test('createCollection should throw error when name is missing', () => {
      expect(() => manager.createCollection({ description: 'No name' })).toThrow(
        'Collection name is required'
      );
    });

    test('createCollection should create with default values', () => {
      const collection = manager.createCollection({ name: 'Minimal' });

      expect(collection.description).toBe('');
      expect(collection.scenarios).toEqual([]);
      expect(collection.variables).toEqual({});
      expect(collection.auth).toBeNull();
    });

    test('generateId should create unique IDs', () => {
      const id1 = manager.generateId();
      const id2 = manager.generateId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^col_/);
    });
  });

  describe('Variable Substitution', () => {
    test('applyTemplateVariables should replace {{var}} in strings', () => {
      const result = manager.applyTemplateVariables('Hello {{name}}!', { name: 'World' });

      expect(result).toBe('Hello World!');
    });

    test('applyTemplateVariables should handle nested objects', () => {
      const result = manager.applyTemplateVariables(
        { greeting: 'Hello {{name}}', count: '{{count}}' },
        { name: 'Test', count: 5 }
      );

      expect(result.greeting).toBe('Hello Test');
      expect(result.count).toBe(5);
    });

    test('applyTemplateVariables should handle arrays', () => {
      const result = manager.applyTemplateVariables(['{{a}}', '{{b}}'], {
        a: 'first',
        b: 'second',
      });

      expect(result).toEqual(['first', 'second']);
    });

    test('applyTemplateVariables should preserve unmatched variables', () => {
      const result = manager.applyTemplateVariables('Hello {{unknown}}!', { name: 'World' });

      expect(result).toBe('Hello {{unknown}}!');
    });

    test('applyTemplateVariables should handle nested variable paths', () => {
      const result = manager.applyTemplateVariables('{{user.name}}', { user: { name: 'John' } });

      expect(result).toBe('John');
    });
  });

  describe('Assertions', () => {
    test('evaluateSingleAssertion - equals operator', () => {
      const result = manager.evaluateSingleAssertion(
        { status: 'success' },
        { path: '$.status', operator: 'equals', value: 'success' }
      );

      expect(result.passed).toBe(true);
    });

    test('evaluateSingleAssertion - not_equals operator', () => {
      const result = manager.evaluateSingleAssertion(
        { status: 'success' },
        { path: '$.status', operator: 'not_equals', value: 'failure' }
      );

      expect(result.passed).toBe(true);
    });

    test('evaluateSingleAssertion - contains operator', () => {
      const result = manager.evaluateSingleAssertion(
        { message: 'Hello World' },
        { path: '$.message', operator: 'contains', value: 'World' }
      );

      expect(result.passed).toBe(true);
    });

    test('evaluateSingleAssertion - exists operator', () => {
      const result = manager.evaluateSingleAssertion(
        { data: { id: 123 } },
        { path: '$.data.id', operator: 'exists', value: true }
      );

      expect(result.passed).toBe(true);
    });

    test('evaluateSingleAssertion - not_exists operator', () => {
      const result = manager.evaluateSingleAssertion(
        { data: { id: 123 } },
        { path: '$.data.missing', operator: 'not_exists', value: true }
      );

      expect(result.passed).toBe(true);
    });

    test('evaluateSingleAssertion - type operator', () => {
      const result = manager.evaluateSingleAssertion(
        { items: [1, 2, 3] },
        { path: '$.items', operator: 'type', value: 'array' }
      );

      expect(result.passed).toBe(true);
    });

    test('evaluateSingleAssertion - length operator', () => {
      const result = manager.evaluateSingleAssertion(
        { items: [1, 2, 3] },
        { path: '$.items', operator: 'length', value: 3 }
      );

      expect(result.passed).toBe(true);
    });

    test('evaluateSingleAssertion - gt operator', () => {
      const result = manager.evaluateSingleAssertion(
        { count: 10 },
        { path: '$.count', operator: 'gt', value: 5 }
      );

      expect(result.passed).toBe(true);
    });

    test('evaluateSingleAssertion - lt operator', () => {
      const result = manager.evaluateSingleAssertion(
        { count: 3 },
        { path: '$.count', operator: 'lt', value: 5 }
      );

      expect(result.passed).toBe(true);
    });

    test('evaluateSingleAssertion - matches operator', () => {
      const result = manager.evaluateSingleAssertion(
        { email: 'test@example.com' },
        { path: '$.email', operator: 'matches', value: '.*@example\\.com' }
      );

      expect(result.passed).toBe(true);
    });
  });

  describe('JSONPath Resolution', () => {
    test('getValueAtPath should get root value', () => {
      const result = manager.getValueAtPath({ a: 1 }, '$');
      expect(result).toEqual({ a: 1 });
    });

    test('getValueAtPath should get nested value', () => {
      const result = manager.getValueAtPath(
        { data: { user: { name: 'John' } } },
        '$.data.user.name'
      );
      expect(result).toBe('John');
    });

    test('getValueAtPath should get array element', () => {
      const result = manager.getValueAtPath({ items: ['a', 'b', 'c'] }, '$.items[1]');
      expect(result).toBe('b');
    });

    test('getValueAtPath should handle wildcard', () => {
      const result = manager.getValueAtPath({ items: [{ id: 1 }, { id: 2 }] }, '$.items[*].id');
      expect(result).toEqual([1, 2]);
    });
  });

  describe('Response Normalization', () => {
    test('normalizeResponse should parse MCP content', () => {
      const result = manager.normalizeResponse({
        content: [{ type: 'text', text: '{"status": "ok"}' }],
      });

      expect(result).toEqual({ status: 'ok' });
    });

    test('normalizeResponse should handle plain strings', () => {
      const result = manager.normalizeResponse('plain text');
      expect(result).toBe('plain text');
    });

    test('normalizeResponse should parse JSON strings', () => {
      const result = manager.normalizeResponse('{"key": "value"}');
      expect(result).toEqual({ key: 'value' });
    });
  });

  describe('Variable Extraction', () => {
    test('extractVariables should extract by path', () => {
      const result = manager.extractVariables(
        { data: { userId: 123 } },
        { userId: '$.data.userId' }
      );

      expect(result).toEqual({ userId: 123 });
    });

    test('extractVariables should handle array config', () => {
      const result = manager.extractVariables({ data: { id: 456 } }, [
        { name: 'extractedId', path: '$.data.id' },
      ]);

      expect(result).toEqual({ extractedId: 456 });
    });
  });

  describe('Type Detection', () => {
    test('getType should detect array', () => {
      expect(manager.getType([1, 2])).toBe('array');
    });

    test('getType should detect null', () => {
      expect(manager.getType(null)).toBe('null');
    });

    test('getType should detect object', () => {
      expect(manager.getType({ a: 1 })).toBe('object');
    });

    test('getType should detect string', () => {
      expect(manager.getType('hello')).toBe('string');
    });

    test('getType should detect number', () => {
      expect(manager.getType(42)).toBe('number');
    });
  });
});
