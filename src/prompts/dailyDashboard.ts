import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import type { ServerContext } from '../server.js';

/**
 * Register the Daily Dashboard prompt
 * Summarizes active workflows, execution results, and provides actionable insights
 */
export async function registerDailyDashboardPrompt(
  server: McpServer,
  context: ServerContext
): Promise<void> {
  server.registerPrompt(
    'daily-dashboard',
    {
      title: 'Daily Dashboard',
      description:
        'Generate a comprehensive dashboard summary of your n8n instance including active workflows, recent executions, and recommended actions.',
    },
    async (): Promise<GetPromptResult> => {
      try {
        context.logger.debug('Generating daily dashboard summary');

        // Get active workflows
        const activeWorkflows = await context.resources.workflows.list({
          active: true,
          limit: 50,
        });

        // Get recent executions (last 24 hours)
        const recentExecutions = await context.resources.executions.list({
          limit: 100,
        });

        // Calculate execution statistics
        const executionStats = {
          total: recentExecutions.data?.length || 0,
          successful: 0,
          failed: 0,
          running: 0,
          waiting: 0,
        };

        recentExecutions.data?.forEach((execution: any) => {
          const status = execution.status || 'unknown';
          switch (status) {
            case 'success':
              executionStats.successful++;
              break;
            case 'error':
            case 'failed':
              executionStats.failed++;
              break;
            case 'running':
              executionStats.running++;
              break;
            case 'waiting':
              executionStats.waiting++;
              break;
          }
        });

        // Build dashboard summary
        const dashboardText = buildDashboardSummary(
          activeWorkflows.data || [],
          executionStats,
          recentExecutions.data || []
        );

        return {
          description: 'Daily dashboard summary for your n8n instance',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: 'Please provide me with a daily dashboard summary of my n8n workflows and executions. Include active workflows, execution statistics, and any recommendations for maintenance or improvements.',
              },
            },
            {
              role: 'assistant',
              content: {
                type: 'text',
                text: dashboardText,
              },
            },
          ],
        };
      } catch (error) {
        context.logger.error({ error }, 'Failed to generate daily dashboard');

        return {
          description: 'Daily dashboard summary (error occurred)',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: 'Please provide me with a daily dashboard summary of my n8n workflows and executions.',
              },
            },
            {
              role: 'assistant',
              content: {
                type: 'text',
                text: `I encountered an error while generating your daily dashboard: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your n8n connection and try again.`,
              },
            },
          ],
        };
      }
    }
  );

  context.logger.debug('Registered daily-dashboard prompt');
}

function buildDashboardSummary(
  activeWorkflows: any[],
  executionStats: any,
  recentExecutions: any[]
): string {
  const totalWorkflows = activeWorkflows.length;
  const failureRate =
    executionStats.total > 0 ? Math.round((executionStats.failed / executionStats.total) * 100) : 0;

  let summary = `# 📊 Daily n8n Dashboard Summary\n\n`;

  // Workflow Overview
  summary += `## 🔄 Active Workflows (${totalWorkflows})\n`;
  if (totalWorkflows > 0) {
    activeWorkflows.slice(0, 10).forEach((workflow) => {
      summary += `- **${workflow.name}** (ID: ${workflow.id})${workflow.tags?.length ? ` [${workflow.tags.join(', ')}]` : ''}\n`;
    });
    if (totalWorkflows > 10) {
      summary += `- ... and ${totalWorkflows - 10} more workflows\n`;
    }
  } else {
    summary += `No active workflows found.\n`;
  }

  // Execution Statistics
  summary += `\n## 📈 Recent Execution Statistics\n`;
  summary += `- **Total Executions**: ${executionStats.total}\n`;
  summary += `- **Successful**: ${executionStats.successful} ✅\n`;
  summary += `- **Failed**: ${executionStats.failed} ❌\n`;
  summary += `- **Running**: ${executionStats.running} 🔄\n`;
  summary += `- **Waiting**: ${executionStats.waiting} ⏳\n`;
  summary += `- **Failure Rate**: ${failureRate}%\n`;

  // Recommendations
  summary += `\n## 💡 Recommendations\n`;

  if (failureRate > 20) {
    summary += `- ⚠️ **High failure rate detected (${failureRate}%)** - Review failed executions and check for common issues\n`;
  }

  if (executionStats.failed > 0) {
    summary += `- 🔍 **${executionStats.failed} failed executions** - Investigate recent failures for patterns\n`;
  }

  if (totalWorkflows === 0) {
    summary += `- 🚀 **No active workflows** - Consider activating workflows or creating new automation\n`;
  }

  if (executionStats.running > 5) {
    summary += `- ⚡ **Many workflows running simultaneously (${executionStats.running})** - Monitor system resources\n`;
  }

  // Recent Failed Executions (if any)
  const failedExecutions = recentExecutions
    .filter((exec: any) => exec.status === 'error' || exec.status === 'failed')
    .slice(0, 5);

  if (failedExecutions.length > 0) {
    summary += `\n## ❌ Recent Failed Executions\n`;
    failedExecutions.forEach((execution: any) => {
      summary += `- **${execution.workflowData?.name || 'Unknown'}** (${execution.id}) - ${execution.stoppedAt ? new Date(execution.stoppedAt).toLocaleString() : 'Time unknown'}\n`;
    });
  }

  // Actions Suggestion
  summary += `\n## 🎯 Suggested Actions\n`;
  summary += `1. **Review failed executions** - Use the "analyze-issues" prompt to get detailed failure analysis\n`;
  summary += `2. **Check credentials** - Verify that all service credentials are up to date\n`;
  summary += `3. **Monitor performance** - Ensure workflows are completing in reasonable time\n`;
  summary += `4. **Update workflows** - Consider updating any outdated workflow configurations\n`;

  return summary;
}
