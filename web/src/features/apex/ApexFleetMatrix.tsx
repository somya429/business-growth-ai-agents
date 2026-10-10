import React, { useState } from 'react';
import {
  Cpu,
  Search,
  Eye,
  Clock,
  Feather,
  Sparkles,
  ShieldCheck,
  Lock,
  Send,
  Compass,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  X,
  Terminal,
  Zap,
} from 'lucide-react';

export interface FleetAgent {
  id: string;
  name: string;
  role: string;
  category: string;
  icon: string;
  status: 'working' | 'ready' | 'idle';
  accuracy_score: number;
  current_task: string;
  can?: string[];
  cannot?: string[];
}

interface ApexFleetMatrixProps {
  fleet: FleetAgent[];
  onDirectCommand: (agentName: string, role: string, customInstruction?: string) => void;
}

const AGENT_DIRECTIVES: Record<string, string[]> = {
  scout: [
    'Prospect 10 verified enterprise accounts matching our ICP',
    'Extract verified decision-maker emails with MX validation',
    'Identify enterprise buying triggers and hiring signals',
  ],
  spyglass: [
    'Scan top 3 competitors for pricing changes and seat minimums',
    'Teardown competitor landing page positioning pivots',
    'Identify competitor product gaps and customer complaints',
  ],
  cadence: [
    'Score in-market propensity across our target account list',
    'Calculate optimal outreach send window for this week',
    'Filter high-intent accounts ready for immediate contact',
  ],
  quill: [
    'Draft consultative outbound message citing verified metrics',
    'Generate 3 personalized subject line variations',
    'Write soft-touch follow-up for unresponsive leads',
  ],
  muse: [
    'Synthesize a 1-page customer proof brief from approved facts',
    'Format ROI case study highlighting verified outcomes',
    'Create objection handling guide for sales discovery',
  ],
  veritas: [
    'Audit all pending copy claims against approved knowledge base',
    'Verify numeric citations and flag any ungrounded figures',
    'Generate trust report breakdown for upcoming campaign',
  ],
  warden: [
    'Audit message compliance with CAN-SPAM and regulatory rules',
    'Verify brand tone boundaries and prohibited guarantee words',
    'Ensure frequency caps and quiet hour rules are enforced',
  ],
  herald: [
    'Prepare delivery queue with safe cadence throttling',
    'Check mailbox health and domain sender reputation',
    'Schedule approved sequences for optimal delivery window',
  ],
  atlas: [
    'Decompose weekly growth goals into tactical agent tasks',
    'Check task dependencies and resolve scheduling blockers',
    'Generate 5-day phased roadmap for Q4 presales',
  ],
  compass: [
    'Synthesize competitive positioning battlecard',
    'Calculate target CAC and LTV payback estimates',
    'Identify top 3 ICP wedge angles for outbound',
  ],
  feedback: [
    'Analyze inbound response sentiments and objection patterns',
    'Identify top-performing value hooks from recent outreach',
    'Update playbook guidance based on positive reply trends',
  ],
};

export const ApexFleetMatrix: React.FC<ApexFleetMatrixProps> = ({
  fleet,
  onDirectCommand,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<FleetAgent | null>(null);
  const [instructionText, setInstructionText] = useState<string>('');
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [activeWorkingAgents, setActiveWorkingAgents] = useState<Record<string, boolean>>({});

  const getIcon = (id: string) => {
    switch (id.toLowerCase()) {
      case 'scout':
        return <Search className="w-4 h-4 text-[var(--accent)]" />;
      case 'spyglass':
        return <Eye className="w-4 h-4 text-[var(--ink-deep)]" />;
      case 'cadence':
        return <Clock className="w-4 h-4 text-[var(--accent)]" />;
      case 'quill':
        return <Feather className="w-4 h-4 text-[var(--ink-deep)]" />;
      case 'muse':
        return <Sparkles className="w-4 h-4 text-[var(--accent)]" />;
      case 'veritas':
        return <ShieldCheck className="w-4 h-4 text-[var(--verified)]" />;
      case 'warden':
        return <Lock className="w-4 h-4 text-[var(--danger)]" />;
      case 'herald':
        return <Send className="w-4 h-4 text-[var(--ink-deep)]" />;
      case 'atlas':
      case 'compass':
        return <Compass className="w-4 h-4 text-[var(--accent)]" />;
      case 'feedback':
        return <TrendingUp className="w-4 h-4 text-[var(--verified)]" />;
      default:
        return <Cpu className="w-4 h-4 text-[var(--accent)]" />;
    }
  };

  const handleOpenInstruct = (agent: FleetAgent) => {
    setSelectedAgent(agent);
    const defaults = AGENT_DIRECTIVES[agent.id.toLowerCase()] || [];
    setInstructionText(defaults[0] || `Instruct ${agent.name} to execute dedicated task`);
  };

  const handleDispatch = () => {
    if (!selectedAgent || !instructionText.trim()) return;

    setIsDispatching(true);
    const agentId = selectedAgent.id;
    const agentName = selectedAgent.name;
    const agentRole = selectedAgent.role;
    const finalCmd = instructionText.trim();

    setActiveWorkingAgents((prev) => ({ ...prev, [agentId]: true }));
    onDirectCommand(agentName, agentRole, finalCmd);

    setTimeout(() => {
      setIsDispatching(false);
      setSelectedAgent(null);
    }, 400);
  };

  const getStatusBadge = (agent: FleetAgent) => {
    const isCurrentlyWorking = activeWorkingAgents[agent.id] || agent.status === 'working';

    if (isCurrentlyWorking) {
      return (
        <span className="pill text-[10px] font-mono font-bold bg-[var(--tint)] text-[var(--accent-text)] border border-[var(--ink)] flex items-center gap-1.5">
          <span className="dot scale-75" />
          Working
        </span>
      );
    }

    if (agent.status === 'ready') {
      return (
        <span className="pill done text-[10px] font-mono font-bold flex items-center gap-1">
          ✓ Ready
        </span>
      );
    }

    return (
      <span className="pill text-[10px] font-mono border border-[var(--line)]">
        Standby
      </span>
    );
  };

  return (
    <div className="panel bg-[var(--paper)] border-[var(--ink)] shadow-hard flex flex-col relative">
      {/* Header */}
      <div className="p-4 sm:p-5 bg-[var(--tint)] border-b border-[var(--ink)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border border-[var(--ink)] bg-[var(--bg)] flex items-center justify-center text-[var(--ink-deep)]">
            <Cpu className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <div className="text-base font-bold text-[var(--ink-deep)] flex items-center gap-2">
              <span>Managed Sub-Agent Fleet Matrix</span>
              <span className="pill text-[11px] font-mono font-bold bg-[var(--ink)] text-[var(--bg)]">
                10 Autonomous Units Active
              </span>
            </div>
            <div className="text-xs text-[var(--ink-2)]">
              Hierarchical view: All units report directly to Apex Commander and execute strictly within policy guardrails.
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Agents */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-[var(--bg)]">
        {fleet.map((agent) => (
          <div
            key={agent.id}
            className="p-4 border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--ink)] hover:shadow-hard-sm transition-all flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 border border-[var(--ink)] bg-[var(--bg)] flex items-center justify-center">
                    {getIcon(agent.id)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--ink-deep)] flex items-center gap-1.5">
                      {agent.name}
                    </h4>
                    <div className="text-xs text-[var(--ink-2)]">{agent.role}</div>
                  </div>
                </div>

                {getStatusBadge(agent)}
              </div>

              {/* Current Task */}
              <div className="p-2.5 bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink-2)] font-sans leading-relaxed">
                <strong className="text-[var(--ink-deep)] font-semibold">Assignment: </strong>
                {agent.current_task}
              </div>
            </div>

            {/* Accuracy & Direct Action Button */}
            <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[var(--accent-text)]">
                ★ {agent.accuracy_score}% Accuracy
              </span>

              <button
                type="button"
                onClick={() => handleOpenInstruct(agent)}
                className="btn small py-1 px-3 text-xs"
              >
                <span>Instruct</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Instruct Sub-Agent Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 bg-[rgba(30,21,16,0.65)] flex items-center justify-center p-4">
          <div className="panel bg-[var(--paper)] border-[var(--ink)] shadow-hard w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-[var(--tint)] border-b border-[var(--ink)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border border-[var(--ink)] bg-[var(--bg)] flex items-center justify-center">
                  {getIcon(selectedAgent.id)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--ink-deep)] flex items-center gap-2">
                    <span>Instruct {selectedAgent.name}</span>
                    <span className="pill done text-[10px] font-mono font-bold">
                      {selectedAgent.accuracy_score}% Grounding
                    </span>
                  </h3>
                  <div className="text-xs text-[var(--ink-2)]">{selectedAgent.role}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="p-1.5 text-[var(--ink)] hover:bg-[var(--paper)] border border-transparent hover:border-[var(--ink)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Capabilities snippet */}
              {selectedAgent.can && selectedAgent.can.length > 0 && (
                <div className="space-y-1.5">
                  <div className="eyebrow text-[10px]">
                    Core Capabilities:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAgent.can.map((cap, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs font-sans bg-[var(--bg)] text-[var(--ink-deep)] border border-[var(--line)]"
                      >
                        ✓ {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Directives for this Agent */}
              <div className="space-y-1.5">
                <div className="eyebrow text-[10px] flex items-center justify-between">
                  <span>Recommended Directives:</span>
                  <span className="text-[var(--accent-text)] text-[10px] lowercase font-mono">click to load</span>
                </div>
                <div className="space-y-1.5">
                  {(AGENT_DIRECTIVES[selectedAgent.id.toLowerCase()] || []).map((directive, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInstructionText(directive)}
                      className="w-full text-left p-2.5 text-xs bg-[var(--bg)] hover:bg-[var(--tint)] border border-[var(--ink)] text-[var(--ink-deep)] transition-colors flex items-center justify-between gap-2"
                    >
                      <span>{directive}</span>
                      <Zap className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Instruction Prompt */}
              <div className="space-y-1.5">
                <div className="eyebrow text-[10px]">
                  Custom Instruction Prompt:
                </div>
                <textarea
                  rows={3}
                  value={instructionText}
                  onChange={(e) => setInstructionText(e.target.value)}
                  placeholder={`What would you like ${selectedAgent.name} to execute right now?`}
                  className="w-full p-3 text-xs bg-[var(--bg)] border border-[var(--ink)] text-[var(--ink-deep)] placeholder:text-[var(--ink-2)] focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[var(--bg)] border-t border-[var(--ink)] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="btn small"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDispatch}
                disabled={!instructionText.trim() || isDispatching}
                className="btn solid small flex items-center gap-2"
              >
                <span>Dispatch to {selectedAgent.name} →</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
