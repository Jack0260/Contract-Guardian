// ============= Enums & Constants =============

export type Role = "admin" | "data_owner" | "analyst" | "viewer";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  data_owner: "Data Owner",
  analyst: "Analyst",
  viewer: "Viewer",
};

export type Classification = "public" | "internal" | "confidential" | "pii";

export const CLASSIFICATION_LABELS: Record<Classification, string> = {
  public: "Public",
  internal: "Internal",
  confidential: "Confidential",
  pii: "PII",
};

export type Severity = "non_breaking" | "warning" | "breaking";

export const SEVERITY_LABELS: Record<Severity, string> = {
  non_breaking: "Non-Breaking",
  warning: "Warning",
  breaking: "Breaking",
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  non_breaking: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  breaking: "text-red-600 dark:text-red-400",
};

export type ChangeType =
  | "column_removed"
  | "column_added"
  | "column_renamed"
  | "data_type_changed"
  | "new_required_column"
  | "null_rate_exceeded"
  | "enum_value_outside_set"
  | "primary_key_duplicate"
  | "freshness_sla_breach"
  | "volume_anomaly"
  | "pii_detected_unclassified";

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  column_removed: "Column Removed",
  column_added: "Column Added",
  column_renamed: "Column Renamed",
  data_type_changed: "Data Type Changed",
  new_required_column: "New Required Column",
  null_rate_exceeded: "Null Rate Exceeded",
  enum_value_outside_set: "Enum Value Outside Allowed Set",
  primary_key_duplicate: "Primary Key Duplicate",
  freshness_sla_breach: "Freshness SLA Breach",
  volume_anomaly: "Data Volume Anomaly",
  pii_detected_unclassified: "Potential PII in Unclassified Field",
};

export type FieldType =
  | "string"
  | "integer"
  | "float"
  | "boolean"
  | "datetime"
  | "date"
  | "enum"
  | "json";

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  string: "String",
  integer: "Integer",
  float: "Float",
  boolean: "Boolean",
  datetime: "DateTime",
  date: "Date",
  enum: "Enum",
  json: "JSON",
};

export type AssetType = "source" | "transformation" | "warehouse" | "dashboard" | "ml_feature" | "api";

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  source: "Source Dataset",
  transformation: "Transformation",
  warehouse: "Warehouse Table",
  dashboard: "Dashboard",
  ml_feature: "ML Feature",
  api: "API Consumer",
};

export type Environment = "production" | "staging" | "development";

export const ENVIRONMENT_LABELS: Record<Environment, string> = {
  production: "Production",
  staging: "Staging",
  development: "Development",
};

export type Criticality = "low" | "medium" | "high" | "critical";

export const CRITICALITY_LABELS: Record<Criticality, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export type ChangeRequestStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "changes_requested";

export const CR_STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  draft: "Draft",
  pending_review: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Changes Requested",
};

export type ValidationStatus = "passed" | "failed" | "warning" | "pending" | "blocked";

export const VALIDATION_STATUS_LABELS: Record<ValidationStatus, string> = {
  passed: "Passed",
  failed: "Failed",
  warning: "Warning",
  pending: "Pending",
  blocked: "Blocked",
};

export type IncidentStatus = "open" | "investigating" | "resolved" | "closed";

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  open: "Open",
  investigating: "Investigating",
  resolved: "Resolved",
  closed: "Closed",
};

export type FreshnessStatus = "fresh" | "at_risk" | "stale";

export const FRESHNESS_STATUS_LABELS: Record<FreshnessStatus, string> = {
  fresh: "Fresh",
  at_risk: "At Risk",
  stale: "Stale",
};

// ============= Core Entities =============

export interface Team {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  teamId: string | null;
  avatar: string;
  createdAt: string;
}

export interface DataSource {
  id: string;
  name: string;
  sourceType: string;
  connectionDetails: string;
  teamId: string;
  createdAt: string;
}

export interface SchemaField {
  id: string;
  name: string;
  dataType: FieldType;
  required: boolean;
  isPrimaryKey: boolean;
  enumValues: string[];
  nullRateThreshold: number;
  numericMin: number | null;
  numericMax: number | null;
  regexPattern: string;
  description: string;
}

export interface ContractRule {
  id: string;
  type: string;
  field: string;
  value: string;
  description: string;
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  sourceId: string;
  teamId: string;
  classification: Classification;
  freshnessSlaHours: number;
  volumeThresholdPercent: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DataContract {
  id: string;
  datasetId: string;
  version: number;
  status: "draft" | "active" | "deprecated";
  schemaFields: SchemaField[];
  rules: ContractRule[];
  classification: Classification;
  freshnessSlaHours: number;
  volumeThresholdPercent: number;
  description: string;
  createdBy: string;
  createdAt: string;
  activatedAt: string | null;
}

export interface DatasetVersion {
  id: string;
  datasetId: string;
  version: number;
  schemaSnapshot: SchemaField[];
  createdAt: string;
}

export interface ColumnProfile {
  name: string;
  inferredType: FieldType;
  nullPercentage: number;
  uniqueCount: number;
  totalCount: number;
  minValue: string;
  maxValue: string;
  sampleValues: string[];
  isLikelyPII: boolean;
  piiType: string | null;
}

export interface DataProfile {
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
}

export interface SchemaChange {
  id: string;
  datasetId: string;
  contractId: string;
  changeType: ChangeType;
  severity: Severity;
  fieldName: string;
  description: string;
  plainEnglishExplanation: string;
  oldValue: string;
  newValue: string;
  detectedAt: string;
  detectedBy: string;
}

export interface ValidationIssue {
  fieldName: string;
  changeType: ChangeType;
  severity: Severity;
  message: string;
  expected: string;
  actual: string;
}

export interface ValidationRun {
  id: string;
  datasetId: string;
  contractId: string;
  status: ValidationStatus;
  issues: ValidationIssue[];
  rowCount: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  triggeredBy: string;
  createdAt: string;
}

export interface DownstreamAsset {
  id: string;
  name: string;
  type: AssetType;
  datasetId: string;
  environment: Environment;
  criticality: Criticality;
  owner: string;
  teamId: string;
  dependentFields: string[];
  description: string;
  createdAt: string;
}

export interface LineageEdge {
  id: string;
  fromAssetId: string;
  toAssetId: string;
  fieldMapping: string[];
}

export interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  datasetId: string;
  contractId: string;
  status: ChangeRequestStatus;
  proposedBy: string;
  proposedAt: string;
  schemaChanges: SchemaChange[];
  impactedAssets: string[];
  riskScore: number;
  comments: Comment[];
  activityTimeline: ActivityEntry[];
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  action: string;
  userId: string;
  timestamp: string;
  details: string;
}

export interface Approval {
  id: string;
  changeRequestId: string;
  approverId: string;
  decision: "approved" | "rejected" | "changes_requested";
  comment: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  datasetId: string;
  contractId: string | null;
  validationRunId: string | null;
  changeRequestId: string | null;
  affectedAssets: string[];
  rootCause: string;
  assignedTo: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  details: string;
  createdAt: string;
}

export interface ComplianceTrendPoint {
  date: string;
  score: number;
  total: number;
  passed: number;
  failed: number;
}

export interface DataQualityTrendPoint {
  date: string;
  passRate: number;
  failRate: number;
  warningRate: number;
}

// ============= Change Impact Brief =============

export interface ChangeImpactBrief {
  changeRequestId: string;
  datasetName: string;
  whatChanged: string[];
  isBreaking: boolean;
  breakingCount: number;
  warningCount: number;
  nonBreakingCount: number;
  affectedSystems: string[];
  affectedDashboards: string[];
  affectedTeams: string[];
  requiredActions: string[];
  migrationStrategy: string;
  riskScore: number;
  recommendedReleaseWindow: string;
  summary: string;
}
