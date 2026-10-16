export const config = {
  isProd: process.env.NODE_ENV === 'production',
  sessionTtlDays: 7,
};

/** Read lazily so `next build` doesn't need DATABASE_URL just to collect routes. */
export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Missing required env var DATABASE_URL');
  return url;
}
