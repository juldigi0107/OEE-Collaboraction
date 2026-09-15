-- Display Device Pairing v83
-- Additive only. No business history is modified or deleted.
CREATE TABLE IF NOT EXISTS display_pair_codes(
  code_hash TEXT PRIMARY KEY,
  display_id TEXT NOT NULL,
  machine_code TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_ts INTEGER NOT NULL,
  expires_ts INTEGER NOT NULL,
  used_ts INTEGER
);
CREATE INDEX IF NOT EXISTS display_pair_expiry ON display_pair_codes(expires_ts,used_ts);

CREATE TABLE IF NOT EXISTS display_devices(
  id TEXT PRIMARY KEY,
  display_id TEXT NOT NULL,
  machine_code TEXT NOT NULL,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_ts INTEGER NOT NULL,
  expires_ts INTEGER NOT NULL,
  last_seen_ts INTEGER
);
CREATE INDEX IF NOT EXISTS display_devices_layout ON display_devices(display_id,active,expires_ts);
