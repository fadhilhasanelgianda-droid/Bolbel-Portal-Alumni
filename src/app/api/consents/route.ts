import { route } from '@/server/http';
import { listConsents } from '@/server/services/processes';

export const GET = route({}, async ({ user }) => ({ consents: await listConsents(user) }));
