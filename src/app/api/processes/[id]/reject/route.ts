import { z } from 'zod';
import { route } from '@/server/http';
import { rejectProposal } from '@/server/services/processes';

const schema = z.object({ reason: z.string().trim().max(1000).optional() });

export const POST = route<z.infer<typeof schema>, { id: string }>(
  { role: 'alumni', body: schema },
  async ({ user, body, params }) => {
    await rejectProposal(user, params.id, body.reason);
  }
);
