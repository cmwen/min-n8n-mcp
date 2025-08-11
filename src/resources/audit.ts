import type { HttpClient } from '../http/client.js';
import type { Logger } from '../logging.js';

export interface AuditQuery {
  daysAgoFrom?: number;
  daysAgoTo?: number;
}

export class AuditResourceClient {
  constructor(
    private httpClient: HttpClient,
    private logger: Logger
  ) {}

  async generate(query: AuditQuery = {}) {
    this.logger.debug({ query }, 'Generating audit report');

    const params: Record<string, any> = {};

    if (query.daysAgoFrom !== undefined) {
      params.daysAgoFrom = query.daysAgoFrom;
    }

    if (query.daysAgoTo !== undefined) {
      params.daysAgoTo = query.daysAgoTo;
    }

    return this.httpClient.get('/audit', params);
  }
}
