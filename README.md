# SolverForge Quickstart Template

A template for creating constraint optimization applications with SolverForge.

## Quick Start

### Local Development

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"

# Run tests
pytest tests/ -v

# Start the application
run-app
```

Visit http://localhost:8080/q/swagger-ui for the API documentation.

### Deploy to HuggingFace Spaces

1. Create a new Space at https://huggingface.co/new-space
2. Select **Docker** as the SDK
3. Upload all files from this repository
4. The Space will automatically build and deploy

Your app will be live at `https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME`

## Project Structure

```
my-quickstart/
├── pyproject.toml          # Package configuration
├── Dockerfile              # Container definition (HuggingFace compatible)
├── README.md               # This file
├── logging.conf            # Logging configuration
├── src/my_quickstart/
│   ├── __init__.py         # App entry point
│   ├── domain.py           # Domain model (@dataclass + @planning_entity)
│   ├── constraints.py      # Constraint definitions (@constraint_provider)
│   ├── solver.py           # Solver configuration
│   ├── rest_api.py         # FastAPI endpoints
│   ├── demo_data.py        # Sample datasets
│   └── json_serialization.py  # Pydantic utilities
├── tests/
│   └── test_constraints.py # Constraint verification tests
└── static/
    └── index.html          # Optional web UI
```

## Customization Guide

### 1. Define Your Domain (domain.py)

```python
from dataclasses import dataclass
from typing import Annotated
from solverforge_legacy.solver.domain import (
    planning_entity, planning_solution,
    PlanningId, PlanningVariable,
    PlanningEntityCollectionProperty,
    ProblemFactCollectionProperty,
    ValueRangeProvider, PlanningScore,
)

# Problem facts (immutable input data)
@dataclass
class Resource:
    name: Annotated[str, PlanningId]
    capacity: int

# Planning entities (what the solver assigns)
@planning_entity
@dataclass
class Task:
    id: Annotated[str, PlanningId]
    duration: int
    resource: Annotated[Resource | None, PlanningVariable] = None

# Solution container
@planning_solution
@dataclass
class Schedule:
    resources: Annotated[list[Resource], ProblemFactCollectionProperty, ValueRangeProvider]
    tasks: Annotated[list[Task], PlanningEntityCollectionProperty]
    score: Annotated[HardSoftScore | None, PlanningScore] = None
```

### 2. Define Constraints (constraints.py)

```python
from solverforge_legacy.solver.score import (
    constraint_provider, ConstraintFactory,
    HardSoftScore, Joiners, ConstraintCollectors,
)

@constraint_provider
def define_constraints(constraint_factory: ConstraintFactory):
    return [
        resource_capacity(constraint_factory),
        minimize_makespan(constraint_factory),
    ]

def resource_capacity(constraint_factory: ConstraintFactory):
    return (
        constraint_factory.for_each(Task)
        .group_by(lambda t: t.resource, ConstraintCollectors.sum(lambda t: t.duration))
        .filter(lambda resource, total: total > resource.capacity)
        .penalize(HardSoftScore.ONE_HARD, lambda r, total: total - r.capacity)
        .as_constraint("Resource capacity")
    )
```

### 3. Run Tests

```bash
pytest tests/ -v
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/demo-data` | GET | List available demo datasets |
| `/demo-data/{id}` | GET | Get specific demo data |
| `/schedules` | POST | Start solving (returns job_id) |
| `/schedules/{id}` | GET | Get current solution |
| `/schedules/{id}` | DELETE | Stop solving |
| `/schedules/analyze` | PUT | Analyze solution score |
| `/q/swagger-ui` | GET | API documentation |

## Requirements

- Python 3.10+
- JDK 17+ (for solverforge-legacy)

## License

MIT
