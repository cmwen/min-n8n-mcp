import type { ToolInputs } from '../schemas/index.js';
import type { ToolRegistry } from './registry.js';
import { createTool } from './registry.js';

export async function registerTagTools(registry: ToolRegistry): Promise<void> {
  registry.register(
    createTool(
      'createTag',
      'Create a new tag for organizing workflows and other resources',
      async (input: ToolInputs['createTag'], context) => {
        const tag = await context.resources.tags.create(input.data);

        context.logger.info(
          {
            tagId: tag.id,
            name: tag.name,
          },
          'Created tag'
        );

        return tag;
      }
    )
  );

  registry.register(
    createTool(
      'listTags',
      'List all available tags in the system',
      async (input: ToolInputs['listTags'], context) => {
        const result = await context.resources.tags.list(input);

        context.logger.info(
          {
            totalFetched: result.totalFetched,
          },
          'Listed tags'
        );

        return {
          tags: result.data,
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
      'getTag',
      'Get detailed information about a specific tag',
      async (input: ToolInputs['getTag'], context) => {
        const tag = await context.resources.tags.get(input.id);

        context.logger.info({ tagId: input.id }, 'Retrieved tag');

        return tag;
      }
    )
  );

  registry.register(
    createTool(
      'updateTag',
      'Update the properties of an existing tag',
      async (input: ToolInputs['updateTag'], context) => {
        const tag = await context.resources.tags.update(input.id, input.data);

        context.logger.info(
          {
            tagId: input.id,
            updatedFields: Object.keys(input.data),
          },
          'Updated tag'
        );

        return tag;
      }
    )
  );

  registry.register(
    createTool(
      'deleteTag',
      'Delete a tag permanently',
      async (input: ToolInputs['deleteTag'], context) => {
        const _result = await context.resources.tags.delete(input.id);

        context.logger.info({ tagId: input.id }, 'Deleted tag');

        return {
          success: true,
          tagId: input.id,
          message: 'Tag deleted successfully',
        };
      }
    )
  );
}
