import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    index: 'src/server.ts',
  },
  format: ['esm'],
  target: 'node18',
  clean: true,
  sourcemap: true,
  dts: true,
  shims: true,
  splitting: false,
  bundle: true,
  minify: false,
  external: ['@modelcontextprotocol/sdk'],
});
