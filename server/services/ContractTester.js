/**
 * Contract Testing Suite
 * Consumer-driven contract testing for MCP servers
 */

import { getMCPManager } from './MCPManager.js';
import { validateOutput, compareSchemas } from './ContractValidator.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ContractTester {
  constructor() {
    this.mcpManager = getMCPManager();
    this.contractsDir = join(__dirname, '../../contracts');

    // Ensure contracts directory exists
    if (!existsSync(this.contractsDir)) {
      mkdirSync(this.contractsDir, { recursive: true });
    }
  }

  makeContractId(server, toolName) {
    const raw = `${server}.${toolName}`;
    return raw.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  }

  getContractPath(id) {
    return join(this.contractsDir, `${id}.json`);
  }

  normalizeContract(contract, fileName = null) {
    const fileId = fileName ? fileName.replace(/\.json$/i, '') : null;
    const name = contract.name || contract.id || fileId || null;
    const server = contract.server || contract.serverName || (name && name.includes('.') ? name.split('.')[0] : null);
    let toolName = contract.toolName || contract.tool || contract.tool_name || null;

    if (!toolName && name && name.includes('.')) {
      toolName = name.split('.').slice(1).join('.');
    }
    if (!toolName && fileId && fileId.includes('.')) {
      toolName = fileId.split('.').slice(1).join('.');
    }

    const id = contract.id || name || (server && toolName ? this.makeContractId(server, toolName) : fileId);

    return {
      ...contract,
      id,
      name: name || id,
      server,
      toolName,
      version: contract.version || '1.0.0',
      schema: contract.schema || contract.outputSchema || contract.expectedSchema || null,
      sampleArgs: contract.sampleArgs || contract.args || contract.input || {},
      baselineResponse: contract.baselineResponse || null,
      breakingChanges: Array.isArray(contract.breakingChanges) ? contract.breakingChanges : [],
      lastValidation: contract.lastValidation || null,
      validationCount: contract.validationCount || 0,
      successCount: contract.successCount || 0,
      failureCount: contract.failureCount || 0,
      createdAt: contract.createdAt || new Date().toISOString(),
      updatedAt: contract.updatedAt || new Date().toISOString(),
      tests: contract.tests || []
    };
  }

  schemaToOutputContract(schema) {
    if (!schema || typeof schema !== 'object') return null;

    const contract = {
      required: [],
      types: {}
    };

    const walk = (currentSchema, path) => {
      if (!currentSchema || typeof currentSchema !== 'object') return;

      const type = currentSchema.type;
      if (type && path) {
        contract.types[path] = type;
      }

      if (type === 'object' && currentSchema.properties) {
        const required = currentSchema.required || [];
        for (const [key, propSchema] of Object.entries(currentSchema.properties)) {
          const propPath = path ? `${path}.${key}` : key;
          if (required.includes(key)) {
            contract.required.push(propPath);
          }
          walk(propSchema, propPath);
        }
      }

      if (type === 'array' && currentSchema.items) {
        if (path) {
          contract.types[path] = 'array';
        }
        const itemSchema = currentSchema.items;
        if (itemSchema && path) {
          const itemPath = `${path}[0]`;
          if (itemSchema.type) {
            contract.types[itemPath] = itemSchema.type;
          }
          if (itemSchema.type === 'object' && itemSchema.properties) {
            walk(itemSchema, itemPath);
          }
        }
      }
    };

    walk(schema, '');
    return contract;
  }

  normalizeValidationErrors(errors) {
    if (!Array.isArray(errors)) return [];
    return errors.map(error => {
      if (typeof error !== 'string') return error;
      const missingMatch = error.match(/Missing required output field:\s*(.+)$/i);
      if (missingMatch) {
        return { field: missingMatch[1], message: error };
      }
      const fieldMatch = error.match(/Field '([^']+)'/);
      if (fieldMatch) {
        return { field: fieldMatch[1], message: error };
      }
      return { field: 'response', message: error };
    });
  }

  /**
   * Define a contract for an MCP server
   */
  defineContract(contract) {
    const normalized = this.normalizeContract({
      ...contract,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    if (!normalized.server || !normalized.toolName) {
      throw new Error('Contract must have server and toolName');
    }

    const id = normalized.id || this.makeContractId(normalized.server, normalized.toolName);
    const contractData = {
      ...normalized,
      id,
      name: normalized.name || id
    };

    const filePath = this.getContractPath(id);
    writeFileSync(filePath, JSON.stringify(contractData, null, 2));

    console.log(`[ContractTester] Contract '${id}' saved`);

    return contractData;
  }

  /**
   * Load a contract by name
   */
  loadContract(id) {
    const directPath = this.getContractPath(id);
    if (existsSync(directPath)) {
      const content = readFileSync(directPath, 'utf8');
      return this.normalizeContract(JSON.parse(content), id);
    }

    const files = existsSync(this.contractsDir) ? readdirSync(this.contractsDir) : [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = join(this.contractsDir, file);
      const content = readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      const normalized = this.normalizeContract(parsed, file);
      if (normalized.id === id || normalized.name === id) {
        return normalized;
      }
    }

    throw new Error(`Contract '${id}' not found`);
  }

  /**
   * Get all contracts
   */
  getAllContracts() {
    const contracts = [];

    if (!existsSync(this.contractsDir)) {
      return contracts;
    }

    const files = readdirSync(this.contractsDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const filePath = join(this.contractsDir, file);
        const content = readFileSync(filePath, 'utf8');
        const contract = this.normalizeContract(JSON.parse(content), file);
        contracts.push(contract);
      } catch (error) {
        console.error(`Failed to load contract ${file}:`, error.message);
      }
    }

    return contracts;
  }

  /**
   * Run contract tests
   */
  async runContract(name) {
    const contract = this.loadContract(name);
    const results = {
      contractName: name,
      server: contract.server,
      version: contract.version,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0,
      total: contract.tests.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };

    const startTime = Date.now();

    for (const test of contract.tests) {
      const testResult = await this.runTest(contract.server, test);
      results.tests.push(testResult);

      if (testResult.status === 'passed') {
        results.passed++;
      } else if (testResult.status === 'failed') {
        results.failed++;
      } else if (testResult.status === 'skipped') {
        results.skipped++;
      }
    }

    results.endTime = new Date().toISOString();
    results.duration = Date.now() - startTime;

    return results;
  }

  /**
   * Run a single test
   */
  async runTest(serverName, test) {
    const {
      name,
      description,
      tool,
      args = {},
      expectations = {},
      skip = false
    } = test;

    const result = {
      name,
      description,
      tool,
      status: 'pending',
      duration: 0,
      errors: [],
      assertions: []
    };

    if (skip) {
      result.status = 'skipped';
      result.reason = 'Test marked as skip';
      return result;
    }

    const startTime = Date.now();

    try {
      // Execute tool
      const response = await this.mcpManager.callTool(serverName, tool, args);
      result.response = response;

      // Run assertions
      if (expectations.schema) {
        this.assertSchema(response, expectations.schema, result);
      }

      if (expectations.contains) {
        this.assertContains(response, expectations.contains, result);
      }

      if (expectations.equals) {
        this.assertEquals(response, expectations.equals, result);
      }

      if (expectations.statusCode) {
        this.assertStatusCode(response, expectations.statusCode, result);
      }

      if (expectations.responseTime) {
        const duration = Date.now() - startTime;
        this.assertResponseTime(duration, expectations.responseTime, result);
      }

      if (expectations.custom) {
        for (const assertion of expectations.custom) {
          this.runCustomAssertion(response, assertion, result);
        }
      }

      // Determine status
      const hasErrors = result.errors.length > 0;
      result.status = hasErrors ? 'failed' : 'passed';

    } catch (error) {
      result.status = 'failed';
      result.errors.push({
        type: 'execution_error',
        message: error.message
      });
    }

    result.duration = Date.now() - startTime;

    return result;
  }

  /**
   * Assert response matches schema
   */
  assertSchema(response, schema, result) {
    try {
      // Simple schema validation
      if (schema.type === 'object' && schema.properties) {
        for (const [key, expected] of Object.entries(schema.properties)) {
          if (expected.required && response[key] === undefined) {
            result.errors.push({
              type: 'schema_error',
              message: `Missing required property: ${key}`
            });
          }

          if (response[key] !== undefined && expected.type) {
            const actualType = Array.isArray(response[key]) ? 'array' : typeof response[key];
            if (actualType !== expected.type) {
              result.errors.push({
                type: 'schema_error',
                message: `Property '${key}' has wrong type. Expected ${expected.type}, got ${actualType}`
              });
            }
          }
        }
      }

      result.assertions.push({
        type: 'schema',
        status: result.errors.length === 0 ? 'passed' : 'failed'
      });
    } catch (error) {
      result.errors.push({
        type: 'schema_error',
        message: `Schema validation failed: ${error.message}`
      });
    }
  }

  /**
   * Assert response contains value
   */
  assertContains(response, expected, result) {
    const responseStr = JSON.stringify(response);
    const expectedStr = typeof expected === 'string' ? expected : JSON.stringify(expected);

    const contains = responseStr.includes(expectedStr);

    result.assertions.push({
      type: 'contains',
      expected: expectedStr,
      status: contains ? 'passed' : 'failed'
    });

    if (!contains) {
      result.errors.push({
        type: 'assertion_error',
        message: `Response does not contain expected value: ${expectedStr}`
      });
    }
  }

  /**
   * Assert response equals value
   */
  assertEquals(response, expected, result) {
    const equals = JSON.stringify(response) === JSON.stringify(expected);

    result.assertions.push({
      type: 'equals',
      expected,
      actual: response,
      status: equals ? 'passed' : 'failed'
    });

    if (!equals) {
      result.errors.push({
        type: 'assertion_error',
        message: 'Response does not equal expected value'
      });
    }
  }

  /**
   * Assert status code
   */
  assertStatusCode(response, expectedCode, result) {
    const actualCode = response.statusCode || response.status || 200;

    result.assertions.push({
      type: 'statusCode',
      expected: expectedCode,
      actual: actualCode,
      status: actualCode === expectedCode ? 'passed' : 'failed'
    });

    if (actualCode !== expectedCode) {
      result.errors.push({
        type: 'assertion_error',
        message: `Expected status code ${expectedCode}, got ${actualCode}`
      });
    }
  }

  /**
   * Assert response time
   */
  assertResponseTime(duration, maxTime, result) {
    const withinLimit = duration <= maxTime;

    result.assertions.push({
      type: 'responseTime',
      expected: `<= ${maxTime}ms`,
      actual: `${duration}ms`,
      status: withinLimit ? 'passed' : 'failed'
    });

    if (!withinLimit) {
      result.errors.push({
        type: 'assertion_error',
        message: `Response time ${duration}ms exceeds limit of ${maxTime}ms`
      });
    }
  }

  /**
   * Run custom assertion
   */
  runCustomAssertion(response, assertion, result) {
    const { type, path, operator, value } = assertion;

    try {
      // Get value at path
      let actual = response;
      if (path) {
        const parts = path.split('.');
        for (const part of parts) {
          actual = actual?.[part];
        }
      }

      // Apply operator
      let passed = false;
      switch (operator) {
        case 'equals':
          passed = actual === value;
          break;
        case 'notEquals':
          passed = actual !== value;
          break;
        case 'greaterThan':
          passed = actual > value;
          break;
        case 'lessThan':
          passed = actual < value;
          break;
        case 'contains':
          passed = String(actual).includes(String(value));
          break;
        case 'exists':
          passed = actual !== undefined && actual !== null;
          break;
        default:
          throw new Error(`Unknown operator: ${operator}`);
      }

      result.assertions.push({
        type: 'custom',
        path,
        operator,
        expected: value,
        actual,
        status: passed ? 'passed' : 'failed'
      });

      if (!passed) {
        result.errors.push({
          type: 'assertion_error',
          message: `Custom assertion failed: ${path} ${operator} ${value}`
        });
      }

    } catch (error) {
      result.errors.push({
        type: 'assertion_error',
        message: `Custom assertion error: ${error.message}`
      });
    }
  }

  /**
   * Delete a contract
   */
  deleteContract(id) {
    const filePath = this.getContractPath(id);

    if (!existsSync(filePath)) {
      throw new Error(`Contract '${id}' not found`);
    }

    unlinkSync(filePath);
    console.log(`[ContractTester] Contract '${id}' deleted`);

    return { success: true };
  }

  /**
   * Update a contract
   */
  updateContract(id, updates) {
    const contract = this.loadContract(id);

    const updated = this.normalizeContract({
      ...contract,
      ...updates,
      updatedAt: new Date().toISOString()
    });

    const filePath = this.getContractPath(updated.id);
    writeFileSync(filePath, JSON.stringify(updated, null, 2));

    console.log(`[ContractTester] Contract '${updated.id}' updated`);

    return updated;
  }

  async validateContract(id) {
    const contract = this.loadContract(id);
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    let schema = contract.schema;
    if (typeof schema === 'string') {
      try {
        schema = JSON.parse(schema);
      } catch (error) {
        schema = null;
      }
    }

    let args = contract.sampleArgs || {};
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch (error) {
        args = {};
      }
    }
    if (Object.keys(args).length === 0) {
      try {
        const { tools } = await this.mcpManager.listTools(contract.server);
        const tool = tools?.find(t => t.name === contract.toolName);
        if (tool?.inputSchema) {
          args = this.generateSampleArgs(tool.inputSchema);
        }
      } catch (error) {
        console.warn('[ContractTester] Failed to load tool schema for sample args:', error.message);
      }
    }
    if (Object.keys(args).length === 0) {
      try {
        const { tools } = await this.mcpManager.listTools(contract.server);
        const tool = tools?.find(t => t.name === contract.toolName);
        if (tool?.inputSchema) {
          args = this.generateSampleArgs(tool.inputSchema);
        }
      } catch (error) {
        console.warn('[ContractTester] Failed to load tool schema for sample args:', error.message);
      }
    }

    let response = null;
    let validation = { valid: false, errors: [], warnings: [] };
    let executionError = null;

    try {
      response = await this.mcpManager.callTool(contract.server, contract.toolName, args);
      const outputContract = this.schemaToOutputContract(schema);
      validation = validateOutput(response, outputContract);
    } catch (error) {
      executionError = error;
      validation = {
        valid: false,
        errors: [error.message],
        warnings: []
      };
    }

    const duration = Date.now() - startTime;
    const normalizedErrors = this.normalizeValidationErrors(validation.errors);
    const updated = this.updateContract(contract.id, {
      schema,
      sampleArgs: args,
      lastValidation: {
        timestamp,
        duration,
        valid: validation.valid && !executionError,
        errors: normalizedErrors,
        warnings: validation.warnings || []
      },
      validationCount: (contract.validationCount || 0) + 1,
      successCount: (contract.successCount || 0) + (validation.valid && !executionError ? 1 : 0),
      failureCount: (contract.failureCount || 0) + (validation.valid && !executionError ? 0 : 1),
      baselineResponse: contract.baselineResponse || response
    });

    return {
      contractId: updated.id,
      server: updated.server,
      toolName: updated.toolName,
      valid: validation.valid && !executionError,
      errors: normalizedErrors,
      warnings: validation.warnings || [],
      response,
      duration,
      timestamp
    };
  }

  async detectBreakingChanges(id) {
    const contract = this.loadContract(id);
    let args = contract.sampleArgs || {};
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch (error) {
        args = {};
      }
    }
    let response = null;

    try {
      response = await this.mcpManager.callTool(contract.server, contract.toolName, args);
    } catch (error) {
      return {
        breakingChanges: [
          {
            type: 'execution_error',
            field: 'response',
            description: error.message
          }
        ]
      };
    }

    if (!contract.baselineResponse) {
      this.updateContract(contract.id, {
        baselineResponse: response,
        breakingChanges: []
      });
      return {
        breakingChanges: [],
        baselineCaptured: true
      };
    }

    const diff = compareSchemas(contract.baselineResponse, response);
    const breakingChanges = diff.changes.map(change => ({
      type: change.type,
      field: change.field,
      description: change.message || change.description || 'Schema change detected'
    }));

    this.updateContract(contract.id, { breakingChanges });

    return {
      breakingChanges,
      hasChanges: diff.hasChanges
    };
  }

  async preDeploymentCheck() {
    const contracts = this.getAllContracts();
    const results = [];

    for (const contract of contracts) {
      try {
        const result = await this.validateContract(contract.id);
        results.push(result);
      } catch (error) {
        results.push({
          contractId: contract.id,
          server: contract.server,
          toolName: contract.toolName,
          valid: false,
          errors: [{ field: 'response', message: error.message }]
        });
      }
    }

    return { results };
  }

  /**
   * Generate contract from tool schema
   */
  async generateContractFromTool(serverName, toolName) {
    try {
      const { tools } = await this.mcpManager.listTools(serverName);
      const tool = tools?.find(t => t.name === toolName);

      if (!tool) {
        throw new Error(`Tool ${toolName} not found on server ${serverName}`);
      }

      const sampleArgs = this.generateSampleArgs(tool.inputSchema);
      return this.normalizeContract({
        name: `${serverName}.${toolName}`,
        server: serverName,
        toolName,
        version: '1.0.0',
        schema: null,
        sampleArgs,
        tests: []
      });

    } catch (error) {
      throw new Error(`Failed to generate contract: ${error.message}`);
    }
  }

  /**
   * Generate sample args from schema
   */
  generateSampleArgs(schema) {
    if (!schema || !schema.properties) {
      return {};
    }

    const args = {};

    for (const [key, prop] of Object.entries(schema.properties)) {
      if (prop.type === 'string') {
        args[key] = prop.default || 'sample';
      } else if (prop.type === 'number') {
        args[key] = prop.default || 0;
      } else if (prop.type === 'boolean') {
        args[key] = prop.default || false;
      } else if (prop.type === 'array') {
        args[key] = prop.default || [];
      } else if (prop.type === 'object') {
        args[key] = prop.default || {};
      }
    }

    return args;
  }
}

// Singleton
let instance = null;
export function getContractTester() {
  if (!instance) {
    instance = new ContractTester();
  }
  return instance;
}

export default ContractTester;
