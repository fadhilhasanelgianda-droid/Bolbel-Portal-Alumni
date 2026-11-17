import { route } from '@/server/http';
import { listEvents } from '@/server/services/processes';

export const GET = route<undefined, { id: string }>({}, async ({ user, params }) => ({
  events: await listEvents(user, params.id),
}));
