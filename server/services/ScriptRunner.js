/**
 * Script Runner
 * Execute pre-request and post-response scripts (like Postman scripts)
 */

import { createSandboxNodeVM } from './SandboxEngine.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ScriptRunner {
  constructor() {
    this.scriptsFile = join(__dirname, '../../data/scripts.json');
    this.scripts = new Map();

    // Ensure data directory exists
    const dataDir = dirname(this.scriptsFile);
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    this.loadScripts();
  }

  /**
   * Load scripts from disk
   */
  loadScripts() {
    try {
      if (existsSync(this.scriptsFile)) {
        const content = readFileSync(this.scriptsFile, 'utf8');
        const data = JSON.parse(content);

        for (const script of data) {
          this.scripts.set(script.id, script);
        }

        console.log(`[ScriptRunner] Loaded ${this.scripts.size} scripts`);
      }
    } catch (error) {
      console.error('[ScriptRunner] Failed to load scripts:', error.message);
    }
  }

  /**
   * Save scripts to disk
   */
  saveScripts() {
    try {
      const data = Array.from(this.scripts.values());
      writeFileSync(this.scriptsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[ScriptRunner] Failed to save scripts:', error.message);
    }
  }

  /**
   * Create a new script
   */
  createScript(data) {
    const {
      name,
      description = '',
      type = 'pre', // 'pre' or 'post'
      code,
      enabled = true
    } = data;

    if (!name) {
      throw new Error('Script name is required');
    }

    if (!code) {
      throw new Error('Script code is required');
    }

    if (!['pre', 'post'].includes(type)) {
      throw new Error('Script type must be "pre" or "post"');
    }

    const script = {
      id: this.generateId(),
      name,
      description,
      type,
      code,
      enabled,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.scripts.set(script.id, script);
    this.saveScripts();

    console.log(`[ScriptRunner] Created ${type}-script: ${name} (${script.id})`);

    return script;
  }

  /**
   * Get all scripts
   */
  getAllScripts() {
    return Array.from(this.scripts.values());
  }

  /**
   * Get scripts by type
   */
  getScriptsByType(type) {
    return Array.from(this.scripts.values()).filter(s => s.type === type && s.enabled);
  }

  /**
   * Get a script by ID
   */
  getScript(id) {
    const script = this.scripts.get(id);

    if (!script) {
      throw new Error(`Script ${id} not found`);
    }

    return script;
  }

  /**
   * Update a script
   */
  updateScript(id, updates) {
    const script = this.getScript(id);

    const updated = {
      ...script,
      ...updates,
      id: script.id, // Preserve ID
      updatedAt: new Date().toISOString()
    };

    this.scripts.set(id, updated);
    this.saveScripts();

    return updated;
  }

  /**
   * Delete a script
   */
  deleteScript(id) {
    const script = this.getScript(id);

    this.scripts.delete(id);
    this.saveScripts();

    console.log(`[ScriptRunner] Deleted script ${id}`);

    return { success: true };
  }

  /**
   * Execute a pre-request script
   */
  async executePreScript(scriptId, context) {
    const script = this.getScript(scriptId);

    if (script.type !== 'pre') {
      throw new Error(`Script ${scriptId} is not a pre-request script`);
    }

    if (!script.enabled) {
      console.log(`[ScriptRunner] Script ${scriptId} is disabled, skipping`);
      return context;
    }

    return await this.executeScript(script, context);
  }

  /**
   * Execute a post-response script
   */
  async executePostScript(scriptId, context, response) {
    const script = this.getScript(scriptId);

    if (script.type !== 'post') {
      throw new Error(`Script ${scriptId} is not a post-response script`);
    }

    if (!script.enabled) {
      console.log(`[ScriptRunner] Script ${scriptId} is disabled, skipping`);
      return { context, response, assertions: [] };
    }

    const fullContext = {
      ...context,
      response
    };

    return await this.executeScript(script, fullContext);
  }

  /**
   * Execute all pre-request scripts for a scenario
   */
  async executeAllPreScripts(scriptIds, context) {
    let currentContext = { ...context };

    for (const scriptId of scriptIds) {
      try {
        currentContext = await this.executePreScript(scriptId, currentContext);
      } catch (error) {
        console.error(`[ScriptRunner] Pre-script ${scriptId} failed:`, error.message);
        throw error;
      }
    }

    return currentContext;
  }

  /**
   * Execute all post-response scripts for a scenario
   */
  async executeAllPostScripts(scriptIds, context, response) {
    const results = {
      context: { ...context },
      response,
      assertions: []
    };

    for (const scriptId of scriptIds) {
      try {
        const scriptResult = await this.executePostScript(scriptId, results.context, response);

        // Merge results
        results.context = scriptResult.context || results.context;
        if (scriptResult.assertions) {
          results.assertions.push(...scriptResult.assertions);
        }
      } catch (error) {
        console.error(`[ScriptRunner] Post-script ${scriptId} failed:`, error.message);
        results.assertions.push({
          name: `Script ${scriptId} execution`,
          passed: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Execute a script in a sandboxed environment
   */
  async executeScript(script, context) {
    console.log(`[ScriptRunner] Executing ${script.type}-script: ${script.name}`);

    // Create assertion tracker
    const assertions = [];

    // Create test utilities (like Postman's pm.test)
    const testUtils = {
      test: (name, fn) => {
        try {
          fn();
          assertions.push({ name, passed: true });
        } catch (error) {
          assertions.push({ name, passed: false, error: error.message });
        }
      },
      expect: (value) => ({
        to: {
          equal: (expected) => {
            if (value !== expected) {
              throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
            }
          },
          be: {
            ok: () => {
              if (!value) {
                throw new Error(`Expected truthy value, got ${JSON.stringify(value)}`);
              }
            },
            null: () => {
              if (value !== null) {
                throw new Error(`Expected null, got ${JSON.stringify(value)}`);
              }
            },
            undefined: () => {
              if (value !== undefined) {
                throw new Error(`Expected undefined, got ${JSON.stringify(value)}`);
              }
            }
          },
          contain: (expected) => {
            if (typeof value === 'string') {
              if (!value.includes(expected)) {
                throw new Error(`Expected string to contain "${expected}"`);
              }
            } else if (Array.isArray(value)) {
              if (!value.includes(expected)) {
                throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
              }
            } else {
              throw new Error('Value must be string or array for contain check');
            }
          },
          have: {
            property: (prop) => {
              if (!(prop in value)) {
                throw new Error(`Expected object to have property "${prop}"`);
              }
            },
            length: (expected) => {
              if (!value.length) {
                throw new Error('Value does not have length property');
              }
              if (value.length !== expected) {
                throw new Error(`Expected length ${expected}, got ${value.length}`);
              }
            }
          }
        },
        not: {
          to: {
            equal: (expected) => {
              if (value === expected) {
                throw new Error(`Expected not to equal ${JSON.stringify(expected)}`);
              }
            },
            contain: (expected) => {
              if (typeof value === 'string' && value.includes(expected)) {
                throw new Error(`Expected string not to contain "${expected}"`);
              } else if (Array.isArray(value) && value.includes(expected)) {
                throw new Error(`Expected array not to contain ${JSON.stringify(expected)}`);
              }
            }
          }
        }
      }),
      console: {
        log: (...args) => console.log('[Script]', ...args),
        error: (...args) => console.error('[Script]', ...args)
      }
    };

    // Create sandbox with context and utilities
    const sandbox = {
      pm: {
        variables: {
          get: (key) => context.variables?.[key],
          set: (key, value) => {
            if (!context.variables) context.variables = {};
            context.variables[key] = value;
          }
        },
        environment: {
          get: (key) => context.environment?.[key],
          set: (key, value) => {
            if (!context.environment) context.environment = {};
            context.environment[key] = value;
          }
        },
        request: context.request || {},
        response: context.response || {},
        test: testUtils.test,
        expect: testUtils.expect
      },
      console: testUtils.console,
      JSON: JSON,
      Math: Math,
      Date: Date,
      setTimeout: undefined, // Disable async operations
      setInterval: undefined,
      require: undefined // Disable require
    };

    try {
      // Create VM with sandbox
      const vm = createSandboxNodeVM({
        console: 'redirect',
        sandbox,
        timeout: 5000, // 5 second timeout
        eval: false,
        wasm: false,
        require: false
      });

      // Execute script
      vm.run(script.code);

      // Return modified context
      const result = {
        context: {
          ...context,
          variables: sandbox.pm.variables,
          environment: sandbox.pm.environment
        }
      };

      if (assertions.length > 0) {
        result.assertions = assertions;
      }

      console.log(`[ScriptRunner] Script ${script.name} completed successfully`);

      return result;

    } catch (error) {
      console.error(`[ScriptRunner] Script ${script.name} failed:`, error.message);
      throw new Error(`Script execution failed: ${error.message}`);
    }
  }

  /**
   * Validate script syntax
   */
  validateScript(code) {
    try {
      const vm = createSandboxNodeVM({
        console: 'off',
        sandbox: {},
        timeout: 100,
        eval: false,
        wasm: false,
        require: false
      });

      vm.run(code);

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get script statistics
   */
  getStatistics() {
    const scripts = this.getAllScripts();

    const preScripts = scripts.filter(s => s.type === 'pre');
    const postScripts = scripts.filter(s => s.type === 'post');
    const enabledScripts = scripts.filter(s => s.enabled);

    return {
      totalScripts: scripts.length,
      preScripts: preScripts.length,
      postScripts: postScripts.length,
      enabledScripts: enabledScripts.length,
      disabledScripts: scripts.length - enabledScripts.length
    };
  }
}

// Singleton
let instance = null;
export function getScriptRunner() {
  if (!instance) {
    instance = new ScriptRunner();
  }
  return instance;
}

export default ScriptRunner;
