'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, api } from '../client/api.ts';
import type {
  AlumniProfile,
  AlumniReport,
  AlumniRosterEntry,
  CandidateProcess,
  Company,
  ConsentRecord,
  CVDocument,
  FollowUpTask,
  Job,
  ProcessEvent,
  ProcessOutcome,
  SelectionStage,
  User,
} from './types.ts';

type Result = { success: boolean; error?: string };

interface Data {
  roster: AlumniRosterEntry[];
  profiles: Record<string, AlumniProfile>;
  cvs: CVDocument[];
  companies: Company[];
  jobs: Job[];
  processes: CandidateProcess[];
  consents: ConsentRecord[];
  reports: AlumniReport[];
  tasks: FollowUpTask[];
}

const EMPTY: Data = {
  roster: [],
  profiles: {},
  cvs: [],
  companies: [],
  jobs: [],
  processes: [],
  consents: [],
  reports: [],
  tasks: [],
};

interface DataStoreContextType extends Data {
  currentUser: User;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  currentProfile: AlumniProfile | null;
  activeCv: CVDocument | null;

  updateProfile: (profile: AlumniProfile) => Promise<Result>;
  confirmAvailability: (userId: string) => Promise<Result>;
  uploadCV: (file: File) => Promise<Result>;
  setActiveCV: (cvId: string) => Promise<Result>;
  deleteCV: (cvId: string) => Promise<Result>;

  addCompany: (comp: Omit<Company, 'id' | 'createdAt'>) => Promise<Result>;
  addJob: (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Result>;
  updateJobStatus: (jobId: string, status: Job['status'], reason?: string) => Promise<Result>;

  applyViaBolBel: (jobId: string, consentAccepted: boolean) => Promise<Result & { processId?: string }>;
  reportExternalApply: (jobId: string, applyDate: string, notes: string) => Promise<Result>;
  approveAdminProposal: (processId: string) => Promise<Result>;
  rejectAdminProposal: (processId: string, reason?: string) => Promise<Result>;
  withdrawApplication: (processId: string, reason: string) => Promise<Result>;
  forwardCVToCompany: (processId: string, internalNotes: string, publicMessage?: string) => Promise<Result>;
  updateCandidateStage: (
    processId: string,
    newStage: SelectionStage,
    newOutcome: ProcessOutcome,
    sourceType: 'admin_official' | 'company_update',
    occurredAt: string,
    publicMessage?: string,
    internalNotes?: string,
    interviewSchedule?: string,
    actualStartDate?: string
  ) => Promise<Result>;
  createProactiveProposal: (alumniId: string, jobId: string) => Promise<Result>;
  reviewReport: (reportId: string, status: 'accepted' | 'rejected', notes?: string) => Promise<Result>;

  toggleTaskStatus: (taskId: string) => Promise<Result>;
  createFollowUpTask: (task: Omit<FollowUpTask, 'id' | 'createdAt' | 'status'>) => Promise<Result>;
  importRosterBatch: (newEntries: Omit<AlumniRosterEntry, 'id' | 'invitedAt'>[]) => Promise<number>;
}

const DataStoreContext = createContext<DataStoreContextType | null>(null);

/** Fields the server accepts for a profile; identity (name, email, program, batch) comes from the roster. */
function toProfileInput(p: AlumniProfile) {
  return {
    phone: p.phone ?? '',
    whatsappContact: p.whatsappContact,
    linkedinUrl: p.linkedinUrl ?? '',
    portfolioUrl: p.portfolioUrl ?? '',
    employmentStatus: p.employmentStatus,
    opennessStatus: p.opennessStatus,
    startReadiness: p.startReadiness,
    noticePeriodDays: p.noticePeriodDays ?? null,
    targetStartDate: p.targetStartDate || null,
    targetRoles: p.targetRoles,
    targetWorkTypes: p.targetWorkTypes,
    targetWorkModels: p.targetWorkModels,
    domicile: p.domicile,
    targetLocations: p.targetLocations,
    experienceBand: p.experienceBand,
    allowProactiveContact: p.allowProactiveContact,
  };
}

async function loadAll(role: User['role']): Promise<Data> {
  const get = <K extends string, T>(path: string, key: K) => api<Record<K, T>>('GET', path).then((r) => r[key]);

  if (role === 'admin') {
    const [roster, profiles, cvs, companies, jobs, processes, consents, reports, tasks] = await Promise.all([
      get<'roster', AlumniRosterEntry[]>('/api/roster', 'roster'),
      get<'profiles', AlumniProfile[]>('/api/profiles', 'profiles'),
      get<'cvs', CVDocument[]>('/api/cvs', 'cvs'),
      get<'companies', Company[]>('/api/companies', 'companies'),
      get<'jobs', Job[]>('/api/jobs', 'jobs'),
      get<'processes', CandidateProcess[]>('/api/processes', 'processes'),
      get<'consents', ConsentRecord[]>('/api/consents', 'consents'),
      get<'reports', AlumniReport[]>('/api/reports', 'reports'),
      get<'tasks', FollowUpTask[]>('/api/tasks', 'tasks'),
    ]);
    return {
      roster,
      profiles: Object.fromEntries(profiles.map((p) => [p.userId, p])),
      cvs,
      companies,
      jobs,
      processes,
      consents,
      reports,
      tasks,
    };
  }

  const [profile, cvs, jobs, processes, consents, reports] = await Promise.all([
    get<'profile', AlumniProfile | null>('/api/me/profile', 'profile'),
    get<'cvs', CVDocument[]>('/api/me/cvs', 'cvs'),
    get<'jobs', Job[]>('/api/jobs', 'jobs'),
    get<'processes', CandidateProcess[]>('/api/processes', 'processes'),
    get<'consents', ConsentRecord[]>('/api/consents', 'consents'),
    get<'reports', AlumniReport[]>('/api/reports', 'reports'),
  ]);
  return {
    ...EMPTY,
    profiles: profile ? { [profile.userId]: profile } : {},
    cvs,
    jobs,
    processes,
    consents,
    reports,
  };
}

interface ProviderProps {
  user: User;
  onLogout: () => Promise<void>;
  /** Called when the API answers 401 (session expired or account deactivated). */
  onUnauthorized: () => void;
  children: React.ReactNode;
}

export const DataStoreProvider: React.FC<ProviderProps> = ({ user, onLogout, onUnauthorized, children }) => {
  const [data, setData] = useState<Data>(EMPTY);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  const refresh = useCallback(async () => {
    try {
      setData(await loadAll(user.role));
      setStatus('ready');
      setLoadError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorizedRef.current();
        return;
      }
      // Keep showing the last good data if we already have some
      setStatus((s) => (s === 'ready' ? 'ready' : 'error'));
      setLoadError(err instanceof Error ? err.message : 'Gagal memuat data.');
    }
  }, [user.role]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Runs a mutation, reports failure as { success: false, error }, and reloads data on success. */
  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<Result & { value?: T }> => {
      try {
        const value = await fn();
        await refresh();
        return { success: true, value };
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) onUnauthorizedRef.current();
        return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.' };
      }
    },
    [refresh]
  );
  const strip = ({ success, error }: Result): Result => ({ success, error });

  const value = useMemo<DataStoreContextType>(() => {
    const currentProfile = data.profiles[user.id] ?? null;
    const activeCv = data.cvs.find((c) => c.ownerId === user.id && c.isCurrentActive) ?? null;

    return {
      ...data,
      currentUser: user,
      logout: onLogout,
      refresh,
      currentProfile,
      activeCv,

      updateProfile: async (profile) => strip(await run(() => api('PUT', '/api/me/profile', toProfileInput(profile)))),
      confirmAvailability: async () => strip(await run(() => api('POST', '/api/me/profile/confirm'))),
      uploadCV: async () => ({ success: false, error: 'Fitur unggah CV sedang disiapkan.' }),
      setActiveCV: async (cvId) => strip(await run(() => api('PATCH', `/api/me/cvs/${cvId}`))),
      deleteCV: async (cvId) => strip(await run(() => api('DELETE', `/api/me/cvs/${cvId}`))),

      addCompany: async (c) => strip(await run(() => api('POST', '/api/companies', c))),
      addJob: async (j) =>
        strip(
          await run(() =>
            api('POST', '/api/jobs', {
              companyId: j.companyId,
              title: j.title,
              summary: j.summary,
              responsibilities: j.responsibilities,
              requirements: j.requirements,
              experienceLevel: j.experienceLevel,
              workType: j.workType,
              workModel: j.workModel,
              location: j.location,
              openingsCount: j.openingsCount,
              salaryType: j.salaryType,
              salaryMin: j.salaryMin,
              salaryMax: j.salaryMax,
              salaryPeriod: j.salaryPeriod,
              applyChannel: j.applyChannel,
              externalApplyUrl: j.externalApplyUrl,
              status: j.status === 'draft' ? 'draft' : 'published',
              processOwner: j.processOwner,
              deadlineDate: j.deadlineDate,
            })
          )
        ),
      updateJobStatus: async (jobId, status, reason) =>
        strip(await run(() => api('PATCH', `/api/jobs/${jobId}/status`, { status, reason }))),

      applyViaBolBel: async (jobId, consentAccepted) => {
        const res = await run(() => api<{ processId: string }>('POST', `/api/jobs/${jobId}/apply`, { consentAccepted }));
        return { ...strip(res), processId: res.value?.processId };
      },
      reportExternalApply: async (jobId, applyDate, notes) =>
        strip(await run(() => api('POST', `/api/jobs/${jobId}/report-external`, { applyDate, notes }))),
      approveAdminProposal: async (id) => strip(await run(() => api('POST', `/api/processes/${id}/approve`))),
      rejectAdminProposal: async (id, reason) =>
        strip(await run(() => api('POST', `/api/processes/${id}/reject`, { reason }))),
      withdrawApplication: async (id, reason) =>
        strip(await run(() => api('POST', `/api/processes/${id}/withdraw`, { reason }))),
      forwardCVToCompany: async (id, internalNotes, publicMessage) =>
        strip(await run(() => api('POST', `/api/processes/${id}/forward`, { internalNotes, publicMessage }))),
      updateCandidateStage: async (
        id,
        stage,
        outcome,
        sourceType,
        occurredAt,
        publicMessage,
        internalNotes,
        interviewSchedule,
        actualStartDate
      ) =>
        strip(
          await run(() =>
            api('POST', `/api/processes/${id}/stage`, {
              stage,
              outcome,
              sourceType,
              occurredAt,
              publicMessage,
              internalNotes,
              interviewSchedule,
              actualStartDate,
              // Lets the server reject the update if someone else changed this process since we loaded it
              expectedVersion: data.processes.find((p) => p.id === id)?.version,
            })
          )
        ),
      createProactiveProposal: async (alumniId, jobId) =>
        strip(await run(() => api('POST', '/api/processes', { alumniId, jobId }))),
      reviewReport: async (id, status, notes) => strip(await run(() => api('PATCH', `/api/reports/${id}`, { status, notes }))),

      toggleTaskStatus: async (taskId) => {
        const task = data.tasks.find((t) => t.id === taskId);
        if (!task) return { success: false, error: 'Tugas tidak ditemukan.' };
        return strip(await run(() => api('PATCH', `/api/tasks/${taskId}`, { completed: task.status === 'pending' })));
      },
      createFollowUpTask: async (t) => strip(await run(() => api('POST', '/api/tasks', t))),
      importRosterBatch: async (entries) => {
        const res = await run(() => api<{ added: number }>('POST', '/api/roster/import', { entries }));
        return res.value?.added ?? 0;
      },
    };
  }, [data, user, onLogout, refresh, run]);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[#595959]">Memuat data…</div>;
  }
  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-sm text-[#595959]">
        <p>{loadError}</p>
        <button
          onClick={() => {
            setStatus('loading');
            void refresh();
          }}
          className="px-4 py-2 rounded-lg bg-[#BD214C] text-white font-semibold"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return <DataStoreContext.Provider value={value}>{children}</DataStoreContext.Provider>;
};

/**
 * Timeline of one process, fetched on demand (the full event log is never bulk-loaded).
 * Refetches when the process changes: every mutation bumps `process.version`.
 */
export function useProcessEvents(process: { id: string; version: number } | null): ProcessEvent[] {
  const [loaded, setLoaded] = useState<{ key: string; events: ProcessEvent[] } | null>(null);
  const key = process ? `${process.id}:${process.version}` : null;
  useEffect(() => {
    if (!process || !key) return;
    let cancelled = false;
    api<{ events: ProcessEvent[] }>('GET', `/api/processes/${process.id}/events`)
      .then((r) => !cancelled && setLoaded({ key, events: r.events }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [process?.id, key]);
  // Keep the previous list visible while a refetch is in flight, but never show another process's events
  return loaded && process && loaded.key.startsWith(`${process.id}:`) ? loaded.events : [];
}

export const useDataStore = () => {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error('useDataStore must be used within DataStoreProvider');
  return ctx;
};
