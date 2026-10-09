"""Stub Trust Auditor for Member 3 interface."""

from __future__ import annotations

import logging
import os
import re
from typing import Any
import uuid

from shared.schemas import Draft, Flag, GrowthState, TrustReport

logger = logging.getLogger("core.stubs.trust")


def _split_into_sentences(text: str) -> list[tuple[str, int, int]]:
    """Split text into sentences with start and end character offsets."""
    sentences = []
    # Match sentences ending with . ! ? or newlines
    for match in re.finditer(r"([^.!?\n]+[.!?\n]*)", text):
        sentence = match.group(0).strip()
        if sentence:
            sentences.append((sentence, match.start(), match.end()))
    return sentences


def audit_stub(
    draft: dict[str, Any] | Draft,
    business_id: str,
    state: GrowthState | dict[str, Any],
) -> TrustReport:
    """Deterministic fake trust audit.

    Rules:
    - Flags any sentence containing 'guaranteed' or 'guarantee' (risky_commitment).
    - Flags planted bad claims like 'fssai', 'organic', 'certified organic' (unsupported_claim).
    - Flags planted wrong prices/pricing discrepancies (number_mismatch).
    - Flags any claim_used in draft that is not found in verified facts or KB.
    """
    d_dict = draft.model_dump() if hasattr(draft, "model_dump") else draft
    body = d_dict.get("body", "")
    claims_used = d_dict.get("claims_used", [])

    # Collect all verified fact IDs from state
    facts = state.get("facts", [])
    valid_fact_ids = set()
    for f in facts:
        fid = f.get("id") if isinstance(f, dict) else getattr(f, "id", None)
        if fid:
            valid_fact_ids.add(fid.lower())

    # Also include approved KB claims
    kb_docs = state.get("kb_docs", [])
    for doc in kb_docs:
        d_title = doc.get("title", "") if isinstance(doc, dict) else getattr(doc, "title", "")
        d_text = doc.get("text", "") if isinstance(doc, dict) else getattr(doc, "text", "")
        if "approved" in d_title.lower() and "unapproved" not in d_title.lower():
            for line in d_text.splitlines():
                m = re.search(r"\[(CLAIM-[^\]]+)\]", line)
                if m:
                    valid_fact_ids.add(m.group(1).lower().replace("-", "_"))

    flags: list[Flag] = []
    sentences = _split_into_sentences(body)

    for sentence, start, end in sentences:
        s_lower = sentence.lower()

        # 1. Guarantee check
        if "guarantee" in s_lower or "guaranteed" in s_lower:
            flags.append(
                Flag(
                    id=f"flag_{uuid.uuid4().hex[:8]}",
                    category="risky_commitment",
                    sentence_text=sentence,
                    start=start,
                    end=end,
                    reason="Draft contains unverified absolute guarantee or contractual commitment.",
                    severity="high",
                    status="open",
                )
            )

        # 2. Planted unsupported certification claim check
        if any(w in s_lower for w in ["fssai", "certified organic", "100% organic", "unsupported certification"]):
            flags.append(
                Flag(
                    id=f"flag_{uuid.uuid4().hex[:8]}",
                    category="unsupported_claim",
                    sentence_text=sentence,
                    start=start,
                    end=end,
                    reason="Planted unverified regulatory or certification claim found.",
                    severity="high",
                    status="open",
                )
            )

        # 3. Planted numerical / pricing mismatch
        if any(w in s_lower for w in ["wrong price", "delivery in 2 days", "$9.99", "free forever"]):
            flags.append(
                Flag(
                    id=f"flag_{uuid.uuid4().hex[:8]}",
                    category="number_mismatch",
                    sentence_text=sentence,
                    start=start,
                    end=end,
                    reason="Discrepancy between stated numerical terms and verified offering facts.",
                    severity="high",
                    status="open",
                )
            )

    # 4. Check claims_used vs verified facts
    claim_verdicts = []
    for claim in claims_used:
        c_str = str(claim).lower()
        if c_str in valid_fact_ids or c_str.startswith("fact_") and len(valid_fact_ids) == 0:
            claim_verdicts.append(
                {"claim": claim, "verdict": "SUPPORTED", "evidence": "Corroborated by research facts"}
            )
        else:
            claim_verdicts.append(
                {"claim": claim, "verdict": "NOT_FOUND", "evidence": "Not present in verified facts database"}
            )
            flags.append(
                Flag(
                    id=f"flag_{uuid.uuid4().hex[:8]}",
                    category="unsupported_claim",
                    sentence_text=f"Cited Claim: {claim}",
                    start=0,
                    end=0,
                    reason=f"Claim ID '{claim}' is cited in draft but has no backing in verified facts.",
                    severity="high",
                    status="open",
                )
            )

    report = TrustReport(flags=flags, claim_verdicts=claim_verdicts)
    report.recompute_score()
    return report


def audit(
    draft: dict[str, Any] | Draft,
    business_id: str,
    state: GrowthState | dict[str, Any],
) -> TrustReport:
    """Entry point for Trust Auditor, switching between stub and real implementation."""
    impl = os.environ.get("TRUST_IMPL", "stub").lower()
    if impl == "real":
        try:
            from trust.auditor import audit as real_audit
            return real_audit(draft, business_id, state)
        except ImportError:
            logger.warning("Real Trust Auditor not found at trust.auditor; using stub instead.")

    return audit_stub(draft, business_id, state)
