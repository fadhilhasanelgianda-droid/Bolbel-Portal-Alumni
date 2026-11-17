import { OUTCOME_CONFIG, STAGE_CONFIG } from '../../domain/stateMachine.ts';
import type { ProcessOutcome, SelectionStage } from '../../domain/types.ts';
import { query } from '../db.ts';
import { type Mail, appUrl, sendMail } from '../mailer.ts';

/**
 * Transactional status emails. Called AFTER the database transaction commits and never throws: a mail
 * outage must not undo or fail a status change. Only public messages go out, never internal notes.
 */

/** Longest the caller waits on the mail provider; the send itself keeps going in the background. */
const SEND_WAIT_MS = 5_000;

async function deliver(build: () => Promise<Mail[]>): Promise<void> {
  try {
    const mails = await build();
    const sends = Promise.allSettled(mails.map((m) => sendMail(m))).then((results) => {
      for (const r of results) {
        if (r.status === 'rejected') console.error('[notify] email failed:', r.reason instanceof Error ? r.reason.message : r.reason);
      }
    });
    await Promise.race([sends, new Promise((resolve) => setTimeout(resolve, SEND_WAIT_MS).unref?.())]);
  } catch (err) {
    console.error('[notify] could not prepare email:', err instanceof Error ? err.message : err);
  }
}

interface ProcessContext {
  stage: SelectionStage;
  outcome: ProcessOutcome;
  interviewSchedule: string | null;
  actualStartDate: string | null;
  alumniName: string;
  alumniEmail: string;
  alumniActive: boolean;
  jobTitle: string;
  companyName: string;
}

async function loadContext(processId: string): Promise<ProcessContext | null> {
  const { rows } = await query(
    `SELECT p.current_stage, p.outcome, p.interview_schedule, p.actual_start_date::text AS actual_start_date,
            u.full_name, u.email, u.active, j.title, c.name AS company_name
       FROM candidate_processes p
       JOIN users u ON u.id = p.alumni_id
       JOIN jobs j ON j.id = p.job_id
       JOIN companies c ON c.id = j.company_id
      WHERE p.id = $1`,
    [processId]
  );
  const r = rows[0];
  if (!r) return null;
  return {
    stage: r.current_stage,
    outcome: r.outcome,
    interviewSchedule: r.interview_schedule,
    actualStartDate: r.actual_start_date,
    alumniName: r.full_name,
    alumniEmail: r.email,
    alumniActive: r.active,
    jobTitle: r.title,
    companyName: r.company_name,
  };
}

async function adminRecipients(): Promise<{ email: string; fullName: string }[]> {
  const { rows } = await query(`SELECT email, full_name FROM users WHERE role = 'admin' AND active`);
  return rows.map((r) => ({ email: r.email, fullName: r.full_name }));
}

const signature = '\n\nSalam,\nTim Boleh Belajar';
const alumniLink = (processId: string) => `${appUrl()}/lamaran/${processId}`;
const adminLink = (processId: string) => `${appUrl()}/admin/pipeline/${processId}`;

/** Alumnus applied through BolBel: confirm to them, and tell the admins there is something to review. */
export function notifyApplicationReceived(processId: string): Promise<void> {
  return deliver(async () => {
    const ctx = await loadContext(processId);
    if (!ctx) return [];
    const mails: Mail[] = [];
    if (ctx.alumniActive) {
      mails.push({
        to: ctx.alumniEmail,
        subject: `Lamaranmu diterima: ${ctx.jobTitle} di ${ctx.companyName}`,
        text:
          `Halo ${ctx.alumniName},\n\nLamaranmu untuk posisi ${ctx.jobTitle} di ${ctx.companyName} sudah kami terima. ` +
          `Tim akan meninjau profil dan CV-mu sebelum meneruskannya ke company, dan kamu akan dapat email lagi ` +
          `setiap ada perubahan status.\n\nLihat lamaranmu: ${alumniLink(processId)}${signature}`,
      });
    }
    for (const admin of await adminRecipients()) {
      mails.push({
        to: admin.email,
        subject: `Lamaran baru: ${ctx.alumniName} - ${ctx.jobTitle}`,
        text:
          `Halo ${admin.fullName},\n\n${ctx.alumniName} melamar ${ctx.jobTitle} di ${ctx.companyName} lewat BolBel ` +
          `dan menunggu ditinjau.\n\nBuka di pipeline: ${adminLink(processId)}`,
      });
    }
    return mails;
  });
}

/** Admin proposed a job: the alumnus has to approve before anything is shared with the company. */
export function notifyProposal(processId: string): Promise<void> {
  return deliver(async () => {
    const ctx = await loadContext(processId);
    if (!ctx?.alumniActive) return [];
    return [
      {
        to: ctx.alumniEmail,
        subject: `Ada peluang untukmu: ${ctx.jobTitle} di ${ctx.companyName}`,
        text:
          `Halo ${ctx.alumniName},\n\nTim BolBel mengajukan posisi ${ctx.jobTitle} di ${ctx.companyName} untukmu. ` +
          `CV dan profilmu baru dibagikan ke company setelah kamu menyetujuinya. Kamu juga boleh menolak tanpa alasan khusus.\n\n` +
          `Lihat dan tanggapi di sini: ${alumniLink(processId)}${signature}`,
      },
    ];
  });
}

/** Alumnus approved a proposal: the admins now need to forward the CV. */
export function notifyProposalApproved(processId: string): Promise<void> {
  return deliver(async () => {
    const ctx = await loadContext(processId);
    if (!ctx) return [];
    return (await adminRecipients()).map((admin) => ({
      to: admin.email,
      subject: `Disetujui: ${ctx.alumniName} - ${ctx.jobTitle}`,
      text:
        `Halo ${admin.fullName},\n\n${ctx.alumniName} menyetujui pengajuan ${ctx.jobTitle} di ${ctx.companyName}. ` +
        `CV siap diteruskan ke company.\n\nBuka di pipeline: ${adminLink(processId)}`,
    }));
  });
}

/** Stage or outcome of an application changed: tell the alumnus, using only the public message. */
export function notifyStatusChange(processId: string, publicMessage: string): Promise<void> {
  return deliver(async () => {
    const ctx = await loadContext(processId);
    if (!ctx?.alumniActive) return [];
    const label = ctx.outcome === 'aktif' ? STAGE_CONFIG[ctx.stage].label : OUTCOME_CONFIG[ctx.outcome].label;
    const extra: string[] = [];
    if (ctx.outcome === 'aktif' && ctx.stage === 'interview' && ctx.interviewSchedule) {
      extra.push(`Jadwal interview: ${ctx.interviewSchedule}`);
    }
    if (ctx.stage === 'mulai_kerja' && ctx.actualStartDate) extra.push(`Tanggal mulai kerja: ${ctx.actualStartDate}`);
    return [
      {
        to: ctx.alumniEmail,
        subject: `Update lamaran ${ctx.jobTitle} di ${ctx.companyName}: ${label}`,
        text:
          `Halo ${ctx.alumniName},\n\nStatus lamaranmu untuk ${ctx.jobTitle} di ${ctx.companyName} sekarang: ${label}.\n\n` +
          `${publicMessage}\n${extra.length ? `\n${extra.join('\n')}\n` : ''}\n` +
          `Lihat riwayat lengkapnya: ${alumniLink(processId)}${signature}`,
      },
    ];
  });
}
