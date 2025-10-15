import { registerAuditTools } from './audit.js';
import { registerCredentialTools } from './credentials.js';
import { registerExecutionTools } from './executions.js';
import { registerProjectTools } from './projects.js';
import type { ToolRegistry } from './registry.js';
import { registerSourceControlTools } from './sourceControl.js';
import { registerTagTools } from './tags.js';
import { registerUserTools } from './users.js';
import { registerVariableTools } from './variables.js';
// Import all tool modules (to be implemented in later stages)
import { registerWorkflowTools } from './workflows.js';

type Mode = 'basic' | 'intermediate' | 'advanced';

// Define which tools are available in each mode
const MODE_TOOLS = {
  basic: {
    workflows: ['listWorkflows', 'getWorkflow', 'activateWorkflow', 'deactivateWorkflow'],
    executions: ['listExecutions', 'getExecution'],
    credentials: [],
    tags: [],
    users: [],
    variables: [],
    projects: [],
    audit: [],
    sourceControl: [],
  },
  intermediate: {
    workflows: [
      'listWorkflows',
      'getWorkflow',
      'activateWorkflow',
      'deactivateWorkflow',
      'createWorkflow',
      'updateWorkflow',
      'deleteWorkflow',
      'getWorkflowTags',
      'updateWorkflowTags',
    ],
    executions: ['listExecutions', 'getExecution', 'deleteExecution'],
    credentials: ['createCredential', 'deleteCredential', 'getCredentialType'],
    tags: ['listTags', 'createTag', 'getTag', 'updateTag', 'deleteTag'],
    users: [],
    variables: [],
    projects: [],
    audit: [],
    sourceControl: [],
  },
  advanced: {
    // All tools - no filtering applied
    workflows: [],
    executions: [],
    credentials: [],
    tags: [],
    users: [],
    variables: [],
    projects: [],
    audit: [],
    sourceControl: [],
  },
} as const;

export async function registerAllTools(
  registry: ToolRegistry,
  mode: Mode = 'intermediate'
): Promise<void> {
  // Create a registry wrapper that filters tools based on mode
  const modeAwareRegistry =
    mode === 'advanced' ? registry : createModeAwareRegistry(registry, mode);

  // Register workflow tools
  await registerWorkflowTools(modeAwareRegistry);

  // Register execution tools
  await registerExecutionTools(modeAwareRegistry);

  // Register credential tools (only for intermediate+ modes)
  if (mode !== 'basic') {
    await registerCredentialTools(modeAwareRegistry);
  }

  // Register tag tools (only for intermediate+ modes)
  if (mode !== 'basic') {
    await registerTagTools(modeAwareRegistry);
  }

  // Register user tools (only for advanced mode)
  if (mode === 'advanced') {
    await registerUserTools(modeAwareRegistry);
  }

  // Register variable tools (only for advanced mode)
  if (mode === 'advanced') {
    await registerVariableTools(modeAwareRegistry);
  }

  // Register project tools (only for advanced mode)
  if (mode === 'advanced') {
    await registerProjectTools(modeAwareRegistry);
  }

  // Register audit tools (only for advanced mode)
  if (mode === 'advanced') {
    await registerAuditTools(modeAwareRegistry);
  }

  // Register source control tools (only for advanced mode)
  if (mode === 'advanced') {
    await registerSourceControlTools(modeAwareRegistry);
  }
}

function createModeAwareRegistry(registry: ToolRegistry, mode: Mode): ToolRegistry {
  const proxy = Object.create(registry);

  proxy.register = (tool: any) => {
    const category = getToolCategory(tool.name);
    if (category && MODE_TOOLS[mode][category].length > 0) {
      // Check if this specific tool is allowed in the current mode
      if ((MODE_TOOLS[mode][category] as readonly string[]).includes(tool.name)) {
        registry.register(tool);
      }
    }
  };

  proxy.registerBatch = (tools: any[]) => {
    for (const tool of tools) {
      const category = getToolCategory(tool.name);
      if (category && MODE_TOOLS[mode][category].length > 0) {
        if ((MODE_TOOLS[mode][category] as readonly string[]).includes(tool.name)) {
          registry.register(tool);
        }
      }
    }
  };

  return proxy;
}

function getToolCategory(toolName: string): keyof typeof MODE_TOOLS.basic | null {
  if (toolName.includes('Workflow') || toolName.includes('workflow')) return 'workflows';
  if (toolName.includes('Execution') || toolName.includes('execution')) return 'executions';
  if (toolName.includes('Credential') || toolName.includes('credential')) return 'credentials';
  if (toolName.includes('Tag') || toolName.includes('tag')) return 'tags';
  if (toolName.includes('User') || toolName.includes('user')) return 'users';
  if (toolName.includes('Variable') || toolName.includes('variable')) return 'variables';
  if (toolName.includes('Project') || toolName.includes('project')) return 'projects';
  if (toolName.includes('Audit') || toolName.includes('audit')) return 'audit';
  if (toolName.includes('SourceControl') || toolName.includes('sourceControl'))
    return 'sourceControl';
  return null;
}

// Export all tool types for external use
export type { ToolDefinition } from './registry.js';
export { createTool, ToolRegistry } from './registry.js';
