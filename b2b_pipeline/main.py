"""Entry point: runs the pipeline for a company and prints a benchmark report.

Usage:
    python main.py "Acme Corp"
"""

from __future__ import annotations

import logging
import sys
import time
import uuid

try:
    from langgraph.checkpoint.sqlite import SqliteSaver
except ImportError:
    from langgraph.checkpoint.memory import MemorySaver as SqliteSaver

try:
    from langgraph.checkpoint.postgres import PostgresSaver
except ImportError:
    PostgresSaver = None

import os

try:
    from .graph import build_graph
    from .state import AgentState
except (ImportError, ValueError):
    from graph import build_graph
    from state import AgentState

BASELINE_SECONDS = 45 * 60  # manual account research, per the project's target metric

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("pipeline")


def _initial_state(company_name: str) -> AgentState:
    return {
        "company_name": company_name,
        "research_data": {},
        "outreach_sequence": [],
        "crm_status": "pending",
        "execution_metadata": {
            "node_durations": {},
            "errors": [],
            "retry_count": 0,
            "status": "ok",
        },
    }


def _print_report(company_name: str, final_state: AgentState, elapsed_seconds: float) -> None:
    metadata = final_state.get("execution_metadata", {})
    durations = metadata.get("node_durations", {})
    research = final_state.get("research_data", {})
    outreach = final_state.get("outreach_sequence", [])

    print("\n" + "=" * 64)
    print(f" ACCOUNT RESEARCH & OUTREACH PIPELINE - {company_name}")
    print("=" * 64)
    print(" Node timing breakdown:")
    for node_name, duration in durations.items():
        print(f"  * {node_name:<20} {duration:6.2f}s")
    print("-" * 64)

    failed = metadata.get("status") == "failed" or final_state.get("crm_status") == "failed"
    if failed:
        print(f" FAILED: pipeline did not complete after {elapsed_seconds:.2f}s")
        for error in metadata.get("errors", []):
            print(f"  - {error}")
    else:
        speedup = BASELINE_SECONDS / elapsed_seconds if elapsed_seconds > 0 else float("inf")
        print(
            f" SUCCESS: Account processed in {elapsed_seconds:.2f} seconds "
            f"(Optimized from 45 minutes, ~{speedup:,.0f}x faster)"
        )
        print(f" CRM status: {final_state.get('crm_status')}")

    if research:
        print("\n" + "-" * 64)
        print(" RESEARCH BRIEF")
        print("-" * 64)
        print(f" Industry:  {research.get('industry', 'N/A')}")
        print(f" Funding:   {research.get('recent_funding', 'N/A')}")
        print(f" Summary:   {research.get('summary', 'N/A')}")
        personas = research.get("key_personas", [])
        if personas:
            print("\n Key Personas:")
            for p in personas:
                print(f"  * {p.get('name')} ({p.get('title')}) - {p.get('relevance')}")

    if outreach:
        print("\n" + "-" * 64)
        print(" GENERATED 3-STEP OUTREACH SEQUENCE")
        print("-" * 64)
        for step in outreach:
            num = step.get("step_number")
            channel = step.get("channel", "").upper()
            subject = step.get("subject")
            body = step.get("body", "")
            print(f"\n [Step {num} | {channel}]")
            if subject:
                print(f" Subject: {subject}")
            print(" Body:")
            for line in body.split("\n"):
                print(f"   {line}")
    print("=" * 64 + "\n")



def run_pipeline(company_name: str) -> AgentState:
    db_url = os.environ.get("DATABASE_URL")
    
    # We define a helper so we can use either context manager
    def execute_graph(checkpointer):
        if hasattr(checkpointer, "setup"):
            checkpointer.setup()
        app = build_graph(checkpointer=checkpointer)
        config = {"configurable": {"thread_id": str(uuid.uuid4())}}

        logger.info("Starting pipeline for '%s'", company_name)
        start = time.perf_counter()
        state: AgentState = app.invoke(_initial_state(company_name), config=config)
        return state, time.perf_counter() - start

    final_state = None
    elapsed = 0.0

    if db_url and PostgresSaver is not None:
        try:
            with PostgresSaver.from_conn_string(db_url) as checkpointer:
                final_state, elapsed = execute_graph(checkpointer)
        except Exception as exc:
            logger.warning("PostgresSaver connection failed (%s), falling back to local checkpoints.", exc)

    if final_state is None:
        try:
            with SqliteSaver.from_conn_string("checkpoints.db") as checkpointer:
                final_state, elapsed = execute_graph(checkpointer)
        except Exception:
            try:
                from langgraph.checkpoint.memory import MemorySaver
                checkpointer = MemorySaver()
                final_state, elapsed = execute_graph(checkpointer)
            except Exception:
                app = build_graph()
                start = time.perf_counter()
                final_state = app.invoke(_initial_state(company_name))
                elapsed = time.perf_counter() - start

    _print_report(company_name, final_state, elapsed)
    return final_state


if __name__ == "__main__":
    load_dotenv()
    target_company = sys.argv[1] if len(sys.argv) > 1 else "Anthropic"
    run_pipeline(target_company)
