"""Orchestrator: Thin LLM-assisted planner with deterministic safety routing."""

from __future__ import annotations

import logging
from typing import Any
from pydantic import BaseModel, Field

from agents.llm import call_structured
from shared.schemas import BusinessProfile, Lead

logger = logging.getLogger("core.orchestrator")


class OrchestratorPlan(BaseModel):
    """Structured plan emitted by the Orchestrator."""
    plan_summary: str = Field(description="High-level summary of the pipeline orchestration plan")
    active_agents: list[str] = Field(description="List of enabled agents scheduled for execution")
    reason: str = Field(description="Strategic rationale for orchestration and agent selection")
    skip_content: bool = Field(default=False, description="Whether content marketing agent is bypassed")


def plan_pipeline(
    profile: BusinessProfile | dict[str, Any],
    lead: Lead | dict[str, Any] | None = None,
) -> OrchestratorPlan:
    """Generate orchestration plan reading BusinessProfile.enabled_agents.

    Uses LLM for plan synthesis with a deterministic fallback plan on failure or in mock mode.
    Orchestrator CANNOT send or edit data.
    """
    p_dict = profile.model_dump() if hasattr(profile, "model_dump") else profile
    l_dict = lead.model_dump() if hasattr(lead, "model_dump") and lead else (lead or {})

    enabled = p_dict.get(
        "enabled_agents",
        ["research", "scoring", "outreach", "content", "followup", "learning"],
    )
    biz_name = p_dict.get("name", "Business")
    lead_name = l_dict.get("name", "Prospect")

    # Deterministic fallback plan
    fallback = OrchestratorPlan(
        plan_summary=f"Orchestrated verified outreach pipeline for {biz_name} targeting {lead_name}.",
        active_agents=enabled,
        reason=f"Configured enabled agents: {', '.join(enabled)}. Safety and human review strictly enforced.",
        skip_content="content" not in enabled,
    )

    prompt = (
        f"You are the Growth Orchestrator for {biz_name} ({p_dict.get('industry', 'B2B')}).\n"
        f"Enabled agents from business profile: {enabled}.\n"
        f"Target prospect: {lead_name} at {l_dict.get('company', 'Company')} ({l_dict.get('role', 'Role')}).\n"
        "Generate a structured plan summary and reason for the audit trace.\n"
        "Safety rule: Content generation must be skipped if 'content' is not in enabled agents."
    )

    try:
        plan = call_structured(
            prompt=prompt,
            schema=OrchestratorPlan,
            system="You are an AI pipeline orchestrator. Produce structured orchestration plans without executing actions.",
        )
        # Ensure active_agents strictly adheres to BusinessProfile.enabled_agents
        plan.active_agents = [a for a in plan.active_agents if a in enabled] or enabled
        plan.skip_content = "content" not in plan.active_agents
        return plan
    except Exception as exc:
        logger.info(f"Using deterministic fallback plan: {exc}")
        return fallback
