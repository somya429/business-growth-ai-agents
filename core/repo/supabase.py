"""Supabase-backed implementation of the Repository interface with automatic retries and fallback."""

from __future__ import annotations

import datetime
import logging
import os
import time
from typing import Any, Callable, TypeVar
import uuid

from core.repo.base import Repository
from core.repo.local import LocalRepository
from shared.schemas import (
    AgentReport,
    ApprovalDecision,
    Draft,
    Flag,
    KnowledgeBaseDoc,
    Lead,
    LearningInsight,
    OnboardingSession,
    Outcome,
    Task,
    TaskEvent,
    TaskVersion,
    TraceEvent,
    TrustReport,
)

logger = logging.getLogger("core.repo.supabase")
T = TypeVar("T")


def normalize_supabase_url(url: str | None) -> str:
    """Normalize Supabase URL by stripping whitespace, trailing slashes, and /rest/v1 suffixes."""
    if not url:
        return ""
    cleaned = url.strip().strip("'\"").rstrip("/")
    if cleaned.endswith("/rest/v1"):
        cleaned = cleaned[:-len("/rest/v1")].rstrip("/")
    return cleaned


class SupabaseRepository(Repository):
    """Supabase repository for PostgreSQL and pgvector cloud persistence.

    Uses SUPABASE_URL and SUPABASE_SERVICE_KEY (server-side only).
    Wraps every call with retry logic and clear error reporting.
    Falls back gracefully to LocalRepository when REPO_FALLBACK=1 and Supabase is unreachable.
    """

    def __init__(
        self,
        client: Any = None,
        url: str | None = None,
        key: str | None = None,
        fallback_on_error: bool | None = None,
    ):
        raw_url = url or os.environ.get("SUPABASE_URL", "")
        self.url = normalize_supabase_url(raw_url)
        raw_key = key or os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY") or ""
        self.key = raw_key.strip().strip("'\"")
        self.should_fallback = (
            fallback_on_error
            if fallback_on_error is not None
            else os.environ.get("REPO_FALLBACK", "0").lower() in ("1", "true", "yes")
        )
        self._local_fallback: LocalRepository | None = None
        self.client = client

        if self.client is None:
            if not self.url or not self.key:
                if self.should_fallback:
                    logger.warning("SUPABASE_URL or SUPABASE_SERVICE_KEY missing; falling back to LocalRepository.")
                    self._local_fallback = LocalRepository()
                else:
                    raise RuntimeError(
                        "SupabaseRepository requires SUPABASE_URL and SUPABASE_SERVICE_KEY. "
                        "Set REPO_FALLBACK=1 to allow local fallback."
                    )
            else:
                try:
                    from supabase import create_client
                    self.client = create_client(self.url, self.key)
                except Exception as exc:
                    if self.should_fallback:
                        logger.warning(f"Failed to connect to Supabase ({exc}); falling back to LocalRepository.")
                        self._local_fallback = LocalRepository()
                    else:
                        raise RuntimeError(f"Failed to initialize Supabase client: {exc}") from exc

    def _execute(self, op_name: str, fn: Callable[[], T], max_retries: int = 3) -> T:
        """Execute a Supabase operation with retry and fallback handling."""
        if self._local_fallback is not None:
            # Already using local fallback
            fallback_fn = getattr(self._local_fallback, op_name, None)
            if fallback_fn:
                return fallback_fn()
            raise RuntimeError(f"LocalRepository has no method {op_name}")

        last_error: Exception | None = None
        delay = 0.2
        for attempt in range(max_retries):
            try:
                return fn()
            except Exception as exc:
                last_error = exc
                logger.warning(
                    f"Supabase operation '{op_name}' failed on attempt {attempt + 1}/{max_retries}: {exc}"
                )
                time.sleep(delay)
                delay *= 2

        # If all retries failed
        if self.should_fallback:
            logger.warning(
                f"Supabase operation '{op_name}' failed after {max_retries} attempts ({last_error}). Using temporary LocalRepository fallback for this operation."
            )
            fallback_repo = LocalRepository()
            fallback_fn = getattr(fallback_repo, op_name, None)
            if fallback_fn:
                return fallback_fn()

        raise RuntimeError(f"Supabase operation '{op_name}' failed: {last_error}") from last_error

    # -------------------------------------------------------------------------
    # Businesses
    # -------------------------------------------------------------------------
    def get_business(self, business_id: str) -> dict[str, Any] | None:
        def _call():
            res = self.client.table("businesses").select("*").eq("id", business_id).execute()
            if res.data and len(res.data) > 0:
                biz = dict(res.data[0])
                return biz
            return None

        if self._local_fallback:
            return self._local_fallback.get_business(business_id)
        try:
            return self._execute("get_business", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.get_business(business_id)
            raise

    def list_businesses(self) -> list[dict[str, Any]]:
        def _call():
            res = self.client.table("businesses").select("*").execute()
            return [dict(row) for row in res.data]

        if self._local_fallback:
            return self._local_fallback.list_businesses()
        try:
            return self._execute("list_businesses", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.list_businesses()
            raise

    def save_business(self, profile: dict[str, Any]) -> dict[str, Any]:
        def _call():
            allowed_cols = {
                "id",
                "name",
                "industry",
                "offerings",
                "ideal_customer",
                "tone",
                "channels",
                "anti_spam",
                "enabled_agents",
                "stage",
                "created_at",
                "updated_at",
            }
            clean_profile = {k: v for k, v in profile.items() if k in allowed_cols}
            res = self.client.table("businesses").upsert(clean_profile).execute()
            return res.data[0] if res.data else profile

        if self._local_fallback:
            return self._local_fallback.save_business(profile)
        try:
            return self._execute("save_business", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.save_business(profile)
            raise

    # -------------------------------------------------------------------------
    # Knowledge Base
    # -------------------------------------------------------------------------
    def get_kb_docs(self, business_id: str) -> list[dict[str, Any]]:
        def _call():
            res = self.client.table("kb_docs").select("*").eq("business_id", business_id).execute()
            return [dict(row) for row in res.data]

        if self._local_fallback:
            return self._local_fallback.get_kb_docs(business_id)
        try:
            return self._execute("get_kb_docs", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.get_kb_docs(business_id)
            raise

    def search_kb(
        self,
        business_id: str,
        query_embedding: list[float] | None = None,
        query: str | None = None,
        k: int = 5,
    ) -> list[dict[str, Any]]:
        def _call():
            # If query embedding provided and RPC match_documents exists, or fallback to filter
            if query:
                res = (
                    self.client.table("kb_docs")
                    .select("*")
                    .eq("business_id", business_id)
                    .ilike("text", f"%{query}%")
                    .limit(k)
                    .execute()
                )
                if res.data:
                    return [dict(r) for r in res.data]
            res = self.client.table("kb_docs").select("*").eq("business_id", business_id).limit(k).execute()
            return [dict(r) for r in res.data]

        if self._local_fallback:
            return self._local_fallback.search_kb(business_id, query_embedding, query, k)
        try:
            return self._execute("search_kb", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.search_kb(business_id, query_embedding, query, k)
            raise

    # -------------------------------------------------------------------------
    # Leads
    # -------------------------------------------------------------------------
    def get_leads(self, business_id: str) -> list[dict[str, Any]]:
        def _call():
            res = self.client.table("leads").select("*").eq("business_id", business_id).execute()
            return [dict(r) for r in res.data]

        if self._local_fallback:
            return self._local_fallback.get_leads(business_id)
        try:
            return self._execute("get_leads", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.get_leads(business_id)
            raise

    def get_lead(self, lead_id: str) -> dict[str, Any] | None:
        def _call():
            res = self.client.table("leads").select("*").eq("id", lead_id).execute()
            if res.data and len(res.data) > 0:
                return dict(res.data[0])
            return None

        if self._local_fallback:
            return self._local_fallback.get_lead(lead_id)
        try:
            return self._execute("get_lead", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.get_lead(lead_id)
            raise

    def save_lead(self, business_id: str, lead_data: dict[str, Any]) -> dict[str, Any]:
        def _call():
            row = dict(lead_data)
            row["business_id"] = business_id
            if "id" not in row:
                import uuid
                row["id"] = f"lead_{uuid.uuid4().hex[:8]}"
            self.client.table("leads").upsert(row).execute()
            return row

        if self._local_fallback:
            return self._local_fallback.save_lead(business_id, lead_data) if hasattr(self._local_fallback, "save_lead") else lead_data
        try:
            return self._execute("save_lead", _call)
        except Exception:
            if self._local_fallback and hasattr(self._local_fallback, "save_lead"):
                return self._local_fallback.save_lead(business_id, lead_data)
            return lead_data

    def update_lead_status(self, lead_id: str, status: str) -> bool:
        def _call():
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            self.client.table("leads").update({"status": status, "updated_at": now}).eq("id", lead_id).execute()
            return True

        if self._local_fallback:
            return self._local_fallback.update_lead_status(lead_id, status)
        try:
            return self._execute("update_lead_status", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.update_lead_status(lead_id, status)
            raise

    def add_to_opt_out(self, business_id: str, email: str) -> bool:
        def _call():
            biz = self.get_business(business_id)
            if not biz:
                return False
            anti_spam = biz.get("anti_spam", {})
            opt_outs = anti_spam.setdefault("opt_out_list", [])
            clean_email = email.strip().lower()
            if clean_email not in [e.lower() for e in opt_outs]:
                opt_outs.append(clean_email)
                self.client.table("businesses").update({"anti_spam": anti_spam}).eq("id", business_id).execute()
            return True

        if self._local_fallback:
            return self._local_fallback.add_to_opt_out(business_id, email)
        try:
            return self._execute("add_to_opt_out", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.add_to_opt_out(business_id, email)
            raise

    # -------------------------------------------------------------------------
    # Campaigns & Drafts
    # -------------------------------------------------------------------------
    def save_draft(self, run_id: str, draft: dict[str, Any] | Draft) -> str:
        d_dict = draft.model_dump() if hasattr(draft, "model_dump") else draft
        draft_id = f"draft_{uuid.uuid4().hex[:8]}"

        def _call():
            row = {
                "draft_id": draft_id,
                "run_id": run_id,
                "lead_id": d_dict.get("lead_id", ""),
                "channel": d_dict.get("channel", "email"),
                "subject": d_dict.get("subject", ""),
                "body": d_dict.get("body", ""),
                "claims_used": d_dict.get("claims_used", []),
            }
            self.client.table("drafts").insert(row).execute()
            return draft_id

        if self._local_fallback:
            return self._local_fallback.save_draft(run_id, draft)
        try:
            return self._execute("save_draft", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.save_draft(run_id, draft)
            raise

    def get_draft(self, draft_id: str) -> dict[str, Any] | None:
        def _call():
            res = (
                self.client.table("drafts")
                .select("*")
                .or_(f"draft_id.eq.{draft_id},run_id.eq.{draft_id}")
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                return dict(res.data[0])
            return None

        if self._local_fallback:
            return self._local_fallback.get_draft(draft_id)
        try:
            return self._execute("get_draft", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.get_draft(draft_id)
            raise

    # -------------------------------------------------------------------------
    # Trust Reports & Flags
    # -------------------------------------------------------------------------
    def save_trust_report(self, run_id: str, report: dict[str, Any] | TrustReport) -> str:
        rep_dict = report.model_dump() if hasattr(report, "model_dump") else report
        report_id = f"tr_{uuid.uuid4().hex[:8]}"

        def _call():
            tr_row = {
                "report_id": report_id,
                "run_id": run_id,
                "overall_score": rep_dict.get("overall_score", 100),
                "verdict": rep_dict.get("verdict", "PASS"),
                "category_scores": rep_dict.get("category_scores", {}),
                "claim_verdicts": rep_dict.get("claim_verdicts", []),
            }
            self.client.table("trust_reports").insert(tr_row).execute()

            for flag in rep_dict.get("flags", []):
                f_dict = flag.model_dump() if hasattr(flag, "model_dump") else flag
                f_row = {
                    "flag_id": f_dict.get("id") or f"flag_{uuid.uuid4().hex[:8]}",
                    "report_id": report_id,
                    "run_id": run_id,
                    "category": f_dict.get("category", "unsupported_claim"),
                    "sentence_text": f_dict.get("sentence_text", ""),
                    "start_pos": f_dict.get("start", 0),
                    "end_pos": f_dict.get("end", 0),
                    "reason": f_dict.get("reason", ""),
                    "severity": f_dict.get("severity", "medium"),
                    "status": f_dict.get("status", "open"),
                }
                self.client.table("flags").insert(f_row).execute()
            return report_id

        if self._local_fallback:
            return self._local_fallback.save_trust_report(run_id, report)
        try:
            return self._execute("save_trust_report", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.save_trust_report(run_id, report)
            raise

    def update_flag_status(self, flag_id: str, status: str) -> bool:
        def _call():
            self.client.table("flags").update({"status": status}).eq("flag_id", flag_id).execute()
            # Fetch report and recalculate
            f_res = self.client.table("flags").select("report_id").eq("flag_id", flag_id).execute()
            if f_res.data and len(f_res.data) > 0:
                report_id = f_res.data[0]["report_id"]
                all_flags_res = self.client.table("flags").select("*").eq("report_id", report_id).execute()
                flags_list = [
                    Flag(
                        id=f["flag_id"],
                        category=f["category"],
                        sentence_text=f["sentence_text"],
                        start=f["start_pos"],
                        end=f["end_pos"],
                        reason=f["reason"],
                        severity=f["severity"],
                        status=f["status"],
                    )
                    for f in all_flags_res.data
                ]
                tr = TrustReport(flags=flags_list)
                tr.recompute_score()
                self.client.table("trust_reports").update(
                    {
                        "overall_score": tr.overall_score,
                        "verdict": tr.verdict,
                        "category_scores": tr.category_scores,
                    }
                ).eq("report_id", report_id).execute()
            return True

        if self._local_fallback:
            return self._local_fallback.update_flag_status(flag_id, status)
        try:
            return self._execute("update_flag_status", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.update_flag_status(flag_id, status)
            raise

    # -------------------------------------------------------------------------
    # Approvals
    # -------------------------------------------------------------------------
    def save_approval(self, run_id: str, decision: dict[str, Any] | ApprovalDecision) -> str:
        d_dict = decision.model_dump() if hasattr(decision, "model_dump") else decision
        approval_id = f"appr_{uuid.uuid4().hex[:8]}"

        def _call():
            row = {
                "approval_id": approval_id,
                "run_id": run_id,
                "decision": d_dict.get("decision", "approve"),
                "edited_body": d_dict.get("edited_body"),
                "reviewer": d_dict.get("reviewer", "human"),
                "timestamp": d_dict.get("timestamp") or datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "notes": d_dict.get("notes", ""),
            }
            self.client.table("approvals").insert(row).execute()
            return approval_id

        if self._local_fallback:
            return self._local_fallback.save_approval(run_id, decision)
        try:
            return self._execute("save_approval", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.save_approval(run_id, decision)
            raise

    # -------------------------------------------------------------------------
    # Outcomes & Insights
    # -------------------------------------------------------------------------
    def save_outcome(self, outcome: dict[str, Any] | Outcome, business_id: str | None = None) -> str:
        o_dict = outcome.model_dump() if hasattr(outcome, "model_dump") else outcome
        outcome_id = f"out_{uuid.uuid4().hex[:8]}"

        def _call():
            row = {
                "outcome_id": outcome_id,
                "business_id": business_id,
                "lead_id": o_dict.get("lead_id", ""),
                "draft_id": o_dict.get("draft_id", ""),
                "replied": bool(o_dict.get("replied")),
                "meeting_booked": bool(o_dict.get("meeting_booked")),
                "unsubscribed": bool(o_dict.get("unsubscribed")),
                "complaint": bool(o_dict.get("complaint")),
                "notes": o_dict.get("notes", ""),
            }
            self.client.table("outcomes").insert(row).execute()
            return outcome_id

        if self._local_fallback:
            return self._local_fallback.save_outcome(outcome, business_id)
        try:
            return self._execute("save_outcome", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.save_outcome(outcome, business_id)
            raise

    def get_outcomes(self, business_id: str) -> list[dict[str, Any]]:
        def _call():
            res = self.client.table("outcomes").select("*").eq("business_id", business_id).execute()
            return [dict(r) for r in res.data]

        if self._local_fallback:
            return self._local_fallback.get_outcomes(business_id)
        try:
            return self._execute("get_outcomes", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.get_outcomes(business_id)
            raise

    def save_insight(self, insight: dict[str, Any] | LearningInsight, business_id: str | None = None) -> str:
        i_dict = insight.model_dump() if hasattr(insight, "model_dump") else insight
        insight_id = f"ins_{uuid.uuid4().hex[:8]}"

        def _call():
            row = {
                "insight_id": insight_id,
                "business_id": business_id,
                "pattern": i_dict.get("pattern", ""),
                "evidence_count": i_dict.get("evidence_count", 0),
                "confidence": i_dict.get("confidence", 0.0),
                "recommendation": i_dict.get("recommendation", ""),
            }
            self.client.table("insights").insert(row).execute()
            return insight_id

        if self._local_fallback:
            return self._local_fallback.save_insight(insight, business_id)
        try:
            return self._execute("save_insight", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.save_insight(insight, business_id)
            raise

    def get_insights(self, business_id: str) -> list[dict[str, Any]]:
        def _call():
            res = (
                self.client.table("insights")
                .select("*")
                .eq("business_id", business_id)
                .order("created_at", desc=True)
                .execute()
            )
            return [dict(r) for r in res.data]

        if self._local_fallback:
            return self._local_fallback.get_insights(business_id)
        try:
            return self._execute("get_insights", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.get_insights(business_id)
            raise

    # -------------------------------------------------------------------------
    # Trace Auditing
    # -------------------------------------------------------------------------
    def append_trace(self, run_id: str, event: dict[str, Any] | TraceEvent) -> None:
        e_dict = event.model_dump() if hasattr(event, "model_dump") else event

        def _call():
            row = {
                "run_id": run_id,
                "agent": e_dict.get("agent", "unknown"),
                "step": e_dict.get("step", "action"),
                "input_summary": e_dict.get("input_summary", ""),
                "output_summary": e_dict.get("output_summary", ""),
                "reason": e_dict.get("reason", ""),
                "timestamp": e_dict.get("timestamp") or datetime.datetime.now(datetime.timezone.utc).isoformat(),
            }
            self.client.table("trace_events").insert(row).execute()

        if self._local_fallback:
            self._local_fallback.append_trace(run_id, event)
            return
        try:
            self._execute("append_trace", _call)
        except Exception:
            if self._local_fallback:
                self._local_fallback.append_trace(run_id, event)
            else:
                raise

    def get_trace(self, run_id: str) -> list[TraceEvent]:
        def _call():
            res = (
                self.client.table("trace_events")
                .select("*")
                .eq("run_id", run_id)
                .order("id", desc=False)
                .execute()
            )
            return [
                TraceEvent(
                    agent=r["agent"],
                    step=r["step"],
                    input_summary=r["input_summary"] or "",
                    output_summary=r["output_summary"] or "",
                    reason=r["reason"] or "",
                    timestamp=str(r["timestamp"]),
                )
                for r in res.data
            ]

        if self._local_fallback:
            return self._local_fallback.get_trace(run_id)
        try:
            return self._execute("get_trace", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.get_trace(run_id)
            raise

    # -------------------------------------------------------------------------
    # Runs
    # -------------------------------------------------------------------------
    def create_run(self, business_id: str, lead_id: str | None = None) -> str:
        run_id = f"run_{uuid.uuid4().hex[:12]}"

        def _call():
            row = {
                "run_id": run_id,
                "business_id": business_id,
                "lead_id": lead_id,
                "status": "running",
                "state_summary": {},
            }
            self.client.table("runs").insert(row).execute()
            return run_id

        if self._local_fallback:
            return self._local_fallback.create_run(business_id, lead_id)
        try:
            return self._execute("create_run", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.create_run(business_id, lead_id)
            raise

    def update_run(self, run_id: str, status: str, state_summary: dict[str, Any] | None = None) -> bool:
        def _call():
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            update_data: dict[str, Any] = {"status": status, "updated_at": now}
            if state_summary is not None:
                update_data["state_summary"] = state_summary
            self.client.table("runs").update(update_data).eq("run_id", run_id).execute()
            return True

        if self._local_fallback:
            return self._local_fallback.update_run(run_id, status, state_summary)
        try:
            return self._execute("update_run", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.update_run(run_id, status, state_summary)
            raise

    def get_run(self, run_id: str) -> dict[str, Any] | None:
        def _call():
            res = self.client.table("runs").select("*").eq("run_id", run_id).execute()
            if res.data and len(res.data) > 0:
                return dict(res.data[0])
            return None

        if self._local_fallback:
            return self._local_fallback.get_run(run_id)
        try:
            return self._execute("get_run", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.get_run(run_id)
            raise

    def list_runs(self, business_id: str | None = None, limit: int = 20) -> list[dict[str, Any]]:
        if self._local_fallback:
            return self._local_fallback.list_runs(business_id=business_id, limit=limit)
        try:
            query = self.client.table("runs").select("*").order("created_at", desc=True).limit(limit)
            if business_id:
                query = query.eq("business_id", business_id)
            res = query.execute()
            return res.data or []
        except Exception:
            if self._local_fallback:
                return self._local_fallback.list_runs(business_id=business_id, limit=limit)
            return []

    # -------------------------------------------------------------------------
    # Stage 2: Onboarding Sessions
    # -------------------------------------------------------------------------
    def save_onboarding_session(self, session: Any) -> Any:
        def _call():
            if isinstance(session, OnboardingSession):
                session_dict = session.model_dump()
            else:
                session_dict = dict(session)
            session_id = session_dict.get("session_id") or session_dict.get("id")
            payload = {
                "id": session_id,
                "business_id": session_dict.get("business_id"),
                "answers": session_dict,
                "data": session_dict,
                "status": session_dict.get("status", "active"),
                "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            }
            self.client.table("onboarding_sessions").upsert(payload).execute()
            return session

        if self._local_fallback:
            return self._local_fallback.save_onboarding_session(session)
        try:
            return self._execute("save_onboarding_session", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.save_onboarding_session(session)
            raise

    def get_onboarding_session(self, session_id: str) -> Any | None:
        def _call():
            res = self.client.table("onboarding_sessions").select("*").eq("id", session_id).execute()
            if res.data and len(res.data) > 0:
                data = res.data[0].get("data") or res.data[0].get("answers") or {}
                return OnboardingSession.model_validate(data)
            return None

        if self._local_fallback:
            return self._local_fallback.get_onboarding_session(session_id)
        try:
            return self._execute("get_onboarding_session", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.get_onboarding_session(session_id)
            raise

    def list_onboarding_sessions(self) -> list[Any]:
        def _call():
            res = self.client.table("onboarding_sessions").select("*").order("updated_at", desc=True).execute()
            sessions = []
            for item in (res.data or []):
                data = item.get("data") or item.get("answers") or {}
                try:
                    sessions.append(OnboardingSession.model_validate(data))
                except Exception:
                    pass
            return sessions

        if self._local_fallback:
            return self._local_fallback.list_onboarding_sessions()
        try:
            return self._execute("list_onboarding_sessions", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.list_onboarding_sessions()
            raise

    # -------------------------------------------------------------------------
    # Stage 3: Atlas Tasks, Events, Versions, and Reports
    # -------------------------------------------------------------------------
    def save_task(self, task: Any) -> Any:
        task_obj = task if isinstance(task, Task) else Task.model_validate(task)
        task_dict = task_obj.model_dump()
        payload = {
            "id": task_obj.id,
            "business_id": getattr(task_obj, "business_id", None),
            "title": task_obj.title,
            "objective": task_obj.objective,
            "rationale": getattr(task_obj, "rationale", ""),
            "assigned_agent": task_obj.assigned_agent,
            "phase": task_obj.phase,
            "status": task_obj.status,
            "priority_score": task_obj.priority_score,
            "version": task_obj.version,
            "dependencies": task_obj.dependencies,
            "expected_deliverables": task_obj.expected_deliverables,
            "acceptance_criteria": task_obj.acceptance_criteria,
            "evidence_requirements": task_obj.evidence_requirements,
            "approval_policy": task_obj.approval_policy,
            "missing_information": [
                m.model_dump() if hasattr(m, "model_dump") else m for m in task_obj.missing_information
            ],
            "currently_doing": getattr(task_obj, "currently_doing", ""),
            "estimated_quota_cost": getattr(task_obj, "estimated_quota_cost", {}),
            "prior_status": getattr(task_obj, "prior_status", None),
            "data": task_dict,
            "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }

        def _call():
            self.client.table("tasks").upsert(payload).execute()
            return task_obj

        if self._local_fallback:
            return self._local_fallback.save_task(task_obj)
        try:
            return self._execute("save_task", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.save_task(task_obj)
            raise

    def get_task(self, task_id: str) -> Any | None:
        def _call():
            res = self.client.table("tasks").select("*").eq("id", task_id).execute()
            if res.data and len(res.data) > 0:
                item = res.data[0]
                merged = dict(item)
                if isinstance(item.get("data"), dict):
                    merged.update(item["data"])
                for k in ["id", "title", "objective", "rationale", "assigned_agent", "phase", "status", "priority_score", "version", "dependencies", "approval_policy", "business_id"]:
                    if k in item and item[k] is not None:
                        merged[k] = item[k]
                try:
                    return Task.model_validate(merged)
                except Exception as exc:
                    logger.warning(f"Failed to validate task {task_id}: {exc}")
                    if "rationale" not in merged or not merged["rationale"]:
                        merged["rationale"] = item.get("rationale") or item.get("objective") or "Milestone task"
                    try:
                        return Task.model_validate(merged)
                    except Exception:
                        return Task.model_construct(**merged)
            return None

        if self._local_fallback:
            return self._local_fallback.get_task(task_id)
        try:
            return self._execute("get_task", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.get_task(task_id)
            raise

    def list_tasks(
        self,
        business_id: str | None = None,
        phase: str | None = None,
        status: str | None = None,
    ) -> list[Any]:
        def _call():
            query = self.client.table("tasks").select("*")
            if business_id:
                query = query.eq("business_id", business_id)
            if phase:
                query = query.eq("phase", phase)
            if status:
                query = query.eq("status", status)
            query = query.order("priority_score", desc=True).order("created_at", desc=False)
            res = query.execute()
            results = []
            for item in (res.data or []):
                merged = dict(item)
                if isinstance(item.get("data"), dict):
                    merged.update(item["data"])
                for k in ["id", "title", "objective", "rationale", "assigned_agent", "phase", "status", "priority_score", "version", "dependencies", "approval_policy", "business_id"]:
                    if k in item and item[k] is not None:
                        merged[k] = item[k]
                try:
                    results.append(Task.model_validate(merged))
                except Exception:
                    if "rationale" not in merged or not merged["rationale"]:
                        merged["rationale"] = item.get("rationale") or item.get("objective") or "Milestone task"
                    try:
                        results.append(Task.model_validate(merged))
                    except Exception:
                        results.append(Task.model_construct(**merged))
            return results

        if self._local_fallback:
            return self._local_fallback.list_tasks(business_id=business_id, phase=phase, status=status)
        try:
            return self._execute("list_tasks", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.list_tasks(business_id=business_id, phase=phase, status=status)
            raise

    def delete_task(self, task_id: str) -> bool:
        def _call():
            self.client.table("tasks").delete().eq("id", task_id).execute()
            return True

        if self._local_fallback:
            return self._local_fallback.delete_task(task_id)
        try:
            return self._execute("delete_task", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.delete_task(task_id)
            raise

    def save_task_event(self, event: Any) -> Any:
        event_obj = event if isinstance(event, TaskEvent) else TaskEvent.model_validate(event)
        payload = {
            "id": event_obj.id,
            "task_id": event_obj.task_id,
            "event_type": event_obj.event_type,
            "from_status": event_obj.from_status,
            "to_status": event_obj.to_status,
            "details": event_obj.details or {},
            "timestamp": event_obj.timestamp,
        }

        def _call():
            self.client.table("task_events").upsert(payload).execute()
            return event_obj

        if self._local_fallback:
            return self._local_fallback.save_task_event(event_obj)
        try:
            return self._execute("save_task_event", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.save_task_event(event_obj)
            raise

    def get_task_events(self, task_id: str) -> list[Any]:
        def _call():
            res = (
                self.client.table("task_events")
                .select("*")
                .eq("task_id", task_id)
                .order("timestamp", desc=False)
                .execute()
            )
            events = []
            for row in (res.data or []):
                details = row.get("details") or {}
                events.append(
                    TaskEvent(
                        id=row["id"],
                        task_id=row["task_id"],
                        event_type=row["event_type"],
                        from_status=row.get("from_status"),
                        to_status=row.get("to_status"),
                        details=details,
                        timestamp=row["timestamp"],
                    )
                )
            return events

        if self._local_fallback:
            return self._local_fallback.get_task_events(task_id)
        try:
            return self._execute("get_task_events", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.get_task_events(task_id)
            raise

    def save_task_version(self, version: Any) -> Any:
        ver_obj = version if isinstance(version, TaskVersion) else TaskVersion.model_validate(version)
        payload = {
            "id": ver_obj.id,
            "task_id": ver_obj.task_id,
            "version": ver_obj.version,
            "snapshot": ver_obj.snapshot or {},
            "created_at": ver_obj.created_at,
        }

        def _call():
            self.client.table("task_versions").upsert(payload).execute()
            return ver_obj

        if self._local_fallback:
            return self._local_fallback.save_task_version(ver_obj)
        try:
            return self._execute("save_task_version", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.save_task_version(ver_obj)
            raise

    def get_task_versions(self, task_id: str) -> list[Any]:
        def _call():
            res = (
                self.client.table("task_versions")
                .select("*")
                .eq("task_id", task_id)
                .order("version", desc=False)
                .execute()
            )
            versions = []
            for row in (res.data or []):
                snapshot = row.get("snapshot") or {}
                versions.append(
                    TaskVersion(
                        id=row["id"],
                        task_id=row["task_id"],
                        version=row["version"],
                        snapshot=snapshot,
                        created_at=row["created_at"],
                    )
                )
            return versions

        if self._local_fallback:
            return self._local_fallback.get_task_versions(task_id)
        try:
            return self._execute("get_task_versions", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.get_task_versions(task_id)
            raise

    def save_agent_report(self, report: Any) -> Any:
        rep_obj = report if isinstance(report, AgentReport) else AgentReport.model_validate(report)
        payload = {
            "task_id": rep_obj.task_id,
            "status": rep_obj.status,
            "summary": getattr(rep_obj, "summary", ""),
            "data": rep_obj.model_dump(),
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }

        def _call():
            self.client.table("agent_reports").upsert(payload).execute()
            return rep_obj

        if self._local_fallback:
            return self._local_fallback.save_agent_report(rep_obj)
        try:
            return self._execute("save_agent_report", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.save_agent_report(rep_obj)
            raise

    def get_agent_report(self, task_id: str) -> Any | None:
        def _call():
            res = self.client.table("agent_reports").select("*").eq("task_id", task_id).execute()
            if res.data and len(res.data) > 0:
                data = res.data[0].get("data") or res.data[0]
                try:
                    return AgentReport.model_validate(data)
                except Exception:
                    return data
            return None

        if self._local_fallback:
            return self._local_fallback.get_agent_report(task_id)
        try:
            return self._execute("get_agent_report", _call)
        except Exception:
            if self._local_fallback:
                return self._local_fallback.get_agent_report(task_id)
            raise

