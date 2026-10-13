import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SeverityBadge, ValidationStatusBadge, CRStatusBadge, IncidentStatusBadge, FreshnessBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/common";
import { timeAgo, formatNumber, formatPercent } from "@/lib/format";
import type { PageId } from "@/components/shared/sidebar";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  ShieldCheck, AlertTriangle, FileEdit, Activity,
  TrendingUp, Clock, BarChart3, ChevronRight,
  CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onNavigate: (page: PageId) => void;
}

export function DashboardPage({ onNavigate }: Props) {
  const {
    contracts, validationRuns, schemaChanges, changeRequests,
    incidents, datasets, teams, downstreamAssets, complianceTrend,
    dataQualityTrend,
  } = useStore();

  const activeContracts = contracts.filter((c) => c.status === "active");
  const failedRuns = validationRuns.filter((r) => r.status === "failed");
  const warningRuns = validationRuns.filter((r) => r.status === "warning");
  const passedRuns = validationRuns.filter((r) => r.status === "passed");
  const openIncidents = incidents.filter((i) => i.status === "open" || i.status === "investigating");
  const pendingCRs = changeRequests.filter((cr) => cr.status === "pending_review");
  const breakingChanges = schemaChanges.filter((s) => s.severity === "breaking");
  const recentChanges = schemaChanges.slice(0, 6);
  const recentFailed = failedRuns.slice(0, 5);

  const complianceScore = complianceTrend.length > 0
    ? Math.round(complianceTrend.reduce((acc, p) => acc + p.score, 0) / complianceTrend.length)
    : 0;

  // Top datasets by downstream impact
  const datasetImpact = datasets.map((ds) => {
    const assets = downstreamAssets.filter((a) => a.datasetId === ds.id);
    return { name: ds.name, impact: assets.length, team: teams.find((t) => t.id === ds.teamId)?.name || "" };
  }).sort((a, b) => b.impact - a.impact).slice(0, 8);

  // Freshness status
  const freshnessData = datasets.map((ds) => {
    const sla = ds.freshnessSlaHours;
    const hoursSinceUpdate = Math.floor(Math.random() * sla * 2);
    let status: "fresh" | "at_risk" | "stale" = "fresh";
    if (hoursSinceUpdate > sla) status = "stale";
    else if (hoursSinceUpdate > sla * 0.7) status = "at_risk";
    return { name: ds.name, status, hoursSinceUpdate, sla };
  });

  // Violations by team
  const violationsByTeam = teams.map((team) => {
    const teamDatasets = datasets.filter((d) => d.teamId === team.id).map((d) => d.id);
    const teamChanges = schemaChanges.filter((s) => teamDatasets.includes(s.datasetId));
    return {
      team: team.name.split(" ")[0],
      breaking: teamChanges.filter((s) => s.severity === "breaking").length,
      warning: teamChanges.filter((s) => s.severity === "warning").length,
      nonBreaking: teamChanges.filter((s) => s.severity === "non_breaking").length,
    };
  });

  const metricCards = [
    {
      label: "Compliance Score",
      value: `${complianceScore}%`,
      icon: <ShieldCheck className="h-4 w-4" />,
      color: "text-success",
      bg: "bg-success/10",
      onClick: () => onNavigate("contracts"),
    },
    {
      label: "Open Incidents",
      value: String(openIncidents.length),
      icon: <AlertTriangle className="h-4 w-4" />,
      color: "text-destructive",
      bg: "bg-destructive/10",
      onClick: () => onNavigate("incidents"),
    },
    {
      label: "Pending Approvals",
      value: String(pendingCRs.length),
      icon: <FileEdit className="h-4 w-4" />,
      color: "text-warning",
      bg: "bg-warning/10",
      onClick: () => onNavigate("change-requests"),
    },
    {
      label: "Active Contracts",
      value: String(activeContracts.length),
      icon: <Activity className="h-4 w-4" />,
      color: "text-primary",
      bg: "bg-primary/10",
      onClick: () => onNavigate("contracts"),
    },
    {
      label: "Breaking Changes",
      value: String(breakingChanges.length),
      icon: <XCircle className="h-4 w-4" />,
      color: "text-destructive",
      bg: "bg-destructive/10",
      onClick: () => onNavigate("change-requests"),
    },
    {
      label: "Validation Pass Rate",
      value: formatPercent((passedRuns.length / validationRuns.length) * 100),
      icon: <TrendingUp className="h-4 w-4" />,
      color: "text-success",
      bg: "bg-success/10",
      onClick: () => onNavigate("upload"),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {metricCards.map((m) => (
          <Card
            key={m.label}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={m.onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") m.onClick(); }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
                <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", m.bg, m.color)}>
                  {m.icon}
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Compliance Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contract Compliance Score Trend</CardTitle>
            <CardDescription>30-day rolling compliance across all contracts</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={complianceTrend}>
                <defs>
                  <linearGradient id="complianceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} interval={6} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Area type="monotone" dataKey="score" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#complianceGradient)" name="Compliance %" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Data Quality Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Data Quality Trends</CardTitle>
            <CardDescription>Pass, fail, and warning rates over 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dataQualityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} interval={6} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line type="monotone" dataKey="passRate" stroke="hsl(var(--success))" strokeWidth={2} name="Pass %" dot={false} />
                <Line type="monotone" dataKey="failRate" stroke="hsl(var(--destructive))" strokeWidth={2} name="Fail %" dot={false} />
                <Line type="monotone" dataKey="warningRate" stroke="hsl(var(--warning))" strokeWidth={2} name="Warning %" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top datasets by impact */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Top Datasets by Downstream Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={datasetImpact} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} width={100} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                />
                <Bar dataKey="impact" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} name="Downstream Assets" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Violations by team */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Contract Violations by Team</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={violationsByTeam}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="team" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Bar dataKey="breaking" stackId="a" fill="hsl(var(--destructive))" name="Breaking" radius={[0, 0, 0, 0]} />
                <Bar dataKey="warning" stackId="a" fill="hsl(var(--warning))" name="Warning" />
                <Bar dataKey="nonBreaking" stackId="a" fill="hsl(var(--success))" name="Non-Breaking" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Freshness Status */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Freshness Status</CardTitle>
            <CardDescription>Dataset SLA compliance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin">
              {freshnessData.map((f) => (
                <div key={f.name} className="flex items-center justify-between rounded-lg border border-border p-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium truncate max-w-[120px]">{f.name}</span>
                    <span className="text-[10px] text-muted-foreground">SLA: {f.sla}h</span>
                  </div>
                  <FreshnessBadge status={f.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Schema Changes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Recent Schema Changes</CardTitle>
            <button onClick={() => onNavigate("change-requests")} className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent>
            {recentChanges.length === 0 ? (
              <EmptyState title="No schema changes detected" className="py-8" />
            ) : (
              <div className="space-y-3">
                {recentChanges.map((change) => {
                  const ds = datasets.find((d) => d.id === change.datasetId);
                  return (
                    <div key={change.id} className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{ds?.name || "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{change.fieldName} - {change.changeType.replace(/_/g, " ")}</p>
                        <p className="text-[10px] text-muted-foreground">{timeAgo(change.detectedAt)}</p>
                      </div>
                      <SeverityBadge severity={change.severity} />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Failed Validation Runs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Failed Validation Runs</CardTitle>
            <button onClick={() => onNavigate("upload")} className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent>
            {recentFailed.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="No failed validations" description="All recent validations passed" className="py-8" />
            ) : (
              <div className="space-y-3">
                {recentFailed.map((run) => {
                  const ds = datasets.find((d) => d.id === run.datasetId);
                  return (
                    <div key={run.id} className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{ds?.name || "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground">{run.failedChecks} failed, {run.warningChecks} warnings</p>
                        <p className="text-[10px] text-muted-foreground">{timeAgo(run.createdAt)}</p>
                      </div>
                      <ValidationStatusBadge status={run.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open Incidents + Pending Approvals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Open Incidents & Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingCRs.slice(0, 3).map((cr) => (
                <div key={cr.id} className="flex items-start gap-2">
                  <FileEdit className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{cr.title}</p>
                    <p className="text-[10px] text-muted-foreground">{timeAgo(cr.proposedAt)}</p>
                  </div>
                  <CRStatusBadge status={cr.status} />
                </div>
              ))}
              {openIncidents.slice(0, 3).map((inc) => (
                <div key={inc.id} className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{inc.title}</p>
                    <p className="text-[10px] text-muted-foreground">{timeAgo(inc.createdAt)}</p>
                  </div>
                  <IncidentStatusBadge status={inc.status} />
                </div>
              ))}
              {pendingCRs.length === 0 && openIncidents.length === 0 && (
                <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="All clear" description="No pending items" className="py-8" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
