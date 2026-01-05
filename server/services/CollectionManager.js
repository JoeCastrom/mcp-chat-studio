/**
 * Collection Manager
 * Organize scenarios into collections (like Postman)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getMCPManager } from './MCPManager.js';
import { getScriptRunner } from './ScriptRunner.js';

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

    unlinkSync(filePath);
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
      delay = 0,
      sessionId = null,
      retries = 0,
      retryDelayMs = 0,
      iterations = 1,
      iterationData = []
    } = options;
    const parsedIterations = Number.isFinite(Number(iterations))
      ? Math.max(1, parseInt(iterations, 10))
      : 1;
    const dataRows = Array.isArray(iterationData) ? iterationData : [];
    const iterationCount = Math.max(parsedIterations, dataRows.length || 0, 1);
    const maxRetries = Number.isFinite(Number(retries))
      ? Math.max(0, parseInt(retries, 10))
      : 0;
    const retryDelay = Number.isFinite(Number(retryDelayMs))
      ? Math.max(0, parseInt(retryDelayMs, 10))
      : 0;

    const results = {
      collectionId,
      collectionName: collection.name,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0,
      total: (collection.scenarios?.length || 0) * iterationCount,
      passed: 0,
      failed: 0,
      skipped: 0,
      iterations: iterationCount,
      iterationDataCount: dataRows.length,
      retryPolicy: {
        retries: maxRetries,
        retryDelayMs: retryDelay
      },
      scenarios: []
    };

    const startTime = Date.now();

    if (!collection.scenarios || collection.scenarios.length === 0) {
      results.endTime = new Date().toISOString();
      results.duration = Date.now() - startTime;
      return results;
    }

    let halted = false;
    for (let iterationIndex = 0; iterationIndex < iterationCount; iterationIndex += 1) {
      const row = dataRows[iterationIndex];
      const rowVars = row && typeof row === 'object' ? row : {};

      for (const scenario of collection.scenarios) {
        try {
          // Apply collection variables, environment, scenario variables, then iteration data
          const mergedVariables = {
            ...collection.variables,
            ...environment,
            ...(scenario.variables || {}),
            ...rowVars
          };
          if (!Object.prototype.hasOwnProperty.call(mergedVariables, 'iteration')) {
            mergedVariables.iteration = iterationIndex + 1;
          }

          const scenarioResult = await this.runScenario(
            scenario,
            mergedVariables,
            collection.auth,
            {
              stopOnError,
              sessionId,
              retries: maxRetries,
              retryDelayMs: retryDelay,
              preScripts: [
                ...(collection.preScripts || []),
                ...(scenario.preScripts || [])
              ],
              postScripts: [
                ...(collection.postScripts || []),
                ...(scenario.postScripts || [])
              ]
            }
          );
          scenarioResult.iteration = iterationIndex + 1;
          if (Object.keys(rowVars).length > 0) {
            scenarioResult.iterationData = rowVars;
          }

          results.scenarios.push(scenarioResult);

          if (scenarioResult.status === 'passed') {
            results.passed++;
          } else if (scenarioResult.status === 'failed') {
            results.failed++;
            if (stopOnError) {
              halted = true;
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
            error: error.message,
            iteration: iterationIndex + 1
          });
          results.failed++;

          if (stopOnError) {
            halted = true;
            break;
          }
        }
      }

      if (halted) break;
    }

    results.endTime = new Date().toISOString();
    results.duration = Date.now() - startTime;

    return results;
  }

  /**
   * Run a single scenario
   */
  async runScenario(scenario, variables, auth, options = {}) {
    const mcpManager = getMCPManager();
    const scriptRunner = getScriptRunner();
    const steps = Array.isArray(scenario.steps) && scenario.steps.length > 0
      ? scenario.steps
      : [scenario];

    const result = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      status: 'passed',
      steps: [],
      duration: 0,
      variables: { ...variables }
    };

    const startTime = Date.now();

    for (let index = 0; index < steps.length; index += 1) {
      const stepDef = steps[index];
      const step = {
        server: stepDef.server || scenario.server,
        tool: stepDef.tool || scenario.tool,
        args: stepDef.args || scenario.args || {},
        assertions: stepDef.assertions || [],
        extract: stepDef.extract || stepDef.variables || null,
        preScripts: stepDef.preScripts || [],
        postScripts: stepDef.postScripts || []
      };

      if (!step.server || !step.tool) {
        result.steps.push({
          index,
          status: 'skipped',
          error: 'Missing server or tool name'
        });
        result.status = 'failed';
        if (options.stopOnError) break;
        continue;
      }

      const preScripts = [
        ...(options.preScripts || []),
        ...(step.preScripts || [])
      ];

      let context = { variables: { ...result.variables }, scenario, step, index };
      if (preScripts.length > 0) {
        try {
          context = await scriptRunner.executeAllPreScripts(preScripts, context);
          if (context?.variables) {
            result.variables = { ...context.variables };
          }
        } catch (error) {
          result.steps.push({
            index,
            server: step.server,
            tool: step.tool,
            status: 'failed',
            error: `Pre-script failed: ${error.message}`
          });
          result.status = 'failed';
          if (options.stopOnError) break;
          continue;
        }
      }

      const resolvedArgs = this.applyTemplateVariables(step.args, result.variables);
      const stepStart = Date.now();
      let response = null;
      let errorMessage = null;
      const maxRetries = Number.isFinite(Number(options.retries))
        ? Math.max(0, parseInt(options.retries, 10))
        : 0;
      const retryDelayMs = Number.isFinite(Number(options.retryDelayMs))
        ? Math.max(0, parseInt(options.retryDelayMs, 10))
        : 0;
      let attempts = 0;

      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        attempts = attempt + 1;
        try {
          response = await mcpManager.callTool(step.server, step.tool, resolvedArgs, options.sessionId);
          errorMessage = null;
          break;
        } catch (error) {
          errorMessage = error.message;
          if (attempt < maxRetries && retryDelayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          }
        }
      }

      const duration = Date.now() - stepStart;
      const normalizedResponse = errorMessage
        ? { error: errorMessage }
        : this.normalizeResponse(response);

      let assertionResults = [];
      if (!errorMessage && Array.isArray(step.assertions) && step.assertions.length > 0) {
        assertionResults = this.evaluateAssertions(normalizedResponse, step.assertions);
      }

      const extracted = errorMessage ? {} : this.extractVariables(normalizedResponse, step.extract);
      result.variables = { ...result.variables, ...extracted };

      const postScripts = [
        ...(options.postScripts || []),
        ...(step.postScripts || [])
      ];
      if (postScripts.length > 0) {
        try {
          const postResult = await scriptRunner.executeAllPostScripts(
            postScripts,
            { variables: { ...result.variables }, scenario, step, index },
            normalizedResponse
          );
          if (postResult?.context?.variables) {
            result.variables = { ...postResult.context.variables };
          }
          if (postResult?.assertions?.length) {
            assertionResults.push(...postResult.assertions.map(a => ({
              assertion: { name: a.name || 'script' },
              passed: a.passed,
              message: a.error || a.name,
              actualValue: null
            })));
          }
        } catch (error) {
          assertionResults.push({
            assertion: { name: 'post-script' },
            passed: false,
            message: `Post-script failed: ${error.message}`,
            actualValue: null
          });
        }
      }

      const assertionsFailed = assertionResults.filter(a => !a.passed).length;
      const stepStatus = errorMessage ? 'failed' : assertionsFailed > 0 ? 'failed' : 'passed';
      if (stepStatus === 'failed') result.status = 'failed';

      result.steps.push({
        index,
        server: step.server,
        tool: step.tool,
        args: resolvedArgs,
        attempts,
        duration,
        status: stepStatus,
        response: normalizedResponse,
        assertions: assertionResults,
        extracted
      });

      if (options.stopOnError && stepStatus === 'failed') {
        break;
      }
    }

    result.duration = Date.now() - startTime;

    return result;
  }

  normalizeResponse(response) {
    if (response === null || response === undefined) return response;
    if (typeof response === 'string') {
      return this.tryParseJson(response) ?? response;
    }
    if (response.content && Array.isArray(response.content)) {
      const text = response.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');
      if (text) {
        return this.tryParseJson(text) ?? text;
      }
    }
    return response;
  }

  tryParseJson(value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  resolveVariablePath(path, variables) {
    return path.split('.').reduce((value, key) => {
      if (value && Object.prototype.hasOwnProperty.call(value, key)) {
        return value[key];
      }
      return undefined;
    }, variables);
  }

  applyTemplateVariables(value, variables) {
    if (Array.isArray(value)) {
      return value.map(item => this.applyTemplateVariables(item, variables));
    }
    if (value && typeof value === 'object') {
      const result = {};
      Object.entries(value).forEach(([key, val]) => {
        result[key] = this.applyTemplateVariables(val, variables);
      });
      return result;
    }
    if (typeof value === 'string') {
      const exactMatch = value.match(/^{{\s*([^}]+)\s*}}$/);
      if (exactMatch) {
        const resolved = this.resolveVariablePath(exactMatch[1].trim(), variables);
        if (resolved !== undefined) return resolved;
      }

      return value.replace(/{{\s*([^}]+)\s*}}/g, (match, key) => {
        const resolved = this.resolveVariablePath(key.trim(), variables);
        if (resolved === undefined || resolved === null) return match;
        return typeof resolved === 'string' ? resolved : JSON.stringify(resolved);
      });
    }
    return value;
  }

  extractVariables(response, extractConfig) {
    if (!extractConfig) return {};
    const extracted = {};

    if (Array.isArray(extractConfig)) {
      extractConfig.forEach(item => {
        if (!item?.name) return;
        if (Object.prototype.hasOwnProperty.call(item, 'value')) {
          extracted[item.name] = item.value;
          return;
        }
        if (item.path) {
          extracted[item.name] = this.getValueAtPath(response, item.path);
        }
      });
      return extracted;
    }

    if (typeof extractConfig === 'object') {
      Object.entries(extractConfig).forEach(([key, path]) => {
        if (typeof path === 'string' && path.trim().startsWith('$')) {
          extracted[key] = this.getValueAtPath(response, path);
        } else {
          extracted[key] = path;
        }
      });
    }

    return extracted;
  }

  evaluateAssertions(response, assertions) {
    const results = [];
    for (const assertion of assertions) {
      results.push(this.evaluateSingleAssertion(response, assertion));
    }
    return results;
  }

  evaluateSingleAssertion(response, assertion) {
    const { path, operator, value } = assertion;
    try {
      const actualValue = this.getValueAtPath(response, path);
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
        case 'matches': {
          const regex = new RegExp(String(value).replace(/^\/|\/$/g, ''));
          passed = regex.test(String(actualValue));
          message = passed ? `${path} matches ${value}` : `${path} = "${actualValue}" does not match ${value}`;
          break;
        }
        case 'exists':
          passed = actualValue !== undefined;
          message = passed ? `${path} exists` : `${path} does not exist`;
          break;
        case 'not_exists':
          passed = actualValue === undefined;
          message = passed ? `${path} does not exist` : `${path} exists but should not`;
          break;
        case 'type': {
          const actualType = this.getType(actualValue);
          passed = actualType === value;
          message = passed ? `${path} is type ${value}` : `${path} is ${actualType}, expected ${value}`;
          break;
        }
        case 'length': {
          const len = actualValue?.length || 0;
          passed = len === value;
          message = passed ? `${path}.length = ${value}` : `${path}.length = ${len}, expected ${value}`;
          break;
        }
        case 'length_gt': {
          const len = actualValue?.length || 0;
          passed = len > value;
          message = passed ? `${path}.length > ${value}` : `${path}.length = ${len}, expected > ${value}`;
          break;
        }
        case 'length_gte': {
          const len = actualValue?.length || 0;
          passed = len >= value;
          message = passed ? `${path}.length >= ${value}` : `${path}.length = ${len}, expected >= ${value}`;
          break;
        }
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

  getType(value) {
    if (Array.isArray(value)) return 'array';
    if (value === null) return 'null';
    return typeof value;
  }

  parseFilterValue(raw) {
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

  parseFilterToken(token) {
    const raw = token.slice(3, -2).trim();
    let match = raw.match(/^@\.([^\s]+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
    if (match) {
      return {
        type: 'filter',
        path: match[1].trim(),
        operator: match[2],
        value: this.parseFilterValue(match[3])
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

  tokenizePath(path) {
    const cleanPath = path.replace(/^\$\.?/, '');
    if (!cleanPath) return [];
    const tokens = [];
    const regex = /(\[\?\([^\]]+\)\])|(?:\[(?:'([^']+)'|"([^"]+)"|(\d+|\*))\])|([^.[]+)/g;
    let match;
    while ((match = regex.exec(cleanPath)) !== null) {
      if (match[1]) {
        tokens.push(this.parseFilterToken(match[1]));
        continue;
      }
      tokens.push(match[2] || match[3] || match[4] || match[5]);
    }
    return tokens;
  }

  resolveFilterPath(obj, path) {
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

  matchesFilter(item, filter) {
    const actual = this.resolveFilterPath(item, filter.path);
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

  getValueAtPath(obj, path) {
    if (!path || path === '$') return obj;
    const tokens = this.tokenizePath(path);
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
            if (this.matchesFilter(item, token)) next.push(item);
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
