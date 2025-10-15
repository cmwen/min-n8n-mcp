import { HttpError } from '../http/errors.js';
import type { Logger } from '../logging.js';

export interface ToolResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    message: string;
    code?: string;
    details?: any;
  };
}

export function formatSuccessResponse<T>(data: T): ToolResponse<T> {
  return {
    success: true,
    data,
  };
}

export function formatErrorResponse(error: unknown): ToolResponse {
  if (error instanceof HttpError) {
    return {
      success: false,
      error: {
        type: error.toMcpErrorType(),
        message: error.message,
        code: error.code,
        details: {
          status: error.status,
          ...(error.details && typeof error.details === 'object' ? error.details : {}),
        },
      },
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: {
        type: 'Unknown',
        message: error.message,
      },
    };
  }

  return {
    success: false,
    error: {
      type: 'Unknown',
      message: String(error),
    },
  };
}

export async function executeToolWithErrorHandling<T>(
  operation: () => Promise<T>,
  context: { logger: Logger },
  operationName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    context.logger.error(
      {
        operation: operationName,
        error: error instanceof Error ? error.message : String(error),
      },
      'Tool operation failed'
    );

    throw error; // Re-throw to let MCP handle it
  }
}

export function sanitizeUserData(user: any): any {
  if (!user || typeof user !== 'object') {
    return user;
  }

  const {
    password: _password,
    apiKey: _apiKey,
    token: _token,
    secret: _secret,
    ...sanitized
  } = user;
  return sanitized;
}

export function formatPaginationResponse<T>(
  data: T[],
  pagination: {
    totalFetched: number;
    pagesFetched: number;
    nextCursor?: string;
  }
) {
  return {
    data,
    pagination: {
      totalFetched: pagination.totalFetched,
      pagesFetched: pagination.pagesFetched,
      hasMore: !!pagination.nextCursor,
      nextCursor: pagination.nextCursor,
    },
  };
}
