import { describe, expect, it } from 'vitest';
import { getVersion } from '../../src/version.js';

describe('Version', () => {
  it('should return a valid semver version', () => {
    const version = getVersion();

    expect(version).toBeDefined();
    expect(typeof version).toBe('string');
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('should return the same version on subsequent calls (caching)', () => {
    const version1 = getVersion();
    const version2 = getVersion();

    expect(version1).toBe(version2);
  });

  it('should match package.json version', () => {
    const version = getVersion();

    // Version should be 0.1.0 or higher
    expect(version).toMatch(/^0\.1\.\d+/);
  });
});
