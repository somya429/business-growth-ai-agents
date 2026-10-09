import React from 'react';
import { Lead, LeadScore, Fact } from '../../api/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  User,
  Building,
  Target,
  FileCheck,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface LeadSummaryCardProps {
  lead?: Lead;
  score?: LeadScore;
  facts?: Fact[];
}

export const LeadSummaryCard: React.FC<LeadSummaryCardProps> = ({ lead, score, facts = [] }) => {
  const decisionVariant = {
    ACT: 'verified',
    WAIT: 'warning',
    REJECT: 'danger',
    RESEARCH_MORE: 'accent',
  }[score?.decision || 'ACT'] as any;

  return (
    <div className="space-y-6">
      {/* Lead & Cadence Scoring Card */}
      <Card variant="surface" className="p-6 space-y-5">
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <User className="w-5 h-5 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-text font-normal">
                {lead?.name || 'Target Account'}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {lead?.role} • {lead?.company}
              </p>
            </div>
          </div>

          {score && (
            <Badge variant={decisionVariant} size="md">
              DECISION: {score.decision}
            </Badge>
          )}
        </div>

        {/* Lead Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded-[8px] bg-surface-2 border border-border">
            <span className="text-text-faint font-mono text-[10px] uppercase block">
              Direct Contact
            </span>
            <span className="text-text font-medium truncate block mt-0.5">
              {lead?.email || 'N/A'}
            </span>
          </div>

          <div className="p-2.5 rounded-[8px] bg-surface-2 border border-border">
            <span className="text-text-faint font-mono text-[10px] uppercase block">
              Acquisition Source
            </span>
            <span className="text-text font-medium capitalize block mt-0.5">
              {lead?.source.replace('_', ' ') || 'Inbound'}
            </span>
          </div>
        </div>

        {/* Cadence Score Breakdown */}
        {score && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-serif text-text">Cadence Fit Score</span>
              <span className="font-mono text-sm font-semibold text-accent">
                {score.score}/100
              </span>
            </div>

            <p className="text-xs text-text-muted leading-relaxed font-sans">
              {score.reason}
            </p>

            {score.breakdown && (
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                {Object.entries(score.breakdown).map(([key, val]) => (
                  <div
                    key={key}
                    className="flex justify-between p-2 rounded bg-surface-2/60 border border-border/80"
                  >
                    <span className="text-text-faint capitalize">{key}:</span>
                    <span className="text-text font-medium">{Math.round(val * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Scout's Verified Facts Card */}
      <Card variant="surface" className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-verified stroke-[1.5]" />
            <h4 className="font-serif text-base text-text font-normal">
              Scout's Verified Facts ({facts.length})
            </h4>
          </div>
          <span className="font-mono text-[11px] text-text-faint">
            Grounded Knowledge
          </span>
        </div>

        <div className="space-y-3">
          {facts.map((fact) => (
            <div
              key={fact.id}
              className="p-3 rounded-[8px] bg-surface-2/50 border border-border text-xs space-y-2 hover:border-accent/30 transition-colors"
            >
              <p className="text-text leading-relaxed font-serif text-[13px]">
                "{fact.statement}"
              </p>

              <div className="flex items-center justify-between pt-1 border-t border-border/40 font-mono text-[10px] text-text-faint">
                <span className="truncate max-w-[200px]" title={fact.source}>
                  Source: {fact.source}
                </span>
                <span className="text-verified font-medium">
                  {Math.round(fact.confidence * 100)}% Conf
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
