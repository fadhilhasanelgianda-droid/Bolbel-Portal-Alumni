-- Rate limiting must live in the DB: serverless instances don't share memory
CREATE TABLE rate_limit_hits (
  key         text NOT NULL,
  hit_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rate_limit_hits_key_hit_at_idx ON rate_limit_hits (key, hit_at);
