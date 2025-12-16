"""
Demo data generation.

Provides sample datasets for testing and demonstration.
TODO: Replace with realistic data for your domain.
"""

from enum import Enum
from .domain import Resource, Task, Schedule


class DemoData(str, Enum):
    """Available demo datasets."""
    SMALL = "SMALL"
    MEDIUM = "MEDIUM"


def generate_demo_data(dataset: DemoData) -> Schedule:
    """
    Generate a demo dataset.

    TODO: Replace with realistic data for your domain.
    """
    if dataset == DemoData.SMALL:
        return _generate_small()
    elif dataset == DemoData.MEDIUM:
        return _generate_medium()
    else:
        raise ValueError(f"Unknown dataset: {dataset}")


def _generate_small() -> Schedule:
    """Small dataset: 3 resources, 10 tasks."""
    resources = [
        Resource(name="Alice", capacity=100, skills={"python", "sql"}),
        Resource(name="Bob", capacity=120, skills={"python", "java"}),
        Resource(name="Charlie", capacity=80, skills={"sql", "java"}),
    ]

    tasks = [
        Task(id="task-1", name="Data Pipeline", duration=30, required_skill="python"),
        Task(id="task-2", name="API Development", duration=45, required_skill="python"),
        Task(id="task-3", name="Database Schema", duration=20, required_skill="sql"),
        Task(id="task-4", name="Query Optimization", duration=35, required_skill="sql"),
        Task(id="task-5", name="Backend Service", duration=50, required_skill="java"),
        Task(id="task-6", name="Data Analysis", duration=25, required_skill="python"),
        Task(id="task-7", name="Report Generation", duration=15, required_skill="sql"),
        Task(id="task-8", name="Integration Tests", duration=40, required_skill="java"),
        Task(id="task-9", name="Code Review", duration=20),  # No skill required
        Task(id="task-10", name="Documentation", duration=15),  # No skill required
    ]

    return Schedule(resources=resources, tasks=tasks)


def _generate_medium() -> Schedule:
    """Medium dataset: 5 resources, 25 tasks.

    Total capacity: 700 min (150+140+130+160+120)
    Total task duration: ~675 min (feasible but challenging)
    """
    resources = [
        Resource(name="Alice", capacity=150, skills={"python", "sql", "ml"}),
        Resource(name="Bob", capacity=140, skills={"python", "java", "devops"}),
        Resource(name="Charlie", capacity=130, skills={"sql", "java", "frontend"}),
        Resource(name="Diana", capacity=160, skills={"python", "ml", "devops"}),
        Resource(name="Eve", capacity=120, skills={"frontend", "java", "sql"}),
    ]

    skills = ["python", "sql", "java", "ml", "devops", "frontend", ""]
    tasks = []
    for i in range(25):
        skill = skills[i % len(skills)]
        tasks.append(
            Task(
                id=f"task-{i+1}",
                name=f"Task {i+1}",
                # Duration formula: 15-39 min, total ~675 min (fits in 700 capacity)
                duration=15 + (i * 3) % 25,
                required_skill=skill,
            )
        )

    return Schedule(resources=resources, tasks=tasks)
