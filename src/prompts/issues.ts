import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { ServerContext } from '../server.js';

const IssuesPromptArgsRaw = {
  timeframe: z.string().optional(),
  workflowId: z.string().optional(),
  includeSuccessful: z.string().optional(),
};

type IssuesPromptArgs = {
  timeframe?: string;
  workflowId?: string;
  includeSuccessful?: string;
};

/**
 * Register the Issues Analysis prompt
 * Finds and analyzes failed executions, summarizes issues, and provides suggestions
 */
export async function registerIssuesPrompt(
  server: McpServer,
  context: ServerContext
): Promise<void> {
  server.registerPrompt(
    'analyze-issues',
    {
      title: 'Analyze Issues',
      description:
        'Find and analyze failed workflow executions, identify patterns, and get suggestions for resolution.',
      argsSchema: IssuesPromptArgsRaw,
    },
    async (args: IssuesPromptArgs): Promise<GetPromptResult> => {
      try {
        context.logger.debug({ args }, 'Analyzing workflow issues');

        // Build query parameters for executions
        const queryParams: any = {
          limit: 100,
          includeData: true, // We need execution data to analyze errors
        };

        if (args.workflowId) {
          queryParams.workflowId = args.workflowId;
        }

        // Get executions
        const executionsResponse = await context.resources.executions.list(queryParams);

        const executions = executionsResponse.data || [];

        // Filter executions based on timeframe and status
        const timeframeCutoff = getTimeframeCutoff(args.timeframe || '24hours');
        const includeSuccessful = args.includeSuccessful === 'true';
        const filteredExecutions = executions.filter((execution: any) => {
          // Filter by time
          const executionTime = new Date(execution.startedAt || execution.createdAt);
          if (executionTime < timeframeCutoff) return false;

          // Filter by status
          if (includeSuccessful) {
            return true; // Include all statuses
          }
          // Only failed/error executions
          return execution.status === 'error' || execution.status === 'failed';
        });

        // Analyze issues
        const analysis = analyzeExecutionIssues(filteredExecutions);

        // Get workflow information for context
        const workflowIds = [...new Set(filteredExecutions.map((ex: any) => ex.workflowId))];
        const workflows = await Promise.all(
          workflowIds.slice(0, 10).map(async (id: string) => {
            try {
              const workflow = await context.resources.workflows.get(id);
              return workflow;
            } catch (_error) {
              return null;
            }
          })
        );

        const validWorkflows = workflows.filter(Boolean);

        // Build analysis report
        const analysisText = buildIssuesAnalysis(
          filteredExecutions,
          analysis,
          validWorkflows,
          args.timeframe || '24hours',
          args.workflowId
        );

        return {
          description: `Issue analysis for ${args.timeframe || '24hours'} timeframe`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Please analyze my n8n workflow issues and failures${args.workflowId ? ` for workflow ${args.workflowId}` : ''} in the last ${(args.timeframe || '24hours').replace(/(\d+)/, '$1 ')}. Provide a summary of problems and suggestions for resolution.`,
              },
            },
            {
              role: 'assistant',
              content: {
                type: 'text',
                text: analysisText,
              },
            },
          ],
        };
      } catch (error) {
        context.logger.error({ error, args }, 'Failed to analyze issues');

        return {
          description: 'Issue analysis (error occurred)',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: 'Please analyze my n8n workflow issues and failures.',
              },
            },
            {
              role: 'assistant',
              content: {
                type: 'text',
                text: `I encountered an error while analyzing your workflow issues: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your n8n connection and try again.`,
              },
            },
          ],
        };
      }
    }
  );

  context.logger.debug('Registered analyze-issues prompt');
}

function getTimeframeCutoff(timeframe: string): Date {
  const now = new Date();
  switch (timeframe) {
    case '1hour':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '24hours':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7days':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30days':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

function analyzeExecutionIssues(executions: any[]) {
  const failedExecutions = executions.filter(
    (ex) => ex.status === 'error' || ex.status === 'failed'
  );

  // Group by workflow
  const workflowFailures: { [key: string]: any[] } = {};
  const errorPatterns: { [key: string]: number } = {};
  const nodeFailures: { [key: string]: number } = {};

  for (const execution of failedExecutions) {
    const workflowId = execution.workflowId;
    if (!workflowFailures[workflowId]) {
      workflowFailures[workflowId] = [];
    }
    workflowFailures[workflowId].push(execution);

    // Analyze error messages and patterns
    if (execution.data?.resultData?.error) {
      const errorMsg = execution.data.resultData.error.message || 'Unknown error';
      // Extract key error patterns
      const errorKey = extractErrorPattern(errorMsg);
      errorPatterns[errorKey] = (errorPatterns[errorKey] || 0) + 1;
    }

    // Track node failures
    if (execution.data?.resultData?.lastNodeExecuted) {
      const nodeName = execution.data.resultData.lastNodeExecuted;
      nodeFailures[nodeName] = (nodeFailures[nodeName] || 0) + 1;
    }
  }

  return {
    totalExecutions: executions.length,
    failedExecutions: failedExecutions.length,
    workflowFailures,
    errorPatterns,
    nodeFailures,
    failureRate:
      executions.length > 0 ? Math.round((failedExecutions.length / executions.length) * 100) : 0,
  };
}

function extractErrorPattern(errorMessage: string): string {
  const message = errorMessage.toLowerCase();

  // Common error patterns
  if (message.includes('connection') || message.includes('timeout'))
    return 'Connection/Timeout Issues';
  if (
    message.includes('authentication') ||
    message.includes('unauthorized') ||
    message.includes('401')
  )
    return 'Authentication Errors';
  if (message.includes('not found') || message.includes('404')) return 'Resource Not Found';
  if (message.includes('rate limit') || message.includes('429')) return 'Rate Limiting';
  if (message.includes('permission') || message.includes('forbidden') || message.includes('403'))
    return 'Permission Errors';
  if (message.includes('syntax') || message.includes('parse')) return 'Data Format/Syntax Errors';
  if (message.includes('required') || message.includes('missing')) return 'Missing Required Data';
  if (message.includes('quota') || message.includes('limit exceeded'))
    return 'Quota/Limit Exceeded';

  // Return first 50 chars as pattern if no common pattern found
  return errorMessage.substring(0, 50) + (errorMessage.length > 50 ? '...' : '');
}

function buildIssuesAnalysis(
  executions: any[],
  analysis: any,
  workflows: any[],
  timeframe: string,
  workflowId?: string
): string {
  let report = '# 🔍 Issue Analysis Report\n\n';

  // Summary
  report += `## 📊 Summary (${timeframe.replace(/(\d+)/, '$1 ')})\n`;
  report += `- **Total Executions**: ${analysis.totalExecutions}\n`;
  report += `- **Failed Executions**: ${analysis.failedExecutions}\n`;
  report += `- **Failure Rate**: ${analysis.failureRate}%\n`;

  if (workflowId) {
    report += `- **Workflow Filter**: ${workflowId}\n`;
  }

  if (analysis.failedExecutions === 0) {
    report += '\n🎉 **Great news!** No failed executions found in the specified timeframe.\n';
    return report;
  }

  // Most problematic workflows
  report += '\n## 🚨 Most Problematic Workflows\n';
  const workflowFailureCounts = Object.entries(analysis.workflowFailures)
    .map(([id, failures]: [string, any]) => ({ id, count: failures.length, failures }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  for (const { id, count, failures } of workflowFailureCounts) {
    const workflow = workflows.find((w) => w?.id === id);
    const workflowName = workflow?.name || 'Unknown Workflow';
    report += `- **${workflowName}** (${id}): ${count} failures\n`;

    // Show latest failure time
    const latestFailure = failures.sort(
      (a: any, b: any) =>
        new Date(b.stoppedAt || b.startedAt).getTime() -
        new Date(a.stoppedAt || a.startedAt).getTime()
    )[0];

    if (latestFailure) {
      const failTime = new Date(
        latestFailure.stoppedAt || latestFailure.startedAt
      ).toLocaleString();
      report += `  - Latest failure: ${failTime}\n`;
    }
  }

  // Common error patterns
  report += '\n## 🐛 Common Error Patterns\n';
  const topErrors = Object.entries(analysis.errorPatterns)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5);

  if (topErrors.length > 0) {
    for (const [pattern, count] of topErrors) {
      report += `- **${pattern}**: ${count} occurrences\n`;
    }
  } else {
    report += 'No specific error patterns identified.\n';
  }

  // Node failure analysis
  report += '\n## 🔧 Nodes with Most Failures\n';
  const topFailingNodes = Object.entries(analysis.nodeFailures)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5);

  if (topFailingNodes.length > 0) {
    for (const [nodeName, count] of topFailingNodes) {
      report += `- **${nodeName}**: ${count} failures\n`;
    }
  } else {
    report += 'No specific node failure data available.\n';
  }

  // Recommendations
  report += '\n## 💡 Recommended Actions\n';

  if (analysis.failureRate > 50) {
    report += '1. **Critical**: Over 50% failure rate - immediate investigation required\n';
  }

  // Specific recommendations based on error patterns
  for (const [pattern, count] of topErrors) {
    if (pattern.includes('Authentication')) {
      report += `2. **Update Credentials**: ${count} authentication errors detected - check and refresh API keys/credentials\n`;
    } else if (pattern.includes('Connection')) {
      report += `2. **Network Issues**: ${count} connection errors - verify network connectivity and endpoint availability\n`;
    } else if (pattern.includes('Rate Limit')) {
      report += `2. **Rate Limiting**: ${count} rate limit errors - implement delays or reduce execution frequency\n`;
    } else if (pattern.includes('Permission')) {
      report += `2. **Permissions**: ${count} permission errors - verify account permissions and access rights\n`;
    }
  }

  // General recommendations
  report += '3. **Monitor Trends**: Set up notifications for critical workflows\n';
  report += '4. **Error Handling**: Add error handling and retry logic to workflows\n';
  report += '5. **Testing**: Test workflows in isolation to identify root causes\n';

  // Recent failures details
  if (analysis.failedExecutions > 0) {
    report += '\n## 📋 Recent Failure Details\n';
    const recentFailures = executions
      .filter((ex) => ex.status === 'error' || ex.status === 'failed')
      .sort(
        (a, b) =>
          new Date(b.stoppedAt || b.startedAt).getTime() -
          new Date(a.stoppedAt || a.startedAt).getTime()
      )
      .slice(0, 3);

    for (const execution of recentFailures) {
      const workflow = workflows.find((w) => w?.id === execution.workflowId);
      const workflowName = workflow?.name || 'Unknown Workflow';
      const failTime = new Date(execution.stoppedAt || execution.startedAt).toLocaleString();

      report += `\n### ${workflowName} (${execution.id})\n`;
      report += `- **Time**: ${failTime}\n`;
      report += `- **Duration**: ${execution.runningTime || 'Unknown'}ms\n`;

      if (execution.data?.resultData?.error?.message) {
        report += `- **Error**: ${execution.data.resultData.error.message}\n`;
      }

      if (execution.data?.resultData?.lastNodeExecuted) {
        report += `- **Failed Node**: ${execution.data.resultData.lastNodeExecuted}\n`;
      }
    }
  }

  return report;
}
