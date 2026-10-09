import React from 'react';
import { motion } from 'framer-motion';
import { RunStatus, AgentDefinition } from '../../api/types';
import { useAppStore } from '../../store/useAppStore';
import { ALL_AGENTS_ROSTER } from '../../mocks/fixtures';
import {
  Compass,
  Search,
  Clock,
  Feather,
  ShieldCheck,
  Scale,
  UserCheck,
  Send,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';

interface PipelineHeroProps {
  status: RunStatus;
  failedTrustBanner?: boolean;
}

interface PipelineStep {
  id: string;
  name: string;
  role: string;
  description: string;
  isEngine?: boolean;
  isHuman?: boolean;
  icon: React.ReactNode;
}

export const PipelineHero: React.FC<PipelineHeroProps> = ({ status, failedTrustBanner = false }) => {
  const { setActiveAgentDrawer } = useAppStore();

  const pipelineSteps: PipelineStep[] = [
    { id: 'atlas', name: 'Atlas', role: 'Conductor', description: 'Orchestrates the run', icon: <Compass className="w-4 h-4" /> },
    { id: 'scout', name: 'Scout', role: 'Researcher', description: 'Extracts grounded facts', icon: <Search className="w-4 h-4" /> },
    { id: 'cadence', name: 'Cadence', role: 'Scorer', description: 'Scores lead & timing', icon: <Clock className="w-4 h-4" /> },
    { id: 'quill', name: 'Quill', role: 'Writer', description: 'Drafts message copy', icon: <Feather className="w-4 h-4" /> },
    { id: 'veritas', name: 'Veritas', role: 'Fact-Checker', description: 'Audits trust & claims', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'warden', name: 'Warden', role: 'Guardrails', description: 'Enforces policy code', isEngine: true, icon: <Scale className="w-4 h-4" /> },
    { id: 'human', name: 'You', role: 'Human Review', description: 'Consensus approval', isHuman: true, icon: <UserCheck className="w-4 h-4" /> },
    { id: 'courier', name: 'Courier', role: 'Sender', description: 'Mock send dispatch', isEngine: true, icon: <Send className="w-4 h-4" /> },
    { id: 'echo', name: 'Echo', role: 'Follow-up', description: 'Analyzes replies', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'sage', name: 'Sage', role: 'Optimizer', description: 'Continuous learning', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  const getNodeState = (stepIndex: number): 'idle' | 'active' | 'done' | 'failed' | 'waiting' => {
    if (status === 'completed') return 'done';
    if (status === 'rejected' || status === 'failed') {
      if (stepIndex < 6) return 'done';
      if (stepIndex === 6) return 'failed';
      return 'idle';
    }
    if (status === 'waiting_for_human') {
      if (stepIndex < 6) return 'done';
      if (stepIndex === 6) return failedTrustBanner ? 'waiting' : 'active';
      return 'idle';
    }
    if (status === 'running') {
      if (stepIndex < 3) return 'done';
      if (stepIndex === 3) return 'active';
      return 'idle';
    }
    return 'idle';
  };

  const activeIndex = status === 'completed' ? 9 : status === 'waiting_for_human' ? 6 : 3;

  const handleNodeClick = (step: PipelineStep) => {
    if (step.isHuman) {
      setActiveAgentDrawer({
        id: 'human',
        name: 'Human Review Consensus Gate',
        role: 'Non-Autonomous Consensus Authority',
        kind: 'rules_engine',
        category: 'trust_policy',
        icon: 'UserCheck',
        can: ['Accept or dismiss flagged trust issues', 'Refine draft copy in place', 'Authorize Courier dispatch'],
        cannot: ['Be bypassed by any autonomous agent', 'Send unsanctioned text'],
      });
      return;
    }

    const agentDef = ALL_AGENTS_ROSTER.find((a) => a.id === step.id);
    if (agentDef) {
      setActiveAgentDrawer(agentDef);
    }
  };

  return (
    <div className="w-full bg-surface border border-border rounded-xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-accent">
            Interactive Multi-Agent Flow
          </div>
          <h2 className="text-xl font-bold text-text mt-0.5">
            Autonomous Pipeline Progress
          </h2>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-verified">
            <span className="w-2.5 h-2.5 rounded-full bg-verified" />
            Completed
          </span>
          <span className="flex items-center gap-1.5 text-accent">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
            Active Step
          </span>
          <span className="flex items-center gap-1.5 text-warning">
            <span className="w-2.5 h-2.5 rounded-full bg-warning" />
            Review Gate
          </span>
        </div>
      </div>

      {/* Horizontal Pipeline Steps */}
      <div className="overflow-x-auto pb-4 pt-2">
        <div className="min-w-[920px] flex items-center justify-between relative px-6">
          {/* Background Connecting Line */}
          <div className="absolute left-10 right-10 top-5 h-[2px] bg-border z-0" />

          {/* Active Progress Line with Gold Shimmer */}
          <motion.div
            className="absolute left-10 top-5 h-[2px] bg-gradient-to-r from-accent/40 via-accent to-verified z-0 shadow-[0_0_12px_rgba(212,175,55,0.6)]"
            initial={{ width: 0 }}
            animate={{ width: `${(activeIndex / (pipelineSteps.length - 1)) * 90}%` }}
            transition={{ duration: 0.8 }}
          />

          {pipelineSteps.map((step, idx) => {
            const nodeState = getNodeState(idx);
            const isCompleted = nodeState === 'done';
            const isActive = nodeState === 'active';
            const isWaiting = nodeState === 'waiting';
            const isFailed = nodeState === 'failed';

            let nodeStyles = 'border-border bg-surface-2 text-text-muted hover:border-accent/40';
            if (isCompleted) {
              nodeStyles = 'border-verified bg-verified/20 text-verified shadow-[0_0_14px_rgba(52,211,153,0.3)] ring-1 ring-verified/40';
            } else if (isActive) {
              nodeStyles = 'border-accent bg-accent/20 text-accent shadow-[0_0_18px_rgba(212,175,55,0.4)] ring-2 ring-accent/50 animate-pulse';
            } else if (isWaiting) {
              nodeStyles = 'border-warning bg-warning/20 text-warning shadow-[0_0_16px_rgba(251,191,36,0.3)] ring-2 ring-warning/50';
            } else if (isFailed) {
              nodeStyles = 'border-danger bg-danger/20 text-danger shadow-sm ring-1 ring-danger/40';
            }

            return (
              <div
                key={step.id}
                onClick={() => handleNodeClick(step)}
                className="flex flex-col items-center group cursor-pointer relative z-10"
              >
                {/* Node Circle */}
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${nodeStyles}`}
                >
                  {step.icon}
                </div>

                {/* Node Labels */}
                <div className="mt-2.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xs font-semibold text-text group-hover:text-accent transition-colors">
                      {step.name}
                    </span>
                    {step.isEngine && (
                      <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1 py-0.2 rounded">
                        CODE
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-text-muted block font-medium">
                    {step.role}
                  </span>
                  <span className="text-[10px] text-text-faint block mt-0.5">
                    {step.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-text-muted text-center mt-2 pt-3 border-t border-border flex items-center justify-center gap-2">
        <span className="font-semibold text-accent">Tip:</span> Click any agent icon above to inspect its capabilities, allowed tools, and security boundaries.
      </div>
    </div>
  );
};
