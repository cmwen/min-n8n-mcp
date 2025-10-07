import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '../../src/config.js';
import type { Logger } from '../../src/logging.js';
import { createServer, startHttpServer, startStdioServer } from '../../src/server.js';

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    registerTool: vi.fn(),
    registerPrompt: vi.fn(),
    connect: vi.fn(),
    close: vi.fn(),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('express', () => {
  const mockApp = {
    use: vi.fn(),
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    listen: vi.fn((port, callback) => {
      callback?.();
      return {
        close: vi.fn((callback) => callback?.()),
      };
    }),
  };
  const expressFn: any = vi.fn(() => mockApp);
  expressFn.json = vi.fn(() => vi.fn());
  return {
    default: expressFn,
  };
});

// Mock HTTP client
let mockHttpClient: any;

vi.mock('../../src/http/client.js', () => ({
  HttpClient: {
    fromConfig: vi.fn(() => mockHttpClient),
  },
}));

// Mock resource clients
vi.mock('../../src/resources/index.js', () => ({
  createResourceClients: vi.fn().mockReturnValue({
    workflows: {},
    executions: {},
    credentials: {},
    tags: {},
    users: {},
    variables: {},
    projects: {},
    audit: {},
    sourceControl: {},
  }),
}));

// Mock tools and prompts
vi.mock('../../src/tools/index.js', () => ({
  registerAllTools: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/prompts/index.js', () => ({
  registerAllPrompts: vi.fn().mockResolvedValue(undefined),
}));

describe('Server', () => {
  let mockConfig: Config;
  let mockLogger: Logger;

  beforeEach(() => {
    // Reset HTTP client mock for each test
    mockHttpClient = {
      get: vi.fn().mockResolvedValue({ data: [] }),
      post: vi.fn().mockResolvedValue({}),
      put: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    };

    mockConfig = {
      n8nApiUrl: 'http://localhost:5678/api/v1',
      n8nApiToken: 'test-token',
      logLevel: 'info',
      httpTimeoutMs: 30000,
      httpRetries: 2,
      concurrency: 4,
      httpMode: false,
      httpPort: 3000,
      mode: 'intermediate',
    };

    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createServer', () => {
    it('should create MCP server successfully', async () => {
      const server = await createServer(mockConfig, mockLogger);

      expect(server).toBeDefined();
      expect(server.server).toBeDefined();
      expect(server.context).toBeDefined();
      expect(server.registry).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'STDIO',
          toolMode: 'intermediate',
        }),
        'MCP server initialized'
      );
    });

    it('should test connection to n8n API on startup', async () => {
      await createServer(mockConfig, mockLogger);

      expect(mockLogger.info).toHaveBeenCalledWith('Testing connection to n8n API...');
      expect(mockLogger.info).toHaveBeenCalledWith('Successfully connected to n8n API');
    });

    it('should throw error if n8n API is unreachable', async () => {
      // Mock failed connection for this test only
      mockHttpClient.get = vi.fn().mockRejectedValue(new Error('Connection refused'));

      await expect(createServer(mockConfig, mockLogger)).rejects.toThrow(
        'Cannot connect to n8n API'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to n8n API',
        expect.any(Error)
      );
    });

    it('should create server with HTTP mode enabled', async () => {
      const httpConfig = { ...mockConfig, httpMode: true, httpPort: 3000 };

      const server = await createServer(httpConfig, mockLogger);

      expect(server).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'HTTP',
          port: 3000,
        }),
        'MCP server initialized'
      );
    });

    it('should register tools based on mode', async () => {
      const { registerAllTools } = await import('../../src/tools/index.js');

      await createServer(mockConfig, mockLogger);

      expect(registerAllTools).toHaveBeenCalledWith(expect.anything(), 'intermediate');
    });

    it('should handle different operating modes', async () => {
      const { registerAllTools } = await import('../../src/tools/index.js');

      // Test basic mode
      await createServer({ ...mockConfig, mode: 'basic' }, mockLogger);
      expect(registerAllTools).toHaveBeenCalledWith(expect.anything(), 'basic');

      vi.clearAllMocks();

      // Test advanced mode
      await createServer({ ...mockConfig, mode: 'advanced' }, mockLogger);
      expect(registerAllTools).toHaveBeenCalledWith(expect.anything(), 'advanced');
    });
  });

  describe('startStdioServer', () => {
    it('should start server in STDIO mode', async () => {
      const mcpServer = await createServer(mockConfig, mockLogger);

      // Don't actually connect in test
      vi.mocked(mcpServer.server.connect).mockResolvedValue(undefined);

      // Note: We don't await this as it runs indefinitely
      startStdioServer(mcpServer);

      expect(mockLogger.info).toHaveBeenCalledWith('Starting MCP server in STDIO mode');
      expect(mcpServer.server.connect).toHaveBeenCalled();
    });

    // Note: Signal handler tests are skipped to avoid process.exit() in tests
    // These are better tested through integration tests
  });

  describe('startHttpServer', () => {
    it('should create HTTP server', () => {
      const mcpServer = {
        server: {
          registerTool: vi.fn(),
          connect: vi.fn(),
        },
        context: {
          config: { ...mockConfig, httpMode: true, httpPort: 3000 },
          logger: mockLogger,
        },
        registry: {
          getToolNames: vi.fn().mockReturnValue(['listWorkflows', 'getWorkflow']),
        },
      } as any;

      const httpServer = startHttpServer(mcpServer);

      expect(httpServer).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 3000,
          endpoints: expect.objectContaining({
            health: expect.stringContaining('/health'),
            mcp: expect.stringContaining('/mcp'),
          }),
        }),
        'Streamable MCP HTTP server started'
      );
    });

    // Note: Full HTTP server testing is done in integration tests
  });

  describe('Server Context', () => {
    it('should create proper server context', async () => {
      const server = await createServer(mockConfig, mockLogger);

      expect(server.context).toMatchObject({
        config: mockConfig,
        logger: mockLogger,
      });
      expect(server.context.httpClient).toBeDefined();
      expect(server.context.resources).toBeDefined();
    });

    it('should pass config to HTTP client', async () => {
      const { HttpClient } = await import('../../src/http/client.js');

      await createServer(mockConfig, mockLogger);

      expect(HttpClient.fromConfig).toHaveBeenCalledWith(mockConfig, mockLogger);
    });

    it('should create all resource clients', async () => {
      const { createResourceClients } = await import('../../src/resources/index.js');

      await createServer(mockConfig, mockLogger);

      expect(createResourceClients).toHaveBeenCalled();
    });
  });

  describe('Tool Registry', () => {
    it('should create tool registry', async () => {
      const server = await createServer(mockConfig, mockLogger);

      expect(server.registry).toBeDefined();
      expect(server.registry.getToolNames).toBeInstanceOf(Function);
    });

    it('should set up MCP handlers', async () => {
      const server = await createServer(mockConfig, mockLogger);

      // Registry should have been set up with the MCP server
      expect(server.registry).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle tool registration errors gracefully', async () => {
      const { registerAllTools } = await import('../../src/tools/index.js');

      vi.mocked(registerAllTools).mockRejectedValueOnce(new Error('Tool registration failed'));

      await expect(createServer(mockConfig, mockLogger)).rejects.toThrow(
        'Tool registration failed'
      );
    });

    it('should handle resource client creation errors', async () => {
      const { createResourceClients } = await import('../../src/resources/index.js');

      vi.mocked(createResourceClients).mockImplementationOnce(() => {
        throw new Error('Resource client error');
      });

      await expect(createServer(mockConfig, mockLogger)).rejects.toThrow('Resource client error');
    });
  });

  describe('Version Integration', () => {
    it('should use dynamic version from package.json', async () => {
      const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');

      await createServer(mockConfig, mockLogger);

      expect(McpServer).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'min-n8n-mcp',
          version: expect.any(String),
        }),
        expect.anything()
      );
    });
  });
});
