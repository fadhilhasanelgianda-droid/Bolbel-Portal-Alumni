'use client';

import React, { useState } from 'react';
import { X, ExternalLink, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Job } from '../../domain/types.ts';
import { useDataStore } from '../../domain/dataStore.tsx';

interface ReportExternalApplyModalProps {
  job: Job;
  onClose: () => void;
}

export const ReportExternalApplyModal: React.FC<ReportExternalApplyModalProps> = ({ job, onClose }) => {
  const { reportExternalApply } = useDataStore();
  const [applyDate, setApplyDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!applyDate) {
      setErrorMessage('Pilih tanggal ketika kamu melamar di situs company.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await reportExternalApply(job.id, applyDate, notes);
      if (res.success) {
        setSuccess(true);
      } else {
        setErrorMessage(res.error || 'Gagal menyimpan laporan.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Terjadi kendala saat mengirimkan laporan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-xl">
        {!success && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-lg text-[#595959] hover:bg-[#F7F7F7] transition-colors"
            aria-label="Tutup form laporan"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {success ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#242424]">Laporan Berhasil Disimpan</h3>
            <p className="text-xs text-[#595959] leading-relaxed max-w-sm mx-auto">
              Laporan lamaranmu telah tercatat dengan label{' '}
              <span className="font-semibold text-[#242424]">&quot;Dilaporkan alumni&quot;</span>. Tim BolBel dapat
              memantau dan membantu koordinasi tindak lanjut dengan company.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-[#BD214C] text-white rounded-lg text-sm font-bold hover:bg-[#a61b42] transition-colors"
            >
              Kembali ke Daftar Lowongan
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Pencatatan Apply Eksternal (FR06)
              </span>
              <h2 className="text-xl font-bold text-[#242424] mt-1">{job.title}</h2>
              <p className="text-xs text-[#595959] mt-0.5">di {job.companyName}</p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-[#F9EDDE] border border-[#EADBCE] text-xs text-[#595959] leading-relaxed">
              <strong className="text-[#242424] block mb-1">Catatan Penting:</strong>
              Laporan ini mencatat bahwa kamu telah mengajukan lamaran mandiri secara langsung melalui portal resmi{' '}
              {job.companyName}. Portal Boleh Belajar tidak mengirimkan CV secara terpisah untuk jalur ini.
            </div>

            <div>
              <label htmlFor="report-apply-date" className="block text-xs font-bold text-[#242424] mb-1">
                Tanggal Kamu Melamar <span className="text-[#BD214C]">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-[#595959] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="report-apply-date"
                  type="date"
                  value={applyDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setApplyDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-[#D9D9D9] text-xs text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                  required
                />
              </div>
              <span className="text-[11px] text-[#595959] mt-1 block">
                Tanggal tidak boleh di masa mendatang.
              </span>
            </div>

            <div>
              <label htmlFor="report-notes" className="block text-xs font-bold text-[#242424] mb-1">
                Catatan Tambahan (Opsional)
              </label>
              <textarea
                id="report-notes"
                rows={3}
                placeholder="Contoh: Mengirimkan CV versi digital marketing, dihubungi via email konfirmasi portal GoTo..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 rounded-lg border border-[#D9D9D9] text-xs text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
              />
            </div>

            <div className="pt-3 border-t border-[#D9D9D9] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg border border-[#D9D9D9] text-xs font-semibold text-[#595959] hover:bg-[#F7F7F7]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-[#BD214C] hover:bg-[#a61b42] text-white text-xs font-bold transition-all shadow-xs"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Laporan Apply'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
