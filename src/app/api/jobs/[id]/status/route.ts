import { z } from 'zod';
import { route } from '@/server/http';
import { updateJobStatus } from '@/server/services/jobs';

const schema = z.object({
  status: z.enum(['draft', 'published', 'paused', 'closed', 'archived']),
  reason: z.string().trim().max(500).optional(),
});

export const PATCH = route<z.infer<typeof schema>, { id: string }>(
  { role: 'admin', body: schema },
  async ({ body, params }) => ({ job: await updateJobStatus(params.id, body.status, body.reason) })
);
