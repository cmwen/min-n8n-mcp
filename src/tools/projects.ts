import type { ProjectUserRelation, ProjectUserRole } from '../resources/index.js';
import type { ToolInputs } from '../schemas/index.js';
import type { ToolRegistry } from './registry.js';
import { createTool } from './registry.js';

export async function registerProjectTools(registry: ToolRegistry): Promise<void> {
  registry.register(
    createTool(
      'createProject',
      'Create a new project for organizing workflows, credentials, and team collaboration',
      async (input: ToolInputs['createProject'], context) => {
        const project = await context.resources.projects.create(input.data);

        context.logger.info(
          {
            projectId: project.id,
            name: project.name,
            type: project.type,
          },
          'Created project'
        );

        return project;
      }
    )
  );

  registry.register(
    createTool(
      'listProjects',
      'List all projects available to the current user',
      async (input: ToolInputs['listProjects'], context) => {
        const result = await context.resources.projects.list(input);

        context.logger.info(
          {
            totalFetched: result.totalFetched,
          },
          'Listed projects'
        );

        return {
          projects: result.data,
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
      'updateProject',
      'Update the properties of an existing project',
      async (input: ToolInputs['updateProject'], context) => {
        const project = await context.resources.projects.update(input.id, input.data);

        context.logger.info(
          {
            projectId: input.id,
            updatedFields: Object.keys(input.data),
          },
          'Updated project'
        );

        return project;
      }
    )
  );

  registry.register(
    createTool(
      'deleteProject',
      'Delete a project permanently along with all its associated resources',
      async (input: ToolInputs['deleteProject'], context) => {
        const result = await context.resources.projects.delete(input.id);

        context.logger.info({ projectId: input.id }, 'Deleted project');

        return {
          success: true,
          projectId: input.id,
          message: 'Project deleted successfully',
        };
      }
    )
  );

  registry.register(
    createTool(
      'addUsersToProject',
      'Add one or more users to a project with specified roles',
      async (input: ToolInputs['addUsersToProject'], context) => {
        const relations: ProjectUserRelation[] = input.users.map((user) => {
          const rawRole = user.role ? String(user.role) : 'project:viewer';
          const normalized = rawRole.startsWith('project:') ? rawRole : `project:${rawRole}`;

          if (
            normalized !== 'project:owner' &&
            normalized !== 'project:admin' &&
            normalized !== 'project:editor' &&
            normalized !== 'project:viewer'
          ) {
            throw new Error(
              `Invalid project role '${rawRole}'. Expected owner|admin|editor|viewer (optionally prefixed with project:).`
            );
          }

          return {
            userId: user.id,
            role: normalized as ProjectUserRole,
          };
        });

        const result = await context.resources.projects.addUsers(input.projectId, relations);

        context.logger.info(
          {
            projectId: input.projectId,
            userCount: input.users.length,
            users: relations,
          },
          'Added users to project'
        );

        return {
          success: true,
          projectId: input.projectId,
          usersAdded: input.users.length,
          result,
          message: 'Users added to project successfully',
        };
      }
    )
  );

  registry.register(
    createTool(
      'deleteUserFromProject',
      'Remove a user from a project',
      async (input: ToolInputs['deleteUserFromProject'], context) => {
        const result = await context.resources.projects.removeUser(input.projectId, input.userId);

        context.logger.info(
          {
            projectId: input.projectId,
            userId: input.userId,
          },
          'Removed user from project'
        );

        return {
          success: true,
          projectId: input.projectId,
          userId: input.userId,
          message: 'User removed from project successfully',
        };
      }
    )
  );

  registry.register(
    createTool(
      'changeUserRoleInProject',
      'Change the role of a user within a specific project',
      async (input: ToolInputs['changeUserRoleInProject'], context) => {
        const result = await context.resources.projects.updateUserRole(
          input.projectId,
          input.userId,
          input.role
        );

        context.logger.info(
          {
            projectId: input.projectId,
            userId: input.userId,
            newRole: input.role,
          },
          'Changed user role in project'
        );

        return {
          success: true,
          projectId: input.projectId,
          userId: input.userId,
          role: input.role,
          message: 'User role changed successfully',
        };
      }
    )
  );
}
