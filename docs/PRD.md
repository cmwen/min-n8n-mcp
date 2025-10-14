
# Product Requirements Document: Local n8n MCP Server

## 1. Introduction & Vision

This document outlines the requirements for a local n8n MCP (Model Context Protocol) server. The project is an open-source, lightweight, and extensible bridge that allows Large Language Models (LLMs) and developers to programmatically interact with a local n8n instance.

The MCP server exposes a suite of tools for managing n8n workflows, leveraging the n8n REST API. It is designed for direct, function-based interaction, enabling AI agents to automate, query, and control n8n workflows locally.

## 2. Target Audience

- **Primary:** LLMs interacting via Model Context Protocol to automate and manage n8n workflows.
- **Secondary:** Developers and users who want to expose their local n8n instance to AI agents for workflow management.

## 3. Core Features (MVP)

### 3.1. Command-Line Interface (CLI)

- The tool is executable via `npx min-n8n-mcp`.
- The CLI starts the MCP server and configures the n8n API connection.

### 3.2. Environment-Based Configuration

- The n8n API URL and API token are provided via environment variables:
  - `N8N_API_URL`
  - `N8N_API_TOKEN`
- No data is stored locally; all operations are performed via the n8n API.

### 3.3. MCP Server & Tools

- The MCP server exposes tools for workflow management, mapped to n8n API endpoints.

## 4. MCP Tool Definitions (The API)

The MCP server registers and exposes the following tools:

### Workflow Tools
- `listWorkflows(query?: object)`: Lists all workflows, with optional filters (active, tags, name, projectId).
- `getWorkflow(id: string)`: Retrieves details of a specific workflow.
- `createWorkflow(data: object)`: Creates a new workflow.
- `updateWorkflow(id: string, data: object)`: Updates an existing workflow.
- `deleteWorkflow(id: string)`: Deletes a workflow.
- `activateWorkflow(id: string)`: Activates a workflow.
- `deactivateWorkflow(id: string)`: Deactivates a workflow.
- `getWorkflowTags(id: string)`: Gets tags for a workflow.
- `updateWorkflowTags(id: string, tags: string[])`: Updates tags for a workflow.
- `transferWorkflow(id: string, projectId: string)`: Transfers a workflow to another project.
- `getWorkflowStats(id: string)`: Retrieves execution statistics for a workflow.

> **Note:** The public n8n API does not expose an endpoint to start a workflow execution directly. Manual runs must be initiated via the workflow's trigger or the n8n UI.

### Execution Tools
- `listExecutions(query?: object)`: Lists all executions, with optional filters (status, workflowId, projectId).
- `getExecution(id: string)`: Retrieves details of a specific execution.
- `deleteExecution(id: string)`: Deletes an execution.

### Credential Tools
- `createCredential(data: object)`: Creates a credential.
- `deleteCredential(id: string)`: Deletes a credential.
- `getCredentialType(credentialTypeName: string)`: Gets credential data schema.
- `transferCredential(id: string, projectId: string)`: Transfers a credential to another project.

### Tag Tools
- `createTag(data: object)`: Creates a tag.
- `listTags(query?: object)`: Lists all tags.
- `getTag(id: string)`: Retrieves a tag.
- `updateTag(id: string, data: object)`: Updates a tag.
- `deleteTag(id: string)`: Deletes a tag.

### User Tools
- `listUsers(query?: object)`: Lists all users.
- `createUser(data: object)`: Creates one or more users.
- `getUser(id: string)`: Retrieves a user by ID or email.
- `deleteUser(id: string)`: Deletes a user.
- `changeUserRole(id: string, role: string)`: Changes a user's global role.

### Variable Tools
- `createVariable(data: object)`: Creates a variable.
- `listVariables(query?: object)`: Lists all variables.
- `updateVariable(id: string, data: object)`: Updates a variable.
- `deleteVariable(id: string)`: Deletes a variable.

### Project Tools
- `createProject(data: object)`: Creates a project.
- `listProjects(query?: object)`: Lists all projects.
- `updateProject(id: string, data: object)`: Updates a project.
- `deleteProject(id: string)`: Deletes a project.
- `addUsersToProject(projectId: string, users: object[])`: Adds users to a project.
- `deleteUserFromProject(projectId: string, userId: string)`: Removes a user from a project.
- `changeUserRoleInProject(projectId: string, userId: string, role: string)`: Changes a user's role in a project.

### Audit Tools
- `generateAudit(data?: object)`: Generates a security audit for the n8n instance.

### Source Control Tools
- `pullSourceControl(data?: object)`: Pulls changes from the remote repository (if licensed and connected).


## 5. Technology Stack

 **Language:** TypeScript
 **Server Protocol:** Model Context Protocol (MCP)
 **MCP SDK:** `@modelcontextprotocol/sdk`
 **n8n API:** REST API (requires `N8N_API_URL` and `N8N_API_TOKEN`)
 **CLI Builder:** `commander`
 **Package Manager:** pnpm
 **Linting & Formatting:** biome
 **Git Hooks:** husky
 **Commit Message Linting:** Conventional Commits
 **CI/CD:** GitHub Actions
 **Distribution:** Published to npm, runnable via npx
