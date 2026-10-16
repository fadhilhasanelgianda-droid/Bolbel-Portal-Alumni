import type pg from 'pg';
import { z } from 'zod';
import {
  OUTCOME_CONFIG,
  STAGE_CONFIG,
  checkCanApply,
  isTerminalOutcome,
  validateProcessUpdate,
} from '../../domain/stateMachine.ts';
import type {
  AlumniProfile,
  AlumniReport,
  CandidateProcess,
  CVDocument,
  ConsentRecord,
  Job,
  ProcessEvent,
  ProcessOutcome,
  SelectionStage,
} from '../../domain/types.ts';
import type { SessionUser } from '../auth.ts';
import { query, tx } from '../db.ts';
import { HttpError } from '../http.ts';
import { rowTo, rowsTo } from '../mappers.ts';
import { getProfile } from './profiles.ts';
import { POLICY_VERSION, addDays, insertEvent, insertTask } from './shared.ts';

const SELECT_PROCESS = `
  SELECT p.*, u.full_name AS alumni_name, u.email AS alumni_email,
         j.title AS job_title, j.company_id, c.name AS company_name
    FROM candidate_processes p
    JOIN users u ON u.id = p.alumni_id
    JOIN jobs j ON j.id = p.job_id
    JOIN companies c ON c.id = j.company_id`;

const SELECT_JOB = `SELECT j.*, c.name AS company_name FROM jobs j JOIN companies c ON c.id = j.company_id`;

const today = () => new Date().toISOString().slice(0, 10);
const actorOf = (u: SessionUser) => ({ id: u.id, fullName: u.fullName, role: u.role });
const hasActiveConsent = (p: CandidateProcess) => Boolean(p.consentGrantedAt && !p.consentRevokedAt);

function snapshotOf(p: AlumniProfile) {
  return {
    fullName: p.fullName,
    email: p.email,
    phone: p.phone,
    domicile: p.domicile,
    employmentStatus: p.employmentStatus,
    opennessStatus: p.opennessStatus,
    startReadiness: p.startReadiness,
    experienceBand: p.experienceBand,
    targetRoles: p.targetRoles,
  };
}

async function getActiveCv(db: pg.PoolClient, ownerId: string): Promise<CVDocument | null> {
  const { rows } = await db.query('SELECT * FROM cv_documents WHERE owner_id = $1 AND is_current_active', [ownerId]);
  return rows[0] ? rowTo<CVDocument>(rows[0]) : null;
}

async function getJobTx(db: pg.PoolClient, jobId: string): Promise<Job> {
  const { rows } = await db.query(`${SELECT_JOB} WHERE j.id = $1`, [jobId]);
  if (!rows[0]) throw new HttpError(404, 'Lowongan tidak ditemukan.');
  return rowTo<Job>(rows[0]);
}

async function lockProcess(db: pg.PoolClient, processId: string): Promise<CandidateProcess> {
  const { rows } = await db.query(`${SELECT_PROCESS} WHERE p.id = $1 FOR UPDATE OF p`, [processId]);
  if (!rows[0]) throw new HttpError(404, 'Proses tidak ditemukan.');
  return rowTo<CandidateProcess>(rows[0]);
}

async function getExistingProcess(db: pg.PoolClient, alumniId: string, jobId: string): Promise<CandidateProcess | null> {
  const { rows } = await db.query(`${SELECT_PROCESS} WHERE p.alumni_id = $1 AND p.job_id = $2`, [alumniId, jobId]);
  return rows[0] ? rowTo<CandidateProcess>(rows[0]) : null;
}

function ownedBy(user: SessionUser, p: CandidateProcess) {
  // 404 rather than 403: don't reveal that someone else's process exists
  if (user.role === 'alumni' && p.alumniId !== user.id) throw new HttpError(404, 'Proses tidak ditemukan.');
}

/** Bumps version + timestamp and applies column changes in one statement. */
async function updateProcess(db: pg.PoolClient, id: string, changes: Record<string, unknown>): Promise<void> {
  const cols = Object.keys(changes);
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  await db.query(
    `UPDATE candidate_processes SET ${sets.join(', ')}, version = version + 1, last_stage_updated_at = now() WHERE id = $1`,
    [id, ...cols.map((c) => changes[c])]
  );
}

// ---------------------------------------------------------------- reads

export async function listProcesses(user: SessionUser): Promise<CandidateProcess[]> {
  const { rows } =
    user.role === 'admin'
      ? await query(`${SELECT_PROCESS} ORDER BY p.last_stage_updated_at DESC`)
      : await query(`${SELECT_PROCESS} WHERE p.alumni_id = $1 ORDER BY p.last_stage_updated_at DESC`, [user.id]);
  return rowsTo<CandidateProcess>(rows);
}

/** Alumni never receive internalNotes (admin-only working notes). */
export async function listEvents(user: SessionUser, processId: string): Promise<ProcessEvent[]> {
  if (user.role === 'alumni') {
    const owned = await query('SELECT 1 FROM candidate_processes WHERE id = $1 AND alumni_id = $2', [processId, user.id]);
    if (!owned.rowCount) throw new HttpError(404, 'Proses tidak ditemukan.');
  }
  const { rows } = await query('SELECT * FROM process_events WHERE process_id = $1 ORDER BY recorded_at DESC, id', [processId]);
  const events = rowsTo<ProcessEvent>(rows);
  return user.role === 'admin' ? events : events.map(({ internalNotes: _omit, ...e }) => e);
}

export async function listConsents(user: SessionUser): Promise<ConsentRecord[]> {
  const { rows } =
    user.role === 'admin'
      ? await query(
          `SELECT k.*, c.name AS company_name, j.title AS job_title
             FROM consent_records k JOIN jobs j ON j.id = k.job_id JOIN companies c ON c.id = j.company_id
            ORDER BY k.granted_at DESC`
        )
      : await query(
          `SELECT k.*, c.name AS company_name, j.title AS job_title
             FROM consent_records k JOIN jobs j ON j.id = k.job_id JOIN companies c ON c.id = j.company_id
            WHERE k.alumni_id = $1 ORDER BY k.granted_at DESC`,
          [user.id]
        );
  return rowsTo<ConsentRecord>(rows);
}

export async function listReports(user: SessionUser): Promise<AlumniReport[]> {
  const { rows } =
    user.role === 'admin'
      ? await query('SELECT * FROM alumni_reports ORDER BY created_at DESC')
      : await query('SELECT * FROM alumni_reports WHERE alumni_id = $1 ORDER BY created_at DESC', [user.id]);
  return rowsTo<AlumniReport>(rows);
}

// ---------------------------------------------------------------- alumni actions

/** Apply via BolBel with explicit consent (FR05). */
export async function applyViaBolBel(user: SessionUser, jobId: string, consentAccepted: boolean) {
  if (!consentAccepted) {
    throw new HttpError(400, 'Persetujuan (consent) pembagian CV dan profil wajib dicentang secara aktif.');
  }
  return tx(async (client) => {
    const job = await getJobTx(client, jobId);
    if (job.applyChannel !== 'bolbel') throw new HttpError(400, 'Lowongan ini dilamar melalui situs company, bukan BolBel.');

    const profile = await getProfile(user.id, client);
    const cv = await getActiveCv(client, user.id);
    const existing = await getExistingProcess(client, user.id, jobId);
    const check = checkCanApply(job, profile, cv, existing);
    if (!check.canApply) throw new HttpError(409, check.reason ?? 'Tidak dapat melamar.');

    const { rows } = await client.query(
      `INSERT INTO candidate_processes
         (alumni_id, job_id, origin, current_stage, outcome, document_version_id, document_name,
          profile_snapshot, consent_granted_at)
       VALUES ($1,$2,'internal_apply','masuk_bolbel','aktif',$3,$4,$5, now()) RETURNING id`,
      [user.id, jobId, cv!.id, cv!.fileName, JSON.stringify(snapshotOf(profile!))]
    );
    const processId: string = rows[0].id;

    await client.query(
      `INSERT INTO consent_records (process_id, alumni_id, job_id, document_version_id, document_name, scope_description, policy_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        processId, user.id, jobId, cv!.id, cv!.fileName,
        `Persetujuan pembagian CV (${cv!.fileName}) dan ringkasan profil kepada ${job.companyName} untuk posisi ${job.title}.`,
        POLICY_VERSION,
      ]
    );
    await insertEvent(client, {
      processId,
      eventType: 'consent_granted',
      newStage: 'masuk_bolbel',
      actor: actorOf(user),
      sourceType: 'alumni_report',
      publicMessage: 'Lamaran tersimpan di BolBel. Tim akan meninjau sebelum meneruskannya ke company.',
    });
    await insertTask(client, {
      processId, jobId, alumniId: user.id,
      title: `Tinjau lamaran baru: ${user.fullName} - ${job.title}`,
      description: `Periksa kesesuaian profil ${user.fullName} untuk diteruskan ke ${job.companyName}.`,
      taskType: 'review_new_application', ownerName: job.processOwner, dueAt: addDays(2),
    });
    return { processId };
  });
}

export const externalReportSchema = z.object({
  applyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.'),
  notes: z.string().trim().max(2000).default(''),
});

/** Alumni reports having applied on the company's own site (FR06). */
export async function reportExternalApply(user: SessionUser, jobId: string, input: z.infer<typeof externalReportSchema>) {
  if (input.applyDate > today()) throw new HttpError(400, 'Tanggal lamaran tidak boleh di masa depan.');
  return tx(async (client) => {
    const job = await getJobTx(client, jobId);
    if (job.applyChannel !== 'external') throw new HttpError(400, 'Lowongan ini dilamar melalui BolBel.');
    if (job.status === 'draft' || job.status === 'archived') throw new HttpError(404, 'Lowongan tidak ditemukan.');

    const profile = await getProfile(user.id, client);
    if (!profile) throw new HttpError(400, 'Lengkapi profilmu terlebih dahulu.');
    if (await getExistingProcess(client, user.id, jobId)) {
      throw new HttpError(409, 'Kamu sudah memiliki catatan lamaran untuk lowongan ini.');
    }
    const cv = await getActiveCv(client, user.id);

    const { rows } = await client.query(
      `INSERT INTO candidate_processes
         (alumni_id, job_id, origin, current_stage, outcome, document_version_id, document_name, profile_snapshot, reported_apply_date)
       VALUES ($1,$2,'external_report','dilaporkan_apply_eksternal','aktif',$3,$4,$5,$6) RETURNING id`,
      [
        user.id, jobId, cv?.id ?? null, cv?.fileName ?? 'Tidak diunggah ke portal (Apply mandiri)',
        JSON.stringify(snapshotOf(profile)), input.applyDate,
      ]
    );
    const processId: string = rows[0].id;

    await insertEvent(client, {
      processId,
      eventType: 'alumni_report',
      newStage: 'dilaporkan_apply_eksternal',
      actor: actorOf(user),
      sourceType: 'alumni_report',
      occurredAt: input.applyDate,
      publicMessage: `Alumni melaporkan telah melamar mandiri di situs resmi ${job.companyName} pada tanggal ${input.applyDate}.`,
      internalNotes: input.notes,
    });
    await client.query(
      `INSERT INTO alumni_reports (process_id, alumni_id, report_type, report_date, details)
       VALUES ($1,$2,'already_applied_external',$3,$4)`,
      [processId, user.id, input.applyDate, input.notes]
    );
    await insertTask(client, {
      processId, jobId, alumniId: user.id,
      title: `Tinjau laporan lamaran eksternal ${user.fullName}`,
      description: 'Cek kesesuaian role dan verifikasi apakah perlu dibantu follow-up ke HR company.',
      taskType: 'review_alumni_report', ownerName: job.processOwner, dueAt: addDays(2),
    });
    return { processId };
  });
}

/** Alumni approves an admin-initiated proposal (FR07): this is what grants consent. */
export async function approveProposal(user: SessionUser, processId: string) {
  await tx(async (client) => {
    const proc = await lockProcess(client, processId);
    ownedBy(user, proc);
    if (proc.currentStage !== 'menunggu_persetujuan' || proc.outcome !== 'aktif') {
      throw new HttpError(409, 'Proses ini tidak dalam status menunggu persetujuan.');
    }
    const job = await getJobTx(client, proc.jobId);
    if (job.status === 'closed' || job.status === 'archived') {
      throw new HttpError(409, 'Lowongan ini sudah tidak aktif.');
    }

    await client.query(
      `INSERT INTO consent_records (process_id, alumni_id, job_id, document_version_id, document_name, scope_description, policy_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        processId, proc.alumniId, proc.jobId, proc.documentVersionId ?? null, proc.documentName,
        `Persetujuan alumni atas rekomendasi lowongan oleh admin BolBel kepada ${proc.companyName}.`,
        POLICY_VERSION,
      ]
    );
    await updateProcess(client, processId, { current_stage: 'masuk_bolbel', consent_granted_at: new Date() });
    await insertEvent(client, {
      processId,
      eventType: 'consent_granted',
      previousStage: 'menunggu_persetujuan',
      newStage: 'masuk_bolbel',
      actor: actorOf(user),
      sourceType: 'alumni_report',
      publicMessage: 'Persetujuan pengajuan diberikan. Tim BolBel siap meneruskan CV ke company.',
    });
    await insertTask(client, {
      processId, jobId: proc.jobId, alumniId: proc.alumniId,
      title: `Kirimkan CV ${proc.alumniName} ke ${proc.companyName}`,
      description: 'Alumni telah menyetujui pengajuan. Kirimkan CV via email ke PIC.',
      taskType: 'forward_cv', ownerName: job.processOwner, dueAt: addDays(1),
    });
  });
}

export const reasonSchema = z.object({ reason: z.string().trim().min(1, 'Alasan wajib diisi.').max(1000) });

export async function rejectProposal(user: SessionUser, processId: string, reason?: string) {
  await tx(async (client) => {
    const proc = await lockProcess(client, processId);
    ownedBy(user, proc);
    if (proc.currentStage !== 'menunggu_persetujuan' || proc.outcome !== 'aktif') {
      throw new HttpError(409, 'Pengajuan ini tidak lagi menunggu persetujuan.');
    }
    await updateProcess(client, processId, { outcome: 'tidak_menyetujui_pengajuan' });
    await insertEvent(client, {
      processId,
      eventType: 'status_change',
      previousStage: proc.currentStage,
      newStage: proc.currentStage,
      previousOutcome: proc.outcome,
      newOutcome: 'tidak_menyetujui_pengajuan',
      actor: actorOf(user),
      sourceType: 'alumni_report',
      publicMessage: `Kandidat memilih untuk tidak melanjutkan penawaran ini: ${reason || 'Alumni menolak penawaran peluang ini.'}`,
    });
  });
}

/** Alumni withdraws; this also revokes consent. */
export async function withdrawApplication(user: SessionUser, processId: string, reason: string) {
  await tx(async (client) => {
    const proc = await lockProcess(client, processId);
    ownedBy(user, proc);
    if (isTerminalOutcome(proc.outcome)) {
      throw new HttpError(409, `Proses sudah berstatus akhir (${OUTCOME_CONFIG[proc.outcome].label}) dan tidak dapat ditarik.`);
    }
    const hadConsent = hasActiveConsent(proc);

    if (hadConsent) {
      await client.query('UPDATE consent_records SET revoked_at = now() WHERE process_id = $1 AND revoked_at IS NULL', [processId]);
      await insertEvent(client, {
        processId,
        eventType: 'consent_revoked',
        previousStage: proc.currentStage,
        newStage: proc.currentStage,
        actor: actorOf(user),
        sourceType: 'alumni_report',
        publicMessage: 'Persetujuan pembagian CV dan profil dicabut oleh alumni.',
      });
    }
    await updateProcess(client, processId, {
      outcome: 'mengundurkan_diri',
      ...(hadConsent ? { consent_revoked_at: new Date() } : {}),
    });
    await insertEvent(client, {
      processId,
      eventType: 'status_change',
      previousStage: proc.currentStage,
      newStage: proc.currentStage,
      previousOutcome: proc.outcome,
      newOutcome: 'mengundurkan_diri',
      actor: actorOf(user),
      sourceType: 'alumni_report',
      publicMessage: `Alumni menarik diri dari proses seleksi. Alasan: ${reason}`,
      internalNotes: 'Penarikan diri tercatat. Mohon infokan company jika CV sudah sempat dikirim.',
    });

    // CV may already be with the company -> admin must tell the company
    if (proc.currentStage !== 'masuk_bolbel' && proc.currentStage !== 'menunggu_persetujuan') {
      const job = await getJobTx(client, proc.jobId);
      await insertTask(client, {
        processId, jobId: proc.jobId, alumniId: proc.alumniId,
        title: `Beri kabar ${proc.companyName}: ${proc.alumniName} Mengundurkan Diri`,
        description: `Kandidat menarik diri (${reason}). Informasikan kepada PIC HR ${proc.companyName}.`,
        taskType: 'followup_company', ownerName: job.processOwner, dueAt: addDays(1),
      });
    }
  });
}

// ---------------------------------------------------------------- admin actions

export const forwardSchema = z.object({
  internalNotes: z.string().trim().max(2000).default(''),
  publicMessage: z.string().trim().max(1000).optional(),
});

/** Admin forwards the CV to the company (FR08). Requires active consent on the BolBel channel. */
export async function forwardToCompany(user: SessionUser, processId: string, input: z.infer<typeof forwardSchema>) {
  await tx(async (client) => {
    const proc = await lockProcess(client, processId);
    const job = await getJobTx(client, proc.jobId);
    const check = validateProcessUpdate(
      proc,
      { stage: 'diteruskan_ke_company', outcome: proc.outcome },
      hasActiveConsent(proc),
      job.applyChannel
    );
    if (!check.allowed) throw new HttpError(409, check.reason!);
    if (proc.currentStage === 'diteruskan_ke_company') throw new HttpError(409, 'CV sudah diteruskan ke company.');

    await updateProcess(client, processId, { current_stage: 'diteruskan_ke_company', last_follow_up_date: new Date() });
    await insertEvent(client, {
      processId,
      eventType: 'forwarded_to_company',
      previousStage: proc.currentStage,
      newStage: 'diteruskan_ke_company',
      actor: actorOf(user),
      sourceType: 'admin_official',
      publicMessage:
        input.publicMessage ||
        `CV (${proc.documentName}) dan ringkasan profil telah resmi diteruskan oleh ${job.processOwner} kepada tim recruitment ${proc.companyName}.`,
      internalNotes: input.internalNotes,
    });
    await insertTask(client, {
      processId, jobId: proc.jobId, alumniId: proc.alumniId,
      title: `Follow-up 7 hari: ${proc.companyName} (${proc.alumniName})`,
      description: `Tanyakan hasil review CV atau jadwal screening kepada PIC recruitment ${proc.companyName}.`,
      taskType: 'followup_company', ownerName: job.processOwner, dueAt: addDays(7),
    });
  });
}

const STAGES = Object.keys(STAGE_CONFIG) as [SelectionStage, ...SelectionStage[]];
const OUTCOMES = Object.keys(OUTCOME_CONFIG) as [ProcessOutcome, ...ProcessOutcome[]];

export const stageUpdateSchema = z.object({
  stage: z.enum(STAGES),
  outcome: z.enum(OUTCOMES),
  sourceType: z.enum(['admin_official', 'company_update']),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.'),
  publicMessage: z.string().trim().max(1000).optional(),
  internalNotes: z.string().trim().max(2000).optional(),
  interviewSchedule: z.string().trim().max(200).optional(),
  actualStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Version the admin saw; rejects the update if someone else changed the process meanwhile. */
  expectedVersion: z.number().int().optional(),
});

export async function updateStage(user: SessionUser, processId: string, input: z.infer<typeof stageUpdateSchema>) {
  if (input.occurredAt > today()) throw new HttpError(400, 'Tanggal kejadian tidak boleh di masa depan.');
  await tx(async (client) => {
    const proc = await lockProcess(client, processId);
    if (input.expectedVersion !== undefined && input.expectedVersion !== proc.version) {
      throw new HttpError(409, 'Proses ini baru saja diperbarui oleh pihak lain. Muat ulang lalu coba lagi.');
    }
    const job = await getJobTx(client, proc.jobId);
    const check = validateProcessUpdate(
      proc,
      { stage: input.stage, outcome: input.outcome },
      hasActiveConsent(proc),
      job.applyChannel
    );
    if (!check.allowed) throw new HttpError(409, check.reason!);
    if (input.stage === 'mulai_kerja' && !input.actualStartDate && !proc.actualStartDate) {
      throw new HttpError(400, 'Tanggal mulai kerja wajib diisi.');
    }

    await updateProcess(client, processId, {
      current_stage: input.stage,
      outcome: input.outcome,
      interview_schedule: input.interviewSchedule || proc.interviewSchedule || null,
      actual_start_date: input.actualStartDate || proc.actualStartDate || null,
    });
    await insertEvent(client, {
      processId,
      eventType: 'status_change',
      previousStage: proc.currentStage,
      newStage: input.stage,
      previousOutcome: proc.outcome,
      newOutcome: input.outcome,
      actor: actorOf(user),
      sourceType: input.sourceType,
      occurredAt: input.occurredAt,
      publicMessage: input.publicMessage || `Tahap seleksi diperbarui menjadi ${STAGE_CONFIG[input.stage].label}.`,
      internalNotes: input.internalNotes,
    });
  });
}

export const proposalSchema = z.object({ alumniId: z.string().uuid(), jobId: z.string().uuid() });

/** Admin proposes a job to an alumnus who allows proactive contact (FR07). Waits for the alumnus's consent. */
export async function createProposal(user: SessionUser, input: z.infer<typeof proposalSchema>) {
  return tx(async (client) => {
    const profile = await getProfile(input.alumniId, client);
    if (!profile) throw new HttpError(404, 'Profil alumni tidak ditemukan.');
    if (!profile.allowProactiveContact) {
      throw new HttpError(409, 'Alumni ini tidak mengaktifkan izin penawaran proaktif. Alumni hanya dapat melamar mandiri.');
    }
    const job = await getJobTx(client, input.jobId);
    if (job.status !== 'published') throw new HttpError(409, 'Hanya lowongan yang dipublikasikan yang dapat diajukan.');
    if (await getExistingProcess(client, input.alumniId, input.jobId)) {
      throw new HttpError(409, 'Kandidat sudah memiliki catatan proses pada lowongan ini.');
    }
    const cv = await getActiveCv(client, input.alumniId);
    if (!cv) throw new HttpError(409, 'Alumni belum memiliki CV aktif.');

    const { rows } = await client.query(
      `INSERT INTO candidate_processes
         (alumni_id, job_id, origin, current_stage, outcome, document_version_id, document_name, profile_snapshot)
       VALUES ($1,$2,'admin_proactive','menunggu_persetujuan','aktif',$3,$4,$5) RETURNING id`,
      [input.alumniId, input.jobId, cv.id, cv.fileName, JSON.stringify(snapshotOf(profile))]
    );
    await insertEvent(client, {
      processId: rows[0].id,
      eventType: 'status_change',
      newStage: 'menunggu_persetujuan',
      actor: actorOf(user),
      sourceType: 'admin_official',
      publicMessage: `Tim BolBel mengajukan penawaran posisi ${job.title} di ${job.companyName}. Menunggu persetujuan alumni.`,
    });
    return { processId: rows[0].id as string };
  });
}

export const reportReviewSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
  notes: z.string().trim().max(1000).optional(),
});

export async function reviewReport(user: SessionUser, reportId: string, input: z.infer<typeof reportReviewSchema>) {
  const { rows } = await query(
    `UPDATE alumni_reports
        SET status = $2, reviewed_by = $3, reviewed_at = now(), admin_decision_notes = $4
      WHERE id = $1 AND status = 'pending_review' RETURNING *`,
    [reportId, input.status, user.id, input.notes ?? null]
  );
  if (!rows[0]) throw new HttpError(409, 'Laporan tidak ditemukan atau sudah ditinjau.');
  return rowTo<AlumniReport>(rows[0]);
}
