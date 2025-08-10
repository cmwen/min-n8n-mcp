import type { Config } from './config.js';
import type { Logger } from './logging.js';

export async function createServer(config: Config, logger: Logger) {
  logger.info('Creating MCP server with config', {
    url: config.n8nApiUrl,
    httpMode: config.httpMode,
  });

  // TODO: Implement actual MCP server creation
  return {
    start: () => {
      logger.info('Server started');
    },
    stop: () => {
      logger.info('Server stopped');
    },
  };
}
