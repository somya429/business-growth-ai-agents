"""Safely reset local runtime storage, SQLite databases, and JSON stores.

Usage:
    python -m core.maintenance.reset_local --dry-run   (DEFAULT: preview actions without modifying files)
    python -m core.maintenance.reset_local --confirm   (EXECUTE: delete runtime sqlite and reset json stores)
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sqlite3
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
RUNTIME_DIR = PROJECT_ROOT / "runtime"
DATA_DIR = PROJECT_ROOT / "data"
CRM_STORE_PATH = PROJECT_ROOT / "b2b_pipeline" / "crm_mock_store.json"


def scan_runtime_files() -> list[dict[str, any]]:
    """Scan and analyze all local SQLite databases, checkpoints, and JSON files."""
    found = []

    # 1. Runtime SQLite files
    if RUNTIME_DIR.exists():
        for p in sorted(RUNTIME_DIR.glob("*")):
            if p.is_file() and (p.suffix in (".sqlite", ".db", "-wal", "-shm") or "sqlite" in p.name.lower()):
                info = {
                    "path": p,
                    "rel_path": str(p.relative_to(PROJECT_ROOT)),
                    "size_bytes": p.stat().st_size,
                    "type": "sqlite",
                    "tables": {},
                }
                if p.suffix in (".sqlite", ".db"):
                    try:
                        conn = sqlite3.connect(str(p))
                        cursor = conn.cursor()
                        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                        tables = [r[0] for r in cursor.fetchall() if not r[0].startswith("sqlite_")]
                        counts = {}
                        for t in tables:
                            try:
                                cursor.execute(f"SELECT count(*) FROM [{t}]")
                                counts[t] = cursor.fetchone()[0]
                            except Exception:
                                counts[t] = "?"
                        conn.close()
                        info["tables"] = counts
                    except Exception as exc:
                        info["tables"] = {"error": str(exc)}
                found.append(info)

    # 2. CRM Mock Store
    if CRM_STORE_PATH.exists():
        try:
            content = json.loads(CRM_STORE_PATH.read_text(encoding="utf-8"))
            count = len(content) if isinstance(content, list) else 1
        except Exception:
            count = 0
        found.append({
            "path": CRM_STORE_PATH,
            "rel_path": str(CRM_STORE_PATH.relative_to(PROJECT_ROOT)),
            "size_bytes": CRM_STORE_PATH.stat().st_size,
            "type": "json_store",
            "item_count": count,
        })

    # 3. Local data directories created dynamically
    if DATA_DIR.exists():
        for child in sorted(DATA_DIR.iterdir()):
            if child.is_dir() and child.name not in ("saas", "ecommerce", "local_services"):
                found.append({
                    "path": child,
                    "rel_path": str(child.relative_to(PROJECT_ROOT)),
                    "size_bytes": 0,
                    "type": "dynamic_business_dir",
                })

    return found


def run_reset(dry_run: bool = True) -> None:
    targets = scan_runtime_files()

    print("\n" + "=" * 70)
    print(" VERITY LOCAL RUNTIME RESET AUDIT")
    print(f" Mode: {'DRY RUN (preview only, no modifications)' if dry_run else 'CONFIRMED EXECUTION (deleting files)'}")
    print("=" * 70 + "\n")

    if not targets:
        print("No local runtime files or stores found. Repository is already clean.")
        return

    print(f"Found {len(targets)} targets:")
    total_bytes = 0

    for idx, item in enumerate(targets, 1):
        rel = item["rel_path"]
        size_kb = item.get("size_bytes", 0) / 1024.0
        total_bytes += item.get("size_bytes", 0)
        t_type = item["type"]

        print(f"[{idx}] {rel} ({size_kb:.1f} KB, type: {t_type})")
        if item.get("tables"):
            print("    Tables & Rows:")
            for tbl, cnt in item["tables"].items():
                print(f"      - {tbl}: {cnt} rows")
        if item.get("item_count") is not None:
            print(f"    JSON array items: {item['item_count']}")

    print("-" * 70)
    print(f"Total storage footprint: {total_bytes / (1024.0 * 1024.0):.2f} MB\n")

    if dry_run:
        print("[DRY-RUN] No files were touched or deleted.")
        print("To safely remove local storage and reset to empty, run:")
        print("    python -m core.maintenance.reset_local --confirm\n")
    else:
        print("Deleting files and resetting stores...")
        for item in targets:
            p: Path = item["path"]
            if item["type"] == "json_store":
                p.write_text("[]\n", encoding="utf-8")
                print(f"  [RESET] {item['rel_path']} -> empty list []")
            elif p.is_file():
                p.unlink()
                print(f"  [DELETED] {item['rel_path']}")
            elif p.is_dir():
                import shutil
                shutil.rmtree(p)
                print(f"  [REMOVED DIR] {item['rel_path']}")
        print("\nLocal reset complete. Application starts completely empty.\n")


def main():
    parser = argparse.ArgumentParser(description="Safely reset local runtime storage files and SQLite databases.")
    parser.add_argument("--dry-run", action="store_true", default=True, help="Preview what would be deleted (default: true)")
    parser.add_argument("--confirm", action="store_true", default=False, help="Explicit confirmation to delete local files")
    args = parser.parse_args()

    # If --confirm was passed, dry_run is disabled
    is_dry_run = not args.confirm
    run_reset(dry_run=is_dry_run)


if __name__ == "__main__":
    main()
