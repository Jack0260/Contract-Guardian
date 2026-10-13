/*
# Create core organizational tables

1. New Tables
- `organizations` — top-level org that owns everything
  - id (uuid PK), name (text), created_at (timestamptz)
- `workspaces` — workspace within an org
  - id (uuid PK), organization_id (FK), name (text), created_at (timestamptz)
- `teams` — teams within a workspace
  - id (uuid PK), workspace_id (FK), name (text), description (text), color (text), created_at (timestamptz)

2. Security
- RLS enabled on all tables.
- All tables are accessible to authenticated users (shared platform data — all signed-in users can see org/workspace/team structure).
*/

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_organizations" ON organizations;
CREATE POLICY "auth_select_organizations" ON organizations FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_organizations" ON organizations;
CREATE POLICY "auth_insert_organizations" ON organizations FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_organizations" ON organizations;
CREATE POLICY "auth_update_organizations" ON organizations FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_organizations" ON organizations;
CREATE POLICY "auth_delete_organizations" ON organizations FOR DELETE
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_workspaces" ON workspaces;
CREATE POLICY "auth_select_workspaces" ON workspaces FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_workspaces" ON workspaces;
CREATE POLICY "auth_insert_workspaces" ON workspaces FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_workspaces" ON workspaces;
CREATE POLICY "auth_update_workspaces" ON workspaces FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_workspaces" ON workspaces;
CREATE POLICY "auth_delete_workspaces" ON workspaces FOR DELETE
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  color text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_teams" ON teams;
CREATE POLICY "auth_select_teams" ON teams FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_teams" ON teams;
CREATE POLICY "auth_insert_teams" ON teams FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_teams" ON teams;
CREATE POLICY "auth_update_teams" ON teams FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_teams" ON teams;
CREATE POLICY "auth_delete_teams" ON teams FOR DELETE
TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_workspaces_org_id ON workspaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_workspace_id ON teams(workspace_id);
