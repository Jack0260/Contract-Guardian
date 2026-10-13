import { useState, useEffect } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import { AuthPage } from "@/components/auth-page";
import { Sidebar, type PageId } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/header";
import { DashboardPage } from "@/components/pages/dashboard";
import { ContractsPage } from "@/components/pages/contracts";
import { DatasetsPage } from "@/components/pages/datasets";
import { UploadPage } from "@/components/pages/upload";
import { LineagePage } from "@/components/pages/lineage";
import { ChangeRequestsPage } from "@/components/pages/change-requests";
import { IncidentsPage } from "@/components/pages/incidents";
import { AuditPage } from "@/components/pages/audit";
import { Toaster } from "@/components/ui/sonner";

const PAGE_TITLES: Record<PageId, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Contract compliance and data health overview" },
  contracts: { title: "Data Contracts", subtitle: "Define and manage data contracts, schema rules, and quality thresholds" },
  datasets: { title: "Datasets", subtitle: "Browse and manage dataset catalog" },
  upload: { title: "Validate Data", subtitle: "Upload CSV or JSON to profile and validate against contracts" },
  lineage: { title: "Lineage & Impact Analysis", subtitle: "Trace data flow and calculate downstream impact" },
  "change-requests": { title: "Change Requests", subtitle: "Review and approve proposed contract changes" },
  incidents: { title: "Incidents", subtitle: "Track and resolve incidents caused by contract violations" },
  audit: { title: "Audit Log", subtitle: "Complete activity history across all entities" },
};

function AppContent() {
  const { currentUser } = useStore();
  const [page, setPage] = useState<PageId>("dashboard");

  // Restore last page from sessionStorage
  useEffect(() => {
    if (currentUser) {
      const saved = sessionStorage.getItem("cg_current_page");
      if (saved) setPage(saved as PageId);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem("cg_current_page", page);
    }
  }, [page, currentUser]);

  if (!currentUser) {
    return <AuthPage />;
  }

  const { title, subtitle } = PAGE_TITLES[page];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar currentPage={page} onNavigate={setPage} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto scrollbar-thin" role="main">
          <div className="animate-fade-in p-6">
            {page === "dashboard" && <DashboardPage onNavigate={setPage} />}
            {page === "contracts" && <ContractsPage />}
            {page === "datasets" && <DatasetsPage />}
            {page === "upload" && <UploadPage onNavigate={setPage} />}
            {page === "lineage" && <LineagePage />}
            {page === "change-requests" && <ChangeRequestsPage />}
            {page === "incidents" && <IncidentsPage />}
            {page === "audit" && <AuditPage />}
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <StoreProvider>
        <AppContent />
        <Toaster richColors position="top-right" />
      </StoreProvider>
    </ThemeProvider>
  );
}

export default App;
