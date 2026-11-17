import { NextResponse } from 'next/server';
import { query } from '@/server/db';

export const dynamic = 'force-dynamic';

/** Liveness + DB reachability for uptime monitors and the host's health check. No auth, no data. */
export async function GET() {
  try {
    await query('SELECT 1');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('health check failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
