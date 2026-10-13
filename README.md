# Contract Guardian

**Data Contract, Schema Evolution, and Downstream Impact Management Platform**

Contract Guardian helps data teams define data contracts, validate incoming datasets, detect breaking schema changes, calculate downstream impact, and run an approval workflow before changes are accepted.

## Features

### Data Contract Editor
- Define dataset schema fields with data types (string, integer, float, boolean, datetime, date, enum, JSON)
- Mark fields as required or optional
- Set primary key / uniqueness constraints
- Define allowed enum values
- Configure null-rate thresholds
- Set numeric ranges (min/max)
- Add regex validation patterns
- Configure freshness SLA
- Set volume-change thresholds
- Classify data as public, internal, confidential, or PII

### CSV/JSON Upload & Validation
1. Drag-and-drop CSV or JSON file upload
2. Automatic column profiling (type inference, null %, unique count, min/max, sample values, PII detection)
3. Schema and data profile comparison against an approved contract
4. Change classification: non-breaking, warning, or breaking
5. Plain-English explanations of why each change matters
6. Block or approve data ingestion based on policy

### Schema Change Detection
- Column removed / added / renamed
- Data type changed
- New required column added
- Null rate exceeds threshold
- Enum value outside allowed set
- Primary key duplicates found
- Freshness SLA breach
- Data volume anomaly
- Potential PII detected in unclassified field

### Impact Analysis & Lineage
- Interactive lineage graph: source dataset -> transformation -> warehouse table -> dashboard -> ML feature / API consumer
- Impact score calculation based on downstream assets, criticality, owner, and environment
- Click downstream assets to see dependent fields and owners

### Dashboards
- Contract compliance score trend
- Data quality trends (pass/fail/warning rates)
- Top datasets by downstream impact
- Contract violations by team and severity
- Freshness status grid
- Recent schema changes feed
- Failed validation runs
- Open approval requests and incidents

### Change Request Workflow
- Dataset owners propose contract changes
- System generates compatibility analysis and impacted downstream assets
- Approvers can approve, reject, or request changes
- Approved versions become active
- Comments and activity timeline
- Every action creates an audit-log entry

### Change Impact Brief (Signature Feature)
Converts a technical schema diff into a plain-English release report:
- What changed
- Is it breaking?
- Which systems, dashboards, and teams are affected
- Required actions
- Suggested migration strategy
- Risk score (0-100)
- Recommended release window

### Role-Based Access Control
- **Admin**: Full access to all features
- **Data Owner**: Create/edit contracts, propose and approve changes
- **Analyst**: Create datasets and change requests
- **Viewer**: Read-only access

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui + Radix UI
- **Charts**: Recharts
- **Icons**: Lucide React
- **State**: React Context + localStorage persistence
- **Theme**: Dark/light mode with localStorage persistence

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Build for production
npm run build

# Preview the production build
npm run preview
```

## Demo Account

Click "Continue as Demo Admin" on the sign-in page, or use:
- **Email**: `demo@contractguardian.io`
- **Password**: (any password)

Additional demo accounts:
- `sarah.chen@company.com` (Data Owner)
- `marcus.lee@company.com` (Data Owner)
- `priya.patel@company.com` (Analyst)

## Seed Data

The app comes pre-loaded with realistic demo data:
- 5 teams (Platform Data, Growth Analytics, Finance Engineering, ML & AI, Customer Insights)
- 12 datasets (user_events, orders, customers, payments, ML features, products, etc.)
- 30 data contracts (active, draft, and deprecated versions)
- 50 validation runs (mix of passed, failed, and warning)
- 20 schema changes (breaking, warning, and non-breaking)
- 15 downstream assets (transformations, warehouse tables, dashboards, ML features, APIs)
- 5 change requests (pending, approved, rejected, changes requested)
- 5 incidents (open, investigating, resolved, closed)
- 15 audit log entries
- 3+ realistic breaking-change scenarios

## Architecture

```
┌─────────────────────────────────────────────┐
│                 React App                    │
├──────────┬──────────┬──────────┬─────────────┤
│ Dashboard│Contracts │ Datasets │  Upload &   │
│  &Charts │ Editor   │  Catalog │  Validation │
├──────────┴──────────┴──────────┴─────────────┤
│           Lineage & Impact Analysis          │
├──────────┬──────────┬──────────┬─────────────┤
│  Change  │ Incident │  Audit   │   Theme &   │
│ Requests │ Tracker  │   Log    │    Auth     │
├──────────┴──────────┴──────────┴─────────────┤
│         Global Store (Context +              │
│         localStorage Persistence)            │
├─────────────────────────────────────────────┤
│   Validation Engine │ PII Detector │         │
│   Schema Diff       │ Impact Score │         │
│   CSV/JSON Parser   │ Profiler     │         │
└─────────────────────────────────────────────┘
```

### Key Libraries

| Library | Purpose |
|---------|---------|
| `validation-engine.ts` | Schema diff, change classification, plain-English explanations |
| `pii-detector.ts` | Column type inference and PII detection |
| `impact-analysis.ts` | Downstream impact scoring and Change Impact Brief generation |
| `csv-parser.ts` | CSV and JSON file parsing |
| `seed-data.ts` | Realistic demo data generation |
| `store.tsx` | Global state with localStorage persistence |

## ERD (Entity Overview)

```
Organization
  └── Workspace
       └── User (role: admin | data_owner | analyst | viewer)
       └── Team
            └── DataSource
                 └── Dataset
                      ├── DatasetVersion
                      ├── DataContract
                      │    ├── SchemaField
                      │    └── ContractRule
                      ├── ValidationRun
                      │    └── ValidationIssue
                      ├── SchemaChange
                      └── DownstreamAsset
                           └── LineageEdge
                      └── ChangeRequest
                           ├── Approval
                           ├── Comment
                           └── ActivityEntry
                      └── Incident
                      └── AuditLog
```

## Trade-offs

1. **localStorage over Supabase**: The app uses localStorage for persistence to ensure it works in any environment without database setup. In production, this would be replaced with Supabase/PostgreSQL for multi-user real-time collaboration.

2. **Client-side validation**: Contract validation runs entirely in the browser. For large files or sensitive data, this should be moved to a server-side edge function.

3. **Mock lineage graph**: The lineage graph uses a layered layout rather than a force-directed graph library. This keeps the bundle small while still showing the data flow clearly.

4. **No real-time updates**: Data refreshes on page navigation rather than using WebSocket subscriptions. Adding Supabase realtime channels would enable live updates.
