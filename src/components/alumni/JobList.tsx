import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  Briefcase,
  Clock,
  Building,
  CheckCircle2,
  ExternalLink,
  Send,
  AlertCircle,
  FileCheck,
  Calendar,
  Filter,
} from 'lucide-react';
import { useDataStore } from '../../domain/dataStore.tsx';
import type { Job, WorkModel, WorkType, ApplyChannel } from '../../domain/types.ts';
import { formatCurrencyIDR, formatDateIndo, STAGE_CONFIG } from '../../domain/stateMachine.ts';
import { JobDetailModal } from './JobDetailModal.tsx';
import { ApplyBolBelModal } from './ApplyBolBelModal.tsx';
import { ReportExternalApplyModal } from './ReportExternalApplyModal.tsx';

export const JobList: React.FC = () => {
  const { jobs, processes, currentUser } = useDataStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');

  // Modals state
  const [activeJobForDetail, setActiveJobForDetail] = useState<Job | null>(null);
  const [activeJobForApplyBolBel, setActiveJobForApplyBolBel] = useState<Job | null>(null);
  const [activeJobForReportExternal, setActiveJobForReportExternal] = useState<Job | null>(null);

  // Map of job applications for the logged in alumni
  const myApplicationsMap = useMemo(() => {
    const map = new Map<string, (typeof processes)[0]>();
    processes
      .filter((p) => p.alumniId === currentUser.id)
      .forEach((p) => {
        map.set(p.jobId, p);
      });
    return map;
  }, [processes, currentUser.id]);

  // Filter published & active jobs for alumni (PRD FR04: only published jobs visible to eligible alumni)
  const publishedJobs = useMemo(() => {
    return jobs.filter((job) => job.status === 'published' || job.status === 'paused');
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return publishedJobs.filter((job) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        job.title.toLowerCase().includes(q) ||
        job.companyName.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q) ||
        job.summary.toLowerCase().includes(q);

      const matchModel = selectedModel === 'all' || job.workModel === selectedModel;
      const matchType = selectedType === 'all' || job.workType === selectedType;
      const matchChannel = selectedChannel === 'all' || job.applyChannel === selectedChannel;

      return matchSearch && matchModel && matchType && matchChannel;
    });
  }, [publishedJobs, searchQuery, selectedModel, selectedType, selectedChannel]);

  return (
    <div className="space-y-6">
      {/* Intro Hero Section */}
      <div className="bg-[#F9EDDE] rounded-2xl p-6 sm:p-8 border border-[#EADBCE]">
        <div className="max-w-3xl">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#BD214C]/10 text-[#BD214C] mb-3">
            Karier & Lowongan Terkurasi
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#242424] tracking-tight">
            Peluang Kerja Eksklusif untuk Alumni Boleh Belajar
          </h1>
          <p className="text-sm sm:text-base text-[#595959] mt-2 leading-relaxed">
            Semua lowongan di bawah telah ditinjau langsung oleh Gifari dan tim Boleh Belajar. Pastikan profil dan
            CV aktif kamu selalu diperbarui agar siap diteruskan ke partner company.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-[#D9D9D9] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-[#595959] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari posisi, company, atau lokasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#D9D9D9] text-sm text-[#242424] focus:outline-hidden focus:border-[#BD214C] transition-colors"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
            {/* Cara Kerja Filter */}
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-[#D9D9D9] text-sm text-[#242424] bg-white focus:outline-hidden focus:border-[#BD214C]"
              aria-label="Filter cara kerja"
            >
              <option value="all">Semua Cara Kerja</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="wfo">WFO</option>
            </select>

            {/* Tipe Pekerjaan Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-[#D9D9D9] text-sm text-[#242424] bg-white focus:outline-hidden focus:border-[#BD214C]"
              aria-label="Filter tipe pekerjaan"
            >
              <option value="all">Semua Tipe</option>
              <option value="full_time">Full-time</option>
              <option value="contract">Kontrak</option>
              <option value="internship">Magang</option>
            </select>

            {/* Jalur Apply Filter */}
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-[#D9D9D9] text-sm text-[#242424] bg-white focus:outline-hidden focus:border-[#BD214C]"
              aria-label="Filter jalur apply"
            >
              <option value="all">Semua Jalur Apply</option>
              <option value="bolbel">Melalui BolBel</option>
              <option value="external">Apply Eksternal</option>
            </select>

            {(searchQuery || selectedModel !== 'all' || selectedType !== 'all' || selectedChannel !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedModel('all');
                  setSelectedType('all');
                  setSelectedChannel('all');
                }}
                className="px-3 py-2 text-xs font-semibold text-[#BD214C] hover:bg-[#BD214C]/10 rounded-lg transition-colors"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Jobs Grid */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#D9D9D9] p-12 text-center">
          <AlertCircle className="w-12 h-12 text-[#595959] mx-auto mb-3" />
          <h3 className="text-lg font-bold text-[#242424]">Tidak ada lowongan yang sesuai</h3>
          <p className="text-sm text-[#595959] max-w-md mx-auto mt-1 mb-4">
            Coba ubah kata kunci pencarian atau reset filter untuk melihat semua peluang yang tersedia.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedModel('all');
              setSelectedType('all');
              setSelectedChannel('all');
            }}
            className="px-4 py-2 bg-[#BD214C] text-white rounded-lg text-sm font-semibold hover:bg-[#a61b42] transition-colors"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredJobs.map((job) => {
            const existingProcess = myApplicationsMap.get(job.id);
            const isPaused = job.status === 'paused';

            return (
              <div
                key={job.id}
                className="bg-white rounded-xl border border-[#D9D9D9] hover:border-[#BD214C]/60 hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges & Channel */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                        job.applyChannel === 'bolbel'
                          ? 'bg-[#BD214C]/10 text-[#BD214C] border border-[#BD214C]/20'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {job.applyChannel === 'bolbel' ? (
                        <>
                          <FileCheck className="w-3.5 h-3.5" /> Apply Melalui BolBel
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-3.5 h-3.5" /> Apply Eksternal
                        </>
                      )}
                    </span>

                    {isPaused && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Pendaftaran Dijeda
                      </span>
                    )}

                    {job.deadlineDate && (
                      <span className="text-xs text-[#595959] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Tenggat: {formatDateIndo(job.deadlineDate)}
                      </span>
                    )}
                  </div>

                  {/* Title & Company */}
                  <h2 className="text-lg font-bold text-[#242424] hover:text-[#BD214C] transition-colors">
                    {job.title}
                  </h2>
                  <div className="text-sm font-medium text-[#595959] mt-0.5 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-[#595959]" />
                    {job.companyName}
                  </div>

                  {/* Job Tags */}
                  <div className="flex flex-wrap gap-2 mt-3 text-xs text-[#595959]">
                    <span className="px-2 py-1 rounded-md bg-[#F7F7F7] border border-[#D9D9D9] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#595959]" /> {job.location} ({job.workModel.toUpperCase()})
                    </span>
                    <span className="px-2 py-1 rounded-md bg-[#F7F7F7] border border-[#D9D9D9] flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-[#595959]" /> {job.workType.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-1 rounded-md bg-[#F7F7F7] border border-[#D9D9D9]">
                      Level: {job.experienceLevel}
                    </span>
                  </div>

                  {/* Compensation */}
                  <div className="mt-3.5 py-2 px-3 rounded-lg bg-[#F7F7F7] text-xs font-medium text-[#242424] flex items-center justify-between">
                    <span className="text-[#595959]">Kompensasi:</span>
                    <span className="font-semibold text-[#242424]">
                      {job.salaryType === 'range' && job.salaryMin && job.salaryMax
                        ? `${formatCurrencyIDR(job.salaryMin)} - ${formatCurrencyIDR(job.salaryMax)} / bln`
                        : job.salaryType === 'confidential'
                        ? 'Dirahasiakan Company'
                        : 'Belum Diinformasikan'}
                    </span>
                  </div>

                  {/* Summary preview */}
                  <p className="mt-3 text-xs text-[#595959] line-clamp-2 leading-relaxed">{job.summary}</p>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-4 border-t border-[#D9D9D9] flex items-center justify-between gap-3">
                  <button
                    onClick={() => setActiveJobForDetail(job)}
                    className="text-xs font-semibold text-[#BD214C] hover:underline"
                  >
                    Lihat Detail & Syarat
                  </button>

                  {existingProcess ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{STAGE_CONFIG[existingProcess.currentStage]?.label || 'Tercatat'}</span>
                    </div>
                  ) : isPaused ? (
                    <span className="text-xs text-[#595959] italic">Tidak menerima lamaran</span>
                  ) : job.applyChannel === 'bolbel' ? (
                    <button
                      onClick={() => setActiveJobForApplyBolBel(job)}
                      className="px-4 py-2 rounded-lg bg-[#BD214C] hover:bg-[#a61b42] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" /> Kirim Lamaran
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveJobForReportExternal(job)}
                        className="px-3 py-1.5 rounded-lg border border-[#D9D9D9] hover:border-[#BD214C] text-[#242424] text-xs font-semibold transition-colors"
                        title="Catat jika sudah melamar di website company"
                      >
                        Sudah Melamar?
                      </button>
                      <a
                        href={job.externalApplyUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#BD214C] hover:bg-[#a61b42] text-white text-xs font-bold transition-all flex items-center gap-1"
                      >
                        Buka Link <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {activeJobForDetail && (
        <JobDetailModal
          job={activeJobForDetail}
          onClose={() => setActiveJobForDetail(null)}
          onApplyBolBel={() => {
            const j = activeJobForDetail;
            setActiveJobForDetail(null);
            setActiveJobForApplyBolBel(j);
          }}
          onReportExternal={() => {
            const j = activeJobForDetail;
            setActiveJobForDetail(null);
            setActiveJobForReportExternal(j);
          }}
        />
      )}

      {activeJobForApplyBolBel && (
        <ApplyBolBelModal
          job={activeJobForApplyBolBel}
          onClose={() => setActiveJobForApplyBolBel(null)}
        />
      )}

      {activeJobForReportExternal && (
        <ReportExternalApplyModal
          job={activeJobForReportExternal}
          onClose={() => setActiveJobForReportExternal(null)}
        />
      )}
    </div>
  );
};
