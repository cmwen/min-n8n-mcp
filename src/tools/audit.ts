import type { ToolInputs } from '../schemas/index.js';
import type { ToolRegistry } from './registry.js';
import { createTool } from './registry.js';

export async function registerAuditTools(registry: ToolRegistry): Promise<void> {
  registry.register(
    createTool(
      'generateAudit',
      'Generate audit logs and reports for system activities and changes',
      async (input: ToolInputs['generateAudit'], context) => {
        const auditReport = await context.resources.audit.generate(input.data as any);

        context.logger.info(
          {
            reportType: auditReport.type,
            entryCount: auditReport.entries?.length || 0,
            generatedAt: auditReport.generatedAt,
          },
          'Generated audit report'
        );

        return {
          report: auditReport,
          message: 'Audit report generated successfully',
        };
      }
    )
  );
}
