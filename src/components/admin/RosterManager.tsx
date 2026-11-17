'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { useDataStore } from '../../domain/dataStore.tsx';
import { formatDateIndo } from '../../domain/stateMachine.ts';
import type { AlumniRosterEntry, EligibilityStatus } from '../../domain/types.ts';
import { Modal } from '../Modal.tsx';

type StatusFilter = 'all' | 'active' | 'invited' | 'pending' | 'revoked';

const PAGE_SIZE = 100;

/** One bucket per row, so the counters and the filter always agree. */
function bucketOf(e: AlumniRosterEntry): Exclude<StatusFilter, 'all'> {
  if (e.eligibility === 'revoked') return 'revoked';
  if (e.eligibility === 'pending') return 'pending';
  return e.activatedAt ? 'active' : 'invited';
}

const BADGE: Record<Exclude<StatusFilter, 'all'>, { label: string; className: string }> = {
  active: { label: 'Aktif', className: 'bg-emerald-100 text-emerald-800' },
  invited: { label: 'Belum aktivasi', className: 'bg-amber-100 text-amber-900' },
  pending: { label: 'Menunggu persetujuan', className: 'bg-stone-100 text-stone-700' },
  revoked: { label: 'Akses dicabut', className: 'bg-rose-100 text-rose-800' },
};

export const RosterManager: React.FC = () => {
  const { roster, setRosterEligibility } = useDataStore();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [target, setTarget] = useState<{ entry: AlumniRosterEntry; next: EligibilityStatus } | null>(null);
  const [working, setWorking] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<Exclude<StatusFilter, 'all'>, number> = { active: 0, invited: 0, pending: 0, revoked: 0 };
    roster.forEach((e) => (c[bucketOf(e)] += 1));
    return c;
  }, [roster]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roster.filter((e) => {
      if (filter !== 'all' && bucketOf(e) !== filter) return false;
      if (!q) return true;
      return (
        e.fullName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.program.toLowerCase().includes(q) ||
        e.batch.toLowerCase().includes(q)
      );
    });
  }, [roster, query, filter]);

  const openDialog = (entry: AlumniRosterEntry, next: EligibilityStatus) => {
    setDialogError(null);
    setTarget({ entry, next });
  };

  const confirmChange = async () => {
    if (!target) return;
    setWorking(true);
    setDialogError(null);
    const res = await setRosterEligibility(target.entry.id, target.next);
    setWorking(false);
    if (!res.success) {
      setDialogError(res.error ?? 'Gagal mengubah akses. Coba lagi.');
      return;
    }
    setNotice(
      target.next === 'eligible'
        ? `Akses ${target.entry.fullName} diaktifkan.`
        : `Akses ${target.entry.fullName} dicabut. Akunnya langsung nonaktif dan semua sesi login berakhir.`
    );
    setTarget(null);
  };

  const dialogCopy = (entry: AlumniRosterEntry, next: EligibilityStatus) => {
    if (next === 'eligible') {
      return {
        title: entry.eligibility === 'pending' ? 'Setujui akses alumni' : 'Aktifkan kembali akses',
        body: entry.activatedAt
          ? `${entry.fullName} akan bisa masuk lagi dengan akun yang sudah ada. Riwayat lamarannya tetap utuh.`
          : `${entry.fullName} akan bisa mengaktifkan akun lewat tautan yang dikirim ke ${entry.email}.`,
        confirm: 'Aktifkan Akses',
        danger: false,
      };
    }
    return {
      title: 'Cabut akses alumni',
      body: `Akun ${entry.fullName} (${entry.email}) akan langsung nonaktif dan semua sesi login-nya berakhir. Riwayat lamaran dan persetujuan yang sudah tercatat tidak dihapus. Kamu bisa mengaktifkan aksesnya lagi kapan saja.`,
      confirm: 'Cabut Akses',
      danger: true,
    };
  };

  const stat = (key: Exclude<StatusFilter, 'all'>) => (
    <button
      type="button"
      onClick={() => {
        setFilter(filter === key ? 'all' : key);
        setVisible(PAGE_SIZE);
      }}
      aria-pressed={filter === key}
      className={`text-left p-3 rounded-xl border bg-white transition-colors ${
        filter === key ? 'border-[#BD214C] ring-1 ring-[#BD214C]' : 'border-[#D9D9D9] hover:border-[#BD214C]/50'
      }`}
    >
      <div className="text-2xl font-bold text-[#242424]">{counts[key]}</div>
      <div className="text-xs text-[#595959]">{BADGE[key].label}</div>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stat('active')}
        {stat('invited')}
        {stat('pending')}
        {stat('revoked')}
      </div>

      {notice && (
        <div role="status" className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#D9D9D9] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#D9D9D9] bg-[#F7F7F7] flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#595959]">
              Daftar Roster ({filtered.length}
              {filtered.length !== roster.length ? ` dari ${roster.length}` : ''})
            </h2>
            <p className="text-xs text-[#595959] mt-0.5">
              Hanya alumni berstatus aktif yang bisa masuk ke portal. Mencabut akses langsung menonaktifkan akunnya.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-[#595959] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                aria-label="Cari alumni di roster"
                placeholder="Cari nama, email, program…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setVisible(PAGE_SIZE);
                }}
                className="w-full sm:w-64 pl-9 pr-3 py-2 rounded-lg border border-[#D9D9D9] bg-white text-sm focus:outline-hidden focus:border-[#BD214C]"
              />
            </div>
            <select
              aria-label="Filter status roster"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as StatusFilter);
                setVisible(PAGE_SIZE);
              }}
              className="px-3 py-2 rounded-lg border border-[#D9D9D9] bg-white text-sm focus:outline-hidden focus:border-[#BD214C]"
            >
              <option value="all">Semua status</option>
              <option value="active">Aktif</option>
              <option value="invited">Belum aktivasi</option>
              <option value="pending">Menunggu persetujuan</option>
              <option value="revoked">Akses dicabut</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#242424]">
            <thead className="bg-[#F7F7F7] border-b border-[#D9D9D9] text-[#595959] uppercase tracking-wider font-semibold">
              <tr>
                <th scope="col" className="px-4 py-3">Alumni</th>
                <th scope="col" className="px-4 py-3">Program &amp; Batch</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Akun</th>
                <th scope="col" className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D9D9]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#595959]">
                    {roster.length === 0
                      ? 'Roster masih kosong. Tambahkan alumni lewat tab Impor CSV.'
                      : 'Tidak ada alumni yang cocok dengan pencarian atau filter ini.'}
                  </td>
                </tr>
              ) : (
                filtered.slice(0, visible).map((e) => {
                  const b = BADGE[bucketOf(e)];
                  return (
                    <tr key={e.id} className="hover:bg-[#F9EDDE]/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{e.fullName}</div>
                        <div className="text-[#595959]">{e.email}</div>
                      </td>
                      <td className="px-4 py-3 text-[#595959]">
                        {e.program} ({e.batch})
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded font-bold ${b.className}`}>{b.label}</span>
                      </td>
                      <td className="px-4 py-3 text-[#595959]">
                        {!e.activatedAt
                          ? 'Belum dibuat'
                          : e.eligibility === 'eligible'
                            ? `Aktif sejak ${formatDateIndo(e.activatedAt)}`
                            : `Nonaktif (dibuat ${formatDateIndo(e.activatedAt)})`}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {e.eligibility === 'eligible' ? (
                          <button
                            type="button"
                            onClick={() => openDialog(e, 'revoked')}
                            aria-label={`Cabut akses ${e.fullName}`}
                            className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold"
                          >
                            Cabut Akses
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openDialog(e, 'eligible')}
                            aria-label={`${e.eligibility === 'pending' ? 'Setujui' : 'Aktifkan'} akses ${e.fullName}`}
                            className="px-3 py-1.5 rounded-lg border border-[#D9D9D9] hover:border-[#BD214C] text-[#BD214C] font-semibold"
                          >
                            {e.eligibility === 'pending' ? 'Setujui' : 'Aktifkan'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > visible && (
          <div className="p-3 border-t border-[#D9D9D9] text-center">
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="px-4 py-2 rounded-lg border border-[#D9D9D9] hover:border-[#BD214C] text-xs font-semibold text-[#242424]"
            >
              Tampilkan {Math.min(PAGE_SIZE, filtered.length - visible)} lagi ({filtered.length - visible} tersisa)
            </button>
          </div>
        )}
      </div>

      {target && (() => {
        const copy = dialogCopy(target.entry, target.next);
        return (
          <Modal onClose={working ? () => undefined : () => setTarget(null)} label={copy.title}>
            <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-[#242424]">{copy.title}</h3>
              <p className="text-sm text-[#595959] leading-relaxed">{copy.body}</p>
              {dialogError && (
                <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
                  <span>{dialogError}</span>
                </div>
              )}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setTarget(null)}
                  disabled={working}
                  className="px-4 py-2 rounded-lg border border-[#D9D9D9] text-xs font-semibold text-[#595959] hover:bg-[#F7F7F7]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmChange}
                  disabled={working}
                  className={`px-4 py-2 rounded-lg text-white text-xs font-bold disabled:opacity-60 ${
                    copy.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#BD214C] hover:bg-[#a61b42]'
                  }`}
                >
                  {working ? 'Memproses…' : copy.confirm}
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};
