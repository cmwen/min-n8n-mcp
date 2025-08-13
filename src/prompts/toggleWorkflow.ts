import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { ServerContext } from '../server.js';

const ToggleWorkflowPromptArgsRaw = {
  action: z.string().optional(),
  workflowId: z.string().optional(),
  workflowName: z.string().optional(),
  bulkAction: z.string().optional(),
  tag: z.string().optional(),
};

type ToggleWorkflowPromptArgs = {
  action?: string;
  workflowId?: string;
  workflowName?: string;
  bulkAction?: string;
  tag?: string;
};

/**
 * Register the Toggle Workflow Status prompt
 * Provides easy interface for activating/deactivating workflows
 */
export async function registerToggleWorkflowPrompt(
  server: McpServer,
  context: ServerContext
): Promise<void> {
  server.registerPrompt(
    'toggle-workflow-status',
    {
      title: 'Toggle Workflow Status',
      description:
        'Easily activate, deactivate, or check status of workflows. Supports individual and bulk operations.',
      argsSchema: ToggleWorkflowPromptArgsRaw,
    },
    async (args: ToggleWorkflowPromptArgs): Promise<GetPromptResult> => {
      try {
        context.logger.debug({ args }, 'Managing workflow status');

        let targetWorkflows: any[] = [];

        // Normalize arguments
        const action = args.action || 'status';
        const bulkAction = args.bulkAction === 'true';

        // Find target workflows
        if (args.workflowId) {
          // Specific workflow by ID
          try {
            const workflow = await context.resources.workflows.get(args.workflowId);
            if (workflow) {
              targetWorkflows = [workflow];
            }
          } catch (error) {
            throw new Error(`Workflow with ID ${args.workflowId} not found`);
          }
        } else if (args.workflowName) {
          // Search by name
          const allWorkflows = await context.resources.workflows.list({ limit: 200 });
          targetWorkflows = (allWorkflows.data || []).filter((w: any) =>
            w.name.toLowerCase().includes(args.workflowName!.toLowerCase())
          );
        } else if (bulkAction) {
          // Bulk operation - get all workflows or filtered by tag
          const queryParams: any = { limit: 200 };
          if (args.tag) {
            queryParams.tag = args.tag;
          }

          const allWorkflows = await context.resources.workflows.list(queryParams);
          targetWorkflows = allWorkflows.data || [];
        } else {
          // No specific target - show all workflows status
          const allWorkflows = await context.resources.workflows.list({ limit: 100 });
          targetWorkflows = allWorkflows.data || [];
        }

        if (targetWorkflows.length === 0) {
          throw new Error('No workflows found matching the specified criteria');
        }

        // Build response based on action
        const responseText = await buildToggleResponse(targetWorkflows, args, context);

        return {
          description: `Workflow status management - ${action}`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: buildUserPrompt(args),
              },
            },
            {
              role: 'assistant',
              content: {
                type: 'text',
                text: responseText,
              },
            },
          ],
        };
      } catch (error) {
        context.logger.error({ error, args }, 'Failed to manage workflow status');

        return {
          description: 'Workflow status management (error occurred)',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: 'Help me manage my n8n workflow status.',
              },
            },
            {
              role: 'assistant',
              content: {
                type: 'text',
                text: `I encountered an error while managing workflow status: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your parameters and try again.`,
              },
            },
          ],
        };
      }
    }
  );

  context.logger.debug('Registered toggle-workflow-status prompt');
}

function buildUserPrompt(args: ToggleWorkflowPromptArgs): string {
  let prompt = 'Help me manage my n8n workflow status. ';

  const action = args.action || 'status';
  const bulkAction = args.bulkAction === 'true';

  switch (action) {
    case 'activate':
      prompt += 'I want to activate ';
      break;
    case 'deactivate':
      prompt += 'I want to deactivate ';
      break;
    case 'toggle':
      prompt += 'I want to toggle the status of ';
      break;
    case 'status':
    default:
      prompt += 'I want to check the status of ';
      break;
  }

  if (args.workflowId) {
    prompt += `workflow ${args.workflowId}`;
  } else if (args.workflowName) {
    prompt += `workflows matching "${args.workflowName}"`;
  } else if (bulkAction) {
    prompt += 'multiple workflows';
    if (args.tag) {
      prompt += ` tagged with "${args.tag}"`;
    }
  } else {
    prompt += 'my workflows';
  }

  prompt += '.';
  return prompt;
}

async function buildToggleResponse(
  workflows: any[],
  args: ToggleWorkflowPromptArgs,
  context: ServerContext
): Promise<string> {
  let response = `# 🔄 Workflow Status Management\n\n`;

  // Show current status
  const activeCount = workflows.filter((w) => w.active).length;
  const inactiveCount = workflows.length - activeCount;

  response += `## 📊 Current Status Overview\n`;
  response += `- **Total Workflows**: ${workflows.length}\n`;
  response += `- **Active**: ${activeCount} ✅\n`;
  response += `- **Inactive**: ${inactiveCount} ⏸️\n\n`;

  // Handle different actions
  const action = args.action || 'status';
  switch (action) {
    case 'status':
      response += buildStatusReport(workflows);
      break;

    case 'activate':
      response += await buildActivationPlan(workflows, context, true);
      break;

    case 'deactivate':
      response += await buildActivationPlan(workflows, context, false);
      break;

    case 'toggle':
      response += await buildTogglePlan(workflows, context);
      break;
  }

  // Add useful tools information
  response += `\n## 🛠️ Available Tools\n`;
  response += `- \`activateWorkflow\` - Activate a specific workflow\n`;
  response += `- \`deactivateWorkflow\` - Deactivate a specific workflow\n`;
  response += `- \`listWorkflows\` - List workflows with filters\n`;
  response += `- \`getWorkflow\` - Get detailed workflow information\n`;

  return response;
}

function buildStatusReport(workflows: any[]): string {
  let report = `## 📋 Workflow Status Details\n\n`;

  // Group workflows by status
  const activeWorkflows = workflows.filter((w) => w.active);
  const inactiveWorkflows = workflows.filter((w) => !w.active);

  if (activeWorkflows.length > 0) {
    report += `### ✅ Active Workflows (${activeWorkflows.length})\n`;
    activeWorkflows.forEach((workflow) => {
      report += `- **${workflow.name}** (${workflow.id})`;
      if (workflow.tags?.length) {
        report += ` [${workflow.tags.join(', ')}]`;
      }
      report += `\n`;
    });
    report += `\n`;
  }

  if (inactiveWorkflows.length > 0) {
    report += `### ⏸️ Inactive Workflows (${inactiveWorkflows.length})\n`;
    inactiveWorkflows.forEach((workflow) => {
      report += `- **${workflow.name}** (${workflow.id})`;
      if (workflow.tags?.length) {
        report += ` [${workflow.tags.join(', ')}]`;
      }
      report += `\n`;
    });
    report += `\n`;
  }

  // Recommendations
  report += `### 💡 Recommendations\n`;
  if (inactiveWorkflows.length > activeWorkflows.length) {
    report += `- You have more inactive workflows than active ones. Consider reviewing and activating needed workflows.\n`;
  }
  if (activeWorkflows.length > 10) {
    report += `- You have many active workflows (${activeWorkflows.length}). Monitor system performance and resource usage.\n`;
  }
  if (workflows.length === 0) {
    report += `- No workflows found. Consider creating some automation workflows.\n`;
  }

  return report;
}

async function buildActivationPlan(
  workflows: any[],
  context: ServerContext,
  activate: boolean
): Promise<string> {
  const action = activate ? 'Activation' : 'Deactivation';
  const targetWorkflows = workflows.filter((w) => w.active !== activate);

  let plan = `## 🎯 ${action} Plan\n\n`;

  if (targetWorkflows.length === 0) {
    plan += `All workflows are already ${activate ? 'active' : 'inactive'}. No action needed.\n\n`;
    return plan;
  }

  plan += `**Workflows to ${activate ? 'activate' : 'deactivate'}**: ${targetWorkflows.length}\n\n`;

  // List workflows with considerations
  plan += `### 📝 Workflows to Process\n`;
  targetWorkflows.forEach((workflow, index) => {
    plan += `${index + 1}. **${workflow.name}** (${workflow.id})\n`;

    // Add considerations for activation/deactivation
    if (activate) {
      plan += `   - ⚠️ Ensure credentials are configured and valid\n`;
      plan += `   - 🧪 Consider testing before activation\n`;
    } else {
      plan += `   - 📊 Check if this workflow is currently processing important data\n`;
      plan += `   - 🔗 Verify no other workflows depend on this one\n`;
    }
  });

  // Execution steps
  plan += `\n### 🚀 Execution Steps\n`;

  if (targetWorkflows.length === 1) {
    const workflow = targetWorkflows[0];
    plan += `**Single Workflow ${action}**:\n`;
    plan += `\`\`\`\n`;
    plan += `${activate ? 'activateWorkflow' : 'deactivateWorkflow'}({ id: "${workflow.id}" })\n`;
    plan += `\`\`\`\n`;
  } else {
    plan += `**Bulk ${action}** (execute these commands in sequence):\n`;
    plan += `\`\`\`\n`;
    targetWorkflows.forEach((workflow) => {
      plan += `${activate ? 'activateWorkflow' : 'deactivateWorkflow'}({ id: "${workflow.id}" })\n`;
    });
    plan += `\`\`\`\n`;
  }

  // Warnings and considerations
  plan += `\n### ⚠️ Important Considerations\n`;

  if (activate) {
    plan += `- **Credentials**: Verify all external service credentials are valid\n`;
    plan += `- **Dependencies**: Ensure required services and APIs are accessible\n`;
    plan += `- **Resource Usage**: Monitor system resources after activation\n`;
    plan += `- **Testing**: Test workflows with sample data first if possible\n`;
  } else {
    plan += `- **Data Loss**: Ensure no important data processing will be interrupted\n`;
    plan += `- **Dependencies**: Check if other workflows depend on these\n`;
    plan += `- **Scheduling**: Consider if these workflows are scheduled for important times\n`;
    plan += `- **Notifications**: Update any dependent systems about the deactivation\n`;
  }

  return plan;
}

async function buildTogglePlan(workflows: any[], context: ServerContext): Promise<string> {
  let plan = `## 🔄 Toggle Plan\n\n`;

  const toActivate = workflows.filter((w) => !w.active);
  const toDeactivate = workflows.filter((w) => w.active);

  plan += `**Changes to make**:\n`;
  plan += `- Activate: ${toActivate.length} workflows\n`;
  plan += `- Deactivate: ${toDeactivate.length} workflows\n\n`;

  if (toActivate.length > 0) {
    plan += `### ✅ Workflows to Activate\n`;
    toActivate.forEach((workflow) => {
      plan += `- **${workflow.name}** (${workflow.id})\n`;
    });
    plan += `\n`;
  }

  if (toDeactivate.length > 0) {
    plan += `### ⏸️ Workflows to Deactivate\n`;
    toDeactivate.forEach((workflow) => {
      plan += `- **${workflow.name}** (${workflow.id})\n`;
    });
    plan += `\n`;
  }

  // Execution commands
  plan += `### 🚀 Toggle Commands\n`;
  plan += `\`\`\`\n`;

  toActivate.forEach((workflow) => {
    plan += `activateWorkflow({ id: "${workflow.id}" })\n`;
  });

  toDeactivate.forEach((workflow) => {
    plan += `deactivateWorkflow({ id: "${workflow.id}" })\n`;
  });

  plan += `\`\`\`\n`;

  if (toActivate.length === 0 && toDeactivate.length === 0) {
    plan += `**No changes needed** - all workflows will maintain their current state.\n`;
  }

  return plan;
}
