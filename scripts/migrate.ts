import { getPool } from '../src/server/db.ts';
import { runMigrations } from '../src/server/migrate.ts';

for (const file of await runMigrations()) console.log(`migrated ${file}`);
await getPool().end();
