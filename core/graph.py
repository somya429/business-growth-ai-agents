"""LangGraph StateGraph workflow for Growth Agents pipeline with HITL and persistence."""

from __future__ import annotations

import datetime
import json
import logging
import os
from pathlib import Path
import sqlite3
from typing import Any, Literal

from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from agents.content import run_content
from agents.followup import run_followup
from agents.learning import run_learning
from agents.outreach import run_outreach
from agents.research import run_research
from agents.scoring import run_scoring
from core.orchestrator import plan_pipeline
from core.permissions import check_permission
from core.repo import get_repo
from core.stubs.policy import check_policy
from core.stubs.trust import audit
from shared.schemas import (
    ApprovalDecision,
    Draft,
    GrowthState,
    LeadScore,
    LearningInsight,
    PolicyResult,
    TraceEvent,
    TrustReport,
)

logger = logging.getLogger("core.graph")

RUNTIME_DIR = Path(__file__).resolve().parent.parent / "runtime"


def _record_trace_event(
    state: GrowthState,
    agent: str,
    step: str,
    input_summary: str,
    output_summary: str,
    reason: str,
    prompt_version: str | None = None,
) -> None:
    """Helper to record a TraceEvent both in memory and in repo."""
    from agents.base import get_prompt_metadata
    version = prompt_version or get_prompt_metadata(agent).get("version", "1.0.0")

    event = TraceEvent(
        agent=agent,
        step=step,
        input_summary=input_summary,
        output_summary=output_summary,
        reason=reason,
        timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        prompt_version=version,
    )
    state.setdefault("trace", []).append(event)
    run_id = state.get("run_id")
    if run_id:
        try:
            get_repo().append_trace(run_id, event)
        except Exception as exc:
            logger.debug(f"Could not append trace to repo: {exc}")


# -----------------------------------------------------------------------------
# Node Implementations
# -----------------------------------------------------------------------------
def load_profile_node(state: GrowthState) -> dict[str, Any]:
    """Load business profile, verified KB docs, lead, and past memory from repo."""
    repo = get_repo()
    business_id = state.get("business_id", "saas")
    run_id = state.get("run_id") or f"run_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"

    profile = repo.get_business(business_id) or {}
    kb_docs = repo.get_kb_docs(business_id)
    leads = repo.get_leads(business_id)

    # Pick specified lead or first non-opted-out lead
    lead = state.get("lead")
    if not lead and leads:
        lead_id = state.get("lead_id")
        if lead_id:
            for l in leads:
                if l.get("id") == lead_id:
                    lead = l
                    break
        if not lead:
            lead = leads[0]

    # If no lead exists for this business yet, generate an initial ICP prospect lead
    if not lead or not lead.get("email"):
        import re
        biz_name = profile.get("name") or business_id
        lead_suffix = re.sub(r"[^a-z0-9]", "", business_id.lower())[:8] or "prospect"
        candidate_lead = {
            "id": f"lead_{lead_suffix}_1",
            "business_id": business_id,
            "name": f"Growth Partner ({biz_name})",
            "company": f"{biz_name} Target Enterprise",
            "email": f"partner@{lead_suffix}.target.example",
            "industry": profile.get("industry") or "Retail & Technology",
            "qualification_notes": f"Target account aligned with ICP: {profile.get('ideal_customer', 'Growth leaders and logistics partners')}",
            "status": "new",
        }
        if hasattr(repo, "save_lead"):
            try:
                repo.save_lead(business_id, candidate_lead)
            except Exception:
                pass
        lead = candidate_lead

    # Memory retrieval: past outcomes and insights for this business
    past_outcomes = repo.get_outcomes(business_id)
    past_insights = repo.get_insights(business_id)

    updates: dict[str, Any] = {
        "run_id": run_id,
        "business_id": business_id,
        "profile": profile,
        "kb_docs": kb_docs,
        "lead": lead or {},
        "past_outcomes": past_outcomes,
        "past_insights": past_insights,
        "outcomes": state.get("outcomes") or past_outcomes,
        "status": "running",
        "retry_count": state.get("retry_count") or {"research": 0, "trust_audit": 0, "policy_check": 0},
        "trace": state.get("trace") or [],
    }

    _record_trace_event(
        state=updates,
        agent="orchestrator",
        step="load_profile",
        input_summary=f"Business: {business_id}, Lead: {lead.get('email') if lead else 'None'}",
        output_summary=f"Loaded profile, {len(kb_docs)} KB docs, {len(past_outcomes)} past outcomes, {len(past_insights)} past insights",
        reason="Initialized run context and loaded cross-session memory prior to research",
    )
    return updates


def orchestrator_plan_node(state: GrowthState) -> dict[str, Any]:
    """Run thin LLM-assisted planner reading BusinessProfile.enabled_agents."""
    profile = state.get("profile", {})
    lead = state.get("lead", {})
    plan = plan_pipeline(profile, lead)

    updates = {
        "orchestrator_plan": plan.model_dump(),
    }
    _record_trace_event(
        state=state,
        agent="orchestrator",
        step="plan_pipeline",
        input_summary=f"Enabled agents: {profile.get('enabled_agents', [])}",
        output_summary=plan.plan_summary,
        reason=plan.reason,
    )
    return updates


def research_node(state: GrowthState) -> dict[str, Any]:
    """Execute research agent with error boundary."""
    try:
        updated_state = run_research(dict(state))
        return {"facts": updated_state.get("facts", [])}
    except Exception as exc:
        _record_trace_event(
            state=state,
            agent="research",
            step="error_handler",
            input_summary="Execution failed in research node",
            output_summary=str(exc),
            reason="Graceful error capture without crashing graph",
        )
        return {"status": "failed"}


def scoring_node(state: GrowthState) -> dict[str, Any]:
    """Execute scoring agent with error boundary."""
    try:
        updated_state = run_scoring(dict(state))
        return {"score": updated_state.get("score", {})}
    except Exception as exc:
        _record_trace_event(
            state=state,
            agent="scoring",
            step="error_handler",
            input_summary="Execution failed in scoring node",
            output_summary=str(exc),
            reason="Graceful error capture without crashing graph",
        )
        return {"status": "failed"}


def scoring_router(state: GrowthState) -> str:
    """Deterministic routing based on LeadScore decision. Plain code, no LLM routing."""
    score_data = state.get("score") or {}
    score_obj = LeadScore.model_validate(score_data) if isinstance(score_data, dict) and score_data else None
    decision = score_obj.decision if score_obj else "ACT"
    reason = score_obj.reason if score_obj else "Default execution"

    if decision == "ACT":
        _record_trace_event(
            state=state,
            agent="orchestrator",
            step="route_scoring",
            input_summary=f"Score decision: {decision} ({score_obj.score if score_obj else 'N/A'}/100)",
            output_summary="Routing to outreach",
            reason=f"Scoring decision is ACT: proceeding to grounded message drafting ({reason[:80]})",
        )
        return "outreach"

    elif decision == "WAIT":
        _record_trace_event(
            state=state,
            agent="orchestrator",
            step="route_scoring",
            input_summary=f"Score decision: WAIT",
            output_summary="Ending run with status=waiting",
            reason=f"scoring=WAIT because {reason} (recheck after {score_obj.recheck_after if score_obj else '14 days'})",
        )
        state["status"] = "waiting"
        get_repo().update_run(state.get("run_id", ""), "waiting", {"recheck_after": score_obj.recheck_after if score_obj else None})
        return "end_run"

    elif decision == "REJECT":
        _record_trace_event(
            state=state,
            agent="orchestrator",
            step="route_scoring",
            input_summary=f"Score decision: REJECT",
            output_summary="Ending run with status=rejected",
            reason=f"scoring=REJECT because {reason}",
        )
        state["status"] = "rejected"
        get_repo().update_run(state.get("run_id", ""), "rejected")
        return "end_run"

    elif decision == "RESEARCH_MORE":
        retry_count = state.setdefault("retry_count", {})
        curr_retries = retry_count.get("research", 0)
        if curr_retries < 2:
            retry_count["research"] = curr_retries + 1
            _record_trace_event(
                state=state,
                agent="orchestrator",
                step="route_scoring",
                input_summary=f"Score decision: RESEARCH_MORE (Loop {curr_retries + 1}/2)",
                output_summary="Looping back to research",
                reason=f"scoring=RESEARCH_MORE because {reason}: re-querying information sources",
            )
            return "research"
        else:
            _record_trace_event(
                state=state,
                agent="orchestrator",
                step="route_scoring",
                input_summary="Score decision: RESEARCH_MORE",
                output_summary="Max research loops (2) reached; proceeding to outreach",
                reason="Loop cap reached (max 2 loops) to prevent infinite research cycles",
            )
            return "outreach"

    return "outreach"


def outreach_node(state: GrowthState) -> dict[str, Any]:
    """Execute outreach agent with error boundary."""
    try:
        updated_state = run_outreach(dict(state))
        draft = updated_state.get("draft")
        if draft:
            run_id = state.get("run_id", "")
            try:
                get_repo().save_draft(run_id, draft)
            except Exception as e:
                logger.debug(f"Could not save draft to repo: {e}")
        return {"draft": draft}
    except Exception as exc:
        _record_trace_event(
            state=state,
            agent="outreach",
            step="error_handler",
            input_summary="Execution failed in outreach node",
            output_summary=str(exc),
            reason="Graceful error capture without crashing graph",
        )
        return {"status": "failed"}


def trust_audit_node(state: GrowthState) -> dict[str, Any]:
    """Execute Trust Auditor (stub or real) and record report."""
    draft = state.get("draft")
    business_id = state.get("business_id", "saas")
    run_id = state.get("run_id", "")

    if not draft:
        return {"trust_report": None}

    report = audit(draft, business_id, dict(state))
    try:
        get_repo().save_trust_report(run_id, report)
    except Exception as e:
        logger.debug(f"Could not save trust report to repo: {e}")

    _record_trace_event(
        state=state,
        agent="trust_auditor",
        step="audit_draft",
        input_summary=f"Draft claims used: {draft.get('claims_used', [])}",
        output_summary=f"Verdict: {report.verdict}, Score: {report.overall_score}/100, Flags: {len(report.flags)}",
        reason=f"Independent trust verification: verified claim grounding and commitment risks",
    )

    retry_count = dict(state.get("retry_count") or {})
    banner = state.get("failed_trust_banner", False)
    if report.verdict == "FAIL":
        retries = retry_count.get("trust_audit", 0) + 1
        retry_count["trust_audit"] = retries
        if retries >= 2:
            banner = True

    return {
        "trust_report": report.model_dump(),
        "retry_count": retry_count,
        "failed_trust_banner": banner,
    }


def trust_audit_router(state: GrowthState) -> str:
    """Route based on trust auditor verdict. FAIL loops to outreach (max 2), else policy_check."""
    report_data = state.get("trust_report") or {}
    report = TrustReport.model_validate(report_data) if report_data else None
    verdict = report.verdict if report else "PASS"

    # If this re-audit is triggered by a human edit decision, proceed directly to policy_check
    if (state.get("approval") or {}).get("decision") == "edit":
        return "policy_check"

    if verdict == "FAIL":
        curr_retries = state.get("retry_count", {}).get("trust_audit", 0)
        if curr_retries < 2:
            flags_summary = "; ".join(f.reason for f in report.flags if f.status == "open") if report else ""
            state["feedback"] = f"Trust audit failed ({flags_summary}). Fix these claims."
            _record_trace_event(
                state=state,
                agent="orchestrator",
                step="route_trust_audit",
                input_summary=f"Trust verdict: FAIL (retry {curr_retries}/2)",
                output_summary="Looping back to outreach with flag feedback",
                reason=f"Safety policy: failed trust audit returns draft for revision with feedback: {flags_summary[:80]}",
            )
            return "outreach"
        else:
            _record_trace_event(
                state=state,
                agent="orchestrator",
                step="route_trust_audit",
                input_summary="Trust verdict: FAIL (max retries 2 reached)",
                output_summary="Routing to human_review with 'failed trust' banner",
                reason="Max retries exhausted; escalating directly to human reviewer with prominent trust failure banner. Never auto-sends.",
            )
            return "human_review"

    # PASS or REVIEW proceed to policy check
    _record_trace_event(
        state=state,
        agent="orchestrator",
        step="route_trust_audit",
        input_summary=f"Trust verdict: {verdict}",
        output_summary="Routing to policy_check",
        reason=f"Trust audit verdict is {verdict}: proceeding to compliance policy check",
    )
    return "policy_check"


def policy_check_node(state: GrowthState) -> dict[str, Any]:
    """Execute Policy Engine (stub or real) and record compliance check."""
    draft = state.get("draft")
    lead = state.get("lead", {})
    profile = state.get("profile", {})
    past_outcomes = state.get("past_outcomes", [])

    if not draft:
        return {"policy_result": None}

    result = check_policy(draft, lead, profile, past_outcomes)

    retry_count = dict(state.get("retry_count") or {})
    if not result.passed:
        retries = retry_count.get("policy_check", 0) + 1
        retry_count["policy_check"] = retries

    _record_trace_event(
        state=state,
        agent="policy_engine",
        step="check_policy",
        input_summary=f"Lead: {lead.get('email')}, Body length: {len(draft.get('body', ''))}",
        output_summary=f"Passed: {result.passed}, Violations: {len(result.violations)}",
        reason="Evaluated anti-spam restrictions, frequency caps, and mandatory opt-out lines",
    )
    return {
        "policy_result": result.model_dump(),
        "retry_count": retry_count,
        "status": "waiting_for_human",
    }


def policy_check_router(state: GrowthState) -> str:
    """Route based on policy engine result. Violations loop to outreach (max 2), else human_review."""
    result_data = state.get("policy_result") or {}
    result = PolicyResult.model_validate(result_data) if result_data else None

    # If this check was from a human edit decision, proceed to human review
    if (state.get("approval") or {}).get("decision") == "edit":
        return "human_review"

    if result and not result.passed:
        curr_retries = state.get("retry_count", {}).get("policy_check", 0)
        if curr_retries < 2:
            edits_summary = "; ".join(result.required_edits)
            state["feedback"] = f"Policy violations detected: {edits_summary}."
            _record_trace_event(
                state=state,
                agent="orchestrator",
                step="route_policy_check",
                input_summary=f"Policy passed: False (retry {curr_retries}/2)",
                output_summary="Looping back to outreach with required edits",
                reason=f"Policy violation encountered: returning to outreach with required edits ({edits_summary[:80]})",
            )
            return "outreach"
        else:
            _record_trace_event(
                state=state,
                agent="orchestrator",
                step="route_policy_check",
                input_summary="Policy passed: False (max retries 2 reached)",
                output_summary="Routing to human_review with flagged violations",
                reason="Max retries reached; escalating policy non-compliance to human reviewer",
            )
            return "human_review"

    _record_trace_event(
        state=state,
        agent="orchestrator",
        step="route_policy_check",
        input_summary="Policy passed: True",
        output_summary="Routing to human_review",
        reason="Policy requirements satisfied: pausing for human review",
    )
    return "human_review"



def human_review_node(state: GrowthState) -> Command[Literal["mock_send", "trust_audit", "__end__"]]:
    """Human-in-the-loop checkpoint using LangGraph interrupt().

    Pauses the graph execution, surfaces the review payload, and awaits resume with Command(resume=ApprovalDecision).
    Resuming routes:
      approve -> mock_send
      edit -> trust_audit (re-audit and re-policy-check edited copy)
      reject -> END (status=rejected)
    """
    run_id = state.get("run_id", "")
    review_payload = {
        "run_id": run_id,
        "draft": state.get("draft"),
        "trust_report": state.get("trust_report"),
        "policy_result": state.get("policy_result"),
        "failed_trust_banner": state.get("failed_trust_banner", False),
    }

    # Mark run in repo as waiting for human
    get_repo().update_run(run_id, "waiting_for_human", state_summary=review_payload)
    state["status"] = "waiting_for_human"

    _record_trace_event(
        state=state,
        agent="orchestrator",
        step="human_review_pause",
        input_summary=f"Run: {run_id}",
        output_summary="Graph paused at human_review",
        reason="MANDATORY SAFETY BOUNDARY: Nothing leaves unverified. Pausing for human authorization.",
    )

    # Interrupt pauses execution and returns review_payload to the caller
    human_input = interrupt(review_payload)

    # When resumed via Command(resume=...), human_input receives the resume payload
    decision: ApprovalDecision
    if isinstance(human_input, ApprovalDecision):
        decision = human_input
    elif isinstance(human_input, dict):
        decision = ApprovalDecision.model_validate(human_input)
    else:
        # String shortcut: "approve", "reject"
        decision = ApprovalDecision(decision=str(human_input))

    # Persist decision to repository
    try:
        get_repo().save_approval(run_id, decision)
    except Exception as exc:
        logger.debug(f"Could not save approval to repo: {exc}")

    if decision.decision == "approve":
        _record_trace_event(
            state=state,
            agent="human_reviewer",
            step="approval_decision",
            input_summary=f"Decision: approve by {decision.reviewer}",
            output_summary="Approved for simulated send",
            reason=f"Human reviewer granted authorization: {decision.notes or 'Proceed with outreach'}",
        )
        return Command(
            update={"approval": decision.model_dump(), "status": "running"},
            goto="mock_send",
        )

    elif decision.decision == "edit":
        edited_draft = dict(state.get("draft") or {})
        if decision.edited_body:
            edited_draft["body"] = decision.edited_body

        _record_trace_event(
            state=state,
            agent="human_reviewer",
            step="approval_decision",
            input_summary=f"Decision: edit by {decision.reviewer}",
            output_summary="Edited copy routed back to trust_audit",
            reason="Human edited draft copy: edited text must be re-audited and re-policy-checked",
        )
        return Command(
            update={
                "draft": edited_draft,
                "approval": decision.model_dump(),
                "status": "running",
            },
            goto="trust_audit",
        )

    else:
        # Reject
        _record_trace_event(
            state=state,
            agent="human_reviewer",
            step="approval_decision",
            input_summary=f"Decision: reject by {decision.reviewer}",
            output_summary="Run rejected and terminated",
            reason=f"Human rejected outreach: {decision.notes or 'Outreach canceled'}",
        )
        get_repo().update_run(run_id, "rejected")
        return Command(
            update={"approval": decision.model_dump(), "status": "rejected"},
            goto=END,
        )


def mock_send_node(state: GrowthState) -> dict[str, Any]:
    """ONLY node authorized to 'send'.

    Re-checks policy and approval flag immediately before sending; refuses if approval is missing.
    """
    approval_data = state.get("approval") or {}
    approval = ApprovalDecision.model_validate(approval_data) if approval_data else None

    # Strict check: approval must exist and must be approve
    if not approval or approval.decision != "approve":
        _record_trace_event(
            state=state,
            agent="mock_send",
            step="refuse_send",
            input_summary="Approval check",
            output_summary="Send REFUSED",
            reason="SECURITY VIOLATION PREVENTED: mock_send refused to dispatch message without explicit human approval record.",
        )
        return {"status": "failed", "mock_send_result": None}

    # Strict check: re-verify opt-out status
    lead = state.get("lead", {})
    profile = state.get("profile", {})
    opt_out_list = profile.get("anti_spam", {}).get("opt_out_list", [])
    lead_email = (lead.get("email") or "").lower()
    if lead_email in [o.lower() for o in opt_out_list] or lead.get("status") == "opted_out":
        _record_trace_event(
            state=state,
            agent="mock_send",
            step="refuse_send",
            input_summary=f"Lead: {lead_email}",
            output_summary="Send REFUSED (Opted out)",
            reason="CRITICAL POLICY ENFORCEMENT: Lead is opted out. Aborting send.",
        )
        return {"status": "failed", "mock_send_result": None}

    # Central permission enforcement
    check_permission("mock_send", "send")

    draft = state.get("draft") or {}
    send_result = {
        "sent": True,
        "channel": draft.get("channel", "email"),
        "to": lead.get("email"),
        "subject": draft.get("subject"),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "mock_provider": "Simulated Delivery Network",
    }

    # Update lead status in repo
    lead_id = lead.get("id")
    if lead_id:
        get_repo().update_lead_status(lead_id, "contacted")
        lead["status"] = "contacted"

    _record_trace_event(
        state=state,
        agent="mock_send",
        step="send_outreach",
        input_summary=f"Channel: {send_result['channel']}, To: {send_result['to']}",
        output_summary=f"Simulated dispatch successful. Lead status updated to 'contacted'",
        reason="Approved draft safely dispatched through simulated provider",
    )

    return {"mock_send_result": send_result, "lead": lead, "status": "completed"}


def after_send_router(state: GrowthState) -> str:
    """Route after mock_send to follow-up, content, learning, or end."""
    profile = state.get("profile", {})
    enabled = profile.get("enabled_agents", [])

    if "followup" in enabled and state.get("incoming_reply"):
        return "followup"
    elif "learning" in enabled:
        return "learning"
    else:
        return "save_memory"


def followup_node(state: GrowthState) -> dict[str, Any]:
    """Execute follow-up agent with simulated replies if enabled."""
    try:
        updated_state = run_followup(dict(state))
        return {"reply_analysis": updated_state.get("reply_analysis")}
    except Exception as exc:
        _record_trace_event(
            state=state,
            agent="followup",
            step="error_handler",
            input_summary="Execution failed in followup node",
            output_summary=str(exc),
            reason="Graceful error capture without crashing graph",
        )
        return {}


def learning_node(state: GrowthState) -> dict[str, Any]:
    """Execute learning agent on campaign outcomes if enabled."""
    try:
        updated_state = run_learning(dict(state))
        return {
            "insights": updated_state.get("insights", []),
            "campaign_report": updated_state.get("campaign_report"),
        }
    except Exception as exc:
        _record_trace_event(
            state=state,
            agent="learning",
            step="error_handler",
            input_summary="Execution failed in learning node",
            output_summary=str(exc),
            reason="Graceful error capture without crashing graph",
        )
        return {}


def save_memory_node(state: GrowthState) -> dict[str, Any]:
    """Save extracted insights to repo memory and finalize run."""
    repo = get_repo()
    business_id = state.get("business_id", "saas")
    run_id = state.get("run_id", "")

    insights = state.get("insights", [])
    for ins in insights:
        try:
            repo.save_insight(ins, business_id=business_id)
        except Exception as e:
            logger.debug(f"Could not persist insight to memory: {e}")

    final_status = state.get("status", "completed")
    repo.update_run(run_id, final_status, state_summary={"status": final_status})

    _record_trace_event(
        state=state,
        agent="orchestrator",
        step="save_memory",
        input_summary=f"Insights count: {len(insights)}",
        output_summary=f"Persisted insights to memory; finalized run status as '{final_status}'",
        reason="Updated persistent knowledge and closed execution run",
    )
    return {"status": final_status}


def end_run_node(state: GrowthState) -> dict[str, Any]:
    """Clean exit node for early terminations (WAIT, REJECT)."""
    run_id = state.get("run_id", "")
    status = state.get("status", "completed")
    get_repo().update_run(run_id, status)
    return {"status": status}


# -----------------------------------------------------------------------------
# Graph Assembly & Checkpointing
# -----------------------------------------------------------------------------
_CHECKPOINTER: SqliteSaver | None = None
_COMPILED_GRAPH: Any = None


def get_checkpointer() -> SqliteSaver:
    """Singleton helper to obtain SqliteSaver for checkpoints.sqlite."""
    global _CHECKPOINTER
    if _CHECKPOINTER is None:
        RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
        db_path = str(RUNTIME_DIR / "checkpoints.sqlite")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        _CHECKPOINTER = SqliteSaver(conn)
    return _CHECKPOINTER


def build_growth_graph() -> StateGraph:
    """Build the LangGraph StateGraph over GrowthState with deterministic routing."""
    builder = StateGraph(GrowthState)

    # 1. Register nodes
    builder.add_node("load_profile", load_profile_node)
    builder.add_node("orchestrator_plan", orchestrator_plan_node)
    builder.add_node("research", research_node)
    builder.add_node("scoring", scoring_node)
    builder.add_node("outreach", outreach_node)
    builder.add_node("trust_audit", trust_audit_node)
    builder.add_node("policy_check", policy_check_node)
    builder.add_node("human_review", human_review_node)
    builder.add_node("mock_send", mock_send_node)
    builder.add_node("followup", followup_node)
    builder.add_node("learning", learning_node)
    builder.add_node("save_memory", save_memory_node)
    builder.add_node("end_run", end_run_node)

    # 2. Wire static edges
    builder.add_edge(START, "load_profile")
    builder.add_edge("load_profile", "orchestrator_plan")
    builder.add_edge("orchestrator_plan", "research")
    builder.add_edge("research", "scoring")
    builder.add_edge("outreach", "trust_audit")
    builder.add_edge("followup", "learning")
    builder.add_edge("learning", "save_memory")
    builder.add_edge("save_memory", END)
    builder.add_edge("end_run", END)

    # 3. Wire conditional edges
    builder.add_conditional_edges(
        "scoring",
        scoring_router,
        {
            "outreach": "outreach",
            "research": "research",
            "end_run": "end_run",
        },
    )

    builder.add_conditional_edges(
        "trust_audit",
        trust_audit_router,
        {
            "outreach": "outreach",
            "policy_check": "policy_check",
            "human_review": "human_review",
        },
    )

    builder.add_conditional_edges(
        "policy_check",
        policy_check_router,
        {
            "outreach": "outreach",
            "human_review": "human_review",
        },
    )

    builder.add_conditional_edges(
        "mock_send",
        after_send_router,
        {
            "followup": "followup",
            "learning": "learning",
            "save_memory": "save_memory",
        },
    )

    return builder


def get_compiled_graph(checkpointer: Any | None = None) -> Any:
    """Compile or retrieve the compiled LangGraph with checkpointer."""
    global _COMPILED_GRAPH
    if checkpointer is not None:
        return build_growth_graph().compile(checkpointer=checkpointer)

    if _COMPILED_GRAPH is None:
        cp = get_checkpointer()
        _COMPILED_GRAPH = build_growth_graph().compile(checkpointer=cp)
    return _COMPILED_GRAPH
