"""Tests for Stage 2 Adaptive Onboarding Engine and Session Persistence.

Verifies:
1. Follow-up question selection per business type (physical product, service, SaaS/AI, marketplace, operating business).
2. Session resumption after restart (persistence across LocalRepository instances).
3. Fallback when LLM models fail or are forced into fallback mode.
4. No fabricated facts: unknown stays unknown with why-it-matters and resolution path.
"""

from __future__ import annotations

import tempfile
from pathlib import Path
import pytest

from core.onboarding import (
    QUESTION_BANK,
    classify_business_facts,
    calculate_readiness_score,
    generate_adaptive_follow_ups,
    get_fallback_follow_ups,
    initialize_or_resume_session,
    update_session_answers,
)
from core.repo.local import LocalRepository
from shared.schemas import (
    BusinessType,
    CoreIntakeAnswers,
    OnboardingSession,
)


def test_followup_selection_per_business_type():
    """Verify each of the 5 business types has specialized deterministic question banks."""
    expected_types: list[BusinessType] = [
        "physical_product",
        "services_consulting",
        "software_saas_ai",
        "marketplace_platform",
        "operating_business",
    ]

    for btype in expected_types:
        questions = get_fallback_follow_ups(btype)
        assert len(questions) >= 3, f"Business type {btype} must have at least 3 follow-up questions"

        # Verify attributes exist and are non-empty
        for q in questions:
            assert q.id.startswith("fq_")
            assert len(q.question) > 10
            assert len(q.rationale) > 10
            assert len(q.target_field) > 2

    # Verify type-specific domains
    phys_q = get_fallback_follow_ups("physical_product")
    assert any("cogs" in q.id.lower() or "moq" in q.id.lower() for q in phys_q)

    serv_q = get_fallback_follow_ups("services_consulting")
    assert any("pricing" in q.id.lower() or "capacity" in q.id.lower() for q in serv_q)

    saas_q = get_fallback_follow_ups("software_saas_ai")
    assert any("infra" in q.id.lower() or "metrics" in q.id.lower() or "stage" in q.id.lower() for q in saas_q)

    mkt_q = get_fallback_follow_ups("marketplace_platform")
    assert any("liquidity" in q.id.lower() or "take_rate" in q.id.lower() for q in mkt_q)

    ops_q = get_fallback_follow_ups("operating_business")
    assert any("revenue" in q.id.lower() or "bottleneck" in q.id.lower() for q in ops_q)


def test_resume_after_restart(tmp_path):
    """Verify session autosave and resumption across separate LocalRepository instances."""
    db_path = tmp_path / "test_repo.sqlite"

    # Instance 1: Create and save session
    repo1 = LocalRepository(db_path=db_path)
    intake = CoreIntakeAnswers(
        stage="presales_readiness",
        business_type="software_saas_ai",
        name="QuantumFlow Labs",
        idea="Automated multi-agent ETL pipelines for health data",
        budget="10k_to_50k",
        goal="Book 20 qualified demos with hospital CIOs",
        customers_today="interest_no_purchase",
        constraints="HIPAA compliance required, US only",
    )
    session = initialize_or_resume_session(
        session_id="onboard_test_resume_123",
        core_answers=intake,
        force_fallback=True,
    )
    # Add a follow-up answer
    session.follow_up_answers["fq_saas_metrics"] = "Mid-market B2B ($500 - $3,000/mo)"
    repo1.save_onboarding_session(session)

    # Instance 2: Simulate complete process restart with fresh repository instance
    repo2 = LocalRepository(db_path=db_path)
    loaded = repo2.get_onboarding_session("onboard_test_resume_123")

    assert loaded is not None
    assert loaded.session_id == "onboard_test_resume_123"
    assert loaded.core_answers.name == "QuantumFlow Labs"
    assert loaded.core_answers.stage == "presales_readiness"
    assert loaded.core_answers.business_type == "software_saas_ai"
    assert loaded.follow_up_answers.get("fq_saas_metrics") == "Mid-market B2B ($500 - $3,000/mo)"
    assert len(loaded.classified_facts) > 0
    assert loaded.readiness.overall_score > 0


def test_fallback_when_models_fail():
    """Verify deterministic question bank fallback is activated when LLM fails or is forced."""
    intake = CoreIntakeAnswers(
        stage="foundation",
        business_type="physical_product",
        name="AeroBreeze Purifiers",
        idea="HEPA filtered desktop air purifier with solar backup",
        budget="under_10k",
        goal="Launch Kickstarter campaign",
        customers_today="none",
        constraints="Bootstrapped, hardware prototype in testing",
    )

    # Force fallback mode
    result = generate_adaptive_follow_ups(intake, force_fallback=True)

    assert result.is_fallback is True
    assert result.source_model == "question_bank_fallback"
    assert len(result.questions) >= 3
    # Check that questions match physical product question bank
    assert any("cogs" in q.id.lower() or "moq" in q.id.lower() for q in result.questions)


def test_no_fabricated_facts():
    """Verify that unknown/missing attributes stay strictly unknown with why-it-matters explanations.

    Guarantees no hallucinated metrics, revenue, or customer counts are invented.
    """
    # Intake with missing/undecided budget, empty name, and empty goal
    sparse_intake = CoreIntakeAnswers(
        stage="foundation",
        business_type="marketplace_platform",
        name="",  # Missing name
        idea="",  # Missing idea
        budget="undecided",  # Undecided budget
        goal="",  # Missing goal
        customers_today="none",
        constraints="",
    )

    facts = classify_business_facts(sparse_intake)

    # Convert facts by key
    fact_dict = {f.key: f for f in facts}

    # 1. Business name must be unknown, NOT invented
    assert "business_name" in fact_dict
    assert fact_dict["business_name"].classification == "unknown"
    assert fact_dict["business_name"].confidence == 0.0
    assert fact_dict["business_name"].why_it_matters is not None
    assert "sender domain" in fact_dict["business_name"].why_it_matters.lower() or "legal" in fact_dict["business_name"].why_it_matters.lower()
    assert fact_dict["business_name"].how_to_resolve is not None

    # 2. Budget tier must be unknown, NOT invented
    assert "budget_tier" in fact_dict
    assert fact_dict["budget_tier"].classification == "unknown"
    assert fact_dict["budget_tier"].confidence == 0.0
    assert "budget constraint" in fact_dict["budget_tier"].why_it_matters.lower() or "guardrails" in fact_dict["budget_tier"].how_to_resolve.lower()

    # 3. Value proposition must be unknown, NOT invented
    assert "value_proposition" in fact_dict
    assert fact_dict["value_proposition"].classification == "unknown"
    assert fact_dict["value_proposition"].confidence == 0.0
    assert fact_dict["value_proposition"].why_it_matters is not None

    # 4. Declared customer traction is user_stated as 'No current customers'
    assert "customer_traction" in fact_dict
    assert fact_dict["customer_traction"].classification == "user_stated"
    assert "No current customers" in fact_dict["customer_traction"].statement

    # 5. Readiness score must correctly reflect unknowns as critical gaps
    readiness = calculate_readiness_score(facts, sparse_intake.stage)
    assert readiness.unknown_count >= 3
    assert len(readiness.critical_gaps) >= 3
    assert readiness.overall_score < 40  # Sparse intake cannot pass foundation gate


def test_storage_backend_and_fallback_reporting(tmp_path):
    """Verify that storage backend and fallback status are reported explicitly."""
    from core.repo import get_active_backend_info, get_repo
    from core.service import start_onboarding_session

    info = get_active_backend_info()
    assert "storage_backend" in info
    assert "storage_fallback" in info
    assert info["storage_backend"] in ("local", "supabase")

    # Start session and verify storage_backend is populated
    session = start_onboarding_session("test_backend_report_session")
    assert session.storage_backend in ("local", "supabase")
    assert isinstance(session.storage_fallback, bool)

