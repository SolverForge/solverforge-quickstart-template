"""
REST API endpoints.

Provides a standard API for:
- Listing and fetching demo data
- Starting/stopping solving
- Getting solution status
- Analyzing scores
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from uuid import uuid4
from dataclasses import replace
from typing import Dict, List
import os

from .domain import Schedule, ScheduleModel, Resource, Task, ConstraintWeightsModel
from .demo_data import DemoData, generate_demo_data
from .solver import solver_manager, solution_manager
from . import constraints  # For setting global weights


app = FastAPI(
    title="SolverForge Quickstart",
    description="Constraint optimization API",
    docs_url='/q/swagger-ui'
)

# In-memory storage for solving jobs
data_sets: dict[str, Schedule] = {}


# =============================================================================
# DEMO DATA ENDPOINTS
# =============================================================================

@app.get("/demo-data")
async def demo_data_list() -> list[DemoData]:
    """List available demo datasets."""
    return [e for e in DemoData]


@app.get("/demo-data/{dataset_id}", response_model_exclude_none=True)
async def get_demo_data(dataset_id: str) -> ScheduleModel:
    """Get a specific demo dataset."""
    demo_data = getattr(DemoData, dataset_id)
    domain_schedule = generate_demo_data(demo_data)
    return _schedule_to_model(domain_schedule)


# =============================================================================
# SOLVING ENDPOINTS
# =============================================================================

@app.post("/schedules")
async def solve(schedule_model: ScheduleModel) -> str:
    """
    Start solving a schedule.

    Returns a job ID that can be used to check progress and get results.
    Accepts optional constraint_weights to adjust constraint penalties.
    """
    job_id = str(uuid4())

    # Set constraint weights globally before solving
    if schedule_model.constraint_weights:
        weights = schedule_model.constraint_weights
        constraints.CONSTRAINT_WEIGHTS = {
            'required_skill': weights.required_skill,
            'resource_capacity': weights.resource_capacity,
            'minimize_duration': weights.minimize_duration,
            'balance_load': weights.balance_load,
        }
    else:
        # Reset to defaults
        constraints.CONSTRAINT_WEIGHTS = {
            'required_skill': 100,
            'resource_capacity': 100,
            'minimize_duration': 50,
            'balance_load': 50,
        }

    schedule = _model_to_schedule(schedule_model)
    data_sets[job_id] = schedule

    solver_manager.solve_and_listen(
        job_id,
        schedule,
        lambda solution: _update_schedule(job_id, solution)
    )
    return job_id


@app.get("/schedules")
async def list_schedules() -> List[str]:
    """List all job IDs."""
    return list(data_sets.keys())


@app.get("/schedules/{job_id}", response_model_exclude_none=True)
async def get_schedule(job_id: str) -> ScheduleModel:
    """Get the current solution for a job."""
    if job_id not in data_sets:
        raise ValueError(f"No schedule found with ID {job_id}")

    schedule = data_sets[job_id]
    updated = replace(schedule, solver_status=solver_manager.get_solver_status(job_id))
    return _schedule_to_model(updated)


@app.get("/schedules/{job_id}/status")
async def get_status(job_id: str) -> Dict:
    """Get solving status and score."""
    if job_id not in data_sets:
        raise ValueError(f"No schedule found with ID {job_id}")

    schedule = data_sets[job_id]
    solver_status = solver_manager.get_solver_status(job_id)

    return {
        "score": {
            "hardScore": schedule.score.hard_score if schedule.score else 0,
            "softScore": schedule.score.soft_score if schedule.score else 0,
        },
        "solverStatus": solver_status.name,
    }


@app.delete("/schedules/{job_id}")
async def stop_solving(job_id: str) -> ScheduleModel:
    """Stop solving and return current solution."""
    if job_id not in data_sets:
        raise ValueError(f"No schedule found with ID {job_id}")

    try:
        solver_manager.terminate_early(job_id)
    except Exception as e:
        print(f"Warning: terminate_early failed for {job_id}: {e}")

    return await get_schedule(job_id)


@app.put("/schedules/analyze")
async def analyze(schedule_model: ScheduleModel) -> Dict:
    """Analyze a schedule's score breakdown."""
    schedule = _model_to_schedule(schedule_model)
    analysis = solution_manager.analyze(schedule)

    constraints = []
    for constraint in getattr(analysis, 'constraint_analyses', []) or []:
        matches = [
            {
                "name": str(getattr(getattr(match, 'constraint_ref', None), 'constraint_name', "")),
                "score": str(getattr(match, 'score', "0hard/0soft")),
                "justification": str(getattr(match, 'justification', "")),
            }
            for match in getattr(constraint, 'matches', []) or []
        ]
        constraints.append({
            "name": str(getattr(constraint, 'constraint_name', "")),
            "weight": str(getattr(constraint, 'weight', "0hard/0soft")),
            "score": str(getattr(constraint, 'score', "0hard/0soft")),
            "matches": matches,
        })

    return {"constraints": constraints}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _update_schedule(job_id: str, schedule: Schedule):
    """Callback for solver updates."""
    global data_sets
    data_sets[job_id] = schedule


def _schedule_to_model(schedule: Schedule) -> ScheduleModel:
    """Convert domain Schedule to Pydantic model."""
    from .domain import ResourceModel, TaskModel, ScheduleModel

    resources = [
        ResourceModel(
            name=r.name,
            capacity=r.capacity,
            skills=list(r.skills),
        )
        for r in schedule.resources
    ]

    tasks = [
        TaskModel(
            id=t.id,
            name=t.name,
            duration=t.duration,
            requiredSkill=t.required_skill,
            resource=t.resource.name if t.resource else None,
        )
        for t in schedule.tasks
    ]

    return ScheduleModel(
        resources=resources,
        tasks=tasks,
        score=str(schedule.score) if schedule.score else None,
        solverStatus=schedule.solver_status.name if schedule.solver_status else None,
    )


def _model_to_schedule(model: ScheduleModel) -> Schedule:
    """Convert Pydantic model to domain Schedule."""
    resources = {
        r.name: Resource(
            name=r.name,
            capacity=r.capacity,
            skills=set(r.skills),
        )
        for r in model.resources
    }

    tasks = [
        Task(
            id=t.id,
            name=t.name,
            duration=t.duration,
            required_skill=t.required_skill or "",
            resource=resources.get(t.resource) if t.resource else None,
        )
        for t in model.tasks
    ]

    return Schedule(
        resources=list(resources.values()),
        tasks=tasks,
    )


# =============================================================================
# SOURCE CODE VIEWER ENDPOINTS
# =============================================================================

# Whitelist of files that can be viewed
SOURCE_FILES = {
    'domain.py': 'src/my_quickstart/domain.py',
    'constraints.py': 'src/my_quickstart/constraints.py',
    'solver.py': 'src/my_quickstart/solver.py',
    'rest_api.py': 'src/my_quickstart/rest_api.py',
    'demo_data.py': 'src/my_quickstart/demo_data.py',
    'index.html': 'static/index.html',
    'app.js': 'static/app.js',
    'app.css': 'static/app.css',
}


@app.get("/source-code")
async def list_source_files() -> List[str]:
    """List available source files for the code viewer."""
    return list(SOURCE_FILES.keys())


@app.get("/source-code/{filename}")
async def get_source_code(filename: str) -> Dict:
    """Get the contents of a source file."""
    if filename not in SOURCE_FILES:
        raise ValueError(f"File not available: {filename}")

    filepath = SOURCE_FILES[filename]
    if not os.path.exists(filepath):
        raise ValueError(f"File not found: {filepath}")

    with open(filepath, 'r') as f:
        content = f.read()

    return {"filename": filename, "content": content}


# =============================================================================
# STATIC FILES (optional web UI)
# =============================================================================

# Mount static files if directory exists
if os.path.exists("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")
