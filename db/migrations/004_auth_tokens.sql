-- One-time tokens emailed to the address on file: they prove the requester controls the mailbox.
-- Only a SHA-256 of the token is stored. 'activate' tokens point at a roster entry (no account yet),
-- 'reset' tokens at an existing user.
CREATE TABLE auth_tokens (
  token_hash  text PRIMARY KEY,
  purpose     text NOT NULL CHECK (purpose IN ('activate', 'reset')),
  roster_id   uuid REFERENCES roster_entries (id) ON DELETE CASCADE,
  user_id     uuid REFERENCES users (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  CHECK ((purpose = 'activate' AND roster_id IS NOT NULL AND user_id IS NULL)
      OR (purpose = 'reset' AND user_id IS NOT NULL AND roster_id IS NULL))
);
CREATE INDEX auth_tokens_roster_idx ON auth_tokens (roster_id) WHERE roster_id IS NOT NULL;
CREATE INDEX auth_tokens_user_idx ON auth_tokens (user_id) WHERE user_id IS NOT NULL;
