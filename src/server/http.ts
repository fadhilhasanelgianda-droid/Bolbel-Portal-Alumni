import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorize, isSameOrigin, jsonError, type SessionUser } from './auth.ts';
import type { UserRole } from '../domain/types.ts';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export const created = (data: unknown) => NextResponse.json(data, { status: 201 });

interface RouteOptions<B> {
  /** Required role; omit to allow any signed-in user. */
  role?: UserRole;
  /** Zod schema for the JSON body. */
  body?: z.ZodType<B>;
}

interface Ctx<B, P> {
  user: SessionUser;
  body: B;
  params: P;
  req: Request;
}

/**
 * Wraps a Route Handler with: same-origin check on mutations, auth + role check,
 * JSON body validation, and uniform error mapping. The handler returns plain data (200),
 * `created(data)` (201) or throws HttpError.
 */
export function route<B = undefined, P = Record<string, string>>(
  options: RouteOptions<B>,
  handler: (ctx: Ctx<B, P>) => Promise<unknown>
) {
  return async (req: Request, routeCtx?: { params: Promise<P> }): Promise<Response> => {
    try {
      const safe = req.method === 'GET' || req.method === 'HEAD';
      if (!safe && !isSameOrigin(req)) return jsonError('Origin tidak diizinkan.', 403);

      const auth = await authorize(options.role);
      if (auth instanceof NextResponse) return auth;

      let body = undefined as B;
      if (options.body) {
        const parsed = options.body.safeParse(await req.json().catch(() => null));
        if (!parsed.success) {
          return jsonError(parsed.error.issues[0]?.message ?? 'Data tidak valid.', 400);
        }
        body = parsed.data;
      }

      const params = (routeCtx ? await routeCtx.params : {}) as P;
      const result = await handler({ user: auth, body, params, req });
      return result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
    } catch (err) {
      if (err instanceof HttpError) return jsonError(err.message, err.status);
      // Postgres: unique_violation, foreign_key_violation, invalid_text_representation (bad uuid)
      const code = (err as { code?: string }).code;
      if (code === '23505') return jsonError('Data sudah ada.', 409);
      // 23001 = restrict_violation (ON DELETE RESTRICT), 23503 = foreign_key_violation
      if (code === '23001' || code === '23503') return jsonError('Data masih dipakai oleh data lain.', 409);
      if (code === '22P02') return jsonError('ID tidak valid.', 400);
      console.error(err);
      return jsonError('Terjadi kesalahan pada server.', 500);
    }
  };
}

export const uuid = z.string().uuid('ID tidak valid.');
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.');
