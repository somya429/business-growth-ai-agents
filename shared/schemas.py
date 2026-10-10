"""Shared schemas for the Growth Agents system."""

from __future__ import annotations

import datetime
import uuid
from typing import Any, Literal
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field


class AntiSpamSettings(BaseModel):
    """Anti-spam constraints and rules for communication."""
    max_contacts_per_week: int = Field(default=3, description="Maximum outreach attempts per lead per week")
    quiet_hours: str = Field(default="20:00-08:00", description="Local quiet hours when contacts must not be made")
    opt_out_list: list[str] = Field(default_factory=list, description="List of emails or domains opted out")


class BusinessProfile(BaseModel):
    """Dynamic profile describing any business without hardcoded logic."""
    name: str = Field(description="Name of the business")
    industry: str = Field(description="Industry vertical")
    offerings: list[str] = Field(default_factory=list, description="Core products or services offered")
    ideal_customer: str = Field(description="Ideal Customer Profile (ICP) description")
    tone: str = Field(default="professional and consultative", description="Communication tone guidelines")
    channels: list[str] = Field(default_factory=lambda: ["email", "linkedin"], description="Allowed communication channels")
    anti_spam: AntiSpamSettings = Field(default_factory=AntiSpamSettings, description="Anti-spam policy")
    enabled_agents: list[str] = Field(
        default_factory=lambda: ["research", "scoring", "outreach", "content", "followup", "learning"],
        description="Active agents in pipeline"
    )


class KnowledgeBaseDoc(BaseModel):
    """Document in the verified knowledge base."""
    id: str = Field(default_factory=lambda: f"kb_{uuid.uuid4().hex[:8]}", description="Unique doc identifier")
    title: str = Field(description="Title of document")
    text: str = Field(description="Full text or excerpts from document")


class Lead(BaseModel):
    """Prospect or target account information."""
    id: str = Field(default_factory=lambda: f"lead_{uuid.uuid4().hex[:8]}", description="Lead identifier")
    name: str = Field(description="Contact full name")
    company: str = Field(description="Company name")
    role: str = Field(description="Job title or role")
    email: str = Field(description="Email address")
    source: str = Field(default="inbound", description="Source of lead (e.g. inbound, crm, outbound_list)")
    status: str = Field(default="new", description="Pipeline status: new, contacted, qualified, opted_out")
    last_contacted: str | None = Field(default=None, description="ISO timestamp or date string of last contact")


class Fact(BaseModel):
    """Atomic verified fact gathered by research."""
    id: str = Field(default_factory=lambda: f"fact_{uuid.uuid4().hex[:8]}", description="Unique identifier for referencing in claims")
    statement: str = Field(description="Factual claim or observation")
    source: str = Field(description="Originating source (doc title, crm record, verified url)")
    source_date: str = Field(description="Date source was recorded or published")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score from 0.0 to 1.0")
    kind: Literal["company", "market", "competitor", "kb"] = Field(description="Category of fact")


class LeadScore(BaseModel):
    """Score and decision regarding whether/when to reach out to a lead."""
    score: int = Field(ge=0, le=100, description="Overall score between 0 and 100")
    breakdown: dict[str, float] = Field(
        default_factory=dict,
        description="Scoring breakdown e.g. fit, intent, freshness, source_quality"
    )
    decision: Literal["ACT", "WAIT", "REJECT", "RESEARCH_MORE"] = Field(description="Action decision")
    reason: str = Field(description="Explanation of scoring decision")
    recheck_after: str | None = Field(default=None, description="Suggested re-evaluation timeframe (e.g. '14 days')")


class Draft(BaseModel):
    """Draft message created for human review."""
    subject: str = Field(description="Subject line for email, or headline for messaging")
    body: str = Field(description="Body copy of message")
    channel: str = Field(default="email", description="Target communication channel")
    claims_used: list[str] = Field(default_factory=list, description="IDs of Fact objects referenced in draft")
    lead_id: str = Field(description="Target lead ID")


class ContentPiece(BaseModel):
    """Marketing or educational content grounded in approved claims."""
    title: str = Field(description="Content title or headline")
    body: str = Field(description="Body of content piece")
    channel: str = Field(description="Target channel (blog, linkedin_post, newsletter)")
    claims_used: list[str] = Field(default_factory=list, description="IDs of Fact objects or approved claims used")


class ReplyAnalysis(BaseModel):
    """Analysis of inbound response from a contact."""
    intent: Literal[
        "interested",
        "not_interested",
        "question",
        "unsubscribe",
        "out_of_office",
        "pricing_or_contract",
        "unclear"
    ] = Field(description="Classified intent")
    next_action: str = Field(description="Recommended next step")
    escalate_to_human: bool = Field(default=False, description="True if human intervention is mandatory")
    reason: str = Field(description="Justification for intent and escalation decision")
    draft_reply: str | None = Field(default=None, description="Suggested draft response if appropriate and non-escalated")


class Outcome(BaseModel):
    """Recorded outcome from an outreach or campaign effort."""
    lead_id: str = Field(description="Lead ID")
    draft_id: str = Field(description="Draft or outreach ID")
    replied: bool = Field(default=False, description="Whether lead replied")
    meeting_booked: bool = Field(default=False, description="Whether meeting was booked")
    unsubscribed: bool = Field(default=False, description="Whether lead unsubscribed")
    complaint: bool = Field(default=False, description="Whether a complaint or negative issue was raised")
    notes: str = Field(default="", description="Qualitative feedback or observation")


class LearningInsight(BaseModel):
    """System-level learning derived from outcomes."""
    pattern: str = Field(description="Discovered pattern or correlation")
    evidence_count: int = Field(ge=0, description="Number of data points supporting pattern")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence in insight")
    recommendation: str = Field(description="Actionable recommendation for future campaigns")


class CampaignReport(BaseModel):
    """Summary report of campaign performance."""
    total_outcomes: int = Field(description="Total outcomes evaluated")
    reply_rate: float = Field(description="Ratio of replies")
    meeting_rate: float = Field(description="Ratio of meetings booked")
    unsubscribe_rate: float = Field(description="Ratio of unsubscribes")
    insights: list[LearningInsight] = Field(default_factory=list, description="Extracted insights")
    summary: str = Field(description="Overall strategic synthesis")


class TraceEvent(BaseModel):
    """Audit trace item capturing agent actions and decisions."""
    agent: str = Field(description="Name of agent executing step")
    step: str = Field(description="Name of action or step taken")
    input_summary: str = Field(description="Concise summary of inputs received")
    output_summary: str = Field(description="Concise summary of outputs produced")
    reason: str = Field(description="Why this step was executed and decisions made")
    timestamp: str = Field(description="ISO timestamp of execution")
    prompt_version: str | None = Field(default=None, description="Version of agent prompt template")


class Flag(BaseModel):
    """Specific claim or safety issue flagged in a draft."""
    id: str = Field(default_factory=lambda: f"flag_{uuid.uuid4().hex[:8]}", description="Unique flag ID")
    category: Literal[
        "unsupported_claim",
        "contradicted_claim",
        "number_mismatch",
        "date_mismatch",
        "name_mismatch",
        "pii",
        "risky_commitment",
    ] = Field(description="Issue category")
    sentence_text: str = Field(description="Flagged sentence or excerpt")
    start: int = Field(default=0, description="Start character index in body")
    end: int = Field(default=0, description="End character index in body")
    reason: str = Field(description="Explanation of why this sentence was flagged")
    severity: Literal["low", "medium", "high"] = Field(description="Flag severity")
    status: Literal["open", "accepted", "dismissed"] = Field(
        default="open",
        description="Current status: open (needs action), accepted (fixed/reviewed), dismissed (false alarm)"
    )


class TrustReport(BaseModel):
    """Trust audit report generated before any communication leaves the system."""
    overall_score: int = Field(ge=0, le=100, default=100, description="Overall trust score between 0 and 100")
    category_scores: dict[str, float] = Field(default_factory=dict, description="Category-level trust scores (0.0 to 1.0)")
    claim_verdicts: list[dict[str, Any]] = Field(
        default_factory=list,
        description="List of claim verdicts: {claim, verdict: SUPPORTED|CONTRADICTED|NOT_FOUND, evidence}"
    )
    flags: list[Flag] = Field(default_factory=list, description="List of flags identified in draft")
    verdict: Literal["PASS", "REVIEW", "FAIL"] = Field(default="PASS", description="Overall trust decision")

    def recompute_score(self) -> int:
        """Recalculate overall_score, category_scores, and verdict based on flag statuses.

        When a flag is accepted (fixed) or dismissed (false alarm), its penalty is removed.
        """
        severity_penalties = {"high": 30, "medium": 15, "low": 5}
        open_flags = [f for f in self.flags if f.status == "open"]
        penalty = sum(severity_penalties.get(f.severity, 10) for f in open_flags)
        self.overall_score = max(0, min(100, 100 - penalty))

        # Recompute category scores
        category_counts: dict[str, int] = {}
        for f in self.flags:
            category_counts.setdefault(f.category, 0)
            if f.status == "open":
                category_counts[f.category] += 1

        for cat, open_count in category_counts.items():
            self.category_scores[cat] = max(0.0, 1.0 - (open_count * 0.25))

        has_high_open = any(f.severity == "high" for f in open_flags)
        has_med_open = any(f.severity == "medium" for f in open_flags)

        if has_high_open or self.overall_score < 60:
            self.verdict = "FAIL"
        elif has_med_open or self.overall_score < 80:
            self.verdict = "REVIEW"
        else:
            self.verdict = "PASS"

        return self.overall_score


class PolicyResult(BaseModel):
    """Result of policy engine rules validation."""
    passed: bool = Field(description="Whether draft and action comply with anti-spam and commercial policies")
    violations: list[dict[str, Any]] = Field(default_factory=list, description="Violations list of {rule, detail}")
    required_edits: list[str] = Field(default_factory=list, description="Mandatory edits required to achieve compliance")


class ApprovalDecision(BaseModel):
    """Human review decision for paused graph executions."""
    decision: Literal["approve", "edit", "reject"] = Field(description="Action decision: approve, edit, or reject")
    edited_body: str | None = Field(default=None, description="Updated message body if human edited the text")
    reviewer: str = Field(default="human", description="Reviewer identifier or name")
    timestamp: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat(), description="ISO timestamp of decision")
    notes: str = Field(default="", description="Optional human reviewer notes or feedback")


# LangGraph-compatible state container with typed fields
from typing_extensions import TypedDict


class GrowthState(TypedDict, total=False):
    """LangGraph state schema for multi-agent growth pipeline."""
    # Identification and execution lifecycle
    run_id: str
    status: Literal["running", "waiting_for_human", "completed", "failed", "rejected"]
    retry_count: dict[str, int]

    # Business and target context
    business_id: str
    profile: dict[str, Any]
    lead: dict[str, Any]
    kb_docs: list[dict[str, Any]]

    # Agent data and progression
    facts: list[dict[str, Any]]
    score: dict[str, Any]
    draft: dict[str, Any] | None
    content_piece: dict[str, Any] | None
    reply_analysis: dict[str, Any] | None

    # Verification and Human-in-the-Loop
    trust_report: dict[str, Any] | TrustReport | None
    policy_result: dict[str, Any] | PolicyResult | None
    approval: dict[str, Any] | ApprovalDecision | None
    failed_trust_banner: bool

    # Actions and outcomes
    mock_send_result: dict[str, Any] | None
    outcomes: list[dict[str, Any]]
    insights: list[dict[str, Any]]
    campaign_report: dict[str, Any] | None
    past_outcomes: list[dict[str, Any]]
    past_insights: list[dict[str, Any]]

    # Audit trace
    trace: list[dict[str, Any] | TraceEvent]

    # Dynamic inputs
    campaign_goal: str
    incoming_reply: str
    research_mode: str
    orchestrator_plan: dict[str, Any]
    feedback: str


# -----------------------------------------------------------------------------
# Stage 2: Adaptive Onboarding Schemas
# -----------------------------------------------------------------------------
PhaseType = Literal["foundation", "presales_readiness", "growth_optimization"]
BusinessType = Literal[
    "physical_product",
    "services_consulting",
    "software_saas_ai",
    "marketplace_platform",
    "operating_business",
]
BudgetTier = Literal["almost_none", "under_10k", "10k_to_50k", "above_50k", "undecided"]
CustomerTraction = Literal["none", "interest_no_purchase", "paying_customers", "repeat_customers"]
FactProvenance = Literal["verified", "user_stated", "user_assumption", "researched_finding", "unknown"]


class ClassifiedFact(BaseModel):
    """Fact classified with explicit provenance, verification status, and timestamp."""
    id: str = Field(default_factory=lambda: f"fact_{uuid.uuid4().hex[:8]}")
    key: str = Field(description="Normalized key, e.g. 'budget_tier', 'primary_bottleneck'")
    statement: str = Field(description="Statement or claim")
    classification: FactProvenance = Field(
        description="One of: verified, user_stated, user_assumption, researched_finding, unknown"
    )
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    source: str = Field(description="Origin source, e.g. 'user_intake', 'website_audit', 'uploaded_doc'")
    timestamp: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    why_it_matters: str | None = Field(default=None, description="Explanation for unknown/unverified facts")
    how_to_resolve: str | None = Field(default=None, description="Actionable next step to verify this fact")


class FollowUpQuestion(BaseModel):
    """Adaptive follow-up question generated dynamically or provided by question bank."""
    id: str = Field(default_factory=lambda: f"fq_{uuid.uuid4().hex[:6]}")
    question: str = Field(description="Question prompt presented to user")
    rationale: str = Field(description="Why this specific question matters for this business model")
    target_field: str = Field(description="Domain attribute targeted, e.g. 'unit_economics', 'cogs'")
    options: list[str] | None = Field(default=None, description="Optional selectable choices")
    answer_type: Literal["text", "select", "multiselect", "boolean", "number"] = Field(default="text")


class FollowUpGenerationResult(BaseModel):
    """Result of follow-up generation indicating whether fallback was activated."""
    questions: list[FollowUpQuestion] = Field(default_factory=list)
    is_fallback: bool = Field(default=False)
    source_model: str = Field(default="question_bank")


class CoreIntakeAnswers(BaseModel):
    """8-question core business intake answers."""
    stage: PhaseType = Field(default="foundation", description="Current phase: foundation, presales_readiness, growth_optimization")
    business_type: BusinessType = Field(default="software_saas_ai", description="Core business model")
    name: str = Field(default="", description="Business or project name")
    idea: str = Field(default="", description="Description of product, service, or offering")
    budget: BudgetTier = Field(default="undecided", description="Available capital/budget tier")
    goal: str = Field(default="", description="Primary immediate growth objective")
    customers_today: CustomerTraction = Field(default="none", description="Current traction state")
    constraints: str = Field(default="", description="Runway, skills, compliance, or geographical limits")
    launch_market: str = Field(default="", description="Initial city, region, or customer geography")


class ReadinessScore(BaseModel):
    """Business readiness assessment across the 3 phases."""
    overall_score: int = Field(ge=0, le=100, default=0)
    phase_scores: dict[str, int] = Field(default_factory=dict)
    user_stated_count: int = Field(default=0)
    verified_count: int = Field(default=0)
    assumption_count: int = Field(default=0)
    unknown_count: int = Field(default=0)
    summary: str = Field(default="")
    critical_gaps: list[str] = Field(default_factory=list)


class OnboardingSession(BaseModel):
    """Full onboarding session supporting autosave, resumption, and phase switching."""
    session_id: str = Field(default_factory=lambda: f"onboard_{uuid.uuid4().hex[:10]}")
    business_id: str | None = Field(default=None)
    core_answers: CoreIntakeAnswers = Field(default_factory=CoreIntakeAnswers)
    follow_ups: list[FollowUpQuestion] = Field(default_factory=list)
    follow_up_answers: dict[str, Any] = Field(default_factory=dict)
    classified_facts: list[ClassifiedFact] = Field(default_factory=list)
    readiness: ReadinessScore = Field(default_factory=ReadinessScore)
    is_fallback_active: bool = Field(default=False)
    storage_backend: str = Field(default="local")
    storage_fallback: bool = Field(default=False)
    created_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())


# -----------------------------------------------------------------------------
# Stage 3: Atlas Task Graph, State Machine & Agent Reports
# -----------------------------------------------------------------------------
TaskStatus = Literal[
    "planned",
    "assigned",
    "running",
    "blocked",
    "client_review",
    "admin_approval",
    "approved",
    "executing",
    "completed",
    "failed",
    "paused",
    "cancelled",
]
ApprovalPolicy = Literal["none", "admin_required", "client_review"]


class MissingInformationItem(BaseModel):
    what: str = Field(description="Description of missing data or decision needed")
    why_needed: str = Field(description="Why this item blocks progress or affects results")
    who_can_supply: str = Field(default="client", description="Actor who can supply it: client, team, vendor")


class EvidenceItem(BaseModel):
    source: str = Field(description="Origin source name, URL, or document identifier")
    date: str = Field(description="Publication or verification date")
    excerpt_summary: str = Field(description="Concise factual excerpt supporting findings")


class Task(BaseModel):
    """Pydantic Task model for the Atlas Planner task graph."""
    id: str = Field(default_factory=lambda: f"task_{uuid.uuid4().hex[:8]}")
    title: str = Field(description="Short human-readable task title")
    objective: str = Field(description="Clear measurable task goal")
    rationale: str = Field(default="", description="Why this matters for the business growth milestone")
    assigned_agent: str = Field(description="Atlas, Scout, Cadence, Quill, Muse, Veritas, Warden, Courier, Echo, Sage, Compass, Herald")
    business_id: str | None = Field(default=None, description="Business profile or onboarding session identifier")
    phase: PhaseType = Field(default="foundation")
    dependencies: list[str] = Field(default_factory=list, description="IDs of prerequisite tasks")
    priority_score: float = Field(default=0.0, description="Rank score calculated from heuristic formula")
    expected_deliverables: list[str] = Field(default_factory=list)
    acceptance_criteria: list[str] = Field(default_factory=list)
    evidence_requirements: list[str] = Field(default_factory=list)
    approval_policy: ApprovalPolicy = Field(default="none")
    missing_information: list[MissingInformationItem] = Field(default_factory=list)
    currently_doing: str = Field(default="")
    estimated_quota_cost: dict[str, Any] = Field(default_factory=dict)
    version: int = Field(default=1)
    status: TaskStatus = Field(default="planned")
    prior_status: TaskStatus | None = Field(default=None, description="Previous status for pause/resume returns")
    created_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())


class AgentReport(BaseModel):
    """Strict Pydantic schema for agent task deliverables and findings."""
    task_id: str
    status: Literal["completed", "failed", "needs_review"]
    summary: str
    findings: list[str] = Field(default_factory=list)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    missing_information: list[MissingInformationItem] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    recommended_next_tasks: list[str] = Field(default_factory=list)
    deliverables: dict[str, Any] = Field(default_factory=dict)
    confidence: float = Field(ge=0.0, le=1.0, description="Agent self-estimate, not calibrated")
    requires_human_review: bool = Field(default=False)


class TaskEvent(BaseModel):
    """Audit ledger record for state machine transitions and execution steps."""
    id: str = Field(default_factory=lambda: f"tevt_{uuid.uuid4().hex[:8]}")
    task_id: str
    event_type: str
    from_status: TaskStatus | None = None
    to_status: TaskStatus | None = None
    details: dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())


class TaskVersion(BaseModel):
    """Snapshot record created every time a task is edited."""
    id: str = Field(default_factory=lambda: f"tver_{uuid.uuid4().hex[:8]}")
    task_id: str
    version: int
    snapshot: dict[str, Any]
    created_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
