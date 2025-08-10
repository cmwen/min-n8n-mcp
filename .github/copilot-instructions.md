# min-n8n-mcp: Local n8n MCP Server

Local n8n MCP (Model Context Protocol) server that provides AI agents programmatic access to n8n workflows via REST API. Built with TypeScript, uses MCP SDK to expose n8n operations as callable tools.

**ALWAYS reference these instructions first** and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Essential Setup Commands (Required Before Any Work)
```bash
# Install pnpm globally (REQUIRED - this project does NOT use npm)
npm install -g pnpm

# Install dependencies - First time: ~2.5 minutes, with lockfile: ~1.5 minutes. NEVER CANCEL - Set timeout to 300+ seconds
time pnpm install

# Build the project - takes ~4 seconds
time pnpm build

# Verify all tooling works
pnpm type-check  # Takes ~2 seconds
pnpm lint        # Takes <1 second
```

### Development Commands
```bash
# Run in development mode with TypeScript
pnpm dev

# Run built version
node dist/cli.js

# Run via npx (after building)
npx --yes min-n8n-mcp@file:.
```

### Required Environment Variables
The application **REQUIRES** these environment variables to run:
```bash
N8N_API_URL=http://localhost:5678    # Will auto-append /api/v1 if not present
N8N_API_TOKEN=your-token-here        # Required - fails immediately without this
```

### Testing Configuration and Functionality
```bash
# Test configuration parsing (safe - does not connect to n8n)
N8N_API_URL=http://localhost:5678 N8N_API_TOKEN=dummy pnpm dev --print-config

# Test CLI help
pnpm dev --help
node dist/cli.js --help
```

### Build and Quality Assurance Commands
```bash
# Full pre-commit workflow (runs automatically via Husky)
pnpm lint:fix    # Biome auto-fix - takes <1 second
pnpm type-check  # TypeScript validation - takes ~2 seconds

# Build for production
pnpm build       # Takes ~4 seconds, creates dist/ directory

# Test packaging
npm pack --dry-run  # Shows what would be published to npm
```

## Validation Scenarios

**CRITICAL**: Always test actual functionality after making changes. Simply starting and stopping the application is NOT sufficient validation.

### Basic Functionality Test
```bash
# Test CLI argument parsing
N8N_API_URL=http://localhost:5678 N8N_API_TOKEN=test pnpm dev --print-config

# Expected output: JSON config with normalized URL ending in /api/v1
```

### Full Application Test
```bash
# Start server (will run indefinitely until interrupted)
N8N_API_URL=http://localhost:5678 N8N_API_TOKEN=test pnpm dev

# Should output:
# {"level":"info","time":"...","pid":...,"msg":"Creating MCP server with config"}
# {"level":"info","time":"...","pid":...,"msg":"Starting MCP server in STDIO mode"}
```

### HTTP Mode Test
```bash
# Test HTTP mode (for MCP Inspector compatibility)
N8N_API_URL=http://localhost:5678 N8N_API_TOKEN=test pnpm dev --http --http-port 3000
```

## Critical Timing and Timeout Information

**NEVER CANCEL BUILDS OR LONG-RUNNING COMMANDS**

- `pnpm install`: Takes **2.5 minutes** - Set timeout to **300+ seconds**
- `pnpm build`: Takes **4 seconds** - Set timeout to **60+ seconds** 
- `pnpm type-check`: Takes **2 seconds** - Set timeout to **30+ seconds**
- `pnpm lint`: Takes **<1 second** - Set timeout to **30+ seconds**
- `pnpm test`: Currently **no tests exist** - exits immediately with "No test files found"

## Project Structure and Navigation

### Key Source Files
```
src/
├── cli.ts          # CLI entry point and command parsing
├── server.ts       # MCP server creation (TODO: incomplete)
├── config.ts       # Environment/CLI configuration with Zod validation
├── logging.ts      # Pino logger with secret redaction
├── http/           # HTTP client infrastructure (planned)
├── resources/      # n8n API resource clients (planned)
├── tools/          # MCP tool implementations (planned)
├── schemas/        # Zod schemas for validation (planned)
└── util/           # Utilities like pagination, cache (planned)
```

### Configuration Files
- `package.json`: pnpm scripts, dependencies, Node.js >=18 requirement
- `tsconfig.json`: TypeScript configuration with strict mode
- `tsup.config.ts`: Build configuration (ESM output, Node 18 target)
- `biome.json`: Linting/formatting rules (replaces ESLint/Prettier)
- `.husky/pre-commit`: Runs `pnpm lint:fix` and `pnpm type-check`

### Important Documentation
- `docs/PRD.md`: Product requirements and MCP tool definitions
- `docs/TECHNICAL_DESIGN.md`: Architecture and implementation details
- `docs/IMPLEMENTATION_ROADMAP.md`: Development stages
- `docs/STAGE_*.md`: Detailed implementation tasks

## Technology Stack Requirements

**CRITICAL**: This project has specific tooling requirements:

- **Node.js**: >=18.0.0 (uses built-in fetch)
- **Package Manager**: **pnpm** (NOT npm) - must install globally first
- **Linter/Formatter**: **Biome** (NOT ESLint/Prettier)
- **Build Tool**: **tsup** (NOT webpack/rollup)
- **Test Framework**: **Vitest** (NOT Jest) - but no tests currently exist
- **Type System**: TypeScript with strict mode enabled

### Dependencies
- **MCP SDK**: `@modelcontextprotocol/sdk` for Model Context Protocol
- **CLI**: `commander` for command-line interface
- **Validation**: `zod` for schema validation and JSON Schema generation
- **HTTP**: `undici` for enhanced fetch capabilities
- **Logging**: `pino` with built-in secret redaction
- **Rate Limiting**: `bottleneck` for concurrency control

## Development Workflow

### Before Making Changes
1. **ALWAYS** run `pnpm install` after cloning (if pnpm not found, install it first)
2. **ALWAYS** run `pnpm build` to verify current state
3. **ALWAYS** run `pnpm lint` and `pnpm type-check` to verify quality

### During Development
1. Use `pnpm dev` for live TypeScript execution
2. Use `pnpm lint:fix` frequently to maintain code style
3. Test configuration changes with `--print-config` flag

### Before Committing
The pre-commit hook automatically runs:
- `pnpm lint:fix` (auto-fixes style issues)
- `pnpm type-check` (validates TypeScript)

If these fail, the commit is rejected.

### Testing Changes
- **No unit tests exist yet** - the project is in early development
- Test CLI functionality manually with various arguments
- Verify build produces expected `dist/` artifacts
- Test both `pnpm dev` and built `node dist/cli.js` execution paths

## Common Issues and Solutions

### "pnpm not found"
```bash
npm install -g pnpm
```

### "Configuration validation failed"
Provide required environment variables:
```bash
N8N_API_URL=http://localhost:5678 N8N_API_TOKEN=test
```

### Build Failures
Check TypeScript errors with:
```bash
pnpm type-check
```

### Linting Issues
Auto-fix most issues with:
```bash
pnpm lint:fix
```

## Current Implementation Status

**IMPORTANT**: This project is in early development. The core structure exists but many features are TODO:

- ✅ CLI argument parsing and configuration
- ✅ Environment variable handling with validation
- ✅ Basic project structure and build pipeline
- ✅ Logging infrastructure with secret redaction
- 🚧 MCP server implementation (basic structure only)
- ❌ HTTP client with retry/rate limiting
- ❌ n8n API resource clients
- ❌ MCP tool implementations
- ❌ Test suite

## Frequently Used Commands Reference

```bash
# Project setup (first time)
npm install -g pnpm && pnpm install

# Development workflow
pnpm dev                    # Run in development
pnpm build                  # Build for production
pnpm lint:fix               # Fix code style
pnpm type-check             # Validate TypeScript

# Testing functionality  
N8N_API_URL=http://localhost:5678 N8N_API_TOKEN=test pnpm dev --print-config
N8N_API_URL=http://localhost:5678 N8N_API_TOKEN=test pnpm dev --help

# Package inspection
npm pack --dry-run          # See what would be published
```

## Repository Root Contents
```
├── .github/               # GitHub configuration and workflows
├── .husky/               # Git hooks (pre-commit)
├── docs/                 # Comprehensive project documentation
├── src/                  # TypeScript source code
├── dist/                 # Built JavaScript output (git-ignored)
├── node_modules/         # Dependencies (git-ignored)
├── package.json          # pnpm configuration and scripts
├── pnpm-lock.yaml        # Dependency lock file
├── tsconfig.json         # TypeScript configuration
├── tsup.config.ts        # Build configuration
├── biome.json            # Linting/formatting configuration
└── README.md             # Basic project description
```