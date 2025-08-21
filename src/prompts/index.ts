import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ServerContext } from '../server.js';
import { registerCreateWorkflowPrompt } from './createWorkflow.js';
import { registerDailyDashboardPrompt } from './dailyDashboard.js';
import { registerIssuesPrompt } from './issues.js';
import { registerToggleWorkflowPrompt } from './toggleWorkflow.js';

/**
 * Register all prompts with the MCP server
 */
export async function registerAllPrompts(server: McpServer, context: ServerContext): Promise<void> {
  // Register daily dashboard prompt
  await registerDailyDashboardPrompt(server, context);

  // Register issues analysis prompt
  await registerIssuesPrompt(server, context);

  // Register create workflow from existing prompt
  await registerCreateWorkflowPrompt(server, context);

  // Register toggle workflow status prompt
  await registerToggleWorkflowPrompt(server, context);

  context.logger.info(
    {
      promptCount: 4,
      prompts: [
        'daily-dashboard',
        'analyze-issues',
        'create-workflow-from-existing',
        'toggle-workflow-status',
      ],
    },
    'MCP prompts registered'
  );
}
