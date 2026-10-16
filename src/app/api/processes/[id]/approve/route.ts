import { route } from '@/server/http';
import { approveProposal } from '@/server/services/processes';

export const POST = route<undefined, { id: string }>({ role: 'alumni' }, async ({ user, params }) => {
  await approveProposal(user, params.id);
});
