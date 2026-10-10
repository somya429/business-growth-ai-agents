import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  CornerDownRight,
  User,
  Bot,
  Mail,
  Zap,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  processClientReply,
  dispatchApprovedEmail,
  syncInboxReplies,
  ConversationMessage,
} from '../../api/pipeline';
import { useAppStore } from '../../store/useAppStore';

interface ConversationReplyDeskProps {
  recipientEmail: string;
  companyName: string;
  priorSubject: string;
  priorBody: string;
  runId?: string;
  initialThread?: ConversationMessage[];
  onThreadUpdate?: (thread: ConversationMessage[]) => void;
}

const QUICK_CLIENT_REPLIES = [
  {
    label: '🟢 Interested / Meeting',
    text: "Thanks for reaching out. We've been looking into autonomous pipeline benchmarking recently. Would you have 15 minutes this Tuesday at 2 PM to walk us through the live demo?",
  },
  {
    label: '🔵 Technical Question',
    text: "Interesting concept. How does Verity ground its research without hallucinations, and does it integrate with our existing CRM pipeline?",
  },
  {
    label: '🟠 Pricing Inquiry (Human Escalation)',
    text: 'Can you provide the pricing breakdown for your enterprise tier, annual contract terms, and team onboarding fees?',
  },
  {
    label: '🔴 Unsubscribe (Opt-Out)',
    text: 'Please remove our email from your outreach list and unsubscribe us immediately.',
  },
];

export const ConversationReplyDesk: React.FC<ConversationReplyDeskProps> = ({
  recipientEmail,
  companyName,
  priorSubject,
  priorBody,
  runId,
  initialThread,
  onThreadUpdate,
}) => {
  const { addToast } = useAppStore();

  const [thread, setThread] = useState<ConversationMessage[]>(() => {
    if (initialThread && initialThread.length > 0) return initialThread;
    if (priorBody) {
      return [
        {
          id: 'msg_initial_outreach',
          sender: 'agent',
          role: 'Verity Outreach Agent',
          subject: priorSubject,
          body: priorBody,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sent',
        },
      ];
    }
    return [];
  });

  // Re-sync thread if incoming props change asynchronously
  React.useEffect(() => {
    if (initialThread && initialThread.length > 0) {
      setThread(initialThread);
    } else if (priorBody) {
      setThread([
        {
          id: 'msg_initial_outreach',
          sender: 'agent',
          role: 'Verity Outreach Agent',
          subject: priorSubject,
          body: priorBody,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sent',
        },
      ]);
    }
  }, [initialThread, priorBody, priorSubject]);

  const [clientReplyText, setClientReplyText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncingInbox, setIsSyncingInbox] = useState(false);
  const [isDispatching, setIsDispatching] = useState<string | null>(null);
  const [editableDrafts, setEditableDrafts] = useState<Record<string, string>>({});
  const threadEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const handleSyncFromInbox = async () => {
    setIsSyncingInbox(true);
    try {
      const res = await syncInboxReplies(recipientEmail);
      if (res.status === 'found' && res.body) {
        setClientReplyText(res.body);
        addToast({
          type: 'success',
          title: 'Reply Ingested from Gmail',
          message: `Fetched incoming email from ${res.from || recipientEmail}: "${res.subject || 'Client Reply'}"`,
        });
      } else if (res.status === 'no_replies') {
        addToast({
          type: 'warning',
          title: 'No New Unread Replies',
          message: `No unread messages found from ${recipientEmail}. You can paste the reply text directly into the box.`,
        });
      } else if (res.status === 'not_configured') {
        addToast({
          type: 'warning',
          title: 'Gmail Sync Notice',
          message: res.message || 'Configure SMTP_USER & SMTP_PASSWORD in .env for direct sync, or paste the reply below.',
        });
      } else {
        addToast({
          type: 'danger',
          title: 'Sync Failed',
          message: res.message || 'Failed to sync with mailbox.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Sync Error',
        message: err?.message || 'Error checking Gmail mailbox.',
      });
    } finally {
      setIsSyncingInbox(false);
    }
  };

  const handleProcessReply = async () => {
    if (!clientReplyText.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      const res = await processClientReply({
        run_id: runId,
        client_email: recipientEmail,
        client_reply: clientReplyText.trim(),
        prior_subject: priorSubject,
        prior_body: priorBody,
        company_name: companyName,
      });

      if (res.status === 'success' && res.conversation_thread) {
        setThread(res.conversation_thread);
        if (onThreadUpdate) onThreadUpdate(res.conversation_thread);

        // Prepopulate editable draft for the latest agent response
        const latestDraft = [...res.conversation_thread]
          .reverse()
          .find((m) => m.sender === 'agent' && m.status === 'drafted');
        if (latestDraft) {
          setEditableDrafts((prev) => ({ ...prev, [latestDraft.id]: latestDraft.body }));
        }

        const analysis = res.reply_analysis;
        if (analysis?.escalate_to_human) {
          addToast({
            type: 'warning',
            title: 'Human Escalation Triggered',
            message: `Echo classified intent as '${analysis.intent.toUpperCase()}': ${analysis.reason}`,
          });
        } else {
          addToast({
            type: 'success',
            title: 'Agent Response Formulated',
            message: `Echo classified intent as '${analysis?.intent?.toUpperCase() || 'QUESTION'}' and grounded a follow-up reply.`,
          });
        }

        setClientReplyText('');
      } else {
        addToast({
          type: 'danger',
          title: 'Processing Failed',
          message: res.error || 'Failed to process client reply.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Error',
        message: err?.message || 'Error executing follow-up agent.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDispatchAgentResponse = async (msgId: string, customBody?: string) => {
    const targetMsg = thread.find((m) => m.id === msgId);
    if (!targetMsg) return;

    const bodyToSend = customBody || editableDrafts[msgId] || targetMsg.body;
    setIsDispatching(msgId);

    try {
      const res = await dispatchApprovedEmail({
        to_email: recipientEmail,
        subject: `Re: ${priorSubject || 'Outreach'} (${companyName})`,
        body: bodyToSend,
        company_name: companyName,
        run_id: runId,
      });

      if (res.status === 'delivered') {
        addToast({
          type: 'success',
          title: 'Follow-up Dispatched',
          message: `Agent response delivered to ${recipientEmail} via ${res.provider}.`,
        });

        // Update message status in thread
        const updatedThread = thread.map((m) =>
          m.id === msgId
            ? { ...m, body: bodyToSend, status: 'sent' as const }
            : m
        );
        setThread(updatedThread);
        if (onThreadUpdate) onThreadUpdate(updatedThread);
      } else {
        addToast({
          type: 'danger',
          title: 'Dispatch Blocked',
          message: res.error || 'Email gateway rejected follow-up dispatch.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Dispatch Failed',
        message: err?.message || 'Failed to dispatch email.',
      });
    } finally {
      setIsDispatching(null);
    }
  };

  return (
    <Card className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/70 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <MessageSquare className="w-4 h-4 stroke-[1.5]" />
          </div>
          <div>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-accent">
              TWO-WAY CONVERSATION AGENT
            </span>
            <h3 className="font-serif text-[19px] text-text">
              Client Replies & Echo Agent Follow-up Loop
            </h3>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 text-text text-xs font-mono rounded-md border border-border">
          <Zap className="w-3.5 h-3.5 text-accent" />
          Autonomous Follow-up Engine
        </span>
      </div>

      {/* Conversation Thread History */}
      <div className="space-y-4 max-h-[850px] overflow-y-auto pr-1">
        {thread.length === 0 ? (
          <div className="text-center py-8 text-xs font-sans text-muted">
            No message history recorded yet. Dispatch the initial outreach email above to begin.
          </div>
        ) : (
          thread.map((msg) => {
            const isAgent = msg.sender === 'agent';
            const isDraft = msg.status === 'drafted';
            const analysis = msg.analysis;
            const draftValue = editableDrafts[msg.id] ?? msg.body;

            return (
              <div
                key={msg.id}
                className={`p-4 md:p-5 rounded-xl border text-xs font-sans space-y-3 transition-colors ${
                  isAgent
                    ? isDraft
                      ? 'bg-amber-500/5 border-amber-500/30'
                      : 'bg-bg border-border/80'
                    : 'bg-accent/5 border-accent/30'
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        isAgent ? 'bg-text text-bg' : 'bg-accent text-white'
                      }`}
                    >
                      {isAgent ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <span className="font-semibold text-text">{msg.role}</span>
                      <span className="text-[10px] text-muted ml-2">{msg.timestamp}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {msg.status === 'sent' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-verified/15 text-verified">
                        <CheckCircle2 className="w-3 h-3" />
                        DISPATCHED
                      </span>
                    )}
                    {msg.status === 'received' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-accent/15 text-accent">
                        <Mail className="w-3 h-3" />
                        INBOUND REPLY
                      </span>
                    )}
                    {isDraft && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-500 font-semibold">
                        <Sparkles className="w-3 h-3" />
                        AGENT DRAFT (AWAITING DISPATCH)
                      </span>
                    )}
                  </div>
                </div>

                {/* Analysis Badges (if formulated by Echo Agent) */}
                {analysis && (
                  <div className="flex flex-wrap items-center gap-2 p-2.5 bg-surface-2/70 rounded-lg border border-border/60">
                    <Badge
                      variant={analysis.intent === 'interested' ? 'verified' : 'neutral'}
                      size="sm"
                    >
                      INTENT: {analysis.intent?.toUpperCase()}
                    </Badge>

                    {analysis.escalate_to_human ? (
                      <Badge variant="warning" size="sm">
                        <AlertTriangle className="w-3 h-3 mr-1 stroke-[2]" />
                        HUMAN ESCALATION
                      </Badge>
                    ) : (
                      <Badge variant="verified" size="sm">
                        <ShieldCheck className="w-3 h-3 mr-1 stroke-[2]" />
                        AUTONOMOUS REPLY SAFE
                      </Badge>
                    )}

                    <span className="text-[11px] text-muted ml-auto font-mono">
                      Action: {analysis.next_action}
                    </span>
                  </div>
                )}

                {/* Message Body */}
                {isDraft ? (
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono text-muted uppercase block">
                      Edit Agent Response Draft before Sending:
                    </label>
                    <textarea
                      rows={4}
                      value={draftValue}
                      onChange={(e) =>
                        setEditableDrafts((prev) => ({ ...prev, [msg.id]: e.target.value }))
                      }
                      className="w-full bg-bg border border-border rounded-lg p-3 text-xs font-sans text-text leading-relaxed focus:border-accent focus:outline-none"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-muted">
                        Verified by Echo Agent guardrails. Prices/unsupported claims excluded.
                      </span>

                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isDispatching === msg.id}
                        onClick={() => handleDispatchAgentResponse(msg.id)}
                        leftIcon={
                          isDispatching === msg.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )
                        }
                      >
                        {isDispatching === msg.id
                          ? 'Dispatching...'
                          : 'Authorize & Dispatch to Client'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-text whitespace-pre-line leading-relaxed pl-2 border-l-2 border-border/70 font-sans">
                    {msg.body}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={threadEndRef} />
      </div>

      {/* Inbound Client Reply Simulator & Handler */}
      <div className="p-5 rounded-xl bg-surface-2/60 border border-border/80 space-y-4">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <label
              htmlFor="clientReplyInput"
              className="text-xs font-mono font-medium uppercase tracking-wider text-text flex items-center gap-1.5"
            >
              <CornerDownRight className="w-3.5 h-3.5 text-accent" />
              Incoming Client Reply from {recipientEmail}
            </label>

            <button
              type="button"
              disabled={isSyncingInbox}
              onClick={handleSyncFromInbox}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 text-[11px] font-sans font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncingInbox ? 'animate-spin' : ''}`} />
              <span>{isSyncingInbox ? 'Checking Mailbox...' : 'Sync Live Reply from Gmail'}</span>
            </button>
          </div>

          <textarea
            id="clientReplyInput"
            rows={3}
            placeholder="Type or paste the client's email response here, or click one of the quick scenario chips below..."
            value={clientReplyText}
            onChange={(e) => setClientReplyText(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg p-3 text-xs font-sans text-text leading-relaxed focus:border-accent focus:outline-none"
          />
        </div>

        {/* Quick Scenario Chips */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted block">
            Quick Test Scenarios:
          </span>
          <div className="flex flex-wrap gap-2">
            {QUICK_CLIENT_REPLIES.map((scenario) => (
              <button
                key={scenario.label}
                type="button"
                onClick={() => setClientReplyText(scenario.text)}
                className="text-[11px] font-sans px-2.5 py-1 bg-bg border border-border/80 rounded-md hover:border-accent hover:text-accent transition-colors text-text-muted"
              >
                {scenario.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-[11px] text-muted">
            Echo analyzes intent, enforces safety rules, and drafts a contextual response.
          </span>

          <Button
            variant="primary"
            size="md"
            disabled={!clientReplyText.trim() || isProcessing}
            onClick={handleProcessReply}
            leftIcon={
              isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-accent" />
              )
            }
          >
            {isProcessing ? 'Echo Analyzing Reply...' : 'Process Reply with Echo Agent'}
          </Button>
        </div>
      </div>
    </Card>
  );
};
