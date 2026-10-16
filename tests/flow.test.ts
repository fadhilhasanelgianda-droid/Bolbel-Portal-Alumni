import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { SessionUser } from '../src/server/auth.ts';
import { getPool, query } from '../src/server/db.ts';
import { HttpError } from '../src/server/http.ts';
import { runMigrations } from '../src/server/migrate.ts';
import * as cvs from '../src/server/services/cvs.ts';
import * as jobs from '../src/server/services/jobs.ts';
import * as processes from '../src/server/services/processes.ts';
import * as profiles from '../src/server/services/profiles.ts';
import * as roster from '../src/server/services/roster.ts';
import { startTestPostgres } from './pg-server.ts';

let stopPg: () => Promise<void>;

const profileInput: profiles.ProfileInput = {
  phone: '0812', whatsappContact: true, employmentStatus: 'belum_bekerja', opennessStatus: 'aktif_mencari',
  startReadiness: 'segera', targetRoles: ['Paid Ads'], targetWorkTypes: ['full_time'], targetWorkModels: ['remote'],
  domicile: 'Jakarta', targetLocations: ['Jakarta'], experienceBand: '1-2_tahun', allowProactiveContact: true,
};

async function makeUser(role: 'alumni' | 'admin', name: string): Promise<SessionUser> {
  const email = `${name.toLowerCase().replace(/\W+/g, '.')}@test.dev`;
  let rosterId: string | null = null;
  if (role === 'alumni') {
    rosterId = (
      await query(
        `INSERT INTO roster_entries (email, full_name, program, batch) VALUES ($1,$2,'Full Course','Batch 1') RETURNING id`,
        [email, name]
      )
    ).rows[0].id;
  }
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, role, full_name, roster_id) VALUES ($1,'x',$2,$3,$4) RETURNING id`,
    [email, role, name, rosterId]
  );
  return { id: rows[0].id, email, role, fullName: name, rosterId };
}

async function makeCv(owner: SessionUser, active = true): Promise<string> {
  const { rows } = await query(
    `INSERT INTO cv_documents (owner_id, file_name, file_size_bytes, file_type, is_current_active, storage_key)
     VALUES ($1,'cv.pdf',1000,'application/pdf',$2,$3) RETURNING id`,
    [owner.id, active, `cvs/${crypto.randomUUID()}.pdf`]
  );
  return rows[0].id;
}

async function makeCompany(): Promise<string> {
  return (await query(`INSERT INTO companies (name, industry, relationship_source) VALUES ('Acme','Tech','company_inbound') RETURNING id`)).rows[0].id;
}

async function makeJob(companyId: string, over: { channel?: 'bolbel' | 'external'; status?: string } = {}): Promise<string> {
  const channel = over.channel ?? 'bolbel';
  return (
    await query(
      `INSERT INTO jobs (company_id, title, summary, experience_level, work_type, work_model, location, salary_type,
                         apply_channel, external_apply_url, status, process_owner, published_at)
       VALUES ($1,'Ads Specialist','s','junior','full_time','remote','Remote','uninformed',$2,$3,$4,'Gifari',now()) RETURNING id`,
      [companyId, channel, channel === 'external' ? 'https://example.com/jobs/1' : null, over.status ?? 'published']
    )
  ).rows[0].id;
}

// The PGlite socket server drops the connection after a failed statement; give the pool a moment to evict it
const settle = () => new Promise((r) => setTimeout(r, 30));

const expectHttp = async (p: Promise<unknown>, status: number, msg?: RegExp) => {
  await assert.rejects(p, (e) => e instanceof HttpError && e.status === status && (!msg || msg.test(e.message)));
  await settle();
};

before(async () => {
  const pg = await startTestPostgres(54330);
  stopPg = pg.stop;
  process.env.DATABASE_URL = pg.url;
  await runMigrations();
});

after(async () => {
  await getPool().end();
  await stopPg();
});

describe('apply via BolBel', () => {
  test('requires consent, a profile and an active CV, then creates process + consent + event + task', async () => {
    const admin = await makeUser('admin', 'Admin A');
    const sari = await makeUser('alumni', 'Sari Apply');
    const job = await makeJob(await makeCompany());

    await expectHttp(processes.applyViaBolBel(sari, job, false), 400, /consent/i);
    await expectHttp(processes.applyViaBolBel(sari, job, true), 409); // no profile / CV yet

    const prof = await profiles.upsertProfile(sari.id, profileInput);
    // identity comes from the roster, not from the client
    assert.equal(prof.fullName, 'Sari Apply');
    assert.equal(prof.program, 'Full Course');
    await expectHttp(processes.applyViaBolBel(sari, job, true), 409, /CV/); // no CV yet

    await makeCv(sari);
    const { processId } = await processes.applyViaBolBel(sari, job, true);

    const [proc] = (await processes.listProcesses(sari)).filter((p) => p.id === processId);
    assert.equal(proc.currentStage, 'masuk_bolbel');
    assert.ok(proc.consentGrantedAt);
    assert.equal((await processes.listConsents(sari)).length, 1);
    assert.equal((await query(`SELECT count(*)::int n FROM follow_up_tasks WHERE process_id = $1`, [processId])).rows[0].n, 1);

    // second apply to the same job is rejected
    await expectHttp(processes.applyViaBolBel(sari, job, true), 409, /sudah memiliki/);
    void admin;
  });

  test('concurrent double-submit creates exactly one process', async () => {
    const budi = await makeUser('alumni', 'Budi Race');
    await profiles.upsertProfile(budi.id, profileInput);
    await makeCv(budi);
    const job = await makeJob(await makeCompany());
    const results = await Promise.allSettled([
      processes.applyViaBolBel(budi, job, true),
      processes.applyViaBolBel(budi, job, true),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal((await processes.listProcesses(budi)).length, 1);
  });

  test('refuses unpublished jobs and external-channel jobs', async () => {
    const dina = await makeUser('alumni', 'Dina Draft');
    await profiles.upsertProfile(dina.id, profileInput);
    await makeCv(dina);
    const company = await makeCompany();
    await expectHttp(processes.applyViaBolBel(dina, await makeJob(company, { status: 'paused' }), true), 409, /tidak menerima/);
    await expectHttp(processes.applyViaBolBel(dina, await makeJob(company, { channel: 'external' }), true), 400, /situs company/);
  });
});

describe('pipeline, consent and audit trail', () => {
  test('admin forwards, advances stages in order; skips and terminal edits are rejected; alumni never see internal notes', async () => {
    const admin = await makeUser('admin', 'Admin B');
    const eka = await makeUser('alumni', 'Eka Pipeline');
    await profiles.upsertProfile(eka.id, profileInput);
    await makeCv(eka);
    const job = await makeJob(await makeCompany());
    const { processId } = await processes.applyViaBolBel(eka, job, true);

    const stage = (s: string, o = 'aktif', extra = {}) =>
      processes.updateStage(admin, processId, {
        stage: s, outcome: o, sourceType: 'admin_official', occurredAt: '2026-01-01', ...extra,
      } as never);

    await expectHttp(stage('interview'), 409, /tidak diizinkan/); // can't skip
    await processes.forwardToCompany(admin, processId, { internalNotes: 'dikirim via email ke PIC' });
    await expectHttp(processes.forwardToCompany(admin, processId, { internalNotes: '' }), 409);
    await stage('screening', 'aktif', { internalNotes: 'catatan internal rahasia' });
    await expectHttp(stage('diteruskan_ke_company'), 409, /tidak diizinkan/); // no going back
    await stage('interview', 'aktif', { interviewSchedule: '2026-02-01 10:00' });
    await stage('interview', 'ditolak');
    await expectHttp(stage('interview', 'aktif'), 409, /status akhir/); // frozen

    const adminEvents = await processes.listEvents(admin, processId);
    const alumniEvents = await processes.listEvents(eka, processId);
    assert.equal(adminEvents.length, alumniEvents.length);
    assert.ok(adminEvents.some((e) => e.internalNotes?.includes('rahasia')));
    assert.ok(alumniEvents.every((e) => !('internalNotes' in e)));
  });

  test('stale expectedVersion is rejected (optimistic lock)', async () => {
    const admin = await makeUser('admin', 'Admin C');
    const fani = await makeUser('alumni', 'Fani Version');
    await profiles.upsertProfile(fani.id, profileInput);
    await makeCv(fani);
    const { processId } = await processes.applyViaBolBel(fani, await makeJob(await makeCompany()), true);
    await expectHttp(
      processes.updateStage(admin, processId, {
        stage: 'masuk_bolbel', outcome: 'aktif', sourceType: 'admin_official', occurredAt: '2026-01-01', expectedVersion: 999,
      }),
      409,
      /diperbarui/
    );
  });

  test('withdraw revokes consent, logs consent_revoked, notifies admin if forwarded, and is final', async () => {
    const admin = await makeUser('admin', 'Admin D');
    const gita = await makeUser('alumni', 'Gita Withdraw');
    await profiles.upsertProfile(gita.id, profileInput);
    await makeCv(gita);
    const { processId } = await processes.applyViaBolBel(gita, await makeJob(await makeCompany()), true);
    await processes.forwardToCompany(admin, processId, { internalNotes: '' });

    await processes.withdrawApplication(gita, processId, 'dapat tawaran lain');

    const [consent] = await processes.listConsents(gita);
    assert.ok(consent.revokedAt);
    const [proc] = await processes.listProcesses(gita);
    assert.equal(proc.outcome, 'mengundurkan_diri');
    assert.ok(proc.consentRevokedAt);
    const types = (await processes.listEvents(gita, processId)).map((e) => e.eventType);
    assert.ok(types.includes('consent_revoked'));
    assert.equal(
      (await query(`SELECT count(*)::int n FROM follow_up_tasks WHERE process_id = $1 AND title LIKE 'Beri kabar%'`, [processId])).rows[0].n,
      1
    );
    await expectHttp(processes.withdrawApplication(gita, processId, 'lagi'), 409, /status akhir/);
    await expectHttp(processes.forwardToCompany(admin, processId, { internalNotes: '' }), 409, /status akhir/);
  });

  test('alumni cannot touch or see another alumnus\'s process', async () => {
    const hana = await makeUser('alumni', 'Hana Owner');
    const intruder = await makeUser('alumni', 'Ivan Intruder');
    await profiles.upsertProfile(hana.id, profileInput);
    await makeCv(hana);
    const { processId } = await processes.applyViaBolBel(hana, await makeJob(await makeCompany()), true);
    await expectHttp(processes.withdrawApplication(intruder, processId, 'x'), 404);
    await expectHttp(processes.listEvents(intruder, processId), 404);
    assert.equal((await processes.listProcesses(intruder)).length, 0);
  });

  test('process_events is append-only', async () => {
    await assert.rejects(query(`UPDATE process_events SET public_message = 'tampered'`), /append-only/);
    await settle();
    await assert.rejects(query(`DELETE FROM process_events`), /append-only/);
    await settle();
  });
});

describe('proactive proposals', () => {
  test('needs allowProactiveContact; consent only comes from the alumnus; others cannot approve', async () => {
    const admin = await makeUser('admin', 'Admin E');
    const joko = await makeUser('alumni', 'Joko Proposal');
    const other = await makeUser('alumni', 'Kiki Other');
    const job = await makeJob(await makeCompany());

    await profiles.upsertProfile(joko.id, { ...profileInput, allowProactiveContact: false });
    await makeCv(joko);
    await expectHttp(processes.createProposal(admin, { alumniId: joko.id, jobId: job }), 409, /proaktif/);

    await profiles.upsertProfile(joko.id, profileInput);
    const { processId } = await processes.createProposal(admin, { alumniId: joko.id, jobId: job });

    // before approval no consent exists, so the admin cannot forward
    await expectHttp(processes.forwardToCompany(admin, processId, { internalNotes: '' }), 409, /persetujuan/);
    await expectHttp(processes.approveProposal(other, processId), 404);

    await processes.approveProposal(joko, processId);
    const [proc] = await processes.listProcesses(joko);
    assert.equal(proc.currentStage, 'masuk_bolbel');
    assert.ok(proc.consentGrantedAt);
    await expectHttp(processes.approveProposal(joko, processId), 409); // not pending anymore
    await processes.forwardToCompany(admin, processId, { internalNotes: '' });
  });

  test('rejecting ends the proposal and it cannot then be approved', async () => {
    const admin = await makeUser('admin', 'Admin F');
    const lina = await makeUser('alumni', 'Lina Reject');
    await profiles.upsertProfile(lina.id, profileInput);
    await makeCv(lina);
    const { processId } = await processes.createProposal(admin, { alumniId: lina.id, jobId: await makeJob(await makeCompany()) });
    await processes.rejectProposal(lina, processId, 'tidak tertarik');
    await expectHttp(processes.approveProposal(lina, processId), 409);
    await expectHttp(processes.rejectProposal(lina, processId), 409);
  });
});

describe('external apply report', () => {
  test('rejects future dates and BolBel-channel jobs; creates report; admin can review once', async () => {
    const admin = await makeUser('admin', 'Admin G');
    const mira = await makeUser('alumni', 'Mira External');
    await profiles.upsertProfile(mira.id, profileInput);
    const company = await makeCompany();
    const ext = await makeJob(company, { channel: 'external' });

    await expectHttp(processes.reportExternalApply(mira, ext, { applyDate: '2999-01-01', notes: '' }), 400, /masa depan/);
    await expectHttp(processes.reportExternalApply(mira, await makeJob(company), { applyDate: '2026-01-01', notes: '' }), 400, /BolBel/);

    const { processId } = await processes.reportExternalApply(mira, ext, { applyDate: '2026-01-01', notes: 'sudah submit' });
    const [report] = await processes.listReports(mira);
    assert.equal(report.status, 'pending_review');
    assert.equal(report.reportDate, '2026-01-01'); // DATE stays a plain string
    await processes.reviewReport(admin, report.id, { status: 'accepted' });
    await expectHttp(processes.reviewReport(admin, report.id, { status: 'rejected' }), 409);

    // external jobs don't need BolBel consent: admin can move it on
    await processes.updateStage(admin, processId, {
      stage: 'screening', outcome: 'aktif', sourceType: 'company_update', occurredAt: '2026-01-05',
    });
  });
});

describe('CVs, jobs and roster', () => {
  test('one active CV per owner; a CV used by a process cannot be deleted', async () => {
    const nia = await makeUser('alumni', 'Nia Cv');
    await profiles.upsertProfile(nia.id, profileInput);
    const cv1 = await makeCv(nia);
    const cv2 = await makeCv(nia, false);
    await cvs.setActiveCv(nia.id, cv2);
    const list = await cvs.listCvs(nia.id);
    assert.equal(list.filter((c) => c.isCurrentActive).length, 1);
    assert.equal(list.find((c) => c.isCurrentActive)?.id, cv2);

    await cvs.setActiveCv(nia.id, cv1);
    await processes.applyViaBolBel(nia, await makeJob(await makeCompany()), true);
    await expectHttp(cvs.deleteCv(nia.id, cv1), 409, /sudah dipakai/);
    await cvs.deleteCv(nia.id, cv2); // unused one is fine

    const stranger = await makeUser('alumni', 'Oka Stranger');
    await expectHttp(cvs.setActiveCv(stranger.id, cv1), 404);
    await expectHttp(cvs.deleteCv(stranger.id, cv1), 404);
  });

  test('job lifecycle is enforced and drafts are hidden from alumni', async () => {
    const admin = await makeUser('admin', 'Admin H');
    const pia = await makeUser('alumni', 'Pia Jobs');
    const company = await makeCompany();
    const draft = await makeJob(company, { status: 'draft' });
    const live = await makeJob(company);

    const visible = (await jobs.listJobs(pia)).map((j) => j.id);
    assert.ok(visible.includes(live));
    assert.ok(!visible.includes(draft));
    await expectHttp(jobs.getJob(pia, draft), 404);
    assert.ok((await jobs.listJobs(admin)).map((j) => j.id).includes(draft));

    await expectHttp(jobs.updateJobStatus(live, 'closed'), 409, /Alasan/);
    const closed = await jobs.updateJobStatus(live, 'closed', 'Posisi terisi');
    assert.equal(closed.closedReason, 'Posisi terisi');
    await expectHttp(jobs.updateJobStatus(live, 'published'), 409);
  });

  test('revoking roster eligibility deactivates the account and ends its sessions', async () => {
    const rio = await makeUser('alumni', 'Rio Roster');
    await query(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ('h1',$1, now() + interval '1 day')`, [rio.id]);
    await roster.setEligibility(rio.rosterId!, 'revoked');
    assert.equal((await query('SELECT active FROM users WHERE id = $1', [rio.id])).rows[0].active, false);
    assert.equal((await query('SELECT count(*)::int n FROM sessions WHERE user_id = $1', [rio.id])).rows[0].n, 0);
    await roster.setEligibility(rio.rosterId!, 'eligible');
    assert.equal((await query('SELECT active FROM users WHERE id = $1', [rio.id])).rows[0].active, true);
  });

  test('roster import skips existing emails case-insensitively', async () => {
    const entry = (email: string) => ({ email, fullName: 'X', program: 'Full Course', batch: 'B1', eligibility: 'eligible' as const });
    const first = await roster.importRoster({ entries: [entry('new1@test.dev'), entry('new2@test.dev')] });
    assert.deepEqual(first, { added: 2, skipped: 0 });
    const second = await roster.importRoster({ entries: [entry('NEW1@test.dev'), entry('new3@test.dev')] });
    assert.deepEqual(second, { added: 1, skipped: 1 });
  });
});
