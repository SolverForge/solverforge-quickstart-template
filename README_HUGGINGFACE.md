---
title: SolverForge Quickstart
emoji: "+"
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
license: apache
---

# SolverForge Quickstart

A constraint optimization application powered by [SolverForge](https://github.com/solverforge).

## What This Does

This app solves a **task assignment optimization problem**:
- Assign tasks to resources while respecting skill requirements
- Balance workload fairly across resources
- Minimize total duration

## How to Use

1. Click "Load Small Dataset" to load sample data
2. Click "Solve" to start the optimization
3. Watch the score improve as the solver works
4. Click "Stop" to terminate early if needed

## API

Access the API documentation at `/q/swagger-ui`

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/demo-data` | List demo datasets |
| GET | `/demo-data/{id}` | Get demo data |
| POST | `/schedules` | Start solving |
| GET | `/schedules/{id}` | Get solution |
| DELETE | `/schedules/{id}` | Stop solving |

## Technical Details

- **Backend**: Python + FastAPI
- **Solver**: SolverForge (Timefold-based metaheuristic)
- **Runtime**: Requires JDK 21 (included in Docker image)
