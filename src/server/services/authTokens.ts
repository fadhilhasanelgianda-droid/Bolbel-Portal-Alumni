import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import type pg from 'pg';
import { query, tx } from '../db.ts';
import { HttpError } from '../http.ts';
import { appUrl, sendMail } from '../mailer.ts';

const ACTIVATE_TTL_HOURS = 72;
const RESET_TTL_HOURS = 1;

const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const INVALID = 'Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru.';

async function issue(
  client: pg.PoolClient,
  purpose: 'activate' | 'reset',
  target: { rosterId?: string; userId?: string },
  ttlHours: number
): Promise<string> {
  // Only the newest link works: drop older unused ones for the same target
  await client.query(
    `DELETE FROM auth_tokens WHERE purpose = $1 AND used_at IS NULL AND (roster_id = $2 OR user_id = $3)`,
    [purpose, target.rosterId ?? null, target.userId ?? null]
  );
  const token = randomBytes(32).toString('base64url');
  await client.query(
    `INSERT INTO auth_tokens (token_hash, purpose, roster_id, user_id, expires_at)
     VALUES ($1, $2, $3, $4, now() + make_interval(hours => $5))`,
    [hash(token), purpose, target.rosterId ?? null, target.userId ?? null, ttlHours]
  );
  return token;
}

/**
 * Emails an activation link to a roster address. Returns nothing about whether the email is on the
 * roster: callers answer identically either way so the roster can't be probed.
 */
export async function requestActivation(email: string): Promise<void> {
  const entry = (
    await query(
      `SELECT id, email, full_name FROM roster_entries
        WHERE lower(email) = $1 AND eligibility = 'eligible' AND activated_at IS NULL`,
      [email]
    )
  ).rows[0];
  if (!entry) return;
  const token = await tx((c) => issue(c, 'activate', { rosterId: entry.id }, ACTIVATE_TTL_HOURS));
  await sendMail({
    to: entry.email,
    subject: 'Aktivasi akun Portal Karier Alumni Boleh Belajar',
    text:
      `Halo ${entry.full_name},\n\nKlik tautan berikut untuk membuat password dan mengaktifkan akunmu ` +
      `(berlaku ${ACTIVATE_TTL_HOURS} jam, hanya bisa dipakai sekali):\n\n${appUrl()}/?activate=${token}\n\n` +
      `Kalau kamu tidak merasa memintanya, abaikan email ini.`,
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = (await query('SELECT id, email, full_name FROM users WHERE lower(email) = $1 AND active', [email])).rows[0];
  if (!user) return;
  const token = await tx((c) => issue(c, 'reset', { userId: user.id }, RESET_TTL_HOURS));
  await sendMail({
    to: user.email,
    subject: 'Reset password Portal Karier Alumni Boleh Belajar',
    text:
      `Halo ${user.full_name},\n\nKlik tautan berikut untuk membuat password baru ` +
      `(berlaku ${RESET_TTL_HOURS} jam, hanya bisa dipakai sekali):\n\n${appUrl()}/?reset=${token}\n\n` +
      `Kalau kamu tidak merasa memintanya, abaikan email ini; passwordmu tidak berubah.`,
  });
}

async function peek(token: string, purpose: 'activate' | 'reset'): Promise<boolean> {
  const { rowCount } = await query(
    `SELECT 1 FROM auth_tokens WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > now()`,
    [hash(token), purpose]
  );
  return Boolean(rowCount);
}

/** Consumes the token atomically; two concurrent uses of one link cannot both succeed. */
async function consume(client: pg.PoolClient, token: string, purpose: 'activate' | 'reset') {
  const { rows } = await client.query(
    `UPDATE auth_tokens SET used_at = now()
      WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > now()
      RETURNING roster_id, user_id`,
    [hash(token), purpose]
  );
  if (!rows[0]) throw new HttpError(400, INVALID);
  return rows[0] as { roster_id: string | null; user_id: string | null };
}

/** Creates the account for the roster entry the token was issued to. Email comes from the roster, never the client. */
export async function activateWithToken(token: string, password: string): Promise<string> {
  if (!(await peek(token, 'activate'))) throw new HttpError(400, INVALID);
  const passwordHash = await bcrypt.hash(password, 12); // after the cheap check, before the transaction
  return tx(async (client) => {
    const t = await consume(client, token, 'activate');
    const { rows } = await client.query(
      `SELECT id, email, full_name FROM roster_entries
        WHERE id = $1 AND eligibility = 'eligible' AND activated_at IS NULL FOR UPDATE`,
      [t.roster_id]
    );
    const entry = rows[0];
    if (!entry) throw new HttpError(400, INVALID);
    const created = await client.query(
      `INSERT INTO users (email, password_hash, role, full_name, roster_id)
       VALUES (lower($1), $2, 'alumni', $3, $4) RETURNING id`,
      [entry.email, passwordHash, entry.full_name, entry.id]
    );
    await client.query('UPDATE roster_entries SET activated_at = now() WHERE id = $1', [entry.id]);
    return created.rows[0].id as string;
  });
}

/** Sets the new password and ends every existing session of that user. */
export async function resetWithToken(token: string, password: string): Promise<void> {
  if (!(await peek(token, 'reset'))) throw new HttpError(400, INVALID);
  const passwordHash = await bcrypt.hash(password, 12);
  await tx(async (client) => {
    const t = await consume(client, token, 'reset');
    const { rowCount } = await client.query('UPDATE users SET password_hash = $2 WHERE id = $1 AND active', [
      t.user_id,
      passwordHash,
    ]);
    if (!rowCount) throw new HttpError(400, INVALID);
    await client.query('DELETE FROM sessions WHERE user_id = $1', [t.user_id]);
    await client.query('DELETE FROM auth_tokens WHERE user_id = $1', [t.user_id]);
  });
}
