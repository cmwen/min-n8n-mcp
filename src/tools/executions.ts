import type { ToolRegistry } from './registry.js';
import { createTool } from './registry.js';

export async function registerExecutionTools(registry: ToolRegistry): Promise<void> {
  // Placeholder implementations - will be implemented in Stage 5

  registry.register(
    createTool(
      'listExecutions',
      'List workflow executions with optional filtering',
      async (input, context) => {
        // TODO: Implement in Stage 5
        context.logger.info('listExecutions called (placeholder)');
        return { message: 'Tool not yet implemented' };
      }
    )
  );

  registry.register(
    createTool('getExecution', 'Get a specific execution by ID', async (input, context) => {
      // TODO: Implement in Stage 5
      context.logger.info('getExecution called (placeholder)');
      return { message: 'Tool not yet implemented' };
    })
  );

  registry.register(
    createTool('deleteExecution', 'Delete an execution record', async (input, context) => {
      // TODO: Implement in Stage 5
      context.logger.info('deleteExecution called (placeholder)');
      return { message: 'Tool not yet implemented' };
    })
  );
}
