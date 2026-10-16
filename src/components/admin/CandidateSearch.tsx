'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Users,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Building,
  Send,
  ShieldCheck,
  ChevronRight,
  X,
} from 'lucide-react';
import { useDataStore } from '../../domain/dataStore.tsx';
import type { AlumniProfile, OpennessStatus, ExperienceBand, WorkModel } from '../../domain/types.ts';
import { isProfileFresh, formatDateIndo, STAGE_CONFIG } from '../../domain/stateMachine.ts';

export const CandidateSearch: React.FC = () => {
  const { profiles, cvs, jobs, processes, createProactiveProposal } = useDataStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [opennessFilter, setOpennessFilter] = useState<string>('all');
  const [expFilter, setExpFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [freshnessFilter, setFreshnessFilter] = useState<string>('all');

  const [selectedCandidate, setSelectedCandidate] = useState<AlumniProfile | null>(null);

  // Proposal modal state
  const [proposingCandidate, setProposingCandidate] = useState<AlumniProfile | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [proposalSubmitting, setProposalSubmitting] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalSuccess, setProposalSuccess] = useState<string | null>(null);

  const profileList = Object.values(profiles);

  // Filter candidates (PRD FR07)
  const filteredCandidates = useMemo(() => {
    return profileList.filter((prof) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        prof.fullName.toLowerCase().includes(q) ||
        prof.email.toLowerCase().includes(q) ||
        prof.domicile.toLowerCase().includes(q) ||
        prof.targetRoles.some((r) => r.toLowerCase().includes(q));

      const matchOpenness = opennessFilter === 'all' || prof.opennessStatus === opennessFilter;
      const matchExp = expFilter === 'all' || prof.experienceBand === expFilter;
      const matchModel =
        modelFilter === 'all' || prof.targetWorkModels.includes(modelFilter as WorkModel);

      const freshness = isProfileFresh(prof.availabilityConfirmedAt);
      const matchFreshness =
        freshnessFilter === 'all' ||
        (freshnessFilter === 'fresh' && freshness.isFresh) ||
        (freshnessFilter === 'stale' && !freshness.isFresh);

      return matchSearch && matchOpenness && matchExp && matchModel && matchFreshness;
    });
  }, [profileList, searchQuery, opennessFilter, expFilter, modelFilter, freshnessFilter]);

  const publishedJobs = jobs.filter((j) => j.status === 'published');

  const handleProactiveProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposingCandidate || !selectedJobId) return;

    setProposalError(null);
    setProposalSuccess(null);
    setProposalSubmitting(true);

    try {
      const res = await createProactiveProposal(proposingCandidate.userId, selectedJobId);
      if (res.success) {
        setProposalSuccess(
          `Pengajuan berhasil dikirimkan ke akun ${proposingCandidate.fullName}. Status sekarang "Menunggu Persetujuan Alumni".`
        );
        setTimeout(() => {
          setProposingCandidate(null);
          setSelectedJobId('');
          setProposalSuccess(null);
        }, 2500);
      } else {
        setProposalError(res.error || 'Gagal membuat pengajuan.');
      }
    } catch {
      setProposalError('Terjadi kesalahan saat memproses rekomendasi.');
    } finally {
      setProposalSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
          Pencarian Kandidat &amp; Talent Pool Alumni
        </h1>
        <p className="text-xs sm:text-sm text-[#595959] mt-0.5">
          Filter data terstruktur profil alumni berdasarkan ketersediaan, domisili, dan preferensi role. Pengajuan
          rekomendasi ke partner company selalu memerlukan persetujuan alumni.
        </p>
      </div>

      {/* Multi-filter Bar */}
      <div className="bg-white rounded-xl border border-[#D9D9D9] p-4 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#595959] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama kandidat, role impian, email, atau domisili..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#D9D9D9] text-xs text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <select
            value={opennessFilter}
            onChange={(e) => setOpennessFilter(e.target.value)}
            className="p-2 rounded-lg border border-[#D9D9D9] bg-white text-[#242424]"
            aria-label="Filter keterbukaan peluang"
          >
            <option value="all">Semua Keterbukaan</option>
            <option value="aktif_mencari">Aktif Mencari</option>
            <option value="terbuka">Terbuka Jika Sesuai</option>
            <option value="tidak_mencari">Tidak Mencari</option>
          </select>

          <select
            value={expFilter}
            onChange={(e) => setExpFilter(e.target.value)}
            className="p-2 rounded-lg border border-[#D9D9D9] bg-white text-[#242424]"
            aria-label="Filter pengalaman kerja"
          >
            <option value="all">Semua Pengalaman</option>
            <option value="<1_tahun">&lt; 1 Tahun</option>
            <option value="1-2_tahun">1 - 2 Tahun</option>
            <option value="2-4_tahun">2 - 4 Tahun</option>
            <option value=">4_tahun">&gt; 4 Tahun</option>
          </select>

          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className="p-2 rounded-lg border border-[#D9D9D9] bg-white text-[#242424]"
            aria-label="Filter model kerja"
          >
            <option value="all">Semua Model Kerja</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="wfo">WFO</option>
          </select>

          <select
            value={freshnessFilter}
            onChange={(e) => setFreshnessFilter(e.target.value)}
            className="p-2 rounded-lg border border-[#D9D9D9] bg-white text-[#242424]"
            aria-label="Filter kesegaran profil"
          >
            <option value="all">Semua Usia Konfirmasi</option>
            <option value="fresh">Segar (&le; 30 Hari)</option>
            <option value="stale">Perlu Konfirmasi (&gt; 30 Hari)</option>
          </select>
        </div>
      </div>

      {/* Candidate List Table */}
      <div className="bg-white rounded-xl border border-[#D9D9D9] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#242424]">
            <thead className="bg-[#F7F7F7] border-b border-[#D9D9D9] text-[#595959] uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Kandidat &amp; Program</th>
                <th className="px-4 py-3">Target Role &amp; Domisili</th>
                <th className="px-4 py-3">Keterbukaan &amp; Status</th>
                <th className="px-4 py-3">Kesegaran Data</th>
                <th className="px-4 py-3">Dokumen CV</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D9D9]">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#595959] italic">
                    Tidak ada profil alumni yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((candidate) => {
                  const freshness = isProfileFresh(candidate.availabilityConfirmedAt);
                  const activeCv = cvs.find((c) => c.ownerId === candidate.userId && c.isCurrentActive);

                  return (
                    <tr key={candidate.userId} className="hover:bg-[#F9EDDE]/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-[#242424]">{candidate.fullName}</div>
                        <div className="text-[11px] text-[#595959]">{candidate.email}</div>
                        <div className="text-[10px] text-[#BD214C] font-semibold mt-0.5">
                          {candidate.program} ({candidate.batch})
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {candidate.targetRoles.map((r) => (
                            <span
                              key={r}
                              className="px-1.5 py-0.5 rounded bg-[#F7F7F7] border border-[#D9D9D9] text-[10px] text-[#242424]"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                        <div className="text-[11px] text-[#595959] mt-1">Domisili: {candidate.domicile}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            candidate.opennessStatus === 'aktif_mencari'
                              ? 'bg-emerald-100 text-emerald-800'
                              : candidate.opennessStatus === 'terbuka'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {candidate.opennessStatus.replace('_', ' ')}
                        </span>
                        <div className="text-[11px] text-[#595959] mt-1 capitalize">
                          {candidate.employmentStatus.replace('_', ' ')}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            freshness.isFresh
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {freshness.isFresh ? 'Segar' : `Perlu Konfirmasi (${freshness.daysAgo} hari)`}
                        </span>
                        <div className="text-[10px] text-[#595959] mt-0.5">
                          {formatDateIndo(candidate.availabilityConfirmedAt)}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {activeCv ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#242424]">
                            <FileText className="w-3.5 h-3.5 text-[#BD214C]" />
                            <span className="truncate max-w-[120px]" title={activeCv.fileName}>
                              {activeCv.fileName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-rose-600 italic">Belum Ada CV</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedCandidate(candidate)}
                          className="px-2.5 py-1 rounded border border-[#D9D9D9] hover:border-[#BD214C] text-[11px] font-semibold text-[#242424]"
                        >
                          Detail
                        </button>
                        <button
                          onClick={() => {
                            setProposingCandidate(candidate);
                            setSelectedJobId('');
                            setProposalError(null);
                          }}
                          className="px-2.5 py-1 rounded bg-[#BD214C] hover:bg-[#a61b42] text-white text-[11px] font-bold transition-all shadow-xs"
                        >
                          Ajukan Rekomendasi
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Detail Drawer */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-end">
          <div className="relative bg-white w-full max-w-lg h-full min-h-screen p-6 shadow-2xl overflow-y-auto space-y-5">
            <button
              onClick={() => setSelectedCandidate(null)}
              className="absolute top-5 right-5 p-2 rounded-lg text-[#595959] hover:bg-[#F7F7F7]"
              aria-label="Tutup panel kandidat"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-bold text-[#BD214C] uppercase tracking-wider block">
                Detail Profil Kandidat
              </span>
              <h2 className="text-xl font-bold text-[#242424] mt-1">{selectedCandidate.fullName}</h2>
              <div className="text-xs text-[#595959]">{selectedCandidate.email}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F7F7] border border-[#D9D9D9] text-xs space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[#595959] block">Program:</span>
                  <span className="font-semibold text-[#242424]">{selectedCandidate.program}</span>
                </div>
                <div>
                  <span className="text-[#595959] block">Batch:</span>
                  <span className="font-semibold text-[#242424]">{selectedCandidate.batch}</span>
                </div>
                <div>
                  <span className="text-[#595959] block">Domisili:</span>
                  <span className="font-semibold text-[#242424]">{selectedCandidate.domicile}</span>
                </div>
                <div>
                  <span className="text-[#595959] block">Kesiapan Mulai:</span>
                  <span className="font-semibold text-[#242424] capitalize">
                    {selectedCandidate.startReadiness.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-[#595959] block">Pengalaman:</span>
                  <span className="font-semibold text-[#242424]">{selectedCandidate.experienceBand}</span>
                </div>
                <div>
                  <span className="text-[#595959] block">Penawaran Proaktif:</span>
                  <span
                    className={`font-semibold ${
                      selectedCandidate.allowProactiveContact ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {selectedCandidate.allowProactiveContact ? 'Diizinkan' : 'Ditolak (Apply Mandiri Saja)'}
                  </span>
                </div>
              </div>
            </div>

            {/* CV Access */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#595959] mb-2">Dokumen CV Aktif</h3>
              {(() => {
                const activeCv = cvs.find((c) => c.ownerId === selectedCandidate.userId && c.isCurrentActive);
                if (!activeCv) {
                  return <div className="text-xs text-[#595959] italic">Alumni belum mengunggah CV aktif.</div>;
                }
                return (
                  <div className="p-3 rounded-lg border border-[#D9D9D9] bg-[#F7F7F7] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#BD214C]" />
                      <div>
                        <div className="font-bold text-[#242424]">{activeCv.fileName}</div>
                        <div className="text-[11px] text-[#595959]">
                          {(activeCv.fileSizeBytes / 1024 / 1024).toFixed(2)} MB • {formatDateIndo(activeCv.uploadedAt)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        alert(
                          `Akses URL privat untuk ${activeCv.fileName} (Dihasilkan oleh API, kedaluwarsa setelah 5 menit)`
                        )
                      }
                      className="px-3 py-1.5 rounded bg-white border border-[#D9D9D9] hover:border-[#BD214C] text-[11px] font-bold text-[#BD214C] flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh (5 min TTL)
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Application history for this candidate */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#595959] mb-2">
                Riwayat Lamaran di Portal
              </h3>
              {(() => {
                const candidateProcesses = processes.filter((p) => p.alumniId === selectedCandidate.userId);
                if (candidateProcesses.length === 0) {
                  return <div className="text-xs text-[#595959] italic">Belum ada riwayat proses seleksi.</div>;
                }
                return (
                  <div className="space-y-2">
                    {candidateProcesses.map((p) => (
                      <div key={p.id} className="p-2.5 rounded-lg border border-[#D9D9D9] text-xs">
                        <div className="font-bold text-[#242424]">{p.jobTitle}</div>
                        <div className="text-[#595959]">{p.companyName}</div>
                        <div className="text-[11px] text-[#BD214C] font-semibold mt-1">
                          Tahap: {STAGE_CONFIG[p.currentStage]?.label} • Status: {p.outcome}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Proactive Proposal Modal (FR07) */}
      {proposingCandidate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <button
              onClick={() => setProposingCandidate(null)}
              className="absolute top-5 right-5 p-2 rounded-lg text-[#595959] hover:bg-[#F7F7F7]"
              aria-label="Tutup form rekomendasi"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-bold text-[#BD214C] uppercase tracking-wider">
                Pengajuan Peluang Proaktif (FR07)
              </span>
              <h3 className="text-lg font-bold text-[#242424] mt-0.5">
                Rekomendasikan {proposingCandidate.fullName}
              </h3>
              <p className="text-xs text-[#595959]">
                Pilih lowongan yang sesuai. Kandidat akan menerima permintaan konfirmasi di portal dan wajib
                menyetujui sebelum CV diteruskan ke company.
              </p>
            </div>

            {/* Error / Warning */}
            {proposalError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{proposalError}</span>
              </div>
            )}

            {proposalSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{proposalSuccess}</span>
              </div>
            )}

            {!proposingCandidate.allowProactiveContact ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                <strong className="block font-bold">Izin Kontak Tidak Aktif (PRD FR07)</strong>
                <p>
                  Alumni ini tidak mengaktifkan izin penawaran proaktif. Sistem memblokir pengajuan admin dan hanya
                  mengizinkan alumni untuk melamar mandiri melalui daftar lowongan.
                </p>
              </div>
            ) : (
              <form onSubmit={handleProactiveProposalSubmit} className="space-y-4">
                <div>
                  <label htmlFor="proactive-job-select" className="block text-xs font-bold text-[#242424] mb-1">
                    Pilih Lowongan Aktif <span className="text-[#BD214C]">*</span>
                  </label>
                  <select
                    id="proactive-job-select"
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-xs text-[#242424] bg-white focus:outline-hidden focus:border-[#BD214C]"
                  >
                    <option value="">-- Pilih Lowongan Published --</option>
                    {publishedJobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} • {j.companyName} ({j.applyChannel === 'bolbel' ? 'Via BolBel' : 'Eksternal'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 rounded-lg bg-[#F9EDDE] border border-[#EADBCE] text-xs text-[#595959] space-y-1">
                  <div className="font-bold text-[#242424]">Aturan Persetujuan (Consent)</div>
                  <p>
                    Pengajuan ini akan masuk ke tab &quot;Lamaran Saya&quot; alumni dengan status{' '}
                    <strong className="text-[#242424]">&quot;Menunggu Persetujuan&quot;</strong>. Gifari belum boleh
                    meneruskan CV sampai alumni klik Setujui.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D9D9D9]">
                  <button
                    type="button"
                    onClick={() => setProposingCandidate(null)}
                    disabled={proposalSubmitting}
                    className="px-4 py-2 rounded-lg border border-[#D9D9D9] text-xs font-semibold text-[#595959]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={proposalSubmitting || !selectedJobId}
                    className="px-5 py-2 rounded-lg bg-[#BD214C] hover:bg-[#a61b42] text-white text-xs font-bold disabled:bg-stone-300 transition-all shadow-xs"
                  >
                    {proposalSubmitting ? 'Mengirimkan...' : 'Kirim Pengajuan ke Alumni'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
