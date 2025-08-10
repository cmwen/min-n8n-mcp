import type { Config } from './config.js';
import { HttpClient } from './http/client.js';
import type { Logger } from './logging.js';

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
    throw new Error(
      `Cannot connect to n8n API at ${config.n8nApiUrl}. Please verify the URL and API token.`
    );
  }

  const context: ServerContext = {
    config,
    logger,
    httpClient,
  };

  logger.info(
    {
      mode: config.httpMode ? 'HTTP' : 'STDIO',
      url: config.n8nApiUrl,
      port: config.httpMode ? config.httpPort : undefined,
    },
    'MCP server initialized'
  );

  return context;
}
