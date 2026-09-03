CREATE TABLE IF NOT EXISTS payers (
  id TEXT PRIMARY KEY,
  name TEXT,
  id_format_regex TEXT,
  readable_format TEXT,
  ucr_note TEXT,
  sample_deductible TEXT
);

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  name TEXT,
  dob TEXT,
  payer_id TEXT,
  member_id TEXT,
  status TEXT DEFAULT 'pending',        -- pending | flagged | confirmed
  policy_status TEXT DEFAULT 'active',  -- active | expired
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS flags (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  field TEXT,
  rule_violated TEXT,
  expected TEXT,
  actual TEXT,
  carc_code TEXT,       -- CO-31 | CO-27 | CO-16
  suggestion TEXT,      -- cached AI output, never regenerated on page load
  confirmed_at TEXT
);
