/*
# Create validation runs, schema changes, and data quality results

1. New Tables
- `validation_runs` — results of validating uploaded data against a contract
  - id (uuid PK), dataset_id (FK), contract_id (FK), status (text: passed/failed/warning/pending/blocked),
    issues (jsonb array of validation issues), row_count (integer), passed_checks (integer),
    failed_checks (integer), warning_checks (integer), triggered_by (text), created_at (timestamptz)
- `schema_changes` — detected schema changes between data and contract
  - id (uuid PK), dataset_id (FK), contract_id (FK), change_type (text), severity (text: non_breaking/warning/breaking),
    field_name (text), description (text), plain_english_explanation (text), old_value (text), new_value (text),
    detected_at (timestamptz), detected_by (text)
- `data_quality_results` — quality metrics per validation run
  - id (uuid PK), validation_run_id (FK), metric_name (text), metric_value (numeric), status (text), created_at (timestamptz)

2. Security
- RLS enabled on all tables.
- Authenticated users have full CRUD (shared platform).
*/

CREATE TABLE IF NOT EXISTS validation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES data_contracts(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('passed', 'failed', 'warning', 'pending', 'blocked')),
  issues jsonb NOT NULL DEFAULT '[]',
  row_count integer NOT NULL DEFAULT 0,
  passed_checks integer NOT NULL DEFAULT 0,
  failed_checks integer NOT NULL DEFAULT 0,
  warning_checks integer NOT NULL DEFAULT 0,
  triggered_by text NOT NULL DEFAULT 'System',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE validation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_validation_runs" ON validation_runs;
CREATE POLICY "auth_select_validation_runs" ON validation_runs FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_validation_runs" ON validation_runs;
CREATE POLICY "auth_insert_validation_runs" ON validation_runs FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_validation_runs" ON validation_runs;
CREATE POLICY "auth_update_validation_runs" ON validation_runs FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_validation_runs" ON validation_runs;
CREATE POLICY "auth_delete_validation_runs" ON validation_runs FOR DELETE
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS schema_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES data_contracts(id) ON DELETE CASCADE,
  change_type text NOT NULL CHECK (change_type IN ('column_removed', 'column_added', 'column_renamed', 'data_type_changed', 'new_required_column', 'null_rate_exceeded', 'enum_value_outside_set', 'primary_key_duplicate', 'freshness_sla_breach', 'volume_anomaly', 'pii_detected_unclassified')),
  severity text NOT NULL DEFAULT 'non_breaking' CHECK (severity IN ('non_breaking', 'warning', 'breaking')),
  field_name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  plain_english_explanation text DEFAULT '',
  old_value text DEFAULT '',
  new_value text DEFAULT '',
  detected_at timestamptz DEFAULT now(),
  detected_by text DEFAULT 'System'
);

ALTER TABLE schema_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_schema_changes" ON schema_changes;
CREATE POLICY "auth_select_schema_changes" ON schema_changes FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_schema_changes" ON schema_changes;
CREATE POLICY "auth_insert_schema_changes" ON schema_changes FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_schema_changes" ON schema_changes;
CREATE POLICY "auth_update_schema_changes" ON schema_changes FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_schema_changes" ON schema_changes;
CREATE POLICY "auth_delete_schema_changes" ON schema_changes FOR DELETE
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS data_quality_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_run_id uuid NOT NULL REFERENCES validation_runs(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'passed' CHECK (status IN ('passed', 'failed', 'warning')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE data_quality_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_data_quality_results" ON data_quality_results;
CREATE POLICY "auth_select_data_quality_results" ON data_quality_results FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_data_quality_results" ON data_quality_results;
CREATE POLICY "auth_insert_data_quality_results" ON data_quality_results FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_data_quality_results" ON data_quality_results;
CREATE POLICY "auth_update_data_quality_results" ON data_quality_results FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_data_quality_results" ON data_quality_results;
CREATE POLICY "auth_delete_data_quality_results" ON data_quality_results FOR DELETE
TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_validation_runs_dataset ON validation_runs(dataset_id);
CREATE INDEX IF NOT EXISTS idx_validation_runs_contract ON validation_runs(contract_id);
CREATE INDEX IF NOT EXISTS idx_validation_runs_status ON validation_runs(status);
CREATE INDEX IF NOT EXISTS idx_validation_runs_created ON validation_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_schema_changes_dataset ON schema_changes(dataset_id);
CREATE INDEX IF NOT EXISTS idx_schema_changes_severity ON schema_changes(severity);
CREATE INDEX IF NOT EXISTS idx_schema_changes_detected ON schema_changes(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_dq_results_run ON data_quality_results(validation_run_id);
