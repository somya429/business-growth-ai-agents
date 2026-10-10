import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  CoreIntakeAnswers,
  PhaseType,
  BusinessType,
  BudgetTier,
  CustomerTraction,
  OnboardingSession,
  ClassifiedFact,
} from '../../api/types';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  MapPin,
  Route,
  Users,
  FileCheck2,
} from 'lucide-react';

const STORAGE_KEY = 'verity_onboard_session_id';

const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  software_saas_ai: 'Software / SaaS / AI',
  services_consulting: 'Services & Consulting',
  physical_product: 'Physical Product & Hardware',
  marketplace_platform: 'Marketplace / Platform',
  operating_business: 'Operating Business (Scaling)',
};

const PHASE_LABELS: Record<PhaseType, { label: string; desc: string }> = {
  foundation: {
    label: 'Phase 1: Foundation',
    desc: 'Zero-to-one validation, ICP discovery, and baseline message resonance.',
  },
  presales_readiness: {
    label: 'Phase 2: Pre-Sales Readiness',
    desc: 'Pipeline architecture, consultative outbound, and audited value collateral.',
  },
  growth_optimization: {
    label: 'Phase 3: Growth & Optimization',
    desc: 'Multi-agent scale, continuous learning feedback loops, and campaign experiments.',
  },
};

export const AdaptiveOnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast, setActiveBusinessId } = useAppStore();

  const [sessionId, setSessionId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || `onboard_${Date.now()}`;
  });

  const [activeStep, setActiveStep] = useState<'core' | 'followups' | 'readiness'>('core');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loadedSessionIdRef = useRef<string | null>(null);

  // Fetch session data
  const { data: session, isLoading, refetch } = useQuery<OnboardingSession>({
    queryKey: ['onboarding-session', sessionId],
    queryFn: () => api.getOnboardingSession(sessionId),
  });

  // Local editable state synchronized with session
  const [coreAnswers, setCoreAnswers] = useState<CoreIntakeAnswers>({
    stage: 'foundation',
    business_type: 'software_saas_ai',
    name: '',
    idea: '',
    budget: 'undecided',
    goal: '',
    customers_today: 'none',
    constraints: '',
    launch_market: '',
  });

  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, any>>({});

  // Keep references to latest local values to prevent stale closures
  const latestCoreRef = useRef(coreAnswers);
  latestCoreRef.current = coreAnswers;
  const latestFollowUpRef = useRef(followUpAnswers);
  latestFollowUpRef.current = followUpAnswers;

  // Initialize form state ONLY when a session is loaded initially or sessionId changes
  useEffect(() => {
    if (session && loadedSessionIdRef.current !== session.session_id) {
      loadedSessionIdRef.current = session.session_id;
      setCoreAnswers(session.core_answers);
      setFollowUpAnswers(session.follow_up_answers || {});
      localStorage.setItem(STORAGE_KEY, session.session_id);
    }
  }, [session]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Autosave Mutation
  const saveMutation = useMutation({
    mutationFn: (payload: {
      core_answers?: Partial<CoreIntakeAnswers>;
      follow_up_answers?: Record<string, any>;
      stage_override?: PhaseType;
    }) => api.saveOnboardingSession(sessionId, payload),
    onMutate: () => {
      setSaveStatus('saving');
    },
    onSuccess: (updated) => {
      setSaveStatus('saved');
      // Update session query cache (for readiness metrics/phase scores)
      // Note: loadedSessionIdRef prevents this from overwriting active user typing
      queryClient.setQueryData(['onboarding-session', sessionId], updated);
    },
    onError: () => {
      setSaveStatus('error');
    },
  });

  // Debounced Autosave (waits until user finishes typing)
  const triggerAutosave = (
    updatedCore?: CoreIntakeAnswers,
    updatedFollowUps?: Record<string, any>,
    stageOverride?: PhaseType
  ) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      saveMutation.mutate({
        core_answers: updatedCore ?? latestCoreRef.current,
        follow_up_answers: updatedFollowUps ?? latestFollowUpRef.current,
        stage_override: stageOverride,
      });
    }, 800);
  };

  const handleCoreChange = <K extends keyof CoreIntakeAnswers>(field: K, value: CoreIntakeAnswers[K]) => {
    const updated = { ...latestCoreRef.current, [field]: value };
    setCoreAnswers(updated);
    triggerAutosave(updated, latestFollowUpRef.current);
  };

  const handlePhaseChange = (phase: PhaseType) => {
    const updated = { ...latestCoreRef.current, stage: phase };
    setCoreAnswers(updated);
    triggerAutosave(updated, latestFollowUpRef.current, phase);
    addToast({
      type: 'info',
      title: 'Target Phase Switched',
      message: `Switched target roadmap to ${PHASE_LABELS[phase].label}.`,
    });
  };

  const handleFollowUpChange = (qId: string, value: string) => {
    const updated = { ...latestFollowUpRef.current, [qId]: value };
    setFollowUpAnswers(updated);
    triggerAutosave(latestCoreRef.current, updated);
  };

  // Follow-up generation mutation
  const followUpMutation = useMutation({
    mutationFn: (forceFallback: boolean) => api.getOnboardingFollowUps(sessionId, forceFallback),
    onSuccess: () => {
      refetch();
      addToast({
        type: 'success',
        title: 'Follow-up Questions Ready',
        message: 'Tailored questions loaded for your business model.',
      });
    },
  });

  const launchMutation = useMutation({
    mutationFn: async () => {
      const business = await api.createBusiness({
        name: coreAnswers.name.trim(),
        industry: BUSINESS_TYPE_LABELS[coreAnswers.business_type],
        offerings: [coreAnswers.idea.trim()],
        ideal_customer: coreAnswers.launch_market.trim() || 'To be defined during market research',
        tone: 'Clear, helpful, and locally relevant',
      });
      const tasks = await api.planTasks({ business_id: business.id, phase: coreAnswers.stage, session_id: sessionId });
      return { business, tasks };
    },
    onSuccess: ({ business, tasks }) => {
      setActiveBusinessId(business.id);
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', business.id] });
      addToast({
        type: 'success',
        title: 'Growth workspace created',
        message: `Atlas created ${tasks.length} first tasks for ${business.name}.`,
      });
      navigate('/plan');
    },
    onError: (error: Error) => {
      addToast({ type: 'danger', title: 'Could not build your plan', message: error.message || 'Please try again.' });
    },
  });

  const handleReset = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const newId = `onboard_${Date.now()}`;
    localStorage.setItem(STORAGE_KEY, newId);
    loadedSessionIdRef.current = null;
    setSessionId(newId);
    setCoreAnswers({
      stage: 'foundation',
      business_type: 'software_saas_ai',
      name: '',
      idea: '',
      budget: 'undecided',
      goal: '',
      customers_today: 'none',
      constraints: '',
      launch_market: '',
    });
    setFollowUpAnswers({});
    setActiveStep('core');
    addToast({
      type: 'info',
      title: 'Fresh Intake Initialized',
      message: 'Started new onboarding session.',
    });
  };

  if (isLoading || !session) {
    return (
      <Card variant="surface" className="p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </Card>
    );
  }

  const readiness = session.readiness;
  const userStatedCount = readiness?.user_stated_count || 0;
  const verifiedCount = readiness?.verified_count || 0;
  const assumptionCount = readiness?.assumption_count || 0;
  const unknownCount = readiness?.unknown_count || 0;
  const ideaLooksLikeMarketplace = /deliver|delivery|grocery|restaurant|vendor|rider|driver|marketplace|inventory/i.test(coreAnswers.idea);
  const recommendedBusinessType = ideaLooksLikeMarketplace ? 'marketplace_platform' : null;
  const canBuildPlan = Boolean(coreAnswers.name.trim() && coreAnswers.idea.trim() && coreAnswers.goal.trim());

  return (
    <div className="space-y-6">
      {/* Top Header Card with Phase Switcher & Autosave Status */}
      <Card variant="surface" className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl text-text font-normal">
                Adaptive Business Intake & Readiness
              </span>
              {saveStatus === 'saved' && (
                <Badge variant="verified" size="sm">
                  <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Autosaved
                </Badge>
              )}
              {saveStatus === 'saving' && (
                <Badge variant="neutral" size="sm">
                  <RefreshCw className="w-3 h-3 mr-1 inline animate-spin" /> Saving...
                </Badge>
              )}
              {session.is_fallback_active && (
                <Badge variant="warning" size="sm">
                  Using fallback questions (AI models unavailable)
                </Badge>
              )}
              {session.storage_fallback && (
                <Badge variant="warning" size="sm">
                  Local Repository Fallback Active
                </Badge>
              )}
            </div>
            <p className="text-xs text-text-muted">
              Session ID: <code className="font-mono text-text">{session.session_id}</code> &bull; Storage: <strong className="text-text">{session.storage_backend || 'local'}</strong> &bull; All answers resume automatically.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset Session
            </Button>
            <div className="flex bg-surface-2 p-1 rounded-lg border border-border">
              {(['core', 'followups', 'readiness'] as const).map((step) => (
                <button
                  key={step}
                  onClick={() => setActiveStep(step)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeStep === step
                      ? 'bg-accent text-background font-semibold shadow-sm'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  {step === 'core' && '1. 8 Core Questions'}
                  {step === 'followups' && `2. Follow-Ups (${session.follow_ups?.length || 0})`}
                  {step === 'readiness' && `3. Readiness (${readiness?.overall_score || 0}%)`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Phase Selector - Change Phase At Any Time */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">
              Select or Change Active Phase:
            </span>
            <span className="text-xs text-accent">Click any phase to switch</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(['foundation', 'presales_readiness', 'growth_optimization'] as PhaseType[]).map((p) => {
              const isSelected = coreAnswers.stage === p;
              const info = PHASE_LABELS[p];
              const score = readiness?.phase_scores?.[p] ?? 0;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePhaseChange(p)}
                  className={`p-3.5 rounded-xl text-left border transition-all ${
                    isSelected
                      ? 'bg-accent/10 border-accent text-text shadow-sm ring-1 ring-accent/30'
                      : 'bg-surface-2 border-border/70 text-text-muted hover:border-border hover:text-text'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-text">{info.label}</span>
                    <Badge variant={isSelected ? 'accent' : 'neutral'} size="sm">
                      {score}% Ready
                    </Badge>
                  </div>
                  <p className="text-[11px] leading-relaxed line-clamp-2">{info.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Step 1: 8 Core Questions */}
      {activeStep === 'core' && (
        <Card variant="surface" className="p-6 space-y-6">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg text-text font-normal">8-Question Core Intake</h3>
              <p className="text-xs text-text-muted">
                Establishes the objective factual foundation without fabricated assumptions.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveStep('followups')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Next: Adaptive Follow-Ups
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Business Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text flex items-center justify-between">
                <span>1. Business / Project Name</span>
                <span className="text-[10px] text-text-muted">Required for sender authentication</span>
              </label>
              <input
                type="text"
                value={coreAnswers.name}
                onChange={(e) => handleCoreChange('name', e.target.value)}
                placeholder="e.g. Acme AI Systems"
                className="w-full bg-surface-2 border border-border rounded-lg px-3.5 py-2 text-sm text-text focus:outline-none focus:border-accent"
              />
            </div>

            {/* 2. Business Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text">
                2. Business Model & Type
              </label>
              <select
                value={coreAnswers.business_type}
                onChange={(e) => handleCoreChange('business_type', e.target.value as BusinessType)}
                className="w-full bg-surface-2 border border-border rounded-lg px-3.5 py-2 text-sm text-text focus:outline-none focus:border-accent"
              >
                {(Object.keys(BUSINESS_TYPE_LABELS) as BusinessType[]).map((t) => (
                  <option key={t} value={t}>
                    {BUSINESS_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Product / Idea Description */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-text flex items-center justify-between">
                <span>3. Product Offering & Core Idea</span>
                <span className="text-[10px] text-text-muted">What problem does it solve and for whom?</span>
              </label>
              <textarea
                rows={3}
                value={coreAnswers.idea}
                onChange={(e) => handleCoreChange('idea', e.target.value)}
                placeholder="Describe your core product or service offering..."
                className="w-full bg-surface-2 border border-border rounded-lg p-3 text-sm text-text focus:outline-none focus:border-accent resize-none"
              />
            </div>

            {/* 4. Capital Budget Tier */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text">
                4. Capital & Tool Budget Tier
              </label>
              <select
                value={coreAnswers.budget}
                onChange={(e) => handleCoreChange('budget', e.target.value as BudgetTier)}
                className="w-full bg-surface-2 border border-border rounded-lg px-3.5 py-2 text-sm text-text focus:outline-none focus:border-accent"
              >
                <option value="undecided">Undecided / Flexible</option>
                <option value="almost_none">Almost None ($0 - $100/mo bootstrap)</option>
                <option value="under_10k">Under $10,000</option>
                <option value="10k_to_50k">$10,000 - $50,000</option>
                <option value="above_50k">Above $50,000</option>
              </select>
            </div>

            {/* 5. Customer Traction Today */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text">
                5. Current Customer Traction
              </label>
              <select
                value={coreAnswers.customers_today}
                onChange={(e) => handleCoreChange('customers_today', e.target.value as CustomerTraction)}
                className="w-full bg-surface-2 border border-border rounded-lg px-3.5 py-2 text-sm text-text focus:outline-none focus:border-accent"
              >
                <option value="none">Zero customers (Pre-launch)</option>
                <option value="interest_no_purchase">Interest / Waitlist (No paid transactions yet)</option>
                <option value="paying_customers">Active Paying Customers</option>
                <option value="repeat_customers">Repeat / Recurring Customers (Retention proven)</option>
              </select>
            </div>

            {/* 6. Primary Growth Goal */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text">
                6. Immediate Primary Goal
              </label>
              <input
                type="text"
                value={coreAnswers.goal}
                onChange={(e) => handleCoreChange('goal', e.target.value)}
                placeholder="e.g. Sign first 5 enterprise pilots"
                className="w-full bg-surface-2 border border-border rounded-lg px-3.5 py-2 text-sm text-text focus:outline-none focus:border-accent"
              />
            </div>

            {/* 7. Operating Constraints */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text">
                7. Operating Constraints (Runway, hours, skills)
              </label>
              <input
                type="text"
                value={coreAnswers.constraints}
                onChange={(e) => handleCoreChange('constraints', e.target.value)}
                placeholder="e.g. 2 person team, 6 month runway, US timezone only"
                className="w-full bg-surface-2 border border-border rounded-lg px-3.5 py-2 text-sm text-text focus:outline-none focus:border-accent"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-text flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-accent" />
                8. Initial Launch Market
              </label>
              <input
                type="text"
                value={coreAnswers.launch_market}
                onChange={(e) => handleCoreChange('launch_market', e.target.value)}
                placeholder="e.g. Bengaluru neighbourhoods, India; or US mid-market SaaS teams"
                className="w-full bg-surface-2 border border-border rounded-lg px-3.5 py-2 text-sm text-text focus:outline-none focus:border-accent"
              />
              <p className="text-[11px] text-text-muted">This keeps research, audience targeting, and any delivery promise grounded in a real operating area.</p>
            </div>
          </div>

          {recommendedBusinessType && coreAnswers.business_type !== recommendedBusinessType && (
            <div className="flex items-start gap-3 rounded-xl border border-warning/35 bg-warning/10 p-4 text-sm">
              <Route className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div>
                <p className="font-medium text-text">This looks more like a marketplace or operating business than a SaaS product.</p>
                <p className="mt-1 text-xs text-text-muted">For grocery delivery, Verity will focus on supply, service area, fulfillment capacity, and local demand—not generic B2B outreach.</p>
                <button type="button" onClick={() => handleCoreChange('business_type', 'marketplace_platform')} className="mt-2 text-xs font-semibold text-accent hover:underline">
                  Use Marketplace / Platform plan
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Step 2: Adaptive Follow-Up Questions */}
      {activeStep === 'followups' && (
        <Card variant="surface" className="p-6 space-y-6">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg text-text font-normal">
                  Adaptive Follow-Up Questions
                </h3>
                {session.is_fallback_active ? (
                  <Badge variant="warning" size="sm">
                    Using fallback questions (AI models unavailable)
                  </Badge>
                ) : (
                  <Badge variant="accent" size="sm">
                    <Sparkles className="w-3 h-3 mr-1 inline" /> AI Generated
                  </Badge>
                )}
              </div>
              <p className="text-xs text-text-muted">
                Calibrated specifically for {BUSINESS_TYPE_LABELS[coreAnswers.business_type]}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => followUpMutation.mutate(false)}
                disabled={followUpMutation.isPending}
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${followUpMutation.isPending ? 'animate-spin' : ''}`} />}
              >
                Regenerate
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveStep('readiness')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Next: Readiness Panel
              </Button>
            </div>
          </div>

          <div className="space-y-5">
            {session.follow_ups?.map((q, idx) => {
              const currentVal = followUpAnswers[q.id] || '';
              return (
                <div key={q.id} className="p-4 rounded-xl bg-surface-2 border border-border space-y-2.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-mono text-accent font-semibold">
                        Question {idx + 1} &bull; {q.target_field.replace(/_/g, ' ')}
                      </span>
                      <h4 className="text-sm font-medium text-text">{q.question}</h4>
                    </div>
                  </div>

                  <p className="text-xs text-text-muted italic bg-surface/50 p-2 rounded-lg border border-border/40">
                    Why Atlas needs this: {q.rationale}
                  </p>

                  {q.options && q.options.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleFollowUpChange(q.id, opt)}
                          className={`p-2.5 rounded-lg text-left text-xs border transition-all ${
                            currentVal === opt
                              ? 'bg-accent/15 border-accent text-text font-medium ring-1 ring-accent/30'
                              : 'bg-surface border-border/70 text-text-muted hover:border-border hover:text-text'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={currentVal}
                      onChange={(e) => handleFollowUpChange(q.id, e.target.value)}
                      placeholder="Type your response..."
                      className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Step 3: Business Readiness Panel & Classified Facts */}
      {activeStep === 'readiness' && (
        <div className="space-y-6">
          {/* Readiness Metric Summary Card */}
          <Card variant="surface" className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h3 className="font-serif text-xl text-text font-normal">
                  Business Readiness Assessment
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Audit posture evaluated against the {PHASE_LABELS[coreAnswers.stage].label} milestone requirements.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-serif text-accent font-semibold">
                    {readiness?.overall_score || 0}%
                  </div>
                  <div className="text-[10px] font-mono text-text-muted uppercase">
                    Readiness Score
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={() => launchMutation.mutate()}
                  isLoading={launchMutation.isPending}
                  disabled={!canBuildPlan}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Create workspace & plan
                </Button>
              </div>
            </div>

            {/* Fact Distribution Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-surface-2 border border-border flex items-center justify-between">
                <div>
                  <div className="text-xs text-text-muted">User-Stated Facts</div>
                  <div className="text-lg font-semibold text-text">{userStatedCount}</div>
                </div>
                <Badge variant="accent" size="sm">User-Stated</Badge>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-2 border border-border flex items-center justify-between">
                <div>
                  <div className="text-xs text-text-muted">Verified Facts</div>
                  <div className="text-lg font-semibold text-text">{verifiedCount}</div>
                </div>
                <Badge variant="verified" size="sm">Audited / Cited</Badge>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-2 border border-border flex items-center justify-between">
                <div>
                  <div className="text-xs text-text-muted">User Assumptions</div>
                  <div className="text-lg font-semibold text-text">{assumptionCount}</div>
                </div>
                <Badge variant="warning" size="sm">Unverified Hypotheses</Badge>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-2 border border-border flex items-center justify-between">
                <div>
                  <div className="text-xs text-text-muted">Unknown / Missing</div>
                  <div className="text-lg font-semibold text-text">{unknownCount}</div>
                </div>
                <Badge variant="danger" size="sm">Critical Gaps</Badge>
              </div>
            </div>

            {/* Critical Gaps Alert if Unknowns Exist */}
            {readiness?.critical_gaps && readiness.critical_gaps.length > 0 && (
              <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 space-y-2">
                <div className="flex items-center gap-2 text-danger text-xs font-semibold uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" />
                  No Invented Answers: {readiness.critical_gaps.length} Unresolved Requirements
                </div>
                <ul className="list-disc list-inside text-xs text-text-muted space-y-1">
                  {readiness.critical_gaps.map((gap, idx) => (
                    <li key={idx}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div>
                  <h4 className="font-serif text-base text-text">What happens after this intake?</h4>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">Verity turns your answers into a small, phase-appropriate plan. Atlas researches the market, Scout identifies signals, Quill drafts assets, Veritas checks claims, and Warden checks anti-spam rules. Nothing is ever sent to a customer until you review and approve it.</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3 text-xs">
                    <div className="rounded-lg border border-border bg-surface p-3"><strong className="text-text">1. Plan</strong><br /><span className="text-text-muted">Prioritised tasks around your immediate goal.</span></div>
                    <div className="rounded-lg border border-border bg-surface p-3"><strong className="text-text">2. Research & draft</strong><br /><span className="text-text-muted">Evidence-backed work, not mass messaging.</span></div>
                    <div className="rounded-lg border border-border bg-surface p-3"><strong className="text-text">3. Review & learn</strong><br /><span className="text-text-muted">You approve; results improve the next action.</span></div>
                  </div>
                  {!canBuildPlan && <p className="mt-3 flex items-center gap-1.5 text-xs text-warning"><FileCheck2 className="h-3.5 w-3.5" /> Add a business name, offering, and immediate goal before building a plan.</p>}
                </div>
              </div>
            </div>
          </Card>

          {/* Classified Facts Detailed Ledger */}
          <Card variant="surface" className="p-6 space-y-4">
            <h4 className="font-serif text-base text-text font-normal flex items-center justify-between">
              <span>Fact Ledger & Provenance Log</span>
              <span className="text-xs font-mono text-text-muted">
                {session.classified_facts?.length || 0} registered records
              </span>
            </h4>

            <div className="space-y-3">
              {session.classified_facts?.map((f: ClassifiedFact) => (
                <div
                  key={f.id}
                  className="p-3.5 rounded-xl bg-surface-2 border border-border/80 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-text font-semibold uppercase">
                        {f.key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        &bull; Source: {f.source} &bull; {new Date(f.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-text">{f.statement}</p>
                    {f.why_it_matters && (
                      <p className="text-text-muted text-[11px] italic">
                        <strong>Why it matters:</strong> {f.why_it_matters}
                      </p>
                    )}
                    {f.how_to_resolve && (
                      <p className="text-accent text-[11px]">
                        <strong>How to resolve:</strong> {f.how_to_resolve}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0 self-start sm:self-center">
                    {f.classification === 'verified' && (
                      <Badge variant="verified" size="sm">Verified</Badge>
                    )}
                    {f.classification === 'user_stated' && (
                      <Badge variant="accent" size="sm">User-Stated</Badge>
                    )}
                    {f.classification === 'user_assumption' && (
                      <Badge variant="warning" size="sm">User Assumption</Badge>
                    )}
                    {f.classification === 'unknown' && (
                      <Badge variant="danger" size="sm">Unknown</Badge>
                    )}
                    {f.classification === 'researched_finding' && (
                      <Badge variant="accent" size="sm">Researched</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
