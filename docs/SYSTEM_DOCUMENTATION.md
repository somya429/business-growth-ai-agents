# Verity GrowthOS: Enterprise Architecture, Workflows, Agent Fleet, and Technical Reference Manual

**Platform Version:** 1.0.0 Production Architecture  
**Document Classification:** Master Technical Specification & Operations Guide  
**System Name:** Verity GrowthOS (Autonomous Multi-Agent Business Growth Engine)  

---

## 1. Executive Summary & System Philosophy

**Verity GrowthOS** is an autonomous multi-agent growth engine that automates B2B pipeline generation, competitive intelligence, and outreach execution while maintaining strict factual grounding and deterministic compliance. 

### Core Architectural Pillars

1. **Zero-Hallucination Guarantee (Claim Grounding):** No communication, value proposition, or numerical statistic leaves the system without verification against approved knowledge base assets. Sentence-level claims are audited by **Veritas** against verified sources.
2. **Deterministic Compliance Boundaries:** Non-negotiable policy constraints (quiet hours, weekly frequency caps, opt-out lists, anti-spam laws, Meta Platform Messaging Policies) are enforced by **Warden**, an isolated rules engine that cannot be overridden by any probabilistic LLM.
3. **Human-in-the-Loop (HITL) Consensus Gates:** High-risk actions—such as outbound communications, public campaigns, and pipeline dispatches—pause automatically at LangGraph checkpoints (`interrupt()`). They require explicit, cryptographically traceable human authorization before execution.
4. **Three-Phase Adaptive Growth Model:** The platform moves companies through three sequential stages: **Phase 1: Foundation**, **Phase 2: Pre-Sales Readiness**, and **Phase 3: Growth & Optimization**, adapting task graphs, agent delegations, and validation criteria dynamically.
5. **Bidirectional Autonomous Orchestration:** The **Apex Chief of Staff** agent orchestrates 10+ specialized agents across three selectable autonomy modes (`oversight`, `supervised`, `autonomous`), decomposing high-level natural language directives into actionable workflows.

---

## 2. Comprehensive Technology Stack

| Layer | Component / Technology | Version / Specification | Architectural Purpose |
|---|---|---|---|
| **Frontend Framework** | React + TypeScript + Vite | React 18.3, TypeScript 5.5, Vite 6.1.0 | High-performance single-page application (SPA) with typed contracts |
| **Styling & Design System** | TailwindCSS + Lucide React | TailwindCSS 3.4, Lucide Icons | Dark-mode design system with responsive layouts and tokens |
| **State & Data Fetching** | TanStack React Query + React Router | React Query v5.0, React Router v6.28 (HashRouter) | Server state synchronization, optimistic caching, and URL routing |
| **Testing Harness** | Vitest + Testing Library | Vitest 3.2.7, @testing-library/react | Unit and integration testing for UI components and API contracts |
| **Backend Framework** | FastAPI + Uvicorn | FastAPI 0.110.0, Uvicorn 0.28.0, Starlette | Asynchronous REST API, CORS middleware, and OpenAPI docs |
| **Validation & Schemas** | Pydantic v2 | Pydantic >= 2.0 (`BaseModel`, `Field`, `TypedDict`) | Strict runtime validation, schema enforcement, and JSON serialization |
| **Agent Orchestration** | LangGraph | LangGraph 1.2.0 (`StateGraph`, `START`, `END`, `Command`, `interrupt`) | State machine, conditional routing, and HITL checkpointing |
| **State Persistence** | SQLite Checkpointing | `langgraph-checkpoint-sqlite` 3.1.0 (`SqliteSaver`) | Transactional step snapshots, process crashes recovery, and time travel |
| **Primary LLM Engine** | Google Gemini | `gemini-3.8-flash` via `google.genai` SDK | Strategic reasoning, high-speed synthesis, and dynamic task generation |
| **Secondary LLM Engine** | Groq Cloud LPU | `qwen/qwen3.8-27b`, `llama-3.3-70b-versatile` | Ultra-low-latency structured classification and JSON parsing |
| **Auxiliary Model Support** | xAI Grok & Local Ollama | `grok-2-latest`, `llama3:latest` | Failover fallback and air-gapped local execution support |
| **Cloud Database** | Supabase (PostgreSQL) | `supabase-py` >= 2.0.0 | Multi-tenant relational persistence, audit events, and vector store |
| **Local File Stores** | SQLite & Flat JSON Stores | SQLite3 (`runtime/repo.sqlite`), JSON files | Fully functional zero-dependency local operation and test harness |
| **Web Research** | Tavily Search API | `tavily-python` >= 0.5.0 | Grounded real-time account recon and verified news signal discovery |
| **Dispatch Gateway** | Courier (Resend API) | TLS Authenticated SMTP/REST | Rate-limited transactional delivery with tamper-evident receipts |
| **Intelligence Protocol** | Spyglass MCP Client | Model Context Protocol (MCP) Bridge | 15-min competitor crawls, telemetry tracking, and ad monitoring |

---

## 3. High-Level System Architecture & Component Diagram

```
                                      +---------------------------------------------+
                                      |            React 18 + Vite Web UI           |
                                      |  (Apex Command / Studio / Review Desk /     |
                                      |   Tasks / Weekly Planner / Mission Control) |
                                      +----------------------+----------------------+
                                                             | HTTP / JSON REST
                                                             v
+-------------------------------------------------------------------------------------------------------------------+
|                                            FastAPI Application (api_server.py)                                     |
|  CORS Middleware | PrivateNetworkAccessMiddleware | Pydantic Schema Validation | Exception Handling               |
+-------------------------------------------------------------------------------------------------------------------+
     |                            |                               |                              |
     v                            v                               v                              v
+------------------+     +-------------------+          +-------------------+          +--------------------+
| Apex Head        |     | Atlas Strategic   |          | LangGraph State   |          | B2B Intelligence   |
| Orchestrator     |     | Task Planner      |          | Machine Engine    |          | Pipeline           |
| (core/           |     | (core/planner.py  |          | (core/graph.py)   |          | (b2b_pipeline/     |
| head_orchestrator|     | & weekly_planner) |          |                   |          | agents.py & social)|
+--------+---------+     +---------+---------+          +---------+---------+          +---------+----------+
         |                         |                              |                              |
         +-------------------------+------------------------------+------------------------------+
                                   |
                                   v
             +---------------------------------------------+
             |         Central Agent Fleet Registry         |
             |       (10 Specialized Agents + 2 Rules)     |
             +---------------------+-----------------------+
                                   |
         +-------------------------+-------------------------+
         |                                                   |
         v                                                   v
+----------------------------------+               +----------------------------------+
|      Unified LLM Gateway         |               |     Deterministic Security       |
|       (agents/llm.py)            |               |  (Warden & core/permissions.py)  |
| Gemini 3.8 / Groq / Grok / Local |               |  Anti-spam / Opt-out / RBAC Gate |
+----------------+-----------------+               +-----------------+----------------+
                 |                                                   |
                 +-------------------------+-------------------------+
                                           |
                                           v
             +---------------------------------------------+
             |           Dual Persistence Layer            |
             |  SqliteSaver (Checkpoints) | JSON Stores   |
             |  repo.sqlite (Local)       | Supabase (Cloud)|
             +---------------------------------------------+
```

---

## 4. The 12-Agent Fleet Specification

The system structures work across 10 specialized AI agents, 2 deterministic rules engines, and planned cryptographic verifiers:

```
[Orchestration]  --> Apex (Head Orchestrator) | Atlas (Task Graph Conductor)
[Strategy]       --> Compass (Unit Economics & Positioning)
[Intelligence]   --> Scout (Account Recon) | Cadence (Timing Scorer) | Spyglass (Market Recon)
[Execution]      --> Quill (Outreach Copy) | Muse (Collateral) | Herald (Campaigns)
[Trust & Policy] --> Veritas (Claim Auditor) | Warden (Deterministic Policy Gate)
[Dispatch/Learn] --> Courier (Safe Sender) | Echo (Reply Classifier) | Sage (Learning Loop)
```

### Agent Detailed Breakdown

| Agent Name | Agent ID | Kind | Category | Primary Job & Mission | Allowed Actions ("Can") | Forbidden Actions ("Cannot") |
|---|---|---|---|---|---|---|
| **Apex Commander** | `apex` | `ai_agent` | Orchestration | Autonomous Chief of Staff coordinating the entire fleet and briefing executive leadership | • Decompose high-level strategy<br>• Allocate workloads across sub-agents<br>• Enforce autonomy boundaries | • Bypass human approval gates<br>• Execute financial commitments<br>• Falsify agent progress |
| **Atlas** | `atlas` | `ai_agent` | Orchestration | Plans phase-aware Directed Acyclic Graph (DAG) task structures and coordinates agent handoffs | • Formulate phase-aware task graphs<br>• Track task prerequisites<br>• Flag missing information | • Dispatch outreach communications<br>• Alter completed task audit trails<br>• Hallucinate business data |
| **Compass** | `compass` | `ai_agent` | Strategy | Synthesizes positioning options, unit-economics models, and ranks validation hypotheses | • Formulate positioning options<br>• Produce unit-economics models<br>• Identify core business assumptions | • Commit capital or budgets<br>• Present estimates as verified facts<br>• Contact target prospects |
| **Scout** | `scout` | `ai_agent` | Intelligence | Mines documents, web sources, and registry data for verified facts and target account signals | • Extract verified facts from documents<br>• Research target account signals<br>• Assign strict provenance ratings | • Generate ungrounded assumptions<br>• Contact target accounts directly<br>• Alter CRM customer records |
| **Cadence** | `cadence` | `ai_agent` | Intelligence | Calculates ICP fit, timing readiness, and recommends optimal engagement pacing | • Calculate ICP alignment scores<br>• Compute buyer urgency and timing<br>• Issue ACT/WAIT/REJECT rulings | • Dispatch messages directly<br>• Override quiet hours or contact caps<br>• Contact unqualified accounts |
| **Spyglass** | `spyglass` | `ai_agent` | Intelligence | Crawls competitor positioning, pricing changes, ad libraries, and monitors system telemetry | • 15-minute competitor crawls<br>• Ad and creative teardowns<br>• Stream performance telemetry | • Modify competitor accounts<br>• Dispatch public marketing campaigns<br>• Bypass network isolation |
| **Quill** | `quill` | `ai_agent` | Execution | Drafts consultative outbound messages grounded strictly in verified facts | • Generate personalized email/LinkedIn copy<br>• Cite Scout-verified facts<br>• Adapt to brand tone guidelines | • Send communications without sign-off<br>• Invent ungrounded claims or stats<br>• Access customer mailboxes |
| **Muse** | `muse` | `ai_agent` | Execution | Produces grounded value propositions, one-pagers, and case study briefs | • Draft sales one-pagers & collateral<br>• Synthesize case study proof points<br>• Align copy to brand standards | • Publish collateral publicly<br>• Alter product specifications<br>• Bypass Veritas trust audit |
| **Herald** | `herald` | `ai_agent` | Execution | Structures multi-channel campaign calendars and designs measurable growth tests | • Design multi-channel campaign calendars<br>• Structure testable growth hypotheses<br>• Delegate messaging to Quill | • Deploy or spend marketing budget<br>• Bypass anti-spam sending limits<br>• Approve own campaign plans |
| **Veritas** | `veritas` | `ai_agent` | Trust & Policy | Sentence-level claim auditor checking truthfulness, numbers, dates, PII, and warranties | • Audit sentence-level claims<br>• Verify pricing, stats, and commitments<br>• Calculate mathematical trust score | • Unilaterally modify copy without record<br>• Dismiss flags without resolution<br>• Dispatch outbound messages |
| **Warden** | `warden` | `rules_engine` | Trust & Policy | 100% deterministic code engine enforcing quiet hours, contact caps, and opt-outs | • Enforce quiet hours & frequency caps<br>• Detect blacklisted terms & warranties<br>• Hard-lock the dispatch pipeline | • Use fuzzy or probabilistic LLM reasoning<br>• Be overridden by upstream agents<br>• Ignore unsubscribe requests |
| **Courier** | `courier` | `rules_engine` | Execution | Executes approved email deliveries and records tamper-evident receipts | • Execute approved TLS email dispatch<br>• Generate tamper-evident receipts<br>• Record delivery metadata | • Send unapproved or edited drafts<br>• Modify recipient parameters<br>• Execute without consensus clearance |
| **Echo** | `echo` | `ai_agent` | Learning | Classifies inbound replies, detects objections, and routes human escalations | • Classify reply sentiment and intent<br>• Detect urgent escalation triggers<br>• Draft contextual responses | • Auto-reply to legal questions<br>• Ignore opt-out or unsubscribe requests<br>• Make binding commitments |
| **Sage** | `sage` | `ai_agent` | Learning | Correlates campaign outcomes with messaging features to extract verified playbooks | • Correlate outcomes with copy features<br>• Extract statistically sound patterns<br>• Recommend ICP prompt refinements | • Update guidelines without sign-off<br>• Tamper with historical audit logs<br>• Expose PII in aggregate reports |
| **Vanguard** | `vanguard` | `ai_agent` | Intelligence & Growth | Tracks real task completions, calculates till-growth, and accurately predicts 14-90 day near and expected future growth | • Track real sprint task completions<br>• Model 14-day near-term milestones<br>• Calculate 30/60/90 day scenario curves | • Fabricate artificial progress<br>• Bypass verified CRM records<br>• Guarantee non-statistical revenue |

---

## 5. LangGraph Workflow & State Machine Mechanics

### Core Workflow Execution Graph

The pipeline executes through a compiled LangGraph `StateGraph` over the typed `GrowthState` schema:

```
[START]
   │
   ▼
[load_profile_node] ──── (Fetch business profile, KB docs, lead context)
   │
   ▼
[orchestrator_plan_node] (Atlas plans step allocation)
   │
   ▼
[research_node] ──────── (Scout extracts facts with provenance)
   │
   ▼
[scoring_node] ───────── (Cadence evaluates ICP score: 0-100)
   │
   ├── (Score < 50 or REJECT) ─────────► [end_run_node] ──► [END]
   ├── (Needs more intel) ─────────────► [research_node]
   └── (Score >= 50: ACT)
         │
         ▼
[outreach_node] ──────── (Quill drafts message citing Fact IDs)
   │
   ▼
[trust_audit_node] ───── (Veritas sentence-level claims verification)
   │
   ├── (Score < 60 or High Flags) ─────► [outreach_node] (Automatic rewrite)
   └── (Score >= 60)
         │
         ▼
[policy_check_node] ──── (Warden deterministic checks: quiet hours, caps)
   │
   ├── (Hard Violation) ───────────────► [outreach_node] (Revision required)
   └── (Policy Passed)
         │
         ▼
[human_review_node] ──── (MANDATORY HITL CHECKPOINT: interrupt(review_payload))
   │
   ├── [Command: Reject] ──────────────► [end_run_node (status=rejected)] ──► [END]
   ├── [Command: Edit] ────────────────► [trust_audit_node] (Re-audit edited copy)
   └── [Command: Approve]
         │
         ▼
[mock_send_node] ─────── (Courier executes verified TLS delivery receipt)
   │
   ▼
[followup_node] ──────── (Echo monitors inbound reply stream)
   │
   ▼
[learning_node] ──────── (Sage extracts performance patterns)
   │
   ▼
[save_memory_node] ───── (Persist trace, outcomes, and state snapshots)
   │
   ▼
 [END]
```

### Table-Driven Task State Machine (`core/state_machine.py`)

Individual tasks managed by Atlas operate under a strict, table-driven state machine:

```
               ┌──────────┐
               │ Planned  │
               └────┬─────┘
                    │
                    ▼
               ┌──────────┐
      ┌───────►│ Assigned │
      │        └────┬─────┘
      │             │
      │             ▼
      │        ┌──────────┐
      │   ┌───►│ Running  │◄───┐
      │   │    └────┬─────┘    │
      │   │         │          │
      │   │         ▼          │
      │   │  (Review Needed)   │
      │   │    ┌──────────┐    │
      │   │    │  Client  │    │
      │   │    │  Review  │    │
      │   │    └────┬─────┘    │
      │   │         │          │
      │   │         ▼          │
      │   │    ┌──────────┐    │
      │   │    │ Approved │    │
      │   │    └────┬─────┘    │
      │   │         │          │
      │   │         ▼          │
      │   │    ┌──────────┐    │
      │   └─── │Executing │────┘
      │        └────┬─────┘
      │             │
      │             ▼
      │        ┌──────────┐
      └────────│Completed │ (Planned re-runs permitted)
               └──────────┘
```

#### Allowed State Transitions Matrix

```python
LEGAL_TRANSITIONS: dict[TaskStatus, set[TaskStatus]] = {
    "planned":        {"assigned", "blocked", "client_review", "admin_approval", "cancelled"},
    "assigned":       {"running", "blocked", "client_review", "admin_approval", "paused", "cancelled"},
    "running":        {"blocked", "client_review", "admin_approval", "executing", "completed", "failed", "paused", "cancelled"},
    "blocked":        {"planned", "assigned", "running", "executing", "cancelled"},
    "client_review":  {"approved", "failed", "running", "cancelled"},
    "admin_approval": {"approved", "failed", "running", "cancelled"},
    "approved":       {"executing", "completed", "failed", "cancelled"},
    "executing":      {"completed", "failed", "paused", "cancelled", "client_review", "admin_approval"},
    "paused":         {"planned", "assigned", "running", "executing", "cancelled"},
    "failed":         {"planned", "cancelled"},
    "completed":      {"planned"},
    "cancelled":      set(),  # Terminal state
}
```

---

## 6. Mathematical Formulations & Scoring Models

### 1. Heuristic Task Priority Formula (`core/ranking.py`)

Atlas ranks tasks using a multi-factor weighted equation:

$$P = 0.30 \times \text{Impact} + 0.25 \times \text{Urgency} + 0.20 \times \text{Readiness} + 0.15 \times \text{DependencyImportance} + 0.10 \times \text{EvidenceConfidence}$$

- **Impact (0.00 – 1.00):** Weighted by assigned agent criticality (`Atlas=0.95`, `Quill=0.90`, `Courier=0.92`, `Veritas=0.88`, `Scout=0.85`).
- **Urgency (0.00 – 1.00):** Evaluated at $0.90$ if resolving an unknown fact, $0.85$ for root tasks, $0.70$ for standard backlog items.
- **Readiness (0.00 – 1.00):** Ratio of satisfied prerequisite dependencies: $\frac{\sum \text{Satisfied Dependencies}}{\text{Total Dependencies}}$. Blended with business readiness score: $\text{Readiness} = 0.70 \times \text{DepRatio} + 0.30 \times (\frac{\text{ReadinessScore}}{100})$.
- **Dependency Importance (0.00 – 1.00):** Ratio of downstream tasks blocked by this task: $\frac{\text{Downstream Tasks}}{\text{Total Tasks} - 1}$.
- **Evidence Confidence (0.00 – 1.00):** $0.90$ if evidence requirements exist, downgraded to $0.50$ if dependent on unknown facts.

### 2. Veritas Trust Score & Penalty Model (`shared/schemas.py`)

Outreach copy begins with a base score of $100$. Open flags deduct points based on severity:

$$\text{Trust Score} = \max\left(0, 100 - \sum_{f \in \text{Open Flags}} \text{Penalty}(f.\text{severity})\right)$$

Where:
- $\text{Penalty}(\text{high}) = 30 \text{ points}$
- $\text{Penalty}(\text{medium}) = 15 \text{ points}$
- $\text{Penalty}(\text{low}) = 5 \text{ points}$

**Category Score Formula:**
$$\text{CategoryScore}(c) = \max\left(0.0, 1.0 - (\text{Count of open flags in category } c \times 0.25)\right)$$

**Verdict Determination:**
- **`FAIL`:** Any open flag with $\text{severity} = \text{"high"}$ OR $\text{Trust Score} < 60$.
- **`REVIEW`:** Any open flag with $\text{severity} = \text{"medium"}$ OR $60 \le \text{Trust Score} < 80$.
- **`PASS`:** No high/medium open flags AND $\text{Trust Score} \ge 80$.

When a human accepts (fixes) or dismisses (false alarm) a flag in the Review Desk, `recompute_score()` executes dynamically, clearing the deduction.

---

## 7. Complete API Endpoint Catalog (`api_server.py`)

The FastAPI application provides 38 endpoints across 9 functional groups:

### 1. Health & Agents
- `GET /api/health`
  - Returns backend status, active storage layer, model provider, and Supabase connectivity.
- `GET /api/agents`
  - Returns the list of registered agents, role definitions, and system totals.

### 2. Business Profiles & Onboarding
- `GET /api/businesses`
  - Retrieves all configured business profiles.
- `GET /api/businesses/{business_id}`
  - Fetches specific business profile by ID.
- `POST /api/businesses`
  - Creates a new business profile with industry, ICP, offerings, and tone.
- `POST /api/onboarding/session`
  - Initializes a new adaptive onboarding session.
- `GET /api/onboarding/session/{session_id}`
  - Loads an active onboarding session with classified facts and readiness scores.
- `POST /api/onboarding/session/{session_id}/save`
  - Autosaves 8-question core intake answers and updates readiness scores.
- `POST /api/onboarding/session/{session_id}/follow-ups`
  - Dynamically generates model-specific follow-up questions.
- `GET /api/onboarding/sessions`
  - Lists historical onboarding sessions.

### 3. Pipeline Runs & Review Desk (HITL)
- `POST /api/runs`
  - Initiates a LangGraph autonomous pipeline execution.
- `GET /api/runs`
  - Lists all pipeline runs.
- `GET /api/runs/{run_id}`
  - Retrieves state, status, and summaries for a specific run.
- `GET /api/runs/{run_id}/trace`
  - Returns audit trace events (`TraceEvent`) with agent inputs/outputs.
- `GET /api/runs/{run_id}/review`
  - Fetches review payloads (draft, trust report, policy check) for paused runs.
- `POST /api/runs/{run_id}/flags/{flag_id}`
  - Updates flag status (`accepted` or `dismissed`) and recalculates trust score.
- `POST /api/runs/{run_id}/approval`
  - Submits human review decision (`approve`, `edit`, `reject`) to resume execution.
- `GET /api/businesses/{business_id}/insights`
  - Fetches performance analytics and recommendations from Sage.
- `POST /api/pipeline/run`
  - Executes full B2B pipeline run (account discovery to delivery).
- `GET /api/pipeline/latest`
  - Returns latest pipeline state and CRM synchronizations.

### 4. Apex Head Orchestrator & Executive Command
- `GET /api/orchestrator/overview`
  - Compiles comprehensive telemetry for Apex Commander (fleet status, approvals, KPIs, dossiers).
- `POST /api/orchestrator/command`
  - Processes natural language executive commands, performs sub-agent delegation, and returns briefing.
- `POST /api/orchestrator/approval`
  - Processes bidirectional human approvals/rejections across campaigns and tasks.
- `POST /api/orchestrator/autonomy`
  - Toggles orchestrator autonomy mode (`oversight`, `supervised`, `autonomous`).

### 5. Strategic Weekly Planner
- `GET /api/planner/weekly-plan`
  - Retrieves active weekly strategic sprint plan (Monday through Friday workloads).
- `POST /api/planner/weekly-plan/generate`
  - Generates a customized 5-day multi-agent sprint plan.
- `POST /api/planner/weekly-plan/audit`
  - Executes Atlas strategic audit over weekly deliverables.
- `PUT /api/planner/weekly-plan/todo/{item_id}`
  - Manually or automatically toggles completion status for a todo item.
- `POST /api/planner/weekly-plan/todo/{item_id}/execute`
  - Triggers autonomous agent execution for a specific sprint task.
- `POST /api/planner/weekly-plan/execute-day/{day}`
  - Executes all scheduled agent workloads for a given day in batch.
- `POST /api/planner/weekly-plan/execute-all`
  - Executes entire weekly sprint workload across all agents.
- `GET /api/planner/weekly-plan/notion-export`
  - Exports formatted strategic sprint plan ready for Notion database ingestion.

### 6. Social Intent-to-Sale Agent
- `POST /api/social-intent/scan`
  - Scans competitor comment conversations for buying intent.
- `GET /api/social-intent/leads`
  - Retrieves qualified social leads, intent scores, and Meta-compliant drafts.
- `POST /api/social-intent/leads/{lead_id}/status`
  - Updates lead workflow status (`queued_for_human`, `public_replied`, `dm_sent`, `dismissed`).

### 7. Email Dispatch, Inbound Sync & Echo Reply Intelligence
- `GET /api/crm/records`
  - Fetches CRM accounts and contact records.
- `POST /api/email/dispatch`
  - Dispatches authorized emails via Courier with TLS delivery receipts.
- `GET /api/email/outbox`
  - Returns delivery receipts and message logs.
- `POST /api/email/sync-inbox`
  - Synchronizes inbound replies from target prospects.
- `POST /api/email/process-reply`
  - Invokes Echo to classify sentiment, extract objections, and draft responses.
- `POST /api/email/inbound-webhook`
  - Handles external email provider webhooks.

### 8. Spyglass Intelligence & Telemetry
- `GET /api/spyglass/status`
  - Checks health of connected Spyglass MCP protocol bridge.
- `GET /api/spyglass/telemetry`
  - Retrieves execution telemetry (latency, token efficiency, node health).
- `POST /api/spyglass/telemetry`
  - Ingests agent telemetry records into monitor.
- `GET /api/spyglass/competitive`
  - Returns competitor pricing matrices, positioning alerts, and scans.
- `GET /api/spyglass/campaigns`
  - Returns creative ad tear-downs across Meta, TikTok, and Instagram.
- `GET /api/spyglass/enterprise`
  - Fetches enterprise account enrichment and buying trigger signals.

### 9. Atlas Dynamic Task Workspace
- `POST /api/tasks/plan`
  - Generates phase-aware task graph for a business.
- `GET /api/tasks`
  - Lists all active and planned tasks.
- `GET /api/tasks/{task_id}`
  - Fetches task details and snapshot history.
- `PUT /api/tasks/{task_id}`
  - Updates task definition and increments version counter.
- `POST /api/tasks/{task_id}/transition`
  - Executes table-validated state transition.
- `POST /api/tasks/{task_id}/pause`
  - Pauses running task.
- `POST /api/tasks/{task_id}/resume`
  - Resumes paused task.
- `POST /api/tasks/{task_id}/execute`
  - Triggers agent execution of task deliverables.
- `GET /api/tasks/{task_id}/report`
  - Fetches typed `AgentReport` deliverable.
- `POST /api/tasks/{task_id}/answer`
  - Records user answer for missing information items.
- `POST /api/tasks/{task_id}/approve`
  - Records administrative approval.

---

## 8. Data Management & Persistence Architecture

The system uses a tiered storage strategy ensuring durability, zero-dependency offline development, and enterprise cloud compatibility:

```
                                  Unified Data Layer (core/repo)
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   ▼                                                           ▼
       Local Persistence Tier                                     Cloud Enterprise Tier
   - SQLite Checkpointing (runtime/checkpoints.sqlite)         - Supabase PostgreSQL (REST/RPC)
   - Local DB (runtime/repo.sqlite)                           - Row Level Security (RLS)
   - Flat JSON Stores (b2b_pipeline/*_store.json)             - Vault Credentials
   - In-memory test harnesses                                 - Vector Embeddings Store
```

### 1. SQLite Checkpointing (`SqliteSaver`)
- **Location:** `runtime/checkpoints.sqlite`
- **Mechanism:** Implements LangGraph `checkpointer=SqliteSaver(conn)`.
- **Purpose:** Saves state snapshots across all graph nodes. When execution halts at `human_review_node`, state is preserved to disk. The server can restart or scale horizontally without losing execution state.

### 2. Local File Stores
- **CRM Store (`b2b_pipeline/crm_mock_store.json`):** Tracks accounts, buyer personas, outreach status, delivery receipts, and reply threads.
- **Social Leads Store (`b2b_pipeline/social_leads_store.json`):** Records discovered social comments, intent analyses, compliance routes, and draft replies.
- **Weekly Plan Store (`b2b_pipeline/weekly_plan_store.json`):** Persists 5-day sprint plans, task completion states, execution dossiers, and strategic audits.

### 3. Cloud Supabase Schema Design (`core/repo/supabase.py`)
For multi-tenant production deployments, the system maps to PostgreSQL tables:
- `organizations`: Tenant metadata and subscription tiers.
- `organization_members`: Role-Based Access Control (`owner`, `admin`, `member`).
- `business_profiles`: Business descriptions, ICP, brand voice, and anti-spam limits.
- `business_facts`: Verified facts, assumptions, and research findings with timestamps.
- `onboarding_sessions`: Conversational intake sessions, follow-up Q&A, readiness metrics.
- `tasks` & `task_versions`: Atlas task DAG, version snapshots, and state machine states.
- `task_events`: Tamper-evident ledger of all task state transitions.
- `agent_reports`: Structured deliverables, findings, evidence citations, and confidence scores.
- `runs`: LangGraph pipeline executions and state summaries.
- `trace_events`: Step-by-step audit trails of agent actions and reasoning.
- `approvals`: Cryptographically traceable human sign-offs.
- `outcomes`: Delivery receipts, replies, and booked meetings.

---

## 9. Comprehensive End-to-End User Flows

```
[Flow 1: Intake & Onboarding] ──► [Flow 2: Strategic Planning] ──► [Flow 3: Apex Command]
                                                                          │
                                                                          ▼
[Flow 6: Inbound Triage] ◄── [Flow 5: Review & Consensus] ◄── [Flow 4: Recon & Drafting]
```

### Flow 1: First-Run Onboarding & Business Profiling
1. User navigates to `/onboard`.
2. Completes 8-question core intake (Business Stage, Business Type, Name, Idea, Budget, Growth Goal, Current Traction, Constraints).
3. System classifies initial answers into `ClassifiedFact` records (`user_stated` vs `user_assumption`).
4. System computes baseline **Readiness Score** across Foundation, Pre-Sales, and Growth phases.
5. System invokes LLM Gateway to generate dynamic follow-up questions tailored to the business model (with deterministic question-bank fallback).
6. User answers follow-ups; answers are classified, resolving critical unknowns.
7. Business profile and facts are committed to the repository.

### Flow 2: Strategic Sprint Planning & Atlas Task Graph
1. User navigates to `/tasks` or `/workspace?tab=planner`.
2. Atlas evaluates classified facts and active growth phase, generating a phase-aware Task Graph (DAG).
3. Task priorities are computed using the heuristic ranking formula.
4. User clicks **"Generate 5-Day Weekly Sprint"**; Atlas generates day workloads (Monday to Friday) with themes:
   - *Monday:* Strategic Foundation & Competitor Teardowns
   - *Tuesday:* Target Account Prospecting & Buying Trigger Discovery
   - *Wednesday:* Value Proposition Synthesis & Asset Formatting
   - *Thursday:* Claim Grounding Audit & Consensus Review Clearance
   - *Friday:* Delivery Dispatch & Inbound Reply Triage
5. Atlas runs an automated **Strategic Audit** validating task coherence, agent allocation, and safety constraints.
6. User can execute individual todos, batch-execute entire day workloads, or export to Notion.

### Flow 3: Apex Autonomous Command & Fleet Delegation
1. User navigates to `/command` (Apex Executive Deck).
2. User selects desired autonomy mode:
   - **Oversight:** All actions require human sign-off.
   - **Supervised (Default):** Intelligence gathering is autonomous; outbound dispatches require approval.
   - **Autonomous:** Routine tasks execute automatically; only policy violations trigger escalations.
3. User enters a natural language directive (e.g., *"Discover 10 enterprise logistics accounts and prepare verified outreach"*).
4. Apex parses intent, decomposes steps, and dispatches tasks across sub-agents (**Scout**, **Cadence**, **Quill**, **Veritas**).
5. User views real-time delegation steps, findings, and an executive briefing.
6. Resulting outreach drafts appear in the **Approval Clearance Gateway**.

### Flow 4: High-Intent Social Lead Prospecting
1. User opens `/workspace?tab=social` (Social Intent Studio).
2. User enters competitor account handle and initiates a scan.
3. **Social Intent Agent** mines comment conversations, scoring buying intent (0–100) across 5 categories.
4. Agent enforces Meta Platform Messaging Policy:
   - Cold public comments receive `can_auto_dm = False` to prevent automated spam penalties.
   - Generates permission-based public replies (Route B) and human-sent DM drafts (Route D).
5. User reviews qualified leads, updates status (`queued_for_human`, `public_replied`, `dm_sent`), and pushes qualified accounts to CRM.

### Flow 5: Human-in-the-Loop Review Desk & Factual Audit
1. When a pipeline run completes draft generation, execution reaches `human_review_node` and halts via LangGraph `interrupt()`.
2. User opens `/review` or `/run/:runId/review`.
3. The Review Desk displays the draft copy alongside the **Veritas Trust Audit Report**:
   - Flagged sentences with color-coded severity (Unsupported Claims, Numerical Mismatches, Regulatory Risks).
   - Category scores and mathematical trust score (0–100).
   - Side-by-side evidence citations from verified KB documents.
4. User can inspect flags, accept corrections, or dismiss false alarms (triggering dynamic score recomputation).
5. User can edit message copy directly in the editor.
6. User submits decision:
   - **Approve:** Resumes execution to `mock_send_node` via `Command(resume=ApprovalDecision(decision='approve'))`.
   - **Edit:** Re-audits updated copy through Veritas and Warden before dispatch.
   - **Reject:** Terminates run cleanly, recording audit logs.

### Flow 6: Courier Dispatch, Inbox Sync & Echo Objection Handling
1. Approved drafts route to **Courier** for TLS-authenticated dispatch.
2. Courier generates delivery receipts with timestamps and message IDs, updating CRM records.
3. User navigates to `/workspace?tab=studio` (Email Intelligence Desk) and clicks **"Sync Inbound Mailbox"**.
4. System retrieves incoming prospect replies.
5. **Echo** analyzes responses:
   - Classifies intent (`interested`, `objection`, `question`, `unsubscribe`).
   - Detects objections (e.g., *"Already evaluating another vendor"*, *"Budget allocated for Q3"*).
   - Drafts contextual responses grounded in verified differentiation facts.
   - Flags sensitive questions for mandatory human escalation.
6. User reviews draft response and approves follow-up dispatch.

### Flow 7: Continuous Self-Learning Loop (Sage Analytics)
1. As campaigns generate outcomes (replies, booked meetings, unsubscribes), records append to the repository.
2. User opens `/results`.
3. **Sage** correlates outreach features (subject line styles, value proposition angles, cited case studies) against conversion metrics.
4. Identifies statistically supported patterns (e.g., *"Personalized proof points increased reply rates by 3.4x over generic hooks"*).
5. Sage formulates recommendations for Quill's system prompt and business profile ICP guidelines, closing the autonomous growth loop.

---

## 10. Operational Constraints & Compliance Rules

1. **Anti-Spam & Delivery Safety:**
   - Maximum 3 contact attempts per lead per week.
   - Strict quiet hours (20:00 to 08:00 local time).
   - Automatic immediate suppression upon receipt of unsubscribe intent.
2. **Deterministic Security Precedence:**
   - Warden's deterministic rules engine holds absolute veto power over all LLM agent proposals.
3. **No Unauthenticated Dispatches:**
   - Delivery receipts are never fabricated; failed API credentials trigger clean errors rather than mock receipts.
4. **Data Isolation & Privacy:**
   - Multi-tenant data segregation enforced at the repository layer.
   - PII is masked from aggregate reporting and model training datasets.
