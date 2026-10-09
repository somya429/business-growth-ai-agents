"""Central permission engine for agent boundaries and tool authorizations."""

from __future__ import annotations

import datetime
import functools
import logging
from typing import Any, Callable

from shared.schemas import GrowthState, TraceEvent

logger = logging.getLogger("core.permissions")

# Central explicit permission map
# Outreach: no web search, no send
# Trust Auditor: no draft editing
# Learning: no policy changes
# Follow-up: no price quoting
# NO agent may send; only mock_send node may "send"
AGENT_PERMISSIONS: dict[str, dict[str, list[str]]] = {
    "research": {
        "allowed_tools": ["read_crm", "search_kb", "web_search_stub"],
        "forbidden_actions": ["write_copy", "send", "edit_kb", "quote_price"],
    },
    "scoring": {
        "allowed_tools": ["evaluate_fit", "evaluate_timing", "read_memory"],
        "forbidden_actions": ["contact_lead", "send", "write_copy", "edit_kb"],
    },
    "outreach": {
        "allowed_tools": ["grounded_drafting"],
        "forbidden_actions": ["web_search", "send", "edit_kb", "invent_claims"],
    },
    "content": {
        "allowed_tools": ["grounded_content_generation"],
        "forbidden_actions": ["web_search", "send", "edit_kb", "invent_claims"],
    },
    "followup": {
        "allowed_tools": ["analyze_reply", "record_opt_out"],
        "forbidden_actions": ["quote_price", "send", "invent_claims"],
    },
    "learning": {
        "allowed_tools": ["aggregate_metrics", "generate_insights"],
        "forbidden_actions": ["change_policy", "edit_anti_spam", "send"],
    },
    "trust_auditor": {
        "allowed_tools": ["audit_claims", "check_facts", "evaluate_trust"],
        "forbidden_actions": ["edit_draft", "send"],
    },
    "policy_engine": {
        "allowed_tools": ["check_anti_spam", "check_rules", "verify_policy"],
        "forbidden_actions": ["send", "edit_draft"],
    },
    "mock_send": {
        "allowed_tools": ["send", "send_outreach", "update_crm"],
        "forbidden_actions": ["edit_policy"],
    },
    "orchestrator": {
        "allowed_tools": ["plan_pipeline"],
        "forbidden_actions": ["send", "edit_draft", "edit_kb"],
    },
    "compass": {
        "allowed_tools": [
            "analyze_strategy",
            "estimate_unit_economics",
            "evaluate_business_model",
            "rank_assumptions",
            "generate_positioning",
            "read_research",
            "read_crm",
        ],
        "forbidden_actions": [
            "spend",
            "contact_anyone",
            "send",
            "send_email",
            "contact_lead",
            "contact_leads",
            "publish",
            "spend_budget",
            "edit_kb",
            "write_copy",
        ],
    },
    "herald": {
        "allowed_tools": [
            "plan_campaign",
            "allocate_budget",
            "design_experiments",
            "delegate_copy_tasks",
            "delegate_tasks",
            "check_channel_feasibility",
        ],
        "forbidden_actions": [
            "send",
            "send_email",
            "publish",
            "publish_content",
            "spend",
            "spend_budget",
            "contact_lead",
            "contact_anyone",
            "write_copy",
            "edit_policy",
        ],
    },
    # Aliases for capitalized/fleet names
    "scout": {
        "allowed_tools": ["read_crm", "search_kb", "web_search_stub"],
        "forbidden_actions": ["write_copy", "send", "edit_kb", "quote_price"],
    },
    "cadence": {
        "allowed_tools": ["evaluate_fit", "evaluate_timing", "read_memory"],
        "forbidden_actions": ["contact_lead", "send", "write_copy", "edit_kb"],
    },
    "quill": {
        "allowed_tools": ["grounded_drafting"],
        "forbidden_actions": ["web_search", "send", "edit_kb", "invent_claims"],
    },
    "muse": {
        "allowed_tools": ["grounded_content_generation"],
        "forbidden_actions": ["web_search", "send", "edit_kb", "invent_claims"],
    },
    "echo": {
        "allowed_tools": ["analyze_reply", "record_opt_out"],
        "forbidden_actions": ["quote_price", "send", "invent_claims"],
    },
    "sage": {
        "allowed_tools": ["aggregate_metrics", "generate_insights"],
        "forbidden_actions": ["change_policy", "edit_anti_spam", "send"],
    },
    "veritas": {
        "allowed_tools": ["audit_claims", "check_facts", "evaluate_trust"],
        "forbidden_actions": ["edit_draft", "send"],
    },
    "warden": {
        "allowed_tools": ["check_anti_spam", "check_rules", "verify_policy"],
        "forbidden_actions": ["send", "edit_draft"],
    },
    "courier": {
        "allowed_tools": ["send", "send_outreach", "update_crm"],
        "forbidden_actions": ["edit_policy"],
    },
    "atlas": {
        "allowed_tools": ["plan_pipeline"],
        "forbidden_actions": ["send", "edit_draft", "edit_kb"],
    },
}


class PermissionDeniedError(RuntimeError):
    """Raised when an agent or node attempts an unauthorized tool or forbidden action."""
    pass


def check_permission(agent_name: str, action: str) -> None:
    """Validate that an agent has explicit authorization to perform an action.

    Rules:
    - NO agent except 'mock_send' and 'courier' may execute 'send'.
    - Forbidden actions always raise PermissionDeniedError.
    - Actions not in allowed_tools raise PermissionDeniedError.
    """
    norm_agent = agent_name.lower().strip()
    norm_action = action.lower().strip()

    if norm_action == "send" and norm_agent not in ("mock_send", "courier"):
        raise PermissionDeniedError(
            f"SECURITY VIOLATION: Agent '{agent_name}' is forbidden from executing 'send'. "
            "Only the dedicated 'mock_send' node is authorized to send communications."
        )

    perms = AGENT_PERMISSIONS.get(norm_agent)
    if not perms:
        raise PermissionDeniedError(f"Agent '{agent_name}' has no defined permission boundary.")

    forbidden = perms.get("forbidden_actions", [])
    if norm_action in forbidden:
        raise PermissionDeniedError(
            f"SECURITY VIOLATION: Agent '{agent_name}' is explicitly forbidden from executing '{action}'."
        )

    allowed = perms.get("allowed_tools", [])
    if norm_action not in allowed:
        raise PermissionDeniedError(
            f"SECURITY VIOLATION: Action '{action}' is not in allowed tools for agent '{agent_name}'."
        )


def enforce_node_permission(agent_name: str, action_name: str) -> Callable:
    """Decorator for functions/tools to enforce permission and record any denial in state trace."""
    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            state: GrowthState | None = None
            for a in args:
                if isinstance(a, dict) and ("trace" in a or "profile" in a or "run_id" in a):
                    state = a
                    break

            try:
                check_permission(agent_name, action_name)
            except PermissionDeniedError as pde:
                err_msg = str(pde)
                logger.error(f"Permission denied for [{agent_name} -> {action_name}]: {err_msg}")
                if state is not None:
                    event = TraceEvent(
                        agent=agent_name,
                        step="permission_denial",
                        input_summary=f"Attempted forbidden action: '{action_name}'",
                        output_summary=f"ACCESS DENIED: {err_msg}",
                        reason=f"Central security enforcement blocked forbidden operation for {agent_name}",
                        timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    )
                    state.setdefault("trace", []).append(event)
                    run_id = state.get("run_id")
                    if run_id:
                        try:
                            from core.repo import get_repo
                            get_repo().append_trace(run_id, event)
                        except Exception:
                            pass
                raise

            return fn(*args, **kwargs)
        return wrapper
    return decorator
