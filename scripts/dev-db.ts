// Local Postgres for development: PGlite (Postgres compiled to WASM) exposed on a TCP port,
// persisted under .pglite/. Lets you run the app without installing Postgres.
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const port = Number(process.env.DEV_DB_PORT ?? 5433);
const db = await PGlite.create('./.pglite');
const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' });
await server.start();
console.log(`dev database ready: postgres://postgres:postgres@127.0.0.1:${port}/postgres`);

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  });
}
