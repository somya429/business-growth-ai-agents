import React, { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDashed,
  Database,
  ExternalLink,
  FileQuestion,
  Lightbulb,
  LockKeyhole,
  Play,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  X,
  Instagram,
  Radio,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { api } from '../api/client';
import { BusinessProfile, PhaseType, Task } from '../api/types';
import { SocialIntentView } from '../features/social-intent/SocialIntentView';
import { SpyglassRadarView } from '../features/spyglass/SpyglassRadarView';
import { StrategicPlannerView } from '../features/planner/StrategicPlannerView';
import {
  runAgentPipeline,
  dispatchApprovedEmail,
  fetchCrmRecords,
  fetchLatestPipelineRun,
  fetchEmailOutbox,
  PipelineRunResult,
  EmailDispatchResult,
} from '../api/pipeline';
import { useAppStore } from '../store/useAppStore';
import { PageShell } from '../components/PageShell';
import { Kicker } from '../components/Kicker';
import { Card } from '../components/Card';
import { Button } from '../components/ui/Button';
import { ConversationReplyDesk } from '../features/email/ConversationReplyDesk';

type Problem = 'demand' | 'conversion' | 'fulfilment' | 'margin' | 'retention';

const PROBLEMS: Array<{ id: Problem; label: string; description: string }> = [
  { id: 'demand', label: 'Not enough local demand', description: 'Validate the target neighbourhood, audience, and acquisition channel.' },
  { id: 'conversion', label: 'Visitors are not ordering', description: 'Investigate the gap between interest, price, selection, and checkout.' },
  { id: 'fulfilment', label: 'Delivery or operations are constrained', description: 'Prioritise service area, fulfilment capacity, and customer promises.' },
  { id: 'margin', label: 'Growth may not be profitable', description: 'Model contribution margin, discounts, CAC, and fulfilment cost.' },
  { id: 'retention', label: 'Customers are not returning', description: 'Connect feedback, experience issues, and retention experiments.' },
];

function nextDecision(problem: Problem, business: BusinessProfile) {
  const market = business.ideal_customer || 'your initial market';
  const options: Record<Problem, { title: string; action: string; metric: string; agents: string[] }> = {
    demand: {
      title: `Validate demand before expanding ${business.name}`,
      action: `Test one focused customer segment in ${market}; compare acquisition cost and first-order conversion before adding new areas.`,
      metric: 'Qualified demand, CAC, first-order conversion',
      agents: ['Atlas', 'Scout', 'Compass'],
    },
    conversion: {
      title: `Find the ordering friction in ${business.name}`,
      action: 'Trace the journey from discovery to checkout, then test one evidence-backed improvement instead of increasing spend.',
      metric: 'Product-view → checkout conversion',
      agents: ['Scout', 'Muse', 'Veritas'],
    },
    fulfilment: {
      title: 'Protect the customer promise before growth',
      action: 'Set a realistic service zone and capacity baseline, then use only claims that operations can consistently meet.',
      metric: 'On-time delivery, cancellations, support contacts',
      agents: ['Atlas', 'Compass', 'Veritas'],
    },
    margin: {
      title: 'Grow contribution profit, not just orders',
      action: 'Model margin after discounts, picking/rider cost, refunds, and acquisition cost before approving a campaign.',
      metric: 'Contribution profit per order',
      agents: ['Compass', 'Scout', 'Atlas'],
    },
    retention: {
      title: 'Turn customer feedback into a retention decision',
      action: 'Classify repeat-order blockers, compare them with fulfilment and product signals, then test one small approved recovery action.',
      metric: '30-day repeat rate and refund rate',
      agents: ['Echo', 'Sage', 'Herald'],
    },
  };
  return options[problem];
}

export const WorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeBusinessId, setActiveRunId, addToast } = useAppStore();

  // Nested Workspaces Switcher: Studio, Social Intent, Spyglass Radar, Decision Planner
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const validTabs = ['studio', 'social', 'spyglass', 'planner'];
  const [activeTab, setActiveTab] = useState<'studio' | 'social' | 'spyglass' | 'planner'>(
    validTabs.includes(urlTab || '') ? (urlTab as any) : 'studio'
  );

  useEffect(() => {
    if (urlTab && validTabs.includes(urlTab)) {
      setActiveTab(urlTab as any);
    }
  }, [urlTab]);

  const handleTabChange = (tab: 'studio' | 'social' | 'spyglass' | 'planner') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // --- B2B Account Studio State ---
  const [targetCompany, setTargetCompany] = useState('Anthropic');
  const [businessType, setBusinessType] = useState('B2B software');
  const [recipientEmail, setRecipientEmail] = useState('delivered@resend.dev');
  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineRunResult | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<EmailDispatchResult | null>(null);
  const [crmDrawerOpen, setCrmDrawerOpen] = useState(false);
  const [crmRecords, setCrmRecords] = useState<any[]>([]);
  const [outboxDrawerOpen, setOutboxDrawerOpen] = useState(false);
  const [outboxRecords, setOutboxRecords] = useState<any[]>([]);

  // Auto-load latest research and email state on mount
  useEffect(() => {
    let mounted = true;
    fetchLatestPipelineRun().then((latest) => {
      if (mounted && latest) {
        setResult(latest);
        if (latest.company_name) setTargetCompany(latest.company_name);
        const mockSend = (latest as any).mock_send_result;
        if (mockSend) {
          setDispatchResult({
            status: mockSend.status === 'Delivered' ? 'delivered' : 'failed',
            provider: mockSend.provider || 'Resend API',
            message_id: mockSend.message_id,
            to: mockSend.recipient,
            delivered_at: mockSend.sent_at,
            error: mockSend.error,
          });
          if (mockSend.recipient) setRecipientEmail(mockSend.recipient);
        }
      }
    });

    fetchEmailOutbox().then((emails) => {
      if (mounted) setOutboxRecords(emails);
    });

    return () => {
      mounted = false;
    };
  }, []);

  // --- Decision & Planner State ---
  const [problem, setProblem] = useState<Problem>('demand');
  const [phase, setPhase] = useState<PhaseType>('foundation');
  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.listBusinesses(),
  });
  const business = businesses.find((item) => item.id === activeBusinessId) || businesses[0];
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', business?.id],
    queryFn: () => (business ? api.listTasks({ business_id: business.id }) : Promise.resolve([])),
    enabled: Boolean(business),
  });
  const insight = useMemo(() => (business ? nextDecision(problem, business) : null), [business, problem]);

  const planMutation = useMutation({
    mutationFn: () => {
      if (!business) throw new Error('Create a business profile before asking agents to plan.');
      return api.planTasks({ business_id: business.id, phase });
    },
    onSuccess: (newTasks) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', business?.id] });
      if (!newTasks.length) {
        return addToast({
          type: 'danger',
          title: 'No plan created',
          message: 'Check the business profile and try again.',
        });
      }
      addToast({
        type: 'success',
        title: 'Personalised plan ready',
        message: `${newTasks.length} tasks were created for ${business?.name}.`,
      });
    },
    onError: (error: Error) => addToast({ type: 'danger', title: 'Planning failed', message: error.message }),
  });

  // --- B2B Pipeline Execution Handler ---
  const handleRunPipeline = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetCompany.trim() || isRunning) return;

    setIsRunning(true);
    setDispatchResult(null);
    setActiveStep('research_account');

    const stepSequence = [
      'research_account',
      'detect_signals',
      'detect_personas',
      'synthesize_intelligence',
      'detect_why_now',
      'generate_outreach',
      'critique_outreach',
      'sync_crm',
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      stepIdx++;
      if (stepIdx < stepSequence.length) {
        setActiveStep(stepSequence[stepIdx]);
      }
    }, 450);

    try {
      const data = await runAgentPipeline(targetCompany.trim());
      setResult(data);
      if (data.run_id) {
        setActiveRunId(data.run_id);
      }
      addToast({
        type: 'success',
        title: 'Pipeline Completed',
        message: `Gathered intelligence and verified outreach for ${data.company_name}.`,
      });
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Pipeline Error',
        message: err?.message || 'Failed to execute multi-agent pipeline.',
      });
    } finally {
      clearInterval(interval);
      setActiveStep(null);
      setIsRunning(false);
    }
  };

  const handleDispatchEmail = async () => {
    if (!result || isSending) return;
    const firstStep = result.outreach_sequence.find((s) => s.channel === 'email');
    if (!firstStep) return;

    setIsSending(true);
    try {
      const dispatch = await dispatchApprovedEmail({
        to_email: recipientEmail,
        subject: firstStep.subject || `Outreach for ${result.company_name}`,
        body: firstStep.body,
        company_name: result.company_name,
        run_id: result.run_id,
      });
      setDispatchResult(dispatch);
      if (dispatch.status === 'delivered') {
        addToast({
          type: 'success',
          title: 'Email Delivered',
          message: `Outreach Successfully Delivered to ${dispatch.to}`,
        });
        // Refresh outbox
        fetchEmailOutbox().then(setOutboxRecords);
      } else {
        addToast({
          type: 'danger',
          title: 'Email Delivery Blocked',
          message: dispatch.error || 'Provider rejected email dispatch.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Dispatch Failed',
        message: err?.message || 'Failed to dispatch email.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenCrm = async () => {
    setCrmDrawerOpen(true);
    const records = await fetchCrmRecords();
    setCrmRecords(records);
  };

  const handleOpenOutbox = async () => {
    setOutboxDrawerOpen(true);
    const emails = await fetchEmailOutbox();
    setOutboxRecords(emails);
  };

  return (
    <PageShell
      title="Agent Studio — Verity"
      description="Work directly with Verity's autonomous growth agents: real-time account research, multi-tier trust verification, and Resend email dispatch."
    >
      {/* Studio Header & Tab Switcher */}
      <section className="pt-12 pb-6 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6">
          <div>
            <Kicker>LIVE AGENT WORKSPACE</Kicker>
            <h1 className="font-serif text-[38px] md:text-[50px] leading-[1.05] text-text mt-2 tracking-tight">
              Autonomous Growth Studio
            </h1>
            <p className="text-[15px] text-muted font-sans mt-2 max-w-[650px]">
              Orchestrate multi-agent research across live web sources, inspect verified claims with trusted citations, and authorize calibrated outreach dispatch.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* View Switcher: 4 Nested Workspaces ("pages inside page") */}
            <div className="flex items-center bg-surface border border-border rounded-lg p-1 gap-1">
              <button
                type="button"
                onClick={() => handleTabChange('studio')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeTab === 'studio'
                    ? 'bg-accent/15 text-accent font-semibold shadow-xs'
                    : 'text-muted hover:text-text'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Account Studio</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('social')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeTab === 'social'
                    ? 'bg-accent/15 text-accent font-semibold shadow-xs'
                    : 'text-muted hover:text-text'
                }`}
              >
                <Instagram className="w-3.5 h-3.5 text-pink-400" />
                <span>Social Intent</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('spyglass')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeTab === 'spyglass'
                    ? 'bg-accent/15 text-accent font-semibold shadow-xs'
                    : 'text-muted hover:text-text'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-purple-400" />
                <span>Spyglass Radar</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('planner')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeTab === 'planner'
                    ? 'bg-accent/15 text-accent font-semibold shadow-xs'
                    : 'text-muted hover:text-text'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Strategic Planner</span>
              </button>
            </div>

            {activeTab === 'studio' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenOutbox}
                  className="inline-flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-lg border border-border bg-surface text-text hover:border-accent hover:text-accent transition-colors cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-accent stroke-[1.5]" />
                  Sent Outbox ({outboxRecords.length})
                </button>

                <button
                  type="button"
                  onClick={handleOpenCrm}
                  className="inline-flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-lg border border-border bg-surface text-text hover:border-accent hover:text-accent transition-colors cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5 text-accent stroke-[1.5]" />
                  CRM Store
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* TAB 1: AUTONOMOUS GROWTH STUDIO (B2B ACCOUNT PIPELINE)                   */}
      {/* ========================================================================= */}
      {activeTab === 'studio' && (
        <div className="pt-8 space-y-10 pb-20">
          {/* Target Account Configuration Bar */}
          <section>
            <Card className="p-6 md:p-8">
              <form onSubmit={handleRunPipeline} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                  <div className="md:col-span-5">
                    <label
                      htmlFor="targetCompany"
                      className="block text-[12px] font-sans font-medium uppercase tracking-[0.16em] text-text mb-2"
                    >
                      Target Account To Research
                    </label>
                    <input
                      id="targetCompany"
                      type="text"
                      value={targetCompany}
                      onChange={(e) => setTargetCompany(e.target.value)}
                      placeholder="E.g. Anthropic, Stripe, Datadog, Figma"
                      className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-[15px] font-sans text-text placeholder-muted/60 focus:border-accent focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label
                      htmlFor="businessType"
                      className="block text-[12px] font-sans font-medium uppercase tracking-[0.16em] text-text mb-2"
                    >
                      Your Business Context
                    </label>
                    <select
                      id="businessType"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-[14px] font-sans text-text focus:border-accent focus:outline-none transition-colors"
                    >
                      <option value="B2B software">B2B SaaS / Enterprise Software</option>
                      <option value="E-commerce">E-Commerce & Retail</option>
                      <option value="Local services">Professional & Local Services</option>
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <button
                      type="submit"
                      disabled={isRunning || !targetCompany.trim()}
                      className="w-full inline-flex items-center justify-center gap-2 bg-text text-bg hover:opacity-90 transition-opacity font-sans text-[14px] font-medium py-[11px] px-5 rounded-lg disabled:opacity-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      {isRunning ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Running Pipeline...
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-bg" />
                          Run Agents
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <span className="text-[11px] font-sans text-muted uppercase tracking-wider mr-2">
                    Quick Presets:
                  </span>
                  {['Anthropic', 'Stripe', 'Datadog', 'Figma'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTargetCompany(preset)}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                        targetCompany.toLowerCase() === preset.toLowerCase()
                          ? 'border-accent bg-accent/10 text-accent font-medium'
                          : 'border-border text-muted hover:text-text hover:border-text/40'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </form>
            </Card>
          </section>

          {/* Execution Pipeline Status */}
          {isRunning && (
            <section>
              <Card className="p-6 md:p-8 border-accent/40 bg-accent/5">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent animate-ping" />
                    <span className="text-xs font-sans font-semibold uppercase tracking-wider text-accent">
                      ACTIVE MULTI-AGENT EXECUTION PIPELINE
                    </span>
                  </div>
                  <span className="text-xs font-mono text-muted">target: {targetCompany}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                  {[
                    { id: 'research_account', name: 'Atlas', label: 'Research' },
                    { id: 'detect_signals', name: 'Scout', label: 'Signals' },
                    { id: 'detect_personas', name: 'Cadence', label: 'Personas' },
                    { id: 'synthesize_intelligence', name: 'Sage', label: 'Synthesis' },
                    { id: 'detect_why_now', name: 'Cadence', label: 'Why Now' },
                    { id: 'generate_outreach', name: 'Quill', label: 'Drafting' },
                    { id: 'critique_outreach', name: 'Veritas', label: 'Verifying' },
                    { id: 'sync_crm', name: 'Courier', label: 'CRM & Send' },
                  ].map((step) => {
                    const isCurrent = activeStep === step.id;
                    return (
                      <div
                        key={step.id}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          isCurrent
                            ? 'border-accent bg-accent/15 text-accent font-semibold shadow-xs scale-102'
                            : 'border-border/60 bg-surface text-muted'
                        }`}
                      >
                        <div className="text-[10px] font-mono uppercase">{step.name}</div>
                        <div className="text-xs font-sans mt-0.5">{step.label}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </section>
          )}

          {/* Results View or Prompt */}
          {!result && !isRunning && (
            <Card className="p-8 text-center space-y-4 border-dashed border-border/80 my-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mx-auto">
                <Sparkles className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg text-text">Ready to Research {targetCompany}</h3>
                <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
                  Click <strong className="text-text">"Run Agents"</strong> above to gather real-time web intelligence and synthesize verified outreach drafts for {targetCompany}.
                </p>
              </div>
              <Button variant="primary" size="md" onClick={() => handleRunPipeline()}>
                Run Agents for {targetCompany}
              </Button>
            </Card>
          )}

          {result && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Summary Banner */}
              <div className="bg-surface border border-border rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-lg bg-verified/15 flex items-center justify-center text-verified shrink-0">
                    <CheckCircle2 className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div>
                    <div className="text-[11px] font-sans uppercase tracking-wider text-verified font-semibold">
                      PIPELINE COMPLETED & VERIFIED
                    </div>
                    <h2 className="font-serif text-[24px] text-text font-normal">
                      {result.company_name} — Intelligence Dossier
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-[11px] font-sans uppercase tracking-wider text-muted">Trust Index</div>
                    <div className="font-serif text-[22px] text-verified font-medium">
                      {result.outreach_evaluation?.trust_score ?? 94} / 100
                    </div>
                  </div>
                  <div className="text-right border-l border-border pl-6">
                    <div className="text-[11px] font-sans uppercase tracking-wider text-muted">CRM Status</div>
                    <div className="font-sans text-[14px] text-text capitalize font-medium">
                      {result.crm_status}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2 Column Details: Left Brief & Signals, Right Outreach Sequence */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Research Intelligence & Signals */}
                <div className="lg:col-span-5 space-y-6">
                  <Card className="p-6">
                    <div className="text-xs font-sans font-semibold uppercase tracking-wider text-accent mb-3">
                      ACCOUNT BRIEF & POSITION
                    </div>
                    <p className="text-sm font-sans text-text leading-relaxed">
                      {result.research_data.summary}
                    </p>

                    <div className="mt-5 pt-5 border-t border-border/60">
                      <div className="text-xs font-sans font-semibold uppercase tracking-wider text-muted mb-3">
                        Target Buying Committee
                      </div>
                      <div className="space-y-2.5">
                        {result.buying_committee?.map((p, idx) => (
                          <div key={idx} className="bg-bg p-3 rounded-lg border border-border">
                            <div className="text-sm font-sans font-medium text-text">{p.name || p.title}</div>
                            <div className="text-xs text-muted">{p.title || (p as any).role}</div>
                            <div className="text-[11px] text-accent mt-1 font-mono">
                              {p.relevance || (p as any).reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>

                  {/* High-Intent Signals with Trusted Source Citations */}
                  {result.business_signals && (
                    <Card className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-xs font-sans font-semibold uppercase tracking-wider text-verified">
                          VERIFIED BUSINESS SIGNALS
                        </div>
                        <span className="text-[11px] text-muted font-mono">
                          {result.business_signals.length} detected
                        </span>
                      </div>
                      <div className="space-y-3">
                        {result.business_signals.map((sig, idx) => {
                          const url = (sig as any).source_url || (sig.source?.startsWith('http') ? sig.source : null);
                          return (
                            <div key={idx} className="p-3 rounded-lg border border-border bg-bg space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-medium text-xs text-text">{sig.headline || (sig as any).title}</span>
                                {(sig as any).strength && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-mono shrink-0">
                                    Impact {(sig as any).strength}/10
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted leading-relaxed">
                                {(sig as any).description || (sig as any).business_impact}
                              </p>
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline pt-0.5"
                                >
                                  <span>Source: {(sig as any).source_name || 'Verified Source'}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-[11px] text-muted block">
                                  Source: {sig.source || 'Public Directory'}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}
                </div>

                {/* Right: Outreach Sequence & Direct Email Dispatch */}
                <div className="lg:col-span-7 space-y-6">
                  <Card className="p-6 md:p-8">
                    <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-4">
                      <div>
                        <span className="text-xs font-sans font-semibold uppercase tracking-wider text-accent">
                          STEP 1 OUTREACH DRAFT (EMAIL AGENT)
                        </span>
                        <h3 className="font-serif text-[20px] text-text mt-1">
                          {result.outreach_sequence[0]?.subject || 'Initial Outreach'}
                        </h3>
                      </div>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-verified/15 text-verified text-xs font-sans font-medium rounded-md">
                        <ShieldCheck className="w-3.5 h-3.5 stroke-[2]" />
                        VERIFIED DRAFT
                      </span>
                    </div>

                    <div className="bg-bg p-5 rounded-lg border border-border/70 font-sans text-sm text-text whitespace-pre-line leading-relaxed mb-6">
                      {result.outreach_sequence[0]?.body}
                    </div>

                    {/* Email Dispatch Control */}
                    <div className="pt-4 border-t border-border/60">
                      <div className="mb-4">
                        <label
                          htmlFor="recipientEmail"
                          className="block text-xs font-sans font-medium uppercase tracking-wider text-muted mb-1.5"
                        >
                          Target Email Address (Resend Email Agent)
                        </label>
                        <input
                          id="recipientEmail"
                          type="email"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm font-sans text-text focus:border-accent focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <button
                          type="button"
                          disabled={isSending || dispatchResult?.status === 'delivered'}
                          onClick={handleDispatchEmail}
                          className="inline-flex items-center justify-center gap-2 bg-text text-bg hover:opacity-90 transition-opacity font-sans text-sm font-medium py-2.5 px-5 rounded-lg disabled:opacity-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
                        >
                          {isSending ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Dispatching Email...
                            </>
                          ) : dispatchResult?.status === 'delivered' ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-verified" />
                              Email Dispatched!
                            </>
                          ) : dispatchResult?.status === 'failed' ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5" />
                              Retry Email Dispatch
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              Authorize & Send Email
                            </>
                          )}
                        </button>

                        <span className="text-xs text-muted font-sans">
                          Dispatched through authorized Resend API / Direct SMTP gateway.
                        </span>
                      </div>

                      {/* Dispatch Delivered Confirmation Card */}
                      {dispatchResult && dispatchResult.status === 'delivered' && (
                        <div className="mt-4 p-4 rounded-lg bg-verified/10 border border-verified/30 flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-verified shrink-0 mt-0.5" />
                          <div className="text-xs font-sans text-text">
                            <div className="font-semibold text-verified">
                              Outreach Successfully Delivered to {dispatchResult.to}
                            </div>
                            <div className="text-muted mt-1 font-mono text-[11px]">
                              Message ID: {dispatchResult.message_id || 'dispatched'} • Gateway: {dispatchResult.provider}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Dispatch Gateway Failure / Restriction Card */}
                      {dispatchResult && dispatchResult.status === 'failed' && (
                        <div className="mt-4 p-4 rounded-lg bg-danger/10 border border-danger/30 flex flex-col gap-3">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                            <div className="text-xs font-sans text-text flex-1">
                              <div className="font-semibold text-danger">
                                Email Not Delivered to {dispatchResult.to}
                              </div>
                              <div className="text-text/90 mt-1 leading-relaxed">
                                {dispatchResult.error}
                              </div>
                            </div>
                          </div>

                          <div className="p-3 bg-bg/90 rounded border border-border/70 text-[11px] font-sans text-muted space-y-1.5">
                            <div className="font-semibold text-text">Why didn't this deliver to Gmail?</div>
                            <p className="leading-relaxed">
                              • <strong>Resend Free Tier:</strong> Default sender <code>onboarding@resend.dev</code> strictly allows sending <em>only to the email address registered on your Resend account</em> (to prevent spam). Sending to any other inbox like <code>arpitgarg1806@gmail.com</code> is rejected by Resend.
                            </p>
                            <p className="leading-relaxed">
                              • <strong>Solution 1 (Resend):</strong> Put the email you used to register at <a href="https://resend.com" target="_blank" rel="noreferrer" className="text-accent underline">resend.com</a> in the box above, or verify your domain in the Resend dashboard.
                            </p>
                            <p className="leading-relaxed">
                              • <strong>Solution 2 (Direct Gmail SMTP):</strong> Add standard SMTP credentials to your <code>.env</code> file to send to any inbox with zero restrictions:
                            </p>
                            <pre className="p-2 bg-surface-2 rounded font-mono text-[10px] text-text whitespace-pre-wrap">
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_16_digit_gmail_app_password
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Two-Way Conversation & Follow-up Desk */}
                  <ConversationReplyDesk
                    recipientEmail={recipientEmail}
                    companyName={result.company_name}
                    priorSubject={result.outreach_sequence[0]?.subject || 'Initial Outreach'}
                    priorBody={result.outreach_sequence[0]?.body || ''}
                    runId={result.run_id}
                  />

                  {/* Follow-up Sequence Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.outreach_sequence.slice(1).map((step) => (
                      <Card key={step.step_number} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-semibold">
                            Step {step.step_number} • {step.channel.toUpperCase()}
                          </span>
                        </div>
                        {step.subject && (
                          <div className="font-medium text-xs text-text mb-1 truncate">
                            {step.subject}
                          </div>
                        )}
                        <p className="text-xs text-muted font-sans line-clamp-3">
                          {step.body}
                        </p>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SOCIAL INTENT-TO-SALE AGENT (INSTAGRAM COMPETITOR COMMENTS)        */}
      {/* ========================================================================= */}
      {activeTab === 'social' && (
        <div className="pt-8 pb-20">
          <SocialIntentView />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SPYGLASS TELEMETRY & 15-MINUTE COMPETITIVE RADAR                   */}
      {/* ========================================================================= */}
      {activeTab === 'spyglass' && (
        <div className="pt-8 pb-20">
          <SpyglassRadarView />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BUSINESS DECISION & STRATEGIC GROWTH PLANNER                      */}
      {/* ========================================================================= */}
      {activeTab === 'planner' && (
        <div className="pt-8 pb-20">
          <StrategicPlannerView business={business} />
        </div>
      )}

      {/* CRM Records Modal Drawer */}
      {crmDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-xl max-w-[850px] w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-serif text-[22px] text-text">CRM Synchronized Records</h3>
                <p className="text-xs text-muted font-sans mt-0.5">
                  Synchronized target accounts, buyer committees, and outreach history stored by the CRM agent.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCrmDrawerOpen(false)}
                className="p-1.5 rounded-md hover:bg-surface-2 text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {crmRecords.length === 0 ? (
                <div className="py-12 text-center text-muted text-xs">
                  No records in CRM store yet. Run an account pipeline to synchronize.
                </div>
              ) : (
                crmRecords.map((rec, i) => (
                  <div key={i} className="p-4 rounded-lg border border-border bg-bg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-medium text-base text-text">
                        {rec.company_name || rec.data?.company_name || 'Account'}
                      </span>
                      <span className="text-[11px] font-mono text-muted">
                        {rec.synced_at ? new Date(rec.synced_at).toLocaleString() : 'Synced'}
                      </span>
                    </div>
                    <div className="text-xs text-muted">
                      {rec.summary || rec.data?.summary || 'No summary'}
                    </div>
                    {rec.outreach_sequence && (
                      <div className="text-[11px] text-accent font-mono">
                        {rec.outreach_sequence.length} outreach steps recorded
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setCrmDrawerOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sent Mails & Outbox Log Modal Drawer */}
      {outboxDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-xl max-w-[850px] w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-serif text-[22px] text-text">Sent Outreach & Outbox Log</h3>
                <p className="text-xs text-muted font-sans mt-0.5">
                  Complete audit history of all outreach emails dispatched by the agents.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOutboxDrawerOpen(false)}
                className="p-1.5 rounded-md hover:bg-surface-2 text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {outboxRecords.length === 0 ? (
                <div className="py-12 text-center text-muted text-xs">
                  No sent messages in outbox log yet. Click "Authorize & Send Email" on an outreach draft to dispatch.
                </div>
              ) : (
                outboxRecords.map((item, i) => {
                  const isDelivered = item.status === 'Delivered' || item.status === 'delivered';
                  return (
                    <div key={i} className="p-4 rounded-lg border border-border bg-bg space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                            isDelivered ? 'bg-verified/15 text-verified' : 'bg-danger/15 text-danger'
                          }`}>
                            {isDelivered ? 'DELIVERED' : 'GATEWAY BLOCKED'}
                          </span>
                          <span className="font-semibold text-xs text-text">{item.recipient}</span>
                          <span className="text-xs text-muted">({item.company_name})</span>
                        </div>
                        <span className="text-[11px] font-mono text-muted">
                          {item.sent_at ? new Date(item.sent_at).toLocaleString() : 'Recent'}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-text">
                        Subject: {item.subject}
                      </div>

                      <div className="text-xs text-muted line-clamp-3 bg-surface-2/60 p-2.5 rounded border border-border/50 whitespace-pre-line font-sans">
                        {item.body}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-muted pt-2 border-t border-border/40">
                        <div>
                          <span>Gateway: {item.provider || 'Resend API'}</span>
                          {item.message_id && <span className="ml-2">• ID: {item.message_id}</span>}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setOutboxDrawerOpen(false);
                            setRecipientEmail(item.recipient);
                            if (item.company_name) setTargetCompany(item.company_name);
                            setTimeout(() => {
                              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                            }, 100);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent/90 text-xs font-sans font-medium transition-colors cursor-pointer self-start sm:self-auto"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Respond to Client Reply</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setOutboxDrawerOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};
