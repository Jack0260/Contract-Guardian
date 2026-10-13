import { useState, useMemo } from "react";
import { useStore, canCreate } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination, EmptyState, LoadingState } from "@/components/shared/common";
import { ClassificationBadge } from "@/components/shared/badges";
import { CLASSIFICATION_LABELS, type Classification } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/format";
import { toast } from "sonner";
import {
  Plus, Search, Database, ArrowLeft, Trash2,
  Tag, Clock, FileCheck2, AlertTriangle, GitBranch,
} from "lucide-react";

const PAGE_SIZE = 8;

export function DatasetsPage() {
  const { datasets, dataSources, teams, contracts, validationRuns, schemaChanges, downstreamAssets, currentUser, createDataset, deleteDataset, updateDataset } = useStore();
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [loading] = useState(false);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSource, setNewSource] = useState("");
  const [newTeam, setNewTeam] = useState("");
  const [newClass, setNewClass] = useState<Classification>("internal");
  const [newSla, setNewSla] = useState(24);
  const [newVolThreshold, setNewVolThreshold] = useState(20);
  const [newTags, setNewTags] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    return datasets.filter((d) => {
      const matchesSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.description.toLowerCase().includes(search.toLowerCase());
      const matchesTeam = teamFilter === "all" || d.teamId === teamFilter;
      const matchesClass = classFilter === "all" || d.classification === classFilter;
      return matchesSearch && matchesTeam && matchesClass;
    });
  }, [datasets, search, teamFilter, classFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selected = selectedId ? datasets.find((d) => d.id === selectedId) : null;

  const handleCreate = () => {
    const errors: Record<string, string> = {};
    if (!newName.trim()) errors.name = "Name is required";
    if (!newSource) errors.source = "Source is required";
    if (!newTeam) errors.team = "Team is required";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    createDataset({
      name: newName,
      description: newDesc,
      sourceId: newSource,
      teamId: newTeam,
      classification: newClass,
      freshnessSlaHours: newSla,
      volumeThresholdPercent: newVolThreshold,
      tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    toast.success("Dataset created");
    setShowCreate(false);
    setNewName(""); setNewDesc(""); setNewSource(""); setNewTeam(""); setNewTags("");
  };

  if (view === "detail" && selected) {
    const source = dataSources.find((s) => s.id === selected.sourceId);
    const team = teams.find((t) => t.id === selected.teamId);
    const dsContracts = contracts.filter((c) => c.datasetId === selected.id);
    const activeContract = dsContracts.find((c) => c.status === "active");
    const dsRuns = validationRuns.filter((r) => r.datasetId === selected.id);
    const dsChanges = schemaChanges.filter((s) => s.datasetId === selected.id);
    const dsAssets = downstreamAssets.filter((a) => a.datasetId === selected.id);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setView("list")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Datasets
          </Button>
          {canCreate(currentUser?.role) && (
            <Button size="sm" variant="destructive" onClick={() => { deleteDataset(selected.id); toast.success("Dataset deleted"); setView("list"); }}>
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{selected.name}</CardTitle>
              <ClassificationBadge classification={selected.classification} />
            </div>
            <CardDescription>{selected.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Source</p>
                <p className="text-sm font-medium">{source?.name || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Team</p>
                <p className="text-sm font-medium">{team?.name || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Freshness SLA</p>
                <p className="text-sm font-medium">{selected.freshnessSlaHours}h</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Volume Threshold</p>
                <p className="text-sm font-medium">{selected.volumeThresholdPercent}%</p>
              </div>
            </div>
            {selected.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {selected.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px]"><Tag className="h-2.5 w-2.5 mr-0.5" />{tag}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="contracts">
          <TabsList>
            <TabsTrigger value="contracts">Contracts ({dsContracts.length})</TabsTrigger>
            <TabsTrigger value="validation">Validation Runs ({dsRuns.length})</TabsTrigger>
            <TabsTrigger value="changes">Schema Changes ({dsChanges.length})</TabsTrigger>
            <TabsTrigger value="assets">Downstream Assets ({dsAssets.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="contracts" className="space-y-2">
            {dsContracts.length === 0 ? (
              <EmptyState icon={<FileCheck2 className="h-6 w-6" />} title="No contracts" description="Create a contract for this dataset." className="py-8" />
            ) : (
              dsContracts.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">v{c.version} - {c.description}</span>
                      <p className="text-xs text-muted-foreground">{c.schemaFields.length} fields - {timeAgo(c.createdAt)}</p>
                    </div>
                    <Badge variant={c.status === "active" ? "success" : "secondary"}>{c.status}</Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="validation" className="space-y-2">
            {dsRuns.length === 0 ? (
              <EmptyState title="No validation runs" description="Upload data to run validation." className="py-8" />
            ) : (
              dsRuns.slice(0, 10).map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium uppercase">{r.status}</span>
                      <p className="text-xs text-muted-foreground">{r.passedChecks} passed, {r.failedChecks} failed - {formatDate(r.createdAt)}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{r.triggeredBy}</span>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="changes" className="space-y-2">
            {dsChanges.length === 0 ? (
              <EmptyState icon={<AlertTriangle className="h-6 w-6" />} title="No schema changes" description="No changes detected for this dataset." className="py-8" />
            ) : (
              dsChanges.slice(0, 10).map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{c.fieldName}</span>
                      <Badge variant={c.severity === "breaking" ? "destructive" : c.severity === "warning" ? "warning" : "success"} className="text-[10px]">
                        {c.severity.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(c.detectedAt)} by {c.detectedBy}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="assets" className="space-y-2">
            {dsAssets.length === 0 ? (
              <EmptyState icon={<GitBranch className="h-6 w-6" />} title="No downstream assets" description="No downstream dependencies registered." className="py-8" />
            ) : (
              dsAssets.map((a) => {
                const aTeam = teams.find((t) => t.id === a.teamId);
                return (
                  <Card key={a.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">{a.name}</span>
                          <p className="text-xs text-muted-foreground">{a.type.replace(/_/g, " ")} - {aTeam?.name}</p>
                          <p className="text-[10px] text-muted-foreground">Depends on: {a.dependentFields.join(", ")}</p>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-[10px]">{a.environment}</Badge>
                          <Badge variant={a.criticality === "critical" ? "destructive" : a.criticality === "high" ? "warning" : "secondary"} className="text-[10px]">
                            {a.criticality}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search datasets..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-8"
              aria-label="Search datasets"
            />
          </div>
          <Select value={teamFilter} onValueChange={(v) => { setTeamFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]" aria-label="Filter by team">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setPage(1); }}>
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
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Dataset
          </Button>
        )}
      </div>

      {loading ? (
        <LoadingState />
      ) : paged.length === 0 ? (
        <EmptyState
          icon={<Database className="h-6 w-6" />}
          title="No datasets found"
          description="Try adjusting your filters or create a new dataset."
          action={canCreate(currentUser?.role) ? { label: "Create Dataset", onClick: () => setShowCreate(true) } : undefined}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {paged.map((ds) => {
            const team = teams.find((t) => t.id === ds.teamId);
            const source = dataSources.find((s) => s.id === ds.sourceId);
            const activeContract = contracts.find((c) => c.datasetId === ds.id && c.status === "active");
            const assets = downstreamAssets.filter((a) => a.datasetId === ds.id);
            return (
              <Card
                key={ds.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => { setSelectedId(ds.id); setView("detail"); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") { setSelectedId(ds.id); setView("detail"); } }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold truncate">{ds.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{ds.description}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <ClassificationBadge classification={ds.classification} />
                        {activeContract && <Badge variant="success" className="text-[10px]">Contract v{activeContract.version}</Badge>}
                        <Badge variant="outline" className="text-[10px]">{assets.length} downstream</Badge>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 text-[10px] text-muted-foreground">
                      <span>{team?.name}</span>
                      <span>{source?.name}</span>
                      <span>{timeAgo(ds.updatedAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Dataset</DialogTitle>
            <DialogDescription>Register a new dataset in the catalog</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ds-name">Name</Label>
              <Input id="ds-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="dataset_name" />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-desc">Description</Label>
              <Textarea id="ds-desc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Describe this dataset..." rows={2} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={newSource} onValueChange={setNewSource}>
                  <SelectTrigger aria-label="Select source"><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {dataSources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {formErrors.source && <p className="text-xs text-destructive">{formErrors.source}</p>}
              </div>
              <div className="space-y-2">
                <Label>Team</Label>
                <Select value={newTeam} onValueChange={setNewTeam}>
                  <SelectTrigger aria-label="Select team"><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {formErrors.team && <p className="text-xs text-destructive">{formErrors.team}</p>}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Classification</Label>
                <Select value={newClass} onValueChange={(v) => setNewClass(v as Classification)}>
                  <SelectTrigger aria-label="Select classification"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CLASSIFICATION_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-sla">Freshness SLA (h)</Label>
                <Input id="ds-sla" type="number" value={newSla} onChange={(e) => setNewSla(Number(e.target.value))} min={1} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-vol">Volume Threshold (%)</Label>
                <Input id="ds-vol" type="number" value={newVolThreshold} onChange={(e) => setNewVolThreshold(Number(e.target.value))} min={5} max={100} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-tags">Tags (comma-separated)</Label>
              <Input id="ds-tags" value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="orders, revenue, ecommerce" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Dataset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
