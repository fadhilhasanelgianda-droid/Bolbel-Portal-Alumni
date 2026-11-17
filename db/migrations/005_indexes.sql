-- Indexes for per-user lookups that previously fell back to sequential scans (found in the scalability audit)
CREATE INDEX cv_documents_owner_idx ON cv_documents (owner_id, uploaded_at DESC);
CREATE INDEX consent_records_alumni_idx ON consent_records (alumni_id, granted_at DESC);
CREATE INDEX alumni_reports_alumni_idx ON alumni_reports (alumni_id, created_at DESC);
CREATE INDEX candidate_processes_last_stage_idx ON candidate_processes (last_stage_updated_at DESC);
CREATE INDEX process_events_recorded_idx ON process_events (recorded_at DESC);
-- Purging: expired sessions / spent tokens / old rate-limit rows are deleted by hit_at / expires_at alone
CREATE INDEX rate_limit_hits_hit_at_idx ON rate_limit_hits (hit_at);
CREATE INDEX auth_tokens_expires_idx ON auth_tokens (expires_at);
