import type { ToolInputs } from '../schemas/index.js';
import { filterWorkflowList, getModeFromContext } from './dataFilters.js';
import type { ToolRegistry } from './registry.js';
import { createTool } from './registry.js';

export async function registerWorkflowTools(registry: ToolRegistry): Promise<void> {
  registry.register(
    createTool(
      'listWorkflows',
      'List n8n workflows with optional filtering by active status, name, tags, or project',
      async (input: ToolInputs['listWorkflows'], context) => {
        const result = await context.resources.workflows.list(input);
        const mode = getModeFromContext(context);

        context.logger.info(
          {
            totalFetched: result.totalFetched,
            pagesFetched: result.pagesFetched,
            hasMore: !!result.nextCursor,
            mode,
          },
          'Listed workflows'
        );

        return {
          workflows: filterWorkflowList(result.data, mode),
          pagination: {
            totalFetched: result.totalFetched,
            pagesFetched: result.pagesFetched,
            nextCursor: result.nextCursor,
          },
        };
      }
    )
  );

  registry.register(
    createTool(
      'getWorkflow',
      'Get a specific workflow by ID, optionally excluding pinned data',
      async (input: ToolInputs['getWorkflow'], context) => {
        const workflow = await context.resources.workflows.get(input.id, {
          excludePinnedData: input.excludePinnedData,
        });
        const mode = getModeFromContext(context);

        context.logger.info({ workflowId: input.id, mode }, 'Retrieved workflow');

        return workflow;
      }
    )
  );

  registry.register(
    createTool(
      'createWorkflow',
      'Create a new workflow with specified configuration',
      async (input: ToolInputs['createWorkflow'], context) => {
        const workflow = await context.resources.workflows.create(input.data);

        context.logger.info(
          {
            workflowId: workflow.id,
            name: workflow.name,
          },
          'Created workflow'
        );

        return workflow;
      }
    )
  );

  registry.register(
    createTool(
      'updateWorkflow',
      'Update an existing workflow with new configuration',
      async (input: ToolInputs['updateWorkflow'], context) => {
        const workflow = await context.resources.workflows.update(input.id, input.data);

        context.logger.info(
          {
            workflowId: input.id,
            updatedFields: Object.keys(input.data),
          },
          'Updated workflow'
        );

        return workflow;
      }
    )
  );

  registry.register(
    createTool(
      'deleteWorkflow',
      'Delete a workflow permanently',
      async (input: ToolInputs['deleteWorkflow'], context) => {
        const _result = await context.resources.workflows.delete(input.id);

        context.logger.info({ workflowId: input.id }, 'Deleted workflow');

        return {
          success: true,
          workflowId: input.id,
          message: 'Workflow deleted successfully',
        };
      }
    )
  );

  registry.register(
    createTool(
      'activateWorkflow',
      'Activate a workflow to enable automatic execution',
      async (input: ToolInputs['activateWorkflow'], context) => {
        const _result = await context.resources.workflows.activate(input.id);

        context.logger.info({ workflowId: input.id }, 'Activated workflow');

        return {
          success: true,
          workflowId: input.id,
          status: 'active',
          message: 'Workflow activated successfully',
        };
      }
    )
  );

  registry.register(
    createTool(
      'deactivateWorkflow',
      'Deactivate a workflow to prevent automatic execution',
      async (input: ToolInputs['deactivateWorkflow'], context) => {
        const _result = await context.resources.workflows.deactivate(input.id);

        context.logger.info({ workflowId: input.id }, 'Deactivated workflow');

        return {
          success: true,
          workflowId: input.id,
          status: 'inactive',
          message: 'Workflow deactivated successfully',
        };
      }
    )
  );

  registry.register(
    createTool(
      'getWorkflowTags',
      'Get all tags associated with a workflow',
      async (input: ToolInputs['getWorkflowTags'], context) => {
        const tags = await context.resources.workflows.getTags(input.id);

        context.logger.info(
          {
            workflowId: input.id,
            tagCount: Array.isArray(tags) ? tags.length : 0,
          },
          'Retrieved workflow tags'
        );

        return {
          workflowId: input.id,
          tags,
        };
      }
    )
  );

  registry.register(
    createTool(
      'updateWorkflowTags',
      'Update the tags associated with a workflow',
      async (input: ToolInputs['updateWorkflowTags'], context) => {
        const _result = await context.resources.workflows.updateTags(input.id, input.tags);

        context.logger.info(
          {
            workflowId: input.id,
            tagCount: input.tags.length,
            tags: input.tags,
          },
          'Updated workflow tags'
        );

        return {
          success: true,
          workflowId: input.id,
          tags: input.tags,
          message: 'Workflow tags updated successfully',
        };
      }
    )
  );

  registry.register(
    createTool(
      'transferWorkflow',
      'Transfer a workflow to a different project',
      async (input: ToolInputs['transferWorkflow'], context) => {
        const _result = await context.resources.workflows.transfer(input.id, input.projectId);

        context.logger.info(
          {
            workflowId: input.id,
            targetProjectId: input.projectId,
          },
          'Transferred workflow'
        );

        return {
          success: true,
          workflowId: input.id,
          projectId: input.projectId,
          message: 'Workflow transferred successfully',
        };
      }
    )
  );

  registry.register(
    createTool(
      'getWorkflowStats',
      'Get execution statistics and recent activity for a workflow',
      async (input: ToolInputs['getWorkflowStats'], context) => {
        const stats = await context.resources.workflows.getStats(input.id);

        context.logger.info(
          {
            workflowId: input.id,
            totalExecutions: stats.executions.total,
            successRate:
              stats.executions.total > 0
                ? `${((stats.executions.success / stats.executions.total) * 100).toFixed(1)}%`
                : 'N/A',
          },
          'Retrieved workflow stats'
        );

        return {
          workflowId: input.id,
          stats,
        };
      }
    )
  );
}
