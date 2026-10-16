import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });

const description =
  'Portal karier resmi alumni Boleh Belajar untuk mengakses lowongan terkurasi, manajemen profil & CV, serta tracking proses seleksi terverifikasi.';

export const metadata: Metadata = {
  title: 'Portal Karier Alumni Boleh Belajar',
  description,
  openGraph: { title: 'Portal Karier Alumni Boleh Belajar', description, type: 'website' },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={dmSans.variable}>
      <body className="bg-[#F7F7F7] text-[#242424] antialiased selection:bg-[#BD214C]/15 selection:text-[#BD214C]">
        {children}
      </body>
    </html>
  );
}
