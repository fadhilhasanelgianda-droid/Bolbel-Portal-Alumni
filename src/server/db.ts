import pg from 'pg';
import { databaseUrl } from './config.ts';

// DATE columns stay 'YYYY-MM-DD' strings (the default Date parsing shifts them by timezone),
// and bigint (salary, counts) fits in a JS number for our ranges.
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(20, (v) => Number(v));

// Reuse one pool per warm serverless instance (and across dev hot reloads).
// Keep it small: every concurrent instance opens its own connections, so point DATABASE_URL
// at a pooled endpoint (e.g. PgBouncer / Neon pooler) in production.
const globalForPg = globalThis as unknown as { __bolbelPool?: pg.Pool };

export function getPool(): pg.Pool {
  if (!globalForPg.__bolbelPool) {
    const pool = new pg.Pool({ connectionString: databaseUrl(), max: 5, idleTimeoutMillis: 10_000 });
    // Without this, an error on an idle client (e.g. server restart) is an unhandled 'error' event and kills the process
    pool.on('error', (err) => console.error('idle pg client error', err.message));
    globalForPg.__bolbelPool = pool;
  }
  return globalForPg.__bolbelPool;
}

export const query: pg.Pool['query'] = ((...args: unknown[]) =>
  (getPool().query as (...a: unknown[]) => unknown)(...args)) as pg.Pool['query'];

export async function tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
