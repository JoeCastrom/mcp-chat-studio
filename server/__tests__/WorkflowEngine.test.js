import { jest } from '@jest/globals';

// Mock dependencies with correct paths
jest.unstable_mockModule('../services/MCPManager.js', () => ({
  getMCPManager: jest.fn(() => ({
    callTool: jest.fn().mockResolvedValue({ success: true, output: 'test result' }),
  })),
}));

jest.unstable_mockModule('../services/LLMClient.js', () => ({
  createLLMClient: jest.fn(() => ({
    chat: jest.fn().mockResolvedValue({ content: 'LLM response' }),
  })),
}));

// Import after mocking
const { WorkflowEngine } = await import('../services/WorkflowEngine.js');

describe('WorkflowEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new WorkflowEngine();
  });

  describe('Workflow Validation', () => {
    it('should reject workflow with invalid node type', () => {
      const invalidWorkflow = {
        nodes: [{ id: 'test', type: 'invalid_type', position: { x: 0, y: 0 } }],
        edges: [],
      };

      expect(() => engine.saveWorkflow(invalidWorkflow)).toThrow('Invalid workflow structure');
    });

    it('should reject workflow with missing node id', () => {
      const invalidWorkflow = {
        nodes: [{ type: 'trigger', position: { x: 0, y: 0 } }],
        edges: [],
      };

      expect(() => engine.saveWorkflow(invalidWorkflow)).toThrow('Invalid workflow structure');
    });

    it('should accept valid workflow structure', () => {
      const validWorkflow = {
        id: 'test_wf_' + Date.now(),
        nodes: [{ id: 'trigger_1', type: 'trigger', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
      };

      // Should not throw
      expect(() => engine.saveWorkflow(validWorkflow)).not.toThrow();
    });

    it('should accept assert node type', () => {
      const workflow = {
        id: 'test_assert_' + Date.now(),
        nodes: [
          { id: 'trigger_1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
          {
            id: 'assert_1',
            type: 'assert',
            position: { x: 100, y: 0 },
            data: { condition: 'contains', expected: 'success' },
          },
        ],
        edges: [{ from: 'trigger_1', to: 'assert_1' }],
      };

      expect(() => engine.saveWorkflow(workflow)).not.toThrow();
    });
  });

  describe('CRUD Operations', () => {
    it('should save and retrieve workflow', () => {
      const workflowId = 'crud_test_' + Date.now();
      const workflow = {
        id: workflowId,
        name: 'Test Workflow',
        nodes: [{ id: 'start', type: 'trigger', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
      };

      engine.saveWorkflow(workflow);
      const retrieved = engine.getWorkflow(workflowId);

      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('Test Workflow');

      // Cleanup
      engine.deleteWorkflow(workflowId);
    });

    it('should delete workflow', () => {
      const workflowId = 'delete_test_' + Date.now();
      const workflow = {
        id: workflowId,
        nodes: [{ id: 'start', type: 'trigger', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
      };

      engine.saveWorkflow(workflow);
      engine.deleteWorkflow(workflowId);

      expect(engine.getWorkflow(workflowId)).toBeUndefined();
    });
  });
});
