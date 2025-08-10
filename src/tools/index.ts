import type { ToolRegistry } from './registry.js';

import { registerAuditTools } from './audit.js';
import { registerCredentialTools } from './credentials.js';
import { registerExecutionTools } from './executions.js';
import { registerProjectTools } from './projects.js';
import { registerSourceControlTools } from './sourceControl.js';
import { registerTagTools } from './tags.js';
import { registerUserTools } from './users.js';
import { registerVariableTools } from './variables.js';
// Import all tool modules (to be implemented in later stages)
import { registerWorkflowTools } from './workflows.js';

export async function registerAllTools(registry: ToolRegistry): Promise<void> {
  // Register workflow tools
  await registerWorkflowTools(registry);

  // Register execution tools
  await registerExecutionTools(registry);

  // Register credential tools
  await registerCredentialTools(registry);

  // Register tag tools
  await registerTagTools(registry);

  // Register user tools
  await registerUserTools(registry);

  // Register variable tools
  await registerVariableTools(registry);

  // Register project tools
  await registerProjectTools(registry);

  // Register audit tools
  await registerAuditTools(registry);

  // Register source control tools
  await registerSourceControlTools(registry);
}

// Export all tool types for external use
export type { ToolDefinition } from './registry.js';
export { ToolRegistry, createTool } from './registry.js';
