/*
# Change Requests, Approvals, Comments, Activity, Incidents, Audit Logs, App Users

## Overview
Creates tables for the approval workflow (change requests, approvals, comments, activity timeline),
incident tracking, and audit logging. Also creates an app_users table to store user profile data
(roles, team membership) that supplements Supabase Auth.

## New Tables

### app_users
- id (uuid, PK, FK -> auth.users)
- email (text, not null)
- name (text, not null)
- role (text, not null, default 'viewer') — admin, data_owner, analyst, viewer
- team_id (uuid, FK -> teams, nullable)
- avatar (text, default '') — 2-letter initials
- created_at (timestamptz)

### change_requests
- id (uuid, PK)
- title (text, not null)
- description (text)
- dataset_id (uuid, FK -> datasets)
- contract_id (uuid, FK -> data_contracts)
- status (text, not null, default 'draft') — draft, pending_review, approved, rejected, changes_requested
- proposed_by (uuid, FK -> auth.users)
- proposed_at (timestamptz)
- schema_changes (jsonb, default '[]') — embedded snapshot of changes
- impacted_assets (text[], default '{}') — array of asset IDs
- risk_score (integer, default 0)
- reviewed_by (uuid, FK -> auth.users, nullable)
- reviewed_at (timestamptz, nullable)

### cr_comments
- id (uuid, PK)
- change_request_id (uuid, FK -> change_requests, ON DELETE CASCADE)
- user_id (uuid, FK -> auth.users)
- text (text, not null)
- created_at (timestamptz)

### cr_activity
- id (uuid, PK)
- change_request_id (uuid, FK -> change_requests, ON DELETE CASCADE)
- action (text, not null)
- user_id (uuid, FK -> auth.users)
- timestamp (timestamptz)
- details (text)

### incidents
- id (uuid, PK)
- title (text, not null)
- description (text)
- severity (text, not null, default 'warning') — non_breaking, warning, breaking
- status (text, not null, default 'open') — open, investigating, resolved, closed
- dataset_id (uuid, FK -> datasets)
- contract_id (uuid, FK -> data_contracts, nullable)
- validation_run_id (uuid, FK -> validation_runs, nullable)
- change_request_id (uuid, FK -> change_requests, nullable)
- affected_assets (text[], default '{}')
- root_cause (text, default '')
- assigned_to (text, nullable)
- created_at (timestamptz)
- resolved_at (timestamptz, nullable)

### audit_logs
- id (uuid, PK)
- user_id (text, not null) — can be a user UUID or 'system'
- action (text, not null)
- entity_type (text, not null)
- entity_id (text, not null)
- entity_name (text, default '')
- details (text, default '')
- created_at (timestamptz)

## Security
- RLS enabled on all tables.
- All tables use TO authenticated with USING (true) / WITH CHECK (true) — shared workspace.
- app_users has an additional SELECT policy for anon so the login flow can look up users by email.

## Notes
1. app_users supplements auth.users with app-specific profile data (role, team, avatar).
2. change_requests.schema_changes is jsonb — stores a snapshot of the detected changes at proposal time.
3. cr_comments and cr_activity cascade-delete when a change request is deleted.
4. audit_logs.user_id is text (not uuid FK) because it can be 'system' for automated actions.
5. Indexes on foreign keys and commonly-filtered columns.
*/

-- App Users (profile data supplementing auth.users)
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'viewer',
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  avatar text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_app_users" ON app_users;
CREATE POLICY "auth_select_app_users" ON app_users FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "anon_select_app_users" ON app_users;
CREATE POLICY "anon_select_app_users" ON app_users FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "auth_insert_app_users" ON app_users;
CREATE POLICY "auth_insert_app_users" ON app_users FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_app_users" ON app_users;
CREATE POLICY "auth_update_app_users" ON app_users FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_app_users" ON app_users;
CREATE POLICY "auth_delete_app_users" ON app_users FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);

-- Change Requests
CREATE TABLE IF NOT EXISTS change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  dataset_id uuid REFERENCES datasets(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES data_contracts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  proposed_by uuid DEFAULT auth.uid(),
  proposed_at timestamptz DEFAULT now(),
  schema_changes jsonb DEFAULT '[]'::jsonb,
  impacted_assets text[] DEFAULT '{}',
  risk_score integer NOT NULL DEFAULT 0,
  reviewed_by uuid,
  reviewed_at timestamptz
);
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_change_requests" ON change_requests;
CREATE POLICY "auth_select_change_requests" ON change_requests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_change_requests" ON change_requests;
CREATE POLICY "auth_insert_change_requests" ON change_requests FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_change_requests" ON change_requests;
CREATE POLICY "auth_update_change_requests" ON change_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_change_requests" ON change_requests;
CREATE POLICY "auth_delete_change_requests" ON change_requests FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_change_requests_dataset_id ON change_requests(dataset_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);
CREATE INDEX IF NOT EXISTS idx_change_requests_proposed_at ON change_requests(proposed_at DESC);

-- CR Comments
CREATE TABLE IF NOT EXISTS cr_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id uuid NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  user_id uuid DEFAULT auth.uid(),
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cr_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_cr_comments" ON cr_comments;
CREATE POLICY "auth_select_cr_comments" ON cr_comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_cr_comments" ON cr_comments;
CREATE POLICY "auth_insert_cr_comments" ON cr_comments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_cr_comments" ON cr_comments;
CREATE POLICY "auth_update_cr_comments" ON cr_comments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_cr_comments" ON cr_comments;
CREATE POLICY "auth_delete_cr_comments" ON cr_comments FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_cr_comments_cr_id ON cr_comments(change_request_id);

-- CR Activity
CREATE TABLE IF NOT EXISTS cr_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id uuid NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  action text NOT NULL,
  user_id uuid DEFAULT auth.uid(),
  timestamp timestamptz DEFAULT now(),
  details text DEFAULT ''
);
ALTER TABLE cr_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_cr_activity" ON cr_activity;
CREATE POLICY "auth_select_cr_activity" ON cr_activity FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_cr_activity" ON cr_activity;
CREATE POLICY "auth_insert_cr_activity" ON cr_activity FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_cr_activity" ON cr_activity;
CREATE POLICY "auth_update_cr_activity" ON cr_activity FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_cr_activity" ON cr_activity;
CREATE POLICY "auth_delete_cr_activity" ON cr_activity FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_cr_activity_cr_id ON cr_activity(change_request_id);

-- Incidents
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  severity text NOT NULL DEFAULT 'warning',
  status text NOT NULL DEFAULT 'open',
  dataset_id uuid REFERENCES datasets(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES data_contracts(id) ON DELETE SET NULL,
  validation_run_id uuid REFERENCES validation_runs(id) ON DELETE SET NULL,
  change_request_id uuid REFERENCES change_requests(id) ON DELETE SET NULL,
  affected_assets text[] DEFAULT '{}',
  root_cause text DEFAULT '',
  assigned_to text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_incidents" ON incidents;
CREATE POLICY "auth_select_incidents" ON incidents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_incidents" ON incidents;
CREATE POLICY "auth_insert_incidents" ON incidents FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_incidents" ON incidents;
CREATE POLICY "auth_update_incidents" ON incidents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_incidents" ON incidents;
CREATE POLICY "auth_delete_incidents" ON incidents FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_incidents_dataset_id ON incidents(dataset_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL DEFAULT 'system',
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  entity_name text DEFAULT '',
  details text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_audit_logs" ON audit_logs;
CREATE POLICY "auth_select_audit_logs" ON audit_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_audit_logs" ON audit_logs;
CREATE POLICY "auth_insert_audit_logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_audit_logs" ON audit_logs;
CREATE POLICY "auth_update_audit_logs" ON audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_audit_logs" ON audit_logs;
CREATE POLICY "auth_delete_audit_logs" ON audit_logs FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
