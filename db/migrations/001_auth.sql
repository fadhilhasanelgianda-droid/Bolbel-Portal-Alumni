-- Roster of alumni eligible to use the portal (source of truth for who may activate an account)
CREATE TABLE roster_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  full_name     text NOT NULL,
  program       text NOT NULL,
  batch         text NOT NULL,
  eligibility   text NOT NULL DEFAULT 'eligible' CHECK (eligibility IN ('eligible', 'pending', 'revoked')),
  invited_at    timestamptz NOT NULL DEFAULT now(),
  activated_at  timestamptz
);
CREATE UNIQUE INDEX roster_entries_email_key ON roster_entries (lower(email));

CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL,
  password_hash  text NOT NULL,
  role           text NOT NULL CHECK (role IN ('alumni', 'admin')),
  full_name      text NOT NULL,
  roster_id      uuid REFERENCES roster_entries (id),
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_login_at  timestamptz,
  -- alumni must come from the roster; admins must not
  CHECK ((role = 'alumni') = (roster_id IS NOT NULL))
);
CREATE UNIQUE INDEX users_email_key ON users (lower(email));
CREATE UNIQUE INDEX users_roster_id_key ON users (roster_id) WHERE roster_id IS NOT NULL;

-- Only a SHA-256 of the session token is stored, so a DB leak does not yield usable sessions
CREATE TABLE sessions (
  token_hash  text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);
