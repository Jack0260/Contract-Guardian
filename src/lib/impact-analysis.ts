import type { DownstreamAsset, SchemaChange, ChangeImpactBrief, LineageEdge } from "./types";

export function calculateImpactScore(
  impactedAssets: DownstreamAsset[],
  schemaChanges: SchemaChange[]
): number {
  if (impactedAssets.length === 0) return 0;

  let score = 0;
  const breakingCount = schemaChanges.filter((s) => s.severity === "breaking").length;
  const warningCount = schemaChanges.filter((s) => s.severity === "warning").length;

  // Base score from number of impacted assets
  score += Math.min(impactedAssets.length * 8, 40);

  // Criticality weighting
  for (const asset of impactedAssets) {
    switch (asset.criticality) {
      case "critical": score += 8; break;
      case "high": score += 5; break;
      case "medium": score += 3; break;
      case "low": score += 1; break;
    }
  }

  // Environment weighting
  for (const asset of impactedAssets) {
    if (asset.environment === "production") score += 4;
    else if (asset.environment === "staging") score += 2;
  }

  // Breaking changes add significant risk
  score += breakingCount * 10;
  score += warningCount * 3;

  // Cap at 100
  return Math.min(score, 100);
}

export function getImpactedAssets(
  datasetId: string,
  allAssets: DownstreamAsset[],
  allEdges: LineageEdge[]
): DownstreamAsset[] {
  // BFS through lineage graph starting from assets connected to this dataset
  const directAssets = allAssets.filter((a) => a.datasetId === datasetId);
  const visited = new Set(directAssets.map((a) => a.id));
  const queue = [...directAssets];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const downstream = allEdges
      .filter((e) => e.fromAssetId === current.id)
      .map((e) => allAssets.find((a) => a.id === e.toAssetId))
      .filter((a): a is DownstreamAsset => !!a && !visited.has(a.id));

    for (const asset of downstream) {
      visited.add(asset.id);
      queue.push(asset);
    }
  }

  return allAssets.filter((a) => visited.has(a.id));
}

export function generateChangeImpactBrief(
  changeRequestId: string,
  datasetName: string,
  schemaChanges: SchemaChange[],
  impactedAssets: DownstreamAsset[],
  teams: { id: string; name: string }[]
): ChangeImpactBrief {
  const breakingChanges = schemaChanges.filter((s) => s.severity === "breaking");
  const warningChanges = schemaChanges.filter((s) => s.severity === "warning");
  const nonBreakingChanges = schemaChanges.filter((s) => s.severity === "non_breaking");

  const affectedDashboards = impactedAssets
    .filter((a) => a.type === "dashboard")
    .map((a) => a.name);

  const affectedTeams = Array.from(
    new Set(impactedAssets.map((a) => teams.find((t) => t.id === a.teamId)?.name).filter(Boolean) as string[])
  );

  const affectedSystems = impactedAssets.map((a) => a.name);

  const whatChanged = schemaChanges.map((s) => s.plainEnglishExplanation);

  const requiredActions: string[] = [];
  if (breakingChanges.length > 0) {
    requiredActions.push("Notify all downstream consumers before proceeding with this change.");
    requiredActions.push("Update all dependent ETL jobs and transformation logic to handle the schema change.");
  }
  if (affectedDashboards.length > 0) {
    requiredActions.push(`Update ${affectedDashboards.length} dashboard(s) to reflect the new schema.`);
  }
  if (breakingChanges.some((c) => c.changeType === "column_removed")) {
    requiredActions.push("Remove references to deleted columns from all downstream SQL queries and views.");
  }
  if (breakingChanges.some((c) => c.changeType === "data_type_changed")) {
    requiredActions.push("Add type casting or transformation logic for changed data types.");
  }
  if (breakingChanges.some((c) => c.changeType === "pii_detected_unclassified")) {
    requiredActions.push("Update data classification and apply PII protection controls immediately.");
  }
  if (breakingChanges.some((c) => c.changeType === "primary_key_duplicate")) {
    requiredActions.push("Investigate and resolve duplicate primary key values at the source.");
  }
  if (requiredActions.length === 0) {
    requiredActions.push("No immediate action required. Update the contract to reflect the new schema.");
  }

  const riskScore = calculateImpactScore(impactedAssets, schemaChanges);

  let migrationStrategy = "No migration required for non-breaking changes. Update the contract version and proceed.";
  if (breakingChanges.length > 0) {
    const strategies: string[] = [];
    if (breakingChanges.some((c) => c.changeType === "column_removed")) {
      strategies.push("Phase 1: Add the new schema alongside the old. Phase 2: Migrate consumers to the new schema. Phase 3: Remove the old columns after all consumers are updated.");
    }
    if (breakingChanges.some((c) => c.changeType === "data_type_changed")) {
      strategies.push("Create a compatibility layer that casts the new type to the old type until all consumers are updated.");
    }
    if (breakingChanges.some((c) => c.changeType === "new_required_column")) {
      strategies.push("Backfill the new required column with default values for existing records before enforcing the constraint.");
    }
    if (breakingChanges.some((c) => c.changeType === "primary_key_duplicate")) {
      strategies.push("Deduplicate records at the source and add a composite key if natural keys are not unique.");
    }
    migrationStrategy = strategies.join(" ");
  }

  let recommendedReleaseWindow = "Any time — low risk change.";
  if (riskScore >= 70) {
    recommendedReleaseWindow = "Schedule for a low-traffic window (weekend or after hours). Coordinate with all downstream team owners. Have a rollback plan ready.";
  } else if (riskScore >= 40) {
    recommendedReleaseWindow = "Schedule during a maintenance window. Notify downstream teams 48 hours in advance.";
  } else if (riskScore >= 20) {
    recommendedReleaseWindow = "Can be deployed during business hours with notification to downstream teams.";
  }

  const isBreaking = breakingChanges.length > 0;
  const summary = isBreaking
    ? `This change is BREAKING with a risk score of ${riskScore}/100. ${breakingChanges.length} breaking change(s) detected affecting ${impactedAssets.length} downstream asset(s) across ${affectedTeams.length} team(s). Full coordination required before deployment.`
    : `This change is NON-BREAKING with a risk score of ${riskScore}/100. ${warningChanges.length} warning(s) and ${nonBreakingChanges.length} informational change(s) detected. Safe to proceed with contract update.`;

  return {
    changeRequestId,
    datasetName,
    whatChanged,
    isBreaking,
    breakingCount: breakingChanges.length,
    warningCount: warningChanges.length,
    nonBreakingCount: nonBreakingChanges.length,
    affectedSystems,
    affectedDashboards,
    affectedTeams,
    requiredActions,
    migrationStrategy,
    riskScore,
    recommendedReleaseWindow,
    summary,
  };
}
