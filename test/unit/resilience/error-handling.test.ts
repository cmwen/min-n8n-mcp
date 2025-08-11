import { describe, expect, it, vi } from 'vitest';
import { HttpError, NetworkError, TimeoutError } from '../../../src/http/errors.js';
import { createLogger } from '../../../src/logging.js';
import { ToolRegistry } from '../../../src/tools/registry.js';

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

      // Test that the tool was registered
      const tool = registry.getToolDefinition('errorTool');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('errorTool');

      // Test that calling the handler directly throws
      await expect(tool?.handler({}, mockContext)).rejects.toThrow('Simulated error');
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
