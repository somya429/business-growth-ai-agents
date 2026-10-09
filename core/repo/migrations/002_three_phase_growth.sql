-- ============================================================================
-- VERITY ADAPTIVE THREE-PHASE GROWTH SYSTEM: DATABASE MIGRATION 002
-- Additive only - preserves existing tables (businesses, leads, drafts, etc.)
-- ============================================================================

-- Ensure required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ----------------------------------------------------------------------------
-- 1. Organizations & Multi-Tenant Membership
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY DEFAULT ('org_' || substr(md5(random()::text), 1, 12)),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    approval_policy JSONB NOT NULL DEFAULT '{"require_admin_external_actions": true, "require_admin_spend": true}'::jsonb,
    allow_hosted_llm_sensitive_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS organization_members (
    id TEXT PRIMARY KEY DEFAULT ('mem_' || substr(md5(random()::text), 1, 12)),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS org_members_org_idx ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS org_members_user_idx ON organization_members(user_id);

-- ----------------------------------------------------------------------------
-- 2. Business Profiles (3-Phase Model Mapping)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_profiles (
    id TEXT PRIMARY KEY DEFAULT ('biz_' || substr(md5(random()::text), 1, 12)),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    legacy_business_id TEXT REFERENCES businesses(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phase TEXT NOT NULL CHECK (phase IN ('foundation', 'presales_readiness', 'growth_optimization', 'mixed')),
    business_type TEXT NOT NULL CHECK (business_type IN (
        'physical_product', 'services_consulting', 'software_saas_ai',
        'marketplace_platform', 'retail_distribution', 'other_undecided'
    )),
    description TEXT NOT NULL DEFAULT '',
    budget_tier TEXT NOT NULL CHECK (budget_tier IN (
        'almost_none', 'under_10k', '10k_to_50k', 'above_50k', 'undecided'
    )),
    primary_goal TEXT NOT NULL,
    customers_today TEXT NOT NULL CHECK (customers_today IN (
        'none', 'interest_no_purchase', 'paying_customers', 'repeat_customers'
    )),
    constraints_context TEXT DEFAULT '',
    readiness_summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS biz_profiles_org_idx ON business_profiles(organization_id);
CREATE INDEX IF NOT EXISTS biz_profiles_phase_idx ON business_profiles(phase);

-- ----------------------------------------------------------------------------
-- 3. Business Facts (Strict Provenance Classification)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_facts (
    id TEXT PRIMARY KEY DEFAULT ('fact_' || substr(md5(random()::text), 1, 12)),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    business_id TEXT NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    fact_text TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    classification TEXT NOT NULL CHECK (classification IN (
        'verified_fact', 'user_assumption', 'researched_finding', 'unknown'
    )),
    source_provenance TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS biz_facts_biz_idx ON business_facts(business_id);
CREATE INDEX IF NOT EXISTS biz_facts_class_idx ON business_facts(classification);

-- ----------------------------------------------------------------------------
-- 4. Conversational Adaptive Onboarding Sessions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onboarding_sessions (
    id TEXT PRIMARY KEY DEFAULT ('onb_' || substr(md5(random()::text), 1, 12)),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    business_id TEXT REFERENCES business_profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
    current_step INTEGER NOT NULL DEFAULT 1,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    detected_gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
    followup_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS onb_sessions_org_idx ON onboarding_sessions(organization_id);

-- ----------------------------------------------------------------------------
-- 5. Typed Task Graph, Versions & State Machine
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY DEFAULT ('tsk_' || substr(md5(random()::text), 1, 12)),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    business_id TEXT NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    rationale TEXT NOT NULL,
    assigned_agent TEXT NOT NULL CHECK (assigned_agent IN (
        'Atlas', 'Scout', 'Cadence', 'Quill', 'Muse', 'Veritas', 'Warden', 'Courier', 'Echo', 'Sage'
    )),
    phase TEXT NOT NULL CHECK (phase IN ('foundation', 'presales_readiness', 'growth_optimization')),
    dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
    priority INTEGER NOT NULL DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
    priority_score REAL NOT NULL DEFAULT 50.0,
    impact_score REAL NOT NULL DEFAULT 50.0,
    urgency_score REAL NOT NULL DEFAULT 50.0,
    readiness_score REAL NOT NULL DEFAULT 50.0,
    dependency_importance REAL NOT NULL DEFAULT 50.0,
    evidence_confidence REAL NOT NULL DEFAULT 50.0,
    expected_deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
    acceptance_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    approval_policy TEXT NOT NULL DEFAULT 'standard',
    estimated_quota_cost JSONB DEFAULT '{"calls": 1, "tokens": 1500, "search_credits": 0}'::jsonb,
    status TEXT NOT NULL CHECK (status IN (
        'planned', 'assigned', 'running', 'blocked', 'client_review',
        'admin_approval', 'approved', 'executing', 'completed', 'failed',
        'paused', 'cancelled'
    )) DEFAULT 'planned',
    currently_doing TEXT DEFAULT '',
    missing_information JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by TEXT DEFAULT 'Atlas',
    assigned_to TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS tasks_org_status_idx ON tasks(organization_id, status);
CREATE INDEX IF NOT EXISTS tasks_biz_idx ON tasks(business_id);
CREATE INDEX IF NOT EXISTS tasks_agent_idx ON tasks(assigned_agent);

CREATE TABLE IF NOT EXISTS task_versions (
    id TEXT PRIMARY KEY DEFAULT ('ver_' || substr(md5(random()::text), 1, 12)),
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    priority INTEGER NOT NULL,
    scope TEXT NOT NULL DEFAULT '',
    changed_by TEXT NOT NULL,
    change_summary TEXT NOT NULL,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(task_id, version_number)
);

CREATE INDEX IF NOT EXISTS task_versions_task_idx ON task_versions(task_id);

CREATE TABLE IF NOT EXISTS task_events (
    id BIGSERIAL PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    actor TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS task_events_task_idx ON task_events(task_id);
CREATE INDEX IF NOT EXISTS task_events_org_idx ON task_events(organization_id);

-- ----------------------------------------------------------------------------
-- 6. Agent Reports (Strict Schema Validation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_reports (
    id TEXT PRIMARY KEY DEFAULT ('rep_' || substr(md5(random()::text), 1, 12)),
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    status TEXT NOT NULL,
    summary TEXT NOT NULL,
    findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_information JSONB NOT NULL DEFAULT '[]'::jsonb,
    risks JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommended_next_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence REAL NOT NULL DEFAULT 0.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    requires_human_review BOOLEAN NOT NULL DEFAULT FALSE,
    validated_by_atlas BOOLEAN NOT NULL DEFAULT FALSE,
    validation_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS agent_reports_task_idx ON agent_reports(task_id);

-- ----------------------------------------------------------------------------
-- 7. Consequential Action Approvals & Idempotent Execution
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS action_approvals (
    id TEXT PRIMARY KEY DEFAULT ('app_' || substr(md5(random()::text), 1, 12)),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('email_send', 'publish', 'spend', 'external_api')),
    requested_payload JSONB NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('pending', 'approved', 'rejected', 'revision_requested')) DEFAULT 'pending',
    requested_by TEXT NOT NULL,
    reviewed_by TEXT,
    reviewer_role TEXT,
    review_notes TEXT DEFAULT '',
    idempotency_key TEXT NOT NULL UNIQUE,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS approvals_org_idx ON action_approvals(organization_id);
CREATE INDEX IF NOT EXISTS approvals_task_idx ON action_approvals(task_id);
CREATE INDEX IF NOT EXISTS approvals_idempotency_idx ON action_approvals(idempotency_key);

-- ----------------------------------------------------------------------------
-- 8. Audit Logs (Immutable Security Log)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    old_state JSONB DEFAULT NULL,
    new_state JSONB DEFAULT NULL,
    ip_address TEXT DEFAULT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS audit_logs_org_idx ON audit_logs(organization_id, timestamp);

-- ----------------------------------------------------------------------------
-- 9. Real Business Metrics & Controlled Experiments (Sage Continuous Learning)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_metrics (
    id TEXT PRIMARY KEY DEFAULT ('met_' || substr(md5(random()::text), 1, 12)),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    business_id TEXT NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    value NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    source TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS biz_metrics_biz_idx ON business_metrics(business_id, metric_name);

CREATE TABLE IF NOT EXISTS experiments (
    id TEXT PRIMARY KEY DEFAULT ('exp_' || substr(md5(random()::text), 1, 12)),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    business_id TEXT NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    hypothesis TEXT NOT NULL,
    assigned_agent TEXT NOT NULL,
    baseline_metric JSONB NOT NULL,
    change_description TEXT NOT NULL,
    sample_size INTEGER NOT NULL DEFAULT 0,
    min_sample_required INTEGER NOT NULL DEFAULT 30,
    observed_outcome JSONB DEFAULT NULL,
    conclusion TEXT DEFAULT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'running', 'concluded', 'abandoned')) DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS experiments_biz_idx ON experiments(business_id);

-- ----------------------------------------------------------------------------
-- 10. Quota Ledger & Research Caching
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usage_ledger (
    id BIGSERIAL PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    search_credits INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS usage_ledger_org_idx ON usage_ledger(organization_id);

CREATE TABLE IF NOT EXISTS search_cache (
    id TEXT PRIMARY KEY DEFAULT ('sch_' || substr(md5(random()::text), 1, 12)),
    query_hash TEXT NOT NULL UNIQUE,
    query_text TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'tavily',
    results_json JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS search_cache_hash_idx ON search_cache(query_hash);

-- ----------------------------------------------------------------------------
-- 11. Documents & Document Chunks (pgvector semantic retrieval)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY DEFAULT ('doc_' || substr(md5(random()::text), 1, 12)),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    business_id TEXT NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    file_path TEXT,
    sensitivity_level TEXT NOT NULL CHECK (sensitivity_level IN ('public', 'internal', 'confidential', 'restricted')) DEFAULT 'internal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS document_chunks (
    id TEXT PRIMARY KEY DEFAULT ('chk_' || substr(md5(random()::text), 1, 12)),
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(384),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS doc_chunks_embedding_idx ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ----------------------------------------------------------------------------
-- 12. Row Level Security (RLS) Isolation
-- ----------------------------------------------------------------------------

-- Helper function to check organization membership for the current authenticated user
CREATE OR REPLACE FUNCTION auth_user_in_org(org_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM organization_members om
        WHERE om.organization_id = org_id
          AND om.user_id = (SELECT auth.uid())
    );
$$;

-- Helper function to check if the current user is an admin or owner of the organization
CREATE OR REPLACE FUNCTION auth_user_is_org_admin(org_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM organization_members om
        WHERE om.organization_id = org_id
          AND om.user_id = (SELECT auth.uid())
          AND om.role IN ('owner', 'admin')
    );
$$;

-- Enable RLS on all tenant-owned tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "org_member_select" ON organizations
    FOR SELECT TO authenticated
    USING (auth_user_in_org(id));

-- Organization Members policies
CREATE POLICY "org_members_select" ON organization_members
    FOR SELECT TO authenticated
    USING (auth_user_in_org(organization_id));

-- Business Profiles policies
CREATE POLICY "biz_profiles_select" ON business_profiles
    FOR SELECT TO authenticated
    USING (auth_user_in_org(organization_id));

CREATE POLICY "biz_profiles_insert" ON business_profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth_user_in_org(organization_id));

CREATE POLICY "biz_profiles_update" ON business_profiles
    FOR UPDATE TO authenticated
    USING (auth_user_in_org(organization_id))
    WITH CHECK (auth_user_in_org(organization_id));

-- Business Facts policies
CREATE POLICY "biz_facts_select" ON business_facts
    FOR SELECT TO authenticated
    USING (auth_user_in_org(organization_id));

CREATE POLICY "biz_facts_insert" ON business_facts
    FOR INSERT TO authenticated
    WITH CHECK (auth_user_in_org(organization_id));

CREATE POLICY "biz_facts_update" ON business_facts
    FOR UPDATE TO authenticated
    USING (auth_user_in_org(organization_id))
    WITH CHECK (auth_user_in_org(organization_id));

-- Tasks policies
CREATE POLICY "tasks_select" ON tasks
    FOR SELECT TO authenticated
    USING (auth_user_in_org(organization_id));

CREATE POLICY "tasks_insert" ON tasks
    FOR INSERT TO authenticated
    WITH CHECK (auth_user_in_org(organization_id));

CREATE POLICY "tasks_update" ON tasks
    FOR UPDATE TO authenticated
    USING (auth_user_in_org(organization_id))
    WITH CHECK (auth_user_in_org(organization_id));

-- Task Events policies
CREATE POLICY "task_events_select" ON task_events
    FOR SELECT TO authenticated
    USING (auth_user_in_org(organization_id));

-- Agent Reports policies
CREATE POLICY "agent_reports_select" ON agent_reports
    FOR SELECT TO authenticated
    USING (auth_user_in_org(organization_id));

-- Action Approvals: members can select, ONLY admins can approve/update
CREATE POLICY "approvals_select" ON action_approvals
    FOR SELECT TO authenticated
    USING (auth_user_in_org(organization_id));

CREATE POLICY "approvals_admin_update" ON action_approvals
    FOR UPDATE TO authenticated
    USING (auth_user_is_org_admin(organization_id))
    WITH CHECK (auth_user_is_org_admin(organization_id));

-- Realtime Publication for Live UI
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE tasks, task_events, action_approvals;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;
