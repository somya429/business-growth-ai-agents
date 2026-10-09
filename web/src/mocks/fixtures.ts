import {
  BusinessProfile,
  Lead,
  Fact,
  Draft,
  TrustReport,
  PolicyResult,
  TraceEvent,
  ReplyAnalysis,
  CampaignReport,
} from '../api/types';
import { FALLBACK_AGENTS } from '../config/agents';

// Completely empty defaults for fresh-start application
export const SAMPLE_BUSINESSES: BusinessProfile[] = [];
export const SAMPLE_LEADS: Record<string, Lead> = {};
export const SAMPLE_FACTS: Fact[] = [];

/* Neutral Dev Tool Run Draft & Trust Report */
export const FLAWED_DRAFT: Draft = {
  lead_id: 'lead-test-01',
  channel: 'email',
  subject: 'Autonomous telemetry & infrastructure operations',
  body: `Dear Partner,

I noticed your recent multi-cloud expansion across compute clusters. As you scale workloads, reconciling FinOps telemetry without compromising audit posture is critical.

Our platform maintains an unverified foreign agriculture standard across software pipelines, assuring sovereign provenance. We are pleased to offer our enterprise tier at only $1,200/mo flat rate. Furthermore, our deployment team provides guaranteed delivery and full integration in 2 days from signature.

Would you have 15 minutes this Thursday at 2 PM EDT to inspect the live benchmarks?

Sincerely,
Engineering Team`,
  claims_used: [],
};

export const FLAWED_TRUST_REPORT: TrustReport = {
  overall_score: 52,
  category_scores: {
    claims: 0.45,
    numbers: 0.5,
    dates: 0.95,
    names: 1.0,
    pii: 1.0,
    commitments: 0.3,
  },
  claim_verdicts: [
    {
      claim: 'Platform maintains an unverified foreign agriculture standard.',
      verdict: 'CONTRADICTED',
      evidence: 'Official compliance records confirm SOC 2 Type II and ISO 27001. Agriculture standard is inapplicable.',
    },
    {
      claim: 'Enterprise tier available at only $1,200/mo flat rate.',
      verdict: 'CONTRADICTED',
      evidence: 'Master pricing matrix establishes standard enterprise fee at $2,800/mo billed annually.',
    },
    {
      claim: 'Guaranteed delivery and full integration in 2 days.',
      verdict: 'NOT_FOUND',
      evidence: 'Production rollout standards specify 10-14 business days. No 2-day SLA is authorized.',
    },
  ],
  flags: [
    {
      id: 'flag-001',
      category: 'unsupported_claim',
      sentence_text: 'Our platform maintains an unverified foreign agriculture standard across software pipelines, assuring sovereign provenance.',
      start: 226,
      end: 350,
      reason: 'Hallucinated compliance certification. Agriculture accreditation contradicts enterprise software specifications.',
      severity: 'high',
      status: 'open',
    },
    {
      id: 'flag-002',
      category: 'number_mismatch',
      sentence_text: 'We are pleased to offer our enterprise tier at only $1,200/mo flat rate.',
      start: 351,
      end: 420,
      reason: 'Pricing discrepancy. Verified price sheet establishes standard enterprise fee at $2,800/mo.',
      severity: 'medium',
      status: 'open',
    },
    {
      id: 'flag-003',
      category: 'risky_commitment',
      sentence_text: 'Furthermore, our deployment team provides guaranteed delivery and full integration in 2 days from signature.',
      start: 421,
      end: 530,
      reason: 'Unauthorized binding SLA warranty. Official standard delivery is 10-14 business days.',
      severity: 'medium',
      status: 'open',
    },
  ],
  verdict: 'FAIL',
};

export const FLAWED_POLICY_RESULT: PolicyResult = {
  passed: false,
  violations: [
    {
      rule: 'POL-204 (Commercial Warranties)',
      detail: 'Binding deployment timeline commitments under 5 business days violate engineering SLA safety gates.',
    },
    {
      rule: 'POL-108 (Pricing Integrity)',
      detail: 'Quoted pricing $1,200/mo falls beneath minimum contract threshold ($2,800/mo) without executive override.',
    },
  ],
  required_edits: [
    'Remove unverified agriculture certification claim.',
    'Align pricing with authorized contract minimum ($2,800/mo) or omit pricing quote until discovery.',
    'Replace 2-day integration promise with standard 10-14 day production rollout schedule.',
  ],
};

/* Clean Demo Draft & Trust Report */
export const CLEAN_DRAFT: Draft = {
  lead_id: 'lead-test-02',
  channel: 'email',
  subject: 'Verified telemetry & infrastructure audit',
  body: `Dear Partner,

I reviewed your recent multi-region expansion across cloud infrastructure. As your engineering team scales clusters, maintaining cost governance without compromising SOC 2 audit readiness becomes paramount.

Our platform provides automated FinOps telemetry directly verified against SOC 2 Type II and ISO 27001 benchmarks. Enterprise plans begin at $2,800/month, with typical deployment and telemetry ingestion completed within 10 to 14 business days.

Would you be open to a 15-minute briefing next Tuesday to review comparative workload efficiency metrics?

Warm regards,
Solutions Team`,
  claims_used: [],
};

export const CLEAN_TRUST_REPORT: TrustReport = {
  overall_score: 98,
  category_scores: {
    claims: 0.98,
    numbers: 1.0,
    dates: 0.96,
    names: 1.0,
    pii: 1.0,
    commitments: 0.95,
  },
  claim_verdicts: [
    {
      claim: 'Automated telemetry verified against SOC 2 Type II and ISO 27001.',
      verdict: 'SUPPORTED',
      evidence: 'Matched with official compliance audit records.',
    },
    {
      claim: 'Enterprise plans begin at $2,800/month.',
      verdict: 'SUPPORTED',
      evidence: 'Matched with master pricing matrix.',
    },
    {
      claim: 'Deployment completed within 10 to 14 business days.',
      verdict: 'SUPPORTED',
      evidence: 'Matched with standard deployment guidelines.',
    },
  ],
  flags: [],
  verdict: 'PASS',
};

export const CLEAN_POLICY_RESULT: PolicyResult = {
  passed: true,
  violations: [],
  required_edits: [],
};

export const INITIAL_TRACE_EVENTS: TraceEvent[] = [
  {
    agent: 'Atlas',
    step: 'Task Formulation',
    input_summary: 'Target Account Intake, Verified Knowledge Base',
    output_summary: 'Formulated 4 execution subtasks. Routing to Scout for intelligence extraction.',
    reason: 'New prospect record initialized with missing verification attributes.',
    duration: '42ms',
    timestamp: new Date().toISOString(),
  },
  {
    agent: 'Scout',
    step: 'Account & Fact Extraction',
    input_summary: 'Domain verification and knowledge base ingestion',
    output_summary: 'Synthesized ground-truth facts. Validated engineering persona.',
    reason: 'Grounded intelligence required before scoring and content generation.',
    duration: '320ms',
    timestamp: new Date().toISOString(),
  },
];

export const ALL_AGENTS_ROSTER = FALLBACK_AGENTS;

export const EXTENDED_48_CATALOG = [
  // Orchestration & Planning (6)
  { name: 'Atlas', function: 'Orchestration', desc: 'Core pipeline conductor', enabled: true },
  { name: 'Janus', function: 'Orchestration', desc: 'Multi-threaded campaign router', enabled: false },
  { name: 'Chronos', function: 'Orchestration', desc: 'Cross-timezone scheduling synchronizer', enabled: false },
  { name: 'Aegis', function: 'Orchestration', desc: 'Failover and resilience recovery agent', enabled: false },
  { name: 'Nexus', function: 'Orchestration', desc: 'Enterprise CRM state reconciler', enabled: false },
  { name: 'Hermes', function: 'Orchestration', desc: 'Event-driven webhook dispatcher', enabled: false },

  // Research & Intelligence (10)
  { name: 'Scout', function: 'Intelligence', desc: 'Account and lead intelligence researcher', enabled: true },
  { name: 'Cadence', function: 'Intelligence', desc: 'Propensity and timing scoring engine', enabled: true },
  { name: 'Argus', function: 'Intelligence', desc: 'Competitor footprint and switch trigger monitor', enabled: false },
  { name: 'Pythia', function: 'Intelligence', desc: 'Buying committee hierarchy cartographer', enabled: false },
  { name: 'Sonar', function: 'Intelligence', desc: 'Job change and hiring velocity tracker', enabled: false },
  { name: 'Talos', function: 'Intelligence', desc: 'Technographic stack analyzer', enabled: false },
  { name: 'Vanguard', function: 'Intelligence', desc: 'Regulatory filing and 10-K disclosure scanner', enabled: false },
  { name: 'Beacon', function: 'Intelligence', desc: 'Intent signal aggregator across B2B networks', enabled: false },
  { name: 'Radar', function: 'Intelligence', desc: 'Community mention and sentiment listener', enabled: false },
  { name: 'Oracle', function: 'Intelligence', desc: 'Deal size and budget estimator', enabled: false },

  // Content & Synthesis (10)
  { name: 'Quill', function: 'Synthesis', desc: 'Precision email and sequence drafter', enabled: true },
  { name: 'Muse', function: 'Synthesis', desc: 'Long-form collateral and proof-point generator', enabled: true },
  { name: 'Calliope', function: 'Synthesis', desc: 'Executive-to-executive hyper-personalized memo author', enabled: false },
  { name: 'Scribe', function: 'Synthesis', desc: 'Technical whitepaper and benchmark compiler', enabled: false },
  { name: 'Lyric', function: 'Synthesis', desc: 'Social engagement and short-form copy crafter', enabled: false },
  { name: 'Crayon', function: 'Synthesis', desc: 'Comparative feature matrix diagram formatter', enabled: false },
  { name: 'Prism', function: 'Synthesis', desc: 'Multi-language localized narrative translator', enabled: false },
  { name: 'Verso', function: 'Synthesis', desc: 'Subject line and hook variation generator', enabled: false },
  { name: 'Thesis', function: 'Synthesis', desc: 'Value hypothesis and ROI calculator synthesizer', enabled: false },
  { name: 'Brief', function: 'Synthesis', desc: 'Pre-meeting briefing memo compiler for sales reps', enabled: false },

  // Trust, Verification & Policy (10)
  { name: 'Veritas', function: 'Trust & Verification', desc: 'Multi-tier claim and hallucination auditor', enabled: true },
  { name: 'Warden', function: 'Trust & Verification', desc: 'Deterministic policy and anti-spam gate', enabled: true },
  { name: 'Censor', function: 'Trust & Verification', desc: 'PII, GDPR, and confidential token redaction guard', enabled: false },
  { name: 'Sentry', function: 'Trust & Verification', desc: 'Tone, brand voice, and brand safety compliance auditor', enabled: false },
  { name: 'Juris', function: 'Trust & Verification', desc: 'Commercial contract warranty and liability validator', enabled: false },
  { name: 'Ledger', function: 'Trust & Verification', desc: 'Cryptographic audit provenance and state recorder', enabled: false },
  { name: 'Anchor', function: 'Trust & Verification', desc: 'Citation hyperlink and primary source validity checker', enabled: false },
  { name: 'Metric', function: 'Trust & Verification', desc: 'Numerical claim and math consistency verifier', enabled: false },
  { name: 'Chronicle', function: 'Trust & Verification', desc: 'Temporal claim and freshness window validator', enabled: false },
  { name: 'Guardian', function: 'Trust & Verification', desc: 'Executive impersonation and spoofing guard', enabled: false },

  // Delivery & Interaction (6)
  { name: 'Courier', function: 'Delivery', desc: 'Simulated and live delivery dispatch receipt engine', enabled: true },
  { name: 'Echo', function: 'Delivery', desc: 'Inbound response classifier and triage director', enabled: true },
  { name: 'Relay', function: 'Delivery', desc: 'LinkedIn InMail API automated connector', enabled: false },
  { name: 'Chime', function: 'Delivery', desc: 'Calendar scheduling and slot negotiation agent', enabled: false },
  { name: 'Breeze', function: 'Delivery', desc: 'Bounce handling and mailbox warm-up stabilizer', enabled: false },
  { name: 'Signal', function: 'Delivery', desc: 'Out-of-office return date parser and reschedule agent', enabled: false },

  // Analytics & Optimization (6)
  { name: 'Sage', function: 'Optimization', desc: 'Cross-campaign pattern and learning strategist', enabled: true },
  { name: 'Compass', function: 'Strategy', desc: 'Positioning options and unit-economics estimator', enabled: true },
  { name: 'Herald', function: 'Campaigns', desc: 'Campaign architect and experiment designer', enabled: true },
  { name: 'Optima', function: 'Optimization', desc: 'Multi-armed bandit subject line allocator', enabled: false },
  { name: 'Vector', function: 'Optimization', desc: 'Embedding drift and persona affinity clustering', enabled: false },
  { name: 'Summit', function: 'Optimization', desc: 'Win/loss interview transcript thematic miner', enabled: false },
  { name: 'Retrospect', function: 'Optimization', desc: 'Post-campaign conversion attribution modeler', enabled: false },
  { name: 'Evolve', function: 'Optimization', desc: 'Prompt and policy rule self-refinement recommender', enabled: false },
];

export const MOCK_CAMPAIGN_REPORT: CampaignReport = {
  total_outcomes: 0,
  reply_rate: 0,
  meeting_rate: 0,
  unsubscribe_rate: 0,
  summary: 'No campaigns recorded yet. Create an outreach plan to begin measuring performance.',
  insights: [],
  time_series: [],
};

export const MOCK_REPLY_ANALYSIS: ReplyAnalysis = {
  intent: 'question',
  next_action: 'Awaiting first prospect reply',
  escalate_to_human: false,
  reason: 'No replies logged yet.',
  draft_reply: '',
};
