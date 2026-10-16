import { route } from '@/server/http';
import { listCvs } from '@/server/services/cvs';

export const GET = route({ role: 'alumni' }, async ({ user }) => ({ cvs: await listCvs(user.id) }));
