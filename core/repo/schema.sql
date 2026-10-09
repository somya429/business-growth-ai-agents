-- Growth Agents Supabase Database Schema
-- Run this in your Supabase SQL Editor to initialize all tables and extensions.

-- 1. Enable pgvector extension for semantic knowledge retrieval
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    industry TEXT NOT NULL,
    offerings JSONB NOT NULL DEFAULT '[]'::jsonb,
    ideal_customer TEXT NOT NULL,
    tone TEXT NOT NULL DEFAULT 'professional and consultative',
    channels JSONB NOT NULL DEFAULT '["email", "linkedin"]'::jsonb,
    anti_spam JSONB NOT NULL DEFAULT '{"max_contacts_per_week": 3, "quiet_hours": "20:00-08:00", "opt_out_list": []}'::jsonb,
    enabled_agents JSONB NOT NULL DEFAULT '["research", "scoring", "outreach", "content", "followup", "learning"]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Knowledge base documents with 384-dimensional pgvector embeddings
CREATE TABLE IF NOT EXISTS kb_docs (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    embedding vector(384),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for semantic vector similarity search using Cosine distance
CREATE INDEX IF NOT EXISTS kb_docs_embedding_idx ON kb_docs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 4. Leads table
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'inbound',
    status TEXT NOT NULL DEFAULT 'new',
    last_contacted TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'email',
    target_audience TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Pipeline execution runs
CREATE TABLE IF NOT EXISTS runs (
    run_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'running',
    state_summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Drafts table
CREATE TABLE IF NOT EXISTS drafts (
    draft_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
    lead_id TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'email',
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    claims_used JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Trust reports table
CREATE TABLE IF NOT EXISTS trust_reports (
    report_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL,
    verdict TEXT NOT NULL,
    category_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    claim_verdicts JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Flags table
CREATE TABLE IF NOT EXISTS flags (
    flag_id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES trust_reports(report_id) ON DELETE CASCADE,
    run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    sentence_text TEXT NOT NULL,
    start_pos INTEGER NOT NULL DEFAULT 0,
    end_pos INTEGER NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Approvals table
CREATE TABLE IF NOT EXISTS approvals (
    approval_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
    decision TEXT NOT NULL,
    edited_body TEXT,
    reviewer TEXT NOT NULL DEFAULT 'human',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT DEFAULT ''
);

-- 11. Outcomes table
CREATE TABLE IF NOT EXISTS outcomes (
    outcome_id TEXT PRIMARY KEY,
    business_id TEXT REFERENCES businesses(id) ON DELETE SET NULL,
    lead_id TEXT NOT NULL,
    draft_id TEXT,
    replied BOOLEAN NOT NULL DEFAULT FALSE,
    meeting_booked BOOLEAN NOT NULL DEFAULT FALSE,
    unsubscribed BOOLEAN NOT NULL DEFAULT FALSE,
    complaint BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. Learning insights table
CREATE TABLE IF NOT EXISTS insights (
    insight_id TEXT PRIMARY KEY,
    business_id TEXT REFERENCES businesses(id) ON DELETE SET NULL,
    pattern TEXT NOT NULL,
    evidence_count INTEGER NOT NULL DEFAULT 0,
    confidence REAL NOT NULL DEFAULT 0.0,
    recommendation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. Trace events table
CREATE TABLE IF NOT EXISTS trace_events (
    id BIGSERIAL PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
    agent TEXT NOT NULL,
    step TEXT NOT NULL,
    input_summary TEXT NOT NULL DEFAULT '',
    output_summary TEXT NOT NULL DEFAULT '',
    reason TEXT NOT NULL DEFAULT '',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS trace_events_run_id_idx ON trace_events(run_id, id);
