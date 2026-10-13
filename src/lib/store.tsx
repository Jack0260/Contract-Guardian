import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type {
  Team, User, DataSource, Dataset, DataContract, DownstreamAsset, LineageEdge,
  ValidationRun, SchemaChange, ChangeRequest, Incident, AuditLog,
  ComplianceTrendPoint, DataQualityTrendPoint, Comment, ActivityEntry,
  SchemaField, ChangeRequestStatus,
} from "./types";
import {
  seedTeams, seedUsers, seedDataSources, seedDatasets, seedContracts,
  seedDownstreamAssets, seedLineageEdges, seedValidationRuns, seedSchemaChanges,
  seedChangeRequests, seedIncidents, seedAuditLogs, seedComplianceTrend,
  seedDataQualityTrend,
} from "./seed-data";

const STORAGE_KEY = "contract_guardian_state_v1";
const AUTH_KEY = "contract_guardian_auth_v1";
const THEME_KEY = "contract_guardian_theme_v1";

interface AppState {
  teams: Team[];
  users: User[];
  dataSources: DataSource[];
  datasets: Dataset[];
  contracts: DataContract[];
  downstreamAssets: DownstreamAsset[];
  lineageEdges: LineageEdge[];
  validationRuns: ValidationRun[];
  schemaChanges: SchemaChange[];
  changeRequests: ChangeRequest[];
  incidents: Incident[];
  auditLogs: AuditLog[];
  complianceTrend: ComplianceTrendPoint[];
  dataQualityTrend: DataQualityTrendPoint[];
}

interface StoreContextValue extends AppState {
  currentUser: User | null;
  login: (email: string) => boolean;
  logout: () => void;
  // Contract CRUD
  createContract: (contract: Omit<DataContract, "id" | "createdAt" | "version">) => DataContract;
  updateContract: (id: string, updates: Partial<DataContract>) => void;
  deleteContract: (id: string) => void;
  // Dataset CRUD
  createDataset: (dataset: Omit<Dataset, "id" | "createdAt" | "updatedAt">) => Dataset;
  updateDataset: (id: string, updates: Partial<Dataset>) => void;
  deleteDataset: (id: string) => void;
  // Validation Run
  addValidationRun: (run: Omit<ValidationRun, "id" | "createdAt">) => ValidationRun;
  // Schema Change
  addSchemaChanges: (changes: SchemaChange[]) => void;
  // Change Request CRUD
  createChangeRequest: (cr: Omit<ChangeRequest, "id" | "proposedAt" | "comments" | "activityTimeline" | "reviewedBy" | "reviewedAt">) => ChangeRequest;
  updateChangeRequest: (id: string, updates: Partial<ChangeRequest>) => void;
  addComment: (crId: string, text: string) => void;
  addActivity: (crId: string, action: string, details: string) => void;
  // Incident CRUD
  createIncident: (incident: Omit<Incident, "id" | "createdAt" | "resolvedAt">) => Incident;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  // Audit Log
  addAuditLog: (action: string, entityType: string, entityId: string, entityName: string, details: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppState;
  } catch {
    return null;
  }
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function getInitialState(): AppState {
  const existing = loadState();
  if (existing) return existing;

  return {
    teams: seedTeams(),
    users: seedUsers(),
    dataSources: seedDataSources(),
    datasets: seedDatasets(),
    contracts: seedContracts(),
    downstreamAssets: seedDownstreamAssets(),
    lineageEdges: seedLineageEdges(),
    validationRuns: seedValidationRuns(),
    schemaChanges: seedSchemaChanges(),
    changeRequests: seedChangeRequests(),
    incidents: seedIncidents(),
    auditLogs: seedAuditLogs(),
    complianceTrend: seedComplianceTrend(),
    dataQualityTrend: seedDataQualityTrend(),
  };
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(getInitialState);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        const userId = JSON.parse(raw) as string;
        const initialState = loadState();
        if (initialState) {
          return initialState.users.find((u) => u.id === userId) || null;
        }
      }
    } catch { /* ignore */ }
    return null;
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  const login = useCallback((email: string): boolean => {
    const user = state.users.find((u) => u.email === email);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(AUTH_KEY, JSON.stringify(user.id));
      return true;
    }
    return false;
  }, [state.users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_KEY);
  }, []);

  const addAuditLog = useCallback((action: string, entityType: string, entityId: string, entityName: string, details: string) => {
    setState((prev) => ({
      ...prev,
      auditLogs: [
        {
          id: genId("aud"),
          userId: currentUser?.id || "system",
          action,
          entityType,
          entityId,
          entityName,
          details,
          createdAt: new Date().toISOString(),
        },
        ...prev.auditLogs,
      ],
    }));
  }, [currentUser]);

  const createContract = useCallback((contract: Omit<DataContract, "id" | "createdAt" | "version">): DataContract => {
    const newContract: DataContract = {
      ...contract,
      id: genId("contract"),
      version: 1,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      contracts: [newContract, ...prev.contracts],
    }));
    addAuditLog("create", "contract", newContract.id, newContract.description, "Created new contract");
    return newContract;
  }, [addAuditLog]);

  const updateContract = useCallback((id: string, updates: Partial<DataContract>) => {
    setState((prev) => ({
      ...prev,
      contracts: prev.contracts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
    const contract = state.contracts.find((c) => c.id === id);
    addAuditLog("update", "contract", id, contract?.description || id, "Updated contract");
  }, [addAuditLog, state.contracts]);

  const deleteContract = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      contracts: prev.contracts.filter((c) => c.id !== id),
    }));
    addAuditLog("delete", "contract", id, id, "Deleted contract");
  }, [addAuditLog]);

  const createDataset = useCallback((dataset: Omit<Dataset, "id" | "createdAt" | "updatedAt">): Dataset => {
    const newDataset: Dataset = {
      ...dataset,
      id: genId("dataset"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      datasets: [newDataset, ...prev.datasets],
    }));
    addAuditLog("create", "dataset", newDataset.id, newDataset.name, "Created new dataset");
    return newDataset;
  }, [addAuditLog]);

  const updateDataset = useCallback((id: string, updates: Partial<Dataset>) => {
    setState((prev) => ({
      ...prev,
      datasets: prev.datasets.map((d) => (d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d)),
    }));
    addAuditLog("update", "dataset", id, id, "Updated dataset");
  }, [addAuditLog]);

  const deleteDataset = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      datasets: prev.datasets.filter((d) => d.id !== id),
    }));
    addAuditLog("delete", "dataset", id, id, "Deleted dataset");
  }, [addAuditLog]);

  const addValidationRun = useCallback((run: Omit<ValidationRun, "id" | "createdAt">): ValidationRun => {
    const newRun: ValidationRun = {
      ...run,
      id: genId("valrun"),
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      validationRuns: [newRun, ...prev.validationRuns],
    }));
    addAuditLog("validate", "validation_run", newRun.id, `Validation run for dataset`, `Status: ${newRun.status}`);
    return newRun;
  }, [addAuditLog]);

  const addSchemaChanges = useCallback((changes: SchemaChange[]) => {
    setState((prev) => ({
      ...prev,
      schemaChanges: [...changes, ...prev.schemaChanges],
    }));
  }, []);

  const createChangeRequest = useCallback((cr: Omit<ChangeRequest, "id" | "proposedAt" | "comments" | "activityTimeline" | "reviewedBy" | "reviewedAt">): ChangeRequest => {
    const newCr: ChangeRequest = {
      ...cr,
      id: genId("cr"),
      proposedAt: new Date().toISOString(),
      comments: [],
      activityTimeline: [{
        id: genId("act"),
        action: "created",
        userId: currentUser?.id || "system",
        timestamp: new Date().toISOString(),
        details: "Change request created",
      }],
      reviewedBy: null,
      reviewedAt: null,
    };
    setState((prev) => ({
      ...prev,
      changeRequests: [newCr, ...prev.changeRequests],
    }));
    addAuditLog("create", "change_request", newCr.id, newCr.title, "Created change request");
    return newCr;
  }, [addAuditLog, currentUser]);

  const updateChangeRequest = useCallback((id: string, updates: Partial<ChangeRequest>) => {
    setState((prev) => ({
      ...prev,
      changeRequests: prev.changeRequests.map((cr) => (cr.id === id ? { ...cr, ...updates } : cr)),
    }));
    const cr = state.changeRequests.find((c) => c.id === id);
    addAuditLog("update", "change_request", id, cr?.title || id, "Updated change request");
  }, [addAuditLog, state.changeRequests]);

  const addComment = useCallback((crId: string, text: string) => {
    const comment: Comment = {
      id: genId("c"),
      userId: currentUser?.id || "system",
      text,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      changeRequests: prev.changeRequests.map((cr) =>
        cr.id === crId ? { ...cr, comments: [...cr.comments, comment] } : cr
      ),
    }));
  }, [currentUser]);

  const addActivity = useCallback((crId: string, action: string, details: string) => {
    const entry: ActivityEntry = {
      id: genId("act"),
      action,
      userId: currentUser?.id || "system",
      timestamp: new Date().toISOString(),
      details,
    };
    setState((prev) => ({
      ...prev,
      changeRequests: prev.changeRequests.map((cr) =>
        cr.id === crId ? { ...cr, activityTimeline: [...cr.activityTimeline, entry] } : cr
      ),
    }));
  }, [currentUser]);

  const createIncident = useCallback((incident: Omit<Incident, "id" | "createdAt" | "resolvedAt">): Incident => {
    const newIncident: Incident = {
      ...incident,
      resolvedAt: null,
      id: genId("inc"),
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      incidents: [newIncident, ...prev.incidents],
    }));
    addAuditLog("create", "incident", newIncident.id, newIncident.title, "Created incident");
    return newIncident;
  }, [addAuditLog]);

  const updateIncident = useCallback((id: string, updates: Partial<Incident>) => {
    setState((prev) => ({
      ...prev,
      incidents: prev.incidents.map((inc) => (inc.id === id ? { ...inc, ...updates } : inc)),
    }));
    addAuditLog("update", "incident", id, id, "Updated incident");
  }, [addAuditLog]);

  const value: StoreContextValue = {
    ...state,
    currentUser,
    login,
    logout,
    createContract,
    updateContract,
    deleteContract,
    createDataset,
    updateDataset,
    deleteDataset,
    addValidationRun,
    addSchemaChanges,
    createChangeRequest,
    updateChangeRequest,
    addComment,
    addActivity,
    createIncident,
    updateIncident,
    addAuditLog,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function getStoredTheme(): "light" | "dark" {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch { /* ignore */ }
  return "dark";
}

export function setStoredTheme(theme: "light" | "dark") {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch { /* ignore */ }
}

// Permission helper
export function canEdit(role: User["role"] | undefined): boolean {
  return role === "admin" || role === "data_owner";
}

export function canApprove(role: User["role"] | undefined): boolean {
  return role === "admin" || role === "data_owner";
}

export function canCreate(role: User["role"] | undefined): boolean {
  return role === "admin" || role === "data_owner" || role === "analyst";
}
