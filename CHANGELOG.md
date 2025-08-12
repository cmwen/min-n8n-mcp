# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Default Mode Changed**: Changed default operating mode from 'advanced' to 'intermediate'
  - Provides a better balance of functionality vs. simplicity for most use cases
  - Intermediate mode includes workflow management, executions, credentials, and tags (~15 tools)
  - Advanced mode remains available for full API access
  - Basic mode available for minimal tool exposure (7 tools)

### Fixed
- **Critical MCP Tool Validation Fix**: Fixed `keyValidator._parse is not a function` error in MCP tool registration
  - Changed `inputSchema` parameter from JSON schemas to Zod raw shapes using `.shape` property
  - Updated `ToolRegistry.setupMcpHandlers()` to use `ToolInputSchemas[toolName].shape` format
  - Updated `createTool()` function to use proper Zod shape format
  - This fix resolves the validation error that prevented all tools from working with MCP SDK v1.17.2

### Changed
- Improved error handling in tool registration with proper MCP SDK compatibility
- Enhanced tool validation using native Zod shape validation instead of JSON schema conversion

### Technical Details
- **Root Cause**: MCP SDK expects `ZodRawShape` format for input validation, but code was providing JSON schemas
- **Solution**: Use `ToolInputSchemas[toolName].shape` directly for `inputSchema` parameter
- **Impact**: All MCP tools now work correctly with proper input validation

## [0.1.0] - 2025-08-11

### Added
- Initial release of min-n8n-mcp
- **MCP Server Implementation**: Complete Model Context Protocol server for n8n API integration
- **Dual Mode Operation**: Support for both STDIO (default) and HTTP modes
- **Comprehensive Tool Coverage**: 30+ tools covering all major n8n operations:
  - Workflow management (list, get, create, update, delete, activate, deactivate, execute)
  - Execution management (list, get, delete, stop, retry)
  - Credential management (list, get, create, update, delete)
  - User management (list, get, create, delete, change roles)
  - Project management (list, create, update, delete, user management)
  - Variable management (list, get, create, update, delete)
  - Tag management (list, get, create, update, delete)
  - Audit and source control operations

### Infrastructure
- **TypeScript Implementation**: Full type safety with strict mode enabled
- **Build System**: tsup-based build with ESM output targeting Node.js 18+
- **Package Manager**: pnpm for efficient dependency management
- **Code Quality**: Biome for linting and formatting (replaces ESLint/Prettier)
- **Git Hooks**: Husky pre-commit hooks for quality assurance

### HTTP Client Infrastructure
- **Robust Error Handling**: Comprehensive HTTP error mapping to MCP errors
- **Retry Logic**: Exponential backoff for transient failures
- **Rate Limiting**: Bottleneck-based concurrency control
- **Timeout Protection**: Configurable request timeouts
- **Security**: Automatic API token redaction in logs

### Configuration System
- **Environment Variables**: Support for all n8n connection and behavior settings
- **CLI Arguments**: Override any environment variable via command line
- **Validation**: Zod-based configuration validation with helpful error messages
- **Flexible Setup**: Zero-config operation with sensible defaults

### Resource Clients
- **n8n API Coverage**: Complete implementation of n8n REST API endpoints
- **Type Safety**: Full TypeScript interfaces for all API operations
- **Error Handling**: Proper error mapping and context preservation
- **Pagination**: Automatic pagination support for list operations

### Development Experience
- **MCP Inspector Support**: HTTP mode compatible with MCP Inspector for debugging
- **Comprehensive Logging**: Structured logging with pino, including performance metrics
- **Debug Mode**: Detailed logging and configuration inspection
- **Development Scripts**: Hot reload development environment

### Documentation
- **Complete README**: Comprehensive setup and usage documentation
- **Technical Documentation**: Detailed architecture and implementation guides
- **API Reference**: Full tool specification and examples
- **Implementation Roadmap**: Staged development approach documentation

### Testing Infrastructure
- **Vitest Configuration**: Modern testing framework setup
- **Test Categories**: Unit, integration, and end-to-end test organization
- **Mock Infrastructure**: n8n API mocking for testing without real instances
- **Quality Assurance**: Automated testing in development workflow

### Security Features
- **Token Security**: Environment-only API token loading
- **Secret Redaction**: Automatic credential redaction in logs and errors
- **HTTPS Support**: Full support for secure n8n connections
- **Minimal Permissions**: Follow principle of least privilege

### Performance Features
- **Connection Pooling**: Efficient HTTP client with keep-alive
- **Concurrent Request Control**: Configurable concurrency limits
- **Caching Infrastructure**: TTL cache for low-volatility data
- **Resource Management**: Proper cleanup and resource management

## Development History

This project was developed in stages following a structured implementation roadmap:

1. **Foundation Setup** - CLI, configuration, build tooling
2. **HTTP Client Infrastructure** - Robust networking layer
3. **MCP Server Core** - Model Context Protocol implementation
4. **Resource Clients** - n8n API integration
5. **Tool Implementation** - MCP tool development
6. **Testing & Quality Assurance** - Comprehensive testing
7. **Documentation & Release** - Production readiness

## Breaking Changes

None in this initial release.

## Migration Guide

This is the initial release, no migration needed.

## Known Issues

None at this time. Please report issues at: https://github.com/cmwen/min-n8n-mcp/issues

## Contributors

- @cmwen - Initial implementation and architecture
