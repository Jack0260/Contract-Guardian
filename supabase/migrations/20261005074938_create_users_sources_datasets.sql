/*
# Create user profiles, data sources, and datasets

1. New Tables
- `app_users` — application-level user profiles linked to Supabase auth
  - id (uuid PK, FK to auth.users), email (text, unique), name (text), role (text: admin/data_owner/analyst/viewer),
    team_id (uuid FK to teams, nullable), avatar (text), workspace_id (uuid FK to workspaces), created_at (timestamptz)
- `data_sources` — external data source connections
  - id (uuid PK), workspace_id (FK), name (text), source_type (text), connection_details (text), team_id (FK), created_at (timestamptz)
- `datasets` — dataset catalog entries
  - id (uuid PK), name (text), description (text), source_id (FK to data_sources), team_id (FK to teams),
    classification (text: public/internal/confidential/pii), freshness_sla_hours (integer), volume_threshold_percent (integer),
    tags (text[]), created_at (timestamptz), updated_at (timestamptz)

2. Security
- RLS enabled on all tables.
- All accessible to authenticated users (shared platform — all signed-in users can browse catalog).
*/

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'data_owner', 'analyst', 'viewer')),
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  avatar text DEFAULT '',
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_app_users" ON app_users;
CREATE POLICY "auth_select_app_users" ON app_users FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_app_users" ON app_users;
CREATE POLICY "auth_insert_app_users" ON app_users FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_app_users" ON app_users;
CREATE POLICY "auth_update_app_users" ON app_users FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_app_users" ON app_users;
CREATE POLICY "auth_delete_app_users" ON app_users FOR DELETE
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  source_type text NOT NULL DEFAULT 'postgresql',
  connection_details text DEFAULT '',
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_data_sources" ON data_sources;
CREATE POLICY "auth_select_data_sources" ON data_sources FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_data_sources" ON data_sources;
CREATE POLICY "auth_insert_data_sources" ON data_sources FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_data_sources" ON data_sources;
CREATE POLICY "auth_update_data_sources" ON data_sources FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_data_sources" ON data_sources;
CREATE POLICY "auth_delete_data_sources" ON data_sources FOR DELETE
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  source_id uuid NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  classification text NOT NULL DEFAULT 'internal' CHECK (classification IN ('public', 'internal', 'confidential', 'pii')),
  freshness_sla_hours integer NOT NULL DEFAULT 24,
  volume_threshold_percent integer NOT NULL DEFAULT 20,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_datasets" ON datasets;
CREATE POLICY "auth_select_datasets" ON datasets FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_datasets" ON datasets;
CREATE POLICY "auth_insert_datasets" ON datasets FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_datasets" ON datasets;
CREATE POLICY "auth_update_datasets" ON datasets FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_datasets" ON datasets;
CREATE POLICY "auth_delete_datasets" ON datasets FOR DELETE
TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_data_sources_team ON data_sources(team_id);
CREATE INDEX IF NOT EXISTS idx_datasets_team ON datasets(team_id);
CREATE INDEX IF NOT EXISTS idx_datasets_source ON datasets(source_id);
CREATE INDEX IF NOT EXISTS idx_datasets_classification ON datasets(classification);
