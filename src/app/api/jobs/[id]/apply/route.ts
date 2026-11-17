import { z } from 'zod';
import { created, route } from '@/server/http';
import { applyViaBolBel } from '@/server/services/processes';

const schema = z.object({ consentAccepted: z.boolean() });

export const POST = route<z.infer<typeof schema>, { id: string }>(
  { role: 'alumni', body: schema },
  async ({ user, body, params }) => created(await applyViaBolBel(user, params.id, body.consentAccepted))
);
