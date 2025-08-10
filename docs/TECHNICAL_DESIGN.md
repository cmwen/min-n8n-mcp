# Technical Design: Local n8n MCP Server

## Communication Modes: STDIO and HTTP

The MCP server must support two modes of operation:

- **STDIO Mode (default):** The server communicates via standard input/output streams, suitable for agent/LLM integration and CLI usage. This is the default mode for production and agent scenarios.
- **HTTP Mode:** The server exposes an HTTP endpoint (e.g., localhost:port) for local development, debugging, and compatibility with tools like MCP Inspector. HTTP mode can be enabled via CLI flag or environment variable.

**Mode selection:**
- By default, the server starts in STDIO mode.
- To enable HTTP mode, use a CLI flag (e.g., `--http` or `--http-port <port>`) or set an environment variable (e.g., `MCP_HTTP_PORT`).
- Only one mode is active at a time.

**MCP Inspector compatibility:**
- HTTP mode must be compatible with MCP Inspector, supporting tool discovery, invocation, and schema introspection over HTTP.

**Implementation notes:**
- The MCP SDK (`@modelcontextprotocol/sdk`) provides both STDIO and HTTP server adapters. The CLI entrypoint selects the appropriate adapter based on flags/env.

**Testing:**
- Include integration tests for both modes, ensuring tool registration, invocation, and error handling work identically.


## Overview

This document translates the PRD into a concrete technical design for a local MCP (Model Context Protocol) server that exposes n8n workflow management via tools callable by LLMs or agents. It covers architecture, module layout, tool schemas, HTTP mappings, configuration, error handling, security, testing, build/release, and known gaps requiring clarification.

Scope: Deliver a TypeScript-based MCP server, distributed via npm (runnable with `npx min-n8n-mcp`), that proxies to a local/remote n8n REST API using an API key. No persistent state is stored.


## Goals and Non-Goals

Goals
- Provide a stable MCP server exposing tools mapped to n8n REST endpoints in `docs/openapi.yml`.
- Allow configuration via env vars (N8N_API_URL, N8N_API_TOKEN) and CLI flags.
- Include robust error mapping, retries, pagination support, and input validation.
- Keep implementation small, maintainable, and testable.

Non-Goals
- Implement an n8n server—this project is a thin, typed proxy.
- Store user data or secrets persistently.
- Provide a UI; interaction is via MCP tools only.


## Assumptions and Clarifications Needed

Assumptions
- Node.js >= 18 (built-in fetch/WHATWG streams are available) and pnpm for development.
- The target n8n instance follows the paths in `openapi.yml`, with API key auth via `X-N8N-API-KEY`.
- Rate limits are modest; local use primary. We still add conservative backoff and concurrency caps.

Clarifications needed
1. runWorkflow: PRD lists `runWorkflow(id, input?)` but `openapi.yml` has no execution-create endpoint. How should executions be started? Options:
   - A) POST /executions with `workflowId` and `input` (common pattern, but missing from spec)
   - B) POST /workflows/{id}/run
   - C) Other endpoint (please specify)
2. getWorkflowStats: Not present in `openapi.yml`. Should we compute stats client-side from `/executions` filtered by `workflowId` (windowed, aggregated), or does an endpoint exist?
3. Filtering fields: PRD mentions filters (active, tags, name, projectId, status). Please confirm available query params for each list endpoint (workflows, executions, users, tags, projects, variables) beyond `limit`/`cursor`.
4. Pagination: For `cursor`-based pagination, is `cursor` opaque? Should we expose `autoPaginate` to return a merged list or return raw pages only?
5. Source Control: Any way to detect feature availability/licensing before calling `/source-control/pull`? If not, should we attempt and surface 403 distinctly?
6. Roles & permissions: Confirm allowed values for roles (global and per-project) for `changeUserRole` and `changeUserRoleInProject`.
7. Project/user APIs: Confirm request/response shapes for `/projects/{projectId}/users` POST and `/projects/{projectId}/users/{userId}` PATCH (role change body) since schemas are omitted.
8. Credential transfer: Spec lists `/credentials/{id}/transfer` under tag "Workflow"; confirm it’s correct and expected payload shape.
9. Error shapes: `components/schemas/error` is referenced but not defined. Provide canonical error response to improve mapping.
10. Tag format: For `updateWorkflowTags`, confirm the payload is a list of tag IDs (string[]) vs objects; clarify type of tag identifier.


## High-Level Architecture


- CLI (`commander`) launches the MCP server in STDIO (default) or HTTP mode.
- MCP Server registers tool methods with JSON Schema validation (zod schemas compiled to JSON Schema or handcrafted minimal schemas).
- HTTP Client module handles auth, retries, rate limiting, and error normalization.
- Resource clients wrap n8n endpoints (workflows, executions, credentials, tags, users, variables, projects, audit, source control).
- Tool handlers adapt MCP tool input/output to resource client calls.
- Optional in-memory cache (TTL) for low-churn metadata (e.g., credential type schemas, tag lists) to reduce calls.

Text diagram

CLI (STDIO or HTTP) -> MCP Server -> Tools -> Resource Clients -> HTTP Client -> n8n API


## Module Structure (proposed)

- src/
  - cli.ts — entrypoint; parses env/flags; starts server
  - server.ts — MCP server bootstrap and tool registry
  - http/
    - client.ts — fetch wrapper with base URL, headers, retries, timeouts
    - errors.ts — error classes and mapping (HTTP -> MCP errors)
    - rateLimit.ts — Bottleneck wrapper for concurrency (optional)
  - resources/
    - workflows.ts
    - executions.ts
    - credentials.ts
    - tags.ts
    - users.ts
    - variables.ts
    - projects.ts
    - audit.ts
    - sourceControl.ts
  - tools/
    - workflows.ts
    - executions.ts
    - credentials.ts
    - tags.ts
    - users.ts
    - variables.ts
    - projects.ts
    - audit.ts
    - sourceControl.ts
  - schemas/ — zod schemas for tool inputs/outputs
  - config.ts — reads env and flags, validates config
  - logging.ts — structured logging (pino or console wrapper) with redaction
  - util/
    - pagination.ts — cursor handling, auto-paginate helpers
    - cache.ts — simple in-memory TTL cache

- test/ — unit tests for tools and clients (vitest)


## Configuration

Environment variables
- N8N_API_URL: Base URL for n8n (e.g., http://localhost:5678/api/v1). If value is the server root (e.g., http://localhost:5678), we append `/api/v1`.
- N8N_API_TOKEN: n8n API key used as `X-N8N-API-KEY`.
- LOG_LEVEL: debug|info|warn|error (default: info).
- HTTP_TIMEOUT_MS: default 30_000.
- HTTP_RETRIES: default 2 (in addition to first try, total 3 attempts).
- CONCURRENCY: default 4 for concurrent HTTP requests.

CLI flags (override env)
- --url <string>
- --token <string>
- --log-level <level>
- --timeout <ms>
- --retries <n>
- --concurrency <n>

Validation: `config.ts` validates presence of URL and token at startup; friendly error if missing.


## HTTP Client

- Uses global fetch (Node >=18) or `undici` explicitly if needed.
- Adds `X-N8N-API-KEY` header and `Content-Type: application/json` as appropriate.
- Retries idempotent requests on transient failures (5xx, network errors) with exponential backoff (200ms, 500ms, 1s jitter). Non-idempotent requests retry only on network errors unless explicitly safe.
- Timeouts per request; abort via AbortController.
- Normalizes and throws `HttpError` with:
  - status: number
  - code: string | undefined (from body if provided)
  - message: string
  - details: any (raw response body)


## Tool API and JSON Schemas

Tools expose typed inputs/outputs using JSON Schema to the MCP runtime. Where OpenAPI lacks schemas, we use permissive `object` types with documented fields and validation of required keys (id, projectId, etc.).

Example tool schema (listWorkflows)

```ts
// zod schema (compiled to JSON Schema for MCP registry)
const ListWorkflowsInput = z.object({
  query: z
    .object({
      active: z.boolean().optional(),
      name: z.string().optional(),
      tag: z.union([z.string(), z.array(z.string())]).optional(),
      projectId: z.string().optional(),
      limit: z.number().int().positive().max(200).optional(),
      cursor: z.string().optional(),
      autoPaginate: z.boolean().optional(),
    })
    .optional(),
});
```

Output schemas are `unknown` by default unless we derive types from OpenAPI. Where valuable, we add partial typing (e.g., `id`, `name`, `active`).


## Tool-to-HTTP Mapping

Workflow Tools
- listWorkflows(query?) -> GET /workflows with query params (active?, cursor?).
- getWorkflow(id) -> GET /workflows/{id} (optional `excludePinnedData`).
- createWorkflow(data) -> POST /workflows.
- updateWorkflow(id, data) -> PUT /workflows/{id}.
- deleteWorkflow(id) -> DELETE /workflows/{id}.
- activateWorkflow(id) -> POST /workflows/{id}/activate.
- deactivateWorkflow(id) -> POST /workflows/{id}/deactivate.
- runWorkflow(id, input?) -> MISSING IN SPEC — see Clarifications.
- getWorkflowTags(id) -> GET /workflows/{id}/tags.
- updateWorkflowTags(id, tags) -> PUT /workflows/{id}/tags with body (array of tag IDs?).
- transferWorkflow(id, projectId) -> PUT /workflows/{id}/transfer with body { projectId }.
- getWorkflowStats(id) -> NOT IN SPEC — see Clarifications; client-side aggregate from `/executions` if approved.

Execution Tools
- listExecutions(query?) -> GET /executions (includeData?, cursor?).
- getExecution(id) -> GET /executions/{id} (includeData?).
- deleteExecution(id) -> DELETE /executions/{id}.

Credential Tools
- createCredential(data) -> POST /credentials.
- deleteCredential(id) -> DELETE /credentials/{id}.
- getCredentialType(credentialTypeName) -> GET /credentials/schema/{credentialTypeName}.
- transferCredential(id, projectId) -> PUT /credentials/{id}/transfer with body { projectId }.

Tag Tools
- createTag(data) -> POST /tags.
- listTags(query?) -> GET /tags (limit?, cursor?).
- getTag(id) -> GET /tags/{id}.
- updateTag(id, data) -> PUT /tags/{id}.
- deleteTag(id) -> DELETE /tags/{id}.

User Tools
- listUsers(query?) -> GET /users (limit?).
- createUser(data) -> POST /users.
- getUser(id) -> GET /users/{id} (id can be email; includeRole?).
- deleteUser(id) -> DELETE /users/{id}.
- changeUserRole(id, role) -> PATCH /users/{id}/role with body { role }.

Variable Tools
- createVariable(data) -> POST /variables.
- listVariables(query?) -> GET /variables (limit?, cursor?).
- updateVariable(id, data) -> PUT /variables/{id}.
- deleteVariable(id) -> DELETE /variables/{id}.

Project Tools
- createProject(data) -> POST /projects.
- listProjects(query?) -> GET /projects (limit?, cursor?).
- updateProject(id, data) -> PUT /projects/{projectId}.
- deleteProject(id) -> DELETE /projects/{projectId}.
- addUsersToProject(projectId, users) -> POST /projects/{projectId}/users with body (array of user descriptors).
- deleteUserFromProject(projectId, userId) -> DELETE /projects/{projectId}/users/{userId}.
- changeUserRoleInProject(projectId, userId, role) -> PATCH /projects/{projectId}/users/{userId} with body { role }.

Audit Tools
- generateAudit(data?) -> POST /audit (no body or optional options).

Source Control Tools
- pullSourceControl(data?) -> POST /source-control/pull (options?).

Notes
- Many parameter schemas are omitted in `openapi.yml` (placeholders). For initial implementation, treat request/response bodies as `unknown`/`any` at runtime, passing them through transparently. Improve typing if/when a fuller OpenAPI is available.


## Pagination Strategy

- Default: Return one page as provided by the API, including any `cursor` for the next page.
- Optional: `autoPaginate` flag triggers iterative fetch until completion or `limit` cap is reached; returns a combined array and final cursor.
- Implementation via util/pagination.ts with guardrails to avoid unbounded fetches (max pages, max items).


## Error Handling

- HTTP -> MCP mapping:
  - 400 BadRequest -> InvalidArgument
  - 401 Unauthorized -> PermissionDenied (auth)
  - 403 Forbidden -> PermissionDenied (authorization)
  - 404 NotFound -> NotFound
  - 409 Conflict -> FailedPrecondition
  - 5xx -> Unavailable (retryable)
- Include `status`, `message`, `code` (if provided), and server `details` in `data` field of MCP error for debugging.
- Redact secrets from error messages and logs (API token, Authorization headers, credentials in payloads where feasible).


## Retries, Concurrency, and Timeouts

- Exponential backoff with jitter for retryable errors.
- Abortable fetches with per-request timeout.
- Global concurrency limiter (e.g., 4) to prevent local resource exhaustion.


## Caching

- In-memory TTL cache (e.g., 60s default) for low-volatility endpoints: credential type schema, tags list.
- Cache key includes base URL to avoid cross-environment bleed.
- Allow disabling cache via env/flag.


## Security Considerations

- API token loaded from env/flags only; not persisted.
- Redact token from logs; structured logging with redaction list.
- HTTPS recommended for remote URLs; allow HTTP for local dev.
- Avoid logging full request/response bodies for endpoints likely to contain secrets (credentials, variables); log metadata only.
- Optionally validate URLs to prevent SSRF (restrict to allowlist/domains via env flag if desired in future).


## Logging & Observability

- Structured logs (JSON) with levels.
- Request logging: method, path, status, duration, retry count; omit bodies by default.
- Error logs include status and a short code; detailed body in debug mode only.


## CLI Design


- `npx min-n8n-mcp` starts the server in STDIO mode by default.
- To enable HTTP mode, use `--http` or `--http-port <port>` (or set `MCP_HTTP_PORT`).
- Optional subcommand `--print-config` dumps validated config (redacted token) for debugging.
- Fails fast if config invalid.
- Outputs startup banner: version, base URL, enabled tools, and active mode (STDIO or HTTP).


## Testing Strategy

- Unit tests (vitest):
  - http/client retry/backoff and error mapping
  - tools input validation and basic happy paths (mock HTTP)
- Integration tests: optional Docker-based local n8n or mocked endpoints covering a subset of flows (create/delete workflow, list executions, tag updates).
- Contract tests (future): if full OpenAPI becomes available, generate types and validate roundtrips.


## Build & Release

- TypeScript + tsup for bundling a single ESM/CJS entry if needed.
- pnpm scripts: build, lint (biome), test (vitest), prepare (husky), release (npm publish).
- Biome for lint/format; pre-commit hook for staged files.
- GitHub Actions:
  - CI: pnpm install, build, lint, test on Node 18 and 20.
  - Release: tag-triggered publish to npm with provenance; generate changelog via conventional commits.


## Implementation Plan (MVP)


1. Bootstrap repo: package.json, tsconfig, pnpm-lock, biome config, husky hooks.
2. Implement config.ts with env/flag parsing and validation.
3. HTTP client with retries, timeout, and basic error mapping.
4. Resource clients for each surface (pass-through typing initially).
5. MCP server: register tools and wire to resource clients; JSON Schemas.
6. CLI entry to launch server, supporting both STDIO (default) and HTTP mode (via flag/env).
7. Minimal tests for client and a couple of tools; integration tests for both STDIO and HTTP modes.
8. Docs: README with usage, environment, and mode selection; update this design as APIs clarify.


## Example Flows

- Activate a workflow
  - Tool: `activateWorkflow({ id })`
  - HTTP: POST /workflows/{id}/activate
  - Success: 200; body forwarded to caller
  - Errors: 404 if id not found, 403 if not authorized

- List executions with pagination
  - Tool: `listExecutions({ query: { limit: 50, cursor, autoPaginate: false } })`
  - HTTP: GET /executions?limit=50&cursor=...
  - Response: execution list and next cursor if present


## Risks and Mitigations

- Incomplete OpenAPI schemas: Use permissive typing initially; add zod validators for critical fields (ids, role strings).
- Missing run/stats endpoints: Require clarification; implement client-side alternatives where acceptable.
- Backward-compat changes in n8n: Keep mapping thin; add feature flags and version detection if needed.


## OpenAPI Gaps and Inconsistencies

- Many `$ref` placeholders lack concrete schemas (e.g., `credential`, `user`, `error`).
- Some parameters only list names without types/locations (e.g., `limit`, `cursor`).
- `transferCredential` tagged under Workflow; should be Credential.
- Missing endpoint(s) for creating executions (`runWorkflow`).
- No explicit shapes for project-user management payloads.

We can proceed with best-effort pass-through and surface clear errors until spec is completed.


## Future Enhancements

- Type generation from a complete OpenAPI via `openapi-typescript` for end-to-end typing.
- Persistent caching layer with ETag/If-None-Match if API supports it.
- Bulk operations convenience tools (e.g., delete all failed executions older than N days).
- Streaming execution logs (if/when n8n exposes such APIs).
- Pluggable auth mechanisms beyond API key (if n8n adds OAuth/session tokens in future).


## Appendix: Sample Tool Registration (sketch)

```ts
import { Server } from '@modelcontextprotocol/sdk/server';
import { z } from 'zod';
import { toJsonSchema } from 'zod-to-json-schema';
import { listWorkflows } from './tools/workflows';

const ListWorkflowsInput = z.object({
  query: z
    .object({
      active: z.boolean().optional(),
      name: z.string().optional(),
      tag: z.union([z.string(), z.array(z.string())]).optional(),
      projectId: z.string().optional(),
      limit: z.number().int().positive().max(200).optional(),
      cursor: z.string().optional(),
      autoPaginate: z.boolean().optional(),
    })
    .optional(),
});

type ListWorkflowsInput = z.infer<typeof ListWorkflowsInput>;

export function register(server: Server) {
  server.tool('listWorkflows', {
    description: 'Lists n8n workflows',
    inputSchema: toJsonSchema(ListWorkflowsInput) as any,
    async handler(input: ListWorkflowsInput) {
      return listWorkflows(input.query);
    },
  });
}
```


---

End of technical design. Please review “Clarifications needed” to unblock final tool definitions for runWorkflow and getWorkflowStats, and to confirm payload shapes for project/user operations.
