# Stage 6: Testing & Quality

## Overview
Implement comprehensive testing, security validation, performance optimization, and quality assurance for the min-n8n-mcp server.

## Tasks

### Task 6.1: Unit Test Setup and Configuration
**Estimated Time**: 20 minutes

Create vitest.config.ts:

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/unit/**/*.test.ts'],
    exclude: ['test/integration/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        'dist/',
        '**/*.d.ts',
        'src/cli.ts', // CLI entry point, tested via integration
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    setupFiles: ['test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

Create vitest.integration.config.ts:

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/integration/**/*.test.ts'],
    exclude: ['test/unit/**/*'],
    testTimeout: 30000, // Longer timeout for integration tests
    setupFiles: ['test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

Create test/setup.ts:

```typescript
import { vi } from 'vitest';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
};
```

**Action Items**:
1. Create vitest.config.ts with exact content above
2. Create separate config for integration tests
3. Set up test coverage thresholds
4. Configure test environment and aliases
5. Test that vitest runs correctly

### Task 6.2: HTTP Client Unit Tests
**Estimated Time**: 35 minutes

Create comprehensive tests for the HTTP client. Update test/unit/http/client.test.ts:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from '../../../src/http/client.js';
import { HttpError, NetworkError, TimeoutError } from '../../../src/http/errors.js';
import { createLogger } from '../../../src/logging.js';

// Mock undici
const mockFetch = vi.fn();
vi.mock('undici', () => ({
  fetch: mockFetch,
}));

describe('HttpClient', () => {
  let client: HttpClient;
  let logger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    logger = createLogger('error');
    client = new HttpClient({
      baseUrl: 'https://api.example.com/api/v1',
      apiToken: 'test-token',
      timeout: 5000,
      retries: 1,
      concurrency: 2,
      logger,
    });
    
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('request building', () => {
    it('should add API key header', async () => {
      const mockResponse = createMockResponse(200, { ok: true });
      mockFetch.mockResolvedValueOnce(mockResponse);

      await client.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-N8N-API-KEY': 'test-token',
          }),
        })
      );
    });

    it('should build URLs with query parameters', async () => {
      const mockResponse = createMockResponse(200, { ok: true });
      mockFetch.mockResolvedValueOnce(mockResponse);

      await client.get('/test', { limit: 10, active: true, name: 'workflow' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/test?limit=10&active=true&name=workflow',
        expect.any(Object)
      );
    });

    it('should handle JSON body serialization', async () => {
      const mockResponse = createMockResponse(201, { id: 1 });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const body = { name: 'test', data: { nested: true } };
      await client.post('/test', body);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
    });
  });

  describe('HTTP methods', () => {
    it('should support GET requests', async () => {
      const mockResponse = createMockResponse(200, { data: 'test' });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await client.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'GET' })
      );
      expect(result).toEqual({ data: 'test' });
    });

    it('should support POST requests', async () => {
      const mockResponse = createMockResponse(201, { id: 1 });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await client.post('/test', { name: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' })
      );
      expect(result).toEqual({ id: 1 });
    });

    it('should support PUT requests', async () => {
      const mockResponse = createMockResponse(200, { updated: true });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await client.put('/test/1', { name: 'updated' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'PUT' })
      );
      expect(result).toEqual({ updated: true });
    });

    it('should support DELETE requests', async () => {
      const mockResponse = createMockResponse(204);
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await client.delete('/test/1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(result).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should throw HttpError for 4xx responses', async () => {
      const mockResponse = createMockResponse(404, { message: 'Not found' }, false);
      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(client.get('/test')).rejects.toThrow(HttpError);
    });

    it('should retry on 5xx errors', async () => {
      const errorResponse = createMockResponse(500, {}, false);
      const successResponse = createMockResponse(200, { data: 'success' });
      
      mockFetch
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(successResponse);

      const result = await client.get('/test');
      
      expect(result).toEqual({ data: 'success' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw NetworkError on fetch failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(client.get('/test')).rejects.toThrow(NetworkError);
    });

    it('should handle timeout errors', async () => {
      // Mock a long-running request
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      const shortTimeoutClient = new HttpClient({
        baseUrl: 'https://api.example.com/api/v1',
        apiToken: 'test-token',
        timeout: 100,
        retries: 0,
        concurrency: 1,
        logger,
      });

      await expect(shortTimeoutClient.get('/test')).rejects.toThrow(TimeoutError);
    });
  });

  describe('response parsing', () => {
    it('should parse JSON responses', async () => {
      const mockResponse = createMockResponse(200, { data: 'test' });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await client.get('/test');
      expect(result).toEqual({ data: 'test' });
    });

    it('should handle empty responses', async () => {
      const mockResponse = createMockResponse(204);
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await client.delete('/test');
      expect(result).toBeNull();
    });

    it('should handle non-JSON responses gracefully', async () => {
      const mockResponse = createMockResponse(200, 'plain text', true, 'text/plain');
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await client.get('/test');
      expect(result).toBeNull();
    });
  });

  describe('rate limiting', () => {
    it('should respect concurrency limits', async () => {
      const responses = Array(5).fill(null).map(() => 
        createMockResponse(200, { data: 'test' })
      );
      
      mockFetch.mockImplementation(() => 
        Promise.resolve(responses.shift()!)
      );

      // Start multiple requests simultaneously
      const requests = Array(5).fill(null).map(() => client.get('/test'));
      await Promise.all(requests);

      // All should complete successfully
      expect(mockFetch).toHaveBeenCalledTimes(5);
    });
  });
});

// Helper function to create mock responses
function createMockResponse(
  status: number, 
  data?: any, 
  ok?: boolean, 
  contentType = 'application/json'
) {
  return {
    ok: ok ?? status < 400,
    status,
    statusText: getStatusText(status),
    headers: new Map([['content-type', contentType]]),
    json: async () => data,
    text: async () => typeof data === 'string' ? data : JSON.stringify(data),
  };
}

function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
  };
  return statusTexts[status] || 'Unknown';
}
```

**Action Items**:
1. Create comprehensive HTTP client tests
2. Mock fetch calls and test all scenarios
3. Test error handling, retries, and timeouts
4. Verify rate limiting behavior
5. Test response parsing edge cases

### Task 6.3: Tool Implementation Tests
**Estimated Time**: 40 minutes

Create test/unit/tools/workflows.test.ts:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolRegistry, createTool } from '../../../src/tools/registry.js';
import { registerWorkflowTools } from '../../../src/tools/workflows.js';
import { createLogger } from '../../../src/logging.js';
import type { ServerContext } from '../../../src/server.js';
import type { ResourceClients } from '../../../src/resources/index.js';

describe('Workflow Tools', () => {
  let registry: ToolRegistry;
  let mockContext: ServerContext;
  let mockWorkflows: any;

  beforeEach(() => {
    registry = new ToolRegistry();
    
    // Mock workflow resource client
    mockWorkflows = {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      run: vi.fn(),
      getTags: vi.fn(),
      updateTags: vi.fn(),
      transfer: vi.fn(),
      getStats: vi.fn(),
    };

    mockContext = {
      config: {} as any,
      logger: createLogger('error'),
      httpClient: {} as any,
      resources: {
        workflows: mockWorkflows,
      } as ResourceClients,
    };
  });

  describe('listWorkflows', () => {
    it('should list workflows with pagination', async () => {
      const mockResult = {
        data: [
          { id: '1', name: 'Workflow 1', active: true },
          { id: '2', name: 'Workflow 2', active: false },
        ],
        totalFetched: 2,
        pagesFetched: 1,
        nextCursor: undefined,
      };

      mockWorkflows.list.mockResolvedValueOnce(mockResult);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('listWorkflows')!;

      const result = await tool.handler({ query: { limit: 10 } }, mockContext);

      expect(mockWorkflows.list).toHaveBeenCalledWith({ limit: 10 });
      expect(result).toEqual({
        workflows: mockResult.data,
        pagination: {
          totalFetched: 2,
          pagesFetched: 1,
          nextCursor: undefined,
        },
      });
    });

    it('should handle empty query', async () => {
      const mockResult = {
        data: [],
        totalFetched: 0,
        pagesFetched: 1,
        nextCursor: undefined,
      };

      mockWorkflows.list.mockResolvedValueOnce(mockResult);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('listWorkflows')!;

      const result = await tool.handler({ query: {} }, mockContext);

      expect(mockWorkflows.list).toHaveBeenCalledWith({});
      expect(result.workflows).toEqual([]);
    });
  });

  describe('getWorkflow', () => {
    it('should get workflow by ID', async () => {
      const mockWorkflow = { id: '1', name: 'Test Workflow', active: true };
      mockWorkflows.get.mockResolvedValueOnce(mockWorkflow);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('getWorkflow')!;

      const result = await tool.handler({ id: '1' }, mockContext);

      expect(mockWorkflows.get).toHaveBeenCalledWith('1', {});
      expect(result).toEqual(mockWorkflow);
    });

    it('should support excludePinnedData option', async () => {
      const mockWorkflow = { id: '1', name: 'Test Workflow' };
      mockWorkflows.get.mockResolvedValueOnce(mockWorkflow);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('getWorkflow')!;

      const result = await tool.handler({ 
        id: '1', 
        excludePinnedData: true 
      }, mockContext);

      expect(mockWorkflows.get).toHaveBeenCalledWith('1', {
        excludePinnedData: true,
      });
    });
  });

  describe('createWorkflow', () => {
    it('should create workflow with provided data', async () => {
      const workflowData = {
        name: 'New Workflow',
        nodes: [],
        connections: {},
        active: false,
      };

      const mockCreated = { id: '123', ...workflowData };
      mockWorkflows.create.mockResolvedValueOnce(mockCreated);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('createWorkflow')!;

      const result = await tool.handler({ data: workflowData }, mockContext);

      expect(mockWorkflows.create).toHaveBeenCalledWith(workflowData);
      expect(result).toEqual(mockCreated);
    });
  });

  describe('activateWorkflow', () => {
    it('should activate workflow and return success', async () => {
      mockWorkflows.activate.mockResolvedValueOnce({ success: true });

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('activateWorkflow')!;

      const result = await tool.handler({ id: '1' }, mockContext);

      expect(mockWorkflows.activate).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        success: true,
        workflowId: '1',
        status: 'active',
        message: 'Workflow activated successfully',
      });
    });
  });

  describe('getWorkflowStats', () => {
    it('should return workflow statistics', async () => {
      const mockStats = {
        executions: {
          total: 100,
          success: 80,
          error: 15,
          waiting: 3,
          running: 2,
        },
        lastExecution: {
          id: 'exec-999',
          status: 'success',
          startedAt: '2024-01-01T00:00:00Z',
          finishedAt: '2024-01-01T00:01:00Z',
        },
      };

      mockWorkflows.getStats.mockResolvedValueOnce(mockStats);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('getWorkflowStats')!;

      const result = await tool.handler({ id: '1' }, mockContext);

      expect(mockWorkflows.getStats).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        workflowId: '1',
        stats: mockStats,
      });
    });
  });

  describe('error handling', () => {
    it('should propagate errors from resource client', async () => {
      const error = new Error('Workflow not found');
      mockWorkflows.get.mockRejectedValueOnce(error);

      await registerWorkflowTools(registry);
      const tool = registry.getToolDefinition('getWorkflow')!;

      await expect(
        tool.handler({ id: 'nonexistent' }, mockContext)
      ).rejects.toThrow('Workflow not found');
    });
  });
});
```

Create similar test files for other tool categories:
- test/unit/tools/executions.test.ts
- test/unit/tools/credentials.test.ts
- test/unit/tools/users.test.ts

**Action Items**:
1. Create comprehensive tool tests with mocked dependencies
2. Test all tool functions with various inputs
3. Verify error handling and edge cases
4. Mock resource clients appropriately
5. Test tool registration and validation

### Task 6.4: Integration Tests
**Estimated Time**: 45 minutes

Create test/integration/end-to-end.test.ts:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from '../../src/server.js';
import { createLogger } from '../../src/logging.js';
import type { Config } from '../../src/config.js';

describe('End-to-End Integration', () => {
  const testConfig: Config = {
    n8nApiUrl: process.env.TEST_N8N_URL || 'http://localhost:5678/api/v1',
    n8nApiToken: process.env.TEST_N8N_TOKEN || 'test-token',
    logLevel: 'error',
    httpTimeoutMs: 10000,
    httpRetries: 1,
    concurrency: 2,
    httpMode: false,
    httpPort: 3000,
  };

  describe('Server Creation', () => {
    it('should create server with valid config', async () => {
      // Skip if no test credentials provided
      if (!process.env.TEST_N8N_URL || !process.env.TEST_N8N_TOKEN) {
        console.log('Skipping integration test - no test credentials');
        return;
      }

      const logger = createLogger('error');
      const mcpServer = await createServer(testConfig, logger);

      expect(mcpServer).toBeDefined();
      expect(mcpServer.server).toBeDefined();
      expect(mcpServer.context).toBeDefined();
      expect(mcpServer.registry).toBeDefined();
    });

    it('should fail with invalid config', async () => {
      const logger = createLogger('error');
      const invalidConfig = {
        ...testConfig,
        n8nApiUrl: 'http://invalid-url:9999/api/v1',
      };

      await expect(
        createServer(invalidConfig, logger)
      ).rejects.toThrow();
    });
  });

  describe('HTTP Mode', () => {
    it('should start HTTP server and respond to health check', async () => {
      // Skip if no test credentials
      if (!process.env.TEST_N8N_URL || !process.env.TEST_N8N_TOKEN) {
        return;
      }

      const logger = createLogger('error');
      const httpConfig = {
        ...testConfig,
        httpMode: true,
        httpPort: 3001,
      };

      const mcpServer = await createServer(httpConfig, logger);
      const { startHttpServer } = await import('../../src/server.js');
      const httpServer = await startHttpServer(mcpServer);

      try {
        // Test health endpoint
        const response = await fetch('http://localhost:3001/health');
        expect(response.ok).toBe(true);
        
        const data = await response.json();
        expect(data.status).toBe('healthy');
        expect(data.name).toBe('min-n8n-mcp');
        expect(typeof data.tools).toBe('number');
      } finally {
        httpServer.close();
      }
    }, 15000);
  });

  describe('CLI Integration', () => {
    let cliProcess: ChildProcess;

    afterAll(() => {
      if (cliProcess) {
        cliProcess.kill();
      }
    });

    it('should start CLI in HTTP mode', async () => {
      if (!process.env.TEST_N8N_URL || !process.env.TEST_N8N_TOKEN) {
        return;
      }

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('CLI startup timeout'));
        }, 10000);

        cliProcess = spawn('node', ['dist/cli.js', '--http', '--http-port', '3002'], {
          env: {
            ...process.env,
            N8N_API_URL: testConfig.n8nApiUrl,
            N8N_API_TOKEN: testConfig.n8nApiToken,
            LOG_LEVEL: 'error',
          },
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let output = '';
        cliProcess.stdout?.on('data', (data) => {
          output += data.toString();
          if (output.includes('HTTP server started')) {
            clearTimeout(timeout);
            resolve();
          }
        });

        cliProcess.stderr?.on('data', (data) => {
          const error = data.toString();
          if (error.includes('Failed to start server')) {
            clearTimeout(timeout);
            reject(new Error(`CLI startup failed: ${error}`));
          }
        });

        cliProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    }, 15000);

    it('should respond to health check via CLI HTTP mode', async () => {
      if (!cliProcess || !process.env.TEST_N8N_URL) {
        return;
      }

      // Wait a bit for server to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch('http://localhost:3002/health');
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.status).toBe('healthy');
    });
  });

  describe('Tool Integration', () => {
    it('should register all expected tools', async () => {
      if (!process.env.TEST_N8N_URL || !process.env.TEST_N8N_TOKEN) {
        return;
      }

      const logger = createLogger('error');
      const mcpServer = await createServer(testConfig, logger);

      const toolNames = mcpServer.registry.getToolNames();
      
      // Verify key tools are registered
      expect(toolNames).toContain('listWorkflows');
      expect(toolNames).toContain('getWorkflow');
      expect(toolNames).toContain('createWorkflow');
      expect(toolNames).toContain('listExecutions');
      expect(toolNames).toContain('getExecution');
      expect(toolNames).toContain('createCredential');
      expect(toolNames).toContain('listUsers');
      expect(toolNames).toContain('createTag');

      // Should have all expected tools
      expect(toolNames.length).toBeGreaterThan(20);
    });
  });
});
```

Create test/integration/resource-clients.test.ts:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createResourceClients } from '../../src/resources/index.js';
import { HttpClient } from '../../src/http/client.js';
import { createLogger } from '../../src/logging.js';

describe('Resource Client Integration', () => {
  let clients: ReturnType<typeof createResourceClients>;
  let httpClient: HttpClient;

  beforeAll(() => {
    // Skip if no test credentials
    if (!process.env.TEST_N8N_URL || !process.env.TEST_N8N_TOKEN) {
      console.log('Skipping resource integration tests - no test credentials');
      return;
    }

    const logger = createLogger('error');
    httpClient = new HttpClient({
      baseUrl: process.env.TEST_N8N_URL!,
      apiToken: process.env.TEST_N8N_TOKEN!,
      timeout: 10000,
      retries: 1,
      concurrency: 2,
      logger,
    });

    clients = createResourceClients(httpClient, logger);
  });

  describe('Workflow Client', () => {
    it('should list workflows', async () => {
      if (!process.env.TEST_N8N_URL) return;

      const result = await clients.workflows.list({ limit: 5 });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(typeof result.totalFetched).toBe('number');
      expect(typeof result.pagesFetched).toBe('number');
    });

    it('should handle workflow not found', async () => {
      if (!process.env.TEST_N8N_URL) return;

      await expect(
        clients.workflows.get('nonexistent-workflow-id')
      ).rejects.toThrow();
    });
  });

  describe('Execution Client', () => {
    it('should list executions', async () => {
      if (!process.env.TEST_N8N_URL) return;

      const result = await clients.executions.list({ limit: 5 });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Tag Client', () => {
    it('should list tags', async () => {
      if (!process.env.TEST_N8N_URL) return;

      const result = await clients.tags.list({ limit: 10 });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });
});
```

**Action Items**:
1. Create comprehensive integration tests
2. Test server creation and startup
3. Test both STDIO and HTTP modes
4. Test CLI integration
5. Test resource clients with real API calls
6. Handle missing test credentials gracefully

### Task 6.5: Security and Data Validation Tests
**Estimated Time**: 25 minutes

Create test/unit/security/validation.test.ts:

```typescript
import { describe, it, expect } from 'vitest';
import { validateToolInput, safeValidateToolInput } from '../../../src/schemas/index.js';
import { createLogger } from '../../../src/logging.js';

describe('Security and Validation', () => {
  describe('Input Validation', () => {
    it('should validate listWorkflows input', () => {
      const validInput = {
        query: {
          active: true,
          limit: 10,
          name: 'test-workflow',
        },
      };

      const result = validateToolInput('listWorkflows', validInput);
      expect(result).toEqual(validInput);
    });

    it('should reject invalid limit values', () => {
      const invalidInput = {
        query: {
          limit: -1, // Invalid: negative
        },
      };

      expect(() => 
        validateToolInput('listWorkflows', invalidInput)
      ).toThrow();
    });

    it('should reject limit values that are too large', () => {
      const invalidInput = {
        query: {
          limit: 1000, // Invalid: exceeds max of 200
        },
      };

      expect(() => 
        validateToolInput('listWorkflows', invalidInput)
      ).toThrow();
    });

    it('should validate createUser input and required fields', () => {
      const validInput = {
        data: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'securepassword123',
        },
      };

      const result = validateToolInput('createUser', validInput);
      expect(result).toEqual(validInput);
    });

    it('should reject invalid email addresses', () => {
      const invalidInput = {
        data: {
          email: 'invalid-email', // Invalid email format
          firstName: 'Test',
          lastName: 'User',
          password: 'securepassword123',
        },
      };

      expect(() => 
        validateToolInput('createUser', invalidInput)
      ).toThrow();
    });

    it('should reject short passwords', () => {
      const invalidInput = {
        data: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: '123', // Too short
        },
      };

      expect(() => 
        validateToolInput('createUser', invalidInput)
      ).toThrow();
    });
  });

  describe('Safe Validation', () => {
    it('should return success for valid input', () => {
      const validInput = {
        id: 'workflow-123',
      };

      const result = safeValidateToolInput('getWorkflow', validInput);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validInput);
      }
    });

    it('should return error for invalid input', () => {
      const invalidInput = {
        // Missing required 'id' field
      };

      const result = safeValidateToolInput('getWorkflow', invalidInput);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('id');
      }
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize sensitive user data', async () => {
      const { sanitizeUserData } = await import('../../../src/tools/utils.js');
      
      const userData = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'secret123',
        apiKey: 'api-key-123',
        token: 'token-456',
        secret: 'secret-789',
      };

      const sanitized = sanitizeUserData(userData);
      
      expect(sanitized.id).toBe('1');
      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.password).toBeUndefined();
      expect(sanitized.apiKey).toBeUndefined();
      expect(sanitized.token).toBeUndefined();
      expect(sanitized.secret).toBeUndefined();
    });
  });

  describe('Logging Security', () => {
    it('should redact sensitive data from logs', () => {
      const logger = createLogger('debug');
      
      // Create a custom transport to capture log output
      const logOutput: any[] = [];
      const originalWrite = process.stdout.write;
      process.stdout.write = ((chunk: any) => {
        logOutput.push(JSON.parse(chunk.toString()));
        return true;
      }) as any;

      try {
        logger.info({
          token: 'secret-token',
          authorization: 'Bearer secret',
          'x-n8n-api-key': 'api-key',
          password: 'secret-password',
          data: {
            nested: {
              secret: 'nested-secret',
            },
          },
        }, 'Test log');

        const logEntry = logOutput[0];
        expect(logEntry.token).toBe('[REDACTED]');
        expect(logEntry.authorization).toBe('[REDACTED]');
        expect(logEntry['x-n8n-api-key']).toBe('[REDACTED]');
        expect(logEntry.password).toBe('[REDACTED]');
      } finally {
        process.stdout.write = originalWrite;
      }
    });
  });
});
```

**Action Items**:
1. Create comprehensive security validation tests
2. Test input validation for all tool schemas
3. Verify data sanitization works correctly
4. Test logging redaction of sensitive information
5. Add boundary value testing for numeric inputs

### Task 6.6: Performance and Load Testing
**Estimated Time**: 20 minutes

Create test/integration/performance.test.ts:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createServer } from '../../src/server.js';
import { createLogger } from '../../src/logging.js';
import type { Config } from '../../src/config.js';

describe('Performance Tests', () => {
  let mcpServer: any;

  beforeAll(async () => {
    if (!process.env.TEST_N8N_URL || !process.env.TEST_N8N_TOKEN) {
      return;
    }

    const testConfig: Config = {
      n8nApiUrl: process.env.TEST_N8N_URL!,
      n8nApiToken: process.env.TEST_N8N_TOKEN!,
      logLevel: 'error',
      httpTimeoutMs: 5000,
      httpRetries: 1,
      concurrency: 4,
      httpMode: false,
      httpPort: 3000,
    };

    const logger = createLogger('error');
    mcpServer = await createServer(testConfig, logger);
  });

  describe('Tool Execution Performance', () => {
    it('should execute listWorkflows within acceptable time', async () => {
      if (!mcpServer) return;

      const tool = mcpServer.registry.getToolDefinition('listWorkflows');
      if (!tool) return;

      const startTime = Date.now();
      
      await tool.handler({ query: { limit: 10 } }, mcpServer.context);
      
      const duration = Date.now() - startTime;
      
      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should handle concurrent tool executions', async () => {
      if (!mcpServer) return;

      const tool = mcpServer.registry.getToolDefinition('listWorkflows');
      if (!tool) return;

      const startTime = Date.now();
      
      // Execute 10 concurrent requests
      const promises = Array(10).fill(null).map(() =>
        tool.handler({ query: { limit: 5 } }, mcpServer.context)
      );
      
      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      
      // Should handle concurrency without significant slowdown
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during repeated operations', async () => {
      if (!mcpServer) return;

      const tool = mcpServer.registry.getToolDefinition('listWorkflows');
      if (!tool) return;

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Execute many operations
      for (let i = 0; i < 50; i++) {
        await tool.handler({ query: { limit: 1 } }, mcpServer.context);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Cache Performance', () => {
    it('should improve performance with caching', async () => {
      if (!mcpServer) return;

      const workflowClient = mcpServer.context.resources.workflows;
      
      // First call (cache miss)
      const startTime1 = Date.now();
      await workflowClient.get('some-id').catch(() => {}); // Ignore errors
      const duration1 = Date.now() - startTime1;
      
      // Second call (should be faster due to potential caching)
      const startTime2 = Date.now();
      await workflowClient.get('some-id').catch(() => {}); // Ignore errors
      const duration2 = Date.now() - startTime2;
      
      // Second call should be significantly faster or at least not slower
      expect(duration2).toBeLessThanOrEqual(duration1 * 1.5);
    });
  });
});
```

**Action Items**:
1. Create performance test suite
2. Test tool execution times
3. Verify concurrent request handling
4. Check for memory leaks
5. Test caching performance benefits

### Task 6.7: Error Handling and Recovery Tests
**Estimated Time**: 15 minutes

Create test/unit/resilience/error-handling.test.ts:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { HttpError, NetworkError, TimeoutError } from '../../../src/http/errors.js';
import { ToolRegistry } from '../../../src/tools/registry.js';
import { createLogger } from '../../../src/logging.js';

describe('Error Handling and Recovery', () => {
  describe('HTTP Error Mapping', () => {
    it('should map HTTP status codes to MCP error types', () => {
      expect(new HttpError(400, 'Bad Request').toMcpErrorType()).toBe('InvalidArgument');
      expect(new HttpError(401, 'Unauthorized').toMcpErrorType()).toBe('PermissionDenied');
      expect(new HttpError(403, 'Forbidden').toMcpErrorType()).toBe('PermissionDenied');
      expect(new HttpError(404, 'Not Found').toMcpErrorType()).toBe('NotFound');
      expect(new HttpError(409, 'Conflict').toMcpErrorType()).toBe('FailedPrecondition');
      expect(new HttpError(429, 'Rate Limited').toMcpErrorType()).toBe('ResourceExhausted');
      expect(new HttpError(500, 'Server Error').toMcpErrorType()).toBe('Unavailable');
    });

    it('should identify retryable errors correctly', () => {
      expect(new HttpError(400, 'Bad Request').isRetryable()).toBe(false);
      expect(new HttpError(401, 'Unauthorized').isRetryable()).toBe(false);
      expect(new HttpError(404, 'Not Found').isRetryable()).toBe(false);
      expect(new HttpError(429, 'Rate Limited').isRetryable()).toBe(true);
      expect(new HttpError(500, 'Server Error').isRetryable()).toBe(true);
      expect(new HttpError(502, 'Bad Gateway').isRetryable()).toBe(true);
      expect(new NetworkError('Connection failed').isRetryable()).toBe(true);
      expect(new TimeoutError('Request timeout').isRetryable()).toBe(true);
    });
  });

  describe('Tool Error Handling', () => {
    it('should handle tool execution errors gracefully', async () => {
      const registry = new ToolRegistry();
      const logger = createLogger('error');
      
      // Capture log output
      const logSpy = vi.spyOn(logger, 'error');
      
      const mockContext = {
        config: {} as any,
        logger,
        httpClient: {} as any,
        resources: {} as any,
      };

      // Register a tool that always throws
      registry.register({
        name: 'errorTool',
        description: 'A tool that throws errors',
        inputSchema: {},
        handler: async () => {
          throw new Error('Simulated error');
        },
      });

      const server = { setRequestHandler: vi.fn() } as any;
      await registry.setupMcpHandlers(server, mockContext);

      // Get the call tool handler
      const callToolHandler = server.setRequestHandler.mock.calls
        .find((call: any) => call[0].method === 'tools/call')?.[1];

      expect(callToolHandler).toBeDefined();

      // Test error handling
      await expect(
        callToolHandler({
          params: {
            name: 'errorTool',
            arguments: {},
          },
        })
      ).rejects.toThrow();

      // Verify error was logged
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: 'errorTool',
          success: false,
        }),
        'Tool execution failed'
      );
    });
  });

  describe('Network Resilience', () => {
    it('should handle network failures gracefully', () => {
      const networkError = new NetworkError('Connection refused');
      
      expect(networkError.name).toBe('NetworkError');
      expect(networkError.isRetryable()).toBe(true);
      expect(networkError.message).toBe('Connection refused');
    });

    it('should handle timeout errors', () => {
      const timeoutError = new TimeoutError('Request timeout after 30s');
      
      expect(timeoutError.name).toBe('TimeoutError');
      expect(timeoutError.isRetryable()).toBe(true);
      expect(timeoutError.message).toBe('Request timeout after 30s');
    });
  });
});
```

**Action Items**:
1. Test error mapping and classification
2. Verify retryable error identification
3. Test tool error handling
4. Verify logging of errors
5. Test network resilience

### Task 6.8: Test Scripts and CI Configuration
**Estimated Time**: 15 minutes

Update package.json test scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run --config vitest.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:coverage": "vitest run --coverage",
    "test:coverage:integration": "vitest run --config vitest.integration.config.ts --coverage",
    "test:ci": "pnpm test:unit && pnpm test:integration",
    "test:security": "vitest run test/unit/security/",
    "test:performance": "vitest run test/integration/performance.test.ts"
  }
}
```

Create .github/workflows/ci.yml:

```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18, 20]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8
    
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
    
    - name: Type check
      run: pnpm type-check
    
    - name: Lint
      run: pnpm lint
    
    - name: Build
      run: pnpm build
    
    - name: Run unit tests
      run: pnpm test:unit
    
    - name: Run integration tests
      run: pnpm test:integration
      env:
        TEST_N8N_URL: ${{ secrets.TEST_N8N_URL }}
        TEST_N8N_TOKEN: ${{ secrets.TEST_N8N_TOKEN }}
    
    - name: Generate coverage report
      run: pnpm test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        token: ${{ secrets.CODECOV_TOKEN }}
```

**Action Items**:
1. Update package.json with comprehensive test scripts
2. Create GitHub Actions CI workflow
3. Configure test matrix for multiple Node.js versions
4. Set up coverage reporting
5. Test CI pipeline works correctly

## Validation Checklist

- [ ] Unit tests cover all major functionality with >80% coverage
- [ ] HTTP client tests verify all scenarios and error cases
- [ ] Tool tests mock dependencies and test all operations
- [ ] Integration tests verify end-to-end functionality
- [ ] Security tests validate input sanitization and logging redaction
- [ ] Performance tests ensure acceptable response times
- [ ] Error handling tests verify resilience and recovery
- [ ] CI pipeline runs all tests successfully
- [ ] Coverage reports meet quality thresholds
- [ ] Both STDIO and HTTP modes are tested
- [ ] Test credentials can be configured via environment variables
- [ ] All edge cases and error conditions are covered

## Next Stage
Proceed to Stage 7: Documentation & Release once all validation items are complete.
