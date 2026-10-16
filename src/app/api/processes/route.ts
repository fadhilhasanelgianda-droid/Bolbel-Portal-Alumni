import { created, route } from '@/server/http';
import { createProposal, listProcesses, proposalSchema } from '@/server/services/processes';

export const GET = route({}, async ({ user }) => ({ processes: await listProcesses(user) }));

/** Admin proposes a job to an alumnus (waits for their consent). */
export const POST = route({ role: 'admin', body: proposalSchema }, async ({ user, body }) =>
  created(await createProposal(user, body))
);
