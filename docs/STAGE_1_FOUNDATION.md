# Stage 1: Foundation Setup

## Overview
Set up the project structure, tooling, and basic configuration for the min-n8n-mcp server.

## Tasks

### Task 1.1: Initialize Project Structure
**Estimated Time**: 30 minutes

Create the basic project structure:

```
min-n8n-mcp/
├── src/
│   ├── cli.ts
│   ├── server.ts
│   ├── config.ts
│   ├── logging.ts
│   ├── http/
│   │   ├── client.ts
│   │   ├── errors.ts
│   │   └── rateLimit.ts
│   ├── resources/
│   │   ├── workflows.ts
│   │   ├── executions.ts
│   │   ├── credentials.ts
│   │   ├── tags.ts
│   │   ├── users.ts
│   │   ├── variables.ts
│   │   ├── projects.ts
│   │   ├── audit.ts
│   │   └── sourceControl.ts
│   ├── tools/
│   │   ├── workflows.ts
│   │   ├── executions.ts
│   │   ├── credentials.ts
│   │   ├── tags.ts
│   │   ├── users.ts
│   │   ├── variables.ts
│   │   ├── projects.ts
│   │   ├── audit.ts
│   │   └── sourceControl.ts
│   ├── schemas/
│   │   └── index.ts
│   └── util/
│       ├── pagination.ts
│       └── cache.ts
├── test/
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
├── biome.json
├── .gitignore
└── README.md
```

**Action Items**:
1. Create all directories listed above
2. Create placeholder files with basic exports
3. Ensure proper file naming and structure

### Task 1.2: Setup package.json
**Estimated Time**: 20 minutes

Create comprehensive package.json with all required dependencies:

```json
{
  "name": "min-n8n-mcp",
  "version": "0.1.0",
  "description": "Local MCP server for n8n workflow management",
  "main": "dist/index.js",
  "bin": {
    "min-n8n-mcp": "dist/cli.js"
  },
  "type": "module",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsx src/cli.ts",
    "lint": "biome check .",
    "lint:fix": "biome check . --fix",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:integration": "vitest --config vitest.integration.config.ts",
    "type-check": "tsc --noEmit",
    "prepare": "husky",
    "prepack": "pnpm build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "commander": "^12.0.0",
    "zod": "^3.22.0",
    "zod-to-json-schema": "^3.22.0",
    "bottleneck": "^2.19.5",
    "pino": "^8.17.0",
    "undici": "^6.6.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.5.0",
    "@types/node": "^20.11.0",
    "husky": "^9.0.0",
    "tsup": "^8.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "vitest": "^1.2.0",
    "@vitest/coverage-v8": "^1.2.0"
  },
  "keywords": [
    "mcp",
    "n8n",
    "workflow",
    "automation",
    "model-context-protocol"
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/cmwen/min-n8n-mcp.git"
  },
  "license": "MIT",
  "files": [
    "dist"
  ]
}
```

**Action Items**:
1. Create package.json with exact content above
2. Verify all dependency versions are latest stable
3. Ensure bin path points to correct CLI entry

### Task 1.3: TypeScript Configuration
**Estimated Time**: 15 minutes

Create tsconfig.json for proper TypeScript setup:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowImportingTsExtensions": false,
    "verbatimModuleSyntax": false,
    "allowJs": true,
    "checkJs": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "src/**/*",
    "test/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

**Action Items**:
1. Create tsconfig.json with exact content above
2. Verify paths configuration works correctly
3. Test TypeScript compilation

### Task 1.4: Build Configuration (tsup)
**Estimated Time**: 15 minutes

Create tsup.config.ts for building:

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    index: 'src/server.ts'
  },
  format: ['esm'],
  target: 'node18',
  clean: true,
  sourcemap: true,
  dts: true,
  shims: true,
  splitting: false,
  bundle: true,
  minify: false,
  external: [
    '@modelcontextprotocol/sdk'
  ]
});
```

**Action Items**:
1. Create tsup.config.ts with exact content above
2. Verify build configuration produces correct output
3. Test that CLI entry point works

### Task 1.5: Code Quality Setup (Biome)
**Estimated Time**: 15 minutes

Create biome.json for linting and formatting:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.5.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "noNonNullAssertion": "off"
      },
      "suspicious": {
        "noExplicitAny": "off"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "es5"
    }
  },
  "files": {
    "ignore": [
      "dist",
      "node_modules",
      "coverage"
    ]
  }
}
```

**Action Items**:
1. Create biome.json with exact content above
2. Test linting and formatting commands
3. Verify code style enforcement

### Task 1.6: Git Configuration
**Estimated Time**: 10 minutes

Create .gitignore:

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Coverage
coverage/
.nyc_output/

# Temporary files
*.tmp
*.temp
.cache/

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

**Action Items**:
1. Create .gitignore with exact content above
2. Verify all build outputs and sensitive files are ignored
3. Test git status shows clean working directory

### Task 1.7: Husky Setup for Git Hooks
**Estimated Time**: 10 minutes

Create .husky/pre-commit:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint:fix
pnpm type-check
```

**Action Items**:
1. Install husky with `pnpm exec husky`
2. Create pre-commit hook with content above
3. Make pre-commit executable: `chmod +x .husky/pre-commit`
4. Test pre-commit hook runs correctly

### Task 1.8: Basic CLI Structure
**Estimated Time**: 20 minutes

Create src/cli.ts with basic structure:

```typescript
#!/usr/bin/env node

import { Command } from 'commander';
import { createServer } from './server.js';
import { loadConfig } from './config.js';
import { createLogger } from './logging.js';

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
```

**Action Items**:
1. Create src/cli.ts with exact content above
2. Add shebang line for executable
3. Verify commander.js integration works
4. Test CLI help and version commands

### Task 1.9: Configuration Management
**Estimated Time**: 25 minutes

Create src/config.ts:

```typescript
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
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(cliOptions: Record<string, any> = {}): Config {
  // Load from environment variables
  const env = {
    n8nApiUrl: process.env.N8N_API_URL,
    n8nApiToken: process.env.N8N_API_TOKEN,
    logLevel: process.env.LOG_LEVEL,
    httpTimeoutMs: process.env.HTTP_TIMEOUT_MS ? parseInt(process.env.HTTP_TIMEOUT_MS, 10) : undefined,
    httpRetries: process.env.HTTP_RETRIES ? parseInt(process.env.HTTP_RETRIES, 10) : undefined,
    concurrency: process.env.CONCURRENCY ? parseInt(process.env.CONCURRENCY, 10) : undefined,
    httpMode: process.env.MCP_HTTP_PORT ? true : cliOptions.http || false,
    httpPort: process.env.MCP_HTTP_PORT ? parseInt(process.env.MCP_HTTP_PORT, 10) : undefined,
  };

  // CLI options override environment variables
  const merged = {
    n8nApiUrl: cliOptions.url || env.n8nApiUrl,
    n8nApiToken: cliOptions.token || env.n8nApiToken,
    logLevel: cliOptions.logLevel || env.logLevel,
    httpTimeoutMs: cliOptions.timeout ? parseInt(cliOptions.timeout, 10) : env.httpTimeoutMs,
    httpRetries: cliOptions.retries ? parseInt(cliOptions.retries, 10) : env.httpRetries,
    concurrency: cliOptions.concurrency ? parseInt(cliOptions.concurrency, 10) : env.concurrency,
    httpMode: cliOptions.http || env.httpMode,
    httpPort: cliOptions.httpPort ? parseInt(cliOptions.httpPort, 10) : env.httpPort,
  };

  // Normalize n8n URL - append /api/v1 if it's just the server root
  if (merged.n8nApiUrl && !merged.n8nApiUrl.includes('/api/v1')) {
    merged.n8nApiUrl = merged.n8nApiUrl.replace(/\/$/, '') + '/api/v1';
  }

  try {
    return ConfigSchema.parse(merged);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n');
      throw new Error(`Configuration validation failed:\n${issues}`);
    }
    throw error;
  }
}
```

**Action Items**:
1. Create src/config.ts with exact content above
2. Add comprehensive validation using Zod
3. Test environment variable loading
4. Test CLI option override functionality
5. Verify URL normalization works correctly

### Task 1.10: Basic Logging Setup
**Estimated Time**: 15 minutes

Create src/logging.ts:

```typescript
import pino from 'pino';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function createLogger(level: LogLevel = 'info') {
  return pino({
    level,
    redact: {
      paths: [
        'token',
        'authorization',
        'x-n8n-api-key',
        '*.token',
        '*.authorization',
        '*.password',
        '*.secret',
      ],
      censor: '[REDACTED]',
    },
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      pid: process.pid,
      hostname: undefined, // Remove hostname for cleaner logs
    },
  });
}

export type Logger = ReturnType<typeof createLogger>;
```

**Action Items**:
1. Create src/logging.ts with exact content above
2. Configure pino with proper redaction rules
3. Test that sensitive data is properly redacted
4. Verify log levels work correctly

## Validation Checklist

- [ ] All directories and files created with proper structure
- [ ] package.json has all required dependencies
- [ ] TypeScript configuration compiles successfully
- [ ] Build system (tsup) produces correct output
- [ ] Biome linting and formatting works
- [ ] Git hooks are properly configured
- [ ] CLI accepts all specified options
- [ ] Configuration loading works with env vars and CLI options
- [ ] Logging properly redacts sensitive information
- [ ] All placeholder files export basic structures

## Next Stage
Proceed to Stage 2: HTTP Client Infrastructure once all validation items are complete.
