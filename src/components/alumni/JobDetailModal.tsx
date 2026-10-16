'use client';

import React from 'react';
import {
  X,
  Building,
  MapPin,
  Briefcase,
  Clock,
  ExternalLink,
  Send,
  FileCheck,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import type { Job } from '../../domain/types.ts';
import { formatCurrencyIDR, formatDateIndo, STAGE_CONFIG } from '../../domain/stateMachine.ts';
import { useDataStore } from '../../domain/dataStore.tsx';

interface JobDetailModalProps {
  job: Job;
  onClose: () => void;
  onApplyBolBel: () => void;
  onReportExternal: () => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  onClose,
  onApplyBolBel,
  onReportExternal,
}) => {
  const { processes, currentUser } = useDataStore();
  const existingProcess = processes.find((p) => p.alumniId === currentUser.id && p.jobId === job.id);
  const isPaused = job.status === 'paused';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-[#595959] hover:bg-[#F7F7F7] transition-colors"
          aria-label="Tutup modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Details */}
        <div className="pr-8">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold ${
                job.applyChannel === 'bolbel'
                  ? 'bg-[#BD214C]/10 text-[#BD214C]'
                  : 'bg-blue-50 text-blue-700'
              }`}
            >
              {job.applyChannel === 'bolbel' ? 'Apply Melalui BolBel' : 'Apply Eksternal'}
            </span>
            {job.deadlineDate && (
              <span className="text-xs text-[#595959] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Tenggat: {formatDateIndo(job.deadlineDate)}
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-[#242424]">{job.title}</h2>
          <div className="text-sm font-semibold text-[#595959] mt-1 flex items-center gap-1.5">
            <Building className="w-4 h-4 text-[#595959]" />
            {job.companyName}
          </div>
        </div>

        {/* Key Info Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-5 p-3.5 rounded-xl bg-[#F7F7F7] border border-[#D9D9D9] text-xs">
          <div>
            <span className="text-[#595959] block">Lokasi & Model:</span>
            <span className="font-semibold text-[#242424] block mt-0.5">
              {job.location} ({job.workModel.toUpperCase()})
            </span>
          </div>
          <div>
            <span className="text-[#595959] block">Tipe Kontrak:</span>
            <span className="font-semibold text-[#242424] block mt-0.5">
              {job.workType.replace('_', ' ')}
            </span>
          </div>
          <div>
            <span className="text-[#595959] block">Kebutuhan:</span>
            <span className="font-semibold text-[#242424] block mt-0.5">{job.openingsCount} Orang</span>
          </div>
          <div>
            <span className="text-[#595959] block">Kompensasi:</span>
            <span className="font-semibold text-[#242424] block mt-0.5">
              {job.salaryType === 'range' && job.salaryMin && job.salaryMax
                ? `${formatCurrencyIDR(job.salaryMin)} - ${formatCurrencyIDR(job.salaryMax)}`
                : job.salaryType === 'confidential'
                ? 'Dirahasiakan'
                : 'Belum Diinfokan'}
            </span>
          </div>
        </div>

        {/* Body Content */}
        <div className="space-y-6 text-sm text-[#242424]">
          {/* Summary */}
          <div>
            <h4 className="font-bold text-[#242424] mb-1.5">Ringkasan Posisi</h4>
            <p className="text-[#595959] leading-relaxed">{job.summary}</p>
          </div>

          {/* Responsibilities */}
          {job.responsibilities && job.responsibilities.length > 0 && (
            <div>
              <h4 className="font-bold text-[#242424] mb-2">Tanggung Jawab Pekerjaan</h4>
              <ul className="list-disc pl-5 space-y-1.5 text-[#595959]">
                {job.responsibilities.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <div>
              <h4 className="font-bold text-[#242424] mb-2">Kualifikasi & Persyaratan</h4>
              <ul className="list-disc pl-5 space-y-1.5 text-[#595959]">
                {job.requirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Notice box on process */}
          <div className="p-3.5 rounded-xl bg-[#F9EDDE] border border-[#EADBCE] text-xs text-[#595959] space-y-1">
            <div className="font-bold text-[#242424] flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-[#BD214C]" />
              Catatan Proses Seleksi oleh Boleh Belajar
            </div>
            <p>
              {job.applyChannel === 'bolbel'
                ? 'Lamaran kamu akan ditinjau oleh Gifari terlebih dahulu sebelum CV resmi diteruskan ke company. Kamu akan menerima pembaruan berkala di tab "Lamaran Saya".'
                : 'Pendaftaran ini diarahkan langsung ke situs resmi company. Kamu dapat mencatat status laporan di portal setelah submit di situs company.'}
            </p>
          </div>
        </div>

        {/* Modal Footer CTA */}
        <div className="mt-8 pt-4 border-t border-[#D9D9D9] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-[#D9D9D9] hover:bg-[#F7F7F7] text-sm font-semibold text-[#595959] transition-colors"
          >
            Tutup
          </button>

          {existingProcess ? (
            <div className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-sm font-semibold border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              <span>Sudah Terdaftar ({STAGE_CONFIG[existingProcess.currentStage]?.label})</span>
            </div>
          ) : isPaused ? (
            <div className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-amber-50 text-amber-800 text-sm font-semibold text-center border border-amber-200">
              Lowongan Sedang Dijeda
            </div>
          ) : job.applyChannel === 'bolbel' ? (
            <button
              onClick={onApplyBolBel}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#BD214C] hover:bg-[#a61b42] text-white text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Kirim Lamaran via BolBel
            </button>
          ) : (
            <div className="w-full sm:w-auto flex items-center gap-2">
              <button
                onClick={onReportExternal}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-[#D9D9D9] hover:border-[#BD214C] text-[#242424] text-xs font-semibold"
              >
                Sudah Melamar di Situs Company?
              </button>
              <a
                href={job.externalApplyUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#BD214C] hover:bg-[#a61b42] text-white text-sm font-bold flex items-center justify-center gap-1.5"
              >
                Buka Link Apply <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
