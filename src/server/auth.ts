import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from './config.ts';
import { query } from './db.ts';
import type { UserRole } from '../domain/types.ts';

export const SESSION_COOKIE = 'bb_session';

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  rosterId: string | null;
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const jsonError = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + config.sessionTtlDays * 24 * 60 * 60 * 1000);
  await query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [
    hashToken(token),
    userId,
    expiresAt,
  ]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user for this request, or null. Safe to call from Route Handlers and Server Components. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const { rows } = await query(
    `SELECT u.id, u.email, u.role, u.full_name, u.roster_id
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.active`,
    [hashToken(token)]
  );
  const r = rows[0];
  return r ? { id: r.id, email: r.email, role: r.role, fullName: r.full_name, rosterId: r.roster_id } : null;
}

/**
 * Guard for Route Handlers: returns the user, or a ready-to-return 401/403 response.
 *   const auth = await authorize('admin'); if (auth instanceof NextResponse) return auth;
 */
export async function authorize(role?: UserRole): Promise<SessionUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return jsonError('Silakan masuk terlebih dahulu.', 401);
  if (role && user.role !== role) return jsonError('Kamu tidak memiliki akses ke sumber daya ini.', 403);
  return user;
}

/**
 * Second layer against CSRF on mutating requests (SameSite=Lax is the first):
 * a browser-sent Origin must match the host the request was served from.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // non-browser clients; cookies can't be abused cross-site without Origin
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function clientIp(req: Request): string {
  return req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

/** Counts this hit and returns true if `key` exceeded `limit` hits within `windowSeconds`. */
export async function isRateLimited(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  await query('INSERT INTO rate_limit_hits (key) VALUES ($1)', [key]);
  const { rows } = await query(
    `SELECT count(*)::int AS n FROM rate_limit_hits
      WHERE key = $1 AND hit_at > now() - make_interval(secs => $2)`,
    [key, windowSeconds]
  );
  // Opportunistic cleanup so the table doesn't grow without bound
  if (Math.random() < 0.02) await query(`DELETE FROM rate_limit_hits WHERE hit_at < now() - interval '1 day'`);
  return rows[0].n > limit;
}
