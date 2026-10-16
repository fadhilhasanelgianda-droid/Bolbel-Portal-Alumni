import { created, route } from '@/server/http';
import { companyInputSchema, createCompany, listCompanies } from '@/server/services/companies';

// Companies carry internal PIC contacts and notes, so they are admin-only
export const GET = route({ role: 'admin' }, async () => ({ companies: await listCompanies() }));

export const POST = route({ role: 'admin', body: companyInputSchema }, async ({ body }) =>
  created({ company: await createCompany(body) })
);
