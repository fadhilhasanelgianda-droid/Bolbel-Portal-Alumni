import type { Instrumentation } from 'next';

/** Fail at boot, not on the first request / first email, when production config is missing. */
export function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'production') return;
  // `next build` also runs with NODE_ENV=production but doesn't start the server, so register() is not called there
  const missing = ['DATABASE_URL', 'APP_URL', 'RESEND_API_KEY', 'MAIL_FROM'].filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing required env vars: ${missing.join(', ')}`);
}

/** One structured line per unhandled server error: easy to filter in the host's log viewer. */
export const onRequestError: Instrumentation.onRequestError = (err, request) => {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error(JSON.stringify({ level: 'error', msg: e.message, path: request.path, method: request.method, stack: e.stack }));
};
