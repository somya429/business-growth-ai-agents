"""Repository module exports and get_repo factory."""

from __future__ import annotations

import logging
import os

from core.repo.base import Repository
from core.repo.local import LocalRepository
from core.repo.supabase import SupabaseRepository

logger = logging.getLogger("core.repo")

_REPO_SINGLETON: Repository | None = None
_STORAGE_FALLBACK_ACTIVE: bool = False


def get_repo(force_refresh: bool = False, backend: str | None = None) -> Repository:
    """Factory to retrieve or instantiate the configured Repository singleton.

    Backend is determined by:
    1. Explicit `backend` argument ('local' or 'supabase')
    2. Environment variable REPO_BACKEND ('local' or 'supabase', default 'local')
    """
    global _REPO_SINGLETON, _STORAGE_FALLBACK_ACTIVE
    if _REPO_SINGLETON is not None and not force_refresh and backend is None:
        return _REPO_SINGLETON

    active_backend = (backend or os.environ.get("REPO_BACKEND", "local")).lower()

    if active_backend == "supabase":
        try:
            repo = SupabaseRepository()
            _STORAGE_FALLBACK_ACTIVE = False
            logger.info("Initialized SupabaseRepository backend.")
        except Exception as exc:
            should_fallback = os.environ.get("REPO_FALLBACK", "1").lower() in ("1", "true", "yes")
            if should_fallback:
                logger.warning(f"Could not connect to Supabase ({exc}). Falling back to LocalRepository.")
                repo = LocalRepository()
                _STORAGE_FALLBACK_ACTIVE = True
            else:
                raise
    else:
        repo = LocalRepository()
        _STORAGE_FALLBACK_ACTIVE = False
        logger.debug("Initialized LocalRepository backend.")

    if backend is None:
        _REPO_SINGLETON = repo
    return repo


def get_active_backend_info() -> dict[str, Any]:
    """Report active repository backend and fallback status."""
    global _STORAGE_FALLBACK_ACTIVE
    repo = get_repo()
    backend_name = "supabase" if isinstance(repo, SupabaseRepository) else "local"
    return {
        "repository_active": backend_name,
        "storage_backend": backend_name,
        "storage_fallback": _STORAGE_FALLBACK_ACTIVE,
    }


__all__ = [
    "Repository",
    "LocalRepository",
    "SupabaseRepository",
    "get_repo",
    "get_active_backend_info",
]
