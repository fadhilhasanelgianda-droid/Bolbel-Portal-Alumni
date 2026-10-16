import { route } from '@/server/http';
import { getProfile, profileInputSchema, upsertProfile } from '@/server/services/profiles';

export const GET = route({ role: 'alumni' }, async ({ user }) => ({ profile: await getProfile(user.id) }));

export const PUT = route({ role: 'alumni', body: profileInputSchema }, async ({ user, body }) => ({
  profile: await upsertProfile(user.id, body),
}));
