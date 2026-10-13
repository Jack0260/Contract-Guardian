import { useState, useCallback, useRef, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeverityBadge } from "@/components/shared/badges";
import { csvParse, jsonParse } from "@/lib/csv-parser";
import { profileColumn } from "@/lib/pii-detector";
import { diffSchema, classifyOverall, issuesToSchemaChanges } from "@/lib/validation-engine";
import { getImpactedAssets } from "@/lib/impact-analysis";
import { FIELD_TYPE_LABELS, CHANGE_TYPE_LABELS, type DataProfile, type ColumnProfile, type Severity, type ValidationIssue } from "@/lib/types";
import { toast } from "sonner";
import type { PageId } from "@/components/shared/sidebar";
import {
  Upload, FileUp, CheckCircle2, XCircle, AlertCircle,
  ArrowRight, Loader2, FileJson, Table, ShieldAlert, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onNavigate: (page: PageId) => void;
}

type Stage = "select" | "profiling" | "profiled" | "validating" | "validated";

export function UploadPage({ onNavigate }: Props) {
  const { datasets, contracts, downstreamAssets, lineageEdges, teams, addValidationRun, addSchemaChanges, currentUser, createChangeRequest } = useStore();
  const [stage, setStage] = useState<Stage>("select");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<"csv" | "json">("csv");
  const [datasetId, setDatasetId] = useState("");
  const [profile, setProfile] = useState<DataProfile | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [validationSummary, setValidationSummary] = useState<{ hasBreaking: boolean; hasWarning: boolean; breakingCount: number; warningCount: number; nonBreakingCount: number } | null>(null);
  const [selectedContract, setSelectedContract] = useState<string>("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeContract = useMemo(() => {
    if (!datasetId) return null;
    return contracts.find((c) => c.datasetId === datasetId && c.status === "active") || null;
  }, [datasetId, contracts]);

  const handleFile = useCallback((file: File) => {
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setError("Could not read file");
        return;
      }
      setFileName(file.name);
      const isJson = file.name.endsWith(".json");
      setFileType(isJson ? "json" : "csv");

      try {
        setStage("profiling");
        const { headers, rows } = isJson ? jsonParse(text) : csvParse(text);

        if (headers.length === 0 || rows.length === 0) {
          setError("File appears to be empty");
          setStage("select");
          return;
        }

        const columns: ColumnProfile[] = headers.map((header, colIdx) => {
          const values = rows.map((row) => row[colIdx] || "");
          return profileColumn(header, values, rows.length);
        });

        const dataProfile: DataProfile = {
          rowCount: rows.length,
          columnCount: headers.length,
          columns,
        };

        setTimeout(() => {
          setProfile(dataProfile);
          setStage("profiled");
          toast.success(`Profiled ${headers.length} columns and ${rows.length} rows`);
        }, 600);
      } catch (err) {
        setError(`Failed to parse file: ${err instanceof Error ? err.message : "Unknown error"}`);
        setStage("select");
      }
    };
    reader.onerror = () => { setError("Failed to read file"); setStage("select"); };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const runValidation = useCallback(() => {
    if (!profile || !activeContract) {
      toast.error("No active contract found for this dataset");
      return;
    }
    setStage("validating");

    setTimeout(() => {
      const result = diffSchema(activeContract, profile);
      const summary = classifyOverall(result.issues);
      setValidationIssues(result.issues);
      setValidationSummary(summary);

      const impacted = getImpactedAssets(datasetId, downstreamAssets, lineageEdges);
      const impactedAssetNames = impacted.map((a) => ({ name: a.name, type: a.type }));

      const schemaChanges = issuesToSchemaChanges(
        result.issues,
        datasetId,
        activeContract.id,
        currentUser?.name || "System",
        impactedAssetNames
      );

      if (schemaChanges.length > 0) {
        addSchemaChanges(schemaChanges);
      }

      const status = summary.hasBreaking ? "failed" : summary.hasWarning ? "warning" : "passed";

      addValidationRun({
        datasetId,
        contractId: activeContract.id,
        status,
        issues: result.issues,
        rowCount: profile.rowCount,
        passedChecks: result.issues.length === 0 ? 8 : Math.max(0, 8 - summary.breakingCount - summary.warningCount),
        failedChecks: summary.breakingCount,
        warningChecks: summary.warningCount,
        triggeredBy: currentUser?.name || "System",
      });

      setStage("validated");

      if (status === "passed") {
        toast.success("Validation passed — data is compliant with the contract");
      } else if (status === "warning") {
        toast.warning("Validation completed with warnings");
      } else {
        toast.error("Validation failed — breaking changes detected");
      }
    }, 800);
  }, [profile, activeContract, datasetId, downstreamAssets, lineageEdges, currentUser, addSchemaChanges, addValidationRun]);

  const handleReset = () => {
    setStage("select");
    setProfile(null);
    setValidationIssues([]);
    setValidationSummary(null);
    setFileName("");
    setDatasetId("");
    setSelectedContract("");
    setError("");
  };

  const createCR = () => {
    if (!activeContract || !validationSummary) return;
    const impacted = getImpactedAssets(datasetId, downstreamAssets, lineageEdges);
    const schemaChanges = issuesToSchemaChanges(
      validationIssues,
      datasetId,
      activeContract.id,
      currentUser?.name || "System",
      impacted.map((a) => ({ name: a.name, type: a.type }))
    );
    const ds = datasets.find((d) => d.id === datasetId);
    createChangeRequest({
      title: `Schema changes detected in ${ds?.name || "dataset"} upload`,
      description: `Auto-generated from validation of ${fileName}. ${validationSummary.breakingCount} breaking, ${validationSummary.warningCount} warning, ${validationSummary.nonBreakingCount} non-breaking changes.`,
      datasetId,
      contractId: activeContract.id,
      status: "draft",
      proposedBy: currentUser?.id || "system",
      schemaChanges,
      impactedAssets: impacted.map((a) => a.id),
      riskScore: 50,
    });
    toast.success("Change request created from validation results");
    onNavigate("change-requests");
  };

  return (
    <div className="space-y-4 max-w-5xl">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Upload */}
      {stage === "select" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Data for Validation</CardTitle>
            <CardDescription>Upload a CSV or JSON file to profile columns and validate against a data contract</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-12 text-center transition-colors hover:border-primary/50 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") fileInputRef.current?.click(); }}
              aria-label="Upload file"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium">Drop your file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Supports CSV and JSON files up to 10MB</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              aria-label="File input"
            />
          </CardContent>
        </Card>
      )}

      {/* Step 1b: Select dataset */}
      {stage === "profiling" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Profiling columns and detecting PII...</p>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Profile + Select dataset */}
      {stage === "profiled" && profile && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {fileType === "csv" ? <Table className="h-4 w-4" /> : <FileJson className="h-4 w-4" />}
                    {fileName}
                  </CardTitle>
                  <CardDescription>{profile.rowCount} rows, {profile.columnCount} columns</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Reset
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select dataset to validate against</Label>
                <Select value={datasetId} onValueChange={(v) => { setDatasetId(v); setSelectedContract(v); }}>
                  <SelectTrigger aria-label="Select dataset"><SelectValue placeholder="Choose a dataset" /></SelectTrigger>
                  <SelectContent>
                    {datasets.map((d) => {
                      const hasActive = contracts.some((c) => c.datasetId === d.id && c.status === "active");
                      return (
                        <SelectItem key={d.id} value={d.id} disabled={!hasActive}>
                          {d.name} {hasActive ? "" : "(no active contract)"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {activeContract && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="success" className="text-[10px]">Active Contract v{activeContract.version}</Badge>
                    <span className="text-xs text-muted-foreground">{activeContract.schemaFields.length} fields, {activeContract.classification}</span>
                  </div>
                )}
              </div>

              <Button onClick={runValidation} disabled={!activeContract}>
                <ShieldAlert className="h-4 w-4 mr-1" /> Validate Against Contract
              </Button>
            </CardContent>
          </Card>

          {/* Profiling Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Column Profiling Results</CardTitle>
              <CardDescription>Automatically inferred types, null rates, uniqueness, and PII detection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Column</th>
                      <th className="pb-2 pr-3 font-medium">Type</th>
                      <th className="pb-2 pr-3 font-medium">Null %</th>
                      <th className="pb-2 pr-3 font-medium">Unique</th>
                      <th className="pb-2 pr-3 font-medium">Min</th>
                      <th className="pb-2 pr-3 font-medium">Max</th>
                      <th className="pb-2 pr-3 font-medium">PII</th>
                      <th className="pb-2 font-medium">Samples</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.columns.map((col) => (
                      <tr key={col.name} className="border-b border-border/50">
                        <td className="py-2 pr-3 font-medium">{col.name}</td>
                        <td className="py-2 pr-3"><Badge variant="outline" className="text-[10px]">{FIELD_TYPE_LABELS[col.inferredType]}</Badge></td>
                        <td className="py-2 pr-3">
                          <span className={cn(col.nullPercentage > 20 ? "text-warning font-medium" : "")}>{col.nullPercentage}%</span>
                        </td>
                        <td className="py-2 pr-3">{col.uniqueCount}</td>
                        <td className="py-2 pr-3 text-muted-foreground truncate max-w-[80px]">{col.minValue}</td>
                        <td className="py-2 pr-3 text-muted-foreground truncate max-w-[80px]">{col.maxValue}</td>
                        <td className="py-2 pr-3">
                          {col.isLikelyPII ? (
                            <Badge variant="destructive" className="text-[10px]">{col.piiType}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 text-muted-foreground truncate max-w-[120px]">{col.sampleValues.slice(0, 2).join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Step 3: Validation Results */}
      {(stage === "validating" || stage === "validated") && (
        <>
          {stage === "validating" && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Validating against contract...</p>
              </CardContent>
            </Card>
          )}

          {stage === "validated" && validationSummary && (
            <>
              {/* Summary Card */}
              <Card className={cn(
                "border-2",
                validationSummary.hasBreaking ? "border-destructive/50" : validationSummary.hasWarning ? "border-warning/50" : "border-success/50"
              )}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {validationSummary.hasBreaking ? (
                      <XCircle className="h-12 w-12 text-destructive" />
                    ) : validationSummary.hasWarning ? (
                      <AlertCircle className="h-12 w-12 text-warning" />
                    ) : (
                      <CheckCircle2 className="h-12 w-12 text-success" />
                    )}
                    <div>
                      <h2 className="text-lg font-bold">
                        {validationSummary.hasBreaking ? "Data Ingestion Blocked" : validationSummary.hasWarning ? "Validation Passed with Warnings" : "Validation Passed"}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {validationSummary.breakingCount} breaking, {validationSummary.warningCount} warning, {validationSummary.nonBreakingCount} non-breaking changes detected
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    {validationSummary.hasBreaking && (
                      <Button variant="destructive" size="sm" onClick={createCR}>
                        Create Change Request <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleReset}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Validate Another File
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Issue Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Detected Changes & Issues</CardTitle>
                  <CardDescription>Plain-English explanations of why each change matters</CardDescription>
                </CardHeader>
                <CardContent>
                  {validationIssues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-8">
                      <CheckCircle2 className="h-8 w-8 text-success" />
                      <p className="text-sm font-medium">No issues detected</p>
                      <p className="text-xs text-muted-foreground">The uploaded data fully complies with the contract.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {validationIssues.map((issue, i) => (
                        <div
                          key={i}
                          className={cn(
                            "rounded-lg border p-3",
                            issue.severity === "breaking" ? "border-destructive/30 bg-destructive/5" :
                            issue.severity === "warning" ? "border-warning/30 bg-warning/5" :
                            "border-border"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{issue.fieldName}</span>
                                <Badge variant="outline" className="text-[10px]">{CHANGE_TYPE_LABELS[issue.changeType as keyof typeof CHANGE_TYPE_LABELS] || issue.changeType}</Badge>
                                <SeverityBadge severity={issue.severity} />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{issue.message}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Expected: <span className="font-mono">{issue.expected}</span> → Actual: <span className="font-mono">{issue.actual}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}


