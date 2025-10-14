# @cmwen/min-n8n-mcp

> Local n8n MCP (Model Context Protocol) server that provides AI agents programmatic access to n8n workflows via REST API.

[![npm version](https://badge.fury.io/js/@cmwen%2Fmin-n8n-mcp.svg)](https://www.npmjs.com/package/@cmwen/min-n8n-mcp)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

**@cmwen/min-n8n-mcp** is a TypeScript-based MCP server that exposes n8n workflow management capabilities as callable tools for AI agents and LLMs. It acts as a thin, typed proxy to your n8n instance's REST API, enabling programmatic workflow automation through the Model Context Protocol.

### Key Features

- 🤖 **MCP Integration**: Full support for Model Context Protocol with tool discovery and schema validation
- 🔄 **Dual Mode Operation**: Both STDIO (default) and HTTP modes for different use cases
- 🛡️ **Robust Error Handling**: Comprehensive error mapping, retries, and timeouts
- 📊 **Complete n8n API Coverage**: Workflows, executions, credentials, users, projects, and more
- 🎯 **Type Safety**: Full TypeScript support with Zod schema validation
- 🚀 **Zero Configuration**: Works out of the box with minimal setup
- 🔍 **MCP Inspector Compatible**: HTTP mode supports MCP Inspector for debugging

## Quick Start

### Installation

```bash
# Run directly with npx (recommended)
npx @cmwen/min-n8n-mcp

# Or install globally
npm install -g @cmwen/min-n8n-mcp
min-n8n-mcp
```

### Prerequisites

- **Node.js**: >=18.0.0 (uses built-in fetch)
- **n8n Instance**: Local or remote n8n server with API access
- **API Token**: n8n API key for authentication ([How to get your API token](docs/TROUBLESHOOTING.md#getting-your-n8n-api-token))

### Basic Usage

**⚠️ Important:** Both `N8N_API_URL` and `N8N_API_TOKEN` are required. The server will fail immediately with helpful error messages if either is missing.

1. **Set Environment Variables**:
```bash
export N8N_API_URL="http://localhost:5678"  # Your n8n instance URL
export N8N_API_TOKEN="your-api-token-here"  # Your n8n API token
```

2. **Start in STDIO Mode** (default, for agent integration):
```bash
npx @cmwen/min-n8n-mcp
```

3. **Start in HTTP Mode** (for MCP Inspector/debugging):
```bash
npx @cmwen/min-n8n-mcp --http --http-port 3000
```

### Quick Validation

```bash
# Verify configuration (token will be redacted in output)
N8N_API_URL="http://localhost:5678" \
N8N_API_TOKEN="your-token" \
npx @cmwen/min-n8n-mcp --print-config
```

## Communication Modes

### STDIO Mode (Default)
- **Use Case**: Agent/LLM integration, CLI usage
- **Protocol**: Standard input/output streams
- **Best For**: Production environments, automated workflows

### HTTP Mode
- **Use Case**: Development, debugging, MCP Inspector compatibility
- **Protocol**: HTTP endpoint (localhost:port)
- **Best For**: Testing, visual debugging with MCP Inspector

## Operating Modes

The MCP server offers three operating modes to balance functionality with performance, reducing LLM confusion and data verbosity:

### Intermediate Mode (Default)
- **Tools**: 15+ essential tools covering workflow management, executions, credentials, and tags
- **Data Filtering**: Returns streamlined data with metadata but excludes verbose node/connection definitions
- **Best For**: Most use cases requiring workflow automation with manageable tool count

### Basic Mode
- **Tools**: 7 essential tools for simple workflow operations (list, get, run, activate/deactivate)
- **Data Filtering**: Returns only essential fields (ID, name, status, tags) reducing payload by ~50%
- **Best For**: Simple workflow management with minimal tool exposure

### Advanced Mode
- **Tools**: Complete API access with 30+ tools covering all n8n operations
- **Data Filtering**: No filtering - returns complete data unchanged
- **Best For**: Complex automation requiring full n8n API capabilities

### Usage Examples

```bash
# Use default intermediate mode
npx @cmwen/min-n8n-mcp

# Specify mode explicitly
npx @cmwen/min-n8n-mcp --mode basic
npx @cmwen/min-n8n-mcp --mode intermediate
npx @cmwen/min-n8n-mcp --mode advanced

# Via environment variable
MCP_MODE=basic npx @cmwen/min-n8n-mcp
```

## Available Tools

The MCP server exposes comprehensive n8n management capabilities through the following tool categories:

### Workflow Management
- `listWorkflows` - List all workflows with filtering
- `getWorkflow` - Get workflow details by ID
- `createWorkflow` - Create new workflows
- `updateWorkflow` - Update existing workflows
- `deleteWorkflow` - Delete workflows
- `activateWorkflow` - Activate workflows
- `deactivateWorkflow` - Deactivate workflows
- `getWorkflowTags` - Get workflow tags
- `updateWorkflowTags` - Update workflow tags
- `transferWorkflow` - Transfer workflows between projects

### Execution Management
- `listExecutions` - List workflow executions
- `getExecution` - Get execution details
- `deleteExecution` - Delete executions

### Credential Management
- `createCredential` - Create new credentials
- `deleteCredential` - Delete credentials
- `getCredentialType` - Get credential type schemas
- `transferCredential` - Transfer credentials between projects

### User & Project Management
- `listUsers` - List users
- `createUser` - Create new users
- `getUser` - Get user details
- `deleteUser` - Delete users
- `changeUserRole` - Change user roles
- `listProjects` - List projects
- `createProject` - Create new projects
- `updateProject` - Update projects
- `deleteProject` - Delete projects
- `addUsersToProject` - Add users to projects
- `deleteUserFromProject` - Remove users from projects
- `changeUserRoleInProject` - Change user roles in projects

### Tag & Variable Management
- `createTag` - Create tags
- `listTags` - List tags
- `getTag` - Get tag details
- `updateTag` - Update tags
- `deleteTag` - Delete tags
- `createVariable` - Create variables
- `listVariables` - List variables
- `updateVariable` - Update variables
- `deleteVariable` - Delete variables

### Advanced Features
- `generateAudit` - Generate audit reports
- `pullSourceControl` - Pull from source control

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `N8N_API_URL` | n8n instance URL | - | ✅ |
| `N8N_API_TOKEN` | n8n API token | - | ✅ |
| `MCP_MODE` | Operating mode (basic\|intermediate\|advanced) | `intermediate` | ❌ |
| `LOG_LEVEL` | Logging level | `info` | ❌ |
| `HTTP_TIMEOUT_MS` | Request timeout | `30000` | ❌ |
| `HTTP_RETRIES` | Retry attempts | `2` | ❌ |
| `CONCURRENCY` | Concurrent requests | `4` | ❌ |

### CLI Options

```bash
Options:
  --url <string>           n8n API URL (overrides N8N_API_URL)
  --token <string>         n8n API token (overrides N8N_API_TOKEN)
  --mode <mode>            Tool exposure mode (basic|intermediate|advanced, default: intermediate)
  --http                   Enable HTTP mode
  --http-port <number>     HTTP mode port (default: 3000)
  --log-level <level>      Log level (debug|info|warn|error)
  --timeout <ms>           HTTP timeout in milliseconds
  --retries <number>       Number of retry attempts
  --concurrency <number>   Maximum concurrent requests
  --print-config           Print configuration and exit
  -h, --help               Display help
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/cmwen/min-n8n-mcp.git
cd min-n8n-mcp

# Install pnpm globally (required)
npm install -g pnpm

# Install dependencies (takes ~2.5 minutes on first run)
pnpm install

# Build the project
pnpm build
```

### Development Commands

```bash
# Run in development mode
pnpm dev

# Run with configuration check
N8N_API_URL=http://localhost:5678 N8N_API_TOKEN=test pnpm dev --print-config

# Type checking
pnpm type-check

# Linting and formatting
pnpm lint
pnpm lint:fix

# Testing
pnpm test
```

### Project Structure

```
src/
├── cli.ts              # CLI entry point
├── server.ts           # MCP server bootstrap
├── config.ts           # Configuration management
├── logging.ts          # Structured logging
├── http/               # HTTP client infrastructure
├── resources/          # n8n API resource clients
├── tools/              # MCP tool implementations
├── schemas/            # Zod validation schemas
└── util/               # Utilities (pagination, cache)
```

## Error Handling

The server includes comprehensive error handling with:

- **HTTP Error Mapping**: 400/401/403/404/409/5xx → appropriate MCP errors
- **Retry Logic**: Exponential backoff for transient failures
- **Timeout Protection**: Configurable request timeouts
- **Secret Redaction**: API tokens automatically redacted from logs
- **Detailed Error Context**: Full error details available for debugging

## Security

- API tokens loaded from environment only (never persisted)
- Automatic secret redaction in logs and error messages
- HTTPS recommended for remote n8n instances
- Request/response body logging disabled by default for credential endpoints

## Testing

```bash
# Run all tests
pnpm test

# Run specific test categories
pnpm test:unit           # Unit tests
pnpm test:integration    # Integration tests
pnpm test:e2e           # End-to-end tests
```

## Performance

- **Concurrent Request Limiting**: Prevents resource exhaustion
- **Intelligent Caching**: TTL cache for low-volatility data
- **Pagination Support**: Auto-pagination options available
- **Connection Pooling**: Efficient HTTP client with keep-alive

## Troubleshooting

### Common Issues

1. **Configuration validation failed**
   - Ensure both `N8N_API_URL` and `N8N_API_TOKEN` are set
   - The server provides detailed error messages with setup instructions
   - See [Troubleshooting Guide](docs/TROUBLESHOOTING.md#configuration-issues)

2. **"Cannot connect to n8n API"**
   - Verify n8n is running and accessible: `curl http://localhost:5678/healthz`
   - Check firewall/network settings
   - See [Troubleshooting Guide](docs/TROUBLESHOOTING.md#connection-issues)

3. **"pnpm not found"** (development only)
   ```bash
   npm install -g pnpm
   ```

4. **"Unauthorized" or "Invalid API token"**
   - Verify API token is correct
   - Generate new token in n8n Settings > API
   - See [Troubleshooting Guide](docs/TROUBLESHOOTING.md#authentication-issues)

5. **"keyValidator._parse is not a function"**
   - This was a known issue that has been fixed
   - Update to latest version: `npx @cmwen/min-n8n-mcp@latest`

For comprehensive troubleshooting, see **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)**.

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npx @cmwen/min-n8n-mcp

# Print configuration without starting server
npx @cmwen/min-n8n-mcp --print-config
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pnpm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

For a deeper walkthrough of project structure, workflows, and expectations, read the [Repository Guidelines](AGENTS.md).

### Development Guidelines

- Follow TypeScript strict mode
- Use Biome for linting/formatting (configured in `biome.json`)
- Add tests for new features
- Update documentation as needed
- Follow conventional commit format

## Implementation Status

This project follows a staged implementation approach:

- ✅ **Stage 1**: Foundation Setup (CLI, config, build tooling)
- ✅ **Stage 2**: HTTP Client Infrastructure
- ✅ **Stage 3**: MCP Server Core
- ✅ **Stage 4**: Resource Clients
- ✅ **Stage 5**: Tool Implementation
- ✅ **Stage 6**: Critical Bug Fixes (MCP tool validation)
- 🚧 **Stage 7**: Testing & Quality Assurance
- ⏳ **Stage 8**: Documentation & Release

**Recent Update**: Fixed critical MCP tool validation issue that prevented tools from working with MCP SDK v1.17.2.

See [Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md) for detailed progress.

## API Documentation

For detailed information, see:
- **[Usage Examples](docs/EXAMPLES.md)** - Comprehensive examples for all use cases
- **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** - Solve common issues
- **[Known Limitations](docs/KNOWN_LIMITATIONS.md)** - API coverage and missing features
- **[Technical Design](docs/TECHNICAL_DESIGN.md)** - Architecture and implementation details
- **[Product Requirements](docs/PRD.md)** - Complete tool specifications
- **[OpenAPI Specification](docs/openapi.yml)** - n8n API reference

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 **Documentation**: Check the [docs](docs/) directory
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/cmwen/min-n8n-mcp/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/cmwen/min-n8n-mcp/discussions)
- 📧 **Contact**: [Create an issue](https://github.com/cmwen/min-n8n-mcp/issues/new)

## Related Projects

- [n8n](https://n8n.io/) - Workflow automation platform
- [Model Context Protocol](https://modelcontextprotocol.io/) - Protocol for AI agent tool integration
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector) - Tool for debugging MCP servers
