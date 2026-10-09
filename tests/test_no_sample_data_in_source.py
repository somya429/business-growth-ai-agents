import os
from pathlib import Path
import pytest
from starlette.testclient import TestClient

FORBIDDEN_NAMES = [
    "CloudPulse",
    "Aura Living",
    "Apex Commercial",
    "Elena Rostova",
    "Starlight Financial",
]

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def test_no_forbidden_sample_data_in_source_code():
    """Assert that none of the 5 forbidden sample names appear in active application source code."""
    scan_paths = [
        PROJECT_ROOT / "core",
        PROJECT_ROOT / "agents",
        PROJECT_ROOT / "api_server.py",
        PROJECT_ROOT / "web" / "src",
    ]

    valid_extensions = {".py", ".ts", ".tsx", ".json"}
    violations = []

    for path in scan_paths:
        if path.is_file():
            files = [path]
        else:
            files = [
                f for f in path.rglob("*")
                if f.is_file()
                and f.suffix in valid_extensions
                and "node_modules" not in str(f)
                and "dist" not in str(f)
            ]

        for file_path in files:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
            for forbidden in FORBIDDEN_NAMES:
                if forbidden.lower() in content.lower():
                    violations.append(f"{file_path.relative_to(PROJECT_ROOT)}: found '{forbidden}'")

    assert not violations, f"Forbidden sample data found in source code:\n" + "\n".join(violations)


def test_clean_start_returns_zero_businesses(tmp_path, monkeypatch):
    """Assert that a clean clone with no database rows shows 0 businesses and empty responses."""
    empty_data_dir = tmp_path / "empty_data"
    empty_data_dir.mkdir()
    monkeypatch.setenv("VERITY_DATA_DIR", str(empty_data_dir))
    monkeypatch.setenv("REPO_BACKEND", "local")

    from core.repo.local import LocalRepository
    repo = LocalRepository(data_dir=str(empty_data_dir), db_path=str(tmp_path / "test.db"))
    businesses = repo.list_businesses()
    assert len(businesses) == 0, f"Expected 0 businesses, got {len(businesses)}"


def test_api_endpoints_do_not_leak_sample_data_when_empty(tmp_path, monkeypatch):
    """Assert no API endpoint returns sample businesses or forbidden strings when DB is empty."""
    empty_data_dir = tmp_path / "empty_data"
    empty_data_dir.mkdir()
    monkeypatch.setenv("VERITY_DATA_DIR", str(empty_data_dir))
    monkeypatch.setenv("REPO_BACKEND", "local")

    import core.repo
    from core.repo.local import LocalRepository
    # Inject a clean repo singleton for this test
    clean_repo = LocalRepository(data_dir=str(empty_data_dir), db_path=str(tmp_path / "test.db"))
    core.repo._REPO_SINGLETON = clean_repo

    import api_server
    client = TestClient(api_server.app)

    # 1. /api/businesses
    res = client.get("/api/businesses")
    assert res.status_code == 200
    data = res.json()
    assert data == [], f"Expected empty businesses list, got {data}"

    # 2. Check text of /api/businesses, /api/health, /api/agents
    for endpoint in ["/api/businesses", "/api/health", "/api/agents"]:
        response = client.get(endpoint)
        assert response.status_code == 200
        text = response.text
        for forbidden in FORBIDDEN_NAMES:
            assert forbidden.lower() not in text.lower(), (
                f"Endpoint {endpoint} leaked forbidden name '{forbidden}': {text}"
            )
