/**
 * Domain Types for Portal Karier Alumni Boleh Belajar
 * Compliant with PRD v1.0 (16 Oktober 2026)
 */

export type UserRole = 'alumni' | 'admin';

export type EligibilityStatus = 'eligible' | 'pending' | 'revoked';

export interface AlumniRosterEntry {
  id: string;
  email: string;
  fullName: string;
  program: 'Full Course' | 'Career Prep' | 'Digital Marketing Intensive' | 'Performance Marketing Specialization';
  batch: string;
  eligibility: EligibilityStatus;
  invitedAt: string;
  activatedAt?: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  avatarUrl?: string;
  rosterId?: string;
  active: boolean;
}

export type EmploymentStatus = 'bekerja' | 'belum_bekerja' | 'tidak_disebutkan';

export type OpennessStatus = 
  | 'aktif_mencari' 
  | 'terbuka' 
  | 'tidak_mencari' 
  | 'belum_dikonfirmasi';

export type WorkType = 'full_time' | 'contract' | 'internship' | 'freelance' | 'part_time';

export type WorkModel = 'wfo' | 'hybrid' | 'remote';

export type StartReadiness = 'segera' | 'notice_period' | 'tanggal' | 'diskusi';

export type ExperienceBand = '<1_tahun' | '1-2_tahun' | '2-4_tahun' | '>4_tahun';

export interface AlumniProfile {
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  whatsappContact: boolean;
  linkedinUrl?: string;
  portfolioUrl?: string;
  program: string;
  batch: string;
  employmentStatus: EmploymentStatus;
  opennessStatus: OpennessStatus;
  startReadiness: StartReadiness;
  noticePeriodDays?: number;
  targetStartDate?: string;
  targetRoles: string[];
  targetWorkTypes: WorkType[];
  targetWorkModels: WorkModel[];
  domicile: string;
  targetLocations: string[];
  experienceBand: ExperienceBand;
  allowProactiveContact: boolean;
  availabilityConfirmedAt: string;
  updatedAt: string;
}

export interface CVDocument {
  id: string;
  ownerId: string;
  fileName: string;
  fileSizeBytes: number;
  fileType: string;
  uploadedAt: string;
  isCurrentActive: boolean;
  storageKey: string;
  previewUrl?: string;
}

export type CompanyRelationshipSource = 'company_inbound' | 'gifari_sourcing';

export interface Company {
  id: string;
  name: string;
  industry: string;
  websiteUrl?: string;
  relationshipSource: CompanyRelationshipSource;
  internalPicName?: string;
  internalPicContact?: string;
  internalNotes?: string;
  createdAt: string;
}

export type JobStatus = 'draft' | 'published' | 'paused' | 'closed' | 'archived';

export type ApplyChannel = 'bolbel' | 'external';

export type SalaryType = 'range' | 'uninformed' | 'confidential';

export type ExperienceLevel = 'fresh_graduate' | 'junior' | 'mid' | 'senior';

export interface Job {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  experienceLevel: ExperienceLevel;
  workType: WorkType;
  workModel: WorkModel;
  location: string;
  openingsCount: number;
  salaryType: SalaryType;
  salaryMin?: number;
  salaryMax?: number;
  salaryPeriod?: 'bulan' | 'tahun';
  applyChannel: ApplyChannel;
  externalApplyUrl?: string;
  status: JobStatus;
  closedReason?: string;
  processOwner: string; // e.g. "Gifari"
  deadlineDate?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type SelectionStage =
  | 'menunggu_persetujuan'
  | 'masuk_bolbel'
  | 'dilaporkan_apply_eksternal'
  | 'diteruskan_ke_company'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'offer_diterima'
  | 'mulai_kerja';

export type ProcessOutcome =
  | 'aktif'
  | 'ditolak'
  | 'mengundurkan_diri'
  | 'menolak_offer'
  | 'dibatalkan_company'
  | 'tidak_menyetujui_pengajuan'
  | 'selesai_mulai_kerja';

export type ProcessOrigin = 'internal_apply' | 'admin_proactive' | 'external_report';

export interface CandidateProcess {
  id: string;
  alumniId: string;
  alumniName: string;
  alumniEmail: string;
  jobId: string;
  jobTitle: string;
  companyId: string;
  companyName: string;
  origin: ProcessOrigin;
  currentStage: SelectionStage;
  outcome: ProcessOutcome;
  documentVersionId: string;
  documentName: string;
  profileSnapshot: {
    fullName: string;
    email: string;
    phone?: string;
    domicile: string;
    employmentStatus: EmploymentStatus;
    opennessStatus: OpennessStatus;
    startReadiness: StartReadiness;
    experienceBand: ExperienceBand;
    targetRoles: string[];
  };
  consentGrantedAt?: string;
  consentRevokedAt?: string;
  reportedApplyDate?: string;
  interviewSchedule?: string;
  actualStartDate?: string;
  version: number;
  lastStageUpdatedAt: string;
  lastFollowUpDate?: string;
  createdAt: string;
}

export interface ConsentRecord {
  id: string;
  processId: string;
  alumniId: string;
  jobId: string;
  companyName: string;
  jobTitle: string;
  documentVersionId: string;
  documentName: string;
  scopeDescription: string;
  policyVersion: string;
  grantedAt: string;
  revokedAt?: string;
}

export type EventSourceType = 'admin_official' | 'alumni_report' | 'company_update';

export type EventType =
  | 'status_change'
  | 'consent_granted'
  | 'consent_revoked'
  | 'forwarded_to_company'
  | 'alumni_report'
  | 'correction';

export interface ProcessEvent {
  id: string;
  processId: string;
  eventType: EventType;
  previousStage?: SelectionStage;
  newStage?: SelectionStage;
  previousOutcome?: ProcessOutcome;
  newOutcome?: ProcessOutcome;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  sourceType: EventSourceType;
  occurredAt: string;
  recordedAt: string;
  publicMessage?: string;
  internalNotes?: string;
  correctionOfEventId?: string;
}

export interface AlumniReport {
  id: string;
  processId: string;
  alumniId: string;
  reportType: 'already_applied_external' | 'interview_invite' | 'got_offer' | 'got_rejected' | 'other_update';
  reportDate: string;
  details: string;
  status: 'pending_review' | 'accepted' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  adminDecisionNotes?: string;
  createdAt: string;
}

export type FollowUpTaskType =
  | 'review_new_application'
  | 'monitor_consent'
  | 'forward_cv'
  | 'followup_company'
  | 'review_alumni_report'
  | 'closed_job_cleanup';

export interface FollowUpTask {
  id: string;
  processId?: string;
  jobId?: string;
  alumniId?: string;
  title: string;
  description: string;
  taskType: FollowUpTaskType;
  ownerName: string;
  dueAt: string;
  completedAt?: string;
  status: 'pending' | 'completed';
  createdAt: string;
}

export interface CsvRosterImportRow {
  email: string;
  fullName: string;
  program: string;
  batch: string;
  eligibility: string;
  isValid: boolean;
  errors: string[];
  isDuplicate: boolean;
}
