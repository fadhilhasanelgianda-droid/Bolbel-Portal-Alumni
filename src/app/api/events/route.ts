import { route } from '@/server/http';
import { listAllEvents } from '@/server/services/processes';

export const GET = route({}, async ({ user }) => ({ events: await listAllEvents(user) }));
