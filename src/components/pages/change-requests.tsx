import { useState, useMemo } from "react";
import { useStore, canCreate, canApprove } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination, EmptyState } from "@/components/shared/common";
import { CRStatusBadge, SeverityBadge } from "@/components/shared/badges";
import { CR_STATUS_LABELS, type ChangeRequestStatus, type ChangeImpactBrief } from "@/lib/types";
import { generateChangeImpactBrief, getImpactedAssets, calculateImpactScore } from "@/lib/impact-analysis";
import { timeAgo, formatDate } from "@/lib/format";
import { toast } from "sonner";
import {
  Plus, Search, ArrowLeft, FileEdit, Check, X, MessageSquare,
  Activity, FileText, AlertTriangle, ShieldAlert, Gauge, Clock, Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

export function ChangeRequestsPage() {
  const store = useStore();
  const { changeRequests, datasets, contracts, downstreamAssets, lineageEdges, teams, users, currentUser, createChangeRequest, updateChangeRequest, addComment, addActivity } = store;
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [crTitle, setCrTitle] = useState("");
  const [crDesc, setCrDesc] = useState("");
  const [crDataset, setCrDataset] = useState("");
  const [crErrors, setCrErrors] = useState<Record<string, string>>({});

  // Comment input
  const [commentText, setCommentText] = useState("");

  const filtered = useMemo(() => {
    return changeRequests.filter((cr) => {
      const matchesSearch = !search || cr.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || cr.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [changeRequests, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selected = selectedId ? changeRequests.find((cr) => cr.id === selectedId) : null;

  const handleCreate = () => {
    const errors: Record<string, string> = {};
    if (!crTitle.trim()) errors.title = "Title is required";
    if (!crDesc.trim()) errors.desc = "Description is required";
    if (!crDataset) errors.dataset = "Dataset is required";
    setCrErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const contract = contracts.find((c) => c.datasetId === crDataset && c.status === "active");
    const impacted = getImpactedAssets(crDataset, downstreamAssets, lineageEdges);
    const riskScore = calculateImpactScore(impacted, []);

    createChangeRequest({
      title: crTitle,
      description: crDesc,
      datasetId: crDataset,
      contractId: contract?.id || "",
      status: "pending_review",
      proposedBy: currentUser?.id || "system",
      schemaChanges: [],
      impactedAssets: impacted.map((a) => a.id),
      riskScore,
    });
    toast.success("Change request created");
    setShowCreate(false);
    setCrTitle(""); setCrDesc(""); setCrDataset("");
  };

  const handleApprove = () => {
    if (!selected) return;
    updateChangeRequest(selected.id, {
      status: "approved",
      reviewedBy: currentUser?.id || null,
      reviewedAt: new Date().toISOString(),
    });
    addActivity(selected.id, "approved", `Approved by ${currentUser?.name}`);
    toast.success("Change request approved");
  };

  const handleReject = () => {
    if (!selected) return;
    updateChangeRequest(selected.id, {
      status: "rejected",
      reviewedBy: currentUser?.id || null,
      reviewedAt: new Date().toISOString(),
    });
    addActivity(selected.id, "rejected", `Rejected by ${currentUser?.name}`);
    toast.success("Change request rejected");
  };

  const handleRequestChanges = () => {
    if (!selected) return;
    updateChangeRequest(selected.id, {
      status: "changes_requested",
      reviewedBy: currentUser?.id || null,
      reviewedAt: new Date().toISOString(),
    });
    addActivity(selected.id, "changes_requested", `Changes requested by ${currentUser?.name}`);
    toast.success("Changes requested");
  };

  const handleAddComment = () => {
    if (!selected || !commentText.trim()) return;
    addComment(selected.id, commentText.trim());
    addActivity(selected.id, "commented", "Added a comment");
    setCommentText("");
    toast.success("Comment added");
  };

  if (view === "detail" && selected) {
    const ds = datasets.find((d) => d.id === selected.datasetId);
    const contract = contracts.find((c) => c.id === selected.contractId);
    const impacted = selected.impactedAssets
      .map((id) => downstreamAssets.find((a) => a.id === id))
      .filter(Boolean) as typeof downstreamAssets;
    const brief: ChangeImpactBrief = generateChangeImpactBrief(
      selected.id, ds?.name || "Unknown", selected.schemaChanges, impacted, teams
    );
    const proposer = users.find((u) => u.id === selected.proposedBy);
    const reviewer = users.find((u) => u.id === selected.reviewedBy);

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView("list")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Change Requests
        </Button>

        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle>{selected.title}</CardTitle>
                  <CRStatusBadge status={selected.status} />
                </div>
                <CardDescription className="mt-2">{selected.description}</CardDescription>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span>Proposed by <strong className="text-foreground">{proposer?.name || "Unknown"}</strong></span>
                  <span>{timeAgo(selected.proposedAt)}</span>
                  {selected.reviewedAt && <span>Reviewed {timeAgo(selected.reviewedAt)} by {reviewer?.name}</span>}
                </div>
              </div>
              {canApprove(currentUser?.role) && selected.status === "pending_review" && (
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="success" onClick={handleApprove}>
                    <Check className="h-3 w-3 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="warning" onClick={handleRequestChanges}>
                    <MessageSquare className="h-3 w-3 mr-1" /> Request Changes
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleReject}>
                    <X className="h-3 w-3 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="brief">
          <TabsList>
            <TabsTrigger value="brief">Change Impact Brief</TabsTrigger>
            <TabsTrigger value="changes">Schema Changes ({selected.schemaChanges.length})</TabsTrigger>
            <TabsTrigger value="impact">Impact Analysis</TabsTrigger>
            <TabsTrigger value="comments">Comments ({selected.comments.length})</TabsTrigger>
            <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
          </TabsList>

          {/* Change Impact Brief */}
          <TabsContent value="brief" className="space-y-4">
            <Card className={cn("border-2", brief.isBreaking ? "border-destructive/30" : "border-success/30")}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold">Change Impact Brief</h2>
                  {brief.isBreaking ? (
                    <Badge variant="destructive">Breaking</Badge>
                  ) : (
                    <Badge variant="success">Non-Breaking</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">{brief.summary}</p>

                {/* Risk Score Gauge */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <Gauge className="h-16 w-16" style={{ color: brief.riskScore >= 70 ? "hsl(var(--destructive))" : brief.riskScore >= 40 ? "hsl(var(--warning))" : "hsl(var(--success))" }} />
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{brief.riskScore}</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Risk Score</p>
                    <p className="text-sm font-medium">
                      {brief.riskScore >= 70 ? "High Risk" : brief.riskScore >= 40 ? "Medium Risk" : "Low Risk"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {brief.breakingCount} breaking, {brief.warningCount} warning, {brief.nonBreakingCount} non-breaking
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> What Changed
                    </h3>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {brief.whatChanged.map((c, i) => (
                        <li key={i} className="rounded border border-border p-2">{c}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Required Actions
                    </h3>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {brief.requiredActions.map((a, i) => (
                        <li key={i} className="rounded border border-border p-2 flex items-start gap-1">
                          <Check className="h-3 w-3 text-success shrink-0 mt-0.5" /> {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Affected Systems & Dashboards</h3>
                    <div className="flex flex-wrap gap-1">
                      {brief.affectedSystems.map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Affected Teams</h3>
                    <div className="flex flex-wrap gap-1">
                      {brief.affectedTeams.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
                      <Lightbulb className="h-3 w-3" /> Suggested Migration Strategy
                    </h3>
                    <p className="text-xs text-muted-foreground rounded border border-border p-3">{brief.migrationStrategy}</p>
                  </div>
                  <div className="flex items-center gap-2 rounded border border-border p-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs font-semibold">Recommended Release Window</p>
                      <p className="text-xs text-muted-foreground">{brief.recommendedReleaseWindow}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schema Changes */}
          <TabsContent value="changes" className="space-y-2">
            {selected.schemaChanges.length === 0 ? (
              <EmptyState title="No schema changes" description="No changes detected in this request." className="py-8" />
            ) : (
              selected.schemaChanges.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{c.fieldName}</span>
                      <SeverityBadge severity={c.severity} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{c.plainEnglishExplanation}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(c.detectedAt)} by {c.detectedBy}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Impact Analysis */}
          <TabsContent value="impact" className="space-y-2">
            {impacted.length === 0 ? (
              <EmptyState title="No impacted assets" description="No downstream assets affected by this change." className="py-8" />
            ) : (
              impacted.map((a) => {
                const team = teams.find((t) => t.id === a.teamId);
                return (
                  <Card key={a.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">{a.name}</span>
                          <p className="text-xs text-muted-foreground">{a.type.replace(/_/g, " ")} - {team?.name}</p>
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

          {/* Comments */}
          <TabsContent value="comments" className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }}
                aria-label="Add comment"
              />
              <Button size="sm" onClick={handleAddComment} disabled={!commentText.trim()}>Post</Button>
            </div>
            {selected.comments.length === 0 ? (
              <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="No comments yet" description="Start the conversation." className="py-8" />
            ) : (
              selected.comments.map((c) => {
                const user = users.find((u) => u.id === c.userId);
                return (
                  <Card key={c.id}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary/15 text-primary text-xs">{user?.avatar || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{user?.name || "Unknown"}</span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                        </div>
                        <p className="text-xs mt-1">{c.text}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Activity Timeline */}
          <TabsContent value="activity" className="space-y-2">
            {selected.activityTimeline.map((entry) => {
              const user = users.find((u) => u.id === entry.userId);
              return (
                <Card key={entry.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Activity className="h-3 w-3" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium">{user?.name || "System"}</span>
                      <span className="text-xs text-muted-foreground"> {entry.details}</span>
                      <p className="text-[10px] text-muted-foreground">{formatDate(entry.timestamp)}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
              placeholder="Search change requests..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-8"
              aria-label="Search change requests"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(CR_STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canCreate(currentUser?.role) && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Change Request
          </Button>
        )}
      </div>

      {paged.length === 0 ? (
        <EmptyState
          icon={<FileEdit className="h-6 w-6" />}
          title="No change requests"
          description="Create a change request to propose contract modifications."
          action={canCreate(currentUser?.role) ? { label: "Create Change Request", onClick: () => setShowCreate(true) } : undefined}
        />
      ) : (
        <div className="space-y-2">
          {paged.map((cr) => {
            const ds = datasets.find((d) => d.id === cr.datasetId);
            const proposer = users.find((u) => u.id === cr.proposedBy);
            return (
              <Card
                key={cr.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => { setSelectedId(cr.id); setView("detail"); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") { setSelectedId(cr.id); setView("detail"); } }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{cr.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{cr.description}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <CRStatusBadge status={cr.status} />
                        <Badge variant="outline" className="text-[10px]">{ds?.name}</Badge>
                        <Badge variant={cr.riskScore >= 70 ? "destructive" : cr.riskScore >= 40 ? "warning" : "success"} className="text-[10px]">
                          Risk: {cr.riskScore}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{cr.impactedAssets.length} assets impacted</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 text-[10px] text-muted-foreground">
                      <span>{proposer?.name}</span>
                      <span>{timeAgo(cr.proposedAt)}</span>
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
            <DialogTitle>Create Change Request</DialogTitle>
            <DialogDescription>Propose a contract change for review and approval</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cr-title">Title</Label>
              <Input id="cr-title" value={crTitle} onChange={(e) => setCrTitle(e.target.value)} placeholder="Brief title for the change" />
              {crErrors.title && <p className="text-xs text-destructive">{crErrors.title}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-desc">Description</Label>
              <Textarea id="cr-desc" value={crDesc} onChange={(e) => setCrDesc(e.target.value)} placeholder="Describe the proposed change in detail..." rows={3} />
              {crErrors.desc && <p className="text-xs text-destructive">{crErrors.desc}</p>}
            </div>
            <div className="space-y-2">
              <Label>Dataset</Label>
              <Select value={crDataset} onValueChange={setCrDataset}>
                <SelectTrigger aria-label="Select dataset"><SelectValue placeholder="Select a dataset" /></SelectTrigger>
                <SelectContent>
                  {datasets.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {crErrors.dataset && <p className="text-xs text-destructive">{crErrors.dataset}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
