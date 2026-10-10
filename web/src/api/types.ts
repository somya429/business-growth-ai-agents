export type FlagCategory =
  | 'unsupported_claim'
  | 'contradicted_claim'
  | 'number_mismatch'
  | 'date_mismatch'
  | 'name_mismatch'
  | 'pii'
  | 'risky_commitment';

export type FlagSeverity = 'low' | 'medium' | 'high';
export type FlagStatus = 'open' | 'accepted' | 'dismissed';

export interface Flag {
  id: string;
  category: FlagCategory;
  sentence_text: string;
  start: number;
  end: number;
  reason: string;
  severity: FlagSeverity;
  status: FlagStatus;
}

export type ClaimVerdictType = 'SUPPORTED' | 'CONTRADICTED' | 'NOT_FOUND';

export interface ClaimVerdict {
  claim: string;
  verdict: ClaimVerdictType;
  evidence: string;
}

export type TrustVerdict = 'PASS' | 'REVIEW' | 'FAIL';

export interface TrustReport {
  overall_score: number;
  category_scores: Record<string, number>;
  claim_verdicts: ClaimVerdict[];
  flags: Flag[];
  verdict: TrustVerdict;
}

export interface PolicyViolation {
  rule: string;
  detail: string;
}

export interface PolicyResult {
  passed: boolean;
  violations: PolicyViolation[];
  required_edits: string[];
}

export interface Draft {
  subject: string;
  body: string;
  channel: string;
  claims_used: string[];
  lead_id: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'opted_out';
  last_contacted?: string | null;
}

export type LeadDecision = 'ACT' | 'WAIT' | 'REJECT' | 'RESEARCH_MORE';

export interface LeadScore {
  score: number;
  breakdown: Record<string, number>;
  decision: LeadDecision;
  reason: string;
  recheck_after?: string | null;
}

export interface Fact {
  id: string;
  statement: string;
  source: string;
  source_date: string;
  confidence: number;
  kind: 'company' | 'market' | 'competitor' | 'kb';
}

export interface AntiSpamSettings {
  max_contacts_per_week: number;
  quiet_hours: string;
  opt_out_list: string[];
}

export interface BusinessProfile {
  id: string;
  name: string;
  industry: string;
  offerings: string[];
  ideal_customer: string;
  tone: string;
  channels: string[];
  anti_spam: AntiSpamSettings;
  enabled_agents: string[];
  documents?: { id: string; title: string; type: string; size: string }[];
}

export interface TraceEvent {
  agent: string;
  step: string;
  input_summary: string;
  output_summary: string;
  reason: string;
  duration?: string;
  timestamp: string;
}

export type RunStatus = 'running' | 'waiting_for_human' | 'completed' | 'failed' | 'rejected';

export interface RunStateSummary {
  draft?: Draft;
  score?: LeadScore;
  trust_report?: TrustReport;
  policy_result?: PolicyResult;
  mock_send_result?: {
    delivered_at: string;
    channel: string;
    recipient: string;
    message_id: string;
    status: string;
  };
  failed_trust_banner?: boolean;
  lead?: Lead;
  facts?: Fact[];
  reply_analysis?: ReplyAnalysis;
}

export interface RunSummary {
  run_id: string;
  business_id: string;
  lead_id?: string | null;
  status: RunStatus;
  state_summary: RunStateSummary;
}

export interface ReviewPayload {
  run_id: string;
  draft: Draft | null;
  trust_report: TrustReport | null;
  policy_result: PolicyResult | null;
  failed_trust_banner?: boolean;
}

export interface ApprovalDecisionPayload {
  decision: 'approve' | 'edit' | 'reject';
  editedBody?: string;
  notes?: string;
  reviewer?: string;
}

export interface ReplyAnalysis {
  intent: 'interested' | 'not_interested' | 'question' | 'unsubscribe' | 'out_of_office' | 'pricing_or_contract' | 'unclear';
  next_action: string;
  escalate_to_human: boolean;
  reason: string;
  draft_reply?: string | null;
}

export interface Outcome {
  lead_id: string;
  draft_id: string;
  replied: boolean;
  meeting_booked: boolean;
  unsubscribed: boolean;
  complaint: boolean;
  notes: string;
}

export interface LearningInsight {
  pattern: string;
  evidence_count: number;
  confidence: number;
  recommendation: string;
}

export interface CampaignReport {
  total_outcomes: number;
  reply_rate: number;
  meeting_rate: number;
  unsubscribe_rate: number;
  insights: LearningInsight[];
  summary: string;
  time_series?: { date: string; replies: number; meetings: number; unsubscribes: number }[];
}

export type AgentStatus = 'active' | 'planned';

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  one_line_job?: string;
  kind: 'ai_agent' | 'rules_engine';
  can: string[];
  cannot: string[];
  status?: AgentStatus | 'idle' | 'active' | 'done' | 'failed' | 'waiting';
  category: 'orchestration' | 'intelligence' | 'execution' | 'trust_policy' | 'learning' | 'strategy' | string;
  icon: string;
  phases?: PhaseType[];
}

// -----------------------------------------------------------------------------
// Stage 2: Adaptive Onboarding Types
// -----------------------------------------------------------------------------
export type PhaseType = 'foundation' | 'presales_readiness' | 'growth_optimization';
export type BusinessType =
  | 'physical_product'
  | 'services_consulting'
  | 'software_saas_ai'
  | 'marketplace_platform'
  | 'operating_business';
export type BudgetTier = 'almost_none' | 'under_10k' | '10k_to_50k' | 'above_50k' | 'undecided';
export type CustomerTraction = 'none' | 'interest_no_purchase' | 'paying_customers' | 'repeat_customers';
export type FactProvenance = 'verified' | 'user_stated' | 'user_assumption' | 'researched_finding' | 'unknown';

export interface ClassifiedFact {
  id: string;
  key: string;
  statement: string;
  classification: FactProvenance;
  confidence: number;
  source: string;
  timestamp: string;
  why_it_matters?: string | null;
  how_to_resolve?: string | null;
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  rationale: string;
  target_field: string;
  options?: string[] | null;
  answer_type: 'text' | 'select' | 'multiselect' | 'boolean' | 'number';
}

export interface FollowUpGenerationResult {
  questions: FollowUpQuestion[];
  is_fallback: boolean;
  source_model: string;
}

export interface CoreIntakeAnswers {
  stage: PhaseType;
  business_type: BusinessType;
  name: string;
  idea: string;
  budget: BudgetTier;
  goal: string;
  customers_today: CustomerTraction;
  constraints: string;
  launch_market: string;
}

export interface ReadinessScore {
  overall_score: number;
  phase_scores: Record<string, number>;
  user_stated_count: number;
  verified_count: number;
  assumption_count: number;
  unknown_count: number;
  summary: string;
  critical_gaps: string[];
}

export interface OnboardingSession {
  session_id: string;
  business_id?: string | null;
  core_answers: CoreIntakeAnswers;
  follow_ups: FollowUpQuestion[];
  follow_up_answers: Record<string, any>;
  classified_facts: ClassifiedFact[];
  readiness: ReadinessScore;
  is_fallback_active: boolean;
  storage_backend?: string;
  storage_fallback?: boolean;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Stage 3: Tasks, State Machine & Agent Reports
// -----------------------------------------------------------------------------
export type TaskStatus =
  | 'planned'
  | 'assigned'
  | 'running'
  | 'blocked'
  | 'client_review'
  | 'admin_approval'
  | 'approved'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled';

export type ApprovalPolicy = 'none' | 'admin_required' | 'client_review';

export interface MissingInformationItem {
  what: string;
  why_needed: string;
  who_can_supply: string;
}

export interface EvidenceItem {
  source: string;
  date: string;
  excerpt_summary: string;
}

export interface Task {
  id: string;
  title: string;
  objective: string;
  rationale: string;
  assigned_agent: string;
  business_id?: string | null;
  phase: PhaseType;
  dependencies: string[];
  priority_score: number;
  expected_deliverables: string[];
  acceptance_criteria: string[];
  evidence_requirements: string[];
  approval_policy: ApprovalPolicy;
  missing_information: MissingInformationItem[];
  currently_doing: string;
  estimated_quota_cost: Record<string, any>;
  version: number;
  status: TaskStatus;
  prior_status?: TaskStatus | null;
  created_at: string;
  updated_at: string;
}

export interface AgentReport {
  task_id: string;
  status: 'completed' | 'failed' | 'needs_review';
  summary: string;
  findings: string[];
  evidence: EvidenceItem[];
  assumptions: string[];
  missing_information: MissingInformationItem[];
  risks: string[];
  recommended_next_tasks: string[];
  deliverables: Record<string, any>;
  confidence: number;
  requires_human_review: boolean;
}

export interface TaskEvent {
  id: string;
  task_id: string;
  event_type: string;
  from_status?: TaskStatus | null;
  to_status?: TaskStatus | null;
  details: Record<string, any>;
  timestamp: string;
}

export interface TaskVersion {
  id: string;
  task_id: string;
  version: number;
  snapshot: Record<string, any>;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Stage 4: Atlas Weekly Operations Engine & Strategic Planner Types
// -----------------------------------------------------------------------------
export interface WeeklyTodoItem {
  id: string;
  day: string;
  day_number: number;
  assigned_agent: string;
  title: string;
  objective: string;
  deliverable: string;
  acceptance_criteria: string[];
  completed: boolean;
  auto_ticked: boolean;
  completed_by?: 'agent' | 'manual' | null;
  completed_at?: string | null;
  agent_output?: Record<string, any> | null;
  task_id?: string | null;
  priority: 'high' | 'medium' | 'critical';
}

export interface AuditCheck {
  check: string;
  status: 'passed' | 'warning' | 'action_required';
  detail: string;
}

export interface StrategicAudit {
  audited_by: string;
  verdict: string;
  coherence_score: number;
  summary: string;
  audit_checks: AuditCheck[];
  strategic_directives: string[];
  audited_at: string;
}

export interface WeeklyDayPlan {
  day: string;
  day_number: number;
  theme: string;
  assigned_agents: string[];
  items: WeeklyTodoItem[];
}

export interface WeeklyPlan {
  id: string;
  business_id: string;
  business_name: string;
  industry: string;
  week_number: number;
  focus_goal: string;
  problem_id: string;
  phase: string;
  strategic_audit: StrategicAudit;
  days: WeeklyDayPlan[];
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Vanguard Growth Forecaster Agent Types
// -----------------------------------------------------------------------------
export interface GrowthScenario {
  label: string;
  velocity_multiplier: number;
  pipeline_30d: number;
  pipeline_60d: number;
  pipeline_90d: number;
  accounts_30d: number;
  accounts_60d: number;
  accounts_90d: number;
  expected_revenue_30d: number;
  expected_revenue_60d: number;
  expected_revenue_90d: number;
  confidence_score: number;
}

export interface NearFuturePrediction {
  window_days: number;
  projected_new_accounts: number;
  projected_new_pipeline_value: number;
  projected_completed_tasks: number;
  velocity_status: 'accelerating' | 'steady' | 'blocked' | 'initializing';
  key_milestones: string[];
  immediate_blockers: string[];
  clearance_impact_summary: string;
}

export interface TillGrowthMetrics {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  pending_tasks: number;
  task_completion_rate: number;
  autonomous_hours_reclaimed: number;
  accounts_prospected: number;
  grounded_drafts_generated: number;
  approved_dispatches: number;
  active_runs: number;
  realized_pipeline_value: number;
  average_deal_size: number;
  growth_velocity_tasks_per_day: number;
}

export interface GrowthForecastReport {
  business_id: string;
  business_name: string;
  industry: string;
  generated_at: string;
  till_growth: TillGrowthMetrics;
  near_future: NearFuturePrediction;
  scenarios: {
    conservative: GrowthScenario;
    expected: GrowthScenario;
    accelerated: GrowthScenario;
  };
  growth_levers: string[];
  agent_status: string;
}

export interface GrowthAgentAdvisorResponse {
  advice: string;
  key_metrics_referenced: Record<string, any>;
  prescribed_actions: string[];
  projected_lift: string;
}
