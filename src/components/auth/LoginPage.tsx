'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../client/api.ts';

type Mode = 'login' | 'activate' | 'forgot' | 'set-password';
type TokenPurpose = 'activate' | 'reset';

/** One-time link from the email: /?activate=TOKEN or /?reset=TOKEN. Read once, then removed from the address bar. */
function readLinkToken(): { token: string; purpose: TokenPurpose } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const activate = params.get('activate');
  const reset = params.get('reset');
  if (activate) return { token: activate, purpose: 'activate' };
  if (reset) return { token: reset, purpose: 'reset' };
  return null;
}

export const LoginPage: React.FC<{ onAuthenticated: () => void }> = ({ onAuthenticated }) => {
  const [link] = useState(readLinkToken);
  const [mode, setMode] = useState<Mode>(link ? 'set-password' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Seconds before the same link can be requested again; also tells the user the first request went through
  const [cooldown, setCooldown] = useState(0);
  const [linkSent, setLinkSent] = useState(false);
  // Validation message tied to one field (shown under it, announced via aria-describedby)
  const [fieldError, setFieldError] = useState<{ field: 'password' | 'confirm'; message: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (link) window.history.replaceState(null, '', window.location.pathname);
  }, [link]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword('');
    setConfirm('');
    setLinkSent(false);
    setCooldown(0);
    setFieldError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setFieldError(null);

    if (mode === 'set-password') {
      if (password.length < 10) {
        setFieldError({ field: 'password', message: 'Password minimal 10 karakter.' });
        return document.getElementById('auth-password')?.focus();
      }
      if (password !== confirm) {
        setFieldError({ field: 'confirm', message: 'Konfirmasi password tidak sama dengan password di atas.' });
        return document.getElementById('auth-confirm')?.focus();
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await api('POST', '/api/auth/login', { email, password });
        return onAuthenticated();
      }
      if (mode === 'set-password' && link) {
        if (link.purpose === 'activate') {
          await api('POST', '/api/auth/activate', { token: link.token, password });
          return onAuthenticated();
        }
        await api('POST', '/api/auth/reset-password', { token: link.token, password });
        setMode('login');
        setPassword('');
        setConfirm('');
        setNotice('Password berhasil diganti. Silakan masuk dengan password baru.');
      } else {
        await api('POST', mode === 'activate' ? '/api/auth/request-activation' : '/api/auth/request-reset', { email });
        setNotice(
          `Jika emailmu terdaftar, tautan sudah kami kirim dan berlaku ${
            mode === 'activate' ? '72 jam' : '1 jam'
          }. Cek inbox (dan folder spam). Belum masuk? Kamu bisa minta kirim ulang setelah 60 detik; hanya tautan terbaru yang berlaku.`
        );
        setLinkSent(true);
        setCooldown(60);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.');
    }
    setSubmitting(false);
  };

  const inputClass =
    'w-full p-2.5 rounded-lg border border-[#D9D9D9] bg-white text-sm text-[#242424] focus:outline-hidden focus:border-[#BD214C]';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center justify-center gap-1.5 mb-6">
          <Image
            src="/brand/boleh-belajar-logo.png"
            alt="Boleh Belajar"
            width={135}
            height={34}
            fetchPriority="high"
            className="h-[42px] w-auto"
          />
          <div className="text-center">
            <span className="text-xs text-[#595959] tracking-wider uppercase font-semibold block">
              Portal Karier Alumni
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#D9D9D9] rounded-xl shadow-xs p-6">
          {mode !== 'set-password' && (
            <div className="grid grid-cols-2 gap-1 p-1 mb-5 rounded-lg bg-[#F7F7F7] text-sm font-semibold">
              {(
                [
                  ['login', 'Masuk'],
                  ['activate', 'Aktivasi Akun'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchMode(id)}
                  className={`py-1.5 rounded-md transition-colors ${
                    mode === id || (id === 'login' && mode === 'forgot')
                      ? 'bg-white text-[#BD214C] shadow-xs'
                      : 'text-[#595959] hover:text-[#242424]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <p className="text-xs text-[#595959] mb-4">
            {mode === 'login' && 'Masuk dengan email dan password akunmu.'}
            {mode === 'activate' &&
              'Pertama kali? Masukkan email yang terdaftar sebagai alumni Boleh Belajar. Kami kirim tautan aktivasi ke email itu.'}
            {mode === 'forgot' && 'Masukkan emailmu. Kami kirim tautan untuk membuat password baru.'}
            {mode === 'set-password' &&
              (link?.purpose === 'activate' ? 'Buat password untuk mengaktifkan akunmu.' : 'Buat password baru untuk akunmu.')}
          </p>

          {notice && (
            <div role="status" className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
              {notice}
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700"
            >
              <AlertCircle className="w-4 h-4 mt-px shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode !== 'set-password' && (
              <div>
                <label htmlFor="auth-email" className="block text-xs font-bold text-[#242424] mb-1">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
            {(mode === 'login' || mode === 'set-password') && (
              <div>
                <label htmlFor="auth-password" className="block text-xs font-bold text-[#242424] mb-1">
                  {mode === 'login' ? 'Password' : 'Password Baru'}
                </label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={fieldError?.field === 'password' ? true : undefined}
                  aria-describedby={
                    mode === 'set-password' ? (fieldError?.field === 'password' ? 'auth-password-error' : 'auth-password-hint') : undefined
                  }
                  className={`${inputClass} ${fieldError?.field === 'password' ? 'border-rose-500' : ''}`}
                />
                {mode === 'set-password' &&
                  (fieldError?.field === 'password' ? (
                    <p id="auth-password-error" role="alert" className="mt-1 text-xs text-rose-700">
                      {fieldError.message}
                    </p>
                  ) : (
                    <p id="auth-password-hint" className="mt-1 text-xs text-[#595959]">
                      Minimal 10 karakter.
                    </p>
                  ))}
              </div>
            )}
            {mode === 'set-password' && (
              <div>
                <label htmlFor="auth-confirm" className="block text-xs font-bold text-[#242424] mb-1">
                  Ulangi Password
                </label>
                <input
                  id="auth-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  aria-invalid={fieldError?.field === 'confirm' ? true : undefined}
                  aria-describedby={fieldError?.field === 'confirm' ? 'auth-confirm-error' : undefined}
                  className={`${inputClass} ${fieldError?.field === 'confirm' ? 'border-rose-500' : ''}`}
                />
                {fieldError?.field === 'confirm' && (
                  <p id="auth-confirm-error" role="alert" className="mt-1 text-xs text-rose-700">
                    {fieldError.message}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || cooldown > 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#BD214C] text-white text-sm font-semibold hover:bg-[#a51d43] disabled:opacity-60 transition-colors"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' && 'Masuk'}
              {mode === 'activate' && (linkSent ? 'Kirim Ulang Tautan Aktivasi' : 'Kirim Tautan Aktivasi')}
              {mode === 'forgot' && (linkSent ? 'Kirim Ulang Tautan Reset' : 'Kirim Tautan Reset')}
              {cooldown > 0 && (mode === 'activate' || mode === 'forgot') && ` (${cooldown} dtk)`}
              {mode === 'set-password' && (link?.purpose === 'activate' ? 'Aktifkan Akun' : 'Simpan Password')}
            </button>

            {mode === 'login' && (
              <button type="button" onClick={() => switchMode('forgot')} className="w-full text-xs text-[#595959] hover:text-[#BD214C]">
                Lupa password?
              </button>
            )}
            {(mode === 'forgot' || mode === 'set-password') && (
              <button type="button" onClick={() => switchMode('login')} className="w-full text-xs text-[#595959] hover:text-[#BD214C]">
                Kembali ke halaman masuk
              </button>
            )}
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-[#595959]">
          Butuh bantuan? Hubungi talent@bolehbelajar.com
        </p>
      </div>
    </div>
  );
};
