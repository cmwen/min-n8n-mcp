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
    logger.warn(
      {
        error: String(error),
        retryCount: jobInfo.retryCount,
        options: jobInfo.options,
      },
      'Rate limited request failed'
    );
  });

  limiter.on('retry', (error, jobInfo) => {
    logger.debug(
      {
        error: String(error),
        retryCount: jobInfo.retryCount,
        delay: (jobInfo.options as any)?.delay,
      },
      'Retrying rate limited request'
    );
  });

  limiter.on('depleted', () => {
    logger.warn('Rate limiter queue is empty');
  });

  limiter.on('dropped', (dropped) => {
    logger.error(
      {
        dropped,
      },
      'Rate limiter dropped job due to queue overflow'
    );
  });

  return limiter;
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxConcurrent: 4,
  minTime: 250, // 4 requests per second max
  highWater: 50, // Max 50 queued requests
  strategy: Bottleneck.strategy.LEAK,
};
