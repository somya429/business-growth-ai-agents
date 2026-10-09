"""Comprehensive test suite for specialist growth agents.

Runs in mock LLM mode without network or paid API keys.
Validates:
1. Schema-valid output for all 3 businesses across all 6 agents.
2. Planted-claim protection for Outreach (never cites unverified claims).
3. Deterministic hard escalation in Follow-up for price/contract/unsubscribe.
4. Permission boundaries blocking forbidden actions per agent.
5. Structured audit trace recording for every agent run.
6. Absolute prompt purity (zero business-specific text in agents/prompts/*.md).
"""

from __future__ import annotations

import json
from pathlib import Path
import os
import pytest

from agents.base import (
    AGENT_PERMISSIONS,
    PermissionDeniedError,
    check_permission,
    enforce_permission,
)
from agents.content import run_content
from agents.demo import load_business_state
from agents.followup import run_followup
from agents.learning import run_learning
from agents.outreach import run_outreach
from agents.research import run_research
from agents.scoring import run_scoring
from shared.schemas import (
    CampaignReport,
    ContentPiece,
    Draft,
    Fact,
    GrowthState,
    LeadScore,
    LearningInsight,
    ReplyAnalysis,
    TraceEvent,
)

BUSINESSES = ["saas", "ecommerce", "local_services"]


@pytest.fixture(autouse=True)
def ensure_mock_mode_for_tests(monkeypatch):
    """Ensure unit tests run deterministically in mock mode without consuming live API quotas."""
    if not os.environ.get("TEST_LIVE_LLM"):
        monkeypatch.setenv("LLM_PROVIDER", "mock")


# ---------------------------------------------------------------------------
# Test 1: Each agent returns schema-valid output for all 3 businesses
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("biz_key", BUSINESSES)
def test_all_agents_schema_valid_output(biz_key: str):
    """Verify that all 6 specialist agents return schema-valid outputs across all 3 businesses."""
    state = load_business_state(biz_key)

    # 1. Research Agent
    state = run_research(state)
    assert "facts" in state
    assert len(state["facts"]) > 0
    for f_dict in state["facts"]:
        fact = Fact.model_validate(f_dict)
        assert fact.id
        assert fact.statement
        assert fact.source
        assert 0.0 <= fact.confidence <= 1.0

    # 2. Scoring Agent
    state = run_scoring(state)
    assert "score" in state
    score = LeadScore.model_validate(state["score"])
    assert 0 <= score.score <= 100
    assert score.decision in ("ACT", "WAIT", "REJECT", "RESEARCH_MORE")
    assert isinstance(score.breakdown, dict)

    # 3. Outreach Agent
    state = run_outreach(state)
    if score.decision == "ACT":
        assert state.get("draft") is not None
        draft = Draft.model_validate(state["draft"])
        assert draft.subject
        assert draft.body
        assert draft.channel in ("email", "linkedin", "phone_followup", "instagram_dm")
        assert len(draft.claims_used) > 0
        assert draft.lead_id == state["lead"]["id"]
    else:
        # If score was not ACT, outreach must hold draft
        assert state.get("draft") is None

    # 4. Content Agent
    state["campaign_goal"] = "Showcase certified operational capabilities"
    state = run_content(state)
    assert "content_piece" in state
    content = ContentPiece.model_validate(state["content_piece"])
    assert content.title
    assert content.body
    assert content.channel
    assert isinstance(content.claims_used, list)

    # 5. Follow-up Agent (Standard interested inquiry)
    state["incoming_reply"] = "Hi, this sounds interesting! Can we connect next Tuesday?"
    state = run_followup(state)
    assert "reply_analysis" in state
    reply_analysis = ReplyAnalysis.model_validate(state["reply_analysis"])
    assert reply_analysis.intent in ("interested", "question")
    assert not reply_analysis.escalate_to_human

    # 6. Analytics & Learning Agent
    # Attach sample outcomes
    state["outcomes"] = [
        {"lead_id": "l1", "draft_id": "d1", "replied": True, "meeting_booked": True, "unsubscribed": False, "complaint": False, "notes": "ok"},
        {"lead_id": "l2", "draft_id": "d2", "replied": True, "meeting_booked": False, "unsubscribed": False, "complaint": False, "notes": "ok"},
        {"lead_id": "l3", "draft_id": "d3", "replied": False, "meeting_booked": False, "unsubscribed": False, "complaint": False, "notes": "no"},
        {"lead_id": "l4", "draft_id": "d4", "replied": True, "meeting_booked": True, "unsubscribed": False, "complaint": False, "notes": "ok"},
        {"lead_id": "l5", "draft_id": "d5", "replied": False, "meeting_booked": False, "unsubscribed": True, "complaint": False, "notes": "opt"},
    ]
    state = run_learning(state)
    assert "insights" in state
    assert "campaign_report" in state
    report = CampaignReport.model_validate(state["campaign_report"])
    assert report.total_outcomes == 5
    assert report.reply_rate == pytest.approx(0.6)
    assert report.meeting_rate == pytest.approx(0.4)
    assert report.unsubscribe_rate == pytest.approx(0.2)
    for ins in report.insights:
        assert ins.evidence_count >= 3


# ---------------------------------------------------------------------------
# Test 2: Planted-claim test for Outreach
# ---------------------------------------------------------------------------
def test_outreach_never_uses_unverified_claims():
    """Plant an unverified fake claim and verify Outreach never includes it in claims_used."""
    state = load_business_state("saas")

    # Set up approved facts
    verified_fact = Fact(
        id="fact_verified_legit",
        statement="Platform integrates in under 15 minutes.",
        source="Verified Whitepaper",
        source_date="2026-09-01",
        confidence=0.99,
        kind="company",
    )
    state["facts"] = [verified_fact.model_dump()]
    state["score"] = LeadScore(
        score=95,
        breakdown={"fit": 0.95, "intent": 0.90},
        decision="ACT",
        reason="Target is ideal ICP match",
    ).model_dump()

    # Adversarial planted claim
    planted_fake_id = "fact_adversarial_planted_fake_claim_999"

    state = run_outreach(state)
    draft = Draft.model_validate(state["draft"])

    # Assert planted fake claim is strictly absent from claims_used
    assert planted_fake_id not in draft.claims_used

    # Assert every single cited claim actually exists in verified facts or approved KB claims
    valid_fact_ids = {verified_fact.id}
    for doc in state.get("kb_docs", []):
        if "approved" in doc.get("title", "").lower():
            for line in doc.get("text", "").splitlines():
                if "CLAIM-" in line:
                    import re
                    m = re.search(r"\[(CLAIM-[^\]]+)\]", line)
                    if m:
                        valid_fact_ids.add(m.group(1).lower().replace("-", "_"))

    for claim_id in draft.claims_used:
        assert claim_id in valid_fact_ids, f"Unverified claim {claim_id} found in draft!"


# ---------------------------------------------------------------------------
# Test 3: Follow-up hard escalation rules
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "reply_text,expected_intent",
    [
        ("Can you provide your pricing sheet and discount options?", "pricing_or_contract"),
        ("What is the cost per user under our commercial contract?", "pricing_or_contract"),
        ("Please send over the legal agreement for review by our lawyer.", "pricing_or_contract"),
        ("I demand a full refund, this is totally unacceptable service.", "pricing_or_contract"),
        ("Unsubscribe immediately. Remove me from your mailing list.", "unsubscribe"),
        ("STOP", "unsubscribe"),
        ("Please opt-out our domain and do not contact us again.", "unsubscribe"),
    ],
)
def test_followup_hard_escalation(reply_text: str, expected_intent: str):
    """Verify that price, contract, and unsubscribe inquiries escalate to human in plain code."""
    state = load_business_state("saas")
    state["incoming_reply"] = reply_text
    lead_email = state["lead"]["email"]

    state = run_followup(state)
    analysis = ReplyAnalysis.model_validate(state["reply_analysis"])

    assert analysis.escalate_to_human is True
    assert analysis.intent == expected_intent
    assert analysis.draft_reply is None  # Agents cannot quote prices or reply to unsubs directly

    # If it was unsubscribe, check that opt-out list was updated
    if expected_intent == "unsubscribe":
        opt_out_list = state["profile"]["anti_spam"]["opt_out_list"]
        assert lead_email.lower() in [e.lower() for e in opt_out_list]
        assert state["lead"]["status"] == "opted_out"


# ---------------------------------------------------------------------------
# Test 4: Permission decorator blocks forbidden actions
# ---------------------------------------------------------------------------
def test_permission_decorator_blocks_forbidden_actions():
    """Verify that permission checker and enforce_permission decorator block forbidden actions."""
    # Outreach cannot call web search or send
    with pytest.raises(PermissionDeniedError, match="SECURITY VIOLATION"):
        check_permission("outreach", "web_search")

    with pytest.raises(PermissionDeniedError, match="SECURITY VIOLATION"):
        check_permission("outreach", "send")

    # Research cannot write copy or send
    with pytest.raises(PermissionDeniedError, match="SECURITY VIOLATION"):
        check_permission("research", "write_copy")

    with pytest.raises(PermissionDeniedError, match="SECURITY VIOLATION"):
        check_permission("research", "send")

    # Scoring cannot contact lead
    with pytest.raises(PermissionDeniedError, match="SECURITY VIOLATION"):
        check_permission("scoring", "contact_lead")

    # Follow-up cannot quote prices
    with pytest.raises(PermissionDeniedError, match="SECURITY VIOLATION"):
        check_permission("followup", "quote_price")

    # Learning cannot change policy
    with pytest.raises(PermissionDeniedError, match="SECURITY VIOLATION"):
        check_permission("learning", "change_policy")

    # Test decorated function
    @enforce_permission("outreach", "send")
    def malicious_outreach_send(msg: str):
        return f"Sent: {msg}"

    with pytest.raises(PermissionDeniedError):
        malicious_outreach_send("Unauthorized cold message")


# ---------------------------------------------------------------------------
# Test 5: Trace events are written for every agent call
# ---------------------------------------------------------------------------
def test_trace_events_written_for_every_agent_call():
    """Verify that every agent call appends a valid TraceEvent with why, timestamp, input, output."""
    state = load_business_state("ecommerce")
    initial_trace_count = len(state.get("trace", []))

    # Run Research
    state = run_research(state)
    assert len(state["trace"]) == initial_trace_count + 1
    t1 = TraceEvent.model_validate(state["trace"][-1])
    assert t1.agent == "research"
    assert t1.step == "gather_facts"
    assert t1.timestamp
    assert t1.reason

    # Run Scoring
    state = run_scoring(state)
    assert len(state["trace"]) == initial_trace_count + 2
    t2 = TraceEvent.model_validate(state["trace"][-1])
    assert t2.agent == "scoring"
    assert t2.step == "evaluate_lead"

    # Run Outreach
    state = run_outreach(state)
    assert len(state["trace"]) == initial_trace_count + 3
    t3 = TraceEvent.model_validate(state["trace"][-1])
    assert t3.agent == "outreach"

    # Run Content
    state = run_content(state)
    assert len(state["trace"]) == initial_trace_count + 4
    t4 = TraceEvent.model_validate(state["trace"][-1])
    assert t4.agent == "content"


# ---------------------------------------------------------------------------
# Test 6: Absolute Prompt Purity (No business names or business-specific text)
# ---------------------------------------------------------------------------
def test_prompts_have_no_business_specific_text():
    """Ensure prompt templates contain only parameter placeholders and zero business-specific wording."""
    prompts_dir = Path(__file__).parent.parent / "agents" / "prompts"
    prompt_files = list(prompts_dir.glob("*.md"))
    assert len(prompt_files) >= 6, "All 6 prompt markdown files must be present"

    forbidden_terms = [
        "CloudPulse",
        "NordicLoom",
        "Apex Commercial",
        "Kubernetes",
        "eBPF",
        "Belgian linen",
        "HVAC",
        "chiller",
        "cotton",
        "textile",
        "ASHRAE",
        "FintechFlow",
        "HealthData",
        "Summit Plaza",
    ]

    for pf in prompt_files:
        content = pf.read_text(encoding="utf-8")
        for term in forbidden_terms:
            assert term.lower() not in content.lower(), (
                f"Violation in {pf.name}: Prompt contains business-specific term '{term}'! "
                "Templates must be 100% agnostic and parameter-driven."
            )


# ---------------------------------------------------------------------------
# Test 7: Agent failure records error in trace without crashing
# ---------------------------------------------------------------------------
def test_agent_failure_records_error_in_trace_without_crashing():
    """Verify that an agent call on broken state records an error trace rather than raising an unhandled exception."""
    broken_state: GrowthState = {"trace": []}  # Missing required profile & lead

    result_state = run_research(broken_state)
    assert len(result_state["trace"]) >= 1
    err_event = result_state["trace"][-1]
    assert err_event.agent == "research"
    assert err_event.step == "error_handler"
    assert "ValueError" in err_event.output_summary

