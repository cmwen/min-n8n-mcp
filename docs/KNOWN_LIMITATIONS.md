# Known Limitations

This document outlines known limitations and missing features in min-n8n-mcp.

## Missing n8n API Endpoints

The following tools are specified in the PRD but are not currently implemented due to missing or undocumented n8n API endpoints:

### Execution Management

#### `stopExecution(id: string)`
**Status:** Not Implemented  
**Reason:** The n8n REST API does not provide a documented endpoint to stop a running execution. The `/executions/{id}` endpoints only support GET and DELETE operations.

**Workaround:** Use the n8n UI to manually stop executions, or implement custom logic using n8n's internal API if available.

**Future:** This tool will be implemented when n8n adds an official API endpoint (e.g., `POST /executions/{id}/stop`).

#### `retryExecution(id: string)`
**Status:** Not Implemented  
**Reason:** The n8n REST API does not provide a documented endpoint to retry a failed execution. While n8n's UI supports this feature, it's not exposed via the REST API.

**Workaround:** 
1. Use `getExecution(id)` to retrieve the execution details
2. Extract the input data from the failed execution
3. Use `runWorkflow(workflowId, inputData)` to create a new execution with the same inputs

**Future:** This tool will be implemented when n8n adds an official API endpoint (e.g., `POST /executions/{id}/retry`).

### Workflow Statistics

#### `getWorkflowStats(id: string)` - Partially Implemented
**Status:** Implemented with client-side aggregation  
**Details:** This tool is implemented but calculates statistics by fetching and aggregating execution data client-side, as n8n doesn't provide a dedicated statistics endpoint.

**Current Implementation:**
- Fetches recent executions for the workflow
- Calculates success/failure rates
- Provides execution timing statistics

**Limitation:** 
- Statistics are based on available execution history (limited by pagination)
- May not reflect complete historical data for workflows with many executions
- Performance impact for workflows with large execution history

**Future:** This could be improved if n8n adds a dedicated statistics API endpoint.

## API Coverage

### Implemented Tools: 30+
- ✅ Workflow Management (12 tools)
- ✅ Execution Management (3 tools) - Missing stop/retry
- ✅ Credential Management (4 tools)
- ✅ User Management (5 tools)
- ✅ Project Management (7 tools)
- ✅ Tag Management (5 tools)
- ✅ Variable Management (4 tools)
- ✅ Audit Tools (1 tool)
- ✅ Source Control (1 tool)

### Coverage: ~95%
The implementation covers approximately 95% of the tools specified in the PRD, with the noted exceptions above.

## n8n Version Compatibility

**Tested With:** n8n v1.0.0+

**Note:** Some features may require specific n8n versions:
- Source Control: Requires n8n license and git integration enabled
- Audit: May require enterprise features
- Projects: Available in n8n v1.0.0+

## Performance Considerations

### Rate Limiting
- Default: 4 concurrent requests
- Configurable via `CONCURRENCY` environment variable or `--concurrency` flag
- Adjust based on your n8n instance capacity

### Pagination
- Large result sets are paginated automatically
- Default page size: varies by endpoint (typically 20-100 items)
- Use `autoPaginate` option with caution for very large datasets

### Caching
- Credential type schemas are cached (60s TTL)
- Tag lists are cached (60s TTL)
- No caching for dynamic data (workflows, executions)

## Security Considerations

### API Token Security
- API tokens are loaded from environment variables only
- Tokens are automatically redacted from all logs
- Never logged in plain text

### HTTPS Recommendation
- Use HTTPS URLs for remote n8n instances
- HTTP is acceptable for local development only

### Credential Management
- This tool can create/delete credentials but cannot view credential values
- Sensitive credential data is never logged
- Follow n8n's security best practices for credential management

## Reporting Issues

If you encounter limitations not documented here, please:

1. Check the [n8n API documentation](https://docs.n8n.io/api/)
2. Search [existing issues](https://github.com/cmwen/min-n8n-mcp/issues)
3. [Create a new issue](https://github.com/cmwen/min-n8n-mcp/issues/new) with:
   - n8n version
   - min-n8n-mcp version
   - Detailed description of the limitation
   - Expected vs actual behavior

## Contributing

We welcome contributions to address these limitations! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

If you have access to n8n's internal APIs or documentation that could help implement missing features, please reach out or submit a PR.
