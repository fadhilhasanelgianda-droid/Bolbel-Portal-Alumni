import { z } from 'zod';
import { created, route } from '@/server/http';
import { externalReportSchema, reportExternalApply } from '@/server/services/processes';

export const POST = route<z.infer<typeof externalReportSchema>, { id: string }>(
  { role: 'alumni', body: externalReportSchema },
  async ({ user, body, params }) => created(await reportExternalApply(user, params.id, body))
);
