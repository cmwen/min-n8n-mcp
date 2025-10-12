import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../../../src/logging.js';
import type { ResourceClients } from '../../../src/resources/index.js';
import type { ServerContext } from '../../../src/server.js';
import { registerProjectTools } from '../../../src/tools/projects.js';
import { ToolRegistry } from '../../../src/tools/registry.js';
import { registerTagTools } from '../../../src/tools/tags.js';
import { registerUserTools } from '../../../src/tools/users.js';

describe('Additional Tool Tests', () => {
  let registry: ToolRegistry;
  let mockContext: ServerContext;
  let mockUsers: any;
  let mockTags: any;
  let mockProjects: any;

  beforeEach(() => {
    registry = new ToolRegistry();

    // Mock resource clients
    mockUsers = {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      changeRole: vi.fn(),
    };

    mockTags = {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockProjects = {
      addUsers: vi.fn(),
      removeUser: vi.fn(),
      updateUserRole: vi.fn(),
    };

    mockContext = {
      config: {} as any,
      logger: createLogger('error'),
      httpClient: {} as any,
      resources: {
        workflows: {} as any,
        executions: {} as any,
        credentials: {} as any,
        users: mockUsers,
        tags: mockTags,
        variables: {} as any,
        projects: mockProjects,
        audit: {} as any,
        sourceControl: {} as any,
      } as ResourceClients,
    };
  });

  describe('User Tools', () => {
    it('should list users', async () => {
      const mockResult = {
        data: [
          { id: '1', email: 'user1@example.com', firstName: 'User', lastName: 'One' },
          { id: '2', email: 'user2@example.com', firstName: 'User', lastName: 'Two' },
        ],
        totalFetched: 2,
        pagesFetched: 1,
        nextCursor: undefined,
      };

      mockUsers.list.mockResolvedValueOnce(mockResult);

      await registerUserTools(registry);
      const tool = registry.getToolDefinition('listUsers')!;

      const result = await tool.handler({ limit: 10 }, mockContext);

      expect(mockUsers.list).toHaveBeenCalledWith({ limit: 10 });
      expect(result).toEqual({
        users: mockResult.data,
        pagination: {
          totalFetched: 2,
          pagesFetched: 1,
          nextCursor: undefined,
        },
      });
    });

    it('should get user by ID', async () => {
      const mockUser = { id: '1', email: 'user@example.com', firstName: 'Test', lastName: 'User' };
      mockUsers.get.mockResolvedValueOnce(mockUser);

      await registerUserTools(registry);
      const tool = registry.getToolDefinition('getUser')!;

      const result = await tool.handler({ id: '1' }, mockContext);

      expect(mockUsers.get).toHaveBeenCalledWith('1', {});
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
      mockUsers.create.mockResolvedValueOnce(mockCreated);

      await registerUserTools(registry);
      const tool = registry.getToolDefinition('createUser')!;

      const result = await tool.handler({ data: userData }, mockContext);

      expect(mockUsers.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual({
        id: '123',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        message: 'User created successfully',
      });
      expect(result.password).toBeUndefined(); // Password should be removed
    });

    it('should normalize global role names before change', async () => {
      mockUsers.changeRole.mockResolvedValueOnce({ success: true });

      await registerUserTools(registry);
      const tool = registry.getToolDefinition('changeUserRole')!;

      const result = await tool.handler({ id: '1', role: 'member' }, mockContext);

      expect(mockUsers.changeRole).toHaveBeenCalledWith('1', 'global:member');
      expect(result.role).toBe('global:member');
    });
  });

  describe('Tag Tools', () => {
    it('should list tags', async () => {
      const mockResult = {
        data: [
          { id: '1', name: 'Tag 1' },
          { id: '2', name: 'Tag 2' },
        ],
        totalFetched: 2,
        pagesFetched: 1,
        nextCursor: undefined,
      };

      mockTags.list.mockResolvedValueOnce(mockResult);

      await registerTagTools(registry);
      const tool = registry.getToolDefinition('listTags')!;

      const result = await tool.handler({ limit: 10 }, mockContext);

      expect(mockTags.list).toHaveBeenCalledWith({ limit: 10 });
      expect(result).toEqual({
        tags: mockResult.data,
        pagination: {
          totalFetched: 2,
          pagesFetched: 1,
          nextCursor: undefined,
        },
      });
    });

    it('should get tag by ID', async () => {
      const mockTag = { id: '1', name: 'Test Tag' };
      mockTags.get.mockResolvedValueOnce(mockTag);

      await registerTagTools(registry);
      const tool = registry.getToolDefinition('getTag')!;

      const result = await tool.handler({ id: '1' }, mockContext);

      expect(mockTags.get).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockTag);
    });

    it('should create tag', async () => {
      const tagData = { name: 'New Tag' };
      const mockCreated = { id: '123', ...tagData };
      mockTags.create.mockResolvedValueOnce(mockCreated);

      await registerTagTools(registry);
      const tool = registry.getToolDefinition('createTag')!;

      const result = await tool.handler({ data: tagData }, mockContext);

      expect(mockTags.create).toHaveBeenCalledWith(tagData);
      expect(result).toEqual(mockCreated);
    });

    it('should update tag', async () => {
      const tagData = { name: 'Updated Tag' };
      const mockUpdated = { id: '1', ...tagData };
      mockTags.update.mockResolvedValueOnce(mockUpdated);

      await registerTagTools(registry);
      const tool = registry.getToolDefinition('updateTag')!;

      const result = await tool.handler({ id: '1', data: tagData }, mockContext);

      expect(mockTags.update).toHaveBeenCalledWith('1', tagData);
      expect(result).toEqual(mockUpdated);
    });

    it('should delete tag', async () => {
      mockTags.delete.mockResolvedValueOnce({ success: true });

      await registerTagTools(registry);
      const tool = registry.getToolDefinition('deleteTag')!;

      const result = await tool.handler({ id: '1' }, mockContext);

      expect(mockTags.delete).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        success: true,
        tagId: '1',
        message: 'Tag deleted successfully',
      });
    });
  });

  describe('Tool Registry', () => {
    it('should register tools and track names', () => {
      const tool = {
        name: 'testTool',
        description: 'A test tool',
        inputSchema: {},
        handler: vi.fn(),
      };

      registry.register(tool);

      expect(registry.getToolNames()).toContain('testTool');
      expect(registry.getToolDefinition('testTool')).toEqual(tool);
    });

    it('should register multiple tools in batch', () => {
      const tools = [
        {
          name: 'tool1',
          description: 'Tool 1',
          inputSchema: {},
          handler: vi.fn(),
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          inputSchema: {},
          handler: vi.fn(),
        },
      ];

      registry.registerBatch(tools);

      expect(registry.getToolNames()).toContain('tool1');
      expect(registry.getToolNames()).toContain('tool2');
    });

    it('should clear all tools', () => {
      const tool = {
        name: 'testTool',
        description: 'A test tool',
        inputSchema: {},
        handler: vi.fn(),
      };

      registry.register(tool);
      expect(registry.getToolNames()).toContain('testTool');

      registry.clear();
      expect(registry.getToolNames()).toEqual([]);
    });
  });

  describe('Project Tools', () => {
    beforeEach(async () => {
      await registerProjectTools(registry);
    });

    it('should add users to project with normalized roles', async () => {
      mockProjects.addUsers.mockResolvedValueOnce({ created: true });

      const tool = registry.getToolDefinition('addUsersToProject')!;

      const result = await tool.handler(
        {
          projectId: 'project-1',
          users: [{ id: 'user-1', role: 'editor' }, { id: 'user-2' }],
        },
        mockContext
      );

      expect(mockProjects.addUsers).toHaveBeenCalledWith('project-1', [
        { userId: 'user-1', role: 'project:editor' },
        { userId: 'user-2', role: 'project:viewer' },
      ]);

      expect(result).toMatchObject({
        success: true,
        projectId: 'project-1',
        usersAdded: 2,
      });
    });

    it('should change project user role via resource client', async () => {
      mockProjects.updateUserRole.mockResolvedValueOnce({ ok: true });

      const tool = registry.getToolDefinition('changeUserRoleInProject')!;

      await tool.handler(
        {
          projectId: 'project-2',
          userId: 'user-7',
          role: 'project:admin',
        },
        mockContext
      );

      expect(mockProjects.updateUserRole).toHaveBeenCalledWith(
        'project-2',
        'user-7',
        'project:admin'
      );
    });
  });
});
