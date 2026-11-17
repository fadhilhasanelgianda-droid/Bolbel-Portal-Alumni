import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import type { SessionUser } from '../src/server/auth.ts';
import { getPool, query } from '../src/server/db.ts';
import { type Mail, setMailTransport } from '../src/server/mailer.ts';
import { runMigrations } from '../src/server/migrate.ts';
import * as processes from '../src/server/services/processes.ts';
import * as profiles from '../src/server/services/profiles.ts';
import { startTestPostgres } from './pg-server.ts';

let stopPg: () => Promise<void>;
let outbox: Mail[] = [];

const profileInput: profiles.ProfileInput = {
  phone: '0812', whatsappContact: true, employmentStatus: 'belum_bekerja', opennessStatus: 'aktif_mencari',
  startReadiness: 'segera', targetRoles: ['Paid Ads'], targetWorkTypes: ['full_time'], targetWorkModels: ['remote'],
  domicile: 'Jakarta', targetLocations: ['Jakarta'], experienceBand: '1-2_tahun', allowProactiveContact: true,
};

async function makeUser(role: 'alumni' | 'admin', name: string, active = true): Promise<SessionUser> {
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
    `INSERT INTO users (email, password_hash, role, full_name, roster_id, active) VALUES ($1,'x',$2,$3,$4,$5) RETURNING id`,
    [email, role, name, rosterId, active]
  );
  return { id: rows[0].id, email, role, fullName: name, rosterId };
}

async function makeAlumnusWithCv(name: string): Promise<SessionUser> {
  const user = await makeUser('alumni', name);
  await profiles.upsertProfile(user.id, profileInput);
  await query(
    `INSERT INTO cv_documents (owner_id, file_name, file_size_bytes, file_type, is_current_active, storage_key)
     VALUES ($1,'cv.pdf',1000,'application/pdf',true,$2)`,
    [user.id, `cvs/${crypto.randomUUID()}.pdf`]
  );
  return user;
}

async function makeJob(): Promise<string> {
  const companyId = (
    await query(`INSERT INTO companies (name, industry, relationship_source) VALUES ('Acme','Tech','company_inbound') RETURNING id`)
  ).rows[0].id;
  return (
    await query(
      `INSERT INTO jobs (company_id, title, summary, experience_level, work_type, work_model, location, salary_type,
                         apply_channel, status, process_owner, published_at)
       VALUES ($1,'Ads Specialist','s','junior','full_time','remote','Remote','uninformed','bolbel','published','Gifari',now())
       RETURNING id`,
      [companyId]
    )
  ).rows[0].id;
}

const to = (email: string) => outbox.filter((m) => m.to === email);

before(async () => {
  const pg = await startTestPostgres(54332);
  stopPg = pg.stop;
  process.env.DATABASE_URL = pg.url;
  process.env.APP_URL = 'https://portal.test';
  await runMigrations();
});
beforeEach(() => {
  outbox = [];
  setMailTransport(async (m) => void outbox.push(m));
});
after(async () => {
  setMailTransport(null);
  await getPool().end();
  await stopPg();
});

describe('status emails', () => {
  test('applying confirms to the alumnus and alerts active admins only', async () => {
    const admin = await makeUser('admin', 'Admin Notif');
    const gone = await makeUser('admin', 'Admin Gone', false);
    const sari = await makeAlumnusWithCv('Sari Notif');
    await processes.applyViaBolBel(sari, await makeJob(), true);

    const mine = to(sari.email);
    assert.equal(mine.length, 1);
    assert.match(mine[0].subject, /Lamaranmu diterima: Ads Specialist di Acme/);
    assert.match(mine[0].text, /https:\/\/portal\.test\//);
    assert.equal(to(admin.email).length, 1);
    assert.match(to(admin.email)[0].subject, /Lamaran baru: Sari Notif/);
    assert.equal(to(gone.email).length, 0);
  });

  test('stage changes email the alumnus with the public message and schedule, never internal notes', async () => {
    const admin = await makeUser('admin', 'Admin Stage');
    const eka = await makeAlumnusWithCv('Eka Notif');
    const { processId } = await processes.applyViaBolBel(eka, await makeJob(), true);
    outbox = [];

    const stage = (s: string, o: string, extra = {}) =>
      processes.updateStage(admin, processId, {
        stage: s, outcome: o, sourceType: 'admin_official', occurredAt: '2026-01-01', ...extra,
      } as never);

    await processes.forwardToCompany(admin, processId, { internalNotes: 'rahasia internal' });
    await stage('screening', 'aktif', { publicMessage: 'Lolos administrasi.', internalNotes: 'rahasia internal' });
    await stage('interview', 'aktif', { interviewSchedule: '2026-02-01 10:00', publicMessage: 'Interview dijadwalkan.' });

    const mails = to(eka.email);
    assert.equal(mails.length, 3);
    assert.match(mails[0].subject, /Diteruskan ke Company/);
    assert.match(mails[1].text, /Lolos administrasi\./);
    assert.match(mails[2].subject, /Interview/);
    assert.match(mails[2].text, /Jadwal interview: 2026-02-01 10:00/);
    assert.ok(mails.every((m) => !m.text.includes('rahasia')));

    // same stage and outcome again with only notes: no email
    await stage('interview', 'aktif', { internalNotes: 'cuma catatan' });
    assert.equal(to(eka.email).length, 3);

    await stage('interview', 'ditolak', { publicMessage: 'Belum sesuai kebutuhan.' });
    assert.match(to(eka.email)[3].subject, /Tidak Lolos \/ Ditolak/);
  });

  test('proposal emails the alumnus; approval emails the admins', async () => {
    const admin = await makeUser('admin', 'Admin Prop');
    const joko = await makeAlumnusWithCv('Joko Notif');
    const { processId } = await processes.createProposal(admin, { alumniId: joko.id, jobId: await makeJob() });

    assert.equal(to(joko.email).length, 1);
    assert.match(to(joko.email)[0].subject, /Ada peluang untukmu/);
    assert.equal(to(admin.email).length, 0);

    await processes.approveProposal(joko, processId);
    assert.equal(to(admin.email).length, 1);
    assert.match(to(admin.email)[0].subject, /Disetujui: Joko Notif/);
  });

  test('deactivated alumni get no email', async () => {
    const admin = await makeUser('admin', 'Admin Off');
    const lia = await makeAlumnusWithCv('Lia Off');
    const { processId } = await processes.applyViaBolBel(lia, await makeJob(), true);
    await query('UPDATE users SET active = false WHERE id = $1', [lia.id]);
    outbox = [];
    await processes.forwardToCompany(admin, processId, { internalNotes: '' });
    assert.equal(to(lia.email).length, 0);
  });

  test('a failing mail provider never breaks the action', async () => {
    setMailTransport(async () => {
      throw new Error('provider down');
    });
    const mira = await makeAlumnusWithCv('Mira Fail');
    const { processId } = await processes.applyViaBolBel(mira, await makeJob(), true);
    const [proc] = (await processes.listProcesses(mira)).filter((p) => p.id === processId);
    assert.equal(proc.currentStage, 'masuk_bolbel');
  });
});
