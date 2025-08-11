import type { ToolInputs } from '../schemas/index.js';
import type { ToolRegistry } from './registry.js';
import { createTool } from './registry.js';

export async function registerSourceControlTools(registry: ToolRegistry): Promise<void> {
  registry.register(
    createTool(
      'pullSourceControl',
      'Pull the latest changes from the configured source control repository',
      async (input: ToolInputs['pullSourceControl'], context) => {
        const pullResult = await context.resources.sourceControl.pull(input.data as any);

        context.logger.info(
          {
            success: pullResult.success,
            changesCount: pullResult.changes?.length || 0,
            timestamp: pullResult.timestamp,
          },
          'Pulled from source control'
        );

        return {
          result: pullResult,
          message: pullResult.success
            ? 'Source control pull completed successfully'
            : 'Source control pull failed',
        };
      }
    )
  );
}
