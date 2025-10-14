import type { HttpClient } from '../http/client.js';
import type { Logger } from '../logging.js';
import { DEFAULT_CACHE_OPTIONS, SimpleCache } from '../util/cache.js';
import {
  PaginationHelper,
  type PaginationOptions,
  extractPaginationFromQuery,
} from '../util/pagination.js';

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

    // Separate pagination params from query params
    const { limit, cursor, ...queryParams } = params;

    return this.pagination.fetchAll('/workflows', {
      ...paginationOptions,
      limit,
      cursor,
      queryParams,
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
