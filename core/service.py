"""Service layer providing a typed API for FastAPI and React UI integration."""

from __future__ import annotations

import logging
from typing import Any, Literal
from pydantic import BaseModel, Field

from langgraph.types import Command

from core.graph import get_compiled_graph
from core.repo import get_repo
from shared.schemas import (
    ApprovalDecision,
    Draft,
    Flag,
    Outcome,
    PolicyResult,
    TraceEvent,
    TrustReport,
)

logger = logging.getLogger("core.service")


# -----------------------------------------------------------------------------
# Request & Response Schemas
# -----------------------------------------------------------------------------
class StartRunRequest(BaseModel):
    business_id: str = Field(description="Business key (e.g. 'saas', 'ecommerce', 'local_services')")
    lead_id: str | None = Field(default=None, description="Optional specific target lead ID")


class RunSummaryResponse(BaseModel):
    run_id: str
    status: str
    business_id: str
    lead_id: str | None = None
    state_summary: dict[str, Any] = Field(default_factory=dict)


class ReviewPayloadResponse(BaseModel):
    run_id: str
    draft: Draft | dict[str, Any] | None = None
    trust_report: TrustReport | dict[str, Any] | None = None
    policy_result: PolicyResult | dict[str, Any] | None = None
    failed_trust_banner: bool = False


# -----------------------------------------------------------------------------
# Public Service API
# -----------------------------------------------------------------------------
def start_run(business_id: str, lead_id: str | None = None) -> str:
    """Start an autonomous pipeline run for a business and optional target lead.

    Executes through the graph until it reaches human review (status='waiting_for_human')
    or terminates early.
    """
    repo = get_repo()
    run_id = repo.create_run(business_id, lead_id)

    initial_state = {
        "run_id": run_id,
        "business_id": business_id,
        "lead_id": lead_id,
        "status": "running",
        "retry_count": {"research": 0, "trust_audit": 0, "policy_check": 0},
        "trace": [],
    }

    graph = get_compiled_graph()
    config = {"configurable": {"thread_id": run_id}}

    # Runs until interrupt() at human_review or termination
    try:
        graph.invoke(initial_state, config)
    except Exception as exc:
        logger.error(f"Run {run_id} encountered error during graph execution: {exc}")
        repo.update_run(run_id, "failed")

    return run_id


def list_runs(business_id: str | None = None, limit: int = 20) -> list[dict[str, Any]]:
    """List recent runs for a business or system-wide."""
    repo = get_repo()
    return repo.list_runs(business_id=business_id, limit=limit)


def get_run(run_id: str) -> dict[str, Any]:
    """Retrieve run execution metadata and current state summary."""
    repo = get_repo()
    run_record = repo.get_run(run_id)
    if not run_record:
        return {"run_id": run_id, "status": "not_found", "state_summary": {}}

    graph = get_compiled_graph()
    config = {"configurable": {"thread_id": run_id}}
    state_snapshot = graph.get_state(config)

    state_values = state_snapshot.values if state_snapshot else {}
    summary_from_repo = run_record.get("state_summary") or {}
    current_status = state_values.get("status") or run_record.get("status", "unknown")

    # If execution paused at interrupt
    if state_snapshot and state_snapshot.next:
        if "human_review" in state_snapshot.next:
            current_status = "waiting_for_human"

    return {
        "run_id": run_id,
        "business_id": run_record.get("business_id"),
        "lead_id": run_record.get("lead_id"),
        "status": current_status,
        "state_summary": {
            "draft": state_values.get("draft") or summary_from_repo.get("draft"),
            "score": state_values.get("score") or summary_from_repo.get("score"),
            "trust_report": state_values.get("trust_report") or summary_from_repo.get("trust_report"),
            "policy_result": state_values.get("policy_result") or summary_from_repo.get("policy_result"),
            "mock_send_result": state_values.get("mock_send_result") or summary_from_repo.get("mock_send_result"),
            "failed_trust_banner": state_values.get("failed_trust_banner", summary_from_repo.get("failed_trust_banner", False)),
        },
    }


def get_trace(run_id: str) -> list[TraceEvent]:
    """Retrieve ordered audit trace events for the live trace panel."""
    repo = get_repo()
    return repo.get_trace(run_id)


def get_review_payload(run_id: str) -> dict[str, Any]:
    """Retrieve the draft, TrustReport with flags, and PolicyResult for human review."""
    graph = get_compiled_graph()
    config = {"configurable": {"thread_id": run_id}}
    snapshot = graph.get_state(config)
    vals = snapshot.values if snapshot else {}

    repo = get_repo()
    run_rec = repo.get_run(run_id) or {}
    rep_summary = run_rec.get("state_summary") or {}

    draft = vals.get("draft") or rep_summary.get("draft") or repo.get_draft(run_id)
    trust_report = vals.get("trust_report") or rep_summary.get("trust_report")
    policy_result = vals.get("policy_result") or rep_summary.get("policy_result")
    banner = vals.get("failed_trust_banner", rep_summary.get("failed_trust_banner", False))

    return {
        "run_id": run_id,
        "draft": draft,
        "trust_report": trust_report,
        "policy_result": policy_result,
        "failed_trust_banner": banner,
    }


def update_flag(run_id: str, flag_id: str, status: Literal["open", "accepted", "dismissed"]) -> TrustReport:
    """Update flag status ('accepted' or 'dismissed') and recalculate the trust report score."""
    repo = get_repo()
    repo.update_flag_status(flag_id, status)

    graph = get_compiled_graph()
    config = {"configurable": {"thread_id": run_id}}
    snapshot = graph.get_state(config)
    vals = dict(snapshot.values) if snapshot else {}

    rep_data = vals.get("trust_report")
    if not rep_data:
        raise ValueError(f"No trust report found for run {run_id}")

    report = TrustReport.model_validate(rep_data)
    for f in report.flags:
        if f.id == flag_id:
            f.status = status
            break

    # Recompute score and verdict
    report.recompute_score()

    # Update graph state checkpoint with recalculated report
    graph.update_state(config, {"trust_report": report.model_dump()})

    return report


def submit_approval(run_id: str, decision: ApprovalDecision | dict[str, Any]) -> dict[str, Any]:
    """Submit human review decision (approve, edit, reject) and resume graph execution."""
    if isinstance(decision, dict):
        decision_obj = ApprovalDecision.model_validate(decision)
    else:
        decision_obj = decision

    graph = get_compiled_graph()
    config = {"configurable": {"thread_id": run_id}}

    # Resume graph execution passing the approval decision to interrupt()
    graph.invoke(Command(resume=decision_obj), config)

    # Return updated run state
    return get_run(run_id)


def list_businesses() -> list[dict[str, Any]]:
    """List all available business profiles."""
    repo = get_repo()
    return repo.list_businesses()


def switch_business(business_id: str) -> dict[str, Any]:
    """Retrieve details for switching active business."""
    repo = get_repo()
    biz = repo.get_business(business_id)
    if not biz:
        raise ValueError(f"Business '{business_id}' not found.")
    return biz


def create_business(profile_data: dict[str, Any]) -> dict[str, Any]:
    """Create or register a new business profile."""
    import re
    import uuid
    repo = get_repo()
    raw_name = profile_data.get("name", "New Business")
    biz_id = profile_data.get("id") or re.sub(r"[^a-z0-9]+", "_", raw_name.lower()).strip("_") or f"biz_{uuid.uuid4().hex[:6]}"
    profile_data["id"] = biz_id
    profile_data.setdefault("name", raw_name)
    profile_data.setdefault("industry", "Technology & Services")
    profile_data.setdefault("ideal_customer", "B2B Decision Makers and Growth Leaders")
    profile_data.setdefault("offerings", [])
    profile_data.setdefault("channels", ["email", "linkedin"])
    profile_data.setdefault("anti_spam", {"opt_out_list": []})
    profile_data.setdefault("tone", "professional and consultative")
    profile_data.setdefault("enabled_agents", ["research", "scoring", "outreach", "content", "followup", "learning"])
    return repo.save_business(profile_data)


def record_outcome(run_id: str, outcome: Outcome | dict[str, Any]) -> dict[str, Any]:
    """Record an outreach or campaign outcome, triggering followup and learning updates."""
    repo = get_repo()
    outcome_obj = Outcome.model_validate(outcome) if isinstance(outcome, dict) else outcome
    repo.save_outcome(outcome_obj)

    # Trigger learning agent update
    run_info = get_run(run_id)
    business_id = run_info.get("business_id", "saas")

    outcomes = repo.get_outcomes(business_id)
    biz = repo.get_business(business_id) or {}

    state = {
        "profile": biz,
        "outcomes": outcomes,
        "trace": [],
        "run_id": run_id,
    }
    from agents.learning import run_learning
    updated = run_learning(state)

    for ins in updated.get("insights", []):
        repo.save_insight(ins, business_id=business_id)

    return {
        "status": "outcome_recorded",
        "insights_count": len(updated.get("insights", [])),
        "campaign_report": updated.get("campaign_report"),
    }


# -----------------------------------------------------------------------------
# Stage 2: Adaptive Onboarding Services
# -----------------------------------------------------------------------------
def start_onboarding_session(
    session_id: str | None = None,
    core_answers: dict[str, Any] | None = None,
) -> Any:
    """Initialize or resume an adaptive onboarding session."""
    from core.onboarding import initialize_or_resume_session
    from core.repo import get_active_backend_info
    from shared.schemas import CoreIntakeAnswers

    repo = get_repo()
    backend_info = get_active_backend_info()
    if session_id:
        existing = repo.get_onboarding_session(session_id)
        if existing:
            existing.storage_backend = backend_info["storage_backend"]
            existing.storage_fallback = backend_info["storage_fallback"]
            return existing

    intake = CoreIntakeAnswers.model_validate(core_answers) if core_answers else CoreIntakeAnswers()
    session = initialize_or_resume_session(
        session_id=session_id,
        core_answers=intake,
        storage_backend=backend_info["storage_backend"],
        storage_fallback=backend_info["storage_fallback"],
    )
    return repo.save_onboarding_session(session)


def get_onboarding_session(session_id: str) -> Any | None:
    """Retrieve an onboarding session."""
    from core.repo import get_active_backend_info
    repo = get_repo()
    session = repo.get_onboarding_session(session_id)
    if session:
        backend_info = get_active_backend_info()
        session.storage_backend = backend_info["storage_backend"]
        session.storage_fallback = backend_info["storage_fallback"]
    return session


def save_onboarding_session(
    session_id: str,
    core_answers: dict[str, Any] | None = None,
    follow_up_answers: dict[str, Any] | None = None,
    stage_override: str | None = None,
) -> Any:
    """Autosave handler updating answers, recalculating facts and readiness."""
    from core.onboarding import update_session_answers
    from core.repo import get_active_backend_info
    from shared.schemas import CoreIntakeAnswers

    repo = get_repo()
    session = repo.get_onboarding_session(session_id)
    backend_info = get_active_backend_info()
    if not session:
        intake = CoreIntakeAnswers.model_validate(core_answers) if core_answers else CoreIntakeAnswers()
        from core.onboarding import initialize_or_resume_session
        session = initialize_or_resume_session(
            session_id=session_id,
            core_answers=intake,
            storage_backend=backend_info["storage_backend"],
            storage_fallback=backend_info["storage_fallback"],
        )

    intake_obj = CoreIntakeAnswers.model_validate(core_answers) if core_answers else None
    updated_session = update_session_answers(
        session=session,
        core_answers=intake_obj,
        follow_up_answers=follow_up_answers,
        stage_override=stage_override,  # type: ignore
    )
    updated_session.storage_backend = backend_info["storage_backend"]
    updated_session.storage_fallback = backend_info["storage_fallback"]

    if updated_session.core_answers and updated_session.core_answers.name and updated_session.core_answers.name.strip():
        import re
        b_name = updated_session.core_answers.name.strip()
        b_id = re.sub(r"[^a-z0-9]+", "_", b_name.lower()).strip("_") or session_id
        try:
            repo.save_business({
                "id": b_id,
                "name": b_name,
                "industry": updated_session.core_answers.business_type,
                "offerings": [updated_session.core_answers.idea] if updated_session.core_answers.idea else [],
                "ideal_customer": updated_session.core_answers.goal or "",
                "stage": updated_session.core_answers.stage,
                "tone": "professional and consultative",
                "channels": ["email", "linkedin"],
                "anti_spam": {"opt_out_list": []},
            })
        except Exception as exc:
            logger.warning(f"Could not auto-save business profile from onboarding session: {exc}")

    return repo.save_onboarding_session(updated_session)


def generate_follow_up_questions(
    session_id: str,
    force_fallback: bool = False,
) -> Any:
    """Generate or regenerate follow-up questions for session."""
    from core.onboarding import generate_adaptive_follow_ups

    repo = get_repo()
    session = repo.get_onboarding_session(session_id)
    if not session:
        raise ValueError(f"Onboarding session '{session_id}' not found.")

    res = generate_adaptive_follow_ups(session.core_answers, force_fallback=force_fallback)
    session.follow_ups = res.questions
    session.is_fallback_active = res.is_fallback
    repo.save_onboarding_session(session)
    return res


# -----------------------------------------------------------------------------
# Stage 3: Atlas Task Graph & State Machine Services
# -----------------------------------------------------------------------------
def plan_tasks(
    business_id: str | None = None,
    phase: str | None = None,
    session_id: str | None = None,
) -> list[Any]:
    """Generate phase-aware task graph using Atlas planner."""
    from core.planner import generate_task_graph

    repo = get_repo()
    session = None
    if session_id:
        session = repo.get_onboarding_session(session_id)

    return generate_task_graph(
        business_id=business_id,
        phase=phase,  # type: ignore
        session=session,
        repo=repo,
    )


def list_tasks(
    business_id: str | None = None,
    phase: str | None = None,
    status: str | None = None,
) -> list[Any]:
    """List tasks matching filters."""
    repo = get_repo()
    return repo.list_tasks(business_id=business_id, phase=phase, status=status)


def get_task_details(task_id: str) -> dict[str, Any]:
    """Retrieve full task details including audit events, versions, and report."""
    repo = get_repo()
    task = repo.get_task(task_id)
    if not task:
        raise ValueError(f"Task '{task_id}' not found.")

    events = repo.get_task_events(task_id)
    versions = repo.get_task_versions(task_id)
    report = repo.get_agent_report(task_id)

    return {
        "task": task,
        "events": events,
        "versions": versions,
        "report": report,
    }


def update_task_fields(
    task_id: str,
    updates: dict[str, Any],
    reason: str = "Task fields updated via API",
) -> dict[str, Any]:
    """Edit task fields, creating an immutable version snapshot."""
    from core.state_machine import edit_task

    repo = get_repo()
    task, version = edit_task(task_id=task_id, updates=updates, reason=reason, repo=repo)
    return {"task": task, "version": version}


def transition_task_status(
    task_id: str,
    to_status: str,
    reason: str = "",
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Transition task status through table-driven state machine."""
    from core.state_machine import transition_task

    repo = get_repo()
    task, event = transition_task(
        task_or_id=task_id,
        to_status=to_status,  # type: ignore
        reason=reason,
        details=details,
        repo=repo,
    )
    return {"task": task, "event": event}


def pause_task_service(task_id: str, reason: str = "User requested pause") -> dict[str, Any]:
    """Pause an active task."""
    from core.state_machine import pause_task

    repo = get_repo()
    task, event = pause_task(task_or_id=task_id, reason=reason, repo=repo)
    return {"task": task, "event": event}


def resume_task_service(task_id: str, reason: str = "User requested resume") -> dict[str, Any]:
    """Resume a paused task."""
    from core.state_machine import resume_task

    repo = get_repo()
    task, event = resume_task(task_or_id=task_id, reason=reason, repo=repo)
    return {"task": task, "event": event}


def execute_task_service(task_id: str, context: dict[str, Any] | None = None) -> dict[str, Any]:
    """Execute task via TaskExecutor adapter with strict AgentReport validation."""
    from core.executor import execute_task

    repo = get_repo()
    task, report = execute_task(task_or_id=task_id, context=context, repo=repo)
    return {"task": task, "report": report}


def answer_missing_info(
    task_id: str,
    answer: str,
    what_item: str | None = None,
    item_index: int | None = None,
) -> Any:
    """Submit client answer to resolve a missing information item."""
    from core.planner import submit_client_answer

    repo = get_repo()
    return submit_client_answer(
        task_id=task_id,
        answer=answer,
        what_item=what_item,
        item_index=item_index,
        repo=repo,
    )


def approve_task_service(task_id: str, reviewer: str = "human", notes: str = "") -> dict[str, Any]:
    """Approve a task pending admin or client review."""
    from core.state_machine import transition_task

    repo = get_repo()
    task, event = transition_task(
        task_or_id=task_id,
        to_status="approved",
        reason=f"Approved by {reviewer}: {notes or 'Authorized'}",
        details={"reviewer": reviewer, "notes": notes},
        repo=repo,
    )
    return {"task": task, "event": event}

