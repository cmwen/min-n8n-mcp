# Repository Guidelines

## Project Structure & Module Organization
- Core TypeScript lives in `src/`; `src/cli.ts` starts the CLI and `src/server.ts` boots the MCP server.
- HTTP adapters sit in `src/http/`, tools in `src/tools/`, resources in `src/resources/`, and Zod schemas in `src/schemas/`.
- Shared utilities belong in `src/util/`, logging logic in `src/logging.ts`, and prompts in `src/prompts/`.
- Tests are split between `test/unit/` and `test/integration/`, with shared setup in `test/setup.ts`.
- Documentation and design notes are in `docs/`; scripts lives under `scripts/`. Build output is emitted to `dist/` (never edit generated files).

## Build, Test, and Development Commands
- `pnpm dev` — Launches the CLI via tsx in HTTP mode on port 3000 for rapid feedback.
- `pnpm build` — Bundles sources with tsup into `dist/` and generates type declarations.
- `pnpm lint` / `pnpm lint:fix` — Runs Biome checks (optionally applying safe fixes).
- `pnpm type-check` — Executes `tsc --noEmit` for static typing assurance.
- `pnpm test:unit`, `pnpm test:integration`, `pnpm test:ci` — Run the Vitest suites; use `pnpm test:coverage` for full coverage metrics.

## Coding Style & Naming Conventions
- Use modern TypeScript with ES modules, `async`/`await`, and strict typing (no implicit `any`).
- Prefer two-space indentation, UpperCamelCase for classes, lowerCamelCase for variables/functions, and kebab-case for filenames.
- Keep shared schemas in `src/schemas/` named `<domain>.schema.ts`. Route logging updates through `src/logging.ts`.
- Biome enforces formatting; run `pnpm lint:fix` before committing format-heavy changes.

## Testing Guidelines
- Vitest powers unit and integration tests; add fixtures alongside tests under `test/`.
- Name tests `<subject>.test.ts`, mirroring the module under test (e.g., `test/unit/version.test.ts`).
- Ensure critical paths maintain coverage via `pnpm test:coverage` before release branches.
- Update `test/setup.ts` when adjusting global hooks or environment preparation.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (e.g., `feat:`, `fix:`, `chore:`) with imperative, descriptive summaries.
- Keep PRs scoped to a single tool or feature area; describe affected MCP components and list manual verification steps.
- Reference related issues, document configuration needs (e.g., `N8N_API_URL`, `N8N_API_TOKEN`), and attach payload samples or screenshots when helpful.

## Security & Configuration Tips
- Never commit real n8n tokens or secrets; store them in `.env.local` or shell exports.
- Default `MCP_MODE` is `intermediate`; document rationale before switching to `basic` or `advanced`.
- Redact sensitive data in logs and PR discussions; review `src/logging.ts` when adjusting log output.
