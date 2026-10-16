import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { clientIp, createSession, isRateLimited, isSameOrigin, jsonError } from '@/server/auth';
import { query } from '@/server/db';
import { emailSchema } from '@/server/validation';

// Compared against when the email is unknown so login timing doesn't reveal which emails exist
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError('Origin tidak diizinkan.', 403);

  const body = z
    .object({ email: emailSchema, password: z.string().max(128) })
    .safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError('Email atau password tidak valid.', 400);

  // Per-IP stops spraying from one source; per-email stops guessing one account from many IPs
  if (
    (await isRateLimited(`login:ip:${clientIp(req)}`, 20, 15 * 60)) ||
    (await isRateLimited(`login:email:${body.data.email}`, 10, 15 * 60))
  ) {
    return jsonError('Terlalu banyak percobaan. Coba lagi beberapa menit lagi.', 429);
  }

  const { rows } = await query('SELECT id, password_hash, active FROM users WHERE lower(email) = $1', [
    body.data.email,
  ]);
  const user = rows[0];
  const ok = await bcrypt.compare(body.data.password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok || !user.active) return jsonError('Email atau password salah.', 401);

  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
