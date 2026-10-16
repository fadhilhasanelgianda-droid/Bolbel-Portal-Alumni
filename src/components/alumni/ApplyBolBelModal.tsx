'use client';

import React, { useState } from 'react';
import {
  X,
  FileCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Building,
  Check,
} from 'lucide-react';
import type { Job } from '../../domain/types.ts';
import { useDataStore } from '../../domain/dataStore.tsx';
import { isMinimumProfileComplete } from '../../domain/stateMachine.ts';

interface ApplyBolBelModalProps {
  job: Job;
  onClose: () => void;
}

export const ApplyBolBelModal: React.FC<ApplyBolBelModalProps> = ({ job, onClose }) => {
  const { currentProfile, activeCv, applyViaBolBel } = useDataStore();

  const [consentChecked, setConsentChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ processId: string } | null>(null);

  const profileValidation = isMinimumProfileComplete(currentProfile, activeCv ? 1 : 0);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!consentChecked) {
      setErrorMessage('Kamu wajib mencentang persetujuan pembagian CV & profil untuk lowongan ini.');
      return;
    }

    if (!profileValidation.isComplete) {
      setErrorMessage(`Data profil belum lengkap: ${profileValidation.missingFields.join(', ')}.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await applyViaBolBel(job.id, consentChecked);
      if (res.success && res.processId) {
        setSuccessResult({ processId: res.processId });
      } else {
        setErrorMessage(res.error || 'Terjadi kesalahan saat menyimpan lamaran.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mengirimkan lamaran. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-xl">
        {/* Close Button */}
        {!successResult && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-lg text-[#595959] hover:bg-[#F7F7F7] transition-colors"
            aria-label="Tutup form lamaran"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {successResult ? (
          /* Success Screen (PRD FR05) */
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#242424]">Lamaran Berhasil Tersimpan!</h3>
            <div className="p-4 rounded-xl bg-[#F9EDDE] border border-[#EADBCE] text-left text-xs text-[#242424] space-y-2">
              <p className="font-semibold text-sm text-[#BD214C]">
                Lamaran tersimpan di BolBel. Tim akan meninjau sebelum meneruskannya ke company.
              </p>
              <p className="text-[#595959]">
                Penyimpanan lamaran ini tidak berarti CV kamu sudah otomatis terkirim ke HR {job.companyName}.
                Gifari akan memverifikasi kesesuaian berkas dan menghubungimu jika terdapat jadwal wawancara.
              </p>
              <div className="pt-2 border-t border-[#D9D9D9] text-[11px] text-[#595959]">
                <span className="font-medium">ID Referensi Lamaran:</span> {successResult.processId}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-[#BD214C] text-white rounded-lg text-sm font-bold hover:bg-[#a61b42] transition-colors"
            >
              Kembali ke Daftar Lowongan
            </button>
          </div>
        ) : (
          /* Application Form */
          <form onSubmit={handleFormSubmit} className="space-y-5">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-[#BD214C]/10 text-[#BD214C]">
                Formulir Lamaran Melalui BolBel
              </span>
              <h2 className="text-xl font-bold text-[#242424] mt-1">{job.title}</h2>
              <div className="text-xs text-[#595959] flex items-center gap-1.5 mt-0.5">
                <Building className="w-3.5 h-3.5" />
                {job.companyName}
              </div>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Incomplete profile warning */}
            {!profileValidation.isComplete && (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Profilmu belum memenuhi syarat minimum:
                </div>
                <ul className="list-disc pl-5 text-[11px]">
                  {profileValidation.missingFields.map((field, i) => (
                    <li key={i}>{field}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* CV Version Section */}
            <div className="p-3.5 rounded-xl border border-[#D9D9D9] bg-[#F7F7F7]">
              <div className="text-xs font-bold text-[#595959] uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Dokumen CV yang Akan Digunakan</span>
                <span className="text-[11px] text-[#BD214C] font-semibold">Terkunci ke Lamaran Ini</span>
              </div>
              {activeCv ? (
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-[#D9D9D9]">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-[#BD214C]" />
                    <div>
                      <div className="text-xs font-bold text-[#242424]">{activeCv.fileName}</div>
                      <div className="text-[11px] text-[#595959]">
                        {(activeCv.fileSizeBytes / 1024 / 1024).toFixed(2)} MB • PDF
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    CV Aktif
                  </span>
                </div>
              ) : (
                <div className="text-xs text-rose-600">
                  Belum ada CV aktif. Harap upload CV di tab &quot;Profil &amp; CV Saya&quot; terlebih dahulu.
                </div>
              )}
            </div>

            {/* Profile Snapshot Preview */}
            <div className="p-3.5 rounded-xl border border-[#D9D9D9] bg-[#F7F7F7] space-y-2 text-xs">
              <div className="font-bold text-[#595959] uppercase tracking-wider text-[11px]">
                Snapshot Profil yang Akan Diteruskan
              </div>
              <div className="grid grid-cols-2 gap-2 text-[#242424]">
                <div>
                  <span className="text-[#595959]">Nama Lengkap:</span>
                  <div className="font-semibold">{currentProfile?.fullName || '-'}</div>
                </div>
                <div>
                  <span className="text-[#595959]">Domisili:</span>
                  <div className="font-semibold">{currentProfile?.domicile || '-'}</div>
                </div>
                <div>
                  <span className="text-[#595959]">Status Bekerja:</span>
                  <div className="font-semibold capitalize">
                    {currentProfile?.employmentStatus?.replace('_', ' ') || '-'}
                  </div>
                </div>
                <div>
                  <span className="text-[#595959]">Kesiapan Mulai:</span>
                  <div className="font-semibold capitalize">
                    {currentProfile?.startReadiness?.replace('_', ' ') || '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Mandatory Explicit Consent Checkbox (PRD Section 15 microcopy) */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-[#D9D9D9] hover:bg-[#F9EDDE]/50 transition-colors">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-[#BD214C] focus:ring-[#BD214C] border-[#D9D9D9]"
                />
                <span className="text-xs text-[#242424] leading-relaxed">
                  Saya setuju Boleh Belajar membagikan CV dan data profil yang ditampilkan kepada{' '}
                  <span className="font-bold">{job.companyName}</span> untuk posisi{' '}
                  <span className="font-bold">{job.title}</span>.
                </span>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#D9D9D9] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-lg border border-[#D9D9D9] text-xs font-semibold text-[#595959] hover:bg-[#F7F7F7]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting || !consentChecked || !profileValidation.isComplete}
                className={`px-6 py-2.5 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-1.5 ${
                  submitting || !consentChecked || !profileValidation.isComplete
                    ? 'bg-stone-300 cursor-not-allowed text-stone-500'
                    : 'bg-[#BD214C] hover:bg-[#a61b42] shadow-xs'
                }`}
              >
                {submitting ? 'Menyimpan Lamaran...' : 'Kirim Lamaran Sekarang'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
