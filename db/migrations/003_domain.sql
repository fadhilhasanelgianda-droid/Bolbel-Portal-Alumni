CREATE TABLE companies (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  industry              text NOT NULL,
  website_url           text CHECK (website_url ~ '^https?://'),
  relationship_source   text NOT NULL CHECK (relationship_source IN ('company_inbound', 'gifari_sourcing')),
  internal_pic_name     text,
  internal_pic_contact  text,
  internal_notes        text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- fullName / email / program / batch come from users + roster_entries, not duplicated here
CREATE TABLE alumni_profiles (
  user_id                    uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  phone                      text,
  whatsapp_contact           boolean NOT NULL DEFAULT false,
  linkedin_url               text CHECK (linkedin_url ~ '^https?://'),
  portfolio_url              text CHECK (portfolio_url ~ '^https?://'),
  employment_status          text NOT NULL CHECK (employment_status IN ('bekerja', 'belum_bekerja', 'tidak_disebutkan')),
  openness_status            text NOT NULL CHECK (openness_status IN ('aktif_mencari', 'terbuka', 'tidak_mencari', 'belum_dikonfirmasi')),
  start_readiness            text NOT NULL CHECK (start_readiness IN ('segera', 'notice_period', 'tanggal', 'diskusi')),
  notice_period_days         integer CHECK (notice_period_days >= 0),
  target_start_date          date,
  target_roles               text[] NOT NULL DEFAULT '{}',
  target_work_types          text[] NOT NULL DEFAULT '{}',
  target_work_models         text[] NOT NULL DEFAULT '{}',
  domicile                   text NOT NULL DEFAULT '',
  target_locations           text[] NOT NULL DEFAULT '{}',
  experience_band            text NOT NULL CHECK (experience_band IN ('<1_tahun', '1-2_tahun', '2-4_tahun', '>4_tahun')),
  allow_proactive_contact    boolean NOT NULL DEFAULT false,
  availability_confirmed_at  timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cv_documents (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id           uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  file_name          text NOT NULL,
  file_size_bytes    integer NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),
  file_type          text NOT NULL CHECK (file_type = 'application/pdf'),
  uploaded_at        timestamptz NOT NULL DEFAULT now(),
  is_current_active  boolean NOT NULL DEFAULT false,
  storage_key        text NOT NULL UNIQUE
);
CREATE UNIQUE INDEX cv_documents_one_active_per_owner ON cv_documents (owner_id) WHERE is_current_active;

CREATE TABLE jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES companies (id),
  title             text NOT NULL,
  summary           text NOT NULL,
  responsibilities  text[] NOT NULL DEFAULT '{}',
  requirements      text[] NOT NULL DEFAULT '{}',
  experience_level  text NOT NULL CHECK (experience_level IN ('fresh_graduate', 'junior', 'mid', 'senior')),
  work_type         text NOT NULL CHECK (work_type IN ('full_time', 'contract', 'internship', 'freelance', 'part_time')),
  work_model        text NOT NULL CHECK (work_model IN ('wfo', 'hybrid', 'remote')),
  location          text NOT NULL,
  openings_count    integer NOT NULL DEFAULT 1 CHECK (openings_count > 0),
  salary_type       text NOT NULL CHECK (salary_type IN ('range', 'uninformed', 'confidential')),
  salary_min        bigint CHECK (salary_min >= 0),
  salary_max        bigint CHECK (salary_max >= 0),
  salary_period     text CHECK (salary_period IN ('bulan', 'tahun')),
  apply_channel     text NOT NULL CHECK (apply_channel IN ('bolbel', 'external')),
  external_apply_url text CHECK (external_apply_url ~ '^https?://'),
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused', 'closed', 'archived')),
  closed_reason     text,
  process_owner     text NOT NULL,
  deadline_date     date,
  published_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (apply_channel <> 'external' OR external_apply_url IS NOT NULL),
  CHECK (salary_type <> 'range' OR (salary_min IS NOT NULL AND salary_max IS NOT NULL AND salary_min <= salary_max))
);
CREATE INDEX jobs_status_idx ON jobs (status);

CREATE TABLE candidate_processes (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumni_id              uuid NOT NULL REFERENCES users (id),
  job_id                 uuid NOT NULL REFERENCES jobs (id),
  origin                 text NOT NULL CHECK (origin IN ('internal_apply', 'admin_proactive', 'external_report')),
  current_stage          text NOT NULL CHECK (current_stage IN (
    'menunggu_persetujuan', 'masuk_bolbel', 'dilaporkan_apply_eksternal', 'diteruskan_ke_company',
    'screening', 'interview', 'offer', 'offer_diterima', 'mulai_kerja')),
  outcome                text NOT NULL DEFAULT 'aktif' CHECK (outcome IN (
    'aktif', 'ditolak', 'mengundurkan_diri', 'menolak_offer', 'dibatalkan_company',
    'tidak_menyetujui_pengajuan', 'selesai_mulai_kerja')),
  -- RESTRICT: a CV that is referenced by a process / consent can never be deleted
  document_version_id    uuid REFERENCES cv_documents (id) ON DELETE RESTRICT,
  document_name          text NOT NULL,
  profile_snapshot       jsonb NOT NULL,
  consent_granted_at     timestamptz,
  consent_revoked_at     timestamptz,
  reported_apply_date    date,
  interview_schedule     text,
  actual_start_date      date,
  version                integer NOT NULL DEFAULT 1,
  last_stage_updated_at  timestamptz NOT NULL DEFAULT now(),
  last_follow_up_date    timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alumni_id, job_id)
);
CREATE INDEX candidate_processes_job_idx ON candidate_processes (job_id);

CREATE TABLE consent_records (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id           uuid NOT NULL REFERENCES candidate_processes (id),
  alumni_id            uuid NOT NULL REFERENCES users (id),
  job_id               uuid NOT NULL REFERENCES jobs (id),
  document_version_id  uuid REFERENCES cv_documents (id) ON DELETE RESTRICT,
  document_name        text NOT NULL,
  scope_description    text NOT NULL,
  policy_version       text NOT NULL,
  granted_at           timestamptz NOT NULL DEFAULT now(),
  revoked_at           timestamptz
);
CREATE INDEX consent_records_process_idx ON consent_records (process_id);

CREATE TABLE process_events (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id             uuid NOT NULL REFERENCES candidate_processes (id),
  event_type             text NOT NULL CHECK (event_type IN (
    'status_change', 'consent_granted', 'consent_revoked', 'forwarded_to_company', 'alumni_report', 'correction')),
  previous_stage         text,
  new_stage              text,
  previous_outcome       text,
  new_outcome            text,
  actor_id               uuid NOT NULL REFERENCES users (id),
  actor_name             text NOT NULL,
  actor_role             text NOT NULL CHECK (actor_role IN ('alumni', 'admin')),
  source_type            text NOT NULL CHECK (source_type IN ('admin_official', 'alumni_report', 'company_update')),
  occurred_at            timestamptz NOT NULL,
  recorded_at            timestamptz NOT NULL DEFAULT now(),
  public_message         text,
  internal_notes         text,
  correction_of_event_id uuid REFERENCES process_events (id)
);
CREATE INDEX process_events_process_idx ON process_events (process_id, recorded_at DESC);

-- The audit trail is append-only: corrections are new events (event_type = 'correction')
CREATE FUNCTION process_events_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'process_events is append-only';
END $$;
CREATE TRIGGER process_events_no_update BEFORE UPDATE OR DELETE ON process_events
  FOR EACH ROW EXECUTE FUNCTION process_events_immutable();

CREATE TABLE alumni_reports (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id            uuid NOT NULL REFERENCES candidate_processes (id),
  alumni_id             uuid NOT NULL REFERENCES users (id),
  report_type           text NOT NULL CHECK (report_type IN (
    'already_applied_external', 'interview_invite', 'got_offer', 'got_rejected', 'other_update')),
  report_date           date NOT NULL,
  details               text NOT NULL,
  status                text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'accepted', 'rejected')),
  reviewed_by           uuid REFERENCES users (id),
  reviewed_at           timestamptz,
  admin_decision_notes  text,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX alumni_reports_status_idx ON alumni_reports (status);

CREATE TABLE follow_up_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id    uuid REFERENCES candidate_processes (id),
  job_id        uuid REFERENCES jobs (id),
  alumni_id     uuid REFERENCES users (id),
  title         text NOT NULL,
  description   text NOT NULL,
  task_type     text NOT NULL CHECK (task_type IN (
    'review_new_application', 'monitor_consent', 'forward_cv', 'followup_company',
    'review_alumni_report', 'closed_job_cleanup')),
  owner_name    text NOT NULL,
  due_at        timestamptz NOT NULL,
  completed_at  timestamptz,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX follow_up_tasks_status_due_idx ON follow_up_tasks (status, due_at);
