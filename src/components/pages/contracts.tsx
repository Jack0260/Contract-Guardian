import { useState, useMemo, useCallback } from "react";
import { useStore, canCreate, canEdit } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination, EmptyState, LoadingState } from "@/components/shared/common";
import { ClassificationBadge } from "@/components/shared/badges";
import { FIELD_TYPE_LABELS, CLASSIFICATION_LABELS, type FieldType, type Classification, type SchemaField, type DataContract } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/format";
import { toast } from "sonner";
import {
  Plus, Search, FileCheck2, ArrowLeft, Trash2, Save,
  Key, AlertCircle, FileText, Tag, Clock, Percent, Hash, Type, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

function emptyField(name = ""): SchemaField {
  return {
    id: `sf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    dataType: "string",
    required: false,
    isPrimaryKey: false,
    enumValues: [],
    nullRateThreshold: 5,
    numericMin: null,
    numericMax: null,
    regexPattern: "",
    description: "",
  };
}

export function ContractsPage() {
  const { contracts, datasets, teams, currentUser, createContract, updateContract, deleteContract } = useStore();
  const [view, setView] = useState<"list" | "detail" | "editor">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [classificationFilter, setClassificationFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [loading] = useState(false);

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      const ds = datasets.find((d) => d.id === c.datasetId);
      const matchesSearch = !search ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        ds?.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      const matchesClass = classificationFilter === "all" || c.classification === classificationFilter;
      return matchesSearch && matchesStatus && matchesClass;
    });
  }, [contracts, datasets, search, statusFilter, classificationFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openDetail = (id: string) => {
    setSelectedId(id);
    setView("detail");
  };

  const openEditor = () => {
    setSelectedId(null);
    setView("editor");
  };

  const selectedContract = selectedId ? contracts.find((c) => c.id === selectedId) : null;

  if (view === "detail" && selectedContract) {
    return <ContractDetail contract={selectedContract} onBack={() => setView("list")} onEdit={() => setView("editor")} />;
  }

  if (view === "editor") {
    return (
      <ContractEditor
        contract={selectedId ? contracts.find((c) => c.id === selectedId) || null : null}
        onBack={() => setView(selectedId ? "detail" : "list")}
        onSave={(data) => {
          if (selectedId) {
            updateContract(selectedId, data);
            toast.success("Contract updated successfully");
          } else {
            createContract(data);
            toast.success("Contract created successfully");
          }
          setView("list");
        }}
        canEdit={canEdit(currentUser?.role)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contracts..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-8"
              aria-label="Search contracts"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={classificationFilter} onValueChange={(v) => { setClassificationFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]" aria-label="Filter by classification">
              <SelectValue placeholder="Classification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classifications</SelectItem>
              {Object.entries(CLASSIFICATION_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canCreate(currentUser?.role) && (
          <Button onClick={openEditor} size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Contract
          </Button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <LoadingState />
      ) : paged.length === 0 ? (
        <EmptyState
          icon={<FileCheck2 className="h-6 w-6" />}
          title="No contracts found"
          description="Try adjusting your filters or create a new contract."
          action={canCreate(currentUser?.role) ? { label: "Create Contract", onClick: openEditor } : undefined}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {paged.map((contract) => {
            const ds = datasets.find((d) => d.id === contract.datasetId);
            const team = teams.find((t) => t.id === ds?.teamId);
            return (
              <Card
                key={contract.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => openDetail(contract.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") openDetail(contract.id); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{ds?.name || "Unknown dataset"}</span>
                        <Badge variant="secondary" className="text-[10px]">v{contract.version}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{contract.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <ClassificationBadge classification={contract.classification} />
                        <Badge variant={contract.status === "active" ? "success" : contract.status === "deprecated" ? "secondary" : "outline"} className="text-[10px]">
                          {contract.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{contract.schemaFields.length} fields</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{team?.name}</span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(contract.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
  );
}

function ContractDetail({ contract, onBack, onEdit }: { contract: DataContract; onBack: () => void; onEdit: () => void }) {
  const { datasets, teams, validationRuns, currentUser, deleteContract } = useStore();
  const [showDelete, setShowDelete] = useState(false);
  const ds = datasets.find((d) => d.id === contract.datasetId);
  const team = teams.find((t) => t.id === ds?.teamId);
  const contractRuns = validationRuns.filter((r) => r.contractId === contract.id);
  const passedRuns = contractRuns.filter((r) => r.status === "passed").length;
  const totalRuns = contractRuns.length;
  const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Contracts
        </Button>
        <div className="flex gap-2">
          {canEdit(currentUser?.role) && <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>}
          {canEdit(currentUser?.role) && (
            <Button size="sm" variant="destructive" onClick={() => setShowDelete(true)}>
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{ds?.name || "Unknown"} - Contract v{contract.version}</CardTitle>
            <ClassificationBadge classification={contract.classification} />
            <Badge variant={contract.status === "active" ? "success" : "secondary"}>{contract.status}</Badge>
          </div>
          <CardDescription>{contract.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Team</p>
              <p className="text-sm font-medium">{team?.name || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Freshness SLA</p>
              <p className="text-sm font-medium">{contract.freshnessSlaHours}h</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Volume Threshold</p>
              <p className="text-sm font-medium">{contract.volumeThresholdPercent}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Validation Pass Rate</p>
              <p className="text-sm font-medium">{passRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="fields">
        <TabsList>
          <TabsTrigger value="fields">Schema Fields ({contract.schemaFields.length})</TabsTrigger>
          <TabsTrigger value="rules">Rules ({contract.rules.length})</TabsTrigger>
          <TabsTrigger value="history">Validation History</TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="space-y-2">
          {contract.schemaFields.map((field) => (
            <Card key={field.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{field.name}</span>
                      <Badge variant="outline" className="text-[10px]">{FIELD_TYPE_LABELS[field.dataType]}</Badge>
                      {field.required && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                      {field.isPrimaryKey && <Badge variant="default" className="text-[10px]"><Key className="h-2.5 w-2.5 mr-0.5" />PK</Badge>}
                      {field.enumValues.length > 0 && <Badge variant="secondary" className="text-[10px]">Enum: {field.enumValues.length}</Badge>}
                    </div>
                    {field.description && <p className="text-xs text-muted-foreground mt-1">{field.description}</p>}
                    <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span>Null threshold: {field.nullRateThreshold}%</span>
                      {field.numericMin !== null && <span>Min: {field.numericMin}</span>}
                      {field.numericMax !== null && <span>Max: {field.numericMax}</span>}
                      {field.regexPattern && <span>Regex: {field.regexPattern}</span>}
                    </div>
                    {field.enumValues.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {field.enumValues.map((v) => (
                          <Badge key={v} variant="outline" className="text-[10px]">{v}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="rules">
          {contract.rules.length === 0 ? (
            <EmptyState title="No custom rules" description="Rules are auto-generated from field constraints." className="py-8" />
          ) : (
            <div className="space-y-2">
              {contract.rules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{rule.type}</Badge>
                      <span className="text-sm">{rule.description}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {contractRuns.length === 0 ? (
            <EmptyState title="No validation runs" description="Upload data to validate against this contract." className="py-8" />
          ) : (
            <div className="space-y-2">
              {contractRuns.slice(0, 10).map((run) => (
                <Card key={run.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">{run.status.toUpperCase()}</span>
                      <p className="text-xs text-muted-foreground">
                        {run.passedChecks} passed, {run.failedChecks} failed, {run.warningChecks} warnings - {formatDate(run.createdAt)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{run.triggeredBy}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contract?</DialogTitle>
            <DialogDescription>This action cannot be undone. The contract and all its rules will be permanently removed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { deleteContract(contract.id); toast.success("Contract deleted"); onBack(); }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContractEditor({
  contract, onBack, onSave, canEdit: canEditProp,
}: {
  contract: DataContract | null;
  onBack: () => void;
  onSave: (data: Omit<DataContract, "id" | "createdAt" | "version">) => void;
  canEdit: boolean;
}) {
  const { datasets, contracts, currentUser } = useStore();
  const [datasetId, setDatasetId] = useState(contract?.datasetId || "");
  const [description, setDescription] = useState(contract?.description || "");
  const [classification, setClassification] = useState<Classification>(contract?.classification || "internal");
  const [freshnessSla, setFreshnessSla] = useState(contract?.freshnessSlaHours || 24);
  const [volumeThreshold, setVolumeThreshold] = useState(contract?.volumeThresholdPercent || 20);
  const [fields, setFields] = useState<SchemaField[]>(contract?.schemaFields || [emptyField()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const activeContractForDataset = useMemo(() => {
    if (!datasetId) return null;
    return contracts.find((c) => c.datasetId === datasetId && c.status === "active");
  }, [datasetId, contracts]);

  const addField = useCallback(() => {
    setFields((prev) => [...prev, emptyField()]);
  }, []);

  const updateField = useCallback((idx: number, updates: Partial<SchemaField>) => {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...updates } : f)));
  }, []);

  const removeField = useCallback((idx: number) => {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const importFromContract = useCallback(() => {
    if (activeContractForDataset) {
      setFields(activeContractForDataset.schemaFields.map((f) => ({ ...f, id: `sf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` })));
      setClassification(activeContractForDataset.classification);
      setFreshnessSla(activeContractForDataset.freshnessSlaHours);
      setVolumeThreshold(activeContractForDataset.volumeThresholdPercent);
      toast.success("Imported schema from active contract");
    }
  }, [activeContractForDataset]);

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!datasetId) newErrors.datasetId = "Please select a dataset";
    if (!description.trim()) newErrors.description = "Description is required";
    if (fields.length === 0) newErrors.fields = "At least one field is required";
    fields.forEach((f, i) => {
      if (!f.name.trim()) newErrors[`field_${i}`] = "Field name is required";
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fix the errors before saving");
      return;
    }

    onSave({
      datasetId,
      description,
      classification,
      freshnessSlaHours: freshnessSla,
      volumeThresholdPercent: volumeThreshold,
      schemaFields: fields,
      rules: fields.filter((f) => f.isPrimaryKey).map((f) => ({
        id: `rule_${Date.now()}_${f.name}`,
        type: "primary_key",
        field: f.name,
        value: "unique",
        description: `${f.name} must be unique`,
      })),
      status: "draft",
      createdBy: currentUser?.id || "system",
      activatedAt: null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!canEditProp}>
          <Save className="h-4 w-4 mr-1" /> Save Contract
        </Button>
      </div>

      {/* Contract metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{contract ? "Edit Contract" : "New Data Contract"}</CardTitle>
          <CardDescription>Define the schema, rules, and quality thresholds for a dataset</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dataset">Dataset</Label>
              <Select value={datasetId} onValueChange={setDatasetId} disabled={!canEditProp}>
                <SelectTrigger id="dataset" aria-label="Select dataset">
                  <SelectValue placeholder="Select a dataset" />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.datasetId && <p className="text-xs text-destructive">{errors.datasetId}</p>}
              {activeContractForDataset && activeContractForDataset.id !== contract?.id && (
                <Button size="sm" variant="outline" onClick={importFromContract} className="mt-1">
                  <FileText className="h-3 w-3 mr-1" /> Import schema from active contract (v{activeContractForDataset.version})
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="classification">Data Classification</Label>
              <Select value={classification} onValueChange={(v) => setClassification(v as Classification)} disabled={!canEditProp}>
                <SelectTrigger id="classification" aria-label="Select classification">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CLASSIFICATION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose and scope of this contract..."
              disabled={!canEditProp}
              rows={2}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Freshness SLA: {freshnessSla}h
              </Label>
              <Slider
                value={[freshnessSla]}
                min={1}
                max={168}
                step={1}
                onValueChange={(v) => setFreshnessSla(v[0])}
                disabled={!canEditProp}
                aria-label="Freshness SLA in hours"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Percent className="h-3 w-3" /> Volume Change Threshold: {volumeThreshold}%
              </Label>
              <Slider
                value={[volumeThreshold]}
                min={5}
                max={100}
                step={5}
                onValueChange={(v) => setVolumeThreshold(v[0])}
                disabled={!canEditProp}
                aria-label="Volume change threshold percentage"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schema fields editor */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Schema Fields</CardTitle>
            <CardDescription>Define each field's type, constraints, and validation rules</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={addField} disabled={!canEditProp}>
            <Plus className="h-4 w-4 mr-1" /> Add Field
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.length === 0 && (
            <EmptyState title="No fields defined" description="Add at least one field to define the contract schema." className="py-8" />
          )}
          {fields.map((field, idx) => (
            <FieldEditor
              key={field.id}
              field={field}
              idx={idx}
              canEdit={canEditProp}
              onChange={(updates) => updateField(idx, updates)}
              onRemove={() => removeField(idx)}
              error={errors[`field_${idx}`]}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function FieldEditor({
  field, idx, canEdit, onChange, onRemove, error,
}: {
  field: SchemaField;
  idx: number;
  canEdit: boolean;
  onChange: (updates: Partial<SchemaField>) => void;
  onRemove: () => void;
  error?: string;
}) {
  const [enumInput, setEnumInput] = useState("");

  const addEnumValue = () => {
    const val = enumInput.trim();
    if (val && !field.enumValues.includes(val)) {
      onChange({ enumValues: [...field.enumValues, val] });
      setEnumInput("");
    }
  };

  const isNumeric = field.dataType === "integer" || field.dataType === "float";

  return (
    <div className="rounded-lg border border-border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Field {idx + 1}</span>
        {canEdit && (
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onRemove} aria-label="Remove field">
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={`name-${idx}`} className="text-xs">Field Name</Label>
          <Input
            id={`name-${idx}`}
            value={field.name}
            onChange={(e) => onChange({ name: e.target.value })}
            disabled={!canEdit}
            placeholder="column_name"
            aria-invalid={!!error}
          />
          {error && <p className="text-[10px] text-destructive">{error}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`type-${idx}`} className="text-xs">Data Type</Label>
          <Select value={field.dataType} onValueChange={(v) => onChange({ dataType: v as FieldType })} disabled={!canEdit}>
            <SelectTrigger id={`type-${idx}`} aria-label="Field data type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FIELD_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`desc-${idx}`} className="text-xs">Description</Label>
          <Input
            id={`desc-${idx}`}
            value={field.description}
            onChange={(e) => onChange({ description: e.target.value })}
            disabled={!canEdit}
            placeholder="What this field means"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`required-${idx}`}
            checked={field.required}
            onCheckedChange={(v) => onChange({ required: v === true })}
            disabled={!canEdit}
          />
          <Label htmlFor={`required-${idx}`} className="text-xs flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Required
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`pk-${idx}`}
            checked={field.isPrimaryKey}
            onCheckedChange={(v) => onChange({ isPrimaryKey: v === true })}
            disabled={!canEdit}
          />
          <Label htmlFor={`pk-${idx}`} className="text-xs flex items-center gap-1">
            <Key className="h-3 w-3" /> Primary Key
          </Label>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <Hash className="h-3 w-3" /> Null Rate Threshold: {field.nullRateThreshold}%
          </Label>
          <Slider
            value={[field.nullRateThreshold]}
            min={0}
            max={100}
            step={1}
            onValueChange={(v) => onChange({ nullRateThreshold: v[0] })}
            disabled={!canEdit}
            aria-label="Null rate threshold"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`regex-${idx}`} className="text-xs flex items-center gap-1">
            <Type className="h-3 w-3" /> Regex Pattern (optional)
          </Label>
          <Input
            id={`regex-${idx}`}
            value={field.regexPattern}
            onChange={(e) => onChange({ regexPattern: e.target.value })}
            disabled={!canEdit}
            placeholder="^[a-z]+@[a-z]+\\.[a-z]+$"
          />
        </div>
      </div>

      {isNumeric && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`min-${idx}`} className="text-xs">Numeric Min</Label>
            <Input
              id={`min-${idx}`}
              type="number"
              value={field.numericMin ?? ""}
              onChange={(e) => onChange({ numericMin: e.target.value ? Number(e.target.value) : null })}
              disabled={!canEdit}
              placeholder="No minimum"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`max-${idx}`} className="text-xs">Numeric Max</Label>
            <Input
              id={`max-${idx}`}
              type="number"
              value={field.numericMax ?? ""}
              onChange={(e) => onChange({ numericMax: e.target.value ? Number(e.target.value) : null })}
              disabled={!canEdit}
              placeholder="No maximum"
            />
          </div>
        </div>
      )}

      {field.dataType === "enum" && (
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Tag className="h-3 w-3" /> Allowed Enum Values
          </Label>
          <div className="flex gap-2">
            <Input
              value={enumInput}
              onChange={(e) => setEnumInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEnumValue(); } }}
              disabled={!canEdit}
              placeholder="Type a value and press Enter"
            />
            <Button size="sm" variant="outline" onClick={addEnumValue} disabled={!canEdit}>Add</Button>
          </div>
          {field.enumValues.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {field.enumValues.map((v) => (
                <Badge key={v} variant="secondary" className="text-[10px] gap-1">
                  {v}
                  {canEdit && (
                    <button
                      onClick={() => onChange({ enumValues: field.enumValues.filter((x) => x !== v) })}
                      className="ml-1 hover:text-destructive"
                      aria-label={`Remove ${v}`}
                    >×</button>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
