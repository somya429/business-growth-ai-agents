"""LangGraph StateGraph wiring: nodes, conditional edges, and compilation."""

from __future__ import annotations

from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph

try:
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
        handle_error,
    )
    from .state import AgentState
except (ImportError, ValueError):
    from agents import (
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
        handle_error,
    )
    from state import AgentState


def _route_on_status(state: AgentState) -> str:
    """Standard check after most nodes to see if they threw an exception."""
    return "error" if state["execution_metadata"].get("status") == "error" else "success"


def _route_after_error(state: AgentState) -> str:
    """Decide if we should retry or fail out entirely."""
    return "retry" if state["execution_metadata"].get("status") == "retry" else "exit"


def _route_after_critique(state: AgentState) -> str:
    """Check if the outreach was approved. If it failed for other reasons, handle error."""
    if state["execution_metadata"].get("status") == "error":
        return "error"
    
    evaluation = state.get("outreach_evaluation", {})
    if evaluation.get("approved", False):
        return "approved"
    return "revise"


def build_graph(checkpointer=None) -> CompiledStateGraph:
    graph = StateGraph(AgentState)

    # 1. Add all specialized agents
    graph.add_node("research_account", research_account)
    graph.add_node("detect_signals", detect_signals)
    graph.add_node("detect_personas", detect_personas)
    graph.add_node("synthesize_intelligence", synthesize_intelligence)
    graph.add_node("detect_why_now", detect_why_now)
    graph.add_node("generate_outreach", generate_outreach)
    graph.add_node("critique_outreach", critique_outreach)
    graph.add_node("human_approval", human_approval)
    graph.add_node("sync_crm", sync_crm)
    graph.add_node("send_email", send_email)
    graph.add_node("handle_error", handle_error)

    # 2. Define the Entry Point
    graph.set_entry_point("research_account")

    # 3. Add Edges
    # We execute research, signals, and personas sequentially to ensure state safety,
    # though conceptually they are independent agents gathering data.
    graph.add_conditional_edges("research_account", _route_on_status, {"success": "detect_signals", "error": "handle_error"})
    graph.add_conditional_edges("detect_signals", _route_on_status, {"success": "detect_personas", "error": "handle_error"})
    graph.add_conditional_edges("detect_personas", _route_on_status, {"success": "synthesize_intelligence", "error": "handle_error"})
    
    # Synthesis
    graph.add_conditional_edges("synthesize_intelligence", _route_on_status, {"success": "detect_why_now", "error": "handle_error"})
    
    # Why Now
    graph.add_conditional_edges("detect_why_now", _route_on_status, {"success": "generate_outreach", "error": "handle_error"})
    
    # Outreach Generation
    graph.add_conditional_edges("generate_outreach", _route_on_status, {"success": "critique_outreach", "error": "handle_error"})
    
    # Critic loop
    graph.add_conditional_edges(
        "critique_outreach", 
        _route_after_critique, 
        {
            "approved": "human_approval", 
            "revise": "generate_outreach", 
            "error": "handle_error"
        }
    )
    
    # Human Approval
    graph.add_conditional_edges("human_approval", _route_on_status, {"success": "sync_crm", "error": "handle_error"})
    
    # CRM
    graph.add_conditional_edges("sync_crm", _route_on_status, {"success": "send_email", "error": "handle_error"})
    
    # Email
    graph.add_edge("send_email", END)

    # Error handling
    graph.add_conditional_edges(
        "handle_error",
        _route_after_error,
        # On failure we retry from the entry point, or a specific node if advanced checkpointing is used.
        {"retry": "research_account", "exit": END},
    )

    return graph.compile(checkpointer=checkpointer)
