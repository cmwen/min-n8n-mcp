#!/usr/bin/env node

import { Command } from 'commander';
import { loadConfig } from './config.js';
import { createLogger } from './logging.js';
import { createServer } from './server.js';

const program = new Command();

program
  .name('min-n8n-mcp')
  .description('Local MCP server for n8n workflow management')
  .version('0.1.0');

program
  .option('--url <url>', 'n8n API base URL')
  .option('--token <token>', 'n8n API token')
  .option('--log-level <level>', 'Log level (debug|info|warn|error)', 'info')
  .option('--timeout <ms>', 'HTTP timeout in milliseconds', '30000')
  .option('--retries <n>', 'Number of HTTP retries', '2')
  .option('--concurrency <n>', 'Max concurrent requests', '4')
  .option('--http', 'Enable HTTP mode instead of STDIO')
  .option('--http-port <port>', 'HTTP server port', '3000')
  .option('--print-config', 'Print configuration and exit')
  .action(async (options) => {
    try {
      const config = loadConfig(options);
      const logger = createLogger(config.logLevel);

      if (options.printConfig) {
        console.log(JSON.stringify(config, null, 2));
        process.exit(0);
      }

      const server = await createServer(config, logger);

      if (config.httpMode) {
        logger.info(`Starting MCP server in HTTP mode on port ${config.httpPort}`);
        // TODO: Start HTTP server
      } else {
        logger.info('Starting MCP server in STDIO mode');
        // TODO: Start STDIO server
      }
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  });

program.parse();
