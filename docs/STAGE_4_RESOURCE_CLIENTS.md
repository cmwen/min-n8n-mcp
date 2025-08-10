# Stage 4: Resource Clients

## Overview
Implement all n8n API resource clients that handle HTTP requests to specific n8n endpoints with proper error handling and pagination support.

## Tasks

### Task 4.1: Pagination Utilities
**Estimated Time**: 20 minutes

Create src/util/pagination.ts:

```typescript
import type { Logger } from '../logging.js';
import type { HttpClient } from '../http/client.js';

export interface PaginationOptions {
  limit?: number;
  cursor?: string;
  autoPaginate?: boolean;
  maxPages?: number;
  maxItems?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor?: string;
  totalFetched: number;
  pagesFetched: number;
}

export class PaginationHelper {
  constructor(
    private httpClient: HttpClient,
    private logger: Logger
  ) {}

  async fetchPage<T>(
    path: string,
    params: Record<string, any> = {}
  ): Promise<PaginatedResponse<T>> {
    try {
      const response = await this.httpClient.get(path, params);
      
      // Handle different pagination response formats
      if (Array.isArray(response)) {
        // Simple array response - no pagination info
        return {
          data: response,
          nextCursor: undefined,
          hasMore: false,
        };
      }
      
      if (response && typeof response === 'object') {
        // Object response with data array
        if (Array.isArray(response.data)) {
          return {
            data: response.data,
            nextCursor: response.nextCursor || response.cursor,
            hasMore: !!response.nextCursor || !!response.cursor,
          };
        }
        
        // Response is data itself if it has array-like properties
        if (response.length !== undefined) {
          return {
            data: response,
            nextCursor: undefined,
            hasMore: false,
          };
        }
      }
      
      this.logger.warn({
        path,
        responseType: typeof response,
        hasLength: response?.length !== undefined,
        hasData: response?.data !== undefined,
      }, 'Unexpected pagination response format');
      
      return {
        data: [],
        nextCursor: undefined,
        hasMore: false,
      };
    } catch (error) {
      this.logger.error({
        path,
        params,
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to fetch page');
      throw error;
    }
  }

  async fetchAll<T>(
    path: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const {
      limit = 50,
      cursor: initialCursor,
      autoPaginate = false,
      maxPages = 10,
      maxItems = 1000,
    } = options;

    let allData: T[] = [];
    let currentCursor = initialCursor;
    let pagesFetched = 0;
    let totalFetched = 0;

    this.logger.debug({
      path,
      autoPaginate,
      limit,
      maxPages,
      maxItems,
    }, 'Starting pagination fetch');

    while (pagesFetched < maxPages && totalFetched < maxItems) {
      const params: Record<string, any> = { limit };
      if (currentCursor) {
        params.cursor = currentCursor;
      }

      const page = await this.fetchPage<T>(path, params);
      
      if (!page.data || page.data.length === 0) {
        this.logger.debug({ pagesFetched, totalFetched }, 'No more data to fetch');
        break;
      }

      allData = allData.concat(page.data);
      totalFetched += page.data.length;
      pagesFetched += 1;

      this.logger.debug({
        pagesFetched,
        totalFetched,
        pageSize: page.data.length,
        hasMore: page.hasMore,
      }, 'Fetched page');

      if (!autoPaginate) {
        // Return first page only
        return {
          data: page.data,
          nextCursor: page.nextCursor,
          totalFetched: page.data.length,
          pagesFetched: 1,
        };
      }

      if (!page.hasMore || !page.nextCursor) {
        this.logger.debug({ pagesFetched, totalFetched }, 'Reached end of data');
        break;
      }

      currentCursor = page.nextCursor;

      // Respect item limit
      if (totalFetched >= maxItems) {
        this.logger.debug({ totalFetched, maxItems }, 'Reached maximum items limit');
        allData = allData.slice(0, maxItems);
        break;
      }
    }

    if (pagesFetched >= maxPages) {
      this.logger.warn({ pagesFetched, maxPages }, 'Reached maximum pages limit');
    }

    return {
      data: allData,
      nextCursor: currentCursor,
      totalFetched,
      pagesFetched,
    };
  }
}

// Helper function to create pagination params
export function createPaginationParams(options: PaginationOptions = {}): Record<string, any> {
  const params: Record<string, any> = {};
  
  if (options.limit !== undefined) {
    params.limit = options.limit;
  }
  
  if (options.cursor !== undefined) {
    params.cursor = options.cursor;
  }
  
  return params;
}

// Helper to extract pagination info from query
export function extractPaginationFromQuery(query: any = {}): PaginationOptions {
  return {
    limit: query.limit,
    cursor: query.cursor,
    autoPaginate: query.autoPaginate || false,
  };
}
```

**Action Items**:
1. Create src/util/pagination.ts with exact content above
2. Handle different n8n pagination response formats
3. Support both single page and auto-pagination
4. Add safety limits to prevent infinite loops
5. Test pagination with different response formats

### Task 4.2: Simple Cache Implementation
**Estimated Time**: 15 minutes

Create src/util/cache.ts:

```typescript
export interface CacheOptions {
  ttlMs: number;
  maxSize: number;
}

export interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  constructor(options: CacheOptions) {
    this.ttlMs = options.ttlMs;
    this.maxSize = options.maxSize;
  }

  set(key: string, value: T): void {
    // Clean up expired entries periodically
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    // If still at max size, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttlMs,
    });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    this.cleanup();
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats for debugging
  getStats(): { size: number; maxSize: number; ttlMs: number } {
    this.cleanup();
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
    };
  }
}

// Default cache options
export const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  ttlMs: 60000, // 1 minute
  maxSize: 100,
};
```

**Action Items**:
1. Create src/util/cache.ts with exact content above
2. Implement simple TTL-based cache
3. Add size limits and cleanup mechanisms
4. Test cache expiration and eviction
5. Add debugging utilities

### Task 4.3: Workflow Resource Client
**Estimated Time**: 35 minutes

Create src/resources/workflows.ts:

```typescript
import type { HttpClient } from '../http/client.js';
import type { Logger } from '../logging.js';
import { PaginationHelper, type PaginationOptions, extractPaginationFromQuery } from '../util/pagination.js';
import { SimpleCache, DEFAULT_CACHE_OPTIONS } from '../util/cache.js';

export interface WorkflowQuery extends PaginationOptions {
  active?: boolean;
  name?: string;
  tag?: string | string[];
  projectId?: string;
}

export interface WorkflowData {
  name: string;
  nodes?: any[];
  connections?: any;
  active?: boolean;
  settings?: any;
  projectId?: string;
}

export interface WorkflowStats {
  executions: {
    total: number;
    success: number;
    error: number;
    waiting: number;
    running: number;
  };
  lastExecution?: {
    id: string;
    status: string;
    startedAt: string;
    finishedAt?: string;
  };
}

export class WorkflowResourceClient {
  private pagination: PaginationHelper;
  private cache: SimpleCache<any>;

  constructor(
    private httpClient: HttpClient,
    private logger: Logger
  ) {
    this.pagination = new PaginationHelper(httpClient, logger);
    this.cache = new SimpleCache({
      ...DEFAULT_CACHE_OPTIONS,
      ttlMs: 30000, // 30 seconds for workflow data
    });
  }

  async list(query: WorkflowQuery = {}) {
    const params = this.buildQueryParams(query);
    const paginationOptions = extractPaginationFromQuery(query);
    
    this.logger.debug({ params, paginationOptions }, 'Listing workflows');
    
    return this.pagination.fetchAll('/workflows', {
      ...paginationOptions,
      limit: params.limit,
      cursor: params.cursor,
    });
  }

  async get(id: string, options: { excludePinnedData?: boolean } = {}) {
    const cacheKey = `workflow:${id}:${options.excludePinnedData || false}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      this.logger.debug({ id }, 'Returning cached workflow');
      return cached;
    }

    this.logger.debug({ id, options }, 'Fetching workflow');
    
    const params: Record<string, any> = {};
    if (options.excludePinnedData) {
      params.excludePinnedData = true;
    }

    const workflow = await this.httpClient.get(`/workflows/${id}`, params);
    
    this.cache.set(cacheKey, workflow);
    return workflow;
  }

  async create(data: WorkflowData) {
    this.logger.debug({ name: data.name }, 'Creating workflow');
    
    const workflow = await this.httpClient.post('/workflows', data);
    
    // Clear list cache as it's now stale
    this.cache.clear();
    
    return workflow;
  }

  async update(id: string, data: Partial<WorkflowData>) {
    this.logger.debug({ id, fields: Object.keys(data) }, 'Updating workflow');
    
    const workflow = await this.httpClient.put(`/workflows/${id}`, data);
    
    // Clear cache for this workflow
    this.invalidateWorkflowCache(id);
    
    return workflow;
  }

  async delete(id: string) {
    this.logger.debug({ id }, 'Deleting workflow');
    
    const result = await this.httpClient.delete(`/workflows/${id}`);
    
    // Clear cache for this workflow
    this.invalidateWorkflowCache(id);
    
    return result;
  }

  async activate(id: string) {
    this.logger.debug({ id }, 'Activating workflow');
    
    const result = await this.httpClient.post(`/workflows/${id}/activate`);
    
    // Clear cache as activation status changed
    this.invalidateWorkflowCache(id);
    
    return result;
  }

  async deactivate(id: string) {
    this.logger.debug({ id }, 'Deactivating workflow');
    
    const result = await this.httpClient.post(`/workflows/${id}/deactivate`);
    
    // Clear cache as activation status changed
    this.invalidateWorkflowCache(id);
    
    return result;
  }

  async run(id: string, input?: any) {
    this.logger.debug({ id, hasInput: !!input }, 'Running workflow');
    
    // Note: This endpoint might not exist in current n8n API
    // This is a best-guess implementation based on common patterns
    const body: any = { workflowId: id };
    if (input) {
      body.input = input;
    }

    try {
      return await this.httpClient.post('/executions', body);
    } catch (error) {
      // If the above doesn't work, try alternative endpoint
      this.logger.debug({ id }, 'Trying alternative workflow run endpoint');
      return await this.httpClient.post(`/workflows/${id}/run`, input ? { input } : {});
    }
  }

  async getTags(id: string) {
    const cacheKey = `workflow-tags:${id}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      this.logger.debug({ id }, 'Returning cached workflow tags');
      return cached;
    }

    this.logger.debug({ id }, 'Fetching workflow tags');
    
    const tags = await this.httpClient.get(`/workflows/${id}/tags`);
    
    this.cache.set(cacheKey, tags);
    return tags;
  }

  async updateTags(id: string, tags: string[]) {
    this.logger.debug({ id, tagCount: tags.length }, 'Updating workflow tags');
    
    const result = await this.httpClient.put(`/workflows/${id}/tags`, tags);
    
    // Clear tags cache
    this.cache.delete(`workflow-tags:${id}`);
    
    return result;
  }

  async transfer(id: string, projectId: string) {
    this.logger.debug({ id, projectId }, 'Transferring workflow');
    
    const result = await this.httpClient.put(`/workflows/${id}/transfer`, { projectId });
    
    // Clear cache as project changed
    this.invalidateWorkflowCache(id);
    
    return result;
  }

  async getStats(id: string): Promise<WorkflowStats> {
    this.logger.debug({ id }, 'Computing workflow stats');
    
    // Since this endpoint doesn't exist in the API, compute client-side
    try {
      // Fetch recent executions for this workflow
      const executions = await this.httpClient.get('/executions', {
        workflowId: id,
        limit: 100, // Get recent executions to compute stats
      });

      const executionData = Array.isArray(executions) ? executions : executions.data || [];
      
      const stats: WorkflowStats = {
        executions: {
          total: executionData.length,
          success: 0,
          error: 0,
          waiting: 0,
          running: 0,
        },
      };

      // Count by status
      for (const execution of executionData) {
        switch (execution.status) {
          case 'success':
            stats.executions.success++;
            break;
          case 'error':
            stats.executions.error++;
            break;
          case 'waiting':
            stats.executions.waiting++;
            break;
          case 'running':
            stats.executions.running++;
            break;
        }
      }

      // Find last execution
      if (executionData.length > 0) {
        const lastExecution = executionData[0]; // Assuming they're sorted by date
        stats.lastExecution = {
          id: lastExecution.id,
          status: lastExecution.status,
          startedAt: lastExecution.startedAt,
          finishedAt: lastExecution.finishedAt,
        };
      }

      return stats;
    } catch (error) {
      this.logger.error({ id, error }, 'Failed to compute workflow stats');
      throw error;
    }
  }

  private buildQueryParams(query: WorkflowQuery): Record<string, any> {
    const params: Record<string, any> = {};
    
    if (query.active !== undefined) {
      params.active = query.active;
    }
    
    if (query.name) {
      params.name = query.name;
    }
    
    if (query.tag) {
      params.tag = Array.isArray(query.tag) ? query.tag.join(',') : query.tag;
    }
    
    if (query.projectId) {
      params.projectId = query.projectId;
    }
    
    if (query.limit) {
      params.limit = query.limit;
    }
    
    if (query.cursor) {
      params.cursor = query.cursor;
    }
    
    return params;
  }

  private invalidateWorkflowCache(id: string): void {
    // Remove all cache entries related to this workflow
    this.cache.delete(`workflow:${id}:true`);
    this.cache.delete(`workflow:${id}:false`);
    this.cache.delete(`workflow-tags:${id}`);
  }
}
```

**Action Items**:
1. Create src/resources/workflows.ts with exact content above
2. Implement all workflow operations with proper error handling
3. Add caching for frequently accessed data
4. Handle missing endpoints gracefully (like runWorkflow)
5. Implement client-side stats computation
6. Test all workflow operations

### Task 4.4: Execution Resource Client
**Estimated Time**: 25 minutes

Create src/resources/executions.ts:

```typescript
import type { HttpClient } from '../http/client.js';
import type { Logger } from '../logging.js';
import { PaginationHelper, type PaginationOptions, extractPaginationFromQuery } from '../util/pagination.js';

export interface ExecutionQuery extends PaginationOptions {
  workflowId?: string;
  status?: 'success' | 'error' | 'waiting' | 'running';
  includeData?: boolean;
}

export class ExecutionResourceClient {
  private pagination: PaginationHelper;

  constructor(
    private httpClient: HttpClient,
    private logger: Logger
  ) {
    this.pagination = new PaginationHelper(httpClient, logger);
  }

  async list(query: ExecutionQuery = {}) {
    const params = this.buildQueryParams(query);
    const paginationOptions = extractPaginationFromQuery(query);
    
    this.logger.debug({ params, paginationOptions }, 'Listing executions');
    
    return this.pagination.fetchAll('/executions', {
      ...paginationOptions,
      limit: params.limit,
      cursor: params.cursor,
    });
  }

  async get(id: string, options: { includeData?: boolean } = {}) {
    this.logger.debug({ id, options }, 'Fetching execution');
    
    const params: Record<string, any> = {};
    if (options.includeData) {
      params.includeData = true;
    }

    return this.httpClient.get(`/executions/${id}`, params);
  }

  async delete(id: string) {
    this.logger.debug({ id }, 'Deleting execution');
    
    return this.httpClient.delete(`/executions/${id}`);
  }

  private buildQueryParams(query: ExecutionQuery): Record<string, any> {
    const params: Record<string, any> = {};
    
    if (query.workflowId) {
      params.workflowId = query.workflowId;
    }
    
    if (query.status) {
      params.status = query.status;
    }
    
    if (query.includeData !== undefined) {
      params.includeData = query.includeData;
    }
    
    if (query.limit) {
      params.limit = query.limit;
    }
    
    if (query.cursor) {
      params.cursor = query.cursor;
    }
    
    return params;
  }
}
```

**Action Items**:
1. Create src/resources/executions.ts with exact content above
2. Implement execution listing with filtering
3. Support includeData option for detailed execution data
4. Test execution operations

### Task 4.5: Remaining Resource Clients
**Estimated Time**: 45 minutes

Create the remaining resource client files with similar patterns. Start with src/resources/credentials.ts:

```typescript
import type { HttpClient } from '../http/client.js';
import type { Logger } from '../logging.js';
import { SimpleCache, DEFAULT_CACHE_OPTIONS } from '../util/cache.js';

export interface CredentialData {
  name: string;
  type: string;
  data: any;
  projectId?: string;
}

export class CredentialResourceClient {
  private cache: SimpleCache<any>;

  constructor(
    private httpClient: HttpClient,
    private logger: Logger
  ) {
    this.cache = new SimpleCache({
      ...DEFAULT_CACHE_OPTIONS,
      ttlMs: 300000, // 5 minutes for credential schemas
    });
  }

  async create(data: CredentialData) {
    this.logger.debug({ name: data.name, type: data.type }, 'Creating credential');
    
    return this.httpClient.post('/credentials', data);
  }

  async delete(id: string) {
    this.logger.debug({ id }, 'Deleting credential');
    
    return this.httpClient.delete(`/credentials/${id}`);
  }

  async getTypeSchema(credentialTypeName: string) {
    const cacheKey = `credential-schema:${credentialTypeName}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      this.logger.debug({ credentialTypeName }, 'Returning cached credential schema');
      return cached;
    }

    this.logger.debug({ credentialTypeName }, 'Fetching credential type schema');
    
    const schema = await this.httpClient.get(`/credentials/schema/${credentialTypeName}`);
    
    this.cache.set(cacheKey, schema);
    return schema;
  }

  async transfer(id: string, projectId: string) {
    this.logger.debug({ id, projectId }, 'Transferring credential');
    
    return this.httpClient.put(`/credentials/${id}/transfer`, { projectId });
  }
}
```

Create similar files for all remaining resource clients:

**src/resources/tags.ts**:
```typescript
import type { HttpClient } from '../http/client.js';
import type { Logger } from '../logging.js';
import { PaginationHelper, type PaginationOptions, extractPaginationFromQuery } from '../util/pagination.js';

export interface TagData {
  name: string;
}

export class TagResourceClient {
  private pagination: PaginationHelper;

  constructor(
    private httpClient: HttpClient,
    private logger: Logger
  ) {
    this.pagination = new PaginationHelper(httpClient, logger);
  }

  async create(data: TagData) {
    this.logger.debug({ name: data.name }, 'Creating tag');
    return this.httpClient.post('/tags', data);
  }

  async list(query: PaginationOptions = {}) {
    this.logger.debug({ query }, 'Listing tags');
    
    const paginationOptions = extractPaginationFromQuery(query);
    return this.pagination.fetchAll('/tags', paginationOptions);
  }

  async get(id: string) {
    this.logger.debug({ id }, 'Fetching tag');
    return this.httpClient.get(`/tags/${id}`);
  }

  async update(id: string, data: Partial<TagData>) {
    this.logger.debug({ id }, 'Updating tag');
    return this.httpClient.put(`/tags/${id}`, data);
  }

  async delete(id: string) {
    this.logger.debug({ id }, 'Deleting tag');
    return this.httpClient.delete(`/tags/${id}`);
  }
}
```

**src/resources/users.ts**:
```typescript
import type { HttpClient } from '../http/client.js';
import type { Logger } from '../logging.js';
import { PaginationHelper, type PaginationOptions, extractPaginationFromQuery } from '../util/pagination.js';

export interface UserData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: string;
}

export interface UserQuery extends PaginationOptions {
  includeRole?: boolean;
}

export class UserResourceClient {
  private pagination: PaginationHelper;

  constructor(
    private httpClient: HttpClient,
    private logger: Logger
  ) {
    this.pagination = new PaginationHelper(httpClient, logger);
  }

  async list(query: UserQuery = {}) {
    const params: Record<string, any> = {};
    if (query.includeRole !== undefined) {
      params.includeRole = query.includeRole;
    }
    
    this.logger.debug({ params }, 'Listing users');
    
    const paginationOptions = extractPaginationFromQuery(query);
    return this.pagination.fetchAll('/users', paginationOptions);
  }

  async create(data: UserData) {
    this.logger.debug({ email: data.email }, 'Creating user');
    return this.httpClient.post('/users', data);
  }

  async get(id: string, options: { includeRole?: boolean } = {}) {
    this.logger.debug({ id, options }, 'Fetching user');
    
    const params: Record<string, any> = {};
    if (options.includeRole) {
      params.includeRole = true;
    }

    return this.httpClient.get(`/users/${id}`, params);
  }

  async delete(id: string) {
    this.logger.debug({ id }, 'Deleting user');
    return this.httpClient.delete(`/users/${id}`);
  }

  async changeRole(id: string, role: string) {
    this.logger.debug({ id, role }, 'Changing user role');
    return this.httpClient.patch(`/users/${id}/role`, { role });
  }
}
```

Continue creating similar resource clients for:
- **src/resources/variables.ts** (create, list, update, delete)
- **src/resources/projects.ts** (create, list, update, delete, user management)
- **src/resources/audit.ts** (generate audit)
- **src/resources/sourceControl.ts** (pull operations)

**Action Items**:
1. Create all remaining resource client files
2. Follow the same patterns: pagination, caching where appropriate, proper logging
3. Handle different parameter types and query building
4. Add proper TypeScript interfaces for all data types
5. Test all resource operations

### Task 4.6: Resource Client Factory
**Estimated Time**: 15 minutes

Create src/resources/index.ts to export all clients:

```typescript
import { WorkflowResourceClient } from './workflows.js';
import { ExecutionResourceClient } from './executions.js';
import { CredentialResourceClient } from './credentials.js';
import { TagResourceClient } from './tags.js';
import { UserResourceClient } from './users.js';
import { VariableResourceClient } from './variables.js';
import { ProjectResourceClient } from './projects.js';
import { AuditResourceClient } from './audit.js';
import { SourceControlResourceClient } from './sourceControl.js';
import type { HttpClient } from '../http/client.js';
import type { Logger } from '../logging.js';

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

export function createResourceClients(
  httpClient: HttpClient,
  logger: Logger
): ResourceClients {
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

// Re-export types
export type {
  WorkflowQuery,
  WorkflowData,
  WorkflowStats,
} from './workflows.js';

export type {
  ExecutionQuery,
} from './executions.js';

export type {
  CredentialData,
} from './credentials.js';

export type {
  TagData,
} from './tags.js';

export type {
  UserData,
  UserQuery,
} from './users.js';
```

**Action Items**:
1. Create src/resources/index.ts with exact content above
2. Export all resource clients and their types
3. Create factory function for easy initialization
4. Test that all exports work correctly

### Task 4.7: Update Server Context
**Estimated Time**: 10 minutes

Update src/server.ts to include resource clients:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import http from 'node:http';
import type { Config } from './config.js';
import type { Logger } from './logging.js';
import { HttpClient } from './http/client.js';
import { ToolRegistry } from './tools/registry.js';
import { registerAllTools } from './tools/index.js';
import { createResourceClients, type ResourceClients } from './resources/index.js';

export interface ServerContext {
  config: Config;
  logger: Logger;
  httpClient: HttpClient;
  resources: ResourceClients;
}

// ... rest of the server implementation remains the same
// Just add resources to the context creation:

export async function createServer(config: Config, logger: Logger): Promise<McpServer> {
  const httpClient = HttpClient.fromConfig(config, logger);
  
  // Test connection to n8n API
  try {
    logger.info('Testing connection to n8n API...');
    await httpClient.get('/workflows', { limit: 1 });
    logger.info('Successfully connected to n8n API');
  } catch (error) {
    logger.error('Failed to connect to n8n API', error);
    throw new Error(`Cannot connect to n8n API at ${config.n8nApiUrl}. Please verify the URL and API token.`);
  }

  // Create resource clients
  const resources = createResourceClients(httpClient, logger);

  const context: ServerContext = {
    config,
    logger,
    httpClient,
    resources,
  };

  // ... rest remains the same
}
```

**Action Items**:
1. Update ServerContext interface to include resource clients
2. Initialize resource clients in createServer function
3. Test that resources are available in server context

## Validation Checklist

- [ ] Pagination utilities handle different response formats
- [ ] Simple cache implements TTL and size limits correctly
- [ ] Workflow resource client implements all operations
- [ ] Execution resource client handles filtering and data inclusion
- [ ] All remaining resource clients follow consistent patterns
- [ ] Resource client factory creates all clients correctly
- [ ] Server context includes resource clients
- [ ] All resource operations use proper logging
- [ ] Error handling works across all resource clients
- [ ] Caching improves performance for appropriate operations

## Next Stage
Proceed to Stage 5: Tool Implementation once all validation items are complete.
