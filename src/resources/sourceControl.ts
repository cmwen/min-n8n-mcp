import type { HttpClient } from '../http/client.js';
import type { Logger } from '../logging.js';

export interface SourceControlPullOptions {
  force?: boolean;
  variables?: boolean;
  userId?: string;
}

export class SourceControlResourceClient {
  constructor(
    private httpClient: HttpClient,
    private logger: Logger
  ) {}

  async pull(options: SourceControlPullOptions = {}) {
    this.logger.debug({ options }, 'Pulling from source control');

    const params: Record<string, any> = {};

    if (options.force !== undefined) {
      params.force = options.force;
    }

    if (options.variables !== undefined) {
      params.variables = options.variables;
    }

    if (options.userId) {
      params.userId = options.userId;
    }

    return this.httpClient.post('/source-control/pull', params);
  }
}
