import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { ServerContext } from '../server.js';

const CreateWorkflowPromptArgsRaw = {
  sourceWorkflowId: z.string(),
  newWorkflowName: z.string().optional(),
  description: z.string().optional(),
  copyTags: z.string().optional(),
};

type CreateWorkflowPromptArgs = {
  sourceWorkflowId: string;
  newWorkflowName?: string;
  description?: string;
  copyTags?: string;
};

/**
 * Register the Create Workflow from Existing prompt
 * Helps create new workflows based on existing ones with modifications
 */
export async function registerCreateWorkflowPrompt(
  server: McpServer,
  context: ServerContext
): Promise<void> {
  server.registerPrompt(
    'create-workflow-from-existing',
    {
      title: 'Create Workflow from Existing',
      description:
        'Create a new workflow based on an existing one with modifications. Provides guidance and example code.',
      argsSchema: CreateWorkflowPromptArgsRaw,
    },
    async (args: CreateWorkflowPromptArgs): Promise<GetPromptResult> => {
      try {
        context.logger.debug({ args }, 'Creating workflow from existing template');

        // Get the source workflow
        const sourceWorkflow = await context.resources.workflows.get(args.sourceWorkflowId);

        if (!sourceWorkflow) {
          throw new Error(`Workflow with ID ${args.sourceWorkflowId} not found`);
        }

        // Get workflow tags if copying them
        let sourceTags: any[] = [];
        const copyTags = args.copyTags !== 'false'; // default to true unless explicitly false
        if (copyTags) {
          try {
            const tagsResponse = await context.resources.workflows.getTags(args.sourceWorkflowId);
            sourceTags = tagsResponse || [];
          } catch (error) {
            context.logger.debug({ error }, 'Could not fetch workflow tags');
          }
        }

        // Build the creation guidance
        const guidanceText = buildWorkflowCreationGuidance(sourceWorkflow, sourceTags, args);

        return {
          description: `Guidance for creating workflow based on ${sourceWorkflow.name}`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `I want to create a new n8n workflow based on an existing one (${args.sourceWorkflowId}). ${args.newWorkflowName ? `The new workflow should be called "${args.newWorkflowName}". ` : ''}${args.description ? `Here's what I want it to do differently: ${args.description}` : 'Please help me understand the structure and suggest modifications.'}`,
              },
            },
            {
              role: 'assistant',
              content: {
                type: 'text',
                text: guidanceText,
              },
            },
          ],
        };
      } catch (error) {
        context.logger.error({ error, args }, 'Failed to analyze source workflow');

        return {
          description: 'Workflow creation guidance (error occurred)',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: 'I want to create a new n8n workflow based on an existing one.',
              },
            },
            {
              role: 'assistant',
              content: {
                type: 'text',
                text: `I encountered an error while analyzing the source workflow: ${error instanceof Error ? error.message : 'Unknown error'}. Please verify the workflow ID and try again.`,
              },
            },
          ],
        };
      }
    }
  );

  context.logger.debug('Registered create-workflow-from-existing prompt');
}

function buildWorkflowCreationGuidance(
  sourceWorkflow: any,
  sourceTags: any[],
  args: CreateWorkflowPromptArgs
): string {
  let guidance = '# 🚀 Create New Workflow from Template\n\n';

  // Get copyTags value once at the start
  const copyTags = args.copyTags !== 'false'; // default to true unless explicitly false

  // Source workflow information
  guidance += '## 📋 Source Workflow Analysis\n';
  guidance += `**Name**: ${sourceWorkflow.name}\n`;
  guidance += `**ID**: ${sourceWorkflow.id}\n`;
  guidance += `**Active**: ${sourceWorkflow.active ? 'Yes' : 'No'}\n`;

  if (sourceWorkflow.tags?.length) {
    guidance += `**Tags**: ${sourceWorkflow.tags.join(', ')}\n`;
  }

  if (sourceTags.length > 0) {
    guidance += `**Applied Tags**: ${sourceTags.map((tag: any) => tag.name).join(', ')}\n`;
  }

  // Analyze workflow structure
  const nodes = sourceWorkflow.nodes || [];

  guidance += `**Nodes**: ${nodes.length} total\n`;

  // Categorize nodes
  const triggerNodes = nodes.filter(
    (node: any) => node.type?.includes('trigger') || node.type?.includes('Trigger')
  );
  const actionNodes = nodes.filter(
    (node: any) => !node.type?.includes('trigger') && !node.type?.includes('Trigger')
  );

  guidance += `- Trigger nodes: ${triggerNodes.length}\n`;
  guidance += `- Action nodes: ${actionNodes.length}\n`;

  // List key nodes
  guidance += '\n### 🔗 Key Nodes\n';

  if (triggerNodes.length > 0) {
    guidance += '**Triggers**:\n';
    for (const node of triggerNodes) {
      guidance += `- ${node.name} (${node.type})\n`;
    }
  }

  if (actionNodes.length > 0) {
    guidance += '\n**Actions** (showing first 5):\n';
    for (const node of actionNodes.slice(0, 5)) {
      guidance += `- ${node.name} (${node.type})\n`;
    }

    if (actionNodes.length > 5) {
      guidance += `- ... and ${actionNodes.length - 5} more nodes\n`;
    }
  }

  // Workflow pattern analysis
  guidance += '\n### 🔍 Workflow Pattern\n';
  const pattern = analyzeWorkflowPattern(triggerNodes, actionNodes);
  guidance += pattern;

  // Creation guidance
  guidance += '\n## 🛠️ Creation Steps\n';

  const newWorkflowName = args.newWorkflowName || `${sourceWorkflow.name} (Copy)`;

  guidance += '### 1. Create Base Workflow\n';
  guidance += `I'll help you create a workflow called **"${newWorkflowName}"** based on the source template.\n\n`;

  guidance += '### 2. Workflow Structure to Copy\n';
  guidance += 'The source workflow follows this pattern:\n';
  guidance += '```\n';
  guidance += `${generateWorkflowStructure(triggerNodes, actionNodes)}\n`;
  guidance += '```\n\n';

  // Modification suggestions
  if (args.description) {
    guidance += '### 3. Requested Modifications\n';
    guidance += `Based on your description: "${args.description}"\n\n`;
    guidance += generateModificationSuggestions(args.description, sourceWorkflow);
  }

  // Configuration guidance
  guidance += `### ${args.description ? '4' : '3'}. Configuration Considerations\n`;
  guidance += `- **Credentials**: You'll need to configure credentials for any external services\n`;
  guidance += '- **Parameters**: Review and update node parameters for your specific use case\n';
  guidance += '- **Error Handling**: Consider adding error handling nodes if not present\n';
  guidance += '- **Testing**: Test the workflow in inactive mode before activating\n';

  // Tags
  if (copyTags && sourceTags.length > 0) {
    guidance += `- **Tags**: The following tags will be copied: ${sourceTags.map((tag: any) => tag.name).join(', ')}\n`;
  }

  // Next steps
  guidance += '\n## 🎯 Next Steps\n';
  guidance += '1. Use the `createWorkflow` tool to create the base workflow\n';
  guidance += '2. Configure node credentials and parameters\n';
  guidance += '3. Test the workflow with sample data\n';
  guidance += '4. Apply tags and set up scheduling if needed\n';
  guidance += '5. Activate the workflow when ready\n';

  // Example JSON structure
  guidance += '\n## 📝 Example Workflow JSON Structure\n';
  guidance += `Here's a simplified structure you can use as a starting point:\n\n`;
  guidance += '```json\n';
  guidance += JSON.stringify(
    {
      name: newWorkflowName,
      active: false,
      nodes: nodes.slice(0, 2).map((node: any) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        position: node.position,
        parameters: '// Configure parameters here',
      })),
      connections: '// Copy and adjust connections from source',
      tags: copyTags ? sourceTags.map((tag: any) => tag.name) : [],
    },
    null,
    2
  );
  guidance += '\n```\n';

  // Tools to use
  guidance += '\n## 🔧 Relevant Tools\n';
  guidance += '- `createWorkflow` - Create the new workflow\n';
  guidance += '- `getWorkflow` - Get detailed source workflow structure\n';
  guidance += '- `updateWorkflowTags` - Apply tags to the new workflow\n';
  guidance += '- `activateWorkflow` - Activate when ready\n';

  return guidance;
}

function analyzeWorkflowPattern(triggerNodes: any[], actionNodes: any[]): string {
  if (triggerNodes.length === 0) {
    return 'This appears to be a manually triggered workflow or sub-workflow.';
  }

  const triggerTypes = triggerNodes.map((node: any) => node.type);
  const hasWebhook = triggerTypes.some((type) => type.toLowerCase().includes('webhook'));
  const hasSchedule = triggerTypes.some(
    (type) => type.toLowerCase().includes('schedule') || type.toLowerCase().includes('cron')
  );
  const hasManual = triggerTypes.some((type) => type.toLowerCase().includes('manual'));

  let pattern = '';
  if (hasWebhook) {
    pattern += 'Webhook-triggered workflow - responds to external HTTP requests. ';
  }
  if (hasSchedule) {
    pattern += 'Scheduled workflow - runs on a time-based schedule. ';
  }
  if (hasManual) {
    pattern += 'Manually triggered workflow - started by user action. ';
  }

  // Analyze action patterns
  const serviceTypes = new Set();
  for (const node of actionNodes) {
    const nodeType = node.type?.toLowerCase() || '';
    if (nodeType.includes('gmail') || nodeType.includes('email')) serviceTypes.add('Email');
    if (nodeType.includes('slack') || nodeType.includes('discord')) serviceTypes.add('Chat');
    if (nodeType.includes('http') || nodeType.includes('webhook')) serviceTypes.add('HTTP/API');
    if (
      nodeType.includes('database') ||
      nodeType.includes('mysql') ||
      nodeType.includes('postgres')
    )
      serviceTypes.add('Database');
    if (nodeType.includes('file') || nodeType.includes('spreadsheet')) serviceTypes.add('Files');
  }

  if (serviceTypes.size > 0) {
    pattern += `\nIntegrates with: ${Array.from(serviceTypes).join(', ')}`;
  }

  return pattern || 'Standard workflow pattern.';
}

function generateWorkflowStructure(triggerNodes: any[], actionNodes: any[]): string {
  let structure = '';

  if (triggerNodes.length > 0) {
    structure += 'TRIGGERS:\n';
    for (const node of triggerNodes) {
      structure += `  → ${node.name} (${node.type})\n`;
    }
    structure += '\n';
  }

  structure += 'FLOW:\n';
  if (actionNodes.length > 0) {
    actionNodes.forEach((node: any, index: number) => {
      structure += `  ${index + 1}. ${node.name} (${node.type})\n`;
    });
  } else {
    structure += '  (No action nodes)\n';
  }

  return structure;
}

function generateModificationSuggestions(description: string, _sourceWorkflow: any): string {
  const desc = description.toLowerCase();
  let suggestions = '';

  if (desc.includes('email') || desc.includes('notification')) {
    suggestions += '- Consider adding email notification nodes\n';
  }

  if (desc.includes('database') || desc.includes('data') || desc.includes('store')) {
    suggestions += '- You may need to add database storage nodes\n';
  }

  if (
    desc.includes('schedule') ||
    desc.includes('time') ||
    desc.includes('daily') ||
    desc.includes('hourly')
  ) {
    suggestions += '- Consider changing or adding schedule triggers\n';
  }

  if (desc.includes('filter') || desc.includes('condition')) {
    suggestions += '- Add conditional logic or filter nodes\n';
  }

  if (desc.includes('transform') || desc.includes('format') || desc.includes('convert')) {
    suggestions += '- Include data transformation nodes\n';
  }

  if (desc.includes('error') || desc.includes('handle') || desc.includes('retry')) {
    suggestions += '- Implement error handling and retry logic\n';
  }

  if (!suggestions) {
    suggestions = '- Review the source workflow structure and identify nodes to modify\n';
    suggestions += '- Consider what data transformations or additional steps are needed\n';
  }

  return suggestions;
}
