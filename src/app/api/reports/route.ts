import { route } from '@/server/http';
import { listReports } from '@/server/services/processes';

export const GET = route({}, async ({ user }) => ({ reports: await listReports(user) }));
