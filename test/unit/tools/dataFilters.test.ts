import { describe, expect, it } from 'vitest';
import {
  filterExecutionData,
  filterExecutionList,
  filterWorkflowData,
  filterWorkflowList,
  getModeFromContext,
} from '../../../src/tools/dataFilters.js';

describe('Data Filters', () => {
  const mockWorkflow = {
    id: 'workflow-123',
    name: 'Test Workflow',
    active: true,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-02T00:00:00.000Z',
    versionId: 'version-456',
    tags: ['tag1', 'tag2'],
    staticData: { some: 'data' },
    settings: { timeout: 30 },
    pinData: { node1: { data: 'pinned' } },
    meta: { description: 'Test workflow' },
    connections: {
      node1: { main: [{ node: 'node2', type: 'main', index: 0 }] },
      node2: { main: [] },
    },
    nodes: [
      { id: 'node1', type: 'webhook', name: 'Webhook' },
      { id: 'node2', type: 'set', name: 'Set' },
    ],
  };

  const mockExecution = {
    id: 'execution-789',
    workflowId: 'workflow-123',
    status: 'success',
    mode: 'manual',
    retryOf: null,
    retrySuccessId: null,
    startedAt: '2023-01-01T12:00:00.000Z',
    stoppedAt: '2023-01-01T12:01:00.000Z',
    finished: true,
    error: null,
    waitTill: null,
    customData: { custom: 'value' },
    data: {
      node1: [{ json: { id: 1, name: 'test' } }],
      node2: [{ json: { id: 1, name: 'test', processed: true } }],
    },
  };

  describe('filterWorkflowData', () => {
    it('should return full data in advanced mode', () => {
      const result = filterWorkflowData(mockWorkflow, 'advanced');
      expect(result).toEqual(mockWorkflow);
    });

    it('should return essential fields only in basic mode', () => {
      const result = filterWorkflowData(mockWorkflow, 'basic');

      expect(result).toEqual({
        id: 'workflow-123',
        name: 'Test Workflow',
        active: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
        versionId: 'version-456',
        tags: ['tag1', 'tag2'],
      });

      // Should NOT include detailed workflow structure
      expect(result.connections).toBeUndefined();
      expect(result.nodes).toBeUndefined();
      expect(result.staticData).toBeUndefined();
    });

    it('should return essential fields plus additional metadata in intermediate mode', () => {
      const result = filterWorkflowData(mockWorkflow, 'intermediate');

      expect(result).toEqual({
        id: 'workflow-123',
        name: 'Test Workflow',
        active: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
        versionId: 'version-456',
        tags: ['tag1', 'tag2'],
        staticData: { some: 'data' },
        settings: { timeout: 30 },
        pinData: { node1: { data: 'pinned' } },
        meta: { description: 'Test workflow' },
        nodeConnections: 2, // Count instead of full structure
        nodeCount: 2, // Count instead of full node definitions
      });

      // Should NOT include full connections and nodes arrays
      expect(result.connections).toBeUndefined();
      expect(result.nodes).toBeUndefined();
    });
  });

  describe('filterExecutionData', () => {
    it('should return full data in advanced mode', () => {
      const result = filterExecutionData(mockExecution, 'advanced');
      expect(result).toEqual(mockExecution);
    });

    it('should return essential fields only in basic mode', () => {
      const result = filterExecutionData(mockExecution, 'basic');

      expect(result).toEqual({
        id: 'execution-789',
        workflowId: 'workflow-123',
        status: 'success',
        mode: 'manual',
        retryOf: null,
        retrySuccessId: null,
        startedAt: '2023-01-01T12:00:00.000Z',
        stoppedAt: '2023-01-01T12:01:00.000Z',
        finished: true,
      });

      // Should NOT include execution data
      expect(result.data).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.customData).toBeUndefined();
    });

    it('should return essential fields plus metadata in intermediate mode', () => {
      const result = filterExecutionData(mockExecution, 'intermediate');

      expect(result.id).toBe('execution-789');
      expect(result.workflowId).toBe('workflow-123');
      expect(result.status).toBe('success');
      expect(result.error).toBeNull();
      expect(result.customData).toEqual({ custom: 'value' });

      // Should include data size information but not actual data
      expect(result.dataSize).toBeDefined();
      expect(result.nodeExecutionCount).toBe(2);
      expect(result.data).toBeUndefined(); // Actual data should be excluded
    });
  });

  describe('filterWorkflowList', () => {
    const workflows = [
      mockWorkflow,
      { ...mockWorkflow, id: 'workflow-456', name: 'Another Workflow' },
    ];

    it('should filter all workflows in the list according to mode', () => {
      const basicResult = filterWorkflowList(workflows, 'basic');
      expect(basicResult).toHaveLength(2);
      expect(basicResult[0].connections).toBeUndefined();
      expect(basicResult[1].connections).toBeUndefined();

      const advancedResult = filterWorkflowList(workflows, 'advanced');
      expect(advancedResult).toEqual(workflows); // No filtering in advanced mode
    });
  });

  describe('filterExecutionList', () => {
    const executions = [mockExecution, { ...mockExecution, id: 'execution-999', status: 'failed' }];

    it('should filter all executions in the list according to mode', () => {
      const basicResult = filterExecutionList(executions, 'basic');
      expect(basicResult).toHaveLength(2);
      expect(basicResult[0].data).toBeUndefined();
      expect(basicResult[1].data).toBeUndefined();

      const advancedResult = filterExecutionList(executions, 'advanced');
      expect(advancedResult).toEqual(executions); // No filtering in advanced mode
    });
  });

  describe('getModeFromContext', () => {
    it('should return mode from context config', () => {
      const context = { config: { mode: 'basic' } };
      expect(getModeFromContext(context)).toBe('basic');
    });

    it('should default to advanced when no mode in context', () => {
      const context = { config: {} };
      expect(getModeFromContext(context)).toBe('advanced');
    });

    it('should default to advanced when no config in context', () => {
      const context = {};
      expect(getModeFromContext(context)).toBe('advanced');
    });
  });

  describe('Data Size Validation', () => {
    it('should significantly reduce data size in basic mode', () => {
      const originalSize = JSON.stringify(mockWorkflow).length;
      const filteredWorkflow = filterWorkflowData(mockWorkflow, 'basic');
      const filteredSize = JSON.stringify(filteredWorkflow).length;

      // Basic mode should be significantly smaller
      expect(filteredSize).toBeLessThan(originalSize * 0.5);
    });

    it('should moderately reduce data size in intermediate mode', () => {
      const originalSize = JSON.stringify(mockWorkflow).length;
      const filteredWorkflow = filterWorkflowData(mockWorkflow, 'intermediate');
      const filteredSize = JSON.stringify(filteredWorkflow).length;

      // Intermediate mode should be smaller than original but larger than basic
      expect(filteredSize).toBeLessThan(originalSize);

      const basicSize = JSON.stringify(filterWorkflowData(mockWorkflow, 'basic')).length;
      expect(filteredSize).toBeGreaterThan(basicSize);
    });

    it('should handle missing connections and nodes gracefully', () => {
      const workflowWithoutNodes = { 
        ...mockWorkflow, 
        connections: undefined as any,
        nodes: undefined as any 
      };

      const result = filterWorkflowData(workflowWithoutNodes, 'intermediate');
      expect(result.nodeConnections).toBe(0);
      expect(result.nodeCount).toBe(0);
    });
  });
});
