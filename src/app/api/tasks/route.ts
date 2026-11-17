import { created, route } from '@/server/http';
import { createTask, listTasks, taskInputSchema } from '@/server/services/tasks';

export const GET = route({ role: 'admin' }, async () => ({ tasks: await listTasks() }));

export const POST = route({ role: 'admin', body: taskInputSchema }, async ({ body }) =>
  created({ task: await createTask(body) })
);
