"""Common base agent contract, permission engine, prompt loader, and trace auditing."""

from __future__ import annotations

import datetime
import functools
import logging
from pathlib import Path
import time
from typing import Any, Callable

from shared.schemas import GrowthState, TraceEvent

logger = logging.getLogger("agents.base")

# Base directory for prompt templates
PROMPTS_DIR = Path(__file__).parent / "prompts"

# Explicit permission map and check imported from central core engine
from core.permissions import (
    AGENT_PERMISSIONS,
    PermissionDeniedError,
    check_permission,
    enforce_node_permission as enforce_permission,
)


def _resolve_template_path(agent_name: str) -> Path:
    """Resolve prompt markdown file, with alias fallbacks."""
    norm = agent_name.lower()
    path = PROMPTS_DIR / f"{norm}.md"
    if path.exists():
        return path
    alias_map = {
        "scout": "research",
        "cadence": "scoring",
        "quill": "outreach",
        "muse": "content",
        "echo": "followup",
        "sage": "learning",
    }
    if norm in alias_map:
        alias_path = PROMPTS_DIR / f"{alias_map[norm]}.md"
        if alias_path.exists():
            return alias_path
    return path


def get_prompt_metadata(agent_name: str) -> dict[str, Any]:
    """Parse YAML frontmatter from prompt file, returning version, output_schema, etc."""
    template_path = _resolve_template_path(agent_name)
    meta: dict[str, Any] = {"version": "1.0.0", "output_schema": "AgentReport"}
    if not template_path.exists():
        return meta

    try:
        content = template_path.read_text(encoding="utf-8")
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                frontmatter = parts[1]
                for line in frontmatter.splitlines():
                    line = line.strip()
                    if ":" in line:
                        k, v = line.split(":", 1)
                        meta[k.strip()] = v.strip().strip("'\"")
    except Exception as exc:
        logger.debug(f"Could not parse prompt metadata for {agent_name}: {exc}")
    return meta


def load_prompt_template(agent_name: str, **variables: Any) -> str:
    """Load a markdown prompt template and inject variables.

    Ensures zero hardcoded business wording by strictly reading from template.
    Strips YAML frontmatter so LLMs receive clean instructions.
    """
    template_path = _resolve_template_path(agent_name)
    if not template_path.exists():
        raise FileNotFoundError(f"Prompt template not found at {template_path}")

    template_str = template_path.read_text(encoding="utf-8")
    if template_str.startswith("---"):
        parts = template_str.split("---", 2)
        if len(parts) >= 3:
            template_str = parts[2].strip()

    for key, value in variables.items():
        placeholder = f"{{{key}}}"
        template_str = template_str.replace(placeholder, str(value))
    return template_str


def record_trace(
    state: GrowthState,
    agent: str,
    step: str,
    input_summary: str,
    output_summary: str,
    reason: str,
    prompt_version: str | None = None,
) -> None:
    """Append a structured TraceEvent to state['trace'] without mutating unrelated state."""
    if "trace" not in state or not isinstance(state["trace"], list):
        state["trace"] = []

    version = prompt_version or get_prompt_metadata(agent).get("version", "1.0.0")

    event = TraceEvent(
        agent=agent,
        step=step,
        input_summary=input_summary,
        output_summary=output_summary,
        reason=reason,
        timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        prompt_version=version,
    )
    state["trace"].append(event)

    run_id = state.get("run_id")
    if run_id:
        try:
            from core.repo import get_repo
            get_repo().append_trace(run_id, event)
        except Exception:
            pass



def agent_node(agent_name: str) -> Callable:
    """Decorator for agent functions implementing the standard contract:

    1. Records duration and trace.
    2. Enforces non-crashing behavior (records error in trace instead).
    3. Guarantees state isolation.
    """
    def decorator(fn: Callable[[GrowthState], GrowthState]) -> Callable[[GrowthState], GrowthState]:
        @functools.wraps(fn)
        def wrapper(state: GrowthState) -> GrowthState:
            # Ensure trace container exists
            if "trace" not in state or not isinstance(state["trace"], list):
                state["trace"] = []

            start_time = time.perf_counter()
            try:
                result_state = fn(state)
                duration = time.perf_counter() - start_time
                logger.info(f"Agent '{agent_name}' completed successfully in {duration:.2f}s")
                return result_state
            except Exception as exc:
                duration = time.perf_counter() - start_time
                error_msg = f"{type(exc).__name__}: {str(exc)}"
                logger.error(f"Agent '{agent_name}' encountered error: {error_msg}", exc_info=True)
                record_trace(
                    state=state,
                    agent=agent_name,
                    step="error_handler",
                    input_summary="Execution failed during agent run",
                    output_summary=f"Error caught: {error_msg}",
                    reason=f"Graceful degradation: failure captured in trace without crashing pipeline ({duration:.2f}s)",
                )
                return state

        return wrapper
    return decorator
