import type { HttpClient } from '../http/client.js';
import type { Logger } from '../logging.js';
import {
  extractPaginationFromQuery,
  PaginationHelper,
  type PaginationOptions,
} from '../util/pagination.js';

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
