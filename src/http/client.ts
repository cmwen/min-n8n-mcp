import { fetch } from 'undici';
import type { Config } from '../config.js';
import type { Logger } from '../logging.js';
import { getVersion } from '../version.js';
import { HttpError, NetworkError, TimeoutError } from './errors.js';
import { createRateLimiter, DEFAULT_RATE_LIMIT_CONFIG } from './rateLimit.js';
import { DEFAULT_RETRY_CONFIG, type RetryConfig, withRetry } from './retry.js';

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
      'User-Agent': `min-n8n-mcp/${getVersion()}`,
    };
    this.timeout = options.timeout;
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: options.retries,
    };
    this.logger = options.logger;

    this.rateLimiter = createRateLimiter(
      {
        ...DEFAULT_RATE_LIMIT_CONFIG,
        maxConcurrent: options.concurrency,
      },
      this.logger
    );
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
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  private async makeRequest(url: string, options: RequestOptions): Promise<any> {
    const controller = new AbortController();
    const timeout = options.timeout || this.timeout;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers = {
        ...this.defaultHeaders,
        ...options.headers,
      };

      const requestOptions: any = {
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

      this.logger.debug(
        {
          method: requestOptions.method,
          url: url.replace(/\?.*$/, ''), // Remove query params from logs
          hasBody: !!requestOptions.body,
        },
        'Making HTTP request'
      );

      const response = await fetch(url, requestOptions);

      this.logger.debug(
        {
          method: requestOptions.method,
          url: url.replace(/\?.*$/, ''),
          status: response.status,
          statusText: response.statusText,
        },
        'HTTP response received'
      );

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

  private async parseResponse(response: any): Promise<any> {
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
      this.logger.warn(
        {
          status: response.status,
          contentType,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to parse JSON response'
      );
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

  async post<T = any>(
    path: string,
    body?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  async put<T = any>(
    path: string,
    body?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  async patch<T = any>(
    path: string,
    body?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  async delete<T = any>(path: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}
