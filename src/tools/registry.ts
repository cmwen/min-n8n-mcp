import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { type ToolInputs, createToolJsonSchemas, safeValidateToolInput } from '../schemas/index.js';
import type { ServerContext } from '../server.js';

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
      const tools = Array.from(this.tools.values()).map((tool) => ({
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
        context.logger.error(
          {
            toolName: name,
            error: validation.error,
            args,
          },
          'Tool input validation failed'
        );
        throw new Error(`Invalid input for tool '${name}': ${validation.error}`);
      }

      const startTime = Date.now();
      try {
        const result = await tool.handler(validation.data, context);
        const duration = Date.now() - startTime;

        // Log performance metrics
        if (duration > 1000) {
          context.logger.warn(
            {
              toolName: name,
              duration,
              slow: true,
            },
            'Slow tool execution detected'
          );
        }

        context.logger.info(
          {
            toolName: name,
            duration,
            success: true,
            resultSize: typeof result === 'string' ? result.length : JSON.stringify(result).length,
          },
          'Tool executed successfully'
        );

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

        context.logger.error(
          {
            toolName: name,
            duration,
            error: error instanceof Error ? error.message : String(error),
            success: false,
          },
          'Tool execution failed'
        );

        // Include helpful context in error message
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Tool '${name}' failed: ${errorMessage}`);
      }
    });

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
