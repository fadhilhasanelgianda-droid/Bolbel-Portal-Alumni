import { route } from '@/server/http';
import { listAllCvs } from '@/server/services/cvs';

export const GET = route({ role: 'admin' }, async () => ({ cvs: await listAllCvs() }));
