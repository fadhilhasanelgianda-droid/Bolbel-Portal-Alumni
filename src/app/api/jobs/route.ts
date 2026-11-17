import { created, route } from '@/server/http';
import { createJob, jobInputSchema, listJobs } from '@/server/services/jobs';

export const GET = route({}, async ({ user }) => ({ jobs: await listJobs(user) }));

export const POST = route({ role: 'admin', body: jobInputSchema }, async ({ body }) =>
  created({ job: await createJob(body) })
);
