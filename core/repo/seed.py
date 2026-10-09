"""Seed script to populate Local or Supabase repository with the 3 synthetic businesses."""

from __future__ import annotations

import argparse
import json
import logging
import math
import os
from pathlib import Path
import sys

from core.repo.base import Repository
from core.repo.local import LocalRepository
from core.repo.supabase import SupabaseRepository
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("core.repo.seed")

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
BUSINESSES = ["saas", "ecommerce", "local_services"]


def generate_dummy_embedding(text: str, dim: int = 384) -> list[float]:
    """Generate a deterministic normalized embedding vector for testing pgvector."""
    vec = [0.0] * dim
    for idx, char in enumerate(text[:dim]):
        vec[idx] = (ord(char) % 100) / 100.0
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [round(x / norm, 5) for x in vec]


def seed_repository(repo: Repository, backend_name: str) -> None:
    logger.info(f"Starting seed process for backend: {backend_name}")

    if not DATA_DIR.exists():
        raise FileNotFoundError(f"Data directory not found at {DATA_DIR}")

    if backend_name == "supabase" and isinstance(repo, SupabaseRepository) and repo.client is not None:
        client = repo.client
        for biz_key in BUSINESSES:
            biz_dir = DATA_DIR / biz_key
            if not biz_dir.exists():
                logger.warning(f"Business folder {biz_dir} not found; skipping.")
                continue

            # 1. Profile
            profile_data = json.loads((biz_dir / "profile.json").read_text(encoding="utf-8"))
            biz_row = {
                "id": biz_key,
                "name": profile_data.get("name"),
                "industry": profile_data.get("industry"),
                "offerings": profile_data.get("offerings", []),
                "ideal_customer": profile_data.get("ideal_customer", ""),
                "tone": profile_data.get("tone", "professional and consultative"),
                "channels": profile_data.get("channels", ["email", "linkedin"]),
                "anti_spam": profile_data.get("anti_spam", {}),
                "enabled_agents": profile_data.get("enabled_agents", []),
            }
            client.table("businesses").upsert(biz_row).execute()
            logger.info(f"[{biz_key}] Upserted business profile: {biz_row['name']}")

            # 2. KB docs
            kb_dir = biz_dir / "kb"
            if kb_dir.exists():
                for doc_file in kb_dir.glob("*.md"):
                    doc_id = f"kb_{biz_key}_{doc_file.stem}"
                    title = doc_file.stem.replace("_", " ").title()
                    text = doc_file.read_text(encoding="utf-8")
                    embedding = generate_dummy_embedding(text)
                    kb_row = {
                        "id": doc_id,
                        "business_id": biz_key,
                        "title": title,
                        "text": text,
                        "embedding": embedding,
                    }
                    client.table("kb_docs").upsert(kb_row).execute()
                logger.info(f"[{biz_key}] Seeded KB docs from {kb_dir}")

            # 3. Leads
            leads_file = biz_dir / "leads.json"
            if leads_file.exists():
                leads = json.loads(leads_file.read_text(encoding="utf-8"))
                for l in leads:
                    l_row = {
                        "id": l.get("id"),
                        "business_id": biz_key,
                        "name": l.get("name"),
                        "company": l.get("company"),
                        "role": l.get("role"),
                        "email": l.get("email"),
                        "source": l.get("source", "inbound"),
                        "status": l.get("status", "new"),
                        "last_contacted": l.get("last_contacted"),
                    }
                    client.table("leads").upsert(l_row).execute()
                logger.info(f"[{biz_key}] Seeded {len(leads)} leads")

            # 4. Campaigns and past outcomes
            camp_file = biz_dir / "past_campaigns.json"
            if camp_file.exists():
                camp_data = json.loads(camp_file.read_text(encoding="utf-8"))
                camp_id = camp_data.get("campaign_id", f"cmp_{biz_key}_q3")
                camp_row = {
                    "id": camp_id,
                    "business_id": biz_key,
                    "name": f"{biz_key.upper()} Campaign",
                    "channel": camp_data.get("channel", "email"),
                    "target_audience": camp_data.get("target_audience", ""),
                }
                client.table("campaigns").upsert(camp_row).execute()

                outcomes = camp_data.get("outcomes", [])
                for idx, o in enumerate(outcomes):
                    o_row = {
                        "outcome_id": f"out_{biz_key}_{idx}_{o.get('lead_id')}",
                        "business_id": biz_key,
                        "lead_id": o.get("lead_id"),
                        "draft_id": o.get("draft_id"),
                        "replied": bool(o.get("replied")),
                        "meeting_booked": bool(o.get("meeting_booked")),
                        "unsubscribed": bool(o.get("unsubscribed")),
                        "complaint": bool(o.get("complaint")),
                        "notes": o.get("notes", ""),
                    }
                    client.table("outcomes").upsert(o_row).execute()
                logger.info(f"[{biz_key}] Seeded campaign {camp_id} with {len(outcomes)} outcomes")

    elif isinstance(repo, LocalRepository):
        logger.info("LocalRepository uses direct file reads from /data folder.")
        businesses = repo.list_businesses()
        logger.info(f"Found {len(businesses)} local businesses ready to use: {[b['id'] for b in businesses]}")
        for b in businesses:
            leads = repo.get_leads(b["id"])
            kb = repo.get_kb_docs(b["id"])
            outcomes = repo.get_outcomes(b["id"])
            logger.info(
                f"- [{b['id']}] {b.get('name')}: {len(kb)} KB docs, {len(leads)} leads, {len(outcomes)} past outcomes."
            )

    logger.info(f"[OK] Seed complete for backend: {backend_name}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed Growth Agents data store")
    parser.add_argument(
        "--backend",
        choices=["local", "supabase"],
        default=os.environ.get("REPO_BACKEND", "local").lower(),
        help="Repository backend to seed (local or supabase)",
    )
    args = parser.parse_args()

    if args.backend == "supabase":
        try:
            repo = SupabaseRepository()
        except Exception as e:
            logger.error(f"Cannot initialize Supabase repository: {e}")
            sys.exit(1)
    else:
        repo = LocalRepository()

    seed_repository(repo, args.backend)


if __name__ == "__main__":
    main()
