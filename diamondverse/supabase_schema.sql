-- DiamondVerse Manager - Full Supabase Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- COMPANIES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  abbrev TEXT,
  logo_url TEXT,
  size TEXT DEFAULT 'Small' CHECK (size IN ('Global','Large','Medium','Small','Local','Insignificant')),
  popularity INTEGER DEFAULT 50 CHECK (popularity >= 0 AND popularity <= 100),
  nation TEXT DEFAULT 'United States',
  city TEXT,
  owner_worker_id UUID,
  year_founded INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- WORKERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fixed_id SERIAL UNIQUE,
  name TEXT UNIQUE NOT NULL,
  gender TEXT DEFAULT 'Male' CHECK (gender IN ('Male','Female','Non-Binary / Other')),
  country TEXT DEFAULT 'United States',
  dob DATE,
  bio TEXT,
  height_ft INTEGER DEFAULT 6 CHECK (height_ft >= 4 AND height_ft <= 8),
  height_in INTEGER DEFAULT 0 CHECK (height_in >= 0 AND height_in <= 11),
  weight_lbs INTEGER DEFAULT 220 CHECK (weight_lbs >= 50 AND weight_lbs <= 700),
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active','Retired','Deceased')),
  disposition TEXT DEFAULT 'Babyface' CHECK (disposition IN ('Babyface','Heel','Neutral / N/A')),
  push TEXT DEFAULT 'Midcard' CHECK (push IN ('Main Event','Upper Midcard','Midcard','Lower Midcard','Enhancement Talent','Announcer','Referee','Personality','Staff')),
  popularity INTEGER DEFAULT 50 CHECK (popularity >= 0 AND popularity <= 100),
  star_quality INTEGER DEFAULT 50 CHECK (star_quality >= 0 AND star_quality <= 100),
  intimidation INTEGER DEFAULT 50 CHECK (intimidation >= 0 AND intimidation <= 100),
  looks INTEGER DEFAULT 50 CHECK (looks >= 0 AND looks <= 100),
  image_url TEXT,
  ethnicity TEXT,
  build TEXT,
  company_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add owner FK to companies after workers created
ALTER TABLE companies ADD CONSTRAINT fk_owner FOREIGN KEY (owner_worker_id) REFERENCES workers(id) ON DELETE SET NULL;

-- =====================
-- TITLES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS titles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  image_url TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  champion_worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  level TEXT DEFAULT 'Primary' CHECK (level IN ('Primary','Secondary','Tertiary')),
  type TEXT DEFAULT 'Singles' CHECK (type IN ('Singles','Tag','Trios')),
  biography TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- TAG TEAMS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS tag_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  image_url TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  worker1_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  worker2_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  biography TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- STABLES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS stables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  image_url TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  worker_ids UUID[] DEFAULT '{}',
  tag_team_ids UUID[] DEFAULT '{}',
  biography TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- EVENTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  image_url TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  biography TEXT,
  event_intent TEXT DEFAULT 'Regular' CHECK (event_intent IN ('Season Finale','Special','Regular','Weekly TV')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- LORE TABLE
-- =====================
CREATE TABLE IF NOT EXISTS lore (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  date_year INTEGER,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- CHANGE LOG TABLE
-- =====================
CREATE TABLE IF NOT EXISTS change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('create','update','delete')),
  previous_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- SETTINGS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES ('reference_date', NOW()::DATE::TEXT) ON CONFLICT (key) DO NOTHING;

-- =====================
-- STORAGE BUCKETS
-- =====================
-- Run these in the Supabase dashboard Storage section or via API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('workers', 'workers', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('companies', 'companies', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('titles', 'titles', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('tag-teams', 'tag-teams', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('stables', 'stables', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('events', 'events', true);

-- =====================
-- RLS POLICIES (disable for simplicity, enable in prod)
-- =====================
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE titles DISABLE ROW LEVEL SECURITY;
ALTER TABLE tag_teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE stables DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE lore DISABLE ROW LEVEL SECURITY;
ALTER TABLE change_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- =====================
-- UPDATED_AT TRIGGER
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workers_updated_at BEFORE UPDATE ON workers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER titles_updated_at BEFORE UPDATE ON titles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tag_teams_updated_at BEFORE UPDATE ON tag_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER stables_updated_at BEFORE UPDATE ON stables FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER lore_updated_at BEFORE UPDATE ON lore FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
