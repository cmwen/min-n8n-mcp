import type { HttpClient } from '../http/client.js';
import type { Logger } from '../logging.js';

export interface PaginationOptions {
  limit?: number;
  cursor?: string;
  autoPaginate?: boolean;
  maxPages?: number;
  maxItems?: number;
  queryParams?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor?: string;
  totalFetched: number;
  pagesFetched: number;
}

export class PaginationHelper {
  constructor(
    private httpClient: HttpClient,
    private logger: Logger
  ) {}

  async fetchPage<T>(
    path: string,
    params: Record<string, any> = {}
  ): Promise<PaginatedResponse<T>> {
    try {
      const response = await this.httpClient.get(path, params);

      // Handle different pagination response formats
      if (Array.isArray(response)) {
        // Simple array response - no pagination info
        return {
          data: response,
          nextCursor: undefined,
          hasMore: false,
        };
      }

      if (response && typeof response === 'object') {
        // Object response with data array
        if (Array.isArray(response.data)) {
          return {
            data: response.data,
            nextCursor: response.nextCursor || response.cursor,
            hasMore: !!response.nextCursor || !!response.cursor,
          };
        }

        // Response is data itself if it has array-like properties
        if (response.length !== undefined) {
          return {
            data: response,
            nextCursor: undefined,
            hasMore: false,
          };
        }
      }

      this.logger.warn(
        {
          path,
          responseType: typeof response,
          hasLength: response?.length !== undefined,
          hasData: response?.data !== undefined,
        },
        'Unexpected pagination response format'
      );

      return {
        data: [],
        nextCursor: undefined,
        hasMore: false,
      };
    } catch (error) {
      this.logger.error(
        {
          path,
          params,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to fetch page'
      );
      throw error;
    }
  }

  async fetchAll<T>(path: string, options: PaginationOptions = {}): Promise<PaginatedResult<T>> {
    const {
      limit = 50,
      cursor: initialCursor,
      autoPaginate = false,
      maxPages = 10,
      maxItems = 1000,
      queryParams = {},
    } = options;

    let allData: T[] = [];
    let currentCursor = initialCursor;
    let pagesFetched = 0;
    let totalFetched = 0;

    this.logger.debug(
      {
        path,
        autoPaginate,
        limit,
        maxPages,
        maxItems,
        queryParams,
      },
      'Starting pagination fetch'
    );

    while (pagesFetched < maxPages && totalFetched < maxItems) {
      const params: Record<string, any> = {
        ...queryParams,
        limit,
      };
      if (currentCursor) {
        params.cursor = currentCursor;
      }

      const page = await this.fetchPage<T>(path, params);

      if (!page.data || page.data.length === 0) {
        this.logger.debug({ pagesFetched, totalFetched }, 'No more data to fetch');
        break;
      }

      allData = allData.concat(page.data);
      totalFetched += page.data.length;
      pagesFetched += 1;

      this.logger.debug(
        {
          pagesFetched,
          totalFetched,
          pageSize: page.data.length,
          hasMore: page.hasMore,
        },
        'Fetched page'
      );

      if (!autoPaginate) {
        // Return first page only
        return {
          data: page.data,
          nextCursor: page.nextCursor,
          totalFetched: page.data.length,
          pagesFetched: 1,
        };
      }

      if (!page.hasMore || !page.nextCursor) {
        this.logger.debug({ pagesFetched, totalFetched }, 'Reached end of data');
        break;
      }

      currentCursor = page.nextCursor;

      // Respect item limit
      if (totalFetched >= maxItems) {
        this.logger.debug({ totalFetched, maxItems }, 'Reached maximum items limit');
        allData = allData.slice(0, maxItems);
        break;
      }
    }

    if (pagesFetched >= maxPages) {
      this.logger.warn({ pagesFetched, maxPages }, 'Reached maximum pages limit');
    }

    return {
      data: allData,
      nextCursor: currentCursor,
      totalFetched,
      pagesFetched,
    };
  }
}

// Helper function to create pagination params
export function createPaginationParams(options: PaginationOptions = {}): Record<string, any> {
  const params: Record<string, any> = {};

  if (options.limit !== undefined) {
    params.limit = options.limit;
  }

  if (options.cursor !== undefined) {
    params.cursor = options.cursor;
  }

  return params;
}

// Helper to extract pagination info from query
export function extractPaginationFromQuery(query: any = {}): PaginationOptions {
  return {
    limit: query.limit,
    cursor: query.cursor,
    autoPaginate: query.autoPaginate || false,
  };
}
