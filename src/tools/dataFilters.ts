/**
 * Data filtering utilities to reduce verbosity of returned data based on mode
 */

type Mode = 'basic' | 'intermediate' | 'advanced';

/**
 * Filter workflow data based on mode to reduce verbosity
 */
export function filterWorkflowData(workflow: any, mode: Mode): any {
  if (mode === 'advanced') {
    return workflow; // Return complete data for advanced mode
  }

  // For basic and intermediate modes, return essential information only
  const filtered: any = {
    id: workflow.id,
    name: workflow.name,
    active: workflow.active,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
    versionId: workflow.versionId,
    tags: workflow.tags,
  };

  // Add additional fields for intermediate mode
  if (mode === 'intermediate') {
    filtered.staticData = workflow.staticData;
    filtered.settings = workflow.settings;
    filtered.pinData = workflow.pinData;
    filtered.meta = workflow.meta;
    filtered.nodeConnections = workflow.connections ? Object.keys(workflow.connections).length : 0; // Just connection count, not full structure
    filtered.nodeCount = workflow.nodes ? workflow.nodes.length : 0; // Just node count
  }

  return filtered;
}

/**
 * Filter execution data based on mode to reduce verbosity
 */
export function filterExecutionData(execution: any, mode: Mode): any {
  if (mode === 'advanced') {
    return execution; // Return complete data for advanced mode
  }

  // For basic and intermediate modes, return essential information only
  const filtered: any = {
    id: execution.id,
    workflowId: execution.workflowId,
    status: execution.status,
    mode: execution.mode,
    retryOf: execution.retryOf,
    retrySuccessId: execution.retrySuccessId,
    startedAt: execution.startedAt,
    stoppedAt: execution.stoppedAt,
    finished: execution.finished,
  };

  // Add additional fields for intermediate mode
  if (mode === 'intermediate') {
    filtered.error = execution.error;
    filtered.waitTill = execution.waitTill;
    filtered.customData = execution.customData;
    // Include data size information but not the actual data
    if (execution.data) {
      filtered.dataSize = JSON.stringify(execution.data).length;
      filtered.nodeExecutionCount = Object.keys(execution.data).length;
    }
  }

  return filtered;
}

/**
 * Filter lists of workflows based on mode
 */
export function filterWorkflowList(workflows: any[], mode: Mode): any[] {
  if (mode === 'advanced') {
    return workflows;
  }
  return workflows.map((workflow) => filterWorkflowData(workflow, mode));
}

/**
 * Filter lists of executions based on mode
 */
export function filterExecutionList(executions: any[], mode: Mode): any[] {
  if (mode === 'advanced') {
    return executions;
  }
  return executions.map((execution) => filterExecutionData(execution, mode));
}

/**
 * Get mode from context configuration
 */
export function getModeFromContext(context: any): Mode {
  return context.config?.mode || 'intermediate';
}
