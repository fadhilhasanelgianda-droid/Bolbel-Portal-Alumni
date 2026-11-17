import { route } from '@/server/http';
import { getJob } from '@/server/services/jobs';

export const GET = route<undefined, { id: string }>({}, async ({ user, params }) => ({
  job: await getJob(user, params.id),
}));
