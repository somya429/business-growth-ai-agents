# Verity Business-Growth Platform: System Audit (Stage 0)

**Date:** October 9, 2026  
**Auditor:** Antigravity Autonomous Agent  
**Target Workspaces:** `buiness growth AI agents` (Python backend + React/Vite frontend)  
**Execution Environment:** Windows, Python 3.13.2, Node.js v20+, Vite 6.1.0, Vitest 3.2.7  

---

## Executive Summary

The Verity platform currently implements an automated B2B outreach and trust-auditing pipeline structured around a LangGraph state machine, with a React 18 / Tailwind frontend and a dual Local/Supabase persistence layer. 

Existing core components (graph execution, human-in-the-loop checkpoints, permission enforcement, trust score math, and model gateway basic routing) are functioning and verified by **29 passing Python backend tests**. Live API connectivity checks confirm that **Google Gemini** (`gemini-3.8-flash`), **Groq** (`qwen/qwen3.8-27b`), and **Supabase Database** are fully operational.

However, the platform currently operates as a single-purpose outreach demonstrator rather than an **adaptive three-phase business-growth system**. Crucial capabilities—including conversational adaptive onboarding, dynamic task graph generation, typed agent reports, validated task state transitions, multi-tenant organization isolation (RLS), and real KPI learning—are either missing, hardcoded, or disconnected.

---

## 1. Working and Verified

The following subsystems were actively executed, tested, and confirmed operational:

| Subsystem | Verified Details | Verification Method |
|---|---|---|
| **Python Backend Engine** | LangGraph 1.2.0 StateGraph workflow with Sqlite persistence checkpointing (`langgraph-checkpoint-sqlite`). Supports pause at human review and state recovery across processes. | `pytest -v` (29 passed in 7.92s) |
| **Human-In-The-Loop Gate** | `interrupt()` in `core/graph.py` halts execution at `waiting_for_human`. Resumes cleanly on `Command(resume=ApprovalDecision)` for `approve`, `edit`, and `reject`. | Backend tests `test_all_businesses_pause_at_human_review`, `test_resume_with_approve`, etc. |
| **Trust Scoring Engine** | Mathematical recalculation of overall trust score (0–100) and category breakdowns based on open/accepted/dismissed claim flags (`shared/schemas.py`). | Backend test `test_update_flag_recomputes_score` & frontend test in `verity.test.tsx`. |
| **Permission Enforcement Engine** | `core/permissions.py` central enforcement blocks forbidden agent actions (e.g. non-senders attempting dispatch) and audits all security checks. | Backend tests `test_permission_decorator_blocks_forbidden_actions` & `test_permission_engine_denies_forbidden_actions_and_logs`. |
| **Google Gemini API** | Model `gemini-3.8-flash` via modern `google.genai` SDK is connected and responsive using `GEMINI_API_KEY`. | Live execution returned: `"Hello there."` |
| **Groq API** | Model `qwen/qwen3.8-27b` via `groq` SDK is connected and responsive using `GROQ_API_KEY`. | Live execution returned: `"Hello! How can I..."` |
| **Supabase Cloud Database** | Successfully connects via `supabase-py` and performs queries on existing tables (`businesses`, `leads`, `drafts`, `trust_reports`, `trace_events`, `runs`, `kb_docs`). | Live query executed against `businesses` returning active seed records. |
| **Local Repository Backend** | `core/repo/local.py` provides complete in-memory and JSON/filesystem persistence for test runs and offline operation. | Tested across all 29 pytest suites without Supabase required. |
| **Core Frontend Contract** | React Query API client contract matching `core/service.py` endpoints, dynamic flag status toggle, and consensus gate before dispatch. | `src/test/verity.test.tsx` (4/4 tests passed). |
| **UI Design System & Shell** | Complete Tailwind design token system, dark mode palette, `Rail`, `TopBar`, `PageShell`, and UI components (`Card`, `Badge`, `Drawer`, `Toast`, `Tabs`, `Button`, `Skeleton`). | Inspecting `/web/src/components` and `/web/src/styles`. |

---

## 2. Partially Implemented

The following components exist but have architectural gaps or integration defects:

| Component | Current State | Defect / Limitation |
|---|---|---|
| **Supabase Repository (`core/repo/supabase.py`)** | Connects to PostgreSQL, but relies on single-tenant flat schema from legacy `schema.sql`. | 1) If `SUPABASE_URL` in `.env` includes `/rest/v1`, duplicate pathing occurs (`PGRST125`). 2) Does not have tables for organizations, tasks, task versions, onboarding sessions, or business facts. |
| **Frontend Test Harness (`verity_marketing.test.tsx`)** | Comprehensive test file for 12 marketing and interactive workflows. | 12 tests currently fail with `Error: No QueryClient set, use QueryClientProvider to set one` because test helper renders `<Nav />` and `<WorkspacePage />` without wrapping in `QueryClientProvider`. |
| **Onboarding UI (`web/src/features/onboarding`)** | `BusinessProfileForm.tsx` collects static inputs (name, industry, offerings, ICP, tone). | Static form, non-conversational, non-resumable. Lacks phase selection (Foundation / Pre-Sales / Growth), question branching, readiness score, and fact provenance classification. |
| **Agent Fleet (`agents/` & `core/orchestrator.py`)** | Separate agent modules exist (`research.py`, `scoring.py`, `outreach.py`, `content.py`, `followup.py`, `learning.py`). | Agents operate as fixed sequential pipeline steps rather than autonomous, typed workers executing discrete tasks from an Atlas task graph. Identifiers (Atlas, Scout, Cadence, Quill, Muse, Veritas, Warden, Courier, Echo, Sage) are mostly display labels rather than structured agent definitions. |
| **Model Gateway (`agents/llm.py`)** | Supports Gemini, Groq, Grok, Ollama, and Mock providers with structured JSON parsing. | Lacks: sensitivity classification (blocking sensitive client data to hosted free tiers), token/cost usage ledger, database response caching, and local embeddings. |

---

## 3. Mocked or Disconnected

The following features appear in code or UI but are currently mocked, hardcoded, or using invalid credentials:

| Feature | Code Location | Observed Status | Impact |
|---|---|---|---|
| **Courier (Email Dispatch)** | `core/graph.py` (`mock_send_node`) & `api_server.py` (`/api/email/dispatch`) | `RESEND_API_KEY` present in `.env` is invalid (`ValidationError: API key is invalid`). `api_server.py` falls back to returning fake delivery receipts (`"Verity Courier (TLS Authenticated)"`). | Hard constraint violation: Never fabricate delivery receipts. Outbound actions must fail cleanly when not authorized or when provider keys are invalid. |
| **Tavily Web Research** | `agents/tools.py` & `b2b_pipeline/agents.py` | `TAVILY_API_KEY` is not present in `.env` or system environment. Tools silently fall back to mock company research data. | Scout cannot perform real live web searches until configured or adapted; fallback must be explicitly labeled as unverified / mock. |
| **Learning Insights & Metrics** | `api_server.py` (`/api/businesses/{id}/insights`) | Returns hardcoded numbers: `reply_rate: 0.28`, `meeting_rate: 0.145`, `unsubscribe_rate: 0.021`, and static pattern text. | Sage does not calculate real KPIs from the database; metrics are simulated. |
| **Flawed Review Demo State** | `api_server.py` (`DEMO_FLAWED_PAYLOAD`, `DEMO_FLAWED_FLAGS`) | Hardcoded in memory for `run_flawed_demo` route. | Review desk works for pre-canned demo data rather than live tasks generated by Atlas. |

---

## 4. Missing

The following required capabilities are completely absent from the codebase:

1. **Three Business Growth Phases**:
   - Phase 1: Foundation (idea validation, market/competitor research, unit economics, validation experiments).
   - Phase 2: Pre-Sales Readiness (offer & pricing validation, ICP, sales materials, lead list, CRM workflow, launch plan).
   - Phase 3: Growth and Optimization (funnel bottlenecks, conversion, revenue, margin, retention experiments).
   - Dynamic phase switching and Atlas re-planning.

2. **Adaptive Conversational Onboarding**:
   - 8-question core intake (stage, type, name, idea description, budget, goal, customers today, constraints).
   - Dynamic follow-up question generation via LLM gateway validated against Pydantic schema, with a deterministic question bank fallback.
   - Fact classification into `business_facts` (`verified_fact`, `user_assumption`, `researched_finding`, `unknown`) with timestamps and provenance.
   - Business readiness panel.
   - Autosave and resume via `onboarding_sessions`.

3. **Atlas Orchestration & Task Graph**:
   - Typed task graph generation (`Task` schema: id, title, objective, rationale, assigned agent, dependencies, priority, deliverables, acceptance criteria, evidence requirements, approval policy, quota cost).
   - Heuristic priority ranking: $P = 0.30 \times \text{Impact} + 0.25 \times \text{Urgency} + 0.20 \times \text{Readiness} + 0.15 \times \text{DependencyImportance} + 0.10 \times \text{EvidenceConfidence}$.
   - Safe parallel dispatch of independent tasks.
   - Schema validation for `AgentReport` (summary, findings, evidence with URLs/dates, assumptions, gaps, risks, deliverables, confidence).

4. **Task Workspace & Lifecycle State Machine**:
   - Server-enforced state machine: `Planned` $\to$ `Assigned` $\to$ `Running` $\to$ `Blocked` \| `ClientReview` $\to$ `AdminApproval` $\to$ `Approved` $\to$ `Executing` $\to$ `Completed` (plus `Paused`, `Cancelled`, `Failed`).
   - Immutable task versioning (`task_versions`) on client edits, with automated pause & replan if editing a `Running` task.
   - Realtime event streaming (`task_events`, `approvals`).

5. **Multi-Tenant Security & Supabase Schema**:
   - Missing tables: `organizations`, `organization_members` (roles: owner, member, admin), `business_profiles`, `business_facts`, `onboarding_sessions`, `tasks`, `task_versions`, `task_events`, `agent_reports`, `approvals`, `audit_logs`, `business_metrics`, `experiments`, `usage_ledger`.
   - Missing Row Level Security (RLS) policies isolating tenant data.
   - Idempotency key protection for Courier external actions.

6. **Observability & Sage Learning Engine**:
   - First-party tracing across `agent_runs`, `task_events`, and `usage_ledger`.
   - Real metric calculation from `outcomes` and `business_metrics` (displaying "not available yet" when data is lacking).
   - Experiment tracking (baseline vs test change vs observed result).

---

## 5. Smallest Safe Implementation Sequence

To avoid breaking working code and maintain a runnable application at every step, we propose the following 6-stage implementation plan:

### Stage 1: Migrations, RLS and Repository Extensions
- Create `supabase_migrations/20261009_three_phase_growth.sql` with additive tables (`organizations`, `organization_members`, `business_profiles`, `business_facts`, `onboarding_sessions`, `tasks`, `task_versions`, `task_events`, `agent_reports`, `approvals`, `audit_logs`, `business_metrics`, `experiments`, `usage_ledger`).
- Add RLS policies and indexes.
- Fix `core/repo/supabase.py` URL parsing bug and implement repository methods for organizations, tasks, facts, and onboarding sessions.
- Update `core/repo/local.py` with identical contract so offline tests and demos remain 100% operational.
- Fix test harness wrapper in `web/src/test/verity_marketing.test.tsx` (`QueryClientProvider`).

### Stage 2: Adaptive Onboarding (Backend + Existing Route)
- Create `shared/schemas_onboarding.py` (CoreIntake, FollowUpQuestion, IntakeAnswer, BusinessFact, ReadinessScore).
- Implement server-side onboarding engine (`core/onboarding.py`):
  - 8-question core intake.
  - Model gateway follow-up question generation with Pydantic validation.
  - Deterministic fallback question bank for offline/exhausted quota modes.
  - Fact extraction and classification (`verified_fact`, `user_assumption`, `researched_finding`, `unknown`).
- Wire to `api_server.py` (`POST /api/onboarding/session`, `POST /api/onboarding/answer`, `GET /api/onboarding/readiness`).
- Connect existing frontend route `#/onboard` using existing UI tokens, Card, Badge, and Button components to support conversational follow-ups and readiness indicator.

### Stage 3: Atlas Planner, Task Graph, State Machine & Checkpoints
- Define typed task schema (`shared/schemas_task.py`) and AgentReport schema.
- Implement Atlas planner (`core/atlas_planner.py`):
  - Phase-aware task generation (Foundation, Pre-Sales, Growth).
  - Priority ranking heuristic ($P = 0.30 \times \text{Impact} + \dots$).
  - Dependency resolution and parallel execution grouping.
- Implement validated task state machine (`core/task_state_machine.py`) with transition table tests.
- Extend LangGraph workflow to support task-graph execution and SQLite/Postgres checkpointing.

### Stage 4: Task Workspace, Versioning, Agent Reports & Approvals
- Wire `#/workspace` and `#/review` to live task endpoints.
- Implement task card details: Objective, "Why this matters", "What is missing", "Currently doing", deliverables, and evidence links.
- Implement task editing with immutable `task_versions` and pause/replan behavior.
- Implement server-side role validation (owner/member/admin) and approval gates for consequential external actions.

### Stage 5: Model Gateway Hardening, Research & Safe Execution
- Harden `agents/llm.py` into a unified `ModelGateway`:
  - Sensitivity classification (gating private client data from free-tier hosted models).
  - Token and call usage ledger per task/organization.
  - SQLite/DB response cache for repeated queries.
  - Groq $\leftrightarrow$ Gemini fallback and Ollama local hook.
- Implement Tavily search adapter with database caching; gracefully flag unknown when unverified or quota-exhausted.
- Harden Warden (deterministic compliance) and Courier (idempotency key, refusal without admin approval, no fabricated receipts).

### Stage 6: Metrics, Experiments, Sage Learning & Observability
- Implement `core/sage.py` for empirical pattern extraction from recorded outcomes.
- Replace hardcoded insight numbers in `api_server.py` with real aggregate calculations.
- Display "not available yet" for unmeasured metrics in `ResultsPage.tsx`.
- Add cross-tenant RLS tests, state machine unit tests, and end-to-end vertical slice tests.

---

## 6. Files Likely to Change

### Backend
- `core/repo/schema.sql` & new migration file `core/repo/migrations/002_three_phase_system.sql`
- `core/repo/base.py`, `core/repo/local.py`, `core/repo/supabase.py`
- `shared/schemas.py` (and modular schema files for tasks, onboarding, reports)
- `core/service.py` & `api_server.py`
- `core/graph.py` & `core/orchestrator.py`
- New: `core/atlas_planner.py`, `core/task_state_machine.py`, `core/onboarding.py`, `core/gateway.py`
- `agents/research.py`, `agents/tools.py`, `agents/learning.py`, `agents/llm.py`
- `tests/test_core.py`, `tests/test_agents.py`, new: `tests/test_state_machine.py`, `tests/test_onboarding.py`

### Frontend
- `web/src/test/verity_marketing.test.tsx` (fix `QueryClientProvider` wrapper)
- `web/src/api/client.ts` & `web/src/api/pipeline.ts`
- `web/src/features/onboarding/OnboardingPage.tsx` & `BusinessProfileForm.tsx` (wire adaptive intake)
- `web/src/features/mission-control/MissionControlPage.tsx` & `PipelineHero.tsx` (wire task graph)
- `web/src/features/review/ReviewDeskPage.tsx` (wire task-level approval & versioning)
- `web/src/features/results/ResultsPage.tsx` (wire real KPIs, remove fake placeholders)
- `web/src/pages/WorkspacePage.tsx` (wire task details and editable drawer)

---

## 7. Verification Summary Table

| Check | Target | Result | Notes |
|---|---|---|---|
| Pytest Test Suite | 29 tests | **29 / 29 PASS** | Core LangGraph, permissions, and repo contracts pass. |
| Vitest Frontend Tests | `verity.test.tsx` | **4 / 4 PASS** | Core UI contracts pass. |
| Vitest Frontend Tests | `verity_marketing.test.tsx` | **12 / 12 FAIL** | Missing `QueryClientProvider` in test render helper. |
| Supabase Connectivity | Cloud PostgREST | **SUCCESS** | Connects to `businesses`, `leads`, `drafts`, `runs`. |
| Gemini API | `gemini-3.8-flash` | **SUCCESS** | Live LLM generation verified. |
| Groq API | `qwen/qwen3.8-27b` | **SUCCESS** | Live LLM completion verified. |
| Resend Email API | `re_...` | **FAIL / INVALID** | API key is invalid (`ValidationError`). Fake receipts used in code. |
| Tavily Search API | `TAVILY_API_KEY` | **NOT SET** | Key missing from environment; fallback to mock data. |
