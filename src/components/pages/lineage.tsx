import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/common";
import { ASSET_TYPE_LABELS, ENVIRONMENT_LABELS, CRITICALITY_LABELS, type DownstreamAsset } from "@/lib/types";
import { getImpactedAssets, calculateImpactScore } from "@/lib/impact-analysis";
import {
  GitBranch, Database, ArrowRight, Users, AlertTriangle,
  XCircle, AlertCircle, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ASSET_ICONS: Record<string, React.ReactNode> = {
  source: <Database className="h-4 w-4" />,
  transformation: <GitBranch className="h-4 w-4" />,
  warehouse: <Database className="h-4 w-4" />,
  dashboard: <Database className="h-4 w-4" />,
  ml_feature: <Database className="h-4 w-4" />,
  api: <Database className="h-4 w-4" />,
};

const ASSET_COLORS: Record<string, string> = {
  source: "bg-chart-1",
  transformation: "bg-chart-2",
  warehouse: "bg-chart-3",
  dashboard: "bg-chart-4",
  ml_feature: "bg-chart-5",
  api: "bg-primary",
};

export function LineagePage() {
  const { datasets, downstreamAssets, lineageEdges, teams, schemaChanges, contracts } = useStore();
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [selectedAsset, setSelectedAsset] = useState<DownstreamAsset | null>(null);

  const impactedAssets = useMemo(() => {
    if (!selectedDatasetId) return [];
    return getImpactedAssets(selectedDatasetId, downstreamAssets, lineageEdges);
  }, [selectedDatasetId, downstreamAssets, lineageEdges]);

  const datasetChanges = useMemo(() => {
    if (!selectedDatasetId) return [];
    return schemaChanges.filter((s) => s.datasetId === selectedDatasetId);
  }, [selectedDatasetId, schemaChanges]);

  const riskScore = useMemo(() => {
    if (impactedAssets.length === 0 || datasetChanges.length === 0) return 0;
    return calculateImpactScore(impactedAssets, datasetChanges);
  }, [impactedAssets, datasetChanges]);

  const affectedTeams = useMemo(() => {
    return Array.from(new Set(impactedAssets.map((a) => teams.find((t) => t.id === a.teamId)?.name).filter(Boolean) as string[]));
  }, [impactedAssets, teams]);

  const breakingCount = datasetChanges.filter((c) => c.severity === "breaking").length;

  // Build lineage layers
  const lineageLayers = useMemo(() => {
    if (!selectedDatasetId) return [];
    const direct = downstreamAssets.filter((a) => a.datasetId === selectedDatasetId);
    const visited = new Set(direct.map((a) => a.id));
    const layers: DownstreamAsset[][] = [direct];

    let current = direct;
    while (current.length > 0) {
      const next: DownstreamAsset[] = [];
      for (const asset of current) {
        const edges = lineageEdges.filter((e) => e.fromAssetId === asset.id);
        for (const edge of edges) {
          const nextAsset = downstreamAssets.find((a) => a.id === edge.toAssetId);
          if (nextAsset && !visited.has(nextAsset.id)) {
            visited.add(nextAsset.id);
            next.push(nextAsset);
          }
        }
      }
      if (next.length > 0) layers.push(next);
      current = next;
    }
    return layers;
  }, [selectedDatasetId, downstreamAssets, lineageEdges]);

  const hasIssues = breakingCount > 0;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={selectedDatasetId} onValueChange={(v) => { setSelectedDatasetId(v); setSelectedAsset(null); }}>
          <SelectTrigger className="w-[280px]" aria-label="Select dataset for lineage">
            <SelectValue placeholder="Select a dataset to trace lineage" />
          </SelectTrigger>
          <SelectContent>
            {datasets.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {selectedDatasetId && (
          <div className="flex gap-2">
            <Badge variant={hasIssues ? "destructive" : "success"} className="text-xs">
              {hasIssues ? `${breakingCount} breaking changes` : "No breaking changes"}
            </Badge>
            {impactedAssets.length > 0 && (
              <Badge variant="outline" className="text-xs">
                Risk Score: {riskScore}/100
              </Badge>
            )}
          </div>
        )}
      </div>

      {!selectedDatasetId ? (
        <EmptyState
          icon={<GitBranch className="h-6 w-6" />}
          title="Select a dataset to view lineage"
          description="Choose a dataset above to see its downstream impact graph, affected assets, and risk score."
          className="py-16"
        />
      ) : (
        <>
          {/* Impact Summary */}
          {impactedAssets.length > 0 && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Affected Assets</span>
                    <AlertTriangle className={cn("h-4 w-4", hasIssues ? "text-destructive" : "text-muted-foreground")} />
                  </div>
                  <p className="text-2xl font-bold mt-1">{impactedAssets.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Affected Teams</span>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold mt-1">{affectedTeams.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Breaking Changes</span>
                    <XCircle className={cn("h-4 w-4", breakingCount > 0 ? "text-destructive" : "text-muted-foreground")} />
                  </div>
                  <p className="text-2xl font-bold mt-1">{breakingCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Risk Score</span>
                    <AlertCircle className={cn("h-4 w-4", riskScore >= 70 ? "text-destructive" : riskScore >= 40 ? "text-warning" : "text-success")} />
                  </div>
                  <p className={cn("text-2xl font-bold mt-1", riskScore >= 70 ? "text-destructive" : riskScore >= 40 ? "text-warning" : "text-success")}>
                    {riskScore}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Lineage Graph */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Data Lineage Graph</CardTitle>
              <CardDescription>Flow from source dataset through transformations to consumers</CardDescription>
            </CardHeader>
            <CardContent>
              {lineageLayers.length === 0 ? (
                <EmptyState title="No downstream assets" description="This dataset has no registered downstream dependencies." className="py-8" />
              ) : (
                <div className="space-y-4 overflow-x-auto">
                  {lineageLayers.map((layer, layerIdx) => (
                    <div key={layerIdx} className="flex flex-col gap-2">
                      {layerIdx > 0 && (
                        <div className="flex justify-center py-1">
                          <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {layer.map((asset) => {
                          const hasBreaking = datasetChanges.some((c) => c.severity === "breaking" && asset.dependentFields.includes(c.fieldName));
                          const hasWarning = datasetChanges.some((c) => c.severity === "warning" && asset.dependentFields.includes(c.fieldName));
                          const healthColor = hasBreaking ? "border-destructive/50 bg-destructive/5" : hasWarning ? "border-warning/50 bg-warning/5" : "border-border";
                          return (
                            <div
                              key={asset.id}
                              className={cn(
                                "rounded-lg border-2 p-3 min-w-[200px] max-w-[280px] cursor-pointer transition-all hover:shadow-md",
                                healthColor,
                                selectedAsset?.id === asset.id && "ring-2 ring-primary"
                              )}
                              onClick={() => setSelectedAsset(asset)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => { if (e.key === "Enter") setSelectedAsset(asset); }}
                              aria-label={`${asset.name} - ${ASSET_TYPE_LABELS[asset.type]}`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn("flex h-6 w-6 items-center justify-center rounded text-white text-xs", ASSET_COLORS[asset.type])}>
                                  {ASSET_ICONS[asset.type]}
                                </div>
                                <span className="text-xs font-medium truncate">{asset.name}</span>
                              </div>
                              <div className="flex items-center gap-1 mt-2 flex-wrap">
                                <Badge variant="outline" className="text-[10px]">{ASSET_TYPE_LABELS[asset.type]}</Badge>
                                <Badge variant={asset.criticality === "critical" ? "destructive" : asset.criticality === "high" ? "warning" : "secondary"} className="text-[10px]">
                                  {CRITICALITY_LABELS[asset.criticality]}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                {hasBreaking && <XCircle className="h-3 w-3 text-destructive" />}
                                {hasWarning && <AlertCircle className="h-3 w-3 text-warning" />}
                                {!hasBreaking && !hasWarning && <CheckCircle2 className="h-3 w-3 text-success" />}
                                <span className="text-[10px] text-muted-foreground">{asset.owner}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Asset Detail Panel */}
          {selectedAsset && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{selectedAsset.name}</CardTitle>
                <CardDescription>{ASSET_TYPE_LABELS[selectedAsset.type]} - {selectedAsset.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Owner</p>
                    <p className="text-sm font-medium">{selectedAsset.owner}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Team</p>
                    <p className="text-sm font-medium">{teams.find((t) => t.id === selectedAsset.teamId)?.name || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Environment</p>
                    <p className="text-sm font-medium">{ENVIRONMENT_LABELS[selectedAsset.environment]}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Criticality</p>
                    <Badge variant={selectedAsset.criticality === "critical" ? "destructive" : selectedAsset.criticality === "high" ? "warning" : "secondary"} className="text-[10px]">
                      {CRITICALITY_LABELS[selectedAsset.criticality]}
                    </Badge>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Dependent Fields</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedAsset.dependentFields.map((f) => {
                      const hasIssue = datasetChanges.some((c) => c.fieldName === f);
                      return (
                        <Badge
                          key={f}
                          variant={hasIssue ? "destructive" : "outline"}
                          className="text-[10px]"
                        >
                          {f}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Affected fields detail */}
          {datasetChanges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Schema Changes Affecting Lineage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {datasetChanges.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                      <Badge variant={c.severity === "breaking" ? "destructive" : c.severity === "warning" ? "warning" : "success"} className="text-[10px]">
                        {c.severity.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs font-medium">{c.fieldName}</span>
                      <span className="text-xs text-muted-foreground truncate">{c.description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
