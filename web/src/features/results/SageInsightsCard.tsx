import React from 'react';
import { LearningInsight } from '../../api/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { TrendingUp, Sparkles, CheckCircle2 } from 'lucide-react';

interface SageInsightsCardProps {
  insights: LearningInsight[];
}

export const SageInsightsCard: React.FC<SageInsightsCardProps> = ({ insights }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent stroke-[1.5]" />
          <h3 className="font-serif text-lg text-text font-normal">
            Sage Learning & Intelligence Insights
          </h3>
        </div>
        <span className="font-mono text-[11px] text-text-faint">
          Continuous Knowledge Refinement
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((ins, idx) => {
          const confidencePct = Math.round(ins.confidence * 100);

          return (
            <Card
              key={idx}
              variant="surface"
              className="p-5 flex flex-col justify-between space-y-4 hover:border-accent/40 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="accent" size="sm">
                    {ins.evidence_count} Data Points
                  </Badge>
                  <span className="font-mono text-xs text-verified font-medium">
                    {confidencePct}% Confidence
                  </span>
                </div>

                <h4 className="font-serif text-sm text-text font-medium leading-snug">
                  "{ins.pattern}"
                </h4>
              </div>

              <div className="pt-3 border-t border-border">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-faint block mb-1">
                  Actionable Strategic Recommendation:
                </span>
                <p className="text-xs text-text-muted leading-relaxed">
                  {ins.recommendation}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
