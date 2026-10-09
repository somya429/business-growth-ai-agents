"""CLI Demo Script: Runs Research -> Scoring -> Outreach on a selected lead and prints the audit trace.

Usage:
    python -m agents.demo --business saas
    python -m agents.demo --business ecommerce
    python -m agents.demo --business local_services
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from agents.research import run_research
from agents.scoring import run_scoring
from agents.outreach import run_outreach
from shared.schemas import GrowthState, KnowledgeBaseDoc, TraceEvent

DATA_DIR = Path(__file__).parent.parent / "data"
FIXTURES_DIR = Path(__file__).parent.parent / "tests" / "fixtures"

BUSINESS_MAP = {
    "saas": "saas",
    "ecommerce": "ecommerce",
    "local_services": "local_services",
    "local": "local_services",
    "agency": "local_services",
}


def load_business_state(business_key: str, data_dir: Path | None = None) -> GrowthState:
    folder_name = BUSINESS_MAP.get(business_key.lower(), business_key.lower())
    import os
    env_dir = Path(os.environ["VERITY_DATA_DIR"]) if os.environ.get("VERITY_DATA_DIR") else None
    search_dirs = [data_dir, env_dir, DATA_DIR, FIXTURES_DIR]
    
    biz_dir = None
    for d in search_dirs:
        if d and (d / folder_name).exists():
            biz_dir = d / folder_name
            break

    if not biz_dir or not biz_dir.exists():
        raise FileNotFoundError(f"Business data directory not found for key: {business_key}")

    # Load profile
    profile_path = biz_dir / "profile.json"
    profile = json.loads(profile_path.read_text(encoding="utf-8"))

    # Load KB docs
    kb_docs = []
    kb_dir = biz_dir / "kb"
    if kb_dir.exists():
        for doc_file in kb_dir.glob("*.md"):
            kb_docs.append(
                KnowledgeBaseDoc(
                    id=f"kb_{doc_file.stem}",
                    title=doc_file.stem.replace("_", " ").title(),
                    text=doc_file.read_text(encoding="utf-8"),
                ).model_dump()
            )

    # Load leads
    leads_path = biz_dir / "leads.json"
    leads = json.loads(leads_path.read_text(encoding="utf-8"))

    # Pick first high-fit lead
    selected_lead = leads[0]
    for lead in leads:
        if lead.get("status") == "new" and "opt" not in lead.get("email", ""):
            selected_lead = lead
            break

    state: GrowthState = {
        "profile": profile,
        "kb_docs": kb_docs,
        "lead": selected_lead,
        "facts": [],
        "trace": [],
    }
    return state


def run_demo(business_key: str) -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    print("=" * 80)
    print(f"[*] MULTI-AGENT PIPELINE DEMO: Business [{business_key.upper()}]")
    print("=" * 80)

    state = load_business_state(business_key)
    profile = state["profile"]
    lead = state["lead"]

    print(f"\n[BUSINESS PROFILE] {profile['name']} ({profile['industry']})")
    print(f"[TARGET LEAD]      {lead['name']} | {lead['role']} @ {lead['company']}")
    print(f"[EMAIL]            {lead['email']}")
    print("-" * 80)

    # Step 1: Research Agent
    print("\n[1/3] Executing Research Agent...")
    state = run_research(state)
    facts = state.get("facts", [])
    print(f"      Verified Facts Found: {len(facts)}")
    for f in facts:
        print(f"      - [{f.get('id')}]: {f.get('statement')} (Source: {f.get('source')}, Conf: {f.get('confidence')})")

    # Step 2: Scoring Agent
    print("\n[2/3] Executing Scoring & Timing Agent...")
    state = run_scoring(state)
    score_data = state.get("score", {})
    print(f"      Score:     {score_data.get('score')}/100")
    print(f"      Decision:  {score_data.get('decision')}")
    print(f"      Reason:    {score_data.get('reason')}")
    print(f"      Breakdown: {score_data.get('breakdown')}")

    # Step 3: Outreach Agent
    print("\n[3/3] Executing Outreach Agent...")
    state = run_outreach(state)
    draft = state.get("draft")

    if draft:
        print("\n[GENERATED OUTREACH DRAFT] (Awaiting Human Approval):")
        print("+" + "-" * 78 + "+")
        print(f"  Channel:     {draft.get('channel')}")
        print(f"  Subject:     {draft.get('subject')}")
        print(f"  Claims Used: {draft.get('claims_used')}")
        print("+" + "-" * 78 + "+")
        print("  BODY:")
        for line in draft.get("body", "").splitlines():
            print(f"    {line}")
        print("+" + "-" * 78 + "+")
    else:
        print("\n[!] No draft generated (outreach was withheld based on score/policy).")

    # Print Trace Audit
    print("\n" + "=" * 80)
    print("[AUDIT TRAIL / TRACE EVENTS] (Full System Transparency)")
    print("=" * 80)
    trace = state.get("trace", [])
    for idx, t in enumerate(trace, 1):
        event = TraceEvent.model_validate(t) if isinstance(t, dict) else t
        print(f"\n[{idx}] Agent: {event.agent.upper()} | Step: {event.step}")
        print(f"    Timestamp: {event.timestamp}")
        print(f"    Input:     {event.input_summary}")
        print(f"    Output:    {event.output_summary}")
        print(f"    Why:       {event.reason}")

    print("\n" + "=" * 80)
    print("[OK] PIPELINE EXECUTION COMPLETE: Nothing leaves unverified.")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Growth Agents Pipeline Demo")
    parser.add_argument(
        "--business",
        choices=["saas", "ecommerce", "local_services"],
        default="saas",
        help="Sample business profile to execute (saas, ecommerce, local_services)",
    )
    args = parser.parse_args()
    run_demo(args.business)
