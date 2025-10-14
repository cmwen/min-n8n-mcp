import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolInputSchemas, type ToolInputs, safeValidateToolInput } from '../schemas/index.js';
import type { ServerContext } from '../server.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  handler: (input: any, context: ServerContext) => Promise<any>;
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  registerBatch(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  async setupMcpHandlers(server: McpServer, context: ServerContext): Promise<void> {
    // Register all tools with the high-level McpServer
    for (const [toolName, toolDef] of this.tools) {
      server.registerTool(
        toolName,
        {
          description: toolDef.description,
          inputSchema: ToolInputSchemas[toolName as keyof typeof ToolInputSchemas].shape,
        },
        async (args: any) => {
          context.logger.debug({ toolName, args }, 'Tool call requested');

          try {
            const normalizedArgs = normalizeToolArgs(toolName, args);
            // Validate input
            const validation = safeValidateToolInput(
              toolName as keyof ToolInputs,
              normalizedArgs
            );
            if (!validation.success) {
              context.logger.error(
                {
                  toolName,
                  error: validation.error,
                  args: normalizedArgs,
                },
                'Tool input validation failed'
              );
              throw new Error(`Invalid input for tool '${toolName}': ${validation.error}`);
            }

            const startTime = Date.now();
            const result = await toolDef.handler(validation.data, context);
            const duration = Date.now() - startTime;

            // Log performance metrics
            if (duration > 1000) {
              context.logger.warn(
                {
                  toolName,
                  duration,
                  slow: true,
                },
                'Slow tool execution detected'
              );
            }

            context.logger.info(
              {
                toolName,
                duration,
                success: true,
                resultSize:
                  typeof result === 'string' ? result.length : JSON.stringify(result).length,
              },
              'Tool executed successfully'
            );

            return {
              content: [
                {
                  type: 'text' as const,
                  text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                },
              ],
            };
          } catch (error) {
            context.logger.error(
              {
                toolName,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
              },
              'Tool execution failed'
            );

            // Include helpful context in error message
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Tool '${toolName}' failed: ${errorMessage}`);
          }
        }
      );
    }

    context.logger.info(
      {
        toolCount: this.tools.size,
        tools: Array.from(this.tools.keys()),
      },
      'MCP tool handlers registered'
    );
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

export function createTool<T extends keyof ToolInputs>(
  name: T,
  description: string,
  handler: (input: ToolInputs[T], context: ServerContext) => Promise<any>
): ToolDefinition {
  return {
    name,
    description,
    inputSchema: ToolInputSchemas[name].shape,
    handler: handler as any,
  };
}

function normalizeToolArgs(_toolName: string, args: unknown): unknown {
  if (!args || typeof args !== 'object') {
    return args;
  }

  return args;
}
