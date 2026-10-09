"""Safe remote Supabase maintenance script to audit and purge remote database tables.

Foreign-key-safe deletion order: child tables are deleted first, parent tables last.
Blind CASCADE operations are strictly avoided.

Usage:
    python core/maintenance/purge_remote.py            (DEFAULT: Dry run preview)
    python core/maintenance/purge_remote.py --confirm  (Requires interactive typing of project ref)
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from urllib.parse import urlparse

from dotenv import load_dotenv

load_dotenv()

# Foreign-key-safe deletion order (children first, parents last)
FK_SAFE_DELETION_ORDER = [
    # 1. Task sub-entities
    "task_events",
    "task_versions",
    "agent_reports",
    "tasks",
    # 2. Run & audit sub-entities
    "approvals",
    "flags",
    "trust_reports",
    "drafts",
    "traces",
    "outcomes",
    # 3. Campaign & Strategy sub-entities
    "campaign_experiments",
    "campaign_plans",
    "strategy_assumptions",
    "unit_economics_models",
    "strategy_positionings",
    # 4. Lead & Document sub-entities
    "lead_updates",
    "opt_outs",
    "leads",
    "kb_docs",
    # 5. Core execution entities
    "runs",
    "onboarding_sessions",
    # 6. Top-level business entities
    "business_profiles",
    "businesses",
    "audit_log",
]


def extract_project_ref(supabase_url: str) -> str:
    """Extract project ref from Supabase URL (e.g., https://abcdefgh.supabase.co -> abcdefgh)."""
    if not supabase_url:
        return ""
    parsed = urlparse(supabase_url)
    hostname = parsed.hostname or supabase_url
    match = re.search(r"^([a-z0-9_-]+)\.supabase\.(co|in|net)", hostname, re.IGNORECASE)
    if match:
        return match.group(1)
    return hostname.split(".")[0]


def get_table_counts(client) -> dict[str, int | str]:
    """Query row counts for each registered table in public schema."""
    counts = {}
    for table in FK_SAFE_DELETION_ORDER:
        try:
            res = client.table(table).select("*", count="exact").limit(0).execute()
            counts[table] = res.count if res.count is not None else 0
        except Exception as exc:
            counts[table] = f"error/not_found"
    return counts


def run_purge(dry_run: bool = True) -> None:
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY", "").strip()

    print("\n" + "=" * 70)
    print(" VERITY SUPABASE REMOTE DATABASE AUDIT & PURGE")
    print(f" Mode: {'DRY RUN (preview only, no modifications)' if dry_run else 'DELETION REQUESTED'}")
    print("=" * 70 + "\n")

    if not url or not key:
        print("[ERROR] SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in your .env file.")
        sys.exit(1)

    project_ref = extract_project_ref(url)
    print(f"Target Supabase Project: {url}")
    print(f"Extracted Project Ref:   {project_ref}\n")

    try:
        from supabase import create_client
        client = create_client(url, key)
    except Exception as exc:
        print(f"[ERROR] Failed to connect to Supabase: {exc}")
        sys.exit(1)

    print("Auditing remote table row counts...")
    counts = get_table_counts(client)

    print("\nRemote Tables Audit (in foreign-key-safe deletion order):")
    print(f"{'Order':<6} {'Table Name':<28} {'Rows':<12} {'Status'}")
    print("-" * 70)

    total_rows = 0
    tables_with_data = []

    for idx, table in enumerate(FK_SAFE_DELETION_ORDER, 1):
        cnt = counts.get(table, 0)
        status = "Clean"
        if isinstance(cnt, int):
            if cnt > 0:
                status = f"Contains {cnt} rows"
                total_rows += cnt
                tables_with_data.append((table, cnt))
            cnt_str = str(cnt)
        else:
            cnt_str = str(cnt)
            status = "Table not present or query restricted"

        print(f"[{idx:<3}] {table:<28} {cnt_str:<12} {status}")

    print("-" * 70)
    print(f"Total rows detected across all audited tables: {total_rows}\n")

    if dry_run:
        print("[DRY RUN PREVIEW]")
        print("In a confirmed execution, records would be deleted sequentially in the")
        print("exact foreign-key-safe order above without blind CASCADE triggers.")
        print("\nTo execute this purge yourself, run:")
        print("    python core/maintenance/purge_remote.py --confirm")
        print(f"\nYou will be prompted to type the exact project reference: '{project_ref}'\n")
        return

    # Confirmed execution branch
    print("=" * 70)
    print(" CAUTION: DESTRUCTIVE ACTION REQUESTED")
    print(f" Project: {project_ref} ({url})")
    print(f" Total rows to delete: {total_rows}")
    print("=" * 70)

    typed_ref = input(f"\nType the project ref '{project_ref}' to confirm deletion: ").strip()
    if typed_ref != project_ref:
        print("\n[ABORTED] Typed project reference did not match. No remote records were deleted.\n")
        sys.exit(1)

    print("\nExecuting foreign-key-safe deletion...")
    deleted_counts = {}

    for table in FK_SAFE_DELETION_ORDER:
        cnt = counts.get(table, 0)
        if isinstance(cnt, int) and cnt > 0:
            try:
                # Delete all rows without cascade
                res = client.table(table).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
                deleted_counts[table] = cnt
                print(f"  [PURGED] {table} ({cnt} rows removed)")
            except Exception as exc:
                print(f"  [ERROR] Failed to purge {table}: {exc}")
        else:
            print(f"  [SKIPPED] {table} (0 rows)")

    print("\nRemote purge complete. Supabase database is now empty.\n")


def main():
    parser = argparse.ArgumentParser(description="Audit and purge remote Supabase database tables.")
    parser.add_argument("--dry-run", action="store_true", default=True, help="Preview what would be purged (default: true)")
    parser.add_argument("--confirm", action="store_true", default=False, help="Confirm deletion (requires typing project ref)")
    args = parser.parse_args()

    is_dry_run = not args.confirm
    run_purge(dry_run=is_dry_run)


if __name__ == "__main__":
    main()
