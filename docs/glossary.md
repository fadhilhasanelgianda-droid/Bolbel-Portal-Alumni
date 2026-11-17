# Glosarium istilah UI

Satu istilah per konsep, supaya teks di layar, email, dan pesan error konsisten.

| Konsep | Pakai | Hindari |
|---|---|---|
| Alumni melamar | **Lamar**, **Lamaran** ("Lamar Lewat BolBel", "Lamar di Situs Company", "Jalur Lamaran") | "Apply" |
| Admin menawarkan lowongan ke alumni | **Rekomendasi** ("Rekomendasi Proaktif") | "Pengajuan", "Penawaran" |
| Izin berbagi CV dan profil | **Persetujuan** | "Consent" (hanya boleh di kode dan nama kolom DB) |
| Orang yang dicari admin | **Kandidat** | "Talent", "Talent pool" |
| Nama produk | **BolBel** (singkatan dalam UI), **Boleh Belajar** (nama lengkap) | |
| Kode di layar | Kode pendek 8 karakter via `shortRef()` di `src/domain/labels.ts` | UUID penuh |

Label enum (jenis kerja, model kerja, kesiapan, pengalaman) ada di `src/domain/labels.ts`; jangan menampilkan nilai mentah seperti `full_time` atau `notice_period`.
