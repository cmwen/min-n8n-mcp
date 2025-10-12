import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import type { Config } from './config.js';
import { HttpClient } from './http/client.js';
import type { Logger } from './logging.js';
import { registerAllPrompts } from './prompts/index.js';
import { type ResourceClients, createResourceClients } from './resources/index.js';
import { registerAllTools } from './tools/index.js';
import { ToolRegistry } from './tools/registry.js';
import { getVersion } from './version.js';

export interface ServerContext {
  config: Config;
  logger: Logger;
  httpClient: HttpClient;
  resources: ResourceClients;
}

export interface MinN8nMcpServer {
  server: McpServer;
  context: ServerContext;
  registry: ToolRegistry;
}

export async function createServer(config: Config, logger: Logger): Promise<MinN8nMcpServer> {
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

  // Create resource clients
  const resources = createResourceClients(httpClient, logger);

  const context: ServerContext = {
    config,
    logger,
    httpClient,
    resources,
  };

  // Create MCP server
  const server = new McpServer(
    {
      name: 'min-n8n-mcp',
      version: getVersion(),
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
      },
    }
  );

  // Create tool registry and register all tools
  const registry = new ToolRegistry();
  await registerAllTools(registry, config.mode);
  await registry.setupMcpHandlers(server, context);

  // Register prompts
  await registerAllPrompts(server, context);

  logger.info(
    {
      mode: config.httpMode ? 'HTTP' : 'STDIO',
      toolMode: config.mode,
      url: config.n8nApiUrl,
      port: config.httpMode ? config.httpPort : undefined,
      toolCount: registry.getToolNames().length,
    },
    'MCP server initialized'
  );

  return { server, context, registry };
}

export async function startStdioServer(mcpServer: MinN8nMcpServer): Promise<void> {
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

export function startHttpServer(mcpServer: MinN8nMcpServer): any {
  const { server, context } = mcpServer;
  const { config } = context;

  const app = express();
  app.use(express.json());

  // Enable CORS for browser-based clients
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      name: 'min-n8n-mcp',
      version: getVersion(),
      tools: mcpServer.registry.getToolNames().length,
    });
  });

  // MCP Streamable HTTP endpoints
  const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  app.post('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports[sid] = transport;
        },
        // Optionally enable DNS rebinding protection for local dev
        // enableDnsRebindingProtection: true,
        // allowedHosts: ['127.0.0.1'],
      });
      transport.onclose = () => {
        if (transport.sessionId) delete transports[transport.sessionId];
      };
      await server.connect(transport);
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null,
      });
      return;
    }
    await transport.handleRequest(req, res, req.body);
  });

  app.get('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  });

  app.delete('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  });

  // 404 handler - return JSON instead of HTML
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  const httpServer = app.listen(config.httpPort, () => {
    context.logger.info(
      {
        port: config.httpPort,
        endpoints: {
          health: `http://localhost:${config.httpPort}/health`,
          mcp: `http://localhost:${config.httpPort}/mcp`,
        },
      },
      'Streamable MCP HTTP server started'
    );
  });

  return httpServer;
}
