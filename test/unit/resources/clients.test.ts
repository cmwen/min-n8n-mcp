import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpClient } from '../../../src/http/client.js';
import { createLogger } from '../../../src/logging.js';
import { createResourceClients } from '../../../src/resources/index.js';

// Mock the HTTP client
const mockHttpClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../../../src/http/client.js', () => ({
  HttpClient: vi.fn(() => mockHttpClient),
}));

describe('Resource Clients', () => {
  let clients: ReturnType<typeof createResourceClients>;
  let logger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    logger = createLogger('error');
    vi.clearAllMocks();

    // Create clients with mocked HTTP client
    clients = createResourceClients(mockHttpClient as any, logger);
  });

  describe('Workflow Client', () => {
    it('should list workflows', async () => {
      const mockResponse = {
        data: [
          { id: '1', name: 'Workflow 1', active: true },
          { id: '2', name: 'Workflow 2', active: false },
        ],
        count: 2,
      };

      mockHttpClient.get.mockResolvedValueOnce(mockResponse);

      const result = await clients.workflows.list({ limit: 10 });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/workflows', { limit: 10 });
      expect(result.data).toEqual(mockResponse.data);
      expect(result.totalFetched).toBe(2);
    });

    it('should list workflows with active filter', async () => {
      const mockResponse = {
        data: [{ id: '1', name: 'Active Workflow', active: true }],
        count: 1,
      };

      mockHttpClient.get.mockResolvedValueOnce(mockResponse);

      const result = await clients.workflows.list({ active: true, limit: 10 });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/workflows', {
        active: true,
        limit: 10,
      });
      expect(result.data).toEqual(mockResponse.data);
    });

    it('should list workflows with name filter', async () => {
      const mockResponse = {
        data: [{ id: '1', name: 'Test Workflow', active: true }],
        count: 1,
      };

      mockHttpClient.get.mockResolvedValueOnce(mockResponse);

      const result = await clients.workflows.list({ name: 'Test', limit: 10 });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/workflows', {
        name: 'Test',
        limit: 10,
      });
      expect(result.data).toEqual(mockResponse.data);
    });

    it('should list workflows with tag filter (string)', async () => {
      const mockResponse = {
        data: [{ id: '1', name: 'Tagged Workflow', tags: ['important'] }],
        count: 1,
      };

      mockHttpClient.get.mockResolvedValueOnce(mockResponse);

      const result = await clients.workflows.list({ tag: 'important', limit: 10 });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/workflows', {
        tag: 'important',
        limit: 10,
      });
      expect(result.data).toEqual(mockResponse.data);
    });

    it('should list workflows with tag filter (array)', async () => {
      const mockResponse = {
        data: [{ id: '1', name: 'Multi-tagged Workflow', tags: ['important', 'prod'] }],
        count: 1,
      };

      mockHttpClient.get.mockResolvedValueOnce(mockResponse);

      const result = await clients.workflows.list({ tag: ['important', 'prod'], limit: 10 });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/workflows', {
        tag: 'important,prod', // Should be joined as comma-separated string
        limit: 10,
      });
      expect(result.data).toEqual(mockResponse.data);
    });

    it('should list workflows with projectId filter', async () => {
      const mockResponse = {
        data: [{ id: '1', name: 'Project Workflow', projectId: 'proj-123' }],
        count: 1,
      };

      mockHttpClient.get.mockResolvedValueOnce(mockResponse);

      const result = await clients.workflows.list({ projectId: 'proj-123', limit: 10 });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/workflows', {
        projectId: 'proj-123',
        limit: 10,
      });
      expect(result.data).toEqual(mockResponse.data);
    });

    it('should list workflows with multiple filters', async () => {
      const mockResponse = {
        data: [{ id: '1', name: 'Filtered Workflow', active: true, projectId: 'proj-123' }],
        count: 1,
      };

      mockHttpClient.get.mockResolvedValueOnce(mockResponse);

      const result = await clients.workflows.list({
        active: true,
        name: 'Filtered',
        projectId: 'proj-123',
        limit: 5,
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/workflows', {
        active: true,
        name: 'Filtered',
        projectId: 'proj-123',
        limit: 5,
      });
      expect(result.data).toEqual(mockResponse.data);
    });

    it('should get workflow by ID', async () => {
      const mockWorkflow = { id: '1', name: 'Test Workflow', active: true };
      mockHttpClient.get.mockResolvedValueOnce(mockWorkflow);

      const result = await clients.workflows.get('1');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/workflows/1', {});
      expect(result).toEqual(mockWorkflow);
    });

    it('should create workflow', async () => {
      const workflowData = { name: 'New Workflow', nodes: [], connections: {} };
      const mockCreated = { id: '123', ...workflowData };
      mockHttpClient.post.mockResolvedValueOnce(mockCreated);

      const result = await clients.workflows.create(workflowData);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/workflows', workflowData);
      expect(result).toEqual(mockCreated);
    });

    it('should update workflow', async () => {
      const workflowData = { name: 'Updated Workflow' };
      const mockUpdated = { id: '1', ...workflowData };
      mockHttpClient.put.mockResolvedValueOnce(mockUpdated);

      const result = await clients.workflows.update('1', workflowData);

      expect(mockHttpClient.put).toHaveBeenCalledWith('/workflows/1', workflowData);
      expect(result).toEqual(mockUpdated);
    });

    it('should delete workflow', async () => {
      const mockResult = { success: true };
      mockHttpClient.delete.mockResolvedValueOnce(mockResult);

      const result = await clients.workflows.delete('1');

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/workflows/1');
      expect(result).toEqual(mockResult);
    });

    it('should activate workflow', async () => {
      const mockResult = { success: true };
      mockHttpClient.post.mockResolvedValueOnce(mockResult);

      const result = await clients.workflows.activate('1');

      expect(mockHttpClient.post).toHaveBeenCalledWith('/workflows/1/activate');
      expect(result).toEqual(mockResult);
    });
  });

  describe('Execution Client', () => {
    it('should list executions', async () => {
      const mockResponse = {
        data: [
          { id: 'exec-1', status: 'success', workflowId: 'wf-1' },
          { id: 'exec-2', status: 'running', workflowId: 'wf-2' },
        ],
        count: 2,
      };

      mockHttpClient.get.mockResolvedValueOnce(mockResponse);

      const result = await clients.executions.list({ limit: 10 });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/executions', { limit: 10 });
      expect(result.data).toEqual(mockResponse.data);
    });

    it('should get execution by ID', async () => {
      const mockExecution = { id: 'exec-1', status: 'success', data: {} };
      mockHttpClient.get.mockResolvedValueOnce(mockExecution);

      const result = await clients.executions.get('exec-1');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/executions/exec-1', {});
      expect(result).toEqual(mockExecution);
    });

    it('should delete execution', async () => {
      const mockResult = { success: true };
      mockHttpClient.delete.mockResolvedValueOnce(mockResult);

      const result = await clients.executions.delete('exec-1');

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/executions/exec-1');
      expect(result).toEqual(mockResult);
    });
  });

  describe('User Client', () => {
    it('should list users', async () => {
      const mockResponse = {
        data: [
          { id: '1', email: 'user1@example.com', firstName: 'User', lastName: 'One' },
          { id: '2', email: 'user2@example.com', firstName: 'User', lastName: 'Two' },
        ],
        count: 2,
      };

      mockHttpClient.get.mockResolvedValueOnce(mockResponse);

      const result = await clients.users.list({ limit: 10 });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/users', { limit: 10 });
      expect(result.data).toEqual(mockResponse.data);
    });

    it('should get user by ID', async () => {
      const mockUser = { id: '1', email: 'user@example.com', firstName: 'Test', lastName: 'User' };
      mockHttpClient.get.mockResolvedValueOnce(mockUser);

      const result = await clients.users.get('1');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/users/1', {});
      expect(result).toEqual(mockUser);
    });

    it('should create user', async () => {
      const userData = {
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        password: 'password123',
      };
      const mockCreated = { id: '123', ...userData };
      mockHttpClient.post.mockResolvedValueOnce(mockCreated);

      const result = await clients.users.create(userData);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/users', userData);
      expect(result).toEqual(mockCreated);
    });
  });

  describe('Tag Client', () => {
    it('should list tags', async () => {
      const mockResponse = {
        data: [
          { id: '1', name: 'Tag 1' },
          { id: '2', name: 'Tag 2' },
        ],
        count: 2,
      };

      mockHttpClient.get.mockResolvedValueOnce(mockResponse);

      const result = await clients.tags.list({ limit: 10 });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tags', { limit: 10 });
      expect(result.data).toEqual(mockResponse.data);
    });

    it('should create tag', async () => {
      const tagData = { name: 'New Tag' };
      const mockCreated = { id: '123', ...tagData };
      mockHttpClient.post.mockResolvedValueOnce(mockCreated);

      const result = await clients.tags.create(tagData);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/tags', tagData);
      expect(result).toEqual(mockCreated);
    });

    it('should delete tag', async () => {
      const mockResult = { success: true };
      mockHttpClient.delete.mockResolvedValueOnce(mockResult);

      const result = await clients.tags.delete('1');

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/tags/1');
      expect(result).toEqual(mockResult);
    });
  });
});
