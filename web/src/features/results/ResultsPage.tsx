import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { CourierReceiptCard } from './CourierReceiptCard';
import { EchoReplyCard } from './EchoReplyCard';
import { SageInsightsCard } from './SageInsightsCard';
import { OutcomesChart } from './OutcomesChart';
import { ConversationReplyDesk } from '../email/ConversationReplyDesk';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ArrowLeft, Compass, ShieldCheck } from 'lucide-react';

interface ResultsPageProps {
  embed?: boolean;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ embed = false }) => {
  const { runId: routeRunId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { activeRunId, setActiveRunId, activeBusinessId } = useAppStore();

  const { data: runsList } = useQuery({
    queryKey: ['runs', activeBusinessId],
    queryFn: () => api.listRuns(activeBusinessId || undefined),
    enabled: !routeRunId && !activeRunId,
  });

  const effectiveRunId = routeRunId || activeRunId || (runsList && runsList.length > 0 ? runsList[0].run_id : null);
  const currentRunId = effectiveRunId;

  useEffect(() => {
    if (!activeRunId && runsList && runsList.length > 0) {
      setActiveRunId(runsList[0].run_id);
    }
  }, [activeRunId, runsList, setActiveRunId]);

  const { data: runSummary, isLoading: isRunLoading } = useQuery({
    queryKey: ['run', currentRunId],
    queryFn: () => (currentRunId ? api.getRun(currentRunId) : Promise.resolve(null)),
    enabled: Boolean(currentRunId),
  });

  const { data: insightsData, isLoading: isInsightsLoading } = useQuery({
    queryKey: ['insights', activeBusinessId],
    queryFn: () => (activeBusinessId ? api.getInsights(activeBusinessId) : Promise.resolve(null)),
    enabled: Boolean(activeBusinessId),
  });

  if (isRunLoading || isInsightsLoading) {
    return (
      <div className="p-8 max-w-[1280px] mx-auto space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!currentRunId || !runSummary) {
    return (
      <div className="p-6 md:p-12 max-w-[800px] mx-auto text-center space-y-6 min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto text-accent shadow-sm">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-serif text-text font-light">
            No campaigns dispatched yet
          </h1>
          <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">
            Run an account research in Growth Studio or execute a pipeline run, then approve or dispatch the message to inspect live delivery receipts and response predictions here.
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Button variant="primary" onClick={() => navigate('/workspace?tab=studio')}>
            Open Growth Studio
          </Button>
          <Button variant="outline" onClick={() => navigate('/orchestrator')}>
            Mission Control
          </Button>
        </div>
      </div>
    );
  }

  if (!runSummary.state_summary?.mock_send_result) {
    const draftSubject = runSummary.state_summary?.draft?.subject || 'Executive Outreach';
    return (
      <div className="p-6 md:p-12 max-w-[800px] mx-auto text-center space-y-6 min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-sm">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-serif text-text font-light">
            Outreach Draft Awaiting Human Authorization
          </h1>
          <p className="text-sm text-text-muted max-w-lg mx-auto leading-relaxed">
            A pipeline run was generated for <span className="text-text font-semibold">{runSummary.state_summary?.company_name || 'Target Account'}</span> (<span className="italic">{draftSubject}</span>). Courier and Echo require human approval before transmission to prevent unverified messages.
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Button variant="primary" onClick={() => navigate(`/run/${currentRunId}/review`)}>
            Review & Authorize Outreach
          </Button>
          <Button variant="outline" onClick={() => navigate('/workspace?tab=studio')}>
            Back to Growth Studio
          </Button>
        </div>
      </div>
    );
  }

  const { state_summary } = runSummary;

  return (
    <div className={embed ? 'space-y-8' : 'p-6 md:p-8 max-w-[1280px] mx-auto space-y-8'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl text-text font-light tracking-tight">
              Results & Continuous Learning
            </h1>
            <Badge variant="verified" size="sm">
              Outreach Verified
            </Badge>
          </div>
          <p className="text-xs text-text-muted mt-1">
            End-to-end receipt provenance, simulated inbound reply classification, and system learning.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate(`/run/${currentRunId}`)}
            leftIcon={<Compass className="w-4 h-4 stroke-[1.5]" />}
          >
            Mission Control
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate(`/run/${currentRunId}/review`)}
            leftIcon={<ShieldCheck className="w-4 h-4 stroke-[1.5]" />}
          >
            Review Audit
          </Button>
        </div>
      </div>

      {/* Top 2 Cards: Courier Mock Send Receipt & Echo Reply Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6">
          <CourierReceiptCard receipt={state_summary?.mock_send_result} />
        </div>

        <div className="lg:col-span-6">
          <EchoReplyCard replyAnalysis={state_summary?.reply_analysis} />
        </div>
      </div>

      {/* Two-Way Conversation & Follow-up Desk */}
      <ConversationReplyDesk
        recipientEmail={state_summary?.mock_send_result?.recipient || 'client@example.com'}
        companyName={state_summary?.company_name || 'Target Account'}
        priorSubject={state_summary?.mock_send_result?.subject || state_summary?.draft?.subject || 'Executive Outreach'}
        priorBody={state_summary?.mock_send_result?.body || state_summary?.draft?.body || ''}
        runId={currentRunId}
        initialThread={state_summary?.conversation_thread}
      />

      {/* Outcomes Chart (Replies, Meetings, Unsubscribes) */}
      {insightsData && (
        <OutcomesChart
          data={insightsData.time_series}
          replyRate={insightsData.reply_rate}
          meetingRate={insightsData.meeting_rate}
          unsubscribeRate={insightsData.unsubscribe_rate}
        />
      )}

      {/* Sage Insights Section */}
      {insightsData?.insights && (
        <SageInsightsCard insights={insightsData.insights} />
      )}
    </div>
  );
};
