import type { HttpClient } from '../http/client.js';
import type { Logger } from '../logging.js';
import {
  PaginationHelper,
  type PaginationOptions,
  extractPaginationFromQuery,
} from '../util/pagination.js';

export interface ProjectData {
  name: string;
  type?: 'personal' | 'team';
}

export interface ProjectUserData {
  userId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
}

export class ProjectResourceClient {
  private pagination: PaginationHelper;

  constructor(
    private httpClient: HttpClient,
    private logger: Logger
  ) {
    this.pagination = new PaginationHelper(httpClient, logger);
  }

  async create(data: ProjectData) {
    this.logger.debug({ name: data.name, type: data.type }, 'Creating project');
    return this.httpClient.post('/projects', data);
  }

  async list(query: PaginationOptions = {}) {
    this.logger.debug({ query }, 'Listing projects');

    const paginationOptions = extractPaginationFromQuery(query);
    return this.pagination.fetchAll('/projects', paginationOptions);
  }

  async get(id: string) {
    this.logger.debug({ id }, 'Fetching project');
    return this.httpClient.get(`/projects/${id}`);
  }

  async update(id: string, data: Partial<ProjectData>) {
    this.logger.debug({ id, fields: Object.keys(data) }, 'Updating project');
    return this.httpClient.put(`/projects/${id}`, data);
  }

  async delete(id: string) {
    this.logger.debug({ id }, 'Deleting project');
    return this.httpClient.delete(`/projects/${id}`);
  }

  async addUser(projectId: string, userData: ProjectUserData) {
    this.logger.debug(
      { projectId, userId: userData.userId, role: userData.role },
      'Adding user to project'
    );
    return this.httpClient.post(`/projects/${projectId}/users`, userData);
  }

  async removeUser(projectId: string, userId: string) {
    this.logger.debug({ projectId, userId }, 'Removing user from project');
    return this.httpClient.delete(`/projects/${projectId}/users/${userId}`);
  }

  async updateUserRole(projectId: string, userId: string, role: string) {
    this.logger.debug({ projectId, userId, role }, 'Updating user role in project');
    return this.httpClient.put(`/projects/${projectId}/users/${userId}`, { role });
  }

  async listUsers(projectId: string, query: PaginationOptions = {}) {
    this.logger.debug({ projectId, query }, 'Listing project users');

    const paginationOptions = extractPaginationFromQuery(query);
    return this.pagination.fetchAll(`/projects/${projectId}/users`, paginationOptions);
  }
}
