/**
 * Contract Validator Service
 * Provides schema validation for MCP tool inputs and outputs
 */

/**
 * Validate tool input against its schema
 * @param {object} args - The arguments to validate
 * @param {object} schema - The JSON schema to validate against
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export function validateInput(args, schema) {
  const errors = [];

  if (!schema || !schema.properties) {
    return { valid: true, errors: [] };
  }

  // Check required fields
  const required = schema.required || [];
  for (const field of required) {
    if (args[field] === undefined || args[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check types
  for (const [key, value] of Object.entries(args)) {
    const propSchema = schema.properties[key];
    if (!propSchema) {
      // Unknown field - could be a warning, but we'll allow it
      continue;
    }

    const typeError = validateType(value, propSchema, key);
    if (typeError) {
      errors.push(typeError);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single value against its expected type
 */
function validateType(value, propSchema, fieldName) {
  const expectedType = propSchema.type;

  if (expectedType === 'string' && typeof value !== 'string') {
    return `Field '${fieldName}' expected string, got ${typeof value}`;
  }

  if (expectedType === 'number' && typeof value !== 'number') {
    return `Field '${fieldName}' expected number, got ${typeof value}`;
  }

  if (expectedType === 'integer') {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return `Field '${fieldName}' expected integer, got ${typeof value}`;
    }
  }

  if (expectedType === 'boolean' && typeof value !== 'boolean') {
    return `Field '${fieldName}' expected boolean, got ${typeof value}`;
  }

  if (expectedType === 'array' && !Array.isArray(value)) {
    return `Field '${fieldName}' expected array, got ${typeof value}`;
  }

  if (
    expectedType === 'object' &&
    (typeof value !== 'object' || Array.isArray(value) || value === null)
  ) {
    return `Field '${fieldName}' expected object, got ${typeof value}`;
  }

  // Check enum values
  if (propSchema.enum && !propSchema.enum.includes(value)) {
    return `Field '${fieldName}' must be one of: ${propSchema.enum.join(', ')}`;
  }

  return null;
}

/**
 * Validate tool output against an expected contract
 * @param {object} output - The actual output from the tool
 * @param {object} contract - Expected output contract
 * @returns {object} - { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateOutput(output, contract) {
  const errors = [];
  const warnings = [];

  if (!contract) {
    return { valid: true, errors: [], warnings: ['No output contract defined'] };
  }

  // Check required output fields
  const required = contract.required || [];
  for (const field of required) {
    if (!hasField(output, field)) {
      errors.push(`Missing required output field: ${field}`);
    }
  }

  // Check types if specified
  if (contract.types) {
    for (const [path, expectedType] of Object.entries(contract.types)) {
      const value = getNestedValue(output, path);
      if (value !== undefined) {
        const actualType = getValueType(value);
        if (actualType !== expectedType) {
          errors.push(`Field '${path}' expected ${expectedType}, got ${actualType}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if an object has a field (supports dot notation)
 */
function hasField(obj, path) {
  const value = getNestedValue(obj, path);
  return value !== undefined;
}

/**
 * Get a nested value from an object using dot notation
 * Supports array access like 'items[0].name'
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;

  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Get the type of a value as a string
 */
function getValueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Create a contract from an existing response (baseline capture)
 * @param {object} response - The tool response to create a contract from
 * @returns {object} - Generated contract
 */
export function createContractFromResponse(response) {
  const contract = {
    required: [],
    types: {},
  };

  function processObject(obj, prefix = '') {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;

      if (value !== null && value !== undefined) {
        contract.types[path] = getValueType(value);

        // Add to required if it exists
        if (prefix === '') {
          contract.required.push(key);
        }

        // Recurse into objects (but not arrays)
        if (typeof value === 'object' && !Array.isArray(value)) {
          processObject(value, path);
        }

        // For arrays, check first item type
        if (Array.isArray(value) && value.length > 0) {
          contract.types[`${path}[]`] = getValueType(value[0]);
        }
      }
    }
  }

  processObject(response);
  return contract;
}

/**
 * Compare two responses to detect schema drift
 * @param {object} baseline - The baseline/expected response
 * @param {object} actual - The actual response to compare
 * @returns {object} - { hasChanges: boolean, changes: [...] }
 */
export function compareSchemas(baseline, actual) {
  const changes = [];

  const baselineContract = createContractFromResponse(baseline);
  const actualContract = createContractFromResponse(actual);

  // Check for removed fields
  for (const field of baselineContract.required) {
    if (!actualContract.required.includes(field)) {
      changes.push({
        type: 'removed',
        field,
        message: `Field '${field}' was removed`,
      });
    }
  }

  // Check for new fields
  for (const field of actualContract.required) {
    if (!baselineContract.required.includes(field)) {
      changes.push({
        type: 'added',
        field,
        message: `New field '${field}' was added`,
      });
    }
  }

  // Check for type changes
  for (const [path, type] of Object.entries(baselineContract.types)) {
    const actualType = actualContract.types[path];
    if (actualType && actualType !== type) {
      changes.push({
        type: 'type_changed',
        field: path,
        message: `Field '${path}' type changed from ${type} to ${actualType}`,
      });
    }
  }

  return {
    hasChanges: changes.length > 0,
    changes,
  };
}

export default {
  validateInput,
  validateOutput,
  createContractFromResponse,
  compareSchemas,
};
