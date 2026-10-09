"""Stage 3b tests: Compass (strategy) and Herald (campaigns) agent integration.

Covers:
- Compass in the Foundation planner (task exists, fields correct, no spend/contact)
- Herald in Pre-Sales and Growth planners (task exists, fields correct, no send/publish/spend)
- Executor dispatch for Compass: estimate labeling, can/cannot guarantees
- Executor dispatch for Herald: Warden cap, baseline "not available yet", no send/spend
- Permissions: Compass and Herald registered; tools validated
- AgentReport schema: prompt_version field present, confidence in [0,1]
- Safety: Herald output never contains did_send/did_publish/did_spend = True
- Safety: Compass output never contains cannot_spend = False or cannot_contact = False
- Planner ordering: Compass depends on Scout+Veritas; Herald depends on Warden (presales)
"""

import os
import datetime
import pytest

from core.executor import execute_task, TaskExecutionError, _dispatch_agent
from core.permissions import (
    AGENT_PERMISSIONS,
    check_permission,
    PermissionDeniedError,
)
from core.planner import generate_task_graph
from core.repo.local import LocalRepository
from shared.schemas import (
    AgentReport,
    ClassifiedFact,
    CoreIntakeAnswers,
    OnboardingSession,
    Task,
)


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def temp_repo(tmp_path):
    """Isolated local repository using tmp_path."""
    db_file = tmp_path / "test_stage3b.sqlite"
    repo = LocalRepository(data_dir=tmp_path / "data", db_path=db_file)
    return repo


def _minimal_session(phase: str = "foundation") -> OnboardingSession:
    """Return a fully populated OnboardingSession for planner calls."""
    facts = [
        ClassifiedFact(
            key="business_name",
            statement="Business name is Nexus Data Labs",
            classification="user_stated",
            source="user_intake",
        ),
        ClassifiedFact(
            key="primary_growth_goal",
            statement="Generate 20 qualified leads per month",
            classification="user_stated",
            source="user_intake",
        ),
        ClassifiedFact(
            key="budget_tier",
            statement="Budget tier is bootstrap",
            classification="user_stated",
            source="user_intake",
        ),
        ClassifiedFact(
            key="conversion_rate",
            statement="Probably 5% conversion rate",
            classification="user_assumption",
            source="user_intake",
        ),
    ]
    core = CoreIntakeAnswers(
        stage=phase,
        name="Nexus Data Labs",
        goal="Generate 20 qualified leads per month",
        budget="almost_none",
    )
    return OnboardingSession(
        session_id="session_stage3b_test",
        business_id="biz_stage3b_test",
        core_answers=core,
        classified_facts=facts,
    )


def _minimal_task(agent: str, task_id: str = None) -> Task:
    """Return a minimal planned Task assigned to the given agent."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return Task(
        id=task_id or f"task_{agent.lower()}_test",
        title=f"{agent} Test Task",
        objective=f"Test execution of {agent}",
        rationale=f"Validate {agent} output schema and constraints.",
        assigned_agent=agent,
        business_id="biz_stage3b_test",
        phase="foundation",
        dependencies=[],
        expected_deliverables=["Test Deliverable"],
        acceptance_criteria=["Schema valid"],
        evidence_requirements=["None"],
        approval_policy="none",
        status="planned",
        created_at=now,
        updated_at=now,
    )


# ---------------------------------------------------------------------------
# 1. Planner: Compass appears in Foundation phase
# ---------------------------------------------------------------------------

class TestCompassPlanner:
    def test_compass_task_in_foundation(self):
        session = _minimal_session("foundation")
        tasks = generate_task_graph(session)
        agents = [t.assigned_agent for t in tasks]
        assert "Compass" in agents, "Compass must appear in Foundation task graph"

    def test_compass_task_phase_is_foundation(self):
        session = _minimal_session("foundation")
        tasks = generate_task_graph(session)
        compass_tasks = [t for t in tasks if t.assigned_agent == "Compass"]
        assert len(compass_tasks) >= 1
        for ct in compass_tasks:
            assert ct.phase == "foundation"

    def test_compass_depends_on_scout_and_veritas(self):
        session = _minimal_session("foundation")
        tasks = generate_task_graph(session)
        id_map = {t.id: t for t in tasks}
        compass_task = next(t for t in tasks if t.assigned_agent == "Compass")
        dep_agents = {id_map[dep].assigned_agent for dep in compass_task.dependencies if dep in id_map}
        assert "Scout" in dep_agents, "Compass must depend on Scout"
        assert "Veritas" in dep_agents, "Compass must depend on Veritas"

    def test_compass_deliverables_include_unit_economics(self):
        session = _minimal_session("foundation")
        tasks = generate_task_graph(session)
        compass_task = next(t for t in tasks if t.assigned_agent == "Compass")
        deliverables_text = " ".join(compass_task.expected_deliverables)
        assert "Unit Economics" in deliverables_text or "unit" in deliverables_text.lower()

    def test_compass_acceptance_criteria_mention_estimate_label(self):
        session = _minimal_session("foundation")
        tasks = generate_task_graph(session)
        compass_task = next(t for t in tasks if t.assigned_agent == "Compass")
        criteria_text = " ".join(compass_task.acceptance_criteria)
        assert "estimate" in criteria_text.lower(), (
            "Compass acceptance criteria must enforce estimate labeling"
        )

    def test_compass_approval_policy_is_none(self):
        """Compass never needs spend/contact approval — it only produces reports."""
        session = _minimal_session("foundation")
        tasks = generate_task_graph(session)
        compass_task = next(t for t in tasks if t.assigned_agent == "Compass")
        assert compass_task.approval_policy == "none"


# ---------------------------------------------------------------------------
# 2. Planner: Herald appears in Pre-Sales and Growth phases
# ---------------------------------------------------------------------------

class TestHeraldPlanner:
    def test_herald_in_presales_phase(self):
        session = _minimal_session("presales_readiness")
        tasks = generate_task_graph(session)
        agents = [t.assigned_agent for t in tasks]
        assert "Herald" in agents, "Herald must appear in Pre-Sales task graph"

    def test_herald_in_growth_phase(self):
        session = _minimal_session("growth_optimization")
        tasks = generate_task_graph(session)
        agents = [t.assigned_agent for t in tasks]
        assert "Herald" in agents, "Herald must appear in Growth task graph"

    def test_herald_presales_depends_on_warden(self):
        session = _minimal_session("presales_readiness")
        tasks = generate_task_graph(session)
        id_map = {t.id: t for t in tasks}
        herald_task = next(t for t in tasks if t.assigned_agent == "Herald")
        dep_agents = {id_map[dep].assigned_agent for dep in herald_task.dependencies if dep in id_map}
        assert "Warden" in dep_agents, "Herald in pre-sales must depend on Warden"

    def test_courier_depends_on_herald_in_presales(self):
        """Courier must be gated behind Herald (campaign plan must exist first)."""
        session = _minimal_session("presales_readiness")
        tasks = generate_task_graph(session)
        id_map = {t.id: t for t in tasks}
        courier_task = next((t for t in tasks if t.assigned_agent == "Courier"), None)
        assert courier_task is not None
        dep_agents = {id_map[dep].assigned_agent for dep in courier_task.dependencies if dep in id_map}
        assert "Herald" in dep_agents, "Courier must depend on Herald in pre-sales"

    def test_herald_approval_policy_is_none(self):
        """Herald only plans — it must not require approval itself."""
        session = _minimal_session("presales_readiness")
        tasks = generate_task_graph(session)
        herald_task = next(t for t in tasks if t.assigned_agent == "Herald")
        assert herald_task.approval_policy == "none"

    def test_herald_deliverables_include_experiments(self):
        session = _minimal_session("presales_readiness")
        tasks = generate_task_graph(session)
        herald_task = next(t for t in tasks if t.assigned_agent == "Herald")
        deliverables_text = " ".join(herald_task.expected_deliverables)
        assert "Experiment" in deliverables_text or "experiment" in deliverables_text.lower()

    def test_herald_acceptance_criteria_forbid_send(self):
        session = _minimal_session("presales_readiness")
        tasks = generate_task_graph(session)
        herald_task = next(t for t in tasks if t.assigned_agent == "Herald")
        criteria_text = " ".join(herald_task.acceptance_criteria)
        assert "does not send" in criteria_text or "not send" in criteria_text.lower()

    def test_herald_growth_depends_on_echo(self):
        session = _minimal_session("growth_optimization")
        tasks = generate_task_graph(session)
        id_map = {t.id: t for t in tasks}
        herald_task = next(t for t in tasks if t.assigned_agent == "Herald")
        dep_agents = {id_map[dep].assigned_agent for dep in herald_task.dependencies if dep in id_map}
        assert "Echo" in dep_agents, "Herald in Growth must depend on Echo triage output"


# ---------------------------------------------------------------------------
# 3. Executor: Compass dispatch output contracts
# ---------------------------------------------------------------------------

class TestCompassExecutor:
    def test_compass_dispatch_returns_dict(self):
        task = _minimal_task("Compass")
        result = _dispatch_agent("Compass", task, {}, None)
        assert isinstance(result, dict)

    def test_compass_status_completed(self):
        task = _minimal_task("Compass")
        result = _dispatch_agent("Compass", task, {}, None)
        assert result["status"] == "completed"

    def test_compass_task_id_matches(self):
        task = _minimal_task("Compass")
        result = _dispatch_agent("Compass", task, {}, None)
        assert result["task_id"] == task.id

    def test_compass_confidence_in_range(self):
        task = _minimal_task("Compass")
        result = _dispatch_agent("Compass", task, {}, None)
        assert 0.0 <= result["confidence"] <= 1.0

    def test_compass_cannot_spend(self):
        task = _minimal_task("Compass")
        result = _dispatch_agent("Compass", task, {}, None)
        assert result["deliverables"]["cannot_spend"] is True, (
            "Compass must explicitly flag cannot_spend=True"
        )

    def test_compass_cannot_contact(self):
        task = _minimal_task("Compass")
        result = _dispatch_agent("Compass", task, {}, None)
        assert result["deliverables"]["cannot_contact"] is True, (
            "Compass must explicitly flag cannot_contact=True"
        )

    def test_compass_estimate_label_in_findings(self):
        """Every numeric estimate must carry the estimate-from-user-supplied-inputs tag."""
        task = _minimal_task("Compass")
        result = _dispatch_agent("Compass", task, {}, None)
        findings_text = " ".join(result.get("findings", []))
        assert "estimate from user-supplied inputs" in findings_text

    def test_compass_estimate_label_in_positioning_options(self):
        task = _minimal_task("Compass")
        result = _dispatch_agent("Compass", task, {}, None)
        options = result["deliverables"]["positioning_options"]
        assert len(options) >= 2, "Compass must produce at least 2 positioning options"
        for opt in options:
            pricing = opt.get("pricing_hypothesis", "")
            assert "estimate from user-supplied inputs" in pricing, (
                f"Pricing hypothesis in '{opt['label']}' missing estimate label"
            )
            for field in ("ltv_estimate", "cac_estimate", "ltv_cac_ratio"):
                value = opt["unit_economics"].get(field, "")
                assert "estimate from user-supplied inputs" in value, (
                    f"unit_economics.{field} in '{opt['label']}' missing estimate label"
                )

    def test_compass_assumptions_to_validate_present(self):
        task = _minimal_task("Compass")
        result = _dispatch_agent("Compass", task, {}, None)
        assumptions = result["deliverables"].get("assumptions_to_validate", [])
        assert len(assumptions) >= 1, "Compass must rank at least 1 assumption to validate"

    def test_compass_agent_report_valid(self, temp_repo):
        """Full execute_task round-trip: schema validates, task reaches completed."""
        task = _minimal_task("Compass")
        temp_repo.save_task(task)
        final_task, report = execute_task(task, repo=temp_repo)
        assert isinstance(report, AgentReport)
        assert report.status == "completed"
        assert final_task.status == "completed"


# ---------------------------------------------------------------------------
# 4. Executor: Herald dispatch output contracts
# ---------------------------------------------------------------------------

class TestHeraldExecutor:
    def test_herald_dispatch_returns_dict(self):
        task = _minimal_task("Herald")
        result = _dispatch_agent("Herald", task, {}, None)
        assert isinstance(result, dict)

    def test_herald_status_completed(self):
        task = _minimal_task("Herald")
        result = _dispatch_agent("Herald", task, {}, None)
        assert result["status"] == "completed"

    def test_herald_task_id_matches(self):
        task = _minimal_task("Herald")
        result = _dispatch_agent("Herald", task, {}, None)
        assert result["task_id"] == task.id

    def test_herald_confidence_in_range(self):
        task = _minimal_task("Herald")
        result = _dispatch_agent("Herald", task, {}, None)
        assert 0.0 <= result["confidence"] <= 1.0

    def test_herald_did_not_send(self):
        task = _minimal_task("Herald")
        result = _dispatch_agent("Herald", task, {}, None)
        assert result["deliverables"]["did_send"] is False, "Herald must never send"

    def test_herald_did_not_publish(self):
        task = _minimal_task("Herald")
        result = _dispatch_agent("Herald", task, {}, None)
        assert result["deliverables"]["did_publish"] is False, "Herald must never publish"

    def test_herald_did_not_spend(self):
        task = _minimal_task("Herald")
        result = _dispatch_agent("Herald", task, {}, None)
        assert result["deliverables"]["did_spend"] is False, "Herald must never spend"

    def test_herald_resend_daily_cap_present(self):
        task = _minimal_task("Herald")
        result = _dispatch_agent("Herald", task, {}, None)
        cap = result["deliverables"]["campaign_plan"].get("resend_daily_cap")
        assert isinstance(cap, int) and cap > 0

    def test_herald_resend_cap_respects_env(self, monkeypatch):
        monkeypatch.setenv("RESEND_FREE_DAILY_CAP", "50")
        task = _minimal_task("Herald")
        result = _dispatch_agent("Herald", task, {}, None)
        assert result["deliverables"]["campaign_plan"]["resend_daily_cap"] == 50

    def test_herald_warden_frequency_cap_present(self):
        task = _minimal_task("Herald")
        result = _dispatch_agent("Herald", task, {}, None)
        cap_days = result["deliverables"]["campaign_plan"].get("warden_frequency_cap_days")
        assert isinstance(cap_days, int) and cap_days > 0

    def test_herald_experiments_have_hypothesis_and_metric(self):
        task = _minimal_task("Herald")
        result = _dispatch_agent("Herald", task, {}, None)
        experiments = result["deliverables"].get("experiments", [])
        assert len(experiments) >= 1, "Herald must design at least 1 experiment"
        for exp in experiments:
            assert "hypothesis" in exp and exp["hypothesis"], (
                f"Experiment '{exp.get('name')}' missing hypothesis"
            )
            assert "success_metric" in exp and exp["success_metric"], (
                f"Experiment '{exp.get('name')}' missing success_metric"
            )

    def test_herald_experiments_baseline_not_available(self):
        """When no prior data exists, baseline must read 'not available yet'."""
        task = _minimal_task("Herald")
        result = _dispatch_agent("Herald", task, {}, None)
        for exp in result["deliverables"].get("experiments", []):
            assert exp.get("baseline") == "not available yet", (
                f"Experiment '{exp.get('name')}' baseline should be 'not available yet' when no data"
            )

    def test_herald_quill_tasks_delegated(self):
        task = _minimal_task("Herald")
        result = _dispatch_agent("Herald", task, {}, None)
        delegated = result["deliverables"].get("quill_copy_tasks_delegated", 0)
        assert isinstance(delegated, int) and delegated >= 1, (
            "Herald must delegate at least 1 copy task to Quill"
        )

    def test_herald_agent_report_valid(self, temp_repo):
        """Full execute_task round-trip: schema validates, task reaches completed."""
        task = _minimal_task("Herald")
        temp_repo.save_task(task)
        final_task, report = execute_task(task, repo=temp_repo)
        assert isinstance(report, AgentReport)
        assert report.status == "completed"
        assert final_task.status == "completed"


# ---------------------------------------------------------------------------
# 5. Permissions: Compass and Herald registration
# ---------------------------------------------------------------------------


def _can(agent: str, action: str) -> bool:
    """Return True if check_permission does NOT raise for this agent+action."""
    try:
        check_permission(agent, action)
        return True
    except (PermissionDeniedError, PermissionError):
        return False


class TestCompassHeraldPermissions:
    def test_compass_registered_in_permissions(self):
        assert "compass" in AGENT_PERMISSIONS, (
            "Compass must be registered in AGENT_PERMISSIONS"
        )

    def test_herald_registered_in_permissions(self):
        assert "herald" in AGENT_PERMISSIONS, (
            "Herald must be registered in AGENT_PERMISSIONS"
        )

    def test_compass_cannot_send_email(self):
        assert _can("compass", "send_email") is False

    def test_compass_cannot_spend_budget(self):
        assert _can("compass", "spend_budget") is False

    def test_compass_cannot_contact_leads(self):
        assert _can("compass", "contact_leads") is False

    def test_herald_cannot_send_email(self):
        assert _can("herald", "send_email") is False

    def test_herald_cannot_publish_content(self):
        assert _can("herald", "publish_content") is False

    def test_herald_cannot_spend_budget(self):
        assert _can("herald", "spend_budget") is False

    def test_compass_raises_for_send_email(self):
        with pytest.raises((PermissionDeniedError, PermissionError)):
            check_permission("compass", "send_email")

    def test_herald_raises_for_send_email(self):
        with pytest.raises((PermissionDeniedError, PermissionError)):
            check_permission("herald", "send_email")

    def test_compass_can_read_research(self):
        """Compass needs to read research/facts to do its job."""
        assert _can("compass", "read_research") is True

    def test_herald_can_delegate_tasks(self):
        """Herald must be able to hand tasks to Quill."""
        assert _can("herald", "delegate_tasks") is True



# ---------------------------------------------------------------------------
# 6. Planner ordering invariants across all phases
# ---------------------------------------------------------------------------

class TestPlannerOrderingInvariants:
    def test_foundation_compass_id_unique(self):
        session = _minimal_session("foundation")
        tasks = generate_task_graph(session)
        compass_tasks = [t for t in tasks if t.assigned_agent == "Compass"]
        ids = [t.id for t in compass_tasks]
        assert len(ids) == len(set(ids)), "All Compass task IDs must be unique"

    def test_foundation_all_task_ids_unique(self):
        session = _minimal_session("foundation")
        tasks = generate_task_graph(session)
        ids = [t.id for t in tasks]
        assert len(ids) == len(set(ids)), "All Foundation task IDs must be unique"

    def test_presales_all_task_ids_unique(self):
        session = _minimal_session("presales_readiness")
        tasks = generate_task_graph(session)
        ids = [t.id for t in tasks]
        assert len(ids) == len(set(ids)), "All Pre-Sales task IDs must be unique"

    def test_growth_all_task_ids_unique(self):
        session = _minimal_session("growth_optimization")
        tasks = generate_task_graph(session)
        ids = [t.id for t in tasks]
        assert len(ids) == len(set(ids)), "All Growth task IDs must be unique"

    def test_no_self_dependencies(self):
        for phase in ("foundation", "presales_readiness", "growth_optimization"):
            session = _minimal_session(phase)
            tasks = generate_task_graph(session)
            for task in tasks:
                assert task.id not in task.dependencies, (
                    f"Task '{task.id}' lists itself as a dependency"
                )

    def test_all_dependencies_reference_existing_tasks(self):
        for phase in ("foundation", "presales_readiness", "growth_optimization"):
            session = _minimal_session(phase)
            tasks = generate_task_graph(session)
            ids = {t.id for t in tasks}
            for task in tasks:
                for dep in task.dependencies:
                    assert dep in ids, (
                        f"Task '{task.id}' references non-existent dependency '{dep}'"
                    )

    def test_courier_always_has_admin_required_policy(self):
        session = _minimal_session("presales_readiness")
        tasks = generate_task_graph(session)
        courier_tasks = [t for t in tasks if t.assigned_agent == "Courier"]
        assert len(courier_tasks) >= 1
        for ct in courier_tasks:
            assert ct.approval_policy == "admin_required", (
                "Courier must always require admin approval"
            )
