import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Drawer } from '../ui/Drawer';
import { Badge } from '../ui/Badge';
import { Check, Ban, Cpu, Sparkles, Terminal } from 'lucide-react';

export const AgentDrawer: React.FC = () => {
  const { activeAgentDrawer, setActiveAgentDrawer } = useAppStore();

  if (!activeAgentDrawer) return null;

  const isRulesEngine = activeAgentDrawer.kind === 'rules_engine';

  return (
    <Drawer
      isOpen={!!activeAgentDrawer}
      onClose={() => setActiveAgentDrawer(null)}
      title={activeAgentDrawer.name}
      subtitle={activeAgentDrawer.role}
    >
      <div className="space-y-6">
        {/* Architecture Classification */}
        <div className="flex items-center justify-between p-3.5 rounded-card bg-surface-2 border border-border">
          <div className="flex items-center gap-2.5">
            {isRulesEngine ? (
              <Terminal className="w-4 h-4 text-warning stroke-[1.5]" />
            ) : (
              <Sparkles className="w-4 h-4 text-accent stroke-[1.5]" />
            )}
            <div>
              <div className="text-xs font-medium text-text">
                {isRulesEngine ? 'Rules Engine (Deterministic)' : 'AI Autonomous Agent'}
              </div>
              <div className="text-[11px] text-text-muted">
                {isRulesEngine
                  ? 'Pure algorithmic code. Zero hallucinations, zero temperature variance.'
                  : 'LLM reasoning agent bounded by system prompt and verified tools.'}
              </div>
            </div>
          </div>
          <Badge variant={isRulesEngine ? 'warning' : 'accent'} size="sm">
            {isRulesEngine ? 'Code' : 'LLM'}
          </Badge>
        </div>

        {/* Permissions & Safeguards */}
        <div className="space-y-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted">
            Boundaries & Permissions
          </h4>

          {/* Can Section */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold tracking-wide uppercase text-verified flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Authorized Capabilities (Can)
            </span>
            <ul className="space-y-2 text-xs text-text bg-surface-2/60 p-3.5 rounded-[10px] border border-border">
              {activeAgentDrawer.can.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-verified mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cannot Section */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold tracking-wide uppercase text-danger flex items-center gap-1.5">
              <Ban className="w-3.5 h-3.5" />
              Forbidden Actions (Cannot)
            </span>
            <ul className="space-y-2 text-xs text-text bg-surface-2/60 p-3.5 rounded-[10px] border border-border">
              {activeAgentDrawer.cannot.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-danger mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Audit Guarantee Note */}
        <div className="p-3.5 rounded-[10px] bg-accent/5 border border-accent/20 text-xs text-text-muted leading-relaxed">
          <span className="text-accent font-medium">Verity Architecture Guarantee: </span>
          All decisions and outputs from {activeAgentDrawer.name} pass through cryptographic trace telemetry and cannot be transmitted without human consensus.
        </div>
      </div>
    </Drawer>
  );
};
