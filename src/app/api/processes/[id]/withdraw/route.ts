import { z } from 'zod';
import { route } from '@/server/http';
import { reasonSchema, withdrawApplication } from '@/server/services/processes';

export const POST = route<z.infer<typeof reasonSchema>, { id: string }>(
  { role: 'alumni', body: reasonSchema },
  async ({ user, body, params }) => {
    await withdrawApplication(user, params.id, body.reason);
  }
);
