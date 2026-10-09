"""Command-Line Interface (CLI) for running and resuming Growth Agents pipelines."""

from __future__ import annotations

import argparse
import json
import logging
import sys

from core.service import (
    get_review_payload,
    get_run,
    get_trace,
    start_run,
    submit_approval,
)
from shared.schemas import ApprovalDecision

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("core.run")


def print_banner(title: str) -> None:
    print("\n" + "=" * 80)
    print(f"[*] {title.upper()}")
    print("=" * 80)


def print_review_details(payload: dict) -> None:
    draft = payload.get("draft")
    trust = payload.get("trust_report")
    policy = payload.get("policy_result")
    banner = payload.get("failed_trust_banner")

    if banner:
        print("\n" + "!" * 80)
        print(" [WARNING] FAILED TRUST AUDIT BANNER: Draft reached retry cap and failed trust verification.")
        print("!" * 80)

    if draft:
        print("\n--- OUTREACH DRAFT FOR REVIEW ---")
        print(f"Channel:     {draft.get('channel')}")
        print(f"Subject:     {draft.get('subject')}")
        print(f"Claims Used: {draft.get('claims_used')}")
        print("\nMessage Body:")
        for line in draft.get("body", "").splitlines():
            print(f"  {line}")

    if trust:
        print("\n--- TRUST AUDIT REPORT ---")
        print(f"Overall Score: {trust.get('overall_score')}/100 | Verdict: {trust.get('verdict')}")
        flags = trust.get("flags", [])
        if flags:
            print(f"Flags ({len(flags)}):")
            for idx, f in enumerate(flags, 1):
                print(f"  {idx}. [{f.get('severity').upper()}] {f.get('category')}: {f.get('reason')}")
                print(f"     Text: \"{f.get('sentence_text')}\" (Status: {f.get('status')})")
        else:
            print("No safety or commitment flags detected.")

    if policy:
        print("\n--- POLICY ENGINE RESULT ---")
        print(f"Compliance Passed: {policy.get('passed')}")
        violations = policy.get("violations", [])
        if violations:
            print(f"Violations ({len(violations)}):")
            for v in violations:
                print(f"  - {v.get('rule')}: {v.get('detail')}")
        if policy.get("required_edits"):
            print(f"Required Edits: {policy.get('required_edits')}")


def print_trace_events(run_id: str) -> None:
    traces = get_trace(run_id)
    print("\n" + "=" * 80)
    print(f"[AUDIT TRAIL] ({len(traces)} events for run {run_id})")
    print("=" * 80)
    for idx, t in enumerate(traces, 1):
        print(f"\n[{idx}] {t.agent.upper()} -> {t.step}")
        print(f"    Time:   {t.timestamp}")
        print(f"    Input:  {t.input_summary}")
        print(f"    Output: {t.output_summary}")
        print(f"    Why:    {t.reason}")


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="Growth Agents Pipeline Orchestration CLI")
    parser.add_argument("--business", default="saas", help="Target business (saas, ecommerce, local_services)")
    parser.add_argument("--lead", default=None, help="Target lead ID")
    parser.add_argument("--auto-approve", action="store_true", help="Auto-approve draft when human review pauses")
    parser.add_argument("--resume", default=None, help="Run ID to resume from human review")
    parser.add_argument(
        "--decision",
        choices=["approve", "edit", "reject"],
        default="approve",
        help="Approval decision when resuming (approve, edit, reject)",
    )
    parser.add_argument("--notes", default="", help="Reviewer notes for approval record")
    parser.add_argument("--edited-body", default=None, help="Edited text body if decision is 'edit'")
    args = parser.parse_args()

    if args.resume:
        run_id = args.resume
        print_banner(f"Resuming Run {run_id} with Decision: {args.decision}")
        decision = ApprovalDecision(
            decision=args.decision,
            edited_body=args.edited_body,
            reviewer="cli_reviewer",
            notes=args.notes or "Resumed via CLI",
        )
        run_state = submit_approval(run_id, decision)
        print(f"\nFinal Run Status: {run_state.get('status')}")
        mock_send = run_state.get("state_summary", {}).get("mock_send_result")
        if mock_send:
            print(f"Simulated Dispatch: Sent to {mock_send.get('to')} via {mock_send.get('channel')}")
        print_trace_events(run_id)
        return

    # Start new run
    print_banner(f"Starting Growth Pipeline: Business [{args.business.upper()}]")
    run_id = start_run(args.business, args.lead)
    run_state = get_run(run_id)

    print(f"\nRun ID: {run_id}")
    print(f"Current Status: {run_state.get('status')}")

    if run_state.get("status") == "waiting_for_human":
        payload = get_review_payload(run_id)
        print_review_details(payload)

        if args.auto_approve:
            print("\n[*] --auto-approve enabled: Submitting approval automatically...")
            decision = ApprovalDecision(
                decision="approve",
                reviewer="cli_auto_approver",
                notes="Automated approval granted via --auto-approve flag",
            )
            resumed_state = submit_approval(run_id, decision)
            print(f"\nResumed Run Status: {resumed_state.get('status')}")
            mock_send = resumed_state.get("state_summary", {}).get("mock_send_result")
            if mock_send:
                print(f"Simulated Dispatch: Sent to {mock_send.get('to')} via {mock_send.get('channel')}")
        else:
            print(f"\nTo approve or resume this run, run:")
            print(f"  python -m core.run --resume {run_id} --decision approve")
            print(f"  python -m core.run --resume {run_id} --decision reject")

    print_trace_events(run_id)
    print("\n[OK] Pipeline processing complete.\n")


if __name__ == "__main__":
    main()
