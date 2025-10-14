import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Common schemas used across tools
export const IdSchema = z.string().min(1, 'ID is required');
export const LimitSchema = z.number().int().positive().max(200).optional();
export const CursorSchema = z.string().optional();
export const AutoPaginateSchema = z.boolean().optional();

// Pagination query schema
export const PaginationQuerySchema = z.object({
  limit: LimitSchema,
  cursor: CursorSchema,
  autoPaginate: AutoPaginateSchema,
});

// Common response schemas
export const PaginatedResponseSchema = z.object({
  data: z.array(z.unknown()),
  nextCursor: z.string().optional(),
});

// Workflow-related schemas
export const WorkflowQuerySchema = z
  .object({
    active: z.boolean().optional(),
    name: z.string().optional(),
    tag: z.union([z.string(), z.array(z.string())]).optional(),
    projectId: z.string().optional(),
  })
  .merge(PaginationQuerySchema);

export const WorkflowCreateSchema = z.object({
  name: z.string().min(1, 'Workflow name is required'),
  nodes: z.array(z.unknown()).optional(),
  connections: z.unknown().optional(),
  active: z.boolean().optional(),
  settings: z.unknown().optional(),
  projectId: z.string().optional(),
});

export const WorkflowUpdateSchema = WorkflowCreateSchema.partial();

// Execution-related schemas
export const ExecutionQuerySchema = z
  .object({
    workflowId: z.string().optional(),
    status: z.enum(['success', 'error', 'waiting', 'running']).optional(),
    includeData: z.boolean().optional(),
    projectId: z.string().optional(),
  })
  .merge(PaginationQuerySchema);

// User-related schemas
export const UserCreateSchema = z.object({
  email: z.string().email('Valid email is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.string().optional(),
});

export const UserQuerySchema = z
  .object({
    includeRole: z.boolean().optional(),
  })
  .merge(PaginationQuerySchema);

// Project-related schemas
export const ProjectCreateSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  type: z.enum(['team', 'personal']).optional(),
});

export const ProjectUpdateSchema = ProjectCreateSchema.partial();

// Tag-related schemas
export const TagCreateSchema = z.object({
  name: z.string().min(1, 'Tag name is required'),
});

export const TagUpdateSchema = TagCreateSchema.partial();

// Variable-related schemas
export const VariableCreateSchema = z.object({
  key: z.string().min(1, 'Variable key is required'),
  value: z.string(),
  type: z.enum(['string', 'boolean', 'number']).optional(),
});

export const VariableUpdateSchema = VariableCreateSchema.partial();

// Credential-related schemas
export const CredentialCreateSchema = z.object({
  name: z.string().min(1, 'Credential name is required'),
  type: z.string().min(1, 'Credential type is required'),
  data: z.unknown(),
  projectId: z.string().optional(),
});

// Tool input schemas
export const ToolInputSchemas = {
  // Workflow tools
  listWorkflows: WorkflowQuerySchema.partial(),
  getWorkflow: z.object({
    id: IdSchema,
    excludePinnedData: z.boolean().optional(),
  }),
  createWorkflow: z.object({
    data: WorkflowCreateSchema,
  }),
  updateWorkflow: z.object({
    id: IdSchema,
    data: WorkflowUpdateSchema,
  }),
  deleteWorkflow: z.object({
    id: IdSchema,
  }),
  activateWorkflow: z.object({
    id: IdSchema,
  }),
  deactivateWorkflow: z.object({
    id: IdSchema,
  }),
  getWorkflowTags: z.object({
    id: IdSchema,
  }),
  updateWorkflowTags: z.object({
    id: IdSchema,
    tags: z.array(z.string()),
  }),
  transferWorkflow: z.object({
    id: IdSchema,
    projectId: IdSchema,
  }),
  getWorkflowStats: z.object({
    id: IdSchema,
  }),

  // Execution tools
  listExecutions: ExecutionQuerySchema.partial(),
  getExecution: z.object({
    id: IdSchema,
    includeData: z.boolean().optional(),
  }),
  deleteExecution: z.object({
    id: IdSchema,
  }),

  // Credential tools
  createCredential: z.object({
    data: CredentialCreateSchema,
  }),
  deleteCredential: z.object({
    id: IdSchema,
  }),
  getCredentialType: z.object({
    credentialTypeName: z.string().min(1, 'Credential type name is required'),
  }),
  transferCredential: z.object({
    id: IdSchema,
    projectId: IdSchema,
  }),

  // Tag tools
  createTag: z.object({
    data: TagCreateSchema,
  }),
  listTags: PaginationQuerySchema.partial(),
  getTag: z.object({
    id: IdSchema,
  }),
  updateTag: z.object({
    id: IdSchema,
    data: TagUpdateSchema,
  }),
  deleteTag: z.object({
    id: IdSchema,
  }),

  // User tools
  listUsers: UserQuerySchema.partial(),
  createUser: z.object({
    data: UserCreateSchema,
  }),
  getUser: z.object({
    id: z.string().min(1, 'User ID or email is required'),
    includeRole: z.boolean().optional(),
  }),
  deleteUser: z.object({
    id: IdSchema,
  }),
  changeUserRole: z.object({
    id: IdSchema,
    role: z.string().min(1, 'Role is required'),
  }),

  // Variable tools
  createVariable: z.object({
    data: VariableCreateSchema,
  }),
  listVariables: PaginationQuerySchema.partial(),
  updateVariable: z.object({
    id: IdSchema,
    data: VariableUpdateSchema,
  }),
  deleteVariable: z.object({
    id: IdSchema,
  }),

  // Project tools
  createProject: z.object({
    data: ProjectCreateSchema,
  }),
  listProjects: PaginationQuerySchema.partial(),
  updateProject: z.object({
    id: IdSchema,
    data: ProjectUpdateSchema,
  }),
  deleteProject: z.object({
    id: IdSchema,
  }),
  addUsersToProject: z.object({
    projectId: IdSchema,
    users: z.array(
      z.object({
        id: IdSchema,
        role: z.string().optional(),
      })
    ),
  }),
  deleteUserFromProject: z.object({
    projectId: IdSchema,
    userId: IdSchema,
  }),
  changeUserRoleInProject: z.object({
    projectId: IdSchema,
    userId: IdSchema,
    role: z.string().min(1, 'Role is required'),
  }),

  // Audit tools
  generateAudit: z.object({
    data: z
      .object({
        additionalOptions: z
          .object({
            daysAbandonedWorkflow: z.number().int().nonnegative().optional(),
            categories: z
              .array(z.enum(['credentials', 'database', 'nodes', 'filesystem', 'instance']))
              .optional(),
          })
          .partial()
          .optional(),
      })
      .optional(),
  }),

  // Source control tools
  pullSourceControl: z.object({
    data: z.unknown().optional(),
  }),
};

export type ToolInputs = {
  [K in keyof typeof ToolInputSchemas]: z.infer<(typeof ToolInputSchemas)[K]>;
};

// Convert Zod schemas to JSON Schema (not used by MCP tools, but kept for compatibility)
export function createToolJsonSchemas() {
  const schemas: Record<string, any> = {};

  for (const [toolName, zodSchema] of Object.entries(ToolInputSchemas)) {
    const jsonSchema = zodToJsonSchema(zodSchema, {
      name: `${toolName}Input`,
      $refStrategy: 'none', // Inline all references
    });

    // Ensure the root schema has type: "object" as required by MCP
    schemas[toolName] = {
      type: 'object',
      ...jsonSchema,
      // Remove the title that zodToJsonSchema sometimes adds
      title: undefined,
    };
  }

  return schemas;
}

// Validation helpers
export function validateToolInput<T extends keyof ToolInputs>(
  toolName: T,
  input: unknown
): ToolInputs[T] {
  const schema = ToolInputSchemas[toolName];
  return schema.parse(input) as ToolInputs[T];
}

export function safeValidateToolInput<T extends keyof ToolInputs>(
  toolName: T,
  input: unknown
): { success: true; data: ToolInputs[T] } | { success: false; error: string } {
  try {
    const data = validateToolInput(toolName, input);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      return { success: false, error: issues };
    }
    return { success: false, error: String(error) };
  }
}
