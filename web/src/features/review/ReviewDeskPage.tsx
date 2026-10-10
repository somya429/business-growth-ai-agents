import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { DraftDocument } from './DraftDocument';
import { TrustScoreRing } from './TrustScoreRing';
import { FlagCard } from './FlagCard';
import { InlineDraftEditor } from './InlineDraftEditor';
import { ApprovalDialog } from './ApprovalDialog';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { OnboardingPage } from '../onboarding/OnboardingPage';
import { ResultsPage } from '../results/ResultsPage';
import {
  Check,
  CheckCircle2,
  XCircle,
  Edit3,
  ArrowRight,
  ShieldCheck,
  Send,
  Lock,
  Sparkles,
  ArrowLeft,
  AlertTriangle,
  Sliders,
  TrendingUp,
} from 'lucide-react';

export const ReviewDeskPage: React.FC = () => {
  const { runId: routeRunId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { activeBusinessId, activeRunId, setActiveRunId, addToast } = useAppStore();

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

  const activeSubTab = (searchParams.get('tab') as 'review' | 'company' | 'results') || 'review';

  const handleSelectSubTab = (tab: 'review' | 'company' | 'results') => {
    setSearchParams({ tab });
  };

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [showApprovalSuccess, setShowApprovalSuccess] = useState(false);

  // Queries
  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.listBusinesses(),
  });
  const currentBusiness = businesses?.find((b) => b.id === activeBusinessId);
  const businessName = currentBusiness?.name || 'Active Account';

  const { data: payload, isLoading } = useQuery({
    queryKey: ['reviewPayload', currentRunId],
    queryFn: () => (currentRunId ? api.getReviewPayload(currentRunId) : Promise.resolve(null)),
    enabled: Boolean(currentRunId),
  });

  // Flag Update Mutation
  const flagMutation = useMutation({
    mutationFn: ({ flagId, status }: { flagId: string; status: 'accepted' | 'dismissed' }) => {
      if (!currentRunId) throw new Error('No active run');
      return api.updateFlag(currentRunId, flagId, status);
    },
    onSuccess: (updatedReport) => {
      if (currentRunId) {
        queryClient.invalidateQueries({ queryKey: ['reviewPayload', currentRunId] });
        queryClient.invalidateQueries({ queryKey: ['run', currentRunId] });
      }
      addToast({
        type: 'info',
        title: 'Trust Score Updated',
        message: `Score updated to ${updatedReport.overall_score}/100 (${updatedReport.verdict}).`,
      });
    },
  });

  // Edit Draft Mutation
  const editMutation = useMutation({
    mutationFn: (newBody: string) => {
      if (!currentRunId) throw new Error('No active run');
      return api.submitApproval(currentRunId, { decision: 'edit', editedBody: newBody });
    },
    onSuccess: () => {
      setIsEditorOpen(false);
      if (currentRunId) {
        queryClient.invalidateQueries({ queryKey: ['reviewPayload', currentRunId] });
        queryClient.invalidateQueries({ queryKey: ['run', currentRunId] });
      }
      addToast({
        type: 'success',
        title: 'Draft Saved',
        message: 'Your custom email copy was saved.',
      });
    },
  });

  // Approval Mutation
  const approvalMutation = useMutation({
    mutationFn: (decision: 'approve' | 'reject') => {
      if (!currentRunId) throw new Error('No active run');
      return api.submitApproval(currentRunId, { decision });
    },
    onSuccess: (_, decision) => {
      setIsApprovalOpen(false);
      queryClient.invalidateQueries();
      if (decision === 'approve') {
        setShowApprovalSuccess(true);
        addToast({
          type: 'success',
          title: 'Email Approved & Sent',
          message: 'Transmission authorized. View delivery receipt in Results.',
        });
        setTimeout(() => {
          navigate(`/run/${currentRunId}/results`);
        }, 1500);
      } else {
        addToast({
          type: 'danger',
          title: 'Draft Rejected',
          message: 'Outbound dispatch cancelled.',
        });
        navigate(currentRunId ? `/run/${currentRunId}` : '/orchestrator');
      }
    },
  });

  const draft = payload?.draft;
  const trustReport = payload?.trust_report;
  const flags = trustReport?.flags || [];
  const openFlags = flags.filter((f) => f.status === 'open');
  const canApprove = openFlags.length === 0;

  return (
    <div className="p-6 md:p-8 max-w-[1240px] mx-auto space-y-6 pb-28">
      {/* Sub-Navigation Pill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ink)] pb-4">
        <div className="seg" role="tablist" aria-label="Governance sub-views">
          <button
            type="button"
            role="tab"
            aria-pressed={activeSubTab === 'review'}
            onClick={() => handleSelectSubTab('review')}
            className="flex items-center gap-2 text-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--verified)]" />
            <span>Review & Approvals</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-pressed={activeSubTab === 'company'}
            onClick={() => handleSelectSubTab('company')}
            className="flex items-center gap-2 text-xs"
          >
            <Sliders className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Company & ICP</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-pressed={activeSubTab === 'results'}
            onClick={() => handleSelectSubTab('results')}
            className="flex items-center gap-2 text-xs"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[var(--ink-deep)]" />
            <span>Campaign Outcomes</span>
          </button>
        </div>

        <div className="text-xs text-[var(--ink-2)] font-mono flex items-center gap-2">
          <span className="dot scale-75" />
          <span>Governance Desk: <strong className="text-[var(--ink-deep)]">{businessName}</strong></span>
        </div>
      </div>

      {/* Sub-View Content */}
      {activeSubTab === 'company' && <OnboardingPage embed />}
      {activeSubTab === 'results' && <ResultsPage embed />}
      {activeSubTab === 'review' && (
        <>
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-10 w-72" />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <Skeleton className="h-[600px] lg:col-span-7" />
                <Skeleton className="h-[600px] lg:col-span-5" />
              </div>
            </div>
          ) : !currentRunId || !payload || !payload.draft ? (
            <div className="p-6 md:p-12 max-w-[800px] mx-auto text-center space-y-6 min-h-[50vh] flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto text-accent shadow-sm">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-serif text-text font-light">
                  No drafts awaiting review
                </h1>
                <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">
                  Veritas and Quill place outreach drafts here when human sign-off is required before sending.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button variant="primary" onClick={() => navigate('/orchestrator')}>
                  Go to Mission Control
                </Button>
                <Button variant="secondary" onClick={() => navigate('/run/run_flawed_demo/review')}>
                  Load Demo Review (Flagged Claims)
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Success Animation Overlay */}
      <AnimatePresence>
        {showApprovalSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-bg/90 backdrop-blur-md flex flex-col items-center justify-center select-none"
          >
            <motion.div
              initial={{ scale: 0.8, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="text-center space-y-3"
            >
              <div className="w-16 h-16 rounded-full bg-verified/20 border border-verified/40 flex items-center justify-center text-verified mx-auto shadow-[0_0_24px_rgba(52,211,153,0.4)]">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h2 className="font-serif text-3xl text-text font-normal">
                Approved & Transmitted
              </h2>
              <p className="text-sm text-text-muted font-mono">
                Opening Results & Delivery Receipt...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clean Minimalist Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-accent bg-accent-soft px-2.5 py-0.5 rounded-full border border-accent/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              Human Fact-Check Gate
            </span>
            <span className="text-xs text-text-muted">
              Account: <strong className="text-text">{businessName}</strong>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif font-light text-text mt-2 tracking-tight">
            Review & Fix AI Draft Before Sending
          </h1>

          <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-2xl leading-relaxed">
            The AI drafted an outreach email, but our fact-checker caught <strong className="text-warning font-semibold">{openFlags.length} factual mistake{openFlags.length !== 1 ? 's' : ''}</strong>.
            Click <strong className="text-verified font-medium">"Apply Verified Fix"</strong> on each issue to reconcile against official company documents.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/run/${currentRunId}`)}
          leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        >
          View Pipeline
        </Button>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols): The Email Draft */}
        <div className="lg:col-span-7 h-full">
          {draft && (
            <DraftDocument
              draft={draft}
              flags={flags}
              onOpenEdit={() => setIsEditorOpen(true)}
            />
          )}
        </div>

        {/* Right Column (5 cols): Fact-Check & Fix Panel */}
        <div className="lg:col-span-5 space-y-5">
          {/* Trust Score Card */}
          <Card variant="surface" className="p-6 relative overflow-hidden border border-white/10 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <h3 className="font-serif text-base text-text font-normal">
                  Factual Accuracy Index
                </h3>
              </div>
              <span className="text-[11px] font-mono text-text-muted">
                {openFlags.length === 0 ? '✓ All Facts Verified' : `${openFlags.length} Issue${openFlags.length > 1 ? 's' : ''} Pending`}
              </span>
            </div>

            {trustReport && (
              <div className="py-2">
                <TrustScoreRing
                  score={trustReport.overall_score}
                  verdict={trustReport.verdict}
                  size={144}
                />
              </div>
            )}

            <div className="mt-3 p-3 rounded-xl bg-surface-2/60 border border-white/[0.06] text-center text-xs text-text-muted leading-relaxed">
              {openFlags.length > 0 ? (
                <span>
                  Resolve the <strong className="text-warning">{openFlags.length} issue{openFlags.length > 1 ? 's' : ''}</strong> below to reach 100% accuracy and unlock outbound sending.
                </span>
              ) : (
                <span className="text-verified font-medium flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-verified" />
                  100% Verified. All claims grounded in approved documents.
                </span>
              )}
            </div>
          </Card>

          {/* List of Mistakes to Fix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
                Detected Mistakes ({flags.length})
              </h4>
              <span className="text-[11px] font-mono text-accent">
                {openFlags.length === 0 ? 'All Fixed' : 'Click to Fix'}
              </span>
            </div>

            {flags.map((flag) => {
              const matchingVerdict = trustReport?.claim_verdicts?.find((v) =>
                v.claim.toLowerCase().includes(flag.sentence_text.slice(0, 20).toLowerCase())
              );
              return (
                <FlagCard
                  key={flag.id}
                  flag={flag}
                  claimVerdict={matchingVerdict}
                  isLoading={flagMutation.isPending}
                  onUpdateStatus={(flagId, status) =>
                    flagMutation.mutate({ flagId, status })
                  }
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-16 right-0 bg-[#0A0D14]/95 backdrop-blur-xl border-t border-white/10 px-8 py-4 z-40 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${canApprove ? 'bg-verified animate-ping' : 'bg-warning animate-pulse'}`} />
          <div className="text-xs sm:text-sm font-medium text-text">
            {canApprove ? (
              <span className="text-verified font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Ready to Send — All Factual Mistakes Fixed
              </span>
            ) : (
              <span className="text-text-muted">
                Gate Locked: <strong className="text-warning">{openFlags.length} mistake{openFlags.length > 1 ? 's' : ''}</strong> must be resolved before sending
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="md"
            onClick={() => setIsEditorOpen(true)}
            leftIcon={<Edit3 className="w-4 h-4" />}
          >
            Edit Copy
          </Button>

          <Button
            variant={canApprove ? 'verified' : 'secondary'}
            size="md"
            disabled={!canApprove || approvalMutation.isPending}
            isLoading={approvalMutation.isPending}
            onClick={() => setIsApprovalOpen(true)}
            leftIcon={canApprove ? <Send className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            className={canApprove ? 'shadow-[0_0_20px_rgba(52,211,153,0.35)]' : 'opacity-50'}
          >
            {canApprove ? 'Approve & Send Email' : 'Approve & Send (Locked)'}
          </Button>
        </div>
      </div>

      {/* Inline Editor Dialog */}
      {draft && (
        <InlineDraftEditor
          isOpen={isEditorOpen}
          initialBody={draft.body}
          onClose={() => setIsEditorOpen(false)}
          onSave={(body) => editMutation.mutate(body)}
          isSaving={editMutation.isPending}
        />
      )}

      {/* Final Approval Confirmation Dialog */}
      <ApprovalDialog
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        onConfirm={() => approvalMutation.mutate('approve')}
        isSubmitting={approvalMutation.isPending}
        recipientEmail="elena.rostova@starlightfg.com"
        channel={draft?.channel?.toUpperCase() || 'EMAIL'}
      />
            </>
          )}
        </>
      )}
    </div>
  );
};
