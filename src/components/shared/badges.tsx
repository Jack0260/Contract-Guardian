import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Severity, ValidationStatus, ChangeRequestStatus, IncidentStatus, Classification, FreshnessStatus } from "@/lib/types";

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const variant = severity === "breaking" ? "destructive" : severity === "warning" ? "warning" : "success";
  const label = severity === "breaking" ? "Breaking" : severity === "warning" ? "Warning" : "Non-Breaking";
  return <Badge variant={variant} className={cn(className)}>{label}</Badge>;
}

export function ValidationStatusBadge({ status, className }: { status: ValidationStatus; className?: string }) {
  const map: Record<ValidationStatus, { variant: "default" | "destructive" | "warning" | "success" | "secondary"; label: string }> = {
    passed: { variant: "success", label: "Passed" },
    failed: { variant: "destructive", label: "Failed" },
    warning: { variant: "warning", label: "Warning" },
    pending: { variant: "secondary", label: "Pending" },
    blocked: { variant: "destructive", label: "Blocked" },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant} className={cn(className)}>{label}</Badge>;
}

export function CRStatusBadge({ status, className }: { status: ChangeRequestStatus; className?: string }) {
  const map: Record<ChangeRequestStatus, { variant: "default" | "destructive" | "warning" | "success" | "secondary"; label: string }> = {
    draft: { variant: "secondary", label: "Draft" },
    pending_review: { variant: "warning", label: "Pending Review" },
    approved: { variant: "success", label: "Approved" },
    rejected: { variant: "destructive", label: "Rejected" },
    changes_requested: { variant: "warning", label: "Changes Requested" },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant} className={cn(className)}>{label}</Badge>;
}

export function IncidentStatusBadge({ status, className }: { status: IncidentStatus; className?: string }) {
  const map: Record<IncidentStatus, { variant: "destructive" | "warning" | "success" | "secondary"; label: string }> = {
    open: { variant: "destructive", label: "Open" },
    investigating: { variant: "warning", label: "Investigating" },
    resolved: { variant: "success", label: "Resolved" },
    closed: { variant: "secondary", label: "Closed" },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant} className={cn(className)}>{label}</Badge>;
}

export function ClassificationBadge({ classification, className }: { classification: Classification; className?: string }) {
  const map: Record<Classification, { variant: "default" | "secondary" | "warning" | "destructive"; label: string }> = {
    public: { variant: "secondary", label: "Public" },
    internal: { variant: "default", label: "Internal" },
    confidential: { variant: "warning", label: "Confidential" },
    pii: { variant: "destructive", label: "PII" },
  };
  const { variant, label } = map[classification];
  return <Badge variant={variant} className={cn(className)}>{label}</Badge>;
}

export function FreshnessBadge({ status, className }: { status: FreshnessStatus; className?: string }) {
  const map: Record<FreshnessStatus, { variant: "success" | "warning" | "destructive"; label: string }> = {
    fresh: { variant: "success", label: "Fresh" },
    at_risk: { variant: "warning", label: "At Risk" },
    stale: { variant: "destructive", label: "Stale" },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant} className={cn(className)}>{label}</Badge>;
}
