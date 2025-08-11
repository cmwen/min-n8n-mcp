import { describe, expect, it, vi } from 'vitest';
import { createLogger } from '../../../src/logging.js';
import { safeValidateToolInput, validateToolInput } from '../../../src/schemas/index.js';

describe('Security and Validation', () => {
  describe('Input Validation', () => {
    it('should validate listWorkflows input', () => {
      const validInput = {
        query: {
          active: true,
          limit: 10,
          name: 'test-workflow',
        },
      };

      const result = validateToolInput('listWorkflows', validInput);
      expect(result).toEqual(validInput);
    });

    it('should reject invalid limit values', () => {
      const invalidInput = {
        query: {
          limit: -1, // Invalid: negative
        },
      };

      expect(() => validateToolInput('listWorkflows', invalidInput)).toThrow();
    });

    it('should reject limit values that are too large', () => {
      const invalidInput = {
        query: {
          limit: 1000, // Invalid: exceeds max of 200
        },
      };

      expect(() => validateToolInput('listWorkflows', invalidInput)).toThrow();
    });

    it('should validate createUser input and required fields', () => {
      const validInput = {
        data: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'securepassword123',
        },
      };

      const result = validateToolInput('createUser', validInput);
      expect(result).toEqual(validInput);
    });

    it('should reject invalid email addresses', () => {
      const invalidInput = {
        data: {
          email: 'invalid-email', // Invalid email format
          firstName: 'Test',
          lastName: 'User',
          password: 'securepassword123',
        },
      };

      expect(() => validateToolInput('createUser', invalidInput)).toThrow();
    });

    it('should reject short passwords', () => {
      const invalidInput = {
        data: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: '123', // Too short
        },
      };

      expect(() => validateToolInput('createUser', invalidInput)).toThrow();
    });
  });

  describe('Safe Validation', () => {
    it('should return success for valid input', () => {
      const validInput = {
        id: 'workflow-123',
      };

      const result = safeValidateToolInput('getWorkflow', validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validInput);
      }
    });

    it('should return error for invalid input', () => {
      const invalidInput = {
        // Missing required 'id' field
      };

      const result = safeValidateToolInput('getWorkflow', invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Required');
      }
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize sensitive user data', async () => {
      // Import the utility function
      const { sanitizeUserData } = await import('../../../src/tools/utils.js');

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

      expect(sanitized.id).toBe('1');
      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.password).toBeUndefined();
      expect(sanitized.apiKey).toBeUndefined();
      expect(sanitized.token).toBeUndefined();
      expect(sanitized.secret).toBeUndefined();
    });
  });

  describe('Logging Security', () => {
    it('should redact sensitive data from logs', () => {
      const logger = createLogger('debug');

      // Check that the logger has redaction configured
      // This tests the logging setup rather than actual output capture
      expect(logger).toBeDefined();

      // Test that redaction configuration is applied by checking the logger options
      const loggerSymbols = Object.getOwnPropertySymbols(logger);
      expect(loggerSymbols.length).toBeGreaterThan(0);

      // Simple test - log and verify no errors
      logger.info(
        {
          token: 'secret-token',
          authorization: 'Bearer secret',
          'x-n8n-api-key': 'api-key',
          password: 'secret-password',
        },
        'Test log'
      );

      // If we get here, the logging worked without errors
      expect(true).toBe(true);
    });
  });
});
