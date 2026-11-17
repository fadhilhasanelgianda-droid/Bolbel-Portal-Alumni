import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import bcrypt from 'bcryptjs';
import { getPool, query } from '../src/server/db.ts';
import { HttpError } from '../src/server/http.ts';
import { type Mail, setMailTransport } from '../src/server/mailer.ts';
import { runMigrations } from '../src/server/migrate.ts';
import * as tokens from '../src/server/services/authTokens.ts';
import { startTestPostgres } from './pg-server.ts';

let stopPg: () => Promise<void>;
let outbox: Mail[] = [];

const settle = () => new Promise((r) => setTimeout(r, 30));
const tokenIn = (m: Mail) => m.text.match(/\?(?:activate|reset)=([\w-]+)/)![1];
const rejects400 = async (p: Promise<unknown>) => {
  await assert.rejects(p, (e) => e instanceof HttpError && e.status === 400);
  await settle();
};

async function addRoster(email: string, eligibility = 'eligible') {
  return (
    await query(
      `INSERT INTO roster_entries (email, full_name, program, batch, eligibility) VALUES ($1,'Nama Alumni','Full Course','B1',$2) RETURNING id`,
      [email, eligibility]
    )
  ).rows[0].id as string;
}

before(async () => {
  const pg = await startTestPostgres(54331);
  stopPg = pg.stop;
  process.env.DATABASE_URL = pg.url;
  process.env.APP_URL = 'https://portal.test';
  await runMigrations();
  setMailTransport(async (m) => void outbox.push(m));
});
beforeEach(() => {
  outbox = [];
});
after(async () => {
  setMailTransport(null);
  await getPool().end();
  await stopPg();
});

describe('activation by emailed link', () => {
  test('mail goes only to a roster address; unknown/ineligible/already-activated get nothing', async () => {
    await addRoster('pending@test.dev', 'pending');
    await tokens.requestActivation('nobody@test.dev');
    await tokens.requestActivation('pending@test.dev');
    assert.equal(outbox.length, 0);
    await addRoster('ok1@test.dev');
    await tokens.requestActivation('ok1@test.dev');
    assert.equal(outbox.length, 1);
    assert.equal(outbox[0].to, 'ok1@test.dev');
    assert.match(outbox[0].text, /^.*https:\/\/portal\.test\/\?activate=/ms);
  });

  test('link creates the account for the roster email, once; the token is stored hashed', async () => {
    await addRoster('ok2@test.dev');
    await tokens.requestActivation('ok2@test.dev');
    const token = tokenIn(outbox[0]);
    assert.equal((await query('SELECT 1 FROM auth_tokens WHERE token_hash = $1', [token])).rowCount, 0);

    const userId = await tokens.activateWithToken(token, 'a-long-password-1');
    const u = (await query('SELECT email, role, password_hash FROM users WHERE id = $1', [userId])).rows[0];
    assert.equal(u.email, 'ok2@test.dev');
    assert.equal(u.role, 'alumni');
    assert.ok(await bcrypt.compare('a-long-password-1', u.password_hash));
    await rejects400(tokens.activateWithToken(token, 'another-password-2'));
    await tokens.requestActivation('ok2@test.dev'); // already activated -> no new mail
    assert.equal(outbox.length, 1);
  });

  test('a newer link invalidates the older one; expired and garbage tokens are refused', async () => {
    await addRoster('ok3@test.dev');
    await tokens.requestActivation('ok3@test.dev');
    await tokens.requestActivation('ok3@test.dev');
    const [oldT, newT] = outbox.map(tokenIn);
    await rejects400(tokens.activateWithToken(oldT, 'a-long-password-1'));
    await query(`UPDATE auth_tokens SET expires_at = now() - interval '1 second'`);
    await rejects400(tokens.activateWithToken(newT, 'a-long-password-1'));
    await rejects400(tokens.activateWithToken('x'.repeat(43), 'a-long-password-1'));
  });

  test('revoking eligibility after the mail was sent blocks the link', async () => {
    const id = await addRoster('ok4@test.dev');
    await tokens.requestActivation('ok4@test.dev');
    await query(`UPDATE roster_entries SET eligibility = 'revoked' WHERE id = $1`, [id]);
    await rejects400(tokens.activateWithToken(tokenIn(outbox[0]), 'a-long-password-1'));
  });

  test('concurrent use of one link creates exactly one account', async () => {
    await addRoster('ok5@test.dev');
    await tokens.requestActivation('ok5@test.dev');
    const t = tokenIn(outbox[0]);
    const results = await Promise.allSettled([
      tokens.activateWithToken(t, 'a-long-password-1'),
      tokens.activateWithToken(t, 'a-long-password-2'),
    ]);
    await settle();
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal((await query(`SELECT count(*)::int n FROM users WHERE email = 'ok5@test.dev'`)).rows[0].n, 1);
  });
});

describe('password reset', () => {
  async function makeUser(email: string, active = true) {
    const rosterId = await addRoster(email);
    return (
      await query(
        `INSERT INTO users (email, password_hash, role, full_name, roster_id, active) VALUES ($1,$2,'alumni','N',$3,$4) RETURNING id`,
        [email, await bcrypt.hash('old-password-123', 4), rosterId, active]
      )
    ).rows[0].id as string;
  }

  test('only active accounts get a mail; reset changes the password, ends all sessions, and works once', async () => {
    await makeUser('gone@test.dev', false);
    await tokens.requestPasswordReset('gone@test.dev');
    await tokens.requestPasswordReset('nobody@test.dev');
    assert.equal(outbox.length, 0);

    const id = await makeUser('rst@test.dev');
    await query(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ('s1',$1, now() + interval '1 day'), ('s2',$1, now() + interval '1 day')`, [id]);
    await tokens.requestPasswordReset('rst@test.dev');
    assert.equal(outbox.length, 1);
    const t = tokenIn(outbox[0]);

    await tokens.resetWithToken(t, 'brand-new-password');
    const hashNow = (await query('SELECT password_hash FROM users WHERE id = $1', [id])).rows[0].password_hash;
    assert.ok(await bcrypt.compare('brand-new-password', hashNow));
    assert.ok(!(await bcrypt.compare('old-password-123', hashNow)));
    assert.equal((await query('SELECT count(*)::int n FROM sessions WHERE user_id = $1', [id])).rows[0].n, 0);
    await rejects400(tokens.resetWithToken(t, 'yet-another-password'));
  });

  test('an activation token cannot be used to reset a password, nor the reverse', async () => {
    await makeUser('x1@test.dev');
    await tokens.requestPasswordReset('x1@test.dev');
    await rejects400(tokens.activateWithToken(tokenIn(outbox[0]), 'a-long-password-1'));
    await addRoster('x2@test.dev');
    await tokens.requestActivation('x2@test.dev');
    await rejects400(tokens.resetWithToken(tokenIn(outbox[1]), 'a-long-password-1'));
  });
});
