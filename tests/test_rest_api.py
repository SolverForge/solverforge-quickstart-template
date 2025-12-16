"""
REST API endpoint tests.

Tests for the FastAPI endpoints including the source code viewer API.
"""

import pytest
from fastapi.testclient import TestClient
from my_quickstart.rest_api import app


@pytest.fixture
def client():
    """Create a test client for the API."""
    return TestClient(app)


# =============================================================================
# SOURCE CODE VIEWER TESTS
# =============================================================================

class TestSourceCodeEndpoints:
    """Tests for the /source-code endpoints."""

    def test_list_source_files(self, client):
        """GET /source-code should return list of available files."""
        response = client.get("/source-code")
        assert response.status_code == 200
        files = response.json()
        assert isinstance(files, list)
        assert "domain.py" in files
        assert "constraints.py" in files
        assert "rest_api.py" in files

    def test_get_domain_py(self, client):
        """GET /source-code/domain.py should return file contents."""
        response = client.get("/source-code/domain.py")
        assert response.status_code == 200
        data = response.json()
        assert "filename" in data
        assert "content" in data
        assert data["filename"] == "domain.py"
        assert "@planning_entity" in data["content"]

    def test_get_constraints_py(self, client):
        """GET /source-code/constraints.py should return file contents."""
        response = client.get("/source-code/constraints.py")
        assert response.status_code == 200
        data = response.json()
        assert "content" in data
        assert "@constraint_provider" in data["content"]

    def test_get_nonexistent_file(self, client):
        """GET /source-code/nonexistent.py should return error."""
        response = client.get("/source-code/nonexistent.py")
        assert response.status_code != 200


# =============================================================================
# DEMO DATA TESTS
# =============================================================================

class TestDemoDataEndpoints:
    """Tests for the /demo-data endpoints."""

    def test_list_demo_data(self, client):
        """GET /demo-data should return list of datasets."""
        response = client.get("/demo-data")
        assert response.status_code == 200
        datasets = response.json()
        assert isinstance(datasets, list)

    def test_get_small_dataset(self, client):
        """GET /demo-data/SMALL should return a schedule."""
        response = client.get("/demo-data/SMALL")
        assert response.status_code == 200
        data = response.json()
        assert "resources" in data
        assert "tasks" in data
