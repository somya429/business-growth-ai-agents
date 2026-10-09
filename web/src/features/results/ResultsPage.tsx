import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { CourierReceiptCard } from './CourierReceiptCard';
import { EchoReplyCard } from './EchoReplyCard';
import { SageInsightsCard } from './SageInsightsCard';
import { OutcomesChart } from './OutcomesChart';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ArrowLeft, Compass, ShieldCheck } from 'lucide-react';

export const ResultsPage: React.FC = () => {
  const { runId: routeRunId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { activeRunId, activeBusinessId } = useAppStore();

  const currentRunId = routeRunId || activeRunId || null;

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

  if (!currentRunId || !runSummary || !runSummary.state_summary?.mock_send_result) {
    return (
      <div className="p-6 md:p-12 max-w-[800px] mx-auto text-center space-y-6 min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto text-accent shadow-sm">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-serif text-text font-light">
            No results yet
          </h1>
          <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">
            Approved outreach, delivery receipts, and reply analytics will appear here after your first run.
          </p>
        </div>
        <div className="pt-2">
          <Button variant="primary" onClick={() => navigate('/orchestrator')}>
            Go to Mission Control
          </Button>
        </div>
      </div>
    );
  }

  const { state_summary } = runSummary;

  return (
    <div className="p-6 md:p-8 max-w-[1280px] mx-auto space-y-8">
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
