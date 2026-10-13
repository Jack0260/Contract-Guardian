import { useState, useMemo } from "react";
import { useStore, canCreate } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination, EmptyState } from "@/components/shared/common";
import { IncidentStatusBadge, SeverityBadge } from "@/components/shared/badges";
import { INCIDENT_STATUS_LABELS, type IncidentStatus, type Severity } from "@/lib/types";
import { timeAgo, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import {
  Plus, Search, ArrowLeft, AlertTriangle, Clock,
  CheckCircle2, Users, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

export function IncidentsPage() {
  const { incidents, datasets, contracts, downstreamAssets, users, currentUser, createIncident, updateIncident } = useStore();
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [incTitle, setIncTitle] = useState("");
  const [incDesc, setIncDesc] = useState("");
  const [incDataset, setIncDataset] = useState("");
  const [incSeverity, setIncSeverity] = useState<Severity>("breaking");
  const [incRootCause, setIncRootCause] = useState("");
  const [incErrors, setIncErrors] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    return incidents.filter((i) => {
      const matchesSearch = !search || i.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || i.status === statusFilter;
      const matchesSeverity = severityFilter === "all" || i.severity === severityFilter;
      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [incidents, search, statusFilter, severityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selected = selectedId ? incidents.find((i) => i.id === selectedId) : null;

  const handleCreate = () => {
    const errors: Record<string, string> = {};
    if (!incTitle.trim()) errors.title = "Title is required";
    if (!incDesc.trim()) errors.desc = "Description is required";
    if (!incDataset) errors.dataset = "Dataset is required";
    setIncErrors(errors);
    if (Object.keys(errors).length > 0) return;

    createIncident({
      title: incTitle,
      description: incDesc,
      severity: incSeverity,
      status: "open",
      datasetId: incDataset,
      contractId: null,
      validationRunId: null,
      changeRequestId: null,
      affectedAssets: [],
      rootCause: incRootCause,
      assignedTo: currentUser?.name || null,
    });
    toast.success("Incident created");
    setShowCreate(false);
    setIncTitle(""); setIncDesc(""); setIncDataset(""); setIncRootCause("");
  };

  if (view === "detail" && selected) {
    const ds = datasets.find((d) => d.id === selected.datasetId);
    const contract = selected.contractId ? contracts.find((c) => c.id === selected.contractId) : null;
    const assignee = users.find((u) => u.name === selected.assignedTo);
    const affectedAssetsList = selected.affectedAssets
      .map((id) => downstreamAssets.find((a) => a.id === id))
      .filter(Boolean) as typeof downstreamAssets;

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView("list")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Incidents
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle>{selected.title}</CardTitle>
                  <IncidentStatusBadge status={selected.status} />
                  <SeverityBadge severity={selected.severity} />
                </div>
                <CardDescription className="mt-2">{selected.description}</CardDescription>
              </div>
              <div className="flex gap-2 shrink-0">
                {selected.status !== "resolved" && (
                  <Button size="sm" variant="outline" onClick={() => { updateIncident(selected.id, { status: "resolved", resolvedAt: new Date().toISOString() }); toast.success("Incident resolved"); }}>
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
                  </Button>
                )}
                {selected.status === "open" && (
                  <Button size="sm" variant="warning" onClick={() => { updateIncident(selected.id, { status: "investigating" }); toast.success("Status updated"); }}>
                    Investigate
                  </Button>
                )}
                {selected.status !== "closed" && (
                  <Button size="sm" variant="secondary" onClick={() => { updateIncident(selected.id, { status: "closed" }); toast.success("Incident closed"); }}>
                    Close
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Dataset</p>
                <p className="text-sm font-medium">{ds?.name || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Assigned To</p>
                <p className="text-sm font-medium">{assignee?.name || selected.assignedTo || "Unassigned"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm font-medium">{formatDateTime(selected.createdAt)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Resolved</p>
                <p className="text-sm font-medium">{selected.resolvedAt ? formatDateTime(selected.resolvedAt) : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="rootcause">
          <TabsList>
            <TabsTrigger value="rootcause">Root Cause</TabsTrigger>
            <TabsTrigger value="assets">Affected Assets ({affectedAssetsList.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="rootcause">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Root Cause Analysis</p>
                    <p className="text-sm text-muted-foreground mt-1">{selected.rootCause}</p>
                    {contract && (
                      <div className="mt-3">
                        <Badge variant="outline" className="text-[10px]">Related Contract: {contract.description}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assets" className="space-y-2">
            {affectedAssetsList.length === 0 ? (
              <EmptyState title="No affected assets" description="No downstream assets were affected." className="py-8" />
            ) : (
              affectedAssetsList.map((a) => (
                <Card key={a.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">{a.name}</span>
                      <p className="text-xs text-muted-foreground">{a.type.replace(/_/g, " ")} - {a.owner}</p>
                    </div>
                    <Badge variant={a.criticality === "critical" ? "destructive" : "secondary"} className="text-[10px]">
                      {a.criticality}
                    </Badge>
                  </CardContent>
                </Card>
              ))
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
              placeholder="Search incidents..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-8"
              aria-label="Search incidents"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(INCIDENT_STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]" aria-label="Filter by severity">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="breaking">Breaking</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="non_breaking">Non-Breaking</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canCreate(currentUser?.role) && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Incident
          </Button>
        )}
      </div>

      {paged.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          title="No incidents found"
          description="Try adjusting your filters or create a new incident."
          action={canCreate(currentUser?.role) ? { label: "Create Incident", onClick: () => setShowCreate(true) } : undefined}
        />
      ) : (
        <div className="space-y-2">
          {paged.map((inc) => {
            const ds = datasets.find((d) => d.id === inc.datasetId);
            return (
              <Card
                key={inc.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => { setSelectedId(inc.id); setView("detail"); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") { setSelectedId(inc.id); setView("detail"); } }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={cn("h-4 w-4 shrink-0", inc.severity === "breaking" ? "text-destructive" : "text-warning")} />
                        <span className="text-sm font-semibold truncate">{inc.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{inc.description}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <IncidentStatusBadge status={inc.status} />
                        <SeverityBadge severity={inc.severity} />
                        <Badge variant="outline" className="text-[10px]">{ds?.name}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 text-[10px] text-muted-foreground">
                      <span>{inc.assignedTo || "Unassigned"}</span>
                      <span>{timeAgo(inc.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Incident</DialogTitle>
            <DialogDescription>Log a new incident related to a contract violation</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="inc-title">Title</Label>
              <Input id="inc-title" value={incTitle} onChange={(e) => setIncTitle(e.target.value)} placeholder="Brief incident title" />
              {incErrors.title && <p className="text-xs text-destructive">{incErrors.title}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="inc-desc">Description</Label>
              <Textarea id="inc-desc" value={incDesc} onChange={(e) => setIncDesc(e.target.value)} placeholder="Describe the incident..." rows={3} />
              {incErrors.desc && <p className="text-xs text-destructive">{incErrors.desc}</p>}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Dataset</Label>
                <Select value={incDataset} onValueChange={setIncDataset}>
                  <SelectTrigger aria-label="Select dataset"><SelectValue placeholder="Select dataset" /></SelectTrigger>
                  <SelectContent>
                    {datasets.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {incErrors.dataset && <p className="text-xs text-destructive">{incErrors.dataset}</p>}
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={incSeverity} onValueChange={(v) => setIncSeverity(v as Severity)}>
                  <SelectTrigger aria-label="Select severity"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breaking">Breaking</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="non_breaking">Non-Breaking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inc-root">Root Cause</Label>
              <Textarea id="inc-root" value={incRootCause} onChange={(e) => setIncRootCause(e.target.value)} placeholder="What caused the incident?" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Incident</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
