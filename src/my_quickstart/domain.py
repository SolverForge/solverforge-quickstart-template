"""
Domain model for your optimization problem.

This file defines:
1. Problem facts (@dataclass) - immutable input data
2. Planning entities (@planning_entity) - what the solver assigns
3. Planning solution (@planning_solution) - container for the problem

TODO: Replace this example with your own domain model.
"""

from dataclasses import dataclass, field
from typing import Annotated, Optional, List
from datetime import datetime

from solverforge_legacy.solver import SolverStatus
from solverforge_legacy.solver.domain import (
    planning_entity,
    planning_solution,
    PlanningId,
    PlanningVariable,
    PlanningEntityCollectionProperty,
    ProblemFactCollectionProperty,
    ValueRangeProvider,
    PlanningScore,
)
from solverforge_legacy.solver.score import HardSoftScore

from .json_serialization import JsonDomainBase
from pydantic import Field


# =============================================================================
# PROBLEM FACTS (immutable input data)
# =============================================================================

@dataclass
class Resource:
    """
    A resource that can be assigned to tasks.

    TODO: Replace with your own problem fact (e.g., Employee, Room, Vehicle).
    """
    name: Annotated[str, PlanningId]
    capacity: int = 100
    skills: set[str] = field(default_factory=set)


# =============================================================================
# PLANNING ENTITIES (what the solver optimizes)
# =============================================================================

@planning_entity
@dataclass
class Task:
    """
    A task to be assigned to a resource.

    The `resource` field is the planning variable - the solver will
    try different assignments to find the best solution.

    TODO: Replace with your own planning entity (e.g., Shift, Lesson, Delivery).
    """
    id: Annotated[str, PlanningId]
    name: str
    duration: int  # in minutes
    required_skill: str = ""

    # This is the planning variable - solver assigns this
    resource: Annotated[Resource | None, PlanningVariable] = None

    def has_required_skill(self) -> bool:
        """Check if assigned resource has the required skill.

        NOTE: We use len(str(...)) instead of boolean check because
        required_skill may be a Java String during constraint evaluation.
        """
        if self.resource is None:
            return False
        if len(str(self.required_skill)) == 0:
            return True
        return str(self.required_skill) in self.resource.skills


# =============================================================================
# PLANNING SOLUTION (container)
# =============================================================================

@planning_solution
@dataclass
class Schedule:
    """
    The planning solution containing all problem facts and planning entities.

    TODO: Rename to match your domain (e.g., Timetable, RoutePlan, Roster).
    """
    resources: Annotated[
        list[Resource],
        ProblemFactCollectionProperty,
        ValueRangeProvider
    ]
    tasks: Annotated[list[Task], PlanningEntityCollectionProperty]
    score: Annotated[HardSoftScore | None, PlanningScore] = None
    solver_status: SolverStatus = SolverStatus.NOT_SOLVING


# =============================================================================
# PYDANTIC MODELS (for REST API serialization)
# =============================================================================

class ResourceModel(JsonDomainBase):
    """Pydantic model for Resource serialization."""
    name: str
    capacity: int = 100
    skills: List[str] = Field(default_factory=list)


class TaskModel(JsonDomainBase):
    """Pydantic model for Task serialization."""
    id: str
    name: str
    duration: int
    required_skill: str = Field(default="", alias="requiredSkill")
    resource: Optional[str] = None  # Resource name or None


class ConstraintWeightsModel(JsonDomainBase):
    """Pydantic model for constraint weight configuration."""
    required_skill: int = Field(default=100, ge=0, le=100)
    resource_capacity: int = Field(default=100, ge=0, le=100)
    minimize_duration: int = Field(default=50, ge=0, le=100)
    balance_load: int = Field(default=50, ge=0, le=100)


class ScheduleModel(JsonDomainBase):
    """Pydantic model for Schedule serialization."""
    resources: List[ResourceModel]
    tasks: List[TaskModel]
    score: Optional[str] = None
    solver_status: Optional[str] = Field(default=None, alias="solverStatus")
    constraint_weights: Optional[ConstraintWeightsModel] = Field(default=None, alias="constraintWeights")
