import os
from pathlib import Path
import pytest

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


@pytest.fixture(autouse=True)
def configure_test_fixtures(monkeypatch):
    """Ensure test suites that require sample businesses load them from tests/fixtures."""
    monkeypatch.setenv("VERITY_DATA_DIR", str(FIXTURES_DIR))
