import type { AlumniProfile, ExperienceBand, ExperienceLevel, StartReadiness, WorkModel, WorkType } from './types.ts';

/** User-facing Indonesian labels for enum values, so raw codes ("full_time", "wfo") never reach the screen. */
export const WORK_TYPE_LABEL: Record<WorkType, string> = {
  full_time: 'Full-time',
  contract: 'Kontrak',
  internship: 'Magang',
  freelance: 'Freelance',
  part_time: 'Part-time',
};

export const WORK_MODEL_LABEL: Record<WorkModel, string> = {
  wfo: 'WFO',
  hybrid: 'Hybrid',
  remote: 'Remote',
};

export const EXPERIENCE_LEVEL_LABEL: Record<ExperienceLevel, string> = {
  fresh_graduate: 'Fresh Graduate',
  junior: 'Junior',
  mid: 'Menengah',
  senior: 'Senior',
};

export const EXPERIENCE_BAND_LABEL: Record<ExperienceBand, string> = {
  '<1_tahun': '< 1 tahun / fresh graduate',
  '1-2_tahun': '1 - 2 tahun',
  '2-4_tahun': '2 - 4 tahun',
  '>4_tahun': '> 4 tahun',
};

export const START_READINESS_LABEL: Record<StartReadiness, string> = {
  segera: 'Segera',
  notice_period: 'Perlu notice period',
  tanggal: 'Mulai di tanggal tertentu',
  diskusi: 'Perlu diskusi lebih lanjut',
};

/** One readable line, e.g. "Perlu notice period (30 hari)" or "Mulai di tanggal tertentu (1 Mar 2027)". */
export function describeReadiness(p: Pick<AlumniProfile, 'startReadiness' | 'noticePeriodDays' | 'targetStartDate'>): string {
  const base = START_READINESS_LABEL[p.startReadiness];
  if (p.startReadiness === 'notice_period' && p.noticePeriodDays != null) return `${base} (${p.noticePeriodDays} hari)`;
  if (p.startReadiness === 'tanggal' && p.targetStartDate) {
    const d = new Date(`${p.targetStartDate}T00:00:00`);
    if (!isNaN(d.getTime())) return `${base} (${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`;
  }
  return base;
}

/** Short, quotable reference for a UUID (first 8 characters). The full id stays available as a tooltip. */
export const shortRef = (id: string): string => id.slice(0, 8).toUpperCase();
