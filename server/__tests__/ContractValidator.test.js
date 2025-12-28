/**
 * ContractValidator Unit Tests
 */

import ContractValidator from '../services/ContractValidator.js';

describe('ContractValidator', () => {
  describe('validateInput', () => {
    test('should validate required fields', () => {
      const schema = {
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name', 'age']
      };

      const args = { name: 'John' }; // Missing 'age'

      const result = ContractValidator.validateInput(args, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: age');
    });

    test('should validate string types', () => {
      const schema = {
        properties: {
          name: { type: 'string' }
        }
      };

      const args = { name: 123 }; // Wrong type

      const result = ContractValidator.validateInput(args, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should validate number types', () => {
      const schema = {
        properties: {
          age: { type: 'number' }
        }
      };

      const args = { age: '25' }; // Wrong type

      const result = ContractValidator.validateInput(args, schema);

      expect(result.valid).toBe(false);
    });

    test('should validate integer types', () => {
      const schema = {
        properties: {
          count: { type: 'integer' }
        }
      };

      const validArgs = { count: 5 };
      const invalidArgs = { count: 5.5 };

      expect(ContractValidator.validateInput(validArgs, schema).valid).toBe(true);
      expect(ContractValidator.validateInput(invalidArgs, schema).valid).toBe(false);
    });

    test('should validate boolean types', () => {
      const schema = {
        properties: {
          active: { type: 'boolean' }
        }
      };

      const args = { active: 'true' }; // Wrong type

      const result = ContractValidator.validateInput(args, schema);

      expect(result.valid).toBe(false);
    });

    test('should validate array types', () => {
      const schema = {
        properties: {
          items: { type: 'array' }
        }
      };

      const validArgs = { items: [1, 2, 3] };
      const invalidArgs = { items: 'not an array' };

      expect(ContractValidator.validateInput(validArgs, schema).valid).toBe(true);
      expect(ContractValidator.validateInput(invalidArgs, schema).valid).toBe(false);
    });

    test('should validate object types', () => {
      const schema = {
        properties: {
          config: { type: 'object' }
        }
      };

      const validArgs = { config: { key: 'value' } };
      const invalidArgs = { config: 'not an object' };

      expect(ContractValidator.validateInput(validArgs, schema).valid).toBe(true);
      expect(ContractValidator.validateInput(invalidArgs, schema).valid).toBe(false);
    });

    test('should validate enum values', () => {
      const schema = {
        properties: {
          status: { type: 'string', enum: ['active', 'inactive', 'pending'] }
        }
      };

      const validArgs = { status: 'active' };
      const invalidArgs = { status: 'unknown' };

      expect(ContractValidator.validateInput(validArgs, schema).valid).toBe(true);
      expect(ContractValidator.validateInput(invalidArgs, schema).valid).toBe(false);
    });

    test('should allow unknown fields', () => {
      const schema = {
        properties: {
          name: { type: 'string' }
        }
      };

      const args = { name: 'John', extraField: 'value' };

      const result = ContractValidator.validateInput(args, schema);

      expect(result.valid).toBe(true);
    });

    test('should pass with valid complete input', () => {
      const schema = {
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          active: { type: 'boolean' }
        },
        required: ['name', 'age']
      };

      const args = { name: 'John', age: 30, active: true };

      const result = ContractValidator.validateInput(args, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateOutput', () => {
    test('should validate required output fields', () => {
      const contract = {
        required: ['status', 'data'],
        types: {
          status: 'string',
          data: 'object'
        }
      };

      const output = { status: 'success' }; // Missing 'data'

      const result = ContractValidator.validateOutput(output, contract);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should validate output types', () => {
      const contract = {
        required: ['count'],
        types: {
          count: 'number'
        }
      };

      const invalidOutput = { count: '123' }; // Wrong type

      const result = ContractValidator.validateOutput(invalidOutput, contract);

      expect(result.valid).toBe(false);
    });

    test('should validate nested field types', () => {
      const contract = {
        types: {
          'user.name': 'string',
          'user.age': 'number'
        }
      };

      const validOutput = { user: { name: 'John', age: 30 } };
      const invalidOutput = { user: { name: 123, age: '30' } };

      expect(ContractValidator.validateOutput(validOutput, contract).valid).toBe(true);
      expect(ContractValidator.validateOutput(invalidOutput, contract).valid).toBe(false);
    });

    test('should pass with valid output', () => {
      const contract = {
        required: ['status', 'data'],
        types: {
          status: 'string',
          data: 'object'
        }
      };

      const output = { status: 'success', data: { result: 'OK' } };

      const result = ContractValidator.validateOutput(output, contract);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('createContractFromResponse', () => {
    test('should create contract from simple response', () => {
      const response = {
        status: 'success',
        count: 42,
        active: true
      };

      const contract = ContractValidator.createContractFromResponse(response);

      expect(contract.required).toContain('status');
      expect(contract.required).toContain('count');
      expect(contract.required).toContain('active');
      expect(contract.types.status).toBe('string');
      expect(contract.types.count).toBe('number');
      expect(contract.types.active).toBe('boolean');
    });

    test('should create contract from nested response', () => {
      const response = {
        user: {
          name: 'John',
          age: 30
        }
      };

      const contract = ContractValidator.createContractFromResponse(response);

      expect(contract.types['user']).toBe('object');
      expect(contract.types['user.name']).toBe('string');
      expect(contract.types['user.age']).toBe('number');
    });

    test('should handle arrays', () => {
      const response = {
        items: [1, 2, 3],
        tags: ['a', 'b']
      };

      const contract = ContractValidator.createContractFromResponse(response);

      expect(contract.types.items).toBe('array');
      expect(contract.types['items[]']).toBe('number');
      expect(contract.types.tags).toBe('array');
      expect(contract.types['tags[]']).toBe('string');
    });

    test('should handle null values gracefully', () => {
      const response = {
        name: 'John',
        middleName: null,
        age: 30
      };

      const contract = ContractValidator.createContractFromResponse(response);

      expect(contract.required).toContain('name');
      expect(contract.required).toContain('age');
      // null values might not be in required or types
    });
  });

  describe('compareSchemas', () => {
    test('should detect removed fields', () => {
      const baseline = { status: 'success', count: 42 };
      const actual = { status: 'success' }; // 'count' removed

      const result = ContractValidator.compareSchemas(baseline, actual);

      expect(result.hasChanges).toBe(true);
      expect(result.changes.some(c => c.type === 'removed' && c.field === 'count')).toBe(true);
    });

    test('should detect added fields', () => {
      const baseline = { status: 'success' };
      const actual = { status: 'success', newField: 'value' };

      const result = ContractValidator.compareSchemas(baseline, actual);

      expect(result.hasChanges).toBe(true);
      expect(result.changes.some(c => c.type === 'added' && c.field === 'newField')).toBe(true);
    });

    test('should detect type changes', () => {
      const baseline = { count: 42 };
      const actual = { count: '42' }; // Changed from number to string

      const result = ContractValidator.compareSchemas(baseline, actual);

      expect(result.hasChanges).toBe(true);
      expect(result.changes.some(c => c.type === 'type_changed' && c.field === 'count')).toBe(true);
    });

    test('should return no changes for identical schemas', () => {
      const baseline = { status: 'success', count: 42 };
      const actual = { status: 'OK', count: 100 }; // Different values but same structure

      const result = ContractValidator.compareSchemas(baseline, actual);

      expect(result.hasChanges).toBe(false);
      expect(result.changes).toHaveLength(0);
    });
  });
});
