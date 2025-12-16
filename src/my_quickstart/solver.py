"""
Solver configuration.

This file configures the SolverForge optimization engine:
- Solution class (what to optimize)
- Entity classes (what to assign)
- Constraint provider (business rules)
- Termination config (when to stop)
"""

from solverforge_legacy.solver import SolverManager, SolverFactory, SolutionManager
from solverforge_legacy.solver.config import (
    SolverConfig,
    ScoreDirectorFactoryConfig,
    TerminationConfig,
    Duration,
)

from .domain import Schedule, Task
from .constraints import define_constraints


# Solver configuration
solver_config = SolverConfig(
    solution_class=Schedule,
    entity_class_list=[Task],
    score_director_factory_config=ScoreDirectorFactoryConfig(
        constraint_provider_function=define_constraints
    ),
    termination_config=TerminationConfig(
        # Stop after 30 seconds (adjust for your problem size)
        spent_limit=Duration(seconds=30)
    ),
)

# Create solver manager (handles async solving)
solver_manager = SolverManager.create(SolverFactory.create(solver_config))

# Create solution manager (for score analysis)
solution_manager = SolutionManager.create(solver_manager)
