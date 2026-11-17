import { NextResponse } from 'next/server';
import { destroySession, isSameOrigin, jsonError } from '@/server/auth';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError('Origin tidak diizinkan.', 403);
  await destroySession();
  return NextResponse.json({ ok: true });
}
