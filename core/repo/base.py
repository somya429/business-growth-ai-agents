"""Abstract Repository interface for Growth Agents data and state persistence."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from shared.schemas import (
    ApprovalDecision,
    BusinessProfile,
    Draft,
    KnowledgeBaseDoc,
    Lead,
    LearningInsight,
    Outcome,
    TraceEvent,
    TrustReport,
)


class Repository(ABC):
    """Abstract Repository interface.

    Agents and graph nodes must NEVER import Supabase or SQL directly;
    they interact strictly through this repository contract.
    """

    # -------------------------------------------------------------------------
    # Businesses
    # -------------------------------------------------------------------------
    @abstractmethod
    def get_business(self, business_id: str) -> dict[str, Any] | None:
        """Retrieve a business profile dict by business_id (e.g. 'saas', 'ecommerce')."""
        pass

    @abstractmethod
    def list_businesses(self) -> list[dict[str, Any]]:
        """List all available business profiles."""
        pass

    @abstractmethod
    def save_business(self, profile: dict[str, Any]) -> dict[str, Any]:
        """Create or update a business profile."""
        pass

    # -------------------------------------------------------------------------
    # Knowledge Base
    # -------------------------------------------------------------------------
    @abstractmethod
    def get_kb_docs(self, business_id: str) -> list[dict[str, Any]]:
        """Retrieve all verified KB documents for a business."""
        pass

    @abstractmethod
    def search_kb(
        self,
        business_id: str,
        query_embedding: list[float] | None = None,
        query: str | None = None,
        k: int = 5,
    ) -> list[dict[str, Any]]:
        """Search knowledge base docs by embedding vector or text query."""
        pass

    # -------------------------------------------------------------------------
    # Leads
    # -------------------------------------------------------------------------
    @abstractmethod
    def get_leads(self, business_id: str) -> list[dict[str, Any]]:
        """Retrieve all leads for a given business."""
        pass

    @abstractmethod
    def get_lead(self, lead_id: str) -> dict[str, Any] | None:
        """Retrieve a single lead by its lead_id."""
        pass

    @abstractmethod
    def update_lead_status(self, lead_id: str, status: str) -> bool:
        """Update the pipeline status of a lead (e.g. 'contacted', 'opted_out')."""
        pass

    @abstractmethod
    def add_to_opt_out(self, business_id: str, email: str) -> bool:
        """Add an email or domain to the business anti-spam opt-out list."""
        pass

    # -------------------------------------------------------------------------
    # Campaigns & Drafts
    # -------------------------------------------------------------------------
    @abstractmethod
    def save_draft(self, run_id: str, draft: dict[str, Any] | Draft) -> str:
        """Save a generated outreach draft linked to a run. Returns draft_id."""
        pass

    @abstractmethod
    def get_draft(self, draft_id: str) -> dict[str, Any] | None:
        """Retrieve a saved draft by draft_id or run_id."""
        pass

    # -------------------------------------------------------------------------
    # Trust Reports & Flags
    # -------------------------------------------------------------------------
    @abstractmethod
    def save_trust_report(self, run_id: str, report: dict[str, Any] | TrustReport) -> str:
        """Save a TrustReport and its flags linked to a run."""
        pass

    @abstractmethod
    def update_flag_status(self, flag_id: str, status: str) -> bool:
        """Update a flag status ('open', 'accepted', 'dismissed')."""
        pass

    # -------------------------------------------------------------------------
    # Approvals
    # -------------------------------------------------------------------------
    @abstractmethod
    def save_approval(self, run_id: str, decision: dict[str, Any] | ApprovalDecision) -> str:
        """Record a human approval decision for a run."""
        pass

    # -------------------------------------------------------------------------
    # Outcomes & Insights
    # -------------------------------------------------------------------------
    @abstractmethod
    def save_outcome(self, outcome: dict[str, Any] | Outcome, business_id: str | None = None) -> str:
        """Save a campaign or outreach outcome."""
        pass

    @abstractmethod
    def get_outcomes(self, business_id: str) -> list[dict[str, Any]]:
        """Retrieve past campaign outcomes for a business."""
        pass

    @abstractmethod
    def save_insight(self, insight: dict[str, Any] | LearningInsight, business_id: str | None = None) -> str:
        """Save an extracted learning insight."""
        pass

    @abstractmethod
    def get_insights(self, business_id: str) -> list[dict[str, Any]]:
        """Retrieve learning insights for a business."""
        pass

    # -------------------------------------------------------------------------
    # Trace Auditing
    # -------------------------------------------------------------------------
    @abstractmethod
    def append_trace(self, run_id: str, event: dict[str, Any] | TraceEvent) -> None:
        """Append a trace event to the audit trail of a run."""
        pass

    @abstractmethod
    def get_trace(self, run_id: str) -> list[TraceEvent]:
        """Retrieve all trace events for a run, ordered by timestamp."""
        pass

    # -------------------------------------------------------------------------
    # Run Orchestration Lifecycle
    # -------------------------------------------------------------------------
    @abstractmethod
    def create_run(self, business_id: str, lead_id: str | None = None) -> str:
        """Initialize and persist a new pipeline run. Returns run_id."""
        pass

    @abstractmethod
    def update_run(self, run_id: str, status: str, state_summary: dict[str, Any] | None = None) -> bool:
        """Update run execution status and summary state."""
        pass

    @abstractmethod
    def get_run(self, run_id: str) -> dict[str, Any] | None:
        """Get run metadata and current status summary."""
        pass

    # -------------------------------------------------------------------------
    # Stage 2: Onboarding Sessions
    # -------------------------------------------------------------------------
    @abstractmethod
    def save_onboarding_session(self, session: Any) -> Any:
        """Persist or autosave an onboarding session."""
        pass

    @abstractmethod
    def get_onboarding_session(self, session_id: str) -> Any | None:
        """Retrieve an onboarding session by session_id."""
        pass

    @abstractmethod
    def list_onboarding_sessions(self) -> list[Any]:
        """List all active or completed onboarding sessions."""
        pass

    # -------------------------------------------------------------------------
    # Stage 3: Atlas Tasks, Events, Versions, and Reports
    # -------------------------------------------------------------------------
    @abstractmethod
    def save_task(self, task: Any) -> Any:
        """Save or update a task."""
        pass

    @abstractmethod
    def get_task(self, task_id: str) -> Any | None:
        """Retrieve a task by its task_id."""
        pass

    @abstractmethod
    def list_tasks(
        self,
        business_id: str | None = None,
        phase: str | None = None,
        status: str | None = None,
    ) -> list[Any]:
        """List tasks with optional filters."""
        pass

    @abstractmethod
    def delete_task(self, task_id: str) -> bool:
        """Delete a task by task_id."""
        pass

    @abstractmethod
    def save_task_event(self, event: Any) -> Any:
        """Save a state machine transition or audit event for a task."""
        pass

    @abstractmethod
    def get_task_events(self, task_id: str) -> list[Any]:
        """Retrieve all events for a given task, ordered chronologically."""
        pass

    @abstractmethod
    def save_task_version(self, version: Any) -> Any:
        """Save a snapshot version record for a task."""
        pass

    @abstractmethod
    def get_task_versions(self, task_id: str) -> list[Any]:
        """Retrieve all version snapshots for a task, ordered by version asc."""
        pass

    @abstractmethod
    def save_agent_report(self, report: Any) -> Any:
        """Save an agent execution report for a task."""
        pass

    @abstractmethod
    def get_agent_report(self, task_id: str) -> Any | None:
        """Retrieve the latest agent report for a task."""
        pass

