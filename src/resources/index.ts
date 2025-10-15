import type { HttpClient } from '../http/client.js';
import type { Logger } from '../logging.js';
import { AuditResourceClient } from './audit.js';
import { CredentialResourceClient } from './credentials.js';
import { ExecutionResourceClient } from './executions.js';
import { ProjectResourceClient } from './projects.js';
import { SourceControlResourceClient } from './sourceControl.js';
import { TagResourceClient } from './tags.js';
import { UserResourceClient } from './users.js';
import { VariableResourceClient } from './variables.js';
import { WorkflowResourceClient } from './workflows.js';

export interface ResourceClients {
  workflows: WorkflowResourceClient;
  executions: ExecutionResourceClient;
  credentials: CredentialResourceClient;
  tags: TagResourceClient;
  users: UserResourceClient;
  variables: VariableResourceClient;
  projects: ProjectResourceClient;
  audit: AuditResourceClient;
  sourceControl: SourceControlResourceClient;
}

export function createResourceClients(httpClient: HttpClient, logger: Logger): ResourceClients {
  return {
    workflows: new WorkflowResourceClient(httpClient, logger),
    executions: new ExecutionResourceClient(httpClient, logger),
    credentials: new CredentialResourceClient(httpClient, logger),
    tags: new TagResourceClient(httpClient, logger),
    users: new UserResourceClient(httpClient, logger),
    variables: new VariableResourceClient(httpClient, logger),
    projects: new ProjectResourceClient(httpClient, logger),
    audit: new AuditResourceClient(httpClient, logger),
    sourceControl: new SourceControlResourceClient(httpClient, logger),
  };
}

// Re-export all resource clients
export {
  WorkflowResourceClient,
  ExecutionResourceClient,
  CredentialResourceClient,
  TagResourceClient,
  UserResourceClient,
  VariableResourceClient,
  ProjectResourceClient,
  AuditResourceClient,
  SourceControlResourceClient,
};

export type { AuditCategory, AuditRequest } from './audit.js';
export type { CredentialData } from './credentials.js';
export type { ExecutionQuery } from './executions.js';
export type { ProjectData, ProjectUserRelation, ProjectUserRole } from './projects.js';
export type { SourceControlPullOptions } from './sourceControl.js';
export type { TagData } from './tags.js';
export type {
  UserData,
  UserQuery,
} from './users.js';
export type { VariableData } from './variables.js';
// Re-export types
export type {
  WorkflowData,
  WorkflowQuery,
  WorkflowStats,
} from './workflows.js';
