import type { HttpClient } from '../http/client.js';
import type { Logger } from '../logging.js';
import { DEFAULT_CACHE_OPTIONS, SimpleCache } from '../util/cache.js';

export interface CredentialData {
  name: string;
  type: string;
  data?: any;
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
