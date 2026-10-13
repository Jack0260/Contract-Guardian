/*
# Core Entities: Teams, Data Sources, Datasets, Contracts, Schema Fields, Contract Rules

## Overview
Creates the foundational tables for Contract Guardian — a data contract management platform.
This is a multi-user app with sign-in, so all tables use user_id ownership and authenticated-scoped RLS.

## New Tables

### teams
- id (uuid, PK)
- name (text, not null)
- description (text)
- color (text, default '#3b82f6')
- created_at (timestamptz)

### data_sources
- id (uuid, PK)
- name (text, not null)
- source_type (text, not null)
- connection_details (text)
- team_id (uuid, FK -> teams)
- created_at (timestamptz)

### datasets
- id (uuid, PK)
- name (text, not null)
- description (text)
- source_id (uuid, FK -> data_sources)
- team_id (uuid, FK -> teams)
- classification (text, not null, default 'internal') — public, internal, confidential, pii
- freshness_sla_hours (integer, default 24)
- volume_threshold_percent (integer, default 20)
- tags (text[], default '{}')
- created_at (timestamptz)
- updated_at (timestamptz)

### data_contracts
- id (uuid, PK)
- dataset_id (uuid, FK -> datasets)
- version (integer, not null, default 1)
- status (text, not null, default 'draft') — draft, active, deprecated
- description (text)
- classification (text, not null, default 'internal')
- freshness_sla_hours (integer, default 24)
- volume_threshold_percent (integer, default 20)
- created_by (uuid, FK -> auth.users)
- created_at (timestamptz)
- activated_at (timestamptz, nullable)

### schema_fields
- id (uuid, PK)
- contract_id (uuid, FK -> data_contracts, ON DELETE CASCADE)
- name (text, not null)
- data_type (text, not null) — string, integer, float, boolean, datetime, date, enum, json
- required (boolean, default false)
- is_primary_key (boolean, default false)
- enum_values (text[], default '{}')
- null_rate_threshold (integer, default 5)
- numeric_min (double precision, nullable)
- numeric_max (double precision, nullable)
- regex_pattern (text, default '')
- description (text, default '')
- field_order (integer, default 0)

### contract_rules
- id (uuid, PK)
- contract_id (uuid, FK -> data_contracts, ON DELETE CASCADE)
- type (text, not null)
- field (text, not null)
- value (text)
- description (text)

## Security
- RLS enabled on all tables.
- All tables accessible to authenticated users (shared workspace model — all signed-in users see all data).
- Using TO authenticated with USING (true) / WITH CHECK (true) since this is a shared-team platform, not per-user isolated data.

## Notes
1. This is a shared-workspace app — all authenticated users see the same data (teams, datasets, contracts). No per-user row isolation.
2. data_contracts.created_by defaults to auth.uid() so inserts from the client work without explicitly passing it.
3. schema_fields and contract_rules cascade-delete when a contract is deleted.
4. Indexes added on frequently-queried foreign keys.
*/

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  color text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_teams" ON teams;
CREATE POLICY "auth_select_teams" ON teams FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_teams" ON teams;
CREATE POLICY "auth_insert_teams" ON teams FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_teams" ON teams;
CREATE POLICY "auth_update_teams" ON teams FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_teams" ON teams;
CREATE POLICY "auth_delete_teams" ON teams FOR DELETE TO authenticated USING (true);

-- Data Sources
CREATE TABLE IF NOT EXISTS data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type text NOT NULL DEFAULT 'api',
  connection_details text DEFAULT '',
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_data_sources" ON data_sources;
CREATE POLICY "auth_select_data_sources" ON data_sources FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_data_sources" ON data_sources;
CREATE POLICY "auth_insert_data_sources" ON data_sources FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_data_sources" ON data_sources;
CREATE POLICY "auth_update_data_sources" ON data_sources FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_data_sources" ON data_sources;
CREATE POLICY "auth_delete_data_sources" ON data_sources FOR DELETE TO authenticated USING (true);

-- Datasets
CREATE TABLE IF NOT EXISTS datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  source_id uuid REFERENCES data_sources(id) ON DELETE SET NULL,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  classification text NOT NULL DEFAULT 'internal',
  freshness_sla_hours integer NOT NULL DEFAULT 24,
  volume_threshold_percent integer NOT NULL DEFAULT 20,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_datasets" ON datasets;
CREATE POLICY "auth_select_datasets" ON datasets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_datasets" ON datasets;
CREATE POLICY "auth_insert_datasets" ON datasets FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_datasets" ON datasets;
CREATE POLICY "auth_update_datasets" ON datasets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_datasets" ON datasets;
CREATE POLICY "auth_delete_datasets" ON datasets FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_datasets_team_id ON datasets(team_id);
CREATE INDEX IF NOT EXISTS idx_datasets_source_id ON datasets(source_id);

-- Data Contracts
CREATE TABLE IF NOT EXISTS data_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid REFERENCES datasets(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  description text DEFAULT '',
  classification text NOT NULL DEFAULT 'internal',
  freshness_sla_hours integer NOT NULL DEFAULT 24,
  volume_threshold_percent integer NOT NULL DEFAULT 20,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  activated_at timestamptz
);
ALTER TABLE data_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_data_contracts" ON data_contracts;
CREATE POLICY "auth_select_data_contracts" ON data_contracts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_data_contracts" ON data_contracts;
CREATE POLICY "auth_insert_data_contracts" ON data_contracts FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_data_contracts" ON data_contracts;
CREATE POLICY "auth_update_data_contracts" ON data_contracts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_data_contracts" ON data_contracts;
CREATE POLICY "auth_delete_data_contracts" ON data_contracts FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_data_contracts_dataset_id ON data_contracts(dataset_id);
CREATE INDEX IF NOT EXISTS idx_data_contracts_status ON data_contracts(status);

-- Schema Fields
CREATE TABLE IF NOT EXISTS schema_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES data_contracts(id) ON DELETE CASCADE,
  name text NOT NULL,
  data_type text NOT NULL DEFAULT 'string',
  required boolean NOT NULL DEFAULT false,
  is_primary_key boolean NOT NULL DEFAULT false,
  enum_values text[] DEFAULT '{}',
  null_rate_threshold integer NOT NULL DEFAULT 5,
  numeric_min double precision,
  numeric_max double precision,
  regex_pattern text DEFAULT '',
  description text DEFAULT '',
  field_order integer NOT NULL DEFAULT 0
);
ALTER TABLE schema_fields ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_schema_fields" ON schema_fields;
CREATE POLICY "auth_select_schema_fields" ON schema_fields FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_schema_fields" ON schema_fields;
CREATE POLICY "auth_insert_schema_fields" ON schema_fields FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_schema_fields" ON schema_fields;
CREATE POLICY "auth_update_schema_fields" ON schema_fields FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_schema_fields" ON schema_fields;
CREATE POLICY "auth_delete_schema_fields" ON schema_fields FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_schema_fields_contract_id ON schema_fields(contract_id);

-- Contract Rules
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
CREATE POLICY "auth_select_contract_rules" ON contract_rules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_contract_rules" ON contract_rules;
CREATE POLICY "auth_insert_contract_rules" ON contract_rules FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_contract_rules" ON contract_rules;
CREATE POLICY "auth_update_contract_rules" ON contract_rules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_contract_rules" ON contract_rules;
CREATE POLICY "auth_delete_contract_rules" ON contract_rules FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_contract_rules_contract_id ON contract_rules(contract_id);
