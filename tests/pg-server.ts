import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

/** In-process Postgres (WASM) exposed on a TCP port so the real `pg` pool code is exercised. */
export async function startTestPostgres(port: number) {
  const db = await PGlite.create();
  const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' });
  await server.start();
  return {
    url: `postgres://postgres:postgres@127.0.0.1:${port}/postgres`,
    stop: async () => {
      await server.stop();
      await db.close();
    },
  };
}
