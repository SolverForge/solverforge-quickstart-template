"""
Constraint definitions for your optimization problem.

Constraints are defined using a fluent API:
1. for_each(Entity) - iterate over all entities
2. filter(predicate) - keep only matching entities
3. join(OtherEntity, ...) - combine with other entities
4. group_by(key, collector) - aggregate by key
5. penalize(weight) or reward(weight) - affect the score

TODO: Replace these example constraints with your own business rules.
"""

from solverforge_legacy.solver.score import (
    constraint_provider,
    ConstraintFactory,
    Joiners,
    HardSoftScore,
    ConstraintCollectors,
)

from .domain import Resource, Task


# =============================================================================
# CONSTRAINT WEIGHTS
# =============================================================================
# Global weights that can be adjusted at runtime via the REST API.
# Weight 0 = disabled, 100 = full strength.
# Set by rest_api.py before solving starts.

CONSTRAINT_WEIGHTS = {
    'required_skill': 100,      # Hard constraint
    'resource_capacity': 100,   # Hard constraint
    'minimize_duration': 50,    # Soft constraint
    'balance_load': 50,         # Soft constraint
}


def get_weight(name: str) -> int:
    """Get the weight for a constraint (0-100 scale)."""
    return CONSTRAINT_WEIGHTS.get(name, 100)


@constraint_provider
def define_constraints(constraint_factory: ConstraintFactory):
    """
    Define all constraints for the optimization problem.

    Returns a list of constraints, evaluated in order:
    - Hard constraints: Must be satisfied (score < 0 = infeasible)
    - Soft constraints: Should be optimized (higher = better)
    """
    return [
        # Hard constraints (must be satisfied)
        required_skill(constraint_factory),
        resource_capacity(constraint_factory),

        # Soft constraints (optimize these)
        minimize_total_duration(constraint_factory),
        balance_resource_load(constraint_factory),
    ]


# =============================================================================
# HARD CONSTRAINTS
# =============================================================================

def required_skill(constraint_factory: ConstraintFactory):
    """
    Hard: Each task must be assigned to a resource with the required skill.

    Pattern: for_each -> filter -> penalize

    NOTE: We check task.resource is not None FIRST, because unassigned tasks
    should not be penalized - they're just not yet assigned.

    NOTE: We use len(str(task.required_skill)) > 0 instead of just task.required_skill
    because the value may be a Java String object which doesn't work with Python's
    boolean operators directly.

    WEIGHT: When weight=0, this constraint is effectively disabled.
    """
    weight = get_weight('required_skill')
    if weight == 0:
        # Return a no-op constraint when disabled
        return (
            constraint_factory.for_each(Task)
            .filter(lambda task: False)  # Never matches
            .penalize(HardSoftScore.ONE_HARD)
            .as_constraint("Required skill missing")
        )

    return (
        constraint_factory.for_each(Task)
        .filter(lambda task: task.resource is not None
                and len(str(task.required_skill)) > 0
                and not task.has_required_skill())
        .penalize(HardSoftScore.ONE_HARD, lambda task: weight)
        .as_constraint("Required skill missing")
    )


def resource_capacity(constraint_factory: ConstraintFactory):
    """
    Hard: Total task duration per resource must not exceed capacity.

    Pattern: for_each -> group_by -> filter -> penalize

    WEIGHT: When weight=0, this constraint is effectively disabled.
    """
    weight = get_weight('resource_capacity')
    if weight == 0:
        return (
            constraint_factory.for_each(Task)
            .filter(lambda task: False)
            .penalize(HardSoftScore.ONE_HARD)
            .as_constraint("Resource capacity exceeded")
        )

    return (
        constraint_factory.for_each(Task)
        .group_by(
            lambda task: task.resource,
            ConstraintCollectors.sum(lambda task: task.duration)
        )
        .filter(lambda resource, total_duration:
                resource is not None and total_duration > resource.capacity)
        .penalize(
            HardSoftScore.ONE_HARD,
            lambda resource, total_duration: (total_duration - resource.capacity) * weight // 100
        )
        .as_constraint("Resource capacity exceeded")
    )


# =============================================================================
# SOFT CONSTRAINTS
# =============================================================================

def minimize_total_duration(constraint_factory: ConstraintFactory):
    """
    Soft: Prefer shorter total duration (makespan).

    Pattern: for_each -> penalize with weight function

    WEIGHT: Penalty multiplied by weight/100.
    """
    weight = get_weight('minimize_duration')
    if weight == 0:
        return (
            constraint_factory.for_each(Task)
            .filter(lambda task: False)
            .penalize(HardSoftScore.ONE_SOFT)
            .as_constraint("Minimize total duration")
        )

    return (
        constraint_factory.for_each(Task)
        .filter(lambda task: task.resource is not None)
        .penalize(HardSoftScore.ONE_SOFT, lambda task: task.duration * weight // 100)
        .as_constraint("Minimize total duration")
    )


def balance_resource_load(constraint_factory: ConstraintFactory):
    """
    Soft: Balance workload fairly across all resources.

    Pattern: for_each -> group_by -> complement -> group_by(loadBalance) -> penalize

    WEIGHT: Penalty multiplied by weight/100.
    """
    weight = get_weight('balance_load')
    if weight == 0:
        return (
            constraint_factory.for_each(Task)
            .filter(lambda task: False)
            .penalize(HardSoftScore.ONE_SOFT)
            .as_constraint("Balance resource load")
        )

    return (
        constraint_factory.for_each(Task)
        .group_by(
            lambda task: task.resource,
            ConstraintCollectors.sum(lambda task: task.duration)
        )
        .complement(Resource, lambda r: 0)  # Include resources with 0 tasks
        .group_by(
            ConstraintCollectors.load_balance(
                lambda resource, duration: resource,
                lambda resource, duration: duration,
            )
        )
        .penalize(
            HardSoftScore.ONE_SOFT,
            lambda load_balance: int(load_balance.unfairness()) * weight // 100
        )
        .as_constraint("Balance resource load")
    )


# =============================================================================
# ADDITIONAL CONSTRAINT PATTERNS (commented examples)
# =============================================================================

# def no_overlapping_tasks(constraint_factory: ConstraintFactory):
#     """
#     Example: Two tasks on same resource cannot overlap in time.
#
#     Pattern: for_each_unique_pair with Joiners
#     """
#     return (
#         constraint_factory.for_each_unique_pair(
#             Task,
#             Joiners.equal(lambda task: task.resource),
#             Joiners.overlapping(
#                 lambda task: task.start_time,
#                 lambda task: task.end_time
#             ),
#         )
#         .penalize(HardSoftScore.ONE_HARD)
#         .as_constraint("Overlapping tasks")
#     )


# def preferred_resource(constraint_factory: ConstraintFactory):
#     """
#     Example: Reward tasks assigned to their preferred resource.
#
#     Pattern: for_each -> filter -> reward
#     """
#     return (
#         constraint_factory.for_each(Task)
#         .filter(lambda task: task.resource == task.preferred_resource)
#         .reward(HardSoftScore.ONE_SOFT)
#         .as_constraint("Preferred resource")
#     )
