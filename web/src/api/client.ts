import {
  BusinessProfile,
  RunSummary,
  TraceEvent,
  ReviewPayload,
  TrustReport,
  ApprovalDecisionPayload,
  Outcome,
  CampaignReport,
  Flag,
  OnboardingSession,
  FollowUpGenerationResult,
  CoreIntakeAnswers,
  PhaseType,
  Task,
  TaskEvent,
  TaskVersion,
  AgentReport,
} from './types';
import {
  SAMPLE_BUSINESSES,
  SAMPLE_LEADS,
  SAMPLE_FACTS,
  FLAWED_DRAFT,
  FLAWED_TRUST_REPORT,
  FLAWED_POLICY_RESULT,
  CLEAN_DRAFT,
  CLEAN_TRUST_REPORT,
  CLEAN_POLICY_RESULT,
  INITIAL_TRACE_EVENTS,
  MOCK_CAMPAIGN_REPORT,
  MOCK_REPLY_ANALYSIS,
} from '../mocks/fixtures';
import {
  AgentRegistryResponse,
  FALLBACK_AGENTS,
  computeAgentCounts,
} from '../config/agents';

const API_MODE = import.meta.env.VITE_API_MODE || 'mock';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// In-memory mock state store
class MockBackendState {
  private businesses: BusinessProfile[] = [];
  private tasks: Task[] = [];
  private taskReports: Map<string, AgentReport> = new Map();
  private activeBusinessId: string | null = null;
  private runs: Map<string, RunSummary> = new Map();
  private reviews: Map<string, ReviewPayload> = new Map();
  private traces: Map<string, TraceEvent[]> = new Map();

  constructor() {
    // Starts completely empty
  }

  public getBusinesses(): BusinessProfile[] {
    return this.businesses;
  }

  public getActiveBusinessId(): string | null {
    return this.activeBusinessId;
  }

  public setActiveBusiness(id: string): BusinessProfile {
    const biz = this.businesses.find((b) => b.id === id);
    if (!biz) throw new Error(`Business ${id} not found`);
    this.activeBusinessId = id;
    return biz;
  }

  public createBusiness(profile: Partial<BusinessProfile>): BusinessProfile {
    const id = profile.id || `biz_${Date.now().toString(36)}`;
    const newBiz: BusinessProfile = {
      id,
      name: profile.name || 'My Business',
      industry: profile.industry || 'Technology',
      offerings: profile.offerings || [],
      ideal_customer: profile.ideal_customer || '',
      tone: profile.tone || 'Professional',
      channels: profile.channels || ['email'],
      anti_spam: profile.anti_spam || {
        max_contacts_per_week: 3,
        quiet_hours: '20:00 - 08:00',
        opt_out_list: [],
      },
      enabled_agents: profile.enabled_agents || ['atlas', 'scout', 'quill', 'veritas', 'warden', 'courier'],
      documents: profile.documents || [],
      ...profile,
    };
    const index = this.businesses.findIndex((b) => b.id === id);
    if (index >= 0) {
      this.businesses[index] = newBiz;
    } else {
      this.businesses.push(newBiz);
    }
    this.activeBusinessId = id;
    return newBiz;
  }

  public updateBusiness(profile: BusinessProfile): BusinessProfile {
    const index = this.businesses.findIndex((b) => b.id === profile.id);
    if (index >= 0) {
      this.businesses[index] = profile;
    } else {
      this.businesses.push(profile);
    }
    return profile;
  }

  public createRun(businessId: string, leadId?: string | null, isFlawed = false): string {
    const runId = `run_${Date.now().toString(36)}`;
    const lead = leadId && SAMPLE_LEADS[leadId] ? SAMPLE_LEADS[leadId] : {
      id: leadId || 'lead_generic',
      name: 'Prospect Contact',
      company: 'Target Account',
      role: 'VP Technology',
      email: 'contact@targetaccount.com',
      source: 'manual',
      status: 'new' as const,
      last_contacted: null,
    };

    const baseDraft = isFlawed ? FLAWED_DRAFT : CLEAN_DRAFT;
    const baseReport = isFlawed ? FLAWED_TRUST_REPORT : CLEAN_TRUST_REPORT;
    const basePolicy = isFlawed ? FLAWED_POLICY_RESULT : CLEAN_POLICY_RESULT;

    const runSummary: RunSummary = {
      run_id: runId,
      business_id: businessId,
      lead_id: lead.id,
      status: 'waiting_for_human',
      state_summary: {
        draft: JSON.parse(JSON.stringify(baseDraft)),
        score: {
          score: 89,
          breakdown: { fit: 0.92, intent: 0.88, freshness: 0.90, source_quality: 0.95 },
          decision: 'ACT',
          reason: 'Autonomous scoring cleared for outreach.',
        },
        trust_report: JSON.parse(JSON.stringify(baseReport)),
        policy_result: JSON.parse(JSON.stringify(basePolicy)),
        lead,
        facts: SAMPLE_FACTS,
        failed_trust_banner: isFlawed,
      },
    };

    this.runs.set(runId, runSummary);
    this.reviews.set(runId, {
      run_id: runId,
      draft: runSummary.state_summary.draft || null,
      trust_report: runSummary.state_summary.trust_report || null,
      policy_result: runSummary.state_summary.policy_result || null,
      failed_trust_banner: isFlawed,
    });

    this.traces.set(runId, JSON.parse(JSON.stringify(INITIAL_TRACE_EVENTS)));
    return runId;
  }

  public resetState(): void {
    this.businesses = [];
    this.activeBusinessId = null;
    this.runs.clear();
    this.reviews.clear();
    this.traces.clear();
    this.tasks = [];
    this.taskReports.clear();
  }

  public planTasks(businessId: string, phase: PhaseType = 'foundation'): Task[] {
    const business = this.businesses.find((item) => item.id === businessId);
    if (!business) throw new Error('Choose or create a business before generating a plan.');

    const existing = this.tasks.filter((task) => task.business_id === businessId && task.phase === phase);
    if (existing.length > 0) return existing;

    const now = new Date().toISOString();
    const prefix = `task_${Date.now().toString(36)}`;
    const isCommerce = /marketplace|commerce|retail|grocery|delivery/i.test(`${business.industry} ${business.offerings.join(' ')}`);
    const definitions = isCommerce
      ? [
          ['Atlas', 'Growth diagnosis & launch hypothesis', 'Define the first service zone, target customer segment, success metric, and constraints for a safe local launch.'],
          ['Scout', 'Quick-commerce market & competitor research', 'Compare local competitors, delivery promises, assortment, fees, and evidence-backed customer pain points.'],
          ['Compass', 'Unit economics & fulfilment viability', 'Map contribution margin, rider and fulfilment costs, discount limits, and capacity assumptions before acquisition spend.'],
          ['Muse', 'Value proposition & launch content', 'Draft grounded landing-page and local-launch messaging; no unsupported speed, price, or availability claims.'],
          ['Veritas', 'Claims, policy & customer-trust audit', 'Verify every launch claim against approved facts and flag gaps before anything customer-facing is published.'],
          ['Herald', 'Approved growth experiment design', 'Propose a small, measurable acquisition experiment with a budget cap and approval requirement.'],
        ]
      : [
          ['Atlas', 'Growth diagnosis & ICP definition', 'Define the highest-value customer segment, business constraint, and measurable growth objective.'],
          ['Scout', 'Market & competitor intelligence', 'Research alternatives, customer pain points, and evidence-backed market opportunities.'],
          ['Compass', 'Unit economics & priority model', 'Map pricing, acquisition constraints, and the assumptions that must be validated before spend.'],
          ['Muse', 'Positioning & value proposition', 'Draft grounded messaging assets based only on stated and verified business facts.'],
          ['Veritas', 'Claims & policy audit', 'Verify claims and identify the evidence required before anything goes to a customer.'],
          ['Herald', 'Approved growth experiment design', 'Propose one small experiment with an owner, metric, budget cap, and approval gate.'],
        ];

    const generated = definitions.map(([agent, title, objective], index): Task => ({
      id: `${prefix}_${index + 1}`,
      title,
      objective,
      rationale: 'Creates an evidence-backed next action instead of an unprioritized report.',
      assigned_agent: agent,
      business_id: businessId,
      phase,
      dependencies: index === 0 ? [] : [`${prefix}_${index}`],
      priority_score: 100 - index * 10,
      expected_deliverables: ['Auditable recommendation', 'Owner and measurable success criterion'],
      acceptance_criteria: ['Evidence and assumptions are clearly labelled', 'No external action occurs without approval'],
      evidence_requirements: ['Business profile', 'Approved source material'],
      approval_policy: agent === 'Herald' ? 'client_review' : 'none',
      missing_information: [],
      currently_doing: 'Queued for review',
      estimated_quota_cost: { mode: 'demo', note: 'No external tool calls are made in demo mode.' },
      version: 1,
      status: 'planned',
      created_at: now,
      updated_at: now,
    }));

    this.tasks.push(...generated);
    return generated;
  }

  public listTasks(filters?: { business_id?: string; phase?: string; status?: string }): Task[] {
    return this.tasks.filter((task) =>
      (!filters?.business_id || task.business_id === filters.business_id) &&
      (!filters?.phase || task.phase === filters.phase) &&
      (!filters?.status || task.status === filters.status)
    );
  }

  public executeTask(taskId: string): { task: Task; report: AgentReport } {
    const task = this.tasks.find((item) => item.id === taskId);
    if (!task) throw new Error(`Task ${taskId} was not found.`);
    const blockedBy = task.dependencies.find((id) => this.tasks.find((item) => item.id === id)?.status !== 'completed');
    if (blockedBy) throw new Error('Complete the preceding task before this agent can start.');
    if (task.approval_policy !== 'none') {
      task.status = task.approval_policy === 'client_review' ? 'client_review' : 'admin_approval';
      throw new Error('This action needs human approval before it can run. It has been moved to the review queue.');
    }

    const business = this.businesses.find((item) => item.id === task.business_id);
    const businessName = business?.name || 'your business';
    const commerce = /marketplace|commerce|retail|grocery|delivery/i.test(`${business?.industry || ''} ${business?.offerings.join(' ') || ''}`);
    const findingsByAgent: Record<string, string[]> = commerce ? {
      Atlas: [`Defined the first decision boundary for ${businessName}: test one service area before expansion.`, 'Recorded the evidence needed before increasing acquisition spend.'],
      Scout: ['Created a research brief for local competitors, price/fee positioning, delivery promises, and customer pain points.', 'No live market claim was made because a connected research source is not configured.'],
      Compass: ['Prepared a contribution-margin checklist: basket margin, discount, picker/rider cost, refunds, and CAC.', 'All unit-economics values remain inputs to verify, not forecasts.'],
      Muse: ['Drafted only internal messaging hypotheses from the approved profile.', 'No customer-facing asset was published.'],
      Veritas: ['Created a claim-evidence checklist for any delivery-speed, price, or availability promise.', 'Unsupported claims remain blocked until a source is supplied.'],
    } : {
      Atlas: [`Defined the next measurable decision for ${businessName}.`, 'Recorded constraints and the evidence needed before execution.'],
      Scout: ['Created an evidence request and competitor-research brief.', 'No external market facts were invented.'],
      Compass: ['Prepared a unit-economics and prioritisation checklist.', 'Financial values remain estimates until source data is connected.'],
      Muse: ['Drafted internal positioning hypotheses only.', 'No public copy was published.'],
      Veritas: ['Created an evidence and claims review checklist.', 'Unsupported claims remain blocked.'],
    };
    task.status = 'completed';
    task.currently_doing = 'Completed in demo workspace';
    task.updated_at = new Date().toISOString();
    const report: AgentReport = {
      task_id: task.id, status: 'completed', summary: `${task.assigned_agent} completed ${task.title} for ${businessName}.`,
      findings: findingsByAgent[task.assigned_agent] || [`Completed the internal task: ${task.title}.`, 'No external action was taken.'],
      evidence: [], assumptions: ['Demo workspace: connect a source before treating this output as measured evidence.'], missing_information: [],
      risks: ['No live integration is connected in demo mode.'], recommended_next_tasks: ['Run the next unblocked task in the plan.'],
      deliverables: { mode: 'demo', external_action_taken: false }, confidence: 0.55, requires_human_review: false,
    };
    this.taskReports.set(task.id, report);
    return { task: { ...task }, report };
  }

  public getTaskDetails(taskId: string): { task: Task; events: TaskEvent[]; versions: TaskVersion[]; report?: AgentReport | null } {
    const task = this.tasks.find((item) => item.id === taskId);
    if (!task) throw new Error(`Task ${taskId} was not found.`);
    return { task, events: [], versions: [], report: this.taskReports.get(taskId) || null };
  }

  public getRun(runId: string): RunSummary {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }
    return JSON.parse(JSON.stringify(run));
  }

  public getTrace(runId: string): TraceEvent[] {
    const trace = this.traces.get(runId) || [];
    return JSON.parse(JSON.stringify(trace));
  }

  public getReviewPayload(runId: string): ReviewPayload {
    const rev = this.reviews.get(runId);
    if (!rev) {
      throw new Error(`Review payload for run ${runId} not found`);
    }
    return JSON.parse(JSON.stringify(rev));
  }

  public updateFlag(runId: string, flagId: string, status: 'accepted' | 'dismissed'): TrustReport {
    const rev = this.reviews.get(runId);
    if (!rev || !rev.trust_report) {
      throw new Error(`No trust report for run ${runId}`);
    }

    const report = rev.trust_report;
    const flag = report.flags.find((f: Flag) => f.id === flagId);
    if (flag) {
      flag.status = status;
    }

    // Recalculate score
    const penalties: Record<string, number> = { high: 30, medium: 15, low: 5 };
    const openFlags = report.flags.filter((f) => f.status === 'open');
    const totalPenalty = openFlags.reduce((sum, f) => sum + (penalties[f.severity] || 10), 0);

    report.overall_score = Math.max(0, Math.min(100, 100 - totalPenalty));

    // Update category scores
    const categoryCounts: Record<string, number> = {};
    for (const f of report.flags) {
      categoryCounts[f.category] = (categoryCounts[f.category] || 0) + (f.status === 'open' ? 1 : 0);
    }
    for (const [cat, count] of Object.entries(categoryCounts)) {
      report.category_scores[cat] = Math.max(0, 1.0 - count * 0.25);
    }

    const hasHighOpen = openFlags.some((f) => f.severity === 'high');
    const hasMedOpen = openFlags.some((f) => f.severity === 'medium');

    if (hasHighOpen || report.overall_score < 60) {
      report.verdict = 'FAIL';
    } else if (hasMedOpen || report.overall_score < 80) {
      report.verdict = 'REVIEW';
    } else {
      report.verdict = 'PASS';
    }

    // If all flags are resolved, policy also updates to passed
    if (openFlags.length === 0 && rev.policy_result) {
      rev.policy_result.passed = true;
      rev.policy_result.violations = [];
      rev.policy_result.required_edits = [];
      rev.failed_trust_banner = false;
    }

    // Synchronize to run summary state
    const run = this.runs.get(runId);
    if (run) {
      run.state_summary.trust_report = report;
      if (rev.policy_result) run.state_summary.policy_result = rev.policy_result;
      run.state_summary.failed_trust_banner = rev.failed_trust_banner;
    }

    return JSON.parse(JSON.stringify(report));
  }

  public submitApproval(runId: string, payload: ApprovalDecisionPayload): RunSummary {
    const run = this.runs.get(runId) || this.runs.get('run_flawed_demo')!;
    const trace = this.traces.get(runId) || [];

    if (payload.decision === 'approve') {
      run.status = 'completed';
      run.state_summary.mock_send_result = {
        delivered_at: new Date().toISOString(),
        channel: run.state_summary.draft?.channel || 'email',
        recipient: run.state_summary.lead?.email || 'target@enterprise.com',
        message_id: `msg_${Math.random().toString(36).substring(2, 10)}`,
        status: 'Delivered (Verified 250 OK)',
      };
      run.state_summary.reply_analysis = MOCK_REPLY_ANALYSIS;

      // Add Courier & Echo traces
      trace.push({
        agent: 'Courier',
        step: 'Mock Send Execution',
        input_summary: `Recipient: ${run.state_summary.lead?.email}, Channel: ${run.state_summary.draft?.channel}`,
        output_summary: 'Message transmitted successfully via verified SMTP gateway. Delivery receipt signed.',
        reason: 'Authorized by human review decision (Decision: APPROVE).',
        duration: '115ms',
        timestamp: new Date().toISOString(),
      });

      trace.push({
        agent: 'Echo',
        step: 'Simulated Inbound Reply Ingestion',
        input_summary: 'Response received from target contact after 4 hours.',
        output_summary: 'Intent classified: "interested". Escalation to human: false. Drafted calendar follow-up.',
        reason: 'Positive reply sentiment matched against booking playbook.',
        duration: '380ms',
        timestamp: new Date().toISOString(),
      });

      trace.push({
        agent: 'Sage',
        step: 'Continuous Learning Optimization',
        input_summary: 'Campaign outcome recorded: replied=true, meeting_booked=pending.',
        output_summary: 'Correlated positive response with audited SOC 2 claims. Synthesized pattern insight.',
        reason: 'Closed feedback loop for business profile knowledge refinement.',
        duration: '520ms',
        timestamp: new Date().toISOString(),
      });
    } else if (payload.decision === 'reject') {
      run.status = 'rejected';
      trace.push({
        agent: 'Atlas',
        step: 'Execution Terminated by Human Review',
        input_summary: `Reviewer notes: ${payload.notes || 'Draft rejected by user.'}`,
        output_summary: 'Pipeline halted. No communications dispatched. State marked as rejected.',
        reason: 'Human rejection received.',
        duration: '20ms',
        timestamp: new Date().toISOString(),
      });
    } else if (payload.decision === 'edit') {
      if (payload.editedBody && run.state_summary.draft) {
        run.state_summary.draft.body = payload.editedBody;
      }
      // Re-running audit cleans up flags
      const rev = this.getReviewPayload(runId);
      if (rev.draft && payload.editedBody) {
        rev.draft.body = payload.editedBody;
      }
      if (rev.trust_report) {
        rev.trust_report.flags = [];
        rev.trust_report.overall_score = 96;
        rev.trust_report.verdict = 'PASS';
      }
      if (rev.policy_result) {
        rev.policy_result.passed = true;
        rev.policy_result.violations = [];
        rev.policy_result.required_edits = [];
      }
      rev.failed_trust_banner = false;

      trace.push({
        agent: 'Veritas',
        step: 'Incremental Re-Audit',
        input_summary: 'User-edited draft body submitted.',
        output_summary: 'Re-audit passed. Clean posture verified. Score: 96/100.',
        reason: 'Manual edits resolved previous discrepancies.',
        duration: '340ms',
        timestamp: new Date().toISOString(),
      });
    }

    return run;
  }

  // -------------------------------------------------------------------------
  // Onboarding Session Mock Helpers
  // -------------------------------------------------------------------------
  private onboardingSessions: Map<string, OnboardingSession> = new Map();

  getOrCreateOnboardingSession(sessionId?: string, coreAnswers?: Partial<CoreIntakeAnswers>): OnboardingSession {
    const id = sessionId || 'onboard_demo_session';
    if (this.onboardingSessions.has(id)) {
      return this.onboardingSessions.get(id)!;
    }
    const defaultAnswers: CoreIntakeAnswers = {
      stage: 'foundation',
      business_type: 'software_saas_ai',
      name: 'OmniFlow AI',
      idea: 'Autonomous workflow automation for B2B operations',
      budget: '10k_to_50k',
      goal: 'Acquire first 10 pilot enterprise customers',
      customers_today: 'interest_no_purchase',
      constraints: '2 person technical team, 6 month runway',
      launch_market: '',
      ...(coreAnswers || {}),
    };
    const session: OnboardingSession = {
      session_id: id,
      core_answers: defaultAnswers,
      follow_ups: this.getQuestionBank(defaultAnswers.business_type),
      follow_up_answers: {},
      classified_facts: [
        {
          id: 'f1',
          key: 'business_name',
          statement: `Business is named '${defaultAnswers.name}'.`,
          classification: 'user_stated',
          confidence: 1.0,
          source: 'user_intake_direct',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'f2',
          key: 'business_type',
          statement: `Business model is classified as ${defaultAnswers.business_type.replace('_', ' ')}.`,
          classification: 'user_stated',
          confidence: 1.0,
          source: 'user_intake_direct',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'f3',
          key: 'value_proposition',
          statement: `Offering: ${defaultAnswers.idea}`,
          classification: 'user_assumption',
          confidence: 0.75,
          source: 'founder_statement',
          timestamp: new Date().toISOString(),
          why_it_matters: 'Value proposition is an unverified hypothesis until audited against paying customer retention.',
          how_to_resolve: 'Test message resonance with structured reply analysis.',
        },
      ],
      readiness: {
        overall_score: 65,
        phase_scores: { foundation: 80, presales_readiness: 65, growth_optimization: 25 },
        user_stated_count: 5,
        verified_count: 0,
        assumption_count: 2,
        unknown_count: 1,
        summary: 'Foundation Readiness: 80%, Pre-Sales Readiness: 65%, Growth Readiness: 25%.',
        critical_gaps: ['Unit Economics: Landed compute costs per user undetermined.'],
      },
      is_fallback_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.onboardingSessions.set(id, session);
    return session;
  }

  getOnboardingSession(sessionId: string): OnboardingSession {
    return this.getOrCreateOnboardingSession(sessionId);
  }

  saveOnboardingSession(
    sessionId: string,
    payload: { core_answers?: Partial<CoreIntakeAnswers>; follow_up_answers?: Record<string, any>; stage_override?: PhaseType }
  ): OnboardingSession {
    const session = this.getOrCreateOnboardingSession(sessionId);
    if (payload.core_answers) {
      session.core_answers = { ...session.core_answers, ...payload.core_answers };
    }
    if (payload.stage_override) {
      session.core_answers.stage = payload.stage_override;
    }
    if (payload.follow_up_answers) {
      session.follow_up_answers = { ...session.follow_up_answers, ...payload.follow_up_answers };
    }
    session.updated_at = new Date().toISOString();
    return session;
  }

  getQuestionBank(businessType: string) {
    return [
      {
        id: 'fq_1',
        question: `What is your primary unit economics metric for ${businessType.replace(/_/g, ' ')}?`,
        rationale: 'Required before launching outbound agent workflows.',
        target_field: 'unit_economics',
        options: ['Tier 1 ($50-$200)', 'Tier 2 ($500-$2000)', 'Enterprise ($10k+)', 'Undecided'],
        answer_type: 'select' as const,
      },
      {
        id: 'fq_2',
        question: 'What is your current fulfillment or delivery capacity?',
        rationale: 'Prevents booking more volume than delivery allows.',
        target_field: 'capacity',
        options: ['1-3 clients', '4-10 clients', 'Scale ready (>10 clients)'],
        answer_type: 'select' as const,
      },
    ];
  }

  getOnboardingFollowUps(sessionId: string, forceFallback = false): FollowUpGenerationResult {
    const session = this.getOrCreateOnboardingSession(sessionId);
    const questions = this.getQuestionBank(session.core_answers.business_type);
    session.follow_ups = questions;
    session.is_fallback_active = forceFallback;
    return {
      questions,
      is_fallback: forceFallback,
      source_model: forceFallback ? 'question_bank_fallback' : 'llm_adaptive',
    };
  }
}

const mockStore = new MockBackendState();

// Public typed API client
export const api = {
  async listBusinesses(): Promise<BusinessProfile[]> {
    if (API_MODE === 'live') {
      const res = await fetch(`${API_URL}/api/businesses`);
      return res.json();
    }
    await new Promise((r) => setTimeout(r, 120));
    return mockStore.getBusinesses();
  },

  async switchBusiness(id: string): Promise<BusinessProfile> {
    if (API_MODE === 'live') {
      const res = await fetch(`${API_URL}/api/businesses/${id}`);
      return res.json();
    }
    await new Promise((r) => setTimeout(r, 100));
    return mockStore.setActiveBusiness(id);
  },

  async createBusiness(profile: Partial<BusinessProfile>): Promise<BusinessProfile> {
    if (API_MODE === 'live') {
      const res = await fetch(`${API_URL}/api/businesses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        throw new Error(`Failed to create business: ${res.statusText}`);
      }
      return res.json();
    }
    await new Promise((r) => setTimeout(r, 150));
    return mockStore.createBusiness(profile);
  },

  async getAgents(): Promise<AgentRegistryResponse> {
    if (API_MODE === 'live') {
      try {
        const res = await fetch(`${API_URL}/api/agents`);
        if (res.ok) return await res.json();
      } catch (e) {}
    }
    return {
      agents: FALLBACK_AGENTS,
      summary: computeAgentCounts(FALLBACK_AGENTS),
    };
  },

  async getHealth(): Promise<{ status: string; storage_backend: string; model_provider: string; is_fallback_active?: boolean }> {
    if (API_MODE === 'live') {
      try {
        const res = await fetch(`${API_URL}/api/health`);
        if (res.ok) return await res.json();
      } catch (e) {}
    }
    return {
      status: 'healthy',
      storage_backend: 'local_json',
      model_provider: 'mock',
      is_fallback_active: false,
    };
  },

  async updateBusinessProfile(profile: BusinessProfile): Promise<BusinessProfile> {
    if (API_MODE === 'live') {
      const res = await fetch(`${API_URL}/api/businesses/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      return res.json();
    }
    await new Promise((r) => setTimeout(r, 150));
    return mockStore.updateBusiness(profile);
  },

  async startRun(businessId: string, leadId?: string | null, isFlawed = false): Promise<string> {
    if (API_MODE === 'live') {
      const res = await fetch(`${API_URL}/api/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, lead_id: leadId }),
      });
      const data = await res.json();
      return data.run_id;
    }
    await new Promise((r) => setTimeout(r, 200));
    return mockStore.createRun(businessId, leadId, isFlawed);
  },

  async getRun(runId: string): Promise<RunSummary> {
    if (API_MODE === 'live') {
      try {
        const res = await fetch(`${API_URL}/api/runs/${runId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && (data.state_summary?.draft || data.status !== 'not_found')) {
            return data;
          }
        }
      } catch (err) {
        // Fallback to local store
      }
    }
    await new Promise((r) => setTimeout(r, 100));
    return mockStore.getRun(runId);
  },

  async getTrace(runId: string): Promise<TraceEvent[]> {
    if (API_MODE === 'live') {
      try {
        const res = await fetch(`${API_URL}/api/runs/${runId}/trace`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            return data;
          }
        }
      } catch (err) {
        // Fallback
      }
    }
    await new Promise((r) => setTimeout(r, 80));
    return mockStore.getTrace(runId);
  },

  async getReviewPayload(runId: string): Promise<ReviewPayload> {
    if (API_MODE === 'live') {
      try {
        const res = await fetch(`${API_URL}/api/runs/${runId}/review`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.draft) {
            return data;
          }
        }
      } catch (err) {
        // Fallback to local store
      }
    }
    await new Promise((r) => setTimeout(r, 100));
    return mockStore.getReviewPayload(runId);
  },

  async updateFlag(runId: string, flagId: string, status: 'accepted' | 'dismissed'): Promise<TrustReport> {
    if (API_MODE === 'live') {
      const res = await fetch(`${API_URL}/api/runs/${runId}/flags/${flagId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return res.json();
    }
    await new Promise((r) => setTimeout(r, 150));
    return mockStore.updateFlag(runId, flagId, status);
  },

  async submitApproval(runId: string, decision: ApprovalDecisionPayload): Promise<RunSummary> {
    if (API_MODE === 'live') {
      try {
        const res = await fetch(`${API_URL}/api/runs/${runId}/approval`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(decision),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        // Fallback to local store
      }
    }
    await new Promise((r) => setTimeout(r, 220));
    return mockStore.submitApproval(runId, decision);
  },

  async recordOutcome(runId: string, outcome: Outcome): Promise<any> {
    if (API_MODE === 'live') {
      const res = await fetch(`${API_URL}/api/runs/${runId}/outcomes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outcome),
      });
      return res.json();
    }
    await new Promise((r) => setTimeout(r, 150));
    return { status: 'outcome_recorded', runId };
  },

  async getInsights(businessId: string): Promise<CampaignReport> {
    if (API_MODE === 'live') {
      const res = await fetch(`${API_URL}/api/businesses/${businessId}/insights`);
      return res.json();
    }
    await new Promise((r) => setTimeout(r, 150));
    return MOCK_CAMPAIGN_REPORT;
  },

  // -------------------------------------------------------------------------
  // Stage 2: Adaptive Onboarding API
  // -------------------------------------------------------------------------
  async startOnboarding(sessionId?: string, coreAnswers?: Partial<CoreIntakeAnswers>): Promise<OnboardingSession> {
    if (API_MODE === 'live') {
      try {
        const res = await fetch(`${API_URL}/api/onboarding/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, core_answers: coreAnswers }),
        });
        if (res.ok) return await res.json();
      } catch (err) {}
    }
    await new Promise((r) => setTimeout(r, 80));
    return mockStore.getOrCreateOnboardingSession(sessionId, coreAnswers);
  },

  async getOnboardingSession(sessionId: string): Promise<OnboardingSession> {
    if (API_MODE === 'live') {
      try {
        const res = await fetch(`${API_URL}/api/onboarding/session/${sessionId}`);
        if (res.ok) return await res.json();
      } catch (err) {}
    }
    await new Promise((r) => setTimeout(r, 60));
    return mockStore.getOnboardingSession(sessionId);
  },

  async saveOnboardingSession(
    sessionId: string,
    payload: {
      core_answers?: Partial<CoreIntakeAnswers>;
      follow_up_answers?: Record<string, any>;
      stage_override?: PhaseType;
    }
  ): Promise<OnboardingSession> {
    if (API_MODE === 'live') {
      try {
        const res = await fetch(`${API_URL}/api/onboarding/session/${sessionId}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) return await res.json();
      } catch (err) {}
    }
    await new Promise((r) => setTimeout(r, 80));
    return mockStore.saveOnboardingSession(sessionId, payload);
  },

  async getOnboardingFollowUps(sessionId: string, forceFallback = false): Promise<FollowUpGenerationResult> {
    if (API_MODE === 'live') {
      try {
        const res = await fetch(`${API_URL}/api/onboarding/session/${sessionId}/follow-ups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force_fallback: forceFallback }),
        });
        if (res.ok) return await res.json();
      } catch (err) {}
    }
    await new Promise((r) => setTimeout(r, 100));
    return mockStore.getOnboardingFollowUps(sessionId, forceFallback);
  },

  // Stage 3 Task Graph & State Machine
  async planTasks(payload: { business_id?: string; phase?: PhaseType; session_id?: string }): Promise<Task[]> {
    if (API_MODE === 'live') {
      try {
        const res = await fetch(`${API_URL}/api/tasks/plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) return await res.json();
      } catch (err) {}
    }
    if (!payload.business_id) throw new Error('No active business is available to plan for.');
    return mockStore.planTasks(payload.business_id, payload.phase);
  },

  async listTasks(filters?: { business_id?: string; phase?: string; status?: string }): Promise<Task[]> {
    if (API_MODE === 'live') {
      try {
        const params = new URLSearchParams();
        if (filters?.business_id) params.set('business_id', filters.business_id);
        if (filters?.phase) params.set('phase', filters.phase);
        if (filters?.status) params.set('status', filters.status);
        const res = await fetch(`${API_URL}/api/tasks?${params.toString()}`);
        if (res.ok) return await res.json();
      } catch (err) {}
    }
    return mockStore.listTasks(filters);
  },

  async getTaskDetails(taskId: string): Promise<{ task: Task; events: TaskEvent[]; versions: TaskVersion[]; report?: AgentReport | null }> {
    if (API_MODE === 'live') {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}`);
      if (res.ok) return await res.json();
    }
    return mockStore.getTaskDetails(taskId);
  },

  async updateTask(taskId: string, updates: Record<string, any>, reason = 'Updated'): Promise<{ task: Task; version: TaskVersion }> {
    if (API_MODE === 'live') {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, reason }),
      });
      if (res.ok) return await res.json();
    }
    throw new Error(`Failed to update task ${taskId}`);
  },

  async transitionTask(taskId: string, toStatus: string, reason = ''): Promise<{ task: Task; event: TaskEvent }> {
    if (API_MODE === 'live') {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_status: toStatus, reason }),
      });
      if (res.ok) return await res.json();
    }
    throw new Error(`Failed to transition task ${taskId}`);
  },

  async pauseTask(taskId: string, reason = 'Paused'): Promise<{ task: Task; event: TaskEvent }> {
    if (API_MODE === 'live') {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) return await res.json();
    }
    throw new Error(`Failed to pause task ${taskId}`);
  },

  async resumeTask(taskId: string, reason = 'Resumed'): Promise<{ task: Task; event: TaskEvent }> {
    if (API_MODE === 'live') {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) return await res.json();
    }
    throw new Error(`Failed to resume task ${taskId}`);
  },

  async executeTask(taskId: string, context?: Record<string, any>): Promise<{ task: Task; report: AgentReport }> {
    if (API_MODE === 'live') {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });
      if (res.ok) return await res.json();
    }
    return mockStore.executeTask(taskId);
  },

  async answerMissingInfo(taskId: string, answer: string, whatItem?: string, itemIndex?: number): Promise<Task> {
    if (API_MODE === 'live') {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer, what_item: whatItem, item_index: itemIndex }),
      });
      if (res.ok) return await res.json();
    }
    throw new Error(`Failed to answer missing info for ${taskId}`);
  },

  async approveTask(taskId: string, reviewer = 'admin', notes = ''): Promise<{ task: Task; event: TaskEvent }> {
    if (API_MODE === 'live') {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer, notes }),
      });
      if (res.ok) return await res.json();
    }
    throw new Error(`Failed to approve task ${taskId}`);
  },

  resetState(): void {
    mockStore.resetState();
  },
};
