/**
 * Mock Server Manager
 * Create runtime mock MCP servers with canned responses (like Postman Mock Servers)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class MockServerManager {
  constructor() {
    this.mocksFile = join(__dirname, '../../data/mocks.json');
    this.mocks = new Map();

    // Ensure data directory exists
    const dataDir = dirname(this.mocksFile);
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    this.loadMocks();
  }

  /**
   * Load mocks from disk
   */
  loadMocks() {
    try {
      if (existsSync(this.mocksFile)) {
        const content = readFileSync(this.mocksFile, 'utf8');
        const data = JSON.parse(content);

        for (const mock of data) {
          this.mocks.set(mock.id, mock);
        }

        console.log(`[MockServerManager] Loaded ${this.mocks.size} mock servers`);
      }
    } catch (error) {
      console.error('[MockServerManager] Failed to load mocks:', error.message);
    }
  }

  /**
   * Save mocks to disk
   */
  saveMocks() {
    try {
      const data = Array.from(this.mocks.values());
      writeFileSync(this.mocksFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[MockServerManager] Failed to save mocks:', error.message);
    }
  }

  /**
   * Create a new mock server
   */
  createMock(data) {
    const {
      name,
      description = '',
      tools = [],
      resources = [],
      prompts = [],
      delay = 0,
      errorRate = 0
    } = data;

    if (!name) {
      throw new Error('Mock name is required');
    }

    const mock = {
      id: this.generateId(),
      name,
      description,
      tools,
      resources,
      prompts,
      delay,
      errorRate,
      callCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.mocks.set(mock.id, mock);
    this.saveMocks();

    console.log(`[MockServerManager] Created mock server: ${name} (${mock.id})`);

    return mock;
  }

  /**
   * Get all mocks
   */
  getAllMocks() {
    return Array.from(this.mocks.values());
  }

  /**
   * Get a mock by ID
   */
  getMock(id) {
    const mock = this.mocks.get(id);

    if (!mock) {
      throw new Error(`Mock ${id} not found`);
    }

    return mock;
  }

  /**
   * Update a mock
   */
  updateMock(id, updates) {
    const mock = this.getMock(id);

    const updated = {
      ...mock,
      ...updates,
      id: mock.id, // Preserve ID
      callCount: mock.callCount, // Preserve stats
      updatedAt: new Date().toISOString()
    };

    this.mocks.set(id, updated);
    this.saveMocks();

    return updated;
  }

  /**
   * Delete a mock
   */
  deleteMock(id) {
    const mock = this.getMock(id);

    this.mocks.delete(id);
    this.saveMocks();

    console.log(`[MockServerManager] Deleted mock ${id}`);

    return { success: true };
  }

  /**
   * Call a tool on a mock server
   */
  async callTool(mockId, toolName, args = {}) {
    const mock = this.getMock(mockId);

    // Find the tool definition
    const tool = mock.tools.find(t => t.name === toolName);

    if (!tool) {
      throw new Error(`Tool ${toolName} not found in mock ${mockId}`);
    }

    // Simulate delay
    if (mock.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, mock.delay));
    }

    // Simulate error rate
    if (mock.errorRate > 0 && Math.random() < mock.errorRate) {
      throw new Error(`Simulated error for ${toolName}`);
    }

    // Update call count
    mock.callCount++;
    this.mocks.set(mockId, mock);
    this.saveMocks();

    // Return the canned response (with variable substitution)
    const response = this.substituteVariables(tool.response, args);

    console.log(`[MockServerManager] Mock call: ${mockId}.${toolName} (${mock.callCount} total calls)`);

    return {
      content: [
        {
          type: 'text',
          text: typeof response === 'string' ? response : JSON.stringify(response, null, 2)
        }
      ],
      isError: false
    };
  }

  /**
   * Get a resource from a mock server
   */
  async getResource(mockId, resourceUri) {
    const mock = this.getMock(mockId);

    // Find the resource definition
    const resource = mock.resources.find(r => r.uri === resourceUri);

    if (!resource) {
      throw new Error(`Resource ${resourceUri} not found in mock ${mockId}`);
    }

    // Simulate delay
    if (mock.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, mock.delay));
    }

    // Update call count
    mock.callCount++;
    this.mocks.set(mockId, mock);
    this.saveMocks();

    return {
      contents: [
        {
          uri: resourceUri,
          mimeType: resource.mimeType || 'text/plain',
          text: resource.content
        }
      ]
    };
  }

  /**
   * Get a prompt from a mock server
   */
  async getPrompt(mockId, promptName, args = {}) {
    const mock = this.getMock(mockId);

    // Find the prompt definition
    const prompt = mock.prompts.find(p => p.name === promptName);

    if (!prompt) {
      throw new Error(`Prompt ${promptName} not found in mock ${mockId}`);
    }

    // Simulate delay
    if (mock.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, mock.delay));
    }

    // Update call count
    mock.callCount++;
    this.mocks.set(mockId, mock);
    this.saveMocks();

    // Return the prompt (with variable substitution)
    const messages = this.substituteVariables(prompt.messages, args);

    return {
      description: prompt.description,
      messages
    };
  }

  /**
   * List tools for a mock server
   */
  listTools(mockId) {
    const mock = this.getMock(mockId);

    return {
      tools: mock.tools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema
      }))
    };
  }

  /**
   * List resources for a mock server
   */
  listResources(mockId) {
    const mock = this.getMock(mockId);

    return {
      resources: mock.resources.map(r => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType
      }))
    };
  }

  /**
   * List prompts for a mock server
   */
  listPrompts(mockId) {
    const mock = this.getMock(mockId);

    return {
      prompts: mock.prompts.map(p => ({
        name: p.name,
        description: p.description,
        arguments: p.arguments
      }))
    };
  }

  /**
   * Substitute variables in response
   */
  substituteVariables(data, variables) {
    if (typeof data === 'string') {
      // Replace {{variableName}} with values
      return data.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return variables[varName] !== undefined ? variables[varName] : match;
      });
    } else if (Array.isArray(data)) {
      return data.map(item => this.substituteVariables(item, variables));
    } else if (data && typeof data === 'object') {
      const result = {};
      for (const key in data) {
        result[key] = this.substituteVariables(data[key], variables);
      }
      return result;
    }
    return data;
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get mock statistics
   */
  getStatistics() {
    const mocks = this.getAllMocks();

    const totalCalls = mocks.reduce((sum, m) => sum + m.callCount, 0);
    const avgCallsPerMock = mocks.length > 0 ? totalCalls / mocks.length : 0;

    return {
      totalMocks: mocks.length,
      totalCalls,
      avgCallsPerMock: Math.round(avgCallsPerMock),
      mostUsedMocks: mocks
        .sort((a, b) => b.callCount - a.callCount)
        .slice(0, 5)
        .map(m => ({
          id: m.id,
          name: m.name,
          callCount: m.callCount
        }))
    };
  }

  /**
   * Reset call counts
   */
  resetStats(mockId = null) {
    if (mockId) {
      const mock = this.getMock(mockId);
      mock.callCount = 0;
      this.mocks.set(mockId, mock);
    } else {
      // Reset all
      for (const [id, mock] of this.mocks.entries()) {
        mock.callCount = 0;
        this.mocks.set(id, mock);
      }
    }

    this.saveMocks();
    return { success: true };
  }

  /**
   * Create mock from collection
   */
  createFromCollection(collectionId, collectionName, scenarios) {
    const tools = scenarios.map(scenario => ({
      name: scenario.name.replace(/\s+/g, '_').toLowerCase(),
      description: scenario.description || scenario.name,
      inputSchema: {
        type: 'object',
        properties: scenario.inputs || {}
      },
      response: scenario.expectedOutput || { status: 'success' }
    }));

    return this.createMock({
      name: `Mock: ${collectionName}`,
      description: `Auto-generated from collection ${collectionId}`,
      tools,
      resources: [],
      prompts: []
    });
  }
}

// Singleton
let instance = null;
export function getMockServerManager() {
  if (!instance) {
    instance = new MockServerManager();
  }
  return instance;
}

export default MockServerManager;
