import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { getPool, tx } from './db.ts';

const dir = path.join(import.meta.dirname, '..', '..', 'db', 'migrations');

export async function runMigrations(): Promise<string[]> {
  const applied: string[] = [];
  await getPool().query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())'
  );
  for (const file of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
    await tx(async (client) => {
      // Advisory lock so concurrent runs don't apply the same migration twice
      await client.query('SELECT pg_advisory_xact_lock(727274)');
      if ((await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file])).rowCount) return;
      await client.query(await readFile(path.join(dir, file), 'utf8'));
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      applied.push(file);
    });
  }
  return applied;
}
