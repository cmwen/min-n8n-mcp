import type { HttpClient } from '../http/client.js';
import type { Logger } from '../logging.js';
import {
  PaginationHelper,
  type PaginationOptions,
  extractPaginationFromQuery,
} from '../util/pagination.js';

export interface VariableData {
  key: string;
  value: string;
  type?: 'string' | 'number' | 'boolean' | 'json';
}

export class VariableResourceClient {
  private pagination: PaginationHelper;

  constructor(
    private httpClient: HttpClient,
    private logger: Logger
  ) {
    this.pagination = new PaginationHelper(httpClient, logger);
  }

  async create(data: VariableData) {
    this.logger.debug({ key: data.key, type: data.type }, 'Creating variable');
    return this.httpClient.post('/variables', data);
  }

  async list(query: PaginationOptions = {}) {
    this.logger.debug({ query }, 'Listing variables');

    const paginationOptions = extractPaginationFromQuery(query);
    return this.pagination.fetchAll('/variables', paginationOptions);
  }

  async get(id: string) {
    this.logger.debug({ id }, 'Fetching variable');
    return this.httpClient.get(`/variables/${id}`);
  }

  async update(id: string, data: Partial<VariableData>) {
    this.logger.debug({ id, fields: Object.keys(data) }, 'Updating variable');
    return this.httpClient.put(`/variables/${id}`, data);
  }

  async delete(id: string) {
    this.logger.debug({ id }, 'Deleting variable');
    return this.httpClient.delete(`/variables/${id}`);
  }
}
