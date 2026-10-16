'use client';

import React from 'react';
import {
  Users,
  Briefcase,
  GitPullRequest,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Building,
  ArrowRight,
  ShieldAlert,
  Send,
} from 'lucide-react';
import { useDataStore } from '../../domain/dataStore.tsx';
import { isProfileFresh, formatDateIndo, STAGE_CONFIG } from '../../domain/stateMachine.ts';

interface AdminDashboardProps {
  onNavigate: (tabId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { profiles, jobs, processes, tasks, toggleTaskStatus } = useDataStore();

  const profileList = Object.values(profiles);

  // Metrics
  const activeSeekers = profileList.filter((p) => p.opennessStatus === 'aktif_mencari').length;
  const staleProfiles = profileList.filter((p) => !isProfileFresh(p.availabilityConfirmedAt).isFresh).length;
  const activeJobsCount = jobs.filter((j) => j.status === 'published').length;
  const activeProcessesCount = processes.filter((p) => p.outcome === 'aktif').length;

  const nowTime = Date.now();
  const overdueTasks = tasks.filter(
    (t) => t.status === 'pending' && new Date(t.dueAt).getTime() < nowTime
  );
  const dueTodayTasks = tasks.filter((t) => {
    if (t.status !== 'pending') return false;
    const diffHours = (new Date(t.dueAt).getTime() - nowTime) / (1000 * 60 * 60);
    return diffHours >= 0 && diffHours <= 24;
  });

  const pendingApplications = processes.filter(
    (p) => p.currentStage === 'masuk_bolbel' && p.outcome === 'aktif'
  );

  return (
    <div className="space-y-8">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-[#EA5543]/10 text-[#EA5543] mb-1">
            Dashboard Operasional Gifari (Talent Lead)
          </span>
          <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
            Ringkasan Talent &amp; Lowongan Boleh Belajar
          </h1>
          <p className="text-xs sm:text-sm text-[#595959] mt-0.5">
            Pantau beban kerja harian, proses seleksi yang membutuhkan tindak lanjut, dan profil alumni yang perlu dikonfirmasi.
          </p>
        </div>
      </div>

      {/* Metric Cards (PRD FR11) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#D9D9D9] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#595959]">
            <span>Alumni Aktif Mencari</span>
            <Users className="w-4 h-4 text-[#BD214C]" />
          </div>
          <div className="text-2xl font-bold text-[#242424] mt-2">{activeSeekers}</div>
          <div className="text-[11px] text-[#595959] mt-1">Siap direkomendasikan</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D9D9D9] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#595959]">
            <span>Lowongan Aktif</span>
            <Briefcase className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-[#242424] mt-2">{activeJobsCount}</div>
          <div className="text-[11px] text-[#595959] mt-1">Status Published</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D9D9D9] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#595959]">
            <span>Proses Seleksi Berjalan</span>
            <GitPullRequest className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-[#242424] mt-2">{activeProcessesCount}</div>
          <div className="text-[11px] text-[#595959] mt-1">Kandidat di pipeline</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D9D9D9] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#595959]">
            <span>Tugas Jatuh Tempo</span>
            <AlertTriangle className="w-4 h-4 text-[#EA5543]" />
          </div>
          <div className="text-2xl font-bold text-[#EA5543] mt-2">
            {overdueTasks.length + dueTodayTasks.length}
          </div>
          <div className="text-[11px] text-[#595959] mt-1">
            {overdueTasks.length} terlambat • {dueTodayTasks.length} hari ini
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D9D9D9] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#595959]">
            <span>Profil Perlu Konfirmasi</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{staleProfiles}</div>
          <div className="text-[11px] text-[#595959] mt-1">&gt;30 hari tanpa update</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Urgent Tasks Checklist (FR09) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#D9D9D9] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#D9D9D9]">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#EA5543]/15 text-[#EA5543] flex items-center justify-center font-bold text-xs">
                !
              </span>
              <h3 className="font-bold text-base text-[#242424]">Tugas Tindak Lanjut Jatuh Tempo</h3>
            </div>
            <button
              onClick={() => onNavigate('admin-tasks')}
              className="text-xs font-semibold text-[#BD214C] hover:underline flex items-center gap-1"
            >
              Lihat Semua Tugas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {[...overdueTasks, ...dueTodayTasks].length === 0 ? (
              <div className="text-xs text-[#595959] text-center py-6">
                Tidak ada tugas mendesak saat ini. Semua tindak lanjut rapi terkendali!
              </div>
            ) : (
              [...overdueTasks, ...dueTodayTasks].map((task) => {
                const isOverdue = new Date(task.dueAt).getTime() < nowTime;
                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                      isOverdue
                        ? 'bg-rose-50/60 border-rose-200'
                        : 'bg-amber-50/60 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={task.status === 'completed'}
                        onChange={() => toggleTaskStatus(task.id)}
                        className="mt-0.5 rounded text-[#BD214C] focus:ring-[#BD214C] border-[#D9D9D9]"
                      />
                      <div>
                        <div className="font-bold text-[#242424] leading-snug">{task.title}</div>
                        <div className="text-[11px] text-[#595959] mt-0.5">{task.description}</div>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                          <span
                            className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                              isOverdue ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'
                            }`}
                          >
                            {isOverdue ? 'Terlambat' : 'Jatuh Tempo Hari Ini'}
                          </span>
                          <span className="text-[#595959]">PIC: {task.ownerName}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigate('admin-pipeline')}
                      className="px-2.5 py-1 rounded bg-white border border-[#D9D9D9] hover:border-[#BD214C] text-[11px] font-semibold text-[#242424] shrink-0"
                    >
                      Buka Proses
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Incoming Applications Queue */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#D9D9D9] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#D9D9D9]">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#BD214C]/10 text-[#BD214C] flex items-center justify-center font-bold text-xs">
                in
              </span>
              <h3 className="font-bold text-base text-[#242424]">Lamaran Baru Masuk ({pendingApplications.length})</h3>
            </div>
            <button
              onClick={() => onNavigate('admin-pipeline')}
              className="text-xs font-semibold text-[#BD214C] hover:underline"
            >
              Lihat Pipeline
            </button>
          </div>

          <div className="space-y-3">
            {pendingApplications.length === 0 ? (
              <div className="text-xs text-[#595959] text-center py-6">
                Belum ada lamaran internal baru yang menunggu review.
              </div>
            ) : (
              pendingApplications.map((app) => (
                <div
                  key={app.id}
                  className="p-3 rounded-lg border border-[#D9D9D9] hover:border-[#BD214C] text-xs space-y-1.5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#242424]">{app.alumniName}</span>
                    <span className="text-[10px] text-[#595959]">{formatDateIndo(app.createdAt)}</span>
                  </div>
                  <div className="text-[#595959]">
                    Melamar ke: <span className="font-semibold text-[#242424]">{app.jobTitle}</span> ({app.companyName})
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#F7F7F7]">
                    <span className="text-[11px] text-[#595959]">CV: {app.documentName}</span>
                    <button
                      onClick={() => onNavigate('admin-pipeline')}
                      className="text-xs font-bold text-[#BD214C] hover:underline flex items-center gap-1"
                    >
                      Tinjau &amp; Teruskan <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
