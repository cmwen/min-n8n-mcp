import type { HttpClient } from '../http/client.js';
import type { Logger } from '../logging.js';
import {
  PaginationHelper,
  type PaginationOptions,
  extractPaginationFromQuery,
} from '../util/pagination.js';

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
