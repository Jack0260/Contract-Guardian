import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FileCheck2, Database, Upload, GitBranch,
  FileEdit, AlertTriangle, ScrollText, ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

export type PageId =
  | "dashboard" | "contracts" | "datasets" | "upload"
  | "lineage" | "change-requests" | "incidents" | "audit";

interface NavItem {
  id: PageId;
  label: string;
  icon: ReactNode;
  description: string;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, description: "Overview and metrics" },
  { id: "contracts", label: "Data Contracts", icon: <FileCheck2 className="h-4 w-4" />, description: "Manage contracts and rules" },
  { id: "datasets", label: "Datasets", icon: <Database className="h-4 w-4" />, description: "Dataset catalog" },
  { id: "upload", label: "Validate Data", icon: <Upload className="h-4 w-4" />, description: "Upload and validate" },
  { id: "lineage", label: "Lineage & Impact", icon: <GitBranch className="h-4 w-4" />, description: "Data lineage graph" },
  { id: "change-requests", label: "Change Requests", icon: <FileEdit className="h-4 w-4" />, description: "Approval workflow" },
  { id: "incidents", label: "Incidents", icon: <AlertTriangle className="h-4 w-4" />, description: "Track incidents" },
  { id: "audit", label: "Audit Log", icon: <ScrollText className="h-4 w-4" />, description: "Activity history" },
];

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside
      className="flex h-full w-60 flex-col border-r border-border bg-card"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight">Contract Guardian</span>
          <span className="text-[10px] text-muted-foreground">Data Contract Platform</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              currentPage === item.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
            aria-current={currentPage === item.id ? "page" : undefined}
            aria-label={item.description}
          >
            <span className="mt-0.5 shrink-0">{item.icon}</span>
            <span className="flex flex-col">
              <span>{item.label}</span>
              <span className="text-[10px] text-muted-foreground/70">{item.description}</span>
            </span>
          </button>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="rounded-lg bg-muted/50 p-2 text-[10px] text-muted-foreground">
          <p className="font-medium text-foreground/80">Contract Guardian v1.0</p>
          <p className="mt-1">Production data contract management</p>
        </div>
      </div>
    </aside>
  );
}
