import { type ChildProcess, spawn } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import type { Config } from '../../src/config.js';
import { createLogger } from '../../src/logging.js';
import { createServer } from '../../src/server.js';

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
    mode: 'advanced',
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

      await expect(createServer(invalidConfig, logger)).rejects.toThrow();
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
      await new Promise((resolve) => setTimeout(resolve, 1000));

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
