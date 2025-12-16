"""
Constraint verification tests.

These tests verify that each constraint behaves correctly in isolation.
Use ConstraintVerifier to test individual constraints without running the full solver.
"""

import pytest
from solverforge_legacy.solver.test import ConstraintVerifier
from my_quickstart.domain import Resource, Task, Schedule
from my_quickstart.constraints import define_constraints


@pytest.fixture
def constraint_verifier():
    """Create a constraint verifier for testing."""
    return ConstraintVerifier.build(
        define_constraints,
        Schedule,
        Task,
    )


# =============================================================================
# TEST DATA FIXTURES
# =============================================================================

@pytest.fixture
def alice():
    return Resource(name="Alice", capacity=100, skills={"python", "sql"})


@pytest.fixture
def bob():
    return Resource(name="Bob", capacity=50, skills={"java"})


# =============================================================================
# HARD CONSTRAINT TESTS
# =============================================================================

class TestRequiredSkill:
    """Tests for the 'Required skill missing' constraint."""

    def test_no_penalty_when_skill_matches(self, constraint_verifier, alice):
        """Task with matching skill should not be penalized."""
        task = Task(id="1", name="Python Task", duration=30, required_skill="python", resource=alice)

        constraint_verifier.verify_that("Required skill missing") \
            .given(task) \
            .penalizes_by(0)

    def test_penalty_when_skill_missing(self, constraint_verifier, bob):
        """Task assigned to resource without required skill should be penalized."""
        task = Task(id="1", name="Python Task", duration=30, required_skill="python", resource=bob)

        constraint_verifier.verify_that("Required skill missing") \
            .given(task) \
            .penalizes_by(1)

    def test_no_penalty_when_no_skill_required(self, constraint_verifier, alice):
        """Task with no skill requirement should not be penalized."""
        task = Task(id="1", name="Any Task", duration=30, required_skill="", resource=alice)

        constraint_verifier.verify_that("Required skill missing") \
            .given(task) \
            .penalizes_by(0)


class TestResourceCapacity:
    """Tests for the 'Resource capacity exceeded' constraint."""

    def test_no_penalty_under_capacity(self, constraint_verifier, alice):
        """Tasks under capacity should not be penalized."""
        task1 = Task(id="1", name="Task 1", duration=30, resource=alice)
        task2 = Task(id="2", name="Task 2", duration=40, resource=alice)
        # Total: 70, Capacity: 100

        constraint_verifier.verify_that("Resource capacity exceeded") \
            .given(task1, task2) \
            .penalizes_by(0)

    def test_penalty_over_capacity(self, constraint_verifier, bob):
        """Tasks exceeding capacity should be penalized by the overflow amount."""
        task1 = Task(id="1", name="Task 1", duration=30, resource=bob)
        task2 = Task(id="2", name="Task 2", duration=40, resource=bob)
        # Total: 70, Capacity: 50, Overflow: 20

        constraint_verifier.verify_that("Resource capacity exceeded") \
            .given(task1, task2) \
            .penalizes_by(20)


# =============================================================================
# SOFT CONSTRAINT TESTS
# =============================================================================

class TestMinimizeDuration:
    """Tests for the 'Minimize total duration' constraint."""

    def test_penalizes_by_duration(self, constraint_verifier, alice):
        """Each assigned task should be penalized by its duration."""
        task = Task(id="1", name="Task", duration=45, resource=alice)

        constraint_verifier.verify_that("Minimize total duration") \
            .given(task) \
            .penalizes_by(45)

    def test_unassigned_not_penalized(self, constraint_verifier):
        """Unassigned tasks should not be penalized."""
        task = Task(id="1", name="Task", duration=45, resource=None)

        constraint_verifier.verify_that("Minimize total duration") \
            .given(task) \
            .penalizes_by(0)


# =============================================================================
# INTEGRATION TEST
# =============================================================================

class TestFullSolution:
    """Test the full constraint set on a complete solution."""

    def test_feasible_solution(self, constraint_verifier, alice, bob):
        """A feasible solution should have no hard constraint violations."""
        tasks = [
            Task(id="1", name="Python Task", duration=30, required_skill="python", resource=alice),
            Task(id="2", name="SQL Task", duration=20, required_skill="sql", resource=alice),
            Task(id="3", name="Java Task", duration=40, required_skill="java", resource=bob),
        ]

        # Verify no hard violations
        constraint_verifier.verify_that("Required skill missing") \
            .given(*tasks) \
            .penalizes_by(0)

        constraint_verifier.verify_that("Resource capacity exceeded") \
            .given(*tasks) \
            .penalizes_by(0)
