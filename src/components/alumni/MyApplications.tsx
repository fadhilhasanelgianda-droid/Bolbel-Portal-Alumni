import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Building,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ShieldAlert,
  Send,
  Calendar,
  UserCheck,
  XCircle,
  MessageSquare,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { useDataStore } from '../../domain/dataStore.tsx';
import type { CandidateProcess, SelectionStage, ProcessOutcome } from '../../domain/types.ts';
import {
  STAGE_CONFIG,
  OUTCOME_CONFIG,
  formatDateIndo,
} from '../../domain/stateMachine.ts';

export const MyApplications: React.FC = () => {
  const {
    currentUser,
    processes,
    events,
    approveAdminProposal,
    rejectAdminProposal,
    withdrawApplication,
  } = useDataStore();

  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);

  // Proposal modal & Withdraw modal
  const [withdrawTargetProcess, setWithdrawTargetProcess] = useState<CandidateProcess | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter processes belonging to current user
  const myProcesses = processes.filter((p) => p.alumniId === currentUser.id);

  // Proactive proposals waiting for alumni approval (FR07)
  const pendingProposals = myProcesses.filter(
    (p) => p.currentStage === 'menunggu_persetujuan' && p.outcome === 'aktif'
  );

  // Active or completed applications
  const otherApplications = myProcesses.filter(
    (p) => p.currentStage !== 'menunggu_persetujuan' || p.outcome !== 'aktif'
  );

  const activeProcess = myProcesses.find((p) => p.id === selectedProcessId) || otherApplications[0] || null;

  // Events for selected process
  const activeEvents = events
    .filter((e) => e.processId === activeProcess?.id)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  const handleApproveProposal = async (procId: string) => {
    setIsProcessing(true);
    await approveAdminProposal(procId);
    setIsProcessing(false);
  };

  const handleRejectProposal = async (procId: string) => {
    setIsProcessing(true);
    await rejectAdminProposal(procId);
    setIsProcessing(false);
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawTargetProcess || !withdrawReason) return;
    setIsProcessing(true);
    await withdrawApplication(withdrawTargetProcess.id, withdrawReason);
    setIsProcessing(false);
    setWithdrawTargetProcess(null);
    setWithdrawReason('');
  };

  const stageKeys: SelectionStage[] = [
    'masuk_bolbel',
    'diteruskan_ke_company',
    'screening',
    'interview',
    'offer',
    'mulai_kerja',
  ];

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#242424] tracking-tight">Lamaran & Riwayat Proses Seleksi</h1>
        <p className="text-xs sm:text-sm text-[#595959] mt-1">
          Pantau progres lamaran, tanggal pembaruan resmi dari Gifari, serta persetujuan peluang kerja dari tim BolBel.
        </p>
      </div>

      {/* FR07 Proactive Proposals Banner */}
      {pendingProposals.length > 0 && (
        <div className="p-5 rounded-2xl bg-[#F9EDDE] border-2 border-[#EA5543]/40 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 text-[#BD214C]">
            <span className="w-8 h-8 rounded-lg bg-[#BD214C] text-white flex items-center justify-center font-bold">
              !
            </span>
            <div>
              <h3 className="font-bold text-base text-[#242424]">
                Permintaan Persetujuan Pengajuan Rekomendasi ({pendingProposals.length})
              </h3>
              <p className="text-xs text-[#595959]">
                Admin BolBel menemukan lowongan yang cocok dengan profilmu dan meminta izin sebelum CV kamu
                diteruskan ke company partner.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingProposals.map((prop) => (
              <div
                key={prop.id}
                className="bg-white p-4 rounded-xl border border-[#D9D9D9] shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#595959] mb-1">
                    <span className="font-semibold text-[#BD214C]">Rekomendasi Proaktif</span>
                    <span>{formatDateIndo(prop.createdAt)}</span>
                  </div>
                  <h4 className="text-base font-bold text-[#242424]">{prop.jobTitle}</h4>
                  <div className="text-xs font-medium text-[#595959] flex items-center gap-1.5 mt-0.5">
                    <Building className="w-3.5 h-3.5" />
                    {prop.companyName}
                  </div>

                  <div className="mt-3 p-2.5 rounded-lg bg-[#F7F7F7] text-xs space-y-1">
                    <span className="text-[#595959] block">CV yang akan dibagikan:</span>
                    <span className="font-semibold text-[#242424] block">{prop.documentName}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#D9D9D9] flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleRejectProposal(prop.id)}
                    disabled={isProcessing}
                    className="px-3 py-1.5 rounded-lg border border-[#D9D9D9] hover:bg-stone-50 text-xs font-semibold text-[#595959]"
                  >
                    Tolak Peluang
                  </button>
                  <button
                    onClick={() => handleApproveProposal(prop.id)}
                    disabled={isProcessing}
                    className="px-4 py-1.5 rounded-lg bg-[#BD214C] hover:bg-[#a61b42] text-white text-xs font-bold transition-all shadow-xs"
                  >
                    Setujui & Teruskan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Applications Content */}
      {otherApplications.length === 0 && pendingProposals.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#D9D9D9] p-12 text-center">
          <FileText className="w-12 h-12 text-[#595959] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#242424]">Belum ada lamaran tersimpan</h3>
          <p className="text-xs text-[#595959] max-w-sm mx-auto mt-1 mb-4">
            Jelajahi lowongan terkurasi di tab &quot;Lowongan Terkurasi&quot; dan kirimkan lamaran pertama kamu.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Applications Sidebar List */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#595959] px-1">
              Daftar Lamaran ({otherApplications.length})
            </h3>
            {otherApplications.map((proc) => {
              const isSelected = activeProcess?.id === proc.id;
              const outcomeConfig = OUTCOME_CONFIG[proc.outcome] || OUTCOME_CONFIG.aktif;
              const stageConfig = STAGE_CONFIG[proc.currentStage] || STAGE_CONFIG.masuk_bolbel;

              return (
                <button
                  key={proc.id}
                  onClick={() => setSelectedProcessId(proc.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-white border-[#BD214C] shadow-md ring-1 ring-[#BD214C]'
                      : 'bg-white border-[#D9D9D9] hover:border-[#BD214C]/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${outcomeConfig.badgeColor}`}
                    >
                      {outcomeConfig.label}
                    </span>
                    <span className="text-[11px] text-[#595959] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateIndo(proc.lastStageUpdatedAt)}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-[#242424] leading-snug">{proc.jobTitle}</h4>
                  <div className="text-xs text-[#595959] mt-0.5 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5" />
                    {proc.companyName}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#F7F7F7] flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#BD214C]">{stageConfig.label}</span>
                    <span className="text-[11px] text-[#595959]">
                      {proc.origin === 'internal_apply'
                        ? 'Via BolBel'
                        : proc.origin === 'external_report'
                        ? 'Apply Eksternal'
                        : 'Rekomendasi Admin'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Process Details & Timeline */}
          {activeProcess && (
            <div className="lg:col-span-7 bg-white rounded-xl border border-[#D9D9D9] p-6 shadow-xs space-y-6">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#D9D9D9]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold border ${
                        OUTCOME_CONFIG[activeProcess.outcome]?.badgeColor
                      }`}
                    >
                      {OUTCOME_CONFIG[activeProcess.outcome]?.label}
                    </span>
                    <span className="text-xs text-[#595959]">
                      ID: <span className="font-mono">{activeProcess.id}</span>
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-[#242424]">{activeProcess.jobTitle}</h2>
                  <div className="text-sm font-semibold text-[#595959] flex items-center gap-1.5 mt-0.5">
                    <Building className="w-4 h-4 text-[#595959]" />
                    {activeProcess.companyName}
                  </div>
                </div>

                {/* Withdraw action (PRD Section 6) */}
                {activeProcess.outcome === 'aktif' && (
                  <button
                    onClick={() => setWithdrawTargetProcess(activeProcess)}
                    className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors"
                  >
                    Tarik Diri
                  </button>
                )}
              </div>

              {/* Stage Stepper Visual */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#595959] mb-3">
                  Tahap Seleksi Terkini
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                  {stageKeys.map((stageKey, idx) => {
                    const isPassed =
                      (STAGE_CONFIG[activeProcess.currentStage]?.stepOrder || 0) >=
                      (STAGE_CONFIG[stageKey]?.stepOrder || 0);
                    const isCurrent = activeProcess.currentStage === stageKey;

                    return (
                      <div
                        key={stageKey}
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                          isCurrent
                            ? 'bg-[#BD214C] text-white border-[#BD214C] shadow-xs'
                            : isPassed
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium'
                            : 'bg-[#F7F7F7] text-[#595959] border-[#D9D9D9]'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">
                          Tahap {idx + 1}
                        </span>
                        <span className="font-semibold text-[11px] leading-tight mt-0.5">
                          {STAGE_CONFIG[stageKey]?.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Special Info (e.g. Interview or Start Date) */}
              {activeProcess.interviewSchedule && (
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 space-y-0.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-purple-700" /> Jadwal Wawancara Resmi:
                  </div>
                  <div>{activeProcess.interviewSchedule}</div>
                </div>
              )}

              {/* Document Used */}
              <div className="p-3 rounded-lg bg-[#F7F7F7] border border-[#D9D9D9] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#BD214C]" />
                  <div>
                    <span className="text-[#595959] block text-[11px]">Versi CV saat submit:</span>
                    <span className="font-bold text-[#242424]">{activeProcess.documentName}</span>
                  </div>
                </div>
                <span className="text-[10px] text-[#595959] italic">Terkunci ke lamaran ini</span>
              </div>

              {/* Timeline of events (Official updates from Gifari & BolBel) */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#595959] mb-3">
                  Riwayat &amp; Catatan Pembaruan Resmi
                </h3>
                {activeEvents.length === 0 ? (
                  <div className="text-xs text-[#595959] italic py-2">Belum ada catatan aktivitas baru.</div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[#D9D9D9]">
                    {activeEvents.map((ev) => (
                      <div key={ev.id} className="relative pl-8 text-xs space-y-1">
                        <div className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-[#BD214C] border-2 border-white -translate-x-1/2" />
                        <div className="flex items-center justify-between text-[#595959] text-[11px]">
                          <span className="font-bold text-[#242424]">{ev.actorName}</span>
                          <span>
                            Dicatat: {formatDateIndo(ev.recordedAt)}
                            {ev.occurredAt && ev.occurredAt !== ev.recordedAt && (
                              <span className="text-[#595959]">
                                {' '}
                                (Kejadian: {formatDateIndo(ev.occurredAt)})
                              </span>
                            )}
                          </span>
                        </div>
                        {ev.publicMessage && (
                          <div className="p-3 rounded-lg bg-[#F9EDDE]/70 border border-[#EADBCE] text-[#242424] leading-relaxed">
                            {ev.publicMessage}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Withdraw Confirmation Modal */}
      {withdrawTargetProcess && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[#242424]">Konfirmasi Penarikan Diri</h3>
            <p className="text-xs text-[#595959] mt-1 leading-relaxed">
              Kamu akan mengundurkan diri dari proses seleksi{' '}
              <strong className="text-[#242424]">{withdrawTargetProcess.jobTitle}</strong> di{' '}
              <strong className="text-[#242424]">{withdrawTargetProcess.companyName}</strong>.
            </p>

            <div className="my-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
              <strong className="block font-bold">Ketentuan Penarikan Diri:</strong>
              <p>
                Sistem akan mencatat pencabutan persetujuan (consent) dan memblokir pengiriman berkas baru. Berkas
                yang telah terlanjur dikirimkan ke pihak company tidak dapat ditarik otomatis, namun Gifari akan
                memberitahu PIC company.
              </p>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label htmlFor="withdraw-reason" className="block text-xs font-bold text-[#242424] mb-1">
                  Alasan Penarikan Diri <span className="text-[#BD214C]">*</span>
                </label>
                <textarea
                  id="withdraw-reason"
                  rows={3}
                  required
                  placeholder="Misal: Sudah menerima penawaran di perusahaan lain, lokasi tidak cocok, dll..."
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-xs text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setWithdrawTargetProcess(null)}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-lg border border-[#D9D9D9] text-xs font-semibold text-[#595959]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !withdrawReason}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  {isProcessing ? 'Memproses...' : 'Ya, Konfirmasi Tarik Diri'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
