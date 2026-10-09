"""Shared state definition for the account research & outreach graph."""

from __future__ import annotations

from typing import Any, TypedDict


class ExecutionMetadata(TypedDict, total=False):
    """Bookkeeping carried alongside the business state.

    Not part of the LangGraph business schema per se, but threaded through
    the state so every node can read/append to it without a side-channel.
    """

    node_durations: dict[str, float]
    errors: list[str]
    retry_count: int
    status: str  # "ok" | "error" | "retry" | "failed"
    last_error_node: str


class AgentState(TypedDict, total=False):
    """State passed between every node in the pipeline."""

    company_name: str
    research_data: dict[str, Any]
    business_signals: list[dict[str, Any]]
    buying_committee: list[dict[str, Any]]
    account_intelligence: dict[str, Any]
    why_now_analysis: dict[str, Any]
    outreach_sequence: list[dict[str, Any]]
    outreach_evaluation: dict[str, Any]
    agent_executions: dict[str, dict[str, Any]]
    crm_status: str
    email_status: str
    execution_metadata: ExecutionMetadata
