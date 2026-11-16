# Portal Karier Alumni Boleh Belajar

Next.js (App Router) + Postgres. Aturan bisnis ada di `src/domain/stateMachine.ts` dan dijalankan di server (`src/server/services/`).

## Menjalankan di lokal

Tanpa perlu memasang Postgres (memakai PGlite):

```bash
npm install
cp .env.example .env        # lalu set DATABASE_URL ke postgres://postgres:postgres@127.0.0.1:5433/postgres dan DB_POOL_MAX=1
npm run db:dev              # terminal 1: database lokal (data tersimpan di .pglite/)
npm run db:seed-demo        # terminal 2: migrasi + data demo
npm run dev                 # terminal 2: http://localhost:3000
```

Akun demo (password `demo-password-123`): `gifari@bolehbelajar.com` (admin), `fadhil@bolehdicoba.com`, `sarah.annisa@alumni.com`, `dimas.w@alumni.com` (alumni).
`baru@alumni.com` ada di roster tapi belum aktif: coba tab **Aktivasi Akun**. Tautan aktivasi (dan reset password) dikirim lewat email; di lokal tanpa `RESEND_API_KEY` isi emailnya dicetak di terminal `npm run dev`.

Unggah CV belum tersedia (CV demo hanya metadata).

## Production (Vercel + Postgres)

- Set `DATABASE_URL` (gunakan endpoint dengan pooler dan `?sslmode=require` bila perlu).
- Jalankan dari lokal terhadap database production: `npm run db:migrate`, lalu `ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:seed-admin`.
- Alumni diaktivasi sendiri lewat tautan satu-kali yang dikirim ke email roster (`eligible`); reset password juga lewat tautan email. Wajib set `APP_URL`, `RESEND_API_KEY`, dan `MAIL_FROM` (pengirim terverifikasi di Resend). Tanpa itu pengiriman email gagal di produksi.
- Jalankan `npm run db:migrate` (ada migrasi baru `005_indexes`).

## Test

```bash
npm test                    # unit test aturan domain
npm run test:integration    # alur bisnis terhadap Postgres (PGlite)
npm run lint                # typecheck
```
