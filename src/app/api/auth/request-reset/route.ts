import { z } from 'zod';
import { NextResponse, after } from 'next/server';
import { clientIp, isRateLimited, isSameOrigin, jsonError } from '@/server/auth';
import { requestPasswordReset } from '@/server/services/authTokens';
import { emailSchema } from '@/server/validation';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError('Origin tidak diizinkan.', 403);
  const body = z.object({ email: emailSchema }).safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError('Email tidak valid.', 400);

  if (await isRateLimited(`reqreset:ip:${clientIp(req)}`, 10, 15 * 60)) {
    return jsonError('Terlalu banyak percobaan. Coba lagi beberapa menit lagi.', 429);
  }
  if (!(await isRateLimited(`reqreset:email:${body.data.email}`, 3, 60 * 60))) {
    after(() => requestPasswordReset(body.data.email).catch((err) => console.error('requestPasswordReset failed', err)));
  }
  return NextResponse.json({ ok: true });
}
