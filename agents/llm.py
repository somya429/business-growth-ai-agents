"""LLM wrapper module supporting gemini, groq, ollama, and mock providers.

Guarantees structured output parsing into Pydantic models with retry
and exponential backoff on rate limits.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import TypeVar, get_args, get_origin
from pathlib import Path
from pydantic import BaseModel, ValidationError

logger = logging.getLogger("agents.llm")

T = TypeVar("T", bound=BaseModel)


def _load_env_if_present() -> None:
    """Auto-load variables from .env file if it exists."""
    candidates = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parent.parent / ".env",
    ]
    for env_file in candidates:
        if env_file.is_file():
            try:
                for line in env_file.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
            except Exception:
                pass
            break

    # If grok key has gsk_ prefix, it is a Groq Cloud key
    grok_key = os.environ.get("GROK_API_KEY", "")
    if grok_key.startswith("gsk_") and not os.environ.get("GROQ_API_KEY"):
        os.environ["GROQ_API_KEY"] = grok_key


# Ensure .env is loaded on module import
_load_env_if_present()

# Default models per provider
DEFAULT_MODELS = {
    "gemini": os.environ.get("GEMINI_MODEL", "gemini-3.8-flash"),
    "grok": os.environ.get("GROK_MODEL", "grok-2-latest"),
    "groq": os.environ.get("GROQ_MODEL", "qwen/qwen3.8-27b"),
    "ollama": os.environ.get("OLLAMA_MODEL", "llama3.2"),
    "mock": "mock-deterministic",
}


def _clean_json_text(text: str) -> str:
    """Strip markdown code block fences and extract valid json string."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        return match.group(1).strip()
    # If no markdown block, extract between first { and last }
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        return text[first_brace : last_brace + 1].strip()
    return text


def _generate_mock_response(prompt: str, schema: type[T]) -> T:
    """Return deterministic, valid mock fixture for tests and offline runs."""
    from shared.schemas import (
        Fact,
        LeadScore,
        Draft,
        ContentPiece,
        ReplyAnalysis,
        LearningInsight,
        CampaignReport,
    )

    schema_name = schema.__name__

    # If schema is a container for facts
    if schema_name == "ResearchFactsOutput":
        # Check prompt for lead context
        facts = [
            Fact(
                id="fact_001",
                statement="Prospect is expanding sales engineering team based on verified job posting.",
                source="Company Careers Page",
                source_date="2026-09-15",
                confidence=0.92,
                kind="company",
            ),
            Fact(
                id="fact_002",
                statement="Enterprise account has 150-250 employees and fits verified ICP criteria.",
                source="Verified Company Profile",
                source_date="2026-09-10",
                confidence=0.95,
                kind="company",
            ),
            Fact(
                id="fact_003",
                statement="Verified product capability: Integrates in under 15 minutes with zero downtime.",
                source="KB Product Sheet",
                source_date="2026-08-01",
                confidence=0.98,
                kind="kb",
            ),
        ]
        return schema(facts=facts)  # type: ignore

    if schema_name == "LeadScore":
        prompt_lower = prompt.lower()
        if "data is stale" in prompt_lower or "stale lead" in prompt_lower or "status: stale" in prompt_lower:
            return schema(
                score=42,
                breakdown={"fit": 0.6, "intent": 0.3, "freshness": 0.2, "source_quality": 0.4},
                decision="RESEARCH_MORE",
                reason="Fit is moderate but key intent signals are stale. Further research required before outreach.",
                recheck_after="14 days",
            )
        if "opted_out" in prompt_lower or "do not solicit" in prompt_lower:
            return schema(
                score=0,
                breakdown={"fit": 0.0, "intent": 0.0, "freshness": 0.0, "source_quality": 0.0},
                decision="REJECT",
                reason="Lead or company domain is listed on active opt-out list.",
                recheck_after=None,
            )
        return schema(
            score=88,
            breakdown={"fit": 0.92, "intent": 0.85, "freshness": 0.90, "source_quality": 0.94},
            decision="ACT",
            reason="High ICP fit, verified active expansion, fresh evidence from first-party sources.",
            recheck_after=None,
        )

    if schema_name == "Draft":
        # Extract fact ids present in prompt if any
        found_fact_ids = re.findall(r"fact_[a-zA-Z0-9_-]+", prompt)
        claims = found_fact_ids[:2] if found_fact_ids else ["fact_001", "fact_003"]
        return schema(
            subject="Quick question regarding your engineering expansion",
            body=(
                "Noticed your team is scaling sales engineering.\n\n"
                "Our platform integrates in under 15 minutes with zero downtime, "
                "helping growing teams ramp new hires without pipeline disruption.\n\n"
                "Worth a brief 10-minute conversation next week?\n\n"
                "Reply 'STOP' at any time to opt out of future emails."
            ),
            channel="email",
            claims_used=claims,
            lead_id="lead_test_01",
        )

    if schema_name == "ContentPiece":
        found_fact_ids = re.findall(r"fact_[a-zA-Z0-9_-]+", prompt)
        claims = found_fact_ids[:2] if found_fact_ids else ["fact_003"]
        return schema(
            title="How Scaling Teams Integrate Infrastructure in 15 Minutes",
            body=(
                "When scaling engineering teams, system downtime stalls momentum. "
                "By adopting verified fast-integration workflows that install in under 15 minutes, "
                "teams preserve velocity while expanding capacity."
            ),
            channel="blog",
            claims_used=claims,
        )

    if schema_name == "ReplyAnalysis":
        reply_part = prompt
        if "Message History / Received Reply" in prompt:
            reply_part = prompt.split("Message History / Received Reply")[-1]
            if "Prior Outreach Context" in reply_part:
                reply_part = reply_part.split("Prior Outreach Context")[0]

        reply_lower = reply_part.lower()
        if any(w in reply_lower for w in ["unsubscribe", "remove me", "stop", "opt out", "opt-out"]):
            return schema(
                intent="unsubscribe",
                next_action="remove_from_sequence_and_opt_out",
                escalate_to_human=True,
                reason="Lead explicitly requested unsubscription.",
                draft_reply=None,
            )
        if any(w in reply_lower for w in ["price", "discount", "contract", "quote", "cost", "legal", "refund", "complaint"]):
            return schema(
                intent="pricing_or_contract",
                next_action="handoff_to_account_team",
                escalate_to_human=True,
                reason="Inquiry involves commercial pricing or contract terms requiring human authority.",
                draft_reply=None,
            )
        if any(w in reply_lower for w in ["interested", "let's talk", "sounds good", "connect", "tuesday", "call"]):
            return schema(
                intent="interested",
                next_action="share_calendar_link",
                escalate_to_human=False,
                reason="Positive buying signal with interest in meeting.",
                draft_reply="Glad to hear! Here is a calendar link to pick a 15-minute slot that fits your schedule.",
            )
        return schema(
            intent="question",
            next_action="answer_clarification",
            escalate_to_human=False,
            reason="Prospect asked a technical or general product clarification.",
            draft_reply="Thanks for reaching out! We would be delighted to answer your questions.",
        )

    if schema_name == "LearningAnalysisOutput":
        insights = [
            LearningInsight(
                pattern="Personalized outreach referencing engineering growth converted at 2.4x baseline.",
                evidence_count=8,
                confidence=0.88,
                recommendation="Prioritize leads exhibiting active team expansion signals.",
            ),
            LearningInsight(
                pattern="Stale data leads (>60 days old) accounted for 75% of non-replies.",
                evidence_count=12,
                confidence=0.91,
                recommendation="Trigger re-verification research on leads inactive for over 30 days.",
            ),
        ]
        return schema(
            insights=insights,
            summary="Strong overall conversion driven by verified expansion signals. Stale leads must be re-researched.",
        )  # type: ignore

    if schema_name == "CampaignReport":
        return schema(
            total_outcomes=30,
            reply_rate=0.23,
            meeting_rate=0.10,
            unsubscribe_rate=0.03,
            insights=[
                LearningInsight(
                    pattern="Engineering expansion signals drive 3x meeting bookings.",
                    evidence_count=7,
                    confidence=0.85,
                    recommendation="Focus SDR capacity on scaling accounts.",
                )
            ],
            summary="Campaign outperformed benchmarks on meetings booked while maintaining low unsubscribe rate (3%).",
        )

    # Generic fallback: instantiate schema with defaults or field inspection
    fields = {}
    for name, field in schema.model_fields.items():
        if field.default is not None and not str(field.default).startswith("PydanticUndefined"):
            fields[name] = field.default
        elif field.default_factory is not None:
            fields[name] = field.default_factory()
        else:
            annotation = field.annotation
            if annotation == str:
                fields[name] = f"mock_{name}"
            elif annotation == int:
                fields[name] = 1
            elif annotation == float:
                fields[name] = 0.5
            elif annotation == bool:
                fields[name] = True
            elif get_origin(annotation) is list:
                fields[name] = []
            elif get_origin(annotation) is dict:
                fields[name] = {}
            else:
                fields[name] = None
    return schema(**fields)


def _call_gemini_live(prompt: str, schema: type[T], system: str | None, model: str) -> str:
    """Call Gemini provider with structured JSON instruction."""
    _load_env_if_present()
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required for provider 'gemini'")

    json_schema = json.dumps(schema.model_json_schema())
    full_prompt = (
        f"{system or ''}\n\n"
        f"You MUST return valid JSON adhering EXACTLY to this JSON Schema:\n{json_schema}\n\n"
        f"Input:\n{prompt}"
    )

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model,
            contents=full_prompt,
        )
        return response.text or ""
    except ImportError:
        import google.generativeai as genai_legacy
        genai_legacy.configure(api_key=api_key)
        genai_model = genai_legacy.GenerativeModel(model)
        response = genai_model.generate_content(full_prompt)
        return response.text or ""


def _call_groq_live(prompt: str, schema: type[T], system: str | None, model: str) -> str:
    """Call Groq provider with structured JSON instruction."""
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is required for provider 'groq'")

    from groq import Groq
    client = Groq(api_key=api_key)
    json_schema = json.dumps(schema.model_json_schema())
    sys_content = (
        f"{system or 'You are an accurate, verified business intelligence system.'}\n"
        f"You MUST respond ONLY with valid JSON conforming to this schema:\n{json_schema}"
    )
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": sys_content},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
    )
    return response.choices[0].message.content or ""


def _call_grok_live(prompt: str, schema: type[T], system: str | None, model: str) -> str:
    """Call xAI Grok provider with structured JSON instruction."""
    _load_env_if_present()
    api_key = os.environ.get("GROK_API_KEY") or os.environ.get("XAI_API_KEY")
    if not api_key:
        raise ValueError("GROK_API_KEY or XAI_API_KEY environment variable is required for provider 'grok'")

    from openai import OpenAI
    client = OpenAI(api_key=api_key, base_url="https://api.x.ai/v1")
    json_schema = json.dumps(schema.model_json_schema())
    sys_content = (
        f"{system or 'You are an accurate, verified business intelligence system.'}\n"
        f"You MUST respond ONLY with valid JSON conforming to this schema:\n{json_schema}"
    )
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": sys_content},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
    )
    return response.choices[0].message.content or ""


def _call_ollama_live(prompt: str, schema: type[T], system: str | None, model: str) -> str:
    """Call Ollama local model with structured schema."""
    import ollama
    json_schema = schema.model_json_schema()
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    response = ollama.chat(
        model=model,
        messages=messages,
        format=json_schema,
    )
    return response.message.content or ""


def _invoke_provider_raw(provider: str, prompt: str, schema: type[T], system: str | None, model: str) -> str:
    """Route prompt to specific live provider."""
    if provider == "gemini":
        return _call_gemini_live(prompt, schema, system, model)
    elif provider == "grok":
        # If key is a Groq Cloud key (starts with gsk_), route to groq
        if os.environ.get("GROQ_API_KEY", "").startswith("gsk_") or os.environ.get("GROK_API_KEY", "").startswith("gsk_"):
            groq_model = os.environ.get("GROQ_MODEL", DEFAULT_MODELS["groq"])
            return _call_groq_live(prompt, schema, system, groq_model)
        return _call_grok_live(prompt, schema, system, model)
    elif provider == "groq":
        return _call_groq_live(prompt, schema, system, model)
    elif provider == "ollama":
        return _call_ollama_live(prompt, schema, system, model)
    else:
        raise ValueError(f"Unknown LLM_PROVIDER: {provider}")


def call_structured(
    prompt: str,
    schema: type[T],
    system: str | None = None,
    max_retries: int = 3,
) -> T:
    """Call LLM with structured output, retrying with backoff on rate limits.

    If output fails Pydantic validation, retries once with the validation
    error feedback appended. If primary provider fails and fallback is available,
    attempts fallback provider.
    """
    _load_env_if_present()
    provider = os.environ.get("LLM_PROVIDER", "mock").lower()
    model = os.environ.get("LLM_MODEL", DEFAULT_MODELS.get(provider, "mock-deterministic"))

    if provider == "mock":
        return _generate_mock_response(prompt, schema)

    # Determine fallback provider if any
    fallback_provider = os.environ.get("LLM_FALLBACK_PROVIDER", "").lower()
    if not fallback_provider:
        if (os.environ.get("GROK_API_KEY") or os.environ.get("XAI_API_KEY")) and provider != "grok":
            fallback_provider = "grok"
        elif os.environ.get("GROQ_API_KEY") and provider != "groq":
            fallback_provider = "groq"

    providers_to_try = [provider]
    if fallback_provider and fallback_provider != provider and fallback_provider in DEFAULT_MODELS:
        providers_to_try.append(fallback_provider)

    last_error: Exception | None = None

    for active_provider in providers_to_try:
        active_model = (
            model
            if active_provider == provider
            else os.environ.get(f"{active_provider.upper()}_MODEL", DEFAULT_MODELS.get(active_provider, ""))
        )
        validation_retried = False
        current_prompt = prompt

        for attempt in range(max_retries):
            try:
                raw_text = _invoke_provider_raw(active_provider, current_prompt, schema, system, active_model)
                cleaned = _clean_json_text(raw_text)
                data = json.loads(cleaned)
                return schema.model_validate(data)

            except (json.JSONDecodeError, ValidationError) as val_err:
                logger.warning(f"[{active_provider}] Schema validation error on attempt {attempt + 1}: {val_err}")
                if not validation_retried:
                    validation_retried = True
                    current_prompt = (
                        f"{prompt}\n\n[ATTENTION: Previous response failed schema validation with error: "
                        f"{str(val_err)}. Return valid JSON matching the exact schema!]"
                    )
                    continue
                last_error = val_err

            except Exception as api_err:
                err_str = str(api_err).lower()
                is_rate_limit = any(term in err_str for term in ["429", "rate limit", "resource exhausted", "quota"])
                if is_rate_limit and attempt < max_retries - 1:
                    backoff = 2 ** attempt
                    logger.warning(f"[{active_provider}] Rate limited. Backing off {backoff}s before retry... ({api_err})")
                    time.sleep(backoff)
                    continue
                last_error = api_err
                break

        if active_provider != providers_to_try[-1]:
            logger.warning(
                f"Primary provider '{active_provider}' failed with '{last_error}'. "
                f"Switching to fallback provider '{providers_to_try[-1]}'..."
            )

    # If all configured providers failed
    logger.error(f"Structured LLM call failed for schema {schema.__name__}: {last_error}")
    raise RuntimeError(f"Failed to generate valid structured response for {schema.__name__}: {last_error}")
