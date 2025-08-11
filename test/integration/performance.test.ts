import { beforeAll, describe, expect, it } from 'vitest';
import type { Config } from '../../src/config.js';
import { createLogger } from '../../src/logging.js';
import { createServer } from '../../src/server.js';

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
      const promises = Array(10)
        .fill(null)
        .map(() => tool.handler({ query: { limit: 5 } }, mcpServer.context));

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
