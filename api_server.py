"""FastAPI backend server for Verity Growth Agent system.

Connects the React frontend directly to the LangGraph autonomous pipeline,
Google Gemini / Groq LLMs, and Supabase / Local storage.
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Load environment configuration
load_dotenv()

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from core import service
from core.repo import get_repo
from core.repo.seed import seed_repository

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("api_server")

app = FastAPI(
    title="Verity Growth AI Agent API",
    description="Multi-agent business growth pipeline with multi-tier verification and human consensus gates",
    version="1.0.0",
)

# Enable CORS for the Vite frontend (http://localhost:5173 and http://localhost:5174)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request schemas
class StartRunPayload(BaseModel):
    business_id: str
    lead_id: str | None = None


class CreateBusinessPayload(BaseModel):
    name: str
    industry: str = "General"
    offerings: list[str] = Field(default_factory=list)
    ideal_customer: str = ""
    stage: str = "foundation"
    tone: str = "professional and consultative"


class FlagUpdatePayload(BaseModel):
    status: str = Field(description="'accepted' or 'dismissed'")


class ApprovalPayload(BaseModel):
    decision: str = Field(description="'approve', 'edit', or 'reject'")
    edited_body: str | None = None
    notes: str = ""


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health_check() -> dict[str, Any]:
    from core.repo import get_active_backend_info
    backend_info = get_active_backend_info()
    return {
        "status": "healthy",
        "repository_active": backend_info["repository_active"],
        "storage_backend": backend_info["storage_backend"],
        "storage_fallback": backend_info["storage_fallback"],
        "model_provider_active": os.environ.get("LLM_PROVIDER", "gemini"),
        "supabase_connected": bool(os.environ.get("SUPABASE_URL")),
    }


@app.get("/api/agents")
def get_agents_endpoint() -> dict[str, Any]:
    from core.registry import get_agent_registry, get_registry_summary
    return {
        "agents": get_agent_registry(),
        "summary": get_registry_summary(),
    }


@app.get("/api/businesses")
def list_businesses() -> list[dict[str, Any]]:
    return service.list_businesses()


@app.get("/api/businesses/{business_id}")
def switch_business(business_id: str) -> dict[str, Any]:
    try:
        return service.switch_business(business_id)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@app.post("/api/businesses")
def create_business_endpoint(payload: CreateBusinessPayload) -> dict[str, Any]:
    try:
        return service.create_business(payload.model_dump())
    except Exception as exc:
        logger.error(f"Error creating business: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/runs")
def start_run(payload: StartRunPayload) -> dict[str, Any]:
    try:
        run_id = service.start_run(payload.business_id, payload.lead_id)
        return {"run_id": run_id, "status": "started"}
    except Exception as exc:
        logger.error(f"Error starting run: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/runs/{run_id}")
def get_run(run_id: str) -> dict[str, Any]:
    data = service.get_run(run_id)
    if data.get("status") == "not_found":
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")
    return data


@app.get("/api/runs/{run_id}/trace")
def get_trace(run_id: str) -> list[dict[str, Any]]:
    traces = service.get_trace(run_id)
    return [t.model_dump() if hasattr(t, "model_dump") else t for t in traces]


@app.get("/api/runs/{run_id}/review")
def get_review_payload(run_id: str) -> dict[str, Any]:
    try:
        payload = service.get_review_payload(run_id)
        if not payload.get("draft") and not payload.get("trust_report"):
            raise HTTPException(status_code=404, detail=f"No review draft or trust report found for run '{run_id}'.")

        def _dump(obj: Any) -> Any:
            if hasattr(obj, "model_dump"):
                return obj.model_dump()
            return obj
        return {k: _dump(v) for k, v in payload.items()}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/runs/{run_id}/flags/{flag_id}")
def update_flag(run_id: str, flag_id: str, payload: FlagUpdatePayload) -> dict[str, Any]:
    try:
        updated_report = service.update_flag(run_id, flag_id, payload.status)  # type: ignore
        return updated_report.model_dump() if hasattr(updated_report, "model_dump") else updated_report
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/runs/{run_id}/approval")
def submit_approval(run_id: str, payload: ApprovalPayload) -> dict[str, Any]:
    try:
        return service.submit_approval(run_id, payload.model_dump())
    except Exception as exc:
        logger.error(f"Error in submit_approval for {run_id}: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/businesses/{business_id}/insights")
def get_insights(business_id: str) -> dict[str, Any]:
    repo = get_repo()
    outcomes = repo.get_outcomes(business_id)
    total = len(outcomes)
    if total == 0:
        return {
            "business_id": business_id,
            "total_outcomes": 0,
            "reply_rate": 0.0,
            "meeting_rate": 0.0,
            "unsubscribe_rate": 0.0,
            "insights": [],
        }

    replies = sum(1 for o in outcomes if (getattr(o, "replied", False) or (isinstance(o, dict) and o.get("replied"))))
    meetings = sum(1 for o in outcomes if (getattr(o, "booked_meeting", False) or (isinstance(o, dict) and o.get("booked_meeting"))))
    unsubs = sum(1 for o in outcomes if (getattr(o, "unsubscribed", False) or (isinstance(o, dict) and o.get("unsubscribed"))))
    raw_insights = repo.get_insights(business_id)
    return {
        "business_id": business_id,
        "total_outcomes": total,
        "reply_rate": round(replies / total, 3),
        "meeting_rate": round(meetings / total, 3),
        "unsubscribe_rate": round(unsubs / total, 3),
        "insights": [i.model_dump() if hasattr(i, "model_dump") else i for i in raw_insights],
    }


@app.post("/api/seed")
def reseed_database() -> dict[str, Any]:
    if not (os.environ.get("VITE_DEV_TOOLS") == "1" or os.environ.get("ENABLE_DEV_SEED") == "1"):
        return {"status": "disabled", "message": "Demo seeding is disabled in production"}
    backend = os.environ.get("REPO_BACKEND", "supabase").lower()
    repo = get_repo(force_refresh=True, backend=backend)
    seed_repository(repo, backend)
    return {"status": "seeded", "backend": backend}


# ---------------------------------------------------------------------------
# B2B Account Pipeline & Integrated Email Agent Endpoints
# ---------------------------------------------------------------------------

class B2BPipelineRequest(BaseModel):
    company_name: str = Field(..., description="Target company name, e.g. Anthropic, Stripe, Datadog")


class EmailDispatchRequest(BaseModel):
    to_email: str = Field(default="delivered@resend.dev")
    subject: str
    body: str
    company_name: str = "Target"


@app.post("/api/pipeline/run")
def run_b2b_account_pipeline(req: B2BPipelineRequest) -> dict[str, Any]:
    company = req.company_name.strip()
    if not company:
        raise HTTPException(status_code=400, detail="Company name cannot be empty")
    try:
        from b2b_pipeline import run_pipeline, get_crm_client
        state = run_pipeline(company)
        crm = get_crm_client()
        records = crm._load() if hasattr(crm, "_load") else []
        return {
            "company_name": state.get("company_name", company),
            "research_data": state.get("research_data", {}),
            "business_signals": state.get("business_signals"),
            "buying_committee": state.get("buying_committee"),
            "account_intelligence": state.get("account_intelligence"),
            "why_now_analysis": state.get("why_now_analysis"),
            "outreach_sequence": state.get("outreach_sequence", []),
            "outreach_evaluation": state.get("outreach_evaluation"),
            "agents": state.get("agent_executions"),
            "crm_status": state.get("crm_status", "unknown"),
            "email_status": state.get("email_status", "ready"),
            "execution_metadata": state.get("execution_metadata", {}),
            "crm_records": records,
        }
    except Exception as exc:
        logger.error(f"Error running b2b pipeline for {company}: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/crm/records")
def get_crm_records() -> dict[str, Any]:
    try:
        from b2b_pipeline import get_crm_client
        crm = get_crm_client()
        return {"records": crm._load() if hasattr(crm, "_load") else []}
    except Exception as exc:
        return {"records": [], "error": str(exc)}


@app.post("/api/email/dispatch")
def dispatch_email(req: EmailDispatchRequest) -> dict[str, Any]:
    """Authorized email dispatch using integrated Resend email agent."""
    import datetime
    import uuid
    api_key = os.environ.get("RESEND_API_KEY", "")

    if not api_key:
        return {
            "status": "failed",
            "provider": "None",
            "error": "RESEND_API_KEY environment variable is not configured",
            "to": req.to_email,
            "delivered_at": None,
        }

    try:
        import resend
        resend.api_key = api_key
        resp = resend.Emails.send({
            "from": "onboarding@resend.dev",
            "to": req.to_email,
            "subject": f"{req.subject} ({req.company_name})",
            "text": req.body,
        })
        msg_id = resp.get("id") if isinstance(resp, dict) else getattr(resp, "id", None)
        return {
            "status": "delivered",
            "provider": "Resend API",
            "message_id": msg_id,
            "to": req.to_email,
            "delivered_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
    except Exception as exc:
        logger.warning(f"Resend dispatch error: {exc}")
        return {
            "status": "failed",
            "provider": "Resend API",
            "error": str(exc),
            "to": req.to_email,
            "delivered_at": None,
        }


# ---------------------------------------------------------------------------
# Stage 2: Adaptive Onboarding Endpoints
# ---------------------------------------------------------------------------
class OnboardStartPayload(BaseModel):
    session_id: str | None = None
    core_answers: dict[str, Any] | None = None


class OnboardSavePayload(BaseModel):
    core_answers: dict[str, Any] | None = None
    follow_up_answers: dict[str, Any] | None = None
    stage_override: str | None = None


class OnboardFollowUpPayload(BaseModel):
    force_fallback: bool = False


@app.post("/api/onboarding/session")
def start_onboard_session(payload: OnboardStartPayload) -> dict[str, Any]:
    session = service.start_onboarding_session(
        session_id=payload.session_id,
        core_answers=payload.core_answers,
    )
    from shared.schemas import OnboardingSession
    return session.model_dump() if isinstance(session, OnboardingSession) else session


@app.get("/api/onboarding/session/{session_id}")
def get_onboard_session(session_id: str) -> dict[str, Any]:
    session = service.get_onboarding_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Onboarding session '{session_id}' not found.")
    from shared.schemas import OnboardingSession
    return session.model_dump() if isinstance(session, OnboardingSession) else session


@app.post("/api/onboarding/session/{session_id}/save")
def save_onboard_session(session_id: str, payload: OnboardSavePayload) -> dict[str, Any]:
    session = service.save_onboarding_session(
        session_id=session_id,
        core_answers=payload.core_answers,
        follow_up_answers=payload.follow_up_answers,
        stage_override=payload.stage_override,
    )
    from shared.schemas import OnboardingSession
    return session.model_dump() if isinstance(session, OnboardingSession) else session


@app.post("/api/onboarding/session/{session_id}/follow-ups")
def get_onboard_follow_ups(session_id: str, payload: OnboardFollowUpPayload) -> dict[str, Any]:
    res = service.generate_follow_up_questions(
        session_id=session_id,
        force_fallback=payload.force_fallback,
    )
    from shared.schemas import FollowUpGenerationResult
    return res.model_dump() if isinstance(res, FollowUpGenerationResult) else res


@app.get("/api/onboarding/sessions")
def list_onboard_sessions() -> list[dict[str, Any]]:
    repo = get_repo()
    sessions = repo.list_onboarding_sessions()
    from shared.schemas import OnboardingSession
    return [
        s.model_dump() if isinstance(s, OnboardingSession) else s
        for s in sessions
    ]


# ---------------------------------------------------------------------------
# Stage 3: Atlas Task Graph, State Machine & Execution Endpoints
# ---------------------------------------------------------------------------
class PlanTasksRequest(BaseModel):
    business_id: str | None = None
    phase: str | None = None
    session_id: str | None = None


class UpdateTaskRequest(BaseModel):
    updates: dict[str, Any] = Field(default_factory=dict)
    reason: str = "Updated via API"


class TransitionTaskRequest(BaseModel):
    to_status: str
    reason: str = ""
    details: dict[str, Any] | None = None


class PauseTaskRequest(BaseModel):
    reason: str = "User requested pause"


class ResumeTaskRequest(BaseModel):
    reason: str = "User requested resume"


class ExecuteTaskRequest(BaseModel):
    context: dict[str, Any] | None = None


class AnswerMissingInfoRequest(BaseModel):
    answer: str
    what_item: str | None = None
    item_index: int | None = None


class ApproveTaskRequest(BaseModel):
    reviewer: str = "admin"
    notes: str = ""


@app.post("/api/tasks/plan")
def plan_task_graph(req: PlanTasksRequest) -> list[dict[str, Any]]:
    tasks = service.plan_tasks(
        business_id=req.business_id,
        phase=req.phase,
        session_id=req.session_id,
    )
    return [t.model_dump() if hasattr(t, "model_dump") else t for t in tasks]


@app.get("/api/tasks")
def list_tasks_endpoint(
    business_id: str | None = None,
    phase: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    tasks = service.list_tasks(business_id=business_id, phase=phase, status=status)
    return [t.model_dump() if hasattr(t, "model_dump") else t for t in tasks]


@app.get("/api/tasks/{task_id}")
def get_task_details_endpoint(task_id: str) -> dict[str, Any]:
    try:
        details = service.get_task_details(task_id)
        return {
            "task": details["task"].model_dump() if hasattr(details["task"], "model_dump") else details["task"],
            "events": [e.model_dump() if hasattr(e, "model_dump") else e for e in details["events"]],
            "versions": [v.model_dump() if hasattr(v, "model_dump") else v for v in details["versions"]],
            "report": details["report"].model_dump() if details["report"] and hasattr(details["report"], "model_dump") else details["report"],
        }
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@app.put("/api/tasks/{task_id}")
def update_task_endpoint(task_id: str, req: UpdateTaskRequest) -> dict[str, Any]:
    try:
        res = service.update_task_fields(task_id, updates=req.updates, reason=req.reason)
        return {
            "task": res["task"].model_dump() if hasattr(res["task"], "model_dump") else res["task"],
            "version": res["version"].model_dump() if hasattr(res["version"], "model_dump") else res["version"],
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/tasks/{task_id}/transition")
def transition_task_endpoint(task_id: str, req: TransitionTaskRequest) -> dict[str, Any]:
    try:
        res = service.transition_task_status(
            task_id=task_id,
            to_status=req.to_status,
            reason=req.reason,
            details=req.details,
        )
        return {
            "task": res["task"].model_dump() if hasattr(res["task"], "model_dump") else res["task"],
            "event": res["event"].model_dump() if hasattr(res["event"], "model_dump") else res["event"],
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/tasks/{task_id}/pause")
def pause_task_endpoint(task_id: str, req: PauseTaskRequest) -> dict[str, Any]:
    try:
        res = service.pause_task_service(task_id=task_id, reason=req.reason)
        return {
            "task": res["task"].model_dump() if hasattr(res["task"], "model_dump") else res["task"],
            "event": res["event"].model_dump() if hasattr(res["event"], "model_dump") else res["event"],
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/tasks/{task_id}/resume")
def resume_task_endpoint(task_id: str, req: ResumeTaskRequest) -> dict[str, Any]:
    try:
        res = service.resume_task_service(task_id=task_id, reason=req.reason)
        return {
            "task": res["task"].model_dump() if hasattr(res["task"], "model_dump") else res["task"],
            "event": res["event"].model_dump() if hasattr(res["event"], "model_dump") else res["event"],
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/tasks/{task_id}/execute")
def execute_task_endpoint(task_id: str, req: ExecuteTaskRequest) -> dict[str, Any]:
    try:
        res = service.execute_task_service(task_id=task_id, context=req.context)
        return {
            "task": res["task"].model_dump() if hasattr(res["task"], "model_dump") else res["task"],
            "report": res["report"].model_dump() if hasattr(res["report"], "model_dump") else res["report"],
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/tasks/{task_id}/answer")
def answer_missing_info_endpoint(task_id: str, req: AnswerMissingInfoRequest) -> dict[str, Any]:
    try:
        task = service.answer_missing_info(
            task_id=task_id,
            answer=req.answer,
            what_item=req.what_item,
            item_index=req.item_index,
        )
        return task.model_dump() if hasattr(task, "model_dump") else task
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/tasks/{task_id}/approve")
def approve_task_endpoint(task_id: str, req: ApproveTaskRequest) -> dict[str, Any]:
    try:
        res = service.approve_task_service(
            task_id=task_id,
            reviewer=req.reviewer,
            notes=req.notes,
        )
        return {
            "task": res["task"].model_dump() if hasattr(res["task"], "model_dump") else res["task"],
            "event": res["event"].model_dump() if hasattr(res["event"], "model_dump") else res["event"],
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))





if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    logger.info(f"Starting Verity FastAPI backend on http://{host}:{port}")
    uvicorn.run("api_server:app", host=host, port=port, reload=True)
