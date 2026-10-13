import type {
  SchemaField,
  ColumnProfile,
  DataContract,
  ValidationIssue,
  Severity,
  ChangeType,
  SchemaChange,
} from "./types";

export interface DiffResult {
  issues: ValidationIssue[];
  newColumns: string[];
  removedColumns: string[];
  typeChanges: { field: string; oldType: string; newType: string }[];
}

export function diffSchema(
  contract: DataContract,
  profile: { columns: ColumnProfile[]; rowCount: number }
): DiffResult {
  const issues: ValidationIssue[] = [];
  const newColumns: string[] = [];
  const removedColumns: string[] = [];
  const typeChanges: { field: string; oldType: string; newType: string }[] = [];

  const contractFields = contract.schemaFields;
  const profileMap = new Map(profile.columns.map((c) => [c.name.toLowerCase(), c]));
  const contractMap = new Map(contractFields.map((f) => [f.name.toLowerCase(), f]));

  // Check for removed columns and field-level violations
  for (const field of contractFields) {
    const profileCol = profileMap.get(field.name.toLowerCase());

    if (!profileCol) {
      removedColumns.push(field.name);
      issues.push({
        fieldName: field.name,
        changeType: "column_removed",
        severity: field.required ? "breaking" : "warning",
        message: `Column "${field.name}" is defined in the contract but missing from the uploaded data.`,
        expected: field.name,
        actual: "missing",
      });
      continue;
    }

    // Data type check
    if (field.dataType !== profileCol.inferredType && field.dataType !== "json") {
      typeChanges.push({ field: field.name, oldType: field.dataType, newType: profileCol.inferredType });
      issues.push({
        fieldName: field.name,
        changeType: "data_type_changed",
        severity: "breaking",
        message: `Column "${field.name}" type changed from ${field.dataType} to ${profileCol.inferredType}.`,
        expected: field.dataType,
        actual: profileCol.inferredType,
      });
    }

    // Null rate check
    if (field.nullRateThreshold > 0 && profileCol.nullPercentage > field.nullRateThreshold) {
      issues.push({
        fieldName: field.name,
        changeType: "null_rate_exceeded",
        severity: field.required ? "breaking" : "warning",
        message: `Column "${field.name}" null rate is ${profileCol.nullPercentage}%, exceeding the threshold of ${field.nullRateThreshold}%.`,
        expected: `<= ${field.nullRateThreshold}%`,
        actual: `${profileCol.nullPercentage}%`,
      });
    }

    // Required field null check
    if (field.required && profileCol.nullPercentage > 0) {
      issues.push({
        fieldName: field.name,
        changeType: "null_rate_exceeded",
        severity: "breaking",
        message: `Required column "${field.name}" contains ${profileCol.nullPercentage}% nulls. Required fields must have no nulls.`,
        expected: "0% nulls",
        actual: `${profileCol.nullPercentage}% nulls`,
      });
    }

    // Enum values check
    if (field.enumValues.length > 0) {
      const actualValues = profile.columns
        .find((c) => c.name.toLowerCase() === field.name.toLowerCase())
        ?.sampleValues.filter((v) => v !== "") || [];
      const outsideValues = actualValues.filter((v) => !field.enumValues.includes(v));
      if (outsideValues.length > 0) {
        issues.push({
          fieldName: field.name,
          changeType: "enum_value_outside_set",
          severity: "breaking",
          message: `Column "${field.name}" contains values outside the allowed enum set: ${outsideValues.join(", ")}.`,
          expected: field.enumValues.join(", "),
          actual: outsideValues.join(", "),
        });
      }
    }

    // Numeric range check
    if ((field.numericMin !== null || field.numericMax !== null) && (profileCol.inferredType === "integer" || profileCol.inferredType === "float")) {
      const nums = profileCol.sampleValues.map(Number).filter((n) => !isNaN(n));
      for (const n of nums) {
        if (field.numericMin !== null && n < field.numericMin) {
          issues.push({
            fieldName: field.name,
            changeType: "data_type_changed",
            severity: "warning",
            message: `Column "${field.name}" value ${n} is below the minimum of ${field.numericMin}.`,
            expected: `>= ${field.numericMin}`,
            actual: String(n),
          });
        }
        if (field.numericMax !== null && n > field.numericMax) {
          issues.push({
            fieldName: field.name,
            changeType: "data_type_changed",
            severity: "warning",
            message: `Column "${field.name}" value ${n} exceeds the maximum of ${field.numericMax}.`,
            expected: `<= ${field.numericMax}`,
            actual: String(n),
          });
        }
      }
    }

    // Regex pattern check
    if (field.regexPattern) {
      try {
        const regex = new RegExp(field.regexPattern);
        const badValues = profileCol.sampleValues.filter((v) => v !== "" && !regex.test(v));
        if (badValues.length > 0) {
          issues.push({
            fieldName: field.name,
            changeType: "data_type_changed",
            severity: "warning",
            message: `Column "${field.name}" has values that don't match the required pattern: ${badValues.join(", ")}.`,
            expected: field.regexPattern,
            actual: "pattern mismatch",
          });
        }
      } catch {
        // invalid regex, skip
      }
    }

    // PII detected in unclassified field
    if (profileCol.isLikelyPII && contract.classification !== "pii") {
      issues.push({
        fieldName: field.name,
        changeType: "pii_detected_unclassified",
        severity: "breaking",
        message: `Potential PII detected in column "${field.name}" (${profileCol.piiType}), but the contract classifies this dataset as ${contract.classification}.`,
        expected: "PII classification required",
        actual: `Detected: ${profileCol.piiType}`,
      });
    }
  }

  // Check for new columns
  for (const col of profile.columns) {
    if (!contractMap.has(col.name.toLowerCase())) {
      newColumns.push(col.name);
      issues.push({
        fieldName: col.name,
        changeType: "column_added",
        severity: "non_breaking",
        message: `New column "${col.name}" detected that is not in the contract.`,
        expected: "not in contract",
        actual: col.name,
      });
    }
  }

  // Primary key duplicate check
  const pkFields = contractFields.filter((f) => f.isPrimaryKey);
  for (const pkField of pkFields) {
    const col = profileMap.get(pkField.name.toLowerCase());
    if (col && col.uniqueCount < col.totalCount - (col.totalCount * col.nullPercentage) / 100) {
      issues.push({
        fieldName: pkField.name,
        changeType: "primary_key_duplicate",
        severity: "breaking",
        message: `Primary key column "${pkField.name}" contains duplicate values. ${col.uniqueCount} unique values out of ${col.totalCount} total rows.`,
        expected: "all unique",
        actual: `${col.uniqueCount} unique / ${col.totalCount} total`,
      });
    }
  }

  // Volume anomaly check
  // (simulated — would compare against historical average)
  // Freshness SLA check would be done at the run level, not per-column

  return { issues, newColumns, removedColumns, typeChanges };
}

export function classifyOverall(issues: ValidationIssue[]): {
  hasBreaking: boolean;
  hasWarning: boolean;
  breakingCount: number;
  warningCount: number;
  nonBreakingCount: number;
} {
  const breakingCount = issues.filter((i) => i.severity === "breaking").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const nonBreakingCount = issues.filter((i) => i.severity === "non_breaking").length;
  return {
    hasBreaking: breakingCount > 0,
    hasWarning: warningCount > 0,
    breakingCount,
    warningCount,
    nonBreakingCount,
  };
}

export function generatePlainEnglishExplanation(
  changeType: ChangeType,
  fieldName: string,
  severity: Severity,
  expected: string,
  actual: string,
  impactedAssets: { name: string; type: string }[]
): string {
  const assetNames = impactedAssets.slice(0, 3).map((a) => a.name);
  const assetStr = assetNames.length > 0 ? ` This affects ${assetNames.join(", ")}${impactedAssets.length > 3 ? ` and ${impactedAssets.length - 3} more` : ""}.` : "";

  const explanations: Record<ChangeType, string> = {
    column_removed: `The column "${fieldName}" has been removed from the data. ${impactedAssets.length} downstream asset(s) depend on this field and will break if they reference it.${assetStr}`,
    column_added: `A new column "${fieldName}" was found in the data. This is not breaking but the contract should be updated to include it.`,
    column_renamed: `Column "${fieldName}" appears to have been renamed. Downstream consumers referencing the old name will fail.${assetStr}`,
    data_type_changed: `The data type of "${fieldName}" changed from ${expected} to ${actual}. Transformations and dashboards expecting ${expected} values may break or produce incorrect results.${assetStr}`,
    new_required_column: `A new required column "${fieldName}" was added. Existing data pipelines that don't populate this field will fail validation.`,
    null_rate_exceeded: `The null rate for "${fieldName}" is ${actual}, exceeding the allowed threshold of ${expected}. This may cause errors in downstream systems that expect populated values.${assetStr}`,
    enum_value_outside_set: `Column "${fieldName}" contains values (${actual}) not in the allowed set: ${expected}. Downstream logic may not handle these new values correctly.${assetStr}`,
    primary_key_duplicate: `Primary key column "${fieldName}" has duplicate values. This breaks uniqueness guarantees and can cause duplicate rows in downstream tables and incorrect aggregations in dashboards.${assetStr}`,
    freshness_sla_breach: `The data freshness SLA has been breached. Data is older than the allowed window, meaning dashboards may be showing stale information to decision-makers.`,
    volume_anomaly: `Data volume has changed significantly compared to historical averages. This could indicate a data pipeline issue, source system change, or unexpected event.`,
    pii_detected_unclassified: `Potential PII (${actual}) was detected in column "${fieldName}", but this field is not classified as PII in the contract. This may violate data governance policies and require immediate classification update.`,
  };

  let base = explanations[changeType] || `Change detected in field "${fieldName}".`;
  if (severity === "breaking") {
    base = `BREAKING: ` + base;
  } else if (severity === "warning") {
    base = `WARNING: ` + base;
  }

  return base;
}

export function issuesToSchemaChanges(
  issues: ValidationIssue[],
  datasetId: string,
  contractId: string,
  detectedBy: string,
  impactedAssets: { name: string; type: string }[]
): SchemaChange[] {
  return issues.map((issue, idx) => ({
    id: `sc_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 8)}`,
    datasetId,
    contractId,
    changeType: issue.changeType,
    severity: issue.severity,
    fieldName: issue.fieldName,
    description: issue.message,
    plainEnglishExplanation: generatePlainEnglishExplanation(
      issue.changeType,
      issue.fieldName,
      issue.severity,
      issue.expected,
      issue.actual,
      impactedAssets
    ),
    oldValue: issue.expected,
    newValue: issue.actual,
    detectedAt: new Date().toISOString(),
    detectedBy,
  }));
}
