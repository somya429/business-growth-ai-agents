"""B2B Account Pipeline with Email Agent & Multi-Agent Intelligence."""

from __future__ import annotations
import os
import sys
from pathlib import Path

# Add this folder to sys.path if not present so internal imports work seamlessly
_DIR = Path(__file__).resolve().parent
if str(_DIR) not in sys.path:
    sys.path.insert(0, str(_DIR))

from .state import AgentState
from .agents import (
    research_account,
    detect_signals,
    detect_personas,
    synthesize_intelligence,
    detect_why_now,
    generate_outreach,
    critique_outreach,
    human_approval,
    sync_crm,
    send_email,
    get_crm_client,
)
from .graph import build_graph
from .main import run_pipeline

__all__ = [
    "AgentState",
    "build_graph",
    "run_pipeline",
    "send_email",
    "get_crm_client",
]
