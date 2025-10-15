import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '../../src/config.js';
import { createLogger } from '../../src/logging.js';
import { createServer, startHttpServer } from '../../src/server.js';
import { getVersion } from '../../src/version.js';

// Mock the HTTP client to avoid needing a real n8n instance
const mockHttpClient = {
  get: async () => ({ data: [] }),
  post: async () => ({ data: {} }),
  put: async () => ({ data: {} }),
  patch: async () => ({ data: {} }),
  delete: async () => ({ data: {} }),
};

// Mock the HttpClient module
vi.mock('../../src/http/client.js', () => ({
  HttpClient: {
    fromConfig: () => mockHttpClient,
  },
}));

describe('MCP Server Integration', () => {
  let httpServer: any;

  const testConfig: Config = {
    n8nApiUrl: 'http://localhost:5678/api/v1',
    n8nApiToken: 'test-token',
    logLevel: 'error',
    httpTimeoutMs: 5000,
    httpRetries: 1,
    concurrency: 2,
    httpMode: true,
    httpPort: 3002,
    mode: 'advanced',
  };

  afterEach(async () => {
    if (httpServer) {
      httpServer.close();
      httpServer = null;
    }
  });

  it('should create MCP server with tool registry', async () => {
    const logger = createLogger('error');
    const mcpServer = await createServer(testConfig, logger);

    expect(mcpServer.server).toBeDefined();
    expect(mcpServer.context).toBeDefined();
    expect(mcpServer.registry).toBeDefined();
    expect(mcpServer.registry.getToolNames().length).toBeGreaterThan(0);

    // Check for expected workflow tools
    const toolNames = mcpServer.registry.getToolNames();
    expect(toolNames).toContain('listWorkflows');
    expect(toolNames).toContain('getWorkflow');
    expect(toolNames).toContain('createWorkflow');
    expect(toolNames).toContain('listExecutions');
    expect(toolNames).toContain('createTag');
    expect(toolNames).toContain('createUser');
  });

  it('should start HTTP server and respond to health check', async () => {
    const logger = createLogger('error');
    const mcpServer = await createServer(testConfig, logger);

    httpServer = await startHttpServer(mcpServer);

    // Test health endpoint
    const response = await fetch(`http://localhost:${testConfig.httpPort}/health`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.name).toBe('min-n8n-mcp');
    expect(data.version).toBe(getVersion());
    expect(data.tools).toBeGreaterThan(0);
  }, 10000);

  it('should handle 404 for unknown endpoints', async () => {
    const logger = createLogger('error');
    const mcpServer = await createServer(testConfig, logger);

    httpServer = await startHttpServer(mcpServer);

    const response = await fetch(`http://localhost:${testConfig.httpPort}/unknown`);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe('Not found');
  });

  it('should handle CORS preflight requests', async () => {
    const logger = createLogger('error');
    const mcpServer = await createServer(testConfig, logger);

    httpServer = await startHttpServer(mcpServer);

    const response = await fetch(`http://localhost:${testConfig.httpPort}/health`, {
      method: 'OPTIONS',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
  });
});
