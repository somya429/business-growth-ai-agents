import React from 'react';
import { ReplyAnalysis } from '../../api/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { MessageSquare, AlertTriangle, ArrowRight, CornerDownRight } from 'lucide-react';

interface EchoReplyCardProps {
  replyAnalysis?: ReplyAnalysis;
}

export const EchoReplyCard: React.FC<EchoReplyCardProps> = ({ replyAnalysis }) => {
  if (!replyAnalysis) return null;

  const isEscalated = replyAnalysis.escalate_to_human;

  return (
    <Card variant="surface" className="p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-4 h-4 text-accent stroke-[1.5]" />
          <h3 className="font-serif text-base text-text font-normal tracking-tight">
            Echo Reply Classification
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={replyAnalysis.intent === 'interested' ? 'verified' : 'neutral'}
            size="sm"
          >
            INTENT: {replyAnalysis.intent.toUpperCase()}
          </Badge>
          {isEscalated && (
            <Badge variant="warning" size="sm">
              ESCALATE TO HUMAN
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block mb-1">
            Recommended Action
          </span>
          <p className="text-xs text-text font-medium bg-surface-2 p-2.5 rounded-[8px] border border-border">
            {replyAnalysis.next_action}
          </p>
        </div>

        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block mb-1">
            Triage Justification
          </span>
          <p className="text-xs text-text-muted leading-relaxed">
            {replyAnalysis.reason}
          </p>
        </div>

        {replyAnalysis.draft_reply && (
          <div className="pt-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5 mb-1.5">
              <CornerDownRight className="w-3.5 h-3.5 text-accent" />
              Grounded Reply Follow-up
            </span>
            <div className="p-3.5 rounded-[10px] bg-surface-2/70 border border-border text-xs font-serif leading-relaxed text-text whitespace-pre-line italic">
              {replyAnalysis.draft_reply}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
