# Stage 5: Tool Implementation

## Overview
Implement all MCP tools by connecting them to the resource clients with proper input validation, error handling, and response formatting.

## Tasks

### Task 5.1: Workflow Tools Implementation
**Estimated Time**: 40 minutes

Update src/tools/workflows.ts with full implementation:

```typescript
import type { ToolRegistry } from './registry.js';
import { createTool } from './registry.js';
import type { ToolInputs } from '../schemas/index.js';

export async function registerWorkflowTools(registry: ToolRegistry): Promise<void> {
  registry.register(createTool(
    'listWorkflows',
    'List n8n workflows with optional filtering by active status, name, tags, or project',
    async (input: ToolInputs['listWorkflows'], context) => {
      const result = await context.resources.workflows.list(input.query || {});
      
      context.logger.info({
        totalFetched: result.totalFetched,
        pagesFetched: result.pagesFetched,
        hasMore: !!result.nextCursor,
      }, 'Listed workflows');

      return {
        workflows: result.data,
        pagination: {
          totalFetched: result.totalFetched,
          pagesFetched: result.pagesFetched,
          nextCursor: result.nextCursor,
        },
      };
    }
  ));

  registry.register(createTool(
    'getWorkflow',
    'Get a specific workflow by ID, optionally excluding pinned data',
    async (input: ToolInputs['getWorkflow'], context) => {
      const workflow = await context.resources.workflows.get(input.id, {
        excludePinnedData: input.excludePinnedData,
      });
      
      context.logger.info({ workflowId: input.id }, 'Retrieved workflow');
      
      return workflow;
    }
  ));

  registry.register(createTool(
    'createWorkflow',
    'Create a new workflow with specified configuration',
    async (input: ToolInputs['createWorkflow'], context) => {
      const workflow = await context.resources.workflows.create(input.data);
      
      context.logger.info({
        workflowId: workflow.id,
        name: workflow.name,
      }, 'Created workflow');
      
      return workflow;
    }
  ));

  registry.register(createTool(
    'updateWorkflow',
    'Update an existing workflow with new configuration',
    async (input: ToolInputs['updateWorkflow'], context) => {
      const workflow = await context.resources.workflows.update(input.id, input.data);
      
      context.logger.info({
        workflowId: input.id,
        updatedFields: Object.keys(input.data),
      }, 'Updated workflow');
      
      return workflow;
    }
  ));

  registry.register(createTool(
    'deleteWorkflow',
    'Delete a workflow permanently',
    async (input: ToolInputs['deleteWorkflow'], context) => {
      const result = await context.resources.workflows.delete(input.id);
      
      context.logger.info({ workflowId: input.id }, 'Deleted workflow');
      
      return {
        success: true,
        workflowId: input.id,
        message: 'Workflow deleted successfully',
      };
    }
  ));

  registry.register(createTool(
    'activateWorkflow',
    'Activate a workflow to enable automatic execution',
    async (input: ToolInputs['activateWorkflow'], context) => {
      const result = await context.resources.workflows.activate(input.id);
      
      context.logger.info({ workflowId: input.id }, 'Activated workflow');
      
      return {
        success: true,
        workflowId: input.id,
        status: 'active',
        message: 'Workflow activated successfully',
      };
    }
  ));

  registry.register(createTool(
    'deactivateWorkflow',
    'Deactivate a workflow to prevent automatic execution',
    async (input: ToolInputs['deactivateWorkflow'], context) => {
      const result = await context.resources.workflows.deactivate(input.id);
      
      context.logger.info({ workflowId: input.id }, 'Deactivated workflow');
      
      return {
        success: true,
        workflowId: input.id,
        status: 'inactive',
        message: 'Workflow deactivated successfully',
      };
    }
  ));

  registry.register(createTool(
    'runWorkflow',
    'Execute a workflow manually with optional input data',
    async (input: ToolInputs['runWorkflow'], context) => {
      const execution = await context.resources.workflows.run(input.id, input.input);
      
      context.logger.info({
        workflowId: input.id,
        executionId: execution.id,
        hasInput: !!input.input,
      }, 'Started workflow execution');
      
      return {
        execution,
        workflowId: input.id,
        message: 'Workflow execution started',
      };
    }
  ));

  registry.register(createTool(
    'getWorkflowTags',
    'Get all tags associated with a workflow',
    async (input: ToolInputs['getWorkflowTags'], context) => {
      const tags = await context.resources.workflows.getTags(input.id);
      
      context.logger.info({
        workflowId: input.id,
        tagCount: Array.isArray(tags) ? tags.length : 0,
      }, 'Retrieved workflow tags');
      
      return {
        workflowId: input.id,
        tags,
      };
    }
  ));

  registry.register(createTool(
    'updateWorkflowTags',
    'Update the tags associated with a workflow',
    async (input: ToolInputs['updateWorkflowTags'], context) => {
      const result = await context.resources.workflows.updateTags(input.id, input.tags);
      
      context.logger.info({
        workflowId: input.id,
        tagCount: input.tags.length,
        tags: input.tags,
      }, 'Updated workflow tags');
      
      return {
        success: true,
        workflowId: input.id,
        tags: input.tags,
        message: 'Workflow tags updated successfully',
      };
    }
  ));

  registry.register(createTool(
    'transferWorkflow',
    'Transfer a workflow to a different project',
    async (input: ToolInputs['transferWorkflow'], context) => {
      const result = await context.resources.workflows.transfer(input.id, input.projectId);
      
      context.logger.info({
        workflowId: input.id,
        targetProjectId: input.projectId,
      }, 'Transferred workflow');
      
      return {
        success: true,
        workflowId: input.id,
        projectId: input.projectId,
        message: 'Workflow transferred successfully',
      };
    }
  ));

  registry.register(createTool(
    'getWorkflowStats',
    'Get execution statistics and recent activity for a workflow',
    async (input: ToolInputs['getWorkflowStats'], context) => {
      const stats = await context.resources.workflows.getStats(input.id);
      
      context.logger.info({
        workflowId: input.id,
        totalExecutions: stats.executions.total,
        successRate: stats.executions.total > 0 
          ? (stats.executions.success / stats.executions.total * 100).toFixed(1) + '%'
          : 'N/A',
      }, 'Retrieved workflow stats');
      
      return {
        workflowId: input.id,
        stats,
      };
    }
  ));
}
```

**Action Items**:
1. Replace placeholder in src/tools/workflows.ts with exact content above
2. Implement all workflow tools with proper error handling
3. Add meaningful response formatting
4. Include comprehensive logging for each operation
5. Test all workflow tools work correctly

### Task 5.2: Execution Tools Implementation
**Estimated Time**: 20 minutes

Update src/tools/executions.ts:

```typescript
import type { ToolRegistry } from './registry.js';
import { createTool } from './registry.js';
import type { ToolInputs } from '../schemas/index.js';

export async function registerExecutionTools(registry: ToolRegistry): Promise<void> {
  registry.register(createTool(
    'listExecutions',
    'List workflow executions with optional filtering by workflow, status, and data inclusion',
    async (input: ToolInputs['listExecutions'], context) => {
      const result = await context.resources.executions.list(input.query || {});
      
      context.logger.info({
        totalFetched: result.totalFetched,
        pagesFetched: result.pagesFetched,
        filters: input.query,
      }, 'Listed executions');

      return {
        executions: result.data,
        pagination: {
          totalFetched: result.totalFetched,
          pagesFetched: result.pagesFetched,
          nextCursor: result.nextCursor,
        },
      };
    }
  ));

  registry.register(createTool(
    'getExecution',
    'Get detailed information about a specific execution',
    async (input: ToolInputs['getExecution'], context) => {
      const execution = await context.resources.executions.get(input.id, {
        includeData: input.includeData,
      });
      
      context.logger.info({
        executionId: input.id,
        includeData: input.includeData,
        status: execution.status,
      }, 'Retrieved execution');
      
      return execution;
    }
  ));

  registry.register(createTool(
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
  ));
}
```

**Action Items**:
1. Replace placeholder in src/tools/executions.ts with exact content above
2. Implement execution tools with proper filtering support
3. Handle includeData option appropriately
4. Test execution listing and retrieval

### Task 5.3: Credential Tools Implementation
**Estimated Time**: 15 minutes

Update src/tools/credentials.ts:

```typescript
import type { ToolRegistry } from './registry.js';
import { createTool } from './registry.js';
import type { ToolInputs } from '../schemas/index.js';

export async function registerCredentialTools(registry: ToolRegistry): Promise<void> {
  registry.register(createTool(
    'createCredential',
    'Create a new credential for authenticating with external services',
    async (input: ToolInputs['createCredential'], context) => {
      const credential = await context.resources.credentials.create(input.data);
      
      context.logger.info({
        credentialId: credential.id,
        name: credential.name,
        type: credential.type,
      }, 'Created credential');
      
      return credential;
    }
  ));

  registry.register(createTool(
    'deleteCredential',
    'Delete a credential permanently',
    async (input: ToolInputs['deleteCredential'], context) => {
      const result = await context.resources.credentials.delete(input.id);
      
      context.logger.info({ credentialId: input.id }, 'Deleted credential');
      
      return {
        success: true,
        credentialId: input.id,
        message: 'Credential deleted successfully',
      };
    }
  ));

  registry.register(createTool(
    'getCredentialType',
    'Get the schema and configuration options for a credential type',
    async (input: ToolInputs['getCredentialType'], context) => {
      const schema = await context.resources.credentials.getTypeSchema(input.credentialTypeName);
      
      context.logger.info({
        credentialTypeName: input.credentialTypeName,
      }, 'Retrieved credential type schema');
      
      return {
        credentialTypeName: input.credentialTypeName,
        schema,
      };
    }
  ));

  registry.register(createTool(
    'transferCredential',
    'Transfer a credential to a different project',
    async (input: ToolInputs['transferCredential'], context) => {
      const result = await context.resources.credentials.transfer(input.id, input.projectId);
      
      context.logger.info({
        credentialId: input.id,
        targetProjectId: input.projectId,
      }, 'Transferred credential');
      
      return {
        success: true,
        credentialId: input.id,
        projectId: input.projectId,
        message: 'Credential transferred successfully',
      };
    }
  ));
}
```

**Action Items**:
1. Replace placeholder in src/tools/credentials.ts with exact content above
2. Implement credential management tools
3. Handle credential type schema retrieval
4. Test credential operations

### Task 5.4: User Management Tools Implementation
**Estimated Time**: 25 minutes

Update src/tools/users.ts:

```typescript
import type { ToolRegistry } from './registry.js';
import { createTool } from './registry.js';
import type { ToolInputs } from '../schemas/index.js';

export async function registerUserTools(registry: ToolRegistry): Promise<void> {
  registry.register(createTool(
    'listUsers',
    'List all users in the n8n instance with optional role information',
    async (input: ToolInputs['listUsers'], context) => {
      const result = await context.resources.users.list(input.query || {});
      
      context.logger.info({
        totalFetched: result.totalFetched,
        includeRole: input.query?.includeRole,
      }, 'Listed users');

      return {
        users: result.data,
        pagination: {
          totalFetched: result.totalFetched,
          pagesFetched: result.pagesFetched,
          nextCursor: result.nextCursor,
        },
      };
    }
  ));

  registry.register(createTool(
    'createUser',
    'Create a new user account with specified details and role',
    async (input: ToolInputs['createUser'], context) => {
      const user = await context.resources.users.create(input.data);
      
      context.logger.info({
        userId: user.id,
        email: user.email,
        role: user.role,
      }, 'Created user');
      
      // Remove sensitive data from response
      const { password, ...safeUser } = user;
      
      return {
        ...safeUser,
        message: 'User created successfully',
      };
    }
  ));

  registry.register(createTool(
    'getUser',
    'Get detailed information about a specific user by ID or email',
    async (input: ToolInputs['getUser'], context) => {
      const user = await context.resources.users.get(input.id, {
        includeRole: input.includeRole,
      });
      
      context.logger.info({
        userId: input.id,
        includeRole: input.includeRole,
      }, 'Retrieved user');
      
      return user;
    }
  ));

  registry.register(createTool(
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
  ));

  registry.register(createTool(
    'changeUserRole',
    'Change the global role of a user',
    async (input: ToolInputs['changeUserRole'], context) => {
      const result = await context.resources.users.changeRole(input.id, input.role);
      
      context.logger.info({
        userId: input.id,
        newRole: input.role,
      }, 'Changed user role');
      
      return {
        success: true,
        userId: input.id,
        role: input.role,
        message: 'User role changed successfully',
      };
    }
  ));
}
```

**Action Items**:
1. Replace placeholder in src/tools/users.ts with exact content above
2. Implement user management with proper data sanitization
3. Remove sensitive data from responses
4. Test user operations and role changes

### Task 5.5: Remaining Tool Implementations
**Estimated Time**: 35 minutes

Implement the remaining tool files. Update src/tools/tags.ts:

```typescript
import type { ToolRegistry } from './registry.js';
import { createTool } from './registry.js';
import type { ToolInputs } from '../schemas/index.js';

export async function registerTagTools(registry: ToolRegistry): Promise<void> {
  registry.register(createTool(
    'createTag',
    'Create a new tag for organizing workflows and other resources',
    async (input: ToolInputs['createTag'], context) => {
      const tag = await context.resources.tags.create(input.data);
      
      context.logger.info({
        tagId: tag.id,
        name: tag.name,
      }, 'Created tag');
      
      return tag;
    }
  ));

  registry.register(createTool(
    'listTags',
    'List all available tags in the system',
    async (input: ToolInputs['listTags'], context) => {
      const result = await context.resources.tags.list(input.query || {});
      
      context.logger.info({
        totalFetched: result.totalFetched,
      }, 'Listed tags');

      return {
        tags: result.data,
        pagination: {
          totalFetched: result.totalFetched,
          pagesFetched: result.pagesFetched,
          nextCursor: result.nextCursor,
        },
      };
    }
  ));

  registry.register(createTool(
    'getTag',
    'Get detailed information about a specific tag',
    async (input: ToolInputs['getTag'], context) => {
      const tag = await context.resources.tags.get(input.id);
      
      context.logger.info({ tagId: input.id }, 'Retrieved tag');
      
      return tag;
    }
  ));

  registry.register(createTool(
    'updateTag',
    'Update the properties of an existing tag',
    async (input: ToolInputs['updateTag'], context) => {
      const tag = await context.resources.tags.update(input.id, input.data);
      
      context.logger.info({
        tagId: input.id,
        updatedFields: Object.keys(input.data),
      }, 'Updated tag');
      
      return tag;
    }
  ));

  registry.register(createTool(
    'deleteTag',
    'Delete a tag permanently',
    async (input: ToolInputs['deleteTag'], context) => {
      const result = await context.resources.tags.delete(input.id);
      
      context.logger.info({ tagId: input.id }, 'Deleted tag');
      
      return {
        success: true,
        tagId: input.id,
        message: 'Tag deleted successfully',
      };
    }
  ));
}
```

Continue implementing similar patterns for:

**src/tools/variables.ts** - Environment variable management
**src/tools/projects.ts** - Project and team management  
**src/tools/audit.ts** - Audit log generation
**src/tools/sourceControl.ts** - Source control operations

Each should follow the same pattern:
- Use proper input validation from schemas
- Call appropriate resource client methods
- Add comprehensive logging
- Format responses consistently
- Handle errors gracefully

**Action Items**:
1. Complete src/tools/tags.ts with exact content above
2. Implement all remaining tool files following the same pattern
3. Ensure consistent error handling across all tools
4. Add proper response formatting for all operations
5. Test all tool implementations

### Task 5.6: Error Handling and Response Formatting
**Estimated Time**: 20 minutes

Create src/tools/utils.ts for common tool utilities:

```typescript
import type { Logger } from '../logging.js';
import { HttpError } from '../http/errors.js';

export interface ToolResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    message: string;
    code?: string;
    details?: any;
  };
}

export function formatSuccessResponse<T>(data: T): ToolResponse<T> {
  return {
    success: true,
    data,
  };
}

export function formatErrorResponse(error: unknown): ToolResponse {
  if (error instanceof HttpError) {
    return {
      success: false,
      error: {
        type: error.toMcpErrorType(),
        message: error.message,
        code: error.code,
        details: {
          status: error.status,
          ...(error.details && typeof error.details === 'object' ? error.details : {}),
        },
      },
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: {
        type: 'Unknown',
        message: error.message,
      },
    };
  }

  return {
    success: false,
    error: {
      type: 'Unknown',
      message: String(error),
    },
  };
}

export async function executeToolWithErrorHandling<T>(
  operation: () => Promise<T>,
  context: { logger: Logger },
  operationName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    context.logger.error({
      operation: operationName,
      error: error instanceof Error ? error.message : String(error),
    }, 'Tool operation failed');
    
    throw error; // Re-throw to let MCP handle it
  }
}

export function sanitizeUserData(user: any): any {
  if (!user || typeof user !== 'object') {
    return user;
  }

  const { password, apiKey, token, secret, ...sanitized } = user;
  return sanitized;
}

export function formatPaginationResponse<T>(
  data: T[],
  pagination: {
    totalFetched: number;
    pagesFetched: number;
    nextCursor?: string;
  }
) {
  return {
    data,
    pagination: {
      totalFetched: pagination.totalFetched,
      pagesFetched: pagination.pagesFetched,
      hasMore: !!pagination.nextCursor,
      nextCursor: pagination.nextCursor,
    },
  };
}
```

**Action Items**:
1. Create src/tools/utils.ts with exact content above
2. Provide consistent response formatting utilities
3. Add error handling helpers
4. Include data sanitization functions
5. Test utility functions work correctly

### Task 5.7: Tool Performance and Logging
**Estimated Time**: 15 minutes

Add performance monitoring to tool registry. Update src/tools/registry.ts:

```typescript
// Add this to the CallToolRequestSchema handler in setupMcpHandlers method
// Replace the existing try-catch block with:

try {
  const startTime = Date.now();
  const result = await tool.handler(validation.data, context);
  const duration = Date.now() - startTime;

  // Log performance metrics
  if (duration > 1000) {
    context.logger.warn({
      toolName: name,
      duration,
      slow: true,
    }, 'Slow tool execution detected');
  }

  context.logger.info({
    toolName: name,
    duration,
    success: true,
    resultSize: typeof result === 'string' ? result.length : JSON.stringify(result).length,
  }, 'Tool executed successfully');

  return {
    content: [
      {
        type: 'text',
        text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
      },
    ],
  };
} catch (error) {
  const duration = Date.now() - startTime;
  
  context.logger.error({
    toolName: name,
    duration,
    error: error instanceof Error ? error.message : String(error),
    success: false,
  }, 'Tool execution failed');

  // Include helpful context in error message
  const errorMessage = error instanceof Error ? error.message : String(error);
  throw new Error(`Tool '${name}' failed: ${errorMessage}`);
}
```

**Action Items**:
1. Update the tool execution handler with performance monitoring
2. Add slow execution warnings
3. Include result size logging
4. Enhance error context
5. Test performance logging works

## Validation Checklist

- [ ] All workflow tools implemented with full functionality
- [ ] Execution tools handle filtering and data options correctly
- [ ] Credential tools manage authentication securely
- [ ] User management tools sanitize sensitive data
- [ ] Tag tools implement CRUD operations properly
- [ ] Variable tools handle environment configuration
- [ ] Project tools manage team collaboration features
- [ ] Audit tools generate system reports
- [ ] Source control tools handle repository operations
- [ ] Error handling is consistent across all tools
- [ ] Response formatting follows standard patterns
- [ ] Performance monitoring logs slow operations
- [ ] All tools integrate properly with resource clients
- [ ] Input validation works correctly for all tools
- [ ] Logging provides adequate debugging information

## Next Stage
Proceed to Stage 6: Testing & Quality once all validation items are complete.
