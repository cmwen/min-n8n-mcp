import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../../../src/logging.js';
import type { ResourceClients } from '../../../src/resources/index.js';
import type { ServerContext } from '../../../src/server.js';
import { ToolRegistry, createTool } from '../../../src/tools/registry.js';
import { registerWorkflowTools } from '../../../src/tools/workflows.js';

describe('Workflow Tools', () => {
  let registry: ToolRegistry;
  let mockContext: ServerContext;
  let mockWorkflows: any;

  beforeEach(() => {
    registry = new ToolRegistry();

    // Mock workflow resource client
    mockWorkflows = {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      getTags: vi.fn(),
      updateTags: vi.fn(),
      transfer: vi.fn(),
      getStats: vi.fn(),
    };

    mockContext = {
      config: { mode: 'advanced' } as any,
      logger: createLogger('error'),
      httpClient: {} as any,
      resources: {
        workflows: mockWorkflows,
      } as ResourceClients,
    };
  });

  describe('listWorkflows', () => {
    it('should list workflows with pagination', async () => {
      const mockResult = {
        data: [
          { id: '1', name: 'Workflow 1', active: true },
          { id: '2', name: 'Workflow 2', active: false },
        ],
        totalFetched: 2,
        pagesFetched: 1,
        nextCursor: undefined,
      };

      mockWorkflows.list.mockResolvedValueOnce(mockResult);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('listWorkflows')!;

      const result = await tool.handler({ limit: 10 }, mockContext);

      expect(mockWorkflows.list).toHaveBeenCalledWith({ limit: 10 });
      expect(result).toEqual({
        workflows: mockResult.data,
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

      mockWorkflows.list.mockResolvedValueOnce(mockResult);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('listWorkflows')!;

      const result = await tool.handler({}, mockContext);

      expect(mockWorkflows.list).toHaveBeenCalledWith({});
      expect(result.workflows).toEqual([]);
    });

    it('should filter workflows by active status', async () => {
      const mockResult = {
        data: [{ id: '1', name: 'Active Workflow', active: true }],
        totalFetched: 1,
        pagesFetched: 1,
        nextCursor: undefined,
      };

      mockWorkflows.list.mockResolvedValueOnce(mockResult);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('listWorkflows')!;

      const result = await tool.handler({ active: true }, mockContext);

      expect(mockWorkflows.list).toHaveBeenCalledWith({ active: true });
      expect(result.workflows).toEqual(mockResult.data);
    });

    it('should filter workflows by name', async () => {
      const mockResult = {
        data: [{ id: '1', name: 'Test Workflow', active: true }],
        totalFetched: 1,
        pagesFetched: 1,
        nextCursor: undefined,
      };

      mockWorkflows.list.mockResolvedValueOnce(mockResult);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('listWorkflows')!;

      const result = await tool.handler({ name: 'Test' }, mockContext);

      expect(mockWorkflows.list).toHaveBeenCalledWith({ name: 'Test' });
      expect(result.workflows).toEqual(mockResult.data);
    });

    it('should filter workflows by single tag', async () => {
      const mockResult = {
        data: [{ id: '1', name: 'Tagged Workflow', tags: ['important'] }],
        totalFetched: 1,
        pagesFetched: 1,
        nextCursor: undefined,
      };

      mockWorkflows.list.mockResolvedValueOnce(mockResult);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('listWorkflows')!;

      const result = await tool.handler({ tag: 'important' }, mockContext);

      expect(mockWorkflows.list).toHaveBeenCalledWith({ tag: 'important' });
      expect(result.workflows).toEqual(mockResult.data);
    });

    it('should filter workflows by multiple tags', async () => {
      const mockResult = {
        data: [{ id: '1', name: 'Multi-tagged Workflow', tags: ['important', 'prod'] }],
        totalFetched: 1,
        pagesFetched: 1,
        nextCursor: undefined,
      };

      mockWorkflows.list.mockResolvedValueOnce(mockResult);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('listWorkflows')!;

      const result = await tool.handler({ tag: ['important', 'prod'] }, mockContext);

      expect(mockWorkflows.list).toHaveBeenCalledWith({ tag: ['important', 'prod'] });
      expect(result.workflows).toEqual(mockResult.data);
    });

    it('should filter workflows by projectId', async () => {
      const mockResult = {
        data: [{ id: '1', name: 'Project Workflow', projectId: 'proj-123' }],
        totalFetched: 1,
        pagesFetched: 1,
        nextCursor: undefined,
      };

      mockWorkflows.list.mockResolvedValueOnce(mockResult);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('listWorkflows')!;

      const result = await tool.handler({ projectId: 'proj-123' }, mockContext);

      expect(mockWorkflows.list).toHaveBeenCalledWith({ projectId: 'proj-123' });
      expect(result.workflows).toEqual(mockResult.data);
    });

    it('should combine multiple filters', async () => {
      const mockResult = {
        data: [{ id: '1', name: 'Filtered Workflow', active: true, projectId: 'proj-123' }],
        totalFetched: 1,
        pagesFetched: 1,
        nextCursor: undefined,
      };

      mockWorkflows.list.mockResolvedValueOnce(mockResult);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('listWorkflows')!;

      const result = await tool.handler(
        {
          active: true,
          name: 'Filtered',
          projectId: 'proj-123',
        },
        mockContext
      );

      expect(mockWorkflows.list).toHaveBeenCalledWith({
        active: true,
        name: 'Filtered',
        projectId: 'proj-123',
      });
      expect(result.workflows).toEqual(mockResult.data);
    });

    it('should combine filters with pagination', async () => {
      const mockResult = {
        data: [{ id: '1', name: 'Workflow 1' }],
        totalFetched: 1,
        pagesFetched: 1,
        nextCursor: 'next-cursor',
      };

      mockWorkflows.list.mockResolvedValueOnce(mockResult);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('listWorkflows')!;

      const result = await tool.handler(
        {
          active: true,
          limit: 5,
          cursor: 'start-cursor',
        },
        mockContext
      );

      expect(mockWorkflows.list).toHaveBeenCalledWith({
        active: true,
        limit: 5,
        cursor: 'start-cursor',
      });
      expect(result.workflows).toEqual(mockResult.data);
      expect(result.pagination.nextCursor).toBe('next-cursor');
    });
  });

  describe('getWorkflow', () => {
    it('should get workflow by ID', async () => {
      const mockWorkflow = { id: '1', name: 'Test Workflow', active: true };
      mockWorkflows.get.mockResolvedValueOnce(mockWorkflow);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('getWorkflow')!;

      const result = await tool.handler({ id: '1' }, mockContext);

      expect(mockWorkflows.get).toHaveBeenCalledWith('1', {});
      expect(result).toEqual(mockWorkflow);
    });

    it('should support excludePinnedData option', async () => {
      const mockWorkflow = { id: '1', name: 'Test Workflow' };
      mockWorkflows.get.mockResolvedValueOnce(mockWorkflow);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('getWorkflow')!;

      const result = await tool.handler(
        {
          id: '1',
          excludePinnedData: true,
        },
        mockContext
      );

      expect(mockWorkflows.get).toHaveBeenCalledWith('1', {
        excludePinnedData: true,
      });
    });
  });

  describe('createWorkflow', () => {
    it('should create workflow with provided data', async () => {
      const workflowData = {
        name: 'New Workflow',
        nodes: [],
        connections: {},
        active: false,
      };

      const mockCreated = { id: '123', ...workflowData };
      mockWorkflows.create.mockResolvedValueOnce(mockCreated);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('createWorkflow')!;

      const result = await tool.handler({ data: workflowData }, mockContext);

      expect(mockWorkflows.create).toHaveBeenCalledWith(workflowData);
      expect(result).toEqual(mockCreated);
    });
  });

  describe('activateWorkflow', () => {
    it('should activate workflow and return success', async () => {
      mockWorkflows.activate.mockResolvedValueOnce({ success: true });

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('activateWorkflow')!;

      const result = await tool.handler({ id: '1' }, mockContext);

      expect(mockWorkflows.activate).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        success: true,
        workflowId: '1',
        status: 'active',
        message: 'Workflow activated successfully',
      });
    });
  });

  describe('getWorkflowStats', () => {
    it('should return workflow statistics', async () => {
      const mockStats = {
        executions: {
          total: 100,
          success: 80,
          error: 15,
          waiting: 3,
          running: 2,
        },
        lastExecution: {
          id: 'exec-999',
          status: 'success',
          startedAt: '2024-01-01T00:00:00Z',
          finishedAt: '2024-01-01T00:01:00Z',
        },
      };

      mockWorkflows.getStats.mockResolvedValueOnce(mockStats);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('getWorkflowStats')!;

      const result = await tool.handler({ id: '1' }, mockContext);

      expect(mockWorkflows.getStats).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        workflowId: '1',
        stats: mockStats,
      });
    });
  });

  describe('error handling', () => {
    it('should propagate errors from resource client', async () => {
      const error = new Error('Workflow not found');
      mockWorkflows.get.mockRejectedValueOnce(error);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('getWorkflow')!;

      await expect(tool.handler({ id: 'nonexistent' }, mockContext)).rejects.toThrow(
        'Workflow not found'
      );
    });
  });
});
