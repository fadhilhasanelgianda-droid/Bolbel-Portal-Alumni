import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  Lock,
  Trash2,
  FileText,
} from 'lucide-react';
import { useDataStore } from '../../domain/dataStore.tsx';
import { parseAndValidateRosterCsv, formatDateIndo } from '../../domain/stateMachine.ts';
import type { CsvRosterImportRow } from '../../domain/types.ts';

const SAMPLE_CSV = `Email,Nama Lengkap,Program,Batch,Eligibility
hendra.wijaya@alumni.com,Hendra Wijaya,Full Course,Batch 12,eligible
anisa.rahma@alumni.com,Anisa Rahma,Performance Marketing Specialization,Batch 11,eligible
dimas.w@alumni.com,Dimas Wicaksono,Digital Marketing Intensive,Batch 12,eligible
invalid-email-address,Kurnia Pratama,Career Prep,Batch 10,pending`;

export const DataImportAndAudit: React.FC = () => {
  const { roster, consents, importRosterBatch } = useDataStore();

  const [activeTab, setActiveTab] = useState<'import' | 'audit'>('import');
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [parsedRows, setParsedRows] = useState<CsvRosterImportRow[]>(() => {
    const existingEmails = roster.map((r) => r.email);
    return parseAndValidateRosterCsv(SAMPLE_CSV, existingEmails);
  });
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  const handleParseCsv = () => {
    const existingEmails = roster.map((r) => r.email);
    const rows = parseAndValidateRosterCsv(csvText, existingEmails);
    setParsedRows(rows);
    setImportSuccessMsg(null);
  };

  const handleCommitImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid && !r.isDuplicate);
    if (validRows.length === 0) return;

    const count = importRosterBatch(
      validRows.map((r) => ({
        email: r.email,
        fullName: r.fullName,
        program: r.program as any,
        batch: r.batch,
        eligibility: r.eligibility as any,
      }))
    );

    setImportSuccessMsg(`Berhasil mengimpor ${count} alumni baru ke dalam roster terverifikasi.`);
    // Re-validate against new roster
    setTimeout(() => {
      handleParseCsv();
    }, 500);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_roster_alumni_bolbel.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
          Impor Roster Awal &amp; Audit Privasi Data
        </h1>
        <p className="text-xs sm:text-sm text-[#595959] mt-0.5">
          Kelola integritas identitas alumni (FR10) serta penegakan persetujuan pembagian data (FR12).
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#D9D9D9] pb-2 text-xs">
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            activeTab === 'import'
              ? 'bg-[#BD214C] text-white'
              : 'text-[#595959] hover:bg-[#F7F7F7]'
          }`}
        >
          Impor Data Roster (CSV)
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            activeTab === 'audit'
              ? 'bg-[#BD214C] text-white'
              : 'text-[#595959] hover:bg-[#F7F7F7]'
          }`}
        >
          Log Persetujuan (Consent Audit)
        </button>
      </div>

      {activeTab === 'import' ? (
        /* Impor CSV Tab (FR10) */
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-[#D9D9D9] p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#242424]">Impor Roster Alumni dari CSV</h3>
                <p className="text-xs text-[#595959]">
                  Sistem memeriksa duplikasi email dan memvalidasi kelengkapan data sebelum diaktifkan ke portal.
                </p>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="px-3.5 py-1.5 rounded-lg border border-[#D9D9D9] hover:bg-stone-50 text-xs font-semibold text-[#242424] flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" /> Unduh Template CSV
              </button>
            </div>

            {/* CSV Text Input Area */}
            <div>
              <label htmlFor="csv-input-area" className="block text-xs font-bold text-[#242424] mb-1">
                Data CSV (Format: Email, Nama Lengkap, Program, Batch, Eligibility)
              </label>
              <textarea
                id="csv-input-area"
                rows={5}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full font-mono text-xs p-3 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={handleParseCsv}
                className="px-4 py-2 rounded-lg bg-stone-800 text-white text-xs font-bold hover:bg-stone-900"
              >
                Periksa &amp; Validasi Data CSV
              </button>

              {importSuccessMsg && (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {importSuccessMsg}
                </span>
              )}
            </div>
          </div>

          {/* Validation & Preview Table */}
          <div className="bg-white rounded-xl border border-[#D9D9D9] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#D9D9D9] bg-[#F7F7F7] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#595959]">
                  Hasil Validasi Impor ({parsedRows.length} Baris Terdeteksi)
                </h4>
                <div className="text-[11px] text-[#595959]">
                  Valid: {parsedRows.filter((r) => r.isValid && !r.isDuplicate).length} baris • Bermasalah/Duplikat:{' '}
                  {parsedRows.filter((r) => !r.isValid || r.isDuplicate).length} baris
                </div>
              </div>

              <button
                onClick={handleCommitImport}
                disabled={parsedRows.filter((r) => r.isValid && !r.isDuplicate).length === 0}
                className="px-4 py-2 rounded-lg bg-[#BD214C] hover:bg-[#a61b42] text-white text-xs font-bold disabled:bg-stone-300 disabled:cursor-not-allowed shadow-xs"
              >
                Komit Impor ({parsedRows.filter((r) => r.isValid && !r.isDuplicate).length} Alumni)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#242424]">
                <thead className="bg-[#F7F7F7] border-b border-[#D9D9D9] text-[#595959] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">Nama Lengkap</th>
                    <th className="px-4 py-2.5">Program &amp; Batch</th>
                    <th className="px-4 py-2.5">Status Validasi</th>
                    <th className="px-4 py-2.5">Catatan Kesalahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9D9D9]">
                  {parsedRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={
                        !row.isValid || row.isDuplicate
                          ? 'bg-rose-50/50'
                          : 'hover:bg-[#F9EDDE]/20 transition-colors'
                      }
                    >
                      <td className="px-4 py-2.5 font-medium">{row.email || '-'}</td>
                      <td className="px-4 py-2.5">{row.fullName || '-'}</td>
                      <td className="px-4 py-2.5 text-[#595959]">
                        {row.program} ({row.batch})
                      </td>
                      <td className="px-4 py-2.5">
                        {row.isValid && !row.isDuplicate ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Siap Diimpor
                          </span>
                        ) : row.isDuplicate ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Duplikat Terdaftar
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            Tidak Valid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-rose-700">
                        {row.errors.length > 0 ? row.errors.join('; ') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Consent Audit Log Tab (FR12) */
        <div className="bg-white rounded-xl border border-[#D9D9D9] overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#D9D9D9] bg-[#F7F7F7]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#595959]">
              Daftar Riwayat Persetujuan Pembagian CV &amp; Profil (FR12)
            </h4>
            <p className="text-[11px] text-[#595959] mt-0.5">
              Setiap lamaran mencatat persetujuan aktif spesifik per lowongan. Penarikan izin dicatat tanpa menghapus
              bukti legalitas riwayat.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#242424]">
              <thead className="bg-[#F7F7F7] border-b border-[#D9D9D9] text-[#595959] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">ID Consent</th>
                  <th className="px-4 py-3">Lowongan &amp; Company</th>
                  <th className="px-4 py-3">Dokumen CV Terkunci</th>
                  <th className="px-4 py-3">Versi Kebijakan</th>
                  <th className="px-4 py-3">Waktu Diberikan</th>
                  <th className="px-4 py-3">Status Izin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9D9D9]">
                {consents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-[#595959] italic">
                      Belum ada consent tercatat.
                    </td>
                  </tr>
                ) : (
                  consents.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F9EDDE]/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px]">{c.id}</td>
                      <td className="px-4 py-3 font-medium">
                        {c.jobTitle} <span className="text-[#595959]">({c.companyName})</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <FileText className="w-3.5 h-3.5 text-[#BD214C]" />
                          <span>{c.documentName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#595959] font-mono text-[11px]">{c.policyVersion}</td>
                      <td className="px-4 py-3 text-[#595959] text-[11px]">{formatDateIndo(c.grantedAt)}</td>
                      <td className="px-4 py-3">
                        {c.revokedAt ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            Dicabut pada {formatDateIndo(c.revokedAt)}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Aktif Valid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
