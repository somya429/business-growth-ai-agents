"""Adaptive Onboarding Engine for Verity Growth System.

Implements the 8-question core intake, model-generated follow-ups with
deterministic question-bank fallbacks per business type, strict fact
classification (verified_fact, user_assumption, researched_finding, unknown),
and multi-phase business readiness evaluation.
"""

from __future__ import annotations

import datetime
import logging
from typing import Any
from pydantic import BaseModel, Field

from agents.llm import call_structured
from shared.schemas import (
    BusinessType,
    BudgetTier,
    CustomerTraction,
    PhaseType,
    FactProvenance,
    ClassifiedFact,
    FollowUpQuestion,
    FollowUpGenerationResult,
    CoreIntakeAnswers,
    ReadinessScore,
    OnboardingSession,
)

logger = logging.getLogger("core.onboarding")


# -----------------------------------------------------------------------------
# Deterministic Question Bank per Business Type
# -----------------------------------------------------------------------------
QUESTION_BANK: dict[BusinessType, list[dict[str, Any]]] = {
    "physical_product": [
        {
            "id": "fq_phys_cogs",
            "question": "What is your estimated landed Cost of Goods Sold (COGS) and target retail price?",
            "rationale": "Hardware and physical goods require minimum 3x-4x gross margins to absorb packaging, logistics, and paid customer acquisition.",
            "target_field": "unit_economics",
            "options": ["< $10 COGS (retail > $40)", "$10-$50 COGS (retail $50-$200)", "> $50 COGS (premium retail)", "Undecided / Early prototyping"],
            "answer_type": "select",
        },
        {
            "id": "fq_phys_moq",
            "question": "What is your factory Minimum Order Quantity (MOQ) and production lead time?",
            "rationale": "Prevents over-committing to outbound campaigns before inventory is physically manufactured and warehouse-ready.",
            "target_field": "production_capacity",
            "options": ["On-demand / 3D printing (< 10 units)", "Small batch (50-250 units)", "Mass production (500+ units)", "Not yet contracted"],
            "answer_type": "select",
        },
        {
            "id": "fq_phys_fulfillment",
            "question": "How will shipping and fulfillment be managed for initial orders?",
            "rationale": "Directly impacts delivery promise veracity and return-rate liabilities in customer messaging.",
            "target_field": "logistics",
            "options": ["Self-fulfillment / garage packaging", "Third-party logistics (3PL)", "Dropship from manufacturer", "Digital preorder only"],
            "answer_type": "select",
        },
    ],
    "services_consulting": [
        {
            "id": "fq_serv_pricing",
            "question": "How is your service priced and billed to clients?",
            "rationale": "High-ticket retainers require consultative relationship sales, whereas hourly or low-ticket services need low-friction self-serve booking.",
            "target_field": "pricing_model",
            "options": ["Monthly retainer ($2k - $10k+/mo)", "Fixed-scope project ($5k - $50k)", "Hourly rate ($100 - $350/hr)", "Value/performance fee"],
            "answer_type": "select",
        },
        {
            "id": "fq_serv_capacity",
            "question": "How many active client engagements can you handle simultaneously right now?",
            "rationale": "Outreach volume must be throttled to prevent booking more accounts than delivery bandwidth allows.",
            "target_field": "delivery_capacity",
            "options": ["1 - 3 clients", "4 - 8 clients", "9 - 20 clients", "Unlimited / team of contractors"],
            "answer_type": "select",
        },
        {
            "id": "fq_serv_proof",
            "question": "Do you have existing client case studies, testimonials, or audited results?",
            "rationale": "Veritas requires audited proof assets before referencing specific client ROI figures in cold outreach.",
            "target_field": "social_proof",
            "options": ["3+ documented case studies with metrics", "1-2 informal client testimonials", "Portfolio of past work only", "No case studies yet"],
            "answer_type": "select",
        },
    ],
    "software_saas_ai": [
        {
            "id": "fq_saas_metrics",
            "question": "What is your core pricing metric and target Average Contract Value (ACV)?",
            "rationale": "Determines whether the growth engine should execute product-led self-serve acquisition or account-based executive outreach.",
            "target_field": "pricing_model",
            "options": ["Self-serve monthly subscription ($15 - $99/mo)", "Mid-market B2B ($500 - $3,000/mo)", "Enterprise annual ($20k+/yr)", "Usage / token consumption based"],
            "answer_type": "select",
        },
        {
            "id": "fq_saas_infra",
            "question": "What are your estimated AI inference and hosting costs per monthly active user?",
            "rationale": "Critical to confirm unit gross margins before scaling agentic user acquisition.",
            "target_field": "unit_economics",
            "options": ["< $0.50 / user / mo", "$1.00 - $5.00 / user / mo", "> $10.00 / user / mo", "Undetermined / Not measured"],
            "answer_type": "select",
        },
        {
            "id": "fq_saas_stage",
            "question": "What is the live technical state of the software product today?",
            "rationale": "Ensures outreach promises working software vs invite-only alpha waiting list.",
            "target_field": "product_readiness",
            "options": ["Live in production with active users", "Functional MVP / closed beta", "Clickable prototype / Figma only", "Concept / Architecture spec only"],
            "answer_type": "select",
        },
    ],
    "marketplace_platform": [
        {
            "id": "fq_mkt_liquidity",
            "question": "Which side of the marketplace is currently more constrained (supply or demand)?",
            "rationale": "Directs whether autonomous agents should source vendors/supply or target end buyers first.",
            "target_field": "liquidity_balance",
            "options": ["Supply-constrained (need more vendors/creators)", "Demand-constrained (need more buyers/clients)", "Both sides needed equally", "Single vertical pilot only"],
            "answer_type": "select",
        },
        {
            "id": "fq_mkt_take_rate",
            "question": "What is your platform take rate (commission or transaction fee)?",
            "rationale": "Required to compute lifetime value (LTV) and allowable customer acquisition cost (CAC).",
            "target_field": "unit_economics",
            "options": ["5% - 10% gross volume", "11% - 20% gross volume", "> 20% gross volume", "Flat listing or subscription fee"],
            "answer_type": "select",
        },
        {
            "id": "fq_mkt_trust",
            "question": "How are payments and fulfillment trust guaranteed between parties?",
            "rationale": "Essential trust layer required before engaging marketplace participants.",
            "target_field": "trust_architecture",
            "options": ["Escrow via Stripe Connect", "Manual invoicing and verification", "Direct peer-to-peer", "Undecided"],
            "answer_type": "select",
        },
    ],
    "operating_business": [
        {
            "id": "fq_ops_revenue",
            "question": "What is your current approximate Monthly Recurring / Gross Revenue (MRR)?",
            "rationale": "Calibrates whether the business requires immediate cashflow stabilization or secondary funnel optimization.",
            "target_field": "financial_baseline",
            "options": ["Pre-revenue", "< $10,000 / mo", "$10,000 - $50,000 / mo", "$50,000 - $250,000 / mo", "> $250,000 / mo"],
            "answer_type": "select",
        },
        {
            "id": "fq_ops_acquisition",
            "question": "What has been your primary customer acquisition channel to date?",
            "rationale": "Identifies existing proven channels to amplify versus unvalidated channels to test.",
            "target_field": "acquisition_channel",
            "options": ["Word of mouth / Personal network", "Outbound cold outreach", "Paid search / Social ads", "Organic SEO / Content", "None / Unsystematic"],
            "answer_type": "select",
        },
        {
            "id": "fq_ops_bottleneck",
            "question": "What is the single biggest bottleneck preventing your business from 2x growth?",
            "rationale": "Focuses the 10-agent fleet on the highest-leverage constraint rather than spreading resources thin.",
            "target_field": "core_bottleneck",
            "options": ["Not enough qualified inbound leads", "Sales conversion / closing rate", "Fulfillment & team delivery capacity", "High customer churn / poor retention"],
            "answer_type": "select",
        },
    ],
}


class LLMFollowUpResponse(BaseModel):
    """Pydantic schema for validating LLM generated follow-ups."""
    questions: list[FollowUpQuestion] = Field(
        min_length=2,
        max_length=5,
        description="2 to 5 targeted follow-up questions tailored to business intake answers",
    )


# -----------------------------------------------------------------------------
# Follow-Up Generation Engine
# -----------------------------------------------------------------------------
def get_fallback_follow_ups(business_type: BusinessType) -> list[FollowUpQuestion]:
    """Retrieve deterministic question-bank questions for a business type."""
    raw_list = QUESTION_BANK.get(business_type, QUESTION_BANK["software_saas_ai"])
    return [FollowUpQuestion(**q) for q in raw_list]


def generate_adaptive_follow_ups(
    intake: CoreIntakeAnswers,
    force_fallback: bool = False,
) -> FollowUpGenerationResult:
    """Generate adaptive follow-ups via LLM with deterministic fallback."""
    if force_fallback:
        logger.info("force_fallback requested. Using deterministic question bank.")
        return FollowUpGenerationResult(
            questions=get_fallback_follow_ups(intake.business_type),
            is_fallback=True,
            source_model="question_bank_fallback",
        )

    prompt = f"""You are Atlas, the Strategic Lead Architect for Verity Growth System.
A business founder has completed their 8-question core intake:

- Phase / Stage: {intake.stage}
- Business Type: {intake.business_type}
- Business Name: {intake.name or 'Unspecified'}
- Product / Offering: {intake.idea or 'Unspecified'}
- Budget Tier: {intake.budget}
- Primary Goal: {intake.goal or 'Unspecified'}
- Customers Today: {intake.customers_today}
- Constraints: {intake.constraints or 'None specified'}
- Initial Launch Market: {intake.launch_market or 'Unspecified'}

Generate 3 high-leverage follow-up questions to uncover critical business assumptions, unit economics,
and operational bottlenecks before autonomous agents launch growth workflows.

Requirements:
1. Each question must target a specific domain field (unit_economics, delivery_capacity, pricing_model, etc.).
2. Include a clear, business-grounded rationale explaining why this matters.
3. Provide 3-4 realistic selectable options where appropriate.
4. Return ONLY a valid JSON object matching the LLMFollowUpResponse schema:
   {{"questions": [{{"id": "fq_...", "question": "...", "rationale": "...", "target_field": "...", "options": ["..."], "answer_type": "select"}}]}}
"""

    try:
        response = call_structured(prompt, LLMFollowUpResponse)
        if response and response.questions and len(response.questions) >= 2:
            return FollowUpGenerationResult(
                questions=response.questions,
                is_fallback=False,
                source_model="llm_adaptive",
            )
    except Exception as e:
        logger.warning("LLM follow-up generation failed (%s). Falling back to question bank.", e)

    # Deterministic Fallback
    return FollowUpGenerationResult(
        questions=get_fallback_follow_ups(intake.business_type),
        is_fallback=True,
        source_model="question_bank_fallback",
    )


# -----------------------------------------------------------------------------
# Fact Classification Engine (No Hallucinations / Strict Provenance)
# -----------------------------------------------------------------------------
def classify_business_facts(
    intake: CoreIntakeAnswers,
    follow_up_answers: dict[str, Any] | None = None,
) -> list[ClassifiedFact]:
    """Extract and classify all business facts into explicit provenance buckets.

    Categories:
    - verified_fact: directly declared objective parameters (business name, declared budget, stage)
    - user_assumption: unverified claims about product superiority, market demand, or conversion
    - unknown: missing, undecided, or unverified critical parameters with why-it-matters explanation
    """
    follow_up_answers = follow_up_answers or {}
    facts: list[ClassifiedFact] = []
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # 1. Business Name
    if intake.name and intake.name.strip():
        facts.append(ClassifiedFact(
            key="business_name",
            statement=f"Business is named '{intake.name.strip()}'.",
            classification="user_stated",
            confidence=1.0,
            source="user_intake_direct",
            timestamp=now,
        ))
    else:
        facts.append(ClassifiedFact(
            key="business_name",
            statement="Business name is unspecified.",
            classification="unknown",
            confidence=0.0,
            source="user_intake_missing",
            timestamp=now,
            why_it_matters="A clear legal or trading brand name is required for all outbound communications and sender domain verification.",
            how_to_resolve="Specify the official operating name or company trade brand.",
        ))

    # 2. Business Type & Phase Stage
    facts.append(ClassifiedFact(
        key="business_type",
        statement=f"Business model is classified as {intake.business_type.replace('_', ' ').title()}.",
        classification="user_stated",
        confidence=1.0,
        source="user_intake_direct",
        timestamp=now,
    ))

    facts.append(ClassifiedFact(
        key="selected_phase",
        statement=f"Operating in Phase: {intake.stage.replace('_', ' ').title()}.",
        classification="user_stated",
        confidence=1.0,
        source="user_intake_direct",
        timestamp=now,
    ))

    # 3. Product / Idea Description
    if intake.idea and len(intake.idea.strip()) >= 10:
        facts.append(ClassifiedFact(
            key="value_proposition",
            statement=f"Offering description: {intake.idea.strip()}",
            classification="user_assumption",  # Assumption until audited against paying customer retention
            confidence=0.75,
            source="founder_statement",
            timestamp=now,
            why_it_matters="Founder value proposition is a hypothesis until validated by customer engagement and transaction data.",
            how_to_resolve="Test message resonate via initial prospect feedback and structured reply analysis.",
        ))
    else:
        facts.append(ClassifiedFact(
            key="value_proposition",
            statement="Core product offering / idea description is missing or incomplete.",
            classification="unknown",
            confidence=0.0,
            source="user_intake_missing",
            timestamp=now,
            why_it_matters="Quill and Muse cannot draft outreach or positioning content without an explicit value proposition.",
            how_to_resolve="Provide a 2-3 sentence summary of what problem your product or service solves and for whom.",
        ))

    # 4. Budget Tier
    if intake.budget == "undecided":
        facts.append(ClassifiedFact(
            key="budget_tier",
            statement="Capital allocation tier is undecided.",
            classification="unknown",
            confidence=0.0,
            source="user_intake_missing",
            timestamp=now,
            why_it_matters="Without a defined budget constraint, agent execution cannot safely set paid ad, tool spend, or cold inbox thresholds.",
            how_to_resolve="Select an explicit monthly capital tier (even if $0 / 'almost none') to configure safety guardrails.",
        ))
    else:
        facts.append(ClassifiedFact(
            key="budget_tier",
            statement=f"Declared capital budget tier is {intake.budget.replace('_', ' ')}.",
            classification="user_stated",
            confidence=1.0,
            source="user_intake_direct",
            timestamp=now,
        ))

    # 5. Customer Traction
    traction_map = {
        "none": "No current customers or users.",
        "interest_no_purchase": "Prospect interest or waitlist signups observed, but zero paid transactions.",
        "paying_customers": "Active paying customers using the product or service.",
        "repeat_customers": "Repeat, expanding, or long-term recurring customers established.",
    }
    facts.append(ClassifiedFact(
        key="customer_traction",
        statement=traction_map.get(intake.customers_today, "Unknown customer traction."),
        classification="user_stated",
        confidence=1.0,
        source="user_intake_direct",
        timestamp=now,
    ))

    # 6. Primary Goal
    if intake.goal and len(intake.goal.strip()) >= 5:
        facts.append(ClassifiedFact(
            key="primary_growth_goal",
            statement=f"Primary objective: {intake.goal.strip()}",
            classification="user_stated",
            confidence=1.0,
            source="user_intake_direct",
            timestamp=now,
        ))
    else:
        facts.append(ClassifiedFact(
            key="primary_growth_goal",
            statement="Primary immediate growth objective is unstated.",
            classification="unknown",
            confidence=0.0,
            source="user_intake_missing",
            timestamp=now,
            why_it_matters="Atlas requires a concrete primary goal to prioritize pipeline tasks and orchestrator workflows.",
            how_to_resolve="State your target milestone (e.g. '10 discovery calls', '$5,000 MRR', '50 beta signups').",
        ))

    # 7. Constraints
    if intake.constraints and len(intake.constraints.strip()) >= 4:
        facts.append(ClassifiedFact(
            key="operating_constraints",
            statement=f"Stated constraints: {intake.constraints.strip()}",
            classification="user_stated",
            confidence=1.0,
            source="user_intake_direct",
            timestamp=now,
        ))
    else:
        facts.append(ClassifiedFact(
            key="operating_constraints",
            statement="No operating constraints declared.",
            classification="user_assumption",
            confidence=0.5,
            source="user_intake_unspecified",
            timestamp=now,
            why_it_matters="Operating without documented constraints assumes unlimited runway, infinite delivery bandwidth, and zero regulatory limits.",
            how_to_resolve="Specify your weekly available hours, geographical limitations, or compliance requirements.",
        ))

    # 8. Launch market
    if intake.launch_market and len(intake.launch_market.strip()) >= 2:
        facts.append(ClassifiedFact(
            key="launch_market",
            statement=f"Initial launch market: {intake.launch_market.strip()}",
            classification="user_stated",
            confidence=1.0,
            source="user_intake_direct",
            timestamp=now,
            why_it_matters="Targeting, delivery promises, compliance, and acquisition channels depend on where the business operates.",
        ))
    else:
        facts.append(ClassifiedFact(
            key="launch_market",
            statement="Initial launch market has not been declared.",
            classification="unknown",
            confidence=0.0,
            source="user_intake_missing",
            timestamp=now,
            why_it_matters="A growth plan cannot safely target customers or make delivery promises without a defined operating market.",
            how_to_resolve="Name the first city, region, or customer geography you will serve.",
        ))

    # Follow-up answers classified
    for k, v in follow_up_answers.items():
        if v is not None and str(v).strip():
            facts.append(ClassifiedFact(
                key=f"followup_{k}",
                statement=f"Follow-up {k}: {v}",
                classification="user_stated" if str(v).lower() != "undecided" else "unknown",
                confidence=0.9 if str(v).lower() != "undecided" else 0.0,
                source="user_followup_response",
                timestamp=now,
                why_it_matters="Domain parameter required for phase execution." if str(v).lower() == "undecided" else None,
                how_to_resolve="Select or calculate your estimate for this metric." if str(v).lower() == "undecided" else None,
            ))

    return facts


# -----------------------------------------------------------------------------
# Business Readiness Evaluation
# -----------------------------------------------------------------------------
def calculate_readiness_score(
    facts: list[ClassifiedFact],
    stage: PhaseType,
) -> ReadinessScore:
    """Evaluate business readiness across Foundation, Pre-Sales, and Growth phases."""
    user_stated = [f for f in facts if f.classification == "user_stated"]
    verified = [f for f in facts if f.classification == "verified"]
    assumptions = [f for f in facts if f.classification == "user_assumption"]
    unknowns = [f for f in facts if f.classification == "unknown"]

    fact_keys = {f.key: f for f in facts}

    # Criteria checks (user_stated and verified both fulfill intake requirements)
    has_name = "business_name" in fact_keys and fact_keys["business_name"].classification in ("verified", "user_stated")
    has_value_prop = "value_proposition" in fact_keys and fact_keys["value_proposition"].classification != "unknown"
    has_budget = "budget_tier" in fact_keys and fact_keys["budget_tier"].classification in ("verified", "user_stated")
    has_goal = "primary_growth_goal" in fact_keys and fact_keys["primary_growth_goal"].classification in ("verified", "user_stated")
    traction = fact_keys.get("customer_traction")
    has_customers = traction and traction.statement not in ["No current customers or users.", "Unknown customer traction."]

    # Phase 1: Foundation Readiness
    foundation_points = 0
    if has_name: foundation_points += 25
    if has_value_prop: foundation_points += 35
    if has_budget: foundation_points += 20
    if has_goal: foundation_points += 20
    foundation_score = min(100, foundation_points)

    # Phase 2: Pre-Sales Readiness
    presales_points = int(foundation_score * 0.4)
    if has_value_prop and fact_keys["value_proposition"].classification == "user_assumption":
        presales_points += 20
    if traction and "interest_no_purchase" in traction.statement:
        presales_points += 25
    elif has_customers:
        presales_points += 30
    if any(k.startswith("followup_") for k in fact_keys):
        presales_points += 15
    presales_score = min(100, presales_points)

    # Phase 3: Growth & Optimization Readiness
    growth_points = int(presales_score * 0.3)
    if has_customers:
        growth_points += 40
        if traction and "repeat_customers" in traction.statement:
            growth_points += 25
    if has_budget and fact_keys["budget_tier"].statement not in ["almost none", "undecided"]:
        growth_points += 15
    growth_score = min(100, growth_points)

    phase_scores = {
        "foundation": foundation_score,
        "presales_readiness": presales_score,
        "growth_optimization": growth_score,
    }

    # Overall score weighted by selected phase
    target_score = phase_scores.get(stage, foundation_score)

    critical_gaps = [
        f"{u.key.replace('_', ' ').title()}: {u.why_it_matters}"
        for u in unknowns if u.why_it_matters
    ]

    summary = (
        f"Foundation Readiness: {foundation_score}%, "
        f"Pre-Sales Readiness: {presales_score}%, "
        f"Growth Readiness: {growth_score}%. "
        f"{len(user_stated)} user-stated facts, {len(verified)} verified facts, {len(assumptions)} assumptions, {len(unknowns)} unknowns."
    )

    return ReadinessScore(
        overall_score=target_score,
        phase_scores=phase_scores,
        user_stated_count=len(user_stated),
        verified_count=len(verified),
        assumption_count=len(assumptions),
        unknown_count=len(unknowns),
        summary=summary,
        critical_gaps=critical_gaps,
    )


# -----------------------------------------------------------------------------
# Onboarding Session Management
# -----------------------------------------------------------------------------
def initialize_or_resume_session(
    session_id: str | None = None,
    core_answers: CoreIntakeAnswers | None = None,
    force_fallback: bool = False,
    storage_backend: str = "local",
    storage_fallback: bool = False,
) -> OnboardingSession:
    """Create a new onboarding session or initialize with given core intake answers."""
    core = core_answers or CoreIntakeAnswers()
    follow_ups_result = generate_adaptive_follow_ups(core, force_fallback=force_fallback)
    facts = classify_business_facts(core)
    readiness = calculate_readiness_score(facts, core.stage)

    return OnboardingSession(
        session_id=session_id or f"onboard_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{core.business_type[:4]}",
        core_answers=core,
        follow_ups=follow_ups_result.questions,
        classified_facts=facts,
        readiness=readiness,
        is_fallback_active=follow_ups_result.is_fallback,
        storage_backend=storage_backend,
        storage_fallback=storage_fallback,
    )


def update_session_answers(
    session: OnboardingSession,
    core_answers: CoreIntakeAnswers | None = None,
    follow_up_answers: dict[str, Any] | None = None,
    stage_override: PhaseType | None = None,
) -> OnboardingSession:
    """Autosave handler updating answers, recalculating facts and readiness."""
    if core_answers:
        session.core_answers = core_answers
    if stage_override:
        session.core_answers.stage = stage_override
    if follow_up_answers:
        session.follow_up_answers.update(follow_up_answers)

    session.classified_facts = classify_business_facts(session.core_answers, session.follow_up_answers)
    session.readiness = calculate_readiness_score(session.classified_facts, session.core_answers.stage)
    session.updated_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return session
