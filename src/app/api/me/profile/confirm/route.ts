import { route } from '@/server/http';
import { confirmAvailability } from '@/server/services/profiles';

export const POST = route({ role: 'alumni' }, async ({ user }) => ({ profile: await confirmAvailability(user.id) }));
