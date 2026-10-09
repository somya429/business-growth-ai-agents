"""Stub Policy Engine for Member 4 interface."""

from __future__ import annotations

import logging
import os
from typing import Any

from shared.schemas import BusinessProfile, Draft, Lead, PolicyResult

logger = logging.getLogger("core.stubs.policy")


def check_policy_stub(
    draft: dict[str, Any] | Draft,
    lead: dict[str, Any] | Lead,
    profile: dict[str, Any] | BusinessProfile,
    history: list[dict[str, Any]] | None = None,
) -> PolicyResult:
    """Deterministic policy check enforcing anti-spam and messaging guidelines.

    Rules:
    - Opt-out list check: Lead email/domain must not be in profile.anti_spam.opt_out_list.
    - Max contacts per week from the profile: Contact frequency must not exceed cap.
    - Required opt-out line: Draft body must contain opt-out wording.
    """
    d_dict = draft.model_dump() if hasattr(draft, "model_dump") else draft
    l_dict = lead.model_dump() if hasattr(lead, "model_dump") else lead
    p_dict = profile.model_dump() if hasattr(profile, "model_dump") else profile

    violations = []
    required_edits = []

    body = d_dict.get("body", "")
    lead_email = (l_dict.get("email") or "").strip().lower()
    lead_domain = lead_email.split("@")[-1] if "@" in lead_email else ""
    lead_status = l_dict.get("status", "new")

    anti_spam = p_dict.get("anti_spam", {})
    opt_out_list = [str(x).strip().lower() for x in anti_spam.get("opt_out_list", [])]

    # 1. Opt-out check
    if lead_email in opt_out_list or lead_domain in opt_out_list or lead_status == "opted_out":
        violations.append(
            {
                "rule": "opt_out_list",
                "detail": f"Contact '{lead_email}' is in the anti-spam opt-out registry.",
            }
        )
        required_edits.append("Suppress outreach: Contact is on the opt-out list.")

    # 2. Max contacts per week check
    max_contacts = anti_spam.get("max_contacts_per_week", 3)
    if history:
        # Count recent contacts
        lead_id = l_dict.get("id")
        recent_contacts = sum(1 for h in history if h.get("lead_id") == lead_id)
        if recent_contacts >= max_contacts:
            violations.append(
                {
                    "rule": "max_contacts_per_week",
                    "detail": f"Contact attempts ({recent_contacts}) exceed weekly frequency cap of {max_contacts}.",
                }
            )
            required_edits.append(f"Postpone outreach to honor weekly limit of {max_contacts} contacts.")

    # 3. Required opt-out line in draft
    body_lower = body.lower()
    has_opt_out = any(phrase in body_lower for phrase in ["opt out", "opt-out", "stop", "unsubscribe"])
    if not has_opt_out:
        violations.append(
            {
                "rule": "required_opt_out_line",
                "detail": "Message body is missing required anti-spam unsubscribe instructions.",
            }
        )
        required_edits.append("Add standard opt-out footer (e.g. 'Reply STOP to opt out of future emails.').")

    passed = len(violations) == 0
    return PolicyResult(passed=passed, violations=violations, required_edits=required_edits)


def check_policy(
    draft: dict[str, Any] | Draft,
    lead: dict[str, Any] | Lead,
    profile: dict[str, Any] | BusinessProfile,
    history: list[dict[str, Any]] | None = None,
) -> PolicyResult:
    """Entry point for Policy Engine, switching between stub and real implementation."""
    impl = os.environ.get("POLICY_IMPL", "stub").lower()
    if impl == "real":
        try:
            from policy.engine import check_policy as real_check
            return real_check(draft, lead, profile, history)
        except ImportError:
            logger.warning("Real Policy Engine not found at policy.engine; using stub instead.")

    return check_policy_stub(draft, lead, profile, history)
