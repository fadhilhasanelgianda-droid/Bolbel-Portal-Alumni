import { z } from 'zod';
import { route } from '@/server/http';
import { reportReviewSchema, reviewReport } from '@/server/services/processes';

export const PATCH = route<z.infer<typeof reportReviewSchema>, { id: string }>(
  { role: 'admin', body: reportReviewSchema },
  async ({ user, body, params }) => ({ report: await reviewReport(user, params.id, body) })
);
