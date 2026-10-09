"""Comprehensive test suite for Stage 3: Atlas Planner, Task Graph, and State Machine."""

import pytest
from core.executor import execute_task, TaskExecutionError
from core.planner import generate_task_graph, submit_client_answer
from core.ranking import calculate_task_priority, rank_task_heuristic
from core.repo.local import LocalRepository
from core.state_machine import (
    can_transition,
    edit_task,
    InvalidTransitionError,
    pause_task,
    resume_task,
    transition_task,
)
from shared.schemas import (
    AgentReport,
    ClassifiedFact,
    CoreIntakeAnswers,
    EvidenceItem,
    MissingInformationItem,
    OnboardingSession,
    Task,
    TaskEvent,
)


@pytest.fixture
def temp_repo(tmp_path):
    """Isolated local repository fixture using tmp_path to prevent file locks."""
    db_file = tmp_path / "test_tasks.sqlite"
    repo = LocalRepository(data_dir=tmp_path / "data", db_path=db_file)
    return repo


class TestTaskPrioritizationFormula:
    """Tests for the weighted heuristic ranking formula."""

    def test_ranking_formula_exact_calculation(self):
        # P = 0.30*Impact + 0.25*Urgency + 0.20*Readiness + 0.15*DependencyImportance + 0.10*EvidenceConfidence
        score = calculate_task_priority(
            impact=1.0,
            urgency=1.0,
            readiness=1.0,
            dependency_importance=1.0,
            evidence_confidence=1.0,
        )
        assert score == 1.0

        # Weighted calculation check
        score2 = calculate_task_priority(
            impact=0.8,    # 0.24
            urgency=0.6,   # 0.15
            readiness=0.5, # 0.10
            dependency_importance=0.4, # 0.06
            evidence_confidence=0.9,   # 0.09
        )
        # Expected: 0.24 + 0.15 + 0.10 + 0.06 + 0.09 = 0.64
        assert score2 == pytest.approx(0.64, 0.001)

    def test_rank_task_heuristic(self):
        task = Task(
            title="Strategic Alignment",
            objective="Formulate strategy",
            rationale="Baseline requirement",
            assigned_agent="Atlas",
            phase="foundation",
        )
        score = rank_task_heuristic(task)
        assert 0.0 <= score <= 1.0
        assert score > 0.5  # Atlas root task should have high priority


class TestAtlasTaskGraphGeneration:
    """Tests for Atlas phase-aware task graph generation."""

    def test_foundation_phase_graph(self, temp_repo):
        tasks = generate_task_graph(phase="foundation", repo=temp_repo)
        assert len(tasks) == 5
        agents = [t.assigned_agent for t in tasks]
        assert "Atlas" in agents
        assert "Scout" in agents
        assert "Veritas" in agents
        assert "Muse" in agents
        assert "Compass" in agents

        # Verify DAG dependencies
        t1 = next(t for t in tasks if t.assigned_agent == "Atlas")
        t2 = next(t for t in tasks if t.assigned_agent == "Scout")
        assert t1.id in t2.dependencies

    def test_presales_readiness_phase_graph_and_courier_safety(self, temp_repo):
        tasks = generate_task_graph(phase="presales_readiness", repo=temp_repo)
        assert len(tasks) == 7
        agents = [t.assigned_agent for t in tasks]
        assert "Scout" in agents
        assert "Cadence" in agents
        assert "Quill" in agents
        assert "Veritas" in agents
        assert "Warden" in agents
        assert "Herald" in agents
        assert "Courier" in agents

        # HARD SAFETY CONSTRAINT: Courier requires admin_required approval policy
        courier_task = next(t for t in tasks if t.assigned_agent == "Courier")
        assert courier_task.approval_policy == "admin_required"
        assert courier_task.status == "planned"

    def test_growth_optimization_phase_graph(self, temp_repo):
        tasks = generate_task_graph(phase="growth_optimization", repo=temp_repo)
        assert len(tasks) == 5
        agents = [t.assigned_agent for t in tasks]
        assert "Echo" in agents
        assert "Herald" in agents
        assert "Muse" in agents
        assert "Sage" in agents
        assert "Atlas" in agents

    def test_unknown_facts_generate_missing_information_items(self, temp_repo):
        session = OnboardingSession(
            core_answers=CoreIntakeAnswers(
                name="",  # unknown
                idea="B2B AI Growth System",
                budget="undecided",  # unknown
                goal="",  # unknown
            ),
            classified_facts=[
                ClassifiedFact(key="business_name", statement="Missing", classification="unknown", source="intake"),
                ClassifiedFact(key="primary_growth_goal", statement="Missing", classification="unknown", source="intake"),
            ],
        )
        tasks = generate_task_graph(session=session, repo=temp_repo)
        strategy_task = next(t for t in tasks if t.assigned_agent == "Atlas")
        assert len(strategy_task.missing_information) > 0
        assert strategy_task.status == "blocked"


class TestStateMachineTransitionsAndAuditLogging:
    """Tests for table-driven legal transitions, audit logging, and pause/resume."""

    def test_legal_transitions_and_audit_event_written(self, temp_repo):
        task = Task(
            title="Test Task",
            objective="Test state machine",
            rationale="Testing",
            assigned_agent="Scout",
        )
        temp_repo.save_task(task)

        # 1. planned -> assigned
        task, ev1 = transition_task(task, "assigned", reason="Assigned to worker", repo=temp_repo)
        assert task.status == "assigned"
        assert ev1.from_status == "planned"
        assert ev1.to_status == "assigned"

        # 2. assigned -> running
        task, ev2 = transition_task(task, "running", reason="Started", repo=temp_repo)
        assert task.status == "running"

        # 3. running -> completed
        task, ev3 = transition_task(task, "completed", reason="Done", repo=temp_repo)
        assert task.status == "completed"

        # Check repository audit log
        events = temp_repo.get_task_events(task.id)
        assert len(events) == 3
        assert [e.to_status for e in events] == ["assigned", "running", "completed"]

    def test_illegal_transition_raises_error(self, temp_repo):
        task = Task(
            title="Illegal Test",
            objective="Check illegal transition",
            rationale="Testing",
            assigned_agent="Scout",
            status="planned",
        )
        temp_repo.save_task(task)

        with pytest.raises(InvalidTransitionError):
            # 'planned' cannot transition directly to 'completed'
            transition_task(task, "completed", repo=temp_repo)

    def test_pause_and_resume_cycle(self, temp_repo):
        task = Task(
            title="Pausable Task",
            objective="Testing pause",
            rationale="Testing",
            assigned_agent="Scout",
            status="assigned",
        )
        temp_repo.save_task(task)

        # Pause
        task, pause_ev = pause_task(task, reason="Client lunch break", repo=temp_repo)
        assert task.status == "paused"
        assert task.prior_status == "assigned"

        # Resume
        task, resume_ev = resume_task(task, repo=temp_repo)
        assert task.status == "assigned"
        assert task.prior_status is None

    def test_task_versioning_on_edit(self, temp_repo):
        task = Task(
            title="Original Title",
            objective="Original Objective",
            rationale="Testing",
            assigned_agent="Scout",
            version=1,
        )
        temp_repo.save_task(task)

        updated_task, version_rec = edit_task(
            task_or_id=task,
            updates={"title": "Updated Title", "objective": "New Objective"},
            reason="Refined scope",
            repo=temp_repo,
        )

        assert updated_task.title == "Updated Title"
        assert updated_task.version == 2
        assert version_rec.version == 1
        assert version_rec.snapshot["title"] == "Original Title"

        # Check repository version history
        versions = temp_repo.get_task_versions(task.id)
        assert len(versions) == 1
        assert versions[0].snapshot["title"] == "Original Title"


class TestTaskExecutorAdapter:
    """Tests for TaskExecutor schema validation, approval gates, and Courier safety."""

    def test_prerequisite_dependency_blocks_execution(self, temp_repo):
        dep = Task(
            id="dep_task_1",
            title="Prerequisite Task",
            objective="Must finish first",
            rationale="Prereq",
            assigned_agent="Scout",
            status="running",  # Not completed
        )
        temp_repo.save_task(dep)

        main_task = Task(
            id="main_task_2",
            title="Main Task",
            objective="Cannot run yet",
            rationale="Dependent",
            assigned_agent="Cadence",
            dependencies=["dep_task_1"],
            status="planned",
        )
        temp_repo.save_task(main_task)

        with pytest.raises(TaskExecutionError) as exc_info:
            execute_task(main_task, repo=temp_repo)
        assert "prerequisite 'dep_task_1' is not completed" in str(exc_info.value)

    def test_courier_refused_without_approval(self, temp_repo):
        courier_task = Task(
            title="Outbound Delivery",
            objective="Send emails",
            rationale="Outreach",
            assigned_agent="Courier",
            approval_policy="admin_required",
            status="planned",
        )
        temp_repo.save_task(courier_task)

        # First run: halts at admin_approval gate
        task, report = execute_task(courier_task, repo=temp_repo)
        assert task.status == "admin_approval"
        assert report.requires_human_review is True
        assert report.status == "needs_review"

        # Attempting to execute directly while still admin_approval fails
        with pytest.raises(TaskExecutionError):
            execute_task(task, repo=temp_repo)

    def test_courier_executes_after_approval(self, temp_repo):
        courier_task = Task(
            title="Outbound Delivery",
            objective="Send emails",
            rationale="Outreach",
            assigned_agent="Courier",
            approval_policy="admin_required",
            status="approved",  # Approved by human!
        )
        temp_repo.save_task(courier_task)

        task, report = execute_task(courier_task, repo=temp_repo)
        assert task.status == "completed"
        assert report.status == "completed"
        assert report.deliverables.get("sent") is True

    def test_successful_execution_generates_valid_agent_report(self, temp_repo):
        task = Task(
            title="Scout Research",
            objective="Identify competitors",
            rationale="Market intelligence",
            assigned_agent="Scout",
            status="planned",
        )
        temp_repo.save_task(task)

        updated_task, report = execute_task(task, repo=temp_repo)
        assert updated_task.status == "completed"
        assert isinstance(report, AgentReport)
        assert report.task_id == task.id
        assert 0.0 <= report.confidence <= 1.0
        assert len(report.findings) > 0

        # Verify persisted in repo
        saved_report = temp_repo.get_agent_report(task.id)
        assert saved_report is not None
        assert saved_report.summary == report.summary


class TestMissingInformationResolution:
    """Tests for resolving MissingInformationItem gaps and unblocking tasks."""

    def test_client_submits_answer_unblocks_task(self, temp_repo):
        task = Task(
            title="Strategic Foundation",
            objective="Define ICP",
            rationale="Baseline",
            assigned_agent="Atlas",
            status="blocked",
            missing_information=[
                MissingInformationItem(
                    what="Specify business name",
                    why_needed="Required for sender verification",
                    who_can_supply="client",
                )
            ],
        )
        temp_repo.save_task(task)

        # Client submits answer
        updated_task = submit_client_answer(
            task_id=task.id,
            answer="Nexus Data Labs",
            what_item="business name",
            repo=temp_repo,
        )

        assert len(updated_task.missing_information) == 0
        assert updated_task.status == "planned"  # Unblocked!

        # Check audit event recorded
        events = temp_repo.get_task_events(task.id)
        assert any(e.event_type == "client_answer_submitted" for e in events)
