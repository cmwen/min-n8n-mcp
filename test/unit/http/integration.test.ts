import { describe, it, expect } from 'vitest';
import { HttpClient } from '../../../src/http/client.js';
import { createLogger } from '../../../src/logging.js';
import { loadConfig } from '../../../src/config.js';

describe('HTTP Client Integration', () => {
  it('should create HTTP client from config', () => {
    const config = loadConfig({
      url: 'https://api.example.com',
      token: 'test-token',
    });
    
    const logger = createLogger('error');
    const client = HttpClient.fromConfig(config, logger);
    
    expect(client).toBeDefined();
    // Verify the client has the expected structure
    expect(typeof client.get).toBe('function');
    expect(typeof client.post).toBe('function');
    expect(typeof client.put).toBe('function');
    expect(typeof client.patch).toBe('function');
    expect(typeof client.delete).toBe('function');
  });
});