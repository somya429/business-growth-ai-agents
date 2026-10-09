"""Table-Driven State Machine and Task Versioning for Atlas Planner.

Enforces legal task state transitions, records mandatory audit events (TaskEvent),
handles pause/resume cycles, and maintains task snapshot versions (TaskVersion).
"""

from __future__ import annotations

import datetime
from typing import Any
import uuid

from core.repo import get_repo
from shared.schemas import Task, TaskEvent, TaskStatus, TaskVersion


class InvalidTransitionError(ValueError):
    """Raised when an illegal state machine transition is attempted."""
    pass


# -----------------------------------------------------------------------------
# Table-Driven Transition Rules
# -----------------------------------------------------------------------------
LEGAL_TRANSITIONS: dict[TaskStatus, set[TaskStatus]] = {
    "planned": {"assigned", "blocked", "client_review", "admin_approval", "cancelled"},
    "assigned": {"running", "blocked", "client_review", "admin_approval", "paused", "cancelled"},
    "running": {
        "blocked",
        "client_review",
        "admin_approval",
        "executing",
        "completed",
        "failed",
        "paused",
        "cancelled",
    },
    "blocked": {"planned", "assigned", "running", "cancelled"},
    "client_review": {"approved", "failed", "running", "cancelled"},
    "admin_approval": {"approved", "failed", "running", "cancelled"},
    "approved": {"executing", "completed", "failed", "cancelled"},
    "executing": {
        "completed",
        "failed",
        "paused",
        "cancelled",
        "client_review",
        "admin_approval",
    },
    "paused": {"planned", "assigned", "running", "executing", "cancelled"},
    "failed": {"planned", "cancelled"},
    "completed": {"planned"},  # Allows planned re-run if explicitly requested
    "cancelled": set(),        # Terminal state
}


def can_transition(from_status: TaskStatus, to_status: TaskStatus) -> bool:
    """Check whether a transition between two statuses is permitted."""
    allowed = LEGAL_TRANSITIONS.get(from_status, set())
    return to_status in allowed


def transition_task(
    task_or_id: Task | str | None = None,
    to_status: TaskStatus = "planned",
    reason: str = "",
    details: dict[str, Any] | None = None,
    repo: Any | None = None,
    task: Task | str | None = None,
) -> tuple[Task, TaskEvent]:
    """Execute a table-driven state machine transition with audit logging.

    Raises:
        InvalidTransitionError: If the transition is not allowed by LEGAL_TRANSITIONS.
    """
    repository = repo or get_repo()
    target = task_or_id if task_or_id is not None else task
    if target is None:
        raise ValueError("Must provide task or task_or_id to transition_task.")

    if isinstance(target, str):
        t_obj = repository.get_task(target)
        if not t_obj:
            raise ValueError(f"Task '{target}' not found.")
    else:
        t_obj = target

    from_status = t_obj.status

    # Validate transition
    if not can_transition(from_status, to_status):
        raise InvalidTransitionError(
            f"Illegal transition from '{from_status}' to '{to_status}'. "
            f"Allowed next states: {sorted(list(LEGAL_TRANSITIONS.get(from_status, set())))}"
        )

    # Handle Pause & Resume logic
    if to_status == "paused":
        t_obj.prior_status = from_status
    elif from_status == "paused" and t_obj.prior_status:
        # Reset prior status once resumed
        t_obj.prior_status = None

    t_obj.status = to_status
    t_obj.updated_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Create audit event
    event_details = dict(details or {})
    if reason:
        event_details["reason"] = reason

    event = TaskEvent(
        id=f"tevt_{uuid.uuid4().hex[:8]}",
        task_id=t_obj.id,
        event_type="status_transition",
        from_status=from_status,
        to_status=to_status,
        details=event_details,
        timestamp=t_obj.updated_at,
    )

    # Persist in repository
    repository.save_task(t_obj)
    repository.save_task_event(event)

    return t_obj, event


def pause_task(
    task_or_id: Task | str | None = None,
    reason: str = "User or system requested pause",
    repo: Any | None = None,
    task: Task | str | None = None,
) -> tuple[Task, TaskEvent]:
    """Pause an active task, preserving prior status for resumption."""
    target = task_or_id if task_or_id is not None else task
    return transition_task(
        task_or_id=target,
        to_status="paused",
        reason=reason,
        details={"action": "pause"},
        repo=repo,
    )


def resume_task(
    task_or_id: Task | str | None = None,
    target_status: TaskStatus | None = None,
    reason: str = "Resumed from pause",
    repo: Any | None = None,
    task: Task | str | None = None,
) -> tuple[Task, TaskEvent]:
    """Resume a paused task back to its prior status or specified target status."""
    repository = repo or get_repo()
    target = task_or_id if task_or_id is not None else task
    if target is None:
        raise ValueError("Must provide task or task_or_id to resume_task.")

    if isinstance(target, str):
        t_obj = repository.get_task(target)
        if not t_obj:
            raise ValueError(f"Task '{target}' not found.")
    else:
        t_obj = target

    if t_obj.status != "paused":
        raise InvalidTransitionError(f"Cannot resume task in '{t_obj.status}' state (must be 'paused').")

    resumed_status = target_status or t_obj.prior_status or "running"
    return transition_task(
        task_or_id=t_obj,
        to_status=resumed_status,
        reason=reason,
        details={"action": "resume", "prior_status": t_obj.prior_status},
        repo=repository,
    )


def edit_task(
    task_or_id: Task | str | None = None,
    updates: dict[str, Any] | None = None,
    reason: str = "Task fields updated",
    repo: Any | None = None,
    task: Task | str | None = None,
) -> tuple[Task, TaskVersion]:
    """Update task fields, incrementing version and storing an immutable snapshot."""
    repository = repo or get_repo()
    target = task_or_id if task_or_id is not None else task
    if target is None:
        raise ValueError("Must provide task or task_or_id to edit_task.")

    if isinstance(target, str):
        t_obj = repository.get_task(target)
        if not t_obj:
            raise ValueError(f"Task '{target}' not found.")
    else:
        t_obj = target

    updates_map = updates or {}

    # Snapshot current version before or at edit
    snapshot = t_obj.model_dump()
    version_record = TaskVersion(
        id=f"tver_{uuid.uuid4().hex[:8]}",
        task_id=t_obj.id,
        version=t_obj.version,
        snapshot=snapshot,
        created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    )
    repository.save_task_version(version_record)

    # Apply updates (disallow direct mutation of immutable fields like id, created_at)
    protected_fields = {"id", "created_at"}
    for k, v in updates_map.items():
        if k not in protected_fields and hasattr(t_obj, k):
            setattr(t_obj, k, v)

    t_obj.version += 1
    t_obj.updated_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
    repository.save_task(t_obj)

    # Log edit event
    edit_event = TaskEvent(
        id=f"tevt_{uuid.uuid4().hex[:8]}",
        task_id=t_obj.id,
        event_type="task_edited",
        from_status=t_obj.status,
        to_status=t_obj.status,
        details={"version": t_obj.version, "updated_fields": list(updates_map.keys()), "reason": reason},
        timestamp=t_obj.updated_at,
    )
    repository.save_task_event(edit_event)

    return t_obj, version_record

