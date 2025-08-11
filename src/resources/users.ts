import type { HttpClient } from '../http/client.js';
import type { Logger } from '../logging.js';
import {
  PaginationHelper,
  type PaginationOptions,
  extractPaginationFromQuery,
} from '../util/pagination.js';

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
