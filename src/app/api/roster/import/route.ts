import { route } from '@/server/http';
import { importRoster, rosterImportSchema } from '@/server/services/roster';

export const POST = route({ role: 'admin', body: rosterImportSchema }, async ({ body }) => importRoster(body));
