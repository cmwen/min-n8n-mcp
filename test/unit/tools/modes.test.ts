import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../../../src/logging.js';
import type { ResourceClients } from '../../../src/resources/index.js';
import type { ServerContext } from '../../../src/server.js';
import { registerAllTools } from '../../../src/tools/index.js';
import { ToolRegistry } from '../../../src/tools/registry.js';

describe('Multiple Modes Feature', () => {
  let registry: ToolRegistry;
  let mockContext: ServerContext;
  let mockWorkflows: any;
  let mockExecutions: any;
  let mockCredentials: any;
  let mockTags: any;
  let mockUsers: any;

  beforeEach(() => {
    registry = new ToolRegistry();

    // Mock all resource clients
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

    mockExecutions = {
      list: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    };

    mockCredentials = {
      create: vi.fn(),
      delete: vi.fn(),
      getType: vi.fn(),
      transfer: vi.fn(),
    };

    mockTags = {
      list: vi.fn(),
      create: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockUsers = {
      list: vi.fn(),
      create: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      changeRole: vi.fn(),
    };

    mockContext = {
      config: {} as any,
      logger: createLogger('error'),
      httpClient: {} as any,
      resources: {
        workflows: mockWorkflows,
        executions: mockExecutions,
        credentials: mockCredentials,
        tags: mockTags,
        users: mockUsers,
      } as ResourceClients,
    };
  });

  describe('Basic Mode', () => {
    beforeEach(() => {
      mockContext.config = { mode: 'basic' } as any;
      registry.clear();
    });

    it('should register only basic workflow tools', async () => {
      await registerAllTools(registry, 'basic');
      const toolNames = registry.getToolNames();

      // Should include basic workflow tools
      expect(toolNames).toContain('listWorkflows');
      expect(toolNames).toContain('getWorkflow');
      expect(toolNames).toContain('activateWorkflow');
      expect(toolNames).toContain('deactivateWorkflow');

      // Should NOT include advanced workflow tools
      expect(toolNames).not.toContain('createWorkflow');
      expect(toolNames).not.toContain('updateWorkflow');
      expect(toolNames).not.toContain('deleteWorkflow');
    });

    it('should register only basic execution tools', async () => {
      await registerAllTools(registry, 'basic');
      const toolNames = registry.getToolNames();

      // Should include basic execution tools
      expect(toolNames).toContain('listExecutions');
      expect(toolNames).toContain('getExecution');

      // Should NOT include advanced execution tools
      expect(toolNames).not.toContain('deleteExecution');
    });

    it('should NOT register credential, tag, user, project, audit, or source control tools', async () => {
      await registerAllTools(registry, 'basic');
      const toolNames = registry.getToolNames();

      // Should NOT include any of these tool categories
      expect(toolNames).not.toContain('createCredential');
      expect(toolNames).not.toContain('listTags');
      expect(toolNames).not.toContain('listUsers');
      expect(toolNames).not.toContain('createProject');
      expect(toolNames).not.toContain('generateAudit');
      expect(toolNames).not.toContain('pullSourceControl');
    });
  });

  describe('Intermediate Mode', () => {
    beforeEach(() => {
      mockContext.config = { mode: 'intermediate' } as any;
      registry.clear();
    });

    it('should register basic and intermediate workflow tools', async () => {
      await registerAllTools(registry, 'intermediate');
      const toolNames = registry.getToolNames();

      // Should include basic workflow tools
      expect(toolNames).toContain('listWorkflows');
      expect(toolNames).toContain('getWorkflow');
      expect(toolNames).toContain('activateWorkflow');
      expect(toolNames).toContain('deactivateWorkflow');

      // Should include intermediate workflow tools
      expect(toolNames).toContain('createWorkflow');
      expect(toolNames).toContain('updateWorkflow');
      expect(toolNames).toContain('deleteWorkflow');
      expect(toolNames).toContain('getWorkflowTags');
      expect(toolNames).toContain('updateWorkflowTags');
    });

    it('should register execution and credential tools', async () => {
      await registerAllTools(registry, 'intermediate');
      const toolNames = registry.getToolNames();

      // Should include execution tools
      expect(toolNames).toContain('listExecutions');
      expect(toolNames).toContain('getExecution');
      expect(toolNames).toContain('deleteExecution');

      // Should include credential tools
      expect(toolNames).toContain('createCredential');
      expect(toolNames).toContain('deleteCredential');
      expect(toolNames).toContain('getCredentialType');
    });

    it('should register tag tools but NOT user, project, audit, or source control tools', async () => {
      await registerAllTools(registry, 'intermediate');
      const toolNames = registry.getToolNames();

      // Should include tag tools
      expect(toolNames).toContain('listTags');
      expect(toolNames).toContain('createTag');

      // Should NOT include these tool categories
      expect(toolNames).not.toContain('listUsers');
      expect(toolNames).not.toContain('createProject');
      expect(toolNames).not.toContain('generateAudit');
      expect(toolNames).not.toContain('pullSourceControl');
    });
  });

  describe('Advanced Mode', () => {
    beforeEach(() => {
      mockContext.config = { mode: 'advanced' } as any;
      registry.clear();
    });

    it('should register all available tools', async () => {
      await registerAllTools(registry, 'advanced');
      const toolNames = registry.getToolNames();

      // Should include all workflow tools
      expect(toolNames).toContain('listWorkflows');
      expect(toolNames).toContain('createWorkflow');
      expect(toolNames).toContain('updateWorkflow');
      expect(toolNames).toContain('deleteWorkflow');

      // Should include all execution tools
      expect(toolNames).toContain('listExecutions');
      expect(toolNames).toContain('deleteExecution');

      // Should include credential tools
      expect(toolNames).toContain('createCredential');

      // Should include tag tools
      expect(toolNames).toContain('listTags');

      // Should include user tools
      expect(toolNames).toContain('listUsers');

      // Should have significantly more tools than basic mode
      expect(toolNames.length).toBeGreaterThan(10);
    });
  });

  describe('Default Mode Behavior', () => {
    it('should default to intermediate mode when no mode specified', async () => {
      await registerAllTools(registry); // No mode specified
      const toolNames = registry.getToolNames();

      // Should behave like intermediate mode
      expect(toolNames).toContain('listWorkflows');
      expect(toolNames).toContain('createWorkflow');
      expect(toolNames).toContain('deleteWorkflow');
      expect(toolNames).toContain('listTags');

      // Should NOT contain advanced-only tools
      expect(toolNames).not.toContain('listUsers');

      // Should have more tools than basic but less than advanced
      expect(toolNames.length).toBeGreaterThan(8);
      expect(toolNames.length).toBeLessThan(25);
    });
  });

  describe('Tool Count Validation', () => {
    it('should have different tool counts for different modes', async () => {
      // Test basic mode
      registry.clear();
      await registerAllTools(registry, 'basic');
      const basicCount = registry.getToolNames().length;

      // Test intermediate mode
      registry.clear();
      await registerAllTools(registry, 'intermediate');
      const intermediateCount = registry.getToolNames().length;

      // Test advanced mode
      registry.clear();
      await registerAllTools(registry, 'advanced');
      const advancedCount = registry.getToolNames().length;

      // Validate hierarchy: basic < intermediate < advanced
      expect(basicCount).toBeLessThan(intermediateCount);
      expect(intermediateCount).toBeLessThan(advancedCount);

      // Basic mode should have a small, manageable number of tools
      expect(basicCount).toBeLessThanOrEqual(8);
      expect(basicCount).toBeGreaterThanOrEqual(5);
    });
  });
});
