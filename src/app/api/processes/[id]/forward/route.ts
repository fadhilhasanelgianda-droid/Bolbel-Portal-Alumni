import { z } from 'zod';
import { route } from '@/server/http';
import { forwardSchema, forwardToCompany } from '@/server/services/processes';

export const POST = route<z.infer<typeof forwardSchema>, { id: string }>(
  { role: 'admin', body: forwardSchema },
  async ({ user, body, params }) => {
    await forwardToCompany(user, params.id, body);
  }
);
