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
  const exponentialDelay = config.baseDelay * config.backoffMultiplier ** attempt;
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);

  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * config.jitterFactor * Math.random();
  return Math.floor(cappedDelay + jitter);
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  logger: Logger,
  context: string
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = calculateDelay(attempt - 1, config);
        logger.debug(
          {
            context,
            attempt,
            delay,
            maxRetries: config.maxRetries,
          },
          'Retrying request after delay'
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      return await operation();
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt === config.maxRetries) {
        logger.error(
          {
            context,
            attempt,
            maxRetries: config.maxRetries,
            error: error instanceof Error ? error.message : String(error),
            retryable: isRetryableError(error),
          },
          'Request failed, not retrying'
        );
        throw error;
      }

      logger.warn(
        {
          context,
          attempt,
          maxRetries: config.maxRetries,
          error: error instanceof Error ? error.message : String(error),
        },
        'Request failed, will retry'
      );
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
  return error instanceof Error && (error.name === 'NetworkError' || error.name === 'TimeoutError');
}
