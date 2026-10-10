import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit3,
  AlertTriangle,
  Building,
  User,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Send,
  Filter,
} from 'lucide-react';

export interface PendingApprovalItem {
  id: string;
  type: string;
  title: string;
  target_company: string;
  subject?: string;
  body?: string;
  recipient?: string;
  created_at: string;
  agent: string;
  factual_score: number;
  citations_count: number;
  risk_level: 'low' | 'medium' | 'high';
  flags?: Array<{
    id: string;
    sentence_text?: string;
    reason?: string;
    severity?: string;
  }>;
  notes?: string;
}

interface ApexApprovalGatewayProps {
  items: PendingApprovalItem[];
  onApprove: (id: string, type: string) => Promise<void>;
  onReject: (id: string, type: string, feedback: string) => Promise<void>;
  onRevise: (id: string, type: string, feedback: string) => Promise<void>;
  isProcessing: boolean;
}

export const ApexApprovalGateway: React.FC<ApexApprovalGatewayProps> = ({
  items,
  onApprove,
  onReject,
  onRevise,
  isProcessing,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'high' | 'flags'>('all');
  const [selectedItem, setSelectedItem] = useState<PendingApprovalItem | null>(items[0] || null);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [isRevising, setIsRevising] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // In-page filtered list
  const filteredItems = items.filter((item) => {
    if (filterMode === 'high') return item.factual_score >= 95;
    if (filterMode === 'flags') return Boolean(item.flags && item.flags.length > 0);
    return true;
  });

  // Keep selected item valid
  React.useEffect(() => {
    if (!selectedItem && filteredItems.length > 0) {
      setSelectedItem(filteredItems[0]);
    } else if (selectedItem && !filteredItems.find((i) => i.id === selectedItem.id)) {
      setSelectedItem(filteredItems[0] || null);
    }
  }, [filterMode, items]);

  const handleApproveAction = async (item: PendingApprovalItem) => {
    await onApprove(item.id, item.type);
  };

  const handleRejectAction = async (item: PendingApprovalItem) => {
    await onReject(item.id, item.type, rejectionReason || 'Rejected by executive command.');
    setIsRejecting(false);
    setRejectionReason('');
  };

  const handleReviseAction = async (item: PendingApprovalItem) => {
    if (!revisionFeedback.trim()) return;
    await onRevise(item.id, item.type, revisionFeedback);
    setIsRevising(false);
    setRevisionFeedback('');
  };

  if (items.length === 0) {
    return (
      <div className="panel p-10 bg-[var(--paper)] border-[var(--ink)] shadow-hard text-center space-y-4">
        <div className="w-12 h-12 border border-[var(--ink)] bg-[var(--tint)] flex items-center justify-center mx-auto text-[var(--accent)] font-bold">
          <CheckCircle2 className="w-6 h-6 text-[var(--ink-deep)]" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-[var(--ink-deep)]">Zero Pending Approvals</h3>
          <p className="text-sm text-[var(--ink-2)] max-w-md mx-auto">
            All outbound actions, agent drafts, and campaigns are fully cleared. The orchestrator is running smoothly within approved parameters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel bg-[var(--paper)] border-[var(--ink)] shadow-hard flex flex-col">
      {/* Top Gateway Header Strip */}
      <div className="p-4 sm:p-5 bg-[var(--tint)] border-b border-[var(--ink)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border border-[var(--ink)] bg-[var(--bg)] flex items-center justify-center text-[var(--ink-deep)]">
            <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <div className="text-base font-bold text-[var(--ink-deep)] flex items-center gap-2">
              <span>Executive Clearance Gateway</span>
              <span className="pill text-[11px] font-mono font-bold bg-[var(--ink)] text-[var(--bg)]">
                {items.length} Awaiting Sign-off
              </span>
            </div>
            <div className="text-xs text-[var(--ink-2)]">
              Direct human oversight: inspect grounded claims, instruct agent revisions, or trigger dispatch.
            </div>
          </div>
        </div>

        {/* In-Page Sub-View Filter Pills */}
        <div className="flex items-center gap-2">
          <span className="eyebrow text-xs hidden sm:inline">Filter:</span>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`chip text-xs ${filterMode === 'all' ? 'bg-[var(--ink)] text-[var(--bg)]' : ''}`}
            aria-pressed={filterMode === 'all'}
          >
            All Items ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('high')}
            className={`chip text-xs ${filterMode === 'high' ? 'bg-[var(--ink)] text-[var(--bg)]' : ''}`}
            aria-pressed={filterMode === 'high'}
          >
            Verified ≥95%
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('flags')}
            className={`chip text-xs ${filterMode === 'flags' ? 'bg-[var(--ink)] text-[var(--bg)]' : ''}`}
            aria-pressed={filterMode === 'flags'}
          >
            Flagged Warnings
          </button>
        </div>
      </div>

      {/* Main Split Layout: In-Page Queue (Left) & Deep Inspection Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[540px]">
        {/* Left Column (5 cols): Items Queue */}
        <div className="lg:col-span-5 border-r border-[var(--ink)] p-4 space-y-3 bg-[var(--bg)] overflow-y-auto max-h-[660px]">
          <div className="eyebrow text-[11px] px-1">
            Queued Approvals ({filteredItems.length})
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-[var(--ink-2)]">
              No items match the active filter.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedItem(item);
                    setIsRevising(false);
                    setIsRejecting(false);
                  }}
                  className={`p-3.5 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--paper)] border-[var(--ink)] shadow-hard-sm'
                      : 'bg-[var(--paper)] border-[var(--line)] hover:border-[var(--ink)] hover:bg-[var(--tint)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-sm font-bold text-[var(--ink-deep)] truncate max-w-[220px]">
                      {item.title}
                    </span>
                    <span
                      className={`pill text-[10px] font-mono font-bold ${
                        item.factual_score >= 95 ? 'done' : 'next'
                      }`}
                    >
                      {item.factual_score}% Grounded
                    </span>
                  </div>

                  <div className="text-xs text-[var(--ink-2)] flex items-center gap-1.5 mb-2">
                    <Building className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span className="font-semibold text-[var(--ink-deep)]">{item.target_company}</span>
                    <span>•</span>
                    <span>{item.recipient}</span>
                  </div>

                  {item.subject && (
                    <div className="text-xs text-[var(--ink)] font-serif italic line-clamp-1 mb-2 bg-[var(--bg)] px-2.5 py-1 border border-[var(--line)]">
                      "{item.subject}"
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-[var(--ink-2)] pt-1 border-t border-[var(--line)]">
                    <span>Drafted by: <strong className="font-semibold text-[var(--ink-deep)]">{item.agent}</strong></span>
                    <span className="font-mono text-[11px] font-semibold text-[var(--accent-text)]">
                      {item.citations_count} Verified Facts
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column (7 cols): Selected Item Detail & Action Center */}
        {selectedItem ? (
          <div className="lg:col-span-7 p-6 space-y-5 bg-[var(--paper)] flex flex-col justify-between">
            <div className="space-y-4">
              {/* Target & Score Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
                <div>
                  <div className="eyebrow text-[11px]">
                    Target Enterprise Account
                  </div>
                  <h3 className="text-xl font-bold text-[var(--ink-deep)] flex items-center gap-2 mt-0.5">
                    {selectedItem.target_company}
                    <span className="text-sm font-normal text-[var(--ink-2)]">
                      ({selectedItem.recipient})
                    </span>
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="pill done text-xs font-mono font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{selectedItem.factual_score}% Veritas Score</span>
                  </span>
                  <span className="pill text-xs font-mono border border-[var(--ink)]">
                    {selectedItem.citations_count} Citations
                  </span>
                </div>
              </div>

              {/* Subject Line */}
              {selectedItem.subject && (
                <div>
                  <div className="eyebrow text-[11px] mb-1">
                    Subject Line
                  </div>
                  <div className="p-3 bg-[var(--bg)] border border-[var(--ink)] text-sm font-semibold text-[var(--ink-deep)]">
                    {selectedItem.subject}
                  </div>
                </div>
              )}

              {/* Draft Message Body Preview */}
              <div>
                <div className="eyebrow text-[11px] mb-1 flex items-center justify-between">
                  <span>Grounded Outreach Copy</span>
                  <span className="text-[var(--accent-text)] lowercase font-mono">audited against company knowledge</span>
                </div>
                <div className="p-4 bg-[var(--bg)] border border-[var(--ink)] text-sm leading-relaxed text-[var(--ink-deep)] font-sans whitespace-pre-line max-h-56 overflow-y-auto">
                  {selectedItem.body}
                </div>
              </div>

              {/* Flags Warning (if any) */}
              {selectedItem.flags && selectedItem.flags.length > 0 && (
                <div className="p-3 border border-[#A12D0A] bg-[#FFF2EE] text-xs text-[#A12D0A] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Attention: Grounding Warning Flagged</span>
                  </div>
                  {selectedItem.flags.map((f, i) => (
                    <div key={i} className="text-xs pl-5">
                      • "{f.sentence_text}": {f.reason}
                    </div>
                  ))}
                </div>
              )}

              {/* In-Page Revision Prompt Area */}
              {isRevising && (
                <div className="p-4 border border-[var(--ink)] bg-[var(--tint)] space-y-2">
                  <div className="text-xs font-bold text-[var(--ink-deep)] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Instruct Quill to Revise Copy</span>
                  </div>
                  <textarea
                    rows={3}
                    value={revisionFeedback}
                    onChange={(e) => setRevisionFeedback(e.target.value)}
                    placeholder="Tell Quill what to adjust (e.g. 'Shorten by 30%, mention our SOC2 compliance, and soften the call-to-action')..."
                    className="w-full p-2.5 text-xs bg-[var(--bg)] border border-[var(--ink)] text-[var(--ink-deep)] focus:outline-none"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsRevising(false)}
                      className="btn small"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviseAction(selectedItem)}
                      disabled={!revisionFeedback.trim() || isProcessing}
                      className="btn solid small"
                    >
                      Regenerate with Feedback
                    </button>
                  </div>
                </div>
              )}

              {/* In-Page Rejection Prompt Area */}
              {isRejecting && (
                <div className="p-4 border border-[#A12D0A] bg-[#FFF2EE] space-y-2">
                  <div className="text-xs font-bold text-[#A12D0A] flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reason for Rejection</span>
                  </div>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide reason for terminating this item..."
                    className="w-full p-2.5 text-xs bg-[var(--bg)] border border-[var(--ink)] text-[var(--ink-deep)] focus:outline-none"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsRejecting(false)}
                      className="btn small"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectAction(selectedItem)}
                      disabled={isProcessing}
                      className="btn small bg-[#A12D0A] text-white hover:bg-[#802206]"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Action Control Buttons */}
            <div className="pt-4 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRejecting(true)}
                  disabled={isProcessing}
                  className="btn small text-[#A12D0A] border-[#A12D0A] hover:bg-[#FFF2EE]"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsRevising(true)}
                  disabled={isProcessing}
                  className="btn small"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Request AI Revision</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleApproveAction(selectedItem)}
                disabled={isProcessing}
                className="btn solid"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Dispatch via Agent →</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 p-8 text-center text-[var(--ink-2)] flex items-center justify-center">
            Select an item from the queue to review and clear.
          </div>
        )}
      </div>
    </div>
  );
};
