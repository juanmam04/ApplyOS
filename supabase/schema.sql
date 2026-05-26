-- ApplyOS · Ejecutar en Supabase → SQL Editor

-- Perfil maestro (una sola fila)
CREATE TABLE IF NOT EXISTS profile (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  full_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  location TEXT DEFAULT '',
  linkedin TEXT DEFAULT '',
  github TEXT DEFAULT '',
  portfolio TEXT DEFAULT '',
  current_title TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  skills JSONB DEFAULT '[]'::jsonb,
  work_experience JSONB DEFAULT '[]'::jsonb,
  projects JSONB DEFAULT '[]'::jsonb,
  preferred_roles JSONB DEFAULT '[]'::jsonb,
  preferred_countries JSONB DEFAULT '[]'::jsonb,
  salary_expectations TEXT DEFAULT '',
  work_preferences TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO profile (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Versiones de CV (archivos en Storage bucket "cvs")
CREATE TABLE IF NOT EXISTS cv_versions (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  extracted_text TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trabajos
CREATE TABLE IF NOT EXISTS jobs (
  id BIGSERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  job_url TEXT DEFAULT '',
  company_website TEXT DEFAULT '',
  location TEXT DEFAULT '',
  remote_type TEXT DEFAULT 'unknown' CHECK (remote_type IN ('remote', 'hybrid', 'onsite', 'unknown')),
  salary_range TEXT DEFAULT '',
  tech_stack JSONB DEFAULT '[]'::jsonb,
  company_stage TEXT DEFAULT '',
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'discovered' CHECK (status IN ('discovered', 'saved', 'applied', 'interview', 'rejected', 'offer')),
  match_score INT DEFAULT 0,
  notes TEXT DEFAULT '',
  analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prep de entrevistas
CREATE TABLE IF NOT EXISTS interview_prep (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  technical_questions JSONB DEFAULT '[]'::jsonb,
  product_questions JSONB DEFAULT '[]'::jsonb,
  project_questions JSONB DEFAULT '[]'::jsonb,
  servo_questions JSONB DEFAULT '[]'::jsonb,
  questions_to_ask JSONB DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (job_id)
);

-- Trigger updated_at en jobs
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS jobs_updated_at ON jobs;
CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_jobs_updated_at();

-- Bucket para PDFs de CV
INSERT INTO storage.buckets (id, name, public)
VALUES ('cvs', 'cvs', false)
ON CONFLICT (id) DO NOTHING;
