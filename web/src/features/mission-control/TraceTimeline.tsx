import React, { useState } from 'react';
import { TraceEvent } from '../../api/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ChevronDown, Clock, Terminal, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TraceTimelineProps {
  events: TraceEvent[];
  isPolling?: boolean;
}

export const TraceTimeline: React.FC<TraceTimelineProps> = ({ events, isPolling = false }) => {
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});

  const toggleExpand = (idx: number) => {
    setExpandedIndices((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <Card variant="surface" className="p-6 flex flex-col h-full font-mono">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-accent stroke-[1.5]" />
          <h3 className="font-serif text-base text-text font-normal font-sans tracking-tight">
            Live Agent Execution Trace
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {isPolling && (
            <span className="flex items-center gap-1.5 text-[11px] text-accent font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
              1s Telemetry Stream
            </span>
          )}
          <Badge variant="neutral" size="sm">
            {events.length} Events Logged
          </Badge>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {events.map((ev, idx) => {
          const isExpanded = !!expandedIndices[idx];

          return (
            <div
              key={idx}
              className="p-3.5 rounded-[10px] bg-surface-2/60 border border-border/80 text-xs transition-colors hover:border-accent/30"
            >
              {/* Event Main Line */}
              <div
                onClick={() => toggleExpand(idx)}
                className="flex items-start justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-accent font-semibold text-xs tracking-tight">
                    [{ev.agent}]
                  </span>
                  <div>
                    <div className="text-text font-medium text-xs tracking-tight">
                      {ev.step}
                    </div>
                    <div className="text-text-muted text-[11px] mt-0.5 leading-relaxed font-sans">
                      <span className="text-text-faint font-mono">WHY: </span>
                      {ev.reason}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {ev.duration && (
                    <span className="text-[10px] text-text-faint flex items-center gap-1">
                      <Clock className="w-3 h-3 stroke-[1.5]" />
                      {ev.duration}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Expandable Input/Output Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden mt-3 pt-3 border-t border-border/60 space-y-2 text-[11px]"
                  >
                    <div>
                      <span className="text-text-faint block uppercase text-[10px] tracking-wider mb-0.5">
                        Input Summary:
                      </span>
                      <div className="p-2 rounded bg-surface border border-border text-text-muted whitespace-pre-line leading-relaxed">
                        {ev.input_summary}
                      </div>
                    </div>

                    <div>
                      <span className="text-text-faint block uppercase text-[10px] tracking-wider mb-0.5">
                        Output Summary:
                      </span>
                      <div className="p-2 rounded bg-surface border border-border text-text-muted whitespace-pre-line leading-relaxed">
                        {ev.output_summary}
                      </div>
                    </div>

                    <div className="text-[10px] text-text-faint pt-1">
                      ISO Timestamp: {ev.timestamp}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
