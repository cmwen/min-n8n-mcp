import type { ToolRegistry } from './registry.js';
import { createTool } from './registry.js';

export async function registerUserTools(registry: ToolRegistry): Promise<void> {
  // Placeholder implementations - will be implemented in Stage 5

  registry.register(
    createTool('listUsers', 'List all users', async (input, context) => {
      // TODO: Implement in Stage 5
      context.logger.info('listUsers called (placeholder)');
      return { message: 'Tool not yet implemented' };
    })
  );

  registry.register(
    createTool('createUser', 'Create a new user', async (input, context) => {
      // TODO: Implement in Stage 5
      context.logger.info('createUser called (placeholder)');
      return { message: 'Tool not yet implemented' };
    })
  );

  registry.register(
    createTool('getUser', 'Get a specific user by ID', async (input, context) => {
      // TODO: Implement in Stage 5
      context.logger.info('getUser called (placeholder)');
      return { message: 'Tool not yet implemented' };
    })
  );

  registry.register(
    createTool('deleteUser', 'Delete a user', async (input, context) => {
      // TODO: Implement in Stage 5
      context.logger.info('deleteUser called (placeholder)');
      return { message: 'Tool not yet implemented' };
    })
  );

  registry.register(
    createTool('changeUserRole', 'Change user role', async (input, context) => {
      // TODO: Implement in Stage 5
      context.logger.info('changeUserRole called (placeholder)');
      return { message: 'Tool not yet implemented' };
    })
  );
}
