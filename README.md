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

Unggah CV berjalan di lokal: file disimpan di `.data/uploads/` (di-ignore git). CV demo hasil seed hanya metadata, jadi tombol unduhnya menjawab "File CV tidak ditemukan" sampai CV-nya diunggah ulang.

`db:seed-demo` hanya mau jalan terhadap database lokal: ia menolak `NODE_ENV=production` dan juga `DATABASE_URL` yang host-nya bukan `localhost`/`127.0.0.1`. Akun demo memakai password publik, jadi jangan pernah dijalankan ke database production (kalau `.env` lokal lo diarahkan ke production untuk `db:migrate`, kembalikan dulu ke database lokal).

## Production (Vercel + Postgres)

- Penyimpanan CV: buat **Vercel Blob** berakses **Private** (dashboard Vercel > Storage > Create > Blob > Private), lalu sambungkan ke project. File hanya bisa dibuka lewat API app setelah cek login. Batas unggah 4 MB karena Vercel menolak body request di atas 4,5 MB. Di luar Vercel, set `BLOB_READ_WRITE_TOKEN`.
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
