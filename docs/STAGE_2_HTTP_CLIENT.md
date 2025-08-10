# Stage 2: HTTP Client Infrastructure

## Overview
Implement a robust HTTP client with retries, timeouts, error handling, and rate limiting for communicating with the n8n API.

## Tasks

### Task 2.1: HTTP Error Classes
**Estimated Time**: 20 minutes

Create src/http/errors.ts with comprehensive error handling:

```typescript
import type { Logger } from '../logging.js';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static fromResponse(response: Response, body?: any): HttpError {
    const message = body?.message || response.statusText || `HTTP ${response.status}`;
    const code = body?.code;
    
    return new HttpError(response.status, message, code, body);
  }

  isRetryable(): boolean {
    // Retry on 5xx errors, rate limits, and network issues
    return this.status >= 500 || this.status === 429 || this.status === 408;
  }

  toMcpErrorType(): string {
    switch (this.status) {
      case 400:
        return 'InvalidArgument';
      case 401:
        return 'PermissionDenied';
      case 403:
        return 'PermissionDenied';
      case 404:
        return 'NotFound';
      case 409:
        return 'FailedPrecondition';
      case 429:
        return 'ResourceExhausted';
      default:
        return this.status >= 500 ? 'Unavailable' : 'Unknown';
    }
  }
}

export class NetworkError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'NetworkError';
  }

  isRetryable(): boolean {
    return true;
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Request timeout') {
    super(message);
    this.name = 'TimeoutError';
  }

  isRetryable(): boolean {
    return true;
  }
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof HttpError) {
    return error.isRetryable();
  }
  if (error instanceof NetworkError || error instanceof TimeoutError) {
    return true;
  }
  return false;
}

export function logError(logger: Logger, error: unknown, context: string): void {
  if (error instanceof HttpError) {
    logger.error({
      context,
      status: error.status,
      code: error.code,
      message: error.message,
      retryable: error.isRetryable(),
    }, 'HTTP error');
  } else if (error instanceof NetworkError) {
    logger.error({
      context,
      message: error.message,
      cause: error.cause?.message,
      retryable: true,
    }, 'Network error');
  } else if (error instanceof TimeoutError) {
    logger.error({
      context,
      message: error.message,
      retryable: true,
    }, 'Timeout error');
  } else {
    logger.error({
      context,
      error: error instanceof Error ? error.message : String(error),
      retryable: false,
    }, 'Unknown error');
  }
}
```

**Action Items**:
1. Create src/http/errors.ts with exact content above
2. Implement proper error hierarchy
3. Add MCP error type mapping
4. Include retryability logic
5. Add structured error logging

### Task 2.2: Rate Limiting with Bottleneck
**Estimated Time**: 15 minutes

Create src/http/rateLimit.ts:

```typescript
import Bottleneck from 'bottleneck';
import type { Logger } from '../logging.js';

export interface RateLimitConfig {
  maxConcurrent: number;
  minTime: number; // Minimum time between requests in ms
  highWater: number; // Queue size limit
  strategy: Bottleneck.Strategy;
}

export function createRateLimiter(config: RateLimitConfig, logger: Logger): Bottleneck {
  const limiter = new Bottleneck({
    maxConcurrent: config.maxConcurrent,
    minTime: config.minTime,
    highWater: config.highWater,
    strategy: config.strategy,
  });

  // Log rate limiting events
  limiter.on('failed', (error, jobInfo) => {
    logger.warn({
      error: error.message,
      retryCount: jobInfo.retryCount,
      options: jobInfo.options,
    }, 'Rate limited request failed');
  });

  limiter.on('retry', (error, jobInfo) => {
    logger.debug({
      error: error.message,
      retryCount: jobInfo.retryCount,
      delay: jobInfo.options.delay,
    }, 'Retrying rate limited request');
  });

  limiter.on('depleted', () => {
    logger.warn('Rate limiter queue is empty');
  });

  limiter.on('dropped', (dropped) => {
    logger.error({
      dropped,
    }, 'Rate limiter dropped job due to queue overflow');
  });

  return limiter;
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxConcurrent: 4,
  minTime: 250, // 4 requests per second max
  highWater: 50, // Max 50 queued requests
  strategy: Bottleneck.strategy.LEAK,
};
```

**Action Items**:
1. Create src/http/rateLimit.ts with exact content above
2. Configure Bottleneck for reasonable defaults
3. Add comprehensive event logging
4. Test rate limiting behavior

### Task 2.3: Retry Logic with Exponential Backoff
**Estimated Time**: 25 minutes

Create src/http/retry.ts:

```typescript
import type { Logger } from '../logging.js';
import { isRetryableError } from './errors.js';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // Base delay in ms
  maxDelay: number; // Maximum delay in ms
  backoffMultiplier: number;
  jitterFactor: number; // 0-1, amount of randomness to add
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelay: 200,
  maxDelay: 5000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
};

export function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  
  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * config.jitterFactor * Math.random();
  return Math.floor(cappedDelay + jitter);
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  logger: Logger,
  context: string,
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = calculateDelay(attempt - 1, config);
        logger.debug({
          context,
          attempt,
          delay,
          maxRetries: config.maxRetries,
        }, 'Retrying request after delay');
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (!isRetryableError(error) || attempt === config.maxRetries) {
        logger.error({
          context,
          attempt,
          maxRetries: config.maxRetries,
          error: error instanceof Error ? error.message : String(error),
          retryable: isRetryableError(error),
        }, 'Request failed, not retrying');
        throw error;
      }
      
      logger.warn({
        context,
        attempt,
        maxRetries: config.maxRetries,
        error: error instanceof Error ? error.message : String(error),
      }, 'Request failed, will retry');
    }
  }
  
  throw lastError;
}

export function isIdempotentMethod(method: string): boolean {
  return ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'].includes(method.toUpperCase());
}

export function shouldRetryMethod(method: string, error: unknown): boolean {
  // Always retry idempotent methods on retryable errors
  if (isIdempotentMethod(method)) {
    return isRetryableError(error);
  }
  
  // For non-idempotent methods (POST, PATCH), only retry on network errors
  // to avoid duplicate operations
  return error instanceof Error && 
         (error.name === 'NetworkError' || error.name === 'TimeoutError');
}
```

**Action Items**:
1. Create src/http/retry.ts with exact content above
2. Implement exponential backoff with jitter
3. Add method-specific retry logic
4. Include comprehensive retry logging
5. Test retry behavior with different error types

### Task 2.4: Core HTTP Client
**Estimated Time**: 40 minutes

Create src/http/client.ts:

```typescript
import { fetch } from 'undici';
import type { Config } from '../config.js';
import type { Logger } from '../logging.js';
import { HttpError, NetworkError, TimeoutError, logError } from './errors.js';
import { createRateLimiter, DEFAULT_RATE_LIMIT_CONFIG } from './rateLimit.js';
import { withRetry, DEFAULT_RETRY_CONFIG, shouldRetryMethod, type RetryConfig } from './retry.js';

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  retryConfig?: Partial<RetryConfig>;
}

export interface HttpClientOptions {
  baseUrl: string;
  apiToken: string;
  timeout: number;
  retries: number;
  concurrency: number;
  logger: Logger;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly timeout: number;
  private readonly retryConfig: RetryConfig;
  private readonly rateLimiter;
  private readonly logger: Logger;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.defaultHeaders = {
      'X-N8N-API-KEY': options.apiToken,
      'Content-Type': 'application/json',
      'User-Agent': 'min-n8n-mcp/0.1.0',
    };
    this.timeout = options.timeout;
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: options.retries,
    };
    this.logger = options.logger;
    
    this.rateLimiter = createRateLimiter({
      ...DEFAULT_RATE_LIMIT_CONFIG,
      maxConcurrent: options.concurrency,
    }, this.logger);
  }

  static fromConfig(config: Config, logger: Logger): HttpClient {
    return new HttpClient({
      baseUrl: config.n8nApiUrl,
      apiToken: config.n8nApiToken,
      timeout: config.httpTimeoutMs,
      retries: config.httpRetries,
      concurrency: config.concurrency,
      logger,
    });
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  private async makeRequest(url: string, options: RequestOptions): Promise<Response> {
    const controller = new AbortController();
    const timeout = options.timeout || this.timeout;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers = {
        ...this.defaultHeaders,
        ...options.headers,
      };

      const requestOptions: RequestInit = {
        method: options.method || 'GET',
        headers,
        signal: controller.signal,
      };

      if (options.body !== undefined) {
        if (typeof options.body === 'string') {
          requestOptions.body = options.body;
        } else {
          requestOptions.body = JSON.stringify(options.body);
        }
      }

      this.logger.debug({
        method: requestOptions.method,
        url: url.replace(/\?.*$/, ''), // Remove query params from logs
        hasBody: !!requestOptions.body,
      }, 'Making HTTP request');

      const response = await fetch(url, requestOptions);
      
      this.logger.debug({
        method: requestOptions.method,
        url: url.replace(/\?.*$/, ''),
        status: response.status,
        statusText: response.statusText,
      }, 'HTTP response received');

      return response;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new TimeoutError(`Request timeout after ${timeout}ms`);
      }
      
      // Network errors (connection refused, DNS issues, etc.)
      throw new NetworkError(
        `Network request failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type') || '';
    
    if (!response.ok) {
      let body: any;
      try {
        if (contentType.includes('application/json')) {
          body = await response.json();
        } else {
          body = await response.text();
        }
      } catch {
        // Ignore parse errors for error responses
      }
      
      throw HttpError.fromResponse(response, body);
    }

    if (response.status === 204 || !contentType.includes('application/json')) {
      return null;
    }

    try {
      return await response.json();
    } catch (error) {
      this.logger.warn({
        status: response.status,
        contentType,
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to parse JSON response');
      return null;
    }
  }

  async request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, options.params);
    const method = options.method || 'GET';
    const context = `${method} ${path}`;
    
    const retryConfig = {
      ...this.retryConfig,
      ...options.retryConfig,
    };

    return this.rateLimiter.schedule(async () => {
      return withRetry(
        async () => {
          const response = await this.makeRequest(url, options);
          return this.parseResponse(response);
        },
        retryConfig,
        this.logger,
        context
      );
    });
  }

  // Convenience methods
  async get<T = any>(path: string, params?: Record<string, string | number | boolean>): Promise<T> {
    return this.request<T>(path, { method: 'GET', params });
  }

  async post<T = any>(path: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  async put<T = any>(path: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  async patch<T = any>(path: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  async delete<T = any>(path: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}
```

**Action Items**:
1. Create src/http/client.ts with exact content above
2. Implement comprehensive HTTP client with all features
3. Add proper URL building with query parameters
4. Include timeout handling with AbortController
5. Add response parsing with error handling
6. Integrate rate limiting and retry logic
7. Test all HTTP methods and error scenarios

### Task 2.5: HTTP Client Integration Tests
**Estimated Time**: 30 minutes

Create test/unit/http/client.test.ts:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpClient } from '../../../src/http/client.js';
import { HttpError, NetworkError, TimeoutError } from '../../../src/http/errors.js';
import { createLogger } from '../../../src/logging.js';

// Mock fetch
const mockFetch = vi.fn();
vi.mock('undici', () => ({
  fetch: mockFetch,
}));

describe('HttpClient', () => {
  let client: HttpClient;
  let logger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    logger = createLogger('error'); // Suppress logs in tests
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

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { ok: true, status: 200, headers: new Map([['content-type', 'application/json']]), json: () => Promise.resolve({ id: 1 }) };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await client.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-N8N-API-KEY': 'test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual({ id: 1 });
    });

    it('should handle query parameters', async () => {
      const mockResponse = { ok: true, status: 200, headers: new Map([['content-type', 'application/json']]), json: () => Promise.resolve({}) };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await client.get('/test', { limit: 10, active: true });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/test?limit=10&active=true',
        expect.any(Object)
      );
    });
  });

  describe('POST requests', () => {
    it('should make successful POST request with body', async () => {
      const mockResponse = { ok: true, status: 201, headers: new Map([['content-type', 'application/json']]), json: () => Promise.resolve({ id: 1 }) };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const body = { name: 'test' };
      const result = await client.post('/test', body);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('Error handling', () => {
    it('should throw HttpError for 4xx responses', async () => {
      const mockResponse = { 
        ok: false, 
        status: 404, 
        statusText: 'Not Found',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ message: 'Resource not found' })
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(client.get('/test')).rejects.toThrow(HttpError);
    });

    it('should retry on 5xx errors', async () => {
      const errorResponse = { 
        ok: false, 
        status: 500, 
        statusText: 'Internal Server Error',
        headers: new Map(),
        json: () => Promise.resolve({})
      };
      const successResponse = { 
        ok: true, 
        status: 200, 
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ id: 1 })
      };
      
      mockFetch
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(successResponse);

      const result = await client.get('/test');
      expect(result).toEqual({ id: 1 });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.get('/test')).rejects.toThrow(NetworkError);
    });
  });

  describe('Timeouts', () => {
    it('should timeout long requests', async () => {
      // Mock a request that never resolves
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      const shortTimeoutClient = new HttpClient({
        baseUrl: 'https://api.example.com/api/v1',
        apiToken: 'test-token',
        timeout: 100, // Very short timeout
        retries: 0,
        concurrency: 1,
        logger,
      });

      await expect(shortTimeoutClient.get('/test')).rejects.toThrow(TimeoutError);
    });
  });
});
```

**Action Items**:
1. Create comprehensive test suite for HTTP client
2. Mock fetch calls and test all scenarios
3. Test success cases, error handling, retries, and timeouts
4. Verify proper header handling and URL construction
5. Ensure rate limiting works as expected

### Task 2.6: Update Server Bootstrap
**Estimated Time**: 15 minutes

Update src/server.ts to include HTTP client:

```typescript
import type { Config } from './config.js';
import type { Logger } from './logging.js';
import { HttpClient } from './http/client.js';

export interface ServerContext {
  config: Config;
  logger: Logger;
  httpClient: HttpClient;
}

export async function createServer(config: Config, logger: Logger): Promise<ServerContext> {
  const httpClient = HttpClient.fromConfig(config, logger);
  
  // Test connection to n8n API
  try {
    logger.info('Testing connection to n8n API...');
    // Try to fetch a simple endpoint to verify connectivity
    await httpClient.get('/workflows', { limit: 1 });
    logger.info('Successfully connected to n8n API');
  } catch (error) {
    logger.error('Failed to connect to n8n API', error);
    throw new Error(`Cannot connect to n8n API at ${config.n8nApiUrl}. Please verify the URL and API token.`);
  }

  const context: ServerContext = {
    config,
    logger,
    httpClient,
  };

  logger.info({
    mode: config.httpMode ? 'HTTP' : 'STDIO',
    url: config.n8nApiUrl,
    port: config.httpMode ? config.httpPort : undefined,
  }, 'MCP server initialized');

  return context;
}
```

**Action Items**:
1. Update src/server.ts with exact content above
2. Add HTTP client to server context
3. Include connection testing on startup
4. Add proper error handling for connection failures
5. Test server initialization with valid and invalid configs

## Validation Checklist

- [ ] HTTP error classes handle all error types correctly
- [ ] Rate limiting prevents request overload
- [ ] Retry logic works with exponential backoff and jitter
- [ ] HTTP client integrates all components properly
- [ ] All HTTP methods (GET, POST, PUT, PATCH, DELETE) work
- [ ] Error handling maps HTTP status codes to MCP error types
- [ ] Timeouts abort requests properly
- [ ] Request/response logging works without exposing secrets
- [ ] Connection testing validates n8n API accessibility
- [ ] Unit tests cover all major functionality

## Next Stage
Proceed to Stage 3: MCP Server Core once all validation items are complete.
