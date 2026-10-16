import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { clientIp, createSession, isRateLimited, isSameOrigin, jsonError } from '@/server/auth';
import { tx } from '@/server/db';
import { emailSchema, passwordSchema } from '@/server/validation';

/** Alumni set their password once; only emails on the roster with eligibility 'eligible' may activate. */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError('Origin tidak diizinkan.', 403);

  const body = z
    .object({ email: emailSchema, password: passwordSchema })
    .safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError(body.error.issues[0]?.message ?? 'Data tidak valid.', 400);

  if (await isRateLimited(`activate:ip:${clientIp(req)}`, 10, 15 * 60)) {
    return jsonError('Terlalu banyak percobaan. Coba lagi beberapa menit lagi.', 429);
  }

  const passwordHash = await bcrypt.hash(body.data.password, 12);
  const userId = await tx(async (client) => {
    const { rows } = await client.query(
      `SELECT id, full_name FROM roster_entries
        WHERE lower(email) = $1 AND eligibility = 'eligible' AND activated_at IS NULL
        FOR UPDATE`,
      [body.data.email]
    );
    const entry = rows[0];
    if (!entry) return null;
    const created = await client.query(
      `INSERT INTO users (email, password_hash, role, full_name, roster_id)
       VALUES ($1, $2, 'alumni', $3, $4) RETURNING id`,
      [body.data.email, passwordHash, entry.full_name, entry.id]
    );
    await client.query('UPDATE roster_entries SET activated_at = now() WHERE id = $1', [entry.id]);
    return created.rows[0].id as string;
  });

  if (!userId) {
    // One message for unknown / ineligible / already-activated so the roster can't be probed
    return jsonError('Email ini tidak dapat diaktivasi. Hubungi tim BolBel jika kamu merasa ini keliru.', 400);
  }
  await createSession(userId);
  return NextResponse.json({ ok: true }, { status: 201 });
}
