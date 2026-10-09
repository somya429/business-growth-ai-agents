"""Task Prioritization Engine for Atlas Planner.

Calculates task ranking scores using the weighted heuristic:
P = 0.30 * Impact + 0.25 * Urgency + 0.20 * Readiness + 0.15 * DependencyImportance + 0.10 * EvidenceConfidence
"""

from __future__ import annotations

from typing import Any
from shared.schemas import Task

WEIGHT_IMPACT = 0.30
WEIGHT_URGENCY = 0.25
WEIGHT_READINESS = 0.20
WEIGHT_DEPENDENCY = 0.15
WEIGHT_EVIDENCE = 0.10


def calculate_task_priority(
    impact: float,
    urgency: float,
    readiness: float,
    dependency_importance: float,
    evidence_confidence: float,
) -> float:
    """Compute task priority score from components.

    Formula:
    P = 0.30 * Impact + 0.25 * Urgency + 0.20 * Readiness + 0.15 * DependencyImportance + 0.10 * EvidenceConfidence
    """
    raw_score = (
        (WEIGHT_IMPACT * impact)
        + (WEIGHT_URGENCY * urgency)
        + (WEIGHT_READINESS * readiness)
        + (WEIGHT_DEPENDENCY * dependency_importance)
        + (WEIGHT_EVIDENCE * evidence_confidence)
    )
    return round(raw_score, 3)


def rank_task_heuristic(
    task: Task,
    all_tasks: list[Task] | None = None,
    completed_task_ids: set[str] | None = None,
    readiness_overall: float | None = None,
) -> float:
    """Calculate priority score for a Task model based on its graph context."""
    completed = completed_task_ids or set()
    tasks_list = all_tasks or []

    # 1. Impact: Based on task strategic criticality
    agent_impact_map = {
        "Atlas": 0.95,
        "Scout": 0.85,
        "Cadence": 0.80,
        "Quill": 0.90,
        "Veritas": 0.88,
        "Warden": 0.85,
        "Courier": 0.92,
        "Echo": 0.82,
        "Muse": 0.75,
        "Sage": 0.78,
    }
    impact = agent_impact_map.get(task.assigned_agent, 0.80)

    # 2. Urgency: Higher if blocking critical path or resolving missing info
    urgency = 0.70
    if task.missing_information:
        urgency = 0.90
    elif not task.dependencies:
        urgency = 0.85  # Immediate root task

    # 3. Readiness: Prerequisite dependencies satisfied
    if not task.dependencies:
        readiness = 1.0
    else:
        satisfied = sum(1 for dep in task.dependencies if dep in completed)
        readiness = satisfied / len(task.dependencies) if task.dependencies else 1.0
    if readiness_overall is not None:
        readiness = (readiness * 0.7) + (min(1.0, max(0.0, readiness_overall / 100.0)) * 0.3)

    # 4. Dependency Importance: How many downstream tasks depend on this task
    downstream_count = sum(
        1 for t in tasks_list if task.id in t.dependencies and t.id != task.id
    )
    if tasks_list:
        dependency_importance = min(1.0, downstream_count / max(1, len(tasks_list) - 1))
    else:
        dependency_importance = 0.5 if task.dependencies else 0.8

    # 5. Evidence Confidence: Self-contained evidence requirements
    evidence_confidence = 0.80
    if task.evidence_requirements:
        evidence_confidence = 0.90
    if any("unknown" in req.lower() for req in task.evidence_requirements):
        evidence_confidence = 0.50

    return calculate_task_priority(
        impact=impact,
        urgency=urgency,
        readiness=readiness,
        dependency_importance=dependency_importance,
        evidence_confidence=evidence_confidence,
    )
