import React, { useState } from 'react';
import {
  Briefcase,
  Building,
  Plus,
  Edit,
  Clock,
  ExternalLink,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  X,
  Pause,
  Play,
  Archive,
} from 'lucide-react';
import { useDataStore } from '../../domain/dataStore.tsx';
import type { Job, JobStatus, ApplyChannel, SalaryType, WorkType, WorkModel, ExperienceLevel } from '../../domain/types.ts';
import { formatCurrencyIDR, formatDateIndo } from '../../domain/stateMachine.ts';

export const JobManagement: React.FC = () => {
  const { jobs, companies, addJob, updateJobStatus, addCompany } = useDataStore();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);

  // Close job modal
  const [closingJob, setClosingJob] = useState<Job | null>(null);
  const [closeReason, setCloseReason] = useState('');

  // Add Job Form State
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newCompanyId, setNewCompanyId] = useState(companies[0]?.id || '');
  const [newSummary, setNewSummary] = useState('');
  const [newResponsibilities, setNewResponsibilities] = useState('');
  const [newRequirements, setNewRequirements] = useState('');
  const [newExpLevel, setNewExpLevel] = useState<ExperienceLevel>('junior');
  const [newWorkType, setNewWorkType] = useState<WorkType>('full_time');
  const [newWorkModel, setNewWorkModel] = useState<WorkModel>('hybrid');
  const [newLocation, setNewLocation] = useState('Jakarta');
  const [newOpenings, setNewOpenings] = useState(1);
  const [newSalaryType, setNewSalaryType] = useState<SalaryType>('range');
  const [newSalaryMin, setNewSalaryMin] = useState<number>(8000000);
  const [newSalaryMax, setNewSalaryMax] = useState<number>(12000000);
  const [newChannel, setNewChannel] = useState<ApplyChannel>('bolbel');
  const [newExternalUrl, setNewExternalUrl] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Add Company Form State
  const [compName, setCompName] = useState('');
  const [compIndustry, setCompIndustry] = useState('');
  const [compWebsite, setCompWebsite] = useState('');
  const [compPic, setCompPic] = useState('');
  const [compContact, setCompContact] = useState('');
  const [compNotes, setCompNotes] = useState('');

  const filteredJobs = jobs.filter((j) => (statusFilter === 'all' ? true : j.status === statusFilter));

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const comp = companies.find((c) => c.id === newCompanyId);
    if (!comp) {
      setFormError('Pilih company terlebih dahulu.');
      return;
    }

    if (newChannel === 'external' && !newExternalUrl) {
      setFormError('Untuk jalur Apply Eksternal, URL aplikasi wajib diisi.');
      return;
    }

    const respList = newResponsibilities
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    const reqList = newRequirements
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    addJob({
      companyId: comp.id,
      companyName: comp.name,
      title: newJobTitle,
      summary: newSummary,
      responsibilities: respList.length > 0 ? respList : ['Bertanggung jawab atas operasional dan optimasi kampanye.'],
      requirements: reqList.length > 0 ? reqList : ['Alumni Boleh Belajar dengan pemahaman praktis.'],
      experienceLevel: newExpLevel,
      workType: newWorkType,
      workModel: newWorkModel,
      location: newLocation,
      openingsCount: newOpenings,
      salaryType: newSalaryType,
      salaryMin: newSalaryType === 'range' ? newSalaryMin : undefined,
      salaryMax: newSalaryType === 'range' ? newSalaryMax : undefined,
      salaryPeriod: 'bulan',
      applyChannel: newChannel,
      externalApplyUrl: newChannel === 'external' ? newExternalUrl : undefined,
      status: 'published',
      processOwner: 'Gifari',
      deadlineDate: newDeadline || undefined,
    });

    setShowAddJobModal(false);
    // Reset fields
    setNewJobTitle('');
    setNewSummary('');
    setNewResponsibilities('');
    setNewRequirements('');
  };

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName) return;

    addCompany({
      name: compName,
      industry: compIndustry || 'Teknologi & Digital',
      websiteUrl: compWebsite || undefined,
      relationshipSource: 'company_inbound',
      internalPicName: compPic || undefined,
      internalPicContact: compContact || undefined,
      internalNotes: compNotes || undefined,
    });

    setShowAddCompanyModal(false);
    setCompName('');
    setCompIndustry('');
    setCompWebsite('');
    setCompPic('');
    setCompContact('');
    setCompNotes('');
  };

  const handleCloseJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingJob || !closeReason) return;
    updateJobStatus(closingJob.id, 'closed', closeReason);
    setClosingJob(null);
    setCloseReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
            Kelola Lowongan &amp; Partner Company
          </h1>
          <p className="text-xs sm:text-sm text-[#595959] mt-0.5">
            Kurasi peluang kerja terverifikasi, tentukan jalur lamaran, dan pantau status publikasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddCompanyModal(true)}
            className="px-3.5 py-2 rounded-lg border border-[#D9D9D9] hover:bg-stone-50 text-xs font-semibold text-[#242424] transition-colors"
          >
            + Tambah Company
          </button>
          <button
            onClick={() => setShowAddJobModal(true)}
            className="px-4 py-2 rounded-lg bg-[#BD214C] hover:bg-[#a61b42] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Tambah Lowongan
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 text-xs">
        {['all', 'published', 'paused', 'closed', 'draft'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg border font-semibold capitalize transition-all ${
              statusFilter === st
                ? 'bg-[#BD214C] text-white border-[#BD214C]'
                : 'bg-white text-[#595959] border-[#D9D9D9] hover:bg-[#F7F7F7]'
            }`}
          >
            {st === 'all' ? 'Semua Lowongan' : st} ({jobs.filter((j) => (st === 'all' ? true : j.status === st)).length})
          </button>
        ))}
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-xl border border-[#D9D9D9] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#242424]">
            <thead className="bg-[#F7F7F7] border-b border-[#D9D9D9] text-[#595959] uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Posisi &amp; Company</th>
                <th className="px-4 py-3">Jalur Apply</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Kompensasi</th>
                <th className="px-4 py-3">Tenggat</th>
                <th className="px-4 py-3 text-right">Aksi Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D9D9]">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#595959] italic">
                    Belum ada lowongan pada status ini.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-[#F9EDDE]/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-[#242424] text-sm">{job.title}</div>
                      <div className="text-[11px] text-[#595959] flex items-center gap-1 mt-0.5">
                        <Building className="w-3.5 h-3.5" />
                        {job.companyName} • {job.location} ({job.workModel.toUpperCase()})
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          job.applyChannel === 'bolbel'
                            ? 'bg-[#BD214C]/10 text-[#BD214C]'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {job.applyChannel === 'bolbel' ? 'Melalui BolBel' : 'Eksternal'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          job.status === 'published'
                            ? 'bg-emerald-100 text-emerald-800'
                            : job.status === 'paused'
                            ? 'bg-amber-100 text-amber-800'
                            : job.status === 'closed'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        {job.status}
                      </span>
                      {job.closedReason && (
                        <div className="text-[10px] text-[#595959] italic mt-0.5 max-w-[180px] truncate" title={job.closedReason}>
                          Alasan: {job.closedReason}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-[11px]">
                      {job.salaryType === 'range' && job.salaryMin && job.salaryMax
                        ? `${formatCurrencyIDR(job.salaryMin)} - ${formatCurrencyIDR(job.salaryMax)}`
                        : job.salaryType === 'confidential'
                        ? 'Dirahasiakan'
                        : 'Belum Diinfokan'}
                    </td>

                    <td className="px-4 py-3.5 text-[11px] text-[#595959]">
                      {job.deadlineDate ? formatDateIndo(job.deadlineDate) : 'Tanpa Tenggat'}
                    </td>

                    <td className="px-4 py-3.5 text-right space-x-1 whitespace-nowrap">
                      {job.status === 'published' && (
                        <button
                          onClick={() => updateJobStatus(job.id, 'paused')}
                          className="px-2 py-1 rounded border border-[#D9D9D9] hover:bg-stone-50 text-[11px] font-semibold text-[#595959]"
                          title="Jeda pendaftaran"
                        >
                          Jeda
                        </button>
                      )}

                      {job.status === 'paused' && (
                        <button
                          onClick={() => updateJobStatus(job.id, 'published')}
                          className="px-2 py-1 rounded bg-emerald-600 text-white text-[11px] font-bold"
                          title="Buka kembali pendaftaran"
                        >
                          Publikasikan
                        </button>
                      )}

                      {job.status !== 'closed' && (
                        <button
                          onClick={() => setClosingJob(job)}
                          className="px-2 py-1 rounded border border-rose-200 hover:bg-rose-50 text-[11px] font-semibold text-rose-700"
                        >
                          Tutup
                        </button>
                      )}

                      {job.status === 'closed' && (
                        <button
                          onClick={() => updateJobStatus(job.id, 'published')}
                          className="px-2 py-1 rounded border border-[#D9D9D9] hover:bg-stone-50 text-[11px] font-semibold text-[#242424]"
                        >
                          Buka Ulang
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Job Modal (PRD FR04) */}
      {showAddJobModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto space-y-4">
            <button
              onClick={() => setShowAddJobModal(false)}
              className="absolute top-5 right-5 p-2 rounded-lg text-[#595959] hover:bg-[#F7F7F7]"
              aria-label="Tutup form lowongan baru"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-bold text-[#BD214C] uppercase tracking-wider">
                Kurasi Lowongan Baru (PRD FR04)
              </span>
              <h2 className="text-xl font-bold text-[#242424] mt-1">Tambah Lowongan Terkurasi</h2>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateJob} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="create-job-title" className="block font-bold text-[#242424] mb-1">
                    Judul Posisi <span className="text-[#BD214C]">*</span>
                  </label>
                  <input
                    id="create-job-title"
                    type="text"
                    required
                    placeholder="Contoh: Performance Marketing Specialist"
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                  />
                </div>

                <div>
                  <label htmlFor="create-job-company" className="block font-bold text-[#242424] mb-1">
                    Partner Company <span className="text-[#BD214C]">*</span>
                  </label>
                  <select
                    id="create-job-company"
                    value={newCompanyId}
                    onChange={(e) => setNewCompanyId(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] bg-white focus:outline-hidden focus:border-[#BD214C]"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.industry})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="create-job-summary" className="block font-bold text-[#242424] mb-1">
                  Ringkasan Pekerjaan <span className="text-[#BD214C]">*</span>
                </label>
                <textarea
                  id="create-job-summary"
                  rows={2}
                  required
                  placeholder="Deskripsi singkat tanggung jawab dan lingkup pekerjaan..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="create-job-responsibilities" className="block font-bold text-[#242424] mb-1">
                    Tanggung Jawab (Satu baris per poin)
                  </label>
                  <textarea
                    id="create-job-responsibilities"
                    rows={3}
                    placeholder="Contoh:&#10;Kelola Meta Ads & Google Ads&#10;Analisis ROAS harian"
                    value={newResponsibilities}
                    onChange={(e) => setNewResponsibilities(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                  />
                </div>

                <div>
                  <label htmlFor="create-job-requirements" className="block font-bold text-[#242424] mb-1">
                    Persyaratan &amp; Kualifikasi (Satu baris per poin)
                  </label>
                  <textarea
                    id="create-job-requirements"
                    rows={3}
                    placeholder="Contoh:&#10;Alumni Boleh Belajar Bootcamp&#10;Menguasai Meta Ads Manager"
                    value={newRequirements}
                    onChange={(e) => setNewRequirements(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                  />
                </div>
              </div>

              {/* Channel and compensation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#F7F7F7]">
                <div>
                  <label htmlFor="create-job-channel" className="block font-bold text-[#242424] mb-1">
                    Jalur Apply <span className="text-[#BD214C]">*</span>
                  </label>
                  <select
                    id="create-job-channel"
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value as ApplyChannel)}
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] bg-white focus:outline-hidden focus:border-[#BD214C]"
                  >
                    <option value="bolbel">Melalui BolBel (Tersimpan di Portal)</option>
                    <option value="external">Apply Eksternal (Situs Company)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="create-job-model" className="block font-bold text-[#242424] mb-1">Cara Kerja</label>
                  <select
                    id="create-job-model"
                    value={newWorkModel}
                    onChange={(e) => setNewWorkModel(e.target.value as WorkModel)}
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] bg-white focus:outline-hidden focus:border-[#BD214C]"
                  >
                    <option value="hybrid">Hybrid</option>
                    <option value="remote">Remote</option>
                    <option value="wfo">WFO</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="create-job-deadline" className="block font-bold text-[#242424] mb-1">Tenggat Waktu Pendaftaran</label>
                  <input
                    id="create-job-deadline"
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                  />
                </div>
              </div>

              {newChannel === 'external' && (
                <div>
                  <label htmlFor="create-job-external-url" className="block font-bold text-[#242424] mb-1">
                    URL Halaman Apply Eksternal (HTTPS) <span className="text-[#BD214C]">*</span>
                  </label>
                  <input
                    id="create-job-external-url"
                    type="url"
                    required
                    placeholder="https://careers.company.com/apply/..."
                    value={newExternalUrl}
                    onChange={(e) => setNewExternalUrl(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                  />
                </div>
              )}

              {/* Compensation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#F7F7F7]">
                <div>
                  <label htmlFor="create-job-salary-type" className="block font-bold text-[#242424] mb-1">Keterbukaan Gaji</label>
                  <select
                    id="create-job-salary-type"
                    value={newSalaryType}
                    onChange={(e) => setNewSalaryType(e.target.value as SalaryType)}
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] bg-white focus:outline-hidden focus:border-[#BD214C]"
                  >
                    <option value="range">Rentang Terisi</option>
                    <option value="uninformed">Belum Diinformasikan</option>
                    <option value="confidential">Dirahasiakan Company</option>
                  </select>
                </div>

                {newSalaryType === 'range' && (
                  <>
                    <div>
                      <label htmlFor="create-job-salary-min" className="block font-bold text-[#242424] mb-1">Gaji Minimum (IDR/bln)</label>
                      <input
                        id="create-job-salary-min"
                        type="number"
                        step={500000}
                        value={newSalaryMin}
                        onChange={(e) => setNewSalaryMin(Number(e.target.value))}
                        className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                      />
                    </div>
                    <div>
                      <label htmlFor="create-job-salary-max" className="block font-bold text-[#242424] mb-1">Gaji Maksimum (IDR/bln)</label>
                      <input
                        id="create-job-salary-max"
                        type="number"
                        step={500000}
                        value={newSalaryMax}
                        onChange={(e) => setNewSalaryMax(Number(e.target.value))}
                        className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#D9D9D9]">
                <button
                  type="button"
                  onClick={() => setShowAddJobModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#D9D9D9] text-xs font-semibold text-[#595959]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#BD214C] hover:bg-[#a61b42] text-white text-xs font-bold transition-all shadow-xs"
                >
                  Simpan &amp; Publikasikan Lowongan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Company Modal */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <button
              onClick={() => setShowAddCompanyModal(false)}
              className="absolute top-5 right-5 p-2 rounded-lg text-[#595959] hover:bg-[#F7F7F7]"
              aria-label="Tutup form company baru"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#242424]">Tambah Partner Company</h3>

            <form onSubmit={handleCreateCompany} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="company-name-input" className="block font-bold text-[#242424] mb-1">
                  Nama Perusahaan <span className="text-[#BD214C]">*</span>
                </label>
                <input
                  id="company-name-input"
                  type="text"
                  required
                  placeholder="Contoh: Tiket.com, Traveloka, dsb."
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                />
              </div>

              <div>
                <label htmlFor="company-industry-input" className="block font-bold text-[#242424] mb-1">Bidang Industri</label>
                <input
                  id="company-industry-input"
                  type="text"
                  placeholder="Contoh: Online Travel Agent, Fintech, Agency..."
                  value={compIndustry}
                  onChange={(e) => setCompIndustry(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                />
              </div>

              <div>
                <label htmlFor="company-website-input" className="block font-bold text-[#242424] mb-1">Website Resmi</label>
                <input
                  id="company-website-input"
                  type="url"
                  placeholder="https://..."
                  value={compWebsite}
                  onChange={(e) => setCompWebsite(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="company-pic-name-input" className="block font-bold text-[#242424] mb-1">Nama PIC Rekrutmen</label>
                  <input
                    id="company-pic-name-input"
                    type="text"
                    placeholder="Contoh: Kak Clarissa (TA)"
                    value={compPic}
                    onChange={(e) => setCompPic(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                  />
                </div>
                <div>
                  <label htmlFor="company-pic-contact-input" className="block font-bold text-[#242424] mb-1">Kontak PIC (WA/Email)</label>
                  <input
                    id="company-pic-contact-input"
                    type="text"
                    placeholder="WA atau email recruitment"
                    value={compContact}
                    onChange={(e) => setCompContact(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="company-internal-notes-input" className="block font-bold text-[#242424] mb-1">Catatan Internal (Khusus Tim BolBel)</label>
                <textarea
                  id="company-internal-notes-input"
                  rows={2}
                  placeholder="Kriteria khusus yang disukai company..."
                  value={compNotes}
                  onChange={(e) => setCompNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D9D9D9]">
                <button
                  type="button"
                  onClick={() => setShowAddCompanyModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#D9D9D9] text-xs font-semibold text-[#595959]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#BD214C] hover:bg-[#a61b42] text-white text-xs font-bold shadow-xs"
                >
                  Simpan Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Job with Mandatory Reason Modal (PRD Section 5) */}
      {closingJob && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div>
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                Penutupan Lowongan
              </span>
              <h3 className="text-lg font-bold text-[#242424] mt-0.5">Tutup Lowongan: {closingJob.title}</h3>
              <p className="text-xs text-[#595959]">
                Penutupan lowongan akan menolak pendaftaran baru di server. Berikan alasan penutupan resmi.
              </p>
            </div>

            <form onSubmit={handleCloseJobSubmit} className="space-y-4">
              <div>
                <label htmlFor="close-job-reason" className="block text-xs font-bold text-[#242424] mb-1">
                  Alasan Penutupan <span className="text-[#BD214C]">*</span>
                </label>
                <textarea
                  id="close-job-reason"
                  rows={3}
                  required
                  placeholder="Contoh: Kuota posisi telah terpenuhi oleh kandidat internal BDD / Tenggat waktu habis..."
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-xs text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D9D9D9]">
                <button
                  type="button"
                  onClick={() => setClosingJob(null)}
                  className="px-4 py-2 rounded-lg border border-[#D9D9D9] text-xs font-semibold text-[#595959]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!closeReason}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:bg-stone-300"
                >
                  Konfirmasi Tutup Lowongan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
