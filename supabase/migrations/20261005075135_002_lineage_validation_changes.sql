/*
# Downstream Assets, Lineage Edges, Validation Runs, Schema Changes

## Overview
Creates tables for tracking downstream data assets, lineage relationships between assets,
validation run results, and detected schema changes.

## New Tables

### downstream_assets
- id (uuid, PK)
- name (text, not null)
- type (text, not null) — source, transformation, warehouse, dashboard, ml_feature, api
- dataset_id (uuid, FK -> datasets)
- environment (text, not null) — production, staging, development
- criticality (text, not null) — low, medium, high, critical
- owner (text, not null)
- team_id (uuid, FK -> teams)
- dependent_fields (text[], default '{}')
- description (text)
- created_at (timestamptz)

### lineage_edges
- id (uuid, PK)
- from_asset_id (uuid, FK -> downstream_assets, ON DELETE CASCADE)
- to_asset_id (uuid, FK -> downstream_assets, ON DELETE CASCADE)
- field_mapping (text[], default '{}')

### validation_runs
- id (uuid, PK)
- dataset_id (uuid, FK -> datasets)
- contract_id (uuid, FK -> data_contracts)
- status (text, not null) — passed, failed, warning, pending, blocked
- issues (jsonb, default '[]') — array of validation issue objects
- row_count (integer, default 0)
- passed_checks (integer, default 0)
- failed_checks (integer, default 0)
- warning_checks (integer, default 0)
- triggered_by (text, default 'System')
- created_at (timestamptz)

### schema_changes
- id (uuid, PK)
- dataset_id (uuid, FK -> datasets)
- contract_id (uuid, FK -> data_contracts)
- change_type (text, not null) — column_removed, column_added, column_renamed, data_type_changed, etc.
- severity (text, not null) — non_breaking, warning, breaking
- field_name (text, not null)
- description (text)
- plain_english_explanation (text)
- old_value (text)
- new_value (text)
- detected_at (timestamptz)
- detected_by (text, default 'System')

## Security
- RLS enabled on all tables.
- All tables use TO authenticated with USING (true) / WITH CHECK (true) — shared workspace model.

## Notes
1. lineage_edges cascade-delete when either connected asset is deleted.
2. validation_runs.issues is stored as jsonb to preserve the nested issue structure.
3. schema_changes stores the plain-English explanation for display in the UI.
4. Indexes on dataset_id and contract_id foreign keys for query performance.
*/

-- Downstream Assets
CREATE TABLE IF NOT EXISTS downstream_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'dashboard',
  dataset_id uuid REFERENCES datasets(id) ON DELETE CASCADE,
  environment text NOT NULL DEFAULT 'production',
  criticality text NOT NULL DEFAULT 'medium',
  owner text NOT NULL DEFAULT '',
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  dependent_fields text[] DEFAULT '{}',
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE downstream_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_downstream_assets" ON downstream_assets;
CREATE POLICY "auth_select_downstream_assets" ON downstream_assets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_downstream_assets" ON downstream_assets;
CREATE POLICY "auth_insert_downstream_assets" ON downstream_assets FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_downstream_assets" ON downstream_assets;
CREATE POLICY "auth_update_downstream_assets" ON downstream_assets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_downstream_assets" ON downstream_assets;
CREATE POLICY "auth_delete_downstream_assets" ON downstream_assets FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_downstream_assets_dataset_id ON downstream_assets(dataset_id);
CREATE INDEX IF NOT EXISTS idx_downstream_assets_team_id ON downstream_assets(team_id);

-- Lineage Edges
CREATE TABLE IF NOT EXISTS lineage_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_asset_id uuid NOT NULL REFERENCES downstream_assets(id) ON DELETE CASCADE,
  to_asset_id uuid NOT NULL REFERENCES downstream_assets(id) ON DELETE CASCADE,
  field_mapping text[] DEFAULT '{}'
);
ALTER TABLE lineage_edges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_lineage_edges" ON lineage_edges;
CREATE POLICY "auth_select_lineage_edges" ON lineage_edges FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_lineage_edges" ON lineage_edges;
CREATE POLICY "auth_insert_lineage_edges" ON lineage_edges FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_lineage_edges" ON lineage_edges;
CREATE POLICY "auth_update_lineage_edges" ON lineage_edges FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_lineage_edges" ON lineage_edges;
CREATE POLICY "auth_delete_lineage_edges" ON lineage_edges FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_lineage_edges_from ON lineage_edges(from_asset_id);
CREATE INDEX IF NOT EXISTS idx_lineage_edges_to ON lineage_edges(to_asset_id);

-- Validation Runs
CREATE TABLE IF NOT EXISTS validation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid REFERENCES datasets(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES data_contracts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  issues jsonb DEFAULT '[]'::jsonb,
  row_count integer NOT NULL DEFAULT 0,
  passed_checks integer NOT NULL DEFAULT 0,
  failed_checks integer NOT NULL DEFAULT 0,
  warning_checks integer NOT NULL DEFAULT 0,
  triggered_by text NOT NULL DEFAULT 'System',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE validation_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_validation_runs" ON validation_runs;
CREATE POLICY "auth_select_validation_runs" ON validation_runs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_validation_runs" ON validation_runs;
CREATE POLICY "auth_insert_validation_runs" ON validation_runs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_validation_runs" ON validation_runs;
CREATE POLICY "auth_update_validation_runs" ON validation_runs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_validation_runs" ON validation_runs;
CREATE POLICY "auth_delete_validation_runs" ON validation_runs FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_validation_runs_dataset_id ON validation_runs(dataset_id);
CREATE INDEX IF NOT EXISTS idx_validation_runs_contract_id ON validation_runs(contract_id);
CREATE INDEX IF NOT EXISTS idx_validation_runs_status ON validation_runs(status);
CREATE INDEX IF NOT EXISTS idx_validation_runs_created_at ON validation_runs(created_at DESC);

-- Schema Changes
CREATE TABLE IF NOT EXISTS schema_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid REFERENCES datasets(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES data_contracts(id) ON DELETE SET NULL,
  change_type text NOT NULL,
  severity text NOT NULL DEFAULT 'non_breaking',
  field_name text NOT NULL,
  description text DEFAULT '',
  plain_english_explanation text DEFAULT '',
  old_value text DEFAULT '',
  new_value text DEFAULT '',
  detected_at timestamptz DEFAULT now(),
  detected_by text NOT NULL DEFAULT 'System'
);
ALTER TABLE schema_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_schema_changes" ON schema_changes;
CREATE POLICY "auth_select_schema_changes" ON schema_changes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_schema_changes" ON schema_changes;
CREATE POLICY "auth_insert_schema_changes" ON schema_changes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_schema_changes" ON schema_changes;
CREATE POLICY "auth_update_schema_changes" ON schema_changes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_schema_changes" ON schema_changes;
CREATE POLICY "auth_delete_schema_changes" ON schema_changes FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_schema_changes_dataset_id ON schema_changes(dataset_id);
CREATE INDEX IF NOT EXISTS idx_schema_changes_severity ON schema_changes(severity);
CREATE INDEX IF NOT EXISTS idx_schema_changes_detected_at ON schema_changes(detected_at DESC);
