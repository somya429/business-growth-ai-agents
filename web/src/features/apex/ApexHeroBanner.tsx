import React from 'react';
import {
  ShieldCheck,
  Zap,
  Cpu,
  RefreshCw,
  Clock,
  Sparkles,
  TrendingUp,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface ApexHeroBannerProps {
  headAgent: {
    name: string;
    title: string;
    status: string;
    mode: string;
    model: string;
    business_name: string;
    industry: string;
  };
  kpis: {
    total_accounts_processed: number;
    verified_accuracy_rate: string;
    pending_approvals_count: number;
    autonomous_hours_saved: string;
    outreach_clearance_rate: string;
    active_sprint_completion: string;
  };
  currentAutonomyMode: 'oversight' | 'supervised' | 'autonomous';
  onAutonomyModeChange: (mode: 'oversight' | 'supervised' | 'autonomous') => void;
  onSync: () => void;
  isSyncing: boolean;
}

export const ApexHeroBanner: React.FC<ApexHeroBannerProps> = ({
  headAgent,
  kpis,
  currentAutonomyMode,
  onAutonomyModeChange,
  onSync,
  isSyncing,
}) => {
  return (
    <div className="panel p-6 sm:p-8 bg-[var(--paper)] border-[var(--ink)] shadow-hard space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[var(--line)]">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="eyebrow flex items-center gap-1.5 text-[var(--ink-deep)] font-bold">
              <span className="dot" />
              {headAgent.name} • Autonomous Chief of Staff
            </span>

            <span className="text-xs text-[var(--ink-2)] font-mono">
              Active Context: <strong className="text-[var(--ink-deep)]">{headAgent.business_name}</strong> ({headAgent.industry})
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--ink-deep)] tracking-tight">
            Apex Executive Command Deck
          </h1>
          <p className="text-sm text-[var(--ink-2)] max-w-2xl mt-1 leading-relaxed">
            Autonomous Head Orchestrator commanding 10 specialized AI agents. Directly manages multi-agent intelligence,
            conducts automated factual research, and routes high-stakes approvals between you and your fleet.
          </p>
        </div>

        {/* Autonomy Level Switcher */}
        <div className="bg-[var(--bg)] p-3 border border-[var(--ink)] flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[var(--ink-2)]">
            <span>Autonomy Level</span>
            <span className="text-[var(--accent-text)] font-bold">{currentAutonomyMode.toUpperCase()}</span>
          </div>

          <div className="seg" role="group" aria-label="Autonomy Mode">
            <button
              type="button"
              aria-pressed={currentAutonomyMode === 'oversight'}
              onClick={() => onAutonomyModeChange('oversight')}
              className="text-xs py-1.5 px-3"
              title="Full Oversight: Every single outbound action pauses for your manual sign-off"
            >
              Strict
            </button>

            <button
              type="button"
              aria-pressed={currentAutonomyMode === 'supervised'}
              onClick={() => onAutonomyModeChange('supervised')}
              className="text-xs py-1.5 px-3"
              title="Supervised: Grounded actions auto-run; ungrounded items pause for review"
            >
              Supervised
            </button>

            <button
              type="button"
              aria-pressed={currentAutonomyMode === 'autonomous'}
              onClick={() => onAutonomyModeChange('autonomous')}
              className="text-xs py-1.5 px-3"
              title="Autonomous: Full fleet execution with audit logs"
            >
              Full Auto
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-[var(--bg)] border border-[var(--line)]">
          <div className="eyebrow text-[11px] text-[var(--ink-2)]">Fleet Status</div>
          <div className="text-lg font-extrabold text-[var(--ink-deep)] mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--verified)]" />
            10 Active
          </div>
          <div className="text-[11px] font-mono text-[var(--ink-2)] mt-0.5">Orchestrator Mesh</div>
        </div>

        <div className="p-3.5 bg-[var(--bg)] border border-[var(--line)]">
          <div className="eyebrow text-[11px] text-[var(--ink-2)]">Accounts Processed</div>
          <div className="text-lg font-extrabold text-[var(--ink-deep)] mt-1">
            {kpis.total_accounts_processed}
          </div>
          <div className="text-[11px] font-mono text-[var(--accent-text)] mt-0.5">Verified ICP fit</div>
        </div>

        <div className="p-3.5 bg-[var(--bg)] border border-[var(--line)]">
          <div className="eyebrow text-[11px] text-[var(--ink-2)]">Factual Accuracy</div>
          <div className="text-lg font-extrabold text-[var(--verified)] mt-1">
            {kpis.verified_accuracy_rate}
          </div>
          <div className="text-[11px] font-mono text-[var(--ink-2)] mt-0.5">Zero hallucinations</div>
        </div>

        <div className="p-3.5 bg-[var(--bg)] border border-[var(--line)]">
          <div className="eyebrow text-[11px] text-[var(--ink-2)]">Approval Gateway</div>
          <div className="text-lg font-extrabold text-[var(--accent-text)] mt-1 flex items-center gap-1">
            {kpis.pending_approvals_count} Items
          </div>
          <div className="text-[11px] font-mono text-[var(--ink-2)] mt-0.5">Awaiting your OK</div>
        </div>

        <div className="p-3.5 bg-[var(--bg)] border border-[var(--line)]">
          <div className="eyebrow text-[11px] text-[var(--ink-2)]">Autonomous Hours</div>
          <div className="text-lg font-extrabold text-[var(--ink-deep)] mt-1">
            {kpis.autonomous_hours_saved}
          </div>
          <div className="text-[11px] font-mono text-[var(--ink-2)] mt-0.5">Saved this sprint</div>
        </div>

        <div className="p-3.5 bg-[var(--bg)] border border-[var(--line)] flex flex-col justify-between">
          <div className="eyebrow text-[11px] text-[var(--ink-2)]">Fleet Telemetry</div>
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            className="btn small py-1 px-2.5 text-xs mt-1 w-full justify-center"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing…' : 'Sync Fleet'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApexHeroBanner;
