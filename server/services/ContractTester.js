/**
 * Contract Testing Suite
 * Consumer-driven contract testing for MCP servers
 */

import { getMCPManager } from './MCPManager.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
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

  /**
   * Define a contract for an MCP server
   */
  defineContract(contract) {
    const { name, server, version = '1.0.0', tests = [] } = contract;

    if (!name || !server) {
      throw new Error('Contract must have name and server');
    }

    const contractData = {
      name,
      server,
      version,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tests
    };

    const filePath = join(this.contractsDir, `${name}.json`);
    writeFileSync(filePath, JSON.stringify(contractData, null, 2));

    console.log(`[ContractTester] Contract '${name}' saved`);

    return contractData;
  }

  /**
   * Load a contract by name
   */
  loadContract(name) {
    const filePath = join(this.contractsDir, `${name}.json`);

    if (!existsSync(filePath)) {
      throw new Error(`Contract '${name}' not found`);
    }

    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * Get all contracts
   */
  getAllContracts() {
    const contracts = [];

    if (!existsSync(this.contractsDir)) {
      return contracts;
    }

    const files = require('fs').readdirSync(this.contractsDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = join(this.contractsDir, file);
          const content = readFileSync(filePath, 'utf8');
          const contract = JSON.parse(content);
          contracts.push({
            name: contract.name,
            server: contract.server,
            version: contract.version,
            testCount: contract.tests?.length || 0,
            updatedAt: contract.updatedAt
          });
        } catch (error) {
          console.error(`Failed to load contract ${file}:`, error.message);
        }
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
  deleteContract(name) {
    const filePath = join(this.contractsDir, `${name}.json`);

    if (!existsSync(filePath)) {
      throw new Error(`Contract '${name}' not found`);
    }

    require('fs').unlinkSync(filePath);
    console.log(`[ContractTester] Contract '${name}' deleted`);

    return { success: true };
  }

  /**
   * Update a contract
   */
  updateContract(name, updates) {
    const contract = this.loadContract(name);

    const updated = {
      ...contract,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const filePath = join(this.contractsDir, `${name}.json`);
    writeFileSync(filePath, JSON.stringify(updated, null, 2));

    console.log(`[ContractTester] Contract '${name}' updated`);

    return updated;
  }

  /**
   * Generate contract from tool schema
   */
  async generateContractFromTool(serverName, toolName) {
    try {
      const response = await fetch('/api/mcp/tools');
      const data = await response.json();

      const tool = data.tools.find(t => t.serverName === serverName && t.name === toolName);

      if (!tool) {
        throw new Error(`Tool ${toolName} not found on server ${serverName}`);
      }

      const contract = {
        name: `${serverName}_${toolName}_contract`,
        server: serverName,
        version: '1.0.0',
        tests: [
          {
            name: `${toolName} basic test`,
            description: `Auto-generated test for ${toolName}`,
            tool: toolName,
            args: this.generateSampleArgs(tool.inputSchema),
            expectations: {
              schema: {
                type: 'object',
                properties: {
                  content: { type: 'array', required: true }
                }
              },
              responseTime: 5000
            }
          }
        ]
      };

      return contract;

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
