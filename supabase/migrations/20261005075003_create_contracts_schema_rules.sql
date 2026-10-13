/*
# Create data contracts, schema fields, contract rules, and dataset versions

1. New Tables
- `data_contracts` — versioned data contracts for a dataset
  - id (uuid PK), dataset_id (FK), version (integer), status (text: draft/active/deprecated),
    description (text), classification (text), freshness_sla_hours (integer), volume_threshold_percent (integer),
    created_by (uuid FK to app_users), created_at (timestamptz), activated_at (timestamptz nullable)
- `schema_fields` — individual field definitions within a contract
  - id (uuid PK), contract_id (FK), name (text), data_type (text), required (boolean), is_primary_key (boolean),
    enum_values (text[]), null_rate_threshold (integer), numeric_min (numeric nullable), numeric_max (numeric nullable),
    regex_pattern (text), description (text), position (integer for ordering)
- `contract_rules` — named rules attached to a contract
  - id (uuid PK), contract_id (FK), type (text), field (text), value (text), description (text)
- `dataset_versions` — snapshots of dataset schema over time
  - id (uuid PK), dataset_id (FK), version (integer), schema_snapshot (jsonb), created_at (timestamptz)

2. Security
- RLS enabled on all tables.
- Authenticated users have full CRUD (shared platform).
*/

CREATE TABLE IF NOT EXISTS data_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'deprecated')),
  description text DEFAULT '',
  classification text NOT NULL DEFAULT 'internal' CHECK (classification IN ('public', 'internal', 'confidential', 'pii')),
  freshness_sla_hours integer NOT NULL DEFAULT 24,
  volume_threshold_percent integer NOT NULL DEFAULT 20,
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  activated_at timestamptz
);

ALTER TABLE data_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_data_contracts" ON data_contracts;
CREATE POLICY "auth_select_data_contracts" ON data_contracts FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_data_contracts" ON data_contracts;
CREATE POLICY "auth_insert_data_contracts" ON data_contracts FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_data_contracts" ON data_contracts;
CREATE POLICY "auth_update_data_contracts" ON data_contracts FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_data_contracts" ON data_contracts;
CREATE POLICY "auth_delete_data_contracts" ON data_contracts FOR DELETE
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS schema_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES data_contracts(id) ON DELETE CASCADE,
  name text NOT NULL,
  data_type text NOT NULL DEFAULT 'string' CHECK (data_type IN ('string', 'integer', 'float', 'boolean', 'datetime', 'date', 'enum', 'json')),
  required boolean NOT NULL DEFAULT false,
  is_primary_key boolean NOT NULL DEFAULT false,
  enum_values text[] DEFAULT '{}',
  null_rate_threshold integer NOT NULL DEFAULT 5,
  numeric_min numeric,
  numeric_max numeric,
  regex_pattern text DEFAULT '',
  description text DEFAULT '',
  position integer NOT NULL DEFAULT 0
);

ALTER TABLE schema_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_schema_fields" ON schema_fields;
CREATE POLICY "auth_select_schema_fields" ON schema_fields FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_schema_fields" ON schema_fields;
CREATE POLICY "auth_insert_schema_fields" ON schema_fields FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_schema_fields" ON schema_fields;
CREATE POLICY "auth_update_schema_fields" ON schema_fields FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_schema_fields" ON schema_fields;
CREATE POLICY "auth_delete_schema_fields" ON schema_fields FOR DELETE
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS contract_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES data_contracts(id) ON DELETE CASCADE,
  type text NOT NULL,
  field text NOT NULL,
  value text DEFAULT '',
  description text DEFAULT ''
);

ALTER TABLE contract_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_contract_rules" ON contract_rules;
CREATE POLICY "auth_select_contract_rules" ON contract_rules FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_contract_rules" ON contract_rules;
CREATE POLICY "auth_insert_contract_rules" ON contract_rules FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_contract_rules" ON contract_rules;
CREATE POLICY "auth_update_contract_rules" ON contract_rules FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_contract_rules" ON contract_rules;
CREATE POLICY "auth_delete_contract_rules" ON contract_rules FOR DELETE
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS dataset_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  schema_snapshot jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dataset_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_dataset_versions" ON dataset_versions;
CREATE POLICY "auth_select_dataset_versions" ON dataset_versions FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_dataset_versions" ON dataset_versions;
CREATE POLICY "auth_insert_dataset_versions" ON dataset_versions FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_dataset_versions" ON dataset_versions;
CREATE POLICY "auth_update_dataset_versions" ON dataset_versions FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_dataset_versions" ON dataset_versions;
CREATE POLICY "auth_delete_dataset_versions" ON dataset_versions FOR DELETE
TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_contracts_dataset ON data_contracts(dataset_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON data_contracts(status);
CREATE INDEX IF NOT EXISTS idx_schema_fields_contract ON schema_fields(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_rules_contract ON contract_rules(contract_id);
CREATE INDEX IF NOT EXISTS idx_dataset_versions_dataset ON dataset_versions(dataset_id);
