import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import type { SessionUser } from '../src/server/auth.ts';
import { getPool, query } from '../src/server/db.ts';
import { HttpError } from '../src/server/http.ts';
import { runMigrations } from '../src/server/migrate.ts';
import * as cvs from '../src/server/services/cvs.ts';
import { memoryStorage, readAll, setFileStorage } from '../src/server/storage.ts';
import { startTestPostgres } from './pg-server.ts';

let stopPg: () => Promise<void>;
let store = memoryStorage();

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

const pdf = (size = 200) => Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(size, 0x20)]);
const rejects = (p: Promise<unknown>, status: number, msg?: RegExp) =>
  assert.rejects(p, (e) => e instanceof HttpError && e.status === status && (!msg || msg.test(e.message)));

before(async () => {
  const pg = await startTestPostgres(54333);
  stopPg = pg.stop;
  process.env.DATABASE_URL = pg.url;
  await runMigrations();
});
beforeEach(() => {
  store = memoryStorage();
  setFileStorage(store);
});
after(async () => {
  setFileStorage(null);
  await getPool().end();
  await stopPg();
});

describe('CV upload and download', () => {
  test('stores the file privately, makes the newest upload the only active CV, and returns the same bytes', async () => {
    const sari = await makeUser('alumni', 'Sari Upload');
    const first = await cvs.uploadCv(sari, 'CV Sari 2025.pdf', pdf(100));
    const second = await cvs.uploadCv(sari, 'CV Sari 2026.PDF', pdf(300));

    const list = await cvs.listCvs(sari.id);
    assert.equal(list.length, 2);
    assert.deepEqual(list.filter((c) => c.isCurrentActive).map((c) => c.id), [second.id]);
    assert.equal(second.fileName, 'CV Sari 2026.pdf');
    assert.match(second.storageKey, new RegExp(`^cvs/${sari.id}/[0-9a-f-]{36}\\.pdf$`));
    assert.equal(store.files.size, 2);

    const { file } = await cvs.openCvFile(sari, first.id);
    assert.deepEqual(await readAll(file.stream), pdf(100));
  });

  test('rejects empty, oversized and non-PDF content even when named .pdf', async () => {
    const budi = await makeUser('alumni', 'Budi Invalid');
    await rejects(cvs.uploadCv(budi, 'a.pdf', Buffer.alloc(0)), 400, /kosong/);
    await rejects(cvs.uploadCv(budi, 'a.pdf', pdf(cvs.MAX_CV_BYTES)), 413, /4 MB/);
    await rejects(cvs.uploadCv(budi, 'fake.pdf', Buffer.from('MZ\x90\x00 not a pdf')), 400, /PDF/);
    assert.equal(store.files.size, 0);
    assert.equal((await cvs.listCvs(budi.id)).length, 0);
  });

  test('file names are cleaned: no paths, control characters or double extensions', () => {
    assert.equal(cvs.cleanFileName('C:\\Users\\budi\\CV Budi (final).pdf'), 'CV Budi (final).pdf');
    assert.equal(cvs.cleanFileName('../../etc/passwd'), 'passwd.pdf');
    assert.equal(cvs.cleanFileName('a\u0000b"c<d>.pdf'), 'abcd.pdf');
    assert.equal(cvs.cleanFileName('   .pdf'), 'CV.pdf');
    assert.ok(cvs.cleanFileName('x'.repeat(500)).length <= 104);
  });

  test("only the owner or an admin can open a CV; another alumnus gets a 404", async () => {
    const dina = await makeUser('alumni', 'Dina Owner');
    const eka = await makeUser('alumni', 'Eka Other');
    const admin = await makeUser('admin', 'Admin Files');
    const cv = await cvs.uploadCv(dina, 'cv.pdf', pdf());

    await rejects(cvs.openCvFile(eka, cv.id), 404);
    assert.equal((await cvs.openCvFile(admin, cv.id)).cv.id, cv.id);
    assert.equal((await cvs.openCvFile(dina, cv.id)).cv.id, cv.id);
    await rejects(cvs.openCvFile(dina, crypto.randomUUID()), 404);
  });

  test('a CV row whose file is missing gives a clear 404 instead of a crash', async () => {
    const joko = await makeUser('alumni', 'Joko Missing');
    const cv = await cvs.uploadCv(joko, 'cv.pdf', pdf());
    store.files.clear();
    await rejects(cvs.openCvFile(joko, cv.id), 404, /tidak ditemukan di penyimpanan/);
  });

  test('deleting a CV removes its file; the active CV keeps working', async () => {
    const lia = await makeUser('alumni', 'Lia Delete');
    const old = await cvs.uploadCv(lia, 'old.pdf', pdf(10));
    const current = await cvs.uploadCv(lia, 'new.pdf', pdf(20));
    await cvs.deleteCv(lia.id, old.id);
    assert.equal(store.files.size, 1);
    assert.ok(store.files.has(current.storageKey));
    assert.equal((await cvs.listCvs(lia.id)).length, 1);
  });

  test('a failed storage delete does not fail the request', async () => {
    const mira = await makeUser('alumni', 'Mira Flaky');
    const cv = await cvs.uploadCv(mira, 'cv.pdf', pdf());
    store.del = async () => {
      throw new Error('storage down');
    };
    await cvs.deleteCv(mira.id, cv.id);
    assert.equal((await cvs.listCvs(mira.id)).length, 0);
  });

  test('a failed storage upload leaves no database row', async () => {
    const nia = await makeUser('alumni', 'Nia Failing');
    store.put = async () => {
      throw new Error('storage down');
    };
    await assert.rejects(cvs.uploadCv(nia, 'cv.pdf', pdf()), /storage down/);
    assert.equal((await cvs.listCvs(nia.id)).length, 0);
  });

  test(`at most ${cvs.MAX_CVS_PER_OWNER} versions per alumnus`, async () => {
    const omar = await makeUser('alumni', 'Omar Many');
    for (let i = 0; i < cvs.MAX_CVS_PER_OWNER; i++) await cvs.uploadCv(omar, `cv${i}.pdf`, pdf(i + 1));
    await rejects(cvs.uploadCv(omar, 'one-more.pdf', pdf()), 409, /Maksimal/);
    assert.equal(store.files.size, cvs.MAX_CVS_PER_OWNER);
  });
});
