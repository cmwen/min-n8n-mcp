import { describe, expect, it } from 'vitest';
import {
  createToolJsonSchemas,
  safeValidateToolInput,
  validateToolInput,
} from '../../src/schemas/index.js';

describe('Schema Validation', () => {
  it('should validate correct tool inputs', () => {
    // Test listWorkflows
    const listWorkflowsInput = {
      query: {
        limit: 10,
        active: true,
      },
    };

    const result = validateToolInput('listWorkflows', listWorkflowsInput);
    expect(result).toEqual(listWorkflowsInput);
  });

  it('should validate getWorkflow input', () => {
    const getWorkflowInput = {
      id: 'workflow-123',
      excludePinnedData: true,
    };

    const result = validateToolInput('getWorkflow', getWorkflowInput);
    expect(result).toEqual(getWorkflowInput);
  });

  it('should safely validate and return errors for invalid inputs', () => {
    // Test missing required field
    const invalidInput = {
      // Missing required 'id' field
    };

    const result = safeValidateToolInput('getWorkflow', invalidInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Required');
    }
  });

  it('should create JSON schemas for all tools', () => {
    const schemas = createToolJsonSchemas();

    expect(schemas).toBeDefined();
    expect(schemas.listWorkflows).toBeDefined();
    expect(schemas.getWorkflow).toBeDefined();
    expect(schemas.createWorkflow).toBeDefined();

    // Check that getWorkflow schema is an object with some expected properties
    expect(typeof schemas.getWorkflow).toBe('object');
    expect(schemas.getWorkflow).not.toBeNull();
  });

  it('should validate createWorkflow with required data', () => {
    const createWorkflowInput = {
      data: {
        name: 'Test Workflow',
        active: false,
        nodes: [],
      },
    };

    const result = validateToolInput('createWorkflow', createWorkflowInput);
    expect(result).toEqual(createWorkflowInput);
  });

  it('should reject createWorkflow with invalid data', () => {
    const invalidInput = {
      data: {
        name: '', // Empty name should fail
      },
    };

    const result = safeValidateToolInput('createWorkflow', invalidInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('required');
    }
  });
});
