import { z } from 'zod';
import { route } from '@/server/http';
import { stageUpdateSchema, updateStage } from '@/server/services/processes';

export const POST = route<z.infer<typeof stageUpdateSchema>, { id: string }>(
  { role: 'admin', body: stageUpdateSchema },
  async ({ user, body, params }) => {
    await updateStage(user, params.id, body);
  }
);
