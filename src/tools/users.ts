import type { ToolInputs } from '../schemas/index.js';
import type { ToolRegistry } from './registry.js';
import { createTool } from './registry.js';

export async function registerUserTools(registry: ToolRegistry): Promise<void> {
  registry.register(
    createTool(
      'listUsers',
      'List all users in the n8n instance with optional role information',
      async (input: ToolInputs['listUsers'], context) => {
        const result = await context.resources.users.list(input);

        context.logger.info(
          {
            totalFetched: result.totalFetched,
            includeRole: input.includeRole,
          },
          'Listed users'
        );

        return {
          users: result.data,
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
      'createUser',
      'Create a new user account with specified details and role',
      async (input: ToolInputs['createUser'], context) => {
        const user = await context.resources.users.create(input.data);

        context.logger.info(
          {
            userId: user.id,
            email: user.email,
            role: user.role,
          },
          'Created user'
        );

        // Remove sensitive data from response
        const { password, ...safeUser } = user;

        return {
          ...safeUser,
          message: 'User created successfully',
        };
      }
    )
  );

  registry.register(
    createTool(
      'getUser',
      'Get detailed information about a specific user by ID or email',
      async (input: ToolInputs['getUser'], context) => {
        const user = await context.resources.users.get(input.id, {
          includeRole: input.includeRole,
        });

        context.logger.info(
          {
            userId: input.id,
            includeRole: input.includeRole,
          },
          'Retrieved user'
        );

        return user;
      }
    )
  );

  registry.register(
    createTool(
      'deleteUser',
      'Delete a user account permanently',
      async (input: ToolInputs['deleteUser'], context) => {
        const result = await context.resources.users.delete(input.id);

        context.logger.info({ userId: input.id }, 'Deleted user');

        return {
          success: true,
          userId: input.id,
          message: 'User deleted successfully',
        };
      }
    )
  );

  registry.register(
    createTool(
      'changeUserRole',
      'Change the global role of a user',
      async (input: ToolInputs['changeUserRole'], context) => {
        const normalizedRole = input.role.includes(':') ? input.role : `global:${input.role}`;
        const result = await context.resources.users.changeRole(input.id, normalizedRole);

        context.logger.info(
          {
            userId: input.id,
            newRole: normalizedRole,
          },
          'Changed user role'
        );

        return {
          success: true,
          userId: input.id,
          role: normalizedRole,
          message: 'User role changed successfully',
        };
      }
    )
  );
}
