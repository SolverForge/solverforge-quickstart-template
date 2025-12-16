"""
Pydantic utilities for JSON serialization.

This provides a base class with camelCase conversion for REST API compatibility.
"""

from solverforge_legacy.solver.score import HardSoftScore
from typing import Any
from pydantic import BaseModel, ConfigDict, PlainSerializer, BeforeValidator
from pydantic.alias_generators import to_camel


# Score serialization (HardSoftScore -> string like "0hard/0soft")
ScoreSerializer = PlainSerializer(
    lambda score: str(score) if score is not None else None,
    return_type=str | None
)


def validate_score(v: Any) -> Any:
    """Parse score from string format."""
    if isinstance(v, HardSoftScore) or v is None:
        return v
    if isinstance(v, str):
        return HardSoftScore.parse(v)
    raise ValueError('"score" should be a string')


ScoreValidator = BeforeValidator(validate_score)


class JsonDomainBase(BaseModel):
    """
    Base class for Pydantic models with camelCase JSON serialization.

    Converts Python snake_case to JavaScript camelCase automatically.
    """
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )
