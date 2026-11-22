CREATE TABLE IF NOT EXISTS issues (
  id text PRIMARY KEY,
  issue_type text NOT NULL,
  description text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  lat double precision,
  lng double precision,
  image text,
  audio text,
  original_transcript text,
  translated_transcript text,
  transcript_language text,
  department text NOT NULL DEFAULT 'General',
  status text NOT NULL DEFAULT 'New at Ward',
  current_level text NOT NULL DEFAULT 'Ward',
  flag text NOT NULL DEFAULT 'None',
  due_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS issue_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id text NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  action text NOT NULL,
  level text NOT NULL DEFAULT 'Ward',
  level_name text,
  note text,
  new_level text,
  new_due_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS issue_events_issue_id_idx ON issue_events (issue_id);
CREATE INDEX IF NOT EXISTS issues_department_idx ON issues (department);
CREATE INDEX IF NOT EXISTS issues_current_level_idx ON issues (current_level);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS issues_set_updated_at ON issues;
CREATE TRIGGER issues_set_updated_at
BEFORE UPDATE ON issues
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON issues TO anon, authenticated;
GRANT SELECT, INSERT ON issue_events TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read issues" ON issues;
CREATE POLICY "Public can read issues"
ON issues FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public can insert issues" ON issues;
CREATE POLICY "Public can insert issues"
ON issues FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update issues" ON issues;
CREATE POLICY "Public can update issues"
ON issues FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read issue events" ON issue_events;
CREATE POLICY "Public can read issue events"
ON issue_events FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public can insert issue events" ON issue_events;
CREATE POLICY "Public can insert issue events"
ON issue_events FOR INSERT
TO anon, authenticated
WITH CHECK (true);