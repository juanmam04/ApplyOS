-- Oportunidades detectadas automáticamente — ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS opportunities (
  id BIGSERIAL PRIMARY KEY,
  source TEXT DEFAULT 'ycombinator',
  job_url TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  company_website TEXT DEFAULT '',
  location TEXT DEFAULT '',
  remote_type TEXT DEFAULT 'unknown',
  salary_range TEXT DEFAULT '',
  tech_stack JSONB DEFAULT '[]'::jsonb,
  company_stage TEXT DEFAULT '',
  description TEXT DEFAULT '',
  startup_score INT DEFAULT 0,
  role_score INT DEFAULT 0,
  match_score INT DEFAULT 0,
  pros JSONB DEFAULT '[]'::jsonb,
  cons JSONB DEFAULT '[]'::jsonb,
  analysis JSONB,
  application_draft JSONB,
  apply_meta JSONB,
  apply_status TEXT DEFAULT '',
  apply_error TEXT DEFAULT '',
  applied_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'dismissed')),
  job_id BIGINT REFERENCES jobs(id) ON DELETE SET NULL,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_match ON opportunities(match_score DESC);

CREATE TABLE IF NOT EXISTS scanner_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_scan_at TIMESTAMPTZ,
  last_scan_count INT DEFAULT 0,
  is_scanning BOOLEAN DEFAULT FALSE,
  scan_started_at TIMESTAMPTZ
);

ALTER TABLE scanner_state ADD COLUMN IF NOT EXISTS scan_started_at TIMESTAMPTZ;

ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS apply_meta JSONB;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS apply_status TEXT DEFAULT '';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS apply_error TEXT DEFAULT '';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;

INSERT INTO scanner_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS application_draft JSONB;
