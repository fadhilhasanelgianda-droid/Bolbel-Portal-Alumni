import { z } from 'zod';
import type { Company } from '../../domain/types.ts';
import { query } from '../db.ts';
import { rowTo, rowsTo } from '../mappers.ts';

const text = (max: number) => z.string().trim().max(max).transform((v) => v || null).nullish();

export const companyInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  industry: z.string().trim().min(1).max(200),
  websiteUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === '' || /^https?:\/\/\S+$/.test(v), 'URL harus diawali http:// atau https://')
    .transform((v) => v || null)
    .nullish(),
  relationshipSource: z.enum(['company_inbound', 'gifari_sourcing']),
  internalPicName: text(200),
  internalPicContact: text(300),
  internalNotes: text(2000),
});

export async function listCompanies(): Promise<Company[]> {
  const { rows } = await query('SELECT * FROM companies ORDER BY created_at DESC');
  return rowsTo<Company>(rows);
}

export async function createCompany(input: z.infer<typeof companyInputSchema>): Promise<Company> {
  const { rows } = await query(
    `INSERT INTO companies (name, industry, website_url, relationship_source, internal_pic_name, internal_pic_contact, internal_notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      input.name, input.industry, input.websiteUrl ?? null, input.relationshipSource,
      input.internalPicName ?? null, input.internalPicContact ?? null, input.internalNotes ?? null,
    ]
  );
  return rowTo<Company>(rows[0]);
}
