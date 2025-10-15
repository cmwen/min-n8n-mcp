# Usage Examples

This document provides comprehensive examples of using min-n8n-mcp in various scenarios.

## Table of Contents
- [Basic Setup](#basic-setup)
- [MCP Client Integration](#mcp-client-integration)
- [Common Workflows](#common-workflows)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)

## Basic Setup

### 1. Quick Start with npx

```bash
# Set required environment variables
export N8N_API_URL="http://localhost:5678"
export N8N_API_TOKEN="your-api-token-here"

# Run the MCP server
npx @cmwen/min-n8n-mcp
```

### 2. Using with Claude Desktop (Anthropic)

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": ["@cmwen/min-n8n-mcp"],
      "env": {
        "N8N_API_URL": "http://localhost:5678",
        "N8N_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

Then restart Claude Desktop and use natural language to interact with n8n:
- "List all my workflows"
- "Show me failed executions from the last hour"
- "Activate the workflow named 'Daily Report'"

### 3. Using with Other MCP Clients

For any MCP-compatible client, configure it to run:

```bash
npx @cmwen/min-n8n-mcp
```

With environment variables:
- `N8N_API_URL`: Your n8n instance URL
- `N8N_API_TOKEN`: Your n8n API token

## MCP Client Integration

### Node.js MCP Client Example

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function createN8nClient() {
  // Spawn the MCP server
  const serverProcess = spawn('npx', ['@cmwen/min-n8n-mcp'], {
    env: {
      ...process.env,
      N8N_API_URL: 'http://localhost:5678',
      N8N_API_TOKEN: 'your-api-token-here',
    },
  });

  // Create transport
  const transport = new StdioClientTransport({
    command: serverProcess,
  });

  // Create client
  const client = new Client(
    {
      name: 'n8n-automation-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  // Connect
  await client.connect(transport);

  return client;
}

// Usage
const client = await createN8nClient();

// List available tools
const tools = await client.listTools();
console.log('Available tools:', tools);

// Call a tool
const result = await client.callTool({
  name: 'listWorkflows',
  arguments: {
    query: {
      active: true,
      limit: 10,
    },
  },
});

console.log('Active workflows:', result);
```

### Python MCP Client Example

```python
import asyncio
import os
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    # Set up server parameters
    server_params = StdioServerParameters(
        command="npx",
        args=["@cmwen/min-n8n-mcp"],
        env={
            "N8N_API_URL": "http://localhost:5678",
            "N8N_API_TOKEN": "your-api-token-here"
        }
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize
            await session.initialize()

            # List tools
            tools = await session.list_tools()
            print(f"Available tools: {[t.name for t in tools.tools]}")

            # Call a tool
            result = await session.call_tool(
                "listWorkflows",
                arguments={"query": {"active": True}}
            )
            print(f"Active workflows: {result}")

if __name__ == "__main__":
    asyncio.run(main())
```

## Common Workflows

### Workflow Management

#### List All Workflows

```typescript
// Basic listing
await client.callTool({
  name: 'listWorkflows',
  arguments: {},
});

// Filter active workflows
await client.callTool({
  name: 'listWorkflows',
  arguments: {
    query: {
      active: true,
    },
  },
});

// Filter by tags
await client.callTool({
  name: 'listWorkflows',
  arguments: {
    query: {
      tags: ['production', 'automated'],
    },
  },
});
```

#### Create and Activate a Workflow

```typescript
// Create workflow
const workflow = await client.callTool({
  name: 'createWorkflow',
  arguments: {
    data: {
      name: 'My Automated Workflow',
      nodes: [
        {
          name: 'Start',
          type: 'n8n-nodes-base.start',
          position: [240, 300],
          parameters: {},
        },
        {
          name: 'HTTP Request',
          type: 'n8n-nodes-base.httpRequest',
          position: [460, 300],
          parameters: {
            url: 'https://api.example.com/data',
            method: 'GET',
          },
        },
      ],
      connections: {
        Start: {
          main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
        },
      },
    },
  },
});

// Activate it
await client.callTool({
  name: 'activateWorkflow',
  arguments: {
    id: workflow.id,
  },
});
```

#### Trigger a Workflow

n8n does not expose a general-purpose REST endpoint to start a workflow execution. To run a workflow on demand, invoke the workflow through its configured trigger (for example, send an HTTP request to the workflow’s webhook URL) or start it manually from the n8n UI.

### Execution Management

#### Monitor Execution Status

```typescript
// Get execution details
const execution = await client.callTool({
  name: 'getExecution',
  arguments: {
    id: 'execution-id',
    includeData: true,
  },
});

console.log('Status:', execution.status);
console.log('Started:', execution.startedAt);
console.log('Finished:', execution.stoppedAt);
```

#### List Failed Executions

```typescript
const executions = await client.callTool({
  name: 'listExecutions',
  arguments: {
    query: {
      status: 'error',
      limit: 20,
    },
  },
});

for (const exec of executions.executions) {
  console.log(`${exec.workflowName} - ${exec.startedAt} - ${exec.error}`);
}
```

#### Clean Up Old Executions

```typescript
// List old completed executions
const oldExecutions = await client.callTool({
  name: 'listExecutions',
  arguments: {
    query: {
      status: 'success',
      limit: 100,
    },
  },
});

// Delete executions older than 30 days
const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

for (const exec of oldExecutions.executions) {
  if (new Date(exec.stoppedAt).getTime() < thirtyDaysAgo) {
    await client.callTool({
      name: 'deleteExecution',
      arguments: { id: exec.id },
    });
  }
}
```

### User and Project Management

#### Create a New User

```typescript
const user = await client.callTool({
  name: 'createUser',
  arguments: {
    data: {
      email: 'newuser@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'secure-password-here',
      role: 'global:member',
    },
  },
});
```

#### Create Project and Add Users

```typescript
// Create project
const project = await client.callTool({
  name: 'createProject',
  arguments: {
    data: {
      name: 'Marketing Automation',
      type: 'team',
    },
  },
});

// Add users to project
await client.callTool({
  name: 'addUsersToProject',
  arguments: {
    projectId: project.id,
    users: [
      { id: 'user-id-1', role: 'project:admin' },
      { id: 'user-id-2', role: 'project:editor' },
    ],
  },
});
```

## Advanced Usage

### Operating Modes

min-n8n-mcp supports three operating modes to balance functionality with complexity:

#### Basic Mode (7 Essential Tools)

```bash
# Minimal tool set for simple workflows
MCP_MODE=basic npx @cmwen/min-n8n-mcp
```

Tools: `listWorkflows`, `getWorkflow`, `activateWorkflow`, `deactivateWorkflow`, `listExecutions`, `getExecution`

#### Intermediate Mode (15+ Tools - Default)

```bash
# Balanced tool set for most use cases
MCP_MODE=intermediate npx @cmwen/min-n8n-mcp
```

Adds: workflow CRUD, execution management, credentials, tags

#### Advanced Mode (30+ Tools)

```bash
# Complete API access
MCP_MODE=advanced npx @cmwen/min-n8n-mcp
```

Adds: user management, projects, variables, audit, source control

### HTTP Mode for Debugging

```bash
# Start server in HTTP mode
npx @cmwen/min-n8n-mcp --http --http-port 3000

# Use MCP Inspector to test
npx @modelcontextprotocol/inspector http://localhost:3000
```

### Custom Configuration

```bash
# Full configuration example
N8N_API_URL="https://n8n.example.com" \
N8N_API_TOKEN="your-token" \
LOG_LEVEL="debug" \
HTTP_TIMEOUT_MS="60000" \
HTTP_RETRIES="3" \
CONCURRENCY="8" \
MCP_MODE="advanced" \
npx @cmwen/min-n8n-mcp
```

### Using with Remote n8n Instances

```bash
# Connect to remote n8n with HTTPS
export N8N_API_URL="https://n8n.mycompany.com"
export N8N_API_TOKEN="your-secure-token"

# Increase timeout for slower connections
export HTTP_TIMEOUT_MS="60000"

# Run
npx @cmwen/min-n8n-mcp
```

## Troubleshooting

### Getting Your n8n API Token

1. Open your n8n instance
2. Go to Settings (gear icon)
3. Navigate to "API" section
4. Click "Create API Key"
5. Copy the generated token
6. Set it as `N8N_API_TOKEN` environment variable

### Common Issues

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed troubleshooting guide.

### Debug Mode

Enable debug logging for detailed information:

```bash
LOG_LEVEL=debug npx @cmwen/min-n8n-mcp
```

### Verify Configuration

Print configuration without starting the server:

```bash
N8N_API_URL="http://localhost:5678" \
N8N_API_TOKEN="test" \
npx @cmwen/min-n8n-mcp --print-config
```

## Best Practices

### 1. Security
- Use HTTPS for remote n8n instances
- Store API tokens in secure environment variables
- Never commit API tokens to version control
- Use project-specific credentials where possible

### 2. Performance
- Adjust `CONCURRENCY` based on your n8n instance capacity
- Use pagination for large result sets
- Enable caching for static data (enabled by default)
- Use appropriate operating mode for your needs

### 3. Error Handling
- Implement retry logic in your client code
- Check execution status before processing results
- Monitor failed executions regularly
- Set up alerts for critical workflow failures

### 4. Workflow Organization
- Use tags to organize workflows
- Use descriptive workflow names
- Implement proper project structure
- Document workflow purposes and inputs

## Additional Resources

- [n8n Documentation](https://docs.n8n.io/)
- [MCP Specification](https://modelcontextprotocol.io/)
- [GitHub Repository](https://github.com/cmwen/min-n8n-mcp)
- [Issue Tracker](https://github.com/cmwen/min-n8n-mcp/issues)

## Contributing Examples

Have a useful example? Please contribute!

1. Fork the repository
2. Add your example to this file
3. Submit a pull request

We especially welcome examples for:
- Integration with specific MCP clients
- Complex automation workflows
- Production deployment scenarios
- Custom client implementations
