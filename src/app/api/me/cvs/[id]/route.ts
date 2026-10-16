import { route } from '@/server/http';
import { deleteCv, setActiveCv } from '@/server/services/cvs';

type P = { id: string };

/** Marks this CV as the active one. */
export const PATCH = route<undefined, P>({ role: 'alumni' }, async ({ user, params }) => {
  await setActiveCv(user.id, params.id);
});

export const DELETE = route<undefined, P>({ role: 'alumni' }, async ({ user, params }) => {
  await deleteCv(user.id, params.id);
});
