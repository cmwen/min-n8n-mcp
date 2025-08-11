import { describe, expect, it } from 'vitest';
import { HttpError } from '../../../src/http/errors.js';
import {
  formatErrorResponse,
  formatPaginationResponse,
  formatSuccessResponse,
  sanitizeUserData,
} from '../../../src/tools/utils.js';

describe('Tool Utils', () => {
  describe('formatSuccessResponse', () => {
    it('should format success response with data', () => {
      const data = { id: 1, name: 'test' };
      const result = formatSuccessResponse(data);

      expect(result).toEqual({
        success: true,
        data,
      });
    });

    it('should handle null data', () => {
      const result = formatSuccessResponse(null);

      expect(result).toEqual({
        success: true,
        data: null,
      });
    });
  });

  describe('formatErrorResponse', () => {
    it('should format HttpError', () => {
      const error = new HttpError(404, 'Not Found', 'RESOURCE_NOT_FOUND', { id: '123' });
      const result = formatErrorResponse(error);

      expect(result).toEqual({
        success: false,
        error: {
          type: 'NotFound',
          message: 'Not Found',
          code: 'RESOURCE_NOT_FOUND',
          details: {
            status: 404,
            id: '123',
          },
        },
      });
    });

    it('should format regular Error', () => {
      const error = new Error('Something went wrong');
      const result = formatErrorResponse(error);

      expect(result).toEqual({
        success: false,
        error: {
          type: 'Unknown',
          message: 'Something went wrong',
        },
      });
    });

    it('should format unknown error', () => {
      const error = 'String error';
      const result = formatErrorResponse(error);

      expect(result).toEqual({
        success: false,
        error: {
          type: 'Unknown',
          message: 'String error',
        },
      });
    });
  });

  describe('sanitizeUserData', () => {
    it('should remove sensitive fields', () => {
      const userData = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'secret123',
        apiKey: 'api-key-123',
        token: 'token-456',
        secret: 'secret-789',
      };

      const sanitized = sanitizeUserData(userData);

      expect(sanitized).toEqual({
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });
      expect(sanitized.password).toBeUndefined();
      expect(sanitized.apiKey).toBeUndefined();
      expect(sanitized.token).toBeUndefined();
      expect(sanitized.secret).toBeUndefined();
    });

    it('should handle non-object input', () => {
      expect(sanitizeUserData(null)).toBeNull();
      expect(sanitizeUserData(undefined)).toBeUndefined();
      expect(sanitizeUserData('string')).toBe('string');
      expect(sanitizeUserData(123)).toBe(123);
    });

    it('should handle object without sensitive fields', () => {
      const userData = {
        id: '1',
        name: 'Test',
        value: 'safe data',
      };

      const sanitized = sanitizeUserData(userData);
      expect(sanitized).toEqual(userData);
    });
  });

  describe('formatPaginationResponse', () => {
    it('should format pagination response with data', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = {
        totalFetched: 2,
        pagesFetched: 1,
        nextCursor: 'cursor123',
      };

      const result = formatPaginationResponse(data, pagination);

      expect(result).toEqual({
        data,
        pagination: {
          totalFetched: 2,
          pagesFetched: 1,
          hasMore: true,
          nextCursor: 'cursor123',
        },
      });
    });

    it('should handle no more pages', () => {
      const data = [{ id: 1 }];
      const pagination = {
        totalFetched: 1,
        pagesFetched: 1,
        nextCursor: undefined,
      };

      const result = formatPaginationResponse(data, pagination);

      expect(result).toEqual({
        data,
        pagination: {
          totalFetched: 1,
          pagesFetched: 1,
          hasMore: false,
          nextCursor: undefined,
        },
      });
    });

    it('should handle empty nextCursor', () => {
      const data: any[] = [];
      const pagination = {
        totalFetched: 0,
        pagesFetched: 1,
        nextCursor: '',
      };

      const result = formatPaginationResponse(data, pagination);

      expect(result.pagination.hasMore).toBe(false);
    });
  });
});
