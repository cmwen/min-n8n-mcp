import type { ToolInputs } from '../schemas/index.js';
import { filterExecutionList, getModeFromContext } from './dataFilters.js';
import type { ToolRegistry } from './registry.js';
import { createTool } from './registry.js';

export async function registerExecutionTools(registry: ToolRegistry): Promise<void> {
  registry.register(
    createTool(
      'listExecutions',
      'List workflow executions with optional filtering by workflow, status, and data inclusion',
      async (input: ToolInputs['listExecutions'], context) => {
        const result = await context.resources.executions.list(input);
        const mode = getModeFromContext(context);

        context.logger.info(
          {
            totalFetched: result.totalFetched,
            pagesFetched: result.pagesFetched,
            filters: input,
            mode,
          },
          'Listed executions'
        );

        return {
          executions: filterExecutionList(result.data, mode),
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
      'getExecution',
      'Get detailed information about a specific execution',
      async (input: ToolInputs['getExecution'], context) => {
        const execution = await context.resources.executions.get(input.id, {
          includeData: input.includeData,
        });
        const mode = getModeFromContext(context);

        context.logger.info(
          {
            executionId: input.id,
            includeData: input.includeData,
            status: execution.status,
            mode,
          },
          'Retrieved execution'
        );

        return execution;
      }
    )
  );

  registry.register(
    createTool(
      'deleteExecution',
      'Delete an execution record permanently',
      async (input: ToolInputs['deleteExecution'], context) => {
        const result = await context.resources.executions.delete(input.id);

        context.logger.info({ executionId: input.id }, 'Deleted execution');

        return {
          success: true,
          executionId: input.id,
          message: 'Execution deleted successfully',
        };
      }
    )
  );
}
