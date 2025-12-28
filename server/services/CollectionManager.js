/**
 * Collection Manager
 * Organize scenarios into collections (like Postman)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class CollectionManager {
  constructor() {
    this.collectionsDir = join(__dirname, '../../collections');

    // Ensure collections directory exists
    if (!existsSync(this.collectionsDir)) {
      mkdirSync(this.collectionsDir, { recursive: true });
    }
  }

  /**
   * Create a new collection
   */
  createCollection(data) {
    const {
      name,
      description = '',
      scenarios = [],
      variables = {},
      auth = null
    } = data;

    if (!name) {
      throw new Error('Collection name is required');
    }

    const collection = {
      id: this.generateId(),
      name,
      description,
      scenarios,
      variables,
      auth,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.saveCollection(collection);

    return collection;
  }

  /**
   * Get all collections
   */
  getAllCollections() {
    const collections = [];

    if (!existsSync(this.collectionsDir)) {
      return collections;
    }

    const files = readdirSync(this.collectionsDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = join(this.collectionsDir, file);
          const content = readFileSync(filePath, 'utf8');
          const collection = JSON.parse(content);
          collections.push({
            id: collection.id,
            name: collection.name,
            description: collection.description,
            scenarioCount: collection.scenarios?.length || 0,
            updatedAt: collection.updatedAt
          });
        } catch (error) {
          console.error(`Failed to load collection ${file}:`, error.message);
        }
      }
    }

    return collections.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Get a collection by ID
   */
  getCollection(id) {
    const filePath = join(this.collectionsDir, `${id}.json`);

    if (!existsSync(filePath)) {
      throw new Error(`Collection ${id} not found`);
    }

    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * Update a collection
   */
  updateCollection(id, updates) {
    const collection = this.getCollection(id);

    const updated = {
      ...collection,
      ...updates,
      id: collection.id, // Preserve ID
      updatedAt: new Date().toISOString()
    };

    this.saveCollection(updated);

    return updated;
  }

  /**
   * Delete a collection
   */
  deleteCollection(id) {
    const filePath = join(this.collectionsDir, `${id}.json`);

    if (!existsSync(filePath)) {
      throw new Error(`Collection ${id} not found`);
    }

    require('fs').unlinkSync(filePath);
    console.log(`[CollectionManager] Deleted collection ${id}`);

    return { success: true };
  }

  /**
   * Add scenario to collection
   */
  addScenario(collectionId, scenario) {
    const collection = this.getCollection(collectionId);

    if (!collection.scenarios) {
      collection.scenarios = [];
    }

    collection.scenarios.push({
      id: this.generateId(),
      ...scenario,
      addedAt: new Date().toISOString()
    });

    collection.updatedAt = new Date().toISOString();

    this.saveCollection(collection);

    return collection;
  }

  /**
   * Remove scenario from collection
   */
  removeScenario(collectionId, scenarioId) {
    const collection = this.getCollection(collectionId);

    if (!collection.scenarios) {
      throw new Error('Collection has no scenarios');
    }

    collection.scenarios = collection.scenarios.filter(s => s.id !== scenarioId);
    collection.updatedAt = new Date().toISOString();

    this.saveCollection(collection);

    return collection;
  }

  /**
   * Run all scenarios in a collection
   */
  async runCollection(collectionId, options = {}) {
    const collection = this.getCollection(collectionId);
    const {
      environment = {},
      stopOnError = false,
      delay = 0
    } = options;

    const results = {
      collectionId,
      collectionName: collection.name,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0,
      total: collection.scenarios?.length || 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      scenarios: []
    };

    const startTime = Date.now();

    if (!collection.scenarios || collection.scenarios.length === 0) {
      results.endTime = new Date().toISOString();
      results.duration = Date.now() - startTime;
      return results;
    }

    for (const scenario of collection.scenarios) {
      try {
        // Apply collection variables and environment
        const mergedVariables = {
          ...collection.variables,
          ...environment
        };

        const scenarioResult = await this.runScenario(scenario, mergedVariables, collection.auth);

        results.scenarios.push(scenarioResult);

        if (scenarioResult.status === 'passed') {
          results.passed++;
        } else if (scenarioResult.status === 'failed') {
          results.failed++;
          if (stopOnError) {
            break;
          }
        } else if (scenarioResult.status === 'skipped') {
          results.skipped++;
        }

        // Delay between scenarios
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        results.scenarios.push({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          status: 'failed',
          error: error.message
        });
        results.failed++;

        if (stopOnError) {
          break;
        }
      }
    }

    results.endTime = new Date().toISOString();
    results.duration = Date.now() - startTime;

    return results;
  }

  /**
   * Run a single scenario
   */
  async runScenario(scenario, variables, auth) {
    // This is a simplified version - in reality you'd integrate with MCPManager
    const result = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      status: 'passed',
      steps: [],
      duration: 0
    };

    const startTime = Date.now();

    // Simulate scenario execution
    // In production, this would call actual MCP tools

    result.duration = Date.now() - startTime;

    return result;
  }

  /**
   * Fork a collection (duplicate)
   */
  forkCollection(collectionId, newName) {
    const original = this.getCollection(collectionId);

    const forked = {
      ...original,
      id: this.generateId(),
      name: newName || `${original.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.saveCollection(forked);

    return forked;
  }

  /**
   * Export collection to JSON
   */
  exportCollection(collectionId) {
    const collection = this.getCollection(collectionId);
    return JSON.stringify(collection, null, 2);
  }

  /**
   * Import collection from JSON
   */
  importCollection(jsonData) {
    let collection;

    if (typeof jsonData === 'string') {
      collection = JSON.parse(jsonData);
    } else {
      collection = jsonData;
    }

    // Generate new ID to avoid conflicts
    collection.id = this.generateId();
    collection.updatedAt = new Date().toISOString();

    this.saveCollection(collection);

    return collection;
  }

  /**
   * Save collection to disk
   */
  saveCollection(collection) {
    const filePath = join(this.collectionsDir, `${collection.id}.json`);
    writeFileSync(filePath, JSON.stringify(collection, null, 2));
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get collection statistics
   */
  getStatistics() {
    const collections = this.getAllCollections();

    const totalScenarios = collections.reduce((sum, col) => sum + col.scenarioCount, 0);

    return {
      totalCollections: collections.length,
      totalScenarios,
      recentCollections: collections.slice(0, 5)
    };
  }
}

// Singleton
let instance = null;
export function getCollectionManager() {
  if (!instance) {
    instance = new CollectionManager();
  }
  return instance;
}

export default CollectionManager;
