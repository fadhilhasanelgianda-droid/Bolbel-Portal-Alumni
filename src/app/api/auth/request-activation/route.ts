import { z } from 'zod';
import { NextResponse, after } from 'next/server';
import { clientIp, isRateLimited, isSameOrigin, jsonError } from '@/server/auth';
import { requestActivation } from '@/server/services/authTokens';
import { emailSchema } from '@/server/validation';

/** Same answer whether or not the email is on the roster; the link only ever goes to the roster address. */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError('Origin tidak diizinkan.', 403);
  const body = z.object({ email: emailSchema }).safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError('Email tidak valid.', 400);

  if (await isRateLimited(`reqact:ip:${clientIp(req)}`, 10, 15 * 60)) {
    return jsonError('Terlalu banyak percobaan. Coba lagi beberapa menit lagi.', 429);
  }
  // Per-email cap stops mailbox flooding; answered like a success so it reveals nothing
  if (!(await isRateLimited(`reqact:email:${body.data.email}`, 3, 60 * 60))) {
    after(() => requestActivation(body.data.email).catch((err) => console.error('requestActivation failed', err)));
  }
  return NextResponse.json({ ok: true });
}
