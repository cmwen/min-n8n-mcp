#!/usr/bin/env node

import { Command } from 'commander';
import { loadConfig } from './config.js';
import { createLogger } from './logging.js';
import { createServer, startHttpServer, startStdioServer } from './server.js';
import { getVersion } from './version.js';

const program = new Command();

program
  .name('min-n8n-mcp')
  .description('Local MCP server for n8n workflow management')
  .version(getVersion());

program
  .option('--url <url>', 'n8n API base URL')
  .option('--token <token>', 'n8n API token')
  .option('--log-level <level>', 'Log level (debug|info|warn|error)', 'info')
  .option('--timeout <ms>', 'HTTP timeout in milliseconds', '30000')
  .option('--retries <n>', 'Number of HTTP retries', '2')
  .option('--concurrency <n>', 'Max concurrent requests', '4')
  .option('--http', 'Enable HTTP mode instead of STDIO')
  .option('--http-port <port>', 'HTTP server port', '3000')
  .option('--mode <mode>', 'Tool exposure mode (basic|intermediate|advanced)', 'intermediate')
  .option('--print-config', 'Print configuration and exit')
  .action(async (options) => {
    try {
      const config = loadConfig(options);
      const logger = config.httpMode
        ? createLogger(config.logLevel)
        : createLogger(config.logLevel, { destination: 'stderr' });

      if (options.printConfig) {
        const sanitizedConfig = {
          ...config,
          n8nApiToken: '[REDACTED]',
        };
        console.log(JSON.stringify(sanitizedConfig, null, 2));
        process.exit(0);
      }

      logger.info(
        { config: { ...config, n8nApiToken: '[REDACTED]' } },
        'Creating MCP server with config'
      );

      // Create server
      const mcpServer = await createServer(config, logger);

      // Start in appropriate mode
      if (config.httpMode) {
        const httpServer = startHttpServer(mcpServer);

        // Handle graceful shutdown for HTTP mode
        process.on('SIGINT', async () => {
          logger.info('Received SIGINT, shutting down gracefully');
          httpServer.close(() => {
            logger.info('HTTP server closed');
            process.exit(0);
          });
        });

        process.on('SIGTERM', async () => {
          logger.info('Received SIGTERM, shutting down gracefully');
          httpServer.close(() => {
            logger.info('HTTP server closed');
            process.exit(0);
          });
        });
      } else {
        logger.info('Starting MCP server in STDIO mode');
        await startStdioServer(mcpServer);
      }
    } catch (error) {
      console.error(
        'Failed to start server:',
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

program.parse();
