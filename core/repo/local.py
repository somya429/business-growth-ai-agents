"""Local file- and SQLite-backed implementation of the Repository interface."""

from __future__ import annotations

import datetime
import json
import os
from pathlib import Path
import sqlite3
from typing import Any
import uuid

from core.repo.base import Repository
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

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
RUNTIME_DIR = Path(__file__).resolve().parent.parent.parent / "runtime"


class LocalRepository(Repository):
    """Zero-setup local repository using existing /data folders and SQLite in /runtime."""

    def __init__(self, data_dir: Path | str | None = None, db_path: Path | str | None = None):
        if data_dir is not None:
            self.data_dir = Path(data_dir)
        elif os.environ.get("VERITY_DATA_DIR"):
            self.data_dir = Path(os.environ["VERITY_DATA_DIR"])
        else:
            self.data_dir = DATA_DIR
        if db_path is None:
            RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
            self.db_path = str(RUNTIME_DIR / "repo.sqlite")
        else:
            self.db_path = str(db_path)
            if self.db_path != ":memory:":
                Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)

        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS runs (
                    run_id TEXT PRIMARY KEY,
                    business_id TEXT NOT NULL,
                    lead_id TEXT,
                    status TEXT NOT NULL,
                    state_summary TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS lead_updates (
                    lead_id TEXT PRIMARY KEY,
                    status TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS opt_outs (
                    business_id TEXT NOT NULL,
                    email TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    PRIMARY KEY (business_id, email)
                );

                CREATE TABLE IF NOT EXISTS drafts (
                    draft_id TEXT PRIMARY KEY,
                    run_id TEXT NOT NULL,
                    lead_id TEXT NOT NULL,
                    channel TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    body TEXT NOT NULL,
                    claims_used TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS trust_reports (
                    report_id TEXT PRIMARY KEY,
                    run_id TEXT NOT NULL,
                    overall_score INTEGER NOT NULL,
                    verdict TEXT NOT NULL,
                    category_scores TEXT NOT NULL,
                    claim_verdicts TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS flags (
                    flag_id TEXT PRIMARY KEY,
                    report_id TEXT NOT NULL,
                    run_id TEXT NOT NULL,
                    category TEXT NOT NULL,
                    sentence_text TEXT NOT NULL,
                    start_pos INTEGER NOT NULL,
                    end_pos INTEGER NOT NULL,
                    reason TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS approvals (
                    approval_id TEXT PRIMARY KEY,
                    run_id TEXT NOT NULL,
                    decision TEXT NOT NULL,
                    edited_body TEXT,
                    reviewer TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    notes TEXT
                );

                CREATE TABLE IF NOT EXISTS outcomes (
                    outcome_id TEXT PRIMARY KEY,
                    business_id TEXT,
                    lead_id TEXT NOT NULL,
                    draft_id TEXT,
                    replied INTEGER NOT NULL,
                    meeting_booked INTEGER NOT NULL,
                    unsubscribed INTEGER NOT NULL,
                    complaint INTEGER NOT NULL,
                    notes TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS insights (
                    insight_id TEXT PRIMARY KEY,
                    business_id TEXT,
                    pattern TEXT NOT NULL,
                    evidence_count INTEGER NOT NULL,
                    confidence REAL NOT NULL,
                    recommendation TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS traces (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT NOT NULL,
                    agent TEXT NOT NULL,
                    step TEXT NOT NULL,
                    input_summary TEXT,
                    output_summary TEXT,
                    reason TEXT,
                    timestamp TEXT NOT NULL,
                    prompt_version TEXT
                );

                CREATE TABLE IF NOT EXISTS onboarding_sessions (
                    session_id TEXT PRIMARY KEY,
                    business_id TEXT,
                    data TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS tasks (
                    task_id TEXT PRIMARY KEY,
                    business_id TEXT,
                    phase TEXT NOT NULL,
                    status TEXT NOT NULL,
                    priority_score REAL NOT NULL,
                    version INTEGER NOT NULL,
                    data TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS task_events (
                    id TEXT PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    from_status TEXT,
                    to_status TEXT,
                    details TEXT,
                    timestamp TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS task_versions (
                    id TEXT PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    version INTEGER NOT NULL,
                    snapshot TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS agent_reports (
                    task_id TEXT PRIMARY KEY,
                    status TEXT NOT NULL,
                    data TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                """
            )
            try:
                conn.execute("ALTER TABLE traces ADD COLUMN prompt_version TEXT")
            except Exception:
                pass

    # -------------------------------------------------------------------------
    # Businesses
    # -------------------------------------------------------------------------
    def get_business(self, business_id: str) -> dict[str, Any] | None:
        biz_dir = self.data_dir / business_id
        profile_path = biz_dir / "profile.json"
        if not profile_path.exists():
            return None

        profile = json.loads(profile_path.read_text(encoding="utf-8"))
        # Overlay any runtime opt-outs
        with self._get_connection() as conn:
            rows = conn.execute(
                "SELECT email FROM opt_outs WHERE business_id = ?", (business_id,)
            ).fetchall()
            opt_outs = profile.setdefault("anti_spam", {}).setdefault("opt_out_list", [])
            for r in rows:
                if r["email"].lower() not in [o.lower() for o in opt_outs]:
                    opt_outs.append(r["email"])

        profile["id"] = business_id
        return profile

    def list_businesses(self) -> list[dict[str, Any]]:
        results = []
        if self.data_dir.exists():
            for child in sorted(self.data_dir.iterdir()):
                if child.is_dir() and (child / "profile.json").exists():
                    biz = self.get_business(child.name)
                    if biz:
                        results.append(biz)
        return results
 
    def save_business(self, profile: dict[str, Any]) -> dict[str, Any]:
        biz_id = profile.get("id") or f"biz_{uuid.uuid4().hex[:8]}"
        profile["id"] = biz_id
        biz_dir = self.data_dir / biz_id
        biz_dir.mkdir(parents=True, exist_ok=True)
        profile_path = biz_dir / "profile.json"
        profile_path.write_text(json.dumps(profile, indent=2), encoding="utf-8")
        return profile

    # -------------------------------------------------------------------------
    # Knowledge Base
    # -------------------------------------------------------------------------
    def get_kb_docs(self, business_id: str) -> list[dict[str, Any]]:
        biz_dir = self.data_dir / business_id
        kb_dir = biz_dir / "kb"
        docs = []
        if kb_dir.exists():
            for doc_file in sorted(kb_dir.glob("*.md")):
                doc_id = f"kb_{doc_file.stem}"
                title = doc_file.stem.replace("_", " ").title()
                text = doc_file.read_text(encoding="utf-8")
                docs.append(KnowledgeBaseDoc(id=doc_id, title=title, text=text).model_dump())
        return docs

    def search_kb(
        self,
        business_id: str,
        query_embedding: list[float] | None = None,
        query: str | None = None,
        k: int = 5,
    ) -> list[dict[str, Any]]:
        all_docs = self.get_kb_docs(business_id)
        if not query and not query_embedding:
            return all_docs[:k]

        q_lower = (query or "").lower()
        scored = []
        for doc in all_docs:
            score = 0
            text_lower = doc["text"].lower()
            title_lower = doc["title"].lower()
            for token in q_lower.split():
                if token in title_lower:
                    score += 5
                if token in text_lower:
                    score += 1
            scored.append((score, doc))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [doc for _, doc in scored[:k]]

    # -------------------------------------------------------------------------
    # Leads
    # -------------------------------------------------------------------------
    def get_leads(self, business_id: str) -> list[dict[str, Any]]:
        leads_path = self.data_dir / business_id / "leads.json"
        if not leads_path.exists():
            return []

        leads = json.loads(leads_path.read_text(encoding="utf-8"))
        # Overlay runtime status updates
        with self._get_connection() as conn:
            status_map = {
                r["lead_id"]: r["status"]
                for r in conn.execute("SELECT lead_id, status FROM lead_updates").fetchall()
            }

        for lead in leads:
            lid = lead.get("id")
            if lid in status_map:
                lead["status"] = status_map[lid]

        return leads

    def get_lead(self, lead_id: str) -> dict[str, Any] | None:
        for biz in self.list_businesses():
            leads = self.get_leads(biz["id"])
            for l in leads:
                if l.get("id") == lead_id:
                    return l
        return None

    def update_lead_status(self, lead_id: str, status: str) -> bool:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO lead_updates (lead_id, status, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(lead_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
                """,
                (lead_id, status, now),
            )
        return True

    def add_to_opt_out(self, business_id: str, email: str) -> bool:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        clean_email = email.strip().lower()
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR IGNORE INTO opt_outs (business_id, email, created_at)
                VALUES (?, ?, ?)
                """,
                (business_id, clean_email, now),
            )
        return True

    # -------------------------------------------------------------------------
    # Campaigns & Drafts
    # -------------------------------------------------------------------------
    def save_draft(self, run_id: str, draft: dict[str, Any] | Draft) -> str:
        d_dict = draft.model_dump() if hasattr(draft, "model_dump") else draft
        draft_id = f"draft_{uuid.uuid4().hex[:8]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO drafts (draft_id, run_id, lead_id, channel, subject, body, claims_used, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    draft_id,
                    run_id,
                    d_dict.get("lead_id", ""),
                    d_dict.get("channel", "email"),
                    d_dict.get("subject", ""),
                    d_dict.get("body", ""),
                    json.dumps(d_dict.get("claims_used", [])),
                    now,
                ),
            )
        return draft_id

    def get_draft(self, draft_id: str) -> dict[str, Any] | None:
        with self._get_connection() as conn:
            # Check draft_id or run_id
            row = conn.execute(
                "SELECT * FROM drafts WHERE draft_id = ? OR run_id = ? ORDER BY created_at DESC LIMIT 1",
                (draft_id, draft_id),
            ).fetchone()
            if not row:
                return None
            return {
                "draft_id": row["draft_id"],
                "run_id": row["run_id"],
                "lead_id": row["lead_id"],
                "channel": row["channel"],
                "subject": row["subject"],
                "body": row["body"],
                "claims_used": json.loads(row["claims_used"]),
                "created_at": row["created_at"],
            }

    # -------------------------------------------------------------------------
    # Trust Reports & Flags
    # -------------------------------------------------------------------------
    def save_trust_report(self, run_id: str, report: dict[str, Any] | TrustReport) -> str:
        rep_dict = report.model_dump() if hasattr(report, "model_dump") else report
        report_id = f"tr_{uuid.uuid4().hex[:8]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO trust_reports (report_id, run_id, overall_score, verdict, category_scores, claim_verdicts, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    report_id,
                    run_id,
                    rep_dict.get("overall_score", 100),
                    rep_dict.get("verdict", "PASS"),
                    json.dumps(rep_dict.get("category_scores", {})),
                    json.dumps(rep_dict.get("claim_verdicts", [])),
                    now,
                ),
            )
            # Save associated flags
            for flag in rep_dict.get("flags", []):
                f_dict = flag.model_dump() if hasattr(flag, "model_dump") else flag
                f_id = f_dict.get("id") or f"flag_{uuid.uuid4().hex[:8]}"
                conn.execute(
                    """
                    INSERT INTO flags (flag_id, report_id, run_id, category, sentence_text, start_pos, end_pos, reason, severity, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(flag_id) DO UPDATE SET status = excluded.status
                    """,
                    (
                        f_id,
                        report_id,
                        run_id,
                        f_dict.get("category", "unsupported_claim"),
                        f_dict.get("sentence_text", ""),
                        f_dict.get("start", 0),
                        f_dict.get("end", 0),
                        f_dict.get("reason", ""),
                        f_dict.get("severity", "medium"),
                        f_dict.get("status", "open"),
                        now,
                    ),
                )
        return report_id

    def update_flag_status(self, flag_id: str, status: str) -> bool:
        with self._get_connection() as conn:
            cur = conn.execute(
                "UPDATE flags SET status = ? WHERE flag_id = ?",
                (status, flag_id),
            )
            if cur.rowcount == 0:
                return False

            # Recalculate parent trust report score
            row = conn.execute("SELECT report_id, run_id FROM flags WHERE flag_id = ?", (flag_id,)).fetchone()
            if row:
                report_id = row["report_id"]
                flags_rows = conn.execute("SELECT * FROM flags WHERE report_id = ?", (report_id,)).fetchall()
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
                    for f in flags_rows
                ]
                tr = TrustReport(flags=flags_list)
                tr.recompute_score()
                conn.execute(
                    """
                    UPDATE trust_reports
                    SET overall_score = ?, verdict = ?, category_scores = ?
                    WHERE report_id = ?
                    """,
                    (tr.overall_score, tr.verdict, json.dumps(tr.category_scores), report_id),
                )
        return True

    # -------------------------------------------------------------------------
    # Approvals
    # -------------------------------------------------------------------------
    def save_approval(self, run_id: str, decision: dict[str, Any] | ApprovalDecision) -> str:
        d_dict = decision.model_dump() if hasattr(decision, "model_dump") else decision
        approval_id = f"appr_{uuid.uuid4().hex[:8]}"
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO approvals (approval_id, run_id, decision, edited_body, reviewer, timestamp, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    approval_id,
                    run_id,
                    d_dict.get("decision", "approve"),
                    d_dict.get("edited_body"),
                    d_dict.get("reviewer", "human"),
                    d_dict.get("timestamp") or datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    d_dict.get("notes", ""),
                ),
            )
        return approval_id

    # -------------------------------------------------------------------------
    # Outcomes & Insights
    # -------------------------------------------------------------------------
    def save_outcome(self, outcome: dict[str, Any] | Outcome, business_id: str | None = None) -> str:
        o_dict = outcome.model_dump() if hasattr(outcome, "model_dump") else outcome
        outcome_id = f"out_{uuid.uuid4().hex[:8]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO outcomes (outcome_id, business_id, lead_id, draft_id, replied, meeting_booked, unsubscribed, complaint, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    outcome_id,
                    business_id,
                    o_dict.get("lead_id", ""),
                    o_dict.get("draft_id", ""),
                    1 if o_dict.get("replied") else 0,
                    1 if o_dict.get("meeting_booked") else 0,
                    1 if o_dict.get("unsubscribed") else 0,
                    1 if o_dict.get("complaint") else 0,
                    o_dict.get("notes", ""),
                    now,
                ),
            )
        return outcome_id

    def get_outcomes(self, business_id: str) -> list[dict[str, Any]]:
        results = []
        # Load from past_campaigns.json
        past_camp_path = self.data_dir / business_id / "past_campaigns.json"
        if past_camp_path.exists():
            try:
                camp_data = json.loads(past_camp_path.read_text(encoding="utf-8"))
                for o in camp_data.get("outcomes", []):
                    results.append(Outcome.model_validate(o).model_dump())
            except Exception:
                pass

        # Load runtime saved outcomes
        with self._get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM outcomes WHERE business_id = ? OR business_id IS NULL", (business_id,)
            ).fetchall()
            for r in rows:
                results.append(
                    {
                        "lead_id": r["lead_id"],
                        "draft_id": r["draft_id"],
                        "replied": bool(r["replied"]),
                        "meeting_booked": bool(r["meeting_booked"]),
                        "unsubscribed": bool(r["unsubscribed"]),
                        "complaint": bool(r["complaint"]),
                        "notes": r["notes"] or "",
                    }
                )
        return results

    def save_insight(self, insight: dict[str, Any] | LearningInsight, business_id: str | None = None) -> str:
        i_dict = insight.model_dump() if hasattr(insight, "model_dump") else insight
        insight_id = f"ins_{uuid.uuid4().hex[:8]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO insights (insight_id, business_id, pattern, evidence_count, confidence, recommendation, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    insight_id,
                    business_id,
                    i_dict.get("pattern", ""),
                    i_dict.get("evidence_count", 0),
                    i_dict.get("confidence", 0.0),
                    i_dict.get("recommendation", ""),
                    now,
                ),
            )
        return insight_id

    def get_insights(self, business_id: str) -> list[dict[str, Any]]:
        with self._get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM insights WHERE business_id = ? OR business_id IS NULL ORDER BY created_at DESC",
                (business_id,),
            ).fetchall()
            return [
                {
                    "pattern": r["pattern"],
                    "evidence_count": r["evidence_count"],
                    "confidence": r["confidence"],
                    "recommendation": r["recommendation"],
                }
                for r in rows
            ]

    # -------------------------------------------------------------------------
    # Trace Auditing
    # -------------------------------------------------------------------------
    def append_trace(self, run_id: str, event: dict[str, Any] | TraceEvent) -> None:
        e_dict = event.model_dump() if hasattr(event, "model_dump") else event
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO traces (run_id, agent, step, input_summary, output_summary, reason, timestamp, prompt_version)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    e_dict.get("agent", "unknown"),
                    e_dict.get("step", "action"),
                    e_dict.get("input_summary", ""),
                    e_dict.get("output_summary", ""),
                    e_dict.get("reason", ""),
                    e_dict.get("timestamp") or datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    e_dict.get("prompt_version"),
                ),
            )

    def get_trace(self, run_id: str) -> list[TraceEvent]:
        with self._get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM traces WHERE run_id = ? ORDER BY id ASC", (run_id,)
            ).fetchall()
            return [
                TraceEvent(
                    agent=r["agent"],
                    step=r["step"],
                    input_summary=r["input_summary"] or "",
                    output_summary=r["output_summary"] or "",
                    reason=r["reason"] or "",
                    timestamp=r["timestamp"],
                    prompt_version=r["prompt_version"] if "prompt_version" in r.keys() else None,
                )
                for r in rows
            ]

    # -------------------------------------------------------------------------
    # Runs
    # -------------------------------------------------------------------------
    def create_run(self, business_id: str, lead_id: str | None = None) -> str:
        run_id = f"run_{uuid.uuid4().hex[:12]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO runs (run_id, business_id, lead_id, status, state_summary, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (run_id, business_id, lead_id, "running", json.dumps({}), now, now),
            )
        return run_id

    def update_run(self, run_id: str, status: str, state_summary: dict[str, Any] | None = None) -> bool:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        with self._get_connection() as conn:
            if state_summary is not None:
                conn.execute(
                    """
                    UPDATE runs
                    SET status = ?, state_summary = ?, updated_at = ?
                    WHERE run_id = ?
                    """,
                    (status, json.dumps(state_summary), now, run_id),
                )
            else:
                conn.execute(
                    """
                    UPDATE runs
                    SET status = ?, updated_at = ?
                    WHERE run_id = ?
                    """,
                    (status, now, run_id),
                )
        return True

    def get_run(self, run_id: str) -> dict[str, Any] | None:
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM runs WHERE run_id = ?", (run_id,)).fetchone()
            if not row:
                return None
            return {
                "run_id": row["run_id"],
                "business_id": row["business_id"],
                "lead_id": row["lead_id"],
                "status": row["status"],
                "state_summary": json.loads(row["state_summary"] or "{}"),
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }

    def list_runs(self, business_id: str | None = None, limit: int = 20) -> list[dict[str, Any]]:
        with self._get_connection() as conn:
            if business_id:
                rows = conn.execute(
                    "SELECT * FROM runs WHERE business_id = ? ORDER BY created_at DESC LIMIT ?",
                    (business_id, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM runs ORDER BY created_at DESC LIMIT ?",
                    (limit,),
                ).fetchall()
            return [
                {
                    "run_id": r["run_id"],
                    "business_id": r["business_id"],
                    "lead_id": r["lead_id"],
                    "status": r["status"],
                    "state_summary": json.loads(r["state_summary"] or "{}"),
                    "created_at": r["created_at"],
                    "updated_at": r["updated_at"],
                }
                for r in rows
            ]

    # -------------------------------------------------------------------------
    # Stage 2: Onboarding Sessions
    # -------------------------------------------------------------------------
    def save_onboarding_session(self, session: Any) -> Any:
        from shared.schemas import OnboardingSession

        if isinstance(session, OnboardingSession):
            session_dict = session.model_dump()
        elif isinstance(session, dict):
            session_dict = session
        else:
            session_dict = dict(session)

        session_id = session_dict["session_id"]
        business_id = session_dict.get("business_id")
        created_at = session_dict.get("created_at") or datetime.datetime.now(datetime.timezone.utc).isoformat()
        updated_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
        session_dict["updated_at"] = updated_at

        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO onboarding_sessions (session_id, business_id, data, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    business_id = excluded.business_id,
                    data = excluded.data,
                    updated_at = excluded.updated_at
                """,
                (session_id, business_id, json.dumps(session_dict), created_at, updated_at),
            )

        if isinstance(session, OnboardingSession):
            return OnboardingSession.model_validate(session_dict)
        return session_dict

    def get_onboarding_session(self, session_id: str) -> Any | None:
        from shared.schemas import OnboardingSession

        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM onboarding_sessions WHERE session_id = ?",
                (session_id,),
            ).fetchone()
            if not row:
                return None
            data = json.loads(row["data"])
            try:
                return OnboardingSession.model_validate(data)
            except Exception:
                return data

    def list_onboarding_sessions(self) -> list[Any]:
        from shared.schemas import OnboardingSession

        with self._get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM onboarding_sessions ORDER BY updated_at DESC"
            ).fetchall()
            results = []
            for row in rows:
                data = json.loads(row["data"])
                try:
                    results.append(OnboardingSession.model_validate(data))
                except Exception:
                    results.append(data)
            return results

    # -------------------------------------------------------------------------
    # Stage 3: Atlas Tasks, Events, Versions, and Reports
    # -------------------------------------------------------------------------
    def save_task(self, task: Any) -> Any:
        task_obj = task if isinstance(task, Task) else Task.model_validate(task)
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if not task_obj.updated_at:
            task_obj.updated_at = now
        payload = json.dumps(task_obj.model_dump())

        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO tasks (task_id, business_id, phase, status, priority_score, version, data, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(task_id) DO UPDATE SET
                    phase=excluded.phase,
                    status=excluded.status,
                    priority_score=excluded.priority_score,
                    version=excluded.version,
                    data=excluded.data,
                    updated_at=excluded.updated_at
                """,
                (
                    task_obj.id,
                    getattr(task_obj, "business_id", None),
                    task_obj.phase,
                    task_obj.status,
                    task_obj.priority_score,
                    task_obj.version,
                    payload,
                    task_obj.created_at,
                    task_obj.updated_at,
                ),
            )
            conn.commit()
        return task_obj

    def get_task(self, task_id: str) -> Any | None:
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT data FROM tasks WHERE task_id = ?", (task_id,)
            ).fetchone()
            if not row:
                return None
            data = json.loads(row["data"])
            try:
                return Task.model_validate(data)
            except Exception:
                return data

    def list_tasks(
        self,
        business_id: str | None = None,
        phase: str | None = None,
        status: str | None = None,
    ) -> list[Any]:
        query = "SELECT data FROM tasks WHERE 1=1"
        params: list[Any] = []
        if business_id:
            query += " AND business_id = ?"
            params.append(business_id)
        if phase:
            query += " AND phase = ?"
            params.append(phase)
        if status:
            query += " AND status = ?"
            params.append(status)
        query += " ORDER BY priority_score DESC, created_at ASC"

        with self._get_connection() as conn:
            rows = conn.execute(query, params).fetchall()
            results = []
            for row in rows:
                data = json.loads(row["data"])
                try:
                    results.append(Task.model_validate(data))
                except Exception:
                    results.append(data)
            return results

    def delete_task(self, task_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.execute("DELETE FROM tasks WHERE task_id = ?", (task_id,))
            conn.commit()
            return cursor.rowcount > 0

    def save_task_event(self, event: Any) -> Any:
        event_obj = event if isinstance(event, TaskEvent) else TaskEvent.model_validate(event)
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO task_events (id, task_id, event_type, from_status, to_status, details, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event_obj.id,
                    event_obj.task_id,
                    event_obj.event_type,
                    event_obj.from_status,
                    event_obj.to_status,
                    json.dumps(event_obj.details),
                    event_obj.timestamp,
                ),
            )
            conn.commit()
        return event_obj

    def get_task_events(self, task_id: str) -> list[Any]:
        with self._get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM task_events WHERE task_id = ? ORDER BY timestamp ASC",
                (task_id,),
            ).fetchall()
            events = []
            for row in rows:
                details = json.loads(row["details"]) if row["details"] else {}
                events.append(
                    TaskEvent(
                        id=row["id"],
                        task_id=row["task_id"],
                        event_type=row["event_type"],
                        from_status=row["from_status"],
                        to_status=row["to_status"],
                        details=details,
                        timestamp=row["timestamp"],
                    )
                )
            return events

    def save_task_version(self, version: Any) -> Any:
        ver_obj = version if isinstance(version, TaskVersion) else TaskVersion.model_validate(version)
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO task_versions (id, task_id, version, snapshot, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    ver_obj.id,
                    ver_obj.task_id,
                    ver_obj.version,
                    json.dumps(ver_obj.snapshot),
                    ver_obj.created_at,
                ),
            )
            conn.commit()
        return ver_obj

    def get_task_versions(self, task_id: str) -> list[Any]:
        with self._get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM task_versions WHERE task_id = ? ORDER BY version ASC",
                (task_id,),
            ).fetchall()
            versions = []
            for row in rows:
                snapshot = json.loads(row["snapshot"]) if row["snapshot"] else {}
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

    def save_agent_report(self, report: Any) -> Any:
        rep_obj = report if isinstance(report, AgentReport) else AgentReport.model_validate(report)
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO agent_reports (task_id, status, data, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (
                    rep_obj.task_id,
                    rep_obj.status,
                    json.dumps(rep_obj.model_dump()),
                    now,
                ),
            )
            conn.commit()
        return rep_obj

    def get_agent_report(self, task_id: str) -> Any | None:
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT data FROM agent_reports WHERE task_id = ?",
                (task_id,),
            ).fetchone()
            if not row:
                return None
            data = json.loads(row["data"])
            try:
                return AgentReport.model_validate(data)
            except Exception:
                return data

