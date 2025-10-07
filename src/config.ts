import { z } from 'zod';

const ConfigSchema = z.object({
  n8nApiUrl: z.string().url('Invalid n8n API URL'),
  n8nApiToken: z.string().min(1, 'n8n API token is required'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  httpTimeoutMs: z.number().int().positive().default(30000),
  httpRetries: z.number().int().min(0).default(2),
  concurrency: z.number().int().positive().default(4),
  httpMode: z.boolean().default(false),
  httpPort: z.number().int().min(1).max(65535).default(3000),
  mode: z.enum(['basic', 'intermediate', 'advanced']).default('intermediate'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(cliOptions: Record<string, any> = {}): Config {
  // Load from environment variables
  const env = {
    n8nApiUrl: process.env.N8N_API_URL,
    n8nApiToken: process.env.N8N_API_TOKEN,
    logLevel: process.env.LOG_LEVEL,
    httpTimeoutMs: process.env.HTTP_TIMEOUT_MS
      ? Number.parseInt(process.env.HTTP_TIMEOUT_MS, 10)
      : undefined,
    httpRetries: process.env.HTTP_RETRIES
      ? Number.parseInt(process.env.HTTP_RETRIES, 10)
      : undefined,
    concurrency: process.env.CONCURRENCY ? Number.parseInt(process.env.CONCURRENCY, 10) : undefined,
    httpMode: process.env.MCP_HTTP_PORT ? true : cliOptions.http || false,
    httpPort: process.env.MCP_HTTP_PORT
      ? Number.parseInt(process.env.MCP_HTTP_PORT, 10)
      : undefined,
    mode: process.env.MCP_MODE,
  };

  // CLI options override environment variables
  const merged = {
    n8nApiUrl: cliOptions.url || env.n8nApiUrl,
    n8nApiToken: cliOptions.token || env.n8nApiToken,
    logLevel: cliOptions.logLevel || env.logLevel,
    httpTimeoutMs: cliOptions.timeout ? Number.parseInt(cliOptions.timeout, 10) : env.httpTimeoutMs,
    httpRetries: cliOptions.retries ? Number.parseInt(cliOptions.retries, 10) : env.httpRetries,
    concurrency: cliOptions.concurrency
      ? Number.parseInt(cliOptions.concurrency, 10)
      : env.concurrency,
    httpMode: cliOptions.http || env.httpMode,
    httpPort: cliOptions.httpPort ? Number.parseInt(cliOptions.httpPort, 10) : env.httpPort,
    mode: cliOptions.mode || env.mode,
  };

  // Normalize n8n URL - append /api/v1 if it's just the server root
  if (merged.n8nApiUrl && !merged.n8nApiUrl.includes('/api/v1')) {
    merged.n8nApiUrl = `${merged.n8nApiUrl.replace(/\/$/, '')}/api/v1`;
  }

  try {
    return ConfigSchema.parse(merged);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => {
        const path = issue.path.join('.');
        const message = issue.message;

        // Provide helpful hints for common configuration errors
        if (path === 'n8nApiUrl') {
          return `❌ ${path}: ${message}\n   Set via: N8N_API_URL environment variable or --url CLI flag\n   Example: export N8N_API_URL="http://localhost:5678"`;
        }
        if (path === 'n8nApiToken') {
          return `❌ ${path}: ${message}\n   Set via: N8N_API_TOKEN environment variable or --token CLI flag\n   Example: export N8N_API_TOKEN="your-api-token-here"\n   Get your token from: n8n Settings > API`;
        }
        return `❌ ${path}: ${message}`;
      });

      throw new Error(
        `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nConfiguration validation failed:\n\n${issues.join('\n\n')}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      );
    }
    throw error;
  }
}
