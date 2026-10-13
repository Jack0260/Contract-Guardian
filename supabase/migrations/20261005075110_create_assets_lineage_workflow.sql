/*
# Create downstream assets, lineage edges, change requests, approvals, comments, activity, incidents, and audit logs

1. New Tables
- `downstream_assets` — assets that depend on datasets (dashboards, transformations, etc.)
  - id (uuid PK), name (text), type (text: source/transformation/warehouse/dashboard/ml_feature/api),
    dataset_id (FK), environment (text), criticality (text), owner (text), team_id (FK),
    dependent_fields (text[]), description (text), created_at (timestamptz)
- `lineage_edges` — directed edges in the lineage graph
  - id (uuid PK), from_asset_id (FK), to_asset_id (FK), field_mapping (text[])
- `change_requests` — proposed contract changes with approval workflow
  - id (uuid PK), title (text), description (text), dataset_id (FK), contract_id (FK),
    status (text: draft/pending_review/approved/rejected/changes_requested),
    proposed_by (uuid FK to app_users), proposed_at (timestamptz),
    schema_changes (jsonb), impacted_assets (text[]), risk_score (integer),
    reviewed_by (uuid FK nullable), reviewed_at (timestamptz nullable)
- `comments` — comments on change requests
  - id (uuid PK), change_request_id (FK), user_id (uuid FK to app_users), text (text), created_at (timestamptz)
- `activity_entries` — activity timeline entries for change requests
  - id (uuid PK), change_request_id (FK), action (text), user_id (uuid FK), timestamp (timestamptz), details (text)
- `approvals` — approval decisions on change requests
  - id (uuid PK), change_request_id (FK), approver_id (uuid FK to app_users),
    decision (text: approved/rejected/changes_requested), comment (text), created_at (timestamptz)
- `incidents` — incidents caused by contract violations
  - id (uuid PK), title (text), description (text), severity (text), status (text: open/investigating/resolved/closed),
    dataset_id (FK), contract_id (FK nullable), validation_run_id (FK nullable), change_request_id (FK nullable),
    affected_assets (text[]), root_cause (text), assigned_to (text nullable), created_at (timestamptz), resolved_at (timestamptz nullable)
- `audit_logs` — immutable audit trail for all actions
  - id (uuid PK), user_id (uuid FK to app_users nullable), action (text), entity_type (text),
    entity_id (text), entity_name (text), details (text), created_at (timestamptz)

2. Security
- RLS enabled on all tables.
- Authenticated users have full CRUD (shared platform — all signed-in users participate in the workflow).
*/

CREATE TABLE IF NOT EXISTS downstream_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'dashboard' CHECK (type IN ('source', 'transformation', 'warehouse', 'dashboard', 'ml_feature', 'api')),
  dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('production', 'staging', 'development')),
  criticality text NOT NULL DEFAULT 'medium' CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
  owner text NOT NULL DEFAULT '',
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  dependent_fields text[] DEFAULT '{}',
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE downstream_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_downstream_assets" ON downstream_assets;
CREATE POLICY "auth_select_downstream_assets" ON downstream_assets FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_downstream_assets" ON downstream_assets;
CREATE POLICY "auth_insert_downstream_assets" ON downstream_assets FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_downstream_assets" ON downstream_assets;
CREATE POLICY "auth_update_downstream_assets" ON downstream_assets FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_downstream_assets" ON downstream_assets;
CREATE POLICY "auth_delete_downstream_assets" ON downstream_assets FOR DELETE
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS lineage_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_asset_id uuid NOT NULL REFERENCES downstream_assets(id) ON DELETE CASCADE,
  to_asset_id uuid NOT NULL REFERENCES downstream_assets(id) ON DELETE CASCADE,
  field_mapping text[] DEFAULT '{}'
);

ALTER TABLE lineage_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_lineage_edges" ON lineage_edges;
CREATE POLICY "auth_select_lineage_edges" ON lineage_edges FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_lineage_edges" ON lineage_edges;
CREATE POLICY "auth_insert_lineage_edges" ON lineage_edges FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_lineage_edges" ON lineage_edges;
CREATE POLICY "auth_update_lineage_edges" ON lineage_edges FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_lineage_edges" ON lineage_edges;
CREATE POLICY "auth_delete_lineage_edges" ON lineage_edges FOR DELETE
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES data_contracts(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'changes_requested')),
  proposed_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  proposed_at timestamptz DEFAULT now(),
  schema_changes jsonb NOT NULL DEFAULT '[]',
  impacted_assets text[] DEFAULT '{}',
  risk_score integer NOT NULL DEFAULT 0,
  reviewed_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  reviewed_at timestamptz
);

ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_change_requests" ON change_requests;
CREATE POLICY "auth_select_change_requests" ON change_requests FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_change_requests" ON change_requests;
CREATE POLICY "auth_insert_change_requests" ON change_requests FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_change_requests" ON change_requests;
CREATE POLICY "auth_update_change_requests" ON change_requests FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_change_requests" ON change_requests;
CREATE POLICY "auth_delete_change_requests" ON change_requests FOR DELETE
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id uuid NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  text text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_comments" ON comments;
CREATE POLICY "auth_select_comments" ON comments FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_comments" ON comments;
CREATE POLICY "auth_insert_comments" ON comments FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_comments" ON comments;
CREATE POLICY "auth_update_comments" ON comments FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_comments" ON comments;
CREATE POLICY "auth_delete_comments" ON comments FOR DELETE
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS activity_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id uuid NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  action text NOT NULL DEFAULT '',
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  timestamp timestamptz DEFAULT now(),
  details text DEFAULT ''
);

ALTER TABLE activity_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_activity_entries" ON activity_entries;
CREATE POLICY "auth_select_activity_entries" ON activity_entries FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_activity_entries" ON activity_entries;
CREATE POLICY "auth_insert_activity_entries" ON activity_entries FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_activity_entries" ON activity_entries;
CREATE POLICY "auth_update_activity_entries" ON activity_entries FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_activity_entries" ON activity_entries;
CREATE POLICY "auth_delete_activity_entries" ON activity_entries FOR DELETE
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id uuid NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  approver_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected', 'changes_requested')),
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_approvals" ON approvals;
CREATE POLICY "auth_select_approvals" ON approvals FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_approvals" ON approvals;
CREATE POLICY "auth_insert_approvals" ON approvals FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_approvals" ON approvals;
CREATE POLICY "auth_update_approvals" ON approvals FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_approvals" ON approvals;
CREATE POLICY "auth_delete_approvals" ON approvals FOR DELETE
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('non_breaking', 'warning', 'breaking')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
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
CREATE POLICY "auth_select_incidents" ON incidents FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_incidents" ON incidents;
CREATE POLICY "auth_insert_incidents" ON incidents FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_incidents" ON incidents;
CREATE POLICY "auth_update_incidents" ON incidents FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_incidents" ON incidents;
CREATE POLICY "auth_delete_incidents" ON incidents FOR DELETE
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  action text NOT NULL DEFAULT '',
  entity_type text NOT NULL DEFAULT '',
  entity_id text NOT NULL DEFAULT '',
  entity_name text NOT NULL DEFAULT '',
  details text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_audit_logs" ON audit_logs;
CREATE POLICY "auth_select_audit_logs" ON audit_logs FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_audit_logs" ON audit_logs;
CREATE POLICY "auth_insert_audit_logs" ON audit_logs FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_audit_logs" ON audit_logs;
CREATE POLICY "auth_update_audit_logs" ON audit_logs FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_audit_logs" ON audit_logs;
CREATE POLICY "auth_delete_audit_logs" ON audit_logs FOR DELETE
TO authenticated USING (true);

-- Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_downstream_assets_dataset ON downstream_assets(dataset_id);
CREATE INDEX IF NOT EXISTS idx_downstream_assets_team ON downstream_assets(team_id);
CREATE INDEX IF NOT EXISTS idx_lineage_from ON lineage_edges(from_asset_id);
CREATE INDEX IF NOT EXISTS idx_lineage_to ON lineage_edges(to_asset_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);
CREATE INDEX IF NOT EXISTS idx_change_requests_dataset ON change_requests(dataset_id);
CREATE INDEX IF NOT EXISTS idx_comments_cr ON comments(change_request_id);
CREATE INDEX IF NOT EXISTS idx_activity_cr ON activity_entries(change_request_id);
CREATE INDEX IF NOT EXISTS idx_approvals_cr ON approvals(change_request_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_dataset ON incidents(dataset_id);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
