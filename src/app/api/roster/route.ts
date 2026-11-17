import { route } from '@/server/http';
import { listRoster } from '@/server/services/roster';

export const GET = route({ role: 'admin' }, async () => ({ roster: await listRoster() }));
