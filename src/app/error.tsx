'use client';

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-bold text-[#242424]">Ada yang tidak beres</h1>
      <p className="max-w-sm text-sm text-[#595959]">
        Halaman ini gagal dimuat. Coba lagi; kalau masih bermasalah, hubungi talent@bolehbelajar.com.
      </p>
      <button onClick={() => retry()} className="mt-2 px-4 py-2.5 rounded-lg bg-[#BD214C] text-white text-sm font-semibold hover:bg-[#a51d43]">
        Coba Lagi
      </button>
    </div>
  );
}
