import type { ToolInputs } from '../schemas/index.js';
import type { ToolRegistry } from './registry.js';
import { createTool } from './registry.js';

export async function registerVariableTools(registry: ToolRegistry): Promise<void> {
  registry.register(
    createTool(
      'createVariable',
      'Create a new environment variable for use in workflows',
      async (input: ToolInputs['createVariable'], context) => {
        const variable = await context.resources.variables.create(input.data);

        context.logger.info(
          {
            variableId: variable.id,
            key: variable.key,
            type: variable.type,
          },
          'Created variable'
        );

        return variable;
      }
    )
  );

  registry.register(
    createTool(
      'listVariables',
      'List all environment variables available in the system',
      async (input: ToolInputs['listVariables'], context) => {
        const result = await context.resources.variables.list(input);

        context.logger.info(
          {
            totalFetched: result.totalFetched,
          },
          'Listed variables'
        );

        return {
          variables: result.data,
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
      'updateVariable',
      'Update the value or properties of an existing environment variable',
      async (input: ToolInputs['updateVariable'], context) => {
        const variable = await context.resources.variables.update(input.id, input.data);

        context.logger.info(
          {
            variableId: input.id,
            updatedFields: Object.keys(input.data),
          },
          'Updated variable'
        );

        return variable;
      }
    )
  );

  registry.register(
    createTool(
      'deleteVariable',
      'Delete an environment variable permanently',
      async (input: ToolInputs['deleteVariable'], context) => {
        const result = await context.resources.variables.delete(input.id);

        context.logger.info({ variableId: input.id }, 'Deleted variable');

        return {
          success: true,
          variableId: input.id,
          message: 'Variable deleted successfully',
        };
      }
    )
  );
}
