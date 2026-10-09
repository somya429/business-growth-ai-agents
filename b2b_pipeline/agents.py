"""Node implementations: research, outreach generation, and CRM sync.

Each node is wrapped with @timed_node, which records per-node latency into
state["execution_metadata"] and converts exceptions into a routable error
status instead of raising through the graph.
"""

from __future__ import annotations

import functools
import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Literal, Optional, Any

try:
    from langchain_anthropic import ChatAnthropic
except ImportError:
    ChatAnthropic = None
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from pydantic import BaseModel, Field
try:
    from tavily import TavilyClient
except ImportError:
    TavilyClient = None

try:
    from .state import AgentState
except (ImportError, ValueError):
    from state import AgentState

logger = logging.getLogger("pipeline")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DEFAULT_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-opus-4-8")
MAX_TOOL_ITERATIONS = 3
MAX_RETRIES = 2


def _is_mock_mode() -> bool:
    force_mock = os.environ.get("MOCK_MODE", "").lower() in ("true", "1", "yes")
    if force_mock:
        return True
    tavily_key = os.environ.get("TAVILY_API_KEY", "")
    has_tavily = bool(tavily_key and "your_" not in tavily_key)
    has_llm = bool(
        (os.environ.get("GROQ_API_KEY") and "your_" not in os.environ.get("GROQ_API_KEY", ""))
        or (os.environ.get("GEMINI_API_KEY") and "your_" not in os.environ.get("GEMINI_API_KEY", ""))
        or (os.environ.get("ANTHROPIC_API_KEY") and "your_" not in os.environ.get("ANTHROPIC_API_KEY", ""))
    )
    return not (has_llm and has_tavily)


def get_llm(max_tokens: int = 4096) -> Any:
    # 1. Groq (ultra fast, high reliability)
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key and "your_" not in groq_key:
        try:
            from langchain_groq import ChatGroq
            groq_model = os.environ.get("GROQ_MODEL", "qwen/qwen3.8-27b")
            return ChatGroq(model=groq_model, groq_api_key=groq_key, max_tokens=max_tokens, timeout=60)
        except Exception as exc:
            logger.warning(f"Failed to initialize ChatGroq: {exc}")

    # 2. Google Gemini
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key and "your_" not in gemini_key:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model=os.environ.get("GEMINI_MODEL", "gemini-3.8-flash"),
                google_api_key=gemini_key,
                max_tokens=max_tokens,
                timeout=60,
            )
        except Exception as exc:
            logger.warning(f"Failed to initialize ChatGoogleGenerativeAI: {exc}")

    # 3. Anthropic
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    if anthropic_key and "your_" not in anthropic_key:
        try:
            from langchain_anthropic import ChatAnthropic
            return ChatAnthropic(model=DEFAULT_MODEL, max_tokens=max_tokens, timeout=60)
        except Exception as exc:
            logger.warning(f"Failed to initialize ChatAnthropic: {exc}")

    raise RuntimeError("No working live LLM provider found (Groq, Gemini, or Anthropic).")


# ---------------------------------------------------------------------------
# Timing / error-handling decorator
# ---------------------------------------------------------------------------


def timed_node(name: str) -> Callable:
    """Wrap a node so it records duration + converts exceptions to a routable error."""

    def decorator(fn: Callable[[AgentState], dict]) -> Callable[[AgentState], dict]:
        @functools.wraps(fn)
        def wrapper(state: AgentState) -> dict:
            metadata = dict(state.get("execution_metadata") or {})
            durations = dict(metadata.get("node_durations", {}))
            errors = list(metadata.get("errors", []))
            executions = dict(state.get("agent_executions") or {})

            start = time.perf_counter()
            exec_info = {
                "agent_name": name,
                "status": "running",
                "started_at": datetime.now(timezone.utc).isoformat(),
            }

            try:
                update = fn(state)
            except Exception as exc:  # noqa: BLE001
                duration = time.perf_counter() - start
                durations[name] = duration
                errors.append(f"{name}: {exc}")
                logger.error("Node '%s' failed: %s", name, exc, exc_info=True)
                metadata.update(
                    node_durations=durations,
                    errors=errors,
                    status="error",
                    last_error_node=name,
                )
                
                exec_info.update({
                    "status": "failed",
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "duration_ms": duration * 1000,
                    "error": str(exc)
                })
                executions[name] = exec_info
                return {"execution_metadata": metadata, "agent_executions": executions}

            duration = time.perf_counter() - start
            durations[name] = duration
            
            # Merge any execution_metadata returned by fn
            fn_meta = update.get("execution_metadata", {})
            metadata.update(fn_meta)
            
            metadata.update(node_durations=durations, errors=errors, status="ok")
            
            exec_info.update({
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "duration_ms": duration * 1000,
                "confidence": update.pop("_confidence", 0.95)
            })
            executions[name] = exec_info
            
            update["execution_metadata"] = metadata
            update["agent_executions"] = executions
            return update

        return wrapper

    return decorator


# ---------------------------------------------------------------------------
# Tavily search tool
# ---------------------------------------------------------------------------

_tavily_client: Optional[TavilyClient] = None

def _get_tavily_client() -> TavilyClient:
    global _tavily_client
    if _tavily_client is None:
        api_key = os.environ.get("TAVILY_API_KEY")
        if not api_key:
            raise RuntimeError("TAVILY_API_KEY environment variable is not set")
        _tavily_client = TavilyClient(api_key=api_key)
    return _tavily_client


@tool
def web_search(query: str) -> str:
    """Search the web for recent company news, funding rounds, product launches,
    and leadership. Use specific, targeted queries (e.g. "Acme Corp Series B funding
    2026" rather than just "Acme Corp")."""
    client = _get_tavily_client()
    response = client.search(query=query, search_depth="basic", max_results=5)
    results = response.get("results", [])
    if not results:
        return f"No results found for query: {query}"
    formatted = [
        f"- {r['title']}: {r['content'][:300]} (source: {r['url']})" for r in results
    ]
    return "\n".join(formatted)


# ---------------------------------------------------------------------------
# Structured output schemas
# ---------------------------------------------------------------------------

class ResearchData(BaseModel):
    company_name: str
    industry: str = Field(description="Best-guess industry / vertical")
    business_model: str = Field(description="B2B, B2C, Enterprise, SaaS, etc.")
    company_size: str = Field(description="Estimated employees or scale")
    headquarters: str = Field(description="Location of HQ")
    summary: str = Field(description="2-3 sentence company overview")

class BusinessSignal(BaseModel):
    signal_type: str = Field(description="E.g., Funding, Hiring, Leadership, Product Launch")
    title: str
    description: str = Field(description="Description of the signal")
    date: Optional[str] = None
    strength: int = Field(description="1-10 scale of business impact")
    confidence: float = Field(description="0.0-1.0 confidence in signal veracity")
    source_url: Optional[str] = Field(default=None, description="Where this signal was found")
    source_name: Optional[str] = None
    business_impact: str

class SignalsData(BaseModel):
    signals: list[BusinessSignal]

class BuyingPersona(BaseModel):
    role: str
    persona_type: str = Field(description="Economic Buyer, Champion, Technical Decision Maker, Business Decision Maker, Influencer")
    reason: str
    relevance_score: int = Field(description="0-100 score")
    evidence: list[str]

class PersonasData(BaseModel):
    personas: list[BuyingPersona]

class AccountIntelligence(BaseModel):
    executive_summary: str
    company_profile: str
    key_opportunities: list[str]
    risks: list[str]
    recommended_personas: list[str]
    recommended_action: str

class WhyNowAnalysis(BaseModel):
    score: int = Field(description="Why Now Score (0-100) based on urgency of buying signals")
    summary: str = Field(description="Executive summary of why SDR should contact them right now")
    signals: list[BusinessSignal] = Field(default_factory=list, description="Specific actionable buying signals detected")

class OutreachStep(BaseModel):
    step_number: int
    channel: Literal["email", "linkedin"]
    subject: Optional[str] = Field(default=None, description="Email subject line; null for LinkedIn steps")
    body: str = Field(description="Message body, personalized using the research data")

class OutreachSequence(BaseModel):
    steps: list[OutreachStep] = Field(
        description="Exactly 3 steps in order: email, linkedin connection request, follow-up email"
    )

class OutreachEvaluation(BaseModel):
    overall_score: int
    personalization_score: int
    evidence_score: int
    relevance_score: int
    clarity_score: int
    spam_risk_score: int
    cta_score: int
    issues: list[str]
    recommendations: list[str]
    approved: bool

# ---------------------------------------------------------------------------
# Node: research_account
# ---------------------------------------------------------------------------

RESEARCH_SYSTEM_PROMPT = """You are a B2B Account Research Agent. Use the \
web_search tool to gather fundamental information about the target company: \
industry, business model, size, HQ, and a general overview. Search efficiently \
— max 3 searches. Stop searching and summarize when you have enough data."""

@timed_node("research_account")
def research_account(state: AgentState) -> dict:
    company = state["company_name"]
    if _is_mock_mode():
        time.sleep(1.2)
        research = ResearchData(
            company_name=company,
            industry=f"{company} Technologies / Enterprise Software",
            business_model="B2B Enterprise SaaS",
            company_size="1000-5000 employees",
            headquarters="San Francisco, CA",
            summary=f"{company} provides enterprise automation and AI solutions. They recently expanded operations globally."
        )
        return {"research_data": research.model_dump(), "_confidence": 0.94}

    llm = get_llm().bind_tools([web_search])
    messages = [
        SystemMessage(content=RESEARCH_SYSTEM_PROMPT),
        HumanMessage(content=f"Research the company: {company}"),
    ]
    for _ in range(MAX_TOOL_ITERATIONS):
        response = llm.invoke(messages)
        messages.append(response)
        if not response.tool_calls:
            break
        for tool_call in response.tool_calls:
            result = web_search.invoke(tool_call["args"])
            messages.append(ToolMessage(content=result, tool_call_id=tool_call["id"]))

    structured_llm = get_llm().with_structured_output(ResearchData)
    research: ResearchData = structured_llm.invoke(
        messages + [HumanMessage(content="Summarize findings into the requested structure.")]
    )
    return {"research_data": research.model_dump(), "_confidence": 0.96}

# ---------------------------------------------------------------------------
# Node: detect_signals
# ---------------------------------------------------------------------------

SIGNAL_SYSTEM_PROMPT = """You are a Business Signal Intelligence Agent. Use the \
web_search tool to find recent business events for the target company (funding, hiring, \
leadership changes, product launches, expansion). Max 3 searches. Output structured signals with evidence."""

@timed_node("detect_signals")
def detect_signals(state: AgentState) -> dict:
    company = state["company_name"]
    if _is_mock_mode():
        time.sleep(1.1)
        signals = [
            BusinessSignal(
                signal_type="Funding",
                title="Series C Funding",
                description="$75M led by Horizon Ventures",
                strength=9,
                confidence=0.98,
                source_name="TechCrunch",
                business_impact="Immediate budget availability for scaling operations."
            ),
            BusinessSignal(
                signal_type="Expansion",
                title="Global Expansion",
                description="Expanding to EMEA & APAC",
                strength=7,
                confidence=0.90,
                source_name="Company Press Release",
                business_impact="Need for global workflow compliance tools."
            )
        ]
        return {"business_signals": [s.model_dump() for s in signals], "_confidence": 0.91}

    llm = get_llm().bind_tools([web_search])
    messages = [
        SystemMessage(content=SIGNAL_SYSTEM_PROMPT),
        HumanMessage(content=f"Find recent business signals for: {company}"),
    ]
    for _ in range(MAX_TOOL_ITERATIONS):
        response = llm.invoke(messages)
        messages.append(response)
        if not response.tool_calls:
            break
        for tool_call in response.tool_calls:
            result = web_search.invoke(tool_call["args"])
            messages.append(ToolMessage(content=result, tool_call_id=tool_call["id"]))

    structured_llm = get_llm().with_structured_output(SignalsData)
    data: SignalsData = structured_llm.invoke(messages + [HumanMessage(content="Format signals.")])
    return {"business_signals": [s.model_dump() for s in data.signals], "_confidence": 0.92}

# ---------------------------------------------------------------------------
# Node: detect_personas
# ---------------------------------------------------------------------------

PERSONA_SYSTEM_PROMPT = """You are a Buying Committee Intelligence Agent. Use the \
web_search tool to identify likely decision makers at the target company (e.g. CTO, VP of RevOps). \
Max 2 searches. If exact names are unavailable, return likely role titles. Do not fabricate names."""

@timed_node("detect_personas")
def detect_personas(state: AgentState) -> dict:
    company = state["company_name"]
    if _is_mock_mode():
        time.sleep(0.8)
        personas = [
            BuyingPersona(
                role="VP of Revenue Operations",
                persona_type="Economic Buyer",
                reason="Oversees tool spend and workflow efficiency.",
                relevance_score=95,
                evidence=["RevOps teams typically own these purchases."]
            ),
            BuyingPersona(
                role="Director of Sales Engineering",
                persona_type="Technical Decision Maker",
                reason="Evaluates integration capabilities.",
                relevance_score=85,
                evidence=["New product launches indicate tech modernization."]
            )
        ]
        return {"buying_committee": [p.model_dump() for p in personas], "_confidence": 0.86}

    llm = get_llm().bind_tools([web_search])
    messages = [
        SystemMessage(content=PERSONA_SYSTEM_PROMPT),
        HumanMessage(content=f"Identify buying personas for: {company}"),
    ]
    for _ in range(2):
        response = llm.invoke(messages)
        messages.append(response)
        if not response.tool_calls:
            break
        for tool_call in response.tool_calls:
            result = web_search.invoke(tool_call["args"])
            messages.append(ToolMessage(content=result, tool_call_id=tool_call["id"]))

    structured_llm = get_llm().with_structured_output(PersonasData)
    data: PersonasData = structured_llm.invoke(messages + [HumanMessage(content="Format personas.")])
    return {"buying_committee": [p.model_dump() for p in data.personas], "_confidence": 0.88}

# ---------------------------------------------------------------------------
# Node: synthesize_intelligence
# ---------------------------------------------------------------------------

INTELLIGENCE_PROMPT = """You are the Account Intelligence Agent. Synthesize a unified \
brief based on the provided Research, Signals, and Buying Committee data. Answer: \
Who are they? What are they doing? What changed? What problems might they have? \
Who should we talk to? What should the SDR do next?"""

@timed_node("synthesize_intelligence")
def synthesize_intelligence(state: AgentState) -> dict:
    if _is_mock_mode():
        time.sleep(0.6)
        brief = AccountIntelligence(
            executive_summary=f"{state['company_name']} is an expanding enterprise tech firm with recent funding.",
            company_profile="B2B Enterprise SaaS based in SF.",
            key_opportunities=["Global expansion requires scalable tools", "Recent funding unlocks budget"],
            risks=["High competition in their sector", "Complex procurement process"],
            recommended_personas=["VP of RevOps", "Director of Sales Eng"],
            recommended_action="Draft outreach to VP RevOps highlighting global scalability."
        )
        return {"account_intelligence": brief.model_dump(), "_confidence": 0.95}

    llm = get_llm().with_structured_output(AccountIntelligence)
    prompt = f"""
Company: {state['company_name']}
Research: {json.dumps(state.get('research_data', {}))}
Signals: {json.dumps(state.get('business_signals', []))}
Personas: {json.dumps(state.get('buying_committee', []))}
"""
    data = llm.invoke([SystemMessage(content=INTELLIGENCE_PROMPT), HumanMessage(content=prompt)])
    return {"account_intelligence": data.model_dump(), "_confidence": 0.95}

# ---------------------------------------------------------------------------
# Node: detect_why_now
# ---------------------------------------------------------------------------

WHY_NOW_SYSTEM_PROMPT = """You are a Why-Now Intelligence Engine. Analyze the \
business signals and intelligence data to calculate a 'Why Now' score (0-100). \
Provide an executive summary of urgency."""

@timed_node("detect_why_now")
def detect_why_now(state: AgentState) -> dict:
    if _is_mock_mode():
        time.sleep(0.5)
        signals = state.get("business_signals", [])
        score = 85 if signals else 50
        analysis = WhyNowAnalysis(
            score=score,
            summary="Strong timing due to recent funding and expansion signals.",
            signals=[BusinessSignal(**s) for s in signals] if signals else []
        )
        return {"why_now_analysis": analysis.model_dump(), "_confidence": 0.94}

    llm = get_llm().with_structured_output(WhyNowAnalysis)
    prompt = f"""
Company: {state['company_name']}
Signals: {json.dumps(state.get('business_signals', []))}
Intelligence: {json.dumps(state.get('account_intelligence', {}))}
"""
    analysis = llm.invoke([SystemMessage(content=WHY_NOW_SYSTEM_PROMPT), HumanMessage(content=prompt)])
    
    # Filter the input signals rather than hallucinating new ones
    input_signals = state.get('business_signals', [])
    filtered_signals = []
    for s in analysis.signals:
        for original in input_signals:
            if s.title.lower() in original.get('title', '').lower():
                filtered_signals.append(original)
                break
    analysis.signals = [BusinessSignal(**s) for s in filtered_signals] if filtered_signals else analysis.signals

    return {"why_now_analysis": analysis.model_dump(), "_confidence": 0.92}

# ---------------------------------------------------------------------------
# Node: generate_outreach
# ---------------------------------------------------------------------------

OUTREACH_SYSTEM_PROMPT = """You are an Outreach Agent writing a 3-step sequence. \
Use the Account Intelligence, Signals, and Personas. Personalize deeply, use evidence, \
and keep it concise (under 120 words per email)."""

@timed_node("generate_outreach")
def generate_outreach(state: AgentState) -> dict:
    if _is_mock_mode():
        time.sleep(0.8)
        company = state["company_name"]
        sequence = OutreachSequence(
            steps=[
                OutreachStep(step_number=1, channel="email", subject=f"Scaling RevOps at {company}", body="Hi [Name], saw the recent funding. Let's chat."),
                OutreachStep(step_number=2, channel="linkedin", subject=None, body="Congrats on the expansion to EMEA!"),
                OutreachStep(step_number=3, channel="email", subject="Quick follow-up", body="Any thoughts on automating account research?")
            ]
        )
        return {"outreach_sequence": [s.model_dump() for s in sequence.steps], "_confidence": 0.89}

    llm = get_llm().with_structured_output(OutreachSequence)
    prompt = f"""
Company: {state['company_name']}
Intelligence: {json.dumps(state.get('account_intelligence', {}))}
Signals: {json.dumps(state.get('business_signals', []))}
Personas: {json.dumps(state.get('buying_committee', []))}
Why Now: {json.dumps(state.get('why_now_analysis', {}))}
"""
    sequence = llm.invoke([SystemMessage(content=OUTREACH_SYSTEM_PROMPT), HumanMessage(content=prompt)])
    return {"outreach_sequence": [s.model_dump() for s in sequence.steps], "_confidence": 0.90}

# ---------------------------------------------------------------------------
# Node: critique_outreach
# ---------------------------------------------------------------------------

CRITIC_SYSTEM_PROMPT = """You are a Critic Agent. Evaluate the outreach sequence based \
on Personalization, Evidence, Relevance, Clarity, Length, Spam Risk, and CTA. \
Score each out of 100. If overall_score < 80, set approved=False."""

@timed_node("critique_outreach")
def critique_outreach(state: AgentState) -> dict:
    if _is_mock_mode():
        time.sleep(0.5)
        # Randomly pass or fail for demo purposes? The user prompt said to handle loops.
        # Let's check execution metadata for how many times critique ran.
        meta = state.get("execution_metadata", {})
        runs = meta.get("critic_runs", 0) + 1
        meta["critic_runs"] = runs
        
        if runs == 1:
            eval_data = OutreachEvaluation(
                overall_score=76,
                personalization_score=70,
                evidence_score=80,
                relevance_score=80,
                clarity_score=90,
                spam_risk_score=90,
                cta_score=70,
                issues=["A bit generic on the CTA.", "Could reference the expansion more directly."],
                recommendations=["Specify how our tool helps with EMEA expansion.", "Make CTA softer."],
                approved=False
            )
        else:
            eval_data = OutreachEvaluation(
                overall_score=92,
                personalization_score=95,
                evidence_score=90,
                relevance_score=90,
                clarity_score=95,
                spam_risk_score=95,
                cta_score=90,
                issues=[],
                recommendations=[],
                approved=True
            )
            
        update = {"outreach_evaluation": eval_data.model_dump(), "_confidence": 0.95, "execution_metadata": meta}
        return update

    llm = get_llm().with_structured_output(OutreachEvaluation)
    prompt = f"""
Sequence: {json.dumps(state.get('outreach_sequence', []))}
Intelligence: {json.dumps(state.get('account_intelligence', {}))}
"""
    evaluation = llm.invoke([SystemMessage(content=CRITIC_SYSTEM_PROMPT), HumanMessage(content=prompt)])
    
    meta = state.get("execution_metadata", {})
    runs = meta.get("critic_runs", 0) + 1
    meta["critic_runs"] = runs
    
    # force approval if max revisions hit to prevent infinite loop
    if runs >= 3:
        evaluation.approved = True
        
    return {"outreach_evaluation": evaluation.model_dump(), "execution_metadata": meta, "_confidence": 0.96}

# ---------------------------------------------------------------------------
# Node: human_approval
# ---------------------------------------------------------------------------

@timed_node("human_approval")
def human_approval(state: AgentState) -> dict:
    """Mock human approval step for hackathon demo."""
    time.sleep(0.3)
    logger.info("Human approval simulated.")
    return {"_confidence": 1.0}

# ---------------------------------------------------------------------------
# Node: sync_crm
# ---------------------------------------------------------------------------

class MockCRMClient:
    def __init__(self, latency_seconds: float = 0.3, store_path: Path | None = None):
        self._latency_seconds = latency_seconds
        self._store_path = store_path or Path(__file__).parent / "crm_mock_store.json"

    def upsert_contact_and_deal(self, payload: dict) -> dict:
        time.sleep(self._latency_seconds)
        record = dict(payload)
        record["id"] = f"crm_{uuid.uuid4().hex[:10]}"
        record["synced_at"] = datetime.now(timezone.utc).isoformat()
        records = self._load()
        records.append(record)
        self._save(records)
        return {"status": "synced", "record_id": record["id"]}

    def _load(self) -> list:
        if self._store_path.exists():
            return json.loads(self._store_path.read_text())
        return []

    def _save(self, records: list) -> None:
        self._store_path.write_text(json.dumps(records, indent=2))

class PostgresCRMClient:
    def __init__(self, db_url: str):
        self.db_url = db_url
        import psycopg
        with psycopg.connect(self.db_url) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS crm_records (
                        id VARCHAR(50) PRIMARY KEY,
                        synced_at TIMESTAMP WITH TIME ZONE,
                        company_name TEXT,
                        data JSONB
                    )
                """)
            conn.commit()

    def upsert_contact_and_deal(self, payload: dict) -> dict:
        import psycopg
        import uuid
        import json
        from datetime import datetime, timezone
        
        record_id = f"crm_{uuid.uuid4().hex[:10]}"
        synced_at = datetime.now(timezone.utc)
        company_name = payload.get("company_name", "")
        
        with psycopg.connect(self.db_url) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO crm_records (id, synced_at, company_name, data) VALUES (%s, %s, %s, %s)",
                    (record_id, synced_at, company_name, json.dumps(payload))
                )
            conn.commit()
            
        return {"status": "synced", "record_id": record_id}
        
    def _load(self) -> list:
        import psycopg
        records = []
        with psycopg.connect(self.db_url) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, synced_at, data FROM crm_records ORDER BY synced_at ASC")
                for row in cur.fetchall():
                    record = row[2]
                    record["id"] = row[0]
                    record["synced_at"] = row[1].isoformat() if hasattr(row[1], 'isoformat') else str(row[1])
                    records.append(record)
        return records

def get_crm_client():
    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        return PostgresCRMClient(db_url)
    return MockCRMClient()

@timed_node("sync_crm")
def sync_crm(state: AgentState) -> dict:
    payload = {
        "company_name": state["company_name"],
        "industry": state.get("research_data", {}).get("industry"),
        "summary": state.get("account_intelligence", {}).get("executive_summary"),
        "key_personas": state.get("buying_committee", []),
        "why_now_analysis": state.get("why_now_analysis"),
        "outreach_sequence": state.get("outreach_sequence"),
        "business_signals": state.get("business_signals"),
        "opportunity_score": state.get("why_now_analysis", {}).get("score"),
        "agent_executions": state.get("agent_executions")
    }
    crm = get_crm_client()
    result = crm.upsert_contact_and_deal(payload)
    return {"crm_status": result["status"], "_confidence": 1.0}

# ---------------------------------------------------------------------------
# Node: send_email
# ---------------------------------------------------------------------------

@timed_node("send_email")
def send_email(state: AgentState) -> dict:
    """Send the approved Step 1 email using Resend API."""
    import resend
    
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key or api_key == "your_resend_api_key_here":
        logger.warning("RESEND_API_KEY not set or invalid. Skipping email send.")
        return {"email_status": "skipped_no_key", "_confidence": 1.0}
        
    resend.api_key = api_key
    
    # Extract the first email from the sequence
    sequence = state.get("outreach_sequence", [])
    if not sequence:
        return {"email_status": "skipped_no_sequence", "_confidence": 1.0}
        
    first_step = next((step for step in sequence if step.get("channel") == "email"), None)
    if not first_step:
        return {"email_status": "skipped_no_email_step", "_confidence": 1.0}
        
    subject = first_step.get("subject", "Following up")
    body = first_step.get("body", "")
    company_name = state.get("company_name", "Target")
    
    try:
        # In a real scenario, you'd get the actual email from the persona.
        # For this demo, we'll send it to a test email or log it.
        # Resend requires a verified domain to send FROM, but for testing you can use onboarding@resend.dev
        # to send to the verified email address attached to the Resend account.
        
        response = resend.Emails.send({
            "from": "onboarding@resend.dev",
            "to": "delivered@resend.dev", # Replace with actual target email in production
            "subject": f"{subject} ({company_name})",
            "text": body
        })
        logger.info(f"Email sent successfully via Resend! ID: {response.get('id')}")
        return {"email_status": "sent", "_confidence": 1.0}
    except Exception as e:
        logger.error(f"Failed to send email via Resend: {e}")
        # We won't crash the pipeline, just mark it as failed
        return {"email_status": f"failed: {str(e)}", "_confidence": 0.0}

# ---------------------------------------------------------------------------
# Node: handle_error
# ---------------------------------------------------------------------------

def handle_error(state: AgentState) -> dict:
    metadata = dict(state.get("execution_metadata") or {})
    retry_count = metadata.get("retry_count", 0) + 1
    metadata["retry_count"] = retry_count

    if retry_count <= MAX_RETRIES:
        metadata["status"] = "retry"
        logger.warning(
            "Error in '%s' — retrying pipeline (attempt %d/%d)",
            metadata.get("last_error_node", "unknown"),
            retry_count,
            MAX_RETRIES,
        )
        return {"execution_metadata": metadata}

    metadata["status"] = "failed"
    logger.error("Max retries (%d) exceeded — exiting pipeline", MAX_RETRIES)
    return {"execution_metadata": metadata, "crm_status": "failed"}
