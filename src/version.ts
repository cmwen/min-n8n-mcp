import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let cachedVersion: string | undefined;

/**
 * Get the version from package.json
 * Caches the result for performance
 */
export function getVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    // Get the directory of this module
    const moduleDir = dirname(fileURLToPath(import.meta.url));

    // Try to find package.json - could be in parent (src) or grandparent (project root)
    // In built dist, it's one level up from dist/
    // In source src, it's one level up from src/
    const possiblePaths = [
      join(moduleDir, '../package.json'), // From dist/ or src/
      join(moduleDir, '../../package.json'), // From dist/subdir or src/subdir
    ];

    for (const pkgPath of possiblePaths) {
      try {
        const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkgJson.version) {
          cachedVersion = pkgJson.version as string;
          return cachedVersion;
        }
      } catch {
        // Try next path - continue to next iteration
      }
    }

    // Fallback if package.json not found
    return '0.1.0';
  } catch (_error) {
    // Fallback version if reading fails
    return '0.1.0';
  }
}
