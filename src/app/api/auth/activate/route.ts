import { z } from 'zod';
import { NextResponse } from 'next/server';
import { clientIp, createSession, isRateLimited, isSameOrigin, jsonError } from '@/server/auth';
import { HttpError } from '@/server/http';
import { activateWithToken } from '@/server/services/authTokens';
import { passwordSchema } from '@/server/validation';

/** Finishes activation with the one-time link emailed to the roster address (see request-activation). */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError('Origin tidak diizinkan.', 403);
  const body = z
    .object({ token: z.string().min(20).max(200), password: passwordSchema })
    .safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError(body.error.issues[0]?.message ?? 'Data tidak valid.', 400);

  if (await isRateLimited(`activate:ip:${clientIp(req)}`, 10, 15 * 60)) {
    return jsonError('Terlalu banyak percobaan. Coba lagi beberapa menit lagi.', 429);
  }
  try {
    await createSession(await activateWithToken(body.data.token, body.data.password));
  } catch (err) {
    if (err instanceof HttpError) return jsonError(err.message, err.status);
    if ((err as { code?: string }).code === '23505') return jsonError('Akun untuk email ini sudah ada.', 409);
    console.error(err);
    return jsonError('Terjadi kesalahan pada server.', 500);
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
