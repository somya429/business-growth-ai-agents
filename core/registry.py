"""Agent Fleet Registry for Verity Growth System.

Defines all available AI agents, deterministic rules engines, and planned modules.
Backed by typing, validation, phase relevance, and capabilities metadata.
"""

from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


AgentKind = Literal["ai_agent", "rules_engine"]
AgentStatus = Literal["active", "planned"]
PhaseType = Literal["foundation", "presales_readiness", "growth_optimization"]


class AgentDefinition(BaseModel):
    id: str
    name: str
    role: str
    one_line_job: str
    kind: AgentKind
    category: str
    icon: str
    can: list[str]
    cannot: list[str]
    phases: list[PhaseType]
    status: AgentStatus = "active"


class AgentRegistrySummary(BaseModel):
    total_count: int
    ai_count: int
    rules_engine_count: int
    planned_count: int
    display_label: str


AGENT_REGISTRY: list[AgentDefinition] = [
    # Orchestration
    AgentDefinition(
        id="atlas",
        name="Atlas",
        role="Orchestrator & Task Graph Conductor",
        one_line_job="Plans phase-aware task graphs, manages dependencies, and coordinates agent handoffs.",
        kind="ai_agent",
        category="orchestration",
        icon="Compass",
        can=[
            "Formulate phase-aware growth task graphs from business facts",
            "Coordinate multi-agent state transitions and task dispatch",
            "Track task dependencies and identify missing information requirements",
        ],
        cannot=[
            "Send outbound communications to external prospects",
            "Bypass human review or policy gates",
            "Fabricate business data to complete tasks",
        ],
        phases=["foundation", "presales_readiness", "growth_optimization"],
        status="active",
    ),
    # Intelligence & Strategy
    AgentDefinition(
        id="compass",
        name="Compass",
        role="Strategy & Unit Economics Architect",
        one_line_job="Synthesizes positioning options, builds unit-economics models, and ranks validation hypotheses.",
        kind="ai_agent",
        category="strategy",
        icon="MapPin",
        can=[
            "Formulate positioning options from onboarding facts and competitive research",
            "Produce pricing hypotheses and unit-economics estimates (clearly labeled as estimates)",
            "Rank critical assumptions for validation priority",
        ],
        cannot=[
            "Spend budget or commit capital",
            "Contact external prospects or vendors directly",
            "Present financial projections without estimate provenance labels",
        ],
        phases=["foundation", "growth_optimization"],
        status="active",
    ),
    AgentDefinition(
        id="scout",
        name="Scout",
        role="Account & Market Intelligence Researcher",
        one_line_job="Extracts verified facts from documents and researches target account signals.",
        kind="ai_agent",
        category="intelligence",
        icon="Search",
        can=[
            "Extract verified facts from approved company documents and websites",
            "Research target account signals, business models, and buyer personas",
            "Assign strict provenance ratings to every finding",
        ],
        cannot=[
            "Generate ungrounded factual assumptions or hallucinations",
            "Contact target leads directly",
            "Modify corporate CRM or master data records",
        ],
        phases=["foundation", "presales_readiness"],
        status="active",
    ),
    AgentDefinition(
        id="cadence",
        name="Cadence",
        role="Scoring & Outreach Timing Engine",
        one_line_job="Calculates ICP fit, timing readiness, and recommends optimal engagement pacing.",
        kind="ai_agent",
        category="intelligence",
        icon="Clock",
        can=[
            "Calculate ICP alignment and buying intent scores based on verified criteria",
            "Determine optimal contact cadence and why-now urgency",
            "Issue ACT / WAIT / REJECT / RESEARCH_MORE qualification rulings",
        ],
        cannot=[
            "Trigger message dispatch directly",
            "Override quiet hours, frequency caps, or opt-out lists",
            "Contact unqualified or unverified accounts",
        ],
        phases=["presales_readiness"],
        status="active",
    ),
    # Content & Outreach
    AgentDefinition(
        id="quill",
        name="Quill",
        role="Personalized Outreach Synthesizer",
        one_line_job="Drafts consultative outbound messages strictly grounded in verified facts.",
        kind="ai_agent",
        category="execution",
        icon="Feather",
        can=[
            "Generate personalized email and LinkedIn drafts",
            "Ground every claim strictly in Scout-verified facts and approved documents",
            "Adapt copy to target persona priorities and approved tone guidelines",
        ],
        cannot=[
            "Send communications without human approval",
            "Invent unverified certifications, case studies, or pricing terms",
            "Access external messaging providers or customer email accounts",
        ],
        phases=["presales_readiness"],
        status="active",
    ),
    AgentDefinition(
        id="muse",
        name="Muse",
        role="Content & Sales Collateral Formulator",
        one_line_job="Produces grounded value propositions, one-pagers, and case study briefs.",
        kind="ai_agent",
        category="execution",
        icon="Sparkles",
        can=[
            "Draft grounded white papers, one-pagers, and sales collateral",
            "Synthesize customer case studies and proof points from verified data",
            "Create multi-channel outreach assets aligned with brand guidelines",
        ],
        cannot=[
            "Publish assets to public channels without review",
            "Alter approved technical or legal product specifications",
            "Bypass Veritas trust audit verification",
        ],
        phases=["presales_readiness"],
        status="active",
    ),
    AgentDefinition(
        id="herald",
        name="Herald",
        role="Campaign Planner & Experiment Designer",
        one_line_job="Structures multi-channel campaign calendars and designs measurable growth tests.",
        kind="ai_agent",
        category="execution",
        icon="Megaphone",
        can=[
            "Design multi-channel campaign plans with timeline and channel splits",
            "Define testable growth experiments with explicit hypotheses and success metrics",
            "Delegate messaging tasks to Quill while enforcing frequency caps",
        ],
        cannot=[
            "Send, publish, or spend marketing budget directly",
            "Bypass Warden anti-spam limits or email sending quotas",
            "Approve its own campaign plans for deployment",
        ],
        phases=["presales_readiness", "growth_optimization"],
        status="active",
    ),
    # Trust & Compliance
    AgentDefinition(
        id="veritas",
        name="Veritas",
        role="Trust & Hallucination Auditor",
        one_line_job="Audits every sentence for claim truthfulness, numbers, dates, PII, and warranties.",
        kind="ai_agent",
        category="trust_policy",
        icon="ShieldCheck",
        can=[
            "Audit sentence-level claims against approved knowledge base documents",
            "Verify numbers, dates, pricing tiers, PII, and SLA commitments",
            "Issue PASS / REVIEW / FAIL rulings with granular penalty scoring",
        ],
        cannot=[
            "Rewrite or alter copy unilaterally without transparent change records",
            "Approve flagged discrepancies without explicit human resolution",
            "Dispatch outbound payloads",
        ],
        phases=["foundation", "presales_readiness", "growth_optimization"],
        status="active",
    ),
    AgentDefinition(
        id="warden",
        name="Warden",
        role="Deterministic Policy & Compliance Gate",
        one_line_job="Enforces quiet hours, contact caps, opt-out lists, and hard-locks dispatch.",
        kind="rules_engine",
        category="trust_policy",
        icon="Scale",
        can=[
            "Enforce quiet hours, sending limits, and contact frequency caps",
            "Detect blacklisted terms and unauthorized SLA warranties with 100% deterministic code",
            "Hard-lock the dispatch pipeline until human approval is recorded",
        ],
        cannot=[
            "Use probabilistic or fuzzy LLM reasoning (100% deterministic rule engine)",
            "Be overridden by upstream AI agents",
            "Disregard anti-spam opt-outs or unsubscribe records",
        ],
        phases=["foundation", "presales_readiness", "growth_optimization"],
        status="active",
    ),
    # Dispatch & Learning
    AgentDefinition(
        id="courier",
        name="Courier",
        role="Dispatch Delivery & Receipt Logger",
        one_line_job="Executes approved deliveries and writes tamper-evident audit receipts.",
        kind="rules_engine",
        category="execution",
        icon="Send",
        can=[
            "Generate verified delivery receipts with timestamps and message IDs",
            "Execute approved webhook and email dispatches via verified providers",
            "Log tamper-evident provenance entries into the audit store",
        ],
        cannot=[
            "Send unsanctioned, unreviewed, or unapproved drafts",
            "Modify message content or recipient parameters",
            "Execute without explicit human confirmation in the consensus gate",
        ],
        phases=["growth_optimization"],
        status="active",
    ),
    AgentDefinition(
        id="echo",
        name="Echo",
        role="Response & Sentiment Classifier",
        one_line_job="Classifies inbound replies, detects objections, and routes human escalations.",
        kind="ai_agent",
        category="learning",
        icon="MessageSquare",
        can=[
            "Classify inbound reply intent (interested, question, objection, unsubscribe)",
            "Detect high-urgency escalation triggers for human team follow-up",
            "Formulate contextual reply drafts grounded in verified business answers",
        ],
        cannot=[
            "Auto-reply to sensitive legal or contractual questions",
            "Ignore explicit opt-out or unsubscribe requests",
            "Make binding contractual commitments on behalf of the company",
        ],
        phases=["growth_optimization"],
        status="active",
    ),
    AgentDefinition(
        id="sage",
        name="Sage",
        role="Performance Analytics & Continuous Learning",
        one_line_job="Correlates outreach outcomes with messaging features to extract verified playbooks.",
        kind="ai_agent",
        category="learning",
        icon="TrendingUp",
        can=[
            "Correlate campaign outcomes with draft features and buyer personas",
            "Extract statistically grounded messaging patterns and recommendations",
            "Suggest updates to business profile ICP guidelines based on real results",
        ],
        cannot=[
            "Execute automated guideline changes without explicit human approval",
            "Delete or tamper with historical audit trace records",
            "Expose personally identifiable information in aggregate reports",
        ],
        phases=["growth_optimization"],
        status="active",
    ),
    # Planned Module
    AgentDefinition(
        id="assay",
        name="Assay",
        role="Document Trust & Authenticity Verifier",
        one_line_job="Cryptographically signs, timestamps, and verifies the provenance of grounding assets.",
        kind="ai_agent",
        category="trust_policy",
        icon="FileCheck",
        can=[
            "Calculate cryptographic hashes for uploaded knowledge base assets",
            "Verify document authenticity against authoritative sources",
            "Detect stale or outdated policy documents",
        ],
        cannot=[
            "Modify source documents",
            "Accept ungrounded files without human review",
        ],
        phases=["foundation", "presales_readiness", "growth_optimization"],
        status="planned",
    ),
]


def get_agent_registry() -> list[dict[str, Any]]:
    """Retrieve full agent definitions from registry."""
    return [agent.model_dump() for agent in AGENT_REGISTRY]


def get_registry_summary() -> dict[str, Any]:
    """Compute verified agent and rules engine counts."""
    active_agents = [a for a in AGENT_REGISTRY if a.status == "active"]
    ai_count = sum(1 for a in active_agents if a.kind == "ai_agent")
    rules_engine_count = sum(1 for a in active_agents if a.kind == "rules_engine")
    planned_count = sum(1 for a in AGENT_REGISTRY if a.status == "planned")

    return {
        "total_count": len(active_agents),
        "ai_count": ai_count,
        "rules_engine_count": rules_engine_count,
        "planned_count": planned_count,
        "display_label": f"{ai_count} AI agents + {rules_engine_count} rules engines",
    }
