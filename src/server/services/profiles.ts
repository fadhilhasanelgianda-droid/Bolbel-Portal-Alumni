import { z } from 'zod';
import type { AlumniProfile } from '../../domain/types.ts';
import { query } from '../db.ts';
import { HttpError } from '../http.ts';
import { rowTo, rowsTo } from '../mappers.ts';
import type { Db } from './shared.ts';

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^https?:\/\/\S+$/.test(v), 'URL harus diawali http:// atau https://')
  .transform((v) => v || null)
  .nullish();

const list = (max: number) => z.array(z.string().trim().min(1).max(100)).max(max);

export const profileInputSchema = z.object({
  phone: z.string().trim().max(30).transform((v) => v || null).nullish(),
  whatsappContact: z.boolean(),
  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  employmentStatus: z.enum(['bekerja', 'belum_bekerja', 'tidak_disebutkan']),
  opennessStatus: z.enum(['aktif_mencari', 'terbuka', 'tidak_mencari', 'belum_dikonfirmasi']),
  startReadiness: z.enum(['segera', 'notice_period', 'tanggal', 'diskusi']),
  noticePeriodDays: z.number().int().min(0).max(365).nullish(),
  targetStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  targetRoles: list(10),
  targetWorkTypes: z.array(z.enum(['full_time', 'contract', 'internship', 'freelance', 'part_time'])).max(5),
  targetWorkModels: z.array(z.enum(['wfo', 'hybrid', 'remote'])).max(3),
  domicile: z.string().trim().max(100),
  targetLocations: list(10),
  experienceBand: z.enum(['<1_tahun', '1-2_tahun', '2-4_tahun', '>4_tahun']),
  allowProactiveContact: z.boolean(),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

// fullName / email / program / batch are owned by the roster, never taken from the client
const SELECT_PROFILE = `
  SELECT p.*, u.full_name, u.email, r.program, r.batch
    FROM alumni_profiles p
    JOIN users u ON u.id = p.user_id
    JOIN roster_entries r ON r.id = u.roster_id`;

export async function getProfile(userId: string, db: Db = { query } as Db): Promise<AlumniProfile | null> {
  const { rows } = await db.query(`${SELECT_PROFILE} WHERE p.user_id = $1`, [userId]);
  return rows[0] ? rowTo<AlumniProfile>(rows[0]) : null;
}

export async function listProfiles(): Promise<AlumniProfile[]> {
  const { rows } = await query(`${SELECT_PROFILE} ORDER BY u.full_name`);
  return rowsTo<AlumniProfile>(rows);
}

export async function upsertProfile(userId: string, input: ProfileInput): Promise<AlumniProfile> {
  await query(
    `INSERT INTO alumni_profiles
       (user_id, phone, whatsapp_contact, linkedin_url, portfolio_url, employment_status, openness_status,
        start_readiness, notice_period_days, target_start_date, target_roles, target_work_types,
        target_work_models, domicile, target_locations, experience_band, allow_proactive_contact)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     ON CONFLICT (user_id) DO UPDATE SET
       phone = EXCLUDED.phone, whatsapp_contact = EXCLUDED.whatsapp_contact,
       linkedin_url = EXCLUDED.linkedin_url, portfolio_url = EXCLUDED.portfolio_url,
       employment_status = EXCLUDED.employment_status, openness_status = EXCLUDED.openness_status,
       start_readiness = EXCLUDED.start_readiness, notice_period_days = EXCLUDED.notice_period_days,
       target_start_date = EXCLUDED.target_start_date, target_roles = EXCLUDED.target_roles,
       target_work_types = EXCLUDED.target_work_types, target_work_models = EXCLUDED.target_work_models,
       domicile = EXCLUDED.domicile, target_locations = EXCLUDED.target_locations,
       experience_band = EXCLUDED.experience_band, allow_proactive_contact = EXCLUDED.allow_proactive_contact,
       updated_at = now()`,
    [
      userId, input.phone ?? null, input.whatsappContact, input.linkedinUrl ?? null, input.portfolioUrl ?? null,
      input.employmentStatus, input.opennessStatus, input.startReadiness, input.noticePeriodDays ?? null,
      input.targetStartDate ?? null, input.targetRoles, input.targetWorkTypes, input.targetWorkModels,
      input.domicile, input.targetLocations, input.experienceBand, input.allowProactiveContact,
    ]
  );
  return (await getProfile(userId))!;
}

export async function confirmAvailability(userId: string): Promise<AlumniProfile> {
  const { rowCount } = await query(
    'UPDATE alumni_profiles SET availability_confirmed_at = now(), updated_at = now() WHERE user_id = $1',
    [userId]
  );
  if (!rowCount) throw new HttpError(404, 'Lengkapi profilmu terlebih dahulu.');
  return (await getProfile(userId))!;
}
