import type { HttpClient } from '../http/client.js';
import type { Logger } from '../logging.js';

export type AuditCategory = 'credentials' | 'database' | 'nodes' | 'filesystem' | 'instance';

export interface AuditRequest {
  additionalOptions?: {
    daysAbandonedWorkflow?: number;
    categories?: AuditCategory[];
  };
}

export class AuditResourceClient {
  constructor(
    private httpClient: HttpClient,
    private logger: Logger
  ) {}

  async generate(request: AuditRequest = {}) {
    this.logger.debug({ request }, 'Generating audit report');

    const hasBody = Object.keys(request).length > 0;

    return this.httpClient.post('/audit', hasBody ? request : undefined);
  }
}
