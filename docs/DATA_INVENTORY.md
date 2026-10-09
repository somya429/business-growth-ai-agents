# Verity System Data Inventory

This document details all pre-loaded, hardcoded, fabricated, or sample data discovered across the codebase (backend, frontend, mocks, data folders, runtime storage, and configuration). It establishes the baseline for removing all mock data and transitioning the system to a clean, empty-by-default architecture.

---

## 1. Hardcoded Sample Businesses

The repository currently includes three pre-configured sample businesses:

| Business Name | Identifier / Key | Category | Locations Found |
| :--- | :--- | :--- | :--- |
| **CloudPulse Systems** | `saas` | B2B SaaS | `data/saas/profile.json`<br>`data/saas/kb/product_sheet.md`<br>`data/saas/kb/pricing.md`<br>`data/generate_data.py`<br>`web/src/mocks/fixtures.ts`<br>`web/src/features/review/ReviewDeskPage.tsx`<br>`web/src/features/review/DraftDocument.tsx`<br>`api_server.py`<br>`core/service.py` (fallback defaults)<br>`web/src/store/useAppStore.ts` |
| **Aura Living** | `ecommerce` | E-Commerce | `data/ecommerce/profile.json`<br>`data/ecommerce/kb/product_catalog.md`<br>`data/ecommerce/kb/shipping_policy.md`<br>`data/generate_data.py`<br>`web/src/mocks/fixtures.ts`<br>`web/src/features/onboarding/SampleBusinessSelector.tsx` |
| **Apex Commercial Facilities / HVAC** | `local_services` | Local Facilities & HVAC | `data/local_services/profile.json`<br>`data/local_services/kb/product_sheet.md`<br>`data/local_services/kb/approved_claims.md`<br>`data/generate_data.py`<br>`web/src/mocks/fixtures.ts`<br>`web/src/features/onboarding/SampleBusinessSelector.tsx` |

**Target Action**:
- Move `/data/saas`, `/data/ecommerce`, `/data/local_services`, and `data/generate_data.py` into `tests/fixtures/` so tests can consume them without the application loading or seeding them.
- Ensure `list_businesses()` returns an empty array `[]` when no business profiles have been created by the user.

---

## 2. Hardcoded Leads, Personas, and Named Individuals

| Name / Persona | Affiliation / Role | Locations Found |
| :--- | :--- | :--- |
| **Elena Rostova** | VP of Platform Engineering @ Starlight Financial Group (`elena.rostova@starlightfg.com`) | `web/src/mocks/fixtures.ts`<br>`web/src/features/review/DraftDocument.tsx`<br>`web/src/features/review/ReviewDeskPage.tsx`<br>`web/src/features/review/ApprovalDialog.tsx`<br>`api_server.py`<br>`web/src/api/pipeline.ts` |
| **Starlight Financial Group** | Target Account (`starlightfg.com`) | `web/src/mocks/fixtures.ts`<br>`web/src/features/review/DraftDocument.tsx`<br>`web/src/features/review/ReviewDeskPage.tsx`<br>`api_server.py` |
| **David Sterling** | Head of Solutions, CloudPulse Systems | `web/src/mocks/fixtures.ts`<br>`api_server.py` |
| **Marcus Chen** | Director of RevOps | `web/src/api/pipeline.ts` |
| **Anthropic** | Pre-filled target company input in Studio/Workspace | `web/src/pages/WorkspacePage.tsx`<br>`web/src/api/demo.ts` |
| **delivered@resend.dev** | Default recipient email | `web/src/pages/WorkspacePage.tsx`<br>`api_server.py` |

**Target Action**:
- Remove hardcoded lead references and default test emails from production components and API handlers.
- Clear default form values in Studio/Workspace so target company inputs start strictly empty.

---

## 3. Fabricated Runs, Drafts, Flags, Traces, Receipts & Insights

| Artifact Type | Mock ID / Identifier | Description / Details | Locations Found |
| :--- | :--- | :--- | :--- |
| **Flawed Run** | `run_flawed_demo` | Demo run with 3 planted factual discrepancies (FSSAI hallucination, $1,200 pricing, 2-day delivery SLA) | `api_server.py`<br>`web/src/mocks/fixtures.ts`<br>`web/src/api/client.ts`<br>`web/src/store/useAppStore.ts`<br>`web/src/features/mission-control/MissionControlPage.tsx`<br>`web/src/features/review/ReviewDeskPage.tsx`<br>`web/src/features/results/ResultsPage.tsx`<br>`web/src/features/onboarding/OnboardingPage.tsx` |
| **Clean Run** | `run_clean_demo` | Pre-fabricated 100% verified demo run | `web/src/mocks/fixtures.ts`<br>`web/src/api/client.ts` |
| **E-Commerce Run** | `run_ecom_01` | Pre-fabricated secondary run summary | `web/src/mocks/fixtures.ts` |
| **Planted Flags** | `flag-001`, `flag-002`, `flag-003` | Mock discrepancy items in `DEMO_FLAWED_FLAGS` | `api_server.py`<br>`web/src/mocks/fixtures.ts` |
| **Trace Events** | `MOCK_TRACE_EVENTS` | Synthetic trace timeline logs for Cadence, Scout, Quill, Veritas, Warden, Courier | `web/src/mocks/fixtures.ts`<br>`web/src/api/client.ts` |
| **Courier Receipts** | `MOCK_COURIER_RECEIPT` | Mock cryptographic signature `msg_98bf104a_signed` | `web/src/mocks/fixtures.ts`<br>`web/src/api/client.ts` |
| **Echo Inbound Reply** | `MOCK_ECHO_REPLY` | Simulated reply sentiment and snippet | `web/src/mocks/fixtures.ts`<br>`web/src/api/client.ts` |
| **Sage Learning Insights** | `MOCK_SAGE_INSIGHTS` | Hardcoded conversion statistics (e.g., "Referencing SOC 2 audited telemetry increases CTO meeting conversion by 3.4x") | `web/src/mocks/fixtures.ts`<br>`api_server.py` (`/api/businesses/{business_id}/insights`) |

**Target Action**:
- Return empty arrays or `"not available yet"` empty states when no real runs exist.
- Ensure `/api/businesses/{business_id}/insights` computes insights exclusively from actual database outcomes.

---

## 4. UI Demo Buttons & Simulated Actions

| Component | UI Element / Label | Action Performed |
| :--- | :--- | :--- |
| `web/src/components/Nav.tsx` | "Test Review" / "Test Review Desk (Flawed Demo)" | Triggers `startRun(..., flawed=True)` and navigates to review |
| `web/src/components/layout/TopBar.tsx` | "Test Flawed Demo" | Launches planted flaw run |
| `web/src/components/layout/TopBar.tsx` | "Test Clean Run" | Launches clean demo run |
| `web/src/components/layout/TopBar.tsx` | Reset Button ("Reset mock data to fresh flawed demo state") | Calls `api.resetState()` |
| `web/src/features/mission-control/MissionControlPage.tsx` | "Simulate Clean Run" | Triggers synthetic clean run mutation |
| `web/src/features/onboarding/OnboardingPage.tsx` | "Try Fact-Check Demo (Fix 3 Mistakes)" & "View 10-Agent Pipeline" | Navigates directly to `run_flawed_demo` |
| `web/src/features/onboarding/KnowledgeBaseUploader.tsx` | "Load Master Contract Terms" & "Load Compliance Warranty" | Runs `handleSimulatedUpload` with hardcoded file names |

**Target Action**:
- Remove fabricated test buttons from primary navigation and page headers.
- If retained for dev testing, guard behind `VITE_DEV_TOOLS=1` (default false) and explicitly label as "Demo data".

---

## 5. Persistent Client State & Store Defaults

| File | Variable / Key | Value | Impact |
| :--- | :--- | :--- | :--- |
| `web/src/store/useAppStore.ts` | `activeBusinessId` | `'saas'` | Assumes 'saas' business always exists |
| `web/src/store/useAppStore.ts` | `activeRunId` | `'run_flawed_demo'` | Loads flawed demo on cold start |
| `localStorage` | `verity_onboard_session_id` | Stored ID | May point to stale sessions |
| `localStorage` | `activeBusinessId` | Stored ID | May reference deleted/non-existent businesses |

**Target Action**:
- Initialize `activeBusinessId` as `null` (or empty string `""`).
- Initialize `activeRunId` as `null`.
- Handle missing business gracefully by falling back to Welcome / Empty state.

---

## 6. Runtime Storage Files

| File Path | Contents | Status |
| :--- | :--- | :--- |
| `runtime/repo.sqlite` | SQLite database storing runs (104), drafts (130), trust reports (143), tasks (725), traces (1417) | Runtime state from development & test runs |
| `runtime/checkpoints.sqlite` | LangGraph SQLite checkpoint store | Checkpoints from previous graph runs |
| `runtime/test_cp.sqlite` | Test checkpoint store | Scratch test file |
| `b2b_pipeline/crm_mock_store.json` | CRM JSON store | Currently `[]` |

**Target Action**:
- Implement `core.maintenance.reset_local` with default `--dry-run` to safely list and confirm removal of local runtime stores.
- Implement `core.maintenance.purge_remote` with default dry-run for remote Supabase cleaning.
