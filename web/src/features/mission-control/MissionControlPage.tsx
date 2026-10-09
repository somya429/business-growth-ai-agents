import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { PipelineHero } from './PipelineHero';
import { TraceTimeline } from './TraceTimeline';
import { LeadSummaryCard } from './LeadSummaryCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Play,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Database,
  Cpu,
  Sparkles,
  Compass,
  Layers,
} from 'lucide-react';

export const MissionControlPage: React.FC = () => {
  const { runId: routeRunId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeRunId, setActiveRunId, activeBusinessId, addToast } = useAppStore();
  const isDevTools = import.meta.env.VITE_DEV_TOOLS === '1';

  const currentRunId = routeRunId || activeRunId || null;

  // Fetch Businesses
  const { data: businesses = [], isLoading: isBizLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.listBusinesses(),
  });

  const activeBusiness = businesses.find((b) => b.id === activeBusinessId) || businesses[0];

  // Fetch Run Data
  const { data: runSummary, isLoading: isRunLoading } = useQuery({
    queryKey: ['run', currentRunId],
    queryFn: () => (currentRunId ? api.getRun(currentRunId) : Promise.resolve(null)),
    enabled: Boolean(currentRunId),
  });

  const isRunning = runSummary?.status === 'running';

  // Poll Trace
  const { data: traceEvents = [] } = useQuery({
    queryKey: ['trace', currentRunId],
    queryFn: () => (currentRunId ? api.getTrace(currentRunId) : Promise.resolve([])),
    enabled: Boolean(currentRunId),
    refetchInterval: isRunning ? 1000 : false,
  });

  // Start Clean Run (Dev Only)
  const startCleanRunMutation = useMutation({
    mutationFn: () => {
      if (!activeBusiness) throw new Error('No active business');
      return api.startRun(activeBusiness.id, null, false);
    },
    onSuccess: (newRunId) => {
      setActiveRunId(newRunId);
      queryClient.invalidateQueries();
      navigate(`/run/${newRunId}`);
      addToast({
        type: 'success',
        title: 'Clean Verified Run Started',
        message: 'All claims grounded in approved documents. 100% verified.',
      });
    },
  });

  if (isBizLoading || (currentRunId && isRunLoading)) {
    return (
      <div className="p-8 max-w-[1280px] mx-auto space-y-6">
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-44 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="h-96 lg:col-span-7" />
          <Skeleton className="h-96 lg:col-span-5" />
        </div>
      </div>
    );
  }

  // Calm Empty State 1: No Business exists
  if (!activeBusiness || businesses.length === 0) {
    return (
      <div className="p-6 md:p-12 max-w-[800px] mx-auto text-center space-y-6 min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto text-accent shadow-sm">
          <Compass className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-serif text-text font-light">
            No active orchestrator session
          </h1>
          <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">
            Describe your business first to begin coordinating agents and monitoring executions.
          </p>
        </div>
        <div className="pt-2">
          <Button variant="primary" onClick={() => navigate('/onboard')} rightIcon={<ArrowRight className="w-4 h-4" />}>
            Describe your business
          </Button>
        </div>
      </div>
    );
  }

  // Calm Empty State 2: Business exists, but no run is active
  if (!currentRunId || !runSummary) {
    return (
      <div className="p-6 md:p-12 max-w-[800px] mx-auto text-center space-y-6 min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto text-accent shadow-sm">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-serif text-text font-light">
            No active runs for {activeBusiness.name}
          </h1>
          <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">
            Start an outreach sequence in Studio or generate a phase plan to begin.
          </p>
        </div>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" onClick={() => navigate('/workspace')} rightIcon={<ArrowRight className="w-4 h-4" />}>
            Open Studio
          </Button>
          <Button variant="outline" onClick={() => navigate('/plan')}>
            View Plan
          </Button>
        </div>
      </div>
    );
  }

  const { state_summary } = runSummary;

  return (
    <div className="p-6 md:p-8 max-w-[1280px] mx-auto space-y-8">
      {/* Clean Minimalist Pipeline Banner */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 shadow-xl relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-36 bg-accent/5 rounded-full filter blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-accent bg-accent-soft px-3 py-0.5 rounded-full border border-accent/30 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-accent" />
              10-Agent Autonomous System
            </span>
            <span className="text-xs text-text-muted">
              Account: <strong className="text-text font-medium">{activeBusiness.name}</strong>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif font-light text-text mt-2 tracking-tight">
            Autonomous Pipeline Progress
          </h1>

          <p className="text-xs sm:text-sm text-text-muted mt-1 leading-relaxed">
            See how your AI agents collaborate step-by-step: researching leads, drafting copy, and auditing facts.
            Nothing is ever sent until you verify and approve the draft copy.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate(`/run/${currentRunId}/review`)}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="shadow-[0_0_20px_rgba(212,175,55,0.3)] font-medium"
          >
            Go to Fact-Check Desk
          </Button>

          {isDevTools && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => startCleanRunMutation.mutate()}
              isLoading={startCleanRunMutation.isPending}
              leftIcon={<Play className="w-4 h-4 text-accent" />}
            >
              Demo: Simulate Run
            </Button>
          )}
        </div>
      </div>

      {/* Hero Pipeline */}
      <PipelineHero
        status={runSummary.status}
        failedTrustBanner={state_summary?.failed_trust_banner}
      />

      {/* Main Grid: Trace Timeline (Left) & Lead Summary Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left (7 Cols): Live Trace */}
        <div className="lg:col-span-7 h-[680px]">
          <TraceTimeline events={traceEvents} isPolling={isRunning} />
        </div>

        {/* Right (5 Cols): Cadence + Scout Summary */}
        <div className="lg:col-span-5">
          <LeadSummaryCard
            lead={state_summary?.lead}
            score={state_summary?.score}
            facts={state_summary?.facts}
          />
        </div>
      </div>
    </div>
  );
};
