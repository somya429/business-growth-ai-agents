import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  Search,
  Feather,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Eye,
  Terminal,
} from 'lucide-react';

interface DelegationStep {
  agent_id: string;
  agent_name: string;
  role: string;
  action: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  findings: string;
  duration_ms?: number;
}

interface CommandExchange {
  id: string;
  userCommand: string;
  timestamp: string;
  message: string;
  delegations: DelegationStep[];
  actions_taken: string[];
  suggested_actions: string[];
}

interface ApexConsoleProps {
  onSendCommand: (command: string) => Promise<any>;
  isLoading: boolean;
  businessName: string;
  onExecuteSuggested: (actionText: string) => void;
  pendingExternalCommand?: string | null;
  onExternalCommandHandled?: () => void;
}

export const ApexConsole: React.FC<ApexConsoleProps> = ({
  onSendCommand,
  isLoading,
  businessName,
  onExecuteSuggested,
  pendingExternalCommand,
  onExternalCommandHandled,
}) => {
  const [input, setInput] = useState('');
  const consoleBottomRef = useRef<HTMLDivElement>(null);
  const [exchanges, setExchanges] = useState<CommandExchange[]>([
    {
      id: 'init_welcome',
      userCommand: 'Initialize executive briefing',
      timestamp: 'Just now',
      message: `Apex Commander online and synchronized for **${businessName}**. All 10 specialized sub-agents are active under my command. What would you like us to execute next? You can issue strategic commands, request market research, or approve queued outreach.`,
      delegations: [
        {
          agent_id: 'apex',
          agent_name: 'Apex Commander',
          role: 'Head Orchestrator',
          action: 'Fleet alignment and telemetry handshake verified',
          status: 'completed',
          findings: 'Direct link to user established. Autonomy safety bounds confirmed.',
        },
        {
          agent_id: 'veritas',
          agent_name: 'Veritas',
          role: 'Factual Auditor',
          action: 'Audit cache loaded',
          status: 'completed',
          findings: '98.4% average factual grounding index across all templates.',
        },
      ],
      actions_taken: ['Initialized fleet communication bus', 'Verified active business context'],
      suggested_actions: [
        'Run market recon on top competitors',
        'Prospect 10 high-intent enterprise accounts',
        'Approve verified sequences in the clearance gateway',
      ],
    },
  ]);

  const quickChips = [
    { label: '⚡ Run Competitor Market Recon', command: 'Run competitive market recon on top competitors and report pricing shifts' },
    { label: '🎯 Prospect 10 Tier-1 Accounts', command: 'Instruct Scout to prospect 10 high-intent enterprise accounts matching our ICP' },
    { label: '🛡️ Audit Grounding for Pending Copy', command: 'Audit factual grounding and citations for all pending outreach drafts' },
    { label: '📋 Decompose Weekly Strategic Plan', command: 'Decompose this weeks growth objectives into actionable agent workloads' },
    { label: '📬 Clear & Dispatch All Verified Sequences', command: 'Approve and dispatch all verified sequences scoring 95%+ factual grounding' },
  ];

  const handleSubmit = async (cmdToSend?: string) => {
    const text = (cmdToSend || input).trim();
    if (!text || isLoading) return;

    if (!cmdToSend) {
      setInput('');
    }

    try {
      const res = await onSendCommand(text);
      const newExchange: CommandExchange = {
        id: `cmd_${Date.now()}`,
        userCommand: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        message: res.message || 'Command executed by Apex Commander.',
        delegations: res.delegations || [],
        actions_taken: res.actions_taken || [],
        suggested_actions: res.suggested_actions || [],
      };
      setExchanges((prev) => [...prev, newExchange]);
    } catch (err) {
      console.error('Failed to run command:', err);
    }
  };

  useEffect(() => {
    if (pendingExternalCommand && pendingExternalCommand.trim()) {
      handleSubmit(pendingExternalCommand);
      onExternalCommandHandled?.();
    }
  }, [pendingExternalCommand]);

  useEffect(() => {
    consoleBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [exchanges, isLoading]);

  const getAgentIcon = (agentId: string) => {
    switch (agentId.toLowerCase()) {
      case 'scout':
        return <Search className="w-3.5 h-3.5 text-blue-400" />;
      case 'spyglass':
        return <Eye className="w-3.5 h-3.5 text-purple-400" />;
      case 'quill':
        return <Feather className="w-3.5 h-3.5 text-amber-400" />;
      case 'veritas':
      case 'warden':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case 'atlas':
      case 'compass':
        return <Compass className="w-3.5 h-3.5 text-orange-400" />;
      case 'feedback':
        return <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Cpu className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="rounded-2xl bg-surface border border-border shadow-lg overflow-hidden flex flex-col h-[700px]">
      {/* Console Header */}
      <div className="px-5 py-3.5 bg-surface-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-text flex items-center gap-1.5">
              <span>Direct Line to Apex Orchestrator</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[10px] text-muted">
              Direct executive oversight • Natural language delegation to 10 sub-agents
            </div>
          </div>
        </div>

        <div className="text-[11px] font-mono text-muted hidden sm:flex items-center gap-2">
          <span>Active Context:</span>
          <span className="text-text font-medium bg-surface px-2 py-0.5 rounded border border-border">
            {businessName}
          </span>
        </div>
      </div>

      {/* Conversation & Delegation Log Stream */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gradient-to-b from-bg/40 to-bg">
        {exchanges.map((ex) => (
          <div key={ex.id} className="space-y-4 animate-in fade-in duration-200">
            {/* User Prompt Bubble */}
            <div className="flex justify-end">
              <div className="max-w-[85%] sm:max-w-[70%] bg-accent/15 border border-accent/30 text-text rounded-2xl rounded-tr-xs px-4 py-2.5 text-xs sm:text-sm font-sans shadow-xs">
                <div className="text-[10px] font-mono text-accent uppercase font-bold tracking-wider mb-1 flex items-center justify-between gap-4">
                  <span>Executive Command</span>
                  <span>{ex.timestamp}</span>
                </div>
                <div className="text-text leading-relaxed font-medium">{ex.userCommand}</div>
              </div>
            </div>

            {/* Orchestrator Response Card */}
            <div className="flex justify-start">
              <div className="w-full max-w-[95%] bg-surface border border-border rounded-2xl rounded-tl-xs p-4 sm:p-5 shadow-sm space-y-4">
                {/* Agent Header */}
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-text">Apex Commander</div>
                      <div className="text-[10px] text-muted font-mono">Head Orchestrator Synthesis</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                    Verified Execution
                  </span>
                </div>

                {/* Briefing Text */}
                <div className="text-xs sm:text-sm text-text leading-relaxed whitespace-pre-line">
                  {ex.message}
                </div>

                {/* Agent Delegation Flow Timeline */}
                {ex.delegations && ex.delegations.length > 0 && (
                  <div className="mt-3 bg-surface-2/80 rounded-xl p-3 border border-border space-y-2">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted font-bold flex items-center justify-between">
                      <span>Multi-Agent Routing & Execution Trace</span>
                      <span className="text-accent">{ex.delegations.length} Agents Delegated</span>
                    </div>

                    <div className="space-y-2 pt-1">
                      {ex.delegations.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 text-xs p-2 rounded-lg bg-surface border border-border/80"
                        >
                          <div className="mt-0.5 shrink-0 p-1 rounded bg-surface-2 border border-border">
                            {getAgentIcon(step.agent_id)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-text text-xs flex items-center gap-1.5">
                                {step.agent_name}
                                <span className="text-[10px] font-normal text-muted">({step.role})</span>
                              </span>
                              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-3 h-3" />
                                {step.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted mt-0.5">{step.action}</div>
                            {step.findings && (
                              <div className="text-[11px] text-accent/90 bg-accent-soft/40 px-2 py-1 rounded mt-1 font-mono text-[10px]">
                                Findings: {step.findings}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions Taken Tag Strip */}
                {ex.actions_taken && ex.actions_taken.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-mono text-muted mr-1">Actions Taken:</span>
                    {ex.actions_taken.map((act, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px] font-sans bg-accent-soft text-accent border border-accent/20"
                      >
                        ✓ {act}
                      </span>
                    ))}
                  </div>
                )}

                {/* Suggested Follow-Ups */}
                {ex.suggested_actions && ex.suggested_actions.length > 0 && (
                  <div className="pt-2 border-t border-border/60">
                    <div className="text-[10px] font-mono text-muted uppercase tracking-wider mb-1.5">
                      Recommended Next Moves:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ex.suggested_actions.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            handleSubmit(sug);
                            onExecuteSuggested(sug);
                          }}
                          className="px-2.5 py-1 rounded-md text-[11px] bg-surface hover:bg-accent-soft hover:text-accent border border-border hover:border-accent/30 text-text transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                        >
                          <span>{sug}</span>
                          <ArrowRight className="w-3 h-3 text-muted" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-border animate-pulse">
            <Sparkles className="w-4 h-4 text-accent animate-spin" />
            <div className="text-xs text-text font-mono">
              Apex Commander is routing instructions across specialized sub-agents...
            </div>
          </div>
        )}
        <div ref={consoleBottomRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-5 py-2 bg-surface-2/60 border-t border-border flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-mono uppercase text-muted shrink-0">Quick Commands:</span>
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSubmit(chip.command)}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface hover:bg-accent-soft hover:text-accent border border-border text-muted whitespace-nowrap transition-colors cursor-pointer shrink-0"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input Form Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="p-3.5 bg-surface border-t border-border flex items-center gap-2.5"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Command your Head Orchestrator... (e.g. 'Prospect 5 fintech leads', 'Run competitive recon', 'Approve all verified emails')"
            disabled={isLoading}
            className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm bg-bg border border-border rounded-xl text-text placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            input.trim() && !isLoading
              ? 'bg-accent text-white hover:bg-accent/90 shadow-sm'
              : 'bg-muted/20 text-muted cursor-not-allowed'
          }`}
        >
          <span>Instruct</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
