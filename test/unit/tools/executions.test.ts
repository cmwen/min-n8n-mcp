import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../../../src/logging.js';
import type { ResourceClients } from '../../../src/resources/index.js';
import type { ServerContext } from '../../../src/server.js';
import { registerExecutionTools } from '../../../src/tools/executions.js';
import { ToolRegistry } from '../../../src/tools/registry.js';

describe('Execution Tools', () => {
  let registry: ToolRegistry;
  let mockContext: ServerContext;
  let mockExecutions: any;

  beforeEach(() => {
    registry = new ToolRegistry();

    // Mock execution resource client
    mockExecutions = {
      list: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    };

    mockContext = {
      config: {} as any,
      logger: createLogger('error'),
      httpClient: {} as any,
      resources: {
        executions: mockExecutions,
      } as ResourceClients,
    };
  });

  describe('listExecutions', () => {
    it('should list executions with filters', async () => {
      const mockResult = {
        data: [
          { id: 'exec-1', status: 'success', workflowId: 'wf-1' },
          { id: 'exec-2', status: 'running', workflowId: 'wf-2' },
        ],
        totalFetched: 2,
        pagesFetched: 1,
        nextCursor: undefined,
      };

      mockExecutions.list.mockResolvedValueOnce(mockResult);

      await registerExecutionTools(registry);
      const tool = registry.getToolDefinition('listExecutions')!;

      const result = await tool.handler({ status: 'success', limit: 10 }, mockContext);

      expect(mockExecutions.list).toHaveBeenCalledWith({ status: 'success', limit: 10 });
      expect(result).toEqual({
        executions: mockResult.data,
        pagination: {
          totalFetched: 2,
          pagesFetched: 1,
          nextCursor: undefined,
        },
      });
    });

    it('should handle empty query', async () => {
      const mockResult = {
        data: [],
        totalFetched: 0,
        pagesFetched: 1,
        nextCursor: undefined,
      };

      mockExecutions.list.mockResolvedValueOnce(mockResult);

      await registerExecutionTools(registry);
      const tool = registry.getToolDefinition('listExecutions')!;

      const result = await tool.handler({}, mockContext);

      expect(mockExecutions.list).toHaveBeenCalledWith({});
      expect(result.executions).toEqual([]);
    });
  });

  describe('getExecution', () => {
    it('should get execution details by ID', async () => {
      const mockExecution = {
        id: 'exec-1',
        status: 'success',
        data: { result: 'test' },
        startedAt: '2024-01-01T00:00:00Z',
      };
      mockExecutions.get.mockResolvedValueOnce(mockExecution);

      await registerExecutionTools(registry);
      const tool = registry.getToolDefinition('getExecution')!;

      const result = await tool.handler({ id: 'exec-1' }, mockContext);

      expect(mockExecutions.get).toHaveBeenCalledWith('exec-1', {});
      expect(result).toEqual(mockExecution);
    });

    it('should support includeData option', async () => {
      const mockExecution = {
        id: 'exec-1',
        status: 'success',
        fullData: { complete: 'dataset' },
      };
      mockExecutions.get.mockResolvedValueOnce(mockExecution);

      await registerExecutionTools(registry);
      const tool = registry.getToolDefinition('getExecution')!;

      const result = await tool.handler(
        {
          id: 'exec-1',
          includeData: true,
        },
        mockContext
      );

      expect(mockExecutions.get).toHaveBeenCalledWith('exec-1', {
        includeData: true,
      });
    });
  });

  describe('deleteExecution', () => {
    it('should delete execution', async () => {
      mockExecutions.delete.mockResolvedValueOnce({ success: true });

      await registerExecutionTools(registry);
      const tool = registry.getToolDefinition('deleteExecution')!;

      const result = await tool.handler({ id: 'exec-1' }, mockContext);

      expect(mockExecutions.delete).toHaveBeenCalledWith('exec-1');
      expect(result).toEqual({
        success: true,
        executionId: 'exec-1',
        message: 'Execution deleted successfully',
      });
    });
  });

  describe('error handling', () => {
    it('should propagate errors from resource client', async () => {
      const error = new Error('Execution not found');
      mockExecutions.get.mockRejectedValueOnce(error);

      await registerExecutionTools(registry);
      const tool = registry.getToolDefinition('getExecution')!;

      await expect(tool.handler({ id: 'nonexistent' }, mockContext)).rejects.toThrow(
        'Execution not found'
      );
    });
  });
});
