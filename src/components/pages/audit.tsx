import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, EmptyState } from "@/components/shared/common";
import { formatDateTime, timeAgo } from "@/lib/format";
import {
  Search, ScrollText, Activity, FileEdit, FileCheck2,
  AlertTriangle, Database, Shield, Check, X, MessageSquare,
} from "lucide-react";

const PAGE_SIZE = 15;

const ACTION_ICONS: Record<string, React.ReactNode> = {
  create: <FileEdit className="h-3 w-3" />,
  update: <Activity className="h-3 w-3" />,
  delete: <X className="h-3 w-3" />,
  validate: <FileCheck2 className="h-3 w-3" />,
  approve: <Check className="h-3 w-3" />,
  reject: <X className="h-3 w-3" />,
  detect: <AlertTriangle className="h-3 w-3" />,
  comment: <MessageSquare className="h-3 w-3" />,
  request_changes: <FileEdit className="h-3 w-3" />,
};

export function AuditPage() {
  const { auditLogs, users } = useStore();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesSearch = !search ||
        log.entityName.toLowerCase().includes(search.toLowerCase()) ||
        log.details.toLowerCase().includes(search.toLowerCase());
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      const matchesEntity = entityFilter === "all" || log.entityType === entityFilter;
      return matchesSearch && matchesAction && matchesEntity;
    });
  }, [auditLogs, search, actionFilter, entityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const actionTypes = Array.from(new Set(auditLogs.map((l) => l.action)));
  const entityTypes = Array.from(new Set(auditLogs.map((l) => l.entityType)));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search audit logs..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8"
            aria-label="Search audit logs"
          />
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]" aria-label="Filter by action">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actionTypes.map((a) => <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]" aria-label="Filter by entity type">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {entityTypes.map((e) => <SelectItem key={e} value={e}>{e.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total Entries</span>
              <ScrollText className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-1">{auditLogs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Change Requests</span>
              <FileEdit className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-1">{auditLogs.filter((l) => l.entityType === "change_request").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Validations</span>
              <FileCheck2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-1">{auditLogs.filter((l) => l.entityType === "validation_run").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Detections</span>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-1">{auditLogs.filter((l) => l.entityType === "schema_change").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Log entries */}
      {paged.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-6 w-6" />}
          title="No audit log entries"
          description="Try adjusting your filters."
          className="py-8"
        />
      ) : (
        <div className="space-y-1">
          {paged.map((log) => {
            const user = users.find((u) => u.id === log.userId);
            return (
              <Card key={log.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/15 text-primary text-xs">
                      {user?.avatar || <Shield className="h-3 w-3" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium">{user?.name || "System"}</span>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        {ACTION_ICONS[log.action] || <Activity className="h-3 w-3" />}
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">{log.entityType.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      <span className="font-medium text-foreground">{log.entityName}</span> — {log.details}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0" title={formatDateTime(log.createdAt)}>
                    {timeAgo(log.createdAt)}
                  </span>
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
