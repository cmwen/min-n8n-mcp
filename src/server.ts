import http from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Config } from './config.js';
import { HttpClient } from './http/client.js';
import type { Logger } from './logging.js';
import { registerAllTools } from './tools/index.js';
import { ToolRegistry } from './tools/registry.js';

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
    throw new Error(
      `Cannot connect to n8n API at ${config.n8nApiUrl}. Please verify the URL and API token.`
    );
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

  logger.info(
    {
      mode: config.httpMode ? 'HTTP' : 'STDIO',
      url: config.n8nApiUrl,
      port: config.httpMode ? config.httpPort : undefined,
      toolCount: registry.getToolNames().length,
    },
    'MCP server initialized'
  );

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
      res.end(
        JSON.stringify({
          status: 'healthy',
          name: 'min-n8n-mcp',
          version: '0.1.0',
          tools: mcpServer.registry.getToolNames().length,
        })
      );
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

      context.logger.info(
        {
          port: config.httpPort,
          endpoints: {
            health: `http://localhost:${config.httpPort}/health`,
            sse: `http://localhost:${config.httpPort}/sse`,
          },
        },
        'HTTP server started'
      );

      resolve(httpServer);
    });
  });
}
