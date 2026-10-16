'use client';

import React, { useState } from 'react';
import {
  GitPullRequest,
  Clock,
  Building,
  CheckCircle2,
  AlertCircle,
  FileText,
  Send,
  Calendar,
  ShieldCheck,
  User,
  X,
  MessageSquare,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { useDataStore } from '../../domain/dataStore.tsx';
import type {
  CandidateProcess,
  SelectionStage,
  ProcessOutcome,
} from '../../domain/types.ts';
import {
  STAGE_CONFIG,
  OUTCOME_CONFIG,
  STAGE_TRANSITIONS,
  ADMIN_SETTABLE_OUTCOMES,
  formatDateIndo,
} from '../../domain/stateMachine.ts';

export const ProcessPipeline: React.FC = () => {
  const {
    processes,
    events,
    consents,
    updateCandidateStage,
    forwardCVToCompany,
  } = useDataStore();

  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterOutcome, setFilterOutcome] = useState<string>('all');

  // Stage update modal
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateStage, setUpdateStage] = useState<SelectionStage>('screening');
  const [updateOutcome, setUpdateOutcome] = useState<ProcessOutcome>('aktif');
  const [occurredDate, setOccurredDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sourceType, setSourceType] = useState<'admin_official' | 'company_update'>('company_update');
  const [publicMessage, setPublicMessage] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [interviewSchedule, setInterviewSchedule] = useState('');
  const [actualStartDate, setActualStartDate] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forward CV modal
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [forwardNotes, setForwardNotes] = useState('Diteruskan via email ke PIC Talent Acquisition.');
  const [forwardPublicMsg, setForwardPublicMsg] = useState(
    'CV dan ringkasan profil telah resmi diteruskan oleh Gifari kepada HR company.'
  );

  const filteredProcesses = processes.filter((p) => {
    const matchStage = filterStage === 'all' || p.currentStage === filterStage;
    const matchOutcome = filterOutcome === 'all' || p.outcome === filterOutcome;
    return matchStage && matchOutcome;
  });

  const activeProcess = processes.find((p) => p.id === selectedProcessId) || filteredProcesses[0] || null;

  const activeEvents = events
    .filter((e) => e.processId === activeProcess?.id)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  const activeConsent = consents.find((c) => c.processId === activeProcess?.id && !c.revokedAt);

  const openUpdateModal = () => {
    if (!activeProcess) return;
    setUpdateStage(activeProcess.currentStage);
    setUpdateOutcome(activeProcess.outcome);
    setOccurredDate(new Date().toISOString().split('T')[0]);
    setPublicMessage('');
    setInternalNotes('');
    setInterviewSchedule(activeProcess.interviewSchedule || '');
    setActualStartDate(activeProcess.actualStartDate || '');
    setActionError(null);
    setIsUpdateModalOpen(true);
  };

  const handleStageUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProcess) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await updateCandidateStage(
        activeProcess.id,
        updateStage,
        updateOutcome,
        sourceType,
        occurredDate,
        publicMessage || undefined,
        internalNotes || undefined,
        interviewSchedule || undefined,
        actualStartDate || undefined
      );

      if (res.success) {
        setIsUpdateModalOpen(false);
      } else {
        setActionError(res.error || 'Gagal memperbarui tahap proses.');
      }
    } catch {
      setActionError('Terjadi kesalahan saat memproses pembaruan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForwardCVSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProcess) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await forwardCVToCompany(activeProcess.id, forwardNotes, forwardPublicMsg);
      if (res.success) {
        setIsForwardModalOpen(false);
      } else {
        setActionError(res.error || 'Gagal meneruskan CV.');
      }
    } catch {
      setActionError('Terjadi kesalahan saat meneruskan CV.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
          Pipeline &amp; Status Resmi Seleksi Kandidat
        </h1>
        <p className="text-xs sm:text-sm text-[#595959] mt-0.5">
          Gifari memegang otoritas pencatatan status resmi, pengiriman CV ke company, dan dokumentasi audit trail.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-[#D9D9D9] shadow-xs text-xs">
        <span className="font-bold text-[#595959]">Filter Pipeline:</span>
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="p-2 rounded-lg border border-[#D9D9D9] bg-white text-[#242424]"
          aria-label="Filter tahap seleksi"
        >
          <option value="all">Semua Tahap</option>
          {Object.entries(STAGE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>

        <select
          value={filterOutcome}
          onChange={(e) => setFilterOutcome(e.target.value)}
          className="p-2 rounded-lg border border-[#D9D9D9] bg-white text-[#242424]"
          aria-label="Filter hasil akhir"
        >
          <option value="all">Semua Hasil</option>
          {Object.entries(OUTCOME_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>

        <div className="ml-auto text-[#595959]">
          Menampilkan <strong className="text-[#242424]">{filteredProcesses.length}</strong> proses kandidat
        </div>
      </div>

      {/* Main Grid: Left List + Right Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Process List */}
        <div className="lg:col-span-5 space-y-3">
          {filteredProcesses.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#D9D9D9] p-8 text-center text-xs text-[#595959] italic">
              Tidak ada proses seleksi yang sesuai filter.
            </div>
          ) : (
            filteredProcesses.map((proc) => {
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
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-[#242424] text-sm">{proc.alumniName}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${outcomeConfig.badgeColor}`}
                    >
                      {outcomeConfig.label}
                    </span>
                  </div>

                  <div className="text-xs text-[#595959] font-medium leading-snug">
                    {proc.jobTitle} • {proc.companyName}
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#F7F7F7] flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#BD214C]">{stageConfig.label}</span>
                    <span className="text-[#595959]">
                      Update: {formatDateIndo(proc.lastStageUpdatedAt)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right: Active Process Detail & Action Controls */}
        {activeProcess && (
          <div className="lg:col-span-7 bg-white rounded-xl border border-[#D9D9D9] p-6 shadow-xs space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D9D9D9]">
              <div>
                <span className="text-xs text-[#595959]">
                  ID Proses: <span className="font-mono">{activeProcess.id}</span> (Versi: {activeProcess.version})
                </span>
                <h2 className="text-xl font-bold text-[#242424] mt-0.5">{activeProcess.alumniName}</h2>
                <div className="text-xs font-semibold text-[#595959] mt-0.5">
                  Posisi: <span className="text-[#242424]">{activeProcess.jobTitle}</span> di {activeProcess.companyName}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {activeProcess.currentStage === 'masuk_bolbel' && activeProcess.outcome === 'aktif' && (
                  <button
                    onClick={() => {
                      setActionError(null);
                      setIsForwardModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Kirim CV ke HR
                  </button>
                )}

                <button
                  onClick={openUpdateModal}
                  className="px-4 py-2 rounded-lg bg-[#BD214C] hover:bg-[#a61b42] text-white text-xs font-bold transition-all shadow-xs"
                >
                  Ubah Tahap / Status
                </button>
              </div>
            </div>

            {/* Consent & Document Snapshot (PRD FR08 & FR12) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F7F7F7] border border-[#D9D9D9] space-y-1">
                <span className="text-[#595959] block font-semibold text-[11px] uppercase tracking-wider">
                  Status Persetujuan (Consent)
                </span>
                {activeConsent ? (
                  <div className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Persetujuan Aktif ({activeConsent.policyVersion})
                    <div className="text-[10px] text-[#595959] font-normal block">
                      Disetujui: {formatDateIndo(activeConsent.grantedAt)}
                    </div>
                  </div>
                ) : activeProcess.consentRevokedAt ? (
                  <div className="text-rose-700 font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Persetujuan Dicabut Alumni
                  </div>
                ) : (
                  <div className="text-amber-700 font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Menunggu Persetujuan Alumni
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7F7F7] border border-[#D9D9D9] space-y-1">
                <span className="text-[#595959] block font-semibold text-[11px] uppercase tracking-wider">
                  Dokumen CV Terkunci
                </span>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#BD214C]" />
                  <span className="font-bold text-[#242424] truncate" title={activeProcess.documentName}>
                    {activeProcess.documentName}
                  </span>
                </div>
                <span className="text-[10px] text-[#595959] block">
                  ID Versi: {activeProcess.documentVersionId}
                </span>
              </div>
            </div>

            {/* Audit Log / Riwayat Transisi */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#595959] mb-3">
                Audit Trail Kejadian Resmi &amp; Catatan Internal
              </h3>
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[#D9D9D9]">
                {activeEvents.map((ev) => (
                  <div key={ev.id} className="relative pl-8 text-xs space-y-1">
                    <div className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-[#BD214C] border-2 border-white -translate-x-1/2" />
                    <div className="flex items-center justify-between text-[#595959] text-[11px]">
                      <span className="font-bold text-[#242424]">
                        {ev.actorName} ({ev.actorRole.toUpperCase()})
                      </span>
                      <span>
                        Dicatat: {formatDateIndo(ev.recordedAt)} • Sumber: {ev.sourceType}
                      </span>
                    </div>

                    {ev.publicMessage && (
                      <div className="p-2.5 rounded-lg bg-[#F9EDDE] border border-[#EADBCE] text-[#242424] leading-relaxed">
                        <span className="text-[10px] uppercase font-bold text-[#BD214C] block mb-0.5">
                          Pesan Terbuka (Dapat Dibaca Alumni)
                        </span>
                        {ev.publicMessage}
                      </div>
                    )}

                    {ev.internalNotes && (
                      <div className="p-2.5 rounded-lg bg-stone-100 border border-stone-300 text-stone-800 leading-relaxed">
                        <span className="text-[10px] uppercase font-bold text-stone-600 flex items-center gap-1 mb-0.5">
                          <Lock className="w-3 h-3" /> Catatan Internal Gifari (Privat)
                        </span>
                        {ev.internalNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stage Update Modal (PRD FR08) */}
      {isUpdateModalOpen && activeProcess && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <button
              onClick={() => setIsUpdateModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-lg text-[#595959] hover:bg-[#F7F7F7]"
              aria-label="Tutup form update tahap"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-bold text-[#BD214C] uppercase tracking-wider">
                Pembaruan Status Resmi (FR08)
              </span>
              <h3 className="text-lg font-bold text-[#242424] mt-0.5">
                {activeProcess.alumniName} — {activeProcess.jobTitle}
              </h3>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleStageUpdateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="update-stage-select" className="block font-bold text-[#242424] mb-1">
                    Tahap Seleksi <span className="text-[#BD214C]">*</span>
                  </label>
                  <select
                    id="update-stage-select"
                    value={updateStage}
                    onChange={(e) => setUpdateStage(e.target.value as SelectionStage)}
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] bg-white text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                  >
                    {[activeProcess.currentStage, ...STAGE_TRANSITIONS[activeProcess.currentStage]].map((k) => (
                      <option key={k} value={k}>
                        {STAGE_CONFIG[k].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="update-outcome-select" className="block font-bold text-[#242424] mb-1">
                    Hasil Akhir (Outcome) <span className="text-[#BD214C]">*</span>
                  </label>
                  <select
                    id="update-outcome-select"
                    value={updateOutcome}
                    onChange={(e) => setUpdateOutcome(e.target.value as ProcessOutcome)}
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] bg-white text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                  >
                    {ADMIN_SETTABLE_OUTCOMES.map((k) => [k, OUTCOME_CONFIG[k]] as const).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="update-occurred-date" className="block font-bold text-[#242424] mb-1">
                    Tanggal Kejadian <span className="text-[#BD214C]">*</span>
                  </label>
                  <input
                    id="update-occurred-date"
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={occurredDate}
                    onChange={(e) => setOccurredDate(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                  />
                  <span className="text-[10px] text-[#595959] mt-0.5 block">Tidak boleh masa depan</span>
                </div>

                <div>
                  <label htmlFor="update-source-type" className="block font-bold text-[#242424] mb-1">Sumber Informasi</label>
                  <select
                    id="update-source-type"
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value as 'admin_official' | 'company_update')}
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] bg-white text-[#242424]"
                  >
                    <option value="company_update">Kabar Resmi HR Company</option>
                    <option value="admin_official">Verifikasi Internal Admin</option>
                  </select>
                </div>
              </div>

              {updateStage === 'interview' && (
                <div>
                  <label htmlFor="update-interview-schedule" className="block font-bold text-[#242424] mb-1">Jadwal Wawancara (Jika Ada)</label>
                  <input
                    id="update-interview-schedule"
                    type="text"
                    placeholder="Contoh: Selasa, 21 Okt 2026 14:00 WIB via Google Meet"
                    value={interviewSchedule}
                    onChange={(e) => setInterviewSchedule(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                  />
                </div>
              )}

              {updateStage === 'mulai_kerja' && (
                <div>
                  <label htmlFor="update-actual-start-date" className="block font-bold text-[#242424] mb-1">Tanggal Aktual Mulai Kerja</label>
                  <input
                    id="update-actual-start-date"
                    type="date"
                    value={actualStartDate}
                    onChange={(e) => setActualStartDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                  />
                </div>
              )}

              <div>
                <label htmlFor="update-public-message" className="block font-bold text-[#242424] mb-1">
                  Pesan Publik untuk Alumni (Akan Tampil di Tab Alumni)
                </label>
                <textarea
                  id="update-public-message"
                  rows={2}
                  placeholder="Contoh: Selamat, kamu lolos ke tahap interview HR! Siapkan materi portofolio bootcamp..."
                  value={publicMessage}
                  onChange={(e) => setPublicMessage(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                />
              </div>

              <div>
                <label htmlFor="update-internal-notes" className="block font-bold text-[#242424] mb-1">
                  Catatan Internal (Rahasia • Hanya Dibaca Tim BolBel)
                </label>
                <textarea
                  id="update-internal-notes"
                  rows={2}
                  placeholder="Feedback PIC company, negosiasi salary, dll..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D9D9D9]">
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg border border-[#D9D9D9] text-xs font-semibold text-[#595959]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-[#BD214C] hover:bg-[#a61b42] text-white text-xs font-bold transition-all shadow-xs"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Status Resmi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forward CV Action Modal (PRD FR08 & FR07) */}
      {isForwardModalOpen && activeProcess && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Verifikasi Pengiriman CV ke Company (FR08)
              </span>
              <h3 className="text-lg font-bold text-[#242424] mt-0.5">
                Teruskan Berkas ke {activeProcess.companyName}
              </h3>
              <p className="text-xs text-[#595959]">
                Kandidat: <strong className="text-[#242424]">{activeProcess.alumniName}</strong> (Posisi:{' '}
                {activeProcess.jobTitle})
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <strong className="block font-bold">Pemeriksaan Persetujuan (Consent Active):</strong>
              <p>
                Alumni telah memberikan persetujuan eksplisit untuk posisi ini dengan CV versi{' '}
                <span className="font-semibold">{activeProcess.documentName}</span>.
              </p>
            </div>

            <form onSubmit={handleForwardCVSubmit} className="space-y-4 text-xs">
              <div>
                <label htmlFor="forward-cv-notes" className="block font-bold text-[#242424] mb-1">
                  Bukti Kanal / Catatan Pengiriman Gifari <span className="text-[#BD214C]">*</span>
                </label>
                <textarea
                  id="forward-cv-notes"
                  rows={2}
                  required
                  placeholder="Contoh: Dikirimkan via email resmi ke Clarissa (TA Tiket.com) dengan subject 'Rekomendasi Alumni Boleh Belajar'..."
                  value={forwardNotes}
                  onChange={(e) => setForwardNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                />
              </div>

              <div>
                <label htmlFor="forward-cv-public-msg" className="block font-bold text-[#242424] mb-1">Pesan Status untuk Alumni</label>
                <textarea
                  id="forward-cv-public-msg"
                  rows={2}
                  value={forwardPublicMsg}
                  onChange={(e) => setForwardPublicMsg(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                />
              </div>

              <div className="text-[11px] text-[#595959]">
                * Aksi ini otomatis menjadwalkan tugas tindak lanjut (follow-up) 7 hari kerja ke depan bagi Gifari.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D9D9D9]">
                <button
                  type="button"
                  onClick={() => setIsForwardModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg border border-[#D9D9D9] text-xs font-semibold text-[#595959]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                >
                  {isSubmitting ? 'Meneruskan...' : 'Konfirmasi CV Telah Diteruskan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
