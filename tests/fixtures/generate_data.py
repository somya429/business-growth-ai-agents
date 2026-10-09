"""Generator script to produce synthetic data for 3 diverse businesses:

1. B2B SaaS (CloudPulse Systems)
2. E-commerce (NordicLoom Home)
3. Local Services / Agency (Apex Commercial Facilities)

Includes: profile.json, kb/ docs (product/service sheet, pricing, policies,
3-5 approved claims, things the business does NOT claim), ~30 varied leads,
and past_campaigns.json with outcomes.
"""

from __future__ import annotations

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent


def generate_saas():
    saas_dir = DATA_DIR / "saas"
    kb_dir = saas_dir / "kb"
    kb_dir.mkdir(parents=True, exist_ok=True)

    profile = {
        "name": "CloudPulse Systems",
        "industry": "B2B SaaS / DevOps & Observability",
        "offerings": [
            "Distributed tracing platform",
            "Real-time microservice latency telemetry",
            "Automated root-cause anomaly detection"
        ],
        "ideal_customer": "VP of Engineering, Head of Infrastructure, or DevOps Director at mid-to-enterprise tech companies (100-2,000 employees) with microservices architecture on Kubernetes.",
        "tone": "consultative, technical, concise, and evidence-driven",
        "channels": ["email", "linkedin"],
        "anti_spam": {
            "max_contacts_per_week": 2,
            "quiet_hours": "19:00-08:00",
            "opt_out_list": [
                "unsubscribe@megacorp.internal",
                "dnc@staleenterprise.io",
                "sarah.connor@cyberdyne-defense.com"
            ]
        },
        "enabled_agents": ["research", "scoring", "outreach", "content", "followup", "learning"]
    }
    (saas_dir / "profile.json").write_text(json.dumps(profile, indent=2), encoding="utf-8")

    # KB Docs
    (kb_dir / "product_sheet.md").write_text(
        "# CloudPulse Observability Engine\n\n"
        "## Architecture\n"
        "Zero-overhead eBPF agents collect traces with sub-millisecond overhead.\n\n"
        "## Core Capabilities\n"
        "- Automated Kubernetes service map discovery\n"
        "- Sub-second incident anomaly detection\n"
        "- 15-minute standard agent rollout across clusters\n",
        encoding="utf-8"
    )

    (kb_dir / "pricing.md").write_text(
        "# CloudPulse Pricing & Plans\n\n"
        "- Starter: $1,200/month (up to 50 nodes, 30 days retention)\n"
        "- Growth: $3,500/month (up to 200 nodes, 90 days retention)\n"
        "- Enterprise: Custom annual contracts starting at $50,000/yr\n"
        "- Standard SLA: 99.95% uptime\n",
        encoding="utf-8"
    )

    (kb_dir / "policies.md").write_text(
        "# Security & Compliance Policies\n\n"
        "- SOC 2 Type II certified annually\n"
        "- GDPR, CCPA, and HIPAA compliant with signed BAA available\n"
        "- All telemetry encrypted in transit (TLS 1.3) and at rest (AES-256)\n"
        "- 30-day sandbox pilot requires mutual NDA and security sign-off\n",
        encoding="utf-8"
    )

    (kb_dir / "approved_claims.md").write_text(
        "# Approved Claims for Public Communication\n\n"
        "1. [CLAIM-SAAS-1] Reduces mean time to resolution (MTTR) by up to 43% according to customer telemetry benchmarks.\n"
        "2. [CLAIM-SAAS-2] Rollout requires under 15 minutes per Kubernetes cluster with zero agent restarts.\n"
        "3. [CLAIM-SAAS-3] Agent CPU overhead is measured at less than 1.5% under peak traffic.\n"
        "4. [CLAIM-SAAS-4] Certified SOC 2 Type II and HIPAA compliant infrastructure.\n"
        "5. [CLAIM-SAAS-5] Supports open standards including OpenTelemetry and Prometheus out of the box.\n",
        encoding="utf-8"
    )

    (kb_dir / "unapproved_claims.md").write_text(
        "# Strictly Forbidden / Unapproved Claims (DO NOT CLAIM)\n\n"
        "- NEVER claim 100% downtime prevention or zero bugs.\n"
        "- NEVER quote unapproved discounts or free enterprise tiers.\n"
        "- NEVER claim proprietary AI can replace human engineers or SRE teams.\n"
        "- NEVER claim guaranteed savings of any specific dollar figure without contract audit.\n",
        encoding="utf-8"
    )

    # 30 Leads: Mix of high fit, poor fit, stale dates, opt-outs
    leads = []
    roles = ["VP of Engineering", "Head of DevOps", "Director of Infrastructure", "Chief Technology Officer", "Software Engineer", "Marketing Lead"]
    companies = ["FintechFlow", "HealthData Systems", "StreamScale", "DataWeave", "LegacyRetail Corp", "Cyberdyne Defense", "RetailCo", "SaaSStack", "QuickLogistics", "BioMedix"]

    for i in range(1, 31):
        lead_id = f"lead_saas_{i:03d}"
        role = roles[i % len(roles)]
        company = companies[i % len(companies)]
        email = f"lead.{i}@{company.lower().replace(' ', '')}.com"

        # Special test cases
        if i == 3:
            email = "sarah.connor@cyberdyne-defense.com"  # on opt-out list
            status = "opted_out"
            last_contact = "2026-08-01"
        elif i % 5 == 0:
            last_contact = "2025-01-10"  # Stale data (>1.5 years old)
            status = "contacted"
        elif "Marketing" in role:
            status = "new"  # Poor fit (not tech persona)
            last_contact = None
        else:
            status = "new"
            last_contact = "2026-09-20"

        leads.append({
            "id": lead_id,
            "name": f"User {i} Smith",
            "company": company,
            "role": role,
            "email": email,
            "source": "linkedin_enrichment" if i % 2 == 0 else "inbound_webinar",
            "status": status,
            "last_contacted": last_contact
        })
    (saas_dir / "leads.json").write_text(json.dumps(leads, indent=2), encoding="utf-8")

    # Past campaigns and outcomes
    past_campaigns = {
        "campaign_id": "cmp_saas_q3_devops",
        "channel": "email",
        "target_audience": "DevOps Directors at Series B-D companies",
        "outcomes": [
            {"lead_id": "lead_saas_001", "draft_id": "d_01", "replied": True, "meeting_booked": True, "unsubscribed": False, "complaint": False, "notes": "Interested in OpenTelemetry compatibility."},
            {"lead_id": "lead_saas_002", "draft_id": "d_02", "replied": True, "meeting_booked": False, "unsubscribed": False, "complaint": False, "notes": "Asked for technical whitepaper on eBPF overhead."},
            {"lead_id": "lead_saas_003", "draft_id": "d_03", "replied": False, "meeting_booked": False, "unsubscribed": True, "complaint": False, "notes": "Unsubscribed via footer."},
            {"lead_id": "lead_saas_004", "draft_id": "d_04", "replied": True, "meeting_booked": True, "unsubscribed": False, "complaint": False, "notes": "Booked demo call for Tuesday."},
            {"lead_id": "lead_saas_005", "draft_id": "d_05", "replied": False, "meeting_booked": False, "unsubscribed": False, "complaint": False, "notes": "Stale contact bounced."},
            {"lead_id": "lead_saas_006", "draft_id": "d_06", "replied": True, "meeting_booked": True, "unsubscribed": False, "complaint": False, "notes": "High ICP fit, requested SOC 2 report."},
            {"lead_id": "lead_saas_007", "draft_id": "d_07", "replied": False, "meeting_booked": False, "unsubscribed": False, "complaint": False, "notes": "No response after 2 followups."},
            {"lead_id": "lead_saas_008", "draft_id": "d_08", "replied": True, "meeting_booked": False, "unsubscribed": False, "complaint": False, "notes": "Contract pricing question - handed to AE."},
            {"lead_id": "lead_saas_009", "draft_id": "d_09", "replied": False, "meeting_booked": False, "unsubscribed": False, "complaint": False, "notes": "No response."},
            {"lead_id": "lead_saas_010", "draft_id": "d_10", "replied": False, "meeting_booked": False, "unsubscribed": True, "complaint": False, "notes": "Opted out."}
        ]
    }
    (saas_dir / "past_campaigns.json").write_text(json.dumps(past_campaigns, indent=2), encoding="utf-8")


def generate_ecommerce():
    ecom_dir = DATA_DIR / "ecommerce"
    kb_dir = ecom_dir / "kb"
    kb_dir.mkdir(parents=True, exist_ok=True)

    profile = {
        "name": "NordicLoom Home",
        "industry": "E-commerce / Sustainable Home Textiles",
        "offerings": [
            "GOTS-certified organic cotton beddings",
            "Artisan flax linen throw blankets",
            "Zero-waste kitchen and bath towel bundles"
        ],
        "ideal_customer": "Boutique hotel managers, interior designers, and conscious wholesale buyers looking for premium eco-luxury bedding and sustainable guest amenities.",
        "tone": "warm, aesthetic, sustainable, and design-forward",
        "channels": ["email", "instagram_dm", "linkedin"],
        "anti_spam": {
            "max_contacts_per_week": 1,
            "quiet_hours": "18:00-09:00",
            "opt_out_list": [
                "wholesale-stop@bigboxretail.com",
                "no-contact@budgetinn.com"
            ]
        },
        "enabled_agents": ["research", "scoring", "outreach", "content", "followup", "learning"]
    }
    (ecom_dir / "profile.json").write_text(json.dumps(profile, indent=2), encoding="utf-8")

    (kb_dir / "product_sheet.md").write_text(
        "# NordicLoom Sustainable Textile Catalog\n\n"
        "## Craftsmanship\n"
        "Woven in certified European mills using 100% GOTS-certified organic long-staple cotton and Belgian flax linen.\n\n"
        "## Product Lines\n"
        "- Crisp Percale Sheet Sets (300 thread count, matte finish)\n"
        "- Stonewashed Belgian Linen Duvet Collections\n"
        "- Organic Waffle Spa Towels (600 GSM)\n",
        encoding="utf-8"
    )

    (kb_dir / "pricing.md").write_text(
        "# Wholesale & Hospitality Tier Pricing\n\n"
        "- Minimum Wholesale Order: 15 sets or $1,500\n"
        "- Hospitality Bulk Discount: 25% off MSRP for 30+ units\n"
        "- Custom monograms available for hospitality orders over 50 units ($8/unit fee)\n"
        "- Standard delivery timeline: 7-10 business days across North America and Europe\n",
        encoding="utf-8"
    )

    (kb_dir / "policies.md").write_text(
        "# Sustainability & Return Policies\n\n"
        "- OEKO-TEX Standard 100 Class 1 certified (free from toxic chemicals)\n"
        "- Carbon-neutral freight shipping on all bulk orders over $2,000\n"
        "- 60-day hospitality wash test trial with 100% money-back guarantee\n",
        encoding="utf-8"
    )

    (kb_dir / "approved_claims.md").write_text(
        "# Approved Claims for NordicLoom\n\n"
        "1. [CLAIM-ECOM-1] 100% GOTS-certified organic cotton verified by independent textile audits.\n"
        "2. [CLAIM-ECOM-2] OEKO-TEX Standard 100 certified, tested against over 350 harmful substances.\n"
        "3. [CLAIM-ECOM-3] Woven from Belgian flax linen that softens naturally with each wash without synthetic coating.\n"
        "4. [CLAIM-ECOM-4] Zero-plastic compostable packaging used in all fulfillment.\n",
        encoding="utf-8"
    )

    (kb_dir / "unapproved_claims.md").write_text(
        "# Strictly Forbidden / Unapproved Claims (DO NOT CLAIM)\n\n"
        "- NEVER claim products cure skin conditions or eczema.\n"
        "- NEVER claim products last forever or are indestructible.\n"
        "- NEVER promise next-day wholesale fulfillment for custom orders.\n"
        "- NEVER quote below minimum order quantity (MOQ) without executive approval.\n",
        encoding="utf-8"
    )

    leads = []
    roles = ["Boutique Hotel General Manager", "Interior Design Principal", "Purchasing Director", "Spa Operations Lead", "Front Desk Clerk"]
    orgs = ["The Highland Haven Hotel", "LuxeStay Suites", "Nordic Retreat Spa", "Urban Loft Interiors", "BigBox Wholesale", "BudgetInn Express", "Coastal Haven B&B"]

    for i in range(1, 31):
        lead_id = f"lead_ecom_{i:03d}"
        role = roles[i % len(roles)]
        org = orgs[i % len(orgs)]
        email = f"purchasing.{i}@{org.lower().replace(' ', '')}.com"

        if "BudgetInn" in org:
            email = "no-contact@budgetinn.com"
            status = "opted_out"
            last_contact = "2026-07-10"
        elif i % 4 == 0:
            last_contact = "2024-11-05"  # Stale lead
            status = "contacted"
        elif "Front Desk" in role:
            status = "new"  # Non-decision maker
            last_contact = None
        else:
            status = "new"
            last_contact = "2026-09-12"

        leads.append({
            "id": lead_id,
            "name": f"Buyer {i} Hansen",
            "company": org,
            "role": role,
            "email": email,
            "source": "boutique_hospitality_directory" if i % 2 == 0 else "tradeshow_contact",
            "status": status,
            "last_contacted": last_contact
        })
    (ecom_dir / "leads.json").write_text(json.dumps(leads, indent=2), encoding="utf-8")

    past_campaigns = {
        "campaign_id": "cmp_ecom_fall_boutique",
        "channel": "email",
        "target_audience": "Boutique Hotel Purchasing Heads",
        "outcomes": [
            {"lead_id": "lead_ecom_001", "draft_id": "d_e1", "replied": True, "meeting_booked": True, "unsubscribed": False, "complaint": False, "notes": "Requested sample swatch kit for 20 rooms."},
            {"lead_id": "lead_ecom_002", "draft_id": "d_e2", "replied": True, "meeting_booked": False, "unsubscribed": False, "complaint": False, "notes": "Asked about linen laundry durability."},
            {"lead_id": "lead_ecom_003", "draft_id": "d_e3", "replied": False, "meeting_booked": False, "unsubscribed": True, "complaint": False, "notes": "Budget property, unsubscribed."},
            {"lead_id": "lead_ecom_004", "draft_id": "d_e4", "replied": True, "meeting_booked": True, "unsubscribed": False, "complaint": False, "notes": "Ordered sample bundle for luxury cabins."},
            {"lead_id": "lead_ecom_005", "draft_id": "d_e5", "replied": False, "meeting_booked": False, "unsubscribed": False, "complaint": False, "notes": "No reply."},
            {"lead_id": "lead_ecom_006", "draft_id": "d_e6", "replied": True, "meeting_booked": True, "unsubscribed": False, "complaint": False, "notes": "Met with interior design director."}
        ]
    }
    (ecom_dir / "past_campaigns.json").write_text(json.dumps(past_campaigns, indent=2), encoding="utf-8")


def generate_local_services():
    agency_dir = DATA_DIR / "local_services"
    kb_dir = agency_dir / "kb"
    kb_dir.mkdir(parents=True, exist_ok=True)

    profile = {
        "name": "Apex Commercial Facilities",
        "industry": "Commercial HVAC & Facilities Maintenance Services",
        "offerings": [
            "Commercial HVAC preventive maintenance contracts",
            "Emergency chiller and rooftop RTU 2-hour dispatch",
            "Energy management and ASHRAE IAQ air filtration audits"
        ],
        "ideal_customer": "Property Managers, Facility Directors, and Operations Executives managing commercial office towers, medical office buildings, or light industrial complexes in the metro area.",
        "tone": "authoritative, dependable, local, and pragmatic",
        "channels": ["email", "phone_followup"],
        "anti_spam": {
            "max_contacts_per_week": 2,
            "quiet_hours": "17:30-07:30",
            "opt_out_list": [
                "do-not-solicit@residentialrealty.com",
                "stop@strip-mall-holdings.biz"
            ]
        },
        "enabled_agents": ["research", "scoring", "outreach", "content", "followup", "learning"]
    }
    (agency_dir / "profile.json").write_text(json.dumps(profile, indent=2), encoding="utf-8")

    (kb_dir / "product_sheet.md").write_text(
        "# Apex Commercial HVAC Maintenance Services\n\n"
        "## Scope of Services\n"
        "- Comprehensive quarterly mechanical inspection and coil sanitization\n"
        "- Guaranteed 2-hour priority emergency dispatch for contracted commercial facilities\n"
        "- ASHRAE 62.1 Indoor Air Quality (IAQ) compliance verification\n",
        encoding="utf-8"
    )

    (kb_dir / "pricing.md").write_text(
        "# Contract Service Agreements\n\n"
        "- Standard Office Maintenance: $450/month per 10,000 sq ft\n"
        "- Critical Facility / Medical Grade Agreement: $850/month per 10,000 sq ft (includes monthly filter changes)\n"
        "- Emergency Callout: Included free for contracted clients during normal business hours; discounted rate after-hours\n",
        encoding="utf-8"
    )

    (kb_dir / "policies.md").write_text(
        "# Service Guarantees & Licensing\n\n"
        "- State Master HVAC Licensed (#HVAC-884920) and fully insured ($5M aggregate liability)\n"
        "- EPA Universal Section 608 certified technicians only\n"
        "- 100% written service logs delivered digitally within 24 hours of site visit\n",
        encoding="utf-8"
    )

    (kb_dir / "approved_claims.md").write_text(
        "# Approved Claims for Apex Commercial Facilities\n\n"
        "1. [CLAIM-AGY-1] Over 22 years of continuous commercial HVAC service in the metro region.\n"
        "2. [CLAIM-AGY-2] 100% of lead technicians hold EPA Universal Section 608 certifications.\n"
        "3. [CLAIM-AGY-3] Contracted clients receive guaranteed 2-hour emergency dispatch for critical cooling loss.\n"
        "4. [CLAIM-AGY-4] Backed by $5M commercial general liability insurance policy.\n",
        encoding="utf-8"
    )

    (kb_dir / "unapproved_claims.md").write_text(
        "# Strictly Forbidden / Unapproved Claims (DO NOT CLAIM)\n\n"
        "- NEVER claim equipment will never experience mechanical breakdown.\n"
        "- NEVER quote free maintenance or unlimited free parts replacement.\n"
        "- NEVER perform or promise residential AC repair (commercial facilities only).\n"
        "- NEVER claim city code approvals without on-site municipal inspection.\n",
        encoding="utf-8"
    )

    leads = []
    roles = ["Director of Facilities", "Commercial Property Manager", "Operations Director", "Building Engineer", "Residential Tenant"]
    entities = ["Metro Tower One", "Summit Plaza Medical", "Harbor Business Center", "Eastside Logistics Park", "Strip Mall Holdings", "Residential Realty"]

    for i in range(1, 31):
        lead_id = f"lead_agy_{i:03d}"
        role = roles[i % len(roles)]
        entity = entities[i % len(entities)]
        email = f"facilities.{i}@{entity.lower().replace(' ', '')}.com"

        if "Residential" in entity or "Residential" in role:
            email = "do-not-solicit@residentialrealty.com"
            status = "opted_out"
            last_contact = "2026-06-15"
        elif i % 5 == 0:
            last_contact = "2024-08-10"  # Stale lead
            status = "contacted"
        elif "Residential" in role:
            status = "new"  # Out of ICP scope
            last_contact = None
        else:
            status = "new"
            last_contact = "2026-09-05"

        leads.append({
            "id": lead_id,
            "name": f"Manager {i} Vance",
            "company": entity,
            "role": role,
            "email": email,
            "source": "boma_metro_directory" if i % 2 == 0 else "building_permit_filing",
            "status": status,
            "last_contacted": last_contact
        })
    (agency_dir / "leads.json").write_text(json.dumps(leads, indent=2), encoding="utf-8")

    past_campaigns = {
        "campaign_id": "cmp_agy_commercial_summer_prep",
        "channel": "email",
        "target_audience": "Metro Commercial Property Managers",
        "outcomes": [
            {"lead_id": "lead_agy_001", "draft_id": "d_a1", "replied": True, "meeting_booked": True, "unsubscribed": False, "complaint": False, "notes": "Scheduled chiller audit for 80,000 sq ft medical building."},
            {"lead_id": "lead_agy_002", "draft_id": "d_a2", "replied": True, "meeting_booked": False, "unsubscribed": False, "complaint": False, "notes": "Requested Certificate of Insurance copy."},
            {"lead_id": "lead_agy_003", "draft_id": "d_a3", "replied": False, "meeting_booked": False, "unsubscribed": True, "complaint": False, "notes": "Strip mall owner unsubscribed."},
            {"lead_id": "lead_agy_004", "draft_id": "d_a4", "replied": True, "meeting_booked": True, "unsubscribed": False, "complaint": False, "notes": "Booked site survey for 3 commercial RTU units."},
            {"lead_id": "lead_agy_005", "draft_id": "d_a5", "replied": False, "meeting_booked": False, "unsubscribed": False, "complaint": False, "notes": "No response."},
            {"lead_id": "lead_agy_006", "draft_id": "d_a6", "replied": True, "meeting_booked": True, "unsubscribed": False, "complaint": False, "notes": "Urgent rooftop audit requested."}
        ]
    }
    (agency_dir / "past_campaigns.json").write_text(json.dumps(past_campaigns, indent=2), encoding="utf-8")


if __name__ == "__main__":
    generate_saas()
    generate_ecommerce()
    generate_local_services()
    print("Synthetic data generated successfully for all 3 businesses.")
