import { z } from 'zod';
import { canChangeJobStatus } from '../../domain/stateMachine.ts';
import type { Job, JobStatus } from '../../domain/types.ts';
import { query, tx } from '../db.ts';
import { HttpError } from '../http.ts';
import { rowTo, rowsTo } from '../mappers.ts';
import type { SessionUser } from '../auth.ts';

const lines = z.array(z.string().trim().min(1).max(500)).max(30);

export const jobInputSchema = z
  .object({
    companyId: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    summary: z.string().trim().min(1).max(2000),
    responsibilities: lines,
    requirements: lines,
    experienceLevel: z.enum(['fresh_graduate', 'junior', 'mid', 'senior']),
    workType: z.enum(['full_time', 'contract', 'internship', 'freelance', 'part_time']),
    workModel: z.enum(['wfo', 'hybrid', 'remote']),
    location: z.string().trim().min(1).max(200),
    openingsCount: z.number().int().min(1).max(1000),
    salaryType: z.enum(['range', 'uninformed', 'confidential']),
    salaryMin: z.number().int().min(0).nullish(),
    salaryMax: z.number().int().min(0).nullish(),
    salaryPeriod: z.enum(['bulan', 'tahun']).nullish(),
    applyChannel: z.enum(['bolbel', 'external']),
    externalApplyUrl: z
      .string()
      .trim()
      .max(1000)
      .regex(/^https?:\/\/\S+$/, 'URL harus diawali http:// atau https://')
      .nullish(),
    status: z.enum(['draft', 'published']).default('draft'),
    processOwner: z.string().trim().min(1).max(100),
    deadlineDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  })
  .superRefine((j, ctx) => {
    if (j.applyChannel === 'external' && !j.externalApplyUrl) {
      ctx.addIssue({ code: 'custom', path: ['externalApplyUrl'], message: 'URL lamaran eksternal wajib diisi.' });
    }
    if (j.salaryType === 'range') {
      if (j.salaryMin == null || j.salaryMax == null || j.salaryMin > j.salaryMax) {
        ctx.addIssue({ code: 'custom', path: ['salaryMin'], message: 'Rentang gaji tidak valid.' });
      }
    }
  });

const SELECT_JOB = `SELECT j.*, c.name AS company_name FROM jobs j JOIN companies c ON c.id = j.company_id`;

export async function listJobs(user: SessionUser): Promise<Job[]> {
  if (user.role === 'admin') {
    const { rows } = await query(`${SELECT_JOB} ORDER BY j.created_at DESC`);
    return rowsTo<Job>(rows);
  }
  // Alumni: published jobs, plus paused/closed/archived ones they already have a process on. Never drafts.
  const { rows } = await query(
    `${SELECT_JOB}
      WHERE j.status = 'published'
         OR (j.status <> 'draft' AND EXISTS (
              SELECT 1 FROM candidate_processes p WHERE p.job_id = j.id AND p.alumni_id = $1))
      ORDER BY j.published_at DESC NULLS LAST`,
    [user.id]
  );
  return rowsTo<Job>(rows);
}

export async function getJob(user: SessionUser, id: string): Promise<Job> {
  const job = (await listJobs(user)).find((j) => j.id === id);
  if (!job) throw new HttpError(404, 'Lowongan tidak ditemukan.');
  return job;
}

export async function createJob(input: z.infer<typeof jobInputSchema>): Promise<Job> {
  const company = await query('SELECT 1 FROM companies WHERE id = $1', [input.companyId]);
  if (!company.rowCount) throw new HttpError(400, 'Company tidak ditemukan.');
  const { rows } = await query(
    `INSERT INTO jobs
       (company_id, title, summary, responsibilities, requirements, experience_level, work_type, work_model,
        location, openings_count, salary_type, salary_min, salary_max, salary_period, apply_channel,
        external_apply_url, status, process_owner, deadline_date, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
             CASE WHEN $17 = 'published' THEN now() END)
     RETURNING id`,
    [
      input.companyId, input.title, input.summary, input.responsibilities, input.requirements,
      input.experienceLevel, input.workType, input.workModel, input.location, input.openingsCount,
      input.salaryType, input.salaryType === 'range' ? input.salaryMin : null,
      input.salaryType === 'range' ? input.salaryMax : null,
      input.salaryType === 'range' ? (input.salaryPeriod ?? 'bulan') : null,
      input.applyChannel, input.applyChannel === 'external' ? input.externalApplyUrl : null,
      input.status, input.processOwner, input.deadlineDate ?? null,
    ]
  );
  return rowTo<Job>((await query(`${SELECT_JOB} WHERE j.id = $1`, [rows[0].id])).rows[0]);
}

export async function updateJobStatus(id: string, next: JobStatus, reason?: string): Promise<Job> {
  await tx(async (client) => {
    const { rows } = await client.query('SELECT status FROM jobs WHERE id = $1 FOR UPDATE', [id]);
    if (!rows[0]) throw new HttpError(404, 'Lowongan tidak ditemukan.');
    const check = canChangeJobStatus(rows[0].status, next, reason);
    if (!check.allowed) throw new HttpError(409, check.reason!);
    await client.query(
      `UPDATE jobs SET status = $2,
              closed_reason = CASE WHEN $2 = 'closed' THEN $3 ELSE closed_reason END,
              published_at = CASE WHEN $2 = 'published' AND published_at IS NULL THEN now() ELSE published_at END,
              updated_at = now()
        WHERE id = $1`,
      [id, next, reason?.trim() ?? null]
    );
  });
  return rowTo<Job>((await query(`${SELECT_JOB} WHERE j.id = $1`, [id])).rows[0]);
}
