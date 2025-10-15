import type { ToolInputs } from '../schemas/index.js';
import type { ToolRegistry } from './registry.js';
import { createTool } from './registry.js';

export async function registerCredentialTools(registry: ToolRegistry): Promise<void> {
  registry.register(
    createTool(
      'createCredential',
      'Create a new credential for authenticating with external services',
      async (input: ToolInputs['createCredential'], context) => {
        const credential = await context.resources.credentials.create(input.data);

        context.logger.info(
          {
            credentialId: credential.id,
            name: credential.name,
            type: credential.type,
          },
          'Created credential'
        );

        return credential;
      }
    )
  );

  registry.register(
    createTool(
      'deleteCredential',
      'Delete a credential permanently',
      async (input: ToolInputs['deleteCredential'], context) => {
        await context.resources.credentials.delete(input.id);

        context.logger.info({ credentialId: input.id }, 'Deleted credential');

        return {
          success: true,
          credentialId: input.id,
          message: 'Credential deleted successfully',
        };
      }
    )
  );

  registry.register(
    createTool(
      'getCredentialType',
      'Get the schema and configuration options for a credential type',
      async (input: ToolInputs['getCredentialType'], context) => {
        const schema = await context.resources.credentials.getTypeSchema(input.credentialTypeName);

        context.logger.info(
          {
            credentialTypeName: input.credentialTypeName,
          },
          'Retrieved credential type schema'
        );

        return {
          credentialTypeName: input.credentialTypeName,
          schema,
        };
      }
    )
  );

  registry.register(
    createTool(
      'transferCredential',
      'Transfer a credential to a different project',
      async (input: ToolInputs['transferCredential'], context) => {
        await context.resources.credentials.transfer(input.id, input.projectId);

        context.logger.info(
          {
            credentialId: input.id,
            targetProjectId: input.projectId,
          },
          'Transferred credential'
        );

        return {
          success: true,
          credentialId: input.id,
          projectId: input.projectId,
          message: 'Credential transferred successfully',
        };
      }
    )
  );
}
