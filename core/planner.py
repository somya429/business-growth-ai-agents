"""Atlas Strategic Planner: Phase-Aware Task Graph Generation.

Generates a directed acyclic task graph (DAG) tailored to the business's
current phase, classified facts, readiness gaps, and unknown parameters.
Enforces strict safety rules (e.g. Courier requires explicit approval).
"""

from __future__ import annotations

import datetime
import os
from typing import Any
import uuid

from core.ranking import rank_task_heuristic
from core.repo import get_repo
from core.state_machine import transition_task
from shared.schemas import (
    ApprovalPolicy,
    ClassifiedFact,
    CoreIntakeAnswers,
    MissingInformationItem,
    OnboardingSession,
    PhaseType,
    Task,
    TaskEvent,
)


def _has_real_tavily() -> bool:
    """Check if real Tavily research credentials are available."""
    key = os.getenv("TAVILY_API_KEY", "").strip()
    return bool(key and not key.startswith("tvly-mock"))


def generate_task_graph(
    business_id: str | None = None,
    phase: PhaseType | None = None,
    session: OnboardingSession | None = None,
    facts: list[ClassifiedFact] | None = None,
    repo: Any | None = None,
) -> list[Task]:
    """Generate phase-aware task graph for a business or onboarding session.

    Takes classified facts into account:
    - Unknown facts produce clarifying tasks or MissingInformationItem gaps.
    - Courier is NEVER planned without approval (approval_policy='admin_required').
    - Fallback research tasks explicitly require 'mock data' labeling.
    """
    repository = repo or get_repo()
    tasks: list[Task] = []
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Handle session passed as first positional argument
    if isinstance(business_id, OnboardingSession):
        session = business_id
        business_id = None

    # Determine phase and facts
    selected_phase: PhaseType = phase or "foundation"
    fact_list: list[ClassifiedFact] = []

    if session:
        selected_phase = phase or session.core_answers.stage
        fact_list = session.classified_facts
        business_id = business_id or session.business_id or session.session_id
    elif facts:
        fact_list = facts
    elif business_id:
        biz = repository.get_business(business_id)
        if biz and "stage" in biz:
            selected_phase = phase or biz.get("stage", "foundation")

    # Map facts by key
    fact_map = {f.key: f for f in fact_list}
    unknown_facts = [f for f in fact_list if f.classification == "unknown"]
    assumption_facts = [f for f in fact_list if f.classification == "user_assumption"]

    # Unique prefix for task IDs in this generation run
    prefix = uuid.uuid4().hex[:6]

    # -------------------------------------------------------------------------
    # 1. Foundation Phase Tasks
    # -------------------------------------------------------------------------
    if selected_phase == "foundation":
        # Task 1: Strategy & ICP Definition (Atlas)
        missing_items = []
        for uf in unknown_facts:
            if uf.key in ("business_name", "primary_growth_goal", "budget_tier"):
                missing_items.append(
                    MissingInformationItem(
                        what=f"Specify {uf.key.replace('_', ' ')}",
                        why_needed=uf.why_it_matters or "Required to establish baseline strategic positioning.",
                        who_can_supply="client",
                    )
                )

        t1_id = f"task_{prefix}_atlas_strategy"
        t1 = Task(
            id=t1_id,
            title="Strategic Foundation & ICP Architecture",
            objective="Formulate foundational growth roadmap, ideal customer profile (ICP), and core milestones.",
            rationale="Establishes explicit business boundaries before allocating research or outreach compute.",
            assigned_agent="Atlas",
            business_id=business_id,
            phase="foundation",
            dependencies=[],
            expected_deliverables=["ICP Specification Document", "Growth Objective Matrix"],
            acceptance_criteria=["Target customer personas defined", "Core value proposition articulated"],
            evidence_requirements=["Founder intake inputs", "Declared market constraints"],
            approval_policy="none",
            missing_information=missing_items,
            status="blocked" if missing_items else "planned",
            created_at=now,
            updated_at=now,
        )
        tasks.append(t1)

        # Task 2: Market & Competitor Audit (Scout)
        t2_id = f"task_{prefix}_scout_market"
        t2_evidence = ["Public market reports", "Competitor positioning statements"]
        if not _has_real_tavily():
            t2_evidence.append("Labeled mock data fallback (Tavily offline)")

        t2 = Task(
            id=t2_id,
            title="Market Landscape & Competitor Intelligence",
            objective="Perform landscape analysis to identify direct competitors and pricing benchmarks.",
            rationale="Validates whether founder assumptions align with observable market reality.",
            assigned_agent="Scout",
            business_id=business_id,
            phase="foundation",
            dependencies=[t1_id],
            expected_deliverables=["Competitor Comparison Matrix", "Market Gap Analysis"],
            acceptance_criteria=["At least 3 competitors audited", "Price points compared"],
            evidence_requirements=t2_evidence,
            approval_policy="none",
            status="planned",
            created_at=now,
            updated_at=now,
        )
        tasks.append(t2)

        # Task 3: Proof Asset Inventory & Claims Audit (Veritas)
        t3_id = f"task_{prefix}_veritas_proof"
        veritas_assumptions = [f.statement for f in assumption_facts]
        t3 = Task(
            id=t3_id,
            title="Proof Asset Audit & Claim Grounding",
            objective="Audit available case studies, testimonials, and customer claims to establish ground truth.",
            rationale="Guarantees that no unverified claims or false promises enter customer-facing messaging.",
            assigned_agent="Veritas",
            business_id=business_id,
            phase="foundation",
            dependencies=[t1_id],
            expected_deliverables=["Verified Claims Ledger", "Unsupported Claims Warning List"],
            acceptance_criteria=["Zero unverified statements marked verified", "Proof sources cataloged"],
            evidence_requirements=["Client provided proof", "Document citations"],
            approval_policy="none",
            missing_information=[
                MissingInformationItem(
                    what="Audit documentation for user assumption: " + stmt[:60],
                    why_needed="Veritas cannot verify claims without citations or audited metrics.",
                    who_can_supply="client",
                )
                for stmt in veritas_assumptions[:2]
            ],
            status="planned",
            created_at=now,
            updated_at=now,
        )
        tasks.append(t3)

        # Task 4: Positioning & Value Messaging (Muse)
        t4_id = f"task_{prefix}_muse_positioning"
        t4 = Task(
            id=t4_id,
            title="Positioning & Core Value Proposition Copy",
            objective="Craft core messaging pillars and value propositions grounded in verified facts.",
            rationale="Provides structured copy foundations for outbound campaigns and web presence.",
            assigned_agent="Muse",
            business_id=business_id,
            phase="foundation",
            dependencies=[t2_id, t3_id],
            expected_deliverables=["Core Value Proposition Guide", "Objection Handling Framework"],
            acceptance_criteria=["Value proposition grounded in audited proof", "Clear tone alignment"],
            evidence_requirements=["Verified Claims Ledger"],
            approval_policy="none",
            status="planned",
            created_at=now,
            updated_at=now,
        )
        tasks.append(t4)

        # Task 5: Strategic Positioning & Unit Economics (Compass)
        t5_id = f"task_{prefix}_compass_strategy"
        t5 = Task(
            id=t5_id,
            title="Strategic Positioning & Unit Economics Estimation",
            objective="Produce positioning options, business-model notes, pricing hypotheses, and unit-economics estimates from onboarding facts and research; rank assumptions to validate first.",
            rationale="Compass translates raw founder facts into actionable strategic hypotheses before any outreach spend, without contacting anyone or committing capital.",
            assigned_agent="Compass",
            business_id=business_id,
            phase="foundation",
            dependencies=[t2_id, t3_id],
            expected_deliverables=[
                "Positioning Options Report",
                "Unit Economics Estimate Sheet (all values tagged 'estimate from user-supplied inputs')",
                "Ranked Assumption Validation Queue",
            ],
            acceptance_criteria=[
                "Every numeric estimate carries 'estimate from user-supplied inputs' tag",
                "Unknown inputs remain unknown and become MissingInformationItem",
                "At least 2 positioning options formulated",
            ],
            evidence_requirements=[
                "Scout market intelligence",
                "Veritas verified claims ledger",
                "Founder onboarding facts",
            ],
            approval_policy="none",
            status="planned",
            created_at=now,
            updated_at=now,
        )
        tasks.append(t5)

    # -------------------------------------------------------------------------
    # 2. Pre-Sales Readiness Phase Tasks
    # -------------------------------------------------------------------------
    elif selected_phase == "presales_readiness":
        # Task 1: Lead Research & Verification (Scout)
        t1_id = f"task_{prefix}_scout_leads"
        scout_evidence = ["Verified company domain", "Confirmed job title"]
        if not _has_real_tavily():
            scout_evidence.append("Explicitly labeled mock data (Tavily offline)")

        t1 = Task(
            id=t1_id,
            title="Target Account Sourcing & Verification",
            objective="Identify and verify qualified target accounts matching the approved ICP.",
            rationale="Populates the pipeline with actionable high-fit decision-maker contacts.",
            assigned_agent="Scout",
            business_id=business_id,
            phase="presales_readiness",
            dependencies=[],
            expected_deliverables=["Target Account Dossiers", "Lead Contact Records"],
            acceptance_criteria=["Minimum 5 target accounts verified", "Decision-maker roles identified"],
            evidence_requirements=scout_evidence,
            approval_policy="none",
            status="planned",
            created_at=now,
            updated_at=now,
        )
        tasks.append(t1)

        # Task 2: Prospect Scoring (Cadence)
        t2_id = f"task_{prefix}_cadence_scoring"
        t2 = Task(
            id=t2_id,
            title="Lead Fit & Timing Scoring",
            objective="Evaluate lead fit, intent signals, and reachability to calculate priority scores.",
            rationale="Prevents wasted outreach compute on accounts outside the ideal conversion window.",
            assigned_agent="Cadence",
            business_id=business_id,
            phase="presales_readiness",
            dependencies=[t1_id],
            expected_deliverables=["Scored Prospect Ledger", "Outreach Timing Recommendations"],
            acceptance_criteria=["Score computed 0-100", "Clear ACT/WAIT/REJECT rationale"],
            evidence_requirements=["Scout account dossier", "ICP match parameters"],
            approval_policy="none",
            status="planned",
            created_at=now,
            updated_at=now,
        )
        tasks.append(t2)

        # Task 3: Outreach Copywriting (Quill)
        t3_id = f"task_{prefix}_quill_draft"
        t3 = Task(
            id=t3_id,
            title="Tailored Outreach Message Drafting",
            objective="Compose personalized cold outreach draft strictly citing verified business facts.",
            rationale="Crafts resonant high-conversion messaging without hallucinating claims.",
            assigned_agent="Quill",
            business_id=business_id,
            phase="presales_readiness",
            dependencies=[t2_id],
            expected_deliverables=["Personalized Email Draft", "Subject Line Variants"],
            acceptance_criteria=["All factual statements reference fact IDs", "Opt-out included"],
            evidence_requirements=["Lead profile", "Verified knowledge base facts"],
            approval_policy="none",
            status="planned",
            created_at=now,
            updated_at=now,
        )
        tasks.append(t3)

        # Task 4: Trust & Claim Audit (Veritas)
        t4_id = f"task_{prefix}_veritas_audit"
        t4 = Task(
            id=t4_id,
            title="Pre-Send Trust & Claim Audit",
            objective="Perform sentence-by-sentence verification of draft claims and commitment liabilities.",
            rationale="Zero unverified claims leave the system. Mandatory verification gate.",
            assigned_agent="Veritas",
            business_id=business_id,
            phase="presales_readiness",
            dependencies=[t3_id],
            expected_deliverables=["Pre-Send TrustReport", "Flagged Claims Register"],
            acceptance_criteria=["Overall trust score computed", "Pass/Review/Fail verdict assigned"],
            evidence_requirements=["Draft copy", "Ground truth facts"],
            approval_policy="none",
            status="planned",
            created_at=now,
            updated_at=now,
        )
        tasks.append(t4)

        # Task 5: Compliance & Anti-Spam Check (Warden)
        t5_id = f"task_{prefix}_warden_compliance"
        t5 = Task(
            id=t5_id,
            title="Anti-Spam & Delivery Policy Verification",
            objective="Check outreach draft against frequency limits, quiet hours, and opt-out registries.",
            rationale="Protects sender domain reputation and legal compliance before delivery dispatch.",
            assigned_agent="Warden",
            business_id=business_id,
            phase="presales_readiness",
            dependencies=[t4_id],
            expected_deliverables=["Policy Compliance Report", "Required Edits Notice"],
            acceptance_criteria=["Quiet hours checked", "Anti-spam frequency caps verified"],
            evidence_requirements=["Target lead history", "Business anti-spam configuration"],
            approval_policy="none",
            status="planned",
            created_at=now,
            updated_at=now,
        )
        tasks.append(t5)

        # Task 6: Campaign Architecture & Experiment Design (Herald)
        t6_id = f"task_{prefix}_herald_campaign"
        t6 = Task(
            id=t6_id,
            title="Campaign Architecture & Experiment Design",
            objective="Architect multi-channel campaign plan, design testable experiments, and hand copy tasks to Quill. Enforce Warden anti-spam limits and Resend free-plan daily cap.",
            rationale="Herald ensures outreach is structured into testable campaigns with measurable hypotheses before any message is drafted or sent.",
            assigned_agent="Herald",
            business_id=business_id,
            phase="presales_readiness",
            dependencies=[t5_id],
            expected_deliverables=[
                "Multi-Channel Campaign Plan",
                "Growth Experiment Designs with hypothesis and success metric",
                "Copy Tasks for Quill",
            ],
            acceptance_criteria=[
                "Campaign respects Warden anti-spam frequency caps",
                "Resend daily cap configured",
                "Herald does not send, publish, or spend directly",
            ],
            evidence_requirements=["Warden compliance policy", "Scout ICP and account list"],
            approval_policy="none",
            status="planned",
            created_at=now,
            updated_at=now,
        )
        tasks.append(t6)

        # Task 7: Controlled Outbound Execution (Courier)
        # CRITICAL HARD CONSTRAINT: Courier is NEVER scheduled without an approved external action.
        t7_id = f"task_{prefix}_courier_dispatch"
        t7 = Task(
            id=t7_id,
            title="Controlled Outbound Message Dispatch",
            objective="Deliver approved outreach message to target recipient via simulated or real gateway.",
            rationale="Executes final verified outreach only after human review and authorization.",
            assigned_agent="Courier",
            business_id=business_id,
            phase="presales_readiness",
            dependencies=[t6_id],
            expected_deliverables=["Delivery Receipt or Failure Log", "Lead Status Update"],
            acceptance_criteria=["Explicit human approval record required", "Opt-out re-checked"],
            evidence_requirements=["Signed Human Approval", "Valid Sender Credentials"],
            approval_policy="admin_required",  # MANDATORY: Never 'none'
            status="planned",
            created_at=now,
            updated_at=now,
        )
        tasks.append(t7)

    # -------------------------------------------------------------------------
    # 3. Growth Optimization Phase Tasks
    # -------------------------------------------------------------------------
    elif selected_phase == "growth_optimization":
        # Task 1: Inbound Reply Triage (Echo)
        t1_id = f"task_{prefix}_echo_triage"
        t1 = Task(
            id=t1_id,
            title="Inbound Response Classification & Intent Triage",
            objective="Classify incoming replies, detect prospect objections, and flag human escalations.",
            rationale="Ensures rapid high-context responses to qualified interested buyers.",
            assigned_agent="Echo",
            business_id=business_id,
            phase="growth_optimization",
            dependencies=[],
            expected_deliverables=["Reply Intent Analysis", "Recommended Follow-up Action"],
            acceptance_criteria=["Intent categorized correctly", "Escalation rules evaluated"],
            evidence_requirements=["Inbound email thread", "Original outreach draft"],
            approval_policy="none",
            status="planned",
            created_at=now,
            updated_at=now,
        )
        tasks.append(t1)

        # Task 1b: Campaign Optimisation Re-Plan (Herald) — parallel-safe with Muse
        t1b_id = f"task_{prefix}_herald_growth"
        t1b = Task(
            id=t1b_id,
            title="Growth Campaign Re-Architecture & Experiment Refresh",
            objective="Re-architect campaign mix based on triage insights, refresh experiments with new baselines, and delegate updated copy tasks to Quill.",
            rationale="Herald integrates signal from Echo to realign channel investments and update experiment hypotheses with real performance baselines.",
            assigned_agent="Herald",
            business_id=business_id,
            phase="growth_optimization",
            dependencies=[t1_id],
            expected_deliverables=[
                "Refreshed Campaign Plan",
                "Updated Experiment Baselines",
                "New Copy Tasks for Quill",
            ],
            acceptance_criteria=[
                "Herald does not send, publish, or spend",
                "Warden limits respected",
                "Experiment baselines updated from Echo triage data",
            ],
            evidence_requirements=["Echo intent triage output", "Historical outcomes"],
            approval_policy="none",
            status="planned",
            created_at=now,
            updated_at=now,
        )
        tasks.append(t1b)

        # Task 2: Multi-Channel Content Adaptation (Muse)
        t2_id = f"task_{prefix}_muse_content"
        t2 = Task(
            id=t2_id,
            title="Multi-Channel Content Synthesis",
            objective="Repurpose winning campaign messages into educational and social marketing pieces.",
            rationale="Amplifies proven customer resonance across organic marketing channels.",
            assigned_agent="Muse",
            business_id=business_id,
            phase="growth_optimization",
            dependencies=[t1_id],
            expected_deliverables=["Multi-Channel Content Assets", "Social Post Variants"],
            acceptance_criteria=["Content grounded in approved claims", "Formatted for target channel"],
            evidence_requirements=["Campaign outcome data", "Approved message drafts"],
            approval_policy="client_review",
            status="planned",
            created_at=now,
            updated_at=now,
        )
        tasks.append(t2)

        # Task 3: Campaign Performance & Strategy Learning (Sage)
        t3_id = f"task_{prefix}_sage_learning"
        t3 = Task(
            id=t3_id,
            title="Campaign Learning Synthesis & Pattern Extraction",
            objective="Analyze historical campaign outcomes to extract statistical patterns and recommendations.",
            rationale="Continuously improves agent accuracy and conversion efficiency over time.",
            assigned_agent="Sage",
            business_id=business_id,
            phase="growth_optimization",
            dependencies=[t1_id],
            expected_deliverables=["Campaign Performance Report", "Actionable Learning Insights"],
            acceptance_criteria=["Reply/conversion rates calculated", "Minimum 1 actionable insight"],
            evidence_requirements=["Historical outcome records"],
            approval_policy="none",
            status="planned",
            created_at=now,
            updated_at=now,
        )
        tasks.append(t3)

        # Task 4: Scaling & Pipeline Realignment (Atlas)
        t4_id = f"task_{prefix}_atlas_realign"
        t4 = Task(
            id=t4_id,
            title="Strategic Growth Realignment & Capacity Scaling",
            objective="Re-calibrate target parameters, budget allocation, and agent fleet throttles.",
            rationale="Prevents pipeline exhaustion and aligns execution with current business delivery bandwidth.",
            assigned_agent="Atlas",
            business_id=business_id,
            phase="growth_optimization",
            dependencies=[t2_id, t3_id],
            expected_deliverables=["Updated Growth Strategy Brief", "Quota Adjustments"],
            acceptance_criteria=["Strategy recommendations aligned with Sage insights"],
            evidence_requirements=["Sage Campaign Performance Report"],
            approval_policy="admin_required",
            status="planned",
            created_at=now,
            updated_at=now,
        )
        tasks.append(t4)

    # -------------------------------------------------------------------------
    # Heuristic Ranking & Priority Assignment
    # -------------------------------------------------------------------------
    readiness_score_val = (
        session.readiness.overall_score
        if session and session.readiness
        else 50.0
    )

    for task in tasks:
        task.priority_score = rank_task_heuristic(
            task=task,
            all_tasks=tasks,
            completed_task_ids=set(),
            readiness_overall=float(readiness_score_val),
        )

    # Persist tasks in repository if provided
    for task in tasks:
        repository.save_task(task)

    return tasks


def submit_client_answer(
    task_id: str,
    answer: str,
    what_item: str | None = None,
    item_index: int | None = None,
    repo: Any | None = None,
) -> Task:
    """Submit client answer to resolve a MissingInformationItem on a task.

    Unblocks the task if all critical missing items are resolved,
    creates a ClassifiedFact (user_stated), and logs a TaskEvent.
    """
    repository = repo or get_repo()
    task = repository.get_task(task_id)
    if not task:
        raise ValueError(f"Task '{task_id}' not found.")

    if not task.missing_information:
        return task

    # Find and resolve the matching item
    removed_item: MissingInformationItem | None = None
    if item_index is not None and 0 <= item_index < len(task.missing_information):
        removed_item = task.missing_information.pop(item_index)
    elif what_item:
        for idx, item in enumerate(task.missing_information):
            if what_item.lower() in item.what.lower():
                removed_item = task.missing_information.pop(idx)
                break
    else:
        # Default to first missing item
        removed_item = task.missing_information.pop(0)

    # Log task event
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    task.updated_at = now
    details = {
        "resolved_item": removed_item.model_dump() if removed_item else None,
        "answer": answer,
        "remaining_missing_count": len(task.missing_information),
    }

    event = TaskEvent(
        id=f"tevt_{uuid.uuid4().hex[:8]}",
        task_id=task.id,
        event_type="client_answer_submitted",
        from_status=task.status,
        to_status=task.status,
        details=details,
        timestamp=now,
    )
    repository.save_task_event(event)

    # If task was blocked due to missing information, unblock it
    if task.status == "blocked" and not task.missing_information:
        transition_task(
            task=task,
            to_status="planned",
            reason="All missing information items supplied by client.",
            repo=repository,
        )
    else:
        repository.save_task(task)

    return task
