import type { Logger } from '../logging.js';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static fromResponse(response: any, body?: any): HttpError {
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
  constructor(
    message: string,
    public override readonly cause?: Error
  ) {
    super(message);
    this.name = 'NetworkError';
  }

  isRetryable(): boolean {
    return true;
  }
}

export class TimeoutError extends Error {
  constructor(message = 'Request timeout') {
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
    logger.error(
      {
        context,
        status: error.status,
        code: error.code,
        message: error.message,
        retryable: error.isRetryable(),
      },
      'HTTP error'
    );
  } else if (error instanceof NetworkError) {
    logger.error(
      {
        context,
        message: error.message,
        cause: error.cause?.message,
        retryable: true,
      },
      'Network error'
    );
  } else if (error instanceof TimeoutError) {
    logger.error(
      {
        context,
        message: error.message,
        retryable: true,
      },
      'Timeout error'
    );
  } else {
    logger.error(
      {
        context,
        error: error instanceof Error ? error.message : String(error),
        retryable: false,
      },
      'Unknown error'
    );
  }
}
