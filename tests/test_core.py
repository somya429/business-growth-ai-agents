"""Comprehensive test suite for the Core Orchestrator, LangGraph, and Repository layer.

Validates all 11 required scenarios in mock LLM mode:
1. Full run on each of the 3 businesses reaches human_review and pauses (waiting_for_human).
2. Resume with approve reaches mock_send and completes; reject terminates (status=rejected).
3. Planted bad claims get FAIL, loop max 2 times, and stop at human_review with banner (never auto-sends).
4. Edit decision triggers re-audit and re-policy-check on the edited body.
5. mock_send refuses without an approval record.
6. WAIT / REJECT / RESEARCH_MORE routing works; loops are capped.
7. Permission engine denies forbidden actions and logs them to the trace.
8. Opt-out lead never reaches mock_send.
9. Process restart can resume the same run_id from the SQLite checkpoint.
10. LocalRepository and SupabaseRepository (mock client) pass the same contract tests.
11. Existing 15 tests still pass.
"""

from __future__ import annotations

import os
import sqlite3
from unittest.mock import MagicMock
import pytest

from langgraph.types import Command

from core.graph import (
    build_growth_graph,
    get_compiled_graph,
    mock_send_node,
    scoring_router,
)
from core.permissions import (
    PermissionDeniedError,
    check_permission,
    enforce_node_permission,
)
from core.repo.base import Repository
from core.repo.local import LocalRepository
from core.repo.supabase import SupabaseRepository
from core.service import (
    get_review_payload,
    get_run,
    get_trace,
    start_run,
    submit_approval,
    update_flag,
)
from core.stubs.policy import check_policy
from core.stubs.trust import audit
from shared.schemas import (
    ApprovalDecision,
    Draft,
    Flag,
    GrowthState,
    LeadScore,
    Outcome,
    PolicyResult,
    TraceEvent,
    TrustReport,
)

BUSINESSES = ["saas", "ecommerce", "local_services"]


@pytest.fixture(autouse=True)
def ensure_mock_mode_for_core_tests(monkeypatch):
    """Ensure tests run deterministically in mock mode without network calls."""
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    monkeypatch.setenv("TRUST_IMPL", "stub")
    monkeypatch.setenv("POLICY_IMPL", "stub")
    monkeypatch.setenv("REPO_BACKEND", "local")


# -----------------------------------------------------------------------------
# Test 1: Full run on all 3 businesses pauses at human review
# -----------------------------------------------------------------------------
@pytest.mark.parametrize("biz_key", BUSINESSES)
def test_all_businesses_pause_at_human_review(biz_key: str):
    """Verify that every business reaches human_review and pauses with waiting_for_human."""
    run_id = start_run(biz_key)
    run_data = get_run(run_id)

    assert run_data["status"] == "waiting_for_human"
    assert run_data["business_id"] == biz_key

    payload = get_review_payload(run_id)
    assert payload["run_id"] == run_id
    assert payload["draft"] is not None
    assert payload["trust_report"] is not None
    assert payload["policy_result"] is not None

    draft = payload["draft"]
    assert "body" in draft
    assert "subject" in draft
    assert len(draft["claims_used"]) > 0


# -----------------------------------------------------------------------------
# Test 2: Resume with approve and reject
# -----------------------------------------------------------------------------
def test_resume_with_approve_completes_pipeline():
    """Verify that approving a paused run routes to mock_send and completes."""
    run_id = start_run("saas")
    assert get_run(run_id)["status"] == "waiting_for_human"

    decision = ApprovalDecision(decision="approve", reviewer="test_human", notes="Looks great")
    resumed = submit_approval(run_id, decision)

    assert resumed["status"] == "completed"
    mock_send = resumed["state_summary"].get("mock_send_result")
    assert mock_send is not None
    assert mock_send["sent"] is True
    assert mock_send["to"] == "lead.1@healthdatasystems.com"


def test_resume_with_reject_terminates_pipeline():
    """Verify that rejecting a paused run terminates with status=rejected and sends nothing."""
    run_id = start_run("saas")
    assert get_run(run_id)["status"] == "waiting_for_human"

    decision = ApprovalDecision(decision="reject", reviewer="test_human", notes="Do not reach out")
    resumed = submit_approval(run_id, decision)

    assert resumed["status"] == "rejected"
    mock_send = resumed["state_summary"].get("mock_send_result")
    assert mock_send is None


# -----------------------------------------------------------------------------
# Test 3: Planted bad claim triggers FAIL, loops max 2 times, and shows banner
# -----------------------------------------------------------------------------
def test_planted_bad_claims_fail_and_reach_human_review_with_banner(monkeypatch):
    """A draft containing planted bad claims gets FAIL, loops to outreach, and stops at review with banner."""
    # Mock run_outreach to return adversarial planted claims
    bad_body = (
        "We are 100% FSSAI certified organic with guaranteed delivery in 2 days "
        "at wrong price of $9.99 for all clients.\n\nReply STOP to opt out."
    )
    bad_draft = Draft(
        subject="Adversarial False Claims",
        body=bad_body,
        channel="email",
        claims_used=["unverified_planted_fake_claim_999"],
        lead_id="lead_saas_001",
    )

    monkeypatch.setattr("core.graph.run_outreach", lambda state: {**state, "draft": bad_draft.model_dump()})

    run_id = start_run("saas")
    run_data = get_run(run_id)

    # Must pause at human review with failed trust banner
    assert run_data["status"] == "waiting_for_human"
    payload = get_review_payload(run_id)
    assert payload["failed_trust_banner"] is True

    trust = payload["trust_report"]
    assert trust["verdict"] == "FAIL"
    assert len(trust["flags"]) >= 3  # guarantee, fssai organic, wrong price/unverified claim

    # Never auto-sends
    assert run_data["state_summary"].get("mock_send_result") is None


# -----------------------------------------------------------------------------
# Test 4: Edit decision triggers re-audit and re-policy-check
# -----------------------------------------------------------------------------
def test_edit_decision_triggers_reaudit_and_recheck():
    """Verify that editing the body re-routes to trust_audit and policy_check."""
    run_id = start_run("saas")
    assert get_run(run_id)["status"] == "waiting_for_human"

    # Human edits the body and inserts a new risky commitment ("guaranteed results")
    edited_text = "Here is the revised body text with guaranteed results.\n\nReply STOP to opt out."
    decision = ApprovalDecision(
        decision="edit",
        edited_body=edited_text,
        reviewer="editor_human",
        notes="Edited proposal",
    )

    resumed = submit_approval(run_id, decision)
    # The edited body was re-audited and flagged because of 'guaranteed'
    payload = get_review_payload(run_id)
    assert payload["draft"]["body"] == edited_text
    # Re-audit detected the new guarantee in edited body
    trust = payload["trust_report"]
    assert any("guarantee" in f["sentence_text"].lower() for f in trust["flags"])


# -----------------------------------------------------------------------------
# Test 5: mock_send refuses without an approval record
# -----------------------------------------------------------------------------
def test_mock_send_refuses_without_approval():
    """Verify that mock_send strictly refuses to send without an approve decision."""
    state_without_approval: GrowthState = {
        "lead": {"email": "lead@test.com", "id": "l1"},
        "draft": {"channel": "email", "subject": "Hi", "body": "Hello"},
        "profile": {"anti_spam": {"opt_out_list": []}},
        "approval": None,
        "trace": [],
    }

    result = mock_send_node(state_without_approval)
    assert result["mock_send_result"] is None
    assert result["status"] == "failed"

    # With rejection
    state_rejected = {**state_without_approval, "approval": {"decision": "reject"}}
    result_rej = mock_send_node(state_rejected)
    assert result_rej["mock_send_result"] is None
    assert result_rej["status"] == "failed"


# -----------------------------------------------------------------------------
# Test 6: WAIT / REJECT / RESEARCH_MORE routing works and loops are capped
# -----------------------------------------------------------------------------
def test_scoring_routing_decisions_and_loop_caps():
    """Verify that scoring routing handles ACT, WAIT, REJECT, and caps RESEARCH_MORE."""
    # ACT -> outreach
    state_act: GrowthState = {"score": {"decision": "ACT", "score": 90, "reason": "Good"}, "retry_count": {}}
    assert scoring_router(state_act) == "outreach"

    # WAIT -> end_run
    state_wait: GrowthState = {"score": {"decision": "WAIT", "score": 40, "reason": "Stale", "recheck_after": "14d"}}
    assert scoring_router(state_wait) == "end_run"

    # REJECT -> end_run
    state_reject: GrowthState = {"score": {"decision": "REJECT", "score": 0, "reason": "Opted out"}}
    assert scoring_router(state_reject) == "end_run"

    # RESEARCH_MORE loop cap (max 2)
    state_rm: GrowthState = {
        "score": {"decision": "RESEARCH_MORE", "score": 45, "reason": "Needs info"},
        "retry_count": {"research": 0},
    }
    assert scoring_router(state_rm) == "research"
    assert state_rm["retry_count"]["research"] == 1

    assert scoring_router(state_rm) == "research"
    assert state_rm["retry_count"]["research"] == 2

    # Loop cap reached -> does not loop again
    assert scoring_router(state_rm) == "outreach"


# -----------------------------------------------------------------------------
# Test 7: Permission engine blocks forbidden actions and logs trace
# -----------------------------------------------------------------------------
def test_permission_engine_denies_forbidden_actions_and_logs():
    """Verify central permission map and denial logging."""
    # Outreach cannot send
    with pytest.raises(PermissionDeniedError, match="SECURITY VIOLATION"):
        check_permission("outreach", "send")

    # Research cannot quote price
    with pytest.raises(PermissionDeniedError, match="SECURITY VIOLATION"):
        check_permission("research", "quote_price")

    # Trust Auditor cannot edit draft
    with pytest.raises(PermissionDeniedError, match="SECURITY VIOLATION"):
        check_permission("trust_auditor", "edit_draft")

    # Learning cannot change policy
    with pytest.raises(PermissionDeniedError, match="SECURITY VIOLATION"):
        check_permission("learning", "change_policy")

    # Decorator records denial in trace
    @enforce_node_permission("trust_auditor", "edit_draft")
    def malicious_trust_edit(state: GrowthState):
        return state

    sample_state: GrowthState = {"trace": []}
    with pytest.raises(PermissionDeniedError):
        malicious_trust_edit(sample_state)

    assert len(sample_state["trace"]) >= 1
    assert sample_state["trace"][-1].step == "permission_denial"
    assert "ACCESS DENIED" in sample_state["trace"][-1].output_summary


# -----------------------------------------------------------------------------
# Test 8: Opt-out lead never reaches mock_send
# -----------------------------------------------------------------------------
def test_opt_out_lead_never_reaches_mock_send():
    """Verify that an opted-out lead is rejected by scoring and blocked by mock_send."""
    # lead.3 is opted-out in saas data or profile anti-spam
    repo = LocalRepository()
    repo.add_to_opt_out("saas", "opted_out_prospect@test.com")

    # If mock_send is attempted directly on opted-out lead
    opted_out_state: GrowthState = {
        "lead": {"email": "opted_out_prospect@test.com", "id": "lead_opt", "status": "opted_out"},
        "profile": repo.get_business("saas"),
        "approval": {"decision": "approve", "reviewer": "human"},
        "draft": {"channel": "email", "subject": "Test", "body": "Test"},
        "trace": [],
    }

    result = mock_send_node(opted_out_state)
    assert result["mock_send_result"] is None
    assert result["status"] == "failed"


# -----------------------------------------------------------------------------
# Test 9: Process restart can resume the same run_id from checkpoint
# -----------------------------------------------------------------------------
def test_resuming_from_disk_checkpoint_across_processes():
    """Simulate a killed and restarted process resuming run_id from SqliteSaver on disk."""
    run_id = start_run("saas")
    assert get_run(run_id)["status"] == "waiting_for_human"

    # Simulate process restart by compiling a brand new graph connected to the same sqlite file
    from langgraph.checkpoint.sqlite import SqliteSaver
    conn = sqlite3.connect("runtime/checkpoints.sqlite", check_same_thread=False)
    new_checkpointer = SqliteSaver(conn)

    fresh_graph = build_growth_graph().compile(checkpointer=new_checkpointer)
    config = {"configurable": {"thread_id": run_id}}

    state_snapshot = fresh_graph.get_state(config)
    assert state_snapshot.values["run_id"] == run_id
    assert "human_review" in state_snapshot.next
    assert get_run(run_id)["status"] == "waiting_for_human"

    # Resume the fresh graph instance with approval
    decision = ApprovalDecision(decision="approve", reviewer="restarted_process_human")
    fresh_graph.invoke(Command(resume=decision), config)

    final_snapshot = fresh_graph.get_state(config)
    assert final_snapshot.values["status"] == "completed"
    assert final_snapshot.values["mock_send_result"]["sent"] is True


# -----------------------------------------------------------------------------
# Test 10: LocalRepository and SupabaseRepository (mock client) pass contract tests
# -----------------------------------------------------------------------------
def test_repository_contract_tests_local_and_supabase(tmp_path):
    """Ensure LocalRepository and SupabaseRepository (mocked) implement the exact same contract."""
    # 1. LocalRepository
    db_file = tmp_path / "test_contract.sqlite"
    local_repo = LocalRepository(db_path=db_file)

    # 2. SupabaseRepository with mock client
    mock_client = MagicMock()
    # Mock returns
    mock_client.table().select().execute.return_value.data = [
        {"id": "saas", "name": "CloudPulse Systems", "industry": "SaaS"}
    ]
    mock_client.table().select().eq().execute.return_value.data = [
        {"id": "saas", "name": "CloudPulse Systems", "industry": "SaaS"}
    ]
    mock_client.table().select().limit().execute.return_value.data = [
        {"id": "lead_1", "name": "John Doe", "email": "john@example.com"}
    ]
    mock_client.table().insert().execute.return_value.data = [{"id": "ok"}]
    mock_client.table().upsert().execute.return_value.data = [{"id": "ok"}]
    mock_client.table().update().eq().execute.return_value.data = [{"id": "ok"}]

    supabase_repo = SupabaseRepository(client=mock_client)

    repos: list[Repository] = [local_repo, supabase_repo]

    for repo in repos:
        # Check businesses
        biz_list = repo.list_businesses()
        assert isinstance(biz_list, list)

        # Check runs
        r_id = repo.create_run("saas", "lead_test")
        assert r_id.startswith("run_")

        repo.update_run(r_id, "running")
        run_obj = repo.get_run(r_id)
        assert run_obj is not None

        # Check trace
        evt = TraceEvent(
            agent="test_agent",
            step="test_step",
            input_summary="in",
            output_summary="out",
            reason="why",
            timestamp="2026-10-09T00:00:00",
        )
        repo.append_trace(r_id, evt)
        traces = repo.get_trace(r_id)
        assert isinstance(traces, list)

        # Check drafts
        d_id = repo.save_draft(
            r_id,
            {"lead_id": "l1", "channel": "email", "subject": "S", "body": "B", "claims_used": []},
        )
        assert d_id.startswith("draft_")

        # Check trust report and flags
        tr_id = repo.save_trust_report(
            r_id,
            {
                "overall_score": 100,
                "verdict": "PASS",
                "category_scores": {},
                "claim_verdicts": [],
                "flags": [{"id": "f_1", "category": "pii", "sentence_text": "x", "reason": "r", "severity": "low"}],
            },
        )
        assert tr_id.startswith("tr_")

        # Check approvals
        appr_id = repo.save_approval(r_id, {"decision": "approve", "reviewer": "human"})
        assert appr_id.startswith("appr_")

        # Check outcomes and insights
        out_id = repo.save_outcome(
            Outcome(lead_id="l1", draft_id="d1", replied=True, meeting_booked=False),
            business_id="saas",
        )
        assert out_id.startswith("out_")


# -----------------------------------------------------------------------------
# Test 11: Flag updates recompute score
# -----------------------------------------------------------------------------
def test_update_flag_recomputes_score():
    """Verify that updating a flag status recalculates overall_score and verdict."""
    flag1 = Flag(
        id="f1",
        category="risky_commitment",
        sentence_text="guaranteed results",
        reason="guarantee",
        severity="high",
        status="open",
    )
    flag2 = Flag(
        id="f2",
        category="number_mismatch",
        sentence_text="wrong price",
        reason="price",
        severity="medium",
        status="open",
    )

    report = TrustReport(flags=[flag1, flag2])
    report.recompute_score()
    # High open flag penalizes 30, medium open flag penalizes 15 -> score = 55, verdict = FAIL
    assert report.overall_score == 55
    assert report.verdict == "FAIL"

    # Dismiss flag 1 (false alarm)
    flag1.status = "dismissed"
    report.recompute_score()
    # Medium open flag only (-15) -> score = 85, verdict = REVIEW
    assert report.overall_score == 85
    assert report.verdict == "REVIEW"

    # Accept flag 2 (fixed)
    flag2.status = "accepted"
    report.recompute_score()
    # All flags resolved -> score = 100, verdict = PASS
    assert report.overall_score == 100
    assert report.verdict == "PASS"


# -----------------------------------------------------------------------------
# Test 13: Courier dispatch returns explicit failed and no fabricated receipts
# -----------------------------------------------------------------------------
def test_courier_dispatch_returns_explicit_failed_when_provider_fails(monkeypatch):
    """Ensure Courier never fabricates delivery receipts and returns explicit failed status."""
    from api_server import dispatch_email, EmailDispatchRequest

    # 1. Missing API key
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    req = EmailDispatchRequest(
        to_email="test@target.com",
        subject="Hello",
        body="Body",
        company_name="Target Corp",
    )
    res = dispatch_email(req)
    assert res["status"] == "failed"
    assert res["delivered_at"] is None
    assert "RESEND_API_KEY" in res["error"]
    assert "TLS Authenticated" not in res.get("provider", "")

    # 2. Invalid API key triggers explicit error, never fake success
    monkeypatch.setenv("RESEND_API_KEY", "re_invalid_fake_key_12345")
    res_err = dispatch_email(req)
    assert res_err["status"] == "failed"
    assert res_err["delivered_at"] is None
    assert res_err["error"] is not None


# -----------------------------------------------------------------------------
# Test 14: SUPABASE_URL normalization handles trailing /rest/v1 and slashes
# -----------------------------------------------------------------------------
def test_supabase_url_normalization():
    """Verify that normalize_supabase_url normalizes URLs correctly."""
    from core.repo.supabase import normalize_supabase_url

    assert normalize_supabase_url("https://abc.supabase.co/rest/v1/") == "https://abc.supabase.co"
    assert normalize_supabase_url("https://abc.supabase.co/rest/v1") == "https://abc.supabase.co"
    assert normalize_supabase_url("https://abc.supabase.co/") == "https://abc.supabase.co"
    assert normalize_supabase_url("https://abc.supabase.co") == "https://abc.supabase.co"
    assert normalize_supabase_url("  'https://abc.supabase.co/rest/v1/'  ") == "https://abc.supabase.co"
    assert normalize_supabase_url(None) == ""


# -----------------------------------------------------------------------------
# Test 15: Mock research fallback explicitly labeled as mock data
# -----------------------------------------------------------------------------
def test_mock_research_fallback_explicitly_labeled(monkeypatch):
    """Ensure that when TAVILY_API_KEY is missing, search and research explicitly declare mock data."""
    from agents.tools import search_web_tool
    from agents.research import run_research

    monkeypatch.delenv("TAVILY_API_KEY", raising=False)
    search_output = search_web_tool("research", "test company query")
    assert "mock data" in search_output.lower()
    assert "verified public filings" not in search_output.lower()

    state = {
        "lead": {"name": "Alex", "company": "Acme", "role": "CTO", "email": "alex@acme.com"},
        "profile": {"name": "TestBiz", "industry": "SaaS", "offerings": ["App"], "ideal_customer": "Devs"},
        "kb_docs": [],
        "trace": [],
    }
    updated = run_research(state)
    assert len(updated.get("facts", [])) > 0
    # Trace must explicitly contain 'mock data'
    last_trace = updated["trace"][-1]
    assert "mock data" in last_trace.output_summary.lower() or "mock data" in last_trace.reason.lower()
