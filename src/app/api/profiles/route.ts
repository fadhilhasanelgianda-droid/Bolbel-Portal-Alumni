import { route } from '@/server/http';
import { listProfiles } from '@/server/services/profiles';

export const GET = route({ role: 'admin' }, async () => ({ profiles: await listProfiles() }));
