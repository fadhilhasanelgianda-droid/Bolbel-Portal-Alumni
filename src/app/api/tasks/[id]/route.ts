import { z } from 'zod';
import { route } from '@/server/http';
import { setTaskCompleted, taskStatusSchema } from '@/server/services/tasks';

export const PATCH = route<z.infer<typeof taskStatusSchema>, { id: string }>(
  { role: 'admin', body: taskStatusSchema },
  async ({ body, params }) => ({ task: await setTaskCompleted(params.id, body.completed) })
);
