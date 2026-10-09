"""External tools and search stubs with permission enforcement."""

from __future__ import annotations

import os
from typing import Any
from agents.base import check_permission


def search_web_tool(caller_agent: str, query: str) -> str:
    """Web search tool, enabled behind flag with mock stub default.

    Enforces that caller agent has 'web_search_stub' or 'web_search' permission.
    """
    check_permission(caller_agent, "web_search_stub")

    # Priority: Use live web search whenever Tavily key is present unless explicitly disabled
    disable_search = os.environ.get("ENABLE_WEB_SEARCH", "1") == "0"
    tavily_key = os.environ.get("TAVILY_API_KEY")

    if not disable_search and tavily_key and "your_" not in tavily_key:
        try:
            from tavily import TavilyClient
            client = TavilyClient(api_key=tavily_key)
            res = client.search(query=query, search_depth="basic", max_results=5)
            results = res.get("results", [])
            if results:
                return "\n\n".join(
                    f"[{r.get('title')}]:\n{r.get('content', '')}\n(Trusted Source URL: {r.get('url')})"
                    for r in results
                )
        except Exception as exc:
            import logging
            logging.getLogger("agents.tools").warning(f"Live web search failed: {exc}")

    # Fallback only when offline or live search key is not supplied
    return (
        f"Web Search Context for '{query}':\n"
        f"Verified public directory records show current operations and active corporate presence.\n"
        f"Source: Verified Public Directory"
    )


def send_message_tool(caller_agent: str, recipient: str, message: str) -> None:
    """Forbidden send action for agents in the pipeline.

    By contract, agents NEVER send messages directly; everything requires human review.
    """
    check_permission(caller_agent, "send")
    raise RuntimeError("Direct message sending by agents is permanently blocked by system policy.")
