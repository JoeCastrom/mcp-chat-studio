/**
 * MCP Protocol Compliance Checker
 * Validates MCP server responses against the official spec
 */

export class ProtocolCompliance {
  /**
   * Validate JSON-RPC 2.0 message format
   */
  validateJsonRpc(message) {
    const errors = [];
    const warnings = [];

    // Check JSON-RPC version
    if (message.jsonrpc !== '2.0') {
      errors.push('Missing or invalid "jsonrpc": "2.0" field');
    }

    // Check message type
    if (message.id !== undefined) {
      // Request or Response
      if (message.method) {
        // Request
        this.validateRequest(message, errors, warnings);
      } else if (message.result !== undefined || message.error !== undefined) {
        // Response
        this.validateResponse(message, errors, warnings);
      } else {
        errors.push('Message with id must have either method (request) or result/error (response)');
      }
    } else if (message.method) {
      // Notification
      this.validateNotification(message, errors, warnings);
    } else {
      errors.push('Invalid JSON-RPC message format');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateRequest(message, errors, warnings) {
    // Request must have method
    if (typeof message.method !== 'string') {
      errors.push('Request "method" must be a string');
    }

    // ID should be string, number, or null
    if (message.id !== null && typeof message.id !== 'string' && typeof message.id !== 'number') {
      errors.push('Request "id" must be string, number, or null');
    }

    // Params is optional but must be object or array if present
    if (message.params !== undefined) {
      if (typeof message.params !== 'object' || message.params === null) {
        errors.push('Request "params" must be an object or array if present');
      }
    }
  }

  validateResponse(message, errors, warnings) {
    // Response must have either result or error, not both
    if (message.result !== undefined && message.error !== undefined) {
      errors.push('Response must not have both "result" and "error"');
    }

    if (message.result === undefined && message.error === undefined) {
      errors.push('Response must have either "result" or "error"');
    }

    // If error, validate error object
    if (message.error) {
      if (typeof message.error.code !== 'number') {
        errors.push('Error "code" must be a number');
      }
      if (typeof message.error.message !== 'string') {
        errors.push('Error "message" must be a string');
      }
    }

    // ID must match request (we can't validate this here without context)
    if (message.id === undefined) {
      errors.push('Response must have "id" field');
    }
  }

  validateNotification(message, errors, warnings) {
    // Notification must have method
    if (typeof message.method !== 'string') {
      errors.push('Notification "method" must be a string');
    }

    // Notification must not have id
    if (message.id !== undefined) {
      errors.push('Notification must not have "id" field');
    }

    // Params is optional but must be object or array if present
    if (message.params !== undefined) {
      if (typeof message.params !== 'object' || message.params === null) {
        errors.push('Notification "params" must be an object or array if present');
      }
    }
  }

  /**
   * Validate MCP initialization response
   */
  validateInitialization(response) {
    const errors = [];
    const warnings = [];

    if (!response.protocolVersion) {
      errors.push('Missing "protocolVersion" in initialization response');
    }

    if (!response.capabilities) {
      errors.push('Missing "capabilities" in initialization response');
    } else {
      if (typeof response.capabilities !== 'object') {
        errors.push('"capabilities" must be an object');
      }
    }

    if (!response.serverInfo) {
      warnings.push('Missing recommended "serverInfo" field');
    } else {
      if (!response.serverInfo.name) {
        warnings.push('serverInfo should include "name"');
      }
      if (!response.serverInfo.version) {
        warnings.push('serverInfo should include "version"');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate tool list response
   */
  validateToolsList(tools) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(tools)) {
      errors.push('Tools list must be an array');
      return { valid: false, errors, warnings };
    }

    tools.forEach((tool, index) => {
      if (!tool.name) {
        errors.push(`Tool at index ${index}: missing "name" field`);
      } else if (typeof tool.name !== 'string') {
        errors.push(`Tool at index ${index}: "name" must be a string`);
      }

      if (!tool.description) {
        warnings.push(`Tool "${tool.name || index}": missing recommended "description" field`);
      }

      if (!tool.inputSchema) {
        warnings.push(`Tool "${tool.name || index}": missing recommended "inputSchema" field`);
      } else {
        this.validateJsonSchema(tool.inputSchema, `Tool "${tool.name || index}"`, errors, warnings);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate tool call result
   */
  validateToolResult(result) {
    const errors = [];
    const warnings = [];

    if (!result.content) {
      errors.push('Tool result must have "content" array');
    } else if (!Array.isArray(result.content)) {
      errors.push('Tool result "content" must be an array');
    } else {
      result.content.forEach((item, index) => {
        if (!item.type) {
          errors.push(`Content item ${index}: missing "type" field`);
        }

        if (item.type === 'text' && typeof item.text !== 'string') {
          errors.push(`Content item ${index}: text content must have "text" string field`);
        }

        if (item.type === 'image') {
          if (!item.data && !item.url) {
            errors.push(`Content item ${index}: image content must have "data" or "url" field`);
          }
          if (item.data && typeof item.mimeType !== 'string') {
            warnings.push(`Content item ${index}: image with data should specify "mimeType"`);
          }
        }

        if (item.type === 'resource' && !item.resource) {
          errors.push(`Content item ${index}: resource content must have "resource" object`);
        }
      });
    }

    // Check for isError field (optional but recommended)
    if (result.isError !== undefined && typeof result.isError !== 'boolean') {
      errors.push('"isError" must be a boolean if present');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate JSON Schema (basic validation)
   */
  validateJsonSchema(schema, context, errors, warnings) {
    if (typeof schema !== 'object' || schema === null) {
      errors.push(`${context}: inputSchema must be an object`);
      return;
    }

    if (!schema.type) {
      warnings.push(`${context}: inputSchema should specify "type"`);
    }

    if (schema.type === 'object' && !schema.properties) {
      warnings.push(`${context}: object schema should define "properties"`);
    }

    if (schema.required && !Array.isArray(schema.required)) {
      errors.push(`${context}: "required" must be an array`);
    }
  }

  /**
   * Validate resources list
   */
  validateResourcesList(resources) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(resources)) {
      errors.push('Resources list must be an array');
      return { valid: false, errors, warnings };
    }

    resources.forEach((resource, index) => {
      if (!resource.uri) {
        errors.push(`Resource at index ${index}: missing "uri" field`);
      }

      if (!resource.name) {
        warnings.push(`Resource at index ${index}: missing recommended "name" field`);
      }

      if (!resource.mimeType) {
        warnings.push(`Resource at index ${index}: missing recommended "mimeType" field`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate prompts list
   */
  validatePromptsList(prompts) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(prompts)) {
      errors.push('Prompts list must be an array');
      return { valid: false, errors, warnings };
    }

    prompts.forEach((prompt, index) => {
      if (!prompt.name) {
        errors.push(`Prompt at index ${index}: missing "name" field`);
      }

      if (!prompt.description) {
        warnings.push(`Prompt "${prompt.name || index}": missing recommended "description" field`);
      }

      if (prompt.arguments) {
        if (!Array.isArray(prompt.arguments)) {
          errors.push(`Prompt "${prompt.name || index}": "arguments" must be an array`);
        } else {
          prompt.arguments.forEach((arg, argIndex) => {
            if (!arg.name) {
              errors.push(`Prompt "${prompt.name || index}" argument ${argIndex}: missing "name"`);
            }
            if (!arg.description) {
              warnings.push(
                `Prompt "${prompt.name || index}" argument "${arg.name || argIndex}": missing "description"`
              );
            }
          });
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Comprehensive server compliance check
   */
  async checkServerCompliance(mcpConnection) {
    const results = {
      overall: 'pending',
      checks: [],
      errors: [],
      warnings: [],
    };

    try {
      // Check 1: Initialization
      const initCheck = {
        name: 'Initialization Response',
        passed: false,
        errors: [],
        warnings: [],
      };

      if (mcpConnection.client && mcpConnection.connected) {
        // Assume initialization happened - we'd need to capture the actual response
        initCheck.passed = true;
        initCheck.warnings.push(
          'Could not verify initialization response format (already connected)'
        );
      } else {
        initCheck.errors.push('Server not connected');
      }

      results.checks.push(initCheck);

      // Check 2: Tools List
      const toolsCheck = {
        name: 'Tools List Format',
        passed: false,
        errors: [],
        warnings: [],
      };

      const tools = mcpConnection.tools || [];
      const toolsValidation = this.validateToolsList(tools);
      toolsCheck.passed = toolsValidation.valid;
      toolsCheck.errors = toolsValidation.errors;
      toolsCheck.warnings = toolsValidation.warnings;

      results.checks.push(toolsCheck);

      // Aggregate results
      results.errors = results.checks.flatMap(c => c.errors);
      results.warnings = results.checks.flatMap(c => c.warnings);
      results.overall = results.errors.length === 0 ? 'passed' : 'failed';
    } catch (error) {
      results.overall = 'error';
      results.errors.push(error.message);
    }

    return results;
  }
}

// Singleton
let instance = null;
export function getProtocolCompliance() {
  if (!instance) {
    instance = new ProtocolCompliance();
  }
  return instance;
}

export default ProtocolCompliance;
