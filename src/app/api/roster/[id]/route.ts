import { z } from 'zod';
import { route } from '@/server/http';
import { eligibilitySchema, setEligibility } from '@/server/services/roster';

export const PATCH = route<z.infer<typeof eligibilitySchema>, { id: string }>(
  { role: 'admin', body: eligibilitySchema },
  async ({ body, params }) => {
    await setEligibility(params.id, body.eligibility);
  }
);
