import type { ExperienceLevel, WorkModel, WorkType } from './types.ts';

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
