# Stage 3: MCP Server Core

## Overview
Set up the MCP server with both STDIO and HTTP mode support, tool registration system, and JSON Schema integration.

## Tasks

### Task 3.1: JSON Schema Utilities
**Estimated Time**: 20 minutes

Create src/schemas/index.ts for schema management:

```typescript
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Common schemas used across tools
export const IdSchema = z.string().min(1, 'ID is required');
export const LimitSchema = z.number().int().positive().max(200).optional();
export const CursorSchema = z.string().optional();
export const AutoPaginateSchema = z.boolean().optional();

// Pagination query schema
export const PaginationQuerySchema = z.object({
  limit: LimitSchema,
  cursor: CursorSchema,
  autoPaginate: AutoPaginateSchema,
});

// Common response schemas
export const PaginatedResponseSchema = z.object({
  data: z.array(z.unknown()),
  nextCursor: z.string().optional(),
});

// Workflow-related schemas
export const WorkflowQuerySchema = z.object({
  active: z.boolean().optional(),
  name: z.string().optional(),
  tag: z.union([z.string(), z.array(z.string())]).optional(),
  projectId: z.string().optional(),
}).merge(PaginationQuerySchema);

export const WorkflowCreateSchema = z.object({
  name: z.string().min(1, 'Workflow name is required'),
  nodes: z.array(z.unknown()).optional(),
  connections: z.unknown().optional(),
  active: z.boolean().optional(),
  settings: z.unknown().optional(),
  projectId: z.string().optional(),
});

export const WorkflowUpdateSchema = WorkflowCreateSchema.partial();

// Execution-related schemas
export const ExecutionQuerySchema = z.object({
  workflowId: z.string().optional(),
  status: z.enum(['success', 'error', 'waiting', 'running']).optional(),
  includeData: z.boolean().optional(),
}).merge(PaginationQuerySchema);

// User-related schemas
export const UserCreateSchema = z.object({
  email: z.string().email('Valid email is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.string().optional(),
});

export const UserQuerySchema = z.object({
  includeRole: z.boolean().optional(),
}).merge(PaginationQuerySchema);

// Project-related schemas
export const ProjectCreateSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  type: z.enum(['team', 'personal']).optional(),
});

export const ProjectUpdateSchema = ProjectCreateSchema.partial();

// Tag-related schemas
export const TagCreateSchema = z.object({
  name: z.string().min(1, 'Tag name is required'),
});

export const TagUpdateSchema = TagCreateSchema.partial();

// Variable-related schemas
export const VariableCreateSchema = z.object({
  key: z.string().min(1, 'Variable key is required'),
  value: z.string(),
  type: z.enum(['string', 'boolean', 'number']).optional(),
});

export const VariableUpdateSchema = VariableCreateSchema.partial();

// Credential-related schemas
export const CredentialCreateSchema = z.object({
  name: z.string().min(1, 'Credential name is required'),
  type: z.string().min(1, 'Credential type is required'),
  data: z.unknown(),
  projectId: z.string().optional(),
});

// Tool input schemas
export const ToolInputSchemas = {
  // Workflow tools
  listWorkflows: z.object({
    query: WorkflowQuerySchema.optional(),
  }),
  getWorkflow: z.object({
    id: IdSchema,
    excludePinnedData: z.boolean().optional(),
  }),
  createWorkflow: z.object({
    data: WorkflowCreateSchema,
  }),
  updateWorkflow: z.object({
    id: IdSchema,
    data: WorkflowUpdateSchema,
  }),
  deleteWorkflow: z.object({
    id: IdSchema,
  }),
  activateWorkflow: z.object({
    id: IdSchema,
  }),
  deactivateWorkflow: z.object({
    id: IdSchema,
  }),
  getWorkflowTags: z.object({
    id: IdSchema,
  }),
  updateWorkflowTags: z.object({
    id: IdSchema,
    tags: z.array(z.string()),
  }),
  transferWorkflow: z.object({
    id: IdSchema,
    projectId: IdSchema,
  }),

  // Execution tools
  listExecutions: z.object({
    query: ExecutionQuerySchema.optional(),
  }),
  getExecution: z.object({
    id: IdSchema,
    includeData: z.boolean().optional(),
  }),
  deleteExecution: z.object({
    id: IdSchema,
  }),

  // Credential tools
  createCredential: z.object({
    data: CredentialCreateSchema,
  }),
  deleteCredential: z.object({
    id: IdSchema,
  }),
  getCredentialType: z.object({
    credentialTypeName: z.string().min(1, 'Credential type name is required'),
  }),
  transferCredential: z.object({
    id: IdSchema,
    projectId: IdSchema,
  }),

  // Tag tools
  createTag: z.object({
    data: TagCreateSchema,
  }),
  listTags: z.object({
    query: PaginationQuerySchema.optional(),
  }),
  getTag: z.object({
    id: IdSchema,
  }),
  updateTag: z.object({
    id: IdSchema,
    data: TagUpdateSchema,
  }),
  deleteTag: z.object({
    id: IdSchema,
  }),

  // User tools
  listUsers: z.object({
    query: UserQuerySchema.optional(),
  }),
  createUser: z.object({
    data: UserCreateSchema,
  }),
  getUser: z.object({
    id: z.string().min(1, 'User ID or email is required'),
    includeRole: z.boolean().optional(),
  }),
  deleteUser: z.object({
    id: IdSchema,
  }),
  changeUserRole: z.object({
    id: IdSchema,
    role: z.string().min(1, 'Role is required'),
  }),

  // Variable tools
  createVariable: z.object({
    data: VariableCreateSchema,
  }),
  listVariables: z.object({
    query: PaginationQuerySchema.optional(),
  }),
  updateVariable: z.object({
    id: IdSchema,
    data: VariableUpdateSchema,
  }),
  deleteVariable: z.object({
    id: IdSchema,
  }),

  // Project tools
  createProject: z.object({
    data: ProjectCreateSchema,
  }),
  listProjects: z.object({
    query: PaginationQuerySchema.optional(),
  }),
  updateProject: z.object({
    id: IdSchema,
    data: ProjectUpdateSchema,
  }),
  deleteProject: z.object({
    id: IdSchema,
  }),
  addUsersToProject: z.object({
    projectId: IdSchema,
    users: z.array(z.object({
      id: IdSchema,
      role: z.string().optional(),
    })),
  }),
  deleteUserFromProject: z.object({
    projectId: IdSchema,
    userId: IdSchema,
  }),
  changeUserRoleInProject: z.object({
    projectId: IdSchema,
    userId: IdSchema,
    role: z.string().min(1, 'Role is required'),
  }),

  // Audit tools
  generateAudit: z.object({
    data: z.unknown().optional(),
  }),

  // Source control tools
  pullSourceControl: z.object({
    data: z.unknown().optional(),
  }),
};

export type ToolInputs = {
  [K in keyof typeof ToolInputSchemas]: z.infer<typeof ToolInputSchemas[K]>
};

// Convert Zod schemas to JSON Schema
export function createToolJsonSchemas() {
  const schemas: Record<string, any> = {};
  
  for (const [toolName, zodSchema] of Object.entries(ToolInputSchemas)) {
    schemas[toolName] = zodToJsonSchema(zodSchema, {
      name: `${toolName}Input`,
      $refStrategy: 'none', // Inline all references
    });
  }
  
  return schemas;
}

// Validation helpers
export function validateToolInput<T extends keyof ToolInputs>(
  toolName: T,
  input: unknown
): ToolInputs[T] {
  const schema = ToolInputSchemas[toolName];
  return schema.parse(input);
}

export function safeValidateToolInput<T extends keyof ToolInputs>(
  toolName: T,
  input: unknown
): { success: true; data: ToolInputs[T] } | { success: false; error: string } {
  try {
    const data = validateToolInput(toolName, input);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join('; ');
      return { success: false, error: issues };
    }
    return { success: false, error: String(error) };
  }
}
```

**Action Items**:
1. Create src/schemas/index.ts with exact content above
2. Define all tool input schemas using Zod
3. Create JSON Schema conversion utilities
4. Add validation helpers for tool inputs
5. Test schema validation with various inputs

### Task 3.2: Tool Registry System
**Estimated Time**: 25 minutes

Create src/tools/registry.ts:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { ServerContext } from '../server.js';
import { createToolJsonSchemas, safeValidateToolInput, type ToolInputs } from '../schemas/index.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  handler: (input: any, context: ServerContext) => Promise<any>;
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  private jsonSchemas: Record<string, any>;

  constructor() {
    this.jsonSchemas = createToolJsonSchemas();
  }

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  registerBatch(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  async setupMcpHandlers(server: Server, context: ServerContext): Promise<void> {
    // List tools handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));

      context.logger.debug({ toolCount: tools.length }, 'Listed available tools');
      
      return { tools };
    });

    // Call tool handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      context.logger.debug({ toolName: name }, 'Tool call requested');

      const tool = this.tools.get(name);
      if (!tool) {
        context.logger.error({ toolName: name }, 'Tool not found');
        throw new Error(`Tool '${name}' not found`);
      }

      // Validate input
      const validation = safeValidateToolInput(name as keyof ToolInputs, args);
      if (!validation.success) {
        context.logger.error({
          toolName: name,
          error: validation.error,
          args,
        }, 'Tool input validation failed');
        throw new Error(`Invalid input for tool '${name}': ${validation.error}`);
      }

      try {
        const startTime = Date.now();
        const result = await tool.handler(validation.data, context);
        const duration = Date.now() - startTime;

        context.logger.info({
          toolName: name,
          duration,
          success: true,
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
        const duration = Date.now() - Date.now();
        
        context.logger.error({
          toolName: name,
          duration,
          error: error instanceof Error ? error.message : String(error),
          success: false,
        }, 'Tool execution failed');

        // Re-throw with context
        if (error instanceof Error) {
          throw new Error(`Tool '${name}' failed: ${error.message}`);
        }
        throw new Error(`Tool '${name}' failed: ${String(error)}`);
      }
    });

    context.logger.info({ 
      toolCount: this.tools.size,
      tools: Array.from(this.tools.keys()),
    }, 'MCP tool handlers registered');
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  getToolDefinition(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  clear(): void {
    this.tools.clear();
  }
}

// Factory function to create tools with proper typing
export function createTool<T extends keyof ToolInputs>(
  name: T,
  description: string,
  handler: (input: ToolInputs[T], context: ServerContext) => Promise<any>
): ToolDefinition {
  const jsonSchemas = createToolJsonSchemas();
  
  return {
    name,
    description,
    inputSchema: jsonSchemas[name],
    handler: handler as any,
  };
}
```

**Action Items**:
1. Create src/tools/registry.ts with exact content above
2. Implement tool registration and validation system
3. Set up MCP request handlers for tools
4. Add proper error handling and logging
5. Create typed tool factory function

### Task 3.3: MCP Server Implementation
**Estimated Time**: 30 minutes

Update src/server.ts with full MCP server implementation:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import http from 'node:http';
import type { Config } from './config.js';
import type { Logger } from './logging.js';
import { HttpClient } from './http/client.js';
import { ToolRegistry } from './tools/registry.js';
import { registerAllTools } from './tools/index.js';

export interface ServerContext {
  config: Config;
  logger: Logger;
  httpClient: HttpClient;
}

export interface McpServer {
  server: Server;
  context: ServerContext;
  registry: ToolRegistry;
}

export async function createServer(config: Config, logger: Logger): Promise<McpServer> {
  const httpClient = HttpClient.fromConfig(config, logger);
  
  // Test connection to n8n API
  try {
    logger.info('Testing connection to n8n API...');
    await httpClient.get('/workflows', { limit: 1 });
    logger.info('Successfully connected to n8n API');
  } catch (error) {
    logger.error('Failed to connect to n8n API', error);
    throw new Error(`Cannot connect to n8n API at ${config.n8nApiUrl}. Please verify the URL and API token.`);
  }

  const context: ServerContext = {
    config,
    logger,
    httpClient,
  };

  // Create MCP server
  const server = new Server(
    {
      name: 'min-n8n-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Create tool registry and register all tools
  const registry = new ToolRegistry();
  await registerAllTools(registry);
  await registry.setupMcpHandlers(server, context);

  logger.info({
    mode: config.httpMode ? 'HTTP' : 'STDIO',
    url: config.n8nApiUrl,
    port: config.httpMode ? config.httpPort : undefined,
    toolCount: registry.getToolNames().length,
  }, 'MCP server initialized');

  return { server, context, registry };
}

export async function startStdioServer(mcpServer: McpServer): Promise<void> {
  const { server, context } = mcpServer;
  const transport = new StdioServerTransport();
  
  context.logger.info('Starting MCP server in STDIO mode');
  
  await server.connect(transport);
  
  // Keep the process alive
  process.on('SIGINT', async () => {
    context.logger.info('Received SIGINT, shutting down gracefully');
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    context.logger.info('Received SIGTERM, shutting down gracefully');
    await server.close();
    process.exit(0);
  });
}

export async function startHttpServer(mcpServer: McpServer): Promise<http.Server> {
  const { server, context } = mcpServer;
  const { config } = context;

  const httpServer = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        name: 'min-n8n-mcp',
        version: '0.1.0',
        tools: mcpServer.registry.getToolNames().length,
      }));
      return;
    }

    if (req.url === '/sse') {
      const transport = new SSEServerTransport('/message', res);
      server.connect(transport);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  return new Promise((resolve, reject) => {
    httpServer.listen(config.httpPort, (err?: Error) => {
      if (err) {
        reject(err);
        return;
      }

      context.logger.info({
        port: config.httpPort,
        endpoints: {
          health: `http://localhost:${config.httpPort}/health`,
          sse: `http://localhost:${config.httpPort}/sse`,
        },
      }, 'HTTP server started');

      resolve(httpServer);
    });
  });
}
```

**Action Items**:
1. Update src/server.ts with exact content above
2. Implement both STDIO and HTTP server modes
3. Add health endpoint for HTTP mode
4. Set up SSE transport for MCP Inspector compatibility
5. Add graceful shutdown handling
6. Test both server modes work correctly

### Task 3.4: Tool Index File
**Estimated Time**: 15 minutes

Create src/tools/index.ts to register all tools:

```typescript
import type { ToolRegistry } from './registry.js';

// Import all tool modules (to be implemented in later stages)
import { registerWorkflowTools } from './workflows.js';
import { registerExecutionTools } from './executions.js';
import { registerCredentialTools } from './credentials.js';
import { registerTagTools } from './tags.js';
import { registerUserTools } from './users.js';
import { registerVariableTools } from './variables.js';
import { registerProjectTools } from './projects.js';
import { registerAuditTools } from './audit.js';
import { registerSourceControlTools } from './sourceControl.js';

export async function registerAllTools(registry: ToolRegistry): Promise<void> {
  // Register workflow tools
  await registerWorkflowTools(registry);
  
  // Register execution tools
  await registerExecutionTools(registry);
  
  // Register credential tools
  await registerCredentialTools(registry);
  
  // Register tag tools
  await registerTagTools(registry);
  
  // Register user tools
  await registerUserTools(registry);
  
  // Register variable tools
  await registerVariableTools(registry);
  
  // Register project tools
  await registerProjectTools(registry);
  
  // Register audit tools
  await registerAuditTools(registry);
  
  // Register source control tools
  await registerSourceControlTools(registry);
}

// Export all tool types for external use
export type { ToolDefinition } from './registry.js';
export { ToolRegistry, createTool } from './registry.js';
```

**Action Items**:
1. Create src/tools/index.ts with exact content above
2. Set up central tool registration
3. Import all tool modules (placeholder implementations)
4. Export tool types and utilities

### Task 3.5: Placeholder Tool Files
**Estimated Time**: 15 minutes

Create placeholder files for all tool modules. Start with src/tools/workflows.ts:

```typescript
import type { ToolRegistry } from './registry.js';
import { createTool } from './registry.js';

export async function registerWorkflowTools(registry: ToolRegistry): Promise<void> {
  // Placeholder implementations - will be implemented in Stage 5
  
  registry.register(createTool(
    'listWorkflows',
    'List n8n workflows with optional filtering',
    async (input, context) => {
      // TODO: Implement in Stage 5
      context.logger.info('listWorkflows called (placeholder)');
      return { message: 'Tool not yet implemented' };
    }
  ));

  registry.register(createTool(
    'getWorkflow',
    'Get a specific workflow by ID',
    async (input, context) => {
      // TODO: Implement in Stage 5
      context.logger.info('getWorkflow called (placeholder)');
      return { message: 'Tool not yet implemented' };
    }
  ));

  registry.register(createTool(
    'createWorkflow',
    'Create a new workflow',
    async (input, context) => {
      // TODO: Implement in Stage 5
      context.logger.info('createWorkflow called (placeholder)');
      return { message: 'Tool not yet implemented' };
    }
  ));

  registry.register(createTool(
    'updateWorkflow',
    'Update an existing workflow',
    async (input, context) => {
      // TODO: Implement in Stage 5
      context.logger.info('updateWorkflow called (placeholder)');
      return { message: 'Tool not yet implemented' };
    }
  ));

  registry.register(createTool(
    'deleteWorkflow',
    'Delete a workflow',
    async (input, context) => {
      // TODO: Implement in Stage 5
      context.logger.info('deleteWorkflow called (placeholder)');
      return { message: 'Tool not yet implemented' };
    }
  ));

  registry.register(createTool(
    'activateWorkflow',
    'Activate a workflow',
    async (input, context) => {
      // TODO: Implement in Stage 5
      context.logger.info('activateWorkflow called (placeholder)');
      return { message: 'Tool not yet implemented' };
    }
  ));

  registry.register(createTool(
    'deactivateWorkflow',
    'Deactivate a workflow',
    async (input, context) => {
      // TODO: Implement in Stage 5
      context.logger.info('deactivateWorkflow called (placeholder)');
      return { message: 'Tool not yet implemented' };
    }
  ));

  registry.register(createTool(
    'getWorkflowTags',
    'Get tags associated with a workflow',
    async (input, context) => {
      // TODO: Implement in Stage 5
      context.logger.info('getWorkflowTags called (placeholder)');
      return { message: 'Tool not yet implemented' };
    }
  ));

  registry.register(createTool(
    'updateWorkflowTags',
    'Update tags for a workflow',
    async (input, context) => {
      // TODO: Implement in Stage 5
      context.logger.info('updateWorkflowTags called (placeholder)');
      return { message: 'Tool not yet implemented' };
    }
  ));

  registry.register(createTool(
    'transferWorkflow',
    'Transfer workflow to another project',
    async (input, context) => {
      // TODO: Implement in Stage 5
      context.logger.info('transferWorkflow called (placeholder)');
      return { message: 'Tool not yet implemented' };
    }
  ));
}
```

Create similar placeholder files for all other tool modules:
- src/tools/executions.ts
- src/tools/credentials.ts
- src/tools/tags.ts
- src/tools/users.ts
- src/tools/variables.ts
- src/tools/projects.ts
- src/tools/audit.ts
- src/tools/sourceControl.ts

**Action Items**:
1. Create src/tools/workflows.ts with exact content above
2. Create similar placeholder files for all other tool categories
3. Each file should export a register function
4. All tools should have placeholder implementations that log and return "not implemented"
5. Test that all tools are registered and callable

### Task 3.6: Update CLI with Server Modes
**Estimated Time**: 20 minutes

Update src/cli.ts to support both server modes:

```typescript
#!/usr/bin/env node

import { Command } from 'commander';
import { createServer, startStdioServer, startHttpServer } from './server.js';
import { loadConfig } from './config.js';
import { createLogger } from './logging.js';

const program = new Command();

program
  .name('min-n8n-mcp')
  .description('Local MCP server for n8n workflow management')
  .version('0.1.0');

program
  .option('--url <url>', 'n8n API base URL')
  .option('--token <token>', 'n8n API token')
  .option('--log-level <level>', 'Log level (debug|info|warn|error)', 'info')
  .option('--timeout <ms>', 'HTTP timeout in milliseconds', '30000')
  .option('--retries <n>', 'Number of HTTP retries', '2')
  .option('--concurrency <n>', 'Max concurrent requests', '4')
  .option('--http', 'Enable HTTP mode instead of STDIO')
  .option('--http-port <port>', 'HTTP server port', '3000')
  .option('--print-config', 'Print configuration and exit')
  .action(async (options) => {
    try {
      const config = loadConfig(options);
      const logger = createLogger(config.logLevel);
      
      if (options.printConfig) {
        const sanitizedConfig = {
          ...config,
          n8nApiToken: '[REDACTED]',
        };
        console.log(JSON.stringify(sanitizedConfig, null, 2));
        process.exit(0);
      }

      // Create server
      const mcpServer = await createServer(config, logger);
      
      // Start in appropriate mode
      if (config.httpMode) {
        const httpServer = await startHttpServer(mcpServer);
        
        // Handle graceful shutdown for HTTP mode
        process.on('SIGINT', async () => {
          logger.info('Received SIGINT, shutting down gracefully');
          httpServer.close(() => {
            logger.info('HTTP server closed');
            process.exit(0);
          });
        });

        process.on('SIGTERM', async () => {
          logger.info('Received SIGTERM, shutting down gracefully');
          httpServer.close(() => {
            logger.info('HTTP server closed');
            process.exit(0);
          });
        });
      } else {
        await startStdioServer(mcpServer);
      }
    } catch (error) {
      console.error('Failed to start server:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
```

**Action Items**:
1. Update src/cli.ts with exact content above
2. Support both STDIO and HTTP modes
3. Add proper graceful shutdown for both modes
4. Test CLI with various options and modes
5. Verify print-config option redacts sensitive data

### Task 3.7: Integration Tests for MCP Server
**Estimated Time**: 25 minutes

Create test/integration/mcp-server.test.ts:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport, StdioServerTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from '../../src/server.js';
import { createLogger } from '../../src/logging.js';
import type { Config } from '../../src/config.js';

describe('MCP Server Integration', () => {
  let serverProcess: ChildProcess;
  let client: Client;

  const testConfig: Config = {
    n8nApiUrl: 'http://localhost:5678/api/v1',
    n8nApiToken: 'test-token',
    logLevel: 'error',
    httpTimeoutMs: 5000,
    httpRetries: 1,
    concurrency: 2,
    httpMode: false,
    httpPort: 3000,
  };

  beforeAll(async () => {
    // Start server process
    serverProcess = spawn('node', ['dist/cli.js'], {
      env: {
        ...process.env,
        N8N_API_URL: testConfig.n8nApiUrl,
        N8N_API_TOKEN: testConfig.n8nApiToken,
        LOG_LEVEL: 'error',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Create client
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/cli.js'],
      env: {
        N8N_API_URL: testConfig.n8nApiUrl,
        N8N_API_TOKEN: testConfig.n8nApiToken,
        LOG_LEVEL: 'error',
      },
    });

    client = new Client({
      name: 'test-client',
      version: '1.0.0',
    }, {
      capabilities: {},
    });

    await client.connect(transport);
  }, 10000);

  afterAll(async () => {
    if (client) {
      await client.close();
    }
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  it('should list available tools', async () => {
    const response = await client.listTools();
    
    expect(response.tools).toBeDefined();
    expect(response.tools.length).toBeGreaterThan(0);
    
    // Check for expected workflow tools
    const toolNames = response.tools.map(tool => tool.name);
    expect(toolNames).toContain('listWorkflows');
    expect(toolNames).toContain('getWorkflow');
    expect(toolNames).toContain('createWorkflow');
  });

  it('should handle tool calls with validation', async () => {
    // Test a simple tool call (placeholder response expected)
    const response = await client.callTool({
      name: 'listWorkflows',
      arguments: {
        query: { limit: 5 }
      },
    });
    
    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);
    expect(response.content[0].type).toBe('text');
  });

  it('should reject invalid tool calls', async () => {
    await expect(client.callTool({
      name: 'nonexistentTool',
      arguments: {},
    })).rejects.toThrow();
  });

  it('should validate tool input schemas', async () => {
    // Test with invalid input
    await expect(client.callTool({
      name: 'getWorkflow',
      arguments: {
        // Missing required 'id' field
      },
    })).rejects.toThrow();
  });
});

describe('HTTP Mode Integration', () => {
  it('should start HTTP server and respond to health check', async () => {
    const logger = createLogger('error');
    const mcpServer = await createServer({
      ...testConfig,
      httpMode: true,
      httpPort: 3001,
    }, logger);

    const httpServer = await startHttpServer(mcpServer);

    try {
      // Test health endpoint
      const response = await fetch('http://localhost:3001/health');
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.name).toBe('min-n8n-mcp');
      expect(data.tools).toBeGreaterThan(0);
    } finally {
      httpServer.close();
    }
  }, 10000);
});
```

**Action Items**:
1. Create test/integration/mcp-server.test.ts with exact content above
2. Test both STDIO and HTTP modes
3. Verify tool registration and calling
4. Test input validation and error handling
5. Add health endpoint testing for HTTP mode

## Validation Checklist

- [ ] JSON schemas generated correctly from Zod schemas
- [ ] Tool registry registers and validates all tools
- [ ] MCP server handles both STDIO and HTTP modes
- [ ] Tool validation works with proper error messages
- [ ] Health endpoint responds correctly in HTTP mode
- [ ] SSE endpoint available for MCP Inspector
- [ ] All placeholder tools are registered and callable
- [ ] CLI supports all required options and modes
- [ ] Integration tests pass for both server modes
- [ ] Graceful shutdown works properly

## Next Stage
Proceed to Stage 4: Resource Clients once all validation items are complete.
