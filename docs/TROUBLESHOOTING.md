# Troubleshooting Guide

This guide helps you resolve common issues when using min-n8n-mcp.

## Table of Contents
- [Connection Issues](#connection-issues)
- [Authentication Issues](#authentication-issues)
- [Configuration Issues](#configuration-issues)
- [Runtime Errors](#runtime-errors)
- [Performance Issues](#performance-issues)
- [MCP Client Integration Issues](#mcp-client-integration-issues)
- [Getting Help](#getting-help)

## Connection Issues

### Error: "Cannot connect to n8n API"

**Symptoms:**
```
Failed to connect to n8n API
Error: Cannot connect to n8n API at http://localhost:5678/api/v1
```

**Possible Causes & Solutions:**

#### 1. n8n is not running
```bash
# Check if n8n is running
curl http://localhost:5678/healthz

# If not running, start n8n
npx n8n
# or
docker start n8n-container-name
```

#### 2. Wrong URL
```bash
# Verify your n8n URL (should NOT include /api/v1)
export N8N_API_URL="http://localhost:5678"  # ✅ Correct
# NOT: http://localhost:5678/api/v1        # ❌ Wrong (added automatically)

# Test the URL
curl http://localhost:5678/healthz
```

#### 3. Firewall or network issues
```bash
# Check if port is accessible
nc -zv localhost 5678

# For remote n8n instances
nc -zv your-n8n-host.com 443

# Check firewall rules
# macOS: System Preferences > Security & Privacy > Firewall
# Linux: sudo ufw status
```

#### 4. Docker networking issues
If n8n is in Docker and min-n8n-mcp is on host:
```bash
# Use host.docker.internal instead of localhost
export N8N_API_URL="http://host.docker.internal:5678"

# Or use Docker network
# If both are in Docker, use container name
export N8N_API_URL="http://n8n-container:5678"
```

### Error: "ECONNREFUSED" or "Network request failed"

**Solution:**
1. Verify n8n is accessible:
   ```bash
   curl -v http://localhost:5678/api/v1/workflows
   ```

2. Check DNS resolution (for remote instances):
   ```bash
   nslookup your-n8n-host.com
   ping your-n8n-host.com
   ```

3. Increase timeout for slow connections:
   ```bash
   export HTTP_TIMEOUT_MS="60000"  # 60 seconds
   ```

### SSL/TLS Certificate Issues

**Symptoms:**
```
Error: unable to verify the first certificate
```

**Solution:**
```bash
# For self-signed certificates (development only!)
export NODE_TLS_REJECT_UNAUTHORIZED="0"  # ⚠️ NOT for production!

# Better: Add certificate to system trust store
# macOS: Keychain Access > Import certificate
# Linux: sudo cp cert.crt /usr/local/share/ca-certificates/
#        sudo update-ca-certificates
```

## Authentication Issues

### Error: "Unauthorized" or "Invalid API token"

**Symptoms:**
```
Error: Unauthorized (401)
Error: Invalid API key
```

**Solutions:**

#### 1. Verify API token is correct
```bash
# Test token directly with curl
curl -X GET \
  http://localhost:5678/api/v1/workflows \
  -H "X-N8N-API-KEY: your-token-here"

# Should return workflows list, not 401 error
```

#### 2. Check token format
```bash
# Token should be set without quotes or extra spaces
export N8N_API_TOKEN="your-token-here"  # ✅ Correct
# NOT: N8N_API_TOKEN=" your-token-here " # ❌ Extra spaces
# NOT: N8N_API_TOKEN='your-token-here'   # Single quotes may cause issues
```

#### 3. Generate new API token
1. Open n8n UI
2. Go to Settings > API
3. Delete old token
4. Create new API key
5. Copy and use new token

#### 4. Check token permissions
Ensure the API token has necessary permissions:
- Basic operations: workflow read/write
- User management: admin permissions
- Projects: appropriate project access

### Error: "Forbidden" (403)

**Symptoms:**
```
Error: Forbidden (403)
You don't have permission to access this resource
```

**Solutions:**

1. **Check user role:**
   - Global admin for user/project management
   - Project member for project-specific operations
   - Workflow owner for workflow modifications

2. **Check project access:**
   ```typescript
   // Verify user has access to the project
   await client.callTool({
     name: 'listProjects',
     arguments: {},
   });
   ```

3. **Check n8n license:**
   - Some features require n8n enterprise license
   - Source control requires git integration
   - Audit features may be enterprise-only

## Configuration Issues

### Error: "Configuration validation failed"

**Symptoms:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Configuration validation failed:

❌ n8nApiUrl: Invalid n8n API URL
   Set via: N8N_API_URL environment variable or --url CLI flag
   Example: export N8N_API_URL="http://localhost:5678"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Solutions:**

#### Missing N8N_API_URL
```bash
# Set the environment variable
export N8N_API_URL="http://localhost:5678"

# Or use CLI flag
npx @cmwen/min-n8n-mcp --url "http://localhost:5678"

# Verify it's set
echo $N8N_API_URL
```

#### Missing N8N_API_TOKEN
```bash
# Set the environment variable
export N8N_API_TOKEN="your-api-token-here"

# Or use CLI flag
npx @cmwen/min-n8n-mcp --token "your-api-token-here"

# Verify it's set (will show [REDACTED] in logs)
npx @cmwen/min-n8n-mcp --print-config
```

#### Invalid URL format
```bash
# URL must be valid HTTP/HTTPS URL
export N8N_API_URL="http://localhost:5678"   # ✅ Valid
# NOT: localhost:5678                        # ❌ Missing protocol
# NOT: http://localhost:5678/api/v1          # ❌ Don't include /api/v1
```

### Environment Variables Not Loading

**Issue:** Environment variables set but not recognized

**Solutions:**

1. **Check shell export:**
   ```bash
   # Verify variable is exported
   env | grep N8N_API_URL
   
   # Must use 'export' keyword
   export N8N_API_URL="..."  # ✅ Correct
   # NOT: N8N_API_URL="..."  # ❌ Not exported
   ```

2. **Check .env file (if using):**
   ```bash
   # Create .env file
   cat > .env << EOF
   N8N_API_URL=http://localhost:5678
   N8N_API_TOKEN=your-token-here
   EOF
   
   # Load it before running
   export $(cat .env | xargs)
   npx @cmwen/min-n8n-mcp
   ```

3. **Check shell session:**
   ```bash
   # Variables don't persist between shell sessions
   # Add to ~/.bashrc or ~/.zshrc for persistence
   echo 'export N8N_API_URL="http://localhost:5678"' >> ~/.bashrc
   source ~/.bashrc
   ```

## Runtime Errors

### Error: "keyValidator._parse is not a function"

**Status:** Fixed in latest version

**Solution:**
```bash
# Update to latest version
npm install -g @cmwen/min-n8n-mcp@latest

# Or with npx (always uses latest)
npx @cmwen/min-n8n-mcp@latest
```

### Error: "Tool 'xyz' not found"

**Possible Causes:**

1. **Wrong operating mode:**
   ```bash
   # Some tools only available in advanced mode
   MCP_MODE=advanced npx @cmwen/min-n8n-mcp
   
   # Check available tools
   # Use MCP Inspector or call listTools
   ```

2. **Tool name typo:**
   ```typescript
   // Correct tool names (case-sensitive):
   'listWorkflows'  // ✅ Correct
   'ListWorkflows'  // ❌ Wrong case
   'list_workflows' // ❌ Wrong format
   ```

### Error: "Timeout" or "Request took too long"

**Solutions:**

1. **Increase timeout:**
   ```bash
   # Default is 30 seconds, increase for slow operations
   export HTTP_TIMEOUT_MS="120000"  # 2 minutes
   ```

2. **Check n8n performance:**
   ```bash
   # Test n8n API response time
   time curl http://localhost:5678/api/v1/workflows
   ```

3. **Reduce concurrent requests:**
   ```bash
   # Lower concurrency if n8n is overloaded
   export CONCURRENCY="2"
   ```

### Memory Issues or Crashes

**Solutions:**

1. **Increase Node.js memory limit:**
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npx @cmwen/min-n8n-mcp
   ```

2. **Reduce pagination size:**
   ```typescript
   // Fetch smaller pages
   await client.callTool({
     name: 'listWorkflows',
     arguments: {
       query: { limit: 20 },  // Instead of 100
     },
   });
   ```

3. **Disable auto-pagination for large datasets:**
   ```typescript
   await client.callTool({
     name: 'listExecutions',
     arguments: {
       query: {
         limit: 50,
         autoPaginate: false,  // Don't fetch all pages
       },
     },
   });
   ```

## Performance Issues

### Slow Response Times

**Diagnosis:**
```bash
# Enable debug logging to see timing
LOG_LEVEL=debug npx @cmwen/min-n8n-mcp
```

**Solutions:**

1. **Network latency (remote n8n):**
   - Use n8n instance closer to your location
   - Increase timeout: `HTTP_TIMEOUT_MS="60000"`
   - Reduce concurrent requests: `CONCURRENCY="2"`

2. **Large result sets:**
   - Use pagination with smaller limits
   - Apply filters to reduce data volume
   - Use intermediate or basic mode for less data

3. **n8n instance overloaded:**
   - Check n8n resource usage
   - Increase n8n instance resources
   - Reduce concurrent requests from MCP server

### High CPU Usage

**Solutions:**

1. **Reduce concurrency:**
   ```bash
   export CONCURRENCY="2"  # Default is 4
   ```

2. **Use basic mode:**
   ```bash
   # Fewer tools = less overhead
   export MCP_MODE="basic"
   ```

3. **Check for loops:**
   - Ensure client code isn't in infinite loop
   - Add rate limiting in client code

## MCP Client Integration Issues

### Claude Desktop Not Showing Tools

**Checklist:**

1. **Verify configuration file location:**
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. **Check JSON syntax:**
   ```bash
   # Validate JSON
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq .
   ```

3. **Verify environment variables in config:**
   ```json
   {
     "mcpServers": {
       "n8n": {
         "command": "npx",
         "args": ["@cmwen/min-n8n-mcp"],
         "env": {
           "N8N_API_URL": "http://localhost:5678",
           "N8N_API_TOKEN": "your-actual-token-here"
         }
       }
     }
   }
   ```

4. **Restart Claude Desktop completely:**
   - Quit Claude Desktop (Cmd+Q on macOS)
   - Wait 5 seconds
   - Reopen Claude Desktop

5. **Check logs:**
   ```bash
   # Check system logs for errors
   # macOS:
   log stream --predicate 'process == "Claude"' --level debug
   ```

### Custom MCP Client Connection Issues

**Debugging steps:**

1. **Test server manually first:**
   ```bash
   # Start in HTTP mode
   npx @cmwen/min-n8n-mcp --http --http-port 3000
   
   # Test with MCP Inspector
   npx @modelcontextprotocol/inspector http://localhost:3000
   ```

2. **Check STDIO transport:**
   ```typescript
   // Ensure process spawning is correct
   const serverProcess = spawn('npx', ['@cmwen/min-n8n-mcp'], {
     stdio: ['pipe', 'pipe', 'inherit'],  // Important!
     env: {
       ...process.env,
       N8N_API_URL: 'http://localhost:5678',
       N8N_API_TOKEN: 'your-token',
     },
   });
   ```

3. **Check for stderr output:**
   ```typescript
   serverProcess.stderr?.on('data', (data) => {
     console.error('Server error:', data.toString());
   });
   ```

## Getting Help

### Enable Debug Mode

```bash
# Full debug output
LOG_LEVEL=debug npx @cmwen/min-n8n-mcp 2>&1 | tee debug.log
```

### Check Version

```bash
npx @cmwen/min-n8n-mcp --version
```

### Verify Installation

```bash
# Test configuration
N8N_API_URL="http://localhost:5678" \
N8N_API_TOKEN="test" \
npx @cmwen/min-n8n-mcp --print-config
```

### Report Issues

When reporting issues, include:

1. **Version information:**
   ```bash
   npx @cmwen/min-n8n-mcp --version
   node --version
   ```

2. **Configuration (with redacted token):**
   ```bash
   npx @cmwen/min-n8n-mcp --print-config
   ```

3. **Debug logs:**
   ```bash
   LOG_LEVEL=debug npx @cmwen/min-n8n-mcp 2>&1 | tee debug.log
   ```

4. **Environment:**
   - Operating system and version
   - n8n version and deployment type (Docker, npm, etc.)
   - MCP client being used

5. **Steps to reproduce:**
   - Exact commands run
   - Expected vs actual behavior
   - Error messages (full text)

### Community Resources

- **GitHub Issues:** https://github.com/cmwen/min-n8n-mcp/issues
- **GitHub Discussions:** https://github.com/cmwen/min-n8n-mcp/discussions
- **n8n Community:** https://community.n8n.io/
- **MCP Documentation:** https://modelcontextprotocol.io/

### Quick Reference

```bash
# Most common fix: restart with fresh config
export N8N_API_URL="http://localhost:5678"
export N8N_API_TOKEN="your-new-token"
npx @cmwen/min-n8n-mcp --print-config  # Verify
npx @cmwen/min-n8n-mcp                 # Run
```

## Preventive Measures

### Before Deployment

- [ ] Test connection to n8n instance
- [ ] Verify API token has correct permissions
- [ ] Test basic operations (list workflows, run workflow)
- [ ] Set appropriate timeout and concurrency values
- [ ] Enable debug logging initially
- [ ] Document your configuration

### Regular Maintenance

- [ ] Monitor log files for errors
- [ ] Update to latest version regularly
- [ ] Review n8n API changes with n8n updates
- [ ] Clean up old executions periodically
- [ ] Rotate API tokens periodically

### Production Checklist

- [ ] Use HTTPS for remote n8n instances
- [ ] Store tokens securely (environment variables, secrets manager)
- [ ] Set up monitoring and alerts
- [ ] Configure appropriate timeouts
- [ ] Test failover scenarios
- [ ] Document troubleshooting procedures for your team
