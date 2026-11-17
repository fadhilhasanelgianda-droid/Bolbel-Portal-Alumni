import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm font-semibold text-[#BD214C]">404</p>
      <h1 className="text-2xl font-bold text-[#242424]">Halaman tidak ditemukan</h1>
      <p className="max-w-sm text-sm text-[#595959]">
        Alamat yang kamu buka tidak ada atau sudah dipindahkan. Kembali ke beranda untuk melanjutkan.
      </p>
      <Link href="/" className="mt-2 px-4 py-2.5 rounded-lg bg-[#BD214C] text-white text-sm font-semibold hover:bg-[#a51d43]">
        Kembali ke Beranda
      </Link>
      <p className="text-xs text-[#595959]">Butuh bantuan? Hubungi talent@bolehbelajar.com</p>
    </div>
  );
}
